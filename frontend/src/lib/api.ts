const BASE = process.env.EXPO_PUBLIC_BACKEND_URL!;

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`API ${path} ${res.status}: ${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : ({} as T);
}

export type FoodItem = {
  name: string;
  quantity?: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};
export type FoodAnalyzeRes = {
  items: FoodItem[];
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  confidence?: number;
  summary?: string;
};

export const api = {
  computeTargets: (p: {
    age: number;
    gender: string;
    height_cm: number;
    current_weight_kg: number;
    goal_weight_kg: number;
    activity_level: string;
    aggressiveness: string;
  }) =>
    post<{
      daily_calorie_target: number;
      daily_protein_target: number;
      tdee: number;
      bmr: number;
      weekly_loss_kg: number;
      estimated_days_to_goal: number;
    }>("/targets/compute", p),

  analyzeFood: (image_base64: string, note?: string) =>
    post<FoodAnalyzeRes>("/food/analyze", { image_base64, note }),

  coachMessage: (p: {
    profile: any;
    today_calories: number;
    today_protein: number;
    yesterday_calories?: number | null;
    history?: { role: string; content: string }[];
    user_message?: string;
  }) => post<{ reply: string }>("/coach/message", p),

  mealPlan: (p: { profile: any; yesterday_calories?: number | null }) =>
    post<{
      breakfast: { name: string; calories: number; protein: number; items: string[] };
      lunch: { name: string; calories: number; protein: number; items: string[] };
      dinner: { name: string; calories: number; protein: number; items: string[] };
      snack: { name: string; calories: number; protein: number; items: string[] };
      total_calories: number;
      total_protein: number;
      tip?: string;
    }>("/meal-plan/generate", p),

  weeklyReport: (p: {
    profile: any;
    weight_lost_kg: number;
    avg_calories: number;
    avg_protein: number;
    health_scores: number[];
  }) =>
    post<{
      highlight: string;
      wins: string[];
      improvements: string[];
      next_week_focus: string;
    }>("/weekly-report", p),

  healthScore: (p: {
    calorie_target: number;
    calories_today: number;
    protein_target: number;
    protein_today: number;
    water_ml: number;
    steps: number;
    exercise_done: boolean;
    weight_trend_kg_week: number;
  }) =>
    post<{ score: number; breakdown: Record<string, number> }>(
      "/health-score/compute",
      p,
    ),
};
