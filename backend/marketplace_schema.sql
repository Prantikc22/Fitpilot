-- ==============================================
-- MARKETPLACE & BOOKING TABLES
-- ==============================================

-- Dietitian consultation bookings
create table if not exists public.dietitian_consults (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  preferred_time text,
  topic text not null,
  notes text,
  status text default 'pending', -- 'pending', 'confirmed', 'completed', 'cancelled'
  confirmed_time text, -- Admin sets this
  call_phone text, -- Admin sets this for the call
  admin_notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists dietitian_consults_user_idx on public.dietitian_consults (user_id, created_at desc);
create index if not exists dietitian_consults_status_idx on public.dietitian_consults (status);

alter table public.dietitian_consults enable row level security;

-- Users can see their own consults
drop policy if exists "dietitian_consults self" on public.dietitian_consults;
create policy "dietitian_consults self" on public.dietitian_consults 
  for select to authenticated 
  using (user_id = auth.uid());

-- Users can insert their own
drop policy if exists "dietitian_consults insert" on public.dietitian_consults;
create policy "dietitian_consults insert" on public.dietitian_consults 
  for insert to authenticated 
  with check (user_id = auth.uid());

-- Admins can see all consults
drop policy if exists "dietitian_consults admin read" on public.dietitian_consults;
create policy "dietitian_consults admin read" on public.dietitian_consults 
  for select to authenticated 
  using (
    exists (
      select 1 from public.profiles 
      where profiles.id = auth.uid() 
      and profiles.role = 'admin'
    )
  );

-- Admins can update any consult
drop policy if exists "dietitian_consults admin update" on public.dietitian_consults;
create policy "dietitian_consults admin update" on public.dietitian_consults 
  for update to authenticated 
  using (
    exists (
      select 1 from public.profiles 
      where profiles.id = auth.uid() 
      and profiles.role = 'admin'
    )
  );

-- ==============================================
-- Blood Test Orders
-- ==============================================

create table if not exists public.blood_test_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  package_id text not null,
  package_name text not null,
  package_price int not null,
  tests text[],
  city text not null, -- 'kolkata', 'bangalore', 'gurgaon'
  address text not null,
  time_slot text not null,
  status text default 'pending', -- 'pending', 'confirmed', 'sample_collected', 'processing', 'report_ready', 'completed', 'cancelled'
  phlebotomist_phone text,
  report_url text,
  admin_notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists blood_test_orders_user_idx on public.blood_test_orders (user_id, created_at desc);
create index if not exists blood_test_orders_status_idx on public.blood_test_orders (status);

alter table public.blood_test_orders enable row level security;

-- Users can see their own orders
drop policy if exists "blood_test_orders self" on public.blood_test_orders;
create policy "blood_test_orders self" on public.blood_test_orders 
  for select to authenticated 
  using (user_id = auth.uid());

-- Users can insert their own
drop policy if exists "blood_test_orders insert" on public.blood_test_orders;
create policy "blood_test_orders insert" on public.blood_test_orders 
  for insert to authenticated 
  with check (user_id = auth.uid());

-- Admins can see all orders
drop policy if exists "blood_test_orders admin read" on public.blood_test_orders;
create policy "blood_test_orders admin read" on public.blood_test_orders 
  for select to authenticated 
  using (
    exists (
      select 1 from public.profiles 
      where profiles.id = auth.uid() 
      and profiles.role = 'admin'
    )
  );

-- Admins can update any order
drop policy if exists "blood_test_orders admin update" on public.blood_test_orders;
create policy "blood_test_orders admin update" on public.blood_test_orders 
  for update to authenticated 
  using (
    exists (
      select 1 from public.profiles 
      where profiles.id = auth.uid() 
      and profiles.role = 'admin'
    )
  );
