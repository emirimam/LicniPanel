import { ucitajProstore } from "@/lib/prostor";
import { odjava } from "@/app/akcije";
import PrebacivacProstora from "@/components/PrebacivacProstora";
import Sidebar from "@/components/Sidebar";

export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { prostori, aktivni, sve } = await ucitajProstore();

  return (
    <div className="min-h-screen md:flex">
      <Sidebar
        footer={
          <form action={odjava}>
            <button className="tiho w-full rounded-md px-3 py-2 text-left text-sm hover:bg-white/[0.04] hover:text-[var(--tekst)]">
              Odjava
            </button>
          </form>
        }
      />

      <div className="min-w-0 flex-1">
        <header
          className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b pl-16 pr-4 backdrop-blur md:pl-8 md:pr-8"
          style={{ borderColor: "var(--ivica)", background: "rgba(9,9,11,0.8)" }}
        >
          <div className="ml-auto">
            <PrebacivacProstora prostori={prostori} aktivni={aktivni} sve={sve} />
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
