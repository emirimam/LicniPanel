import { server } from "@/lib/supabase/server";
import { ucitajProstore } from "@/lib/prostor";
import ListaNaloga from "@/components/ListaNaloga";
import FormaAI from "@/components/FormaAI";
import { novoProstor, urediProstor } from "@/app/akcije-prostori";

const POLJE = "polje w-full";

export default async function Nalozi() {
  const { prostori } = await ucitajProstore();
  const supabase = await server();

  const { data: nalozi } = await supabase
    .from("accounts")
    .select(
      "id, naziv, vrsta, host, port, korisnik, workspace_id, fascikla_poslane, aktivan, smtp_host, smtp_port, webhook_token, zadnja_sinhronizacija, zadnja_greska, test_status, test_poruka",
    )
    .order("naziv");

  const { data: { user } } = await supabase.auth.getUser();
  const { data: postavke } = await supabase
    .from("korisnik_postavke")
    .select("model_brzi, model_pisanje, anthropic_secret_id")
    .eq("user_id", user!.id)
    .maybeSingle();

  const webBaza = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Nalozi i AI podešavanja</h1>
        <p className="tiho mt-1 text-sm">Prostori, mail nalozi i veza s Claudeom. Ništa ovdje ne traži diranje koda.</p>
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold">Claude API konekcija</h2>
          <p className="tiho mt-1 text-xs">Obrada mailova, sažeci, prijedlozi odgovora.</p>
        </div>
        <div className="ploca p-5">
          <FormaAI
            modelBrzi={postavke?.model_brzi ?? "claude-haiku-5-5"}
            modelPisanje={postavke?.model_pisanje ?? "claude-sonnet-5-5"}
            imaKljuc={Boolean(postavke?.anthropic_secret_id)}
          />
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold">Prostori</h2>
          <p className="tiho mt-1 text-xs">
            Naziv, boja, potpis i ton po firmi. AI piše odgovore u tom tonu i s tim potpisom.
          </p>
        </div>

        <div className="ploca divide-y" style={{ borderColor: "var(--ivica)" }}>
          {prostori.map((p) => (
            <form
              key={p.id}
              action={urediProstor.bind(null, p.id)}
              className="grid gap-3 p-4 md:grid-cols-[1fr_auto] md:items-start"
            >
              <div className="grid gap-3 md:grid-cols-2">
                <input name="naziv" defaultValue={p.naziv} required className={POLJE} aria-label="Naziv" />
                <input
                  type="color"
                  name="boja"
                  defaultValue={p.boja ?? "#3b82f6"}
                  aria-label="Boja"
                  className="h-9 w-16 cursor-pointer rounded-md border bg-transparent"
                  style={{ borderColor: "var(--ivica)" }}
                />
                <textarea name="potpis" defaultValue={p.potpis ?? ""} rows={2} placeholder="Potpis za mailove" className={POLJE} aria-label="Potpis" />
                <textarea name="ton" defaultValue={p.ton ?? ""} rows={2} placeholder="Ton, npr. formalan, na ti, kratko" className={POLJE} aria-label="Ton" />
              </div>
              <button type="submit" className="dugme">Sačuvaj</button>
            </form>
          ))}

          <form action={novoProstor} className="grid gap-3 p-4 md:grid-cols-[1fr_auto] md:items-start">
            <div className="grid gap-3 md:grid-cols-2">
              <input name="naziv" required placeholder="Nova firma" className={POLJE} aria-label="Naziv nove firme" />
              <input type="color" name="boja" defaultValue="#3b82f6" aria-label="Boja nove firme" className="h-9 w-16 cursor-pointer rounded-md border bg-transparent" style={{ borderColor: "var(--ivica)" }} />
              <textarea name="potpis" rows={2} placeholder="Potpis (opcionalno)" className={POLJE} aria-label="Potpis nove firme" />
              <textarea name="ton" rows={2} placeholder="Ton (opcionalno)" className={POLJE} aria-label="Ton nove firme" />
            </div>
            <button type="submit" className="dugme">Dodaj</button>
          </form>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold">Mail nalozi</h2>
          <p className="tiho mt-1 text-xs">
            Svaki nalog pripada jednom prostoru. IMAP za prijem, SMTP za slanje odgovora, ili webhook za brzi prijem.
          </p>
        </div>
        <ListaNaloga nalozi={nalozi ?? []} prostori={prostori} webBaza={webBaza} />
        <p className="tiho text-xs">
          Gmail: obična lozinka ne radi, treba app password (Google nalog → Security → App passwords). Fascikla poslanih: <code>[Gmail]/Sent Mail</code>.
        </p>
      </section>
    </div>
  );
}
