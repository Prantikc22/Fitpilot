-- Leanly database schema
-- Run on Supabase Postgres

-- Profiles table (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  age int,
  gender text,
  height_cm numeric,
  current_weight_kg numeric,
  goal_weight_kg numeric,
  goal_deadline date,
  activity_level text,
  diet_pref text,
  allergies text[],
  conditions text[],
  country text,
  cuisine text,
  budget_monthly numeric,
  aggressiveness text,
  daily_calorie_target int,
  daily_protein_target int,
  onboarded boolean default false,
  role text default 'user',
  food_scans_used int default 0,
  food_scans_period_start timestamptz default now(),
  subscription_tier text default 'free',
  created_at timestamptz default now()
);

create table if not exists public.food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  meal_type text not null,
  items jsonb,
  calories numeric,
  protein numeric,
  carbs numeric,
  fat numeric,
  image_base64 text,
  source text default 'manual',
  logged_at timestamptz default now()
);
create index if not exists food_logs_user_logged_idx on public.food_logs (user_id, logged_at desc);

create table if not exists public.weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  weight_kg numeric not null,
  logged_at timestamptz default now()
);
create index if not exists weight_logs_user_idx on public.weight_logs (user_id, logged_at desc);

create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  water_ml int default 0,
  steps int default 0,
  sleep_hours numeric default 0,
  exercise_done boolean default false,
  created_at timestamptz default now(),
  unique(user_id, date)
);

create table if not exists public.meal_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  plan jsonb,
  total_calories int,
  total_protein int,
  generated_at timestamptz default now(),
  unique(user_id, date)
);

create table if not exists public.coach_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null,
  content text not null,
  created_at timestamptz default now()
);
create index if not exists coach_msg_user_idx on public.coach_messages (user_id, created_at desc);

create table if not exists public.weekly_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  content jsonb,
  created_at timestamptz default now(),
  unique(user_id, week_start)
);

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.food_logs enable row level security;
alter table public.weight_logs enable row level security;
alter table public.habits enable row level security;
alter table public.meal_plans enable row level security;
alter table public.coach_messages enable row level security;
alter table public.weekly_reports enable row level security;

-- Policies
drop policy if exists "profiles self" on public.profiles;
create policy "profiles self" on public.profiles for all to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "food_logs self" on public.food_logs;
create policy "food_logs self" on public.food_logs for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "weight_logs self" on public.weight_logs;
create policy "weight_logs self" on public.weight_logs for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "habits self" on public.habits;
create policy "habits self" on public.habits for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "meal_plans self" on public.meal_plans;
create policy "meal_plans self" on public.meal_plans for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "coach_messages self" on public.coach_messages;
create policy "coach_messages self" on public.coach_messages for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "weekly_reports self" on public.weekly_reports;
create policy "weekly_reports self" on public.weekly_reports for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- =======================================
-- GAMIFICATION & RETENTION TABLES
-- =======================================

-- User streaks tracking
create table if not exists public.user_streaks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  streak_type text not null, -- 'daily', 'yoga', 'meal_logging', 'water'
  current_streak int default 0,
  longest_streak int default 0,
  last_activity_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, streak_type)
);

alter table public.user_streaks enable row level security;
drop policy if exists "user_streaks self" on public.user_streaks;
create policy "user_streaks self" on public.user_streaks for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Achievement badges
create table if not exists public.user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_id text not null, -- e.g., 'first_scan', 'streak_7', 'protein_pro'
  earned_at timestamptz default now(),
  unique(user_id, badge_id)
);

alter table public.user_badges enable row level security;
drop policy if exists "user_badges self" on public.user_badges;
create policy "user_badges self" on public.user_badges for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Daily check-ins for AI Coach accountability
create table if not exists public.daily_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  type text, -- 'morning', 'evening', 'anytime'
  notes text,
  mood int, -- 1-5 scale
  created_at timestamptz default now(),
  unique(user_id, date)
);

alter table public.daily_checkins enable row level security;
drop policy if exists "daily_checkins self" on public.daily_checkins;
create policy "daily_checkins self" on public.daily_checkins for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Yoga completions tracking
create table if not exists public.yoga_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sequence_id text not null,
  completed_date date not null,
  duration_minutes int,
  calories_burned int,
  created_at timestamptz default now()
);
create index if not exists yoga_completions_user_idx on public.yoga_completions (user_id, completed_date desc);

alter table public.yoga_completions enable row level security;
drop policy if exists "yoga_completions self" on public.yoga_completions;
create policy "yoga_completions self" on public.yoga_completions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- =======================================
-- PCOS/PCOD & CYCLE TRACKING TABLES
-- =======================================

-- Cycle/Period logs for PCOS tracking
create table if not exists public.cycle_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  flow text, -- 'none', 'spotting', 'light', 'medium', 'heavy'
  symptoms text[], -- array of symptom IDs
  notes text,
  created_at timestamptz default now(),
  unique(user_id, date)
);
create index if not exists cycle_logs_user_idx on public.cycle_logs (user_id, date desc);

alter table public.cycle_logs enable row level security;
drop policy if exists "cycle_logs self" on public.cycle_logs;
create policy "cycle_logs self" on public.cycle_logs for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Health programs enrollment
create table if not exists public.program_enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  program_type text not null, -- 'pcos', 'weight_loss', 'muscle_gain', etc.
  start_date date default current_date,
  target_date date,
  status text default 'active', -- 'active', 'paused', 'completed'
  settings jsonb,
  created_at timestamptz default now(),
  unique(user_id, program_type)
);

alter table public.program_enrollments enable row level security;
drop policy if exists "program_enrollments self" on public.program_enrollments;
create policy "program_enrollments self" on public.program_enrollments for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
