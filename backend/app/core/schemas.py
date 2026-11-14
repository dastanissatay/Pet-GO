from pydantic import BaseModel


class Page[T](BaseModel):
    """Every list endpoint returns this shape (CLAUDE.md section 4)."""

    items: list[T]
    total: int
