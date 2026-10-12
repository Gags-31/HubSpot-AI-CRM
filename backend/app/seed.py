"""Seed data: demo users, customers, conversations and orders so the system has substance."""
from app import repository as repo
from app.services import catalog, crm, ml

DEMO_USERS = [("dealer", "dealer@123", "dealer"), ("analyst", "analyst@123", "analyst"), ("admin", "admin@123", "admin")]

SCRIPTS = {
    "Consumer_DEMO01": [
        ("consumer", "Hello, I need 50 industrial sensor kits. My budget is around Rs 2 lakh and delivery is needed before the 20th."),
        ("dealer", "Understood. Payment terms are 30% advance and 70% on delivery, with a 2 year warranty."),
        ("consumer", "That works. This is urgent, please proceed."),
    ],
    "Consumer_DEMO02": [
        ("consumer", "We had a delivery delayed last month and it caused a production stop. Very poor service."),
        ("dealer", "I apologise. I have escalated this to the logistics head and will call you today."),
        ("consumer", "Please call me as soon as possible."),
    ],
    "Consumer_DEMO03": [
        ("consumer", "What is the price of the control unit and the annual maintenance contract?"),
        ("dealer", "The control unit is Rs 8,200 per unit and AMC is Rs 18,000 per year."),
        ("consumer", "I need 12 control units. Can you send a proposal?"),
    ],
    "Consumer_DEMO04": [
        ("consumer", "I need 200 network gateways delivered before Friday. Budget Rs 8 lakh."),
        ("dealer", "Noted. Discount of 6% applied for bulk quantity. Payment 50/50."),
        ("consumer", "Great, please send the proposal."),
    ],
}


def run() -> dict:
    repo.init_db()
    products = catalog.seed_products()
    from app import security

    users = [security.ensure_user(u, p, r) for u, p, r in DEMO_USERS]

    created = 0
    for cid, script in SCRIPTS.items():
        if repo.q("SELECT id FROM customers WHERE id = ?", (cid,), one=True):
            continue
        repo.execute("INSERT INTO customers(id, name, contact, created_at) VALUES(?,?,?,?)",
                     (cid, cid.replace("Consumer_", "Client "), f"{cid.lower()}@example.com", repo.now()))
        repo.execute("INSERT OR REPLACE INTO workspace_entries(id, customer_id, section, payload, created_at) VALUES(?,?,?,?,?)",
                     (cid + "-profile", cid, "Profile", repo.jdump({"name": cid.replace("Consumer_", "Client "), "source": "seed"}), repo.now()))
        messages = []
        for role, text in script:
            info = crm.start_conversation(cid, role, text)
            messages.append(text)
        crm.record_analysis(cid, info["conversation_id"], messages)
        crm.remember(cid, "days_since_contact", 9)
        created += 1

    orders = 0
    for cid, items in {
        "Consumer_DEMO01": [{"product_id": "PRD-A100", "quantity": 50}],
        "Consumer_DEMO03": [{"product_id": "PRD-B220", "quantity": 12}, {"product_id": "PRD-SUP1", "quantity": 1}],
        "Consumer_DEMO04": [{"product_id": "PRD-D140", "quantity": 200}],
    }.items():
        if not repo.q("SELECT id FROM orders WHERE customer_id = ?", (cid,), one=True):
            crm.create_order(cid, items)
            orders += 1

    model = ml.train()
    return {"products_seeded": products, "users": len(users), "customers_created": created,
            "orders_created": orders, "model": {k: v for k, v in model.items() if k in ("trained", "engine", "reason", "mean_cv_accuracy")}}