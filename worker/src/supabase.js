import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const kljuc = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !kljuc) {
  throw new Error(
    "Nedostaje SUPABASE_URL ili SUPABASE_SERVICE_ROLE_KEY u .env fajlu.",
  );
}

export const baza = createClient(url, kljuc, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Korisnik po adresi iz .env fajla. */
export async function nadjiVlasnika(email) {
  if (!email) throw new Error("Nedostaje VLASNIK_EMAIL u .env fajlu.");

  const { data, error } = await baza.auth.admin.listUsers({ perPage: 200 });
  if (error) throw error;

  const korisnik = data.users.find(
    (k) => k.email?.toLowerCase() === email.toLowerCase(),
  );
  if (!korisnik) {
    throw new Error(
      `Nema korisnika s adresom ${email}. Prijavi se jednom u panel pa pokreni ponovo.`,
    );
  }
  return korisnik;
}

/** Aktivni nalozi, onako kako su podeseni u panelu. */
export async function ucitajNaloge(userId) {
  const { data, error } = await baza
    .from("accounts")
    .select(
      "id, naziv, host, port, korisnik, workspace_id, fascikla_poslane, secret_ref, stanje",
    )
    .eq("user_id", userId)
    .eq("aktivan", true)
    .order("naziv");

  if (error) throw error;
  return data ?? [];
}

/** Lozinka iz Vaulta. Ovu funkciju smije zvati samo service_role. */
export async function lozinkaNaloga(accountId) {
  const { data, error } = await baza.rpc("lozinka_naloga", {
    p_account_id: accountId,
  });
  if (error) throw error;
  return data;
}

export async function upisiStanje(accountId, stanje) {
  await baza
    .from("accounts")
    .update({
      stanje,
      zadnja_sinhronizacija: new Date().toISOString(),
      zadnja_greska: null,
    })
    .eq("id", accountId);
}

export async function upisiGresku(accountId, poruka) {
  await baza
    .from("accounts")
    .update({ zadnja_greska: poruka?.slice(0, 300) ?? null })
    .eq("id", accountId);
}
