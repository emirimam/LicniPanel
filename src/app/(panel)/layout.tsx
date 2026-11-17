import Link from "next/link";
import { ucitajProstore } from "@/lib/prostor";
import { odjava } from "@/app/akcije";
import PrebacivacProstora from "@/components/PrebacivacProstora";

const VEZE = [
  { href: "/tabla", naziv: "Tabla" },
  { href: "/prijedlozi", naziv: "Prijedlozi" },
  { href: "/cekam", naziv: "Čekam odgovor" },
] as const;

export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { prostori, aktivni } = await ucitajProstore();

  return (
    <div className="min-h-screen">
      <header
        className="border-b"
        style={{ borderColor: "var(--ivica)", background: "var(--ploca)" }}
      >
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center gap-6">
          <span className="font-semibold text-sm">Lični panel</span>

          <nav className="flex gap-4 text-sm">
            {VEZE.map((v) => (
              <Link key={v.href} href={v.href} className="tiho hover:opacity-70">
                {v.naziv}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-4">
            <PrebacivacProstora prostori={prostori} aktivni={aktivni} />
            <form action={odjava}>
              <button className="tiho text-sm hover:opacity-70">Odjava</button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
