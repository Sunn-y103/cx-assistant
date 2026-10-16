-- ============================================================
-- 003_seed_data.sql
-- Seed demo data for Datastraw CX Assistant:
--   • 3 Brands (AquaHome, GlowCare, Brand Three)
--   • 11 Knowledge Base Policies
--   • 5 Sample Customers
--   • 5 Sample Orders (with valid hex UUIDs a1000001-...)
--   • 5 Sample Conversations (with valid hex UUIDs d1000001-...)
--   • Initial Messages
-- Fully idempotent with ON CONFLICT DO NOTHING.
-- Does not hardcode auth user IDs.
-- ============================================================

-- ── 1. Demo Brands ───────────────────────────────────────────
insert into public.brands (id, slug, name, website) values
  ('b1000000-0000-0000-0000-000000000001', 'aquahome',   'AquaHome',   'https://aquahome.example.com'),
  ('b1000000-0000-0000-0000-000000000002', 'glowcare',   'GlowCare',   'https://glowcare.example.com'),
  ('b1000000-0000-0000-0000-000000000003', 'brandthree', 'Brand Three', 'https://brandthree.example.com')
on conflict (slug) do nothing;

-- ── 2. Knowledge-base Policies ───────────────────────────────

-- AquaHome policies
insert into public.brand_policies (id, brand_id, title, category, content) values
('a1000001-0000-0000-0000-000000000001',
 'b1000000-0000-0000-0000-000000000001',
 'AquaHome Returns Policy',
 'returns',
 'AquaHome accepts returns within 30 days of delivery for unused items in original packaging. To initiate a return, contact support with your order number. Refunds are processed within 5–7 business days after we receive the item. Items marked Final Sale are non-returnable. Shipping costs for returns are covered by AquaHome if the item is defective; otherwise the customer bears return shipping costs.'),

('a1000001-0000-0000-0000-000000000002',
 'b1000000-0000-0000-0000-000000000001',
 'AquaHome Shipping Policy',
 'shipping',
 'AquaHome ships to all 50 US states and Canada. Standard shipping (5–7 business days) is free on orders over $75. Expedited shipping (2–3 business days) costs $12.99. Overnight delivery is available for $24.99 on orders placed before 12:00 PM EST. Orders ship Monday–Friday excluding public holidays. A tracking number is emailed once the order is dispatched.'),

('a1000001-0000-0000-0000-000000000003',
 'b1000000-0000-0000-0000-000000000001',
 'AquaHome Warranty Policy',
 'warranties',
 'All AquaHome appliances carry a 2-year limited warranty covering manufacturing defects. Accidental damage, misuse, and normal wear and tear are not covered. To file a warranty claim, submit your proof of purchase and a description of the defect via the support portal. Approved claims are fulfilled with a replacement unit or store credit at our discretion.'),

('a1000001-0000-0000-0000-000000000004',
 'b1000000-0000-0000-0000-000000000001',
 'AquaHome Billing & Payment',
 'billing',
 'AquaHome accepts Visa, Mastercard, American Express, Discover, and PayPal. Orders are charged at the time of shipment, not at checkout. Sales tax is applied based on the delivery address. For subscription orders, billing recurs on the same day each month; cancellation can be made any time before the next billing cycle.')
on conflict (id) do nothing;

-- GlowCare policies
insert into public.brand_policies (id, brand_id, title, category, content) values
('a1000001-0000-0000-0000-000000000005',
 'b1000000-0000-0000-0000-000000000002',
 'GlowCare Returns & Refunds',
 'returns',
 'GlowCare offers a 14-day satisfaction guarantee. Unopened products in original condition may be returned for a full refund. Opened skincare products are eligible for store credit only, due to hygiene regulations. Return shipping labels are provided free of charge for all eligible returns. Refunds are credited within 3–5 business days.'),

('a1000001-0000-0000-0000-000000000006',
 'b1000000-0000-0000-0000-000000000002',
 'GlowCare Shipping Policy',
 'shipping',
 'GlowCare ships worldwide. Domestic orders (US) qualify for free standard shipping on purchases over $50. International orders ship via DHL Express (7–14 business days) with a flat $18 fee. Customs duties and import taxes are the responsibility of the customer. All orders receive a tracking number within 24 hours of dispatch.'),

('a1000001-0000-0000-0000-000000000007',
 'b1000000-0000-0000-0000-000000000002',
 'GlowCare Ingredient Safety & Allergens',
 'general',
 'GlowCare products are dermatologist-tested, cruelty-free, and free from parabens, sulphates, and artificial fragrances. Full ingredient lists appear on each product page. If a customer experiences an adverse reaction, they should discontinue use immediately and consult a healthcare provider. GlowCare is not liable for reactions due to known personal allergies that the customer did not disclose.'),

