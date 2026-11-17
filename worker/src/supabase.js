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

/** Korisnik i njegovi prostori, po adresi iz .env fajla. */
export async function nadjiVlasnika(email) {
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

  const { data: prostori, error: greska } = await baza
    .from("workspaces")
    .select("id, naziv, slug")
    .eq("user_id", korisnik.id);
  if (greska) throw greska;

  return { korisnik, prostori: prostori ?? [] };
}

/** Stanje sinhronizacije po nalogu cuvamo u accounts.stanje. */
export async function upisiStanje(accountId, stanje) {
  await baza
    .from("accounts")
    .update({ stanje, zadnja_sinhronizacija: new Date().toISOString() })
    .eq("id", accountId);
}

/** Nalog iz .env fajla uparujemo s redom u bazi; pravimo ga ako ga nema. */
export async function osiguraj(nalog, userId, workspaceId) {
  const { data: postojeci } = await baza
    .from("accounts")
    .select("id, stanje")
    .eq("user_id", userId)
    .eq("korisnik", nalog.korisnik)
    .maybeSingle();

  if (postojeci) return postojeci;

  const { data, error } = await baza
    .from("accounts")
    .insert({
      user_id: userId,
      workspace_id: workspaceId,
      naziv: nalog.naziv,
      vrsta: "imap",
      email: nalog.korisnik,
      host: nalog.host,
      port: nalog.port,
      korisnik: nalog.korisnik,
      secret_ref: "env",
      stanje: {},
    })
    .select("id, stanje")
    .single();

  if (error) throw error;
  return data;
}
