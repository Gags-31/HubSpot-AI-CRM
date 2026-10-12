"""Compatibility shim.

Older modules imported ``app.db``; the data layer now lives in
``app.repository`` (SQLite) with business rules in ``app.services.crm``.
"""
from app import repository
from app.services import crm

customers: dict = {}
conversations: dict = {}
proposals: dict = {}
customer_memory: dict = {}


def init() -> None:
    repository.init_db()


__all__ = ["customers", "conversations", "proposals", "customer_memory", "init", "repository", "crm"]