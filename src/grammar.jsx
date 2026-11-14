/* ---------- Grammar in this passage: the constructions the parsed words show, with Allen & Greenough sections,
   and the turns of phrase proper to the text's own Latin (scholastic, biblical, liturgical, patristic).
   Adaptive: the student's weak skills and repeated mistakes come first and are marked. ---------- */
const AG = n => `A&G §${n}`;
const PREP_ABL = new Set(["in", "cum", "de", "ex", "e", "a", "ab", "abs", "sine", "pro", "prae", "sub", "coram", "absque", "tenus"]);
const RESULT_CUE = new Set(["ita", "sic", "tam", "tantus", "tanta", "tantum", "talis", "tale", "adeo", "tot"]);
const QWORD = new Set(["quis", "quid", "cur", "quomodo", "quare", "utrum", "num", "an", "ubi", "unde", "quo", "quando", "quantus", "qualis", "quot", "quam", "quanto", "quemadmodum"]);
const VTAG = { absl: "absl", ind: "ind", subj: "subj", part: "part", pass: "pass", dep: "dep", imp: "imp", comp: "comp", rel: "rel" };
function gTokens(lex, verses) {
  const out = [];
  verses.forEach(v => {
    const ws = v[1].match(WORD_RE) || [];
    ws.forEach((w, i) => {
      const r = readings(v[3] ? v[3][i] : null);
      const a = (r.kind === "context" || (r.kind === "lookup" && r.ids.length >= 1)) ? lex.ana[r.ids[0]] : null;
      const m = a && a[2] && a[2] !== "??" ? a[2] : null;
      out.push({ w, lw: w.toLowerCase(), lemma: a ? lex.lemmas[a[0]][0] : "", pos: a ? a[1] : "", m, sure: r.kind === "context" || (r.kind === "lookup" && r.ids.length === 1) });
    });
  });
  // clause ends: punctuation after the word in its verse
  let k = 0;
  verses.forEach(v => {
    const re = /([A-Za-z]+)([^A-Za-z]*)/g; let mm;
    while ((mm = re.exec(v[1])) && k < out.length) { out[k].stop = /[.;:?!]/.test(mm[2]); out[k].comma = /,/.test(mm[2]); k++; }
  });
  return out;
}
const isV = t => t.pos === "V-" && t.m;
const snip = (toks, i, j) => {
  const ws = toks.slice(Math.max(0, i), Math.min(toks.length, j + 1)).map(t => t.w);
  return ws.length > 7 ? ws.slice(0, 4).join(" ") + " … " + ws.slice(-2).join(" ") : ws.join(" ");   // long spans: the ends carry the construction
};
function grammarNotes(lex, verses) {
  if (!lex || !verses || !verses.length) return [];
  const T = gTokens(lex, verses);
  const notes = {};
  /* each note keeps up to two examples, and the positions of their words (for highlighting) */
  const add = (id, tag, title, ex, note, ag, at) => {
    if (!notes[id]) notes[id] = { id, tag, title, ex: [], at: [], note, ag };
    if (ex && notes[id].ex.length < 2 && !notes[id].ex.includes(ex)) { notes[id].ex.push(ex); if (at) notes[id].at.push(...at); }
  };
  const span = (a, b) => { const o = []; for (let j = Math.max(0, a); j <= Math.min(T.length - 1, b); j++) o.push(j); return o; };
  const clauseEnd = i => { for (let j = i; j < T.length; j++) if (T[j].stop) return j; return T.length - 1; };
  T.forEach((t, i) => {
    const m = t.m;
    // ablative absolute: a participle in the ablative with a noun or pronoun in the ablative beside it, no preposition governing them
    if (isV(t) && m[3] === "p" && m[6] === "b") {
      const near = [i - 3, i - 2, i - 1, i + 1, i + 2].filter(j => T[j] && T[j].m && T[j].m[6] === "b" && T[j].pos !== "V-");
      const prep = [i - 1, i - 2, i - 3].some(j => T[j] && PREP_ABL.has(T[j].lw) && (!near.length || j < Math.min(...near)));
      if (near.length && !prep) {
        const a = Math.min(i, ...near), b = Math.max(i, ...near);
        add("absl", "absl", "Ablative absolute", snip(T, a, b), `A noun and participle in the ablative, standing apart from the sentence: translate “when / since / although ${m[2] === "r" ? "X had been …" : "X was …"}”, or “with X …”. ${m[2] === "r" ? "Perfect participle: the action is already done." : "Present participle: at the same time."}`, AG("419–420"), span(a, b));
      }
    }
    // participles generally
    /* a participle beside a form of sum belongs to a compound tense (noted below), not here */
    const besideSum = [i - 2, i - 1, i + 1, i + 2].some(j => T[j] && T[j].lemma === "sum");
    if (isV(t) && m[3] === "p" && m[6] !== "b" && !besideSum) add("part", "part", "Participle", t.w, `A verbal adjective agreeing with a noun: often best as a clause (“who …, when …, because …”). ${{ p: "Present: at the same time as the main verb.", r: "Perfect: before the main verb (passive, unless deponent).", f: "Future: about to, intending to." }[m[2]] || ""}`, AG("488–497"), [i]);
    // indirect statement: an infinitive with an accusative subject, after a verb of saying, thinking, knowing
    if (isV(t) && m[3] === "n") {
      const say = T.slice(Math.max(0, i - 12), i + 4).find(x => SAY.has(x.lemma));
      const acc = T.slice(Math.max(0, i - 6), Math.min(T.length, i + 4)).find(x => x.m && x.m[6] === "a" && x.pos !== "V-");
      if (say && acc) add("ind", "ind", "Indirect statement (accusative and infinitive)", `${say.w} … ${acc.w} … ${t.w}`, "After a verb of saying, thinking or knowing, the reported statement has its subject in the accusative and its verb in the infinitive: translate with “that”. Present infinitive = same time, perfect = earlier, future = later than the main verb.", AG("577–582"), [T.indexOf(say), T.indexOf(acc), i]);
      else if (/^(possum|volo|nolo|malo|debeo|incipio|coepi|soleo|audeo|cupio|conor|desino|nequeo|queo)$/.test((T[i - 1] || {}).lemma || "") || /^(possum|volo|nolo|malo|debeo|incipio|coepi|soleo|audeo|cupio|conor|desino)$/.test((T[i + 1] || {}).lemma || ""))
        add("compinf", "", "Complementary infinitive", `${(T[i - 1] || {}).w || ""} ${t.w}`.trim(), "Verbs like possum, volo, debeo, incipio, soleo complete their sense with an infinitive: “can …, wishes to …”.", AG("456"), [i - 1, i]);
    }
    // quod / quia after a verb of saying: the Late and Church Latin indirect statement
    if ((t.lw === "quod" || t.lw === "quia" || t.lw === "quoniam") && T[i - 1] && (SAY.has(T[i - 1].lemma) || SAY.has((T[i - 2] || {}).lemma))) {
      add("quodind", "ind", "“That” with quod / quia", snip(T, i - 1, i + 3), "In the Vulgate, the Fathers and St Thomas, a verb of saying is often followed by quod or quia with a finite verb instead of the accusative and infinitive: translate “that”. (Classical Latin uses quod only for “the fact that”.) Before a direct quotation quia is just a colon: leave it out.", AG("572") + "; Late Latin usage", span(i - 1, i + 3));
    }
    // cum with the subjunctive
    if (t.lw === "cum" && !(T[i + 1] && T[i + 1].m && T[i + 1].m[6] === "b" && T[i + 1].pos !== "V-")) {
      const e = clauseEnd(i);
      const v = T.slice(i + 1, Math.min(e + 1, i + 10)).find(x => isV(x) && "is".includes(x.m[3]));
      if (v && v.m[3] === "s") add("cumsubj", "subj", "Cum with the subjunctive", snip(T, i, T.indexOf(v)), "Cum + subjunctive is circumstantial, causal or concessive: “when / since / although”. Let the main clause decide which. With the indicative, cum is purely temporal (“when, whenever”).", AG("544–549"), span(i, T.indexOf(v)));
    }
    // ut / ne with the subjunctive: purpose or result
    if ((t.lw === "ut" || t.lw === "ne" || t.lw === "uti") && T[i + 1]) {
      const v = T.slice(i + 1, Math.min(clauseEnd(i) + 1, i + 10)).find(x => isV(x) && "is".includes(x.m[3]));
      if (v && v.m[3] === "s") {
        const result = T.slice(Math.max(0, i - 8), i).some(x => RESULT_CUE.has(x.lw));
        if (result && t.lw !== "ne") add("result", "subj", "Result clause", snip(T, i, T.indexOf(v)), "After ita, sic, tam, tantus, talis, adeo, ut + subjunctive gives the result: “so … that”. Negative: ut non.", AG("536–538"), span(i, T.indexOf(v)));
        else add("purpose", "subj", t.lw === "ne" ? "Negative purpose clause (ne)" : "Purpose clause", snip(T, i, T.indexOf(v)), t.lw === "ne" ? "Ne + subjunctive: “so that … not, lest”. After verbs of fearing, ne means “that” (and ut “that … not”)." : "Ut + subjunctive after a verb of motion, effort or command: “in order that, so that, to …”. Check the verb: after verbs of asking or commanding, it is an indirect command (“ask that …, order to …”).", AG(t.lw === "ne" ? "531, 564" : "531, 563"), span(i, T.indexOf(v)));
      } else if (v && v.m[3] === "i" && t.lw !== "ne") add("utind", "", "Ut with the indicative", snip(T, i, T.indexOf(v)), "With the indicative ut means “as” or “when” (ut dixi, “as I said”; ut vidit, “when he saw”), not “in order that”.", AG("527 f"), span(i, T.indexOf(v)));
    }
    // si / nisi: conditions
    if ((t.lw === "si" || t.lw === "nisi") && T[i + 1]) {
      const v = T.slice(i + 1, Math.min(clauseEnd(i) + 1, i + 10)).find(x => isV(x) && "is".includes(x.m[3]));
      if (v && v.m[3] === "s") add("condsubj", "subj", "Condition in the subjunctive", snip(T, i, T.indexOf(v)), `${"il".includes(v.m[2]) ? "Imperfect or pluperfect subjunctive: contrary to fact (“if he were … / had been …, he would …”)." : "Present or perfect subjunctive: should-would (“if he should …, he would …”)."}`, AG("514–517"), span(i, T.indexOf(v)));
    }
    // indirect question: a question word with the subjunctive
    if (QWORD.has(t.lw) && i > 0) {
      const v = T.slice(i + 1, Math.min(clauseEnd(i) + 1, i + 8)).find(x => isV(x) && "is".includes(x.m[3]));
      if (v && v.m[3] === "s" && !(t.lw === "quam" || t.lw === "quo")) add("indq", "subj", "Indirect question", snip(T, i, T.indexOf(v)), `A question reported after a verb of asking, knowing or wondering: its verb goes into the subjunctive but is translated as an indicative.${t.lw === "utrum" ? " Utrum … an: “whether … or”." : ""}`, AG("573–575"), span(i, T.indexOf(v)));
    }
    // perfect passive (or deponent) with a form of sum
    if (isV(t) && m[3] === "p" && m[2] === "r" && m[6] === "n") {
      const sj = [i - 2, i - 1, i + 1, i + 2].find(j => T[j] && T[j].lemma === "sum" && T[j].m && "is".includes(T[j].m[3]));
      if (sj != null) {
        const sm = T[sj].m, dep = /or$/.test(t.lemma);
        add("perfpass", dep ? "dep" : "pass", dep ? "Perfect of a deponent" : "Perfect passive", snip(T, Math.min(i, sj), Math.max(i, sj)),
          `Perfect participle + a form of sum makes one verb: ${dep ? "active in meaning (deponent): “he has …-ed”." : "“was / has been …-ed”."} ${sm[2] === "i" ? "Here with the imperfect of sum: pluperfect, “had been …-ed”." : sm[2] === "f" ? "Here with the future of sum: future perfect, “will have been …-ed”." : "With est / sunt it is perfect; with erat it would be pluperfect (“had been”)."} Sometimes it simply describes a state (“was covered”).`, AG("495, 190"), [i, sj]);
      }
    }
    // gerund and gerundive
    if (isV(t) && m[3] === "d") add("gerund", "part", "Gerund", t.w, "A verbal noun (“of loving, by loving”), active in sense, used in the oblique cases.", AG("501–507"), [i]);
    if (isV(t) && m[3] === "g") {
      const sum = [i - 2, i - 1, i + 1, i + 2].find(j => T[j] && T[j].lemma === "sum");
      if (sum != null) add("periph", "pass", "Passive periphrastic (obligation)", snip(T, Math.min(i, sum), Math.max(i, sum)), "Gerundive + sum: “must be …, ought to be …”. The person who must act stands in the dative (dative of agent). Impersonal in the neuter: dicendum est, “one must say”.", AG("500, 374"), span(Math.min(i, sum), Math.max(i, sum)));
      else add("gerundive", "part", "Gerundive", t.w, "A verbal adjective agreeing with a noun: with ad or causa it expresses purpose (ad pacem petendam, “to seek peace”); alone it often means “to be …-ed”.", AG("500–506"), [i]);
    }
    // deponents
    if (isV(t) && m[4] === "p" && /or$/.test(t.lemma) && "isn".includes(m[3])) add("dep", "dep", "Deponent verb", t.w, `${t.lemma} is deponent: passive in form, active in meaning.`, AG("190"), [i]);
    // imperatives, noli + infinitive
    if (isV(t) && m[3] === "m") add("imp", "imp", "Imperative", t.w, "A command. Negative commands use noli / nolite + infinitive (“do not …”) or ne + perfect subjunctive.", AG("448–450"), [i]);
    if (t.lemma === "nolo" && T[i + 1] && isV(T[i + 1]) && T[i + 1].m[3] === "n" && t.m && t.m[3] === "m") add("noli", "imp", "Noli + infinitive", `${t.w} ${T[i + 1].w}`, "Noli / nolite + infinitive is the usual negative command: “do not …”.", AG("450"), [i, i + 1]);
    // comparison
    if (t.m && t.m[7] === "c") {
      const abl = T[i + 1] && T[i + 1].m && T[i + 1].m[6] === "b" && T[i + 1].pos !== "V-" ? T[i + 1] : null;
      const quam = T.slice(i + 1, i + 4).find(x => x.lw === "quam");
      add("comp", "comp", "Comparative", abl ? `${t.w} ${abl.w}` : quam ? `${t.w} … quam` : t.w, abl ? "The thing compared stands in the ablative (ablative of comparison): “greater than …”." : "With quam, the things compared are in the same case. Alone, a comparative can mean “rather …, too …”.", AG(abl ? "406" : "291–293, 407"), abl ? [i, i + 1] : [i]);
    }
    if (t.m && t.m[7] === "s") add("sup", "comp", "Superlative", t.w, "“Most …, very …”; with a partitive genitive, “the …-est of”.", AG("291, 346"), [i]);
    // connecting relative at the start of a sentence
    if (t.pos === "Pr" && (i === 0 || (T[i - 1] && T[i - 1].stop))) add("connrel", "rel", "Relative pronoun opening a sentence", t.w, "Either it links back to the last sentence (connecting relative: qui = “and he”, quod = “and this”), or, with no antecedent, it means “he who, those who” and its own verb follows. Find the verb of the relative clause first.", AG("308 f"), [i]);
  });
  return Object.values(notes);
}

