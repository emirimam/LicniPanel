import Anthropic from "@anthropic-ai/sdk";
import { datumVrijeme } from "@/lib/datum";

/** Mail koji obradjujemo, bez obzira dolazi li iz workera, webhooka ili simulacije. */
/** datum = kada je mail stigao (ISO). */
export type Mail = { od: string; tema: string; tijelo: string; datum?: string };

export type ProstorZaAI = {
  id: string;
  naziv: string;
  slug: string;
  potpis: string | null;
  ton: string | null;
};

export type Analiza = {
  relevantno: boolean;
  prostor_slug: string | null;
  sazetak: string;
  zadatak: string | null;
  prioritet: number;
  rok: string | null;
  treba_odgovor: boolean;
  razlog: string;
};

export type Ishod =
  | { filtrirano: true; razlog: string }
  | {
      filtrirano: false;
      analiza: Analiza;
      nacrt: string | null;
      prostor: ProstorZaAI | null;
    };

const MAX_TIJELO = 30000;

const ALAT_ANALIZA = {
  name: "analiziraj_mail",
  description: "Strukturira jednu poslovnu poruku za lični panel.",
  input_schema: {
    type: "object" as const,
    properties: {
      relevantno: {
        type: "boolean",
        description: "false za reklame, newslettere i automatske obavijesti bez tražene radnje",
      },
      prostor_slug: {
        type: "string",
        description: "Slug radnog prostora kojem poruka pripada, iz ponuđene liste. Prazno ako nije jasno.",
      },
      sazetak: {
        type: "string",
        description: "Tačno dvije kratke rečenice o sadržaju, na jeziku poruke.",
      },
      zadatak: {
        type: "string",
        description: "Predloženi zadatak u infinitivu, na jeziku poruke. Prazno ako nema radnje.",
      },
      prioritet: {
        type: "integer",
        minimum: 1,
        maximum: 5,
        description: "1 najhitnije, 3 uobičajeno, 5 može čekati.",
      },
      rok: {
        type: "string",
        description: "Rok u obliku YYYY-MM-DD samo ako je naveden u poruci, inače prazno.",
      },
      treba_odgovor: {
        type: "boolean",
        description: "true ako pošiljalac očekuje odgovor od mene.",
      },
      razlog: {
        type: "string",
        description: "Jedna rečenica zašto.",
      },
    },
    required: ["relevantno", "sazetak", "prioritet", "treba_odgovor", "razlog"],
  },
};

const UPUTA_ANALIZA = `Ti razvrstavaš poštu jednog čovjeka. Radi strogo po onome što piše u poruci.
Ne izmišljaj rokove, imena ni obaveze. Reklame, newslettere i automatske potvrde označi kao nerelevantne.
Prostor biraj samo iz ponuđene liste i samo ako se vidi iz poruke (firma, domena, predmet).`;

function klijent(kljuc: string) {
  return new Anthropic({ apiKey: kljuc });
}

function tekstPoruke(mail: Mail): string {
  const primljeno = datumVrijeme(mail.datum);
  return `Od: ${mail.od}\n${primljeno ? `Primljeno: ${primljeno}\n` : ""}Tema: ${mail.tema}\n\n${mail.tijelo.slice(0, MAX_TIJELO)}`;
}

async function analiziraj(
  c: Anthropic,
  model: string,
  mail: Mail,
  prostori: ProstorZaAI[],
): Promise<Analiza> {
  const popis = prostori.map((p) => `- ${p.slug}: ${p.naziv}`).join("\n");
  const odgovor = await c.messages.create({
    model,
    max_tokens: 600,
    system: `${UPUTA_ANALIZA}\n\nProstori:\n${popis}`,
    tools: [ALAT_ANALIZA],
    tool_choice: { type: "tool", name: "analiziraj_mail" },
    messages: [{ role: "user", content: tekstPoruke(mail) }],
  });

  const blok = odgovor.content.find((b) => b.type === "tool_use");
  if (!blok || blok.type !== "tool_use") throw new Error("Model nije vratio analizu.");
  const u = blok.input as Partial<Analiza> & { zadatak?: string; rok?: string };

  return {
    relevantno: u.relevantno !== false,
    prostor_slug: u.prostor_slug || null,
    sazetak: u.sazetak ?? "",
    zadatak: u.zadatak?.trim() || null,
    prioritet: Math.min(5, Math.max(1, Number(u.prioritet ?? 3))),
    rok: /^\d{4}-\d{2}-\d{2}$/.test(u.rok ?? "") ? (u.rok as string) : null,
    treba_odgovor: Boolean(u.treba_odgovor),
    razlog: u.razlog ?? "",
  };
}

async function napisiNacrt(
  c: Anthropic,
  model: string,
  mail: Mail,
  prostor: ProstorZaAI | null,
): Promise<string> {
  const ton = prostor?.ton?.trim() || "Profesionalan, kratak i ljubazan.";
  const potpis = prostor?.potpis?.trim() || "";
  const odgovor = await c.messages.create({
    model,
    max_tokens: 900,
    system: `Pišeš nacrt odgovora na poslovnu poruku. Odgovori na jeziku poruke (bosanski, hrvatski ili srpski).
Ton za ovu firmu: ${ton}
Nacrt je samo tekst mail-a, bez naslova i bez objašnjenja. Ne izmišljaj činjenice, cijene ni datume koji nisu u poruci.
${potpis ? `Završi potpisom:\n${potpis}` : ""}`,
    messages: [{ role: "user", content: tekstPoruke(mail) }],
  });
  return odgovor.content
    .filter((b) => b.type === "text")
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("\n")
    .trim();
}

/**
 * Glavni tok: razvrstavanje (Haiku) pa nacrt odgovora (Sonnet), samo kad treba.
 * Nerelevantne poruke se ne pretvaraju u prijedlog.
 */
export async function obradiMail(args: {
  kljuc: string;
  modelBrzi: string;
  modelPisanje: string;
  mail: Mail;
  prostori: ProstorZaAI[];
}): Promise<Ishod> {
  const c = klijent(args.kljuc);
  const analiza = await analiziraj(c, args.modelBrzi, args.mail, args.prostori);

  if (!analiza.relevantno) {
    return { filtrirano: true, razlog: analiza.razlog || "Reklama ili newsletter." };
  }

  const prostor =
    args.prostori.find((p) => p.slug === analiza.prostor_slug) ?? null;

  const nacrt = analiza.treba_odgovor
    ? await napisiNacrt(c, args.modelPisanje, args.mail, prostor)
    : null;

  return { filtrirano: false, analiza, nacrt, prostor };
}

/** Nacrt za mail koji je vec ocijenjen (npr. vracen iz filtriranih), bez ponovnog filtriranja. */
export async function napisiNacrtZa(args: {
  kljuc: string;
  modelPisanje: string;
  mail: Mail;
  prostor: ProstorZaAI | null;
}): Promise<string> {
  return napisiNacrt(klijent(args.kljuc), args.modelPisanje, args.mail, args.prostor);
}

/** Provjera kljuca: najjeftiniji poziv, par tokena. */
export async function testirajKljuc(kljuc: string, model: string): Promise<string> {
  const odgovor = await klijent(kljuc).messages.create({
    model,
    max_tokens: 5,
    messages: [{ role: "user", content: "Odgovori samo: ok" }],
  });
  return odgovor.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
}
