-- AI obrada mailova, webhook prijem, test konekcije i SMTP za slanje odgovora.

alter type account_vrsta add value if not exists 'webhook';

alter table accounts add column if not exists smtp_host text;
alter table accounts add column if not exists smtp_port int;
alter table accounts add column if not exists webhook_token text unique;
alter table accounts add column if not exists test_status text;   -- 'povezano' | 'greska'
alter table accounts add column if not exists test_poruka text;
alter table accounts add column if not exists test_u timestamptz;

alter table workspaces add column if not exists ton text;

alter table tasks add column if not exists vrijeme text;           -- HH:MM iz brzog unosa

-- Postavke po korisniku: koji modeli se koriste i gdje je kljuc u Vaultu.
create table if not exists korisnik_postavke (
  user_id uuid primary key references auth.users(id) on delete cascade,
  anthropic_secret_id uuid,
  model_brzi text not null default 'claude-haiku-5-5',
  model_pisanje text not null default 'claude-sonnet-5-5',
  azuriran timestamptz not null default now()
);

alter table korisnik_postavke enable row level security;
create policy "vlastiti redovi" on korisnik_postavke for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Panel upisuje Claude kljuc. Ne moze ga procitati nazad u UI.
create or replace function public.sacuvaj_ai_kljuc(p_kljuc text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_ref uuid;
begin
  if v_uid is null then raise exception 'Nisi prijavljen.'; end if;
  if p_kljuc is null or length(p_kljuc) < 20 then raise exception 'Kljuc izgleda prazno.'; end if;

  select anthropic_secret_id into v_ref from public.korisnik_postavke where user_id = v_uid;

  if v_ref is null then
    v_ref := vault.create_secret(p_kljuc, 'anthropic_' || v_uid::text, 'Anthropic API kljuc')::uuid;
    insert into public.korisnik_postavke (user_id, anthropic_secret_id)
    values (v_uid, v_ref)
    on conflict (user_id) do update set anthropic_secret_id = excluded.anthropic_secret_id, azuriran = now();
  else
    perform vault.update_secret(v_ref, p_kljuc);
    update public.korisnik_postavke set azuriran = now() where user_id = v_uid;
  end if;
end;
$$;

-- Server akcije citaju kljuc za pozive Claudeu. Samo za prijavljenog vlasnika.
create or replace function public.ai_kljuc()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_tajna text;
begin
  select ds.decrypted_secret into v_tajna
  from public.korisnik_postavke kp
  join vault.decrypted_secrets ds on ds.id = kp.anthropic_secret_id
  where kp.user_id = v_uid;
  return v_tajna;
end;
$$;

-- Lozinka naloga za slanje (SMTP) i test. Samo vlasnik naloga.
create or replace function public.lozinka_naloga_vlasnika(p_account_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ref   text;
  v_tajna text;
begin
  select a.secret_ref into v_ref
  from public.accounts a
  where a.id = p_account_id and a.user_id = (select auth.uid());

  if v_ref is null or v_ref = 'env' then return null; end if;

  select decrypted_secret into v_tajna from vault.decrypted_secrets where id = v_ref::uuid;
  return v_tajna;
end;
$$;

revoke execute on function public.sacuvaj_ai_kljuc(text) from public, anon;
revoke execute on function public.ai_kljuc() from public, anon;
revoke execute on function public.lozinka_naloga_vlasnika(uuid) from public, anon;
grant execute on function public.sacuvaj_ai_kljuc(text) to authenticated;
grant execute on function public.ai_kljuc() to authenticated;
grant execute on function public.lozinka_naloga_vlasnika(uuid) to authenticated;
