"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ImapFlow } from "imapflow";
import { server } from "@/lib/supabase/server";

export type IshodNaloga = { greska?: string; poruka?: string };
export type IshodTesta = { ok: boolean; poruka: string };

const VRSTE = ["imap", "gmail", "webhook"] as const;
type Vrsta = (typeof VRSTE)[number];

function citaj(formData: FormData) {
  const vrsta = String(formData.get("vrsta") ?? "imap");
  const port = Number(formData.get("port") ?? 993);
  const smtpPort = Number(formData.get("smtp_port") ?? 587);
  return {
    naziv: String(formData.get("naziv") ?? "").trim(),
    workspace_id: String(formData.get("workspace_id") ?? ""),
    vrsta: (VRSTE.includes(vrsta as Vrsta) ? vrsta : "imap") as Vrsta,
    host: String(formData.get("host") ?? "").trim(),
    port: Number.isFinite(port) ? port : 993,
    korisnik: String(formData.get("korisnik") ?? "").trim(),
    email: String(formData.get("korisnik") ?? "").trim(),
    fascikla_poslane: String(formData.get("fascikla_poslane") ?? "").trim() || null,
    smtp_host: String(formData.get("smtp_host") ?? "").trim() || null,
    smtp_port: Number.isFinite(smtpPort) ? smtpPort : 587,
    aktivan: formData.get("aktivan") === "on",
  };
}

async function prijavljen() {
  const supabase = await server();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/prijava");
  return { supabase, user };
}

/** Dodaje ili uredjuje nalog. Lozinka ide u Vault, webhook dobija token. */
export async function sacuvajNalog(
  _prethodno: IshodNaloga,
  formData: FormData,
): Promise<IshodNaloga> {
  const { supabase, user } = await prijavljen();

  const id = String(formData.get("id") ?? "").trim();
  const lozinka = String(formData.get("lozinka") ?? "");
  const polja = citaj(formData);

  if (!polja.naziv || !polja.workspace_id) {
    return { greska: "Naziv i prostor su obavezni." };
  }
  if (polja.vrsta !== "webhook" && (!polja.host || !polja.korisnik)) {
    return { greska: "Server i korisničko ime su obavezni." };
  }

  let accountId = id;

  if (id) {
    const { error } = await supabase.from("accounts").update(polja).eq("id", id);
    if (error) return { greska: error.message };
  } else {
    if (polja.vrsta !== "webhook" && !lozinka) {
      return { greska: "Za novi nalog treba i lozinka." };
    }
    const { data, error } = await supabase
      .from("accounts")
      .insert({
        ...polja,
        user_id: user.id,
        stanje: {},
        webhook_token: polja.vrsta === "webhook" ? randomBytes(24).toString("hex") : null,
      })
      .select("id")
      .single();
    if (error) return { greska: error.message };
    accountId = data.id;
  }

  if (lozinka && polja.vrsta !== "webhook") {
    const { error } = await supabase.rpc("sacuvaj_lozinku", {
      p_account_id: accountId,
      p_lozinka: lozinka,
    });
    if (error) return { greska: `Nalog je spašen, ali lozinka nije: ${error.message}` };
  }

  revalidatePath("/nalozi");
  return { poruka: id ? "Izmjene su spašene." : "Nalog je dodan." };
}

/**
 * Testira IMAP prijavu koristeci upisane podatke. Ako lozinka nije upisana,
 * uzima sacuvanu iz Vaulta (samo za vlasnika naloga).
 */
export async function testirajNalog(formData: FormData): Promise<IshodTesta> {
  const { supabase } = await prijavljen();
  const id = String(formData.get("id") ?? "").trim();
  const polja = citaj(formData);

  if (polja.vrsta === "webhook") {
    await upisiTest(supabase, id, "povezano", "Adresa za prijem je spremna. Šalji POST na nju.");
    return { ok: true, poruka: "Adresa za prijem je spremna." };
  }

  let lozinka = String(formData.get("lozinka") ?? "");
  if (!lozinka && id) {
    const { data } = await supabase.rpc("lozinka_naloga_vlasnika", { p_account_id: id });
    lozinka = data ?? "";
  }
  if (!polja.host || !polja.korisnik) {
    return { ok: false, poruka: "Upiši server i korisničko ime." };
  }
  if (!lozinka) {
    return { ok: false, poruka: "Upiši lozinku za test." };
  }

  const klijent = new ImapFlow({
    host: polja.host,
    port: polja.port,
    secure: polja.port === 993,
    auth: { user: polja.korisnik, pass: lozinka },
    logger: false,
  });

  try {
    await klijent.connect();
    await klijent.logout();
    const poruka = "Prijava uspjela. Nalog je povezan.";
    await upisiTest(supabase, id, "povezano", poruka);
    return { ok: true, poruka };
  } catch (e) {
    const poruka = `Greška: ${e instanceof Error ? e.message : "nepoznata greška"}`;
    await upisiTest(supabase, id, "greska", poruka);
    return { ok: false, poruka };
  }
}

async function upisiTest(
  supabase: Awaited<ReturnType<typeof server>>,
  id: string,
  status: "povezano" | "greska",
  poruka: string,
) {
  if (!id) return;
  await supabase
    .from("accounts")
    .update({ test_status: status, test_poruka: poruka, test_u: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/nalozi");
}

export async function obrisiNalog(id: string) {
  const { supabase } = await prijavljen();
  await supabase.from("accounts").delete().eq("id", id);
  revalidatePath("/nalozi");
}

export async function prebaciAktivan(id: string, aktivan: boolean) {
  const { supabase } = await prijavljen();
  await supabase.from("accounts").update({ aktivan }).eq("id", id);
  revalidatePath("/nalozi");
}
