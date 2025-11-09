-- ===========================
-- ✅ CAMSU CONNECT SQL SCHEMA SNAPSHOT
-- Version: 2025-11-09
-- ===========================

-- TABLE: members
create table if not exists public.members (
  id bigserial primary key,
  full_name text not null,
  email text,
  role text check (role in ('sysadmin','secretary','member')) not null,
  status text check (status in ('active','inactive')) not null,
  joined_at date not null default current_date
);

alter table public.members enable row level security;

-- RLS: everyone can read; only secretary/sysadmin can write
drop policy if exists m_sel on public.members;
drop policy if exists m_write on public.members;

create policy m_sel on public.members for select using (true);
create policy m_write on public.members
  for all using (public.current_role() in ('sysadmin','secretary'))
  with check (public.current_role() in ('sysadmin','secretary'));

-- ==================================================
-- TABLE: meetings
create table if not exists public.meetings (
  id bigserial primary key,
  title text not null,
  date date not null,
  notes text
);
alter table public.meetings enable row level security;

create policy mt_sel on public.meetings for select using (true);
create policy mt_write on public.meetings
  for all using (public.current_role() in ('sysadmin','secretary'))
  with check (public.current_role() in ('sysadmin','secretary'));

-- ==================================================
-- TABLE: attendance
create table if not exists public.attendance (
  id bigserial primary key,
  meeting_id bigint references public.meetings(id) on delete cascade,
  member_id bigint references public.members(id) on delete cascade,
  status text check (status in ('present','absent','leave')) not null,
  unique (meeting_id, member_id)
);
alter table public.attendance enable row level security;

drop policy if exists att_sel on public.attendance;
drop policy if exists att_write on public.attendance;

create policy att_sel on public.attendance for select using (true);
create policy att_write on public.attendance
  for all using (public.current_role() in ('sysadmin','secretary'))
  with check (public.current_role() in ('sysadmin','secretary'));

-- ==================================================
-- TABLE: fines
create table if not exists public.fines (
  id bigserial primary key,
  member_id bigint references public.members(id) on delete cascade,
  amount numeric not null,
  reason text,
  status text check (status in ('paid','unpaid')) not null default 'unpaid',
  issued_on date not null default current_date,
  paid_on date
);

-- ==================================================
-- TABLE: loans
create table if not exists public.loans (
  id bigserial primary key,
  member_id bigint references public.members(id) on delete cascade,
  description text,
  principal numeric,
  issued_on date,
  status text check (status in ('repaid','outstanding')) not null default 'outstanding'
);

-- ==================================================
-- TABLE: projects
create table if not exists public.projects (
  id bigserial primary key,
  name text not null,
  budget numeric,
  start_date date,
  end_date date,
  status text check (status in ('ongoing','completed','on-hold')) not null default 'ongoing',
  description text
);

-- ==================================================
-- VIEWS: Financial & Member Analytics
create or replace view public.v_member_finance_summary as
select
  m.id as member_id,
  m.full_name,
  coalesce(sum(case when f.status='paid' then f.amount else 0 end),0) as fines_paid,
  coalesce(sum(case when f.status='unpaid' then f.amount else 0 end),0) as fines_unpaid,
  coalesce(sum(l.principal),0) as loans_issued,
  coalesce(sum(case when l.status='repaid' then l.principal else 0 end),0) as loans_repaid
from public.members m
left join public.fines f on f.member_id = m.id
left join public.loans l on l.member_id = m.id
group by m.id, m.full_name;

-- ==================================================
-- VIEW: Member Status Totals
create or replace view public.v_member_status_totals as
select
  status,
  count(*) as total
from public.members
group by status;

-- ==================================================
-- VIEW: Member Role Totals
create or replace view public.v_member_role_totals as
select
  role,
  count(*) as total
from public.members
group by role;

-- ==================================================
-- VIEW: Member Tenure Metrics
create or replace view public.v_member_tenure as
select
  avg((current_date - joined_at)::float)::numeric(10,2) as avg_days,
  min(joined_at) as first_joined,
  max(joined_at) as last_joined,
  count(*)::int as total_members
from public.members;

-- ==================================================
-- VIEW: Member Growth per Month
create or replace view public.v_member_growth_monthly as
select
  date_trunc('month', joined_at) as month,
  count(*) as new_members,
  sum(count(*)) over (order by date_trunc('month', joined_at)) as cumulative_members
from public.members
group by date_trunc('month', joined_at)
order by month;
