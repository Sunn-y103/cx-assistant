-- ============================================================
-- 006_clean_policies.sql
-- Ensure each brand gets EXACTLY four entries: Return, Refund, Shipping, Cancellation.
-- Values must differ clearly as specified in Part 1.
-- ============================================================

-- Clean old duplicate/extraneous policies for the two brands
delete from public.brand_policies
where brand_id in (
  'b1000000-0000-0000-0000-000000000001', -- AquaHome
  'b1000000-0000-0000-0000-000000000002'  -- GlowCare
);

-- ── 1. AquaHome: Exactly four entries ────────────────────────
-- Policy 1: Return (within 14 days)
insert into public.brand_policies (id, brand_id, title, category, content, is_active) values
('b1000001-0000-0000-0000-000000000001',
 'b1000000-0000-0000-0000-000000000001',
 'Return Policy',
 'returns',
 'AquaHome accepts returns within 14 days of delivery. Items must be unused and in original packaging.',
 true);

-- Policy 2: Refund (7 days, damaged items replaced free if reported within 48 hours with a photo)
insert into public.brand_policies (id, brand_id, title, category, content, is_active) values
('b1000001-0000-0000-0000-000000000002',
 'b1000000-0000-0000-0000-000000000001',
 'Refund Policy',
 'returns',
 'AquaHome offers a full refund within 7 days of delivery. Damaged items are replaced free if reported within 48 hours with a photo. Refunds are not permitted after 7 days.',
 true);

-- Policy 3: Shipping (3-5 business days)
insert into public.brand_policies (id, brand_id, title, category, content, is_active) values
('b1000001-0000-0000-0000-000000000003',
 'b1000000-0000-0000-0000-000000000001',
 'Shipping Policy',
 'shipping',
 'AquaHome orders are delivered within 3-5 business days. Tracking details are emailed upon shipment.',
 true);

-- Policy 4: Cancellation (only before dispatch)
insert into public.brand_policies (id, brand_id, title, category, content, is_active) values
('b1000001-0000-0000-0000-000000000004',
 'b1000000-0000-0000-0000-000000000001',
 'Cancellation Policy',
 'general',
 'AquaHome allows order cancellation only before dispatch. Once an order has dispatched, it cannot be cancelled and must be returned following the return process.',
 true);


-- ── 2. Second Brand (GlowCare): Exactly four entries ─────────
-- Policy 1: Return (within 45 days)
insert into public.brand_policies (id, brand_id, title, category, content, is_active) values
('b1000002-0000-0000-0000-000000000001',
 'b1000000-0000-0000-0000-000000000002',
 'Return Policy',
 'returns',
 'GlowCare accepts returns within 45 days of delivery for any product, opened or unopened.',
 true);

-- Policy 2: Refund (within 30 days, damaged items refunded or replaced at customer choice within 7 days)
insert into public.brand_policies (id, brand_id, title, category, content, is_active) values
('b1000002-0000-0000-0000-000000000002',
 'b1000000-0000-0000-0000-000000000002',
 'Refund Policy',
 'returns',
 'GlowCare provides a full refund within 30 days of delivery. Damaged items are refunded or replaced at the customer''s choice within 7 days of delivery.',
 true);

-- Policy 3: Shipping (7-10 business days)
insert into public.brand_policies (id, brand_id, title, category, content, is_active) values
('b1000002-0000-0000-0000-000000000003',
 'b1000000-0000-0000-0000-000000000002',
 'Shipping Policy',
 'shipping',
 'GlowCare standard delivery takes 7-10 business days across all regions.',
 true);

-- Policy 4: Cancellation (within 24 hours of ordering)
insert into public.brand_policies (id, brand_id, title, category, content, is_active) values
('b1000002-0000-0000-0000-000000000004',
 'b1000000-0000-0000-0000-000000000002',
 'Cancellation Policy',
 'general',
 'GlowCare allows order cancellation within 24 hours of ordering. After 24 hours, processing begins and cancellation is no longer possible.',
 true);
