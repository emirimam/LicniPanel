// Svi datumi u panelu racunaju se u lokalnoj zoni vlasnika, bez obzira
// gdje se kod izvrsava (Vercel radi u UTC), da server i browser daju isti rezultat.
const ZONA = "Europe/Sarajevo";
const formater = new Intl.DateTimeFormat("en-CA", {
  timeZone: ZONA,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Danasnji datum kao YYYY-MM-DD. */
export function danasISO(): string {
  return formater.format(new Date());
}

/** Pomjera ISO datum za n dana. */
export function dodajDane(iso: string, n: number): string {
  const [g, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(g, m - 1, d + n)).toISOString().slice(0, 10);
}

/** Broj dana izmedju dva ISO datuma (a - b). */
export function razlikaUDanima(a: string, b: string): number {
  const dan = (iso: string) => {
    const [g, m, d] = iso.split("-").map(Number);
    return Date.UTC(g, m - 1, d) / 86400000;
  };
  return Math.round(dan(a) - dan(b));
}

const KRATKI_DANI = ["ned", "pon", "uto", "sri", "čet", "pet", "sub"];

/** Kratko ime dana za ISO datum, npr. "pon". */
export function imeDana(iso: string): string {
  const [g, m, d] = iso.split("-").map(Number);
  return KRATKI_DANI[new Date(Date.UTC(g, m - 1, d)).getUTCDay()];
}

const formaterVremena = new Intl.DateTimeFormat("bs-BA", {
  timeZone: ZONA,
  day: "numeric",
  month: "numeric",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** Datum i sat u lokalnoj zoni vlasnika, npr. "18. 11. 2026. 14:32". Prazan ili neispravan unos daje "". */
export function datumVrijeme(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : formaterVremena.format(d);
}