/* Turns of phrase proper to a kind of Latin: found by their words in any text. */
const PHRASES = {
  thomas: [
    [/\b(videtur quod|videtur quod non)\b/i, "Videtur quod …", "Opens an objection: “It seems that …”. What follows is the view St Thomas will answer, not his own."],
    [/\bsed contra\b/i, "Sed contra", "“On the contrary”: an authority (Scripture, a Father, the Philosopher) against the objections. Not yet the full answer."],
    [/\brespondeo dicendum\b/i, "Respondeo dicendum quod", "“I answer that one must say that …”: dicendum (gerundive, A&G §500) + quod-clause. The body of the article: St Thomas's own position."],
    [/\bad (primum|secundum|tertium|quartum|quintum|sextum) (ergo )?dicendum\b/i, "Ad primum ergo dicendum quod", "“To the first, then, one must say that …”: the reply to each objection in order."],
    [/\b(ut patet|sicut patet|ut patebit)\b/i, "Ut patet", "“As is evident / as is clear”: a medieval formula pointing to an argument already made or plain to see. Translate lightly (“as is clear”), not “as it lies open”."],
    [/\b(ut dictum est|sicut dictum est|ut supra dictum est|sicut supra dictum est|ut ostensum est)\b/i, "Ut dictum est", "“As has been said”: a back-reference within the Summa (often to an earlier article). Supra = above; infra = below."],
    [/\bpraeterea\b/i, "Praeterea", "“Further”: introduces the next objection (or the next argument)."],
    [/\butrum\b/i, "Utrum", "“Whether”: every article's title is an indirect question (A&G §335, 573)."],
    [/\b(inquantum|in quantum)\b/i, "Inquantum", "“Insofar as, inasmuch as”: one word in scholastic Latin, marking the respect under which a thing is considered."],
    [/\bsecundum quod\b/i, "Secundum quod", "“According as, insofar as”: like inquantum. (Secundum alone = “according to”.)"],
    [/\bper se\b/i, "Per se / per accidens", "Technical pair: “of itself, essentially” vs “incidentally, by something else”. Keep the Latin terms or translate consistently."],
    [/\bquantum ad\b/i, "Quantum ad", "“As regards, as to”: names the aspect under discussion."],
    [/\bratio(nem|ne|nis)?\b/i, "Ratio", "A key scholastic word with many senses: “reason, notion, aspect, nature, argument, account”. Choose by context: sub ratione boni = “under the aspect of good”."],
    [/\bsimpliciter\b/i, "Simpliciter / secundum quid", "“Absolutely, without qualification” vs “in a certain respect”."],
    [/\bdicendum (est )?quod\b/i, "Dicendum quod", "Impersonal gerundive + quod: “it must be said that”. Medieval Latin uses quod-clauses where Cicero used accusative + infinitive (A&G §572)."],
    [/\b(quia|quod) (est|sunt|non)\b/i, "Quod / quia = “that”", "In St Thomas, quod and quia often introduce reported statements (“that”) after dico, ostendo, patet, manifestum est."],
    [/\b(Philosophus|Commentator|Magister|Apostolus|Damascenus|Dionysius)\b/, "The authorities", "Philosophus = Aristotle; Commentator = Averroes; Magister = Peter Lombard; Apostolus = St Paul; Damascenus = St John Damascene; Dionysius = Pseudo-Dionysius."]
  ],
  bible: [
    [/\bet factum est\b/i, "Et factum est", "“And it came to pass”: a Hebraism (wayehi) opening a new episode; the event follows, often with et or a cum-clause."],
    [/\b(ecce|et ecce)\b/i, "Ecce", "“Behold, lo”: draws attention; often just “there was …, suddenly …”."],
    [/\bamen,? (amen,? )?dico\b/i, "Amen dico vobis", "“Amen I say to you”: Christ's solemn formula; amen keeps its Hebrew form, not “so be it”."],
    [/\bdixit (autem |ergo )?ad\b/i, "Dixit ad …", "Dicere ad + acc. (“said to”) is biblical and Late Latin for the classical dative (dixit ei)."],
    [/\bquia\b/i, "Quia", "In the Vulgate quia often means “that” after verbs of saying or knowing, or simply marks a quotation (“recitative quia”): then leave it untranslated."],
    [/\bin illo tempore\b/i, "In illo tempore", "“At that time”: the liturgical opening of the Gospel, not part of the Gospel text itself."],
    [/\b(filius hominis|filii hominum)\b/i, "Filius hominis", "“Son of man”: a Semitic idiom (= a human being); in the Gospels, Christ's title for himself."],
    [/\b(in saecula saeculorum|in saeculum saeculi)\b/i, "In saecula saeculorum", "“For ever and ever”, literally “unto the ages of the ages”: a Hebrew-style superlative."],
    [/\b(canticum canticorum|sancta sanctorum|rex regum|dominus dominantium|vanitas vanitatum)\b/i, "Rex regum", "Noun + its own genitive plural is the Hebrew superlative: “the greatest king, the holiest place”."],
    [/\bin (gladio|virtute|nomine|spiritu|sanguine)\b/i, "In + ablative of means", "Biblical in often marks the instrument: in gladio, “with the sword” (classical: ablative of means alone, A&G §409)."],
    [/\b(a facie|ante faciem|in conspectu)\b/i, "A facie", "“From the face of” = “from before, away from”; in conspectu = “in the sight of”: Hebraisms for simple prepositions."],
    [/\bquoniam\b/i, "Quoniam", "In the Psalms and Gospels usually “for, because”, or “that” after verbs of saying."]
  ],
  church: [
    [/\b(dilectissimi|fratres carissimi)\b/i, "Dilectissimi", "“Dearly beloved”: the preacher's address. Patristic sermons are built on antithesis and parallel clauses: find the pairs."],
    [/\b(Per Dominum nostrum|Per eundem)\b/i, "Per Dominum nostrum", "The conclusion of a Collect: “Through our Lord Jesus Christ …”. Prayers are often one sentence: Deus, qui … (relative clause praising God), da / praesta ut … (the petition, ut + subj.)."],
    [/\b(quaesumus|tribue|concede|praesta) .{0,40}\but\b/i, "Petition with ut", "Liturgical petitions: verb of asking (quaesumus, da, concede, praesta) + ut + subjunctive: “grant that …” (A&G §563)."],
    [/\b(beatus|beati|beata)\b/i, "Beatus", "“Blessed, happy”; in sermons often a perfect participle of beo used as an adjective."],
    [/\b(saeculum|saeculi|saeculo)\b/i, "Saeculum", "In Church Latin: “the world, this age” (in saecula = for ever)."]
  ],
  hymn: [
    [/\w+que\b/i, "-que", "Enclitic “and”: joins its word to the one before. Poets also use -que … -que, “both … and”."],
    [/\b\w+(ere)\b/i, "-ere = -erunt", "In verse, a 3rd plural perfect may end in -ēre for -ērunt (fecere = fecerunt)."],
    [/./, "Word order in hymns", "Hymns bend word order for the metre: an adjective can stand far from its noun. Match by endings, not position; and expect the subject late."]
  ]
};
function phraseTips(text, kinds) {
  const out = [];
  kinds.forEach(k => (PHRASES[k] || []).forEach(([re, title, note]) => { const m = text.match(re); if (m && !out.some(o => o.title === title)) out.push({ id: "ph:" + title, title, note, ex: [m[0]], ctx: k }); }));
  return out;
}
const KINDS_OF_PART = { nt: ["bible"], ps: ["bible"], st: ["thomas"], se: ["church", "bible"], hy: ["hymn", "church"] };
const CTX_L = { thomas: "Scholastic Latin", bible: "Biblical Latin", church: "Church Latin", hymn: "Hymns" };

