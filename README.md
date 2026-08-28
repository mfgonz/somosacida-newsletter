# Somos Ácida — Newsletter Platform

A private, self-hosted email marketing platform: contact CRM, drag-and-drop
newsletter designer, campaign sending, signup forms, drip automations, and
subscriber analytics. Built to replace a paid service like Kit.com, with the
client data staying in infrastructure you control.

**Stack:** Next.js 16 (App Router) · Supabase (Postgres + Auth) · Resend · Tailwind

---

## Contents

- [Setup](#setup)
- [Domain and DNS](#domain-and-dns-required-before-any-real-send)
- [Deploying](#deploying)
- [Scheduled sending](#scheduled-sending)
- [Security model](#security-model)
- [Branding](#branding)
- [Feature reference](#feature-reference)
- [Operating notes](#operating-notes)

---

## Setup

### 1. Install and configure

```bash
npm install
cp .env.example .env.local
```

Fill in `.env.local`. The app validates every variable at boot and fails loudly
rather than starting half-configured.

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same page (publishable key) |
| `SUPABASE_SERVICE_ROLE_KEY` | Same page — **secret**, server-only |
| `RESEND_API_KEY` | resend.com → API Keys |
| `RESEND_FROM_EMAIL` | An address at your verified domain |
| `RESEND_WEBHOOK_SECRET` | Resend → Webhooks → signing secret |
| `NEXT_PUBLIC_APP_URL` | Your deployed origin, no trailing slash |
| `ADMIN_EMAIL_ALLOWLIST` | Comma-separated emails allowed to sign in |
| `TOKEN_SIGNING_SECRET` | `openssl rand -base64 48` |
| `CRON_SECRET` | `openssl rand -base64 32` |

### 2. Database

The Supabase project **`acida-newsletter`** is already provisioned with all
three migrations applied. To rebuild from scratch elsewhere, run the files in
`supabase/migrations/` in order.

### 3. Create your login

Supabase → Authentication → Users → **Add user**, using an address that appears
in `ADMIN_EMAIL_ALLOWLIST`. Then register that same address as an admin:

```sql
insert into admin_users (email, display_name)
values ('you@example.com', 'Your Name');
```

Both are required: the allowlist gates the UI, the `admin_users` row gates the
data. Sign-in is email + password.

### 4. Run

```bash
npm run dev        # http://localhost:3000
npm run build      # production build
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
```

---

## Domain and DNS (required before any real send)

Email from an unverified domain lands in spam or is rejected outright. In
Resend → Domains, add `somosacida.com` and publish the DNS records it gives you:

- **SPF** — authorises Resend to send as your domain
- **DKIM** — cryptographically signs each message
- **DMARC** — tells receivers what to do when the first two fail

A minimal DMARC record to start with, tightened to `quarantine` then `reject`
once you've confirmed legitimate mail passes:

```
_dmarc.somosacida.com   TXT   "v=DMARC1; p=none; rua=mailto:dmarc@somosacida.com"
```

Then, in the app: **Settings** → set your organization name, sender identity,
and **postal address**. The postal address is legally required in commercial
email, and the app refuses to launch a campaign without it.

Finally, in Resend → Webhooks, point a webhook at the URL shown on the Settings
page (`/api/webhooks/resend`) and subscribe to `email.*` events. Without this,
opens, clicks, bounces, and complaints are never recorded.

---

## Deploying

The Netlify project **`acida-newsletter`** already exists, with every
environment variable set. It only needs to be connected to this repository:

1. <https://app.netlify.com/projects/acida-newsletter> → **Project configuration
   → Build & deploy → Link repository**
2. Choose `mfgonz/somosacida-newsletter`, branch
   `claude/custom-email-newsletter-platform-qp9c9n` (or `main` once merged)
3. Build settings come from `netlify.toml` — leave them as detected

Netlify then builds on every push. Live URL:
<https://acida-newsletter.netlify.app>

Two variables are placeholders and must be replaced before the app is fully
functional (**Project configuration → Environment variables**):

| Variable | Where to get it |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → `service_role` |
| `RESEND_WEBHOOK_SECRET` | Resend → Webhooks → signing secret (create the webhook first) |

Until the service-role key is real, the admin dashboard works but public signup,
unsubscribe, and sending do not — those paths deliberately run without a user
session and depend on that key.

---

## Scheduled sending

Large campaigns are queued and drained in batches, and scheduled campaigns need
something to fire them. Call the cron endpoint every few minutes:

```
POST https://your-app/api/cron/send
Authorization: Bearer $CRON_SECRET
```

Any scheduler works — Netlify Scheduled Functions, GitHub Actions, cron-job.org.
The endpoint is idempotent: overlapping runs cannot double-send, because each
recipient row moves out of `queued` before the message goes out.

Without a scheduler, campaigns sent immediately still deliver their first batch
(sent inline), but scheduled campaigns and automations will not run.

---

## Security model

This system holds client PII, so the posture is deny-by-default.

**Database.** Row Level Security is enabled on every table with no permissive
default. The `anon` role has no table grants at all — an anonymous request is
rejected by Postgres privileges before RLS is even consulted. Reads and writes
require either a signed-in session whose email is in `admin_users`, or the
service role.

Verified against the live database:

| Identity | `select * from contacts` |
|---|---|
| `anon` | `permission denied for table contacts` |
| Signed-in, not an admin | 0 rows (RLS filtered) |
| Signed-in admin | rows returned |

**Service role.** `supabaseAdmin()` bypasses RLS and is confined to routes that
have no admin session by definition — public signup, unsubscribe, webhooks, and
the cron worker — each authenticated by its own means (signed token, webhook
signature, cron secret). It is `server-only`; no client component can import it.

**Signed tokens.** Unsubscribe, preference, and confirmation links are HMAC-SHA256
tokens verified in constant time. They prove the bearer received mail at that
address and grant nothing else.

**Public endpoints.** The signup form is rate-limited in Postgres (in-memory
counters are useless on serverless), carries a honeypot field, and returns an
identical response whether or not an address is already subscribed — so it
cannot be used to enumerate your subscriber list.

**Webhooks.** Resend events are Svix-signature-verified before the body is
parsed. This matters because the handler writes with the service role.

**Rich text.** Text and HTML blocks pass through an allowlist sanitizer that
strips scripts, event handlers, unsafe URL schemes, and CSS capable of loading
remote content. Verified against script tags, `javascript:` and `data:` URLs,
`onerror`, SVG, iframes, and CSS `expression()`/`url()`.

**Audit log.** Privileged actions are recorded append-only: admins can read it,
and no user token can insert, update, or delete.

**Secrets.** `.env*` is gitignored except `.env.example`. No key is committed.

---

## Branding

Extracted from somosacida.com. Everything visual comes from one file:
**`src/lib/brand.ts`** — it feeds Tailwind, the admin UI, and email rendering.
Nothing else hardcodes a brand colour.

| Token | Value | Where it comes from |
|---|---|---|
| `ink` | `#2E3020` | The wordmark's deep olive; all primary text |
| `canvas` | `#EAE7DB` | The site's warm bone ground (never white) |
| `surface` | `#F4F1E7` | Cards, one step lighter than the ground |
| `primary` | `#C6512C` | Burnt terracotta from the services section |
| `accent` | `#D2C158` | Mustard from the audience grid |

The categorical palette from the "Personas e instituciones" grid — mustard,
olive, blue, pink, taupe, black — is exposed as `brand.palette` and used for tag
colours, so labels stay on-brand.

**Type.** Archivo stands in for the site's heavy grotesque (wordmark, headings);
DM Mono covers the letterspaced uppercase labels in the nav and eyebrow rules.
Both load via `next/font`. If you own the licence to the original faces, drop
them in and change the two imports in `src/app/layout.tsx`.

The `ácida` wordmark is set typographically in `src/components/wordmark.tsx`
rather than shipped as an image, so it stays crisp and inherits colour. Swap in
the drawn original there if you prefer.

---

## Feature reference

**Audience**
- Contacts with custom attributes, tags, notes, and a full consent trail
  (source, timestamp, IP, user agent)
- CSV import with column auto-mapping, duplicate detection, and a consent
  attestation; never revives a suppressed address, never overwrites existing data
- CSV export, hardened against spreadsheet formula injection
- Saved segments built from a rule tree — compiled through the query builder
  with allowlisted fields, never raw SQL
- Lists (topics people opt into) and tags (how you classify them)

**Designing**
- Drag-and-drop builder: heading, text, image, button, divider, spacer,
  columns, social, raw HTML
- Reorder by mouse or keyboard; live desktop/mobile preview
- Merge tags (`{{first_name}}`, `{{unsubscribe_url}}`, …) escaped on substitution
- Renders to table-based, inline-styled HTML that survives Outlook and Gmail,
  with a plain-text alternative generated automatically
- Reusable templates

**Sending**
- Draft → test send → schedule or send now
- Durable per-recipient queue; a crash mid-send resumes without double-delivery
- Suppression and subscription status re-checked immediately before each
  dispatch, so someone who unsubscribes mid-campaign is skipped
- Sent campaigns become immutable and turn into a report
- Per-campaign stats: delivered, opens, clicks, bounces, complaints, top links

**Growth**
- Hosted signup pages (`/subscribe/[slug]`) and embeddable iframe forms (`/f/[slug]`)
- Double opt-in with branded confirmation email
- Drip automations triggered by signup, tag, list, or form, with wait/email/tag steps

**Compliance**
- One-click unsubscribe (RFC 8058) — required by Gmail and Yahoo for bulk senders
- Preference center for per-topic opt-out
- Global suppression list, fed automatically by hard bounces and spam complaints
- Postal address enforced in every campaign footer
- Per-contact delete for GDPR erasure requests

---

## Operating notes

**Deliverability.** Warm up gradually — a domain that has never sent mail and
suddenly emits 10,000 messages gets throttled. Start with your most engaged
contacts and grow volume over days.

**Never import a purchased list.** It is the fastest way to earn spam complaints,
and complaints damage your domain's reputation in ways that take months to undo.
The import wizard asks you to attest to consent for exactly this reason.

**Open rates understate reality.** Apple Mail Privacy Protection preloads
tracking pixels and many clients block them. Treat clicks as the reliable signal.

**Suppression is deliberate.** Removing someone from the suppression list
re-enables mail to a person who previously opted out. The UI warns and the action
is logged. Let them resubscribe themselves instead.

**Paused project.** `prestamo-mama-auto` was paused (with your approval) to free
a Supabase free-tier slot. Its data is retained and it can be restored from the
Supabase dashboard whenever you need it.
