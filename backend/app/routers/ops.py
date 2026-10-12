"""Platform endpoints: agents, ML, jobs, telemetry, streaming, health of subsystems."""
from fastapi import APIRouter

from app import agents, observability, repository as repo, tasks
from app.agents.agents import CRMManagerAgent
from app.services import crm, llm, ml

router = APIRouter(prefix="/ops", tags=["ops"])
manager = CRMManagerAgent()


@router.get("/agents")
def list_agents():
    return {"orchestrator": manager.name, "agents": manager.describe()}


@router.post("/agents/{name}")
def run_agent(name: str, payload: dict):
    return manager.run({"agent": name, **payload})


@router.get("/ml/model")
def model_info():
    return ml.model_info()


@router.post("/ml/train")
def train_model():
    return ml.train()


@router.get("/ml/dataset")
def dataset():
    return {"features": ml.FEATURES, "rows": crm.feature_rows()}


@router.get("/jobs")
def jobs(limit: int = 25):
    return tasks.all_jobs(limit)


@router.get("/jobs/{job_id}")
def job(job_id: str):
    return tasks.get(job_id) or {"error": "not found"}


@router.get("/metrics")
def metrics():
    return {"latency": observability.snapshot(), "counters": repo.metrics_snapshot()}


@router.get("/stream/spark")
def spark():
    from app.streaming import spark_job

    spark_job.run()
    return {"engine": "spark", "status": "feature_generation_complete"}


@router.post("/stream/kafka")
def kafka(topic: str, event: str):
    from app.streaming import kafka_bus

    kafka_bus.produce(topic, event)
    return {"topic": topic, "published": event}


@router.get("/llm")
def llm_status():
    return {"configured": llm.available(), "model": llm.MODEL}


@router.post("/seed")
def seed():
    from app import seed as seeder

    return seeder.run()