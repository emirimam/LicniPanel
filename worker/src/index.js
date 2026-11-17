import "dotenv/config";
import { naprviKlijenta, povuciNove } from "./imap.js";
import { nadjiVlasnika, osiguraj, upisiStanje } from "./supabase.js";
import { obradiDolaznu, obradiPoslanu } from "./obrada.js";
import { zapis } from "./util.js";

const JEDNOM = process.argv.includes("--jednom");
const INTERVAL = Number(process.env.INTERVAL_SEKUNDI || 120) * 1000;

/** Nalozi iz .env fajla: NALOG_1_*, NALOG_2_, ... */
function ucitajNaloge() {
  const nalozi = [];
  for (let i = 1; i <= 20; i++) {
    const p = `NALOG_${i}_`;
    const korisnik = process.env[`${p}KORISNIK`];
    if (!korisnik) continue;

    nalozi.push({
      naziv: process.env[`${p}NAZIV`] || korisnik,
      prostor: process.env[`${p}PROSTOR`] || "privatno",
      host: process.env[`${p}HOST`],
      port: Number(process.env[`${p}PORT`] || 993),
      korisnik,
      lozinka: process.env[`${p}LOZINKA`],
      poslane: process.env[`${p}POSLANE`] || null,
    });
  }
  return nalozi;
}

async function sinhronizujFasciklu(klijent, fascikla, ctx, stanjeSvih, poslana) {
  const kljuc = poslana ? "poslane" : "inbox";
  const { poruke, stanje } = await povuciNove(klijent, fascikla, stanjeSvih[kljuc]);

  if (poruke.length === 0) return { stanjeSvih, broj: 0 };

  zapis(`${ctx.nalog.naziv} / ${fascikla}: ${poruke.length} novih`);

  let obradjeno = 0;
  for (const poruka of poruke) {
    try {
      const rez = poslana
        ? await obradiPoslanu(poruka, ctx)
        : await obradiDolaznu(poruka, ctx);

      if (rez.preskoceno) continue;
      obradjeno++;

      if (rez.ocjena) {
        zapis(`  ${rez.ocjena.tip.padEnd(16)} ${poruka.tema ?? "(bez teme)"}`);
      } else if (rez.cekaOdgovor) {
        zapis(`  ceka odgovor     ${poruka.tema ?? "(bez teme)"}`);
      }
    } catch (e) {
      zapis(`  greska na "${poruka.tema}":`, e.message);
    }
  }

  return { stanjeSvih: { ...stanjeSvih, [kljuc]: stanje }, broj: obradjeno };
}

async function sinhronizujNalog(nalog, vlasnik) {
  const prostor =
    vlasnik.prostori.find((p) => p.slug === nalog.prostor) ??
    vlasnik.prostori[0];

  if (!prostor) throw new Error("Korisnik nema nijedan prostor.");

  const red = await osiguraj(nalog, vlasnik.korisnik.id, prostor.id);

  const ctx = {
    userId: vlasnik.korisnik.id,
    workspaceId: prostor.id,
    accountId: red.id,
    nalog,
  };

  const klijent = naprviKlijenta(nalog);
  await klijent.connect();

  try {
    let stanje = red.stanje ?? {};

    const inbox = await sinhronizujFasciklu(klijent, "INBOX", ctx, stanje, false);
    stanje = inbox.stanjeSvih;

    if (nalog.poslane) {
      const sent = await sinhronizujFasciklu(
        klijent,
        nalog.poslane,
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

async function krug(nalozi, vlasnik) {
  for (const nalog of nalozi) {
    try {
      await sinhronizujNalog(nalog, vlasnik);
    } catch (e) {
      zapis(`nalog ${nalog.naziv} pao:`, e.message);
    }
  }
}

async function glavna() {
  const nalozi = ucitajNaloge();
  if (nalozi.length === 0) {
    zapis("Nema nijednog naloga u .env fajlu. Pogledaj .env.example.");
    process.exit(1);
  }

  const vlasnik = await nadjiVlasnika(process.env.VLASNIK_EMAIL);
  zapis(
    `vlasnik ${vlasnik.korisnik.email}, prostori: ${vlasnik.prostori
      .map((p) => p.slug)
      .join(", ")}`,
  );
  zapis(`nalozi: ${nalozi.map((n) => n.naziv).join(", ")}`);

  await krug(nalozi, vlasnik);

  if (JEDNOM) {
    zapis("jedan prolaz gotov.");
    process.exit(0);
  }

  zapis(`sljedeca provjera za ${INTERVAL / 1000} s`);
  setInterval(() => krug(nalozi, vlasnik), INTERVAL);
}

glavna().catch((e) => {
  zapis("worker pao:", e.message);
  process.exit(1);
});
