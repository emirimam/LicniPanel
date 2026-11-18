import nodemailer from "nodemailer";
import type { SupabaseClient } from "@supabase/supabase-js";

export type SmtpTls = "ssl" | "starttls" | "nista";

export type SmtpPostavke = {
  host: string;
  port: number;
  tls: SmtpTls;
  korisnik: string;
  lozinka: string;
  od: string;
};

export function smtpTransport(p: SmtpPostavke) {
  return nodemailer.createTransport({
    host: p.host,
    port: p.port,
    secure: p.tls === "ssl",
    requireTLS: p.tls === "starttls",
    ignoreTLS: p.tls === "nista",
    auth: p.korisnik ? { user: p.korisnik, pass: p.lozinka } : undefined,
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
  });
}

/**
 * SMTP postavke naloga iz baze. Ako nalog nema svoje SMTP korisnicko ime ili lozinku,
 * koristi IMAP (stariji nalozi). Vraca null ako SMTP server nije podesen.
 */
export async function ucitajSmtp(
  supabase: SupabaseClient,
  nalogId: string,
): Promise<SmtpPostavke | null> {
  const { data: n } = await supabase
    .from("accounts")
    .select("id, korisnik, smtp_host, smtp_port, smtp_korisnik, smtp_od, smtp_tls")
    .eq("id", nalogId)
    .maybeSingle();
  if (!n?.smtp_host) return null;

  const { data: smtpLozinka } = await supabase.rpc("smtp_lozinka_vlasnika", {
    p_account_id: n.id,
  });
  let lozinka: string | null = smtpLozinka ?? null;
  if (!lozinka) {
    const { data: imapLozinka } = await supabase.rpc("lozinka_naloga_vlasnika", {
      p_account_id: n.id,
    });
    lozinka = imapLozinka ?? null;
  }

  const korisnik = n.smtp_korisnik || n.korisnik || "";
  return {
    host: n.smtp_host,
    port: n.smtp_port ?? 587,
    tls: (n.smtp_tls ?? "starttls") as SmtpTls,
    korisnik,
    lozinka: lozinka ?? "",
    od: n.smtp_od || korisnik,
  };
}
