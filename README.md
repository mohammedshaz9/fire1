# FireCommand — AI Incident Commander Agent for MRUH

FireCommand is an AI-powered emergency response orchestrator that uses multi-agent systems to manage campus crises (SDG 11, 13, 3).

## 🚀 Deployment Instructions

### **1. Backend (Railway) — Persistent Server**
The backend handles AI Agents, Physics Simulations, and WebSockets.
1. Deploy to [Railway.app](https://railway.app/).
2. Environment Variables:
   - `GOOGLE_AI_KEY`: Your Gemini API Key.
   - `NODE_ENV`: `production`.

### **2. Frontend (Vercel) — Static App**
The frontend is a React/Vite SPA.
1. Connect your repo to [Vercel](https://vercel.com/).
2. **Environment Variables**:
   - `VITE_BACKEND_URL`: The URL of your Railway backend (e.g., `https://firecommand-api.up.railway.app`).
3. **Build Settings**:
   - Framework: `Vite`.
   - Build Command: `npm run build`.
   - Output Directory: `dist`.

## 🛠️ Tech Stack
- **AI**: Gemini 2.0 Flash (Multi-Agent Orchestration).
- **Frontend**: React, Tailwind CSS, Shadcn/UI, Three.js (Digital Twin).
- **Backend**: Node.js, Express, Socket.io, tRPC.
- **Physics**: Cellular Automata (Spread Sim), A* Pathfinding (Terrain/Slope Aware).

---
**Hackathon 2026**
