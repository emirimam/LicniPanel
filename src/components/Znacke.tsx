import { danasISO, razlikaUDanima } from "@/lib/datum";

const PRIORITET: Record<number, string> = {
  1: "bg-red-500/15 text-red-400 ring-red-500/30",
  2: "bg-orange-500/15 text-orange-400 ring-orange-500/30",
  3: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  4: "bg-sky-500/10 text-sky-300 ring-sky-500/25",
  5: "bg-white/5 text-zinc-400 ring-white/10",
};

const OSNOVA = "inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset";

/** !1 do !5, crvena je najhitnije. */
export function PrioritetZnacka({ prioritet }: { prioritet: number }) {
  return (
    <span className={`${OSNOVA} ${PRIORITET[prioritet] ?? PRIORITET[3]}`}>
      !{prioritet}
    </span>
  );
}

/** Tag projekta, npr. #itdvoip. */
export function ProjekatZnacka({ naziv }: { naziv: string }) {
  return (
    <span className={`${OSNOVA} bg-white/5 text-zinc-300 ring-white/10`}>
      #{naziv}
    </span>
  );
}

/** Sat iz brzog unosa, npr. 10:00. */
export function VrijemeZnacka({ vrijeme }: { vrijeme: string | null }) {
  if (!vrijeme) return null;
  return (
    <span className={`${OSNOVA} bg-white/5 text-zinc-300 ring-white/10 tabular-nums`}>{vrijeme}</span>
  );
}

/** Rok relativno u odnosu na danas (zona Sarajevo). */
export function RokZnacka({ rok }: { rok: string | null }) {
  if (!rok) return null;
  const dana = razlikaUDanima(rok, danasISO());
  const tekst =
    dana < 0 ? `kasni ${-dana} d` : dana === 0 ? "danas" : dana === 1 ? "sutra" : `za ${dana} d`;
  const kasni = dana <= 0;
  return (
    <span
      className={`${OSNOVA} ${
        kasni ? "bg-red-500/15 text-red-400 ring-red-500/30" : "bg-white/5 text-zinc-400 ring-white/10"
      }`}
    >
      {tekst}
    </span>
  );
}

/** Prostor kojem zadatak pripada, vidi se u prikazu Sve zajedno. */
export function ProstorZnacka({ naziv, boja }: { naziv: string; boja: string | null }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] tiho">
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: boja ?? "#3b82f6" }} />
      {naziv}
    </span>
  );
}
