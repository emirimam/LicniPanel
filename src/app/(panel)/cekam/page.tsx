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
  const { aktivni } = await ucitajProstore();
  if (!aktivni) return null;

  const supabase = await server();
  const { data } = await supabase
    .from("threads")
    .select("id, tema, ucesnici, zadnja_poruka, rok_odgovora")
    .eq("workspace_id", aktivni.id)
    .eq("ceka_odgovor", true)
    .order("zadnja_poruka", { ascending: true });

  const prepiske = (data ?? []) as Prepiska[];

  if (prepiske.length === 0) {
    return (
      <div className="ploca p-10 text-center">
        <p className="text-sm">Niko ti ne duguje odgovor.</p>
        <p className="tiho text-xs mt-1">
          Lista se puni iz poslanih poruka koje očekuju odgovor.
        </p>
      </div>
    );
  }

  return (
    <div className="ploca divide-y" style={{ borderColor: "var(--ivica)" }}>
      {prepiske.map((p) => {
        const kasni = p.rok_odgovora
          ? new Date(p.rok_odgovora) < new Date()
          : false;

        return (
          <div key={p.id} className="p-4 flex items-center gap-4">
            <div className="flex-1">
              <p className="text-sm">{p.tema ?? "(bez teme)"}</p>
              <p className="tiho text-xs mt-0.5">{p.ucesnici.join(", ")}</p>
            </div>
            <span
              className={`text-xs ${kasni ? "text-red-600" : "tiho"}`}
              title="od zadnje poruke"
            >
              ćuti {cuti(p.zadnja_poruka)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
