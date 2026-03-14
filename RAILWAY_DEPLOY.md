# FireCommand Railway Deployment Guide

I have updated the application to be Railway-ready. All code changes have been pushed to your GitHub repository.

## Step 1: Connect to Railway
1.  Go to [Railway.app](https://railway.app/).
2.  Click **New Project** > **Deploy from GitHub repo**.
3.  Select `mohammedshaz9/fire1`.

## Step 2: Add Environment Variables
Railway needs the following variables (from your local `.env`) to power the AI and Maps. Click on your service in Railway, go to **Variables**, and add:

| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `GOOGLE_AI_KEY` | `YOUR_GOOGLE_AI_KEY` |
| `VITE_GOOGLE_MAPS_API_KEY` | `YOUR_GOOGLE_MAPS_API_KEY` |
| `VITE_MAPBOX_TOKEN` | `YOUR_MAPBOX_TOKEN` |

## Step 3: Verification
Once the build status turns green, Railway will provide a public URL. The app is configured to listen on the correct port and serve the built frontend automatically.

---
**Code Changes Made for Deployment:**
-   Added `railway.json`: Configures the build system to use Nixpacks.
-   Updated `server/_core/index.ts`: Ensures strict port binding on `0.0.0.0` for production environments.
