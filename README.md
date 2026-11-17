# Melo — Mental wellness companion

[![Node](https://img.shields.io/badge/node-%3E%3D18-339933?logo=node.js&logoColor=white)](https://nodejs.org/)

**Melo** is a therapist-informed mental wellness web app built for Gen Z: AI chat, journaling, mood insights, grounding tools, and an anonymous **Vent Room** for peer support. It runs as a **Progressive Web App (PWA)** and can sync data through **MongoDB** when deployed.

**Repository:** (https://github.com/PranjalDabholkar/Melo--AI-Powered-Mental-Wellness-) · **Author on GitHub:** [@PranjalDabholkar](https://github.com/PranjalDabholkar)

---

## Highlights

| Area | What you get |
|------|----------------|
| **Auri chat** | Guided, supportive AI companion (Gemini) with wellness-focused replies and built-in FAQs |
| **Journal** | Mood check-ins, text and voice-friendly flow, export options |
| **Insights** | Mood trends, charts, downloadable reports (SVG/PNG) |
| **Toolkit** | Breathing (4‑4‑6), grounding, thought challenges, daily quests |
| **Vent Room** | Anonymous shared chat; WebSocket when available, HTTP polling fallback; short retention for privacy |
| **Aid & safety** | Crisis-oriented prompts and India-focused helpline references in-app |
| **Guest or account** | Use locally as guest or tie data to a simple account flow |
| **PWA** | Installable; service worker and manifest for an app-like experience |

---

## Feature showcase

### AI companion (Auri)

- Natural-language chat tuned for mental wellness boundaries  
- Integration with **Google Gemini** (`gemini-2.5-flash-lite` in config)  
- Quick answers for common topics (stress, sleep, journaling tips, “who built Melo,” etc.)

### Journal & mood

- Emoji mood scale and free-form entries  
- History stored locally and optionally synced via API to MongoDB  
- **Insights** view with visual mood analytics and exports  

### Vent Room

- Public, **anonymous** room (display names like `Anon-xxxx`)  
- **Real-time** path: WebSocket on the Node server  
- **Fallback**: `GET /api/vent/history` + `POST /api/vent` polling for static/serverless hosts  
- Messages expire on a **short TTL** (e.g. ~3 minutes) to limit long-term retention  
- **Vercel**: serverless routes under `api/`; see `vercel.json` for routing  

### Toolkit & wellness

- Structured exercises: breathing, grounding, thought reframing  
- Gratitude-style prompts and gamified “quest” copy where applicable  

### Privacy & data

- Guest mode keeps more data on-device  
- Vent content is ephemeral by design (TTL + MongoDB TTL index on vent messages)  
- For OAuth/session setup, see `AUTH_SETUP.md`  

---

## Tech stack

| Layer | Technologies |
|--------|----------------|
| **Frontend** | Vanilla JS, Tailwind CSS, Lucide icons, PWA manifest & service worker |
| **Backend** | Node.js, `http` + **WebSocket** (`ws`), optional **Vercel** serverless handlers in `api/` |
| **Database** | **MongoDB** + **Mongoose** (users, journal, Auri history, vent messages) |
| **AI** | Google Gemini API |
| **Deploy** | Vercel (static + functions), Render (`render.yaml`), or any Node host |

---

## Project layout (overview)

```
public/          # Static pages: index, melo.html, about, login, assets
src/             # app.js (main UI), config, services, modules
server/          # Node server, Mongo models, auth helpers
api/             # Vercel-style serverless endpoints (vent, health, auth callbacks)
```

---

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+  
- MongoDB URI (Atlas or local) if you want cloud sync  

### Install & run locally

```bash
git clone https://github.com/Adien-pearce/MElo.git
cd MElo
npm install
```

Create a `.env` in the project root (see `.env.example`):

```env
MONGODB_URI=mongodb+srv://...
# Optional for Google OAuth flows:
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
APP_SESSION_SECRET=
```

Start the app:

```bash
npm run start
```

Open `http://localhost:8080` (or the port in your env). For dev with CSS watch:

```bash
npm run dev
```

### Build CSS (production)

```bash
npm run build:css:prod
```

---

## Deployment

- **Vercel:** set environment variables in the project dashboard; ensure `api/*` routes match `vercel.json`.  
- **Render:** see `render.yaml`; set `MONGODB_URI` and other secrets in the service environment.  
- Detailed OAuth and env notes: **`AUTH_SETUP.md`**.

---

## Founder

**Pranjal Dabholkar** — Designer and coder.  
More context on the product: **[About Melo](public/about.html)** (served as `/about.html` when hosted).

---

## Links

- **GitHub profile:** [github.com/PranjalDabholkar](https://github.com/PranjalDabholkar)  
- **This repo:** [github.com/PranjalDabholkar/Melo--AI-Powered-Mental-Wellness-](https://github.com/PranjalDabholkar/Melo--AI-Powered-Mental-Wellness-)
