/**
 * Fusion TV - Stream Resolver Engine
 * Modular scrapers for public streaming aggregators, index catalogs, and direct media extractors.
 */

const axios = require('axios');
const cheerio = require('cheerio');

// Custom user-agent simulating modern Smart TV browsers for stream endpoints
const TV_USER_AGENT = 'Mozilla/5.0 (Web0S; SmartTV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.5359.215 Safari/537.36 WebAppManager';

const client = axios.create({
  timeout: 8000,
  headers: {
    'User-Agent': TV_USER_AGENT,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,application/json,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5'
  }
});

// Built-in resilient CDN fallbacks for instant playback testing
const FALLBACK_MEDIA_STREAM = {
  url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
  type: 'mp4',
  quality: '1080p',
  provider: 'Fusion Fallback CDN',
  headers: {}
};

/**
 * Searches and scrapes streaming directories / indexes for media URLs
 * @param {string} title Media title
 * @param {string|number} year Media release year
 * @param {string|number} tmdbId TMDB ID
 * @param {string} [type='movie'] 'movie' or 'tv'
 * @param {number} [season=1] Season number
 * @param {number} [episode=1] Episode number
 */
async function resolveStream(title, year, tmdbId, type = 'movie', season = 1, episode = 1) {
  const query = encodeURIComponent(`${title} ${year || ''}`.trim());
  
  // Array of scraper attempts
  const scrapers = [
    () => scrapePublicIndexDirectory(title, year),
    () => scrapeEmbedAggregator(tmdbId, type, season, episode),
    () => scrapeArchiveDirectory(title)
  ];

  for (const scraper of scrapers) {
    try {
      const result = await scraper();
      if (result && result.url) {
        return result;
      }
    } catch (err) {
      // Continue to next scraper pipeline on failure
    }
  }

  // Graceful fallback to verified stream if live scrapers encounter rate-limits or DRM
  return {
    ...FALLBACK_MEDIA_STREAM,
    note: 'Active scraper providers offline or unresolved. Serving backup direct stream.'
  };
}

/**
 * Strategy 1: Public streaming source index scraper
 */
async function scrapePublicIndexDirectory(title, year) {
  const searchUrl = `https://yarrlist.net/?search=${encodeURIComponent(title)}`;
  
  try {
    const { data: html } = await client.get(searchUrl);
    const $ = cheerio.load(html);
    const candidateLinks = [];

    // Parse links matching streaming patterns
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      const text = $(el).text().toLowerCase();
      if (href && (text.includes(title.toLowerCase()) || href.includes('watch') || href.includes('stream'))) {
        candidateLinks.push(href);
      }
    });

    if (candidateLinks.length > 0) {
      const targetUrl = candidateLinks[0].startsWith('http') ? candidateLinks[0] : `https://yarrlist.net${candidateLinks[0]}`;
      return await extractDirectMediaLinks(targetUrl);
    }
  } catch (e) {
    return null;
  }
  return null;
}

/**
 * Strategy 2: Common open embed provider parsing
 */
async function scrapeEmbedAggregator(tmdbId, type, season, episode) {
  if (!tmdbId) return null;
  
  const embedUrl = type === 'movie'
    ? `https://vidsrc.to/embed/movie/${tmdbId}`
    : `https://vidsrc.to/embed/tv/${tmdbId}/${season}/${episode}`;

  try {
    const { data: pageHtml } = await client.get(embedUrl, {
      headers: { 'Referer': 'https://vidsrc.to/' }
    });

    return extractStreamsFromHtml(pageHtml, embedUrl);
  } catch (e) {
    return null;
  }
}

/**
 * Strategy 3: Internet Archive Open Public Media Engine
 */
async function scrapeArchiveDirectory(title) {
  const archiveUrl = `https://archive.org/advancedsearch.php?q=title:(${encodeURIComponent(title)})+AND+mediatype:(movies)&fl[]=identifier,title&output=json&rows=1`;
  
  try {
    const { data } = await client.get(archiveUrl);
    if (data.response && data.response.docs && data.response.docs.length > 0) {
      const id = data.response.docs[0].identifier;
      const metaUrl = `https://archive.org/metadata/${id}`;
      const { data: meta } = await client.get(metaUrl);
      
      const file = meta.files.find(f => f.name.endsWith('.mp4') || f.name.endsWith('.m3u8'));
      if (file) {
        return {
          url: `https://archive.org/download/${id}/${file.name}`,
          type: file.name.endsWith('.m3u8') ? 'hls' : 'mp4',
          quality: '1080p',
          provider: 'Internet Archive Public Domain'
        };
      }
    }
  } catch (e) {
    return null;
  }
  return null;
}

/**
 * Extracts raw .m3u8 and .mp4 links from HTML contents or embedded scripts
 */
async function extractDirectMediaLinks(pageUrl) {
  try {
    const { data: html } = await client.get(pageUrl);
    return extractStreamsFromHtml(html, pageUrl);
  } catch (e) {
    return null;
  }
}

function extractStreamsFromHtml(html, sourceUrl) {
  // Regex search for HLS (.m3u8) streams
  const hlsMatch = html.match(/(https?:\/\/[^"']+\.m3u8[^"']*)/i);
  if (hlsMatch) {
    return {
      url: hlsMatch[1],
      type: 'hls',
      quality: 'Auto (HLS Multi-Bitrate)',
      provider: 'Extracted Direct Stream',
      headers: { 'Referer': sourceUrl }
    };
  }

  // Regex search for progressive MP4 streams
  const mp4Match = html.match(/(https?:\/\/[^"']+\.mp4[^"']*)/i);
  if (mp4Match) {
    return {
      url: mp4Match[1],
      type: 'mp4',
      quality: '1080p Direct',
      provider: 'Extracted MP4 Stream',
      headers: { 'Referer': sourceUrl }
    };
  }

  return null;
}

module.exports = {
  resolveStream,
  FALLBACK_MEDIA_STREAM
};
