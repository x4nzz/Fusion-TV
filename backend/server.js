/**
 * Fusion TV - Local Express Backend
 * Exposes TMDB Catalog, Hero Spotlight, and Stream Resolution Endpoints.
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
const { resolveStream, FALLBACK_MEDIA_STREAM } = require('./resolver');

const app = express();
const PORT = process.env.PORT || 3000;
const TMDB_API_KEY = process.env.TMDB_API_KEY || '';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMG_URL = 'https://image.tmdb.org/t/p/original';

// Enable open CORS for webOS app client requests
app.use(cors());
app.use(express.json());

// Serve the webOS public application directory
app.use(express.static(path.join(__dirname, '../public')));

// Default Curated Fallback Data for offline / keyless testing
const STATIC_MEDIA_CATALOG = [
  {
    id: 101,
    title: "Dune: Part Two",
    year: "2024",
    rating: "8.9",
    duration: "2h 46m",
    overview: "Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family, facing a choice between love and the fate of the universe.",
    backdrop: "https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=1920&auto=format&fit=crop",
    poster: "https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=600&auto=format&fit=crop"
  },
  {
    id: 102,
    title: "Interstellar: Beyond Time",
    year: "2024",
    rating: "8.7",
    duration: "2h 49m",
    overview: "A team of explorers travel through a newly discovered wormhole in space in an attempt to ensure humanity's survival on another habitable world.",
    backdrop: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1920&auto=format&fit=crop",
    poster: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=600&auto=format&fit=crop"
  },
  {
    id: 103,
    title: "Blade Runner 2049",
    year: "2023",
    rating: "8.5",
    duration: "2h 44m",
    overview: "A young blade runner's discovery of a long-buried secret leads him to track down former blade runner Rick Deckard, who has been missing for thirty years.",
    backdrop: "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?q=80&w=1920&auto=format&fit=crop",
    poster: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=600&auto=format&fit=crop"
  },
  {
    id: 104,
    title: "Cyberpunk: Nocturne",
    year: "2025",
    rating: "8.4",
    duration: "2h 15m",
    overview: "In a neon-drenched metropolis ruled by mega-corporations, an augmented operative undertakes an unauthorized heist of a prototype neural transceiver.",
    backdrop: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1920&auto=format&fit=crop",
    poster: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?q=80&w=600&auto=format&fit=crop"
  },
  {
    id: 105,
    title: "Oppenheimer",
    year: "2023",
    rating: "8.9",
    duration: "3h 00m",
    overview: "The story of American scientist J. Robert Oppenheimer and his historical role in the development of the atomic bomb during the Manhattan Project.",
    backdrop: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?q=80&w=1920&auto=format&fit=crop",
    poster: "https://images.unsplash.com/photo-1516339901601-2e1b62dc0c45?q=80&w=600&auto=format&fit=crop"
  }
];

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    version: '2.4.0',
    tmdbConfigured: Boolean(TMDB_API_KEY),
    timestamp: new Date().toISOString()
  });
});

// Trending Rails Endpoint
app.get('/api/media/rails', async (req, res) => {
  if (!TMDB_API_KEY) {
    return res.json([
      { id: 'trending', title: 'Trending Today', subtitle: 'Global Audiences', landscape: false, items: STATIC_MEDIA_CATALOG },
      { id: 'critics', title: 'Masterpieces & Critically Acclaimed', subtitle: 'Curated 4K Cinema', landscape: false, items: [...STATIC_MEDIA_CATALOG].reverse() },
      { id: 'spotlight_rail', title: 'Cinematic Horizons', subtitle: 'Ultra High Definition', landscape: true, items: STATIC_MEDIA_CATALOG }
    ]);
  }

  try {
    const [trendRes, topRes] = await Promise.all([
      axios.get(`${TMDB_BASE_URL}/trending/movie/day?api_key=${TMDB_API_KEY}`),
      axios.get(`${TMDB_BASE_URL}/movie/top_rated?api_key=${TMDB_API_KEY}`)
    ]);

    const formatItems = (list) => list.slice(0, 10).map(m => ({
      id: m.id,
      title: m.title,
      year: (m.release_date || '').split('-')[0] || '2024',
      rating: m.vote_average ? m.vote_average.toFixed(1) : '8.0',
      duration: '2h 15m',
      overview: m.overview,
      backdrop: m.backdrop_path ? `${TMDB_IMG_URL}${m.backdrop_path}` : STATIC_MEDIA_CATALOG[0].backdrop,
      poster: m.poster_path ? `${TMDB_IMG_URL}${m.poster_path}` : STATIC_MEDIA_CATALOG[0].poster
    }));

    res.json([
      { id: 'trending', title: 'Trending Today', subtitle: 'Global Audiences', landscape: false, items: formatItems(trendRes.data.results) },
      { id: 'critics', title: 'Masterpieces & Critically Acclaimed', subtitle: 'Top Rated on TMDB', landscape: false, items: formatItems(topRes.data.results) },
      { id: 'spotlight_rail', title: 'Cinematic Horizons', subtitle: 'Ultra High Definition', landscape: true, items: formatItems(trendRes.data.results) }
    ]);
  } catch (err) {
    res.json([
      { id: 'trending', title: 'Trending Today', subtitle: 'Offline Cache', landscape: false, items: STATIC_MEDIA_CATALOG }
    ]);
  }
});

// Hero Spotlight Endpoint
app.get('/api/media/spotlight', (req, res) => {
  res.json(STATIC_MEDIA_CATALOG[0]);
});

// Stream Resolver Endpoint
app.get('/api/resolve', async (req, res) => {
  const { title, year, tmdbId, type, season, episode } = req.query;

  if (!title) {
    return res.status(400).json({ error: 'Missing media title query parameter' });
  }

  try {
    const stream = await resolveStream(title, year, tmdbId, type || 'movie', season || 1, episode || 1);
    res.json({
      success: true,
      title,
      stream
    });
  } catch (error) {
    res.json({
      success: true,
      title,
      stream: FALLBACK_MEDIA_STREAM,
      fallback: true
    });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`===============================================`);
  console.log(`  Fusion TV Backend is running`);
  console.log(`  Local URL:  http://localhost:${PORT}`);
  console.log(`  Remote URL: http://<LAN_IP_ADDRESS>:${PORT}`);
  console.log(`  Ready for LG webOS TV Client connections`);
  console.log(`===============================================`);
});
