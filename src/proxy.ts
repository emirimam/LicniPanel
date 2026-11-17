import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const JAVNE = ["/prijava", "/auth"];

export async function proxy(zahtjev: NextRequest) {
  let odgovor = NextResponse.next({ request: zahtjev });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return zahtjev.cookies.getAll();
        },
        setAll(lista) {
          lista.forEach(({ name, value }) => zahtjev.cookies.set(name, value));
          odgovor = NextResponse.next({ request: zahtjev });
          lista.forEach(({ name, value, options }) =>
            odgovor.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Osvjezava token i puni zahtjev.cookies - ne brisati.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const putanja = zahtjev.nextUrl.pathname;
  const javna = JAVNE.some((p) => putanja.startsWith(p));

  if (!user && !javna) {
    const cilj = zahtjev.nextUrl.clone();
    cilj.pathname = "/prijava";
    return NextResponse.redirect(cilj);
  }

  return odgovor;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
