"use client";

import { useTransition } from "react";
import { postaviProstor } from "@/app/akcije";
import type { Prostor } from "@/lib/tipovi";

export default function PrebacivacProstora({
  prostori,
  aktivni,
}: {
  prostori: Prostor[];
  aktivni: Prostor | null;
}) {
  const [ceka, pokreni] = useTransition();

  return (
    <div className="flex gap-1" aria-label="Prostor">
      {prostori.map((p) => {
        const izabran = p.slug === aktivni?.slug;
        return (
          <button
            key={p.id}
            disabled={ceka}
            onClick={() => pokreni(() => postaviProstor(p.slug))}
            className={`px-3 py-1 rounded-md text-sm transition ${
              izabran ? "text-white" : "tiho hover:opacity-70"
            }`}
            style={izabran ? { background: p.boja ?? "#2563eb" } : undefined}
          >
            {p.naziv}
          </button>
        );
      })}
    </div>
  );
}
