import { cookies } from "next/headers";
import { server } from "@/lib/supabase/server";
import type { Prostor } from "@/lib/tipovi";

export const KOLACIC_PROSTORA = "prostor";

/** Svi prostori korisnika i onaj koji je trenutno izabran. */
export async function ucitajProstore(): Promise<{
  prostori: Prostor[];
  aktivni: Prostor | null;
}> {
  const supabase = await server();
  const { data } = await supabase
    .from("workspaces")
    .select("id, naziv, slug, boja")
    .order("naziv");

  const prostori = (data ?? []) as Prostor[];
  const izabrani = (await cookies()).get(KOLACIC_PROSTORA)?.value;

  const aktivni =
    prostori.find((p) => p.slug === izabrani) ?? prostori[0] ?? null;

  return { prostori, aktivni };
}
