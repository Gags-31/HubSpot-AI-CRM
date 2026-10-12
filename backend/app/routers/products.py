from fastapi import APIRouter

from app.services import catalog

router = APIRouter(prefix="/products", tags=["products"])


@router.get("/")
def list_products(category: str | None = None):
    return catalog.list_products(category)


@router.get("/{product_id}")
def get_product(product_id: str):
    return catalog.get_product(product_id) or {"error": "not found"}


@router.get("/recommend/fit")
def recommend(quantity: int = 1, category: str | None = None):
    return catalog.recommend(quantity, category)


@router.get("/search/budget")
def search_budget(budget: str):
    return catalog.resolve_budget(budget)