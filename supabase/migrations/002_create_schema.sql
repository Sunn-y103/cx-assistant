-- ============================================================
-- 002_create_schema.sql
-- Create core schema, tables, enums, triggers, and RLS policies.
-- Safe and idempotent: all objects guarded by IF NOT EXISTS / DO $$ blocks.
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ── Enum Types ───────────────────────────────────────────────
do $$ begin
  create type public.conversation_status as enum ('open', 'pending', 'resolved', 'closed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.message_channel as enum ('email', 'chat', 'widget');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.message_role as enum ('customer', 'agent', 'bot');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.policy_category as enum ('returns', 'shipping', 'billing', 'warranties', 'general');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.ai_reply_status as enum ('draft', 'accepted', 'rejected', 'sent');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.order_status as enum ('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.membership_role as enum ('owner', 'admin', 'agent', 'viewer');
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

do $$ begin
  create policy "profiles: owner can select" on public.profiles for select using (auth.uid() = id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "profiles: owner can update" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
exception when duplicate_object then null; end $$;

-- ════════════════════════════════════════════════════════════
-- TABLE: brands
-- ════════════════════════════════════════════════════════════
create table if not exists public.brands (
  id          uuid        primary key default gen_random_uuid(),
  slug        text        not null unique,
  name        text        not null,
  logo_url    text,
  website     text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists brands_slug_idx on public.brands (slug);
alter table public.brands enable row level security;

drop trigger if exists brands_updated_at on public.brands;
create trigger brands_updated_at
  before update on public.brands
  for each row execute function public.set_updated_at();

-- ════════════════════════════════════════════════════════════
-- TABLE: brand_memberships
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

do $$ begin
  create policy "memberships: user can select own" on public.brand_memberships for select using (user_id = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "memberships: admin can insert" on public.brand_memberships for insert
  with check (
    exists (
      select 1 from public.brand_memberships bm
      where bm.brand_id = brand_id and bm.user_id = auth.uid() and bm.role in ('owner', 'admin')
    )
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "memberships: admin can delete" on public.brand_memberships for delete
  using (
    exists (
      select 1 from public.brand_memberships bm
      where bm.brand_id = brand_memberships.brand_id and bm.user_id = auth.uid() and bm.role in ('owner', 'admin')
    )
  );
exception when duplicate_object then null; end $$;

-- ── Helper: current user's brand_ids ─────────────────────────
-- Defined AFTER brand_memberships exists.
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

-- RLS Policy on brands
do $$ begin
  create policy "brands: member can select" on public.brands for select using (id in (select public.my_brand_ids()));
exception when duplicate_object then null; end $$;

-- ── Auth Signup Trigger: Auto-create profile & grant memberships ─
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

  -- Dynamically grant membership to all brands for registered users (no hardcoded user IDs)
  insert into public.brand_memberships (brand_id, user_id, role)
  select b.id, new.id, 'agent'::public.membership_role
  from public.brands b
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ════════════════════════════════════════════════════════════
-- TABLE: brand_policies  (knowledge base)
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

do $$ begin
  create policy "brand_policies: member can select" on public.brand_policies for select using (brand_id in (select public.my_brand_ids()));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "brand_policies: member can insert" on public.brand_policies for insert with check (brand_id in (select public.my_brand_ids()));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "brand_policies: member can update" on public.brand_policies for update
  using (brand_id in (select public.my_brand_ids())) with check (brand_id in (select public.my_brand_ids()));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "brand_policies: member can delete" on public.brand_policies for delete using (brand_id in (select public.my_brand_ids()));
exception when duplicate_object then null; end $$;

-- ════════════════════════════════════════════════════════════
-- TABLE: customers
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
  unique (brand_id, email)
);

create index if not exists customers_brand_idx on public.customers (brand_id);
create index if not exists customers_email_idx on public.customers (brand_id, email);
alter table public.customers enable row level security;

drop trigger if exists customers_updated_at on public.customers;
create trigger customers_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

do $$ begin
  create policy "customers: member can select" on public.customers for select using (brand_id in (select public.my_brand_ids()));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "customers: member can insert" on public.customers for insert with check (brand_id in (select public.my_brand_ids()));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "customers: member can update" on public.customers for update
  using (brand_id in (select public.my_brand_ids())) with check (brand_id in (select public.my_brand_ids()));
exception when duplicate_object then null; end $$;

-- ════════════════════════════════════════════════════════════
-- TABLE: orders
-- ════════════════════════════════════════════════════════════
create table if not exists public.orders (
  id              uuid               primary key default gen_random_uuid(),
  brand_id        uuid               not null references public.brands (id) on delete cascade,
  customer_id     uuid               not null references public.customers (id) on delete cascade,
  order_number    text               not null,
  status          public.order_status not null default 'pending',
  total_amount    numeric(10, 2)     not null default 0,
  currency        char(3)            not null default 'USD',
  items_json      jsonb              not null default '[]',
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

do $$ begin
  create policy "orders: member can select" on public.orders for select using (brand_id in (select public.my_brand_ids()));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "orders: member can insert" on public.orders for insert with check (brand_id in (select public.my_brand_ids()));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "orders: member can update" on public.orders for update
  using (brand_id in (select public.my_brand_ids())) with check (brand_id in (select public.my_brand_ids()));
exception when duplicate_object then null; end $$;

-- ════════════════════════════════════════════════════════════
-- TABLE: conversations
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

do $$ begin
  create policy "conversations: member can select" on public.conversations for select using (brand_id in (select public.my_brand_ids()));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "conversations: member can insert" on public.conversations for insert with check (brand_id in (select public.my_brand_ids()));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "conversations: member can update" on public.conversations for update
  using (brand_id in (select public.my_brand_ids())) with check (brand_id in (select public.my_brand_ids()));
exception when duplicate_object then null; end $$;

-- ════════════════════════════════════════════════════════════
-- TABLE: messages
-- ════════════════════════════════════════════════════════════
create table if not exists public.messages (
  id               uuid               primary key default gen_random_uuid(),
  conversation_id  uuid               not null references public.conversations (id) on delete cascade,
  brand_id         uuid               not null references public.brands (id) on delete cascade,
  role             public.message_role not null,
  author_id        uuid               references public.profiles (id) on delete set null,
  content          text               not null,
  metadata_json    jsonb              not null default '{}',
  created_at       timestamptz        not null default now()
);

create index if not exists messages_conversation_idx on public.messages (conversation_id);
create index if not exists messages_brand_idx        on public.messages (brand_id);
create index if not exists messages_created_at_idx   on public.messages (conversation_id, created_at);
alter table public.messages enable row level security;

do $$ begin
  create policy "messages: member can select" on public.messages for select using (brand_id in (select public.my_brand_ids()));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "messages: member can insert" on public.messages for insert with check (brand_id in (select public.my_brand_ids()));
exception when duplicate_object then null; end $$;

-- ════════════════════════════════════════════════════════════
-- TABLE: ai_reply_logs
-- ════════════════════════════════════════════════════════════
create table if not exists public.ai_reply_logs (
  id                  uuid                  primary key default gen_random_uuid(),
  brand_id            uuid                  not null references public.brands (id) on delete cascade,
  conversation_id     uuid                  not null references public.conversations (id) on delete cascade,
  prompt_messages     jsonb                 not null default '[]',
  policy_ids_used     uuid[]                not null default '{}',
  generated_draft     text                  not null default '',
  model_id            text                  not null default '',
  prompt_tokens       integer,
  completion_tokens   integer,
  status              public.ai_reply_status not null default 'draft',
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

do $$ begin
  create policy "ai_logs: member can select" on public.ai_reply_logs for select using (brand_id in (select public.my_brand_ids()));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "ai_logs: member can insert" on public.ai_reply_logs for insert with check (brand_id in (select public.my_brand_ids()));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "ai_logs: member can update own draft" on public.ai_reply_logs for update
  using (brand_id in (select public.my_brand_ids())) with check (brand_id in (select public.my_brand_ids()));
exception when duplicate_object then null; end $$;
