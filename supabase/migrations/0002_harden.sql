-- Moves the admin check out of the PostgREST-exposed `public` schema so it
-- cannot be invoked as /rest/v1/rpc/is_admin, and relocates citext out of
-- public. Resolves both Supabase security advisor warnings.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated, service_role;

create schema if not exists extensions;
grant usage on schema extensions to public;
alter extension citext set schema extensions;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
  select exists (
    select 1 from public.admin_users
    where email = (auth.jwt() ->> 'email')::extensions.citext
  );
$$;

revoke all on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated;

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
    execute format('drop policy if exists %I on public.%I', t || '_admin_all', t);
    execute format(
      'create policy %I on public.%I for all to authenticated
         using (private.is_admin()) with check (private.is_admin())',
      t || '_admin_all', t
    );
  end loop;
end $$;

drop policy if exists admin_users_select on public.admin_users;
create policy admin_users_select on public.admin_users
  for select to authenticated using (private.is_admin());

drop policy if exists audit_log_select on public.audit_log;
create policy audit_log_select on public.audit_log
  for select to authenticated using (private.is_admin());

drop function if exists public.is_admin();

alter function public.touch_updated_at()
  set search_path = public, extensions, pg_temp;
