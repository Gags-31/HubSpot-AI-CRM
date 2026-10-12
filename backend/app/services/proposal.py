"""Proposal engine: term extraction, missing-information detection, versioning, PDF render."""
import json
import uuid
from datetime import datetime, timezone

from app.services import llm

REQUIRED_FIELDS = ["product", "quantity", "price", "delivery", "payment", "warranty"]
OPTIONAL_FIELDS = ["discount", "support", "special_conditions", "lead_time", "installation"]

QUESTIONS = {
    "product": "Which product/service is this proposal for?",
    "quantity": "What quantity should be quoted?",
    "price": "What price should we quote?",
    "delivery": "What are the delivery terms?",
    "payment": "What payment terms should be included?",
    "warranty": "What warranty should be included?",
    "support": "What level of support is required?",
}


def extract_terms(messages: list[str]) -> dict:
    from app.services.nlp import extract_entities

    joined = " ".join(messages)
    e = extract_entities(joined)
    terms = {
        "product": None,
        "quantity": e["quantity"],
        "price": e["budget"],
        "discount": None,
        "delivery": e["delivery"],
        "payment": None,
        "warranty": None,
        "support": None,
        "special_conditions": None,
    }
    from app.services import catalog

    fit = catalog.resolve_budget(e.get("budget"))
    terms["product"] = fit[0]["name"] if fit else None
    return terms


def completeness(terms: dict) -> dict:
    missing = [f for f in REQUIRED_FIELDS if not terms.get(f)]
    present = [f for f in REQUIRED_FIELDS if terms.get(f)]
    return {
        "complete": not missing,
        "score": round(len(present) / len(REQUIRED_FIELDS), 2),
        "present": present,
        "missing": missing,
        "questions": [QUESTIONS.get(m) for m in missing],
    }


def missing_information(terms: dict) -> list[dict]:
    return [
        {"field": f, "present": bool(terms.get(f)), "question": None if terms.get(f) else QUESTIONS.get(f)}
        for f in REQUIRED_FIELDS
    ]


def render(terms: dict, customer_id: str, version: int = 1) -> str:
    gap = completeness(terms)
    lines = [
        f"CUSTOMER PROPOSAL  ·  {customer_id}  ·  v{version}",
        "=" * 60,
        f"Status           : {'COMPLETE' if gap['complete'] else 'INCOMPLETE (' + str(int(gap['score'] * 100)) + '% filled)'}",
        f"Issued           : {datetime.now(timezone.utc).date().isoformat()}",
        "",
        "1. SCOPE OF SUPPLY",
        f"   Product/Service: {terms.get('product') or 'To be confirmed'}",
        f"   Quantity       : {terms.get('quantity') or 'To be confirmed'}",
        "",
        "2. COMMERCIALS",
        f"   Price          : {terms.get('price') or 'To be confirmed'}",
        f"   Discount       : {terms.get('discount') or 'None'}",
        "",
        "3. DELIVERY & INSTALLATION",
        f"   Delivery       : {terms.get('delivery') or 'To be confirmed'}",
        f"   Installation   : {terms.get('installation') or 'Included unless stated'}",
        "",
        "4. PAYMENT, WARRANTY & SUPPORT",
        f"   Payment        : {terms.get('payment') or 'To be confirmed'}",
        f"   Warranty       : {terms.get('warranty') or 'To be confirmed'}",
        f"   Support        : {terms.get('support') or 'To be confirmed'}",
        "",
        "5. SPECIAL CONDITIONS",
        f"   {terms.get('special_conditions') or 'None'}",
    ]
    if not gap["complete"]:
        lines += ["", f"OPEN QUESTIONS: {', '.join(gap['questions'])}"]
    lines += ["", f"Accepted for and on behalf of the customer: ______________________"]
    return "\n".join(lines)


def generate(customer_id: str, messages: list[str], conversation_id: str | None = None) -> dict:
    from app.services import vectorstore

    terms = extract_terms(messages)
    version = 1
    context = vectorstore.context_for(" ".join(messages), customer_id)
    generated = llm.generate_proposal(terms, customer_id, context)
    body = generated["body"]
    proposal_id = "PROP-" + uuid.uuid4().hex[:8].upper()
    return {
        "id": proposal_id,
        "customer_id": customer_id,
        "conversation_id": conversation_id,
        "version": version,
        "terms": terms,
        "body": body,
        "completeness": completeness(terms),
        "missing": missing_information(terms),
        "engine": generated["engine"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }


def to_pdf_bytes(proposal: dict) -> bytes:
    """Render a proposal to PDF via reportlab if installed, else a minimal valid PDF."""
    lines = proposal["body"].splitlines()
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.pdfgen import canvas  # type: ignore

        import io

        buf = io.BytesIO()
        c = canvas.Canvas(buf, pagesize=A4)
        y = 800
        for line in lines:
            if y < 40:
                c.showPage()
                y = 800
            c.drawString(40, y, line[:110])
            y -= 14
        c.save()
        return buf.getvalue()
    except ImportError:
        return _minimal_pdf("\n".join(line[:100] for line in lines))


def _minimal_pdf(text: str) -> bytes:
    """Tiny single-page PDF writer (no third-party dependency)."""
    lines = text.splitlines()[:55]
    content = ["BT", "/F1 9 Tf", "40 800 Td", "11 TL"]
    for line in lines:
        safe = line.replace("\\", r"\\").replace("(", r"\(").replace(")", r"\)")
        content.append(f"({safe}) Tj T*")
    content.append("ET")
    stream = "\n".join(content).encode("latin-1", "replace")
    objs = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
        b"<< /Length " + str(len(stream)).encode() + b" >>\nstream\n" + stream + b"\nendstream",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>",
    ]
    out = bytearray(b"%PDF-1.4\n")
    offsets = []
    for i, obj in enumerate(objs, start=1):
        offsets.append(len(out))
        out += f"{i} 0 obj\n".encode() + obj + b"\nendobj\n"
    xref = len(out)
    out += f"xref\n0 {len(objs) + 1}\n".encode() + b"0000000000 65535 f \n"
    for off in offsets:
        out += f"{off:010d} 00000 n \n".encode()
    out += f"trailer\n<< /Size {len(objs) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode()
    return bytes(out)