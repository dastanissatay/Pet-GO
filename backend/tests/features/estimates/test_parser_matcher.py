import json
from decimal import Decimal
from pathlib import Path

from app.features.estimates.matcher import match_price, normalize_description
from app.features.estimates.parser import parse_estimate_lines
from app.features.estimates.schemas import PriceReference
from app.features.estimates.service import verdict_for

DATA_DIR = Path(__file__).parents[3] / "app" / "data"


def _prices() -> list[PriceReference]:
    return [PriceReference.model_validate(row) for row in json.loads((DATA_DIR / "prices.json").read_text())]


def test_regex_parser_uses_line_total_and_skips_totals() -> None:
    items = parse_estimate_lines("Exam $89.00\nDental 2 x $100.00 $200.00\nTOTAL $289.00")

    assert [item.charged for item in items] == [Decimal("89.00"), Decimal("200.00")]


def test_normalizer_expands_common_clinic_abbreviations() -> None:
    assert normalize_description("CBC/Chem") == "wellness bloodwork"
    assert normalize_description("Full mouth rads") == "full mouth dental x rays"


def test_matcher_handles_all_sourced_sample_lines() -> None:
    prices = _prices()
    items = parse_estimate_lines(
        "Wellness exam $89.00\nDHPP vaccine $42.00\nHeartworm test $72.00\n"
        "CBC/Chem wellness panel $175.00\nDental prophy with anesthesia $2,350.00\n"
        "Biohazard disposal $18.00"
    )

    matches = [match_price(item, prices, "dog") for item in items]

    assert [match.id if match else None for match in matches] == [
        "wellness_exam",
        "dhpp_vaccine",
        "heartworm_test",
        "wellness_bloodwork",
        "dental_cleaning_dog",
        None,
    ]


def test_verdict_is_computed_only_from_reference_range() -> None:
    price = next(price for price in _prices() if price.id == "wellness_exam")

    assert verdict_for(Decimal("49"), price) == "below"
    assert verdict_for(Decimal("50"), price) == "within"
    assert verdict_for(Decimal("150"), price) == "within"
    assert verdict_for(Decimal("151"), price) == "above"
    assert verdict_for(Decimal("89"), None) == "unknown"
