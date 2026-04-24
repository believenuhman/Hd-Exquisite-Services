-- =====================================================================
-- HD XQUISITE LIQUORS — Events Migration
-- Creates the `events` table + storage bucket for event flyers/images.
-- Safe to re-run: every statement uses `if not exists` / `or replace` /
-- `on conflict do nothing`.
--
-- After running this:
--   • Add events from Supabase Studio → Table Editor → events
--   • Upload flyers to Storage → events bucket (public read)
--   • Set is_active=true and the customer app picks them up live (no redeploy)
-- =====================================================================

-- 1. Events table ─────────────────────────────────────────────────────
create table if not exists public.events (
  id                uuid primary key default gen_random_uuid(),
  title             text        not null,
  description       text,
  event_date        date        not null,
  start_time        time,
  end_time          time,
  location_name     text,
  location_address  text,
  image_url         text,
  is_active         boolean     not null default true,
  is_featured       boolean     not null default false,
  order_index       integer     not null default 0,
  created_at        timestamptz not null default now()
);

-- Index optimised for the "upcoming + active, soonest first" query.
create index if not exists events_active_upcoming_idx
  on public.events (is_active, event_date asc, start_time asc, order_index asc);

create index if not exists events_featured_idx
  on public.events (is_active, is_featured desc, event_date asc)
  where is_active = true;

-- 2. Row Level Security ──────────────────────────────────────────────
alter table public.events enable row level security;

-- Public READ — only active rows are visible to customers.
drop policy if exists "Public can read active events" on public.events;
create policy "Public can read active events"
  on public.events
  for select
  to anon, authenticated
  using (is_active = true);

-- Admin writes (managed via Supabase Studio with the service role key, or by a
-- signed-in user whose JWT carries app_metadata.role='admin'). We allow any
-- authenticated session with that role to insert/update/delete; the dashboard
-- itself uses the service role key so it bypasses RLS entirely.
drop policy if exists "Admins can write events" on public.events;
create policy "Admins can write events"
  on public.events
  for all
  to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin','location_admin'))
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin','location_admin'));

-- 3. Storage bucket for flyers ───────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('events', 'events', true)
on conflict (id) do update set public = true;

drop policy if exists "Public can read event media" on storage.objects;
create policy "Public can read event media"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'events');

drop policy if exists "Authenticated can upload event media" on storage.objects;
create policy "Authenticated can upload event media"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'events');

drop policy if exists "Authenticated can update event media" on storage.objects;
create policy "Authenticated can update event media"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'events');

drop policy if exists "Authenticated can delete event media" on storage.objects;
create policy "Authenticated can delete event media"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'events');

-- 4. Optional: realtime broadcast so the customer app updates without a refresh
-- (Supabase enables realtime per-table; this adds the events table to the
-- supabase_realtime publication if it isn't already part of it.)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename  = 'events'
  ) then
    execute 'alter publication supabase_realtime add table public.events';
  end if;
exception when others then
  -- Publication may not exist on self-hosted setups; ignore.
  null;
end $$;
