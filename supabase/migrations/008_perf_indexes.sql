-- ============================================================
-- 008_perf_indexes.sql
-- Recommended composite index for descending audit log queries on ai_generations.
-- Note: messages(conversation_id, created_at) is already indexed by messages_created_at_idx (002)
-- and ai_generations(conversation_id) is already indexed by ai_generations_conv_idx (004).
-- ============================================================

CREATE INDEX IF NOT EXISTS ai_generations_conv_created_desc_idx
  ON public.ai_generations (conversation_id, created_at DESC);
