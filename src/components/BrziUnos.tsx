"use client";

import { useRef } from "react";
import { dodajZadatak } from "@/app/akcije";
import type { Prostor } from "@/lib/tipovi";

/** Jedan red: "pozvati Adama sutra u 10 #itdvoip !1". */
export default function BrziUnos({
  prostori,
  aktivni,
  sve,
}: {
  prostori: Prostor[];
  aktivni: Prostor | null;
  sve: boolean;
}) {
  const forma = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={forma}
      action={async (fd) => {
        await dodajZadatak(fd);
        forma.current?.reset();
      }}
      className="flex flex-col gap-2 sm:flex-row"
    >
      <input
        name="unos"
        autoComplete="off"
        placeholder="pozvati Adama sutra u 10 #itdvoip !1"
        className="polje flex-1"
      />
      {sve && (
        <select name="prostor" defaultValue={aktivni?.slug ?? prostori[0]?.slug} className="polje">
          {prostori.map((p) => (
            <option key={p.id} value={p.slug}>
              {p.naziv}
            </option>
          ))}
        </select>
      )}
      <button type="submit" className="dugme">
        Dodaj
      </button>
    </form>
  );
}
