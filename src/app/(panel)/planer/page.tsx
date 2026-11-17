import { server } from "@/lib/supabase/server";
import { ucitajProstore } from "@/lib/prostor";
import { ZADACI_SELECT } from "@/lib/upiti";
import { danasISO, dodajDane, imeDana } from "@/lib/datum";
import type { Zadatak } from "@/lib/tipovi";
import { PrioritetZnacka, ProjekatZnacka, ProstorZnacka, VrijemeZnacka } from "@/components/Znacke";

export default async function Planer() {
  const { ids, sve } = await ucitajProstore();
  if (ids.length === 0) {
    return <p className="tiho text-sm">Nema nijednog prostora.</p>;
  }

  const supabase = await server();
  const danas = danasISO();
  const kraj = dodajDane(danas, 6);

  const { data } = await supabase
    .from("tasks")
    .select(ZADACI_SELECT)
    .in("workspace_id", ids)
    .neq("faza", "zavrseno")
    .gte("rok", danas)
    .lte("rok", kraj)
    .order("vrijeme", { nullsFirst: false })
    .order("prioritet");

  const zadaci = (data ?? []) as unknown as Zadatak[];

  const dani = Array.from({ length: 7 }, (_, i) => dodajDane(danas, i));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Planer</h1>
        <p className="tiho mt-1 text-sm">
          Sljedećih 7 dana, od {danas} do {kraj}. Zadaci bez roka nisu ovdje.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-7">
        {dani.map((iso, i) => {
          const naDan = zadaci.filter((z) => z.rok === iso);
          return (
            <section key={iso} className="rounded-xl border p-3" style={{ borderColor: "var(--ivica)" }}>
              <header className="mb-3 flex items-baseline justify-between">
                <h2 className={`text-sm font-medium ${i === 0 ? "text-white" : ""}`}>
                  {imeDana(iso)}
                </h2>
                <span className="tiho text-xs tabular-nums">{iso.slice(8)}.</span>
              </header>
              <div className="space-y-2">
                {naDan.map((z) => (
                  <div key={z.id} className="ploca-hover rounded-lg p-2.5">
                    <p className="text-sm leading-snug">{z.naslov}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-1">
                      <VrijemeZnacka vrijeme={z.vrijeme} />
                      <PrioritetZnacka prioritet={z.prioritet} />
                      {z.projects?.naziv && <ProjekatZnacka naziv={z.projects.naziv} />}
                    </div>
                    {sve && z.workspaces && (
                      <div className="mt-2">
                        <ProstorZnacka naziv={z.workspaces.naziv} boja={z.workspaces.boja} />
                      </div>
                    )}
                  </div>
                ))}
                {naDan.length === 0 && <p className="tiho py-4 text-center text-xs">slobodno</p>}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
