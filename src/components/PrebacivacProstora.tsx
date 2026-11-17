"use client";

import { useTransition } from "react";
import { postaviProstor } from "@/app/akcije";
import type { Prostor } from "@/lib/tipovi";
import { SVE } from "@/lib/prostor-konst";

/** Birac prostora: Sve zajedno ili jedna firma/privatno. */
export default function PrebacivacProstora({
  prostori,
  aktivni,
  sve,
}: {
  prostori: Prostor[];
  aktivni: Prostor | null;
  sve: boolean;
}) {
  const [ceka, pokreni] = useTransition();

  const opcije: { slug: string; naziv: string; boja: string | null }[] = [
    { slug: SVE, naziv: "Sve zajedno", boja: null },
    ...prostori.map((p) => ({ slug: p.slug, naziv: p.naziv, boja: p.boja })),
  ];

  return (
    <div
      className="flex flex-wrap gap-1 rounded-lg border p-1"
      style={{ borderColor: "var(--ivica)" }}
      role="group"
      aria-label="Prostor"
    >
      {opcije.map((o) => {
        const izabran = o.slug === SVE ? sve : !sve && o.slug === aktivni?.slug;
        return (
          <button
            key={o.slug}
            type="button"
            disabled={ceka}
            onClick={() => pokreni(() => postaviProstor(o.slug))}
            className={`flex items-center gap-2 rounded-md px-3 py-1 text-sm transition ${
              izabran ? "bg-white/[0.08] text-white" : "tiho hover:text-[var(--tekst)]"
            }`}
          >
            {o.boja && (
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: o.boja }}
                aria-hidden="true"
              />
            )}
            {o.naziv}
          </button>
        );
      })}
    </div>
  );
}
