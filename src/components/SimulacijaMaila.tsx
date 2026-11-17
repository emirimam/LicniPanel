"use client";

import { useActionState, useState } from "react";
import { simulirajMail, type IshodAI } from "@/app/akcije-ai";

const PRIMJER = {
  od: "marko.petrovic@klijent.ba",
  tema: "Ponuda za održavanje servera - rok do petka",
  tijelo:
    "Poštovani, molim vas da nam do petka, 21.11., pošaljete ponudu za godišnje održavanje dva servera i backup rješenja. Javite ako trebate dodatne informacije o trenutnoj konfiguraciji.\n\nLijep pozdrav,\nMarko Petrović",
};

const POLJE = "polje w-full";

export default function SimulacijaMaila({
  nalozi,
}: {
  nalozi: { id: string; naziv: string }[];
}) {
  const [ishod, posalji, radi] = useActionState<IshodAI, FormData>(simulirajMail, {});
  const [forma, setForma] = useState({ od: "", tema: "", tijelo: "" });

  return (
    <details className="ploca p-4" open={nalozi.length === 0 ? undefined : undefined}>
      <summary className="cursor-pointer text-sm font-medium">
        Simuliraj novi mail <span className="tiho font-normal">(test mod, bez pravog naloga)</span>
      </summary>

      <form action={posalji} className="mt-4 space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          <input
            name="od"
            value={forma.od}
            onChange={(e) => setForma({ ...forma, od: e.target.value })}
            placeholder="Od (email pošiljaoca)"
            className={POLJE}
          />
          <input
            name="tema"
            value={forma.tema}
            onChange={(e) => setForma({ ...forma, tema: e.target.value })}
            placeholder="Tema"
            className={POLJE}
          />
        </div>
        <textarea
          name="tijelo"
          value={forma.tijelo}
          onChange={(e) => setForma({ ...forma, tijelo: e.target.value })}
          rows={6}
          placeholder="Zalijepi tekst maila"
          className={POLJE}
        />
        <div className="flex flex-wrap items-center gap-2">
          <select name="nalog_id" className={POLJE} style={{ maxWidth: 260 }}>
            <option value="">Bez naloga (prostor po AI)</option>
            {nalozi.map((n) => (
              <option key={n.id} value={n.id}>{n.naziv}</option>
            ))}
          </select>
          <button type="button" onClick={() => setForma(PRIMJER)} className="polje text-xs">
            Ubaci primjer
          </button>
          <button type="submit" disabled={radi} className="dugme">
            {radi ? "AI obrađuje…" : "Obradi mail"}
          </button>
          {ishod.poruka && <span className="tiho text-xs">{ishod.poruka}</span>}
          {ishod.greska && <span className="text-xs text-red-400">{ishod.greska}</span>}
        </div>
      </form>
    </details>
  );
}
