from datetime import date
from decimal import Decimal

from app.features.receipts.parser import parse_receipt


def test_receipt_fallback_extracts_total_date_and_category() -> None:
    draft = parse_receipt(
        "Oak Hill Animal Clinic\nDate: 10/28/2026\nWellness exam $89.00\nDHPP $42.00\nTOTAL $131.00"
    )

    assert draft is not None
    assert draft.amount == Decimal("131.00")
    assert draft.spent_on == date(2026, 10, 28)
    assert draft.category == "wellness"


def test_receipt_fallback_returns_none_without_total() -> None:
    assert parse_receipt("Exam notes only") is None