('a1000001-0000-0000-0000-000000000008',
 'b1000000-0000-0000-0000-000000000002',
 'GlowCare Subscription & Auto-Replenishment',
 'billing',
 'GlowCare''s Subscribe & Save program offers 15% off and free shipping on recurring orders. Subscriptions can be paused, skipped, or cancelled at any time from the customer account dashboard. Cancellations must be made at least 24 hours before the next scheduled shipment to avoid being charged for that cycle.')
on conflict (id) do nothing;

-- Brand Three policies
insert into public.brand_policies (id, brand_id, title, category, content) values
('a1000001-0000-0000-0000-000000000009',
 'b1000000-0000-0000-0000-000000000003',
 'Brand Three Returns Policy',
 'returns',
 'Brand Three accepts returns within 21 days of purchase. Items must be unused and in original packaging. A 10% restocking fee applies to orders over $200. Digital and downloadable products are non-refundable. Approved refunds are processed within 7–10 business days.'),

('a1000001-0000-0000-0000-000000000010',
 'b1000000-0000-0000-0000-000000000003',
 'Brand Three Standard Shipping',
 'shipping',
 'Brand Three ships domestically via UPS and FedEx. Standard shipping (4–6 business days) costs $6.99; free on orders over $60. Express shipping (1–2 business days) is $18.99. International shipping is not currently available. PO boxes are not supported.'),

('a1000001-0000-0000-0000-000000000011',
 'b1000000-0000-0000-0000-000000000003',
 'Brand Three General FAQ',
 'general',
 'Brand Three products are manufactured in the United States and comply with all applicable federal safety standards. For bulk or wholesale inquiries, email wholesale@brandthree.example.com. Our support team is available Monday–Friday, 9 AM–6 PM EST.')
on conflict (id) do nothing;


