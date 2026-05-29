"""Leanly backend — thin AI proxy for OpenAI Vision + OpenRouter coaching."""
from __future__ import annotations

import base64
import json
import logging
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

import httpx
from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI, HTTPException
from pydantic import BaseModel, Field
from starlette.middleware.cors import CORSMiddleware

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "")

OPENROUTER_MODELS = [
    "google/gemma-4-26b-a4b-it:free",
    "openai/gpt-oss-120b:free",
    "z-ai/glm-4.5-air:free",
    "deepseek/deepseek-v4-flash:free",
    "google/gemma-4-31b-it:free",
    "meta-llama/llama-3.3-70b-instruct:free",
]

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("leanly")

app = FastAPI(title="Leanly API")
api = APIRouter(prefix="/api")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- helpers ----------
def _extract_json(text: str) -> Any:
    """Best-effort parse of JSON embedded in an LLM response."""
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}|\[.*\]", text, re.DOTALL)
        if match:
            return json.loads(match.group(0))
        raise


async def call_openrouter(messages: list[dict], json_mode: bool = False, max_tokens: int = 700) -> str:
    """Call OpenRouter with model fallbacks."""
    if not OPENROUTER_API_KEY:
        raise HTTPException(500, "OpenRouter not configured")
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://leanly.app",
        "X-Title": "Leanly",
    }
    last_err: Optional[str] = None
    async with httpx.AsyncClient(timeout=60) as client:
        for model in OPENROUTER_MODELS:
            payload: dict[str, Any] = {
                "model": model,
                "messages": messages,
                "max_tokens": max_tokens,
                "temperature": 0.6,
            }
            if json_mode:
                payload["response_format"] = {"type": "json_object"}
            try:
                r = await client.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers=headers,
                    json=payload,
                )
                if r.status_code >= 400:
                    last_err = f"{model}: {r.status_code} {r.text[:120]}"
                    logger.warning("OpenRouter %s -> %s, falling back", model, r.status_code)
                    continue
                data = r.json()
                if data.get("error"):
                    last_err = f"{model}: {data['error']}"
                    logger.warning("OpenRouter %s err: %s", model, data["error"])
                    continue
                content = (data.get("choices") or [{}])[0].get("message", {}).get("content")
                if content and content.strip():
                    return content
                last_err = f"{model}: empty"
            except httpx.HTTPError as exc:
                last_err = f"{model}: {exc}"
                logger.warning("OpenRouter %s error: %s", model, exc)
                continue
    raise HTTPException(502, f"All AI models failed: {last_err}")


async def call_openai_vision(image_b64: str, prompt: str) -> str:
    if not OPENAI_API_KEY:
        raise HTTPException(500, "OpenAI not configured")
    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": "gpt-4o-mini",
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/jpeg;base64,{image_b64}", "detail": "low"},
                    },
                ],
            }
        ],
        "max_tokens": 700,
        "temperature": 0.2,
    }
    async with httpx.AsyncClient(timeout=90) as client:
        r = await client.post("https://api.openai.com/v1/chat/completions", headers=headers, json=payload)
        if r.status_code >= 400:
            logger.error("OpenAI vision error %s: %s", r.status_code, r.text[:300])
            raise HTTPException(502, "OpenAI vision call failed")
        data = r.json()
        return data["choices"][0]["message"]["content"]


# ---------- models ----------
class FoodAnalyzeReq(BaseModel):
    image_base64: str
    note: Optional[str] = None


class FoodItem(BaseModel):
    name: str
    quantity: Optional[str] = None
    calories: float
    protein: float
    carbs: float
    fat: float


class FoodAnalyzeRes(BaseModel):
    items: list[FoodItem]
    total_calories: float
    total_protein: float
    total_carbs: float
    total_fat: float
    confidence: float = 0.7
    summary: str = ""


