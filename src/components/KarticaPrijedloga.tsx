"use client";

import { useState, useTransition } from "react";
import { odobriPrijedlog, urediNacrt } from "@/app/akcije-ai";
import { rijesiPrijedlog } from "@/app/akcije";
import type { SadrzajPrijedloga } from "@/lib/prijedlog";
import { PrioritetZnacka, RokZnacka, ProstorZnacka } from "@/components/Znacke";

export default function KarticaPrijedloga({
  id,
  sadrzaj,
  prostor,
}: {
  id: string;
  sadrzaj: SadrzajPrijedloga;
  prostor: { naziv: string; boja: string | null } | null;
}) {
  const [nacrt, setNacrt] = useState(sadrzaj.nacrt ?? "");
  const [uredjuje, setUredjuje] = useState(false);
  const [poruka, setPoruka] = useState<{ tip: "ok" | "greska"; tekst: string } | null>(null);
  const [ceka, pokreni] = useTransition();

  function posalji() {
    pokreni(async () => {
      const r = await odobriPrijedlog(id, nacrt);
      setPoruka(r.greska ? { tip: "greska", tekst: r.greska } : { tip: "ok", tekst: r.poruka ?? "Poslano." });
    });
  }

  function sacuvaj() {
    pokreni(async () => {
      const r = await urediNacrt(id, nacrt);
      setPoruka(r.greska ? { tip: "greska", tekst: r.greska } : { tip: "ok", tekst: r.poruka ?? "Sačuvano." });
      setUredjuje(false);
    });
  }

  function odbaci() {
    pokreni(() => rijesiPrijedlog(id, false));
  }

  const o = sadrzaj.original;

  return (
    <article className="ploca p-0">
      <div className="flex flex-wrap items-center gap-2 border-b px-5 py-3" style={{ borderColor: "var(--ivica)" }}>
        <PrioritetZnacka prioritet={sadrzaj.prioritet} />
        {sadrzaj.rok && <RokZnacka rok={sadrzaj.rok} />}
        {prostor && <ProstorZnacka naziv={prostor.naziv} boja={prostor.boja} />}
        <span className="ml-auto text-xs tiho">{sadrzaj.original.od}</span>
      </div>

      <div className="grid md:grid-cols-2">
        <section className="space-y-2 border-b p-5 md:border-b-0 md:border-r" style={{ borderColor: "var(--ivica)" }}>
          <p className="text-xs font-semibold uppercase tracking-wide tiho">Original</p>
          <p className="text-sm font-medium">{o.tema || "(bez teme)"}</p>
          <p className="max-h-56 overflow-y-auto whitespace-pre-line text-sm tiho">{o.tijelo}</p>
        </section>

        <section className="space-y-3 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide tiho">AI pripremio</p>
          <p className="text-sm">{sadrzaj.sazetak}</p>
          {sadrzaj.zadatak && (
            <p className="text-xs">
              <span className="tiho">Zadatak:</span> {sadrzaj.zadatak}
            </p>
          )}

          <textarea
            value={nacrt}
            onChange={(e) => setNacrt(e.target.value)}
            readOnly={!uredjuje}
            rows={8}
            aria-label="Prijedlog odgovora"
            className={`polje w-full text-sm leading-relaxed ${uredjuje ? "" : "opacity-90"}`}
          />

          {poruka && (
            <p className={`text-xs ${poruka.tip === "ok" ? "text-emerald-400" : "text-red-400"}`}>{poruka.tekst}</p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" disabled={ceka || !nacrt.trim()} onClick={posalji} className="dugme">
              Odobri i pošalji
            </button>
            {uredjuje ? (
              <button type="button" disabled={ceka} onClick={sacuvaj} className="polje text-xs">
                Sačuvaj izmjenu
              </button>
            ) : (
              <button type="button" onClick={() => setUredjuje(true)} className="polje text-xs">
                Uredi odgovor
              </button>
            )}
            <button type="button" disabled={ceka} onClick={odbaci} className="polje text-xs text-red-400">
              Odbaci
            </button>
          </div>
        </section>
      </div>
    </article>
  );
}
