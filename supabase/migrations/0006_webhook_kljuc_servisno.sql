-- Webhook ruta nema prijavljenog korisnika, pa Claude kljuc vadi servisni kljuc.
create or replace function public.ai_kljuc_korisnika(p_user uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tajna text;
begin
  select ds.decrypted_secret into v_tajna
  from public.korisnik_postavke kp
  join vault.decrypted_secrets ds on ds.id = kp.anthropic_secret_id
  where kp.user_id = p_user;
  return v_tajna;
end;
$$;

revoke execute on function public.ai_kljuc_korisnika(uuid) from public, anon, authenticated;
grant execute on function public.ai_kljuc_korisnika(uuid) to service_role;
