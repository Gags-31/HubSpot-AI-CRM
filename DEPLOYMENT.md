# Deploying HubSpot to Render

The repository already contains a `render.yaml` at the root, so Render can build and run the entire stack (FastAPI API + the Next.js static site) as one web service with zero extra configuration.

## Steps
1. Go to https://dashboard.render.com (sign in with your GitHub account `Gags-31`).
2. **New → Blueprint** (or connect an existing GitHub repository).
3. Select the repository `Gags-31/HubSpot-AI-CRM`.
4. Render reads `render.yaml` automatically. Click **Apply**.
5. First deploy takes 5–8 minutes (npm install + Next.js build + Python install).
6. Your app will be live at:
   `https://hubspot-ai-crm.onrender.com`

## What you get
- `/` — API landing + agent console
- `/web/` — the Next.js website (dashboard, chat, catalog, orders, proposals, 360°, platform)
- `/docs` — Swagger / OpenAPI
- `/architecture.html` — 16 module flowcharts
- `/health` — health probe
- Demo login: `dealer / dealer@123`

## Notes
- Free plan sleeps after 15 minutes of inactivity; the first request after sleep takes ~30s to wake up.
- SQLite state and uploaded assets are ephemeral on the free plan and reset on each deploy. For persistent data, attach a Render Disk and set `HUBSPOT_DB` to a path on that disk.
- To enable LLM narratives set `OPENAI_API_KEY` in the Render environment tab.
- Auto-deploy on push is on by default.