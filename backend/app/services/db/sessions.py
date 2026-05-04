from langgraph.checkpoint.memory import MemorySaver

checkpointer = MemorySaver()


def make_config(session_id: str) -> dict:
    return {"configurable": {"thread_id": session_id}}
