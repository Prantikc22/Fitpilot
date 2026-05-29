"""AI proxy endpoints: coach, meal plan, weekly report, food vision."""
import base64
import pytest
import requests

PROFILE = {
    "name": "Alex", "age": 30, "gender": "Male", "height_cm": 175,
    "current_weight_kg": 85, "goal_weight_kg": 75,
    "activity_level": "moderate", "diet_pref": "omnivore",
    "cuisine": "Indian", "budget_monthly": 8000, "aggressiveness": "balanced",
    "daily_calorie_target": 2000, "daily_protein_target": 130, "allergies": [],
}


def test_coach_message(api_client, base_url):
    body = {"profile": PROFILE, "today_calories": 1200, "today_protein": 40,
            "user_message": "How am I doing today?"}
    r = api_client.post(f"{base_url}/api/coach/message", json=body, timeout=120)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "reply" in data
    assert isinstance(data["reply"], str) and len(data["reply"].strip()) > 10


def test_meal_plan_generate(api_client, base_url):
    body = {"profile": PROFILE, "yesterday_calories": 1900}
    r = api_client.post(f"{base_url}/api/meal-plan/generate", json=body, timeout=120)
    assert r.status_code == 200, r.text
    data = r.json()
    for meal in ("breakfast", "lunch", "dinner", "snack"):
        assert meal in data, f"missing {meal}: {data}"
        m = data[meal]
        assert isinstance(m, dict)
        assert "name" in m and isinstance(m["name"], str) and m["name"]
        # calories/protein may come as int or numeric string
        assert "calories" in m
        assert "protein" in m
        cal = float(m["calories"])
        prot = float(m["protein"])
        assert cal > 0, f"{meal} calories <=0"
        assert prot >= 0


def test_weekly_report(api_client, base_url):
    body = {"profile": PROFILE, "weight_lost_kg": 0.6,
            "avg_calories": 1850, "avg_protein": 120,
            "health_scores": [72, 80, 65, 78, 82, 70, 76]}
    r = api_client.post(f"{base_url}/api/weekly-report", json=body, timeout=120)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "highlight" in data and isinstance(data["highlight"], str)
    assert "wins" in data and isinstance(data["wins"], list)
    assert "improvements" in data and isinstance(data["improvements"], list)
    assert "next_week_focus" in data and isinstance(data["next_week_focus"], str)


@pytest.fixture(scope="module")
def food_image_b64() -> str:
    """Download a small public food image and base64-encode it."""
    urls = [
        "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400",  # bowl
        "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Good_Food_Display_-_NCI_Visuals_Online.jpg/320px-Good_Food_Display_-_NCI_Visuals_Online.jpg",
    ]
    last_err = None
    for u in urls:
        try:
            resp = requests.get(u, timeout=30)
            if resp.status_code == 200 and resp.content:
                return base64.b64encode(resp.content).decode()
        except Exception as e:
            last_err = e
    pytest.skip(f"Could not fetch food image: {last_err}")


def test_food_analyze(api_client, base_url, food_image_b64):
    r = api_client.post(
        f"{base_url}/api/food/analyze",
        json={"image_base64": food_image_b64, "note": "lunch plate"},
        timeout=120,
    )
    assert r.status_code == 200, r.text[:500]
    data = r.json()
    assert isinstance(data.get("items"), list) and len(data["items"]) > 0
    for it in data["items"]:
        for k in ("name", "calories", "protein", "carbs", "fat"):
            assert k in it, f"missing {k} in item {it}"
    assert data["total_calories"] > 0
    assert data["total_protein"] >= 0


def test_food_analyze_missing_image(api_client, base_url):
    r = api_client.post(f"{base_url}/api/food/analyze", json={"image_base64": ""}, timeout=15)
    assert r.status_code == 400
