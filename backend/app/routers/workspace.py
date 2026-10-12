import uuid

from fastapi import APIRouter

from app import repository as repo
from app.services import crm

router = APIRouter(prefix="/workspace", tags=["workspace"])


@router.get("/{customer_id}")
def get_workspace(customer_id: str):
    return crm.workspace(customer_id)


@router.post("/{customer_id}/{section}")
def add_entry(customer_id: str, section: str, entry: dict):
    if section not in crm.WORKSPACE_SECTIONS:
        return {"error": f"unknown section '{section}'", "valid": crm.WORKSPACE_SECTIONS}
    return crm.write_workspace(customer_id, section, entry)