-- ============================================================
-- 004_assessment_part1.sql
-- Idempotent schema updates and assessment scenario seeding:
-- 1. Add delivery_date to orders
-- 2. Add sender_type and source to messages
-- 3. Create ai_generations table with RLS
-- 4. Update/seed 4 KB policies per brand (AquaHome, GlowCare)
-- 5. Seed assessment scenario: delivered orders (AquaHome 20 days ago)
--    and open conversations with latest message:
--    "My order was delivered but the bottle is broken. What can I do?"
-- ============================================================

-- ── 1. Orders schema updates ─────────────────────────────────
alter table public.orders
  add column if not exists delivery_date timestamptz;

-- ── 2. Messages schema updates ───────────────────────────────
alter table public.messages
  add column if not exists sender_type text default 'agent',
  add column if not exists source text default 'manual';

-- ── 3. ai_generations table ──────────────────────────────────
create table if not exists public.ai_generations (
  id                  uuid          primary key default gen_random_uuid(),
  conversation_id     uuid          not null references public.conversations (id) on delete cascade,
  brand_id            uuid          not null references public.brands (id) on delete cascade,
  trigger_message_id  uuid          references public.messages (id) on delete set null,
  customer_message    text          not null,
  retrieved_context   jsonb         not null default '[]',
  ai_response         text          not null default '',
  status              text          not null default 'ok', -- ok | needs_review | no_knowledge
  reason              text,
  model               text          not null default '',
  prompt_tokens       integer,
  completion_tokens   integer,
  latency_ms          integer,
  edited_response     text,
  final_response      text,
  final_message_id    uuid          references public.messages (id) on delete set null,
  approved_by         uuid          references public.profiles (id) on delete set null,
  approved_at         timestamptz,
  created_at          timestamptz   not null default now()
);

create index if not exists ai_generations_conv_idx  on public.ai_generations (conversation_id);
create index if not exists ai_generations_brand_idx on public.ai_generations (brand_id);
create index if not exists ai_generations_created_idx on public.ai_generations (created_at desc);

alter table public.ai_generations enable row level security;

do $$ begin
  create policy "ai_generations: member can select" on public.ai_generations
    for select using (brand_id in (select public.my_brand_ids()));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "ai_generations: member can insert" on public.ai_generations
    for insert with check (brand_id in (select public.my_brand_ids()));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "ai_generations: member can update" on public.ai_generations
    for update using (brand_id in (select public.my_brand_ids()))
    with check (brand_id in (select public.my_brand_ids()));
exception when duplicate_object then null; end $$;

-- ── 4. Seed 4 Policies for AquaHome and 4 for GlowCare ────────
-- Allow category enum expansion if necessary or use text/category
-- Brand IDs from 003:
-- AquaHome: b1000000-0000-0000-0000-000000000001
-- GlowCare: b1000000-0000-0000-0000-000000000002

-- AquaHome Policy 1: Return (within 14 days)
insert into public.brand_policies (id, brand_id, title, category, content, is_active) values
('a1000001-0000-0000-0000-000000000001',
 'b1000000-0000-0000-0000-000000000001',
 'Return Policy',
 'returns',
 'AquaHome accepts returns within 14 days of delivery. Items must be in their original packaging and unused condition.',
 true)
on conflict (id) do update set
  title = excluded.title,
  category = excluded.category,
  content = excluded.content,
  is_active = true;

-- AquaHome Policy 2: Refund (7 days, damaged replacement 48 hours)
insert into public.brand_policies (id, brand_id, title, category, content, is_active) values
('a1000001-0000-0000-0000-000000000004',
 'b1000000-0000-0000-0000-000000000001',
 'Refund Policy',
 'returns',
 'AquaHome offers a full refund within 7 days of delivery. Damaged items are replaced free if reported within 48 hours of delivery with a photo. Refunds cannot be granted after 7 days.',
 true)
on conflict (id) do update set
  title = excluded.title,
  category = excluded.category,
  content = excluded.content,
  is_active = true;

-- AquaHome Policy 3: Shipping (3-5 business days)
insert into public.brand_policies (id, brand_id, title, category, content, is_active) values
('a1000001-0000-0000-0000-000000000002',
 'b1000000-0000-0000-0000-000000000001',
 'Shipping Policy',
 'shipping',
 'AquaHome orders are delivered within 3-5 business days via standard carrier. Tracking numbers are emailed upon shipment.',
 true)
on conflict (id) do update set
  title = excluded.title,
  category = excluded.category,
  content = excluded.content,
  is_active = true;

-- AquaHome Policy 4: Cancellation (only before dispatch)
insert into public.brand_policies (id, brand_id, title, category, content, is_active) values
('a1000001-0000-0000-0000-000000000003',
 'b1000000-0000-0000-0000-000000000001',
 'Cancellation Policy',
 'general',
 'AquaHome permits cancellation only before dispatch. Once the parcel is in transit, orders cannot be cancelled and must be returned after receipt.',
 true)
