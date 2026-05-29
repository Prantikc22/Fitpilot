# Leanly — PRD

**Leanly** is an AI-powered weight-loss coach for iOS + Android (single Expo React Native codebase). It helps users lose weight safely and consistently through personalized meal planning, AI food scans, progress tracking, and AI coaching.

## Stack
- **Frontend**: Expo SDK 54, expo-router, TypeScript, react-native-svg charts, lucide-react-native icons, Manrope + Work Sans fonts.
- **Backend**: FastAPI thin AI proxy (`/api/*`) for OpenAI Vision + OpenRouter.
- **Database & Auth**: Supabase Postgres + Supabase Auth (email/password) with strict RLS per user.
- **AI**: OpenAI `gpt-4o-mini` Vision (food analysis), OpenRouter free models (`google/gemma-4-26b-a4b-it:free`, `openai/gpt-oss-120b:free`, `z-ai/glm-4.5-air:free`, `deepseek/deepseek-v4-flash:free`, etc.) with automatic fallback for coaching, meal plans, weekly reports.
- **Subscriptions**: RevenueCat (`react-native-purchases` + `react-native-purchases-ui`) — works only in dev/standalone builds; preview shows tiered paywall UI with a sandbox unlock.

## Schema (Supabase Postgres)
- `profiles`, `food_logs`, `weight_logs`, `habits`, `meal_plans`, `coach_messages`, `weekly_reports` — all RLS-scoped to `auth.uid()`. Auto-create profile trigger on `auth.users` insert.

## Implemented MVP
- Auth: email/password sign up / sign in
- Onboarding: 16-step flow (name, age, gender, height, weight, goal, deadline, activity, diet, allergies, conditions, country, cuisine, budget, aggressiveness, summary)
- Personalized targets: Mifflin-St Jeor → TDEE → safe deficit (capped, gender-aware)
- Dashboard: greeting, **Health Score** circular gauge, daily AI coach summary, current weight, weight remaining, calorie + protein progress, weight trend chart with goal line, water + steps cards
- Food Scan: camera or library → OpenAI Vision → items + macros → log
- Meal Log: breakfast/lunch/dinner/snack with add/delete + manual entry
- Daily AI Meal Plan card
- AI Coach chat (chat history persisted)
- Progress: weight history, 30/60/90 day prediction, habit tracker (water, steps, sleep, exercise), AI weekly report
- Profile: plan summary, subscription management, restart onboarding, sign out, admin link if `role='admin'`
- Paywall (Free/Premium/Pro) integrated with RevenueCat SDK (sandbox-fallback in Expo Go)
- Admin Dashboard: total users, onboarded, paid users, scans/month, coach msgs, meal plans, estimated MRR
- Gmail integration deferred (per user choice)
