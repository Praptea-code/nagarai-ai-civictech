-- =========================================================
-- Nagar AI — Database Schema (Supabase / PostgreSQL)
-- Run this in the Supabase SQL editor (or `supabase db push`)
-- =========================================================

-- ---------- Extensions ----------
create extension if not exists pgcrypto;   -- for gen_random_uuid()
create extension if not exists vector;     -- pgvector, for duplicate-detection embeddings

-- ---------- Enums ----------
create type user_role as enum ('citizen', 'admin');

create type complaint_category as enum (
  'pothole', 'garbage', 'water_leakage', 'streetlight',
  'flooding', 'drainage', 'other'
);

create type complaint_severity as enum ('low', 'medium', 'high', 'critical');

create type complaint_status as enum (
  'submitted', 'under_review', 'assigned', 'in_progress',
  'resolved', 'rejected', 'duplicate'
);

create type risk_level as enum ('low', 'medium', 'high');

-- =========================================================
-- Tables
-- =========================================================

-- One row per authenticated user, extending Supabase's auth.users
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  phone       text,
  role        user_role not null default 'citizen',
  created_at  timestamptz not null default now()
);

create table public.departments (
  id             uuid primary key default gen_random_uuid(),
  name           text not null unique,
  contact_email  text,
  contact_phone  text,
  created_at     timestamptz not null default now()
);

create table public.complaints (
  id                          uuid primary key default gen_random_uuid(),
  citizen_id                  uuid references public.profiles(id) on delete set null,
  department_id               uuid references public.departments(id) on delete set null,
  duplicate_of_complaint_id   uuid references public.complaints(id) on delete set null,

  description   text not null,
  category      complaint_category not null,
  severity      complaint_severity,
  status        complaint_status not null default 'submitted',

  latitude      double precision check (latitude between -90 and 90),
  longitude     double precision check (longitude between -180 and 180),
  ward          text,
  municipality  text,

  ai_summary     text,
  ai_confidence  numeric(4,3) check (ai_confidence between 0 and 1),

  -- 384 dims matches sentence-transformers/all-MiniLM-L6-v2.
  -- Change this to match whichever embedding model you actually use
  -- (e.g. 1536 for OpenAI text-embedding-3-small).
  embedding      vector(384),

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.complaint_images (
  id             uuid primary key default gen_random_uuid(),
  complaint_id   uuid not null references public.complaints(id) on delete cascade,
  image_url      text not null,
  created_at     timestamptz not null default now()
);

-- Audit trail: every status change, who made it, and when.
-- This is what powers "resolution time" analytics on the admin dashboard.
create table public.complaint_status_history (
  id             uuid primary key default gen_random_uuid(),
  complaint_id   uuid not null references public.complaints(id) on delete cascade,
  status         complaint_status not null,
  changed_by     uuid references public.profiles(id) on delete set null,
  note           text,
  created_at     timestamptz not null default now()
);

-- Aggregate risk forecast output, one row per ward per prediction run.
create table public.predictions (
  id                          uuid primary key default gen_random_uuid(),
  ward                        text not null,
  municipality                text,
  prediction_date             date not null,
  risk_level                  risk_level not null,
  predicted_complaint_count   numeric,
  model_version                text,
  created_at                  timestamptz not null default now()
);

-- =========================================================
-- Indexes
-- =========================================================
create index idx_complaints_status      on public.complaints(status);
create index idx_complaints_category    on public.complaints(category);
create index idx_complaints_department  on public.complaints(department_id);
create index idx_complaints_citizen     on public.complaints(citizen_id);
create index idx_complaints_location    on public.complaints(latitude, longitude);
create index idx_complaint_images_cx    on public.complaint_images(complaint_id);
create index idx_status_history_cx      on public.complaint_status_history(complaint_id);
create index idx_predictions_ward_date  on public.predictions(ward, prediction_date);

-- Vector similarity index for duplicate detection (cosine distance).
-- Best created/rebuilt once you have some seed complaints in the table.
create index idx_complaints_embedding on public.complaints
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- =========================================================
-- Functions & triggers
-- =========================================================

-- Keep updated_at current on every complaint edit
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_complaints_updated_at
before update on public.complaints
for each row execute function public.set_updated_at();

-- Auto-create a profile row whenever someone signs up via Supabase Auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data ->> 'full_name', 'citizen');
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Cosine-similarity duplicate search over complaint embeddings (pgvector).
-- Called by the backend via supabase.rpc() — pgvector operators are not exposed
-- through PostgREST filters directly.
-- similarity = 1 - cosine distance (<=>); threshold 0.87 per DECISION_LOG.
create or replace function public.find_duplicate_complaints(
  query_embedding      vector(384),
  similarity_threshold double precision default 0.87
)
returns table (
  id          uuid,
  description text,
  similarity  double precision
)
language sql stable as $$
  select c.id,
         c.description,
         1 - (c.embedding <=> query_embedding) as similarity
  from public.complaints c
  where c.embedding is not null
    and 1 - (c.embedding <=> query_embedding) >= similarity_threshold
  order by similarity desc
  limit 5;
