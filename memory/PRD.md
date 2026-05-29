# Leanly — PRD

**Leanly** is an AI-powered weight-loss coach for iOS + Android (Expo React Native).

## Stack
- Expo SDK 54, expo-router, TypeScript, react-native-svg charts, lucide icons, Manrope + Work Sans fonts
- FastAPI thin AI proxy (`/api/*`) for OpenAI Vision + OpenRouter
- Supabase Postgres + Auth + RLS
- OpenAI `gpt-4o-mini` Vision; OpenRouter free-model chain with fallback (gemma, openai/gpt-oss, glm, deepseek, llama)
- RevenueCat (`react-native-purchases` + `react-native-purchases-ui`) — works in dev/standalone builds, sandbox-unlock fallback in Expo Go

## Schema
`profiles` (with `food_scans_used`, `ai_generations_used`, `subscription_tier`, `role`), `food_logs`, `weight_logs`, `habits`, `meal_plans`, `coach_messages`, `weekly_reports`, `dietitian_consults`, `delivery_orders` — all RLS-scoped to `auth.uid()`.

## Features
- Auth (email/password) + 16-step onboarding with native date picker + 3/6/12-month preset chips, locale-aware date display
- **Dashboard**: tappable Health Score gauge → modal with full breakdown, **BMI card** with status pill + range bar, daily nutritionist note (markdown-rendered), weight trend chart, calorie + protein progress, water + steps
- **Health Score**: weighted from calorie adherence (30), protein (25), water (15), steps (15), exercise (10), weight trend (5)
- **Food Scan**: OpenAI Vision (camera + library); auto-prompts compress to base64
- **Meal Log**: add/delete, manual entry, daily meal-plan card
- **AI Meal Plan**: Pro-gated. Shows **"Your nutritionist is preparing your plan"** 5-step animation while generating (~12s). Rich plan card with meal icons, item pills, prep time, protein chips. **"Ask the nutritionist to improve this plan"** with feedback prompt.
- **AI Coach** chat with markdown rendering, "View today's meal plan" quick link
- **Progress**: weight history, 30/60/90 day forecast, habit tracker, AI weekly report (fixed button contrast)
- **Talk to a Dietitian**: Pro-only consult booking (time slot + topic + notes). Free users see paywall.
- **Connect Health**: Apple Health, Google Fit, Fitbit, Garmin (stub UI ready, native sync in dev build)
- **Food Delivery**: manual Swiggy/Zomato/Blinkit/Zepto/Instamart/UberEats/DoorDash entry → auto-creates food log
- **Paywall** Free / Premium / Pro with RevenueCat + sandbox fallback
- **Admin Dashboard**: total/onboarded/paid users, scans, coach msgs, meal plans, estimated MRR (role-gated)

## Usage limits (monthly)
- Free: 5 AI scans, 5 AI generations (coach replies, meal plans)
- Pro: 50 each, displayed as **"Unlimited"**

## AI fallback responses
Every AI endpoint (coach, meal plan, weekly report) has a sensible default response if OpenRouter fails, so the app never breaks.
