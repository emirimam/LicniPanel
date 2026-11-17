import { server } from "@/lib/supabase/server";
import { ucitajProstore } from "@/lib/prostor";
import ListaNaloga from "@/components/ListaNaloga";

export default async function Nalozi() {
  const { prostori } = await ucitajProstore();
  const supabase = await server();

  const { data } = await supabase
    .from("accounts")
    .select(
      "id, naziv, host, port, korisnik, workspace_id, fascikla_poslane, aktivan, secret_ref, zadnja_sinhronizacija, zadnja_greska, stanje",
    )
    .order("naziv");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-base font-semibold">Mail nalozi</h1>
        <p className="tiho text-sm mt-1">
          Worker čita ove naloge i puni tablu. Lozinka se čuva šifrovano i panel je
          poslije ne može pročitati — samo je worker vadi.
        </p>
      </div>

      <ListaNaloga nalozi={data ?? []} prostori={prostori} />

      <div className="ploca p-4 text-sm">
        <h2 className="font-semibold">Gmail</h2>
        <p className="tiho mt-1">
          Obična lozinka ne radi. Treba app password: Google nalog → Security →
          2-Step Verification → App passwords. Fascikla poslanih je{" "}
          <code>[Gmail]/Sent Mail</code>.
        </p>
      </div>
    </div>
  );
}