-- ── 3. Sample Customers ──────────────────────────────────────
insert into public.customers (id, brand_id, email, full_name, phone) values
('c1000001-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'alice.demo@example.com', 'Alice Demo', '+1-555-0101'),
('c1000001-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000001', 'bob.demo@example.com', 'Bob Demo', '+1-555-0102'),
('c1000001-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000002', 'carol.demo@example.com', 'Carol Demo', '+1-555-0103'),
('c1000001-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000002', 'dan.demo@example.com', 'Dan Demo', '+1-555-0104'),
('c1000001-0000-0000-0000-000000000005', 'b1000000-0000-0000-0000-000000000003', 'eve.demo@example.com', 'Eve Demo', '+1-555-0105')
on conflict (brand_id, email) do nothing;


-- ── 4. Sample Orders ─────────────────────────────────────────
insert into public.orders (id, brand_id, customer_id, order_number, status, total_amount, currency, items_json) values
('a1000001-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'c1000001-0000-0000-0000-000000000001', 'AH-2024-00123', 'delivered', 149.99, 'USD', '[{"sku":"AH-FILTER-PRO","name":"AquaHome Pro Filter","qty":2,"unit_price":74.99}]'),
('a1000001-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000001', 'c1000001-0000-0000-0000-000000000002', 'AH-2024-00124', 'shipped', 89.00, 'USD', '[{"sku":"AH-PURIFIER-S","name":"AquaHome Smart Purifier","qty":1,"unit_price":89.00}]'),
('a1000001-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000002', 'c1000001-0000-0000-0000-000000000003', 'GC-2024-00456', 'delivered', 67.50, 'USD', '[{"sku":"GC-SERUM-VITAMIN-C","name":"GlowCare Vitamin C Serum","qty":1,"unit_price":42.50},{"sku":"GC-MOISTURIZER","name":"GlowCare Daily Moisturizer","qty":1,"unit_price":25.00}]'),
('a1000001-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000002', 'c1000001-0000-0000-0000-000000000004', 'GC-2024-00457', 'cancelled', 34.00, 'USD', '[{"sku":"GC-TONER","name":"GlowCare Balancing Toner","qty":2,"unit_price":17.00}]'),
('a1000001-0000-0000-0000-000000000005', 'b1000000-0000-0000-0000-000000000003', 'c1000001-0000-0000-0000-000000000005', 'BT-2024-00789', 'processing', 210.00, 'USD', '[{"sku":"BT-STARTER-KIT","name":"Brand Three Starter Kit","qty":1,"unit_price":210.00}]')
on conflict (brand_id, order_number) do nothing;


-- ── 5. Sample Conversations & Messages ───────────────────────
insert into public.conversations (id, brand_id, customer_id, order_id, subject, status, channel) values
('d1000001-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'c1000001-0000-0000-0000-000000000001', 'a1000001-0000-0000-0000-000000000001', 'Filter replacement inquiry', 'open', 'chat'),
('d1000001-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000001', 'c1000001-0000-0000-0000-000000000002', 'a1000001-0000-0000-0000-000000000002', 'Tracking number not received', 'pending', 'email'),
('d1000001-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000002', 'c1000001-0000-0000-0000-000000000003', 'a1000001-0000-0000-0000-000000000003', 'Vitamin C Serum caused skin irritation', 'open', 'chat'),
('d1000001-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000002', 'c1000001-0000-0000-0000-000000000004', 'a1000001-0000-0000-0000-000000000004', 'Request refund for cancelled order', 'resolved', 'email'),
('d1000001-0000-0000-0000-000000000005', 'b1000000-0000-0000-0000-000000000003', 'c1000001-0000-0000-0000-000000000005', 'a1000001-0000-0000-0000-000000000005', 'Order processing delay — Starter Kit', 'open', 'widget')
on conflict (id) do nothing;

-- Messages for conversation 1 (AquaHome — Alice)
insert into public.messages (id, conversation_id, brand_id, role, content) values
('f1000001-0000-0000-0000-000000000001', 'd1000001-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'customer', 'Hi! My AquaHome Pro Filter (order AH-2024-00123) arrived last week. How often should I replace the filter cartridge?'),
('f1000001-0000-0000-0000-000000000002', 'd1000001-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'bot', 'Hello Alice! Great question. AquaHome Pro Filter cartridges should be replaced every 6 months under normal household usage. If your water has a particularly high mineral content, we recommend checking every 4 months. Is there anything else I can help with?'),
('f1000001-0000-0000-0000-000000000003', 'd1000001-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'customer', 'Thanks! Also, the replacement packs — are they covered under the warranty?')
on conflict (id) do nothing;

-- Messages for conversation 2 (AquaHome — Bob)
insert into public.messages (id, conversation_id, brand_id, role, content) values
('f1000001-0000-0000-0000-000000000004', 'd1000001-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000001', 'customer', 'I placed order AH-2024-00124 three days ago but I have not received a tracking number. The website says it shipped. Can you help?'),
('f1000001-0000-0000-0000-000000000005', 'd1000001-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000001', 'agent', 'Hi Bob, apologies for the delay. I can see your order has shipped via UPS. Your tracking number is 1Z999AA10123456784. It should arrive by Thursday.')
on conflict (id) do nothing;

-- Messages for conversation 3 (GlowCare — Carol)
insert into public.messages (id, conversation_id, brand_id, role, content) values
('f1000001-0000-0000-0000-000000000006', 'd1000001-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000002', 'customer', 'I started using the Vitamin C Serum from order GC-2024-00456 two days ago and I notice some redness on my cheeks. Is this normal?'),
('f1000001-0000-0000-0000-000000000007', 'd1000001-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000002', 'bot', 'Hi Carol! Mild redness during the first few days of using a Vitamin C serum is common as skin adjusts to the active ingredient. We recommend applying a thin layer every other day initially, then building up to daily use. If redness persists beyond a week or worsens, please discontinue use and consult a dermatologist. We''re happy to issue store credit if the product doesn''t suit your skin.')
on conflict (id) do nothing;

-- Messages for conversation 4 (GlowCare — Dan)
insert into public.messages (id, conversation_id, brand_id, role, content) values
('f1000001-0000-0000-0000-000000000008', 'd1000001-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000002', 'customer', 'My order GC-2024-00457 was cancelled. I was charged $34. When will I get my refund?'),
('f1000001-0000-0000-0000-000000000009', 'd1000001-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000002', 'agent', 'Hi Dan, your refund of $34.00 was processed on our end today. It typically takes 3–5 business days to appear on your statement depending on your bank. Please don''t hesitate to reach out if it hasn''t arrived by then!'),
('f1000001-0000-0000-0000-000000000010', 'd1000001-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000002', 'customer', 'Perfect, thank you!')
on conflict (id) do nothing;

-- Messages for conversation 5 (Brand Three — Eve)
insert into public.messages (id, conversation_id, brand_id, role, content) values
('f1000001-0000-0000-0000-000000000011', 'd1000001-0000-0000-0000-000000000005', 'b1000000-0000-0000-0000-000000000003', 'customer', 'My order BT-2024-00789 has been in "processing" for 5 days. This is a gift — I need it by Friday. What can you do?'),
('f1000001-0000-0000-0000-000000000012', 'd1000001-0000-0000-0000-000000000005', 'b1000000-0000-0000-0000-000000000003', 'bot', 'Hi Eve, I''m sorry for the delay! I can see order BT-2024-00789 is still in our fulfilment queue. I am escalating this to our warehouse team right now and will update you within the hour. We''ll do everything we can to meet your Friday deadline.')
on conflict (id) do nothing;


