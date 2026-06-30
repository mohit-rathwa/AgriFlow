"""
graph.py — LangGraph ReAct agent for agricultural supply chain intelligence.

Implements a tool-calling agent using Google Gemini as the LLM backbone.
The agent has access to 6 domain-specific tools (data query, process mining,
causal ML, prediction, simulation, semantic search) and uses a ReAct loop
to reason through multi-step questions.

Supports streaming via async generator for SSE responses.
"""

import json
import logging
from typing import Any, AsyncGenerator

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.prebuilt import create_react_agent

from app.core.config import get_settings
from app.services.agent.tools import ALL_TOOLS

logger = logging.getLogger(__name__)
settings = get_settings()

# ── System prompt ───────────────────────────────────────────────────────────
SYSTEM_PROMPT = """You are AgriFlow Intelligence Agent — an expert AI analyst for Indian agricultural supply chains.

You have access to real AGMARKNET mandi data (3.2M records, 2018-2024) covering prices, arrivals, and market information across India.

## Your Capabilities (Tools)
1. **query_mandi_data** — Query raw market data: prices, arrivals, trends, market comparisons
2. **run_process_mining_tool** — Analyze supply chain bottlenecks across 6 stages (harvest → dispatch)
3. **run_causal_analysis_tool** — Run Double ML to measure MSP policy's causal effect on prices
4. **run_prediction_tool** — XGBoost price-risk prediction with SHAP explainability
5. **run_simulation_tool** — What-if scenarios for cold-chain and transport interventions
6. **search_historical_analyses** — Find similar past analyses using semantic search

## Response Guidelines
- Always use tools to back your answers with data. Never make up numbers.
- When analyzing price changes, use query_mandi_data first to get the data, then explain.
- For "why" questions, combine multiple tools (e.g., process mining + causal analysis).
- Present key numbers in Indian format: ₹, lakhs, crores, quintals.
- Be concise but thorough. Use bullet points for clarity.
- When comparing commodities, provide a structured comparison.
- If a tool returns an error or insufficient data, say so honestly.

## Domain Knowledge
- MSP = Minimum Support Price (government floor price for crops)
- Mandi = Agricultural market/marketplace
- Kharif = monsoon crop season (Jun-Oct), Rabi = winter (Oct-Mar), Zaid = summer (Mar-Jun)
- ATE = Average Treatment Effect (causal impact measurement)
- SHAP = SHapley Additive exPlanations (ML interpretability)
- Quintal = 100 kg (standard Indian unit for agricultural produce)
"""


def _build_agent():
    """Construct the LangGraph ReAct agent."""
    llm = ChatGoogleGenerativeAI(
        model=settings.GEMINI_MODEL,
        google_api_key=settings.GOOGLE_API_KEY,
        temperature=settings.AGENT_TEMPERATURE,
        max_retries=2,
    )

    agent = create_react_agent(
        model=llm,
        tools=ALL_TOOLS,
        prompt=SYSTEM_PROMPT,
    )

    return agent


async def stream_agent_response(
    user_message: str,
    chat_history: list[dict[str, str]] | None = None,
) -> AsyncGenerator[dict[str, Any], None]:
    """
    Stream the agent's response as a series of events.

    Yields dicts with event types:
    - {"event": "token", "content": "partial text"}
    - {"event": "tool_call", "name": "tool_name", "args": {...}}
    - {"event": "tool_result", "name": "tool_name", "result": "..."}
    - {"event": "done", "content": "full response"}
    - {"event": "error", "message": "error text"}
    """
    agent = _build_agent()

    # Build message history
    messages = []
    if chat_history:
        for msg in chat_history[-10:]:  # Keep last 10 messages for context
            if msg.get("role") == "user":
                messages.append(HumanMessage(content=msg["content"]))
            elif msg.get("role") == "assistant":
                messages.append(AIMessage(content=msg["content"]))

    messages.append(HumanMessage(content=user_message))

    try:
        full_response = ""
        tool_calls_seen = set()

        async for event in agent.astream_events(
            {"messages": messages},
            version="v2",
        ):
            kind = event.get("event", "")

            # LLM streaming tokens
            if kind == "on_chat_model_stream":
                chunk = event.get("data", {}).get("chunk")
                if chunk and hasattr(chunk, "content") and chunk.content:
                    content = chunk.content
                    if isinstance(content, str) and content:
                        full_response += content
                        yield {"event": "token", "content": content}

            # Tool invocations
            elif kind == "on_tool_start":
                tool_name = event.get("name", "unknown")
                tool_input = event.get("data", {}).get("input", {})
                call_id = f"{tool_name}_{hash(json.dumps(tool_input, default=str))}"

                if call_id not in tool_calls_seen:
                    tool_calls_seen.add(call_id)
                    yield {
                        "event": "tool_call",
                        "name": tool_name,
                        "args": tool_input,
                    }

            elif kind == "on_tool_end":
                tool_name = event.get("name", "unknown")
                tool_output = event.get("data", {}).get("output", "")
                if hasattr(tool_output, "content"):
                    tool_output = tool_output.content

                # Truncate large tool results for the SSE stream
                result_str = str(tool_output)
                if len(result_str) > 2000:
                    result_str = result_str[:2000] + "... (truncated)"

                yield {
                    "event": "tool_result",
                    "name": tool_name,
                    "result": result_str,
                }

        yield {"event": "done", "content": full_response}

    except Exception as e:
        logger.exception("Agent execution failed")
        yield {"event": "error", "message": str(e)}


async def run_agent_sync(
    user_message: str,
    chat_history: list[dict[str, str]] | None = None,
) -> str:
    """Run agent and return the full response (non-streaming)."""
    agent = _build_agent()

    messages = []
    if chat_history:
        for msg in chat_history[-10:]:
            if msg.get("role") == "user":
                messages.append(HumanMessage(content=msg["content"]))
            elif msg.get("role") == "assistant":
                messages.append(AIMessage(content=msg["content"]))

    messages.append(HumanMessage(content=user_message))

    try:
        result = await agent.ainvoke({"messages": messages})
        final_messages = result.get("messages", [])
        # Get the last AI message
        for msg in reversed(final_messages):
            if isinstance(msg, AIMessage) and msg.content:
                return msg.content
        return "I couldn't generate a response. Please try rephrasing your question."
    except Exception as e:
        logger.exception("Agent execution failed")
        return f"Error: {str(e)}"
