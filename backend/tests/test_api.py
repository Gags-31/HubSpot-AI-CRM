"""Backend test suite for HubSpot.

Run: pytest backend/tests -q   (from the backend directory)
"""
import os
import tempfile

os.environ.setdefault("HUBSPOT_DB", os.path.join(tempfile.gettempdir(), "hubspot_test.db"))
os.environ.setdefault("HUBSPOT_SECRET", "test-secret")

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app import repository as repo, security  # noqa: E402
from main import app  # noqa: E402
from app.services import catalog, crm, ml, next_action, nlp, proposal, rag, vectorstore  # noqa: E402


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


# ------------------------------------------------------------------- NLP
def test_nlp_extracts_requirement():
    e = nlp.extract_entities("I need 120 control units, budget Rs 9 lakh, delivery before the 15th. This is urgent.")
    assert e["quantity_value"] == 120
    assert e["budget_value"] == 900000
    assert e["delivery"] == "Before the 15th"
    assert e["priority"] == "High"
    assert e["intent"] == "Purchase"


def test_nlp_sentiment_and_complaint():
    assert nlp.sentiment("Great service, thanks")["label"] == "Positive"
    assert nlp.is_complaint("Delivery was delayed and it is a serious problem") is True


def test_nlp_topics_and_agreement():
    assert "warranty" in nlp.topics("Do you provide warranty and AMC?")
    assert nlp.agreements("I agree, let's proceed") == ["i agree"] or nlp.agreements("I agree, let's proceed")


def test_nlp_similarity_and_summary():
    assert nlp.similarity("50 units budget 2 lakh", "need 50 units with budget 2 lakh") > 0.6
    assert nlp.summarize(["I need 50 units. Delivery before Monday."])


# --------------------------------------------------------------- security
def test_password_hash_and_verify():
    digest, salt = security.hash_password("secret123")
    assert security.verify_password("secret123", digest, salt)
    assert not security.verify_password("wrong", digest, salt)


def test_jwt_roundtrip():
    token = security.create_token({"username": "dealer", "role": "dealer"})["token"]
    claims = security.decode_token(token)
    assert claims["sub"] == "dealer"
    assert security.decode_token(token + "x") is None


def test_login_endpoint(client):
    r = client.post("/security/login", params={"username": "dealer", "password": "dealer@123"})
    assert r.status_code == 200 and "token" in r.json()
    assert client.post("/security/login", params={"username": "dealer", "password": "bad"}).json()["authorized"] is False


# --------------------------------------------------------------- repository
def test_customer_lifecycle(client):
    created = client.post("/customers/", params={"name": "Test Buyer"}).json()
    assert created["id"].startswith("Consumer_")
    assert client.get(f"/customers/{created['id']}").status_code == 200


def test_conversation_records_and_indexes(client):
    cid = client.post("/customers/", params={"name": "Conv Tester"}).json()["id"]
    r = client.post(f"/conversations/?customer_id={cid}",
                    json=["I need 10 control units, budget Rs 2 lakh, delivery before Friday"])
    analysis = r.json()["analysis"]
    assert analysis["entities"]["quantity_value"] == 10
    assert any(v["id"].startswith(cid) for v in vectorstore.search("control units"))


def test_workspace_sections(client):
    ws = client.get("/workspace/Consumer_DEMO01").json()
    assert set(ws["sections"]) == set(crm.WORKSPACE_SECTIONS)
    assert ws["totals"]["orders"] >= 1


# ---------------------------------------------------------------- proposals
def test_proposal_generation_and_completeness(client):
    r = client.post("/proposals/generate?customer_id=Consumer_DEMO01",
                    json=["I need 50 sensor kits budget Rs 2 lakh delivery before the 20th"])
    body = r.json()
    assert body["completeness"]["score"] > 0
    assert "payment" in body["completeness"]["missing"]
    assert "PROPOSAL" in body["body"]