class ProfileCtx(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    height_cm: Optional[float] = None
    current_weight_kg: Optional[float] = None
    goal_weight_kg: Optional[float] = None
    activity_level: Optional[str] = None
    diet_pref: Optional[str] = None
    allergies: Optional[list[str]] = None
    cuisine: Optional[str] = None
    budget_monthly: Optional[float] = None
    aggressiveness: Optional[str] = None
    daily_calorie_target: Optional[int] = None
    daily_protein_target: Optional[int] = None


class CoachReq(BaseModel):
    profile: ProfileCtx
    today_calories: float = 0
    today_protein: float = 0
    yesterday_calories: Optional[float] = None
    history: list[dict] = Field(default_factory=list)
    user_message: Optional[str] = None


class MealPlanReq(BaseModel):
    profile: ProfileCtx
    yesterday_calories: Optional[float] = None


class WeeklyReportReq(BaseModel):
    profile: ProfileCtx
    weight_lost_kg: float
    avg_calories: float
    avg_protein: float
    health_scores: list[int] = Field(default_factory=list)


class TargetsReq(BaseModel):
    age: int
    gender: str
    height_cm: float
    current_weight_kg: float
    goal_weight_kg: float
    activity_level: str
    aggressiveness: str = "balanced"


# ---------- routes ----------
@api.get("/")
async def root():
    return {"service": "leanly", "ok": True, "ts": datetime.now(timezone.utc).isoformat()}


@api.post("/targets/compute")
async def compute_targets(req: TargetsReq):
    """Mifflin-St Jeor BMR -> TDEE -> safe deficit. No LLM needed."""
    s = 5 if req.gender.lower().startswith("m") else -161
    bmr = 10 * req.current_weight_kg + 6.25 * req.height_cm - 5 * req.age + s
    factor = {
        "sedentary": 1.2,
        "light": 1.375,
        "moderate": 1.55,
        "active": 1.725,
        "very_active": 1.9,
    }.get(req.activity_level.lower(), 1.4)
    tdee = bmr * factor
    deficit_map = {"balanced": 400, "fast": 600, "aggressive": 800}
    deficit = deficit_map.get(req.aggressiveness.lower(), 400)
    target_cal = max(1200 if req.gender.lower().startswith("f") else 1500, round(tdee - deficit))
    # 1.6 g protein per kg of goal weight, but minimum based on current
    protein_g = round(max(req.goal_weight_kg, req.current_weight_kg * 0.9) * 1.6)
    # Estimate days to goal: 1 kg fat ~ 7700 kcal
    weekly_loss_kg = (deficit * 7) / 7700
    weight_diff = max(0, req.current_weight_kg - req.goal_weight_kg)
    days = int((weight_diff / weekly_loss_kg) * 7) if weekly_loss_kg > 0 else 0
    return {
        "daily_calorie_target": target_cal,
        "daily_protein_target": protein_g,
        "tdee": round(tdee),
        "bmr": round(bmr),
        "weekly_loss_kg": round(weekly_loss_kg, 2),
        "estimated_days_to_goal": days,
    }


@api.post("/food/analyze", response_model=FoodAnalyzeRes)
async def food_analyze(req: FoodAnalyzeReq):
    if not req.image_base64:
        raise HTTPException(400, "image_base64 required")
    prompt = (
        "You are a nutrition expert. Analyze the food in this image. "
        "Identify each distinct food item and estimate realistic portion sizes. "
        "Return ONLY a strict JSON object with this exact shape (no prose, no markdown):\n"
        '{ "items": [ {"name": str, "quantity": "approx serving (e.g. 1 cup, 150g)", '
        '"calories": number, "protein": number, "carbs": number, "fat": number } ], '
        '"summary": "one short sentence about the meal" }\n'
        "All macro values in grams (calories in kcal). Be realistic — typical home portions. "
        + (f"User note: {req.note}" if req.note else "")
    )
    raw = await call_openai_vision(req.image_base64, prompt)
    try:
        data = _extract_json(raw)
    except Exception:
        logger.error("Vision parse fail: %s", raw[:300])
        raise HTTPException(502, "Could not parse AI response")
    items_raw = data.get("items", [])
    items = []
    tc = tp = tcarb = tf = 0.0
    for it in items_raw:
        try:
            fi = FoodItem(
                name=str(it.get("name", "Food")),
                quantity=str(it.get("quantity", "")) or None,
                calories=float(it.get("calories", 0) or 0),
                protein=float(it.get("protein", 0) or 0),
                carbs=float(it.get("carbs", 0) or 0),
                fat=float(it.get("fat", 0) or 0),
            )
            items.append(fi)
            tc += fi.calories
            tp += fi.protein
            tcarb += fi.carbs
            tf += fi.fat
        except Exception:
            continue
    if not items:
        raise HTTPException(422, "No food detected. Try a clearer photo.")
    return FoodAnalyzeRes(
        items=items,
        total_calories=round(tc, 1),
        total_protein=round(tp, 1),
        total_carbs=round(tcarb, 1),
        total_fat=round(tf, 1),
        summary=str(data.get("summary", "")),
    )


@api.post("/coach/message")
async def coach_message(req: CoachReq):
    p = req.profile
    sys = (
        "You are Leanly, a warm, evidence-based weight-loss coach. Never recommend unsafe weight loss. "
        "Be concise (2-3 short paragraphs max), specific, kind, motivating. Use the user's actual numbers."
    )
    ctx = (
        f"User: name={p.name or 'there'}, age={p.age}, gender={p.gender}, "
        f"weight={p.current_weight_kg}kg, goal={p.goal_weight_kg}kg, "
        f"diet={p.diet_pref}, cuisine={p.cuisine}, allergies={p.allergies or []}, "
        f"calorie target={p.daily_calorie_target}, protein target={p.daily_protein_target}g.\n"
        f"Today so far: {req.today_calories:.0f} kcal, {req.today_protein:.0f} g protein. "
        f"Yesterday: {req.yesterday_calories or 'n/a'} kcal."
    )
    msgs = [{"role": "system", "content": sys}, {"role": "system", "content": ctx}]
    for m in req.history[-10:]:
        if m.get("role") in ("user", "assistant") and m.get("content"):
            msgs.append({"role": m["role"], "content": str(m["content"])[:500]})
    if req.user_message:
        msgs.append({"role": "user", "content": req.user_message})
    else:
        msgs.append({"role": "user", "content": "Give me today's coaching note."})
    reply = await call_openrouter(msgs, max_tokens=400)
    return {"reply": reply.strip()}


@api.post("/meal-plan/generate")
async def meal_plan(req: MealPlanReq):
    p = req.profile
    sys = "You generate realistic, budget-aware, cuisine-appropriate daily meal plans. Output strict JSON only."
    user = (
        f"Create today's meal plan for: weight={p.current_weight_kg}kg -> goal {p.goal_weight_kg}kg, "
        f"diet={p.diet_pref or 'omnivore'}, cuisine={p.cuisine or 'mixed'}, "
        f"allergies={p.allergies or []}, monthly budget≈{p.budget_monthly}, "
        f"daily calorie target≈{p.daily_calorie_target}, protein≈{p.daily_protein_target}g."
        + (f" Yesterday they ate {req.yesterday_calories} kcal." if req.yesterday_calories else "")
        + ' Return JSON: {"breakfast":{"name":str,"calories":int,"protein":int,"items":[str]},'
        + '"lunch":{...},"dinner":{...},"snack":{...},"total_calories":int,"total_protein":int,"tip":str}'
    )
    raw = await call_openrouter(
        [{"role": "system", "content": sys}, {"role": "user", "content": user}],
        json_mode=True,
        max_tokens=900,
    )
    try:
        return _extract_json(raw)
    except Exception:
        logger.error("Meal plan parse fail: %s", raw[:300])
        raise HTTPException(502, "Could not parse meal plan")


@api.post("/weekly-report")
async def weekly_report(req: WeeklyReportReq):
    p = req.profile
    sys = "You are a supportive weight-loss coach writing a weekly summary. Output strict JSON."
    user = (
        f"User profile: weight={p.current_weight_kg}kg, goal={p.goal_weight_kg}kg, "
        f"calorie target={p.daily_calorie_target}, protein target={p.daily_protein_target}g. "
        f"This week: weight change={req.weight_lost_kg}kg, avg calories={req.avg_calories:.0f}, "
        f"avg protein={req.avg_protein:.0f}g, health scores={req.health_scores}. "
        'Return JSON: {"highlight":str,"wins":[str],"improvements":[str],"next_week_focus":str}'
    )
    raw = await call_openrouter(
        [{"role": "system", "content": sys}, {"role": "user", "content": user}],
        json_mode=True,
        max_tokens=600,
    )
    try:
        return _extract_json(raw)
    except Exception:
        raise HTTPException(502, "Could not parse weekly report")


@api.post("/health-score/compute")
async def health_score(req: dict):
    """Compute 0-100 health score from today's metrics."""
    cal_target = float(req.get("calorie_target") or 0)
    cal_today = float(req.get("calories_today") or 0)
    pro_target = float(req.get("protein_target") or 0)
    pro_today = float(req.get("protein_today") or 0)
    water_ml = float(req.get("water_ml") or 0)
    steps = float(req.get("steps") or 0)
    exercise = bool(req.get("exercise_done"))
    weight_trend = float(req.get("weight_trend_kg_week") or 0)  # negative = losing

    def adherence(actual: float, target: float) -> float:
        if target <= 0:
            return 0.5
        ratio = actual / target
        if ratio <= 1.0:
            return ratio
        # over-eating penalty
        return max(0.0, 2.0 - ratio)

    cal_score = adherence(cal_today, cal_target) * 30
    pro_score = min(1.0, pro_today / pro_target if pro_target else 0) * 25
    water_score = min(1.0, water_ml / 2500) * 15
    steps_score = min(1.0, steps / 8000) * 15
    ex_score = 10 if exercise else 0
    weight_score = 5 if weight_trend < 0 else (2 if weight_trend == 0 else 0)
    total = cal_score + pro_score + water_score + steps_score + ex_score + weight_score
    return {
        "score": round(total),
        "breakdown": {
            "calorie_adherence": round(cal_score, 1),
            "protein_adherence": round(pro_score, 1),
            "water": round(water_score, 1),
            "steps": round(steps_score, 1),
            "exercise": ex_score,
            "weight_progress": weight_score,
        },
    }


app.include_router(api)


@app.on_event("startup")
async def _startup() -> None:
    logger.info("Leanly API ready. OpenAI=%s, OpenRouter=%s", bool(OPENAI_API_KEY), bool(OPENROUTER_API_KEY))
