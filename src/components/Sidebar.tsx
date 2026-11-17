"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

const NAV = [
  { href: "/danas", naziv: "Danas / Pregled", ikona: "danas" },
  { href: "/tabla", naziv: "Tabla (Kanban)", ikona: "tabla" },
  { href: "/prijedlozi", naziv: "Prijedlozi (AI inbox)", ikona: "inbox" },
  { href: "/cekam", naziv: "Čekam odgovor", ikona: "cekam" },
  { href: "/planer", naziv: "Planer", ikona: "planer" },
  { href: "/nalozi", naziv: "Nalozi i AI podešavanja", ikona: "postavke" },
] as const;

const PUTANJE: Record<(typeof NAV)[number]["ikona"], ReactNode> = {
  danas: <path d="M3 12h4l2-6 4 12 2-6h6" />,
  tabla: (
    <>
      <rect x="3" y="4" width="5" height="16" rx="1" />
      <rect x="10" y="4" width="5" height="10" rx="1" />
      <rect x="17" y="4" width="4" height="7" rx="1" />
    </>
  ),
  inbox: <path d="M4 13l2-8h12l2 8v5H4zM4 13h4l1 2h6l1-2h4" />,
  cekam: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l3 2" />
    </>
  ),
  planer: (
    <>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M4 10h16M9 3v4M15 3v4" />
    </>
  ),
  postavke: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2" />
    </>
  ),
};

function Ikona({ naziv }: { naziv: (typeof NAV)[number]["ikona"] }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PUTANJE[naziv]}
    </svg>
  );
}

/** Lijevi meni. Na telefonu se skuplja u klizni panel. */
export default function Sidebar({ footer }: { footer: ReactNode }) {
  const putanja = usePathname();
  const [otvoren, setOtvoren] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOtvoren(true)}
        aria-label="Otvori meni"
        className="tiho fixed left-3 top-3 z-30 flex h-9 w-9 items-center justify-center rounded-md border md:hidden"
        style={{ borderColor: "var(--ivica)", background: "var(--ploca)" }}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>

      {otvoren && (
        <div
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
          onClick={() => setOtvoren(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r transition-transform duration-200 md:sticky md:top-0 md:h-screen md:translate-x-0 ${
          otvoren ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ borderColor: "var(--ivica)", background: "var(--pozadina)" }}
      >
        <div className="flex h-14 items-center justify-between px-4">
          <span className="text-sm font-semibold tracking-tight">Lični panel</span>
          <button
            type="button"
            onClick={() => setOtvoren(false)}
            aria-label="Zatvori meni"
            className="tiho text-sm md:hidden"
          >
            ✕
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 px-2 py-2" onClick={() => setOtvoren(false)}>
          {NAV.map((n) => {
            const aktivna = putanja === n.href || putanja.startsWith(`${n.href}/`);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition ${
                  aktivna
                    ? "bg-white/[0.07] text-white"
                    : "tiho hover:bg-white/[0.04] hover:text-[var(--tekst)]"
                }`}
              >
                <Ikona naziv={n.ikona} />
                {n.naziv}
              </Link>
            );
          })}
        </nav>

        <div className="border-t p-2" style={{ borderColor: "var(--ivica)" }}>
          {footer}
        </div>
      </aside>
    </>
  );
}
