"""CRM service layer: all reads/writes go through the SQLite repository."""
import json
import uuid

from app import repository as repo
from app.services import nlp, vectorstore

WORKSPACE_SECTIONS = [
    "Profile",
    "Conversations",
    "Requirements",
    "Products",
    "Proposals",
    "Documents",
    "Followups",
    "Interaction_History",
]


# ---------------------------------------------------------------- customers
def create_customer(name: str, contact: str | None = None) -> dict:
    cid = "Consumer_" + uuid.uuid4().hex[:6]
    repo.execute(
        "INSERT INTO customers(id, name, contact, created_at) VALUES(?,?,?,?)",
        (cid, name, contact, repo.now()),
    )
    repo.execute(
        "INSERT OR REPLACE INTO workspace_entries(id, customer_id, section, payload, created_at) VALUES(?,?,?,?,?)",
        (cid + "-profile", cid, "Profile", repo.jdump({"name": name, "contact": contact}), repo.now()),
    )
    repo.bump("customers_created")
    return get_customer(cid)


def get_customer(customer_id: str) -> dict | None:
    row = repo.q("SELECT * FROM customers WHERE id = ?", (customer_id,), one=True)
    return dict(row) if row else None


def list_customers() -> list[dict]:
    return [dict(r) for r in repo.q("SELECT * FROM customers ORDER BY created_at DESC")]


# ------------------------------------------------------------ conversations
def start_conversation(customer_id: str, role: str, text: str) -> dict:
    conv = repo.q(
        "SELECT * FROM conversations WHERE customer_id = ? AND ended_at IS NULL ORDER BY started_at DESC",
        (customer_id,),
        one=True,
    )
    if not conv:
        conv_id = "CONV-" + uuid.uuid4().hex[:8].upper()
        repo.execute(
            "INSERT INTO conversations(id, customer_id, started_at) VALUES(?,?,?)",
            (conv_id, customer_id, repo.now()),
        )
    else:
        conv_id = conv["id"]
    repo.execute(
        "INSERT INTO messages(conversation_id, role, text, ts) VALUES(?,?,?,?)",
        (conv_id, role, text, repo.now()),
    )
    repo.bump("messages_received")
    return {"conversation_id": conv_id, "ts": repo.now()}


def conversation_messages(conversation_id: str) -> list[str]:
    return [r["text"] for r in repo.q("SELECT text FROM messages WHERE conversation_id = ? ORDER BY id", (conversation_id,))]


def record_analysis(customer_id: str, conversation_id: str, messages: list[str]) -> dict:
    analysis = nlp.analyze(messages)
    ent = analysis["entities"]
    repo.execute(
        "UPDATE conversations SET summary = ?, sentiment = ?, intent = ? WHERE id = ?",
        (analysis["summary"], analysis["sentiment"], analysis["intent"]["label"], conversation_id),
    )
    req_id = "REQ-" + uuid.uuid4().hex[:8].upper()
    repo.execute(
        "INSERT OR REPLACE INTO requirements(id, customer_id, conversation_id, product, quantity, budget, delivery, intent, priority, created_at) VALUES(?,?,?,?,?,?,?,?,?,?)",
        (
            req_id,
            customer_id,
            conversation_id,
            None,
            ent.get("quantity"),
            ent.get("budget"),
            ent.get("delivery"),
            ent.get("intent"),
            ent.get("priority"),
            repo.now(),
        ),
    )
    remember(customer_id, "last_requirement", ent)
    remember(customer_id, "last_sentiment", analysis["sentiment"])
    remember(customer_id, "last_intent", analysis["intent"]["label"])
    remember(customer_id, "last_conversation_id", conversation_id)
    write_workspace(customer_id, "Requirements", {"requirement_id": req_id, **ent})
    write_workspace(customer_id, "Conversations", {"conversation_id": conversation_id, "summary": analysis["summary"]})
    write_workspace(customer_id, "Interaction_History", {"conversation_id": conversation_id, "ts": repo.now()})
    vectorstore.index_text(f"{customer_id}:{conversation_id}", customer_id, "conversation", " ".join(messages))
    repo.bump("conversations_analyzed")
    return {"requirement_id": req_id, **analysis}


