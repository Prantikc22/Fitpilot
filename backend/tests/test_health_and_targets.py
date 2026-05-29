"""Health check + targets compute (no LLM) — must pass first."""
import pytest


def test_health_check(api_client, base_url):
    r = api_client.get(f"{base_url}/api/", timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data.get("ok") is True
    assert data.get("service") == "leanly"
    assert "ts" in data


def test_targets_compute_balanced(api_client, base_url):
    payload = {
        "age": 30,
        "gender": "Male",
        "height_cm": 175,
        "current_weight_kg": 85,
        "goal_weight_kg": 75,
        "activity_level": "moderate",
        "aggressiveness": "balanced",
    }
    r = api_client.post(f"{base_url}/api/targets/compute", json=payload, timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    # Spec: daily_calorie_target>=1500, daily_protein_target>=100, estimated_days_to_goal>0
    assert data["daily_calorie_target"] >= 1500, data
    assert data["daily_protein_target"] >= 100, data
    assert data["estimated_days_to_goal"] > 0, data
    assert data["tdee"] > data["bmr"] > 0
    assert data["weekly_loss_kg"] > 0


def test_targets_compute_aggressive_female(api_client, base_url):
    """Sanity check female + aggressive deficit floor (1200 cal min)."""
    payload = {
        "age": 28, "gender": "Female", "height_cm": 162,
        "current_weight_kg": 70, "goal_weight_kg": 60,
        "activity_level": "light", "aggressiveness": "aggressive",
    }
    r = api_client.post(f"{base_url}/api/targets/compute", json=payload, timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["daily_calorie_target"] >= 1200
    assert data["daily_protein_target"] > 0
