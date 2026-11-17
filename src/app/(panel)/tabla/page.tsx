import { server } from "@/lib/supabase/server";
import { ucitajProstore } from "@/lib/prostor";
import Kanban from "@/components/Kanban";
import BrziUnos from "@/components/BrziUnos";
import type { Zadatak } from "@/lib/tipovi";

export default async function Tabla() {
  const { aktivni } = await ucitajProstore();
  if (!aktivni) {
    return <p className="tiho text-sm">Nema nijednog prostora.</p>;
  }

  const supabase = await server();
  const { data } = await supabase
    .from("tasks")
    .select(
      "id, naslov, opis, faza, prioritet, rok, redoslijed, project_id, contact_id, source_message_id, projects(naziv), contacts(ime)",
    )
    .eq("workspace_id", aktivni.id)
    .order("prioritet")
    .order("redoslijed");

  const zadaci = (data ?? []) as unknown as Zadatak[];

  return (
    <div className="space-y-5">
      <BrziUnos />
      <Kanban zadaci={zadaci} />
    </div>
  );
}
