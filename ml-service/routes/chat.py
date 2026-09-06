from fastapi import APIRouter, Request
from pydantic import BaseModel
import os
from typing import Dict, Any, List
from datetime import datetime, timedelta

router = APIRouter()

class ChatRequest(BaseModel):
    message: str
    userId: str = "anonymous"

@router.post("/")
async def chat_endpoint(req: ChatRequest, request: Request) -> Dict[str, Any]:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or api_key == "your-gemini-api-key":
        return {
            "response": "AI Advisor is not configured yet. Add your GEMINI_API_KEY to ml-service/.env to enable this feature."
        }

    try:
        from langchain_google_genai import ChatGoogleGenerativeAI
        from langchain_core.messages import HumanMessage, AIMessage
        from langgraph.graph import StateGraph, END
        from typing import TypedDict

        db = request.app.state.db

        # --- Tool: fetch real price data from MongoDB ---
        def get_recent_prices(commodity: str, state: str, days: int = 30) -> str:
            cutoff = datetime.utcnow() - timedelta(days=days)
            records = list(db.dailyprices.find(
                {
                    "commodity": {"$regex": commodity, "$options": "i"},
                    "state": {"$regex": state, "$options": "i"},
                    "arrivalDate": {"$gte": cutoff}
                },
                {"modalPrice": 1, "arrivalDate": 1, "_id": 0}
            ).sort("arrivalDate", -1).limit(10))

            if not records:
                return f"No recent price data found for {commodity} in {state}."

            prices = [r["modalPrice"] for r in records if r.get("modalPrice")]
            if not prices:
                return f"Data found but no modal prices recorded for {commodity} in {state}."

            avg = sum(prices) / len(prices)
            latest = prices[0]
            trend = "rising" if prices[0] > prices[-1] else "falling" if prices[0] < prices[-1] else "stable"
            return (
                f"{commodity} in {state}: Latest modal price ₹{latest}/quintal. "
                f"30-day average ₹{avg:.0f}/quintal. Trend: {trend}. "
                f"Based on {len(prices)} recent records."
            )

        # --- Extract commodity and state from user message (simple keyword matching) ---
        def extract_context_from_message(message: str) -> str:
            msg_lower = message.lower()
            commodities = ["onion", "wheat", "rice", "tomato", "potato", "maize", "groundnut"]
            states = ["maharashtra", "madhya pradesh", "uttar pradesh", "rajasthan", "karnataka", "gujarat", "punjab"]

            found_commodity = next((c for c in commodities if c in msg_lower), None)
            found_state = next((s for s in states if s in msg_lower), None)

            if found_commodity and found_state:
                return get_recent_prices(found_commodity, found_state.title())
            elif found_commodity:
                return get_recent_prices(found_commodity, "Maharashtra")  # default state
            else:
                return "No specific commodity/state detected. Providing general agricultural advice."

        # --- LangGraph state ---
        class AgentState(TypedDict):
            messages: List[Any]
            context: str

        llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash", google_api_key=api_key)

        # Node 1: Data Agent — pulls real data from MongoDB
        def data_agent_node(state: AgentState):
            user_message = state["messages"][-1].content
            context = extract_context_from_message(user_message)
            state["context"] = context
            return state

        # Node 2: Advisor Agent — uses Gemini to write a farmer-friendly response
        def advisor_agent_node(state: AgentState):
            prompt = f"""You are AgriFlow's AI advisor for Indian farmers. Be concise, practical, and helpful.

User's question: {state['messages'][-1].content}

Real market data: {state['context']}

Instructions:
- Answer in 2-3 sentences maximum
- Use simple language (imagine explaining to a farmer)
- Include the price data if available
- If prices are rising, suggest the farmer might wait to sell
- If prices are falling, suggest selling soon
- Always end with one practical tip
"""
            response = llm.invoke([HumanMessage(content=prompt)])
            state["messages"].append(AIMessage(content=response.content))
            return state

        # Build LangGraph
        workflow = StateGraph(AgentState)
        workflow.add_node("data_agent", data_agent_node)
        workflow.add_node("advisor_agent", advisor_agent_node)
        workflow.set_entry_point("data_agent")
        workflow.add_edge("data_agent", "advisor_agent")
        workflow.add_edge("advisor_agent", END)

        graph = workflow.compile()
        initial_state = {"messages": [HumanMessage(content=req.message)], "context": ""}
        result = graph.invoke(initial_state)

        return {"response": result["messages"][-1].content}

    except Exception as e:
        print(f"Chat error: {e}")
        return {"response": f"Sorry, I encountered an error: {str(e)[:100]}"}
