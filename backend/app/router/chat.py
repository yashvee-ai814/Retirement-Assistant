import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from langchain_core.messages import HumanMessage, AIMessage, ToolMessage
from langgraph.types import Command
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.database import get_db
from ..db.models import User, Session, Message, Calculation
from ..agent.graph import graph, make_config
from ..core.logger import get_logger
from ..router.guardrails import check_input, check_output
from .models import (
    ChatRequest, ChatResponse, ToolCallInfo, PendingInterrupt, SourceReference, SessionInfo
)

chat_router = APIRouter(tags=["chat"])
logger = get_logger("retirement.chat")

_CALCULATION_TOOLS = {
    "calculate_projected_pot",
    "calculate_drawdown_income",
    "calculate_monthly_savings_needed",
    "calculate_shortfall",
    "calculate_readiness_score",
    "calculate_inflation_adjusted_goal",
    "get_uk_state_pension_info",
}


async def _upsert_session(db: AsyncSession, session_id: str, user_id: str) -> Session:
    result = await db.execute(select(Session).where(Session.id == session_id))
    session = result.scalar_one_or_none()
    if session is None:
        session = Session(id=session_id, user_id=user_id)
        db.add(session)
        await db.flush()
    return session


@chat_router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest, db: AsyncSession = Depends(get_db)) -> ChatResponse:
    result = await db.execute(select(User).where(User.id == req.user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    session = await _upsert_session(db, req.session_id, req.user_id)
    config = make_config(req.session_id)

    logger.info(
        "Chat request — session=%s user=%s resume=%s auto_approve=%s",
        req.session_id, req.user_id, req.resume_input is not None, req.auto_approve_tools,
    )

    if req.resume_input is not None:
        result_state = graph.invoke(Command(resume=req.resume_input), config=config)
    elif req.message:
        ok, reason = check_input(req.message)
        if not ok:
            logger.info("Request rejected by guardrails — session=%s", req.session_id)
            return ChatResponse(
                session_id=req.session_id,
                reply=reason,
                status="complete",
                tool_calls_used=[],
                sources=[],
            )
        user_msg = Message(
            session_id=req.session_id,
            role="user",
            content=req.message,
        )
        db.add(user_msg)
        await db.flush()
        result_state = graph.invoke(
            {"messages": [HumanMessage(content=req.message)]},
            config=config,
        )
    else:
        raise HTTPException(status_code=400, detail="Either 'message' or 'resume_input' must be provided.")

    if req.auto_approve_tools:
        while True:
            state = graph.get_state(config)
            if not state.next:
                break
            interrupt_data = state.tasks[0].interrupts[0].value if state.tasks else {}
            if isinstance(interrupt_data, dict) and interrupt_data.get("type") == "tool_approval":
                logger.info("Auto-approving tool call — session=%s", req.session_id)
                result_state = graph.invoke(Command(resume={"approved": True}), config=config)
            else:
                break

    graph_state = graph.get_state(config)
    is_interrupted = bool(graph_state.next)
    messages = result_state.get("messages", [])

    tool_calls_used: list[ToolCallInfo] = []
    for msg in messages:
        if isinstance(msg, AIMessage) and msg.tool_calls:
            for tc in msg.tool_calls:
                tool_calls_used.append(ToolCallInfo(name=tc["name"], args=tc["args"]))
        if isinstance(msg, ToolMessage) and tool_calls_used:
            for tci in tool_calls_used:
                if tci.result is None and tci.name != "ask_human":
                    tci.result = str(msg.content)[:500]

    sources: list[SourceReference] = []
    seen_sources: set[tuple] = set()
    for msg in messages:
        if isinstance(msg, ToolMessage) and msg.name == "search_pension_documents":
            try:
                chunks = json.loads(msg.content)
                for chunk in chunks:
                    key = (chunk.get("filename", ""), chunk.get("page", 0))
                    if key not in seen_sources:
                        seen_sources.add(key)
                        sources.append(SourceReference(
                            filename=chunk.get("filename", "unknown"),
                            page=chunk.get("page", 0),
                            excerpt=chunk.get("page_content", "")[:200],
                        ))
            except Exception:
                pass

    status = "complete"
    pending_interrupt: PendingInterrupt | None = None

    if is_interrupted:
        interrupt_data = graph_state.tasks[0].interrupts[0].value if graph_state.tasks else {}
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

    source_dicts = [s.model_dump() for s in sources]
    tool_dicts = [t.model_dump() for t in tool_calls_used]
    assistant_msg = Message(
        session_id=req.session_id,
        role="assistant",
        content=reply,
        meta={"sources": source_dicts, "tool_calls_used": tool_dicts},
    )
    db.add(assistant_msg)

    for msg in messages:
        if isinstance(msg, ToolMessage) and msg.name in _CALCULATION_TOOLS:
            matching_ai = next(
                (tci for tci in tool_calls_used if tci.name == msg.name and tci.result is None),
                None,
            )
            args = {}
            for ai_msg in messages:
                if isinstance(ai_msg, AIMessage) and ai_msg.tool_calls:
                    for tc in ai_msg.tool_calls:
                        if tc["name"] == msg.name:
                            args = tc["args"]
            try:
                outputs = json.loads(msg.content) if isinstance(msg.content, str) else msg.content
            except Exception:
                outputs = {"raw": str(msg.content)}
            calc = Calculation(
                session_id=req.session_id,
                tool_name=msg.name,
                inputs=args,
                outputs=outputs if isinstance(outputs, dict) else {"result": outputs},
            )
            db.add(calc)

    first_user_msg = (messages[0].content if messages and isinstance(messages[0], HumanMessage) else None)
    if session.title == "New conversation" and first_user_msg:
        session.title = first_user_msg[:50]
    session.updated_at = datetime.now(timezone.utc)

    await db.commit()

    logger.info("Chat response — session=%s status=%s tools=%s sources=%d",
                req.session_id, status, [t.name for t in tool_calls_used], len(sources))

    return ChatResponse(
        session_id=req.session_id,
        reply=reply,
        status=status,
        pending_interrupt=pending_interrupt,
        tool_calls_used=tool_calls_used,
        sources=sources,
    )


@chat_router.get("/sessions", response_model=list[SessionInfo])
async def list_sessions(user_id: str, db: AsyncSession = Depends(get_db)) -> list[SessionInfo]:
    result = await db.execute(
        select(Session)
        .where(Session.user_id == user_id)
        .order_by(Session.updated_at.desc())
    )
    sessions = result.scalars().all()
    return [
        SessionInfo(
            id=s.id,
            title=s.title,
            created_at=s.created_at.isoformat(),
            updated_at=s.updated_at.isoformat(),
        )
        for s in sessions
    ]


@chat_router.delete("/sessions/{session_id}")
async def delete_session(session_id: str, db: AsyncSession = Depends(get_db)):
    await db.execute(delete(Calculation).where(Calculation.session_id == session_id))
    await db.execute(delete(Message).where(Message.session_id == session_id))
    await db.execute(delete(Session).where(Session.id == session_id))
    await db.commit()
    return {"status": "deleted", "session_id": session_id}
