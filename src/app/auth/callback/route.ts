import { NextResponse, type NextRequest } from "next/server";
import { server } from "@/lib/supabase/server";

export async function GET(zahtjev: NextRequest) {
  const { searchParams, origin } = new URL(zahtjev.url);
  const code = searchParams.get("code");
  const dalje = searchParams.get("next") ?? "/tabla";

  if (code) {
    const supabase = await server();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${dalje}`);
  }

  return NextResponse.redirect(`${origin}/prijava?greska=1`);
}
