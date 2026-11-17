"use client";

import { useState } from "react";

/** Polje sa punom adresom i dugmetom za kopiranje. */
export default function KopirajLink({ tekst }: { tekst: string }) {
  const [kopirano, setKopirano] = useState(false);

  async function kopiraj() {
    try {
      await navigator.clipboard.writeText(tekst);
      setKopirano(true);
      setTimeout(() => setKopirano(false), 1500);
    } catch {
      setKopirano(false);
    }
  }

  return (
    <div className="flex gap-2">
      <input
        readOnly
        value={tekst}
        onFocus={(e) => e.currentTarget.select()}
        className="polje w-full font-mono text-xs"
        aria-label="Adresa za kopiranje"
      />
      <button type="button" onClick={kopiraj} className="dugme whitespace-nowrap">
        {kopirano ? "Kopirano ✓" : "Kopiraj"}
      </button>
    </div>
  );
}
