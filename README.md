# AgriFlow
AgriFlow — A unified platform connecting farmers and mandis with AI-powered insights and smart supply chain management.

## Tech Stack
| Tier | Technologies |
|---|---|
| **Frontend** | React, Vite, Tailwind CSS |
| **Backend** | Node.js, Express, MongoDB, Redis |
| **ML Service** | Python, FastAPI, XGBoost, LangGraph |

## Project Structure
```
agriflow/
├── client/         # React frontend
├── server/         # Node.js backend
└── ml-service/     # Python ML and AI APIs
```

## Quick Start
1. Clone the repository and install dependencies in each directory (`client`, `server`, `ml-service`).
2. Set up your `.env` files in `server`, `client`, and `ml-service` (reference `.env.example`).
3. Start the backend: `cd server && npm run dev`
4. Start the frontend: `cd client && npm run dev`

## API Endpoints

| Category | Endpoints |
|---|---|
| **Auth** | `/api/auth/register`, `/api/auth/login`, `/api/auth/me` |
| **Farmer** | `/api/farmer/profile`, `/api/farmer/inventory`, `/api/farmer/inventory/:id`, `/api/farmer/orders` |
| **Mandi** | `/api/mandi/prices`, `/api/mandi/orders`, `/api/mandi/buy`, `/api/mandi/bids` |
| **Admin** | `/api/admin/users`, `/api/admin/system-stats`, `/api/admin/transactions` |
| **ML** | `/api/ml/price-prediction`, `/api/ml/crop-recommendation`, `/api/ml/analyze-demand`, `/api/ml/chat` |

## Interview Defense
- **Why MongoDB?** Flexible schema design allows us to easily handle varying inventory types and rapidly changing market data without constant schema migrations.
- **Why XGBoost?** It excels at tabular data (like crop features, weather, and historical prices) and is much faster to train and interpret than complex neural networks for this specific problem domain.
- **Why LangGraph?** It allows us to build stateful, multi-agent conversational workflows for the chat assistant, providing better contextual memory and routing than standard single-prompt LLM chains.
- **Why JWT?** Stateless authentication scales easily across multiple backend instances and seamlessly integrates with our decoupled frontend and ML microservices.
- **Why microservices for ML?** Separating Python/ML workloads from Node.js ensures our core business logic and API remain responsive even when resource-intensive ML models are performing predictions.
