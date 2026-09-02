# Keyframe — Project Summary & Handoff

*Written after a full recovery of this project's local files from Claude Code's session
transcript (see "Recovery Notes" at the bottom for what happened and what to double-check).*

## What this is

**Keyframe** (originally "AEPath") is a free After Effects learning platform. It curates
free YouTube tutorials, playlists, and creators, organized by skill level (Beginner /
Intermediate / Pro / Misc), plus a curated paid-courses page. Built by ArsynFX.

- **Live URL:** https://keyframe.onrender.com
- **Admin panel (obscured URL, not linked anywhere):** `/dspsoIOO9034385.html`
- **GitHub:** https://github.com/6XeroX9/keyframe
- **Hosting:** Render.com, free tier (Hobby workspace plan, Free compute instance —
  sleeps after 15 min idle, ~30s cold start on next visit)
- **Database:** Supabase (Postgres), project ref `fryubpmnxpswyvkeulwy`

## Tech stack

- **Backend:** Node.js + Express, CommonJS (no TypeScript), in `aelearning/backend/`
- **Database:** Supabase via `@supabase/supabase-js` v2 — service-role key used
  server-side only (bypasses RLS), never exposed to the frontend
- **Auth:** Custom JWT (`jsonwebtoken` + `bcryptjs`), not Supabase Auth. Admin role is
  re-verified against the live `users` table on every admin request (not trusted from
  the JWT payload alone — this was a deliberately fixed security bug)
- **Frontend:** Vanilla HTML/CSS/JS, no framework, in `aelearning/frontend/`
- **Fonts:** BebasNeue (display) + Poppins (body), self-hosted `.ttf` files
- **External API:** YouTube Data API v3 (free tier, no billing required) — used for
  fetching creator avatars/banners and importing YouTube playlists

## Folder structure

```
C:\AE-Hub\
├── render.yaml              # Render Blueprint — build/start commands + declared env vars
├── .gitignore
├── aelearning/
│   ├── supabase-setup.sql   # DB schema reference
│   ├── backend/
│   │   ├── server.js        # Express app entry point
│   │   ├── .env             # NEVER commit — Supabase keys, JWT secret, YouTube key
│   │   ├── .env.example
│   │   ├── config/supabase.js
│   │   ├── middleware/      # authMiddleware.js, adminMiddleware.js
│   │   ├── routes/          # admin.js, auth.js, creators.js, playlists.js, search.js, videos.js
│   │   └── utils/youtube.js # YouTube Data API helpers
│   └── frontend/
│       ├── index.html, script.js          # homepage
│       ├── style.css, pages.css, admin.css
│       ├── shared.js                      # shared nav/auth/modal logic for inner pages
│       ├── search-widget.js               # navbar search icon, injected on every page
│       ├── transitions.js                 # page-transition shutter animation
│       ├── progress.js                    # localStorage watch/save progress tracking
│       ├── dspsoIOO9034385.html + admin.js + admin.css   # admin panel (obscured URL)
│       ├── 404.html                       # retro-TV 404 page with a render-crash easter egg
│       ├── roadmap/ (index, beginner, intermediate, pro, misc)
│       ├── playlists/ (index, view/)
│       ├── creators/, courses/, shortcuts/, search/
│       ├── fonts/           # BebasNeue + Poppins .ttf files
│       └── uploads/avatars/, uploads/banners/   # locally-hosted creator images
```

## Database (Supabase) — current state

- **creators**: 73 rows, all with `avatar_url`/`banner_url` pointing to local
  `/uploads/avatars/...` and `/uploads/banners/...` paths (downloaded from YouTube,
  not hotlinked — hotlinking caused unreliable loading in some browsers/extensions)
- **videos**: 533 rows. `level` is one of `beginner` / `intermediate` / `advanced`
  (labeled "Pro" in the UI) / `misc` / `playlist` (playlist-only content, excluded
  from the roadmap level pages by design). Has a `sort_order` column controlling
  drag-and-drop order set from the admin panel.
- **playlists**: currently featured playlists shown in the homepage "Community
  Picks" section — manageable via the admin Playlists panel's Featured toggle.
- **users**: custom auth, `role` is `user` or `admin`.

