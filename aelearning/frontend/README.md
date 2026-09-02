# Keyframe — Frontend

## Font Setup

The site uses locally-hosted fonts. Download and place files into `/frontend/fonts/`:

| File | Family | Weight | Download |
|------|--------|--------|----------|
| `BebasNeue-Regular.ttf` | BebasNeue | 400 | [fonts.google.com/specimen/Bebas+Neue](https://fonts.google.com/specimen/Bebas+Neue) |
| `Poppins-Regular.ttf` | Poppins | 400 | [fonts.google.com/specimen/Poppins](https://fonts.google.com/specimen/Poppins) |
| `Poppins-Medium.ttf` | Poppins | 500 | same |
| `Poppins-SemiBold.ttf` | Poppins | 600 | same |
| `Poppins-Bold.ttf` | Poppins | 700 | same |

**Steps:**
1. Go to each Google Fonts URL above
2. Click **Download family** (top right)
3. Extract the zip, find the `.ttf` files listed above
4. Copy them into `frontend/fonts/`

Without fonts the site falls back to system sans-serif — everything still works.

---

## Backend Setup

```bash
cd backend
cp .env.example .env
# Fill in your Supabase and JWT values in .env
npm install
node server.js
```

Server runs on `http://localhost:3000` by default.

---

## Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the schema from `backend/config/supabase.js` (see SQL comments at top of that file)
3. Copy your **Project URL** and **anon key** from Project Settings → API into `.env`

---

## Environment Variables (.env)

```
PORT=3000
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
JWT_SECRET=some-long-random-string
```

Generate a JWT secret: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

---

## Running Without a Backend

The frontend has built-in dummy data fallbacks. Open `frontend/index.html` directly in a browser (or via Live Server) and the roadmap, playlists, and creators sections will populate from hardcoded data automatically.

The admin panel requires the backend to be running.

---

## Admin Panel

Navigate to `admin.html`. You must be logged in as a user with `role = 'admin'`.

To make your first admin, either:
- Set `role = 'admin'` directly in Supabase Table Editor for your user row
- Or use the Users panel once you have another admin account

---

## Project Structure

```
aelearning/
  frontend/
    fonts/          ← add font .ttf files here
    assets/
      icons/
      thumbnails/
    index.html      ← main site
    style.css
    script.js
    admin.html      ← admin panel
    admin.css
    admin.js
    README.md
  backend/
    routes/
      auth.js
      videos.js
      playlists.js
      creators.js
      admin.js
    middleware/
      authMiddleware.js
      adminMiddleware.js
    config/
      supabase.js   ← Supabase SQL schema is here as comments
    server.js
    .env.example
    package.json
```
