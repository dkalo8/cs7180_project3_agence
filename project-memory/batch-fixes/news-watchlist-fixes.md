# 9D: Watchlist News Feed + Bug Fixes

_Session: 2026-04-13_

## 9D: Watchlist News Feed ✅

### What was built
- `server/services/finnhub.js` — added `getNewsArticles(symbol, limit=5)`: fetches company news via Finnhub, returns `[{ headline, summary, url, source, datetime }]`
- `server/routes/news.js` — `GET /api/v1/news?tickers=AAPL,TSLA`; Promise.all per ticker; graceful `[]` fallback on error; capped at 10 tickers
- `server/routes/news.test.js` — 6 tests (auth, 400 missing param, single ticker, multi-ticker, error fallback, ticker upcasing)
- `server/index.js` — registered `newsRouter` at `/api/v1/news`
- `client/src/api/apiCache.js` — `getNews(tickers)` with 2-min TTL; cache key includes ticker list (`news_AAPL,TSLA`)
- `client/src/pages/Watchlist.js` — collapsible "Recent News" section; loads after watchlist; shows up to 5 articles per ticker with headline link, source, date
- `client/src/index.css` — `.news-toggle-btn`, `.news-ticker-group`, `.news-list`, `.news-item`, `.news-headline`, `.news-meta` styles

### Tests: 214/214 passing

---

## Bug Fixes

### 1. Watchlist cache stale after add/remove
**Root cause:** `handleAdd` and `handleRemove` in `Watchlist.js` updated React state but never called `invalidate('watchlist')`. Dashboard pre-warms the watchlist cache on mount. After adding a ticker, the cache still had the old list. On page reload, `getWatchlist()` found stale cache within TTL and returned old data — making added tickers appear to vanish. Tickers were in DB the whole time.

**Fix:** Added `invalidate('watchlist')` in both `handleAdd` and `handleRemove` immediately after successful API response.

**Lesson:** Every mutation handler (POST/DELETE that writes to DB) must call `invalidate(key)` — failure to do so means the cache keeps serving pre-mutation data.

### 2. Price shows "—" after adding a ticker
**Root cause:** `POST /watchlist` returns the raw DB row `{ id, ticker, added_at }` — no price. Alpaca enrichment only happens in `GET /watchlist`. The optimistic `setWatchlist(prev => [data, ...prev])` added the unenriched row to state, showing "—" for price and changePercent.

**Fix:** After POST + invalidate, call `getWatchlist()` to re-fetch the full enriched list (including Alpaca prices), then use that to update state.

### 3. Finnhub SDK v2 breaking change (news always returning [])
**Root cause:** `finnhub` v2 removed `ApiClient.instance`. The old initialization:
```js
const apiClient = finnhub.ApiClient.instance; // undefined in v2 — throws TypeError
apiClient.authentications['api_key'].apiKey = process.env.FINNHUB_API_KEY;
_client = new finnhub.DefaultApi();
```
The TypeError was swallowed by the `if (err) resolve([])` handler, making all Finnhub calls silently return empty arrays. This affected both `getLatestNews` (used by marketContextAgent) and `getNewsArticles`.

**Fix:** Updated to v2 constructor pattern:
```js
_client = new finnhub.DefaultApi(process.env.FINNHUB_API_KEY);
```

**Detection:** Added `console.error` logging to `getNewsArticles` error path so future Finnhub failures surface in Render logs.

---

## Commits
- `5dd9381` fix: invalidate watchlist cache after add/remove mutations
- `9d47b1b` feat: implement 9D watchlist news feed
- `0ff3dc0` fix: log finnhub errors to surface API failures in Render logs
- `7ca9e92` fix: update finnhub SDK to v2 API and refresh watchlist after add