## Key design decisions worth knowing

1. **API paths are relative** (`/api`, not a hardcoded host) so the same code works
   locally and deployed without changes.
2. **Server reads `PORT` from env** (`process.env.PORT || 3000`) — required for Render.
3. **Admin panel is at an obscured URL**, not real access control — the actual
   protection is server-side role re-verification on every `/api/admin/*` request.
   The obscured URL just keeps it out of casual discovery/search engines.
4. **Creator avatars/banners are downloaded locally**, not hotlinked to YouTube's CDN
   — this was a deliberate fix after hotlinked images loaded unreliably for some users
   (likely browser extensions blocking `googleusercontent.com`/`ggpht.com`).
5. **Playlist videos use `level = 'playlist'`** specifically so imported YouTube
   playlists (e.g. Vane Motion's documentary series) don't pollute the main
   Beginner/Intermediate/Pro roadmap pages, while still being viewable via their own
   playlist detail page.
6. **The homepage creator marquee** shows all creators in 3 auto-scrolling rows
   (alternating direction) built from real DB data, no dummy placeholders.
7. **Search** (`/search`) hits a dedicated `/api/search?q=` backend endpoint that
   queries both videos and creators in parallel.

## Deploying / redeploying

Render auto-deploys from the `main` branch on push (Blueprint-based, `render.yaml` at
repo root). To push updates:
```bash
cd C:\AE-Hub
git add -A
git commit -m "your message"
git push
```
Required env vars (set in Render's dashboard, never committed): `SUPABASE_URL`,
`SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, `YOUTUBE_API_KEY`.

## Known pending items (not yet built)

From the most recent open requests in this project:
1. **Admin toggle to show/hide homepage sections** (e.g. hide the Courses section)
   — not yet implemented.
2. **Playlists page "View All Playlists" bug** — reported to only show the most
   recently-fetched playlist instead of all of them; not yet investigated/fixed.
3. **Fetch playlist thumbnails from YouTube** for the Community Picks cards (currently
   they show a plain gradient/placeholder, not the actual YouTube playlist thumbnail).
4. Optional/exploratory: a full migration off a separate Node server to Supabase Auth
   + Edge Functions + a purely static frontend, discussed but not started — would
   remove Render hosting entirely at the cost of a substantial rewrite.

---

## Recovery notes (why this file exists)

Partway through this project, the local `C:\AE-Hub` folder was found to be missing —
none of the actual project files existed on disk anymore, even though extensive work
had visibly been done on them in the conversation history. The Supabase database was
confirmed completely intact and unaffected (this is separate cloud infrastructure).

The project was rebuilt by parsing Claude Code's own session transcript logs (stored
locally at `C:\Users\gamin\.claude\projects\C--AE-Hub\*.jsonl`), which record every
file Read/Write/Edit tool call made during the session. A script reconstructed each
file's final content by replaying writes and edits in chronological order across the
three transcript files that were actually part of this project (two others in the same
folder belonged to unrelated projects — a "frameio clone" and a portfolio site — and
were correctly excluded).

**What was fully recovered:** all backend code, all frontend code (HTML/CSS/JS), the
DB schema reference, `render.yaml`, `.gitignore`, and `.env.example` — 43 source files,
byte-accurate from the transcript.

**What could not be recovered from the transcript** (binary content never appears as
text in tool logs) **but was successfully restored from other sources:**
- Creator avatar/banner images (144 files) — re-fetched fresh from YouTube's API using
  the intact `youtube_url` field on each creator record in Supabase.
- Font files (5 `.ttf` files) — re-downloaded from Google Fonts' official open-source
  GitHub repository (these are freely licensed, not proprietary).

**What was not recovered and doesn't matter:** `node_modules/` and `package-lock.json`
(regenerated via `npm install`), and the original git commit history (a fresh repo was
initialized — the GitHub remote at `6XeroX9/keyframe` still has the old history if it's
ever needed, since that push happened before the local files went missing).

**Everything was re-verified end-to-end after recovery**: server starts cleanly, all
73 creators show avatars, search works, the admin panel loads, images and fonts serve
correctly, and the DB counts match what was live before (533 videos, 3 playlists).
