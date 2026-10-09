# Live support: AI → human handoff

**Status:** proposed, awaiting team review
**Date:** 2026-10-02
**Audience:** the Jumpa engineering + ops team
**Supersedes:** v1 of this document (single-thread model, generic 24h promise)

---

## 1. Why

Today the AI support agent is the whole of support. When it cannot help, rule 10 of
`lib/ai/support-agent.ts` tells the user to join a **public WhatsApp group** where
"founders and senior community managers handle direct complaints".

That is the thing to fix first, and it is worse than an unanswered ticket:

- A user with a failed deposit posts their reference code and amount into a group chat
  with strangers in it. That is customer data leaving our control.
- There is no ticket, no owner, no clock. Nothing can be measured or chased.
- The user has to leave the app, install or open WhatsApp, and re-explain everything.
- Founders are the escalation tier. That does not scale past the first hundred users.

We also looked at how Grey (app.grey.co) does it, since they are a Nigerian fintech
solving the same problem at a larger size. Section 3 is what we take, what we improve,
and what we deliberately do differently.

## 2. What already exists

| Piece | State | Where |
| --- | --- | --- |
| AI support agent | Built | `lib/ai/support-agent.ts`, `app/api/support-agent/route.ts` |
| Transcript persistence | Built, **one thread per user** | `models/SupportChatLog.ts`, `lib/functions/supportChatFunctions.ts` |
| Support chat UI | Built, no polling | `components/support/support-chat.tsx` |
| FAQ content | Built, 5 entries, unsigned-off | `FAQS` in `lib/support.ts` |
| Image understanding on attachments | Built | `analyzeImageWithGemini` |
| In-app notifications | Built | `models/Notification.ts` |
| Transactional email (Resend) | Built | `lib/email-notifications.ts` |
| Cron pattern | Built | `app/api/cron/resolve-transactions` |
| Transaction detail data | Built | `getTransactionById`, `formatDbTransaction`, `detailRows` |
| **Admin / agent side** | **Does not exist** | — |
| **`role` on User** | **Does not exist** | `models/User.ts` |
| **Realtime (ws / SSE / push)** | **Does not exist** | — |

So this is not "add a handoff". It is building the human half of support. That is why
section 15 phases it.

## 3. What we take from Grey, and where we beat it

### Take

| Grey does | Why it works | Jumpa |
| --- | --- | --- |
| The bot names itself and promises the human in its first line — *"This is Ava from Grey. I'm here to answer your questions, but you'll always have the option to talk to our team."* | Kills the "am I trapped with a robot" anxiety before it starts | Same opening, plus a permanent **Talk to a human** control in the header |
| An inbox of past conversations, each with its own subject — "Card Not Loading", "Failed Deposit Refund" | A ticket you can find again, and a history the agent can read | One ticket per issue + a Messages list (§4) |
| Guided triage chips before free text — Individual Account → Virtual cards → Card Transaction | Categorises deterministically, no LLM classification to get wrong | Reuse the existing chip pattern (§7) |
| Numbered citations ① ② on AI answers | Auditable, and the user can go read the source | Phase 2 — `FAQS` is only 5 entries, too thin to cite yet |
| Deflection articles while waiting | Dead time becomes useful; some users self-resolve | From `FAQS` (§8) |
| *"Abdul joined the conversation"* system line with avatar | The handover is visible, so the user stops wondering | Same |
| States a real first-reply number and names the email — *"usual reply time is under 20 minutes. You'll get replies here and to &lt;email&gt;"* | A number you can hold us to, and the user knows they can close the tab | Same, but **computed**, not hardcoded (§9) |
| A per-conversation rating attributed to the individual agent | The only way to know whether any of this is working | Phase 2 (§15) |

### Beat

Each of these is a specific failure visible in Grey's own transcripts.

