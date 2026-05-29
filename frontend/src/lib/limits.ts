import { supabase } from "./supabase";

export const LIMITS = {
  free_scans: 5,
  free_ai_gens: 1,        // 1 new meal plan per month for free users
  free_ai_regens: 3,      // max 3 regenerations total for free users
  pro_scans: 999,
  pro_ai_gens: 999,       // Unlimited for Pro users
  pro_ai_regens: 999,
};

type Counters = {
  food_scans_used: number;
  food_scans_period_start?: string | null;
  ai_generations_used: number;
  ai_generations_period_start?: string | null;
  subscription_tier?: string | null;
};

function startOfMonth() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function shouldReset(periodStart?: string | null) {
  if (!periodStart) return true;
  const d = new Date(periodStart);
  const now = new Date();
  return d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear();
}

export type UsageType = "scan" | "ai";

export type LimitResult = {
  allowed: boolean;
  isPro: boolean;
  used: number;
  limit: number;
};

/** Check & atomically increment usage counter. Returns whether the action is allowed. */
export async function checkAndIncrement(userId: string, type: UsageType): Promise<LimitResult> {
  const { data } = await supabase
    .from("profiles")
    .select(
      "food_scans_used,food_scans_period_start,ai_generations_used,ai_generations_period_start,subscription_tier",
    )
    .eq("id", userId)
    .maybeSingle();
  const c = (data || {}) as Counters;
  const isPro = (c.subscription_tier || "free") !== "free";
  const limit = isPro
    ? type === "scan"
      ? LIMITS.pro_scans
      : LIMITS.pro_ai_gens
    : type === "scan"
    ? LIMITS.free_scans
    : LIMITS.free_ai_gens;

  const periodKey = type === "scan" ? "food_scans_period_start" : "ai_generations_period_start";
  const usedKey = type === "scan" ? "food_scans_used" : "ai_generations_used";
  const periodStart = (c as any)[periodKey] as string | undefined;
  let used = ((c as any)[usedKey] as number) || 0;

  if (shouldReset(periodStart)) {
    used = 0;
    await supabase
      .from("profiles")
      .update({ [usedKey]: 0, [periodKey]: startOfMonth() })
      .eq("id", userId);
  }

  if (used >= limit) {
    return { allowed: false, isPro, used, limit };
  }

  await supabase
    .from("profiles")
    .update({ [usedKey]: used + 1 })
    .eq("id", userId);

  return { allowed: true, isPro, used: used + 1, limit };
}

/** Display string for the UI. Pro shows "Unlimited" per spec. */
export function usageDisplay(result: LimitResult): string {
  if (result.isPro) return "Unlimited";
  return `${result.used} / ${result.limit} this month`;
}
