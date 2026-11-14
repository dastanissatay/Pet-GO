from app.core.llm import AnthropicJsonClient, LLMError
from app.features.receipts.parser import parse_receipt
from app.features.receipts.prompts import RECEIPT_SYSTEM_PROMPT
from app.features.receipts.schemas import ExpenseDraft


class NoAmountFoundError(ValueError):
    code = "NO_AMOUNT_FOUND"


async def parse_receipt_expense(text: str, llm: AnthropicJsonClient | None = None) -> ExpenseDraft:
    if llm is not None:
        try:
            draft = await llm.parse_json(
                system_prompt=RECEIPT_SYSTEM_PROMPT,
                user_message=text,
                response_model=ExpenseDraft,
            )
            if draft.amount is not None:
                return draft
        except LLMError:
            pass
    fallback = parse_receipt(text)
    if fallback is None:
        raise NoAmountFoundError("We couldn't find a total in that receipt.")
    return fallback