function GrammarNotes({ lex, verses, part, prog, onDrill, text, onHighlight, keyPrefix }) {
  /* tapping a note lights up its words in the passage above (keys as LatinWords makes them: "verse:word", or "word" in the drill) */
  const [act, setAct] = useState(null);
  const [st, setSt] = useStudyPrefs();
  const [seen, setSeen] = useState(() => new Set());   // learning mode: notes opened so far (each shows its title until tapped)
  const keyOf = useMemo(() => {
    const out = [];
    (verses || []).forEach((v, vi) => (v[1].match(WORD_RE) || []).forEach((_, k) => out.push(keyPrefix === "" ? String(out.length) : vi + ":" + k)));
    return out;
  }, [verses, keyPrefix]);
  useEffect(() => { setAct(null); setSeen(new Set()); onHighlight && onHighlight(null); }, [verses]);
  const shown = id => !st.learn || seen.has(id);
  const reveal = id => { if (!seen.has(id)) setSeen(new Set([...seen, id])); };
  const [open, setOpen0] = useState(() => { const v = readLocal("lectio-vulgata-gnotes"); return v == null ? true : !!v; });
  const setOpen = v => { setOpen0(v); writeLocal("lectio-vulgata-gnotes", v ? 1 : 0); };
  const notes = useMemo(() => grammarNotes(lex, verses), [lex, verses]);
  const tips = useMemo(() => phraseTips(text != null ? text : (verses || []).map(v => v[1]).join(" "), KINDS_OF_PART[part] || ["church"]), [verses, part, text]);
  if (!notes.length && !tips.length) return null;
  /* adaptive order: what this student keeps missing first */
  const weak = t => {
    if (!t || !prog) return 0;
    const sk = prog.skill && prog.skill[t];
    const miss = (prog.mistakes || []).filter(m => m.concept === t).length;
    return (miss >= 2 ? 2 : 0) + (sk && sk.s < 0.5 ? 1 : 0);
  };
  const ranked = notes.map(n => ({ ...n, w: weak(n.tag) })).sort((a, b) => b.w - a.w);
  const count = ranked.length + tips.length;
  return (
    <section className="rounded-lg border border-rule bg-leaf px-5 py-3" aria-label="Grammar points in this passage">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex w-full items-baseline justify-between gap-2 text-left">
        <span className="smallcaps text-[14px] font-semibold text-rubric">Grammar in this passage</span>
        <span className="num text-[13px] text-soft">{count} point{count === 1 ? "" : "s"}{ranked.some(n => n.w) ? " · your weak spots first" : ""} <span className="text-rubric">{open ? "▴" : "▾"}</span></span>
      </button>
      {open && (
        <div className="mt-2 flex flex-col gap-2.5">
          {ranked.map(n => (
            <div key={n.id} role={(onHighlight && n.at && n.at.length) || !shown(n.id) ? "button" : undefined} tabIndex={(onHighlight && n.at && n.at.length) || !shown(n.id) ? 0 : undefined} aria-pressed={onHighlight ? act === n.id : undefined}
              onClick={e => { if (e.target.closest("button")) return; reveal(n.id); if (!onHighlight || !n.at || !n.at.length || e.target.closest("button")) return; const on = act === n.id ? null : n.id; setAct(on); onHighlight(on ? new Set(n.at.map(j => keyOf[j])) : null); }}
              onKeyDown={e => { if (e.key === "Enter" || e.key === " ") reveal(n.id); if (onHighlight && n.at && n.at.length && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); const on = act === n.id ? null : n.id; setAct(on); onHighlight(on ? new Set(n.at.map(j => keyOf[j])) : null); } }}
              className={`rounded-md border px-3 py-2 ${onHighlight && n.at && n.at.length ? "cursor-pointer" : ""} ${act === n.id ? "border-rubric bg-rubrictint" : n.w ? "border-rubric bg-paper" : "border-rule bg-paper hover:border-soft"}`}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                <span className="text-[14px] font-semibold text-ink">{n.title}{n.w >= 2 ? <span className="ml-1.5 text-[12px] font-normal text-rubric">· you’ve missed this before</span> : n.w ? <span className="ml-1.5 text-[12px] font-normal text-rubric">· a weak spot</span> : null}</span>
                <span className="num text-[12px] text-soft">{n.ag}</span>
              </div>
              {!shown(n.id) ? <p className="text-[13px] text-soft">Find it yourself, or tap to see the words and the note.</p> : <>
              {n.ex.length > 0 && <p lang="la" className="latin text-[14px] text-rubric">{n.ex.join(" · ")}</p>}
              <p className="text-[14px] leading-snug text-ink">{n.note}</p>
              </>}
              {n.tag && CONCEPTS[n.tag] && onDrill && <button type="button" className="mt-1 text-[12px] text-rubric underline underline-offset-2" onClick={() => onDrill(n.tag)}>Drill verses with {CONCEPTS[n.tag].toLowerCase()} →</button>}
            </div>
          ))}
          {tips.length > 0 && <p className="smallcaps mt-1 text-[12px] font-semibold text-soft">{[...new Set(tips.map(t => CTX_L[t.ctx]))].join(" · ")}</p>}
          {tips.map(t => (
            <div key={t.id} role={shown(t.id) ? undefined : "button"} tabIndex={shown(t.id) ? undefined : 0} onClick={() => reveal(t.id)} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); reveal(t.id); } }}
              className={`rounded-md border border-dashed border-rule bg-paper px-3 py-2 ${shown(t.id) ? "" : "cursor-pointer"}`}>
              <span className="text-[14px] font-semibold text-ink">{t.title}</span>{shown(t.id) && t.ex[0] && t.ex[0].length > 1 && <span lang="la" className="latin ml-2 text-[13px] text-rubric">{t.ex[0]}</span>}
              {shown(t.id) ? <p className="text-[14px] leading-snug text-ink">{t.note}</p> : <p className="text-[13px] text-soft">Tap for the tip.</p>}
            </div>
          ))}
          <div className="flex flex-wrap gap-x-4 text-[13px]">
            {st.learn && [...ranked, ...tips].some(n => !seen.has(n.id)) && <button type="button" className="text-rubric underline underline-offset-2" onClick={() => setSeen(new Set([...ranked, ...tips].map(n => n.id)))}>Show every note</button>}
            <button type="button" className="text-soft underline underline-offset-2" onClick={() => setSt({ learn: !st.learn })}>{st.learn ? "Learning mode is on (try it first): turn off" : "Turn on learning mode (try it first)"}</button>
          </div>
          <p className="text-[11px] text-soft">{onHighlight ? "Tap a note to light up its words in the passage. " : ""}Found from the parsed words, so treat them as pointers, not verdicts. A&G = Allen and Greenough, New Latin Grammar (1903), by section.</p>
        </div>
      )}
    </section>
  );
}
/* For texts without parsed words (the Library, the Summa reader): the phrase tips only. */
function PhraseTips({ text, kinds }) {
  const [open, setOpen] = useState(false);
  const tips = useMemo(() => phraseTips(text, kinds), [text, kinds.join()]);
  if (!tips.length) return null;
  return (
    <section className="rounded-lg border border-rule bg-leaf px-5 py-3" aria-label="Notes on this kind of Latin">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex w-full items-baseline justify-between gap-2 text-left">
        <span className="smallcaps text-[14px] font-semibold text-rubric">{[...new Set(kinds.map(k => CTX_L[k]))].join(" · ")}: phrases here</span>
        <span className="num text-[13px] text-soft">{tips.length} <span className="text-rubric">{open ? "▴" : "▾"}</span></span>
      </button>
      {open && <div className="mt-2 flex flex-col gap-2">{tips.map(t => (
        <div key={t.id} className="rounded-md border border-rule bg-paper px-3 py-2">
          <span className="text-[14px] font-semibold text-ink">{t.title}</span>{t.ex[0] && t.ex[0].length > 1 && <span lang="la" className="latin ml-2 text-[13px] text-rubric">{t.ex[0]}</span>}
          <p className="text-[14px] leading-snug text-ink">{t.note}</p>
        </div>
      ))}</div>}
    </section>
  );
}

