# 🚀 AgriFlow Deployment Guide

The Agentic Intelligence upgrade is complete! The entire platform (Frontend, Backend, ML workers, Database, and LangGraph Agent) is now fully implemented and successfully building.

To deploy this as soon as possible, you have two primary options depending on your preference and budget. Since you want to deploy this for your resume, **Option 1 (Render + Vercel)** is the most common, cost-effective (free tier), and professional approach.

---

## Option 1: Cloud Deployment (Render + Vercel) — *Recommended for Resumes*

This option hosts your backend on Render (which handles Docker containers well) and your frontend on Vercel (perfect for Vite/React).

### 1. Initialize Git Repository
First, initialize a git repository specifically for your project and push it to GitHub:
```bash
cd agriflow
git init
git add .
git commit -m "Initial commit: AgriFlow Intelligence Platform"
# Go to github.com, create a new repo, and follow the instructions to push:
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```

### 2. Deploy Backend & Workers (Render)
1. Create a free account at [Render.com](https://render.com/).
2. Create a **New PostgreSQL Database** on Render. Save the internal database URL.
3. Create a **New Redis Instance** on Render (or use Upstash for a free Redis server).
4. Create a **New Web Service**:
   - Connect it to your GitHub repo.
   - Set the Root Directory to `backend`.
   - Environment: `Docker`.
   - Set Environment Variables:
     - `DATABASE_URL` (from Render PostgreSQL)
     - `REDIS_URL` (from Redis/Upstash)
     - `GOOGLE_API_KEY` (Get your free key from [Google AI Studio](https://aistudio.google.com/))
     - `JWT_SECRET_KEY` (generate a random string)
5. Create a **New Background Worker**:
   - Same repo and root directory (`backend`).
   - Environment: `Docker`.
   - Set the start command to: `celery -A app.workers.celery_worker worker --loglevel=info`
   - Copy the same Environment Variables as the Web Service.

### 3. Deploy Frontend (Vercel)
1. Go to [Vercel.com](https://vercel.com/) and create a new project.
2. Import your GitHub repository.
3. Set the Root Directory to `frontend`.
4. Vercel will automatically detect Vite. 
5. In **Environment Variables**, add:
   - `VITE_API_URL` = `https://<your-render-backend-url>/api`
6. Click **Deploy**.

---

## Option 2: VPS Deployment (DigitalOcean, AWS EC2, etc.)

If you prefer to host everything on a single virtual machine (like a $5-$10/month DigitalOcean droplet), you can use the included Docker Compose setup.

1. SSH into your VPS server.
2. Clone your repository: `git clone <your-github-repo-url>`
3. Navigate to the project directory: `cd agriflow`
4. Copy the environment file and fill in the missing keys (especially `GOOGLE_API_KEY`):
   ```bash
   cp backend/.env.example backend/.env
   ```
5. Spin up the entire stack:
   ```bash
   docker-compose up -d --build
   ```
This single command will boot up PostgreSQL, Redis, the FastAPI Backend, and the Celery ML Workers simultaneously.

> [!IMPORTANT]
> The AI Agent requires a Gemini API Key to function. Get your free key at [Google AI Studio](https://aistudio.google.com/app/apikey) and ensure it's added to your `.env` or Render environment variables!
