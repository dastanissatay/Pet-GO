import re
from datetime import date
from decimal import Decimal, InvalidOperation

from app.features.receipts.schemas import ExpenseCategory, ExpenseDraft

TOTAL_RE = re.compile(
    r"\b(?:grand\s+total|amount\s+(?:paid|due)|total)\b[^\d$-]*\$?\s*(\d{1,3}(?:,\d{3})*|\d+)\.(\d{2})",
    re.IGNORECASE,
)
US_DATE_RE = re.compile(r"\b(0?[1-9]|1[0-2])[/-](0?[1-9]|[12]\d|3[01])[/-](20\d{2})\b")
ISO_DATE_RE = re.compile(r"\b(20\d{2})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])\b")


def parse_receipt(text: str) -> ExpenseDraft | None:
    totals = list(TOTAL_RE.finditer(text))
    if not totals:
        return None
    match = totals[-1]
    try:
        amount = Decimal(f"{match.group(1).replace(',', '')}.{match.group(2)}")
    except InvalidOperation:
        return None
    return ExpenseDraft(
        amount=amount,
        spent_on=_parse_date(text),
        category=_category(text),
        note=_note(text),
    )


def _parse_date(text: str) -> date | None:
    us_match = US_DATE_RE.search(text)
    if us_match:
        try:
            return date(int(us_match.group(3)), int(us_match.group(1)), int(us_match.group(2)))
        except ValueError:
            pass
    iso_match = ISO_DATE_RE.search(text)
    if iso_match:
        try:
            return date(int(iso_match.group(1)), int(iso_match.group(2)), int(iso_match.group(3)))
        except ValueError:
            pass
    return None


def _category(text: str) -> ExpenseCategory:
    lowered = text.casefold()
    rules: list[tuple[ExpenseCategory, tuple[str, ...]]] = [
        ("emergency", ("emergency", "urgent care", "er exam")),
        ("dental", ("dental", "tooth", "teeth", "oral")),
        ("medication", ("medication", "prescription", "pharmacy", "antibiotic")),
        ("food", ("food", "kibble", "diet")),
        ("grooming", ("groom", "bath", "nail trim")),
        ("wellness", ("wellness", "vaccine", "exam", "fecal", "heartworm")),
    ]
    for category, keywords in rules:
        if any(keyword in lowered for keyword in keywords):
            return category
    return "other"


def _note(text: str) -> str:
    for line in text.splitlines():
        candidate = line.strip()
        if candidate and not TOTAL_RE.search(candidate) and not US_DATE_RE.search(candidate):
            words = candidate.split()
            return " ".join(words[:6])[:60]
    return "Pet expense"
