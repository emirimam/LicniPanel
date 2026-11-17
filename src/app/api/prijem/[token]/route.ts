import { createClient } from "@supabase/supabase-js";
import { obradiMail, type ProstorZaAI } from "@/lib/ai";
import { kreirajPrijedlog } from "@/lib/prijedlog";

export const runtime = "nodejs";

/**
 * Webhook / forwarding prijem. POST JSON: { od, tema, tijelo }.
 * Token iz naloga je jedina autorizacija. Koristi servisni kljuc, pa mora biti u env-u.
 */
export async function POST(
  zahtjev: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const baza = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const { data: nalog } = await baza
    .from("accounts")
    .select("id, user_id, workspace_id, aktivan")
    .eq("webhook_token", token)
    .maybeSingle();
  if (!nalog || !nalog.aktivan) {
    return Response.json({ greska: "Nepoznata ili pauzirana adresa." }, { status: 404 });
  }

  let tijelo: { od?: string; tema?: string; tijelo?: string };
  try {
    tijelo = await zahtjev.json();
  } catch {
    return Response.json({ greska: "Očekujem JSON." }, { status: 400 });
  }
  const mail = {
    od: String(tijelo.od ?? "").slice(0, 300),
    tema: String(tijelo.tema ?? "").slice(0, 300),
    tijelo: String(tijelo.tijelo ?? ""),
  };
  if (!mail.tijelo) {
    return Response.json({ greska: "Prazno tijelo." }, { status: 400 });
  }

  const { data: kljuc } = await baza.rpc("ai_kljuc_korisnika", { p_user: nalog.user_id });
  if (!kljuc) {
    return Response.json({ greska: "Korisnik nema Claude ključ." }, { status: 409 });
  }

  const { data: postavke } = await baza
    .from("korisnik_postavke")
    .select("model_brzi, model_pisanje")
    .eq("user_id", nalog.user_id)
    .maybeSingle();

  const { data: prostori } = await baza
    .from("workspaces")
    .select("id, naziv, slug, potpis, ton")
    .eq("user_id", nalog.user_id);

  try {
    const ishod = await obradiMail({
      kljuc,
      modelBrzi: postavke?.model_brzi ?? "claude-haiku-5-5",
      modelPisanje: postavke?.model_pisanje ?? "claude-sonnet-5-5",
      mail,
      prostori: (prostori ?? []) as ProstorZaAI[],
    });
    const r = await kreirajPrijedlog(
      baza,
      nalog.user_id,
      ishod,
      mail,
      nalog.id,
      (prostori ?? []) as ProstorZaAI[],
      nalog.workspace_id,
    );
    return Response.json({ poruka: r.poruka, filtrirano: r.filtrirano });
  } catch (e) {
    return Response.json(
      { greska: `AI obrada nije uspjela: ${e instanceof Error ? e.message : "greška"}` },
      { status: 502 },
    );
  }
}
