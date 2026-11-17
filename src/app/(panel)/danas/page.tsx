import { server } from "@/lib/supabase/server";
import { ucitajProstore } from "@/lib/prostor";
import { ZADACI_SELECT } from "@/lib/upiti";
import { danasISO, imeDana } from "@/lib/datum";
import type { Zadatak } from "@/lib/tipovi";
import { PrioritetZnacka, ProjekatZnacka, ProstorZnacka, RokZnacka, VrijemeZnacka } from "@/components/Znacke";
import Link from "next/link";

export default async function Danas() {
  const { ids, sve } = await ucitajProstore();
  if (ids.length === 0) {
    return <p className="tiho text-sm">Nema nijednog prostora.</p>;
  }

  const supabase = await server();
  const danas = danasISO();

  const granica = new Date(Date.now() - 48 * 3600 * 1000).toISOString();

  const [kasni, naDan, hitniBezRoka, prijedlozi, cekam, followUp] = await Promise.all([
    supabase
      .from("tasks")
      .select(ZADACI_SELECT)
      .in("workspace_id", ids)
      .neq("faza", "zavrseno")
      .lt("rok", danas)
      .order("rok")
      .limit(50),
    supabase
      .from("tasks")
      .select(ZADACI_SELECT)
      .in("workspace_id", ids)
      .neq("faza", "zavrseno")
      .eq("rok", danas)
      .order("prioritet")
      .limit(50),
    supabase
      .from("tasks")
      .select(ZADACI_SELECT)
      .in("workspace_id", ids)
      .neq("faza", "zavrseno")
      .is("rok", null)
      .lte("prioritet", 2)
      .order("prioritet")
      .limit(20),
    supabase
      .from("suggestions")
      .select("id", { count: "exact", head: true })
      .in("workspace_id", ids)
      .eq("status", "ceka"),
    supabase
      .from("threads")
      .select("id", { count: "exact", head: true })
      .in("workspace_id", ids)
      .eq("ceka_odgovor", true),
    supabase
      .from("threads")
      .select("id, tema, ucesnici, zadnja_poruka")
      .in("workspace_id", ids)
      .eq("ceka_odgovor", true)
      .lt("zadnja_poruka", granica)
      .order("zadnja_poruka")
      .limit(10),
  ]);

  const [g, m, d] = danas.split("-");
  const dan = `${imeDana(danas)}, ${d}. ${m}. ${g}.`;

  const sekcije: { naslov: string; zadaci: Zadatak[] }[] = [
    { naslov: "Kasni", zadaci: (kasni.data ?? []) as unknown as Zadatak[] },
    { naslov: "Danas", zadaci: (naDan.data ?? []) as unknown as Zadatak[] },
    { naslov: "Hitno bez roka", zadaci: (hitniBezRoka.data ?? []) as unknown as Zadatak[] },
  ];

  return (
    <div className="space-y-8">
      <div>
        <p className="tiho text-xs uppercase tracking-wide">{dan}</p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">Pregled dana</h1>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat naslov="Kasni ili danas" vrijednost={(kasni.data?.length ?? 0) + (naDan.data?.length ?? 0)} />
        <Link href="/prijedlozi" className="ploca ploca-hover block p-4">
          <p className="tiho text-xs">Prijedlozi iz pošte</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{prijedlozi.count ?? 0}</p>
        </Link>
        <Link href="/cekam" className="ploca ploca-hover block p-4">
          <p className="tiho text-xs">Čekam odgovor</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{cekam.count ?? 0}</p>
        </Link>
      </div>

      {(followUp.data ?? []).length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide tiho">
            Follow-up, bez odgovora preko 48h <span className="tabular-nums">· {followUp.data?.length}</span>
          </h2>
          <div className="ploca divide-y" style={{ borderColor: "var(--ivica)" }}>
            {(followUp.data ?? []).map((t) => (
              <Link key={t.id} href="/cekam" className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03]">
                <span className="h-2 w-2 shrink-0 rounded-full bg-amber-400" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{t.tema ?? "(bez teme)"}</p>
                  <p className="tiho truncate text-xs">{(t.ucesnici as string[]).join(", ")}</p>
                </div>
                <span className="text-xs text-amber-300">podsjeti ih</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {sekcije.map((s) => (
        <section key={s.naslov} className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide tiho">
            {s.naslov} <span className="tabular-nums">· {s.zadaci.length}</span>
          </h2>
          {s.zadaci.length === 0 ? (
            <p className="tiho text-sm">Nema ničega ovdje.</p>
          ) : (
            <div className="ploca divide-y" style={{ borderColor: "var(--ivica)" }}>
              {s.zadaci.map((z) => (
                <div key={z.id} className="flex flex-wrap items-center gap-2 px-4 py-3">
                  <p className="min-w-0 flex-1 text-sm">{z.naslov}</p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <PrioritetZnacka prioritet={z.prioritet} />
                    {z.projects?.naziv && <ProjekatZnacka naziv={z.projects.naziv} />}
                    <VrijemeZnacka vrijeme={z.vrijeme} />
                    <RokZnacka rok={z.rok} />
                    {sve && z.workspaces && (
                      <ProstorZnacka naziv={z.workspaces.naziv} boja={z.workspaces.boja} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}

function Stat({ naslov, vrijednost }: { naslov: string; vrijednost: number }) {
  return (
    <div className="ploca p-4">
      <p className="tiho text-xs">{naslov}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{vrijednost}</p>
    </div>
  );
}