/* ---------- Sentence by sentence: one verse or sentence at a time, help chips that light up their words, the translation on
   request, and "I needed help / I got it" (remembered per passage, shown as the progress bar). ---------- */
const SBS_KEY = "lectio-vulgata-sbs";
/* Break each verse (a Matins lesson can be one long "verse") into its sentences, keeping each word's parsing.
   A break comes after . ? ! before a capital, not after a number or a short reference (Matth. 5, cap. 3), and a
   fragment under four words joins the next. The English is split the same way when its sentences line up. */
function splitSentences(text) {
  const out = []; let start = 0;
  const re = /([.?!])(["”’)]*)\s+(?=[A-ZÆŒ])/g; let m;
  while ((m = re.exec(text))) {
    const before = text.slice(start, m.index).match(/(\S+)$/);
    const last = before ? before[1] : "";
    if (m[1] === "." && (/\d$/.test(last) || /^[A-Z][a-z]{0,4}$/.test(last))) continue;
    out.push(text.slice(start, m.index + m[0].length).trim()); start = m.index + m[0].length;
  }
  out.push(text.slice(start).trim());
  const merged = [];
  out.filter(Boolean).forEach(t => { if (merged.length && (merged[merged.length - 1].match(WORD_RE) || []).length < 4) merged[merged.length - 1] += " " + t; else merged.push(t); });
  if (merged.length > 1 && (merged[merged.length - 1].match(WORD_RE) || []).length < 4) { const t = merged.pop(); merged[merged.length - 1] += " " + t; }
  return merged;
}
function sentencesOf(verses) {
  const out = [];
  verses.forEach(v => {
    const la = splitSentences(v[1] || "");
    if (la.length < 2) { out.push({ v, label: v[0], whole: false }); return; }
    const en = splitSentences(v[2] || "");
    let k = 0;
    la.forEach((t, j) => {
      const n = (t.match(WORD_RE) || []).length;
      out.push({ v: [v[0], t, en.length === la.length ? en[j] : v[2], v[3] ? v[3].slice(k, k + n) : null], label: v[0], whole: en.length !== la.length, sub: j + 1, of: la.length });
      k += n;
    });
  });
  return out;
}
/* Each grammar box gets its own colour, and its words in the sentence are underlined in that colour
   (filled in when the box is tapped). Six colours (--g1 … --g6 in page.html, light and dark), then they repeat. */
const GCOL = 6;
const gStyle = n => ({ "--gc": `var(--g${n % GCOL + 1})`, "--gt": `var(--g${n % GCOL + 1}-tint)` });
/* Study settings shared by the sentence reader and the grammar notes: learning mode ("try it first": plain text, help on demand)
   and how help points colour their words. Key lectio-vulgata-study; other open views follow through the lv-study event. */
const STUDY_KEY = "lectio-vulgata-study";
const STUDY_DEF = { learn: true, hl: "underline" };   // hl: underline | fill | off
function useStudyPrefs() {
  const [p, setP] = useState(() => ({ ...STUDY_DEF, ...(readLocal(STUDY_KEY) || {}) }));
  useEffect(() => { const h = e => setP(e.detail); window.addEventListener("lv-study", h); return () => window.removeEventListener("lv-study", h); }, []);
  const set = ch => { const n = { ...p, ...ch }; writeLocal(STUDY_KEY, n); window.dispatchEvent(new CustomEvent("lv-study", { detail: n })); };
  return [p, set];
}
function StudySettings({ st, setSt }) {
  const opt = (on, label, f) => <button type="button" aria-pressed={on} onClick={f} className={`rounded-full border px-3 py-1 text-[14px] ${on ? "border-rubric bg-rubrictint font-semibold text-ink" : "border-rule bg-paper text-soft hover:border-soft"}`}>{label}</button>;
  return (
    <section className="reveal flex flex-col gap-3 rounded-lg border border-rule bg-leaf px-4 py-3" aria-label="Study settings">
      <div className="flex flex-col gap-1.5">
        <span className="smallcaps text-[13px] font-semibold text-soft">Learning mode</span>
        <div className="flex flex-wrap gap-2">{opt(st.learn, "Try it first", () => setSt({ learn: true }))}{opt(!st.learn, "Show all help at once", () => setSt({ learn: false }))}</div>
        <p className="text-[13px] text-soft">{st.learn ? "Each sentence starts plain. Open hints one at a time, then all the highlighting when you want it." : "Each sentence opens with its help points and colours showing."}</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="smallcaps text-[13px] font-semibold text-soft">Highlighting</span>
        <div className="flex flex-wrap gap-2">{opt(st.hl === "underline", "Coloured underline", () => setSt({ hl: "underline" }))}{opt(st.hl === "fill", "Coloured fill", () => setSt({ hl: "fill" }))}{opt(st.hl === "off", "No colours", () => setSt({ hl: "off" }))}</div>
      </div>
    </section>
  );
}
function SentenceReader({ lex, verses: verses0, part, prog, title, storeKey: key0, onClose, onTable, onDone }) {
  const sents = useMemo(() => sentencesOf(verses0), [verses0]);
  const verses = sents.map(x => x.v);
  const storeKey = key0 + (sents.length !== verses0.length ? ":s" : "");
  const saved = (readLocal(SBS_KEY) || {})[storeKey] || {};
  const [i, setI] = useState(() => Math.min(saved.i || 0, verses.length - 1));
  const [res, setRes] = useState(() => saved.r || {});     // row index -> "got" | "help"
  const [chip, setChip] = useState(null);
  const [showEn, setShowEn] = useState(false);
  const [word, setWord] = useState(null);                   // { w, entry }
  const [done, setDone] = useState(false);
  const [st, setSt] = useStudyPrefs();
  const [gear, setGear] = useState(false);
  const [step, setStep] = useState(0);                      // learning mode: 0 plain, 1 hints listed, 2 everything highlighted
  const [allNotes, setAllNotes] = useState(false);
  const [used, setUsed] = useState(false);                  // any help opened on this sentence
  const topRef = useRef(null);
  useEffect(() => { const all = readLocal(SBS_KEY) || {}; all[storeKey] = { i, r: res }; const ks = Object.keys(all); if (ks.length > 60) delete all[ks[0]]; writeLocal(SBS_KEY, all); }, [i, res]);
  useEffect(() => { setChip(null); setShowEn(false); setWord(null); setStep(0); setAllNotes(false); setUsed(false); topRef.current && topRef.current.scrollIntoView({ block: "start" }); }, [i]);
  const go = j => { if (j < 0 || j >= verses.length) return; setDone(false); setI(j); };
  const goRef = useRef(go); goRef.current = go;
  const iRef = useRef(i); iRef.current = i;
  useEffect(() => {
    const h = e => {
      if (e.key === "Escape") onClose();
      if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      if (e.key === "ArrowRight") goRef.current(iRef.current + 1);
      if (e.key === "ArrowLeft") goRef.current(iRef.current - 1);
    };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, []);
  const v = verses[i];
  const notes = useMemo(() => {
    const n = grammarNotes(lex, [v]);
    const weak = t => { if (!t || !prog) return 0; const sk = prog.skill && prog.skill[t]; return ((prog.mistakes || []).filter(m => m.concept === t).length >= 2 ? 2 : 0) + (sk && sk.s < 0.5 ? 1 : 0); };
    return n.map(x => ({ ...x, w: weak(x.tag) })).sort((a, b) => b.w - a.w);
  }, [i]);
  const tips = useMemo(() => phraseTips(v[1], KINDS_OF_PART[part] || ["church"]).filter(t => t.title !== "Word order in hymns"), [i]);
  const sInfo = sents[i] || {};
  const items = [...notes, ...tips];
  const learn = st.learn;
  const full = !learn || step >= 2;                          // all colours and word snippets showing
  const showHelp = !learn || step >= 1;
  const active = items.find(x => x.id === chip);
  const lit = new Set(active && active.at ? active.at : []);
  const colOf = {}, wordCol = {};   // box id -> colour number; word index -> colour of the first box that covers it
  items.filter(x => x.at && x.at.length).forEach((x, n) => { colOf[x.id] = n; x.at.forEach(j => { if (!(j in wordCol)) wordCol[j] = n; }); });
  const colours = st.hl !== "off";
  const words = v[1].split(/([A-Za-z]+)/);
  let k = -1;
  const pick = id => { setChip(chip === id ? null : id); setUsed(true); };
  function mark(r) {
    const next = { ...res, [i]: r };
    setRes(next);
    if (i + 1 < verses.length) setI(i + 1);
    else { setDone(true); onDone && onDone(next); }
  }
  const got = Object.values(res).filter(x => x === "got").length, helped = Object.values(res).filter(x => x === "help").length;
  const groups = [["Grammar", notes], ["Phrases", tips]].filter(g => g[1].length);
  const chipBtn = x => {
    const c = colours && x.id in colOf && (full || chip === x.id);
    return (
      <button key={x.id} type="button" aria-pressed={chip === x.id} onClick={() => pick(x.id)}
        style={c ? gStyle(colOf[x.id]) : undefined}
        className={`flex max-w-full items-center gap-2 rounded-full border px-3 py-1.5 text-[14px] text-ink ${c ? (chip === x.id ? "border-2 border-[var(--gc)] bg-[var(--gt)]" : "border-[var(--gc)] bg-[var(--gt)]") : chip === x.id ? "border-rubric bg-rubrictint" : "border-rule bg-leaf"}`}>
        <span className={`h-2.5 w-2.5 flex-none rounded-full ${c ? "bg-[var(--gc)]" : x.at && x.at.length && colours ? "bg-[var(--ink-soft)]" : "bg-[var(--rule)]"}`} />
        <span className="font-semibold">{x.title}</span>
        {x.w >= 2 && <span className="text-[12px] font-semibold text-rubric" title="You’ve missed this in your own translations">!</span>}
        {full && x.ex && x.ex[0] && x.at && <span lang="la" className="latin truncate text-soft">{x.ex[0].length > 18 ? x.ex[0].slice(0, 16) + "…" : x.ex[0]}</span>}
      </button>
    );
  };
  const noteBox = (x, key) => {
    const c = colours && x.id in colOf;
    return (
      <div key={key} className={`reveal rounded-lg border bg-leaf px-4 py-3 ${c ? "border-l-4 border-[var(--gc)]" : "border-rule"}`} style={c ? gStyle(colOf[x.id]) : undefined}>
        <p className="text-[15px] font-semibold text-ink">{x.title} {x.ag && <span className="num ml-1 text-[13px] font-normal text-soft">{x.ag}</span>}</p>
        {x.ex && x.ex[0] && <p lang="la" className={`latin text-[15px] ${c ? "text-[var(--gc)]" : "text-rubric"}`}>{x.ex.join(" · ")}</p>}
        <p className="mt-1 text-[15px] leading-snug text-ink">{x.note}</p>
        {x.w >= 2 && <p className="mt-1 text-[13px] text-rubric">You’ve missed this in your own translations: take it slowly.</p>}
      </div>
    );
  };
  const navBtn = (j, label, aria) => <button type="button" aria-label={aria} disabled={j < 0 || j >= verses.length} onClick={() => go(j)} className="rounded-md border border-rule px-2.5 py-1 text-[15px] text-rubric disabled:opacity-30">{label}</button>;
  return (
    <div className="fixed inset-0 z-30 overflow-auto bg-paper" role="dialog" aria-label="Sentence by sentence">
      <div ref={topRef} className="mx-auto flex min-h-full max-w-[46rem] flex-col gap-4 px-4 pb-28 pt-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button type="button" onClick={onClose} className="text-[15px] font-medium text-rubric">‹ Back to the passage</button>
          <div className="flex items-center gap-2">
            {navBtn(i - 1, "‹", "Previous sentence")}
            <span className="num text-[14px] text-soft">{done ? "Done" : `${sents.length !== verses0.length ? "Sentence" : "Verse"} ${i + 1} of ${verses.length}`}</span>
            {navBtn(i + 1, "›", "Next sentence")}
            <button type="button" aria-expanded={gear} aria-label="Study settings" title="Study settings" onClick={() => setGear(!gear)} className={`ml-1 rounded-md border px-2.5 py-1 text-[15px] ${gear ? "border-rubric bg-rubrictint text-ink" : "border-rule text-rubric"}`}>⚙</button>
          </div>
        </div>
        <div className="flex gap-1">
          {verses.map((_, j) => <button key={j} type="button" aria-label={`Go to ${j + 1}${res[j] === "got" ? ", got it" : res[j] === "help" ? ", needed help" : ""}`} aria-current={j === i && !done ? "step" : undefined} onClick={() => go(j)} className={`h-2 flex-1 rounded-full ${res[j] === "got" ? "bg-[var(--ok)]" : res[j] === "help" ? "bg-[var(--mid)]" : j === i && !done ? "bg-rubric" : "bg-[var(--rule)]"}`} />)}
        </div>
        {gear && <StudySettings st={st} setSt={s => { setSt(s); if ("learn" in s) { setStep(0); setChip(null); setAllNotes(false); } }} />}
        {done ? (
          <section className="flex flex-col gap-3 rounded-lg border border-rule bg-leaf px-5 py-5">
            <h2 className="latin text-[1.2rem] font-bold text-ink">{title}</h2>
            <p className="text-[15px] text-ink"><strong className="num text-ok">{got}</strong> on your own · <strong className="num text-mid">{helped}</strong> with help.</p>
            <p className="text-[14px] text-soft">Now translate the whole passage at once and check it: that is what goes into your grades.</p>
            <div className="flex flex-wrap gap-2">
              <Btn variant="primary" onClick={onClose}>Translate the passage →</Btn>
              <Btn onClick={() => { setRes({}); setDone(false); setI(0); }}>Go through again</Btn>
              {Object.values(res).some(x => x === "help") && <Btn onClick={() => { setDone(false); setI(+Object.keys(res).find(j => res[j] === "help")); }}>Review the ones I needed help with</Btn>}
            </div>
          </section>
        ) : (
          <div key={i} className="reveal flex flex-col gap-4">
          <p className="smallcaps text-[13px] text-soft">{title}{v[0] ? ` · ${typeof v[0] === "number" ? v[0] : ""}` : ""}{sInfo.of ? ` · sentence ${sInfo.sub} of ${sInfo.of}` : ""}</p>
          <p lang="la" className="latin text-[1.55rem] leading-[1.7] text-ink">
            {words.map((t, j) => {
              if (j % 2 === 0) return t;
              k++;
              const my = k, entry = v[3] ? v[3][my] : null;
              const on = lit.has(my);
              const cn = !colours ? undefined : on ? colOf[active.id] : full ? wordCol[my] : undefined;
              const deco = cn === undefined ? "underline decoration-dotted decoration-[var(--rule)]" : st.hl === "fill" ? "no-underline bg-[var(--gt)]" : "underline decoration-solid decoration-2 decoration-[var(--gc)]";
              const onCls = on ? (cn === undefined ? "bg-rubrictint text-rubric" : "bg-[var(--gt)] text-[var(--gc)]") : "";
              return <span key={j} role="button" tabIndex={0} onClick={() => { setWord(word && word.k === my ? null : { w: t, entry, k: my }); setUsed(true); }}
                onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setWord({ w: t, entry, k: my }); setUsed(true); } }}
                className={`cursor-pointer rounded px-0.5 underline-offset-[6px] ${deco} ${onCls} ${word && word.k === my ? "outline outline-1 outline-[var(--rubric)]" : ""}`}
                style={cn === undefined ? undefined : gStyle(cn)}>{t}</span>;
            })}
          </p>
          {learn && step === 0 && (
            <div className="flex flex-col gap-2 rounded-lg border border-dashed border-rule px-4 py-3">
              <p className="text-[14px] text-soft">Try it on your own first. Tap a word if you need its meaning.</p>
              {items.length > 0 && <div><button type="button" className="text-[15px] font-medium text-rubric underline underline-offset-2" onClick={() => { setStep(1); setUsed(true); }}>Show hints ({items.length})</button></div>}
            </div>
          )}
          {showHelp && items.length > 0 && <>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="smallcaps text-[13px] font-semibold text-soft">Help</span>
              {learn && step === 1 && <span className="text-[13px] text-soft">Open one point at a time.</span>}
            </div>
            {groups.map(([g, xs]) => (
              <div key={g} className="flex flex-col gap-1.5">
                {groups.length > 1 && <span className="text-[12px] font-semibold text-soft">{g}</span>}
                <div className="flex flex-wrap gap-2">{xs.map(chipBtn)}</div>
              </div>
            ))}
          </>}
          {active && !allNotes && noteBox(active, "a")}
          {allNotes && items.map(x => noteBox(x, x.id))}
          {showHelp && items.length > 0 && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[14px]">
              {learn && step === 1 && <button type="button" className="font-medium text-rubric underline underline-offset-2" onClick={() => setStep(2)}>Show all the highlighting</button>}
              {items.length > 1 && <button type="button" className="font-medium text-rubric underline underline-offset-2" onClick={() => { setAllNotes(!allNotes); setUsed(true); if (learn) setStep(2); }}>{allNotes ? "Show one note at a time" : "Explain everything"}</button>}
              {learn && step === 2 && <button type="button" className="text-soft underline underline-offset-2" onClick={() => { setStep(0); setChip(null); setAllNotes(false); }}>Hide the help</button>}
            </div>
          )}
          {word && (
            lex && readings(word.entry).ids.length
              ? <WordPanel lex={lex} word={word.w} entry={word.entry} onClose={() => setWord(null)} where={title} onTable={onTable} />
              : <LsGuessPanel word={word.w} onClose={() => setWord(null)} />
          )}
          {(!learn || showEn) && (
            <div className="rounded-lg border border-rule bg-leaf px-4 py-3">
              {showEn
                ? <><span className="smallcaps text-[13px] font-semibold text-soft">{sInfo.whole ? "Translation of the whole passage" : "Translation"}</span><p lang="en" className="mt-1 text-[1.05rem] leading-relaxed text-ink">{v[2]}</p></>
                : <button type="button" className="text-[15px] font-medium text-rubric underline underline-offset-2" onClick={() => setShowEn(true)}>Show the translation</button>}
            </div>
          )}
          </div>
        )}
      </div>
      {!done && (
        <div className="fixed inset-x-0 bottom-0 border-t border-rule bg-paper px-4 py-3">
          {learn && !showEn ? (
            <div className="mx-auto max-w-[46rem]">
              <button type="button" onClick={() => setShowEn(true)} className="w-full rounded-lg bg-rubric px-4 py-3 text-[16px] font-semibold text-paper">Check translation</button>
            </div>
          ) : (
            <div className="mx-auto grid max-w-[46rem] grid-cols-2 gap-3">
              <button type="button" onClick={() => mark("help")} className={`rounded-lg border border-rule bg-leaf px-4 py-3 text-[16px] font-semibold text-ink hover:border-soft ${learn && used ? "ring-2 ring-offset-1 ring-[var(--ink-soft)]" : ""}`}>I needed help</button>
              <button type="button" onClick={() => mark("got")} className="rounded-lg bg-[var(--ok)] px-4 py-3 text-[16px] font-semibold text-paper">I got it</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
