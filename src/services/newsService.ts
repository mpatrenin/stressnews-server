import Parser from 'rss-parser';
import Sentiment from 'sentiment';
import nlp from 'compromise';

const parser = new Parser({ xml2js: { cdata: true } });
const sentiment = new Sentiment();

let cachedNews: NewsItem[] | null = null;

export interface NewsItem {
  id: string;
  title: string;
  sources: { url: string; publisher: string }[];
  stressLevel: 'veryLow' | 'low' | 'medium' | 'high' | 'veryHigh';
  date: string;
  tags?: string[];
}

function getTagsForNews(text: string): string[] {
  const doc = nlp(text);
  const topics = doc.topics().out('array');
  const orgs = doc.organizations().out('array');

  // Merge all, capitalize, remove trailing punctuation, filter duplicates
  const tags = [...orgs, ...topics]
    .map(tag =>
      tag
        .trim()
        .replace(/[.?:!,;]+$/, '')
        .replace(/^./, (c: string) => c.toUpperCase())
    )
    .filter((tag, idx, arr) => tag && arr.indexOf(tag) === idx);

  if (tags.length === 0) {
    tags.push('General');
  }

  return tags;
}

export const fetchNews = async (): Promise<NewsItem[]> => {
  if (cachedNews) {
    return cachedNews;
  }

  const rssFeeds = [
    // Major global events
    'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', // NYT World News
    'https://www.npr.org/rss/rss.php?id=1001', // NPR News
    'https://feeds.bbci.co.uk/news/world/rss.xml', // BBC World News
    'https://www.aljazeera.com/xml/rss/all.xml', // Al Jazeera English

    // Tech
    'https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml', // NYT Technology
    'https://feeds.npr.org/1006/rss.xml', // NPR Politics
    'https://feeds.bbci.co.uk/news/technology/rss.xml', // BBC Technology
    'https://techcrunch.com/feed/', // TechCrunch
    'https://www.theverge.com/rss/index.xml', // The Verge

    // Science updates, cute animals, positive stories
    'https://www.npr.org/rss/rss.php?id=1007', // NPR Science
    'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml', // BBC Science & Environment
    'https://www.goodnewsnetwork.org/feed/', // Good News Network
    'https://www.sciencedaily.com/rss/top.xml', // ScienceDaily
    'https://www.npr.org/rss/rss.php?id=1057', // NPR Animals
    'https://www.positive.news/feed/', // Positive News
    'https://www.boredpanda.com/feed/', // Bored Panda
    'https://www.upworthy.com/rss', // Upworthy
    'https://www.inspiremore.com/feed/', // InspireMore
  ];

  const fetchFeed = async (feed: string): Promise<NewsItem[]> => {
    const feedData = await parser.parseURL(feed);
    return Promise.all(
      feedData.items.map(async item => {
        // Extract categories/tags from RSS item
        let rssTags: string[] = [];
        if (Array.isArray(item.categories)) {
          rssTags = item.categories
            .filter((cat: any) => typeof cat === 'string' || typeof cat === 'number')
            .map((cat: any) =>
              String(cat).trim().replace(/[.?:!,;]+$/, '').replace(/^./, (c: string) => c.toUpperCase())
            );
        }

        // Combine NLP/keyword tags and RSS tags, deduplicate, and limit to 10
        const description = item.contentSnippet || item.summary || item.content || '';
        const nlpTags = getTagsForNews(`${item.title || ''} ${description}`);
        const tags = [...rssTags, ...nlpTags]
          .filter((tag, idx, arr) => tag && arr.indexOf(tag) === idx)
          .slice(0, 10);

        return {
          id: item.guid || item.link || Math.random().toString(),
          title: decodeEntities(item.title || ''),
          sources: [{ url: item.link || '', publisher: feedData.title || '' }],
          stressLevel: determineStressLevel(item.title || '', item.contentSnippet || item.summary || item.content || ''),
          date: item.pubDate || new Date().toISOString(),
          tags: tags.length ? tags : ['General'],
        };
      })
    );
  };

  // Fetch all feeds in parallel
  const results = await Promise.allSettled(rssFeeds.map(feed => fetchFeed(feed)));

  const allNews: NewsItem[] = [];
  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();

  const normalizeTitle = (title: string) =>
    title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 60);

  results.forEach((result, i) => {
    if (result.status === 'rejected') {
      console.error(`Failed to fetch feed ${rssFeeds[i]}:`, result.reason);
      return;
    }
    result.value.forEach(item => {
      const url = item.sources[0].url;
      const titleKey = normalizeTitle(item.title);
      const wordCount = item.title.trim().split(/\s+/).length;
      if (!seenUrls.has(url) && !seenTitles.has(titleKey) && wordCount >= 4) {
        seenUrls.add(url);
        seenTitles.add(titleKey);
        allNews.push(item);
      }
    });
  });

  const sorted = allNews.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  cachedNews = sorted;
  return sorted;
};

const decodeEntities = (title: string): string => {
  return title
    .replace(/<[^>]+>/g, '')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&[^;]+;/g, match => {
      const entities: { [key: string]: string } = {
        '&apos;': "'",
        '&lsquo;': '\u2018',
        '&rsquo;': '\u2019',
        '&ldquo;': '\u201C',
        '&rdquo;': '\u201D',
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&nbsp;': ' ',
      };
      return entities[match] || match;
    })
    .trim();
};

const determineStressLevel = (title: string, description = ''): 'veryLow' | 'low' | 'medium' | 'high' | 'veryHigh' => {
  const text = `${title} ${decodeEntities(description)}`;
  const analysis = sentiment.analyze(text);
  const score = analysis.score;

  if (score <= -3) return 'veryHigh';
  if (score <= -1) return 'high';
  if (score >= 3) return 'veryLow';
  if (score >= 1) return 'low';
  return 'medium';
};