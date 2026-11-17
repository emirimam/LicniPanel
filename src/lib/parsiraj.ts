/**
 * Rastavlja jednu liniju brzog unosa na zadatak.
 *
 *   "pozvati Adama sutra u 10 #itdvoip !1"
 *     -> { naslov: "pozvati Adama", rok: "2026-11-18", vrijeme: "10:00", projekat: "itdvoip", prioritet: 1 }
 *
 * Namjerno bez biblioteka: sve se vrti oko nekoliko oblika koji se stvarno kucaju.
 */

export type Razlozeno = {
  naslov: string;
  rok: string | null;
  vrijeme: string | null;
  projekat: string | null;
  kontakt: string | null;
  prioritet: number;
};

const DANI = [
  "nedjelja",
  "ponedjeljak",
  "utorak",
  "srijeda",
  "cetvrtak",
  "petak",
  "subota",
];

const SKRACENICE: Record<string, number> = {
  ned: 0,
  pon: 1,
  uto: 2,
  sri: 3,
  cet: 4,
  pet: 5,
  sub: 6,
};

function bezKvacica(tekst: string): string {
  return tekst
    .replace(/č|ć/g, "c")
    .replace(/Č|Ć/g, "C")
    .replace(/š/g, "s")
    .replace(/Š/g, "S")
    .replace(/ž/g, "z")
    .replace(/Ž/g, "Z")
    .replace(/đ/g, "dj")
    .replace(/Đ/g, "Dj");
}

function uISO(datum: Date): string {
  const g = datum.getFullYear();
  const m = String(datum.getMonth() + 1).padStart(2, "0");
  const d = String(datum.getDate()).padStart(2, "0");
  return `${g}-${m}-${d}`;
}

function pomjeri(osnova: Date, dana: number): Date {
  const d = new Date(osnova);
  d.setDate(d.getDate() + dana);
  return d;
}

/** Prvi sljedeci takav dan u sedmici; danas se ne racuna. */
function sljedeciDan(osnova: Date, ciljniDan: number): Date {
  let razmak = (ciljniDan - osnova.getDay() + 7) % 7;
  if (razmak === 0) razmak = 7;
  return pomjeri(osnova, razmak);
}

export function razloziUnos(unos: string, danas = new Date()): Razlozeno {
  let ostatak = ` ${unos.trim()} `;
  const rez: Razlozeno = {
    naslov: "",
    rok: null,
    vrijeme: null,
    projekat: null,
    kontakt: null,
    prioritet: 3,
  };

  const izvadi = (uzorak: RegExp, naStr: (p: RegExpMatchArray) => void) => {
    const pogodak = ostatak.match(uzorak);
    if (pogodak) {
      naStr(pogodak);
      ostatak = ostatak.replace(uzorak, " ");
    }
  };

  // #projekat i @kontakt
  izvadi(/\s#([\p{L}0-9_-]+)\s/u, (p) => (rez.projekat = p[1]));
  izvadi(/\s@([\p{L}0-9_.-]+)\s/u, (p) => (rez.kontakt = p[1]));

  // !1 do !5
  izvadi(/\s!([1-5])\s/, (p) => (rez.prioritet = Number(p[1])));

  // 20.12. ili 20.12.2026
  izvadi(/\s(\d{1,2})\.(\d{1,2})\.(\d{4})?\s/, (p) => {
    const godina = p[3] ? Number(p[3]) : danas.getFullYear();
    rez.rok = uISO(new Date(godina, Number(p[2]) - 1, Number(p[1])));
  });

  // danas / sutra / prekosutra
  if (!rez.rok) {
    izvadi(/\s(danas|sutra|prekosutra)\s/i, (p) => {
      const rijec = p[1].toLowerCase();
      const pomak = rijec === "danas" ? 0 : rijec === "sutra" ? 1 : 2;
      rez.rok = uISO(pomjeri(danas, pomak));
    });
  }

  // za N dana / za N sedmica
  if (!rez.rok) {
    izvadi(/\sza\s(\d{1,2})\s(dan|dana|sedmic[ue]|sedmica)\s/i, (p) => {
      const broj = Number(p[1]);
      const sedmice = p[2].toLowerCase().startsWith("sedmic");
      rez.rok = uISO(pomjeri(danas, sedmice ? broj * 7 : broj));
    });
  }

  // dan u sedmici, pun naziv ili skracenica
  if (!rez.rok) {
    const bez = bezKvacica(ostatak).toLowerCase();
    for (let i = 0; i < DANI.length; i++) {
      const uzorak = new RegExp(`\\s(u\\s)?${DANI[i]}\\s`);
      if (uzorak.test(bez)) {
        rez.rok = uISO(sljedeciDan(danas, i));
        const stvarni = new RegExp(`\\s(u\\s)?[\\p{L}]{${DANI[i].length}}\\s`, "u");
        ostatak = ostatak.replace(stvarni, " ");
        break;
      }
    }
    if (!rez.rok) {
      for (const [skr, dan] of Object.entries(SKRACENICE)) {
        const uzorak = new RegExp(`\\s(u\\s)?${skr}\\s`, "i");
        if (uzorak.test(bez)) {
          rez.rok = uISO(sljedeciDan(danas, dan));
          ostatak = ostatak.replace(uzorak, " ");
          break;
        }
      }
    }
  }

  // u 10, u 10:30, 10h
  izvadi(/\s(?:u\s)?(\d{1,2})[:.](\d{2})\s/, (p) => {
    rez.vrijeme = `${p[1].padStart(2, "0")}:${p[2]}`;
  });
  if (!rez.vrijeme) {
    izvadi(/\s(?:u\s|oko\s)(\d{1,2})\s?h?\s/, (p) => {
      rez.vrijeme = `${p[1].padStart(2, "0")}:00`;
    });
  }

  rez.naslov = ostatak.replace(/\s+/g, " ").trim();
  return rez;
}
