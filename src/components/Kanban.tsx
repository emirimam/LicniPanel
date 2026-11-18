"use client";

import { useState, useTransition } from "react";
import { pomjeriZadatak } from "@/app/akcije";
import MailModal from "@/components/MailModal";
import { FAZE, type Faza, type Zadatak } from "@/lib/tipovi";
import {
  PrioritetZnacka,
  ProjekatZnacka,
  ProstorZnacka,
  RokZnacka,
  VrijemeZnacka,
} from "@/components/Znacke";

/** Tabla sa 4 kolone. Karticu mozes prevuci u drugu kolonu ili koristiti strelice. */
export default function Kanban({
  zadaci,
  prikaziProstor,
}: {
  zadaci: Zadatak[];
  prikaziProstor: boolean;
}) {
  const [ceka, pokreni] = useTransition();
  const [povuceno, setPovuceno] = useState<string | null>(null);
  const [cilj, setCilj] = useState<Faza | null>(null);
  const [otvorenMail, setOtvorenMail] = useState<string | null>(null);

  const premjesti = (id: string, faza: Faza) =>
    pokreni(() => pomjeriZadatak(id, faza));

  return (
    <div className="grid gap-3 md:grid-cols-4">
      {FAZE.map((faza) => {
        const uKoloni = zadaci.filter((z) => z.faza === faza.kljuc);
        const naCilju = cilj === faza.kljuc && povuceno !== null;

        return (
          <section
            key={faza.kljuc}
            onDragOver={(e) => {
              e.preventDefault();
              setCilj(faza.kljuc);
            }}
            onDragLeave={() => setCilj((c) => (c === faza.kljuc ? null : c))}
            onDrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData("text/plain");
              setCilj(null);
              setPovuceno(null);
              if (id) premjesti(id, faza.kljuc);
            }}
            className={`rounded-xl border p-2 transition ${
              naCilju ? "bg-white/[0.04]" : "bg-transparent"
            }`}
            style={{ borderColor: naCilju ? "var(--ivica-jaca)" : "var(--ivica)" }}
          >
            <header className="mb-2 flex items-center justify-between px-1 py-1">
              <h2 className="text-xs font-semibold uppercase tracking-wide tiho">
                {faza.naziv}
              </h2>
              <span className="tiho text-xs tabular-nums">{uKoloni.length}</span>
            </header>

            <div className="space-y-2">
              {uKoloni.map((z) => {
                const indeks = FAZE.findIndex((f) => f.kljuc === z.faza);
                return (
                  <article
                    key={z.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", z.id);
                      e.dataTransfer.effectAllowed = "move";
                      setPovuceno(z.id);
                    }}
                    onDragEnd={() => {
                      setPovuceno(null);
                      setCilj(null);
                    }}
                    className={`ploca-hover cursor-grab rounded-lg p-3 text-sm active:cursor-grabbing ${
                      povuceno === z.id ? "opacity-40" : ""
                    }`}
                  >
                    <p className="leading-snug">{z.naslov}</p>

                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <PrioritetZnacka prioritet={z.prioritet} />
                      {z.projects?.naziv && <ProjekatZnacka naziv={z.projects.naziv} />}
                      <RokZnacka rok={z.rok} />
                      <VrijemeZnacka vrijeme={z.vrijeme} />
                      {z.source_message_id && (
                        <button
                          type="button"
                          onClick={() => setOtvorenMail(z.source_message_id)}
                          className="tiho inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] ring-1 ring-inset ring-white/10 hover:bg-white/[0.06] hover:text-[var(--tekst)]"
                          title="Otvori cijeli mail"
                          aria-label="Otvori cijeli mail"
                        >
                          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <rect x="3" y="5" width="18" height="14" rx="2" />
                            <path d="m3 7 9 6 9-6" />
                          </svg>
                          Mail
                        </button>
                      )}
                    </div>

                    {prikaziProstor && z.workspaces && (
                      <div className="mt-2">
                        <ProstorZnacka naziv={z.workspaces.naziv} boja={z.workspaces.boja} />
                      </div>
                    )}

                    <div className="mt-2 flex items-center gap-1">
                      {indeks > 0 && (
                        <button
                          type="button"
                          disabled={ceka}
                          onClick={() => premjesti(z.id, FAZE[indeks - 1].kljuc)}
                          className="tiho rounded px-1.5 py-0.5 text-xs hover:bg-white/[0.06] hover:text-[var(--tekst)]"
                          aria-label="Vrati u prethodnu kolonu"
                        >
                          ←
                        </button>
                      )}
                      {indeks < FAZE.length - 1 && (
                        <button
                          type="button"
                          disabled={ceka}
                          onClick={() => premjesti(z.id, FAZE[indeks + 1].kljuc)}
                          className="tiho rounded px-1.5 py-0.5 text-xs hover:bg-white/[0.06] hover:text-[var(--tekst)]"
                          aria-label="Pomjeri u sljedecu kolonu"
                        >
                          →
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}

              {uKoloni.length === 0 && (
                <p className="tiho py-8 text-center text-xs">prazno</p>
              )}
            </div>
          </section>
        );
      })}
      {otvorenMail && <MailModal porukaId={otvorenMail} onZatvori={() => setOtvorenMail(null)} />}
    </div>
  );
}
