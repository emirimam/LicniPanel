"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { server } from "@/lib/supabase/server";
import { ucitajProstore } from "@/lib/prostor";
import { obradiMail, napisiNacrtZa, testirajKljuc, type Mail } from "@/lib/ai";
import { smtpTransport, ucitajSmtp } from "@/lib/smtp";
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
    datum: new Date().toISOString(),
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

/** Vraca filtrirani mail u prijedloge i generise nacrt (AI je pogresio). */
async function vratiFiltriraniInterno(id: string): Promise<IshodAI> {
  const { supabase, user } = await prijavljen();

  const { data: p } = await supabase
    .from("suggestions")
    .select("id, sadrzaj, workspace_id")
    .eq("id", id)
    .single();
  if (!p) return { greska: "Prijedlog ne postoji." };

  const { data: kljuc } = await supabase.rpc("ai_kljuc");
  if (!kljuc) return { greska: "Dodaj Claude ključ u Nalozi i AI podešavanja." };

  const { data: post } = await supabase
    .from("korisnik_postavke")
    .select("model_pisanje")
    .eq("user_id", user.id)
    .maybeSingle();

  const s = p.sadrzaj as SadrzajPrijedloga;
  const { prostori } = await ucitajProstore();
  const prostor = prostori.find((x) => x.id === p.workspace_id) ?? null;

  try {
    const nacrt = await napisiNacrtZa({
      kljuc: kljuc as string,
      modelPisanje: post?.model_pisanje ?? "claude-sonnet-5-5",
      mail: s.original,
      prostor,
    });
    const { error } = await supabase
      .from("suggestions")
      .update({ status: "ceka", sadrzaj: { ...s, nacrt } })
      .eq("id", id);
    if (error) return { greska: error.message };
    revalidatePath("/prijedlozi");
    return { poruka: "Vraćeno u prijedloge." };
  } catch (e) {
    return { greska: `Nacrt nije uspio: ${e instanceof Error ? e.message : "greška"}` };
  }
}

/** Oblik za form action: vraca void, ishod se vidi u panelu nakon osvjezenja. */
export async function vratiFiltrirano(id: string): Promise<void> {
  await vratiFiltriraniInterno(id);
}

