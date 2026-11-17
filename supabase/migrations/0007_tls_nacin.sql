-- Nacin sifrovanja IMAP veze: ssl (993 direktno), starttls (upgrade na 143), nista (bez sifrovanja).
alter table accounts add column if not exists tls_nacin text not null default 'ssl'
  check (tls_nacin in ('ssl', 'starttls', 'nista'));
