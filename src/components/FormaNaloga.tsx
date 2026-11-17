"use client";

import { useActionState, useState, useTransition } from "react";
import { sacuvajNalog, testirajNalog, type IshodNaloga, type IshodTesta } from "@/app/akcije-nalozi";
import type { Prostor } from "@/lib/tipovi";

export type Nalog = {
  id: string;
  naziv: string;
  vrsta: "imap" | "gmail" | "webhook" | "graph" | "ews" | "rucno";
  host: string | null;
  port: number | null;
  korisnik: string | null;
  workspace_id: string;
  fascikla_poslane: string | null;
  aktivan: boolean;
  smtp_host: string | null;
  smtp_port: number | null;
  webhook_token: string | null;
  tls_nacin?: "ssl" | "starttls" | "nista";
};

const PREDLOSCI: Record<string, { host: string; port: number; smtp: string; poslane: string }> = {
  gmail: { host: "imap.gmail.com", port: 993, smtp: "smtp.gmail.com", poslane: "[Gmail]/Sent Mail" },
  outlook: { host: "outlook.office365.com", port: 993, smtp: "smtp.office365.com", poslane: "Sent Items" },
  drugo: { host: "", port: 993, smtp: "", poslane: "Sent" },
};

const POLJE = "polje w-full";

export default function FormaNaloga({
  prostori,
  nalog,
  naKraju,
  webBaza,
}: {
  prostori: Prostor[];
  nalog?: Nalog;
  naKraju?: () => void;
  webBaza: string;
}) {
  const [ishod, posalji, radi] = useActionState<IshodNaloga, FormData>(
    async (prethodno, fd) => {
      const r = await sacuvajNalog(prethodno, fd);
      if (!r.greska) naKraju?.();
      return r;
    },
    {},
  );

  const [vrsta, setVrsta] = useState<string>(nalog?.vrsta === "webhook" ? "webhook" : "imap");
  const [host, setHost] = useState(nalog?.host ?? "");
  const [port, setPort] = useState(nalog?.port ?? 993);
  const [smtpHost, setSmtpHost] = useState(nalog?.smtp_host ?? "");
  const [smtpPort, setSmtpPort] = useState(nalog?.smtp_port ?? 587);
  const [poslane, setPoslane] = useState(nalog?.fascikla_poslane ?? "");

  const [test, setTest] = useState<IshodTesta | null>(null);
  const [testira, pokreniTest] = useTransition();

  function primijeniPredlozak(kljuc: string) {
    const p = PREDLOSCI[kljuc];
    if (!p) return;
    setHost(p.host);
    setPort(p.port);
    setSmtpHost(p.smtp);
    setPoslane(p.poslane);
  }

  function testiraj(e: React.MouseEvent<HTMLButtonElement>) {
    const fd = new FormData(e.currentTarget.form!);
    pokreniTest(async () => setTest(await testirajNalog(fd)));
  }

  const webhookUrl = nalog?.webhook_token ? `${webBaza}/api/prijem/${nalog.webhook_token}` : null;

  return (
    <form action={posalji} className="space-y-4">
      {nalog && <input type="hidden" name="id" value={nalog.id} />}

      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1">
          <span className="tiho text-xs">Naziv</span>
          <input name="naziv" required defaultValue={nalog?.naziv} placeholder="npr. Startiti Gmail" className={POLJE} />
        </label>

        <label className="space-y-1">
          <span className="tiho text-xs">Prostor</span>
          <select name="workspace_id" required defaultValue={nalog?.workspace_id ?? prostori[0]?.id} className={POLJE}>
            {prostori.map((p) => (
              <option key={p.id} value={p.id}>{p.naziv}</option>
            ))}
          </select>
        </label>

        <label className="space-y-1 md:col-span-2">
          <span className="tiho text-xs">Vrsta</span>
          <select
            name="vrsta"
            value={vrsta}
            onChange={(e) => setVrsta(e.target.value)}
            className={POLJE}
          >
            <option value="imap">IMAP (ručno podešavanje)</option>
            <option value="gmail">Gmail (predložak)</option>
            <option value="webhook">Webhook / forwarding (brzi prijem)</option>
          </select>
        </label>
      </div>

      {vrsta === "webhook" ? (
        <div className="ploca p-3 text-xs">
          {webhookUrl ? (
            <>
              <p className="tiho">Adresa za prijem (POST JSON: od, tema, tijelo):</p>
              <code className="mt-1 block break-all">{webhookUrl}</code>
            </>
          ) : (
            <p className="tiho">Adresa za prijem se pravi kad sačuvaš nalog.</p>
          )}
        </div>
      ) : (
        <>
          {vrsta === "gmail" && (
            <div className="flex gap-2">
              <button type="button" onClick={() => primijeniPredlozak("gmail")} className="polje text-xs">
                Popuni za Gmail
              </button>
            </div>
          )}

          <label className="space-y-1 md:col-span-2">
            <span className="tiho text-xs">Šifrovanje (IMAP)</span>
            <select name="tls_nacin" defaultValue={nalog?.tls_nacin ?? "ssl"} className={POLJE}>
              <option value="ssl">SSL/TLS (obično port 993)</option>
              <option value="starttls">STARTTLS (obično port 143)</option>
              <option value="nista">Bez šifrovanja (ne preporučuje se)</option>
            </select>
          </label>

          <div className="grid gap-3 md:grid-cols-[2fr_1fr]">
            <label className="space-y-1">
              <span className="tiho text-xs">IMAP server (prijem)</span>
              <input name="host" value={host} onChange={(e) => setHost(e.target.value)} className={POLJE} />
            </label>
            <label className="space-y-1">
              <span className="tiho text-xs">Port</span>
              <input name="port" type="number" value={port} onChange={(e) => setPort(Number(e.target.value))} className={POLJE} />
            </label>
            <label className="space-y-1">
              <span className="tiho text-xs">SMTP server (slanje, opcionalno)</span>
              <input name="smtp_host" value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} className={POLJE} />
            </label>
            <label className="space-y-1">
              <span className="tiho text-xs">SMTP port</span>
              <input name="smtp_port" type="number" value={smtpPort} onChange={(e) => setSmtpPort(Number(e.target.value))} className={POLJE} />
            </label>
            <label className="space-y-1 md:col-span-2">
              <span className="tiho text-xs">Fascikla poslanih</span>
              <input name="fascikla_poslane" value={poslane} onChange={(e) => setPoslane(e.target.value)} className={POLJE} />
            </label>
          </div>
        </>
      )}

      {vrsta !== "webhook" && (
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1">
            <span className="tiho text-xs">Korisničko ime / email</span>
            <input name="korisnik" required defaultValue={nalog?.korisnik ?? ""} className={POLJE} />
          </label>
          <label className="space-y-1">
            <span className="tiho text-xs">Lozinka {nalog && "(prazno ostavlja staru)"}</span>
            <input name="lozinka" type="password" autoComplete="new-password" className={POLJE} />
          </label>
        </div>
      )}

      <input type="hidden" name="aktivan" value={nalog?.aktivan === false ? "" : "on"} />

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button type="submit" disabled={radi} className="dugme">
          {radi ? "Spašavam…" : "Sačuvaj nalog"}
        </button>
        <button type="button" onClick={testiraj} disabled={testira} className="polje text-xs">
          {testira ? "Testiram…" : "Testiraj konekciju"}
        </button>
        {test && (
          <span className={`text-xs ${test.ok ? "text-emerald-400" : "text-red-400"}`}>
            {test.ok ? "● Povezano" : "● Greška"}: {test.poruka}
          </span>
        )}
        {ishod.greska && <span className="text-xs text-red-400">{ishod.greska}</span>}
        {ishod.poruka && <span className="tiho text-xs">{ishod.poruka}</span>}
      </div>
    </form>
  );
}
