"""Health score endpoint — pure math, no LLM."""


def test_health_score_basic(api_client, base_url):
    payload = {
        "calorie_target": 2000, "calories_today": 1800,
        "protein_target": 130, "protein_today": 120,
        "water_ml": 2000, "steps": 7500,
        "exercise_done": True, "weight_trend_kg_week": -0.5,
    }
    r = api_client.post(f"{base_url}/api/health-score/compute", json=payload, timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    assert 0 <= data["score"] <= 100
    bd = data["breakdown"]
    for key in ("calorie_adherence", "protein_adherence", "water", "steps", "exercise", "weight_progress"):
        assert key in bd
    assert bd["exercise"] == 10
    assert bd["weight_progress"] == 5


def test_health_score_empty(api_client, base_url):
    r = api_client.post(f"{base_url}/api/health-score/compute", json={}, timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    # When all targets are 0, calorie adherence defaults to 0.5 (~15) and
    # weight_trend == 0 awards 2 → score ≈ 17. Just bound it.
    assert 0 <= data["score"] <= 30


def test_health_score_overeating_penalty(api_client, base_url):
    payload = {
        "calorie_target": 1800, "calories_today": 3600,  # ratio=2.0 -> 0
        "protein_target": 100, "protein_today": 50,
        "water_ml": 0, "steps": 0,
        "exercise_done": False, "weight_trend_kg_week": 0.5,
    }
    r = api_client.post(f"{base_url}/api/health-score/compute", json=payload, timeout=15)
    assert r.status_code == 200
    bd = r.json()["breakdown"]
    assert bd["calorie_adherence"] == 0
    assert bd["weight_progress"] == 0
