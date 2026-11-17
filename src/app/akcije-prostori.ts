"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { server } from "@/lib/supabase/server";

/** URL-prijateljski slug iz naziva, s kratkim nastavkom da ne bude sudara. */
function slugiraj(naziv: string): string {
  const osnova = naziv
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${osnova || "prostor"}-${Math.random().toString(36).slice(2, 6)}`;
}

function ocisti(formData: FormData) {
  const naziv = String(formData.get("naziv") ?? "").trim();
  const boja = String(formData.get("boja") ?? "").trim();
  const potpis = String(formData.get("potpis") ?? "").trim();
  const ton = String(formData.get("ton") ?? "").trim();
  return {
    naziv,
    boja: /^#[0-9a-fA-F]{6}$/.test(boja) ? boja : "#3b82f6",
    potpis: potpis || null,
    ton: ton || null,
  };
}

export async function novoProstor(formData: FormData) {
  const { naziv, boja, potpis, ton } = ocisti(formData);
  if (!naziv) return;

  const supabase = await server();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/prijava");

  await supabase.from("workspaces").insert({
    user_id: user.id,
    naziv,
    slug: slugiraj(naziv),
    boja,
    potpis,
    ton,
  });

  revalidatePath("/", "layout");
}

export async function urediProstor(id: string, formData: FormData) {
  const { naziv, boja, potpis, ton } = ocisti(formData);
  if (!naziv) return;

  const supabase = await server();
  await supabase
    .from("workspaces")
    .update({ naziv, boja, potpis, ton })
    .eq("id", id);

  revalidatePath("/", "layout");
}
