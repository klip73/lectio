/* ---------- Latin morphology: every form of a verb, noun, adjective or pronoun, generated from its dictionary entry ----------
   Forms are spelt as the Vulgate prints them, without macrons. Each cell holds a list: the first spelling is shown,
   the others are accepted alternatives (amaris / amare, amaverunt / amavere, audivisti / audisti). */
const MORPH = (() => {
  const PN = ["1s", "2s", "3s", "1p", "2p", "3p"];
  const six = (stem, ends) => Object.fromEntries(PN.map((p, i) => [p, ends[i] == null ? null : [].concat(ends[i]).map(e => stem + e)]));

  /* ----- verbs ----- */
  // Present-system endings by conjugation: 1, 2, 3, 3io (capio), 4.
  const PRES = {
    "1": { pia: ["o", "as", "at", "amus", "atis", "ant"], iia: "aba", fia: ["abo", "abis", "abit", "abimus", "abitis", "abunt"], psa: ["em", "es", "et", "emus", "etis", "ent"], inf: "are",
           pip: ["or", ["aris", "are"], "atur", "amur", "amini", "antur"], fip: ["abor", ["aberis", "abere"], "abitur", "abimur", "abimini", "abuntur"], psp: ["er", ["eris", "ere"], "etur", "emur", "emini", "entur"],
           imp: ["a", "ate"], fimp: ["ato", "ato", "atote", "anto"], ipass: "ari", ptc: "ans", ptcg: "antis", gnd: "and" },
    "2": { pia: ["eo", "es", "et", "emus", "etis", "ent"], iia: "eba", fia: ["ebo", "ebis", "ebit", "ebimus", "ebitis", "ebunt"], psa: ["eam", "eas", "eat", "eamus", "eatis", "eant"], inf: "ere",
           pip: ["eor", ["eris", "ere"], "etur", "emur", "emini", "entur"], fip: ["ebor", ["eberis", "ebere"], "ebitur", "ebimur", "ebimini", "ebuntur"], psp: ["ear", ["earis", "eare"], "eatur", "eamur", "eamini", "eantur"],
           imp: ["e", "ete"], fimp: ["eto", "eto", "etote", "ento"], ipass: "eri", ptc: "ens", ptcg: "entis", gnd: "end" },
    "3": { pia: ["o", "is", "it", "imus", "itis", "unt"], iia: "eba", fia: ["am", "es", "et", "emus", "etis", "ent"], psa: ["am", "as", "at", "amus", "atis", "ant"], inf: "ere",
           pip: ["or", ["eris", "ere"], "itur", "imur", "imini", "untur"], fip: ["ar", ["eris", "ere"], "etur", "emur", "emini", "entur"], psp: ["ar", ["aris", "are"], "atur", "amur", "amini", "antur"],
           imp: ["e", "ite"], fimp: ["ito", "ito", "itote", "unto"], ipass: "i", ptc: "ens", ptcg: "entis", gnd: "end" },
    "3io": { pia: ["io", "is", "it", "imus", "itis", "iunt"], iia: "ieba", fia: ["iam", "ies", "iet", "iemus", "ietis", "ient"], psa: ["iam", "ias", "iat", "iamus", "iatis", "iant"], inf: "ere",
           pip: ["ior", ["eris", "ere"], "itur", "imur", "imini", "iuntur"], fip: ["iar", ["ieris", "iere"], "ietur", "iemur", "iemini", "ientur"], psp: ["iar", ["iaris", "iare"], "iatur", "iamur", "iamini", "iantur"],
           imp: ["e", "ite"], fimp: ["ito", "ito", "itote", "iunto"], ipass: "i", ptc: "iens", ptcg: "ientis", gnd: "iend" },
    "4": { pia: ["io", "is", "it", "imus", "itis", "iunt"], iia: "ieba", fia: ["iam", "ies", "iet", "iemus", "ietis", "ient"], psa: ["iam", "ias", "iat", "iamus", "iatis", "iant"], inf: "ire",
           pip: ["ior", ["iris", "ire"], "itur", "imur", "imini", "iuntur"], fip: ["iar", ["ieris", "iere"], "ietur", "iemur", "iemini", "ientur"], psp: ["iar", ["iaris", "iare"], "iatur", "iamur", "iamini", "iantur"],
           imp: ["i", "ite"], fimp: ["ito", "ito", "itote", "iunto"], ipass: "iri", ptc: "iens", ptcg: "ientis", gnd: "iend" }
  };
  const IMPF_A = ["m", "s", "t", "mus", "tis", "nt"], IMPF_P = ["r", ["ris", "re"], "tur", "mur", "mini", "ntur"];
  const PERF = ["i", "isti", "it", "imus", "istis", ["erunt", "ere"]], PLPF = ["eram", "eras", "erat", "eramus", "eratis", "erant"],
    FUTP = ["ero", "eris", "erit", "erimus", "eritis", "erint"], PERFS = ["erim", "eris", "erit", "erimus", "eritis", "erint"], PLPFS = ["issem", "isses", "isset", "issemus", "issetis", "issent"];
  const SUM = { pi: ["sum", "es", "est", "sumus", "estis", "sunt"], ii: ["eram", "eras", "erat", "eramus", "eratis", "erant"], fi: ["ero", "eris", "erit", "erimus", "eritis", "erunt"],
    ps: ["sim", "sis", "sit", "simus", "sitis", "sint"], is: ["essem", "esses", "esset", "essemus", "essetis", "essent"] };
  const BA = ["bam", "bas", "bat", "bamus", "batis", "bant"], BAR = ["bar", ["baris", "bare"], "batur", "bamur", "bamini", "bantur"];
  // Perfect passive: the participle agrees with the subject, so every gender is accepted.
  function compound(ppp, aux) {
    const st = ppp.replace(/us$/, "");
    return Object.fromEntries(PN.map((p, i) => {
      const pl = i >= 3, g = pl ? ["i", "ae", "a"] : ["us", "a", "um"];
      return [p, g.map(e => `${st}${e} ${aux[i]}`)];
    }));
  }
  // Perfect active from the perfect stem, with the usual contractions (amasti, audisti, audiit).
  function perfect(stem) {
    const t = { ria: six(stem, PERF), lia: six(stem, PLPF), tia: six(stem, FUTP), rsa: six(stem, PERFS), lsa: six(stem, PLPFS) };
    const m = stem.match(/^(.*)(a|e|i|o)v$/);
    if (m) {
      const short = m[1] + m[2];
      const add = (k, p, f) => { if (t[k][p]) t[k][p] = [...t[k][p], f]; };
      add("ria", "2s", short + "sti"); add("ria", "2p", short + "stis"); add("ria", "3p", short + "runt");
      PN.forEach((p, i) => { add("lsa", p, short + PLPFS[i].slice(1)); });
      if (m[2] === "i") {
        const ii = m[1] + "i";
        ["ria", "lia", "tia", "rsa", "lsa"].forEach(k => PN.forEach((p, i) => {
          const end = { ria: PERF, lia: PLPF, tia: FUTP, rsa: PERFS, lsa: PLPFS }[k][i];
          [].concat(end).forEach(e => add(k, p, ii + e));
        }));
      }
    }
    return t;
  }
  const SEMIDEP = { audeo: "ausus", gaudeo: "gavisus", soleo: "solitus", fido: "fisus", confido: "confisus", diffido: "diffisus" };
  const FUT_PTC = { mortuus: "moriturus", natus: "nasciturus", ortus: "oriturus", passus: "passurus" };
  const SHORT_IMP = { dico: "dic", duco: "duc", facio: "fac", fero: "fer" };
  // Dictionary headings that are wrong for church Latin, corrected here.
  const PP_FIX = {
    occurro: "occurro, occurrere, occurri, occursum", concurro: "concurro, concurrere, concurri, concursum", spondeo: "spondeo, spondere, spopondi, sponsum",
    eicio: "eicio, eicere, eieci, eiectum", fruor: "fruor, frui, fructus sum", adaperio: "adaperio, adaperire, adaperui, adapertum",
    misereor: "misereor, misereri, misertus sum", edo: "edo, edere, edi, esum", proicio: "proicio, proicere, proieci, proiectum", adicio: "adicio, adicere, adieci, adiectum"
  };
  const clean = s => (s || "").replace(/\s*\(.*?\)\s*/g, "").trim();
  const dv = s => (s || "").toLowerCase();

  function verbInfo(lemma, pp) {
    if (!pp) return null;
    const first = clean(pp.split(/,\s*/)[0]);
    if (PP_FIX[first]) pp = PP_FIX[first];
    const parts = pp.split(/,\s*/).map(clean).filter(Boolean);
    const [p1, p2] = parts;
    if (!p1 || !p2 || /defective/.test(pp)) return null;
    const info = { kind: "verb", lemma, head: pp, p1, inf: p2 };
    const rest = parts.slice(2);
    const sumPart = rest.find(x => / sum$/.test(x));
    if (SEMIDEP[p1]) { info.semi = true; info.ppp = SEMIDEP[p1]; }
    else if (sumPart) { info.dep = /or$/.test(p1); info.ppp = sumPart.replace(/ sum$/, ""); if (!info.dep) info.fio = true; }
    // irregular present systems
    if (/^(.*)sum$/.test(p1) && /esse$/.test(p2)) { info.irr = "sum"; info.pre = p1.slice(0, -3); }
    else if (p1 === "possum") info.irr = "possum";
    else if (/eo$/.test(p1) && /ire$/.test(p2) && p2.slice(0, -3) === p1.slice(0, -2)) { info.irr = "eo"; info.pre = p1.slice(0, -2); }
    else if (/fero$/.test(p1) && /ferre$/.test(p2)) { info.irr = "fero"; info.pre = p1.slice(0, -4); }
    else if (["volo", "nolo", "malo"].includes(p1) && /lle$/.test(p2)) info.irr = p1;
    else if (p1 === "fio") info.irr = "fio";
    else if (/i$/.test(p1) && /isse$/.test(p2)) { info.irr = "perfonly"; info.perf = p1.slice(0, -1); }
    // regular conjugation from the infinitive and first person
    if (!info.irr) {
      if (info.dep) {
        if (/ari$/.test(p2)) { info.conj = "1"; info.stem = p2.slice(0, -3); }
        else if (/eri$/.test(p2) && /eor$/.test(p1)) { info.conj = "2"; info.stem = p2.slice(0, -3); }
        else if (/iri$/.test(p2)) { info.conj = "4"; info.stem = p2.slice(0, -3); }
        else if (/i$/.test(p2)) { info.conj = /ior$/.test(p1) ? "3io" : "3"; info.stem = p2.slice(0, -1); }
        else return null;
      } else {
        if (/are$/.test(p2)) { info.conj = "1"; info.stem = p2.slice(0, -3); }
        else if (/ere$/.test(p2) && /eo$/.test(p1)) { info.conj = "2"; info.stem = p2.slice(0, -3); }
        else if (/ire$/.test(p2)) { info.conj = "4"; info.stem = p2.slice(0, -3); }
        else if (/ere$/.test(p2)) { info.conj = /io$/.test(p1) ? "3io" : "3"; info.stem = p2.slice(0, -3); }
        else return null;
      }
    }
    if (!info.dep && !info.semi && !info.fio) {
      const perf = rest.find(x => /i$/.test(x) && !/ sum$/.test(x));
      if (perf && !info.perf) info.perf = perf.slice(0, -1);
      const sup = rest.find(x => /um$/.test(x));
      if (sup) { info.sup = sup.slice(0, -2); info.ppp = info.sup + "us"; }
      const fut = rest.find(x => /urus$/.test(x));
      if (fut) info.fap = fut;
    }
    if (info.ppp && !info.fap) info.fap = FUT_PTC[info.ppp] || info.ppp.replace(/us$/, "urus");
    if (info.irr === "sum") info.fap = info.fap || (info.pre + "futurus");
    return info;
  }
  function conjugate(info) {
    const F = {}, put = (k, v) => { if (v) Object.entries(v).forEach(([p, f]) => { if (f) F[k + p] = f; }); };
    const nf = {}, setNF = (k, v) => { if (v) nf[k] = [].concat(v); };
    const passiveOK = !info.semi && !["sum", "possum", "volo", "nolo", "malo", "fio", "perfonly"].includes(info.irr) && info.irr !== "eo";
    const C = PRES[info.conj];
    if (C) {
      const s = info.stem, A = !info.dep;
      if (A) {
        put("pia", six(s, C.pia)); put("iia", six(s + C.iia.slice(0, -2), BA)); put("fia", six(s, C.fia)); put("psa", six(s, C.psa)); put("isa", six(s + C.inf, IMPF_A));
        F["pma2s"] = [SHORT_IMP[info.p1] || (/duco$/.test(info.p1) ? info.p1.slice(0, -1) : /dico$/.test(info.p1) && info.p1 !== "dico" ? info.p1.slice(0, -1) : s + C.imp[0])];
        F["pma2p"] = [s + C.imp[1]];
        ["2s", "3s", "2p", "3p"].forEach((p, i) => { F["fma" + p] = [s + C.fimp[i]]; });
        setNF("inf-pa", s + C.inf); setNF("ptc-pa", s + C.ptc); nf["ptc-pa-st"] = s + C.ptcg.slice(0, -2);
      }
      if (!A || passiveOK) {
        const v = A ? "p" : "p";
        put("pi" + v, six(s, C.pip)); put("ii" + v, six(s + C.iia.slice(0, -2), BAR)); put("fi" + v, six(s, C.fip)); put("ps" + v, six(s, C.psp)); put("is" + v, six(s + C.inf, IMPF_P));
        setNF("inf-pp", s + C.ipass);
        F["pmp2s"] = [s + C.inf]; F["pmp2p"] = [s + C.pip[4]];
        if (!A) { setNF("ptc-pa", s + C.ptc); nf["ptc-pa-st"] = s + C.ptcg.slice(0, -2); }
      }
      setNF("gnd", ["i", "o", "um"].map(e => s + C.gnd + e));
      if (A ? passiveOK : true) setNF("gdv", s + C.gnd + "us");
    }
    if (info.irr === "sum" || info.irr === "possum") {
      const pre = info.pre || "", forms = info.irr === "possum"
        ? { pi: ["possum", "potes", "potest", "possumus", "potestis", "possunt"], ii: SUM.ii.map(e => "pot" + e), fi: SUM.fi.map(e => "pot" + e), ps: SUM.ps.map(e => "pos" + e), is: SUM.is.map(e => "po" + e.slice(1)) }
        : Object.fromEntries(Object.entries(SUM).map(([k, a]) => [k, a.map(e => (pre === "pro" && /^e/.test(e) ? "prod" : pre) + e)]));
      ["pi", "ii", "fi", "ps", "is"].forEach(k => put(k + "a", Object.fromEntries(PN.map((p, i) => [p, [forms[k][i]]]))));
      if (info.irr === "sum" && !pre) { F["isa3s"].push("foret"); F["isa3p"].push("forent"); F["pma2s"] = ["es"]; F["pma2p"] = ["este"]; F["fma2s"] = ["esto"]; F["fma3s"] = ["esto"]; F["fma2p"] = ["estote"]; F["fma3p"] = ["sunto"]; }
      setNF("inf-pa", info.irr === "possum" ? "posse" : (pre === "pro" ? "prod" : pre) + "esse");
      if (info.irr === "sum") { setNF("inf-fa", [`${info.fap} esse`, ...(pre ? [] : ["fore"])]); }
      if (info.irr === "sum" && pre === "" ) setNF("ptc-fa", "futurus");
    }
    if (info.irr === "eo") {
      const p = info.pre;
      put("pia", six(p, ["eo", "is", "it", "imus", "itis", "eunt"])); put("iia", six(p + "i", BA)); put("fia", six(p, ["ibo", "ibis", "ibit", "ibimus", "ibitis", "ibunt"]));
      put("psa", six(p, ["eam", "eas", "eat", "eamus", "eatis", "eant"])); put("isa", six(p + "ire", IMPF_A));
      F["pma2s"] = [p + "i"]; F["pma2p"] = [p + "ite"]; ["2s", "3s", "2p", "3p"].forEach((q, i) => { F["fma" + q] = [p + ["ito", "ito", "itote", "eunto"][i]]; });
      setNF("inf-pa", p + "ire"); setNF("ptc-pa", p + "iens"); nf["ptc-pa-st"] = p + "eunt"; setNF("gnd", ["eundi", "eundo", "eundum"].map(e => p + e));
      if (p) { F["pip3s"] = [p + "itur"]; setNF("inf-pp", p + "iri"); setNF("gdv", p + "eundus"); }
      ["iam", "ies", "iet", "iemus", "ietis", "ient"].forEach((e, i) => { if (i) F["fia" + PN[i]].push(p + e); });
    }
    if (info.irr === "fero") {
      const p = info.pre;
      put("pia", six(p, ["fero", "fers", "fert", "ferimus", "fertis", "ferunt"])); put("iia", six(p + "fere", BA)); put("fia", six(p, ["feram", "feres", "feret", "feremus", "feretis", "ferent"]));
      put("psa", six(p, ["feram", "feras", "ferat", "feramus", "feratis", "ferant"])); put("isa", six(p + "ferre", IMPF_A));
      put("pip", six(p, ["feror", ["ferris", "ferre"], "fertur", "ferimur", "ferimini", "feruntur"])); put("iip", six(p + "fere", BAR)); put("fip", six(p, ["ferar", ["fereris", "ferere"], "feretur", "feremur", "feremini", "ferentur"]));
      put("psp", six(p, ["ferar", ["feraris", "ferare"], "feratur", "feramur", "feramini", "ferantur"])); put("isp", six(p + "ferre", IMPF_P));
      F["pma2s"] = [p + "fer"]; F["pma2p"] = [p + "ferte"]; ["2s", "3s", "2p", "3p"].forEach((q, i) => { F["fma" + q] = [p + ["ferto", "ferto", "fertote", "ferunto"][i]]; });
      setNF("inf-pa", p + "ferre"); setNF("inf-pp", p + "ferri"); setNF("ptc-pa", p + "ferens"); nf["ptc-pa-st"] = p + "ferent"; setNF("gnd", ["ferendi", "ferendo", "ferendum"].map(e => p + e)); setNF("gdv", p + "ferendus");
    }
    if (["volo", "nolo", "malo"].includes(info.irr)) {
      const T = {
        volo: { pi: ["volo", "vis", "vult", "volumus", "vultis", "volunt"], st: "vol", su: "vel", inf: "velle" },
        nolo: { pi: ["nolo", "non vis", "non vult", "nolumus", "non vultis", "nolunt"], st: "nol", su: "nol", inf: "nolle" },
        malo: { pi: ["malo", "mavis", "mavult", "malumus", "mavultis", "malunt"], st: "mal", su: "mal", inf: "malle" }
      }[info.irr];
      put("pia", Object.fromEntries(PN.map((p, i) => [p, [T.pi[i]]]))); put("iia", six(T.st + "e", BA)); put("fia", six(T.st, ["am", "es", "et", "emus", "etis", "ent"]));
      put("psa", six(T.su, ["im", "is", "it", "imus", "itis", "int"])); put("isa", six(T.inf, IMPF_A));
      if (info.irr === "nolo") { F["pma2s"] = ["noli"]; F["pma2p"] = ["nolite"]; F["fma2s"] = ["nolito"]; F["fma2p"] = ["nolitote"]; }
      setNF("inf-pa", T.inf); if (info.irr !== "malo") { setNF("ptc-pa", T.st + "ens"); nf["ptc-pa-st"] = T.st + "ent"; }
    }
    if (info.irr === "fio") {
      put("pia", six("f", ["io", "is", "it", "imus", "itis", "iunt"])); put("iia", six("fie", BA)); put("fia", six("f", ["iam", "ies", "iet", "iemus", "ietis", "ient"]));
      put("psa", six("f", ["iam", "ias", "iat", "iamus", "iatis", "iant"])); put("isa", six("fiere", IMPF_A));
      F["pma2s"] = ["fi"]; F["pma2p"] = ["fite"]; setNF("inf-pa", "fieri");
    }
    // perfect system
    if (info.perf) {
      const P = perfect(info.perf);
      Object.entries(P).forEach(([k, v]) => put(k, v));
      if (info.irr === "eo") {
        // exii: existi, existis, exisset, exisse; and the -ivi forms
        const st = info.pre + "i", iv = perfect(st + "v");
        Object.entries(P).forEach(([k, v]) => Object.entries(v).forEach(([pn, fs]) => {
          if (!fs) return;
          const more = fs.filter(f => /^.*iis/.test(f)).map(f => f.replace(/iis/, "is"));
          F[k + pn] = [...F[k + pn], ...more, ...iv[k][pn]].filter((x, i, a) => a.indexOf(x) === i);
        }));
      }
      setNF("inf-ra", [info.perf + "isse", ...(info.irr === "eo" ? [info.pre + "isse", info.pre + "ivisse"] : []), ...(/[aeio]v$/.test(info.perf) ? [info.perf.slice(0, -1) + "sse"] : []), ...(/iv$/.test(info.perf) ? [info.perf.slice(0, -2) + "iisse"] : [])]);
      if (info.irr === "perfonly") { delete nf["inf-pa"]; }
    }
    const pv = info.ppp;
    if (pv) {
      const vk = info.dep || info.semi || info.fio ? (info.fio ? "p" : (info.semi ? "a" : "p")) : "p";
      if (info.dep || info.semi || info.fio || passiveOK) {
        put("ri" + vk, compound(pv, SUM.pi)); put("li" + vk, compound(pv, SUM.ii)); put("ti" + vk, compound(pv, SUM.fi)); put("rs" + vk, compound(pv, SUM.ps)); put("ls" + vk, compound(pv, SUM.is));
        if (info.fio) { ["ri", "li", "ti", "rs", "ls"].forEach(k => PN.forEach(p => { if (F[k + "p" + p]) { F[k + "a" + p] = F[k + "p" + p]; delete F[k + "p" + p]; } })); }
        const st = pv.replace(/us$/, "");
        setNF(info.dep || info.semi ? "inf-ra" : "inf-rp", [st + "us esse", st + "um esse", st + "a esse", st + "os esse", st + "as esse", st + "i esse"]);
        setNF("ptc-rp", pv);
      }
      if (info.fap && !info.fio) { const fs = info.fap.replace(/us$/, ""); setNF("inf-fa", ["um", "us", "am", "a", "os", "as", "i", "ae"].map(e => fs + e + " esse")); setNF("ptc-fa", info.fap); }
      if (info.sup) { setNF("sup", [info.sup + "um", info.sup + "u"]); if (passiveOK) setNF("inf-fp", info.sup + "um iri"); }
    } else if (info.fap) { setNF("ptc-fa", info.fap); setNF("inf-fa", ["um", "us", "am", "a", "os", "as"].map(e => info.fap.replace(/us$/, "") + e + " esse")); }
    if (info.irr === "sum" && !info.pre) { setNF("ptc-fa", "futurus"); }
    if (info.semi) {
      // semi-deponents: perfect system passive in form, active in meaning
      ["ria", "lia", "tia", "rsa", "lsa"].forEach(k => PN.forEach(p => { if (F[k.slice(0, 2) + "a" + p] === undefined && F[k.slice(0, 2) + "p" + p]) {} }));
    }
    return { finite: F, nonfinite: nf };
  }

  /* ----- nouns ----- */
  const CASES = ["n", "g", "d", "a", "b", "v"];
  function nounInfo(lemma, head) {
    const m = (head || "").match(/^([a-z]+), ([a-z]+) \(([mfnc])[^)]*\)/i);
    if (!m) return null;
    const [, nom, gen, g0] = m;
    const gender = g0 === "c" ? "m" : g0;
    const info = { kind: "noun", lemma, head, nom, gen, gender };
    if (/ae$/.test(gen) && /a$/.test(nom)) { info.decl = 1; info.stem = gen.slice(0, -2); }
    else if (/i$/.test(gen) && !/ei$/.test(gen) || (/ei$/.test(gen) && !/es$/.test(nom))) { info.decl = 2; info.stem = gen.slice(0, -1); }
    else if (/us$/.test(gen) && /(us|u)$/.test(nom) && gen.slice(0, -2) === nom.replace(/(us|u)$/, "")) { info.decl = 4; info.stem = gen.slice(0, -2); }
    else if (/ei$/.test(gen) && /es$/.test(nom)) { info.decl = 5; info.stem = gen.slice(0, -2); }
    else if (/is$/.test(gen)) {
      info.decl = 3; info.stem = gen.slice(0, -2);
      const parisyl = /(is|es)$/.test(nom) && nom.length === gen.length;
      const cluster = /[^aeiou][^aeiou]$/.test(info.stem) && nom.length <= gen.length - 1 && /(s|x)$/.test(nom);
      const neutI = gender === "n" && /(e|al|ar)$/.test(nom);
      info.istem = neutI ? "n" : parisyl && !["canis", "iuvenis", "senex", "panis", "vates", "sedes", "mensis"].includes(nom) ? "y" : cluster ? "y" : "";
      if (/ns$/.test(nom) && nom.length > 5) info.istem = info.istem || "?";
    } else return null;
    if (nom === "domus") { info.decl = 4; info.stem = "dom"; info.domus = true; }
    return info;
  }
  function decline(info) {
    const F = {}, s = info.stem, put = (c, n, f) => { F[c + n] = [].concat(f); };
    const neut = info.gender === "n";
    if (info.decl === 1) {
      ["a", "ae", "ae", "am", "a", "a"].forEach((e, i) => put(CASES[i], "s", s + e));
      ["ae", "arum", "is", "as", "is", "ae"].forEach((e, i) => put(CASES[i], "p", s + e));
      if (["dea", "filia"].includes(info.nom)) { put("d", "p", [s + "abus", s + "is"]); put("b", "p", [s + "abus", s + "is"]); }
    } else if (info.decl === 2) {
      const us = /us$/.test(info.nom), um = /um$/.test(info.nom);
      if (neut || um) {
        [info.nom, "i", "o", info.nom, "o", info.nom].forEach((e, i) => put(CASES[i], "s", i === 0 || i === 3 || i === 5 ? info.nom : s + e));
        ["a", "orum", "is", "a", "is", "a"].forEach((e, i) => put(CASES[i], "p", s + e));
      } else {
        const voc = info.nom === "deus" ? "deus" : /ius$/.test(info.nom) && info.nom[0] === info.nom[0].toLowerCase() ? s : us ? s + "e" : info.nom;
        [info.nom, "i", "o", "um", "o", voc].forEach((e, i) => put(CASES[i], "s", i === 0 ? info.nom : i === 5 ? voc : s + e));
        ["i", "orum", "is", "os", "is", "i"].forEach((e, i) => put(CASES[i], "p", s + e));
        if (info.nom === "deus") { put("n", "p", ["dii", "dei", "di"]); put("v", "p", ["dii", "dei", "di"]); put("d", "p", ["diis", "deis", "dis"]); put("b", "p", ["diis", "deis", "dis"]); put("g", "p", ["deorum", "deum"]); }
      }
      if (info.nom === "locus") { F.np = ["loci", "loca"]; F.ap = ["locos", "loca"]; }
      if (info.nom === "caelum") { F.np = ["caeli", "caela"]; F.ap = ["caelos", "caela"]; F.gp = ["caelorum"]; F.vp = ["caeli"]; }
    } else if (info.decl === 3) {
      const n = info.nom, ist = info.istem;
      put("n", "s", n); put("g", "s", s + "is"); put("d", "s", s + "i"); put("a", "s", neut ? n : s + "em"); put("b", "s", ist === "n" ? s + "i" : ist === "y" && /(is|es)$/.test(n) ? [s + "e", s + "i"] : s + "e"); put("v", "s", n);
      const pl = neut ? (ist === "n" ? "ia" : "a") : "es";
      put("n", "p", s + pl); put("a", "p", s + pl); put("v", "p", s + pl); put("d", "p", s + "ibus"); put("b", "p", s + "ibus");
      put("g", "p", ist === "y" || ist === "n" ? [s + "ium", s + "um"] : ist === "?" ? [s + "ium", s + "um"] : [s + "um", s + "ium"]);
      if (n === "vis") { F.ns = ["vis"]; F.gs = ["vis"]; F.ds = ["vi"]; F.as = ["vim"]; F.bs = ["vi"]; F.vs = ["vis"]; F.np = F.ap = F.vp = ["vires"]; F.gp = ["virium"]; F.dp = F.bp = ["viribus"]; }
      if (n === "bos") { F.dp = F.bp = ["bobus", "bubus"]; F.gp = ["boum"]; }
    } else if (info.decl === 4) {
      if (neut) {
        [info.nom, s + "us", s + "u", info.nom, s + "u", info.nom].forEach((f, i) => put(CASES[i], "s", f));
        ["ua", "uum", "ibus", "ua", "ibus", "ua"].forEach((e, i) => put(CASES[i], "p", s + e));
      } else {
        ["us", "us", "ui", "um", "u", "us"].forEach((e, i) => put(CASES[i], "s", s + e));
        ["us", "uum", "ibus", "us", "ibus", "us"].forEach((e, i) => put(CASES[i], "p", s + e));
        if (info.domus) { F.gs = ["domus", "domi"]; F.ds = ["domui", "domo"]; F.bs = ["domo", "domu"]; F.gp = ["domuum", "domorum"]; F.ap = ["domus", "domos"]; }
      }
    } else if (info.decl === 5) {
      const e1 = /[aeiou]$/.test(s) ? "ei" : "ei";
      ["es", e1, e1, "em", "e", "es"].forEach((e, i) => put(CASES[i], "s", s + e));
      ["es", "erum", "ebus", "es", "ebus", "es"].forEach((e, i) => put(CASES[i], "p", s + e));
    }
    return F;
  }

  /* ----- adjectives ----- */
  const PRONOMINAL = new Set(["unus", "solus", "totus", "nullus", "ullus", "alius", "alter", "uter", "neuter", "uterque"]);
  function adjInfo(lemma, head) {
    const h = head || "";
    let m;
    if ((m = h.match(/^([a-z]+), -a, -um$/i))) {
      const nom = m[1];
      if (/us$/.test(nom)) return { kind: "adj", lemma, head: h, type: "12", m: nom, stem: nom.slice(0, -2), pron: PRONOMINAL.has(nom) };
      if (/er$/.test(nom)) return { kind: "adj", lemma, head: h, type: "12", m: nom, stem: nom, pron: PRONOMINAL.has(nom) };
    }
    if ((m = h.match(/^([a-z]+), -([a-z]+)a, -([a-z]+)um$/i))) return { kind: "adj", lemma, head: h, type: "12", m: m[1], stem: m[2] ? m[1].replace(/er$/, "") + m[2].replace(/^.*?(?=r?$)/, "") : m[1], fstem: null };
    if ((m = h.match(/^([a-z]+), ([a-z]+)a, ([a-z]+)um$/i))) return { kind: "adj", lemma, head: h, type: "12", m: m[1], stem: m[2], pron: PRONOMINAL.has(m[1]) };
    if ((m = h.match(/^([a-z]+)is, -e$/i))) return { kind: "adj", lemma, head: h, type: "3two", m: m[1] + "is", stem: m[1] };
    if ((m = h.match(/^([a-z]+)er, ([a-z]+)is, ([a-z]+)e$/i))) return { kind: "adj", lemma, head: h, type: "3three", m: m[1] + "er", stem: m[2] };
    if ((m = h.match(/^([a-z]+), gen\. ([a-z]+)is$/i))) return { kind: "adj", lemma, head: h, type: "3one", m: m[1], stem: m[2], ptc: /ns$/.test(m[1]) };
    return null;
  }
  const CONS_ADJ = new Set(["vetus", "dives", "pauper", "princeps", "particeps", "compos", "superstes", "sospes", "memor", "immemor", "inops", "degener"]);
  const IRREG_CMP = { bonus: ["melior", "optimus"], malus: ["peior", "pessimus"], magnus: ["maior", "maximus"], parvus: ["minor", "minimus"], multus: ["plus", "plurimus"], superus: ["superior", "supremus"], inferus: ["inferior", "infimus"], exterus: ["exterior", "extremus"] };
  const LIMUS = new Set(["facilis", "difficilis", "similis", "dissimilis", "humilis", "gracilis"]);
  function declineAdj(info) {
    const F = {}, put = (g, c, n, f) => { F[g + c + n] = [].concat(f); };
    const G = ["m", "f", "n"];
    if (info.type === "12") {
      const s = info.stem, mNom = info.m, pr = info.pron;
      const sg = { m: [mNom, pr ? "ius" : "i", pr ? "i" : "o", "um", "o", /us$/.test(mNom) ? (pr ? mNom : "e") : mNom], f: ["a", pr ? "ius" : "ae", pr ? "i" : "ae", "am", "a", "a"], n: ["um", pr ? "ius" : "i", pr ? "i" : "o", "um", "o", "um"] };
      const pl = { m: ["i", "orum", "is", "os", "is", "i"], f: ["ae", "arum", "is", "as", "is", "ae"], n: ["a", "orum", "is", "a", "is", "a"] };
      G.forEach(g => CASES.forEach((c, i) => { const e = sg[g][i]; put(g, c, "s", g === "m" && (i === 0 || (i === 5 && !/us$/.test(mNom)) || (i === 5 && pr)) ? e : s + e); put(g, c, "p", s + pl[g][i]); }));
      if (info.m === "alius") { F.nns = ["aliud"]; F.nas = ["aliud"]; F.nvs = ["aliud"]; }
    } else {
      const s = info.stem;
      const nomM = info.m, nomF = info.type === "3three" ? s + "is" : nomM, nomN = info.type === "3one" ? nomM : s + "e";
      const cons = CONS_ADJ.has(nomM);
      const ablI = !info.ptc && !cons;
      G.forEach(g => {
        const nom = { m: nomM, f: nomF, n: nomN }[g];
        put(g, "n", "s", nom); put(g, "g", "s", s + "is"); put(g, "d", "s", s + "i"); put(g, "a", "s", g === "n" ? nom : s + "em");
        put(g, "b", "s", ablI ? s + "i" : cons ? s + "e" : [s + "e", s + "i"]); put(g, "v", "s", nom);
        const pl = g === "n" ? (cons ? "a" : "ia") : "es";
        ["n", "a", "v"].forEach(c => put(g, c, "p", s + pl)); put(g, "g", "p", cons ? s + "um" : s + "ium"); put(g, "d", "p", s + "ibus"); put(g, "b", "p", s + "ibus");
      });
    }
    return F;
  }
  function comparison(info) {
    const pos = info.m;
    if (IRREG_CMP[pos]) return { cmp: IRREG_CMP[pos][0], sup: IRREG_CMP[pos][1] };
    if (info.pron) return null;
    let base = info.stem;
    if (info.type === "12" && /ius$|eus$|uus$/.test(pos)) return { cmp: "magis " + pos, sup: "maxime " + pos };
    const cmp = base + "ior";
    const sup = /er$/.test(pos) ? pos + "rimus" : LIMUS.has(pos) ? base + "limus" : base + "issimus";
    return { cmp, sup };
  }
  function declineCmp(cmp) {
    const s = cmp, F = {};
    ["m", "f", "n"].forEach(g => {
      const nom = g === "n" ? s.replace(/ior$/, "ius") : s;
      const st = s + "or";
      [["n", nom], ["g", st + "is"], ["d", st + "i"], ["a", g === "n" ? nom : st + "em"], ["b", st + "e"], ["v", nom]].forEach(([c, f]) => { F[g + c + "s"] = [f]; });
      const pl = g === "n" ? "a" : "es";
      [["n", st + pl], ["g", st + "um"], ["d", st + "ibus"], ["a", st + pl], ["b", st + "ibus"], ["v", st + pl]].forEach(([c, f]) => { F[g + c + "p"] = [f]; });
    });
    return F;
  }

  /* Participles, gerundives and the gerund decline like adjectives. */
  function participleTable(nf, which) {
    if (which === "ptc-pa" && nf["ptc-pa"]) return declineAdj({ type: "3one", m: nf["ptc-pa"][0], stem: nf["ptc-pa-st"], ptc: true });
    const nom = nf[which] && nf[which][0];
    if (!nom || / /.test(nom)) return null;
    return declineAdj({ type: "12", m: nom, stem: nom.replace(/us$/, "") });
  }
  /* ----- pronouns: fixed tables (m f n; nom gen dat acc abl) ----- */
  const PRONOUNS = {
    is: { gloss: "he, she, it; this, that", s: { m: ["is", "eius", "ei", "eum", "eo"], f: ["ea", "eius", "ei", "eam", "ea"], n: ["id", "eius", "ei", "id", "eo"] }, p: { m: [["ei", "ii"], "eorum", ["eis", "iis"], "eos", ["eis", "iis"]], f: ["eae", "earum", ["eis", "iis"], "eas", ["eis", "iis"]], n: ["ea", "eorum", ["eis", "iis"], "ea", ["eis", "iis"]] } },
    hic: { gloss: "this; he", s: { m: ["hic", "huius", "huic", "hunc", "hoc"], f: ["haec", "huius", "huic", "hanc", "hac"], n: ["hoc", "huius", "huic", "hoc", "hoc"] }, p: { m: ["hi", "horum", "his", "hos", "his"], f: ["hae", "harum", "his", "has", "his"], n: ["haec", "horum", "his", "haec", "his"] } },
    ille: { gloss: "that; he", s: { m: ["ille", "illius", "illi", "illum", "illo"], f: ["illa", "illius", "illi", "illam", "illa"], n: ["illud", "illius", "illi", "illud", "illo"] }, p: { m: ["illi", "illorum", "illis", "illos", "illis"], f: ["illae", "illarum", "illis", "illas", "illis"], n: ["illa", "illorum", "illis", "illa", "illis"] } },
    iste: { gloss: "that (of yours)", s: { m: ["iste", "istius", "isti", "istum", "isto"], f: ["ista", "istius", "isti", "istam", "ista"], n: ["istud", "istius", "isti", "istud", "isto"] }, p: { m: ["isti", "istorum", "istis", "istos", "istis"], f: ["istae", "istarum", "istis", "istas", "istis"], n: ["ista", "istorum", "istis", "ista", "istis"] } },
    ipse: { gloss: "himself, herself; the very", s: { m: ["ipse", "ipsius", "ipsi", "ipsum", "ipso"], f: ["ipsa", "ipsius", "ipsi", "ipsam", "ipsa"], n: ["ipsum", "ipsius", "ipsi", "ipsum", "ipso"] }, p: { m: ["ipsi", "ipsorum", "ipsis", "ipsos", "ipsis"], f: ["ipsae", "ipsarum", "ipsis", "ipsas", "ipsis"], n: ["ipsa", "ipsorum", "ipsis", "ipsa", "ipsis"] } },
    idem: { gloss: "the same", s: { m: ["idem", "eiusdem", "eidem", "eundem", "eodem"], f: ["eadem", "eiusdem", "eidem", "eandem", "eadem"], n: ["idem", "eiusdem", "eidem", "idem", "eodem"] }, p: { m: [["eidem", "iidem"], "eorundem", ["eisdem", "iisdem"], "eosdem", ["eisdem", "iisdem"]], f: ["eaedem", "earundem", ["eisdem", "iisdem"], "easdem", ["eisdem", "iisdem"]], n: ["eadem", "eorundem", ["eisdem", "iisdem"], "eadem", ["eisdem", "iisdem"]] } },
    qui: { gloss: "who, which, that (relative)", s: { m: ["qui", "cuius", "cui", "quem", "quo"], f: ["quae", "cuius", "cui", "quam", "qua"], n: ["quod", "cuius", "cui", "quod", "quo"] }, p: { m: ["qui", "quorum", ["quibus", "queis"], "quos", "quibus"], f: ["quae", "quarum", "quibus", "quas", "quibus"], n: ["quae", "quorum", "quibus", "quae", "quibus"] } },
    quis: { gloss: "who? what? (interrogative)", s: { m: ["quis", "cuius", "cui", "quem", "quo"], f: ["quis", "cuius", "cui", "quem", "quo"], n: ["quid", "cuius", "cui", "quid", "quo"] }, p: { m: ["qui", "quorum", "quibus", "quos", "quibus"], f: ["quae", "quarum", "quibus", "quas", "quibus"], n: ["quae", "quorum", "quibus", "quae", "quibus"] } },
    ego: { gloss: "I, we", personal: true, s: { m: ["ego", ["mei"], ["mihi", "mi"], "me", "me"] }, p: { m: ["nos", ["nostrum", "nostri"], "nobis", "nos", "nobis"] } },
    tu: { gloss: "you", personal: true, s: { m: ["tu", "tui", "tibi", "te", "te"] }, p: { m: ["vos", ["vestrum", "vestri"], "vobis", "vos", "vobis"] } },
    sui: { gloss: "himself, herself, themselves (reflexive)", personal: true, s: { m: ["—", "sui", "sibi", ["se", "sese"], ["se", "sese"]] }, p: { m: ["—", "sui", "sibi", ["se", "sese"], ["se", "sese"]] } }
  };
  function pronounForms(name) {
    const P = PRONOUNS[name], F = {};
    ["s", "p"].forEach(n => Object.entries(P[n]).forEach(([g, arr]) => arr.forEach((f, i) => { if (f !== "—") F[(P.personal ? "" : g) + "ngdab"[i] + n] = [].concat(f); })));
    return F;
  }


  /* ----- one entry point: everything the page needs for a dictionary word ----- */
  // Words spelt alike but conjugated differently; the right one is chosen by the form being looked up.
  const ALT_HEADS = {
    educo: ["educo, educere, eduxi, eductum"], praedico: ["praedico, praedicere, praedixi, praedictum"], effero: ["effero, efferre, extuli, elatum"],
    fundo: ["fundo, fundare, fundavi, fundatum"], appello: ["appello, appellere, appuli, appulsum"], colligo: ["colligo, colligere, collegi, collectum"],
    mando: ["mando, mandere, mandi, mansum"], lego: ["lego, legare, legavi, legatum"], volo: ["volo, volare, volavi, volatum"],
    deligo: ["deligo, deligare, deligavi, deligatum"], indico: ["indico, indicere, indixi, indictum"], compello: ["compello, compellare, compellavi, compellatum"]
  };
  function build(lemma, head) {
    const v = verbInfo(lemma, head);
    if (v) { const c = conjugate(v); return { kind: "verb", lemma, head: v.head, info: v, finite: c.finite, nonfinite: c.nonfinite }; }
    const n = nounInfo(lemma, head);
    if (n) return { kind: "noun", lemma, head: n.head, info: n, F: decline(n) };
    const a = adjInfo(lemma, head);
    if (a) { const cmp = comparison(a); return { kind: "adj", lemma, head: a.head, info: a, F: declineAdj(a), cmp, C: cmp && !/ /.test(cmp.cmp) ? declineCmp(cmp.cmp) : null }; }
    if (PRONOUNS[lemma]) return { kind: "pron", lemma, head: lemma, info: PRONOUNS[lemma], F: pronounForms(lemma) };
    return null;
  }
  function entries(lemma, head) {
    const first = build(lemma, head);
    const alts = (ALT_HEADS[(head || "").split(",")[0]] || []).map(h => build(lemma, h)).filter(Boolean);
    return [first, ...alts].filter(Boolean);
  }
  /* Every cell of an entry, as [key, forms]. Participles and gerundives are expanded by gender, case and number. */
  function cells(t) {
    if (!t) return [];
    if (t.kind !== "verb") return Object.entries(t.F);
    const out = Object.entries(t.finite);
    Object.entries(t.nonfinite).forEach(([k, v]) => { if (!/-st$/.test(k)) out.push([k, v]); });
    ["ptc-pa", "ptc-rp", "ptc-fa", "gdv"].forEach(w => { const T = participleTable(t.nonfinite, w); if (T) Object.entries(T).forEach(([k, v]) => out.push([w + ":" + k, v])); });
    return out;
  }
  function findForm(t, form) { const f = norm(form); return cells(t).filter(([, v]) => v.some(x => norm(x) === f || norm(x).split(" ")[0] === f)).map(([k]) => k); }
  function entryFor(lemma, head, form) {
    const es = entries(lemma, head);
    if (!form || es.length < 2) return es[0] || null;
    return es.find(e => findForm(e, form).length) || es[0];
  }
  /* ----- labels ----- */
  const TL = { p: "present", i: "imperfect", f: "future", r: "perfect", l: "pluperfect", t: "future perfect" };
  const ML = { i: "indicative", s: "subjunctive", m: "imperative" };
  const VL = { a: "active", p: "passive" };
  const PNL = { "1s": "1st singular", "2s": "2nd singular", "3s": "3rd singular", "1p": "1st plural", "2p": "2nd plural", "3p": "3rd plural" };
  const CL = { n: "nominative", g: "genitive", d: "dative", a: "accusative", b: "ablative", v: "vocative" };
  const GL = { m: "masculine", f: "feminine", n: "neuter" };
  const NFL = { "inf-pa": "present active infinitive", "inf-pp": "present passive infinitive", "inf-ra": "perfect active infinitive", "inf-rp": "perfect passive infinitive", "inf-fa": "future active infinitive", "inf-fp": "future passive infinitive",
    "ptc-pa": "present active participle", "ptc-rp": "perfect passive participle", "ptc-fa": "future active participle", "gdv": "gerundive", "gnd": "gerund (gen., dat./abl., acc.)", "sup": "supine (-um, -u)" };
  function verbKeyLabel(k, info) {
    const t = k[0], m = k[1], v = k[2], pn = k.slice(3);
    const voice = info && (info.dep || (info.semi && "rlt".includes(t))) ? "" : " " + VL[v];
    return `${PNL[pn]} ${TL[t]} ${ML[m]}${voice}`.replace(/\s+/g, " ");
  }
  const norm = s => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/v/g, "u").replace(/j/g, "i").replace(/\s+/g, " ").trim();
  return { build, entries, entryFor, cells, findForm, ALT_HEADS, verbInfo, conjugate, participleTable, nounInfo, decline, adjInfo, declineAdj, comparison, declineCmp, PRONOUNS, pronounForms, verbKeyLabel, norm, TL, ML, VL, PNL, CL, GL, NFL, PN };
})();
