import "dotenv/config";
import { naprviKlijenta, povuciNove } from "./imap.js";
import {
  nadjiVlasnika,
  ucitajNaloge,
  lozinkaNaloga,
  upisiStanje,
  upisiGresku,
} from "./supabase.js";
import { obradiDolaznu, obradiPoslanu } from "./obrada.js";
import { zapis } from "./util.js";

const JEDNOM = process.argv.includes("--jednom");
const INTERVAL = Number(process.env.INTERVAL_SEKUNDI || 120) * 1000;

async function sinhronizujFasciklu(klijent, fascikla, ctx, stanjeSvih, poslana) {
  const kljuc = poslana ? "poslane" : "inbox";
  const { poruke, stanje } = await povuciNove(klijent, fascikla, stanjeSvih[kljuc]);

  if (poruke.length === 0) {
    return { stanjeSvih: { ...stanjeSvih, [kljuc]: stanje }, broj: 0 };
  }

  zapis(`${ctx.nalog.naziv} / ${fascikla}: ${poruke.length} novih`);

  for (const poruka of poruke) {
    try {
      const rez = poslana
        ? await obradiPoslanu(poruka, ctx)
        : await obradiDolaznu(poruka, ctx);

      if (rez.preskoceno) continue;

      if (rez.ocjena) {
        zapis(`  ${rez.ocjena.tip.padEnd(16)} ${poruka.tema ?? "(bez teme)"}`);
      } else if (rez.cekaOdgovor) {
        zapis(`  ceka odgovor     ${poruka.tema ?? "(bez teme)"}`);
      }
    } catch (e) {
      zapis(`  greska na "${poruka.tema}":`, e.message);
    }
  }

  return { stanjeSvih: { ...stanjeSvih, [kljuc]: stanje }, broj: poruke.length };
}

async function sinhronizujNalog(red, userId) {
  const lozinka = await lozinkaNaloga(red.id);
  if (!lozinka) {
    throw new Error("Lozinka nije postavljena. Otvori Nalozi u panelu i upiši je.");
  }

  const nalog = {
    naziv: red.naziv,
    host: red.host,
    port: red.port ?? 993,
    korisnik: red.korisnik,
    lozinka,
  };

  const ctx = {
    userId,
    workspaceId: red.workspace_id,
    accountId: red.id,
    nalog,
  };

  const klijent = naprviKlijenta(nalog);
  await klijent.connect();

  try {
    let stanje = red.stanje ?? {};

    const inbox = await sinhronizujFasciklu(klijent, "INBOX", ctx, stanje, false);
    stanje = inbox.stanjeSvih;

    if (red.fascikla_poslane) {
      const sent = await sinhronizujFasciklu(
        klijent,
        red.fascikla_poslane,
        ctx,
        stanje,
        true,
      );
      stanje = sent.stanjeSvih;
    }

    await upisiStanje(red.id, stanje);
    red.stanje = stanje;
  } finally {
    await klijent.logout().catch(() => {});
  }
}

async function krug(userId) {
  let nalozi;
  try {
    nalozi = await ucitajNaloge(userId);
  } catch (e) {
    zapis("ne mogu ucitati naloge:", e.message);
    return;
  }

  if (nalozi.length === 0) {
    zapis("nema aktivnih naloga. Dodaj ih u panelu, na stranici Nalozi.");
    return;
  }

  for (const red of nalozi) {
    try {
      await sinhronizujNalog(red, userId);
    } catch (e) {
      zapis(`nalog ${red.naziv} pao:`, e.message);
      await upisiGresku(red.id, e.message).catch(() => {});
    }
  }
}

async function glavna() {
  const vlasnik = await nadjiVlasnika(process.env.VLASNIK_EMAIL);
  zapis(`vlasnik: ${vlasnik.email}`);

  await krug(vlasnik.id);

  if (JEDNOM) {
    zapis("jedan prolaz gotov.");
    process.exit(0);
  }

  zapis(`sljedeca provjera za ${INTERVAL / 1000} s`);
  setInterval(() => krug(vlasnik.id), INTERVAL);
}

glavna().catch((e) => {
  zapis("worker pao:", e.message);
  process.exit(1);
});