def end_conversation(customer_id: str) -> dict:
    row = repo.q(
        "SELECT id FROM conversations WHERE customer_id = ? AND ended_at IS NULL ORDER BY started_at DESC",
        (customer_id,),
        one=True,
    )
    if not row:
        return {"ended": False, "reason": "no open conversation"}
    repo.execute("UPDATE conversations SET ended_at = ? WHERE id = ?", (repo.now(), row["id"]))
    repo.bump("conversations_closed")
    return {"ended": True, "conversation_id": row["id"]}


def list_conversations(customer_id: str | None = None) -> list[dict]:
    sql = "SELECT * FROM conversations"
    args: tuple = ()
    if customer_id:
        sql += " WHERE customer_id = ?"
        args = (customer_id,)
    return [dict(r) for r in repo.q(sql + " ORDER BY started_at DESC", args)]


# ---------------------------------------------------------------- proposals
def save_proposal(proposal: dict) -> dict:
    repo.execute(
        "INSERT OR REPLACE INTO proposals(id, customer_id, conversation_id, version, terms, body, status, created_at) VALUES(?,?,?,?,?,?,?,?)",
        (
            proposal["id"],
            proposal["customer_id"],
            proposal.get("conversation_id"),
            proposal["version"],
            repo.jdump(proposal["terms"]),
            proposal["body"],
            "draft",
            proposal["created_at"],
        ),
    )
    write_workspace(proposal["customer_id"], "Proposals", {"proposal_id": proposal["id"], "version": proposal["version"]})
    write_workspace(proposal["customer_id"], "Documents", {"proposal_id": proposal["id"], "type": "pdf"})
    remember(proposal["customer_id"], "last_proposal_id", proposal["id"])
    repo.bump("proposals_generated")
    return proposal


def list_proposals(customer_id: str | None = None) -> list[dict]:
    sql = "SELECT * FROM proposals"
    args: tuple = ()
    if customer_id:
        sql += " WHERE customer_id = ?"
        args = (customer_id,)
    out = []
    for r in repo.q(sql + " ORDER BY created_at DESC", args):
        d = dict(r)
        d["terms"] = repo.jload(d["terms"])
        out.append(d)
    return out


def set_proposal_status(proposal_id: str, status: str) -> dict:
    repo.execute("UPDATE proposals SET status = ? WHERE id = ?", (status, proposal_id))
    repo.bump("proposals_" + status)
    return {"proposal_id": proposal_id, "status": status}


# ------------------------------------------------------------------- memory
def remember(customer_id: str, key: str, value) -> None:
    repo.execute(
        "INSERT OR REPLACE INTO memory(customer_id, key, value, updated_at) VALUES(?,?,?,?)",
        (customer_id, key, repo.jdump(value), repo.now()),
    )


def recall(customer_id: str) -> dict:
    return {r["key"]: repo.jload(r["value"]) for r in repo.q("SELECT key, value FROM memory WHERE customer_id = ?", (customer_id,))}


# --------------------------------------------------------------- workspace
def _workspace(customer_id: str) -> dict:
    entries = {s: [] for s in WORKSPACE_SECTIONS}
    for r in repo.q("SELECT section, payload FROM workspace_entries WHERE customer_id = ? ORDER BY created_at", (customer_id,)):
        if r["section"] in entries:
            entries[r["section"]].append(repo.jload(r["payload"]))
    return entries


def write_workspace(customer_id: str, section: str, payload: dict) -> dict:
    entry_id = section[:3].upper() + "-" + uuid.uuid4().hex[:6]
    repo.execute(
        "INSERT INTO workspace_entries(id, customer_id, section, payload, created_at) VALUES(?,?,?,?,?)",
        (entry_id, customer_id, section, repo.jdump(payload), repo.now()),
    )
    return {"id": entry_id, **payload}


