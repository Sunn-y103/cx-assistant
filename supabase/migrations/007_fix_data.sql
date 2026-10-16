-- =============================================================================
-- 007_fix_data.sql
-- Purpose  : (1) Remove duplicate Brand Three policies; keep exactly four
--                per-brand entries (Returns, Shipping, General, Cancellation).
--            (2) Add Brand Three Cancellation Policy (missing 4th entry).
--            (3) Correct historical message sender_type values derived from
--                the existing role column.
-- Rules    : Idempotent -- safe to apply more than once. Never edits 001-006.
--            Never hardcodes an auth user ID.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- PART 1: Remove duplicate Brand Three policies
-- The second INSERT in 006 produced rows with deterministic UUIDs
-- (a1000001-0000-0000-0000-00000000000{9,10,11}).
-- The first INSERT (random UUIDs from 003/004) are the canonical rows.
-- We delete only the three known duplicates.
-- ---------------------------------------------------------------------------

DELETE FROM brand_policies
WHERE id IN (
  'a1000001-0000-0000-0000-000000000009',
  'a1000001-0000-0000-0000-000000000010',
  'a1000001-0000-0000-0000-000000000011'
);

-- ---------------------------------------------------------------------------
-- PART 2: Add Brand Three Cancellation Policy (4th entry for brand 3)
-- Guarded by NOT EXISTS to remain idempotent.
-- ---------------------------------------------------------------------------

INSERT INTO brand_policies (id, brand_id, title, category, content, is_active)
SELECT
  'b3000001-0000-0000-0000-000000000001',
  'b1000000-0000-0000-0000-000000000003',
  'Brand Three Cancellation Policy',
  'general',
  'Orders placed with Brand Three can be cancelled within 24 hours of purchase at no charge. After 24 hours, cancellations are not accepted if the item has already been dispatched. To cancel, contact support with your order number. Refunds for eligible cancellations are processed within 5-7 business days to the original payment method.',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM brand_policies
  WHERE brand_id = 'b1000000-0000-0000-0000-000000000003'
    AND title = 'Brand Three Cancellation Policy'
);

-- ---------------------------------------------------------------------------
-- PART 3: Fix historical message sender_type values
-- All seeded messages had sender_type = ''agent'' regardless of role.
-- Correct rule: role = ''customer'' -> sender_type = ''customer''
-- Messages created by the UI with source = ''customer'' already correct.
-- ---------------------------------------------------------------------------

UPDATE messages
SET sender_type = 'customer'
WHERE role = 'customer'
  AND sender_type <> 'customer';

-- ---------------------------------------------------------------------------
-- PART 4: Verification selects (output appears in migration log)
-- ---------------------------------------------------------------------------

-- Expected: each brand_id shows exactly 4
SELECT brand_id, COUNT(*) AS policy_count
FROM brand_policies
GROUP BY brand_id
ORDER BY brand_id;

-- Expected: 0 remaining mismatches
SELECT COUNT(*) AS remaining_mismatches
FROM messages
WHERE role = 'customer'
  AND sender_type <> 'customer';
