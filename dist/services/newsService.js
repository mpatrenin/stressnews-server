"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchNews = void 0;
const rss_parser_1 = __importDefault(require("rss-parser"));
const sentiment_1 = __importDefault(require("sentiment"));
const compromise_1 = __importDefault(require("compromise"));
const parser = new rss_parser_1.default({ xml2js: { cdata: true } });
const sentiment = new sentiment_1.default();
let cachedNews = null;
function getTagsForNews(text) {
    const doc = (0, compromise_1.default)(text);
    const topics = doc.topics().out('array');
    const orgs = doc.organizations().out('array');
    // Merge all, capitalize, remove trailing punctuation, filter duplicates
    const tags = [...orgs, ...topics]
        .map(tag => tag
        .trim()
        .replace(/[.?:!,;]+$/, '')
        .replace(/^./, (c) => c.toUpperCase()))
        .filter((tag, idx, arr) => tag && arr.indexOf(tag) === idx);
    if (tags.length === 0) {
        tags.push('General');
    }
    return tags;
}
const fetchNews = () => __awaiter(void 0, void 0, void 0, function* () {
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
    const fetchFeed = (feed) => __awaiter(void 0, void 0, void 0, function* () {
        console.log(`Fetching feed: ${feed}`);
        const feedData = yield parser.parseURL(feed);
        return Promise.all(feedData.items.map((item) => __awaiter(void 0, void 0, void 0, function* () {
            // Extract categories/tags from RSS item
            let rssTags = [];
            if (Array.isArray(item.categories)) {
                rssTags = item.categories
                    .filter((cat) => typeof cat === 'string' || typeof cat === 'number')
                    .map((cat) => String(cat).trim().replace(/[.?:!,;]+$/, '').replace(/^./, (c) => c.toUpperCase()));
            }
            // Combine NLP/keyword tags and RSS tags, deduplicate, and limit to 10
            const nlpTags = getTagsForNews(item.title || '');
            const tags = [...rssTags, ...nlpTags]
                .filter((tag, idx, arr) => tag && arr.indexOf(tag) === idx)
                .slice(0, 10);
            return {
                id: item.guid || item.link || Math.random().toString(),
                title: decodeEntities(item.title || ''),
                sources: [{ url: item.link || '', publisher: feedData.title || '' }],
                stressLevel: determineStressLevel(item.title || ''),
                date: item.pubDate || new Date().toISOString(),
                tags: tags.length ? tags : ['General'],
            };
        })));
    });
    // Fetch all feeds in parallel
    const results = yield Promise.allSettled(rssFeeds.map(feed => fetchFeed(feed)));
    const allNews = [];
    const seenUrls = new Set();
    results.forEach((result, i) => {
        if (result.status === 'rejected') {
            console.error(`Failed to fetch feed ${rssFeeds[i]}:`, result.reason);
            return;
        }
        result.value.forEach(item => {
            const url = item.sources[0].url;
            if (!seenUrls.has(url)) {
                seenUrls.add(url);
                allNews.push(item);
            }
        });
    });
    const sorted = allNews.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    cachedNews = sorted;
    return sorted;
});
exports.fetchNews = fetchNews;
const decodeEntities = (title) => {
    return title
        .replace(/<[^>]+>/g, '')
        .replace(/&[^;]+;/g, match => {
        const entities = {
            '’': '’',
            '‘': '’',
            '"': '"',
            '&': '&',
            '<': '<',
            '>': '>',
            ' ': ' ',
        };
        return entities[match] || match;
    })
        .trim();
};
const determineStressLevel = (title) => {
    const analysis = sentiment.analyze(title);
    const score = analysis.score;
    if (score <= -3)
        return 'veryHigh';
    if (score <= -1)
        return 'high';
    if (score >= 3)
        return 'veryLow';
    if (score >= 1)
        return 'low';
    return 'medium';
};
