# KEYFRAME: free static deployment

## What this change delivers

The Cloudflare Pages build reads public content from Supabase and publishes a versioned catalog together with HTML, CSS, JavaScript, fonts and existing creator images. Public roadmap, creator, playlist, course and search requests read that file. They never wake the Render API. YouTube serves its own thumbnails and video player. The hero library loads after the page scripts, so its download or WebGL failure does not block tutorials.

The build rejects missing data or local images instead of publishing demo records. Failed Cloudflare builds leave the previous deployment live. Content is a snapshot; saving in the admin does not publish until the next successful build. Public fields are allowlisted, user accounts are never exported, personal playlists are excluded unless featured, and inactive courses are excluded.

## First deployment

1. Restore access to the existing Supabase project. The configured hostname failed DNS lookup during migration preparation; check project status in the dashboard.
2. Push the reviewed changes to the site's existing Git repository. This also deploys the admin publish endpoint to Render through its existing auto-deploy configuration.
3. In Cloudflare, create a **Pages** project connected to that repository. Use a temporary `pages.dev` address first.
4. Configure: framework preset **None**, repository root, build command **npm run build**, output directory **dist**, environment variable **NODE_VERSION=22**.
5. Add build environment variables **SUPABASE_URL** and **SUPABASE_SERVICE_ROLE_KEY** using the existing project's values. Keep the key in Cloudflare's protected environment configuration; never commit it. Set **KEYFRAME_API_BASE=https://keyframe.onrender.com/api** for this first stage. Only trusted production builds should receive database credentials.
6. Deploy and verify real counts, images, search, every roadmap level and playlist details before changing any domain.
7. Create a Pages deploy hook for the production branch. Store its URL only in the Render environment as **CLOUDFLARE_DEPLOY_HOOK**. The existing authenticated admin panel gains a **Publish Website** button in Backup / Restore. It confirms the request was queued; Cloudflare deployment status confirms when content is live.

Cloudflare configuration reference: https://developers.cloudflare.com/pages/configuration/build-configuration/
Deploy hooks: https://developers.cloudflare.com/pages/configuration/deploy-hooks/

## Local verification

Node 22 or later. From the repository root:

```powershell
npm test
npm run build
```

Local builds read `aelearning/backend/.env` if present. Cloud builds use environment variables. Only `dist` is deployed; it contains no backend code or service credentials. The normal Express preview still uses live APIs through the checked-in `site-config.js`.

## Current scope and remaining work

Stage 1 removes the Render delay from public browsing. Login, registration, personal dashboards, newsletter subscriptions and admin actions still call the existing backend and can experience a Render wake-up delay. They do not run automatically during public browsing. Existing account credentials are unchanged, but users must sign in again on a different hostname. Browser-only saved/watched items remain on the original hostname; an export/import migration is needed before switching an established audience to a new domain.

Stage 2 must migrate accounts and protected mutations off Express before Render can be retired. Supabase Auth migration needs an account inventory and a tested migration/reset strategy; direct database access needs explicit RLS policies. The legacy SQL file disables RLS and is not suitable for a browser-direct migration. Do not enable browser access using the service-role key.

New local creator images must be added to the source repository before publishing. Existing root-relative image paths are verified at build time. Static output currently uses the existing image formats; image compression is a separate follow-up once the real catalog is available.

Free hosting does not mean unlimited database or build usage. Cloudflare Pages currently allows 500 builds/month; batch content edits before publishing. Supabase Free may pause with low activity. Already published pages and catalog remain usable if that happens; accounts and editing need the database restored.

## Rollback

Keep the original Render site available during validation. Cloudflare supports returning to an earlier successful deployment. No production database changes are made by the exporter.