def workspace(customer_id: str) -> dict:
    sections = _workspace(customer_id)
    orders = list_orders(customer_id)
    return {
        "customer_id": customer_id,
        "sections": sections,
        "totals": {
            "conversations": len(repo.q("SELECT id FROM conversations WHERE customer_id = ?", (customer_id,))),
            "proposals": len(list_proposals(customer_id)),
            "orders": len(orders),
            "order_value": round(sum(o["grand_total"] for o in orders), 2),
        },
        "memory": recall(customer_id),
    }


# ------------------------------------------------------------------ orders
def create_order(customer_id: str, items: list[dict], status: str = "confirmed") -> dict:
    from app.services import catalog

    lines, subtotal = [], 0
    for item in items:
        product = catalog.get_product(item.get("product_id", ""))
        if not product:
            continue
        qty = int(item.get("quantity", 1))
        amount = product["unit_price"] * qty
        subtotal += amount
        lines.append({"product_id": product["id"], "name": product["name"], "quantity": qty,
                      "unit_price": product["unit_price"], "line_total": amount})
    tax = round(subtotal * 0.18, 2)
    order = {
        "id": "ORD-" + uuid.uuid4().hex[:8].upper(),
        "customer_id": customer_id,
        "items": lines,
        "subtotal": subtotal,
        "tax": tax,
        "grand_total": subtotal + tax,
        "currency": "INR",
        "status": status,
        "created_at": repo.now(),
    }
    repo.execute(
        "INSERT INTO orders(id, customer_id, subtotal, tax, grand_total, currency, status, created_at) VALUES(?,?,?,?,?,?,?,?)",
        (order["id"], customer_id, order["subtotal"], tax, order["grand_total"], "INR", status, order["created_at"]),
    )
    for l in lines:
        repo.execute(
            "INSERT INTO order_items(order_id, product_id, name, quantity, unit_price, line_total) VALUES(?,?,?,?,?,?)",
            (order["id"], l["product_id"], l["name"], l["quantity"], l["unit_price"], l["line_total"]),
        )
    write_workspace(customer_id, "Products", {"order_id": order["id"], "items": [l["name"] for l in lines]})
    remember(customer_id, "last_order_value", order["grand_total"])
    repo.bump("orders_created")
    return order


def list_orders(customer_id: str | None = None) -> list[dict]:
    sql = "SELECT * FROM orders"
    args: tuple = ()
    if customer_id:
        sql += " WHERE customer_id = ?"
        args = (customer_id,)
    out = []
    for r in repo.q(sql + " ORDER BY created_at DESC", args):
        d = dict(r)
        d["items"] = [dict(i) for i in repo.q("SELECT * FROM order_items WHERE order_id = ?", (d["id"],))]
        out.append(d)
    return out


# --------------------------------------------------------------- analytics
def customer_360(customer_id: str) -> dict:
    convs = list_conversations(customer_id)
    orders = list_orders(customer_id)
    spend = round(sum(o["grand_total"] for o in orders), 2)
    products = sorted({i["name"] for o in orders for i in o["items"]})
    mem = recall(customer_id)
    return {
        "customer_id": customer_id,
        "total_conversations": len(convs),
        "total_orders": len(orders),
        "total_spend": spend,
        "products_of_interest": products,
        "current_requirement": mem.get("last_requirement"),
        "sentiment": mem.get("last_sentiment", "Neutral"),
        "intents": [c["intent"] for c in convs if c["intent"]],
        "last_active": convs[0]["started_at"] if convs else None,
    }


def feature_rows() -> list[dict]:
    """Dataset for the ML models: one row per customer."""
    rows = []
    for c in list_customers():
        v = customer_360(c["id"])
        rows.append(
            {
                "customer_id": c["id"],
                "conversations": v["total_conversations"],
                "orders": v["total_orders"],
                "spend": v["total_spend"],
                "negative": 1 if v["sentiment"] == "Negative" else 0,
                "high_priority": 1 if (v["current_requirement"] or {}).get("priority") == "High" else 0,
                "churn": 1 if v["sentiment"] == "Negative" and v["total_orders"] == 0 else 0,
                "purchase": 1 if v["total_orders"] > 0 else 0,
            }
        )
    return rows