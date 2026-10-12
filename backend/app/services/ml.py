"""ML layer: churn + purchase-probability models with a heuristic fallback.

Uses scikit-learn when installed (train + persist), otherwise falls back to a
transparent scoring function so the system never breaks.
"""
import json
import os

from app.services import crm

MODEL_PATH = os.getenv("HUBSPOT_MODEL", os.path.join(os.path.dirname(__file__), "..", "..", "models.json"))
FEATURES = ["conversations", "orders", "spend", "negative", "high_priority"]


def _xy():
    rows = crm.feature_rows()
    X = [[float(r.get(f, 0)) for f in FEATURES] for r in rows]
    y = [int(r["purchase"]) for r in rows]
    return rows, X, y


def _heuristic(feature_row: dict) -> dict:
    conv = feature_row.get("conversations", 0)
    orders = feature_row.get("orders", 0)
    spend = feature_row.get("spend", 0)
    negative = feature_row.get("negative", 0)
    high = feature_row.get("high_priority", 0)
    purchase = min(0.98, 0.25 + 0.04 * conv + 0.25 * orders + min(0.2, spend / 500000) - 0.2 * negative + 0.05 * high)
    churn = max(0.02, 0.6 - 0.03 * conv - 0.25 * orders + 0.25 * negative)
    return {
        "engine": "heuristic",
        "purchase_probability": round(purchase, 3),
        "churn_risk": round(churn, 3),
        "clv_estimate": round(spend * (1 + 0.15 * conv), 2),
        "engagement": "High" if conv >= 8 else "Medium" if conv >= 3 else "Low",
    }


def predict(features: dict) -> dict:
    model = load()
    row = {f: features.get(f, 0) for f in FEATURES}
    if not model:
        return _heuristic(row)
    try:
        from sklearn.linear_model import LogisticRegression  # type: ignore
        import numpy as np  # type: ignore

        clf = LogisticRegression()
        clf.coef_ = np.array(model["coef"])
        clf.intercept_ = np.array(model["intercept"])
        clf.classes_ = np.array(model["classes"])
        X = np.array([[float(row[f]) for f in FEATURES]])
        prob = float(clf.predict_proba(X)[0][1])
        return {
            "engine": "logistic_regression",
            "purchase_probability": round(prob, 3),
            "churn_risk": round(max(0.02, 1 - prob), 3),
            "clv_estimate": round(row["spend"] * (1 + 0.15 * row["conversations"]), 2),
            "engagement": "High" if row["conversations"] >= 8 else "Medium" if row["conversations"] >= 3 else "Low",
        }
    except Exception:
        return _heuristic(row)


def train() -> dict:
    rows, X, y = _xy()
    if len(rows) < 4:
        return {"trained": False, "reason": "not enough labelled data", "rows": len(rows)}
    if len(set(y)) < 2:
        return {"trained": False, "reason": "single class in training data", "rows": len(rows)}
    try:
        from collections import Counter

        from sklearn.linear_model import LogisticRegression  # type: ignore
        import numpy as np  # type: ignore
        from sklearn.model_selection import cross_val_score  # type: ignore

        counts = Counter(y)
        smallest = min(counts.values()) if counts else 0
        clf = LogisticRegression(max_iter=1000, class_weight="balanced")
        cv_scores: list[float] = []
        if smallest >= 2 and len(rows) >= 4:
            cv_scores = [round(float(s), 3) for s in cross_val_score(clf, np.array(X), np.array(y), cv=min(5, smallest))]
        clf.fit(np.array(X), np.array(y))
        payload = {
            "coef": clf.coef_.tolist(),
            "intercept": clf.intercept_.tolist(),
            "classes": clf.classes_.tolist(),
            "cv_accuracy": cv_scores,
            "mean_cv_accuracy": round(sum(cv_scores) / len(cv_scores), 3) if cv_scores else None,
            "features": FEATURES,
            "class_balance": dict(counts),
        }
        with open(MODEL_PATH, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2)
        return {"trained": True, "engine": "logistic_regression", "rows": len(rows), **payload}
    except ImportError:
        return {"trained": False, "reason": "scikit-learn not installed", "rows": len(rows)}
    except Exception as exc:  # noqa: BLE001 - never break startup
        return {"trained": False, "reason": str(exc)[:200], "rows": len(rows)}


def load() -> dict | None:
    if os.path.exists(MODEL_PATH):
        try:
            with open(MODEL_PATH, encoding="utf-8") as f:
                return json.load(f)
        except (OSError, json.JSONDecodeError):
            return None
    return None


def model_info() -> dict:
    model = load()
    return {"loaded": bool(model), "features": FEATURES, "path": MODEL_PATH,
            "metrics": {k: v for k, v in (model or {}).items() if k in ("mean_cv_accuracy", "cv_accuracy")}}