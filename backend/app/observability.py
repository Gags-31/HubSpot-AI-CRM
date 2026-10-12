"""Lightweight observability: latency tracking and Prometheus-style metrics."""
import threading
import time

from app import repository as repo

LATENCY: dict[str, list[float]] = {}
_LOCK = threading.Lock()
START = time.time()


def observe(path: str, seconds: float) -> None:
    with _LOCK:
        LATENCY.setdefault(path, []).append(seconds)
        if len(LATENCY[path]) > 200:
            LATENCY[path] = LATENCY[path][-200:]
    repo.bump("http_requests_total")
    repo.bump("http_latency_seconds_total", seconds)


def snapshot() -> dict:
    out = {}
    for path, values in LATENCY.items():
        values = sorted(values)
        out[path] = {
            "count": len(values),
            "avg_ms": round(sum(values) / len(values) * 1000, 2),
            "p95_ms": round(values[int(len(values) * 0.95) - 1 if len(values) > 1 else 0] * 1000, 2),
            "max_ms": round(values[-1] * 1000, 2),
        }
    return out


def prometheus() -> str:
    lines = ["# HELP hubspot_uptime_seconds Process uptime", "# TYPE hubspot_uptime_seconds gauge",
             f"hubspot_uptime_seconds {round(time.time() - START, 1)}"]
    for name, value in repo.metrics_snapshot().items():
        metric = "hubspot_" + "".join(ch if ch.isalnum() else "_" for ch in name)
        lines.append(f"# TYPE {metric} counter")
        lines.append(f"{metric} {value}")
    return "\n".join(lines) + "\n"