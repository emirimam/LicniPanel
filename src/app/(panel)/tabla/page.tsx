import { server } from "@/lib/supabase/server";
import { ucitajProstore } from "@/lib/prostor";
import { ZADACI_SELECT } from "@/lib/upiti";
import Kanban from "@/components/Kanban";
import BrziUnos from "@/components/BrziUnos";
import type { Zadatak } from "@/lib/tipovi";

export default async function Tabla() {
  const { prostori, aktivni, sve, ids } = await ucitajProstore();
  if (ids.length === 0) {
    return <p className="tiho text-sm">Nema nijednog prostora.</p>;
  }

  const supabase = await server();
  const { data } = await supabase
    .from("tasks")
    .select(ZADACI_SELECT)
    .in("workspace_id", ids)
    .order("prioritet")
    .order("redoslijed");

  const zadaci = (data ?? []) as unknown as Zadatak[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Tabla</h1>
        <p className="tiho mt-1 text-sm">Prevuci karticu u drugu kolonu ili koristi strelice.</p>
      </div>
      <BrziUnos prostori={prostori} aktivni={aktivni} sve={sve} />
      <Kanban zadaci={zadaci} prikaziProstor={sve} />
    </div>
  );
}
