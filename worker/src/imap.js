import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { adrese, izvod, zapis } from "./util.js";

const PRVI_PUT = Number(process.env.PRVI_PUT_ZADNJIH || 30);

export function naprviKlijenta(nalog) {
  return new ImapFlow({
    host: nalog.host,
    port: nalog.port,
    secure: nalog.port === 993,
    auth: { user: nalog.korisnik, pass: nalog.lozinka },
    logger: false,
    emitLogs: false,
  });
}

/**
 * Povlaci poruke novije od zadnjeg obradjenog UID-a.
 * Stanje po fascikli: { uidvalidity, uid }.
 */
export async function povuciNove(klijent, fascikla, stanje) {
  const kutija = await klijent.mailboxOpen(fascikla);
  const uidValidity = String(kutija.uidValidity);
  const uidNext = kutija.uidNext;

  let odUid = stanje?.uid ?? null;

  // Prvo pokretanje ili je server resetovao numeraciju - uzmi samo zadnjih N.
  if (!odUid || stanje?.uidvalidity !== uidValidity) {
    odUid = Math.max(0, uidNext - PRVI_PUT - 1);
    zapis(`${fascikla}: prvo citanje, krecem od UID ${odUid + 1}`);
  }

  if (uidNext - 1 <= odUid) {
    return { poruke: [], stanje: { uidvalidity: uidValidity, uid: odUid } };
  }

  const poruke = [];
  let najveci = odUid;

  for await (const red of klijent.fetch(
    { uid: `${odUid + 1}:*` },
    { uid: true, source: true },
  )) {
    if (red.uid <= odUid) continue;
    najveci = Math.max(najveci, red.uid);

    try {
      const p = await simpleParser(red.source);
      const od = adrese(p.from)[0] ?? null;

      poruke.push({
        message_id:
          p.messageId ?? `bez-id-${uidValidity}-${red.uid}@${fascikla}`,
        od,
        od_ime: p.from?.value?.[0]?.name || null,
        za: adrese(p.to),
        kopija: adrese(p.cc),
        tema: p.subject ?? null,
        tijelo: p.text ?? null,
        izvod: izvod(p.text),
        datum: (p.date ?? new Date()).toISOString(),
        folder: fascikla,
        uid: red.uid,
      });
    } catch (e) {
      zapis(`${fascikla}: poruka UID ${red.uid} se ne da rasclaniti:`, e.message);
    }
  }

  return {
    poruke,
    stanje: { uidvalidity: uidValidity, uid: najveci },
  };
}