on conflict (id) do update set
  title = excluded.title,
  category = excluded.category,
  content = excluded.content,
  is_active = true;

-- GlowCare Policy 1: Return (within 45 days)
insert into public.brand_policies (id, brand_id, title, category, content, is_active) values
('a1000001-0000-0000-0000-000000000005',
 'b1000000-0000-0000-0000-000000000002',
 'Return Policy',
 'returns',
 'GlowCare offers returns within 45 days of delivery. Unused and unopened items are eligible for return shipping label reimbursement.',
 true)
on conflict (id) do update set
  title = excluded.title,
  category = excluded.category,
  content = excluded.content,
  is_active = true;

-- GlowCare Policy 2: Refund (within 30 days, damaged refunded or replaced within 7 days)
insert into public.brand_policies (id, brand_id, title, category, content, is_active) values
('a1000001-0000-0000-0000-000000000008',
 'b1000000-0000-0000-0000-000000000002',
 'Refund Policy',
 'returns',
 'GlowCare provides refunds within 30 days of delivery. Damaged items can be refunded or replaced at the customer''s choice if reported within 7 days of delivery.',
 true)
on conflict (id) do update set
  title = excluded.title,
  category = excluded.category,
  content = excluded.content,
  is_active = true;

-- GlowCare Policy 3: Shipping (7-10 business days)
insert into public.brand_policies (id, brand_id, title, category, content, is_active) values
('a1000001-0000-0000-0000-000000000006',
 'b1000000-0000-0000-0000-000000000002',
 'Shipping Policy',
 'shipping',
 'GlowCare standard domestic and international delivery takes 7-10 business days. Expedited delivery is unavailable.',
 true)
on conflict (id) do update set
  title = excluded.title,
  category = excluded.category,
  content = excluded.content,
  is_active = true;

-- GlowCare Policy 4: Cancellation (within 24 hours of ordering)
insert into public.brand_policies (id, brand_id, title, category, content, is_active) values
('a1000001-0000-0000-0000-000000000007',
 'b1000000-0000-0000-0000-000000000002',
 'Cancellation Policy',
 'general',
 'GlowCare allows order cancellations within 24 hours of ordering. After 24 hours, fulfillment begins and cancellation is no longer possible.',
 true)
on conflict (id) do update set
  title = excluded.title,
  category = excluded.category,
  content = excluded.content,
  is_active = true;

-- ── 5. Seed Assessment Scenario ───────────────────────────────
-- Delivered order for AquaHome (delivered 20 days ago)
update public.orders
set
  status = 'delivered',
  delivery_date = now() - interval '20 days',
  ordered_at = now() - interval '25 days'
where id = 'a1000001-0000-0000-0000-000000000001';

-- Delivered order for GlowCare (delivered 20 days ago)
update public.orders
set
  status = 'delivered',
  delivery_date = now() - interval '20 days',
  ordered_at = now() - interval '24 days'
where id = 'a1000001-0000-0000-0000-000000000003';

-- Update/ensure AquaHome Conversation 1 has open status and latest message is broken bottle
update public.conversations
set
  status = 'open',
  last_message_at = now()
where id = 'd1000001-0000-0000-0000-000000000001';

-- Add or update the scenario customer message for AquaHome
insert into public.messages (id, conversation_id, brand_id, role, sender_type, source, content, created_at)
values (
  'f1000001-0000-0000-0000-000000000099',
  'd1000001-0000-0000-0000-000000000001',
  'b1000000-0000-0000-0000-000000000001',
  'customer',
  'customer',
  'customer',
  'My order was delivered but the bottle is broken. What can I do?',
  now()
)
on conflict (id) do update set
  content = excluded.content,
  role = 'customer',
  sender_type = 'customer',
  source = 'customer',
  created_at = now();

-- Update/ensure GlowCare Conversation 3 has open status and latest message is broken bottle
update public.conversations
set
  status = 'open',
  last_message_at = now()
where id = 'd1000001-0000-0000-0000-000000000003';

-- Add or update the scenario customer message for GlowCare
insert into public.messages (id, conversation_id, brand_id, role, sender_type, source, content, created_at)
values (
  'f1000001-0000-0000-0000-000000000098',
  'd1000001-0000-0000-0000-000000000003',
  'b1000000-0000-0000-0000-000000000002',
  'customer',
  'customer',
  'customer',
  'My order was delivered but the bottle is broken. What can I do?',
  now()
)
on conflict (id) do update set
  content = excluded.content,
  role = 'customer',
  sender_type = 'customer',
  source = 'customer',
  created_at = now();