| Grey's failure | What we do instead |
| --- | --- |
| The agent opened with *"kindly inform me of how best i can be of help"* — with the full transcript sitting right above it. The user had to re-explain. | The dashboard opens on an **AI-written summary** plus the attached transaction and the user's context. An agent who asks the user to repeat themselves has had that information withheld from them, which is a bug in our tooling, not their manners. |
| The AI told a user to contact their bank about a failed deposit. A human later found it had already been reversed, with a session ID. The AI gave confident, wrong guidance on someone's money. | **The AI reads the actual transaction** before saying anything about it, and may never give resolution guidance on a money issue — those escalate (§7). |
| The user had to type *"hello??"* and then *"direct me to someone pls"* before escalation fired. | Three triggers (§7), one of which is a control that is always on screen. Asking once is enough; asking twice should be impossible. |
| *"under 20 minutes"*, and the thread then shows a nine-month gap with nothing acknowledging the breach. | `slaDueAt` is stamped on the ticket and a cron sweep **writes into the thread** when it is missed (§9). A promise we cannot keep has to be visibly re-made, not left to rot. |
| The header reads *"Active over 1w ago"*. Stale presence on a support channel reads as abandonment. | Never show last-seen. Show where the ticket stands — claimed, or position in queue. |
| The user screenshotted their transaction details so the agent could read them. The agent hand-typed a session ID back. | **Attach the real transaction** as a structured card with copy buttons (§6). We already have the data and the components; Grey's users are doing manual work we can skip. |
| A floating bubble docked bottom-right over the app. | Our column is 500px and mobile-first — a bubble would cover the content. Instead, support is reachable **in context**: a Get help action on a failed transaction opens a ticket already carrying that transaction. Better than a bubble, and cheaper. |
| Four different agent names across one user's history, with no continuity. | Phase 2: route a reopened ticket back to whoever handled it last, if they are available. |

## 4. The shape: tickets, not one thread

`SupportChatLog` is currently one document per `userId`. That has to become one
document per **ticket**, because:

- A user with a card problem in March and a deposit problem in September has two
  issues, two SLAs and possibly two owners. One rolling thread cannot carry that.
- An agent needs to resolve something. You cannot resolve a thread that never ends.
- The queue is a list of tickets. Without tickets there is nothing to queue.

Two screens, both inside the existing `/support` route (no new top-level route):

```
/support                → Help (unchanged: FAQ rows, Email us, WhatsApp)
/support?view=messages  → Messages: list of this user's tickets
/support?view=chat&t=…  → One ticket's thread
/support?view=chat      → Start a new ticket
```

The `?view=` / `?t=` shape matches how the rest of the app already flattens routes.

