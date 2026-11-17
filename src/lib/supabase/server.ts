import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** Supabase klijent za server komponente i server akcije. */
export async function server() {
  const kolacici = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return kolacici.getAll();
        },
        setAll(lista) {
          try {
            lista.forEach(({ name, value, options }) =>
              kolacici.set(name, value, options),
            );
          } catch {
            // Server komponenta ne smije pisati kolacice; middleware to radi umjesto nje.
          }
        },
      },
    },
  );
}
