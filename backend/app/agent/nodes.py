import json
import os
from functools import lru_cache
from typing import Literal

from pydantic import BaseModel
from langchain_ollama import ChatOllama
from langchain_core.messages import BaseMessage, AIMessage, SystemMessage
from langchain_core.runnables import RunnableConfig
from langgraph.types import interrupt

from ..core.config import settings
from ..core.logger import get_logger
from .state import RetirementRAGState
from .tools import ALL_TOOLS

logger = get_logger("retirement.agent")

_PROMPTS_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "prompts.json")


@lru_cache(maxsize=1)
def _load_system_prompt() -> str:
    with open(_PROMPTS_PATH) as f:
        return json.load(f)["system_prompt"]


_llm = ChatOllama(
    model=settings.OLLAMA_MODEL,
    base_url=settings.OLLAMA_BASE_URL,
    temperature=0,
)
_llm_with_tools = _llm.bind_tools(ALL_TOOLS)


class AgentNodeOutput(BaseModel):
    messages: list[BaseMessage]


def agent_node(state: RetirementRAGState, config: RunnableConfig) -> AgentNodeOutput:
    user_id = config["configurable"].get("user_id", "")
    messages = state.messages
    if not messages or not isinstance(messages[0], SystemMessage):
        suffix = f"\n\nThe current user's ID is: {user_id}" if user_id else ""
        messages = [SystemMessage(content=_load_system_prompt() + suffix)] + list(messages)

    logger.info("Invoking LLM — %d messages in context", len(messages))
    response: AIMessage = _llm_with_tools.invoke(messages)

    tool_names = [tc["name"] for tc in response.tool_calls] if response.tool_calls else []
    if tool_names:
        logger.info("LLM selected tools: %s", tool_names)
    else:
        logger.info("LLM produced a final reply (no tool calls)")

    return AgentNodeOutput(messages=[response])


def route_after_agent(state: RetirementRAGState) -> Literal["tools", "__end__"]:
    last = state.messages[-1]
    if not hasattr(last, "tool_calls") or not last.tool_calls:
        return "__end__"
    return "tools"
