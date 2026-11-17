-- Mailovi koje je AI odbacio kao reklamu ili newsletter cuvaju se u prijedlozima sa statusom filtrirano.
alter type suggestion_status add value if not exists 'filtrirano';
