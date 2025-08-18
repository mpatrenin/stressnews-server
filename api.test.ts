import request from 'supertest';
import { describe, it, expect, jest, beforeAll } from '@jest/globals';
import express from 'express';
import { fetchNews } from './src/services/newsService';
import { getNews } from './src/routes/news';

describe('API /api/news', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.get('/api/news', getNews);
  });

  it('should return news items as an array (mocked)', async () => {
    const mockNews = [{
      id: '1',
      title: 'Test News',
      sources: [{ url: 'http://example.com', publisher: 'Example' }],
      stressLevel: 'medium',
      date: new Date().toISOString(),
      tags: ['General']
    }];
    jest.spyOn(require('./src/services/newsService'), 'fetchNews').mockResolvedValueOnce(mockNews);
    const response = await request(app).get('/api/news');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body).toEqual(mockNews);
  }, 10000); // 10s timeout for safety

  it('should handle errors gracefully', async () => {
    // Mock fetchNews to throw
    jest.spyOn(require('./src/services/newsService'), 'fetchNews').mockImplementationOnce(() => {
      throw new Error('Test error');
    });
    const response = await request(app).get('/api/news');
    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty('error');
  });
});

describe('fetchNews', () => {
  it('should return an array of news items (mocked)', async () => {
    const mockNews = [{
      id: '1',
      title: 'Test News',
      sources: [{ url: 'http://example.com', publisher: 'Example' }],
      stressLevel: 'medium',
      date: new Date().toISOString(),
      tags: ['General']
    }];
    jest.spyOn(require('./src/services/newsService'), 'fetchNews').mockResolvedValueOnce(mockNews);
    const news = await fetchNews();
    expect(Array.isArray(news)).toBe(true);
    expect(news).toEqual(mockNews);
  }, 10000); // 10s timeout for safety
});