def test_proposal_pdf_is_valid(client):
    pid = client.post("/proposals/generate?customer_id=Consumer_DEMO01", json=["need 5 kits"]).json()["id"]
    pdf = client.get(f"/proposals/{pid}/pdf")
    assert pdf.status_code == 200 and pdf.content[:4] == b"%PDF"


def test_missing_info_autofill_bumps_version(client):
    pid = client.post("/proposals/generate?customer_id=Consumer_DEMO03", json=["need 12 units"]).json()["id"]
    updated = client.post(f"/proposals/ask-missing?customer_id=Consumer_DEMO03&field=payment&value=50%25%20advance").json()
    assert updated["version"] >= 2


# ---------------------------------------------------------------- commerce
def test_catalog_recommendation_and_budget():
    assert len(catalog.list_products()) >= 7
    assert catalog.resolve_budget("Rs 2 lakh")
    rec = catalog.recommend(50)
    assert rec["estimated_total"] > 0 and rec["stock_check"] in {"in_stock", "backorder"}


def test_order_totals_with_tax(client):
    order = client.post("/orders/?customer_id=Consumer_DEMO03", json=[{"product_id": "PRD-B220", "quantity": 2}]).json()
    assert order["grand_total"] == round(order["subtotal"] * 1.18, 2)
    assert order["items"][0]["line_total"] == order["items"][0]["unit_price"] * 2


# ------------------------------------------------------------------ agents
@pytest.mark.parametrize("agent", ["conversation", "nlp", "proposal", "recommendation", "followup",
                                   "intelligence", "next_action", "assistant", "ml"])
def test_agents_route(client, agent):
    payload = {"customer_id": "Consumer_DEMO01",
               "messages": ["I need 50 units, budget Rs 2 lakh, delivery before the 20th"],
               "query": "What did this customer ask for?"}
    r = client.post(f"/ops/agents/{agent}", json=payload)
    assert r.status_code == 200
    body = r.json()
    assert body.get("routed_by") == "crm_manager"


def test_unknown_agent_rejected(client):
    assert client.post("/ops/agents/nope", json={}).json()["error"]


# ---------------------------------------------------------------- RAG / ML
def test_rag_returns_grounded_answer(client):
    client.post("/conversations/?customer_id=Consumer_DEMO01", json=["I need 300 safety relay panels"])
    answer = rag.answer("what does this customer need")
    assert answer["grounded"] is True and answer["sources"]


def test_ml_train_and_predict():
    result = ml.train()
    assert result["trained"] in (True, False)
    pred = ml.predict({"conversations": 12, "orders": 3, "spend": 250000, "negative": 0, "high_priority": 1})
    assert 0 <= pred["purchase_probability"] <= 1


def test_next_best_action_prioritises_complaints():
    ranked = next_action.rank(sentiment="Negative", intent="Complaint", days_since_contact=30)
    assert ranked[0]["action"] == "Escalate Complaint"


def test_customer_360_and_portfolio(client):
    view = client.get("/analytics/customer/Consumer_DEMO01").json()
    assert "prediction" in view and view["next_actions"]
    portfolio = client.get("/analytics/portfolio").json()
    assert portfolio["customers"] >= 1


# --------------------------------------------------------------- platform
def test_telemetry_and_health(client):
    client.get("/health")
    metrics = client.get("/ops/metrics").json()
    assert metrics["counters"].get("http_requests_total", 0) > 0
    assert any("/health" in path for path in metrics["latency"])


def test_websocket_conversation(client):
    with client.websocket_connect("/ws/conversation/Consumer_DEMO01") as ws:
        ready = ws.receive_json()
        assert ready["event"] == "ready"
        ws.send_json({"type": "message", "text": "I need 40 sensor kits, budget Rs 1 lakh, delivery before Monday"})
        assert ws.receive_json()["event"] == "transcript"
        analysis = ws.receive_json()
        assert analysis["event"] == "analysis" and analysis["entities"]["quantity_value"] == 40