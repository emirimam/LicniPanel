import { createHash } from "node:crypto";

/** Skida Re:, Fwd:, Odg: i slicno, pa normalizuje razmake. */
export function golaTema(tema) {
  if (!tema) return "";
  return tema
    .replace(/^\s*((re|fw|fwd|odg|prosl)\s*(\[\d+\])?\s*:\s*)+/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** Stabilan kljuc prepiske: gola tema + skup ucesnika. */
export function kljucPrepiske(tema, ucesnici) {
  const osnova = golaTema(tema) || "(bez teme)";
  const ljudi = [...new Set(ucesnici.filter(Boolean).map((a) => a.toLowerCase()))]
    .sort()
    .join(",");
  return createHash("sha1").update(`${osnova}|${ljudi}`).digest("hex").slice(0, 32);
}

/** Adrese iz mailparser objekta, uvijek kao niz stringova. */
export function adrese(polje) {
  if (!polje) return [];
  const lista = Array.isArray(polje) ? polje : [polje];
  return lista.flatMap((p) => (p?.value ?? []).map((v) => v.address).filter(Boolean));
}

/** Prvih n znakova teksta, bez praznih redova. */
export function izvod(tekst, n = 400) {
  if (!tekst) return null;
  const cist = tekst.replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim();
  return cist.length > n ? `${cist.slice(0, n)}…` : cist;
}

/** Datum + N radnih dana. */
export function radniDaniOd(datum, dana) {
  const d = new Date(datum);
  let ostalo = dana;
  while (ostalo > 0) {
    d.setDate(d.getDate() + 1);
    const dan = d.getDay();
    if (dan !== 0 && dan !== 6) ostalo--;
  }
  return d;
}

export function zapis(...dijelovi) {
  const vrijeme = new Date().toISOString().slice(11, 19);
  console.log(`[${vrijeme}]`, ...dijelovi);
}