Ticket titles are generated from the first user message (Grey does this — "Card Not
Loading"). One cheap LLM call at creation, or the first 40 characters as a fallback.

## 5. The flow end to end

```
USER                          SYSTEM                        TEAM
 |                              |                            |
 | opens /support               |                            |
 |----------------------------->|                            |
 |          triage chips + "you can always reach a human"    |
 |<-----------------------------|                            |
 | picks a category             |                            |
 |----------------------------->|                            |
 |          AI answers, grounded in real account data        |
 |<-----------------------------|                            |
 |                              |                            |
 | "this didn't fix it"         |                            |
 |----------------------------->|                            |
 |                      [escalation fires]                   |
 |                              |                            |
 |          "I'm getting someone from the team."             |
 |          "Usual reply time: ~12 min. Replies here         |
 |           and to you@email.com."                          |
 |          + 3 articles that might help meanwhile           |
 |          + "anything else you can tell me?"               |
 |<-----------------------------|                            |
 |                              |-- Slack ping ------------->|
 |                              |-- dashboard bell --------->|
 |                              |                            |
 |                              |<-- claims ticket ----------|
 |          "Chidi joined the conversation"                  |
 |<-----------------------------|                            |
 |                              |   (agent opens to the AI   |
 |                              |    summary + the attached  |
 |                              |    transaction — does NOT  |
 |                              |    ask the user to repeat) |
 |                              |<-- replies ----------------|
 |<-----------------------------|                            |
 |                              |                            |
 |                        [needs ops/engineering]            |
 |                              |<-- hands to team ----------|
 |          "Taking this to the team. Update within           |
 |           24-48 working hours."                           |
 |          + notification + email, slaDueAt stamped         |
 |<-----------------------------|                            |
 |                              |-- #ops ping -------------->|
 |                              |                            |
 |                              |<-- resolves ---------------|
 |          resolved + "how did Chidi do?" (Phase 2)         |
 |<-----------------------------|                            |
```

## 6. Attach the transaction, don't describe it

This is the single biggest win and it is nearly free. Every primitive exists:

- `getTransactionById` / `formatDbTransaction` / `detailRows` already produce the rows
- `ChatCard`, `CardStats`, `CardTitle`, `CopyButton` already render them in a thread
- `GET /api/transactions/[id]` is already session-scoped

Two entry points:

1. **From the ticket.** A "Attach a transaction" action in the composer opens the
   user's recent transactions; picking one appends a transaction card to the thread.
2. **From the transaction.** A "Get help with this" action on the transaction detail
   screen opens a new ticket with that transaction already attached and the category
   pre-set.

The agent then sees reference, hash, chain, status, amount, counterparty and timings —
all copyable, none of it retyped. The AI sees it too, which is what stops it guessing.

## 7. When escalation fires

Three triggers. Any one of them moves the ticket out of `ai`.

**1. The AI asks for a human.** A tool call, not a regex on its prose:

```ts
escalate_to_human({
  reason: string,      // one sentence the agent will read first
  category: "transaction" | "account" | "kyc" | "card" | "bug" | "other",
  priority: "normal" | "high",
})
```

Wired the same way every other tool is: `lib/ai/tools.ts` → `tool-executor.ts` →
a branch in the route → a rule in the system prompt.

**2. The user asks.** A **Talk to a human** control, always visible in the ticket
header. Not buried in a menu, and never conditional on the AI agreeing.

**3. Deterministic rules.** Evaluated server-side on every user message:

| Condition | Priority |
| --- | --- |
| A transaction is attached and its status is `failed` | high |
| Message contains a tx hash or reference code | high |
| "stuck", "lost", "didn't arrive", "missing", "stolen", "hacked" | high |
| Category is `kyc` or `card` and the AI has answered 3 times without resolution | normal |
| The same question asked three turns running | normal |
| The user says any form of "no" to "did that help?" | normal |

**Rule 10 gets rewritten.** The WhatsApp group stops being the escalation path. It can
stay as a community link on the Help screen; it is not where a complaint goes.

**And the AI goes silent.** While status is `requested`, `live` or `pending`, the AI
does not post to the thread. This is the make-or-break guard in the whole design — an
AI that keeps answering over a human agent is worse than no handoff at all. Enforce it
in `POST /api/support-agent` by reading the ticket status before calling the model, not
in the prompt.

The AI stays useful in the background: it still writes the summary and, in Phase 2,
drafts a reply for the agent to edit. It is the agent's co-pilot, not the user's.

## 8. The waiting room

The gap between "I need a human" and a human arriving is where Grey's user typed
"hello??". Three things fill it:

1. **An honest number.** See §9.
2. **Deflection.** Three `FAQS` entries matching the category, plus a link to the full
   list. Grey's framing is good: *"In the meantime, these articles might help."*
3. **Context collection.** The AI asks for exactly what that category needs — the
   merchant and a screenshot for a card decline, the reference for a failed deposit —
   then folds the answers into its summary. Grey does this and it is the most
   underrated thing in their flow: the wait produces the evidence.

## 9. The SLA, stated as a number we can keep

Grey says "under 20 minutes" and then misses it by nine months. The promise has to be
derived and the breach has to be visible.

**First reply.** Median time from `escalatedAt` to the first `agent` message over the
last 7 days, rounded up to the nearest 5 minutes, clamped to a floor and a ceiling. If
there is no data yet, or the team is outside business hours, say so plainly instead:
*"The team is offline right now — first thing tomorrow morning."*

**Handed to the team.** Grey's wording is *"24-48 working hours"* and working hours is
the right unit — a Friday-evening ticket must not breach over a weekend nobody is
working. We state 24-48 working hours too, computed against a business calendar.

**The breach is written into the thread.** A cron sweep (same pattern as
`resolve-transactions`) runs over tickets past `slaDueAt` and:

- posts into the thread acknowledging the miss and re-stating when
- re-pings the team at a higher priority
- flags the ticket in the queue

A promise that silently lapses does more damage than a longer promise kept.

**Both channels, named.** Every escalation message says replies arrive here **and** at
the user's email address, spelled out. The user can then close the app.

## 10. "Hand to team" is a button

The agent should not type the sentence the user quoted back at us. One action does all
of it:

- status → `pending`
- a canned, editable message into the thread
- a `Notification` with `link: /support?view=chat&t=<id>`
- a Resend email
- `slaDueAt = now + 24 working hours`
- a ping to the internal channel for that category

Macros for the rest, editable before sending:

| Macro | Gist |
| --- | --- |
| Taking this to the team | Handed on, update within 24-48 working hours |
| Need more information | Names exactly what is missing |
| Checking your transaction | Holding message with the ticket ref |
| Resolved | What was wrong, what was done, what to do if it recurs |
| Out of hours | When the team is next on |

## 11. Telling the team

| Channel | Role | When |
| --- | --- | --- |
| Slack / Discord webhook | Primary | Immediately on escalation. Ticket ref, category, priority, one-line reason, the AI summary, deep link to the dashboard. |
| Dashboard bell + sound | For agents already working | Live via polling (§14) |
| Email to the support inbox | Fallback | Only if still unclaimed after 10 minutes |
| `#ops` / engineering channel | Second tier | On hand-to-team, routed by category |

High priority pings with an `@here`. Normal priority does not — a channel that always
shouts gets muted, and then none of this works.

## 12. The dashboard

`/admin/support` in this Next app. Reuses the auth, the models and the components we
already have; a separate service would duplicate all three.

```
┌──────────────┬────────────────────────────┬─────────────────────┐
│ QUEUE        │ JMP-4821 · Failed deposit  │ THE USER            │
│              │ chidi@…  ·  high  ·  12m   │                     │
│ ● Unclaimed 3│                            │ Chidi O.  @chidi    │
│ ● Mine      1│ ── AI SUMMARY ───────────  │ KYC 4/5             │
│ ● Pending   2│ User sent ₦28,000 via      │ Joined Mar 2026     │
│              │ bank transfer 2h ago. Tx   │ 14 transactions     │
│ ──────────── │ JMP-TX-99213 is FAILED.    │ Last: failed dep.   │
│ JMP-4821  ⚠  │ Treasury shows no inbound. │                     │
│ Failed dep.  │ User has the session ID.   │ ── THIS TICKET ──── │
│ high · 12m   │                            │ Opened  14:02       │
│              │ ── THREAD ──────────────── │ Escalated 14:09     │
│ JMP-4817     │ [the whole transcript,     │ Claimed  14:11 you  │
│ Card decline │  AI turns included, with   │ SLA due  14:29      │
│ normal · 1h  │  the transaction card]     │                     │
│              │                            │ ── ACTIONS ──────── │
│ JMP-4802  ✓  │ ┌────────────────────────┐ │ Claim               │
│ KYC stuck    │ │ Reply…        [Macro ▾]│ │ Hand to team        │
│ pending · 1d │ └────────────────────────┘ │ Resolve             │
│              │ ○ Reply  ○ Internal note   │ Internal note       │
└──────────────┴────────────────────────────┴─────────────────────┘
```

The right-hand pane is the point. An agent should never have to ask for an email
address, a tag, a KYC state or a transaction reference — that is the Grey failure in
§3, and it is a tooling problem.

**Access control**, three layers, because `proxy.ts` explicitly skips `/api`:

1. `role` on `User` — `"user" | "support" | "admin"`, default `"user"`, indexed
2. `/admin` added to `isProtectedRoute` in `proxy.ts`
3. **Every `/api/admin/*` route checks the role itself.** The proxy will not do it.

Internal notes from day one. Agents will coordinate somewhere; if it is not in the
ticket it will be in a DM, and the next agent will not see it.

## 13. Schema

All additive. Nothing existing changes type except `status`, which widens.

```ts
// models/SupportChatLog.ts — now one document per TICKET
{
  userId: string
  ref: string                  // "JMP-4821", quotable, user-visible
  subject: string              // generated from the first message
  status: "ai" | "requested" | "live" | "pending" | "resolved" | "closed"

  category: "transaction" | "account" | "kyc" | "card" | "bug" | "other"
  reason?: string              // why it escalated
  priority: "normal" | "high"

  transactionIds?: string[]    // attached transactions (§6)
  aiSummary?: string           // what the agent reads first

  escalatedAt?: Date
  claimedBy?: string
  claimedAt?: Date
  slaDueAt?: Date
  slaBreachedAt?: Date         // set by the sweep, so it is only announced once
  resolvedAt?: Date
  closedAt?: Date

  lastUserMessageAt?: Date
  lastAgentMessageAt?: Date

  rating?: { score: 1|2|3|4|5, comment?: string, agentId: string, at: Date }

  messages: [{
    id, content, timestamp, attachments?
    role: "user" | "assistant" | "agent" | "system" | "note"
    agentId?: string
    agentName?: string         // denormalised so an old thread still reads right
  }]
}
```

- `role: "system"` renders the centred "Chidi joined the conversation" line.
- `role: "note"` is internal and is filtered out of every user-facing response. Filter
  it **server-side**, in the route — never by not rendering it on the client.

```ts
// models/User.ts
role: "user" | "support" | "admin"   // default "user", indexed
```

```ts
// models/Notification.ts — two new types
"SUPPORT_AGENT_REPLIED"
"SUPPORT_TICKET_RESOLVED"
```

Both sit on the existing `tab: "activities"` — `NotificationTab` is
`"transactions" | "activities"` and support is not a money movement, so no new tab is
needed.

Indexes: `{ status, priority, escalatedAt }` for the queue, `{ userId, updatedAt }` for
the Messages list, `{ slaDueAt }` sparse for the sweep, `{ ref }` unique.

> **Mongoose enums need a dev-server restart.** Our models end in
> `mongoose.models.X || mongoose.model(...)` and `mongoose.models` survives HMR, so a
> long-running `next dev` keeps validating against the schema it booted with. Widening
> `status` or adding a notification type will throw a ValidatorError while the file on
> disk is already correct. Restart; there is nothing to fix in the code.

`getSupportChatMessages` and `appendSupportChatMessages` take `userId` today. Both need
a ticket id. Worth doing as its own commit before any feature work lands on top.

## 14. Realtime: polling in v1

There is no websocket, SSE or push anywhere in this repo. Adding infrastructure is not
the hard part of this project, so v1 polls:

- **User side:** 5s, only while status is `requested` or `live`, only while the tab is
  visible. Idle in `ai` or `resolved` — the AI reply is a direct response anyway.
- **Agent side:** 10s on the queue, 5s on the open thread.

Both endpoints are written as *"give me everything since `<timestamp>`"*, so SSE can
replace the transport later without touching a component. Rate limits: the user poll is
`tier: "low"`; the agent poll needs its own action name so it does not share a bucket
with anything user-facing.

## 15. Phasing

Already agreed: handoff first, dashboard second.

**Phase 1 — a user can reach a human, and the human can answer.**

1. Schema migration: one thread per user → one per ticket, plus `role` on User
2. **The AI-goes-silent guard** (§7) — nothing else matters if this is missing
3. `escalate_to_human` tool + the deterministic triggers + rewrite rule 10
4. Attach a transaction to a ticket (§6) — both entry points
5. Slack/Discord webhook ping
6. Hand-to-team action: thread message + notification + email + `slaDueAt`
7. The SLA breach cron sweep
8. A minimal agent view: queue, thread, reply, claim, resolve, internal note
9. User side: Messages list, "Talk to a human", "X joined", deflection articles, the
   computed reply-time line

**Phase 2 — make it good.**

1. The full three-pane dashboard with the user-context pane
2. Guided triage chips
3. AI-written summary and suggested reply
4. CSAT, per agent, and the rating prompt expiring **without leaving a dead row in the
   Messages list** — which is exactly what Grey's inbox is full of
5. Queue filters, SLA countdown, claim-collision handling
6. Route a reopened ticket back to its last agent
7. Cited answers, once the help centre is more than five FAQs

**Not building.** Assignment rules, a macro editor UI, agent-side file upload, voice,
multiple queues, satisfaction dashboards. All of it is premature at our volume.

## 16. Open questions

1. **Who grants `role: "support"`?** A seed script, an env allowlist, or an admin UI?
   Phase 1 can live with a script; it needs an owner.
2. **The computed first-reply number: what floor and ceiling?** Showing "2 minutes"
   because one ticket was fast sets a trap. Suggest a 5-minute floor and never showing
   anything above "within the hour".
3. **What are our business hours, and in what timezone?** Both SLAs depend on it, and
   the out-of-hours message does too.
4. **Agent display names.** Real first names build trust — and Grey shows that four
   different names across one history erodes it. First name + a shared avatar?
5. **Transcript retention.** Delete Account currently removes Wallet, ChatLog,
   Transaction, UserActivityLog and Referral. Support transcripts may need to outlive
   the account for dispute and AML reasons. Needs a ruling before launch.
6. **Does the WhatsApp community stay?** It is fine as a community. It should not be an
   escalation path once this exists — agreed?
7. **Who is on call?** A queue with no one watching it is worse than an email address,
   because it looks staffed.

---

### Placeholders in this document

Everything below needs a real value before anything ships:

- Business hours, timezone, and the reply-time floor/ceiling (§9, Q2, Q3)
- The Slack/Discord webhook URL — an env var, never committed (§11)
- `SUPPORT_EMAIL` is still `support@usejumpa.com` with a `TODO(backend)` on it in
  `lib/support.ts`, and the email templates for escalation and resolution are not
  written
- `FAQS` is five entries and the answers are unsigned-off (`TODO(content)`) — it is
  both the deflection corpus and the future citation source
- The ticket-ref format `JMP-4821` is a placeholder; it needs a collision-free generator
