import { declineArticle, type ArticleWord } from './articles';
import type { Gender } from './types';

/**
 * Verbs with a fixed preposition (Verben mit Präpositionen). Sources: the clipper note
 * "Verb + präposition", Lesson 6 (da-/wo- compounds), and frequent Goethe B1/B2 pairs.
 */
export const PREPS = ['an', 'auf', 'aus', 'bei', 'für', 'in', 'mit', 'nach', 'über', 'um', 'von', 'vor', 'zu'] as const;
export type Prep = (typeof PREPS)[number];

export const VERB_CASES = ['akk', 'dat'] as const;
export type VerbCase = (typeof VERB_CASES)[number];

export const VP_SETS = ['notes', 'core'] as const;
export type VpSet = (typeof VP_SETS)[number];

export const VP_SET_NAMES: Record<VpSet, string> = { notes: 'My notes', core: 'Core B1/B2' };

export interface VpSentence {
  /** `_` marks the gap: preposition + article. */
  de: string;
  det: ArticleWord;
  gender: Gender;
  en: string;
}

export interface VerbPrep {
  verb: string;
  prep: Prep;
  case: VerbCase;
  gloss: string;
  set: VpSet;
  note?: string;
  /** Another preposition that is also right in these sentences, with its own case. */
  also?: { prep: Prep; case: VerbCase };
  sentences: readonly VpSentence[];
}

const FREUEN = 'auf: it has not happened yet. über: it is already true.';
const BEWERBEN = 'bei + the employer, um + the position.';
const ERINNERN = 'sich erinnern an = remember. jemanden erinnern an = remind someone.';
const ERZAEHLEN = 'von and über both work here; über is the broader one.';
const SPRECHEN = 'mit + the person, über + the topic.';
const AN_DAT = 'an + Dativ here, unlike denken an / sich erinnern an (Akkusativ).';

