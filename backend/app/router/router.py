from fastapi import APIRouter, HTTPException
from langchain_core.messages import HumanMessage, AIMessage, ToolMessage
from langgraph.types import Command

from .models import ChatRequest, ChatResponse, ToolCallInfo, PendingInterrupt
from ..core.config import settings
from ..core.logger import get_logger
from .guardrails import check_input, check_output
from .sessions import make_config
from ..agent import graph

router = APIRouter()
logger = get_logger("wealth_advisor.router")


@router.get("/health")
async def health():
    return {"status": "ok", "model": settings.OLLAMA_MODEL}


@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest) -> ChatResponse:
    config = make_config(req.session_id)
    logger.info(
        "Chat request — session=%s resume=%s auto_approve=%s",
        req.session_id, req.resume_input is not None, req.auto_approve_tools,
    )

    if req.resume_input is not None:
        result = graph.invoke(Command(resume=req.resume_input), config=config)
    elif req.message:
        ok, reason = check_input(req.message)
        if not ok:
            logger.info("Request rejected by guardrails — session=%s", req.session_id)
            return ChatResponse(
                session_id=req.session_id,
                reply=reason,
                status="complete",
                tool_calls_used=[],
            )
        result = graph.invoke(
            {"messages": [HumanMessage(content=req.message)]},
            config=config,
        )
    else:
        raise HTTPException(
            status_code=400,
            detail="Either 'message' or 'resume_input' must be provided.",
        )

    # Keep resuming tool-approval interrupts without human input when auto-approve is on.
    if req.auto_approve_tools:
        while True:
            state = graph.get_state(config)
            if not state.next:
                break
            interrupt_data = state.tasks[0].interrupts[0].value if state.tasks else {}
            if isinstance(interrupt_data, dict) and interrupt_data.get("type") == "tool_approval":
                logger.info("Auto-approving tool call — session=%s", req.session_id)
                result = graph.invoke(Command(resume={"approved": True}), config=config)
            else:
                break

    state = graph.get_state(config)
    is_interrupted = bool(state.next)

    # Build tool call summary from the message history returned by the graph.
    tool_calls_used: list[ToolCallInfo] = []
    messages = result.get("messages", [])
    for msg in messages:
        if isinstance(msg, AIMessage) and msg.tool_calls:
            for tc in msg.tool_calls:
                tool_calls_used.append(ToolCallInfo(name=tc["name"], args=tc["args"]))
        if isinstance(msg, ToolMessage) and tool_calls_used:
            for tci in tool_calls_used:
                if tci.result is None and tci.name != "ask_human":
                    tci.result = str(msg.content)[:500]

    status = "complete"
    pending_interrupt: PendingInterrupt | None = None

    if is_interrupted:
        interrupt_data = state.tasks[0].interrupts[0].value if state.tasks else {}
        if isinstance(interrupt_data, dict) and interrupt_data.get("type") == "tool_approval":
            status = "awaiting_tool_approval"
            pending_interrupt = PendingInterrupt(
                type="tool_approval",
                tool_calls=[
                    ToolCallInfo(name=tc["name"], args=tc["args"])
                    for tc in interrupt_data.get("tool_calls", [])
                ],
            )
        else:
            question = interrupt_data if isinstance(interrupt_data, str) else str(interrupt_data)
            status = "awaiting_clarification"
            pending_interrupt = PendingInterrupt(type="clarification", question=question)

    reply = ""
    for msg in reversed(messages):
        if isinstance(msg, AIMessage) and not msg.tool_calls:
            reply = msg.content
            break

    if not reply and status == "complete":
        reply = "I've completed the analysis. Let me know if you have any questions."

    if reply and not check_output(reply):
        reply = "I apologise, but I couldn't generate a safe response. Please try rephrasing your question."

    tools_run = [tci.name for tci in tool_calls_used]
    logger.info(
        "Chat response — session=%s status=%s tools=%s",
        req.session_id, status, tools_run,
    )

    return ChatResponse(
        session_id=req.session_id,
        reply=reply,
        status=status,
        pending_interrupt=pending_interrupt,
        tool_calls_used=tool_calls_used,
    )


@router.delete("/chat/{session_id}")
async def clear_chat(session_id: str):
    # MemorySaver has no delete API; the frontend generates a new session_id for fresh chats.
    return {"status": "ok", "session_id": session_id}
