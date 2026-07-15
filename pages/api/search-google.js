import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function stripHtml(html) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, ' ')
             .replace(/<style[\s\S]*?<\/style>/gi, ' ')
             .replace(/<[^>]+>/g, ' ')
             .replace(/\s+/g, ' ')
             .trim();
}

function findProfileLinks(html, baseUrl) {
  const linkRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi;
  const keywords = ['profile', 'contact', 'view seller', 'view buyer', 'member', 'about us', 'my page'];
  let matches = [];
  let m;
  const base = new URL(baseUrl);

  while ((m = linkRegex.exec(html)) !== null && matches.length < 2) {
    const href = m[1];
    const anchorText = stripHtml(m[2]).toLowerCase();
    const hrefLower = href.toLowerCase();

    const looksRelevant = keywords.some(kw => anchorText.includes(kw) || hrefLower.includes(kw.replace(' ', '')));
    if (!looksRelevant) continue;

    try {
      const resolved = new URL(href, base).href;
      if (new URL(resolved).hostname === base.hostname) {
        matches.push(resolved);
      }
    } catch (e) {
      continue;
    }
  }
  return matches;
}

function extractContactInfo(text) {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const phoneRegex = /(\+?\d[\d\s-]{7,}\d)/;
  return emailRegex.test(text) || phoneRegex.test(text);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { country, language, product, keywords } = req.body;
  const API_KEY = process.env.GOOGLE_SEARCH_API_KEY;
  const CX = process.env.GOOGLE_SEARCH_ENGINE_ID;

  try {
    const searchQuery = `${product} ${country}`;
    const searchRes = await fetch(
      `https://www.googleapis.com/customsearch/v1?key=${API_KEY}&cx=${CX}&q=${encodeURIComponent(searchQuery)}&num=8`
    );
    const searchData = await searchRes.json();

    if (!searchData.items) {
      return res.status(200).json({ found: 0, matches: [], note: searchData.error || 'no results' });
    }

    let matches = [];

    for (const item of searchData.items) {
      try {
        const pageRes = await fetch(item.link, { signal: AbortSignal.timeout(8000) });
        const html = await pageRes.text();
        const pageText = stripHtml(html);
        const text = pageText.toLowerCase();

        const matchedKeyword = keywords.find(kw => text.includes(kw.toLowerCase()));
        if (!matchedKeyword) continue;

        let hasContactInfo = extractContactInfo(pageText);
        let combinedText = pageText;

        if (!hasContactInfo) {
          const profileLinks = findProfileLinks(html, item.link);
          for (const link of profileLinks) {
            try {
              const profileRes = await fetch(link, { signal: AbortSignal.timeout(6000) });
              const profileHtml = await profileRes.text();
              const profileText = stripHtml(profileHtml);
              if (extractContactInfo(profileText)) {
                hasContactInfo = true;
                combinedText += ' | Profile page: ' + profileText.slice(0, 300);
                break;
              }
            } catch (e) {
              continue;
            }
          }
        }

        matches.push({
          platform: 'google_search',
          source_url: item.link,
          author_name: item.title || null,
          comment_text: combinedText.slice(0, 600),
          country,
          language,
          product,
          matched_keyword: matchedKeyword,
          score: hasContactInfo ? 'hot' : 'warm',
          has_contact_info: hasContactInfo,
        });
      } catch (fetchErr) {
        continue;
      }
    }

    if (matches.length > 0) {
      await supabase.from('leads').upsert(matches, { onConflict: 'source_url', ignoreDuplicates: true });
    }

    res.status(200).json({ found: matches.length, matches });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
