-- Potpis firme, koristi se u nacrtima odgovora. Prostori se uredjuju u panelu
-- (Nalozi i AI podesavanja): naziv, boja i potpis.
alter table workspaces add column if not exists potpis text;
