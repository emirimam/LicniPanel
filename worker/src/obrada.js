import { baza } from "./supabase.js";
import { klasifikuj, ocekujeOdgovor } from "./klasifikuj.js";
import { kljucPrepiske, radniDaniOd, zapis } from "./util.js";

const ROK_DANA = Number(process.env.ROK_ODGOVORA_DANA || 3);

/** Prepiska kojoj poruka pripada; pravi je ako ne postoji. */
async function osigurajPrepisku(poruka, ctx) {
  const ucesnici = [poruka.od, ...(poruka.za ?? []), ...(poruka.kopija ?? [])]
    .filter(Boolean)
    .filter((a) => a.toLowerCase() !== ctx.nalog.korisnik.toLowerCase());

  const kljuc = kljucPrepiske(poruka.tema, ucesnici);

  const { data: postojeca } = await baza
    .from("threads")
    .select("id")
    .eq("user_id", ctx.userId)
    .eq("thread_key", kljuc)
    .maybeSingle();

  if (postojeca) {
    await baza
      .from("threads")
      .update({ zadnja_poruka: poruka.datum })
      .eq("id", postojeca.id);
    return { id: postojeca.id, kljuc };
  }

  const { data, error } = await baza
    .from("threads")
    .insert({
      user_id: ctx.userId,
      workspace_id: ctx.workspaceId,
      thread_key: kljuc,
      tema: poruka.tema,
      ucesnici,
      zadnja_poruka: poruka.datum,
    })
    .select("id")
    .single();

  if (error) throw error;
  return { id: data.id, kljuc };
}

/** Pravilo koje kaže da ova poruka ide pravo u zadatke, bez potvrde. */
async function automatskoPravilo(poruka, ctx) {
  const { data: pravila } = await baza
    .from("rules")
    .select("uslov, akcija, automatski")
    .eq("user_id", ctx.userId)
    .eq("aktivno", true)
    .eq("automatski", true)
    .order("prioritet");

  if (!pravila?.length) return null;

  for (const p of pravila) {
    const u = p.uslov ?? {};
    const odPoklapa =
      !u.posiljalac ||
      (poruka.od ?? "").toLowerCase().includes(String(u.posiljalac).toLowerCase());
    const rijecPoklapa =
      !u.rijec ||
      `${poruka.tema ?? ""} ${poruka.tijelo ?? ""}`
        .toLowerCase()
        .includes(String(u.rijec).toLowerCase());

    if (odPoklapa && rijecPoklapa) return p;
  }
  return null;
}

/** Dolazna poruka: upiši, pripoji prepisci, klasifikuj, napravi prijedlog ili zadatak. */
export async function obradiDolaznu(poruka, ctx) {
  const prepiska = await osigurajPrepisku(poruka, ctx);

  const { data: upisana, error } = await baza
    .from("messages")
    .upsert(
      {
        user_id: ctx.userId,
        workspace_id: ctx.workspaceId,
        account_id: ctx.accountId,
        thread_id: prepiska.id,
        message_id: poruka.message_id,
        smjer: "ulazna",
        od: poruka.od,
        od_ime: poruka.od_ime,
        za: poruka.za ?? [],
        kopija: poruka.kopija ?? [],
        tema: poruka.tema,
        tijelo: poruka.tijelo,
        izvod: poruka.izvod,
        folder: poruka.folder,
        datum: poruka.datum,
      },
      { onConflict: "user_id,message_id", ignoreDuplicates: true },
    )
    .select("id")
    .maybeSingle();

  if (error) throw error;
  if (!upisana) return { preskoceno: true };

  // Dolazak odgovora skida zastavicu čekanja s prepiske.
  await baza
    .from("threads")
    .update({ ceka_odgovor: false, rok_odgovora: null })
    .eq("id", prepiska.id);

  let ocjena = null;
  try {
    ocjena = await klasifikuj(poruka);
  } catch (e) {
    zapis("klasifikacija pala:", e.message);
  }

  if (!ocjena) {
    await baza.from("messages").update({ obradjena: true }).eq("id", upisana.id);
    return { upisano: true, ocjena: null };
  }

  if (ocjena.tip === "zadatak" || ocjena.tip === "ceka_moj_odgovor") {
    const pravilo = await automatskoPravilo(poruka, ctx);

    const sadrzaj = {
      naslov: ocjena.naslov || poruka.tema || "(bez naslova)",
      rok: ocjena.rok || null,
      prioritet: ocjena.prioritet ?? 3,
    };

    if (pravilo) {
      await baza.from("tasks").insert({
        user_id: ctx.userId,
        workspace_id: ctx.workspaceId,
        naslov: sadrzaj.naslov,
        rok: sadrzaj.rok,
        prioritet: sadrzaj.prioritet,
        source_message_id: upisana.id,
        faza: "novo",
      });
    } else {
      await baza.from("suggestions").insert({
        user_id: ctx.userId,
        workspace_id: ctx.workspaceId,
        source_message_id: upisana.id,
        tip: "zadatak",
        sadrzaj,
        obrazlozenje: ocjena.obrazlozenje,
        sigurnost: ocjena.sigurnost,
      });
    }
  }

  await baza.from("messages").update({ obradjena: true }).eq("id", upisana.id);
  return { upisano: true, ocjena };
}

/** Poslana poruka: upiši i, ako traži odgovor, postavi rok čekanja na prepisku. */
export async function obradiPoslanu(poruka, ctx) {
  const prepiska = await osigurajPrepisku(poruka, ctx);

  const { data: upisana, error } = await baza
    .from("messages")
    .upsert(
      {
        user_id: ctx.userId,
        workspace_id: ctx.workspaceId,
        account_id: ctx.accountId,
        thread_id: prepiska.id,
        message_id: poruka.message_id,
        smjer: "izlazna",
        od: poruka.od,
        od_ime: poruka.od_ime,
        za: poruka.za ?? [],
        kopija: poruka.kopija ?? [],
        tema: poruka.tema,
        tijelo: poruka.tijelo,
        izvod: poruka.izvod,
        folder: poruka.folder,
        datum: poruka.datum,
        obradjena: true,
      },
      { onConflict: "user_id,message_id", ignoreDuplicates: true },
    )
    .select("id")
    .maybeSingle();

  if (error) throw error;
  if (!upisana) return { preskoceno: true };

  let trazi = false;
  try {
    trazi = await ocekujeOdgovor(poruka);
  } catch (e) {
    zapis("provjera ocekivanja pala:", e.message);
  }

  if (trazi) {
    await baza
      .from("threads")
      .update({
        ceka_odgovor: true,
        rok_odgovora: radniDaniOd(poruka.datum, ROK_DANA).toISOString(),
      })
      .eq("id", prepiska.id);
  }

  return { upisano: true, cekaOdgovor: trazi };
}
