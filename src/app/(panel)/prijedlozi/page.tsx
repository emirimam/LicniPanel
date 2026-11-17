import { server } from "@/lib/supabase/server";
import { ucitajProstore } from "@/lib/prostor";
import { rijesiPrijedlog } from "@/app/akcije";
import SimulacijaMaila from "@/components/SimulacijaMaila";
import KarticaPrijedloga from "@/components/KarticaPrijedloga";
import { PrioritetZnacka, ProstorZnacka } from "@/components/Znacke";
import type { SadrzajPrijedloga } from "@/lib/prijedlog";

type Red = {
  id: string;
  tip: string;
  sadrzaj: Record<string, unknown>;
  obrazlozenje: string | null;
  workspaces: { naziv: string; boja: string | null } | null;
};

export default async function Prijedlozi() {
  const { ids } = await ucitajProstore();
  if (ids.length === 0) return null;

  const supabase = await server();
  const [{ data }, { data: nalozi }] = await Promise.all([
    supabase
      .from("suggestions")
      .select("id, tip, sadrzaj, obrazlozenje, created_at, workspaces(naziv, boja)")
      .in("workspace_id", ids)
      .eq("status", "ceka")
      .order("created_at", { ascending: false }),
    supabase.from("accounts").select("id, naziv").order("naziv"),
  ]);

  const prijedlozi = (data ?? []) as unknown as Red[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Prijedlozi</h1>
        <p className="tiho mt-1 text-sm">
          Mailovi koje je AI obradio. Originalni mail lijevo, prijedlog odgovora desno. Ništa se ne šalje bez tvog odobrenja.
        </p>
      </div>

      <SimulacijaMaila nalozi={nalozi ?? []} />

      {prijedlozi.length === 0 ? (
        <div className="ploca p-10 text-center">
          <p className="text-sm">Nema prijedloga koji čekaju.</p>
          <p className="tiho mt-1 text-xs">
            Probaj simulaciju iznad ili čekaj dolazni mail iz povezanog naloga.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {prijedlozi.map((p) =>
            p.tip === "odgovor" ? (
              <KarticaPrijedloga
                key={p.id}
                id={p.id}
                sadrzaj={p.sadrzaj as unknown as SadrzajPrijedloga}
                prostor={p.workspaces}
              />
            ) : (
              <article key={p.id} className="ploca ploca-hover flex items-start gap-4 p-4">
                <div className="flex-1">
                  <p className="text-sm font-medium">{String(p.sadrzaj.naslov ?? "Bez naslova")}</p>
                  {p.obrazlozenje && <p className="tiho mt-1 text-xs">{p.obrazlozenje}</p>}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {typeof p.sadrzaj.prioritet === "number" && <PrioritetZnacka prioritet={p.sadrzaj.prioritet} />}
                    {p.workspaces && <ProstorZnacka naziv={p.workspaces.naziv} boja={p.workspaces.boja} />}
                  </div>
                </div>
                <div className="flex gap-2">
                  <form action={rijesiPrijedlog.bind(null, p.id, true)}>
                    <button className="dugme">Prihvati</button>
                  </form>
                  <form action={rijesiPrijedlog.bind(null, p.id, false)}>
                    <button className="polje text-xs">Odbaci</button>
                  </form>
                </div>
              </article>
            ),
          )}
        </div>
      )}
    </div>
  );
}
