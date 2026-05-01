from langgraph.checkpoint.memory import MemorySaver

# Singleton in-memory checkpointer — all conversation threads live here.
checkpointer = MemorySaver()


def make_config(session_id: str) -> dict:
    """Return the LangGraph invocation config for a given session."""
    return {"configurable": {"thread_id": session_id}}
