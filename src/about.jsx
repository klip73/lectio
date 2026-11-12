/* ---------- How this app works: an open explanation for anyone who opens it ----------
   What each part does, where every text and every word's help comes from, what happens to your data, and how to
   build, change, or share the app. Kept in plain language; the details are in the repository's README and SOURCES. */
const REPO = "https://github.com/klip73/lectio";
function AboutScreen({ onBack, onGo }) {
  const H = ({ id, children }) => <h2 id={id} className="latin scroll-mt-16 text-[1.2rem] font-bold text-ink">{children}</h2>;
  const P = ({ children }) => <p className="text-[15px] leading-relaxed text-ink">{children}</p>;
  const A = ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-rubric underline underline-offset-2">{children}</a>;
  const sec = "flex flex-col gap-2.5 rounded-lg border border-rule bg-leaf px-5 py-5 sm:px-7";
  const toc = [["what", "What this is"], ["claude", "Using it in Claude"], ["use", "Using it"], ["words", "How word help works"], ["grammar", "Grammar notes"], ["ai", "AI marking"], ["data", "Your data"], ["texts", "Where the texts come from"], ["open", "Open source: build it, change it, share it"], ["limits", "Limits"]];
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button type="button" onClick={onBack} className="text-[14px] text-rubric underline underline-offset-2">‹ Back</button>
        <A href={REPO}>Source code on GitHub ↗</A>
      </div>
      <section className={sec}>
        <h1 className="latin text-[1.45rem] font-bold text-ink">How Lectio Vulgata works</h1>
        <P>A free, open-source study tool for reading the Latin of the Church: the Vulgate, St Thomas, the Breviary and the Fathers. It was made for the FSSP Latin Proficiency Exam and for a lifetime of reading the Office. Anyone may use it, copy it, study how it works and improve it.</P>
        <nav aria-label="On this page" className="flex flex-wrap gap-x-3 gap-y-1 text-[14px]">
          {toc.map(([id, l]) => <a key={id} href={"#" + id} onClick={e => { e.preventDefault(); const el = document.getElementById(id); if (el) el.scrollIntoView({ block: "start" }); }} className="text-rubric underline underline-offset-2">{l}</a>)}
        </nav>
      </section>

      <section className={sec}>
        <H id="what">What this is</H>
        <P>One web page and its data files. There is no server, no account to create and no tracking: everything runs in your browser. It comes three ways, built from the same source:</P>
        <ul className="list-disc pl-5 text-[15px] leading-relaxed text-ink">
          <li><strong>The phone app</strong> (klip73.github.io/lectio): add it to your home screen; it works offline once opened.</li>
          <li><strong>The Claude version</strong>, a shared page on claude.ai: Claude marks your translations and your progress follows your Claude account.</li>
          <li><strong>The offline copy</strong>: one HTML file you can download and keep, with the core texts inside.</li>
        </ul>
      </section>

      <section className={sec}>
        <H id="claude">Using it in Claude</H>
        <P>In Claude, Claude itself marks your translations (no keys to set up), and your progress is saved to your Claude account, so it follows you to any device.</P>
        <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-[15px] leading-relaxed text-ink">
          <li><strong>Have a Claude account.</strong> A free one is enough to open the app; marking uses your own Claude usage.</li>
          <li><strong>Open the Claude version</strong> from the link below (or the one a classmate sent you), and sign in to claude.ai if asked.</li>
          <li><strong>If it says you don’t have access</strong>, the page hasn’t been shared with you: ask whoever sent you the app to share the Claude version (in Claude, its Share menu).</li>
          <li><strong>Bring your progress</strong> (optional): in the version you’ve been using, go to Study → Progress &amp; readiness → Skill map &amp; backup and copy your backup code; in the Claude version, paste it in the same place.</li>
          <li><strong>Use it like the phone app.</strong> Everything else is the same. When you check a translation, Claude marks it.</li>
        </ol>
        {!(window.claude && window.claude.use)
          ? <div><a href={ARTIFACT_URL} target="_blank" rel="noopener noreferrer" className="inline-block rounded-md bg-[var(--rubric)] px-4 py-2 text-[15px] font-semibold text-paper">Open the Claude version ↗</a></div>
          : <p className="text-[14px] text-ok">You’re in the Claude version now.</p>}
        <P>Prefer not to use Claude? The phone app (klip73.github.io/lectio) does everything except Claude’s marking; for marking there, add a free Gemini or Groq key (Study → Progress → Skill map &amp; backup → AI marking).</P>
      </section>

      <section className={sec}>
        <H id="use">Using it</H>
        <ul className="flex flex-col gap-1.5 pl-1 text-[15px] leading-relaxed text-ink">
          <li><strong>Home</strong> picks up where you left off and has one button for each reason to open the app.</li>
          <li><strong>Study</strong> is exam practice: verse drill, passages from the five exam texts, the weekly class quiz, vocabulary with spaced review, verb and noun forms, and timed exam sittings (with sight-reading and a mock exam built from today's liturgy). Today's session mixes these in about twenty minutes.</li>
          <li><strong>Liturgy</strong> has each day's Office and Mass in Latin and English for the 1960 books and fourteen other calendars, with the rubrics, the prayers and Sunday preparation.</li>
          <li><strong>Library</strong> holds the whole Summa and about 190 more works: St Thomas, the Fathers, the Catechism and the Ritual, canon law, readers, hymns, the Old Testament. Search finds any word in all of them.</li>
          <li><strong>Guide</strong> explains the grammar examiners ask about, the five texts, and Church pronunciation.</li>
        </ul>
        <P>Tap any Latin word anywhere for its dictionary form, parsing and meaning. Words you tap join your vocabulary deck.</P>
        {onGo && <div className="flex flex-wrap gap-2"><Btn onClick={() => onGo("guide")}>Open the Guide</Btn><Btn onClick={() => onGo("home")}>Go Home</Btn></div>}
      </section>

      <section className={sec}>
        <H id="words">How word help works</H>
        <P>When you tap a word, the app tries these, in order, and shows which one answered:</P>
        <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-[15px] leading-relaxed text-ink">
          <li><strong>Parsed in context.</strong> In the exam texts every word was analysed by scholars, sentence by sentence, in annotated corpora called treebanks (PROIEL for the Vulgate, the Index Thomisticus for St Thomas). So <span lang="la" className="latin">est</span> is “is” or “eats” according to the sentence.</li>
          <li><strong>Learnt from those texts.</strong> Elsewhere, the app looks the form up among everything those corpora contain.</li>
          <li><strong>Built by the app.</strong> Its own morphology engine produces every form of every word in Whitaker's Words (about 250,000 forms).</li>
          <li><strong>Older spellings.</strong> <span lang="la" className="latin">quum, literae, coelum, michi</span> are tried as <span lang="la" className="latin">cum, litterae, caelum, mihi</span>.</li>
          <li><strong>Wiktionary.</strong> Every possible parsing of the form (from James Penfold's Lexicon Scholasticum). The sentence decides which is meant.</li>
          <li><strong>A guess</strong> from the ending, checked against Lewis &amp; Short's headwords, and labelled as a guess.</li>
        </ol>
        <P>The meanings come from Whitaker's Words, with Church senses put first for key words. Under each word, the <strong>Dictionary</strong> panel adds Lewis &amp; Short, Wiktionary (marking Church and Late Latin senses) and Du Cange (medieval and Church Latin), with links to Logeion and Wiktionary.</P>
      </section>

      <section className={sec}>
        <H id="grammar">Grammar notes</H>
        <P>Under a passage, <strong>Grammar in this passage</strong> lists the constructions it finds from the parsed words: ablative absolutes, indirect statement, cum-clauses, purpose and result clauses, periphrastics and so on. Each comes with its section in Allen and Greenough's New Latin Grammar. Constructions you have got wrong before come first. Tap a note to light up its words. Notes on the kind of Latin you're reading (scholastic formulae like <span lang="la" className="latin">ut patet</span>, biblical idioms, the shape of a Collect) appear too. Because the notes are found by rules, treat them as pointers and check them against the sentence.</P>
      </section>

      <section className={sec}>
        <H id="ai">AI marking</H>
        <P>When you check a translation, an AI model compares it with the Latin and a reference translation and marks real mistakes (tense, case, agreement, sense, omissions), not style. In the Claude version, Claude does this using your Claude account. Elsewhere you can add your own free key for Google Gemini or Groq; the key stays in your browser, and your translation and the passage are sent only to the provider you chose. You can dismiss any wrong mark. Without a key, everything else still works, and you grade yourself.</P>
      </section>

      <section className={sec}>
        <H id="data">Your data</H>
        <P>Your progress, class list and settings are saved in this browser (or, in the Claude version, in your Claude account). Nothing is sent to the app's makers: there is no server to send it to. To move to another device, save a progress file or a backup code (Study → Progress → Skill map &amp; backup). Clearing your browser's data erases progress that hasn't been backed up.</P>
      </section>

      <section className={sec}>
        <H id="texts">Where the texts come from</H>
        <ul className="list-disc pl-5 text-[14px] leading-relaxed text-ink">
          <li>Vulgate (Clementine) and Douay-Rheims: bible_databases. Liturgy: the Divinum Officium project.</li>
          <li>Summa: the Corpus Thomisticum Latin with the Dominican Fathers' English. St Thomas's other works and the Catena Aurea: the Corpus Thomisticum collection.</li>
          <li>Library: The Latin Library (via the Classical Language Toolkit); the Roman Catechism and the 1917 Code from the Magisterium archive; the Rituale Romanum (1952).</li>
          <li>Parsing: PROIEL, Index Thomisticus, LLCT, UDante and Perseus treebanks. Dictionaries: Whitaker's Words; Lewis &amp; Short (Perseus); Wiktionary and Du Cange (via Lexicon Scholasticum).</li>
        </ul>
        <P>Every source, its version and its licence is listed in <A href={REPO + "/blob/main/SOURCES.md"}>SOURCES.md</A>. The texts are public domain or openly licensed; some parsing data is licensed for non-commercial use only, so the app must stay free.</P>
      </section>

      <section className={sec}>
        <H id="open">Open source: build it, change it, share it</H>
        <P>The code is under the MIT licence: use it, copy it, change it, publish your own version. Keep the credits for the texts and data (see SOURCES.md).</P>
        <ul className="list-disc pl-5 text-[15px] leading-relaxed text-ink">
          <li><strong>Read the code:</strong> <A href={REPO}>github.com/klip73/lectio</A>. The app is in <code>src/</code> (React, one file per part: <code>office.jsx</code> is the Liturgy, <code>library.jsx</code> the Library, <code>grammar.jsx</code> the grammar notes…); the data builders are in <code>tools/</code>.</li>
          <li><strong>Build it:</strong> <code>node tools/build_page.mjs</code> makes the page; <code>--app</code> makes the phone app; <code>--offline</code> the single-file copy. The README explains each step and how to rebuild the data from the original sources.</li>
          <li><strong>Make your own:</strong> fork the repository, change it, and publish the <code>docs/</code> build with GitHub Pages: you have your own copy at your own address.</li>
          <li><strong>Help improve it:</strong> report a wrong parsing with “This parsing looks wrong” under any word, or open an issue on GitHub. See <A href={REPO + "/blob/main/CONTRIBUTING.md"}>CONTRIBUTING.md</A> for adding texts, fixing parsings and running the tests.</li>
        </ul>
      </section>

      <section className={sec}>
        <H id="limits">Limits</H>
        <P>Automatic parsings, guesses and grammar notes can be wrong; the AI can mark a correct translation as wrong. Scanned books (the Catechism, Zigliara, Mazzella) keep some misprints. The exam's exact format is not published, so the practice follows what students report. Check what matters against your grammar, your teacher and the books themselves.</P>
      </section>
    </div>
  );
}
