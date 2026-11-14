import re
from decimal import Decimal, InvalidOperation

from app.features.estimates.schemas import ExtractedItem

AMOUNT_RE = re.compile(r"(?:\$\s*)?(\d{1,3}(?:,\d{3})*|\d+)\.\d{2}\b")
SKIP_RE = re.compile(r"\b(sub\s*total|total|tax|discount|payment|deposit|balance|amount due)\b", re.IGNORECASE)


def parse_estimate_lines(text: str) -> list[ExtractedItem]:
    items: list[ExtractedItem] = []
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line or SKIP_RE.search(line):
            continue
        matches = list(AMOUNT_RE.finditer(line))
        if not matches:
            continue
        amount_match = matches[-1]
        try:
            charged = Decimal(amount_match.group(1).replace(",", "") + amount_match.group(0)[-3:])
        except InvalidOperation:
            continue
        description = AMOUNT_RE.sub(" ", line)
        description = re.sub(r"\b(?:qty|quantity)\s*[:x]?\s*\d+\b", " ", description, flags=re.IGNORECASE)
        description = re.sub(r"[|:=@]+", " ", description)
        description = re.sub(r"\s+", " ", description).strip(" -–—.$")
        if not description:
            description = "Vet service"
        items.append(ExtractedItem(raw_text=line, description=description[:100], charged=charged))
    return items
