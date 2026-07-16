import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { country, language, product, keywords } = req.body;
  const YT_KEY = process.env.YOUTUBE_API_KEY;

  try {
    const searchQuery = `${product} ${country}`;
    const searchRes = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchQuery)}&type=video&maxResults=10&key=${YT_KEY}`
    );
    const searchData = await searchRes.json();
    const videoIds = (searchData.items || []).map(item => item.id.videoId);

    let matches = [];

    for (const videoId of videoIds) {
      const commentsRes = await fetch(
        `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=50&key=${YT_KEY}`
      );
      const commentsData = await commentsRes.json();
      if (!commentsData.items) continue;

      for (const item of commentsData.items) {
        const comment = item.snippet.topLevelComment.snippet;
        const text = comment.textOriginal.toLowerCase();

        const matchedKeyword = keywords.find(kw => text.includes(kw.toLowerCase()));
        if (matchedKeyword) {
          const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
          const phoneRegex = /(\+?\d[\d\s-]{7,}\d)/;
          const hasContactInfo = emailRegex.test(comment.textOriginal) || phoneRegex.test(comment.textOriginal);

          matches.push({
            platform: 'youtube',
            source_url: `https://youtube.com/watch?v=${videoId}&lc=${item.snippet.topLevelComment.id}`,
            author_name: comment.authorDisplayName,
            comment_text: comment.textOriginal,
            country,
            language,
            product,
            matched_keyword: matchedKeyword,
            score: hasContactInfo ? 'hot' : 'warm',
            has_contact_info: hasContactInfo,
          });
        }
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
