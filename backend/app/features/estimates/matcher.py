import re
from difflib import SequenceMatcher

from app.core.reference_data import PriceRow
from app.features.estimates.schemas import ExtractedItem, Species

ABBREVIATIONS = {
    "cbc chem": "wellness bloodwork",
    "cbc chemistry": "wellness bloodwork",
    "cohat": "dental cleaning with anesthesia",
    "dapp": "dhpp vaccine",
    "da2pp": "dhpp vaccine",
    "dental prophy": "dental cleaning with anesthesia",
    "felv": "feline leukemia vaccine",
    "fm rads": "full mouth dental x rays",
    "full mouth rads": "full mouth dental x rays",
    "fvrcp": "fvrcp vaccine",
    "hw test": "heartworm test",
    "iv fluids": "intravenous fluids",
    "ua": "urinalysis",
}


def normalize_description(value: str) -> str:
    normalized = value.casefold().replace("&", " and ")
    normalized = re.sub(r"[^a-z0-9]+", " ", normalized)
    normalized = re.sub(r"\b(?:canine|feline|dog|cat)\b", " ", normalized)
    normalized = re.sub(r"\s+", " ", normalized).strip()
    abbreviations = sorted(ABBREVIATIONS.items(), key=lambda item: len(item[0]), reverse=True)
    for abbreviation, expansion in abbreviations:
        normalized = re.sub(rf"\b{re.escape(abbreviation)}\b", expansion, normalized)
    return re.sub(r"\s+", " ", normalized).strip()


def match_price(
    item: ExtractedItem,
    prices: list[PriceRow] | tuple[PriceRow, ...],
    species: Species,
    *,
    threshold: float = 0.68,
) -> PriceRow | None:
    query = normalize_description(item.description)
    best: tuple[float, PriceRow] | None = None
    for price in prices:
        if price.species not in (species, "both"):
            continue
        candidates = [price.name, *price.aliases]
        for candidate in candidates:
            normalized_candidate = normalize_description(candidate)
            if query == normalized_candidate:
                return price
            if normalized_candidate in query or query in normalized_candidate:
                score = 0.94
            else:
                score = SequenceMatcher(None, query, normalized_candidate).ratio()
            if best is None or score > best[0]:
                best = (score, price)
    return best[1] if best is not None and best[0] >= threshold else None
