# ShortLink — Architecture & Developer Guide

## What This Project Does

A production-ready URL shortener where authenticated users can:
- Create short links with optional expiry
- Share short links publicly (no login needed to follow a link)
- View a per-link analytics dashboard with a click-over-time chart
- Have their links automatically deleted by MongoDB when they expire

Live URL: _(add Railway URL here after deployment)_

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Runtime | Node.js + Express | Lightweight, fast for I/O heavy work |
| Database | MongoDB Atlas + Mongoose | Flexible schema, built-in TTL indexes |
| Auth | JWT + bcryptjs | Stateless, scales horizontally |
| Sessions | httpOnly Cookies | Secure, works with server-rendered EJS |
| Rate Limiting | express-rate-limit | Prevents abuse, one package |
| Views | EJS | Server-rendered, no frontend framework needed |
| Charts | Chart.js (CDN) | Zero bundle complexity |
| Deployment | Railway | Simple env-var config, free tier |

---

## File Structure

```
url-shortener-backend/
│
├── index.js                  ← App entry point, middleware stack, redirect route
├── connection.js             ← MongoDB connection utility
├── .env                      ← Secrets (never committed)
├── .env.example              ← Template showing required env vars
│
├── models/
│   ├── user.js               ← User schema (email, hashed password)
│   └── url.js                ← URL schema (shortId, redirectUrl, visitHistory, expiresAt, createdBy)
│
├── controllers/
│   ├── user.js               ← Signup, login, logout logic
│   └── url.js                ← Create short URL, get JSON analytics
│
├── routes/
│   ├── user.js               ← POST /user/signup, POST /user/login, GET /user/logout
│   ├── url.js                ← POST /url, GET /url/analytics/:shortId
│   └── staticRouter.js       ← GET /, GET /analytics/:shortId, GET /login, GET /signup
│
├── middlewares/
│   └── auth.js               ← checkAuth (redirects), checkAuthAPI (returns 401 JSON)
│
└── views/
    ├── home.ejs              ← Dashboard: create link form + links table
    ├── login.ejs             ← Login form
    ├── signup.ejs            ← Signup form
    └── analytics.ejs         ← Per-link analytics page with Chart.js
```

---

## Environment Variables

Create a `.env` file in the project root (never commit this):

```
MONGO_URI=mongodb+srv://<user>:<pass>@cluster0.mongodb.net/url-shortener
JWT_SECRET=some_long_random_secret_string
PORT=8001
```

---

## Complete Request Pipeline

```
Incoming HTTP Request
        │
        ▼
  globalLimiter          ← 100 req / 15 min per IP (all routes)
        │
        ▼
  Body Parsers           ← express.json(), express.urlencoded()
        │
        ▼
  cookieParser           ← reads JWT from httpOnly cookie
        │
        ├──── GET  /login        → render login.ejs        (public)
        ├──── GET  /signup       → render signup.ejs       (public)
        ├──── POST /user/signup  → create user + set cookie (public)
        ├──── POST /user/login   → verify + set cookie      (public)
        ├──── GET  /user/logout  → clear cookie             (public)
        │
        ├──── GET  /             → checkAuth → fetch user's URLs → render home.ejs
        ├──── GET  /analytics/:id → checkAuth → aggregate clicks → render analytics.ejs
        │
        ├──── POST /url          → checkAuth → createLinkLimiter → create URL doc
        ├──── GET  /url/analytics/:id → checkAuthAPI → return JSON stats
        │
        └──── GET  /:shortId     → find URL → push timestamp → redirect  (public)
```

---

## Routes Reference

### Public Routes (no authentication needed)

| Method | Path | Description |
|---|---|---|
| GET | `/login` | Renders the login page |
| GET | `/signup` | Renders the signup page |
| POST | `/user/signup` | Creates account, sets JWT cookie, redirects to `/` |
| POST | `/user/login` | Verifies credentials, sets JWT cookie, redirects to `/` |
| GET | `/user/logout` | Clears JWT cookie, redirects to `/login` |
| GET | `/:shortId` | Logs the click timestamp, redirects to original URL |

### Protected Routes (JWT required)

| Method | Path | Description |
|---|---|---|
| GET | `/` | Dashboard — shows user's own links |
| GET | `/analytics/:shortId` | Renders analytics page with Chart.js |
| POST | `/url` | Creates a new short URL (also rate limited: 10/hour) |
| GET | `/url/analytics/:shortId` | Returns raw JSON click data |

---

## How Authentication Works

### Signup Flow
```
POST /user/signup  { email, password }
        │
        ├── Check if email already exists → 409 if duplicate
        ├── bcrypt.hash(password, 10)     → never store plain text
        ├── User.create({ email, hashedPassword })
        ├── jwt.sign({ _id, email }, JWT_SECRET, { expiresIn: "7d" })
        └── res.cookie("token", jwt, { httpOnly: true }) → redirect /
```

