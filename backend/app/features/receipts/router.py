from fastapi import APIRouter

from app.core.llm import get_llm_client
from app.features.receipts import service
from app.features.receipts.schemas import ExpenseDraft, ReceiptParseRequest

router = APIRouter(prefix="/receipts", tags=["receipts"])


@router.post(
    "/parse",
    summary="Parse a pasted pet receipt",
    response_model=ExpenseDraft,
)
async def parse_receipt(body: ReceiptParseRequest) -> ExpenseDraft:
    return await service.parse_receipt_expense(body.text, get_llm_client())
