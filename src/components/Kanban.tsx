"use client";

import { useTransition } from "react";
import { pomjeriZadatak } from "@/app/akcije";
import { FAZE, type Faza, type Zadatak } from "@/lib/tipovi";

function dospijeva(rok: string | null): { tekst: string; hitno: boolean } | null {
  if (!rok) return null;
  const danas = new Date();
  danas.setHours(0, 0, 0, 0);
  const d = new Date(`${rok}T00:00:00`);
  const dana = Math.round((d.getTime() - danas.getTime()) / 86400000);

  if (dana < 0) return { tekst: `kasni ${Math.abs(dana)} d`, hitno: true };
  if (dana === 0) return { tekst: "danas", hitno: true };
  if (dana === 1) return { tekst: "sutra", hitno: false };
  return { tekst: `za ${dana} d`, hitno: false };
}

export default function Kanban({ zadaci }: { zadaci: Zadatak[] }) {
  const [ceka, pokreni] = useTransition();

  return (
    <div className="grid gap-3 md:grid-cols-4">
      {FAZE.map((faza) => {
        const uKoloni = zadaci.filter((z) => z.faza === faza.kljuc);
        return (
          <section key={faza.kljuc} className="ploca p-3">
            <header className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">{faza.naziv}</h2>
              <span className="tiho text-xs">{uKoloni.length}</span>
            </header>

            <div className="space-y-2">
              {uKoloni.map((z) => {
                const rok = dospijeva(z.rok);
                const indeks = FAZE.findIndex((f) => f.kljuc === z.faza);

                return (
                  <article
                    key={z.id}
                    className="rounded-md border p-3 text-sm"
                    style={{ borderColor: "var(--ivica)" }}
                  >
                    <div className="flex items-start gap-2">
                      {z.prioritet <= 2 && (
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-red-500" />
                      )}
                      <p className="flex-1">{z.naslov}</p>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs tiho">
                      {z.projects?.naziv && <span>{z.projects.naziv}</span>}
                      {rok && (
                        <span className={rok.hitno ? "text-red-600" : undefined}>
                          {rok.tekst}
                        </span>
                      )}
                      {z.source_message_id && <span title="nastalo iz pošte">✉</span>}
                    </div>

                    <div className="mt-2 flex gap-2">
                      {indeks > 0 && (
                        <button
                          disabled={ceka}
                          onClick={() =>
                            pokreni(() =>
                              pomjeriZadatak(z.id, FAZE[indeks - 1].kljuc as Faza),
                            )
                          }
                          className="tiho text-xs hover:opacity-70"
                        >
                          ←
                        </button>
                      )}
                      {indeks < FAZE.length - 1 && (
                        <button
                          disabled={ceka}
                          onClick={() =>
                            pokreni(() =>
                              pomjeriZadatak(z.id, FAZE[indeks + 1].kljuc as Faza),
                            )
                          }
                          className="tiho text-xs hover:opacity-70"
                        >
                          →
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}

              {uKoloni.length === 0 && (
                <p className="tiho text-xs py-6 text-center">prazno</p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
