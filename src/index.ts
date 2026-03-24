import express from 'express';
import cors from 'cors';
import { fetchNews } from './services/newsService';

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigin = process.env.ALLOWED_ORIGIN || 'http://localhost:3000';
app.use(cors({ origin: allowedOrigin }));
app.use(express.json());

app.get('/api/news', async (req, res) => {
  try {
    const news = await fetchNews();
    res.json(news);
  } catch (error) {
    console.error('Error fetching news:', error);
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});

const REFRESH_INTERVAL_MS = 1 * 60 * 1000; // 1 minute

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  // Warm cache immediately on startup
  fetchNews().catch(err => console.error('Initial cache warm-up failed:', err));
  // Refresh cache in the background every 5 minutes
  setInterval(() => {
    fetchNews()
      .then(() => console.log('News cache refreshed.'))
      .catch(err => console.error('Background cache refresh failed:', err));
  }, REFRESH_INTERVAL_MS);
});