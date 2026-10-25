# 🚀 Production Cloud Deployment Guide

This guide will take you step-by-step through deploying the **Online Examination & Proctoring System** to free cloud hosting so you can share a live HTTPS link with your college evaluation panel.

---

## 🏗️ Architecture for Cloud Deployment

```
   ┌─────────────────────────────────────────────────────────────┐
   │                    College Panel / User                     │
   │               https://exam-portal.vercel.app                │
   └──────────────────────────────┬──────────────────────────────┘
                                  │
                   HTTPS / WSS    ▼
   ┌─────────────────────────────────────────────────────────────┐
   │               Frontend Client (Vercel)                      │
   │  • Vite + React 18 SPA                                      │
   │  • vercel.json rewrite routing                              │
   │  • Global Edge CDN                                          │
   └──────────────────────────────┬──────────────────────────────┘
                                  │
             REST API (Cookies)   ▼   Socket.IO (WSS)
   ┌─────────────────────────────────────────────────────────────┐
   │                Backend API Server (Render)                  │
   │  • Node.js 20 + Express                                     │
   │  • Helmet CSP + NoSQL Sanitizer                             │
   │  • Socket.IO Live Watchdog                                  │
   │  • URL: https://exam-server.onrender.com                    │
   └──────────────────────────────┬──────────────────────────────┘
                                  │
                                  ▼
   ┌─────────────────────────────────────────────────────────────┐
   │                 Database (MongoDB Atlas)                    │
   │  • Free Tier M0 Cluster (512 MB)                            │
   │  • Automatic automated backups & cloud connectivity         │
   └─────────────────────────────────────────────────────────────┘
```

---

## Step 1: Push Code to GitHub

1. Open your browser and go to [GitHub](https://github.com/new).
2. Create a new repository named `online-examination-proctoring`.
   - Leave it **Public** (or Private).
   - Do **NOT** check "Add README", "Add .gitignore", or "Add license" (we already have them committed).
   - Click **Create repository**.
3. In your local terminal, run the following commands (replace `<YOUR_GITHUB_USERNAME>` with your actual GitHub username):

```powershell
cd "c:\Users\ANKIT PATEL\OneDrive\Documents\Desktop\SEM -5\JsFramework\online-examination-proctoring"

git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/online-examination-proctoring.git
git branch -M main
git push -u origin main
```

---

## Step 2: Setup Free Cloud Database (MongoDB Atlas)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and sign in (or create a free account).
2. Create a **Free Shared Cluster (M0)**:
   - Select cloud provider (AWS / Google Cloud) and region closest to you (e.g. Mumbai / ap-south-1).
   - Click **Create Deployment**.
3. **Security -> Database Access**:
   - Add new database user (e.g. `exam_admin` with password `SecurePassword123!`).
   - Grant role: **Read and write to any database**.
4. **Security -> Network Access**:
   - Click **Add IP Address** -> Select **Allow Access From Anywhere** (`0.0.0.0/0`).
   - Click **Confirm** (essential so Render can connect).
5. **Get Connection String**:
   - Go to **Database** -> click **Connect** on your cluster -> Select **Drivers** (Node.js).
   - Copy connection string. It looks like:
     ```
     mongodb+srv://exam_admin:SecurePassword123!@cluster0.xxxxx.mongodb.net/exam_proctoring?retryWrites=true&w=majority
     ```

---

## Step 3: Deploy Backend API (Render.com)

1. Go to [Render.com](https://render.com) and sign in using your GitHub account.
2. Click **New +** -> **Web Service**.
3. Select your GitHub repository: `online-examination-proctoring`.
4. Configure service settings:
   - **Name:** `online-exam-api` (or similar)
   - **Region:** Singapore / Oregon / Frankfurt
   - **Branch:** `main`
   - **Root Directory:** `server`
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** `Free`
5. Click **Advanced** -> **Add Environment Variable**:

| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `5000` |
| `MONGODB_URI` | *Your MongoDB Atlas connection string from Step 2* |
| `CLIENT_URL` | `https://<YOUR_VERCEL_PROJECT_NAME>.vercel.app` *(update once frontend is deployed)* |
| `JWT_ACCESS_SECRET` | `09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7` |
| `JWT_REFRESH_SECRET` | `8a70c0c7fae987c8d929427b3b4f981e4b01e3b2b93478d10b754388e6a32d18` |
| `BCRYPT_ROUNDS` | `12` |

6. Click **Create Web Service**.
7. Once deployed, note down your Render backend URL (e.g. `https://online-exam-api.onrender.com`).
8. **Seed Demo Accounts on Cloud DB**:
   - On the Render dashboard for your service, click the **Shell** tab on the left menu.
   - Run:
     ```bash
     npm run seed:admin
     ```
   - This seeds `admin@examportal.dev` / `Admin@1234!` directly into your MongoDB Atlas database.

---

## Step 4: Deploy Frontend (Vercel)

1. Go to [Vercel](https://vercel.com) and log in with GitHub.
2. Click **Add New...** -> **Project**.
3. Import your `online-examination-proctoring` repository.
4. Configure project:
   - **Framework Preset:** `Vite`
   - **Root Directory:** Click "Edit" and choose `client`
   - **Build and Output Settings:** Leave default (`npm run build`, `dist`)
5. Open **Environment Variables** and add:

| Key | Value |
|---|---|
| `VITE_API_BASE_URL` | *Your Render URL from Step 3 (e.g. `https://online-exam-api.onrender.com`)* |

6. Click **Deploy**.
7. Once deployment finishes in ~45 seconds, Vercel gives you your live HTTPS URL:
   ```
   https://online-examination-proctoring-xxxx.vercel.app
   ```
8. **Final Link Sync**:
   - Go back to **Render** -> your web service -> **Environment**.
   - Update `CLIENT_URL` with your exact Vercel URL (e.g. `https://online-examination-proctoring-xxxx.vercel.app`).
   - Render will automatically re-deploy in 30 seconds.

---

## 🎯 Verification Checklist for the Panel

When sharing the link with your evaluation panel:
1. Provide the live Vercel link: `https://<YOUR-PROJECT>.vercel.app`.
2. Provide demo credentials:
   - **Admin:** `admin@examportal.dev` / `Admin@1234!`
   - **Teacher:** Create one or use seeded teacher credentials.
   - **Student:** Register a new student account live on the spot.
3. Test the live flow:
   - Create an exam as Teacher.
   - Take exam as Student with webcam proctoring & fullscreen lock.
   - Submit and observe auto-grading and live teacher proctoring logs.
