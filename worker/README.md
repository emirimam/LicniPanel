# Mail worker

Čita poštu preko IMAP-a, klasifikuje je modelom i puni bazu ličnog panela.
Radi odvojeno od web aplikacije, na mašini koju ti kontrolišeš.

Lozinke mailboxa stoje samo ovdje, u `.env` fajlu. Ni panel ni baza ih ne vide.

## Šta radi

Za svaki nalog, pri svakom prolazu:

1. Otvori `INBOX` i povuče poruke novije od zadnjeg obrađenog UID-a.
2. Svaku upiše u `messages` i pripoji prepisci u `threads`.
3. Pošalje je modelu koji vraća tip, naslov zadatka, rok, prioritet i sigurnost.
4. Zadatak ide u `suggestions` i čeka tvoju potvrdu u panelu — osim ako postoji
   pravilo u `rules` koje kaže da taj pošiljalac ide pravo u zadatke.
5. Pročita fasciklu poslanih i, za poruke koje traže odgovor, postavi rok
   čekanja na prepisku. Kad odgovor stigne, zastavica se sama skida.

Dolazak nove poruke ne pravi duplikat: provjera ide po `Message-ID`, pa ista
poruka na dva naloga ostaje jedan zadatak.

## Pokretanje

```bash
cd worker
npm install
cp .env.example .env     # popuni
npm run jednom           # jedan prolaz, da vidiš šta uhvati
npm start                # stalni rad
```

`npm run jednom` je bezopasan — pri prvom pokretanju uzima samo zadnjih
`PRVI_PUT_ZADNJIH` poruka (podrazumijevano 30), ne cijelu istoriju.

### Docker

```bash
docker compose up -d --build
docker compose logs -f
```

### Kao servis na Linuxu

```ini
# /etc/systemd/system/licni-panel-worker.service
[Unit]
Description=Licni panel mail worker
After=network-online.target

[Service]
WorkingDirectory=/opt/licnipanel/worker
ExecStart=/usr/bin/node src/index.js
Restart=always
RestartSec=30
User=emir

[Install]
WantedBy=multi-user.target
```

## Šta ti treba u .env

| Vrijednost | Gdje se nalazi |
| --- | --- |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API keys → `service_role` |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API keys |
| `NALOG_1_LOZINKA` za Gmail | Google nalog → Security → 2-Step Verification → App passwords |

Servisni ključ zaobilazi RLS i vrijedi kao ključ od cijele baze. Stoji samo
ovdje, nikad u panelu ni u browseru.

## Gmail

Obična lozinka ne radi — treba app password, a za njega mora biti uključena
dvostepena provjera. Fascikla poslanih na Gmailu se zove `[Gmail]/Sent Mail`,
osim ako ti je sučelje na bosanskom, pa provjeri tačan naziv.

## Troškovi

Pri trideset poruka dnevno to je oko 900 poziva modelu mjesečno. S
`claude-haiku-5-5` za klasifikaciju račun ostaje u rangu nekoliko eura.
Model se mijenja kroz `MODEL` u `.env`.
