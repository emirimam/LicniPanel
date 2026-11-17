import { server } from "@/lib/supabase/server";
import { ucitajProstore } from "@/lib/prostor";
import { rijesiPrijedlog } from "@/app/akcije";
import type { Prijedlog } from "@/lib/tipovi";

export default async function Prijedlozi() {
  const { aktivni } = await ucitajProstore();
  if (!aktivni) return null;

  const supabase = await server();
  const { data } = await supabase
    .from("suggestions")
    .select(
      "id, tip, sadrzaj, obrazlozenje, sigurnost, created_at, messages(tema, od, datum)",
    )
    .eq("workspace_id", aktivni.id)
    .eq("status", "ceka")
    .order("created_at", { ascending: false });

  const prijedlozi = (data ?? []) as unknown as Prijedlog[];

  if (prijedlozi.length === 0) {
    return (
      <div className="ploca p-10 text-center">
        <p className="text-sm">Nema prijedloga koji čekaju.</p>
        <p className="tiho text-xs mt-1">
          Ovdje će stizati zadaci izvučeni iz pošte kad mail worker proradi.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {prijedlozi.map((p) => {
        const s = p.sadrzaj as { naslov?: string; rok?: string };
        return (
          <article key={p.id} className="ploca p-4">
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <p className="text-sm font-medium">{s.naslov ?? "Bez naslova"}</p>

                {p.messages && (
                  <p className="tiho text-xs mt-1">
                    iz pošte: {p.messages.od} — {p.messages.tema}
                  </p>
                )}
                {p.obrazlozenje && (
                  <p className="tiho text-xs mt-1">{p.obrazlozenje}</p>
                )}

                <div className="tiho text-xs mt-2 flex gap-3">
                  {s.rok && <span>rok {s.rok}</span>}
                  {p.sigurnost !== null && (
                    <span>sigurnost {Math.round(p.sigurnost * 100)}%</span>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <form action={rijesiPrijedlog.bind(null, p.id, true)}>
                  <button className="rounded-md bg-blue-600 text-white px-3 py-1.5 text-xs font-medium">
                    Prihvati
                  </button>
                </form>
                <form action={rijesiPrijedlog.bind(null, p.id, false)}>
                  <button
                    className="rounded-md border px-3 py-1.5 text-xs"
                    style={{ borderColor: "var(--ivica)" }}
                  >
                    Odbaci
                  </button>
                </form>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