$$;

-- =========================================================
-- Row Level Security
-- =========================================================

alter table public.profiles                enable row level security;
alter table public.departments              enable row level security;
alter table public.complaints               enable row level security;
alter table public.complaint_images         enable row level security;
alter table public.complaint_status_history enable row level security;
alter table public.predictions              enable row level security;

-- security definer helper so admin-role checks don't recurse through RLS
create or replace function public.is_admin()
returns boolean
language sql security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- profiles: own row, or every row if admin
create policy "view own profile or admin views all"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());

create policy "update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- departments: any signed-in user can read; only admins write
create policy "authenticated users read departments"
  on public.departments for select
  using (auth.role() = 'authenticated');

create policy "admins manage departments"
  on public.departments for all
  using (public.is_admin());

-- complaints: citizens see/insert their own; admins see/manage all
create policy "citizens view own complaints, admins view all"
  on public.complaints for select
  using (citizen_id = auth.uid() or public.is_admin());

create policy "citizens insert own complaints"
  on public.complaints for insert
  with check (citizen_id = auth.uid());

create policy "admins update complaints"
  on public.complaints for update
  using (public.is_admin());

-- complaint_images: follow the visibility of the parent complaint
create policy "view images of visible complaints"
  on public.complaint_images for select
  using (
    exists (
      select 1 from public.complaints c
      where c.id = complaint_id
        and (c.citizen_id = auth.uid() or public.is_admin())
    )
  );

create policy "citizens upload images to own complaints"
  on public.complaint_images for insert
  with check (
    exists (
      select 1 from public.complaints c
      where c.id = complaint_id and c.citizen_id = auth.uid()
    )
  );

-- status history: readable by the complaint's owner/admin, written by admins only
create policy "view status history of visible complaints"
  on public.complaint_status_history for select
  using (
    exists (
      select 1 from public.complaints c
      where c.id = complaint_id
        and (c.citizen_id = auth.uid() or public.is_admin())
    )
  );

create policy "admins insert status history"
  on public.complaint_status_history for insert
  with check (public.is_admin());

-- predictions: admin-only
create policy "admins manage predictions"
  on public.predictions for all
  using (public.is_admin());

-- =========================================================
-- Seed data (safe to run once; remove before a real launch)
-- =========================================================
insert into public.departments (name, contact_email, contact_phone) values
  ('Road Infrastructure', 'roads@municipality.gov.np',       '+977-1-4211000'),
  ('Waste Management',    'waste@municipality.gov.np',       '+977-1-4211001'),
  ('Water Supply',        'water@municipality.gov.np',       '+977-1-4211002'),
  ('Electricity',         'electricity@municipality.gov.np', '+977-1-4211003')
on conflict (name) do nothing;
