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

function extractContactInfo(text) {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const phoneRegex = /(\+?\d[\d\s-]{7,}\d)/;
  return emailRegex.test(text) || phoneRegex.test(text);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { country, language, product, keywords, customSite } = req.body;
  const SERPER_KEY = process.env.SERPER_API_KEY;

  try {
    let query = `${product} ${country}`;
    if (customSite) query += ` site:${customSite}`;

    const serperRes = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': SERPER_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: query, num: 10 }),
    });
    const serperData = await serperRes.json();

    if (!serperData.organic) {
      return res.status(200).json({ found: 0, matches: [], note: serperData.message || 'no results' });
    }

    let candidateResults = serperData.organic;

    if (!customSite) {
      const { data: sites } = await supabase.from('search_sites').select('url').eq('active', true);
      const trustedDomains = (sites || []).map(s => s.url);
      candidateResults = serperData.organic.filter(r => 
        trustedDomains.some(domain => r.link.includes(domain))
      );
    }

    let matches = [];

    for (const item of candidateResults) {
      try {
        const pageRes = await fetch(item.link, { signal: AbortSignal.timeout(8000) });
        const html = await pageRes.text();
        const pageText = stripHtml(html);
        const text = pageText.toLowerCase();

        const matchedKeyword = keywords.find(kw => text.includes(kw.toLowerCase()));
        if (!matchedKeyword) continue;

        const hasContactInfo = extractContactInfo(pageText);

        matches.push({
          platform: 'google_search',
          source_url: item.link,
          author_name: item.title || null,
          comment_text: pageText.slice(0, 600),
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

    let newMatches = matches;
    if (matches.length > 0) {
      const urls = matches.map(m => m.source_url);
      const { data: existing } = await supabase.from('leads').select('source_url').in('source_url', urls);
      const existingUrls = new Set((existing || []).map(e => e.source_url));
      newMatches = matches.filter(m => !existingUrls.has(m.source_url));

      if (newMatches.length > 0) {
        await supabase.from('leads').insert(newMatches);
      }
    }

    res.status(200).json({ found: newMatches.length, matches: newMatches, totalScanned: matches.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
