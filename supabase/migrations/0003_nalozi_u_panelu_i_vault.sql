-- Nalozi se sada podesavaju u panelu. Lozinka ide u Vault, nikad u tabelu.

alter table accounts add column if not exists fascikla_poslane text;
alter table accounts add column if not exists zadnja_greska text;

-- Panel zove ovo da upise ili promijeni lozinku. Ne moze je procitati nazad.
create or replace function public.sacuvaj_lozinku(p_account_id uuid, p_lozinka text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
  v_ref  text;
begin
  select user_id, secret_ref into v_user, v_ref
  from public.accounts
  where id = p_account_id;

  if v_user is null or v_user is distinct from (select auth.uid()) then
    raise exception 'Nalog ne postoji ili nije tvoj.';
  end if;

  if p_lozinka is null or length(p_lozinka) = 0 then
    raise exception 'Prazna lozinka.';
  end if;

  if v_ref is null or v_ref = 'env' then
    v_ref := vault.create_secret(
      p_lozinka,
      'nalog_' || p_account_id::text,
      'IMAP lozinka naloga u licnom panelu'
    )::text;

    update public.accounts set secret_ref = v_ref where id = p_account_id;
  else
    perform vault.update_secret(v_ref::uuid, p_lozinka);
  end if;
end;
$$;

revoke execute on function public.sacuvaj_lozinku(uuid, text) from public, anon;
grant execute on function public.sacuvaj_lozinku(uuid, text) to authenticated;

-- Worker zove ovo. Samo service_role, nikad prijavljeni korisnik u browseru.
create or replace function public.lozinka_naloga(p_account_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ref   text;
  v_tajna text;
begin
  select secret_ref into v_ref from public.accounts where id = p_account_id;
  if v_ref is null or v_ref = 'env' then
    return null;
  end if;

  select decrypted_secret into v_tajna
  from vault.decrypted_secrets
  where id = v_ref::uuid;

  return v_tajna;
end;
$$;

revoke execute on function public.lozinka_naloga(uuid) from public, anon, authenticated;
grant execute on function public.lozinka_naloga(uuid) to service_role;

-- Brisanje naloga nosi i njegovu tajnu sa sobom.
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
  return old;
end;
$$;

revoke execute on function public.ocisti_tajnu_naloga() from public, anon, authenticated;

create trigger t_accounts_brisanje
  before delete on accounts
  for each row execute function public.ocisti_tajnu_naloga();
