from fastapi import APIRouter

from app.services import crm

router = APIRouter(prefix="/customers", tags=["customers"])


@router.post("/")
def create(name: str, contact: str | None = None):
    return crm.create_customer(name, contact)


@router.get("/")
def list_all():
    return crm.list_customers()


@router.get("/{customer_id}")
def get(customer_id: str):
    return crm.customer_360(customer_id) or {"error": "not found"}