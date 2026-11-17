import Anthropic from "@anthropic-ai/sdk";

const klijent = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.MODEL || "claude-haiku-5-5";

const ALAT = {
  name: "razvrstaj_poruku",
  description:
    "Razvrstava jednu e-mail poruku u strukturu koju panel koristi za zadatke.",
  input_schema: {
    type: "object",
    properties: {
      tip: {
        type: "string",
        enum: ["zadatak", "informacija", "ceka_moj_odgovor", "sum"],
        description:
          "zadatak = traži konkretnu radnju; ceka_moj_odgovor = traži odgovor, bez druge radnje; informacija = vrijedi znati; sum = newsletter, reklama, automatska obavijest",
      },
      naslov: {
        type: "string",
        description:
          "Kratak naslov zadatka u infinitivu, na jeziku poruke. Prazno ako tip nije zadatak.",
      },
      rok: {
        type: "string",
        description: "Rok u obliku YYYY-MM-DD ako je naveden ili jasno podrazumijevan, inače prazno.",
      },
      prioritet: {
        type: "integer",
        minimum: 1,
        maximum: 5,
        description: "1 je najhitnije, 3 uobičajeno, 5 može čekati.",
      },
      sigurnost: {
        type: "number",
        minimum: 0,
        maximum: 1,
        description: "Koliko si siguran u ovu procjenu.",
      },
      obrazlozenje: {
        type: "string",
        description: "Jedna rečenica zašto, na jeziku poruke.",
      },
    },
    required: ["tip", "prioritet", "sigurnost", "obrazlozenje"],
  },
};

const UPUTA = `Ti si pomoćnik koji razvrstava poslovnu i privatnu poštu jednog čovjeka.
Radi strogo po onome što u poruci piše — ne izmišljaj rokove, imena ni obaveze.
Automatske obavijesti, newsletteri, reklame i potvrde sistema su "sum".
Poruka koja samo prenosi informaciju, bez tražene radnje, je "informacija".
Ako poruka traži da nešto uradiš, to je "zadatak" i naslov piši u infinitivu
("poslati ponudu", "nazvati Adama"), na jeziku kojim je poruka pisana.
Rok upiši samo ako je u poruci naveden ili iz nje očigledan.`;

/**
 * @returns {Promise<{tip:string,naslov?:string,rok?:string,prioritet:number,sigurnost:number,obrazlozenje:string}|null>}
 */
export async function klasifikuj(poruka) {
  const tijelo = (poruka.tijelo ?? "").slice(0, 6000);

  const odgovor = await klijent.messages.create({
    model: MODEL,
    max_tokens: 500,
    system: UPUTA,
    tools: [ALAT],
    tool_choice: { type: "tool", name: "razvrstaj_poruku" },
    messages: [
      {
        role: "user",
        content: `Današnji datum: ${new Date().toISOString().slice(0, 10)}

Od: ${poruka.od_ime ?? ""} <${poruka.od ?? ""}>
Za: ${(poruka.za ?? []).join(", ")}
Datum: ${poruka.datum}
Tema: ${poruka.tema ?? "(bez teme)"}

${tijelo}`,
      },
    ],
  });

  const alat = odgovor.content.find((d) => d.type === "tool_use");
  return alat ? alat.input : null;
}

/** Da li poslana poruka očekuje odgovor. */
export async function ocekujeOdgovor(poruka) {
  const odgovor = await klijent.messages.create({
    model: MODEL,
    max_tokens: 100,
    system:
      'Odgovaraš samo s "da" ili "ne". Pitanje je očekuje li pošiljalac odgovor na ovu poruku. Pitanje, zahtjev, ponuda ili rok znače da. Zahvala, potvrda prijema i puko prosljeđivanje znače ne.',
    messages: [
      {
        role: "user",
        content: `Tema: ${poruka.tema ?? ""}\n\n${(poruka.tijelo ?? "").slice(0, 2000)}`,
      },
    ],
  });

  const tekst = odgovor.content
    .filter((d) => d.type === "text")
    .map((d) => d.text)
    .join(" ")
    .toLowerCase();

  return tekst.includes("da") && !tekst.startsWith("ne");
}
