import json
import os

from ...core.logger import get_logger

logger = get_logger("retirement.guardrails")

PROMPTS_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "prompts.json")


def load_guardrail_messages() -> dict:
    with open(PROMPTS_PATH) as f:
        return json.load(f).get("guardrail_messages", {})


GUARDRAIL_MESSAGES = load_guardrail_messages()

INJECTION_PATTERNS = [
    "ignore previous instructions", "ignore all previous", "forget your instructions",
    "pretend you are", "act as if you are", "you are now a", "jailbreak",
    "override your", "disregard your", "system prompt", "<script>",
    "select * from", "drop table", "'; drop", "ignore your system",
    "new instructions:", "[system]", "###instruction",
]

BLOCKED_DOMAINS = [
    "how to hack", "make a bomb", "build a weapon", "illegal drugs",
    "suicide method", "self-harm method", "commit violence", "terrorism",
    "child abuse", "exploit vulnerability",
]

WEALTH_HINTS = [
    "pension", "retirement", "saving", "invest", "income", "salary", "wealth",
    "pot", "fund", "isa", "tax", "drawdown", "contribution", "annuity",
    "financial", "money", "£", "gbp", "budget", "mortgage", "insurance",
    "state pension", "advisor", "plan", "goal", "age", "year", "month",
    "hi", "hello", "thanks", "thank", "help", "what", "how", "when",
    "can you", "could you", "would you", "please", "i am", "i'm", "my",
]

OUTPUT_INJECTION_PATTERNS = [
    "ignore previous", "new instructions:", "[system]", "<script>",
]


def check_input(message: str) -> tuple[bool, str]:
    lower = message.lower()

    for pattern in INJECTION_PATTERNS:
        if pattern in lower:
            logger.warning("Input blocked — injection pattern detected: %r", pattern)
            return False, GUARDRAIL_MESSAGES.get("injection_blocked", "")

    for pattern in BLOCKED_DOMAINS:
        if pattern in lower:
            logger.warning("Input blocked — harmful domain: %r", pattern)
            return False, GUARDRAIL_MESSAGES.get("harmful_blocked", "")

    if not any(hint in lower for hint in WEALTH_HINTS) and len(message.split()) > 8:
        logger.info("Input blocked — off-topic (no wealth keywords, >8 words)")
        return False, GUARDRAIL_MESSAGES.get("off_topic_blocked", "")

    return True, ""


def check_output(reply: str) -> bool:
    lower = reply.lower()
    unsafe = any(pattern in lower for pattern in OUTPUT_INJECTION_PATTERNS)
    if unsafe:
        logger.warning("Output blocked — injection pattern detected in LLM reply")
    return not unsafe
