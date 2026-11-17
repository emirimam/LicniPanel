"use client";

import { useActionState, useState } from "react";
import { sacuvajNalog, type IshodNaloga } from "@/app/akcije-nalozi";
import type { Prostor } from "@/lib/tipovi";

export type Nalog = {
  id: string;
  naziv: string;
  host: string | null;
  port: number | null;
  korisnik: string | null;
  workspace_id: string;
  fascikla_poslane: string | null;
  aktivan: boolean;
  secret_ref: string | null;
};

const PREDLOSCI: Record<string, { host: string; port: number; poslane: string }> = {
  gmail: { host: "imap.gmail.com", port: 993, poslane: "[Gmail]/Sent Mail" },
  outlook: { host: "outlook.office365.com", port: 993, poslane: "Sent Items" },
  drugo: { host: "", port: 993, poslane: "Sent" },
};

export default function FormaNaloga({
  prostori,
  nalog,
  naKraju,
}: {
  prostori: Prostor[];
  nalog?: Nalog;
  naKraju?: () => void;
}) {
  const [ishod, posalji, radi] = useActionState<IshodNaloga, FormData>(
    async (prethodno, fd) => {
      const r = await sacuvajNalog(prethodno, fd);
      if (!r.greska) naKraju?.();
      return r;
    },
    {},
  );

  const [host, setHost] = useState(nalog?.host ?? "");
  const [port, setPort] = useState(nalog?.port ?? 993);
  const [poslane, setPoslane] = useState(nalog?.fascikla_poslane ?? "");

  function primijeniPredlozak(kljuc: string) {
    const p = PREDLOSCI[kljuc];
    if (!p) return;
    setHost(p.host);
    setPort(p.port);
    setPoslane(p.poslane);
  }

  const polje = "w-full rounded-md border px-3 py-2 text-sm bg-transparent";
  const stilIvice = { borderColor: "var(--ivica)" };

  return (
    <form action={posalji} className="space-y-3">
      {nalog && <input type="hidden" name="id" value={nalog.id} />}

      {!nalog && (
        <div className="flex gap-2 text-xs">
          <span className="tiho py-1">Popuni za:</span>
          {Object.keys(PREDLOSCI).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => primijeniPredlozak(k)}
              className="rounded-md border px-2 py-1 hover:opacity-70"
              style={stilIvice}
            >
              {k}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="tiho text-xs">Naziv</span>
          <input
            name="naziv"
            required
            defaultValue={nalog?.naziv}
            placeholder="Startiti"
            className={polje}
            style={stilIvice}
          />
        </label>

        <label className="block">
          <span className="tiho text-xs">Prostor</span>
          <select
            name="workspace_id"
            defaultValue={nalog?.workspace_id ?? prostori[0]?.id}
            className={polje}
            style={stilIvice}
          >
            {prostori.map((p) => (
              <option key={p.id} value={p.id}>
                {p.naziv}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="tiho text-xs">IMAP server</span>
          <input
            name="host"
            required
            value={host}
            onChange={(e) => setHost(e.target.value)}
            placeholder="imap.gmail.com"
            className={polje}
            style={stilIvice}
          />
        </label>

        <label className="block">
          <span className="tiho text-xs">Port</span>
          <input
            name="port"
            type="number"
            value={port}
            onChange={(e) => setPort(Number(e.target.value))}
            className={polje}
            style={stilIvice}
          />
        </label>

        <label className="block">
          <span className="tiho text-xs">Korisničko ime</span>
          <input
            name="korisnik"
            required
            defaultValue={nalog?.korisnik ?? ""}
            placeholder="ugstartiti@gmail.com"
            autoComplete="off"
            className={polje}
            style={stilIvice}
          />
        </label>

        <label className="block">
          <span className="tiho text-xs">
            Lozinka {nalog && "(ostavi prazno da ostane ista)"}
          </span>
          <input
            name="lozinka"
            type="password"
            autoComplete="new-password"
            placeholder={nalog?.secret_ref ? "••••••••" : "app password"}
            className={polje}
            style={stilIvice}
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="tiho text-xs">Fascikla poslanih</span>
          <input
            name="fascikla_poslane"
            value={poslane}
            onChange={(e) => setPoslane(e.target.value)}
            placeholder="[Gmail]/Sent Mail"
            className={polje}
            style={stilIvice}
          />
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="aktivan"
          defaultChecked={nalog ? nalog.aktivan : true}
        />
        <span>Worker čita ovaj nalog</span>
      </label>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={radi}
          className="rounded-md bg-blue-600 text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {radi ? "Čekaj…" : nalog ? "Spasi izmjene" : "Dodaj nalog"}
        </button>
        {ishod.greska && <span className="text-sm text-red-600">{ishod.greska}</span>}
        {ishod.poruka && <span className="tiho text-sm">{ishod.poruka}</span>}
      </div>
    </form>
  );
}
