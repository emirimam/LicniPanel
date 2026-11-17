"use client";

import { useState, useTransition } from "react";
import FormaNaloga, { type Nalog } from "@/components/FormaNaloga";
import { obrisiNalog, prebaciAktivan } from "@/app/akcije-nalozi";
import type { Prostor } from "@/lib/tipovi";

type Red = Nalog & {
  zadnja_sinhronizacija: string | null;
  zadnja_greska: string | null;
  stanje: Record<string, { uid?: number }> | null;
};

function kada(vrijeme: string | null): string {
  if (!vrijeme) return "nikad";
  const minuta = Math.floor((Date.now() - new Date(vrijeme).getTime()) / 60000);
  if (minuta < 1) return "upravo";
  if (minuta < 60) return `prije ${minuta} min`;
  const sati = Math.floor(minuta / 60);
  if (sati < 24) return `prije ${sati} h`;
  return `prije ${Math.floor(sati / 24)} d`;
}

export default function ListaNaloga({
  nalozi,
  prostori,
}: {
  nalozi: Red[];
  prostori: Prostor[];
}) {
  const [otvoren, setOtvoren] = useState<string | null>(null);
  const [novi, setNovi] = useState(nalozi.length === 0);
  const [ceka, pokreni] = useTransition();

  return (
    <div className="space-y-4">
      {nalozi.map((n) => {
        const prostor = prostori.find((p) => p.id === n.workspace_id);
        const uredjuje = otvoren === n.id;

        return (
          <article key={n.id} className="ploca p-4">
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      n.aktivan ? "bg-green-500" : "bg-gray-400"
                    }`}
                  />
                  <p className="text-sm font-medium">{n.naziv}</p>
                  <span className="tiho text-xs">{prostor?.naziv}</span>
                </div>

                <p className="tiho text-xs mt-1">
                  {n.korisnik} · {n.host}:{n.port}
                </p>

                <p className="tiho text-xs mt-1">
                  sinhronizovano {kada(n.zadnja_sinhronizacija)}
                  {n.secret_ref ? " · lozinka spašena" : " · lozinka nije postavljena"}
                </p>

                {n.zadnja_greska && (
                  <p className="text-xs text-red-600 mt-1">{n.zadnja_greska}</p>
                )}
              </div>

              <div className="flex gap-3 text-xs">
                <button
                  onClick={() => setOtvoren(uredjuje ? null : n.id)}
                  className="tiho hover:opacity-70"
                >
                  {uredjuje ? "Zatvori" : "Uredi"}
                </button>
                <button
                  disabled={ceka}
                  onClick={() => pokreni(() => prebaciAktivan(n.id, !n.aktivan))}
                  className="tiho hover:opacity-70"
                >
                  {n.aktivan ? "Pauziraj" : "Uključi"}
                </button>
                <button
                  disabled={ceka}
                  onClick={() => {
                    if (confirm(`Obrisati nalog "${n.naziv}"? Lozinka se briše s njim.`))
                      pokreni(() => obrisiNalog(n.id));
                  }}
                  className="text-red-600 hover:opacity-70"
                >
                  Obriši
                </button>
              </div>
            </div>

            {uredjuje && (
              <div className="mt-4 pt-4 border-t" style={{ borderColor: "var(--ivica)" }}>
                <FormaNaloga
                  prostori={prostori}
                  nalog={n}
                  naKraju={() => setOtvoren(null)}
                />
              </div>
            )}
          </article>
        );
      })}

      {novi ? (
        <section className="ploca p-4">
          <h2 className="text-sm font-semibold mb-3">Novi nalog</h2>
          <FormaNaloga prostori={prostori} naKraju={() => setNovi(false)} />
        </section>
      ) : (
        <button
          onClick={() => setNovi(true)}
          className="rounded-md border px-4 py-2 text-sm"
          style={{ borderColor: "var(--ivica)" }}
        >
          Dodaj nalog
        </button>
      )}
    </div>
  );
}
