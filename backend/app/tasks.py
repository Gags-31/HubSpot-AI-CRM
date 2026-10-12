"""Background job runner for long-running AI work (transcription, proposals, training).

Threaded, in-process queue — mirrors a Celery/RQ worker without extra infrastructure.
"""
import threading
import time
import traceback
import uuid
from collections import deque

JOBS: dict[str, dict] = {}
QUEUE: deque = deque()
_LOCK = threading.Lock()


def submit(kind: str, fn, **kwargs) -> dict:
    job_id = f"job_{uuid.uuid4().hex[:8]}"
    with _LOCK:
        JOBS[job_id] = {"id": job_id, "kind": kind, "status": "queued", "created": time.time(),
                        "args": {k: str(v)[:80] for k, v in kwargs.items()}}
        QUEUE.append((job_id, kind, fn, kwargs))
    threading.Thread(target=_worker, args=(job_id,), daemon=True).start()
    return JOBS[job_id]


def _worker(job_id: str) -> None:
    with _LOCK:
        item = next((q for q in QUEUE if q[0] == job_id), None)
        if item:
            QUEUE.remove(item)
        if item:
            _, kind, fn, kwargs = item
        else:
            JOBS[job_id]["status"] = "missing"
            return
    JOBS[job_id]["status"] = "running"
    started = time.time()
    try:
        result = fn(**kwargs)
        JOBS[job_id].update({"status": "done", "result": result, "duration_s": round(time.time() - started, 3)})
    except Exception as exc:  # noqa: BLE001 - surfaced to the client
        JOBS[job_id].update({"status": "failed", "error": str(exc), "trace": traceback.format_exc()[-400:]})
    # keep the registry bounded
    if len(JOBS) > 200:
        for old in sorted(JOBS, key=lambda j: JOBS[j]["created"])[:50]:
            JOBS.pop(old, None)


def get(job_id: str) -> dict | None:
    return JOBS.get(job_id)


def all_jobs(limit: int = 25) -> list[dict]:
    return sorted(JOBS.values(), key=lambda j: j["created"], reverse=True)[:limit]