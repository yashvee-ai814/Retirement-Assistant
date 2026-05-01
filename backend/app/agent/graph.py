from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode
from langgraph.checkpoint.memory import MemorySaver

from .state import RetirementRAGState
from .tools import ALL_TOOLS
from .nodes import agent_node, human_approval_node, route_after_agent, route_after_approval

checkpointer = MemorySaver()


def _build_graph():
    builder = StateGraph(RetirementRAGState)

    builder.add_node("agent", agent_node)
    builder.add_node("human_approval", human_approval_node)
    builder.add_node("tools", ToolNode(ALL_TOOLS))

    builder.set_entry_point("agent")

    builder.add_conditional_edges(
        "agent",
        route_after_agent,
        {"human_approval": "human_approval", "tools": "tools", "__end__": END},
    )
    builder.add_conditional_edges(
        "human_approval",
        route_after_approval,
        {"tools": "tools", "agent": "agent"},
    )
    builder.add_edge("tools", "agent")

    return builder.compile(checkpointer=checkpointer)


graph = _build_graph()


def make_config(session_id: str) -> dict:
    return {"configurable": {"thread_id": session_id}}
