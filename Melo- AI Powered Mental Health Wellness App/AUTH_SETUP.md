# Google Login + MongoDB (Production Setup)

This project uses **Google OAuth (Authorization Code + PKCE)** and stores/upserts users in **MongoDB**.

## 1) Rotate credentials (important)

If you ever pasted a Google **client secret** into chat or committed it anywhere, **rotate it now** in Google Cloud Console.

## 2) Google Cloud Console settings

In your OAuth client configuration:

- **Authorized JavaScript origins**
  - `https://m-elo.vercel.app`
  - `http://localhost:8080`

- **Authorized redirect URIs**
  - `https://m-elo.vercel.app/api/auth/google/callback`
  - `http://localhost:8080/api/auth/google/callback`

## 3) Environment variables

Set these on **Vercel Project → Settings → Environment Variables** and locally when running the Node server:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `MONGODB_URI`
- `APP_SESSION_SECRET` (random long string)

## 4) Expected flow

Landing Page (`/index.html`)
  ↓
Login button (`/login.html`)
  ↓
Google login
  ↓
Redirect (`/api/auth/google/callback`)
  ↓
`/melo.html`

