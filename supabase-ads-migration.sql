-- =====================================================================
-- HD XQUISITE LIQUORS — Ad Carousel Migration
-- Creates the `ads` table + storage bucket for image/video ad slides.
-- Run once in Supabase SQL Editor.
-- =====================================================================

-- 1. Create the ads table
create table if not exists public.ads (
  id              uuid primary key default gen_random_uuid(),
  title           text,
  subtitle        text,
  media_type      text not null check (media_type in ('image', 'video')),
  media_url       text not null,
  thumbnail_url   text,
  cta             text,
  link            text,
  is_active       boolean not null default true,
  order_index     integer not null default 0,
  created_at      timestamptz not null default now()
);

create index if not exists ads_active_order_idx
  on public.ads (is_active, order_index, created_at desc);

-- 2. Enable Row Level Security & allow public read of active ads
alter table public.ads enable row level security;

drop policy if exists "Public can read active ads" on public.ads;
create policy "Public can read active ads"
  on public.ads
  for select
  to anon, authenticated
  using (is_active = true);

-- 3. Create the storage bucket for ad media (public read so the app can load files)
insert into storage.buckets (id, name, public)
values ('ads', 'ads', true)
on conflict (id) do update set public = true;

-- Storage policies: public read, authenticated upload/manage
drop policy if exists "Public can read ad media" on storage.objects;
create policy "Public can read ad media"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'ads');

drop policy if exists "Authenticated can upload ad media" on storage.objects;
create policy "Authenticated can upload ad media"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'ads');

drop policy if exists "Authenticated can update ad media" on storage.objects;
create policy "Authenticated can update ad media"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'ads');

drop policy if exists "Authenticated can delete ad media" on storage.objects;
create policy "Authenticated can delete ad media"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'ads');
