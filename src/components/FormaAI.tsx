"use client";

import { useActionState, useState, useTransition } from "react";
import { spremiAI, testirajAI, type IshodAI } from "@/app/akcije-ai";

const MODELI = [
  { id: "claude-haiku-5-5", naziv: "Claude Haiku 5.5 (brz i jeftin)" },
  { id: "claude-sonnet-5-5", naziv: "Claude Sonnet 5.5 (za složene odgovore)" },
];

const POLJE = "polje w-full";

export default function FormaAI({
  modelBrzi,
  modelPisanje,
  imaKljuc,
}: {
  modelBrzi: string;
  modelPisanje: string;
  imaKljuc: boolean;
}) {
  const [ishod, posalji, radi] = useActionState<IshodAI, FormData>(spremiAI, {});
  const [test, setTest] = useState<IshodAI | null>(null);
  const [testira, pokreniTest] = useTransition();
  const [prikazi, setPrikazi] = useState(false);

  return (
    <form action={posalji} className="space-y-4">
      <label className="block space-y-1">
        <span className="tiho text-xs">
          Anthropic API ključ {imaKljuc ? "— sačuvan (ne prikazuje se)" : "— još nije sačuvan"}
        </span>
        <div className="flex gap-2">
          <input
            name="kljuc"
            type={prikazi ? "text" : "password"}
            autoComplete="off"
            placeholder={imaKljuc ? "Ostavi prazno da zadržiš postojeći" : "sk-ant-…"}
            className={`${POLJE} flex-1`}
          />
          <button type="button" onClick={() => setPrikazi(!prikazi)} className="polje text-xs">
            {prikazi ? "Sakrij" : "Prikaži"}
          </button>
        </div>
      </label>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1">
          <span className="tiho text-xs">Model za razvrstavanje, sažetke i rokove</span>
          <select name="model_brzi" defaultValue={modelBrzi} className={POLJE}>
            {MODELI.map((m) => (
              <option key={m.id} value={m.id}>{m.naziv}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="tiho text-xs">Model za pisanje nacrta odgovora</span>
          <select name="model_pisanje" defaultValue={modelPisanje} className={POLJE}>
            {MODELI.map((m) => (
              <option key={m.id} value={m.id}>{m.naziv}</option>
            ))}
          </select>
        </label>
      </div>

      <p className="tiho text-xs">
        Ključ se šalje u Vault i nikad se ne vraća u browser. Ton i potpis po firmi podešavaš u sekciji Prostori.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" disabled={radi} className="dugme">
          {radi ? "Čuvam…" : "Sačuvaj"}
        </button>
        <button
          type="button"
          disabled={testira || !imaKljuc}
          onClick={() => pokreniTest(async () => setTest(await testirajAI()))}
          className="polje text-xs"
        >
          {testira ? "Testiram…" : "Testiraj konekciju"}
        </button>
        {test?.poruka && <span className="text-xs text-emerald-400">● {test.poruka}</span>}
        {test?.greska && <span className="text-xs text-red-400">● {test.greska}</span>}
        {ishod.greska && <span className="text-xs text-red-400">{ishod.greska}</span>}
        {ishod.poruka && <span className="tiho text-xs">{ishod.poruka}</span>}
      </div>
    </form>
  );
}
