"use client";

import { useRef } from "react";
import { dodajZadatak } from "@/app/akcije";

export default function BrziUnos() {
  const forma = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={forma}
      action={async (fd) => {
        await dodajZadatak(fd);
        forma.current?.reset();
      }}
      className="flex gap-2"
    >
      <input
        name="unos"
        autoComplete="off"
        placeholder="pozvati Adama sutra u 10 #itdvoip !1"
        className="flex-1 rounded-md border px-3 py-2 text-sm bg-transparent"
        style={{ borderColor: "var(--ivica)" }}
      />
      <button
        type="submit"
        className="rounded-md bg-blue-600 text-white px-4 py-2 text-sm font-medium"
      >
        Dodaj
      </button>
    </form>
  );
}
