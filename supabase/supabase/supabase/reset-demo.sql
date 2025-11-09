-- ======================================
-- 🧹 CAMSU CONNECT RESET DEMO DATA SCRIPT
-- Removes demo rows safely
-- Keeps tables and structure intact
-- ======================================

-- Disable constraints temporarily
set session_replication_role = replica;

-- Truncate in correct dependency order
truncate table public.attendance restart identity cascade;
truncate table public.fines restart identity cascade;
truncate table public.loans restart identity cascade;
truncate table public.projects restart identity cascade;
truncate table public.meetings restart identity cascade;
truncate table public.members restart identity cascade;

-- Re-enable constraints
set session_replication_role = DEFAULT;

-- Log
select '✅ All demo data cleared successfully. Tables remain intact.' as message;
