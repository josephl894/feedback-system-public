# Vercel Deployment Guide

## Quick Deploy

### 1. Push to GitHub
```bash
cd /home/joseph/work/feedback-system
git add .
git commit -m "Add Vercel deployment config"
git push
```

### 2. Deploy to Vercel

**Option A: Via Vercel Dashboard**
1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repository
4. Vercel will auto-detect Vite configuration
5. Click "Deploy"

**Option B: Via CLI**
```bash
npm i -g vercel
vercel login
vercel
```

### 3. Set Up Vercel KV (Required for Login/Register)

The app uses Vercel KV for user data storage:

1. Go to your Vercel project dashboard
2. Click **Storage** tab
3. Click **Create Database** → Select **KV**
4. Name it (e.g., `feedback-kv`)
5. Connect it to your project

This automatically adds the required environment variables:
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`

### 4. Set Environment Variables

In Vercel Dashboard → Settings → Environment Variables, add:

| Variable | Value | Description |
|----------|-------|-------------|
| `ADMIN_USERNAME` | `admin` | Admin username (optional, defaults to 'admin') |
| `ADMIN_PASSWORD` | `your-secure-password` | Admin password (change this!) |
| `INVITE_CODE` | `yoyomarket` | Registration invite code (optional) |

---

## Login Credentials

**Default Admin:**
- Username: `admin`
- Password: `admin123` (or whatever you set in `ADMIN_PASSWORD`)

**Registration Invite Code:** `yoyomarket` (or whatever you set in `INVITE_CODE`)

---

## Architecture Notes

This app uses:
- **Frontend**: React + Vite (deployed as static files)
- **API**: Vercel Serverless Functions
- **User Storage**: Vercel KV (Redis)
- **Market Data**: External API (`https://pipeline-api-production.up.railway.app`)

The market data, feedback, and ratings all come from the external Railway API by default. Only user authentication uses Vercel KV.

---

## Troubleshooting

### "KV_REST_API_URL is not defined"
→ You need to set up Vercel KV storage (see step 3)

### Login not working
→ Check that Vercel KV is connected and environment variables are set

### Market data not loading
→ The external API (`https://pipeline-api-production.up.railway.app`) must be accessible

---

## Local Development

```bash
npm install
npm run dev
```

For local development with the Express server:
```bash
npm start  # Runs Express on port 3001
npm run dev  # Runs Vite dev server on port 3000
```
