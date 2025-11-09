-- ======================================
-- 🌱 CAMSU CONNECT DEMO DATA SEED SCRIPT
-- Safe to re-run (will skip duplicates)
-- ======================================

-- ==== MEMBERS ====
insert into public.members (full_name, email, role, status, joined_at)
values
  ('Collins Doh', 'doh4evah@gmail.com', 'sysadmin', 'active', '2024-01-12'),
  ('Mah Glory', 'glory@example.com', 'secretary', 'active', '2024-03-04'),
  ('Ni Samgwa', 'samgwa@example.com', 'member', 'active', '2024-05-09'),
  ('Ngoh Rene', 'rene@example.com', 'member', 'inactive', '2024-06-15')
on conflict do nothing;

-- ==== MEETINGS ====
insert into public.meetings (title, date, notes)
values
  ('April General Meeting', '2025-04-10', 'Discussed new project proposals.'),
  ('May Loan Review', '2025-05-08', 'Reviewed outstanding loans.')
on conflict do nothing;

-- ==== ATTENDANCE ====
insert into public.attendance (meeting_id, member_id, status)
values
  (1, 1, 'present'),
  (1, 2, 'absent'),
  (1, 3, 'present'),
  (2, 1, 'present'),
  (2, 2, 'present')
on conflict do nothing;

-- ==== FINES ====
insert into public.fines (member_id, amount, reason, status, issued_on, paid_on)
values
  (3, 1500, 'Late arrival', 'paid', '2025-01-10', '2025-02-01'),
  (2, 2000, 'Missed meeting', 'unpaid', '2025-03-05', null)
on conflict do nothing;

-- ==== LOANS ====
insert into public.loans (member_id, description, principal, issued_on, status)
values
  (1, 'Community contribution loan', 50000, '2025-01-15', 'repaid'),
  (2, 'Emergency support', 30000, '2025-03-12', 'outstanding')
on conflict do nothing;

-- ==== PROJECTS ====
insert into public.projects (name, budget, start_date, end_date, status, description)
values
  ('Water Project', 200000, '2025-02-01', null, 'ongoing', 'Ongoing borehole construction project.'),
  ('Scholarship Program', 100000, '2025-03-10', '2025-06-10', 'completed', 'Scholarships awarded to students.')
on conflict do nothing;

-- ======================================
-- 🧾 LOG
-- Run this file after schema-update.sql
-- to view real data across all dashboards.
-- ======================================
