/* ---------- Latin on the web: free outside resources, grouped by what a student reaches for ----------
   Merges the Nov 13 "Latin on the web" list (many from the Lingua Latina blog's resources page) with a wider list.
   Every address was opened in a browser on 2026-11-14 and showed the page described. Changes made then:
   A&G moved to /grammar/latin/index; Bibliotheca Augustana to tha.de; Diogenes to d.iogen.es; Nuntii Latini now
   Vatican News' Hebdomada Papae podcast. Dropped as dead: Radio Bremen's Nuntii Latini (404), Glossa (404),
   Vivarium Novum's school readers (404), quomododicitur.com (doesn't load; the podcast is linked on Apple instead).
   Divinum Officium and PHI show a Cloudflare check first, which a person passes. To suggest a link: GitHub issue. */
const LINKS = [
  { id: "dict", title: "Dictionaries", items: [
    { name: "Logeion", url: "https://logeion.uchicago.edu/", note: "Lewis & Short, Du Cange, the Dictionary of Medieval Latin from British Sources and more in one search, with where the word is used." },
    { name: "Whitaker’s Words", url: "https://latin-words.com/", note: "Type any form and get its parsing and meaning. Knows Church and medieval words." },
    { name: "Latinitium dictionaries", url: "https://latinitium.com/latin-dictionaries/", note: "Lewis & Short, Smith & Hall (the best English → Latin), and two books of Latin synonyms." },
    { name: "Perseus Word Study Tool", url: "https://www.perseus.tufts.edu/hopper/morph?la=la", note: "Parses a form and links to Lewis & Short and Lewis’s Elementary Latin Dictionary." },
    { name: "Forcellini, Totius Latinitatis Lexicon", url: "https://www.lexica.linguax.com/forc.php", note: "The great Latin–Latin dictionary (1771): meanings explained in Latin. Also linked from every word’s dictionary box." },
    { name: "David Morgan’s Lexicon", url: "https://www.culturaclasica.com/lingualatina/lexicon_latinum_morgan.pdf", note: "Latin words for modern things (PDF)." }
  ] },
  { id: "gram", title: "Grammars and vocabulary", items: [
    { name: "Allen & Greenough", url: "https://dcc.dickinson.edu/grammar/latin/index", note: "The standard reference grammar, searchable, section by section. The § numbers in this app’s grammar notes are A&G’s." },
    { name: "Bennett’s New Latin Grammar", url: "https://www.gutenberg.org/ebooks/15665", note: "Shorter and plainer than A&G; free on Project Gutenberg." },
    { name: "DCC Latin Core Vocabulary", url: "https://dcc.dickinson.edu/latin-core-list1", note: "The thousand commonest Latin words, by frequency and by part of speech." },
    { name: "Textkit", url: "https://www.textkit.com/", note: "Free downloadable grammars and readers (with answer keys) and a friendly forum for questions." }
  ] },
  { id: "bible", title: "Scripture and the Psalms", items: [
    { name: "Douay-Rheims Bible Online", url: "https://www.drbo.org/", note: "The Clementine Vulgate and the Douay-Rheims, chapter by chapter: the Latin of the exam’s Gospel and Psalm passages." },
    { name: "Nova Vulgata (vatican.va)", url: "https://www.vatican.va/archive/bible/nova_vulgata/documents/nova-vulgata_index_lt.html", note: "The Holy See’s 1979 revision. Not the text of the 1962 books, but useful to compare." }
  ] },
  { id: "thomas", title: "St Thomas", items: [
    { name: "Corpus Thomisticum", url: "https://www.corpusthomisticum.org/", note: "All of St Thomas in Latin, with the Index Thomisticus for finding every use of a word." },
    { name: "Aquinas Institute (aquinas.cc)", url: "https://aquinas.cc/", note: "Latin and English side by side, paragraph by paragraph, for the Summa and most other works." },
    { name: "New Advent: the Summa", url: "https://www.newadvent.org/summa/", note: "The English Dominican translation, quick to search." }
  ] },
  { id: "lit", title: "Office, Mass and chant", items: [
    { name: "Divinum Officium", url: "https://www.divinumofficium.com/", note: "The whole Breviary and Missal in Latin and English, every rubrical version. This app’s Office texts come from it." },
    { name: "GregoBase", url: "https://gregobase.selapa.net/", note: "The chant scores of the hymns, antiphons and Mass propers, printable." },
    { name: "Sancta Missa", url: "https://www.sanctamissa.org/", note: "Tutorials and rubrics for the 1962 Missal, in Latin and English." }
  ] },
  { id: "texts", title: "Libraries of Latin texts", items: [
    { name: "The Latin Library", url: "https://www.thelatinlibrary.com/", note: "Classical, Christian and medieval Latin, plain text. Its whole collection is also on this app’s Library shelf." },
    { name: "Corpus Corporum", url: "https://mlat.uzh.ch/", note: "Zurich’s library of Latin texts, the whole Patrologia Latina included; tap a word for its dictionary entry." },
    { name: "Documenta Catholica Omnia", url: "https://www.documentacatholicaomnia.eu/", note: "Fathers, councils, popes and Doctors, mostly in Latin, as PDFs." },
    { name: "Latin on vatican.va", url: "https://www.vatican.va/latin/latin_index.html", note: "The Holy See’s own Latin pages: documents, the Code of Canon Law, the Catechism." },
    { name: "Bibliotheca Augustana", url: "https://www.tha.de/~harsch/augusta.html", note: "Latin texts of every period, many not in the Latin Library." },
    { name: "PHI Latin Texts", url: "https://latin.packhum.org/", note: "Classical Latin to AD 200, with a concordance: every place a word occurs." },
    { name: "Loebolus", url: "https://ryanfb.github.io/loebolus/", note: "Every public-domain Loeb volume, Latin and Greek with English, as PDFs." },
    { name: "Diogenes", url: "https://d.iogen.es/", note: "Free program (and web app) for reading and searching Latin and Greek texts and dictionaries." }
  ] },
  { id: "listen", title: "Latin read and spoken", items: [
    { name: "Hebdomada Papae (Vatican News)", url: "https://www.vaticannews.va/sv/podcast/hebdomada-papae.html", note: "The Vatican’s weekly news bulletin in Latin, as a podcast." },
    { name: "Ephemeris", url: "http://www.alcuinus.net/ephemeris/index.php", note: "World news written in Latin." },
    { name: "Quomodo Dicitur? Podcast", url: "https://podcasts.apple.com/us/podcast/quomodo-dicitur-podcast/id1123710604", note: "Conversations in Latin about anything: 176 episodes, ended 2021." },
    { name: "John Piazza’s links", url: "https://johnpiazza.net/links/", note: "A long list of links for spoken Latin and teaching." }
  ] },
  { id: "study", title: "Study tools", items: [
    { name: "Anki", url: "https://apps.ankiweb.net/", note: "The flashcard program. Every deck and class list here has “Export… → Anki”." },
    { name: "Our Lady of Guadalupe Seminary", url: "https://fsspolgs.org/", note: "The FSSP’s English-speaking seminary." }
  ] }
];
function LinksPage() {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[15px] leading-snug text-ink">Free sites worth knowing, beyond this app. Each opens in a new tab.</p>
      {LINKS.map(g => (
        <section key={g.id} className="rounded-lg border border-rule bg-leaf px-4 py-3" aria-label={g.title}>
          <h2 className="latin mb-1.5 text-[1.05rem] font-bold text-ink">{g.title}</h2>
          <ul className="flex flex-col gap-2">
            {g.items.map(it => (
              <li key={it.url} className="border-l-2 border-rubric pl-3">
                <a href={it.url} target="_blank" rel="noopener noreferrer" className="text-[15px] font-semibold text-rubric underline underline-offset-2">{it.name} ↗</a>
                <p className="text-[14px] leading-snug text-soft">{it.note}</p>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <p className="text-[13px] text-soft">All links checked November 2026; several come from the resources page of the Lingua Latina blog (lingvalatina.com). Know a good one that’s missing, or found a dead link? <a href="https://github.com/klip73/lectio/issues/new" target="_blank" rel="noopener noreferrer" className="text-rubric underline underline-offset-2">Tell us on GitHub</a>.</p>
    </div>
  );
}
