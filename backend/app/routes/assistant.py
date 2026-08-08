from typing import List, Literal, Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field

from app.services.assistant_service import AssistantService


router = APIRouter(
    prefix="/assistant",
    tags=["Assistant"],
)

assistant_service = AssistantService()


class AssistantChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(..., min_length=1, max_length=4000)

    model_config = ConfigDict(extra="forbid")


class AssistantTaskDraft(BaseModel):
    task_name: str
    task_day: int
    time_12h: str
    duration_hours: int
    duration_minutes: int

    model_config = ConfigDict(extra="forbid")


class AssistantChatRequest(BaseModel):
    messages: List[AssistantChatMessage] = Field(..., min_length=1, max_length=30)
    active_year: int = Field(..., ge=2000, le=2100)
    active_month: int = Field(..., ge=1, le=12)

    model_config = ConfigDict(extra="forbid")


class AssistantChatResponse(BaseModel):
    reply_text: str
    is_complete: bool
    missing_fields: List[str]
    task_draft: Optional[AssistantTaskDraft] = None


@router.post("/chat", response_model=AssistantChatResponse)
def chat_assistant(payload: AssistantChatRequest):
    try:
        result = assistant_service.chat(
            messages=[message.model_dump() for message in payload.messages],
            active_year=payload.active_year,
            active_month=payload.active_month,
        )
    except RuntimeError as exc:
        message = str(exc)
        message_lower = message.lower()
        if "could not connect to ollama" in message_lower:
            detail = "Could not connect to Ollama. Start Ollama and ensure OLLAMA_BASE_URL is correct in backend/.env."
        elif "not configured" in message_lower:
            detail = "Assistant is not configured. Set OLLAMA_BASE_URL and OLLAMA_MODEL in backend/.env."
        else:
            detail = message
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=detail,
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Assistant failed to process the request.",
        ) from exc

    return AssistantChatResponse(**result)
