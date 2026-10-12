"""Multi-agent AI layer.

Each agent owns one domain of CRM work and delegates heavy lifting to services
(repository, NLP, vector store, ML, LLM). The CRM Manager agent routes requests.
"""
from app import tasks
from app.services import catalog, crm, llm, ml, next_action, nlp, proposal as proposal_svc, rag, vectorstore


class BaseAgent:
    name = "agent"
    description = ""

    def run(self, payload: dict) -> dict:
        raise NotImplementedError


class ConsumerAgent(BaseAgent):
    name = "consumer"
    description = "Creates consumer records, workspaces and profiles"

    def run(self, payload):
        name = payload.get("name") or f"Consumer {payload.get('customer_id', 'new')}"
        customer = crm.create_customer(name, payload.get("contact"))
        return {"agent": self.name, "action": "consumer created", "customer": customer,
                "workspace_sections": list(crm.workspace(customer["id"])["sections"])}


class ConversationAgent(BaseAgent):
    name = "conversation"
    description = "Records, transcribes, summarises and analyses conversations"

    def run(self, payload):
        messages = payload.get("messages", [])
        customer_id = payload.get("customer_id")
        if not customer_id or not messages:
            return {"agent": self.name, "action": "noop", "reason": "customer_id and messages required"}
        info = crm.start_conversation(customer_id, payload.get("role", "consumer"), messages[-1])
        analysis = crm.record_analysis(customer_id, info["conversation_id"], messages)
        llm_summary = llm.summarize(messages)
        return {"agent": self.name, "conversation_id": info["conversation_id"], "analysis": analysis,
                "llm_summary": llm_summary, "actions": crm.workspace(customer_id)["sections"]["Interaction_History"]}


class NLPIntelligenceAgent(BaseAgent):
    name = "nlp"
    description = "NER, intent, sentiment, requirement extraction and summarisation"

    def run(self, payload):
        messages = payload.get("messages", [])
        return {"agent": self.name, **nlp.analyze(messages)}


class ProposalAgent(BaseAgent):
    name = "proposal"
    description = "Generates proposals from conversation terms and detects missing information"

    def run(self, payload):
        customer_id = payload.get("customer_id", "unknown")
        messages = payload.get("messages") or []
        draft = proposal_svc.generate(customer_id, messages, payload.get("conversation_id"))
        crm.save_proposal(draft)
        follow = llm.follow_up(draft["terms"], customer_id)
        crm.write_workspace(customer_id, "Followups", {"message": follow})
        return {"agent": self.name, "proposal_id": draft["id"], "terms": draft["terms"],
                "completeness": draft["completeness"], "missing": draft["missing"],
                "engine": draft["engine"], "body": draft["body"], "follow_up": follow,
                "pdf": f"/proposals/{draft['id']}/pdf"}


class RecommendationAgent(BaseAgent):
    name = "recommendation"
    description = "Product recommendations and budget-fit suggestions"

    def run(self, payload):
        entities = payload.get("entities") or nlp.extract_entities(" ".join(payload.get("messages", [])))
        qty = entities.get("quantity_value") or 1
        rec = catalog.recommend(int(qty))
        fits = catalog.resolve_budget(entities.get("budget"))
        return {"agent": self.name, "requirement": entities, "recommendation": rec, "budget_fits": fits[:4]}


class FollowUpAgent(BaseAgent):
    name = "followup"
    description = "Detects pending actions and drafts follow-up messages"

    def run(self, payload):
        customer_id = payload.get("customer_id", "unknown")
        terms = payload.get("terms") or proposal_svc.extract_terms(payload.get("messages", []))
        gaps = proposal_svc.completeness(terms)["missing"]
        message = llm.follow_up(terms, customer_id)
        crm.write_workspace(customer_id, "Followups", {"pending": gaps, "message": message})
        return {"agent": self.name, "pending_items": gaps, "message": message}


class CustomerIntelligenceAgent(BaseAgent):
    name = "intelligence"
    description = "360° view, churn/purchase prediction and CLV"

    def run(self, payload):
        from app.services import predictive

        customer_id = payload.get("customer_id", "unknown")
        return {"agent": self.name, "profile": crm.customer_360(customer_id),
                "prediction": predictive.predict(customer_id), "model": ml.model_info()}


class NextActionAgent(BaseAgent):
    name = "next_action"
    description = "Ranks the best dealer action for a customer"

    def run(self, payload):
        customer_id = payload.get("customer_id", "unknown")
        memory = crm.recall(customer_id)
        sentiment = memory.get("last_sentiment", "Neutral")
        intent = memory.get("last_intent", "General")
        from app.services import predictive

        pred = predictive.predict(customer_id)
        ranked = next_action.rank(
            sentiment=sentiment,
            intent=intent,
            days_since_contact=memory.get("days_since_contact", 0),
            proposal_pending=bool(memory.get("last_proposal_id")),
            churn_risk=pred["churn_risk"],
            budget=(memory.get("last_requirement") or {}).get("budget"),
        )
        return {"agent": self.name, "top_action": ranked[0], "ranked": ranked[:6],
                "signals": {"sentiment": sentiment, "intent": intent, "churn_risk": pred["churn_risk"]}}


class AssistantAgent(BaseAgent):
    name = "assistant"
    description = "RAG assistant over CRM data"

    def run(self, payload):
        return {"agent": self.name, **rag.answer(payload.get("query", ""), payload.get("customer_id"))}


class VoiceAgent(BaseAgent):
    name = "voice"
    description = "Speech-to-text transcription (open-source Whisper)"

    def run(self, payload):
        from app.services import stt

        text = stt.transcribe(payload.get("audio_path", "upload.wav"))
        customer_id = payload.get("customer_id")
        if customer_id:
            crm.start_conversation(customer_id, "consumer", text)
            crm.record_analysis(customer_id, crm.list_conversations(customer_id)[0]["id"], [text])
        return {"agent": self.name, "transcript": text}


class MLAgent(BaseAgent):
    name = "ml"
    description = "Trains and serves the churn/purchase models"

    def run(self, payload):
        if payload.get("train"):
            job = tasks.submit("ml_train", ml.train)
            return {"agent": self.name, "action": "training submitted", "job": job}
        return {"agent": self.name, "model": ml.model_info()}


class CRMManagerAgent(BaseAgent):
    """Orchestrator: decides which agent performs which task."""

    name = "crm_manager"
    description = "Routes work to the specialised agents"

    def __init__(self):
        self.agents = {
            a.name: a
            for a in (
                ConsumerAgent(),
                ConversationAgent(),
                NLPIntelligenceAgent(),
                ProposalAgent(),
                RecommendationAgent(),
                FollowUpAgent(),
                CustomerIntelligenceAgent(),
                NextActionAgent(),
                AssistantAgent(),
                VoiceAgent(),
                MLAgent(),
            )
        }

    def run(self, payload: dict) -> dict:
        target = payload.get("agent")
        if target not in self.agents:
            return {"agent": self.name, "error": f"unknown agent '{target}'",
                    "available": list(self.agents)}
        result = self.agents[target].run(payload)
        result["routed_by"] = self.name
        return result

    def describe(self) -> list[dict]:
        return [{"name": a.name, "description": a.description} for a in self.agents.values()]