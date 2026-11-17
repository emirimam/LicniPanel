-- RLS: svaki red pripada jednom korisniku i niko drugi ga ne vidi.

alter function public.set_updated_at() set search_path = '';

alter table workspaces  enable row level security;
alter table accounts    enable row level security;
alter table projects    enable row level security;
alter table contacts    enable row level security;
alter table threads     enable row level security;
alter table messages    enable row level security;
alter table tasks       enable row level security;
alter table suggestions enable row level security;
alter table rules       enable row level security;
alter table drafts      enable row level security;
alter table events      enable row level security;
alter table repo_events enable row level security;
alter table activity    enable row level security;

create policy "vlastiti redovi" on workspaces  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "vlastiti redovi" on accounts    for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "vlastiti redovi" on projects    for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "vlastiti redovi" on contacts    for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "vlastiti redovi" on threads     for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "vlastiti redovi" on messages    for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "vlastiti redovi" on tasks       for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "vlastiti redovi" on suggestions for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "vlastiti redovi" on rules       for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "vlastiti redovi" on drafts      for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "vlastiti redovi" on events      for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "vlastiti redovi" on repo_events for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "vlastiti redovi" on activity    for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- === Pretraga po posti ===
alter table messages add column pretraga tsvector
  generated always as (to_tsvector('simple', coalesce(tema, '') || ' ' || coalesce(tijelo, ''))) stored;

create index idx_messages_pretraga on messages using gin (pretraga);
create index idx_messages_korisnik_datum on messages (user_id, datum desc);
create index idx_messages_thread on messages (thread_id, datum);
create index idx_messages_neobradjene on messages (user_id, obradjena) where obradjena = false;

create index idx_tasks_tabla on tasks (user_id, workspace_id, faza, redoslijed);
create index idx_tasks_rok on tasks (user_id, rok) where faza <> 'zavrseno';
create index idx_suggestions_ceka on suggestions (user_id, created_at desc) where status = 'ceka';
create index idx_threads_cekanje on threads (user_id, rok_odgovora) where ceka_odgovor = true;
create index idx_events_pocetak on events (user_id, pocetak);
create index idx_repo_events_projekat on repo_events (project_id, vrijeme desc);
create index idx_contacts_email on contacts using gin (email);
create index idx_activity_vrijeme on activity (user_id, vrijeme desc);

-- === Dva prostora se prave sama pri registraciji ===
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.workspaces (user_id, naziv, slug, boja)
  values (new.id, 'Posao', 'posao', '#2563eb'),
         (new.id, 'Privatno', 'privatno', '#16a34a');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
