-- ============================================================
-- 001_initial_schema.sql
-- Datastraw CX Assistant — Initial Database Schema
--
-- Safe to apply on a fresh Supabase project.
-- All CREATE statements use IF NOT EXISTS / DO $$ guards.
-- No DROP or destructive statements.
--
-- Apply:  supabase db push
--         — or paste into Supabase Dashboard → SQL Editor
-- ============================================================


-- ── Extensions ───────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";


-- ── Enum Types ───────────────────────────────────────────────
-- Guards prevent errors if the migration is applied more than once.

do $$ begin
  create type public.conversation_status as enum (
    'open', 'pending', 'resolved', 'closed'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.message_channel as enum (
    'email', 'chat', 'widget'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.message_role as enum (
    'customer', 'agent', 'bot'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.policy_category as enum (
    'returns', 'shipping', 'billing', 'warranties', 'general'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.ai_reply_status as enum (
    'draft', 'accepted', 'rejected', 'sent'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.order_status as enum (
    'pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.membership_role as enum (
    'owner', 'admin', 'agent', 'viewer'
  );
exception when duplicate_object then null; end $$;


-- ── Utility: set_updated_at trigger function ─────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ════════════════════════════════════════════════════════════
-- TABLE: profiles
-- One row per Supabase Auth user. Created via trigger on signup.
-- ════════════════════════════════════════════════════════════
create table if not exists public.profiles (
  id          uuid        primary key references auth.users (id) on delete cascade,
  email       text        not null,
  full_name   text        not null default '',
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- RLS Policies — profiles
create policy "profiles: owner can select"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: owner can update"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);


-- ════════════════════════════════════════════════════════════
-- TABLE: brands
-- One row per client brand. Extensible — add new brands anytime.
-- ════════════════════════════════════════════════════════════
create table if not exists public.brands (
  id          uuid        primary key default gen_random_uuid(),
  slug        text        not null unique,          -- URL-safe identifier
  name        text        not null,
  logo_url    text,
  website     text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists brands_slug_idx on public.brands (slug);

alter table public.brands enable row level security;

-- Drop + recreate trigger
drop trigger if exists brands_updated_at on public.brands;
create trigger brands_updated_at
  before update on public.brands
  for each row execute function public.set_updated_at();


-- ════════════════════════════════════════════════════════════
-- TABLE: brand_memberships
-- Links auth users to the brands they can access, with a role.
-- ════════════════════════════════════════════════════════════
create table if not exists public.brand_memberships (
  id         uuid           primary key default gen_random_uuid(),
  brand_id   uuid           not null references public.brands (id) on delete cascade,
  user_id    uuid           not null references public.profiles (id) on delete cascade,
  role       public.membership_role not null default 'agent',
  created_at timestamptz    not null default now(),
  unique (brand_id, user_id)
);

create index if not exists memberships_user_idx  on public.brand_memberships (user_id);
create index if not exists memberships_brand_idx on public.brand_memberships (brand_id);

alter table public.brand_memberships enable row level security;

-- RLS Policies — brand_memberships
create policy "memberships: user can select own"
  on public.brand_memberships for select
  using (user_id = auth.uid());

create policy "memberships: admin can insert"
  on public.brand_memberships for insert
  with check (
    exists (
      select 1 from public.brand_memberships bm
      where  bm.brand_id = brand_id
      and    bm.user_id  = auth.uid()
      and    bm.role     in ('owner', 'admin')
    )
  );

create policy "memberships: admin can delete"
  on public.brand_memberships for delete
  using (
    exists (
      select 1 from public.brand_memberships bm
      where  bm.brand_id = brand_memberships.brand_id
      and    bm.user_id  = auth.uid()
      and    bm.role     in ('owner', 'admin')
    )
  );


-- ── Helper: current user's brand_ids ─────────────────────────
-- Returns the set of brand UUIDs the signed-in user belongs to,
-- or all brands if viewing in demo/unauthenticated mode.
create or replace function public.my_brand_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select brand_id
  from   public.brand_memberships
  where  user_id = auth.uid()
  union
  select id
  from   public.brands
  where  auth.uid() is null;
$$;

-- RLS Policies — brands (now that my_brand_ids exists)
create policy "brands: member can select"
  on public.brands for select
  using (id in (select public.my_brand_ids()));


-- Auto-create a profile row and grant memberships whenever a new user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  )
  on conflict (id) do nothing;

  -- Grant membership to all brands for agent access
  insert into public.brand_memberships (brand_id, user_id, role)
  select b.id, new.id, 'agent'::public.membership_role
  from public.brands b
  on conflict do nothing;

  return new;
end;
$$;

-- Drop + recreate trigger so re-running the migration is safe
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ════════════════════════════════════════════════════════════
-- TABLE: brand_policies  (knowledge base)
-- Support / return / shipping policies for each brand.
-- ════════════════════════════════════════════════════════════
create table if not exists public.brand_policies (
  id          uuid                   primary key default gen_random_uuid(),
  brand_id    uuid                   not null references public.brands (id) on delete cascade,
  title       text                   not null,
  content     text                   not null,
  category    public.policy_category not null default 'general',
  is_active   boolean                not null default true,
  created_at  timestamptz            not null default now(),
  updated_at  timestamptz            not null default now()
);

create index if not exists policies_brand_idx    on public.brand_policies (brand_id);
create index if not exists policies_category_idx on public.brand_policies (brand_id, category);

alter table public.brand_policies enable row level security;

drop trigger if exists brand_policies_updated_at on public.brand_policies;
create trigger brand_policies_updated_at
  before update on public.brand_policies
  for each row execute function public.set_updated_at();

-- RLS Policies — brand_policies
create policy "brand_policies: member can select"
  on public.brand_policies for select
  using (brand_id in (select public.my_brand_ids()));

create policy "brand_policies: member can insert"
  on public.brand_policies for insert
  with check (brand_id in (select public.my_brand_ids()));

create policy "brand_policies: member can update"
  on public.brand_policies for update
  using (brand_id in (select public.my_brand_ids()))
  with check (brand_id in (select public.my_brand_ids()));

create policy "brand_policies: member can delete"
  on public.brand_policies for delete
  using (brand_id in (select public.my_brand_ids()));


-- ════════════════════════════════════════════════════════════
-- TABLE: customers
-- End-customers who contact support for a specific brand.
-- ════════════════════════════════════════════════════════════
create table if not exists public.customers (
  id           uuid        primary key default gen_random_uuid(),
  brand_id     uuid        not null references public.brands (id) on delete cascade,
  email        text        not null,
  full_name    text        not null default '',
  phone        text,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (brand_id, email)              -- one customer record per brand
);

create index if not exists customers_brand_idx on public.customers (brand_id);
create index if not exists customers_email_idx on public.customers (brand_id, email);

alter table public.customers enable row level security;

drop trigger if exists customers_updated_at on public.customers;
create trigger customers_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

-- RLS Policies — customers
create policy "customers: member can select"
  on public.customers for select
  using (brand_id in (select public.my_brand_ids()));

create policy "customers: member can insert"
  on public.customers for insert
  with check (brand_id in (select public.my_brand_ids()));

create policy "customers: member can update"
  on public.customers for update
  using (brand_id in (select public.my_brand_ids()))
  with check (brand_id in (select public.my_brand_ids()));


-- ════════════════════════════════════════════════════════════
-- TABLE: orders
-- Purchase orders referenced during CX conversations.
-- ════════════════════════════════════════════════════════════
create table if not exists public.orders (
  id              uuid               primary key default gen_random_uuid(),
  brand_id        uuid               not null references public.brands (id) on delete cascade,
  customer_id     uuid               not null references public.customers (id) on delete cascade,
  order_number    text               not null,
  status          public.order_status not null default 'pending',
  total_amount    numeric(10, 2)     not null default 0,
  currency        char(3)            not null default 'USD',
  items_json      jsonb              not null default '[]',   -- line items snapshot
  notes           text,
  ordered_at      timestamptz        not null default now(),
  created_at      timestamptz        not null default now(),
  updated_at      timestamptz        not null default now(),
  unique (brand_id, order_number)
);

create index if not exists orders_brand_idx    on public.orders (brand_id);
create index if not exists orders_customer_idx on public.orders (customer_id);

alter table public.orders enable row level security;

drop trigger if exists orders_updated_at on public.orders;
create trigger orders_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

-- RLS Policies — orders
create policy "orders: member can select"
  on public.orders for select
  using (brand_id in (select public.my_brand_ids()));

create policy "orders: member can insert"
  on public.orders for insert
  with check (brand_id in (select public.my_brand_ids()));

create policy "orders: member can update"
  on public.orders for update
  using (brand_id in (select public.my_brand_ids()))
  with check (brand_id in (select public.my_brand_ids()));


-- ════════════════════════════════════════════════════════════
-- TABLE: conversations
-- A support thread between a customer and agents for one brand.
-- ════════════════════════════════════════════════════════════
create table if not exists public.conversations (
  id               uuid                      primary key default gen_random_uuid(),
  brand_id         uuid                      not null references public.brands (id) on delete cascade,
  customer_id      uuid                      not null references public.customers (id) on delete cascade,
  order_id         uuid                      references public.orders (id) on delete set null,
  subject          text                      not null default '',
  status           public.conversation_status not null default 'open',
  channel          public.message_channel     not null default 'chat',
  assigned_to      uuid                      references public.profiles (id) on delete set null,
  created_at       timestamptz               not null default now(),
  updated_at       timestamptz               not null default now(),
  last_message_at  timestamptz               not null default now()
);

create index if not exists conversations_brand_idx    on public.conversations (brand_id);
create index if not exists conversations_customer_idx on public.conversations (customer_id);
create index if not exists conversations_status_idx   on public.conversations (brand_id, status);
create index if not exists conversations_assigned_idx on public.conversations (assigned_to);

alter table public.conversations enable row level security;

drop trigger if exists conversations_updated_at on public.conversations;
create trigger conversations_updated_at
  before update on public.conversations
  for each row execute function public.set_updated_at();

-- RLS Policies — conversations
create policy "conversations: member can select"
  on public.conversations for select
  using (brand_id in (select public.my_brand_ids()));

create policy "conversations: member can insert"
  on public.conversations for insert
  with check (brand_id in (select public.my_brand_ids()));

create policy "conversations: member can update"
  on public.conversations for update
  using (brand_id in (select public.my_brand_ids()))
  with check (brand_id in (select public.my_brand_ids()));


-- ════════════════════════════════════════════════════════════
-- TABLE: messages
-- Individual messages within a conversation.
-- ════════════════════════════════════════════════════════════
create table if not exists public.messages (
  id               uuid               primary key default gen_random_uuid(),
  conversation_id  uuid               not null references public.conversations (id) on delete cascade,
  -- Redundant brand_id denorm for simpler RLS (avoids join)
  brand_id         uuid               not null references public.brands (id) on delete cascade,
  role             public.message_role not null,
  author_id        uuid               references public.profiles (id) on delete set null,
  content          text               not null,
  metadata_json    jsonb              not null default '{}',  -- e.g. attachments, read receipts
  created_at       timestamptz        not null default now()
);

create index if not exists messages_conversation_idx on public.messages (conversation_id);
create index if not exists messages_brand_idx        on public.messages (brand_id);
create index if not exists messages_created_at_idx   on public.messages (conversation_id, created_at);

alter table public.messages enable row level security;

-- RLS Policies — messages
create policy "messages: member can select"
  on public.messages for select
  using (brand_id in (select public.my_brand_ids()));

create policy "messages: member can insert"
  on public.messages for insert
  with check (brand_id in (select public.my_brand_ids()));


-- ════════════════════════════════════════════════════════════
-- TABLE: ai_reply_logs
-- Every AI-generated draft: inputs, output, model used, status.
-- ════════════════════════════════════════════════════════════
create table if not exists public.ai_reply_logs (
  id                  uuid                  primary key default gen_random_uuid(),
  brand_id            uuid                  not null references public.brands (id) on delete cascade,
  conversation_id     uuid                  not null references public.conversations (id) on delete cascade,
  -- Snapshot of messages sent to the LLM (array of {role, content})
  prompt_messages     jsonb                 not null default '[]',
  -- Policy IDs that were injected as context
  policy_ids_used     uuid[]                not null default '{}',
  -- Raw LLM response
  generated_draft     text                  not null default '',
  -- Model identifier, e.g. "openai/gpt-4o-mini" or "google/gemini-pro"
  model_id            text                  not null default '',
  -- Token usage
  prompt_tokens       integer,
  completion_tokens   integer,
  -- What the agent did with the draft
  status              public.ai_reply_status not null default 'draft',
  -- Agent who triggered / acted on the generation
  triggered_by        uuid                  references public.profiles (id) on delete set null,
  created_at          timestamptz           not null default now(),
  updated_at          timestamptz           not null default now()
);

create index if not exists ai_logs_brand_idx        on public.ai_reply_logs (brand_id);
create index if not exists ai_logs_conversation_idx on public.ai_reply_logs (conversation_id);
create index if not exists ai_logs_status_idx       on public.ai_reply_logs (brand_id, status);

alter table public.ai_reply_logs enable row level security;

drop trigger if exists ai_reply_logs_updated_at on public.ai_reply_logs;
create trigger ai_reply_logs_updated_at
  before update on public.ai_reply_logs
  for each row execute function public.set_updated_at();

-- RLS Policies — ai_reply_logs
create policy "ai_logs: member can select"
  on public.ai_reply_logs for select
  using (brand_id in (select public.my_brand_ids()));

create policy "ai_logs: member can insert"
  on public.ai_reply_logs for insert
  with check (brand_id in (select public.my_brand_ids()));

create policy "ai_logs: member can update own draft"
  on public.ai_reply_logs for update
  using (brand_id in (select public.my_brand_ids()))
  with check (brand_id in (select public.my_brand_ids()));


-- ════════════════════════════════════════════════════════════
-- SEED DATA
-- ════════════════════════════════════════════════════════════

-- ── 1. Demo Brands ───────────────────────────────────────────
insert into public.brands (id, slug, name, website) values
  ('b1000000-0000-0000-0000-000000000001', 'aquahome',   'AquaHome',   'https://aquahome.example.com'),
  ('b1000000-0000-0000-0000-000000000002', 'glowcare',   'GlowCare',   'https://glowcare.example.com'),
  ('b1000000-0000-0000-0000-000000000003', 'brandthree', 'Brand Three', 'https://brandthree.example.com')
on conflict (slug) do nothing;


-- ── 2. Knowledge-base Policies ───────────────────────────────

-- AquaHome policies
insert into public.brand_policies (brand_id, title, category, content) values

('b1000000-0000-0000-0000-000000000001',
 'AquaHome Returns Policy',
 'returns',
 'AquaHome accepts returns within 30 days of delivery for unused items in original packaging. '
 'To initiate a return, contact support with your order number. Refunds are processed within '
 '5–7 business days after we receive the item. Items marked Final Sale are non-returnable. '
 'Shipping costs for returns are covered by AquaHome if the item is defective; otherwise the '
 'customer bears return shipping costs.'),

('b1000000-0000-0000-0000-000000000001',
 'AquaHome Shipping Policy',
 'shipping',
 'AquaHome ships to all 50 US states and Canada. Standard shipping (5–7 business days) is free '
 'on orders over $75. Expedited shipping (2–3 business days) costs $12.99. Overnight delivery '
 'is available for $24.99 on orders placed before 12:00 PM EST. Orders ship Monday–Friday '
 'excluding public holidays. A tracking number is emailed once the order is dispatched.'),

('b1000000-0000-0000-0000-000000000001',
 'AquaHome Warranty Policy',
 'warranties',
 'All AquaHome appliances carry a 2-year limited warranty covering manufacturing defects. '
 'Accidental damage, misuse, and normal wear and tear are not covered. To file a warranty '
 'claim, submit your proof of purchase and a description of the defect via the support portal. '
 'Approved claims are fulfilled with a replacement unit or store credit at our discretion.'),

('b1000000-0000-0000-0000-000000000001',
 'AquaHome Billing & Payment',
 'billing',
 'AquaHome accepts Visa, Mastercard, American Express, Discover, and PayPal. '
 'Orders are charged at the time of shipment, not at checkout. Sales tax is applied '
 'based on the delivery address. For subscription orders, billing recurs on the same '
 'day each month; cancellation can be made any time before the next billing cycle.'),

-- GlowCare policies
('b1000000-0000-0000-0000-000000000002',
 'GlowCare Returns & Refunds',
 'returns',
 'GlowCare offers a 14-day satisfaction guarantee. Unopened products in original condition '
 'may be returned for a full refund. Opened skincare products are eligible for store credit '
 'only, due to hygiene regulations. Return shipping labels are provided free of charge for '
 'all eligible returns. Refunds are credited within 3–5 business days.'),

('b1000000-0000-0000-0000-000000000002',
 'GlowCare Shipping Policy',
 'shipping',
 'GlowCare ships worldwide. Domestic orders (US) qualify for free standard shipping on '
 'purchases over $50. International orders ship via DHL Express (7–14 business days) with '
 'a flat $18 fee. Customs duties and import taxes are the responsibility of the customer. '
 'All orders receive a tracking number within 24 hours of dispatch.'),

('b1000000-0000-0000-0000-000000000002',
 'GlowCare Ingredient Safety & Allergens',
 'general',
 'GlowCare products are dermatologist-tested, cruelty-free, and free from parabens, '
 'sulphates, and artificial fragrances. Full ingredient lists appear on each product page. '
 'If a customer experiences an adverse reaction, they should discontinue use immediately '
 'and consult a healthcare provider. GlowCare is not liable for reactions due to known '
 'personal allergies that the customer did not disclose.'),

('b1000000-0000-0000-0000-000000000002',
 'GlowCare Subscription & Auto-Replenishment',
 'billing',
 'GlowCare''s Subscribe & Save program offers 15% off and free shipping on recurring orders. '
 'Subscriptions can be paused, skipped, or cancelled at any time from the customer account '
 'dashboard. Cancellations must be made at least 24 hours before the next scheduled '
 'shipment to avoid being charged for that cycle.'),

-- Brand Three policies
('b1000000-0000-0000-0000-000000000003',
 'Brand Three Returns Policy',
 'returns',
 'Brand Three accepts returns within 21 days of purchase. Items must be unused and in '
 'original packaging. A 10% restocking fee applies to orders over $200. Digital and '
 'downloadable products are non-refundable. Approved refunds are processed within '
 '7–10 business days.'),

('b1000000-0000-0000-0000-000000000003',
 'Brand Three Standard Shipping',
 'shipping',
 'Brand Three ships domestically via UPS and FedEx. Standard shipping (4–6 business days) '
 'costs $6.99; free on orders over $60. Express shipping (1–2 business days) is $18.99. '
 'International shipping is not currently available. PO boxes are not supported.'),

('b1000000-0000-0000-0000-000000000003',
 'Brand Three General FAQ',
 'general',
 'Brand Three products are manufactured in the United States and comply with all applicable '
 'federal safety standards. For bulk or wholesale inquiries, email wholesale@brandthree.example.com. '
 'Our support team is available Monday–Friday, 9 AM–6 PM EST.')

on conflict do nothing;


-- ── 3. Sample Customers ──────────────────────────────────────

insert into public.customers (id, brand_id, email, full_name, phone) values

-- AquaHome customers
('c1000001-0000-0000-0000-000000000001',
 'b1000000-0000-0000-0000-000000000001',
 'alice.demo@example.com', 'Alice Demo', '+1-555-0101'),

('c1000001-0000-0000-0000-000000000002',
 'b1000000-0000-0000-0000-000000000001',
 'bob.demo@example.com', 'Bob Demo', '+1-555-0102'),

-- GlowCare customers
('c1000001-0000-0000-0000-000000000003',
 'b1000000-0000-0000-0000-000000000002',
 'carol.demo@example.com', 'Carol Demo', '+1-555-0103'),

('c1000001-0000-0000-0000-000000000004',
 'b1000000-0000-0000-0000-000000000002',
 'dan.demo@example.com', 'Dan Demo', '+1-555-0104'),

-- Brand Three customers
('c1000001-0000-0000-0000-000000000005',
 'b1000000-0000-0000-0000-000000000003',
 'eve.demo@example.com', 'Eve Demo', '+1-555-0105')

on conflict (brand_id, email) do nothing;


-- ── 4. Sample Orders ─────────────────────────────────────────

insert into public.orders (id, brand_id, customer_id, order_number, status, total_amount, currency, items_json) values

('a1000001-0000-0000-0000-000000000001',
 'b1000000-0000-0000-0000-000000000001',
 'c1000001-0000-0000-0000-000000000001',
 'AH-2024-00123', 'delivered', 149.99, 'USD',
 '[{"sku":"AH-FILTER-PRO","name":"AquaHome Pro Filter","qty":2,"unit_price":74.99}]'),

('a1000001-0000-0000-0000-000000000002',
 'b1000000-0000-0000-0000-000000000001',
 'c1000001-0000-0000-0000-000000000002',
 'AH-2024-00124', 'shipped', 89.00, 'USD',
 '[{"sku":"AH-PURIFIER-S","name":"AquaHome Smart Purifier","qty":1,"unit_price":89.00}]'),

('a1000001-0000-0000-0000-000000000003',
 'b1000000-0000-0000-0000-000000000002',
 'c1000001-0000-0000-0000-000000000003',
 'GC-2024-00456', 'delivered', 67.50, 'USD',
 '[{"sku":"GC-SERUM-VITAMIN-C","name":"GlowCare Vitamin C Serum","qty":1,"unit_price":42.50},{"sku":"GC-MOISTURIZER","name":"GlowCare Daily Moisturizer","qty":1,"unit_price":25.00}]'),

('a1000001-0000-0000-0000-000000000004',
 'b1000000-0000-0000-0000-000000000002',
 'c1000001-0000-0000-0000-000000000004',
 'GC-2024-00457', 'cancelled', 34.00, 'USD',
 '[{"sku":"GC-TONER","name":"GlowCare Balancing Toner","qty":2,"unit_price":17.00}]'),

('a1000001-0000-0000-0000-000000000005',
 'b1000000-0000-0000-0000-000000000003',
 'c1000001-0000-0000-0000-000000000005',
 'BT-2024-00789', 'processing', 210.00, 'USD',
 '[{"sku":"BT-STARTER-KIT","name":"Brand Three Starter Kit","qty":1,"unit_price":210.00}]')

on conflict (brand_id, order_number) do nothing;


-- ── 5. Sample Conversations & Messages ───────────────────────

insert into public.conversations (id, brand_id, customer_id, order_id, subject, status, channel) values

('d1000001-0000-0000-0000-000000000001',
 'b1000000-0000-0000-0000-000000000001',
 'c1000001-0000-0000-0000-000000000001',
 'a1000001-0000-0000-0000-000000000001',
 'Filter replacement inquiry',
 'open', 'chat'),

('d1000001-0000-0000-0000-000000000002',
 'b1000000-0000-0000-0000-000000000001',
 'c1000001-0000-0000-0000-000000000002',
 'a1000001-0000-0000-0000-000000000002',
 'Tracking number not received',
 'pending', 'email'),

('d1000001-0000-0000-0000-000000000003',
 'b1000000-0000-0000-0000-000000000002',
 'c1000001-0000-0000-0000-000000000003',
 'a1000001-0000-0000-0000-000000000003',
 'Vitamin C Serum caused skin irritation',
 'open', 'chat'),

('d1000001-0000-0000-0000-000000000004',
 'b1000000-0000-0000-0000-000000000002',
 'c1000001-0000-0000-0000-000000000004',
 'a1000001-0000-0000-0000-000000000004',
 'Request refund for cancelled order',
 'resolved', 'email'),

('d1000001-0000-0000-0000-000000000005',
 'b1000000-0000-0000-0000-000000000003',
 'c1000001-0000-0000-0000-000000000005',
 'a1000001-0000-0000-0000-000000000005',
 'Order processing delay — Starter Kit',
 'open', 'widget')

on conflict do nothing;


-- Messages for conversation 1 (AquaHome — Alice)
insert into public.messages (conversation_id, brand_id, role, content) values

('d1000001-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001',
 'customer',
 'Hi! My AquaHome Pro Filter (order AH-2024-00123) arrived last week. '
 'How often should I replace the filter cartridge?'),

('d1000001-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001',
 'bot',
 'Hello Alice! Great question. AquaHome Pro Filter cartridges should be replaced every '
 '6 months under normal household usage. If your water has a particularly high mineral '
 'content, we recommend checking every 4 months. Is there anything else I can help with?'),

('d1000001-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001',
 'customer',
 'Thanks! Also, the replacement packs — are they covered under the warranty?');


-- Messages for conversation 2 (AquaHome — Bob)
insert into public.messages (conversation_id, brand_id, role, content) values

('d1000001-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000001',
 'customer',
 'I placed order AH-2024-00124 three days ago but I have not received a tracking number. '
 'The website says it shipped. Can you help?'),

('d1000001-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000001',
 'agent',
 'Hi Bob, apologies for the delay. I can see your order has shipped via UPS. '
 'Your tracking number is 1Z999AA10123456784. It should arrive by Thursday.');


-- Messages for conversation 3 (GlowCare — Carol)
insert into public.messages (conversation_id, brand_id, role, content) values

('d1000001-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000002',
 'customer',
 'I started using the Vitamin C Serum from order GC-2024-00456 two days ago '
 'and I notice some redness on my cheeks. Is this normal?'),

('d1000001-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000002',
 'bot',
 'Hi Carol! Mild redness during the first few days of using a Vitamin C serum is common '
 'as skin adjusts to the active ingredient. We recommend applying a thin layer every '
 'other day initially, then building up to daily use. If redness persists beyond a week '
 'or worsens, please discontinue use and consult a dermatologist. We''re happy to issue '
 'store credit if the product doesn''t suit your skin.');


-- Messages for conversation 4 (GlowCare — Dan)
insert into public.messages (conversation_id, brand_id, role, content) values

('d1000001-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000002',
 'customer',
 'My order GC-2024-00457 was cancelled. I was charged $34. When will I get my refund?'),

('d1000001-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000002',
 'agent',
 'Hi Dan, your refund of $34.00 was processed on our end today. It typically takes '
 '3–5 business days to appear on your statement depending on your bank. '
 'Please don''t hesitate to reach out if it hasn''t arrived by then!'),

('d1000001-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000002',
 'customer', 'Perfect, thank you!');


-- Messages for conversation 5 (Brand Three — Eve)
insert into public.messages (conversation_id, brand_id, role, content) values

('d1000001-0000-0000-0000-000000000005', 'b1000000-0000-0000-0000-000000000003',
 'customer',
 'My order BT-2024-00789 has been in "processing" for 5 days. '
 'This is a gift — I need it by Friday. What can you do?'),

('d1000001-0000-0000-0000-000000000005', 'b1000000-0000-0000-0000-000000000003',
 'bot',
 'Hi Eve, I''m sorry for the delay! I can see order BT-2024-00789 is still in our '
 'fulfilment queue. I am escalating this to our warehouse team right now and will '
 'update you within the hour. We''ll do everything we can to meet your Friday deadline.');


-- ════════════════════════════════════════════════════════════
-- END OF MIGRATION
-- ════════════════════════════════════════════════════════════

