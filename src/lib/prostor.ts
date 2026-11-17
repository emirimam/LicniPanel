import { cookies } from "next/headers";
import { server } from "@/lib/supabase/server";
import type { Prostor } from "@/lib/tipovi";

import { KOLACIC_PROSTORA, SVE } from "@/lib/prostor-konst";

export { KOLACIC_PROSTORA, SVE };

export type StanjeProstora = {
  prostori: Prostor[];
  /** null kad je izabrano "Sve zajedno". */
  aktivni: Prostor | null;
  sve: boolean;
  /** workspace_id-evi koje trenutni prikaz obuhvata. */
  ids: string[];
};

/** Svi prostori korisnika i prikaz koji je izabran (jedan ili svi). */
export async function ucitajProstore(): Promise<StanjeProstora> {
  const supabase = await server();
  const { data } = await supabase
    .from("workspaces")
    .select("id, naziv, slug, boja, potpis, ton")
    .order("naziv");

  const prostori = (data ?? []) as Prostor[];
  const izabrani = (await cookies()).get(KOLACIC_PROSTORA)?.value;
  const sve = izabrani === SVE;

  const aktivni = sve
    ? null
    : (prostori.find((p) => p.slug === izabrani) ?? prostori[0] ?? null);

  const ids = sve ? prostori.map((p) => p.id) : aktivni ? [aktivni.id] : [];
  return { prostori, aktivni, sve, ids };
}
