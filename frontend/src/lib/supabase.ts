import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// SSR-safe storage adapter. During expo-router static prerender there's no
// window/localStorage; we return a no-op so supabase doesn't crash.
const isBrowser = typeof window !== "undefined";
const ssrSafeStorage = {
  getItem: async (key: string) => (isBrowser ? AsyncStorage.getItem(key) : null),
  setItem: async (key: string, value: string) => {
    if (isBrowser) await AsyncStorage.setItem(key, value);
  },
  removeItem: async (key: string) => {
    if (isBrowser) await AsyncStorage.removeItem(key);
  },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: ssrSafeStorage as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export type Profile = {
  id: string;
  email?: string | null;
  name?: string | null;
  age?: number | null;
  gender?: string | null;
  height_cm?: number | null;
  current_weight_kg?: number | null;
  goal_weight_kg?: number | null;
  goal_deadline?: string | null;
  activity_level?: string | null;
  diet_pref?: string | null;
  allergies?: string[] | null;
  conditions?: string[] | null;
  country?: string | null;
  cuisine?: string | null;
  budget_monthly?: number | null;
  aggressiveness?: string | null;
  daily_calorie_target?: number | null;
  daily_protein_target?: number | null;
  onboarded?: boolean | null;
  role?: string | null;
  food_scans_used?: number | null;
  subscription_tier?: string | null;
};
