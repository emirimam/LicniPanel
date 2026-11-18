-- SMTP (slanje) postaje odvojen od IMAP-a: svoje korisnicko ime, lozinka, sifrovanje i adresa posiljaoca.
-- Stari nalozi bez ovih polja i dalje rade: slanje koristi IMAP korisnika i lozinku.

alter table accounts add column if not exists smtp_korisnik text;
alter table accounts add column if not exists smtp_od text;
alter table accounts add column if not exists smtp_secret_ref text;
alter table accounts add column if not exists smtp_tls text not null default 'starttls'
  check (smtp_tls in ('ssl', 'starttls', 'nista'));

-- Panel zove ovo da upise ili promijeni SMTP lozinku. Ne moze je procitati nazad.
create or replace function public.sacuvaj_smtp_lozinku(p_account_id uuid, p_lozinka text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
  v_ref  text;
begin
  select user_id, smtp_secret_ref into v_user, v_ref
  from public.accounts
  where id = p_account_id;

  if v_user is null or v_user is distinct from (select auth.uid()) then
    raise exception 'Nalog ne postoji ili nije tvoj.';
  end if;

  if p_lozinka is null or length(p_lozinka) = 0 then
    raise exception 'Prazna lozinka.';
  end if;

  if v_ref is null then
    v_ref := vault.create_secret(
      p_lozinka,
      'smtp_' || p_account_id::text,
      'SMTP lozinka naloga u licnom panelu'
    )::text;
    update public.accounts set smtp_secret_ref = v_ref where id = p_account_id;
  else
    perform vault.update_secret(v_ref::uuid, p_lozinka);
  end if;
end;
$$;

-- Za slanje maila iz panela. Samo vlasnik naloga.
create or replace function public.smtp_lozinka_vlasnika(p_account_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ref   text;
  v_tajna text;
begin
  select a.smtp_secret_ref into v_ref
  from public.accounts a
  where a.id = p_account_id and a.user_id = (select auth.uid());

  if v_ref is null then return null; end if;

  select decrypted_secret into v_tajna from vault.decrypted_secrets where id = v_ref::uuid;
  return v_tajna;
end;
$$;

revoke execute on function public.sacuvaj_smtp_lozinku(uuid, text) from public, anon;
revoke execute on function public.smtp_lozinka_vlasnika(uuid) from public, anon;
grant execute on function public.sacuvaj_smtp_lozinku(uuid, text) to authenticated;
grant execute on function public.smtp_lozinka_vlasnika(uuid) to authenticated;

-- Brisanje naloga nosi sa sobom i IMAP i SMTP tajnu.
create or replace function public.ocisti_tajnu_naloga()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.secret_ref is not null and old.secret_ref <> 'env' then
    delete from vault.secrets where id = old.secret_ref::uuid;
  end if;
  if old.smtp_secret_ref is not null then
    delete from vault.secrets where id = old.smtp_secret_ref::uuid;
  end if;
  return old;
end;
$$;
