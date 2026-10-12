"""SQLite persistence layer (swap for PostgreSQL/MongoDB by changing DATABASE_URL handling).

All CRM state lives here: customers, conversations, messages, requirements, proposals,
products, orders, customer memory, workspace entries, vector index and audit log.
"""
import json
import os
import sqlite3
import threading
from datetime import datetime, timezone

DB_PATH = os.getenv("HUBSPOT_DB", os.path.join(os.path.dirname(__file__), "..", "hubspot.db"))

SCHEMA = """
CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY, name TEXT, contact TEXT, created_at TEXT
);
CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY, customer_id TEXT, summary TEXT, sentiment TEXT, intent TEXT,
    started_at TEXT, ended_at TEXT
);
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT, conversation_id TEXT, role TEXT, text TEXT, ts TEXT
);
CREATE TABLE IF NOT EXISTS requirements (
    id TEXT PRIMARY KEY, customer_id TEXT, conversation_id TEXT, product TEXT, quantity TEXT,
    budget TEXT, delivery TEXT, intent TEXT, priority TEXT, created_at TEXT
);
CREATE TABLE IF NOT EXISTS proposals (
    id TEXT PRIMARY KEY, customer_id TEXT, conversation_id TEXT, version INTEGER,
    terms TEXT, body TEXT, status TEXT, created_at TEXT
);
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY, name TEXT, category TEXT, unit_price REAL, currency TEXT,
    stock INTEGER, description TEXT
);
CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY, customer_id TEXT, subtotal REAL, tax REAL, grand_total REAL,
    currency TEXT, status TEXT, created_at TEXT
);
CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT, order_id TEXT, product_id TEXT, name TEXT,
    quantity INTEGER, unit_price REAL, line_total REAL
);
CREATE TABLE IF NOT EXISTS memory (
    customer_id TEXT, key TEXT, value TEXT, updated_at TEXT, PRIMARY KEY (customer_id, key)
);
CREATE TABLE IF NOT EXISTS workspace_entries (
    id TEXT PRIMARY KEY, customer_id TEXT, section TEXT, payload TEXT, created_at TEXT
);
CREATE TABLE IF NOT EXISTS vectors (
    id TEXT PRIMARY KEY, customer_id TEXT, source TEXT, text TEXT, dim INTEGER,
    embedding BLOB, created_at TEXT
);
CREATE TABLE IF NOT EXISTS audit (
    id INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT, user TEXT, action TEXT, resource TEXT
);
CREATE TABLE IF NOT EXISTS users (
    username TEXT PRIMARY KEY, password_hash TEXT, salt TEXT, role TEXT
);
CREATE TABLE IF NOT EXISTS metrics (
    name TEXT PRIMARY KEY, value REAL
);
"""

_local = threading.local()


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def conn() -> sqlite3.Connection:
    c = getattr(_local, "conn", None)
    if c is None:
        c = sqlite3.connect(DB_PATH, check_same_thread=False)
        c.row_factory = sqlite3.Row
        _local.conn = c
    return c


def init_db() -> None:
    conn().executescript(SCHEMA)
    conn().commit()


def q(sql: str, args: tuple = (), one: bool = False):
    cur = conn().execute(sql, args)
    rows = cur.fetchall()
    conn().commit()
    if one:
        return rows[0] if rows else None
    return rows


def execute(sql: str, args: tuple = ()):
    cur = conn().execute(sql, args)
    conn().commit()
    return cur


def jdump(value) -> str:
    return json.dumps(value, ensure_ascii=False)


def jload(value):
    try:
        return json.loads(value)
    except (TypeError, ValueError):
        return value


def bump(metric: str, amount: float = 1.0) -> None:
    execute(
        "INSERT INTO metrics(name, value) VALUES(?, ?) ON CONFLICT(name) DO UPDATE SET value = value + ?",
        (metric, amount, amount),
    )


def metrics_snapshot() -> dict:
    return {r["name"]: r["value"] for r in q("SELECT name, value FROM metrics")}