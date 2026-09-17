// Ordre canonique des 66 livres avec codes OSIS
export const BIBLE_BOOKS = [
  // Ancien Testament (39 livres)
  { code: 'Gen',   fr: 'Genèse',           en: 'Genesis',         testament: 'OT' },
  { code: 'Exod',  fr: 'Exode',            en: 'Exodus',          testament: 'OT' },
  { code: 'Lev',   fr: 'Lévitique',        en: 'Leviticus',       testament: 'OT' },
  { code: 'Num',   fr: 'Nombres',          en: 'Numbers',         testament: 'OT' },
  { code: 'Deut',  fr: 'Deutéronome',      en: 'Deuteronomy',     testament: 'OT' },
  { code: 'Josh',  fr: 'Josué',            en: 'Joshua',          testament: 'OT' },
  { code: 'Judg',  fr: 'Juges',            en: 'Judges',          testament: 'OT' },
  { code: 'Ruth',  fr: 'Ruth',             en: 'Ruth',            testament: 'OT' },
  { code: '1Sam',  fr: '1 Samuel',         en: '1 Samuel',        testament: 'OT' },
  { code: '2Sam',  fr: '2 Samuel',         en: '2 Samuel',        testament: 'OT' },
  { code: '1Kgs',  fr: '1 Rois',           en: '1 Kings',         testament: 'OT' },
  { code: '2Kgs',  fr: '2 Rois',           en: '2 Kings',         testament: 'OT' },
  { code: '1Chr',  fr: '1 Chroniques',     en: '1 Chronicles',    testament: 'OT' },
  { code: '2Chr',  fr: '2 Chroniques',     en: '2 Chronicles',    testament: 'OT' },
  { code: 'Ezra',  fr: 'Esdras',           en: 'Ezra',            testament: 'OT' },
  { code: 'Neh',   fr: 'Néhémie',          en: 'Nehemiah',        testament: 'OT' },
  { code: 'Esth',  fr: 'Esther',           en: 'Esther',          testament: 'OT' },
  { code: 'Job',   fr: 'Job',              en: 'Job',             testament: 'OT' },
  { code: 'Ps',    fr: 'Psaumes',          en: 'Psalms',          testament: 'OT' },
  { code: 'Prov',  fr: 'Proverbes',        en: 'Proverbs',        testament: 'OT' },
  { code: 'Eccl',  fr: 'Ecclésiaste',      en: 'Ecclesiastes',    testament: 'OT' },
  { code: 'Song',  fr: 'Cantique des Cantiques', en: 'Song of Solomon', testament: 'OT' },
  { code: 'Isa',   fr: 'Ésaïe',            en: 'Isaiah',          testament: 'OT' },
  { code: 'Jer',   fr: 'Jérémie',          en: 'Jeremiah',        testament: 'OT' },
  { code: 'Lam',   fr: 'Lamentations',     en: 'Lamentations',    testament: 'OT' },
  { code: 'Ezek',  fr: 'Ézéchiel',         en: 'Ezekiel',         testament: 'OT' },
  { code: 'Dan',   fr: 'Daniel',           en: 'Daniel',          testament: 'OT' },
  { code: 'Hos',   fr: 'Osée',             en: 'Hosea',           testament: 'OT' },
  { code: 'Joel',  fr: 'Joël',             en: 'Joel',            testament: 'OT' },
  { code: 'Amos',  fr: 'Amos',             en: 'Amos',            testament: 'OT' },
  { code: 'Obad',  fr: 'Abdias',           en: 'Obadiah',         testament: 'OT' },
  { code: 'Jonah', fr: 'Jonas',            en: 'Jonah',           testament: 'OT' },
  { code: 'Mic',   fr: 'Michée',           en: 'Micah',           testament: 'OT' },
  { code: 'Nah',   fr: 'Nahum',            en: 'Nahum',           testament: 'OT' },
  { code: 'Hab',   fr: 'Habacuc',          en: 'Habakkuk',        testament: 'OT' },
  { code: 'Zeph',  fr: 'Sophonie',         en: 'Zephaniah',       testament: 'OT' },
  { code: 'Hag',   fr: 'Aggée',            en: 'Haggai',          testament: 'OT' },
  { code: 'Zech',  fr: 'Zacharie',         en: 'Zechariah',       testament: 'OT' },
  { code: 'Mal',   fr: 'Malachie',         en: 'Malachi',         testament: 'OT' },
  // Nouveau Testament (27 livres)
  { code: 'Matt',  fr: 'Matthieu',         en: 'Matthew',         testament: 'NT' },
  { code: 'Mark',  fr: 'Marc',             en: 'Mark',            testament: 'NT' },
  { code: 'Luke',  fr: 'Luc',              en: 'Luke',            testament: 'NT' },
  { code: 'John',  fr: 'Jean',             en: 'John',            testament: 'NT' },
  { code: 'Acts',  fr: 'Actes',            en: 'Acts',            testament: 'NT' },
  { code: 'Rom',   fr: 'Romains',          en: 'Romans',          testament: 'NT' },
  { code: '1Cor',  fr: '1 Corinthiens',    en: '1 Corinthians',   testament: 'NT' },
  { code: '2Cor',  fr: '2 Corinthiens',    en: '2 Corinthians',   testament: 'NT' },
  { code: 'Gal',   fr: 'Galates',          en: 'Galatians',       testament: 'NT' },
  { code: 'Eph',   fr: 'Éphésiens',        en: 'Ephesians',       testament: 'NT' },
  { code: 'Phil',  fr: 'Philippiens',      en: 'Philippians',     testament: 'NT' },
  { code: 'Col',   fr: 'Colossiens',       en: 'Colossians',      testament: 'NT' },
  { code: '1Thess', fr: '1 Thessaloniciens', en: '1 Thessalonians', testament: 'NT' },
  { code: '2Thess', fr: '2 Thessaloniciens', en: '2 Thessalonians', testament: 'NT' },
  { code: '1Tim',  fr: '1 Timothée',       en: '1 Timothy',       testament: 'NT' },
  { code: '2Tim',  fr: '2 Timothée',       en: '2 Timothy',       testament: 'NT' },
  { code: 'Titus', fr: 'Tite',             en: 'Titus',           testament: 'NT' },
  { code: 'Phlm',  fr: 'Philémon',         en: 'Philemon',        testament: 'NT' },
  { code: 'Heb',   fr: 'Hébreux',          en: 'Hebrews',         testament: 'NT' },
  { code: 'Jas',   fr: 'Jacques',          en: 'James',           testament: 'NT' },
  { code: '1Pet',  fr: '1 Pierre',         en: '1 Peter',         testament: 'NT' },
  { code: '2Pet',  fr: '2 Pierre',         en: '2 Peter',         testament: 'NT' },
  { code: '1John', fr: '1 Jean',           en: '1 John',          testament: 'NT' },
  { code: '2John', fr: '2 Jean',           en: '2 John',          testament: 'NT' },
  { code: '3John', fr: '3 Jean',           en: '3 John',          testament: 'NT' },
  { code: 'Jude',  fr: 'Jude',             en: 'Jude',            testament: 'NT' },
  { code: 'Rev',   fr: 'Apocalypse',       en: 'Revelation',      testament: 'NT' }
]

export function getBookLabel(bookCode, langue = 'fr') {
  const b = BIBLE_BOOKS.find((x) => x.code === bookCode)
  if (!b) return bookCode
  return langue === 'en' ? b.en : b.fr
}

export function getBooksByTestament(testament, langue = 'fr') {
  return BIBLE_BOOKS
    .filter((b) => b.testament === testament)
    .map((b) => ({
      ...b,
      label: langue === 'en' ? b.en : b.fr
    }))
}

export function getBookMeta(bookCode) {
  return BIBLE_BOOKS.find((b) => b.code === bookCode) || null
}