### Login Flow
```
POST /user/login  { email, password }
        │
        ├── User.findOne({ email })       → 401 if not found (same message as wrong password)
        ├── bcrypt.compare(password, hash) → 401 if mismatch
        ├── jwt.sign(...)
        └── res.cookie("token", jwt, { httpOnly: true }) → redirect /
```

### Per-Request Auth Check (checkAuth middleware)
```
Every protected page request
        │
        ├── Read req.cookies.token
        ├── jwt.verify(token, JWT_SECRET)
        │     ├── Valid   → attach decoded payload to req.user → next()
        │     └── Invalid → clearCookie("token") → redirect /login
        └── No token → redirect /login
```

**Why httpOnly cookies instead of localStorage?**
`httpOnly` cookies cannot be read by JavaScript, making them immune to XSS attacks. Since this app is server-rendered (EJS), cookies are the natural transport — they're sent automatically on every request with no frontend code needed.

---

## How TTL (Link Expiry) Works

```javascript
// In models/url.js
urlSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
```

MongoDB runs an internal background task every ~60 seconds. It scans the `expiresAt` index and **automatically deletes any document** where `expiresAt` is in the past. No cron job, no manual cleanup — the database handles it natively.

When a user creates a link:
- Default expiry: 30 days from creation
- User can override: pass `expiryDays` in the form (1–365)
- `expiresAt = now + (days × 86400000 ms)`

When someone visits an expired link, the redirect handler returns a `404` because the document no longer exists in MongoDB.

---

## How Rate Limiting Works

Two layers:

**Global limiter** — applied to every route in `index.js`:
- 100 requests per 15 minutes per IP
- Protects the entire app from flooding

**createLinkLimiter** — applied only to `POST /url`:
- 10 link creations per hour per IP
- Specifically targets the most abuse-prone endpoint
- Returns `429 Too Many Requests` with a JSON error message

---

## How the Analytics Dashboard Works

**Data source:** Every time `GET /:shortId` is hit, a timestamp is pushed to the URL document:
```javascript
URL.findOneAndUpdate(
  { shortId },
  { $push: { visitHistory: { timeStamp: Date.now() } } }
)
```

**Aggregation (server-side):** In `staticRouter.js`, before rendering the analytics page, the raw timestamps are grouped by day:
```javascript
const dailyMap = {};
url.visitHistory.forEach((visit) => {
  const day = new Date(visit.timeStamp).toISOString().split("T")[0]; // "2025-06-01"
  dailyMap[day] = (dailyMap[day] || 0) + 1;
});
```

**Rendered as:** Sorted `labels` (dates) and `data` (counts) arrays are passed to the EJS template as JSON strings and fed directly into Chart.js — a line chart showing clicks per day.

Aggregation is done on the **server**, not in the browser. The browser receives clean `{labels, data}` arrays, not raw timestamps.

---

## How to Run Locally

```bash
# 1. Clone and install
npm install

# 2. Create your .env file
cp .env.example .env
# Fill in MONGO_URI and JWT_SECRET

# 3. Start the dev server
npm start
# → http://localhost:8001
```

---

## How to Deploy to Railway

1. Push this repo to GitHub
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Select this repo
4. In Railway dashboard → Variables, add:
   - `MONGO_URI` — your MongoDB Atlas connection string
   - `JWT_SECRET` — any long random string
   - `PORT` — Railway sets this automatically, leave it out
5. Railway builds and deploys automatically on every push to `main`

**MongoDB Atlas setup:**
- Create a free cluster at [cloud.mongodb.com](https://cloud.mongodb.com)
- Under Network Access → Add IP → `0.0.0.0/0` (allow all — required for Railway)
- Under Database Access → create a user with read/write permissions
- Get the connection string and set it as `MONGO_URI`

---

## What Changes Were Made From the Original Code

| File | Change |
|---|---|
| `index.js` | Added dotenv, cookieParser, globalLimiter, userRoute; removed hardcoded DB URL |
| `connection.js` | No logic change — DB URL now comes from caller via env var |
| `models/url.js` | Added `expiresAt` (Date, TTL index) and `createdBy` (ObjectId ref to User) |
| `models/user.js` | New file — email + hashed password schema |
| `middlewares/auth.js` | New file — two middleware functions: page redirect vs API 401 |
| `controllers/user.js` | New file — signup, login, logout with bcrypt + JWT |
| `controllers/url.js` | Added `expiresAt` on create; scoped analytics to `createdBy` |
| `routes/user.js` | New file — mounts user controller functions |
| `routes/url.js` | Added `checkAuth`/`checkAuthAPI` middleware; added `createLinkLimiter` |
| `routes/staticRouter.js` | Added `checkAuth`; scoped home to user's own links; added analytics page route |
| `views/home.ejs` | Complete rewrite — header with user email/logout, styled table, expiry input |
| `views/login.ejs` | New file |
| `views/signup.ejs` | New file |
| `views/analytics.ejs` | New file — Chart.js line chart with metadata |
| `.env.example` | New file |
| `.gitignore` | Added `.env` and `node_modules/` |
