# Datastraw CX Reply Assistant

> AI-powered Customer Experience Reply Assistant — Datastraw Technologies Hiring Assignment

## Tech Stack

| Layer        | Technology                                     |
|--------------|------------------------------------------------|
| Frontend     | React 19 + TypeScript + Vite 8                 |
| Styling      | Tailwind CSS v4 (`@tailwindcss/vite`)          |
| Routing      | React Router v7                                |
| Backend/DB   | Supabase (Postgres + Auth + Row Level Security)|
| AI Engine    | OpenRouter LLM + Supabase Edge Functions       |
| Deployment   | Netlify (frontend) + Supabase Cloud (backend)  |

---

## Architecture & Security (Phase 5: Secure AI Reply Generation)

The AI assistant utilizes a server-side **Supabase Edge Function** (`generate-reply`) integrated with **OpenRouter**:

1. **Authentication & Multi-Tenant Authorization:**
   - Every request verifies the agent's identity via JWT.
   - Enforces brand isolation through `brand_memberships` table lookups and Row Level Security (RLS). Agents cannot request drafts or access policies for unauthorized brands.
2. **Relevance-Matched Policy Retrieval:**
   - Extracts customer inquiry keywords, intent categories (Returns, Shipping, Billing, Warranties), and order context.
   - Retrieves only the top 2–3 most relevant active brand policies, avoiding token bloat and preventing knowledge base leakage.
3. **Safety & Grounding:**
   - Strict system grounding: The model is prohibited from inventing refunds, delivery dates, tracking numbers, or policy exceptions.
   - Customer messages are treated strictly as untrusted user input, neutralizing prompt injection attacks.
   - If policies do not contain the answer, the model flags `requires_human_verification: true` with a clear explanation.
   - **Never auto-sends**: The generated draft is presented in a subtle blue/neutral review panel for the agent to review, edit, and manually send.
4. **Audit Logging:**
   - Every generation is recorded in `public.ai_reply_logs` (brand, conversation, prompt messages, policy IDs referenced, draft, model, token usage, and status).
5. **Zero Secret Leakage:**
   - `OPENROUTER_API_KEY` and service-role keys are kept strictly server-side in Supabase Edge Function secrets. No provider secrets are ever bundled into client code.

---

## OpenRouter & Supabase Edge Function Setup

### 1. Set the OpenRouter Secret in Supabase

Run the following command using the Supabase CLI:

```bash
# Set OpenRouter API key in your Supabase project secrets
supabase secrets set OPENROUTER_API_KEY=sk-or-v1-your-key-here

# (Optional) Configure default LLM model
supabase secrets set OPENROUTER_MODEL=google/gemini-2.5-flash
```

Or configure via the Supabase Dashboard:
1. Navigate to **Project Settings** → **Edge Functions** → **Secrets**.
2. Add a new secret named `OPENROUTER_API_KEY` with your OpenRouter API key.
3. (Optional) Add `OPENROUTER_MODEL` (e.g. `google/gemini-2.5-flash` or `openai/gpt-4o-mini`).

### 2. Deploy the Edge Function

```bash
supabase functions deploy generate-reply --no-verify-jwt
```

---

## Local Development Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from your Supabase Dashboard
```

### 3. Run Development Server

```bash
npm run dev
```

App will be available at **http://localhost:5173**

### 4. Production Build & Verification

```bash
npm run build        # Typecheck & Vite production build
npm run preview      # Preview production build locally
```

---

## Project Structure

```
datastraw_cx_assistant/
├── src/
│   ├── components/
│   │   ├── layout/                  # Sidebar, AppShell, Header
│   │   ├── conversation/            # ConversationList, MessageThread, CustomerPanel
│   │   ├── reply/                   # ReplyComposer (with AI draft panel & controls)
│   │   └── knowledge-base/          # PolicyCard, PolicyFormModal, PolicyDetailModal
│   ├── pages/
│   │   ├── InboxPage.tsx            # 3-column CX inbox & active thread
│   │   ├── KnowledgeBasePage.tsx    # Multi-brand policy manager
│   │   └── LoginPage.tsx            # Supabase Auth login
│   ├── services/
│   │   ├── conversations.ts         # Conversation and message service
│   │   ├── policies.ts              # Knowledge base policy service
│   │   └── ai.ts                    # Edge Function & AI reply service
│   ├── types/
│   │   └── database.ts              # Typed database & AI interfaces
│   ├── context/
│   │   └── BrandContext.tsx         # Active brand state & switcher
│   └── index.css                    # Design system tokens & Tailwind v4
├── supabase/
│   ├── functions/
│   │   └── generate-reply/index.ts  # OpenRouter-backed AI generator Edge Function
│   └── migrations/
│       └── 001_initial_schema.sql   # Postgres schema, RLS policies, audit logs
├── .env.example                     # Safe environment variable template
├── CLAUDE.md                        # Standing UI spacing & architecture rules
├── vite.config.ts
└── package.json
```
