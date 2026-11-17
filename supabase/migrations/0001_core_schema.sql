-- Licni panel: osnovna sema
-- Dva prostora (posao / privatno), posta, zadaci, projekti, kontakti, prijedlozi.

create extension if not exists "pgcrypto";

-- === Tipovi ===
create type account_vrsta as enum ('imap', 'gmail', 'graph', 'ews', 'rucno');
create type smjer as enum ('ulazna', 'izlazna');
create type task_faza as enum ('novo', 'u_radu', 'cekam_drugog', 'zavrseno');
create type suggestion_tip as enum ('zadatak', 'kontakt', 'projekat', 'odgovor');
create type suggestion_status as enum ('ceka', 'prihvacen', 'odbacen');
create type repo_vrsta as enum ('push', 'deployment', 'greska', 'release');

-- === Pomocna funkcija za updated_at ===
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- === Prostori ===
create table workspaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  naziv text not null,
  slug text not null,
  boja text default '#2563eb',
  created_at timestamptz not null default now(),
  unique (user_id, slug)
);

-- === Nalozi (izvori poste) ===
create table accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  naziv text not null,
  vrsta account_vrsta not null,
  email text,
  host text,
  port int,
  korisnik text,
  secret_ref text,
  aktivan boolean not null default true,
  zadnja_sinhronizacija timestamptz,
  stanje jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- === Projekti ===
create table projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  naziv text not null,
  opis text,
  status text not null default 'aktivan',
  repo_url text,
  vercel_project_id text,
  kljucne_rijeci text[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- === Kontakti ===
create table contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  ime text not null,
  email text[] not null default '{}',
  firma text,
  uloga text,
  biljeska text,
  zadnja_interakcija timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- === Prepiske ===
create table threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  thread_key text not null,
  tema text,
  ucesnici text[] not null default '{}',
  zadnja_poruka timestamptz,
  ceka_odgovor boolean not null default false,
  rok_odgovora timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, thread_key)
);

-- === Poruke ===
create table messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  account_id uuid references accounts(id) on delete set null,
  thread_id uuid references threads(id) on delete set null,
  message_id text not null,
  smjer smjer not null,
  od text,
  od_ime text,
  za text[] not null default '{}',
  kopija text[] not null default '{}',
  tema text,
  tijelo text,
  izvod text,
  folder text,
  datum timestamptz not null,
  obradjena boolean not null default false,
  vanjski_link text,
  created_at timestamptz not null default now(),
  unique (user_id, message_id)
);

-- === Zadaci ===
create table tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  contact_id uuid references contacts(id) on delete set null,
  source_message_id uuid references messages(id) on delete set null,
  naslov text not null,
  opis text,
  faza task_faza not null default 'novo',
  prioritet int not null default 3 check (prioritet between 1 and 5),
  rok date,
  redoslijed double precision not null default 1000,
  zavrseno_u timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- === Prijedlozi koji cekaju potvrdu ===
create table suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  source_message_id uuid references messages(id) on delete cascade,
  tip suggestion_tip not null,
  sadrzaj jsonb not null,
  obrazlozenje text,
  sigurnost numeric(3,2) check (sigurnost between 0 and 1),
  status suggestion_status not null default 'ceka',
  rijeseno_u timestamptz,
  created_at timestamptz not null default now()
);

-- === Pravila povjerenja ===
create table rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid references workspaces(id) on delete cascade,
  naziv text not null,
  uslov jsonb not null,
  akcija jsonb not null,
  automatski boolean not null default false,
  prioritet int not null default 100,
  aktivno boolean not null default true,
  created_at timestamptz not null default now()
);

-- === Nacrti odgovora ===
create table drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  message_id uuid references messages(id) on delete cascade,
  tekst text not null,
  status text not null default 'nacrt',
  poslano_u timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- === Sastanci ===
create table events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  vanjski_id text,
  naslov text not null,
  lokacija text,
  pocetak timestamptz not null,
  kraj timestamptz,
  ucesnici text[] not null default '{}',
  priprema text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- === Dogadjaji iz repozitorija ===
create table repo_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  vrsta repo_vrsta not null,
  repo text,
  poruka text,
  status text,
  url text,
  vrijeme timestamptz not null default now()
);

-- === Trag aktivnosti ===
create table activity (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  entitet text not null,
  entitet_id uuid,
  akcija text not null,
  ko text not null default 'sistem',
  detalji jsonb,
  vrijeme timestamptz not null default now()
);

-- === Okidaci za updated_at ===
create trigger t_accounts_updated before update on accounts for each row execute function set_updated_at();
create trigger t_projects_updated before update on projects for each row execute function set_updated_at();
create trigger t_contacts_updated before update on contacts for each row execute function set_updated_at();
create trigger t_threads_updated  before update on threads  for each row execute function set_updated_at();
create trigger t_tasks_updated    before update on tasks    for each row execute function set_updated_at();
create trigger t_drafts_updated   before update on drafts   for each row execute function set_updated_at();
create trigger t_events_updated   before update on events   for each row execute function set_updated_at();
