/**
 * database.ts
 * TypeScript interfaces that mirror the Supabase schema defined in
 * supabase/migrations/001_initial_schema.sql.
 *
 * Rules:
 *  - Every column is represented as a typed field.
 *  - Nullable columns use `| null`.
 *  - Timestamps are ISO-8601 strings (what Supabase returns over the REST API).
 *  - JSONB columns are typed with their expected shape, falling back to `unknown`.
 *  - Enum types are exported as union-string types.
 */

// ── Enum types ────────────────────────────────────────────────

export type ConversationStatus = 'open' | 'pending' | 'resolved' | 'closed'
export type MessageChannel     = 'email' | 'chat' | 'widget'
export type MessageRole        = 'customer' | 'agent' | 'bot'
export type PolicyCategory     = 'returns' | 'shipping' | 'billing' | 'warranties' | 'general'
export type AiReplyStatus      = 'draft' | 'accepted' | 'rejected' | 'sent'
export type OrderStatus        = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded'
export type MembershipRole     = 'owner' | 'admin' | 'agent' | 'viewer'

// ── profiles ─────────────────────────────────────────────────

export interface Profile {
  id:         string        // uuid — matches auth.users.id
  email:      string
  full_name:  string
  avatar_url: string | null
  created_at: string        // timestamptz as ISO-8601
  updated_at: string
}

// ── brands ───────────────────────────────────────────────────

export interface Brand {
  id:         string
  slug:       string        // URL-safe unique identifier
  name:       string
  logo_url:   string | null
  website:    string | null
  created_at: string
  updated_at: string
}

// ── brand_memberships ─────────────────────────────────────────

export interface BrandMembership {
  id:         string
  brand_id:   string
  user_id:    string
  role:       MembershipRole
  created_at: string
}

// Convenience type used when fetching memberships with joined brand data
export interface BrandMembershipWithBrand extends BrandMembership {
  brands: Brand
}

// ── brand_policies (knowledge base) ──────────────────────────

export interface BrandPolicy {
  id:         string
  brand_id:   string
  title:      string
  content:    string
  category:   PolicyCategory
  is_active:  boolean
  created_at: string
  updated_at: string
}

// ── customers ─────────────────────────────────────────────────

export interface Customer {
  id:         string
  brand_id:   string
  email:      string
  full_name:  string
  phone:      string | null
  notes:      string | null
  created_at: string
  updated_at: string
}

// ── orders ───────────────────────────────────────────────────

export interface OrderLineItem {
  sku:        string
  name:       string
  qty:        number
  unit_price: number
}

export interface Order {
  id:           string
  brand_id:     string
  customer_id:  string
  order_number: string
  status:       OrderStatus
  total_amount: number       // numeric(10,2) comes back as number from Supabase JS client
  currency:     string       // ISO 4217, e.g. 'USD'
  items_json:   OrderLineItem[]
  notes:        string | null
  ordered_at:     string
  delivery_date?: string | null
  created_at:     string
  updated_at:     string
}

// ── conversations ─────────────────────────────────────────────

export interface Conversation {
  id:              string
  brand_id:        string
  customer_id:     string
  order_id:        string | null
  subject:         string
  status:          ConversationStatus
  channel:         MessageChannel
  assigned_to:     string | null     // profiles.id
  created_at:      string
  updated_at:      string
  last_message_at: string
}

// Enriched read-model used by the UI (joined data from the API)
export interface ConversationWithDetails extends Conversation {
  customers:  Customer
  orders:     Order | null
  profiles:   Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null
}

// ── messages ──────────────────────────────────────────────────

export interface MessageMetadata {
  attachment_urls?: string[]
  read_at?:        string | null
  [key: string]:   unknown
}

export interface Message {
  id:              string
  conversation_id: string
  brand_id:        string
  role:            MessageRole
  sender_type?:    'customer' | 'agent' | string
  source?:         'customer' | 'ai_approved' | 'manual' | string
  author_id:       string | null    // profiles.id (null for customer / bot messages)
  content:         string
  metadata_json:   MessageMetadata
  created_at:      string
}

// ── ai_reply_logs (legacy / compatibility) ───────────────────

export interface AiPromptMessage {
  role:    'system' | 'user' | 'assistant'
  content: string
}

export interface AiReplyLog {
  id:                 string
  brand_id:           string
  conversation_id:    string
  prompt_messages:    AiPromptMessage[]
  policy_ids_used:    string[]       // uuid[]
  generated_draft:    string
  model_id:           string         // e.g. "openai/gpt-4o-mini"
  prompt_tokens:      number | null
  completion_tokens:  number | null
  status:             AiReplyStatus
  triggered_by:       string | null  // profiles.id
  created_at:         string
  updated_at:         string
}

// ── ai_generations (Part 1 assessment) ────────────────────────

export interface AiGenerationSnippet {
  id:          string
  title:       string
  policy_type: string
  category?:   string
  brand?:      string
  content:     string
}

export interface AiGeneration {
  id:                  string
  conversation_id:     string
  brand_id:            string
  trigger_message_id:  string | null
  customer_message:    string
  retrieved_context:   AiGenerationSnippet[]
  ai_response:         string
  status:              'ok' | 'needs_review' | 'no_knowledge' | 'approved'
  reason:              string | null
  model:               string
  prompt_tokens:       number | null
  completion_tokens:   number | null
  latency_ms:          number | null
  edited_response:     string | null
  final_response:      string | null
  final_message_id:    string | null
  approved_by:         string | null
  approved_at:         string | null
  created_at:          string
}

// ── Edge Function request / response shapes ───────────────────

export interface AiReplyRequest {
  conversation_id: string
  brand_id?:       string
  action?:         'suggest' | 'regenerate' | 'policy_check'
}

export interface AiReplyResponse {
  generation_id:                string
  draft:                        string
  snippets:                     AiGenerationSnippet[]
  status:                       'ok' | 'needs_review' | 'no_knowledge'
  reason:                       string | null
  // Compatibility fields
  log_id?:                      string
  model?:                       string
  sources?:                     string[]
  requires_human_verification?: boolean
  verification_reason?:         string | null
  confidence_score?:            number
}