export const VERB_PREPS: readonly VerbPrep[] = [
  // ---------- My notes: the clipper note and Lesson 6 ----------
  {
    verb: 'es geht',
    prep: 'um',
    case: 'akk',
    gloss: 'it is about, it involves',
    set: 'notes',
    sentences: [
      { de: 'Im Film geht es _ Familie aus Hamburg.', det: 'ein', gender: 'f', en: 'The film is about a family from Hamburg.' },
      { de: 'Beim Treffen morgen geht es _ neuen Vertrag.', det: 'der', gender: 'm', en: "Tomorrow's meeting is about the new contract." },
    ],
  },
  {
    verb: 'hören',
    prep: 'von',
    case: 'dat',
    gloss: 'to hear about / from',
    set: 'notes',
    sentences: [
      { de: 'Hast du schon _ neuen Bäckerei am Markt gehört?', det: 'der', gender: 'f', en: 'Have you heard about the new bakery at the market?' },
      { de: 'Ich habe lange nichts _ Bruder gehört.', det: 'mein', gender: 'm', en: "I haven't heard from my brother in a long time." },
    ],
  },
  {
    verb: 'sich erinnern',
    prep: 'an',
    case: 'akk',
    gloss: 'to remember',
    set: 'notes',
    note: ERINNERN,
    sentences: [
      { de: 'Ich erinnere mich gut _ ersten Schultag.', det: 'der', gender: 'm', en: 'I remember the first day of school well.' },
      { de: 'Erinnerst du dich noch _ Lehrerin aus der Grundschule?', det: 'unser', gender: 'f', en: 'Do you still remember our teacher from primary school?' },
    ],
  },
  {
    verb: 'jemanden erinnern',
    prep: 'an',
    case: 'akk',
    gloss: 'to remind someone of / about',
    set: 'notes',
    note: ERINNERN,
    sentences: [
      { de: 'Kannst du mich morgen _ Termin beim Arzt erinnern?', det: 'mein', gender: 'm', en: "Can you remind me about my doctor's appointment tomorrow?" },
      { de: 'Das Lied erinnert mich _ Sommer in Italien.', det: 'der', gender: 'm', en: 'The song reminds me of the summer in Italy.' },
    ],
  },
  {
    verb: 'sich verlieben',
    prep: 'in',
    case: 'akk',
    gloss: 'to fall in love with',
    set: 'notes',
    note: 'Always in + Akkusativ, never mit.',
    sentences: [
      { de: 'Er hat sich _ Kollegin verliebt.', det: 'sein', gender: 'f', en: 'He fell in love with his colleague.' },
      { de: 'Wir haben uns sofort _ Wohnung verliebt.', det: 'der', gender: 'f', en: 'We fell in love with the flat straight away.' },
    ],
  },
  {
    verb: 'sich bewerben',
    prep: 'bei',
    case: 'dat',
    gloss: 'to apply to (the employer)',
    set: 'notes',
    note: BEWERBEN,
    sentences: [
      { de: 'Sie bewirbt sich _ Firma in Berlin.', det: 'ein', gender: 'f', en: 'She is applying to a company in Berlin.' },
      { de: 'Ich habe mich _ Stadtverwaltung beworben.', det: 'der', gender: 'f', en: 'I applied to the city administration.' },
    ],
  },
  {
    verb: 'sich bewerben',
    prep: 'um',
    case: 'akk',
    gloss: 'to apply for (the position)',
    set: 'notes',
    note: BEWERBEN,
    sentences: [
      { de: 'Sie bewirbt sich _ Stelle als Krankenschwester.', det: 'ein', gender: 'f', en: 'She is applying for a job as a nurse.' },
      { de: 'Er hat sich _ Praktikum bei Siemens beworben.', det: 'ein', gender: 'n', en: 'He applied for an internship at Siemens.' },
    ],
  },
  {
    verb: 'suchen',
    prep: 'nach',
    case: 'dat',
    gloss: 'to search for, look for',
    set: 'notes',
    sentences: [
      { de: 'Ich suche schon seit einer Stunde _ Schlüssel.', det: 'mein', gender: 'm', en: "I've been looking for my key for an hour." },
      { de: 'Die Polizei sucht _ Frau mit einem roten Mantel.', det: 'ein', gender: 'f', en: 'The police are looking for a woman in a red coat.' },
    ],
  },
  {
    verb: 'sich freuen',
    prep: 'auf',
    case: 'akk',
    gloss: 'to look forward to',
    set: 'notes',
    note: FREUEN,
    sentences: [
      { de: 'Die Kinder freuen sich schon _ Sommerferien.', det: 'der', gender: 'pl', en: 'The children are already looking forward to the summer holidays.' },
      { de: 'Ich freue mich _ Wochenende mit euch.', det: 'der', gender: 'n', en: "I'm looking forward to the weekend with you." },
    ],
  },
  {
    verb: 'sich freuen',
    prep: 'über',
    case: 'akk',
    gloss: 'to be glad about, pleased with',
    set: 'notes',
    note: FREUEN,
    sentences: [
      { de: 'Sie hat sich sehr _ Blumen gefreut.', det: 'der', gender: 'pl', en: 'She was very pleased with the flowers.' },
      { de: 'Wir freuen uns sehr _ gute Nachricht.', det: 'der', gender: 'f', en: "We're really glad about the good news." },
    ],
  },
  {
    verb: 'Angst haben',
    prep: 'vor',
    case: 'dat',
    gloss: 'to be afraid of',
    set: 'notes',
    sentences: [
      { de: 'Mein Sohn hat Angst _ Hund der Nachbarn.', det: 'der', gender: 'm', en: "My son is afraid of the neighbours' dog." },
      { de: 'Viele Studenten haben Angst _ Prüfung.', det: 'der', gender: 'f', en: 'Many students are afraid of the exam.' },
    ],
  },
  {
    verb: 'sich entscheiden',
    prep: 'für',
    case: 'akk',
    gloss: 'to decide on, choose',
    set: 'notes',
    sentences: [
      { de: 'Wir haben uns _ Wohnung im Zentrum entschieden.', det: 'der', gender: 'f', en: 'We chose the flat in the centre.' },
      { de: 'Ich habe mich _ Studium in Wien entschieden.', det: 'ein', gender: 'n', en: 'I decided on a degree course in Vienna.' },
    ],
  },
  {
    verb: 'teilnehmen',
    prep: 'an',
    case: 'dat',
    gloss: 'to take part in',
    set: 'notes',
    note: AN_DAT,
    sentences: [
      { de: 'Nächste Woche nehme ich _ Konferenz in München teil.', det: 'ein', gender: 'f', en: "Next week I'm taking part in a conference in Munich." },
      { de: 'Wie viele Leute haben _ Kurs teilgenommen?', det: 'dieser', gender: 'm', en: 'How many people took part in this course?' },
    ],
  },
  {
    verb: 'erzählen',
    prep: 'von',
    case: 'dat',
    gloss: 'to tell about (a particular event)',
    set: 'notes',
    note: ERZAEHLEN,
    also: { prep: 'über', case: 'akk' },
    sentences: [
      { de: 'Sie hat uns _ Reise nach Japan erzählt.', det: 'ihr', gender: 'f', en: 'She told us about her trip to Japan.' },
      { de: 'Opa erzählt gern _ Leben auf dem Bauernhof.', det: 'sein', gender: 'n', en: 'Grandpa likes to talk about his life on the farm.' },
    ],
  },
  {
    verb: 'erzählen',
    prep: 'über',
    case: 'akk',
    gloss: 'to tell about (a broader topic)',
    set: 'notes',
    note: ERZAEHLEN,
    also: { prep: 'von', case: 'dat' },
    sentences: [
      { de: 'Der Stadtführer erzählt viel _ Geschichte der Stadt.', det: 'der', gender: 'f', en: 'The guide tells us a lot about the history of the city.' },
      { de: 'Kannst du mir etwas _ Projekt erzählen?', det: 'dein', gender: 'n', en: 'Can you tell me something about your project?' },
    ],
  },
  {
    verb: 'bestehen',
    prep: 'aus',
    case: 'dat',
    gloss: 'to consist of',
    set: 'notes',
    sentences: [
      { de: 'Die Wohnung besteht _ Küche, einem Bad und zwei Zimmern.', det: 'ein', gender: 'f', en: 'The flat consists of a kitchen, a bathroom and two rooms.' },
      { de: 'Die Gruppe besteht _ Schülern der zehnten Klasse.', det: 'der', gender: 'pl', en: 'The group is made up of the pupils from year ten.' },
    ],
  },
  {
    verb: 'sich beschäftigen',
    prep: 'mit',
    case: 'dat',
    gloss: 'to deal with, spend time on',
    set: 'notes',
    sentences: [
      { de: 'Ich beschäftige mich gerade _ Geschichte Österreichs.', det: 'der', gender: 'f', en: "At the moment I'm studying the history of Austria." },
      { de: 'In der Freizeit beschäftigt er sich gern _ Garten.', det: 'sein', gender: 'm', en: 'In his free time he likes to work on his garden.' },
    ],
  },
  {
    verb: 'warten',
    prep: 'auf',
    case: 'akk',
    gloss: 'to wait for',
    set: 'notes',
    sentences: [
      { de: 'Ich warte schon zehn Minuten _ Bus.', det: 'der', gender: 'm', en: "I've been waiting for the bus for ten minutes." },
      { de: 'Wir warten noch _ Antwort der Firma.', det: 'der', gender: 'f', en: "We're still waiting for the company's reply." },
    ],
  },
  {
    verb: 'sich bedanken',
    prep: 'für',
    case: 'akk',
    gloss: 'to say thank you for',
    set: 'notes',
    sentences: [
      { de: 'Ich möchte mich _ Hilfe bedanken.', det: 'dein', gender: 'f', en: "I'd like to thank you for your help." },
      { de: 'Er hat sich _ Geschenk bedankt.', det: 'der', gender: 'n', en: 'He said thank you for the present.' },
    ],
  },
  {
    verb: 'träumen',
    prep: 'von',
    case: 'dat',
    gloss: 'to dream of / about',
    set: 'notes',
    sentences: [
      { de: 'Sie träumt _ Haus am Meer.', det: 'ein', gender: 'n', en: 'She dreams of a house by the sea.' },
      { de: 'Als Kind habe ich _ Karriere als Fußballer geträumt.', det: 'ein', gender: 'f', en: 'As a child I dreamt of a career as a footballer.' },
    ],
  },
  {
    verb: 'fragen',
    prep: 'nach',
    case: 'dat',
    gloss: 'to ask about / for (information)',
    set: 'notes',
    sentences: [
      { de: 'Ein Tourist hat mich _ Weg zum Bahnhof gefragt.', det: 'der', gender: 'm', en: 'A tourist asked me the way to the station.' },
      { de: 'Die Ärztin hat mich _ Telefonnummer gefragt.', det: 'mein', gender: 'f', en: 'The doctor asked me for my phone number.' },
    ],
  },

  // ---------- Core B1/B2 ----------
  {
    verb: 'denken',
    prep: 'an',
    case: 'akk',
    gloss: 'to think of / about',
    set: 'core',
    sentences: [
      { de: 'Ich denke oft _ Zeit in Spanien.', det: 'der', gender: 'f', en: 'I often think about the time in Spain.' },
      { de: 'Hast du _ Geburtstag deiner Mutter gedacht?', det: 'der', gender: 'm', en: "Did you remember your mother's birthday?" },
    ],
  },
  {
    verb: 'sich interessieren',
    prep: 'für',
    case: 'akk',
    gloss: 'to be interested in',
    set: 'core',
    sentences: [
      { de: 'Sie interessiert sich _ Stelle in der Buchhaltung.', det: 'der', gender: 'f', en: 'She is interested in the position in accounting.' },
      { de: 'Ich interessiere mich _ Kurs am Samstag.', det: 'der', gender: 'm', en: "I'm interested in the Saturday course." },
    ],
  },
  {
    verb: 'sich kümmern',
    prep: 'um',
    case: 'akk',
    gloss: 'to look after, take care of',
    set: 'core',
    sentences: [
      { de: 'Wer kümmert sich _ Hund, wenn ihr im Urlaub seid?', det: 'der', gender: 'm', en: "Who looks after the dog when you're on holiday?" },
      { de: 'Sie kümmert sich _ kranke Mutter.', det: 'ihr', gender: 'f', en: 'She takes care of her sick mother.' },
    ],
  },
  {
    verb: 'sich ärgern',
    prep: 'über',
    case: 'akk',
    gloss: 'to be annoyed about',
    set: 'core',
    sentences: [
      { de: 'Ich ärgere mich _ Fehler im Test.', det: 'mein', gender: 'm', en: "I'm annoyed about my mistake in the test." },
      { de: 'Die Nachbarn ärgern sich _ Lärm von der Baustelle.', det: 'der', gender: 'm', en: 'The neighbours are annoyed about the noise from the building site.' },
    ],
  },
  {
    verb: 'sich gewöhnen',
    prep: 'an',
    case: 'akk',
    gloss: 'to get used to',
    set: 'core',
    sentences: [
      { de: 'Ich habe mich noch nicht _ neuen Arbeitszeiten gewöhnt.', det: 'der', gender: 'pl', en: "I haven't got used to the new working hours yet." },
      { de: 'Sie hat sich schnell _ neue Stadt gewöhnt.', det: 'der', gender: 'f', en: 'She quickly got used to the new city.' },
    ],
  },
  {
    verb: 'sich konzentrieren',
    prep: 'auf',
    case: 'akk',
    gloss: 'to concentrate on',
    set: 'core',
    sentences: [
      { de: 'Ich kann mich heute nicht _ Arbeit konzentrieren.', det: 'mein', gender: 'f', en: "I can't concentrate on my work today." },
      { de: 'Konzentrier dich _ Straße!', det: 'der', gender: 'f', en: 'Concentrate on the road!' },
    ],
  },
  {
    verb: 'sprechen',
    prep: 'über',
    case: 'akk',
    gloss: 'to talk about',
    set: 'core',
    note: SPRECHEN,
    sentences: [
      { de: 'Wir haben lange _ Problem gesprochen.', det: 'der', gender: 'n', en: 'We talked about the problem for a long time.' },
      { de: 'Im Unterricht sprechen wir heute _ Klimawandel.', det: 'der', gender: 'm', en: "In class today we're talking about climate change." },
    ],
  },
  {
    verb: 'sich beschweren',
    prep: 'über',
    case: 'akk',
    gloss: 'to complain about',
    set: 'core',
    note: 'über + the problem; bei + the person you complain to.',
    sentences: [
      { de: 'Die Gäste haben sich _ Essen beschwert.', det: 'der', gender: 'n', en: 'The guests complained about the food.' },
      { de: 'Er beschwert sich immer _ Nachbarn.', det: 'sein', gender: 'pl', en: "He's always complaining about his neighbours." },
    ],
  },
  {
    verb: 'bitten',
    prep: 'um',
    case: 'akk',
    gloss: 'to ask for (something you want)',
    set: 'core',
    note: 'bitten um = ask for something you want; fragen nach = ask for information.',
    sentences: [
      { de: 'Darf ich Sie _ Gefallen bitten?', det: 'ein', gender: 'm', en: 'May I ask you a favour?' },
      { de: 'Sie hat ihren Chef _ Gehaltserhöhung gebeten.', det: 'ein', gender: 'f', en: 'She asked her boss for a pay rise.' },
    ],
  },
  {
    verb: 'sich vorbereiten',
    prep: 'auf',
    case: 'akk',
    gloss: 'to prepare for',
    set: 'core',
    sentences: [
      { de: 'Ich bereite mich gerade _ Prüfung vor.', det: 'der', gender: 'f', en: "I'm preparing for the exam at the moment." },
      { de: 'Wie hast du dich _ Vorstellungsgespräch vorbereitet?', det: 'dein', gender: 'n', en: 'How did you prepare for your job interview?' },
    ],
  },
  {
    verb: 'achten',
    prep: 'auf',
    case: 'akk',
    gloss: 'to pay attention to, watch',
    set: 'core',
    sentences: [
      { de: 'Bitte achten Sie _ Stufe am Eingang.', det: 'der', gender: 'f', en: 'Please mind the step at the entrance.' },
      { de: 'Er achtet sehr _ Gesundheit.', det: 'sein', gender: 'f', en: 'He pays close attention to his health.' },
    ],
  },
  {
    verb: 'sich verlassen',
    prep: 'auf',
    case: 'akk',
    gloss: 'to rely on',
    set: 'core',
    sentences: [
      { de: 'Ich kann mich immer _ Schwester verlassen.', det: 'mein', gender: 'f', en: 'I can always rely on my sister.' },
      { de: 'Wir verlassen uns _ Wettervorhersage.', det: 'der', gender: 'f', en: "We're relying on the weather forecast." },
    ],
  },
  {
    verb: 'reagieren',
    prep: 'auf',
    case: 'akk',
    gloss: 'to react / respond to',
    set: 'core',
    sentences: [
      { de: 'Die Firma hat noch nicht _ E-Mail reagiert.', det: 'mein', gender: 'f', en: "The company hasn't replied to my email yet." },
      { de: 'Wie hat er _ Nachricht reagiert?', det: 'der', gender: 'f', en: 'How did he react to the news?' },
    ],
  },
  {
    verb: 'abhängen',
    prep: 'von',
    case: 'dat',
    gloss: 'to depend on',
    set: 'core',
    sentences: [
      { de: 'Das hängt ganz _ Situation ab.', det: 'der', gender: 'f', en: 'That depends entirely on the situation.' },
      { de: 'Die Note hängt auch _ Präsentation ab.', det: 'dein', gender: 'f', en: 'The grade also depends on your presentation.' },
    ],
  },
  {
    verb: 'sprechen',
    prep: 'mit',
    case: 'dat',
    gloss: 'to talk to / with',
    set: 'core',
    note: SPRECHEN,
    sentences: [
      { de: 'Ich muss mal _ Chefin sprechen.', det: 'mein', gender: 'f', en: 'I need to talk to my boss.' },
      { de: 'Hast du schon _ Vermieter gesprochen?', det: 'der', gender: 'm', en: 'Have you spoken to the landlord yet?' },
    ],
  },
  {
    verb: 'halten',
    prep: 'von',
    case: 'dat',
    gloss: 'to think of (an opinion)',
    set: 'core',
    sentences: [
      { de: 'Was hältst du _ Idee?', det: 'dieser', gender: 'f', en: 'What do you think of this idea?' },
      { de: 'Ich halte nicht viel _ neuen Regeln.', det: 'der', gender: 'pl', en: "I don't think much of the new rules." },
    ],
  },
  {
    verb: 'gehören',
    prep: 'zu',
    case: 'dat',
    gloss: 'to be part of, be one of',
    set: 'core',
    note: 'Without zu, gehören + Dativ means to belong to (own): Das gehört mir.',
    sentences: [
      { de: 'Die Stadt gehört _ schönsten Orten in Bayern.', det: 'der', gender: 'pl', en: 'The town is one of the most beautiful places in Bavaria.' },
      { de: 'Er gehört seit Mai _ Team.', det: 'unser', gender: 'n', en: 'He has been part of our team since May.' },
    ],
  },
  {
    verb: 'einladen',
    prep: 'zu',
    case: 'dat',
    gloss: 'to invite to',
    set: 'core',
    sentences: [
      { de: 'Sie hat uns _ Hochzeit eingeladen.', det: 'ihr', gender: 'f', en: 'She invited us to her wedding.' },
      { de: 'Ich lade dich _ Kaffee ein.', det: 'ein', gender: 'm', en: "Let me buy you a coffee (I'm inviting you)." },
    ],
  },
  {
    verb: 'zweifeln',
    prep: 'an',
    case: 'dat',
    gloss: 'to doubt',
    set: 'core',
    note: AN_DAT,
    sentences: [
      { de: 'Ich zweifle nicht _ Ehrlichkeit.', det: 'sein', gender: 'f', en: "I don't doubt his honesty." },
      { de: 'Viele zweifeln _ Plan.', det: 'dieser', gender: 'm', en: 'Many people have doubts about this plan.' },
    ],
  },
  {
    verb: 'sich erkundigen',
    prep: 'nach',
    case: 'dat',
    gloss: 'to enquire about',
    set: 'core',
    sentences: [
      { de: 'Ich möchte mich _ Preisen für Gruppen erkundigen.', det: 'der', gender: 'pl', en: "I'd like to enquire about the prices for groups." },
      { de: 'Er hat sich _ Gesundheit seiner Oma erkundigt.', det: 'der', gender: 'f', en: "He asked after his grandma's health." },
    ],
  },
];

export function vpId(e: VerbPrep): string {
  return `${e.verb}|${e.prep}`;
}

export function findVerbPrep(id: string): VerbPrep {
  const e = VERB_PREPS.find((x) => vpId(x) === id);
  if (!e) throw new Error(`Unknown verb + preposition: ${id}`);
  return e;
}

/** Text before and after the `_`. */
export function splitGap(de: string): [string, string] {
  const i = de.indexOf('_');
  return [de.slice(0, i), de.slice(i + 1)];
}

/** What fills the gap: "auf den". */
export function gapPhrase(s: VpSentence, prep: Prep, c: VerbCase): string {
  return `${prep} ${declineArticle(s.det, c, s.gender)}`;
}

const startsWithVowel = (p: Prep) => /^[aeiouäöü]/.test(p);

/** darauf, damit: the r keeps two vowels apart. */
export function daWord(p: Prep): string {
  return (startsWithVowel(p) ? 'dar' : 'da') + p;
}

export function woWord(p: Prep): string {
  return (startsWithVowel(p) ? 'wor' : 'wo') + p;
}
