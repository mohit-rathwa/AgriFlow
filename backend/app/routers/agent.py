"""
Agent router — SSE streaming chat endpoint for the Intelligence Agent.

Accepts user messages, runs the LangGraph agent with tool-use, and
streams the response back as Server-Sent Events for real-time UI updates.
"""

import json
import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies.auth import get_current_user
from app.dependencies.db import get_db
from app.models.models import User

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/agent", tags=["Intelligence Agent"])


class ChatRequest(BaseModel):
    """Request schema for agent chat."""
    message: str
    history: list[dict[str, str]] = []


class ChatResponse(BaseModel):
    """Non-streaming response schema."""
    content: str
    tool_calls: list[dict] = []


@router.post("/chat", summary="Chat with the Intelligence Agent (SSE stream)")
async def agent_chat(
    body: ChatRequest,
    current_user: User = Depends(get_current_user),
):
    """Stream the agent's response as Server-Sent Events.

    The agent analyzes the user's question, decides which ML tools to call,
    executes them, and generates a natural language response.

    SSE Event Types:
    - `token`: Partial text content (for streaming display)
    - `tool_call`: Agent is calling a tool (name + args)
    - `tool_result`: Tool returned a result
    - `done`: Full response complete
    - `error`: An error occurred

    Returns:
        StreamingResponse with content-type text/event-stream
    """
    from app.core.config import get_settings

    settings = get_settings()
    if not settings.GOOGLE_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="GOOGLE_API_KEY is not configured. Set it in your .env file.",
        )

    from app.services.agent.graph import stream_agent_response

    async def event_generator():
        try:
            async for event in stream_agent_response(
                user_message=body.message,
                chat_history=body.history,
            ):
                event_type = event.get("event", "token")
                data = json.dumps(
                    {k: v for k, v in event.items() if k != "event"},
                    default=str,
                )
                yield f"event: {event_type}\ndata: {data}\n\n"

        except Exception as e:
            logger.exception("SSE stream error")
            error_data = json.dumps({"message": str(e)})
            yield f"event: error\ndata: {error_data}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post(
    "/chat/sync",
    response_model=ChatResponse,
    summary="Chat with the Intelligence Agent (non-streaming)",
)
async def agent_chat_sync(
    body: ChatRequest,
    current_user: User = Depends(get_current_user),
) -> ChatResponse:
    """Non-streaming version of agent chat.

    Useful for testing or when SSE is not supported.
    """
    from app.core.config import get_settings

    settings = get_settings()
    if not settings.GOOGLE_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="GOOGLE_API_KEY is not configured.",
        )

    from app.services.agent.graph import run_agent_sync

    content = await run_agent_sync(
        user_message=body.message,
        chat_history=body.history,
    )

    return ChatResponse(content=content)
