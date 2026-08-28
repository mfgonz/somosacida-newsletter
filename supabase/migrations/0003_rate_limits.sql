-- Fixed-window counters for public endpoints (signup forms, unsubscribe).
-- An in-memory counter is useless on serverless, where each request may hit a
-- fresh instance, so the counter lives in Postgres.

create table rate_limits (
  key text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (key, window_start)
);

create index rate_limits_window_idx on rate_limits (window_start);

alter table rate_limits enable row level security;

-- Deliberately no policy: only the service role touches this table, and it
-- bypasses RLS. Admins have no reason to read it.

-- Atomic increment so concurrent submissions cannot both slip under the limit.
create or replace function public.increment_rate_limit(
  p_key text,
  p_window_start timestamptz
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  new_count integer;
begin
  insert into public.rate_limits (key, window_start, count)
  values (p_key, p_window_start, 1)
  on conflict (key, window_start)
  do update set count = public.rate_limits.count + 1
  returning count into new_count;
  return new_count;
end;
$$;

revoke all on function public.increment_rate_limit(text, timestamptz)
  from public, anon, authenticated;

-- Housekeeping: drop windows older than a day.
create or replace function public.prune_rate_limits()
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  delete from public.rate_limits where window_start < now() - interval '1 day';
$$;

revoke all on function public.prune_rate_limits() from public, anon, authenticated;
