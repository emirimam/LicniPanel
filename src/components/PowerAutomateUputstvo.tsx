import KopirajLink from "@/components/KopirajLink";

type Webhook = { naziv: string; webhook_token: string };

/** Uputstvo za Power Automate sa punom adresom svakog webhook naloga. */
export default function PowerAutomateUputstvo({
  baza,
  webhookNalozi,
}: {
  baza: string;
  webhookNalozi: Webhook[];
}) {
  const korak = "ploca p-4 space-y-2 text-sm";

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold">Power Automate: prosljeđivanje pošte</h2>
        <p className="tiho mt-1 text-xs">
          Flow šalje svaki dolazni mail na adresu iz panela, bez admin odobrenja.
        </p>
      </div>

      {webhookNalozi.length === 0 ? (
        <div className="ploca p-4 text-sm">
          <p>Prvo napravi webhook nalog: <span className="tiho">Vrsta → Webhook / forwarding</span>, pa sačuvaj.</p>
        </div>
      ) : (
        <div className="ploca divide-y" style={{ borderColor: "var(--ivica)" }}>
          {webhookNalozi.map((w) => (
            <div key={w.webhook_token} className="space-y-2 p-4">
              <p className="text-sm font-medium">{w.naziv}</p>
              <p className="tiho text-xs">Puna adresa za polje URI u HTTP koraku:</p>
              <KopirajLink tekst={`${baza}/api/prijem/${w.webhook_token}`} />
            </div>
          ))}
        </div>
      )}

      <ol className="space-y-3">
        <li className={korak}>
          <p className="font-medium">1. Otvori Power Automate</p>
          <p className="tiho text-xs">make.powerautomate.com, prijavi se EP BiH nalogom.</p>
        </li>
        <li className={korak}>
          <p className="font-medium">2. Napravi flow</p>
          <p className="tiho text-xs">
            Create → Automated cloud flow. Okidač: <b>When a new email arrives (V3)</b>, veza na Office 365 Outlook, folder Inbox.
          </p>
        </li>
        <li className={korak}>
          <p className="font-medium">3. Dodaj Compose</p>
          <p className="tiho text-xs">U polje Inputs (Expression) zalijepi:</p>
          <KopirajLink tekst={"addProperty(addProperty(addProperty(json('{}'), 'od', triggerOutputs()?['body/from']), 'tema', triggerOutputs()?['body/subject']), 'tijelo', triggerOutputs()?['body/body'])"} />
        </li>
        <li className={korak}>
          <p className="font-medium">4. Dodaj HTTP</p>
          <p className="tiho text-xs">Method: POST. URI: adresa iz gornjeg polja. Header: Content-Type = application/json. Body: Outputs iz koraka Compose.</p>
        </li>
        <li className={korak}>
          <p className="font-medium">5. Sačuvaj i testiraj</p>
          <p className="tiho text-xs">Pošalji sebi test mail. Pojavit će se na Prijedlozima.</p>
        </li>
      </ol>

      <p className="tiho text-xs">
        HTTP je premium konektor u Power Automate. Ako ga nemaš u licenci, flow neće moći da se sačuva.
      </p>
    </section>
  );
}
