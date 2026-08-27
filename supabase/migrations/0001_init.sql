-- Somos Ácida newsletter platform — core schema.
--
-- Security model: this is a single-operator platform holding client PII, so the
-- default posture is deny-all. Every table has RLS enabled with no permissive
-- default; access requires either (a) an authenticated session whose email is in
-- admin_users, or (b) the service role, used only by vetted server-side routes
-- (public signup, unsubscribe, webhook ingestion). The anon key can read nothing.

create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- ---------------------------------------------------------------------------
-- Admin identity
-- ---------------------------------------------------------------------------

create table admin_users (
  id uuid primary key default gen_random_uuid(),
  email citext not null unique,
  display_name text,
  created_at timestamptz not null default now()
);

-- Used by every RLS policy. SECURITY DEFINER so the lookup itself is not
-- subject to admin_users' own RLS (which would recurse).
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.admin_users
    where email = (auth.jwt() ->> 'email')::citext
  );
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- Contacts
-- ---------------------------------------------------------------------------

create type contact_status as enum (
  'pending',      -- awaiting double opt-in confirmation
  'subscribed',
  'unsubscribed',
  'bounced',
  'complained',
  'cleaned'       -- repeatedly undeliverable, removed from sending
);

create table contacts (
  id uuid primary key default gen_random_uuid(),
  email citext not null unique,
  first_name text,
  last_name text,
  phone text,
  company text,
  status contact_status not null default 'pending',

  -- Arbitrary operator-defined fields, shape governed by custom_fields.
  attributes jsonb not null default '{}'::jsonb,

  -- Consent trail. Required to demonstrate lawful basis under GDPR/CAN-SPAM.
  consent_source text,
  consent_at timestamptz,
  consent_ip inet,
  consent_user_agent text,
  confirmed_at timestamptz,
  unsubscribed_at timestamptz,
  unsubscribe_reason text,

  last_emailed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index contacts_status_idx on contacts (status);
create index contacts_created_at_idx on contacts (created_at desc);
create index contacts_attributes_idx on contacts using gin (attributes);
-- Backs the contact search box (name/company substring match).
create index contacts_name_search_idx on contacts
  using gin (to_tsvector('simple',
    coalesce(first_name,'') || ' ' || coalesce(last_name,'') || ' ' || coalesce(company,'')));

create table custom_fields (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  field_type text not null default 'text'
    check (field_type in ('text','number','date','boolean','select','url')),
  options jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table contact_notes (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references contacts(id) on delete cascade,
  body text not null,
  author_email citext,
  created_at timestamptz not null default now()
);

create index contact_notes_contact_idx on contact_notes (contact_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Tags, lists, segments
-- ---------------------------------------------------------------------------

create table tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color text not null default '#71717A',
  created_at timestamptz not null default now()
);

create table contact_tags (
  contact_id uuid not null references contacts(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (contact_id, tag_id)
);

create index contact_tags_tag_idx on contact_tags (tag_id);

create table lists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  -- Shown in the preference center so people can opt out of one topic only.
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);

create table list_contacts (
  list_id uuid not null references lists(id) on delete cascade,
  contact_id uuid not null references contacts(id) on delete cascade,
  subscribed boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (list_id, contact_id)
);

create index list_contacts_contact_idx on list_contacts (contact_id);

-- Saved filters. `definition` holds the rule tree the app compiles to SQL;
-- it is never executed as raw SQL (see src/lib/segments.ts).
create table segments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  definition jsonb not null default '{"match":"all","rules":[]}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Templates and campaigns
-- ---------------------------------------------------------------------------

create table templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  -- Block tree produced by the newsletter designer.
  design jsonb not null default '{"blocks":[],"settings":{}}'::jsonb,
  thumbnail_url text,
  is_starter boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create type campaign_status as enum (
  'draft', 'scheduled', 'sending', 'sent', 'paused', 'failed', 'cancelled'
);

create table campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subject text not null default '',
  preheader text,
  from_name text,
  from_email citext,
  reply_to citext,

  design jsonb not null default '{"blocks":[],"settings":{}}'::jsonb,
  -- Rendered at send time and frozen, so analytics always match what was sent.
  html_snapshot text,
  text_snapshot text,

  status campaign_status not null default 'draft',
  audience jsonb not null default '{"type":"all"}'::jsonb,

  scheduled_at timestamptz,
  send_started_at timestamptz,
  sent_at timestamptz,
  error_message text,

  total_recipients integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index campaigns_status_idx on campaigns (status, scheduled_at);

create type recipient_status as enum (
  'queued', 'sent', 'delivered', 'bounced', 'complained', 'failed', 'skipped'
);

-- One row per contact per campaign. Doubles as the send queue: a resumed send
-- picks up rows still in 'queued', so a crash mid-send never double-delivers.
create table campaign_recipients (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  contact_id uuid not null references contacts(id) on delete cascade,
  email citext not null,
  status recipient_status not null default 'queued',
  provider_message_id text,
  error_message text,
  sent_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  open_count integer not null default 0,
  click_count integer not null default 0,
  created_at timestamptz not null default now(),
  unique (campaign_id, contact_id)
);

create index campaign_recipients_queue_idx
  on campaign_recipients (campaign_id, status);
create index campaign_recipients_contact_idx on campaign_recipients (contact_id);
create index campaign_recipients_provider_idx on campaign_recipients (provider_message_id);

create type email_event_type as enum (
  'sent','delivered','opened','clicked','bounced','complained','unsubscribed','failed'
);

create table email_events (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid references contacts(id) on delete cascade,
  campaign_id uuid references campaigns(id) on delete cascade,
  recipient_id uuid references campaign_recipients(id) on delete cascade,
  event_type email_event_type not null,
  provider_message_id text,
  link_url text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index email_events_contact_idx on email_events (contact_id, occurred_at desc);
create index email_events_campaign_idx on email_events (campaign_id, event_type);

-- ---------------------------------------------------------------------------
-- Suppression list — the last line of defence before any send
-- ---------------------------------------------------------------------------

create table suppressions (
  email citext primary key,
  reason text not null check (reason in
    ('unsubscribed','bounced','complained','manual','invalid')),
  notes text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Signup forms
-- ---------------------------------------------------------------------------

create table forms (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  headline text,
  description text,
  button_label text not null default 'Suscribirme',
  success_message text not null default '¡Gracias! Revisa tu correo para confirmar.',
  -- Field descriptors rendered by the public form; server validates against these.
  fields jsonb not null default '[{"key":"email","label":"Email","required":true}]'::jsonb,
  target_list_ids uuid[] not null default '{}',
  target_tag_ids uuid[] not null default '{}',
  double_opt_in boolean not null default true,
  redirect_url text,
  is_active boolean not null default true,
  submission_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Automations (drip sequences)
-- ---------------------------------------------------------------------------

create type automation_trigger as enum (
  'contact_created', 'tag_added', 'list_joined', 'form_submitted'
);

create table automations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  trigger_type automation_trigger not null,
  trigger_config jsonb not null default '{}'::jsonb,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table automation_steps (
  id uuid primary key default gen_random_uuid(),
  automation_id uuid not null references automations(id) on delete cascade,
  position integer not null,
  -- 'wait' delays; 'email' sends; 'tag' applies a tag.
  step_type text not null check (step_type in ('wait','email','tag')),
  wait_minutes integer not null default 0,
  subject text,
  design jsonb,
  tag_id uuid references tags(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (automation_id, position)
);

create table automation_enrollments (
  id uuid primary key default gen_random_uuid(),
  automation_id uuid not null references automations(id) on delete cascade,
  contact_id uuid not null references contacts(id) on delete cascade,
  current_step integer not null default 0,
  next_run_at timestamptz not null default now(),
  status text not null default 'active'
    check (status in ('active','completed','cancelled')),
  created_at timestamptz not null default now(),
  unique (automation_id, contact_id)
);

create index automation_enrollments_due_idx
  on automation_enrollments (status, next_run_at);

-- ---------------------------------------------------------------------------
-- Audit log — append-only record of privileged actions
-- ---------------------------------------------------------------------------

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_email citext,
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  ip inet,
  created_at timestamptz not null default now()
);

create index audit_log_created_idx on audit_log (created_at desc);

-- ---------------------------------------------------------------------------
-- Settings (single row)
-- ---------------------------------------------------------------------------

create table settings (
  id boolean primary key default true check (id),
  organization_name text not null default 'Somos Ácida',
  -- CAN-SPAM requires a physical postal address in every commercial email.
  postal_address text not null default '',
  default_from_name text,
  default_from_email citext,
  default_reply_to citext,
  logo_url text,
  brand_overrides jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into settings (id) values (true) on conflict do nothing;

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger contacts_touch before update on contacts
  for each row execute function public.touch_updated_at();
create trigger segments_touch before update on segments
  for each row execute function public.touch_updated_at();
create trigger templates_touch before update on templates
  for each row execute function public.touch_updated_at();
create trigger campaigns_touch before update on campaigns
  for each row execute function public.touch_updated_at();
create trigger forms_touch before update on forms
  for each row execute function public.touch_updated_at();
create trigger automations_touch before update on automations
  for each row execute function public.touch_updated_at();
create trigger settings_touch before update on settings
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table admin_users            enable row level security;
alter table contacts               enable row level security;
alter table custom_fields          enable row level security;
alter table contact_notes          enable row level security;
alter table tags                   enable row level security;
alter table contact_tags           enable row level security;
alter table lists                  enable row level security;
alter table list_contacts          enable row level security;
alter table segments               enable row level security;
alter table templates              enable row level security;
alter table campaigns              enable row level security;
alter table campaign_recipients    enable row level security;
alter table email_events           enable row level security;
alter table suppressions           enable row level security;
alter table forms                  enable row level security;
alter table automations            enable row level security;
alter table automation_steps       enable row level security;
alter table automation_enrollments enable row level security;
alter table audit_log              enable row level security;
alter table settings               enable row level security;

-- Full access for signed-in admins on operational tables.
do $$
declare t text;
begin
  foreach t in array array[
    'contacts','custom_fields','contact_notes','tags','contact_tags',
    'lists','list_contacts','segments','templates','campaigns',
    'campaign_recipients','email_events','suppressions','forms',
    'automations','automation_steps','automation_enrollments','settings'
  ]
  loop
    execute format(
      'create policy %I on public.%I for all to authenticated
         using (public.is_admin()) with check (public.is_admin())',
      t || '_admin_all', t
    );
  end loop;
end $$;

-- admin_users is readable by admins but only mutable via the service role,
-- so a compromised admin session cannot grant access to a new account.
create policy admin_users_select on admin_users
  for select to authenticated using (public.is_admin());

-- The audit log is append-only: admins may read it, and nobody holding a user
-- token may write, update, or delete. Entries are written with the service role.
create policy audit_log_select on audit_log
  for select to authenticated using (public.is_admin());

-- Deny the anon role everything. RLS already denies by default, but revoking
-- table grants means a policy mistake later cannot silently expose data.
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;
