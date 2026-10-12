"""Real-time conversational channel (WebSocket).

The client streams dealer/consumer turns; the server records each message,
streams back live NLP analysis and finally the extracted requirement set.
"""
import asyncio
import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.services import crm, nlp, proposal as proposal_svc

router = APIRouter()


@router.websocket("/ws/conversation/{customer_id}")
async def conversation_ws(websocket: WebSocket, customer_id: str):
    await websocket.accept()
    conv_id = None
    buffer: list[str] = []

    async def emit(event: str, data: dict):
        await websocket.send_text(json.dumps({"event": event, **data}))

    await emit("ready", {"customer": crm.get_customer(customer_id) or {"id": customer_id}, "protocol": "hubspot.v1"})

    try:
        while True:
            raw = await websocket.receive_text()
            msg = json.loads(raw)
            kind = msg.get("type", "message")

            if kind == "message":
                text = msg.get("text", "").strip()
                if not text:
                    continue
                role = msg.get("role", "consumer")
                info = crm.start_conversation(customer_id, role, text)
                conv_id = info["conversation_id"]
                buffer.append(text)
                entities = nlp.extract_entities(text)
                await emit("transcript", {"text": text, "role": role, "ts": info["ts"]})
                await emit("analysis", {
                    "entities": entities,
                    "sentiment": nlp.sentiment(text)["label"],
                    "intent": nlp.intent(text)["label"],
                    "topics": nlp.topics(text),
                })

            elif kind == "analyse":
                await emit("full_analysis", nlp.analyze(buffer))

            elif kind == "propose":
                draft = proposal_svc.generate(customer_id, buffer, conv_id)
                crm.save_proposal(draft)
                await emit("proposal", {
                    "proposal_id": draft["id"],
                    "completeness": draft["completeness"],
                    "missing": draft["missing"],
                    "body": draft["body"],
                    "engine": draft["engine"],
                })

            elif kind == "close":
                await emit("closed", crm.end_conversation(customer_id))
                await websocket.close()
                break

            elif kind == "ping":
                await emit("pong", {"ts": asyncio.get_event_loop().time()})

            else:
                await emit("error", {"reason": f"unknown message type '{kind}'"})
    except WebSocketDisconnect:
        return