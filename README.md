# Lični panel

Panel za komunikaciju i organizaciju vremena. Pošta, kalendar i repozitoriji ulaze sami,
pretvaraju se u zadatke i statuse projekata, a ručni unos svodi se na potvrdu.

Dva odvojena prostora: **Posao** i **Privatno**. Podaci se ne miješaju — razdvojeni su
u bazi kroz `workspace_id`, a ne samo u prikazu.

## Stanje

Prva faza: baza, prijava, kanban, brzi unos, ekran prijedloga i ekran čekanja na odgovor.
Mail worker i AI sloj dolaze u sljedećem koraku.

| Dio | Stanje |
| --- | --- |
| Šema baze + RLS | gotovo |
| Prijava (magic link) | gotovo |
| Kanban po projektima | gotovo |
| Brzi unos jednom linijom | gotovo |
| Inbox prijedloga | ekran gotov, čeka izvor |
| Čekam odgovor | ekran gotov, čeka izvor |
| Mail worker (IMAP / EWS) | nije početo |
| AI klasifikacija | nije početo |
| Kalendar i webhookovi | nije početo |

## Pokretanje

```bash
npm install
cp .env.example .env.local   # popuni vrijednosti
npm run dev
```

Otvori `http://localhost:3000`, upiši svoju adresu i prijavi se linkom iz pošte.
Prostori **Posao** i **Privatno** prave se sami pri prvoj prijavi.

## Baza

Supabase projekat: `licni-panel` (regija `eu-central-1`).
Migracije su u `supabase/migrations/` i već su primijenjene na projekat.

Trinaest tabela, sve pod RLS-om s politikom `user_id = auth.uid()`:

`workspaces`, `accounts`, `projects`, `contacts`, `threads`, `messages`, `tasks`,
`suggestions`, `rules`, `drafts`, `events`, `repo_events`, `activity`

## Brzi unos

Jedna linija teksta, bez formulara:

```
pozvati Adama sutra u 10 #itdvoip !1
dostaviti izvještaj 20.12.
provjeriti modeme u ponedjeljak
```

Prepoznaje se: `danas` / `sutra` / `prekosutra`, dan u sedmici, `za N dana`,
datum oblika `20.12.`, vrijeme (`u 10`, `10:30`), `#projekat`, `@kontakt` i
prioritet `!1` do `!5`.

Logika stoji u `src/lib/parsiraj.ts` i nema vanjskih zavisnosti.

## Struktura

```
src/
  app/
    (panel)/          ekrani iza prijave: tabla, prijedlozi, cekam
    prijava/          magic link
    auth/callback/    razmjena koda za sesiju
    akcije.ts         server akcije (dodavanje, pomjeranje, potvrda prijedloga)
  components/         Kanban, BrziUnos, PrebacivacProstora
  lib/
    supabase/         klijent za browser i za server
    parsiraj.ts       rastavljanje brzog unosa
    prostor.ts        trenutni prostor iz kolačića
    tipovi.ts
supabase/migrations/  SQL migracije
```

## Napomena o tajnama

Repozitorij je javan. `.env.local` je u `.gitignore` i nikad ne smije u commit.
Servisni ključ Supabase i API ključ modela idu u okruženje, ne u kod.
