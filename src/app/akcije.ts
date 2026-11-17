"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { server } from "@/lib/supabase/server";
import { KOLACIC_PROSTORA } from "@/lib/prostor";
import { razloziUnos } from "@/lib/parsiraj";
import type { Faza } from "@/lib/tipovi";

export async function postaviProstor(slug: string) {
  (await cookies()).set(KOLACIC_PROSTORA, slug, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/", "layout");
}

export async function pomjeriZadatak(id: string, faza: Faza) {
  const supabase = await server();
  await supabase
    .from("tasks")
    .update({
      faza,
      zavrseno_u: faza === "zavrseno" ? new Date().toISOString() : null,
    })
    .eq("id", id);
  revalidatePath("/", "layout");
}

export async function dodajZadatak(formData: FormData) {
  const unos = String(formData.get("unos") ?? "").trim();
  if (!unos) return;

  const supabase = await server();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/prijava");

  // U prikazu "Sve zajedno" prostor se bira u formi; inace je izabrani iz kolacica.
  const izbor =
    String(formData.get("prostor") ?? "") ||
    (await cookies()).get(KOLACIC_PROSTORA)?.value;
  const { data: prostori } = await supabase
    .from("workspaces")
    .select("id, slug")
    .order("naziv");
  const prostor = prostori?.find((p) => p.slug === izbor) ?? prostori?.[0];
  if (!prostor) return;

  const r = razloziUnos(unos);

  // Projekat po imenu, ako takav postoji u ovom prostoru.
  let projectId: string | null = null;
  if (r.projekat) {
    const { data: p } = await supabase
      .from("projects")
      .select("id")
      .eq("workspace_id", prostor.id)
      .ilike("naziv", `%${r.projekat}%`)
      .limit(1)
      .maybeSingle();
    projectId = p?.id ?? null;
  }

  await supabase.from("tasks").insert({
    user_id: user.id,
    workspace_id: prostor.id,
    naslov: r.naslov || unos,
    vrijeme: r.vrijeme,
    rok: r.rok,
    prioritet: r.prioritet,
    project_id: projectId,
    faza: "novo",
  });

  revalidatePath("/", "layout");
}

export async function rijesiPrijedlog(id: string, prihvacen: boolean) {
  const supabase = await server();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/prijava");

  const { data: prijedlog } = await supabase
    .from("suggestions")
    .select("id, tip, sadrzaj, workspace_id, source_message_id")
    .eq("id", id)
    .single();

  if (prijedlog && prihvacen && prijedlog.tip === "zadatak") {
    const s = prijedlog.sadrzaj as Record<string, unknown>;
    await supabase.from("tasks").insert({
      user_id: user.id,
      workspace_id: prijedlog.workspace_id,
      naslov: String(s.naslov ?? "Bez naslova"),
      opis: s.opis ? String(s.opis) : null,
      rok: s.rok ? String(s.rok) : null,
      prioritet: typeof s.prioritet === "number" ? s.prioritet : 3,
      source_message_id: prijedlog.source_message_id,
      faza: "novo",
    });
  }

  await supabase
    .from("suggestions")
    .update({
      status: prihvacen ? "prihvacen" : "odbacen",
      rijeseno_u: new Date().toISOString(),
    })
    .eq("id", id);

  revalidatePath("/", "layout");
}

export async function odjava() {
  const supabase = await server();
  await supabase.auth.signOut();
  redirect("/prijava");
}
