"use client";

import { useEffect, useState } from "react";
import { ucitajPrepisku, type PorukaPrepiske } from "@/app/akcije";

/** Prozor s cijelom prepiskom kartice: original i poslani odgovor. */
export default function MailModal({ porukaId, onZatvori }: { porukaId: string; onZatvori: () => void }) {
  const [poruke, setPoruke] = useState<PorukaPrepiske[] | null>(null);

  useEffect(() => {
    let otkazano = false;
    ucitajPrepisku(porukaId).then((r) => {
      if (!otkazano) setPoruke(r);
    });
    return () => {
      otkazano = true;
    };
  }, [porukaId]);

  useEffect(() => {
    const kraj = (e: KeyboardEvent) => e.key === "Escape" && onZatvori();
    window.addEventListener("keydown", kraj);
    return () => window.removeEventListener("keydown", kraj);
  }, [onZatvori]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 md:p-10"
      onClick={onZatvori}
      role="dialog"
      aria-modal="true"
    >
      <div className="ploca w-full max-w-2xl p-0" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center border-b px-5 py-3" style={{ borderColor: "var(--ivica)" }}>
          <h2 className="text-sm font-semibold">{poruke?.[0]?.tema ?? "Mail"}</h2>
          <button type="button" onClick={onZatvori} className="polje ml-auto text-xs">
            Zatvori
          </button>
        </div>

        <div className="space-y-4 p-5">
          {poruke === null && <p className="tiho text-sm">Učitavam…</p>}
          {poruke?.length === 0 && <p className="tiho text-sm">Mail nije pronađen.</p>}
          {poruke?.map((m) => (
            <article key={m.id} className="rounded-lg border p-4" style={{ borderColor: "var(--ivica)" }}>
              <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs tiho">
                <span className="font-semibold uppercase tracking-wide">
                  {m.smjer === "izlazna" ? "Poslano" : "Primljeno"}
                </span>
                <span>Od: {m.od ?? "—"}</span>
                {m.za.length > 0 && <span>Za: {m.za.join(", ")}</span>}
                <span className="ml-auto">{new Date(m.datum).toLocaleString("bs-BA")}</span>
              </div>
              <p className="mb-2 text-sm font-medium">{m.tema ?? "(bez teme)"}</p>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.tijelo ?? ""}</p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
