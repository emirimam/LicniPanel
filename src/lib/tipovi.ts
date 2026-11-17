export type Faza = "novo" | "u_radu" | "cekam_drugog" | "zavrseno";

export const FAZE: { kljuc: Faza; naziv: string }[] = [
  { kljuc: "novo", naziv: "Novo" },
  { kljuc: "u_radu", naziv: "U radu" },
  { kljuc: "cekam_drugog", naziv: "Čekam drugog" },
  { kljuc: "zavrseno", naziv: "Završeno" },
];

export type Prostor = {
  id: string;
  naziv: string;
  slug: string;
  boja: string | null;
};

export type Zadatak = {
  id: string;
  naslov: string;
  opis: string | null;
  faza: Faza;
  prioritet: number;
  rok: string | null;
  redoslijed: number;
  project_id: string | null;
  contact_id: string | null;
  source_message_id: string | null;
  projects?: { naziv: string } | null;
  contacts?: { ime: string } | null;
};

export type Prijedlog = {
  id: string;
  tip: "zadatak" | "kontakt" | "projekat" | "odgovor";
  sadrzaj: Record<string, unknown>;
  obrazlozenje: string | null;
  sigurnost: number | null;
  created_at: string;
  messages?: { tema: string | null; od: string | null; datum: string } | null;
};

export type Prepiska = {
  id: string;
  tema: string | null;
  ucesnici: string[];
  zadnja_poruka: string | null;
  rok_odgovora: string | null;
};
