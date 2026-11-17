"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { server } from "@/lib/supabase/server";

export type IshodNaloga = { greska?: string; poruka?: string };

export async function sacuvajNalog(
  _prethodno: IshodNaloga,
  formData: FormData,
): Promise<IshodNaloga> {
  const supabase = await server();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/prijava");

  const id = String(formData.get("id") ?? "").trim();
  const lozinka = String(formData.get("lozinka") ?? "");

  const polja = {
    naziv: String(formData.get("naziv") ?? "").trim(),
    workspace_id: String(formData.get("workspace_id") ?? ""),
    host: String(formData.get("host") ?? "").trim(),
    port: Number(formData.get("port") ?? 993),
    korisnik: String(formData.get("korisnik") ?? "").trim(),
    email: String(formData.get("korisnik") ?? "").trim(),
    fascikla_poslane: String(formData.get("fascikla_poslane") ?? "").trim() || null,
    aktivan: formData.get("aktivan") === "on",
  };

  if (!polja.naziv || !polja.host || !polja.korisnik || !polja.workspace_id) {
    return { greska: "Naziv, prostor, server i korisničko ime su obavezni." };
  }

  let accountId = id;

  if (id) {
    const { error } = await supabase
      .from("accounts")
      .update(polja)
      .eq("id", id);
    if (error) return { greska: error.message };
  } else {
    if (!lozinka) return { greska: "Za novi nalog treba i lozinka." };

    const { data, error } = await supabase
      .from("accounts")
      .insert({ ...polja, user_id: user.id, vrsta: "imap", stanje: {} })
      .select("id")
      .single();
    if (error) return { greska: error.message };
    accountId = data.id;
  }

  if (lozinka) {
    const { error } = await supabase.rpc("sacuvaj_lozinku", {
      p_account_id: accountId,
      p_lozinka: lozinka,
    });
    if (error) return { greska: `Nalog je spašen, ali lozinka nije: ${error.message}` };
  }

  revalidatePath("/nalozi");
  return { poruka: id ? "Izmjene su spašene." : "Nalog je dodan." };
}

export async function obrisiNalog(id: string) {
  const supabase = await server();
  await supabase.from("accounts").delete().eq("id", id);
  revalidatePath("/nalozi");
}

export async function prebaciAktivan(id: string, aktivan: boolean) {
  const supabase = await server();
  await supabase.from("accounts").update({ aktivan }).eq("id", id);
  revalidatePath("/nalozi");
}
