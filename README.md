# ShortLink — URL Shortener

A full-stack URL shortener built with **Node.js**, **Express**, **MongoDB**, and **EJS**. Users can sign up, shorten any URL with a custom expiry, track click analytics, and let expired links clean themselves up automatically.

---

## Features

- **Auth** — Signup/login with bcrypt-hashed passwords and JWT stored in HTTP-only cookies
- **URL Shortening** — 8-character nanoid short codes, unique and URL-safe
- **Custom Expiry** — Set expiry in days; MongoDB TTL index auto-deletes expired links
- **Click Analytics** — Per-link click count with a daily breakdown chart
- **Rate Limiting** — Global 100 req/15 min + strict 10 links/hour per IP limit on creation
- **Custom 404 Page** — Styled page explaining why a link may be missing

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express v5 |
| Database | MongoDB + Mongoose |
| Templating | EJS (server-side rendering) |
| Auth | JWT + bcryptjs |
| Short ID | nanoid |
| Rate Limiting | express-rate-limit |

---

## Project Structure

```
├── controllers/
│   ├── url.js          # URL creation and analytics logic
│   └── user.js         # Signup, login, logout
├── middlewares/
│   └── auth.js         # JWT verification (page redirect + API JSON variants)
├── models/
│   ├── url.js          # URL schema with TTL index
│   └── user.js         # User schema
├── routes/
│   ├── url.js          # POST /url, GET /url/analytics/:shortId
│   ├── user.js         # POST /user/signup, /user/login, GET /user/logout
│   └── staticRouter.js # Page routes (/, /login, /signup, /analytics/:shortId)
├── views/
│   ├── home.ejs        # Dashboard — shorten URLs, view links table
│   ├── analytics.ejs   # Per-link click chart
│   ├── login.ejs
│   ├── signup.ejs
│   └── 404.ejs         # Custom not-found page
├── index.js            # App entry point, redirect handler
├── connection.js       # MongoDB connection
└── .env.example
```

---

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/harig79/url-shortener-backend.git
cd url-shortener-backend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Fill in `.env`:

```env
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/url-shortener
JWT_SECRET=your_super_secret_jwt_key_here
PORT=8001
```

### 4. Run the server

```bash
npm start
```

Visit `http://localhost:8001`

---

## API Routes

### Auth

| Method | Route | Description |
|---|---|---|
| POST | `/user/signup` | Register a new user |
| POST | `/user/login` | Login and receive JWT cookie |
| GET | `/user/logout` | Clear cookie and logout |

### URLs

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/url` | Yes | Create a new short URL |
| GET | `/url/analytics/:shortId` | Yes | Get click analytics (JSON) |
| GET | `/:shortId` | No | Redirect to original URL |

### Pages

| Route | Description |
|---|---|
| `/` | Dashboard (requires auth) |
| `/login` | Login page |
| `/signup` | Signup page |
| `/analytics/:shortId` | Analytics chart page (requires auth) |

---

## How It Works

**Shortening a URL**
1. User submits a long URL + expiry days via the dashboard form
2. Server generates an 8-char nanoid (e.g. `aB3xQ9mZ`)
3. Document saved to MongoDB with `expiresAt` set to now + N days
4. MongoDB TTL index automatically deletes the document when it expires

**Redirecting**
1. Browser hits `GET /:shortId`
2. Server finds the document and atomically appends a timestamp to `visitHistory`
3. Browser is 302-redirected to the original URL
4. If not found → custom 404 page

**Auth flow**
1. Password hashed with bcrypt (cost factor 10) before storage
2. On login, bcrypt compares input against stored hash
3. JWT signed with `JWT_SECRET`, set as HTTP-only cookie (7 day expiry)
4. Every protected route reads and verifies the cookie — no DB lookup needed

---

## Environment Variables

| Variable | Description |
|---|---|
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret key for signing JWTs — keep this private |
| `PORT` | Port to run the server on (default: 8001) |

---

## License

ISC
