import type { SupabaseClient } from "@supabase/supabase-js";
import type { Ishod, Mail, ProstorZaAI } from "@/lib/ai";

/** Sadrzaj prijedloga koji se prikazuje na kartici. */
export type SadrzajPrijedloga = {
  naslov: string;
  sazetak: string;
  zadatak: string | null;
  prioritet: number;
  rok: string | null;
  nacrt: string | null;
  original: Mail;
  nalog_id: string | null;
  prostor_slug: string | null;
};

/**
 * Upisuje prijedlog za Prijedlozi tab. Reklame se ne upisuju.
 * Prostor: onaj koji je AI prepoznao, inace prostor naloga, inace prvi prostor.
 */
export async function kreirajPrijedlog(
  supabase: SupabaseClient,
  korisnikId: string,
  ishod: Ishod,
  mail: Mail,
  nalogId: string | null,
  prostori: ProstorZaAI[],
  prostorNaloga: string | null,
): Promise<{ filtrirano: boolean; poruka: string }> {
  if (ishod.filtrirano) {
    return { filtrirano: true, poruka: `Filtrirano kao reklama ili newsletter: ${ishod.razlog}` };
  }

  const prostor =
    ishod.prostor ??
    prostori.find((p) => p.id === prostorNaloga) ??
    prostori[0];
  if (!prostor) return { filtrirano: false, poruka: "Nema prostora za ovaj mail." };

  const sadrzaj: SadrzajPrijedloga = {
    naslov: ishod.analiza.zadatak ?? mail.tema ?? "Mail bez teme",
    sazetak: ishod.analiza.sazetak,
    zadatak: ishod.analiza.zadatak,
    prioritet: ishod.analiza.prioritet,
    rok: ishod.analiza.rok,
    nacrt: ishod.nacrt,
    original: mail,
    nalog_id: nalogId,
    prostor_slug: prostor.slug,
  };

  const { error } = await supabase.from("suggestions").insert({
    user_id: korisnikId,
    workspace_id: prostor.id,
    tip: "odgovor",
    sadrzaj,
    obrazlozenje: ishod.analiza.razlog,
    status: "ceka",
  });
  if (error) return { filtrirano: false, poruka: error.message };

  return { filtrirano: false, poruka: `Novi prijedlog za ${prostor.naziv}.` };
}