function emailIz(tekst: string): string | null {
  const m = tekst.match(/[^<\s"']+@[^>\s"']+/);
  return m ? m[0] : null;
}

/**
 * Odobri i posalji. Ako nalog ima SMTP, mail se stvarno salje.
 * Ako nema (demo nalog), samo se bilježi slanje. Poslani mail i original se spremaju
 * u prepisku, a na tabli se pravi kartica (Čekam drugog) iz koje se mail otvara u cijelosti.
 */
export async function odobriPrijedlog(id: string, nacrt: string): Promise<IshodAI> {
  const { supabase, user } = await prijavljen();

  const tekst = nacrt.trim();
  if (!tekst) return { greska: "Odgovor je prazan." };

  const { data: p } = await supabase
    .from("suggestions")
    .select("id, sadrzaj, workspace_id, status")
    .eq("id", id)
    .single();
  if (!p) return { greska: "Prijedlog ne postoji." };
  // Zastita od duplog klika: vec rijesen prijedlog se ne salje ponovo.
  if (p.status !== "ceka") return { greska: "Ovaj prijedlog je već riješen." };

  const s = p.sadrzaj as SadrzajPrijedloga;
  const primalac = emailIz(s.original.od);
  const tema = /^re:/i.test(s.original.tema) ? s.original.tema : `Re: ${s.original.tema || "(bez teme)"}`;
  const sada = new Date();

  let stvarnoPoslano = false;
  let posiljalac: string | null = null;
  let idPoruke = `<demo-${randomUUID()}@licni-panel.local>`;

  if (s.nalog_id) {
    const smtp = await ucitajSmtp(supabase, s.nalog_id);
    if (smtp) {
      if (!primalac) return { greska: "Ne vidim email adresu pošiljaoca." };
      if (smtp.korisnik && !smtp.lozinka) {
        return { greska: "SMTP lozinka nije postavljena. Dodaj je u Nalozi." };
      }
      try {
        const info = await smtpTransport(smtp).sendMail({
          from: smtp.od,
          to: primalac,
          subject: tema,
          text: tekst,
        });
        stvarnoPoslano = true;
        posiljalac = smtp.od;
        if (info.messageId) idPoruke = info.messageId;
      } catch (e) {
        return { greska: `Slanje nije uspjelo: ${e instanceof Error ? e.message : "greška"}` };
      }
    }
  }

  // Od ovog trenutka mail je (ako je stvarno) otisao. Greske u bazi se samo prijavljuju.
  const upozorenja: string[] = [];

  const { data: prepiska, error: greskaPrepiske } = await supabase
    .from("threads")
    .insert({
      user_id: user.id,
      workspace_id: p.workspace_id,
      thread_key: `ai:${id}`,
      tema: s.original.tema,
      ucesnici: primalac ? [primalac] : [s.original.od],
      zadnja_poruka: sada.toISOString(),
      ceka_odgovor: true,
      rok_odgovora: new Date(sada.getTime() + 48 * 3600 * 1000).toISOString(),
    })
    .select("id")
    .single();
  if (greskaPrepiske) upozorenja.push(greskaPrepiske.message);

  const prepiskaId = prepiska?.id ?? null;

  // Original (dolazni) mail, da se prepiska vidi cijela.
  await supabase.from("messages").insert({
    user_id: user.id,
    workspace_id: p.workspace_id,
    account_id: s.nalog_id,
    thread_id: prepiskaId,
    message_id: `ai-orig:${id}`,
    smjer: "ulazna",
    od: s.original.od,
    za: posiljalac ? [posiljalac] : [],
    tema: s.original.tema,
    tijelo: s.original.tijelo,
    izvod: s.original.tijelo.slice(0, 400),
    datum: s.original.datum ?? new Date(sada.getTime() - 1000).toISOString(),
    obradjena: true,
  });

  // Poslani odgovor.
  const { data: poslana, error: greskaPoruke } = await supabase
    .from("messages")
    .insert({
      user_id: user.id,
      workspace_id: p.workspace_id,
      account_id: s.nalog_id,
      thread_id: prepiskaId,
      message_id: idPoruke,
      smjer: "izlazna",
      od: posiljalac,
      za: primalac ? [primalac] : [],
      tema,
      tijelo: tekst,
      izvod: tekst.slice(0, 400),
      datum: sada.toISOString(),
      obradjena: true,
    })
    .select("id")
    .single();
  if (greskaPoruke) upozorenja.push(greskaPoruke.message);

  // Kartica na tabli uvijek postoji, da se poslani mail moze otvoriti i procitati.
  const { error: greskaZadatka } = await supabase.from("tasks").insert({
    user_id: user.id,
    workspace_id: p.workspace_id,
    naslov: s.zadatak ?? `Čekam odgovor: ${s.original.tema || "(bez teme)"}`,
    opis: s.sazetak,
    rok: s.rok,
    prioritet: s.prioritet,
    faza: "cekam_drugog",
    source_message_id: poslana?.id ?? null,
  });
  if (greskaZadatka) upozorenja.push(greskaZadatka.message);

  await supabase
    .from("suggestions")
    .update({
      status: "prihvacen",
      rijeseno_u: sada.toISOString(),
      sadrzaj: { ...s, nacrt: tekst, poslano_stvarno: stvarnoPoslano, poslano_u: sada.toISOString() },
    })
    .eq("id", id);

  revalidatePath("/", "layout");

  const osnova = stvarnoPoslano
    ? `Poslano na ${primalac}. Čekam odgovor 48h.`
    : "Označeno kao poslano (nalog nema SMTP, mail nije otišao). Čekam odgovor 48h.";
  return {
    poruka: upozorenja.length ? `${osnova} Upozorenje: ${upozorenja.join("; ")}` : osnova,
  };
}
