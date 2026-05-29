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
