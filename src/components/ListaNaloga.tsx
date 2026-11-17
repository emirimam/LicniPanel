"use client";

import { useState, useTransition } from "react";
import FormaNaloga, { type Nalog } from "@/components/FormaNaloga";
import { obrisiNalog, prebaciAktivan } from "@/app/akcije-nalozi";
import type { Prostor } from "@/lib/tipovi";

type Red = Nalog & {
  zadnja_sinhronizacija: string | null;
  zadnja_greska: string | null;
  test_status: "povezano" | "greska" | null;
  test_poruka: string | null;
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

function Status({ n }: { n: Red }) {
  if (n.test_status === "povezano") {
    return <span className="text-xs text-emerald-400">● Povezano</span>;
  }
  if (n.test_status === "greska") {
    return <span className="text-xs text-red-400">● Greška</span>;
  }
  return <span className="tiho text-xs">● Nije testirano</span>;
}

export default function ListaNaloga({
  nalozi,
  prostori,
  webBaza,
}: {
  nalozi: Red[];
  prostori: Prostor[];
  webBaza: string;
}) {
  const [otvoren, setOtvoren] = useState<string | null>(null);
  const [novi, setNovi] = useState(nalozi.length === 0);
  const [, pokreni] = useTransition();

  return (
    <div className="space-y-3">
      {nalozi.map((n) => {
        const prostor = prostori.find((p) => p.id === n.workspace_id);
        const uredjuje = otvoren === n.id;

        return (
          <article key={n.id} className="ploca p-4">
            <div className="flex flex-wrap items-start gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium">{n.naziv}</p>
                  <Status n={n} />
                  {prostor && (
                    <span className="inline-flex items-center gap-1.5 text-xs tiho">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: prostor.boja ?? "#3b82f6" }} />
                      {prostor.naziv}
                    </span>
                  )}
                  {!n.aktivan && <span className="tiho text-xs">(pauziran)</span>}
                </div>
                <p className="tiho mt-1 text-xs">
                  {n.vrsta === "webhook" ? "Webhook / forwarding" : `${n.korisnik ?? ""} · ${n.host ?? ""}`}
                  {" · "}zadnji prijem {kada(n.zadnja_sinhronizacija)}
                </p>
                {n.test_poruka && <p className="tiho mt-1 text-xs">{n.test_poruka}</p>}
                {n.zadnja_greska && <p className="mt-1 text-xs text-red-400">{n.zadnja_greska}</p>}
              </div>

              <div className="flex gap-2">
                <button
                  className="polje text-xs"
                  onClick={() => pokreni(() => prebaciAktivan(n.id, !n.aktivan))}
                >
                  {n.aktivan ? "Pauziraj" : "Nastavi"}
                </button>
                <button className="polje text-xs" onClick={() => setOtvoren(uredjuje ? null : n.id)}>
                  {uredjuje ? "Zatvori" : "Uredi"}
                </button>
                <button
                  className="polje text-xs text-red-400"
                  onClick={() => {
                    if (confirm(`Obrisati nalog ${n.naziv}? Lozinka se briše s njim.`)) {
                      pokreni(() => obrisiNalog(n.id));
                    }
                  }}
                >
                  Obriši
                </button>
              </div>
            </div>

            {uredjuje && (
              <div className="mt-4 border-t pt-4" style={{ borderColor: "var(--ivica)" }}>
                <FormaNaloga prostori={prostori} nalog={n} naKraju={() => setOtvoren(null)} webBaza={webBaza} />
              </div>
            )}
          </article>
        );
      })}

      {novi ? (
        <div className="ploca p-4">
          <p className="mb-4 text-sm font-medium">Novi nalog</p>
          <FormaNaloga prostori={prostori} naKraju={() => setNovi(false)} webBaza={webBaza} />
        </div>
      ) : (
        <button className="dugme" onClick={() => setNovi(true)}>
          + Dodaj nalog
        </button>
      )}
    </div>
  );
}
