import { server } from "@/lib/supabase/server";
import { ucitajProstore } from "@/lib/prostor";
import type { Prepiska } from "@/lib/tipovi";

function cuti(od: string | null): string {
  if (!od) return "";
  const dana = Math.floor((Date.now() - new Date(od).getTime()) / 86400000);
  if (dana === 0) return "danas";
  if (dana === 1) return "1 dan";
  return `${dana} dana`;
}

export default async function Cekam() {
  const { ids } = await ucitajProstore();
  if (ids.length === 0) return null;

  const supabase = await server();
  const { data } = await supabase
    .from("threads")
    .select("id, tema, ucesnici, zadnja_poruka, rok_odgovora")
    .in("workspace_id", ids)
    .eq("ceka_odgovor", true)
    .order("zadnja_poruka", { ascending: true });

  const prepiske = (data ?? []) as Prepiska[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Čekam odgovor</h1>
        <p className="tiho mt-1 text-sm">Poslani upiti bez odgovora, najstariji prvo.</p>
      </div>

      {prepiske.length === 0 ? (
        <div className="ploca p-10 text-center">
          <p className="text-sm">Niko ti ne duguje odgovor.</p>
          <p className="tiho mt-1 text-xs">
            Lista se puni iz poslanih poruka koje očekuju odgovor.
          </p>
        </div>
      ) : (
        <div className="ploca divide-y" style={{ borderColor: "var(--ivica)" }}>
          {prepiske.map((p) => {
            const kasni = p.rok_odgovora ? new Date(p.rok_odgovora) < new Date() : false;
            const sati = p.rok_odgovora
              ? Math.round((new Date(p.rok_odgovora).getTime() - Date.now()) / 3600000)
              : null;
            return (
              <div key={p.id} className="flex items-center gap-4 px-4 py-3">
                <div className="flex-1">
                  <p className="text-sm">{p.tema ?? "(bez teme)"}</p>
                  <p className="tiho mt-0.5 text-xs">{p.ucesnici.join(", ")}</p>
                </div>
                <div className="text-right text-xs tabular-nums">
                  <p className={kasni ? "text-red-400" : "tiho"}>ćuti {cuti(p.zadnja_poruka)}</p>
                  {sati !== null && (
                    <p className={kasni ? "text-amber-300" : "tiho"}>
                      {kasni ? "podsjetnik je dospio" : `podsjetnik za ${sati} h`}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
