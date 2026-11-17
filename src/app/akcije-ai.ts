"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import nodemailer from "nodemailer";
import { server } from "@/lib/supabase/server";
import { ucitajProstore } from "@/lib/prostor";
import { obradiMail, testirajKljuc, type Mail } from "@/lib/ai";
import { kreirajPrijedlog, type SadrzajPrijedloga } from "@/lib/prijedlog";

export type IshodAI = { greska?: string; poruka?: string };

const MODELI = ["claude-haiku-5-5", "claude-sonnet-5-5"];

async function prijavljen() {
  const supabase = await server();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/prijava");
  return { supabase, user };
}

/** Sprema Claude kljuc (u Vault) i izabrane modele. Prazno polje kljuca ostavlja stari. */
export async function spremiAI(_prethodno: IshodAI, formData: FormData): Promise<IshodAI> {
  const { supabase, user } = await prijavljen();

  const kljuc = String(formData.get("kljuc") ?? "").trim();
  const modelBrzi = String(formData.get("model_brzi") ?? "");
  const modelPisanje = String(formData.get("model_pisanje") ?? "");
  if (!MODELI.includes(modelBrzi) || !MODELI.includes(modelPisanje)) {
    return { greska: "Izaberi modele sa liste." };
  }

  if (kljuc) {
    const { error } = await supabase.rpc("sacuvaj_ai_kljuc", { p_kljuc: kljuc });
    if (error) return { greska: error.message };
  }

  const { error } = await supabase.from("korisnik_postavke").upsert(
    {
      user_id: user.id,
      model_brzi: modelBrzi,
      model_pisanje: modelPisanje,
      azuriran: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) return { greska: error.message };

  revalidatePath("/nalozi");
  return { poruka: kljuc ? "Ključ i postavke su sačuvani." : "Postavke su sačuvane." };
}

/** Provjerava da Claude prihvata sacuvani kljuc. */
export async function testirajAI(): Promise<IshodAI> {
  const { supabase, user } = await prijavljen();

  const { data: kljuc } = await supabase.rpc("ai_kljuc");
  if (!kljuc) return { greska: "Prvo sačuvaj Claude ključ." };

  const { data: p } = await supabase
    .from("korisnik_postavke")
    .select("model_brzi")
    .eq("user_id", user.id)
    .maybeSingle();

  try {
    await testirajKljuc(kljuc as string, p?.model_brzi ?? "claude-haiku-5-5");
    return { poruka: "Veza s Claudeom radi." };
  } catch (e) {
    return { greska: `Ključ nije prihvaćen: ${e instanceof Error ? e.message : "greška"}` };
  }
}

/** Demo / test mod: zalijepi mail, AI ga obradi kao pravi dolazni. */
export async function simulirajMail(_prethodno: IshodAI, formData: FormData): Promise<IshodAI> {
  const { supabase, user } = await prijavljen();

  const mail: Mail = {
    od: String(formData.get("od") ?? "").trim(),
    tema: String(formData.get("tema") ?? "").trim(),
    tijelo: String(formData.get("tijelo") ?? "").trim(),
  };
  if (!mail.tijelo) return { greska: "Zalijepi tekst maila." };

  const nalogId = String(formData.get("nalog_id") ?? "") || null;

  const { data: kljuc } = await supabase.rpc("ai_kljuc");
  if (!kljuc) return { greska: "Dodaj Claude ključ u Nalozi i AI podešavanja." };

  const { data: p } = await supabase
    .from("korisnik_postavke")
    .select("model_brzi, model_pisanje")
    .eq("user_id", user.id)
    .maybeSingle();

  const { prostori } = await ucitajProstore();

  let prostorNaloga: string | null = null;
  if (nalogId) {
    const { data: nalog } = await supabase
      .from("accounts")
      .select("workspace_id")
      .eq("id", nalogId)
      .maybeSingle();
    prostorNaloga = nalog?.workspace_id ?? null;
  }

  try {
    const ishod = await obradiMail({
      kljuc: kljuc as string,
      modelBrzi: p?.model_brzi ?? "claude-haiku-5-5",
      modelPisanje: p?.model_pisanje ?? "claude-sonnet-5-5",
      mail,
      prostori,
    });
    const r = await kreirajPrijedlog(supabase, user.id, ishod, mail, nalogId, prostori, prostorNaloga);
    if (r.poruka.startsWith("Novi")) revalidatePath("/", "layout");
    return { poruka: r.poruka };
  } catch (e) {
    return { greska: `AI obrada nije uspjela: ${e instanceof Error ? e.message : "greška"}` };
  }
}

/** Sprema izmijenjen nacrt bez slanja. */
export async function urediNacrt(id: string, nacrt: string): Promise<IshodAI> {
  const { supabase } = await prijavljen();
  const { data: p } = await supabase.from("suggestions").select("sadrzaj").eq("id", id).single();
  if (!p) return { greska: "Prijedlog ne postoji." };

  const sadrzaj = { ...(p.sadrzaj as SadrzajPrijedloga), nacrt };
  const { error } = await supabase.from("suggestions").update({ sadrzaj }).eq("id", id);
  if (error) return { greska: error.message };
  revalidatePath("/prijedlozi");
  return { poruka: "Nacrt je sačuvan." };
}

function emailIz(tekst: string): string | null {
  const m = tekst.match(/[^<\s"']+@[^>\s"']+/);
  return m ? m[0] : null;
}

/**
 * Odobri i posalji. Ako nalog ima SMTP, mail se stvarno salje.
 * Ako nema (demo nalog), samo se bilježi slanje. Kartica ide u Čekam odgovor sa rokom od 48h.
 */
export async function odobriPrijedlog(id: string, nacrt: string): Promise<IshodAI> {
  const { supabase, user } = await prijavljen();

  const { data: p } = await supabase
    .from("suggestions")
    .select("id, sadrzaj, workspace_id")
    .eq("id", id)
    .single();
  if (!p) return { greska: "Prijedlog ne postoji." };

  const s = p.sadrzaj as SadrzajPrijedloga;
  const primalac = emailIz(s.original.od);
  let stvarnoPoslano = false;

  if (s.nalog_id) {
    const { data: nalog } = await supabase
      .from("accounts")
      .select("id, korisnik, smtp_host, smtp_port")
      .eq("id", s.nalog_id)
      .maybeSingle();

    if (nalog?.smtp_host) {
      if (!primalac) return { greska: "Ne vidim email adresu pošiljaoca." };
      const { data: lozinka } = await supabase.rpc("lozinka_naloga_vlasnika", {
        p_account_id: nalog.id,
      });
      const port = nalog.smtp_port ?? 587;
      try {
        const transport = nodemailer.createTransport({
          host: nalog.smtp_host,
          port,
          secure: port === 465,
          auth: { user: nalog.korisnik ?? undefined, pass: lozinka ?? undefined },
        });
        await transport.sendMail({
          from: nalog.korisnik ?? undefined,
          to: primalac,
          subject: s.original.tema.startsWith("Re:") ? s.original.tema : `Re: ${s.original.tema}`,
          text: nacrt,
        });
        stvarnoPoslano = true;
      } catch (e) {
        return { greska: `Slanje nije uspjelo: ${e instanceof Error ? e.message : "greška"}` };
      }
    }
  }

  const sada = new Date();
  const rokOdgovora = new Date(sada.getTime() + 48 * 3600 * 1000).toISOString();

  await supabase.from("threads").insert({
    user_id: user.id,
    workspace_id: p.workspace_id,
    thread_key: `ai:${id}`,
    tema: s.original.tema,
    ucesnici: primalac ? [primalac] : [s.original.od],
    zadnja_poruka: sada.toISOString(),
    ceka_odgovor: true,
    rok_odgovora: rokOdgovora,
  });

  if (s.zadatak) {
    await supabase.from("tasks").insert({
      user_id: user.id,
      workspace_id: p.workspace_id,
      naslov: s.zadatak,
      opis: s.sazetak,
      rok: s.rok,
      prioritet: s.prioritet,
      faza: "cekam_drugog",
    });
  }

  await supabase
    .from("suggestions")
    .update({
      status: "prihvacen",
      rijeseno_u: sada.toISOString(),
      sadrzaj: { ...s, nacrt, poslano_stvarno: stvarnoPoslano, poslano_u: sada.toISOString() },
    })
    .eq("id", id);

  revalidatePath("/", "layout");
  return {
    poruka: stvarnoPoslano
      ? "Poslano. Čekam odgovor 48h."
      : "Označeno kao poslano (demo nalog, mail nije otišao). Čekam odgovor 48h.",
  };
}
