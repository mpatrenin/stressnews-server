# StressNews Server

Backend API for the [StressNews](https://stressnews-client-940cee89049b.herokuapp.com/) app. Fetches and classifies news from 18 RSS feeds by stress level using sentiment analysis.

## Links
- [Live App](https://stressnews-client-940cee89049b.herokuapp.com/)
- [Client Source Code](https://github.com/mpatrenin/nostressnews-client)

## Features
- Parallel RSS feed fetching from 18 sources (world, tech, science, positive news)
- Sentiment analysis to classify articles into 5 stress levels: `veryLow` → `veryHigh`
- NLP-based tag extraction per article
- In-memory cache with 1-minute background refresh
- CORS restricted to the configured client origin

## Getting Started

```bash
npm install
```

Create a `.env` file in this directory:

```
PORT=5000
ALLOWED_ORIGIN=http://localhost:3000
```

Start in development mode (with auto-reload):

```bash
npm run dev
```

Or build and run compiled output:

```bash
npm run build
npm start
```

## API

`GET /api/news` — Returns an array of news articles sorted by date.

```json
[
  {
    "id": "...",
    "title": "...",
    "sources": [{ "url": "...", "publisher": "..." }],
    "stressLevel": "low",
    "date": "2026-03-24T12:00:00.000Z",
    "tags": ["Technology", "AI"]
  }
]
```

## Deployment

Heroku environment variables to set:

| Variable | Description |
|----------|-------------|
| `ALLOWED_ORIGIN` | URL of the live client app |
| `PORT` | Set automatically by Heroku |

Deploy:

```bash
git push heroku master
```
