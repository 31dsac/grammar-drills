/**
 * Hand-checked sentence bank for the connector drill.
 *
 * Clause B is stored in parts so every word order can be generated from the same tiles.
 * Constraints (enforced by tests):
 *  - no separable finite verbs in clause B (the tile set would change in verb-final order)
 *  - `rest` or `nonfinite` is non-empty, so "verb to the end" differs from "no change"
 *  - no pronoun objects in `rest` for adverbkonnektor / nämlich items, since the
 *    "after the verb" order would put the connector in front of the pronoun
 */
export interface Sentence {
  connector: string;
  /** Clause A, without final punctuation. */
  a: string;
  subject: string;
  /** Finite verb. */
  verb: string;
  /** Mittelfeld words, space-separated. May be empty. */
  rest: string;
  /** Participle or infinitive that closes the clause. */
  nonfinite?: string;
}

const s = (connector: string, a: string, subject: string, verb: string, rest: string, nonfinite?: string): Sentence => ({
  connector,
  a,
  subject,
  verb,
  rest,
  ...(nonfinite !== undefined ? { nonfinite } : {}),
});

export const SENTENCES: readonly Sentence[] = [
  // Konjunktor
  s('und', 'Ich koche', 'mein Bruder', 'deckt', 'den Tisch'),
  s('und', 'Anna liest ein Buch', 'Tom', 'hört', 'Musik'),
  s('oder', 'Wir können ins Kino gehen', 'wir', 'bleiben', 'zu Hause'),
  s('oder', 'Du kannst den Bus nehmen', 'du', 'fährst', 'mit dem Rad'),
  s('aber', 'Die Wohnung ist klein', 'sie', 'hat', 'einen Balkon'),
  s('aber', 'Ich bin müde', 'ich', 'muss', 'noch', 'arbeiten'),
  s('denn', 'Ich komme nicht mit', 'ich', 'bin', 'krank'),
  s('denn', 'Wir bleiben zu Hause', 'es', 'regnet', 'stark'),
  s('sondern', 'Er fährt nicht mit dem Auto', 'er', 'geht', 'zu Fuß'),
  s('sondern', 'Sie wohnt nicht mehr in Berlin', 'sie', 'lebt', 'jetzt in Hamburg'),

  // Adverbkonnektor
  s('deshalb', 'Ich bin krank', 'ich', 'bleibe', 'heute zu Hause'),
  s('deshalb', 'Der Zug hatte Verspätung', 'wir', 'kamen', 'zu spät'),
  s('deswegen', 'Es regnet', 'wir', 'nehmen', 'den Bus'),
  s('deswegen', 'Sie hat viel gelernt', 'sie', 'hat', 'die Prüfung', 'bestanden'),
  s('darum', 'Mein Handy ist kaputt', 'ich', 'brauche', 'ein neues'),
  s('darum', 'Er spricht gut Deutsch', 'er', 'findet', 'schnell Arbeit'),
  s('also', 'Der Laden ist geschlossen', 'wir', 'müssen', 'morgen', 'wiederkommen'),
  s('also', 'Es ist schon spät', 'ich', 'gehe', 'jetzt nach Hause'),
  s('trotzdem', 'Es regnet', 'wir', 'gehen', 'spazieren'),
  s('trotzdem', 'Ich war sehr müde', 'ich', 'habe', 'den Film', 'gesehen'),
  s('dennoch', 'Die Aufgabe war schwer', 'er', 'hat', 'die Lösung', 'gefunden'),
  s('dennoch', 'Das Hotel war teuer', 'wir', 'waren', 'zufrieden'),
  s('dann', 'Wir essen zuerst', 'wir', 'gehen', 'ins Kino'),
  s('dann', 'Mach zuerst deine Hausaufgaben', 'du', 'darfst', '', 'fernsehen'),
  s('danach', 'Ich dusche', 'ich', 'frühstücke', 'in Ruhe'),
  s('danach', 'Wir haben lange gearbeitet', 'wir', 'sind', 'essen', 'gegangen'),
  s('außerdem', 'Die Wohnung ist hell', 'sie', 'liegt', 'sehr zentral'),
  s('außerdem', 'Er spricht Englisch', 'er', 'lernt', 'gerade Spanisch'),
  s('sonst', 'Beeil dich', 'wir', 'verpassen', 'den Zug'),
  s('sonst', 'Zieh eine Jacke an', 'du', 'wirst', 'krank'),

  // Subjunktor
  s('weil', 'Ich komme nicht mit', 'ich', 'bin', 'krank'),
  s('weil', 'Sie lernt Deutsch', 'sie', 'will', 'in Wien', 'studieren'),
  s('da', 'Die Veranstaltung fällt aus', 'der Referent', 'ist', 'erkrankt'),
  s('da', 'Wir bitten um Verständnis', 'die Straße', 'bleibt', 'gesperrt'),
  s('dass', 'Ich glaube', 'er', 'kommt', 'morgen'),
  s('dass', 'Sie hat gesagt', 'sie', 'hat', 'keine Zeit'),
  s('wenn', 'Ruf mich an', 'du', 'hast', 'Zeit'),
  s('wenn', 'Wir fahren ans Meer', 'das Wetter', 'ist', 'gut'),
  s('ob', 'Ich weiß nicht', 'der Laden', 'hat', 'heute', 'geöffnet'),
  s('ob', 'Sie fragt', 'wir', 'haben', 'morgen Zeit'),
  s('obwohl', 'Er geht joggen', 'es', 'regnet', 'stark'),
  s('obwohl', 'Sie ist zur Arbeit gegangen', 'sie', 'war', 'krank'),
  s('als', 'Ich war sehr glücklich', 'ich', 'bekam', 'den Brief'),
  s('als', 'Es war schon dunkel', 'wir', 'kamen', 'nach Hause'),
  s('damit', 'Ich spreche leise', 'das Baby', 'kann', '', 'schlafen'),
  s('damit', 'Sie spart Geld', 'sie', 'kann', 'im Sommer nach Italien', 'reisen'),
  s('während', 'Er kocht', 'sie', 'deckt', 'den Tisch'),
  s('während', 'Ich höre Musik', 'ich', 'putze', 'die Wohnung'),
  s('bevor', 'Wasch dir die Hände', 'du', 'isst', 'etwas'),
  s('bevor', 'Ich trinke einen Kaffee', 'ich', 'gehe', 'zur Arbeit'),
  s('nachdem', 'Wir gehen spazieren', 'wir', 'haben', '', 'gegessen'),
  s('nachdem', 'Er war sehr erleichtert', 'er', 'hatte', 'die Prüfung', 'bestanden'),
  s('falls', 'Nimm einen Schirm mit', 'es', 'regnet', 'später'),
  s('falls', 'Ruf mich an', 'du', 'brauchst', 'Hilfe'),
  s('sobald', 'Ich melde mich', 'ich', 'bin', 'zu Hause'),
  s('sobald', 'Wir essen', 'die Gäste', 'sind', 'angekommen'),

  // Konnektivpartikel
  s('nämlich', 'Ich komme nicht mit', 'ich', 'bin', 'krank'),
  s('nämlich', 'Er ist heute nicht da', 'er', 'hat', 'Urlaub'),
  s('nämlich', 'Wir nehmen ein Taxi', 'der Bus', 'fährt', 'heute nicht'),
];
