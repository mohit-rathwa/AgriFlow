from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from dotenv import load_dotenv
import os
from pymongo import MongoClient

from routes.predict import router as predict_router
from routes.chat import router as chat_router

load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: connect to MongoDB
    mongo_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017/agriflow")
    app.state.mongo_client = MongoClient(mongo_uri)
    app.state.db = app.state.mongo_client.get_default_database()
    print("Connected to MongoDB!")
    yield
    # Shutdown: close connection
    app.state.mongo_client.close()
    print("MongoDB connection closed.")

app = FastAPI(title="AgriFlow ML Service", lifespan=lifespan)

# CORS — allow Node.js backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(predict_router, prefix="/predict", tags=["Prediction"])
app.include_router(chat_router, prefix="/chat", tags=["Chat"])

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "AgriFlow ML"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
