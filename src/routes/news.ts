import { Request, Response } from 'express';
import { fetchNews } from '../services/newsService';

export const getNews = async (req: Request, res: Response): Promise<void> => {
  try {
    const news = await fetchNews();
    res.json(news);
  } catch (error) {
    console.error('Error fetching news:', error);
    res.status(500).json({ error: 'Failed to fetch news' });
  }
};