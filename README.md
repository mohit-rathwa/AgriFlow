<div align="center">

# 🌾 AgriFlow

### Agentic AI Platform for Indian Agricultural Supply Chain Intelligence

[![Live Demo](https://img.shields.io/badge/🚀_Live_Demo-Vercel-black?style=for-the-badge)](https://agriflow-frontend.vercel.app)
[![Backend API](https://img.shields.io/badge/⚡_API-Render-purple?style=for-the-badge)](https://agriflow-api-f97e.onrender.com)
[![Python](https://img.shields.io/badge/Python-3.11-blue?style=flat-square&logo=python)](https://python.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![LangGraph](https://img.shields.io/badge/LangGraph-Agent-orange?style=flat-square)](https://langchain-ai.github.io/langgraph/)

*Transforming 3.2 million AGMARKNET mandi records into actionable intelligence — predicting price crashes, proving policy impact, and simulating interventions before a single rupee is spent.*

</div>

---

## 📌 The Problem

India is the **world's 2nd largest food producer**, yet:

- **₹92,651 crores** (~$11B) worth of food wasted annually due to supply chain inefficiencies
- **40%** of fruits & vegetables spoil before reaching consumers
- Farmers receive only **15-20%** of the final consumer price
- Price crashes of **50-70%** happen overnight with **zero early warning**
- Government spends ₹2+ lakh crores on MSP — but **no ML-based evidence** of whether it works

> **There is no single platform that combines Process Mining, Causal Inference, Predictive ML, and Agentic AI to solve this.**

---

## 💡 The Solution

AgriFlow is an end-to-end **Agentic AI platform** with 5 core capabilities:

### 1. 🏭 Supply Chain Process Mining
Maps the agricultural supply chain across 6 stages (Harvest → Dispatch), identifies the **#1 bottleneck**, and generates Pareto charts showing cumulative delay contribution.

### 2. 🧬 Causal ML (Double Machine Learning)
Uses econometric ML — not just correlation — to measure the **true causal effect** of MSP policy on farmer prices. Includes placebo tests and OLS bias detection.

### 3. 📈 Predictive Risk Intelligence (XGBoost + SHAP)
Trains on historical price patterns to predict **30-day crash risk probability**. SHAP waterfall charts explain *why* the model predicts what it does.

### 4. 🧪 What-If Simulation Engine
Monte Carlo simulation for cold-chain and transport interventions. Input: "What if we add 50% cold storage?" → Output: Spoilage reduction, value saved, **ROI**.

### 5. 🤖 Intelligence Agent (LangGraph + Gemini 2.0)
Natural language interface — ask *"Why did onion prices crash?"* and the agent **autonomously decides** which ML tools to call, executes them, and streams a data-backed answer.

---

## 🖥️ Screenshots

| Login | Dashboard | AI Agent |
|-------|-----------|----------|
| OAuth 2.0 + Guest Demo | Dark-mode analytics | ChatGPT-style with tool calls |

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────┐
│                   FRONTEND (Vercel)                    │
│        React 18 · TypeScript · Vite · Recharts         │
│        Zustand · TanStack Query · Tailwind CSS         │
└────────────────────────┬─────────────────────────────┘
                         │ HTTPS + SSE
┌────────────────────────▼─────────────────────────────┐
│                   BACKEND (Render)                      │
│              FastAPI · SQLAlchemy 2.0 · Pydantic v2     │
│                                                         │
│  ┌──────────────┐  ┌─────────────────────────────────┐ │
│  │  Auth Router  │  │  ML Workers (Celery + Redis)    │ │
│  │  OAuth 2.0    │  │  • Process Mining               │ │
│  │  JWT Rotation │  │  • Causal ML (Double ML)        │ │
│  └──────────────┘  │  • XGBoost + SHAP               │ │
│                     │  • Monte Carlo Simulation       │ │
│  ┌──────────────┐  └─────────────────────────────────┘ │
│  │ Agent Router  │                                      │
│  │ LangGraph     │  ┌─────────────────────────────────┐ │
│  │ ReAct Loop    │  │  PostgreSQL 16                  │ │
│  │ 6 Tools       │  │  Users · Datasets · MandiRecords│ │
│  │ Gemini 2.0    │  │  AnalysisJobs · Reports         │ │
│  └──────────────┘  └─────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 18, TypeScript, Vite, Zustand, TanStack Query, Recharts, Tailwind CSS |
| **Backend** | Python 3.11, FastAPI, SQLAlchemy 2.0, Pydantic v2, Celery, Redis |
| **AI / ML** | LangGraph, LangChain, Google Gemini 2.0, XGBoost, SHAP, DoubleML, Monte Carlo |
| **Database** | PostgreSQL 16, asyncpg |
| **Auth** | OAuth 2.0 (Google + GitHub), JWT with refresh token rotation, HTTP-only cookies |
| **DevOps** | Docker, Docker Compose, Render (backend), Vercel (frontend) |
| **Data** | AGMARKNET (3.2M records), Pandas, NumPy, chardet |

---

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 16
- Redis

### Backend Setup
```bash
cd backend
cp .env.example .env          # Add your API keys
docker-compose up -d --build  # Starts API + DB + Redis + Worker
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev                   # Opens at http://localhost:5173
```

### Environment Variables
```env
# Backend (.env)
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/agriflow
REDIS_URL=redis://localhost:6379/0
GOOGLE_API_KEY=your-gemini-api-key
GOOGLE_CLIENT_ID=your-oauth-client-id
GOOGLE_CLIENT_SECRET=your-oauth-client-secret
JWT_SECRET=your-jwt-secret

# Frontend (.env)
VITE_API_URL=http://localhost:8000/api
```

---

## 📊 Impact Metrics (Simulated)

| Metric | Value |
|--------|-------|
| Post-harvest spoilage reduction | **12.5%** with 50% cold-chain increase |
| Value saved per intervention | **₹1.5 crore** per commodity per state |
| Cold-chain investment ROI | **200%** |
| Price crash prediction accuracy | **88%** (ROC-AUC: 0.92) |
| Advance crash warning | **7 days** ahead |

---

## 🎯 Target Users

| User | Use Case |
|------|----------|
| **FPO Leaders** | Price crash alerts → advise 500+ member farmers |
| **State Agriculture Officers** | Bottleneck analysis → allocate infrastructure budgets |
| **Policy Researchers** | Causal impact of MSP → evidence-based policy recommendations |
| **AgriTech Startups** | ROI simulation → cold-chain investment pitches to investors |
| **Commodity Traders** | 30-day risk calendar → informed trading decisions |

---

## 📁 Project Structure

```
agriflow/
├── frontend/                  # React + TypeScript + Vite
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   │   ├── charts/        # Recharts visualizations
│   │   │   ├── chat/          # Agent chat UI
│   │   │   └── layout/        # App shell, sidebar
│   │   ├── hooks/             # Custom React hooks
│   │   ├── pages/             # Route pages
│   │   ├── services/          # Axios API client
│   │   ├── store/             # Zustand state
│   │   └── types/             # TypeScript interfaces
│   └── package.json
│
├── backend/                   # Python + FastAPI
│   ├── app/
│   │   ├── core/              # Config, security, database
│   │   ├── models/            # SQLAlchemy ORM models
│   │   ├── routers/           # API endpoints
│   │   │   ├── auth.py        # OAuth 2.0 flows
│   │   │   ├── datasets.py    # CSV upload & quality
│   │   │   ├── analysis.py    # ML job management
│   │   │   ├── agent.py       # AI agent SSE endpoint
│   │   │   ├── simulate.py    # What-if simulation
│   │   │   └── reports.py     # Auto-generated reports
│   │   ├── services/
│   │   │   ├── ml/            # ML engines
│   │   │   │   ├── process_mining.py
│   │   │   │   ├── causal_ml.py
│   │   │   │   ├── prediction.py
│   │   │   │   └── simulation.py
│   │   │   └── agent/         # LangGraph agent
│   │   │       ├── graph.py   # ReAct agent loop
│   │   │       ├── tools.py   # 6 domain tools
│   │   │       └── embeddings.py
│   │   └── workers/           # Celery background tasks
│   ├── Dockerfile
│   └── docker-compose.yml
└── README.md
```

---

## 👤 Author

**Mohit Rathwa**
- GitHub: [@mohit-rathwa](https://github.com/mohit-rathwa)

---

## 📄 License

This project is open source under the [MIT License](LICENSE).
