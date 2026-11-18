const ENTITETI: Record<string, string> = {
  nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'",
  scaron: "š", Scaron: "Š", ccaron: "č", Ccaron: "Č", cacute: "ć", Cacute: "Ć",
  zcaron: "ž", Zcaron: "Ž", dstrok: "đ", Dstrok: "Đ",
};

/** HTML tijelo maila u citljiv tekst: zadrzava pasuse i redove, cisti oznake i entitete. */
export function htmlUTekst(ulaz: string): string {
  if (!/<\/?[a-z][\s\S]*>/i.test(ulaz)) return ulaz.trim();

  return ulaz
    .replace(/<(head|style|script)[\s\S]*?<\/\1>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h[1-6]|table|blockquote)>/gi, "\n")
    .replace(/<\/(td|th)>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITETI[n] ?? m)
    .replace(/[ \t ]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
