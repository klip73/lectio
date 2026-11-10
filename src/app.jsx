const { useState, useEffect, useMemo, useRef } = React;

/* ---------- Grammar concepts the app tracks ---------- */
const CONCEPTS = {
  abl:   "Ablative uses",
  gen:   "Genitive uses",
  dat:   "Dative uses",
  fut:   "Future tenses",
  perf:  "Perfect system",
  pass:  "Passive & fio",
  dep:   "Deponent verbs",
  imp:   "Imperatives",
  subj:  "Subjunctive",
  part:  "Participles & gerundives",
  rel:   "Relative clauses",
  comp:  "Comparison",
  ellip: "Omitted words",
  order: "Word order",
  absl:  "Ablative absolute",
  ind:   "Indirect statement"
};
const LEVELS = { 1: "Beginner", 2: "Intermediate", 3: "Advanced" };

/* ---------- Verse bank ----------
   Latin: Clementine Vulgate. English: Douay-Rheims (Challoner).
   g = book group, lv = level, k = concept tags, p = parsing, v = vocabulary, t = tip */
const VERSES = [
  // Gospels
  { id:"mt4-4", ref:"Matthew 4:4", g:"Gospels", lv:2, k:["rel","part","pass","abl"],
    la:"Qui respondens dixit: Scriptum est: Non in solo pane vivit homo, sed in omni verbo, quod procedit de ore Dei.",
    dr:"Who answered and said: It is written, Not in bread alone doth man live, but in every word that proceedeth from the mouth of God.",
    p:[["qui respondens dixit","connecting relative: qui = “and he”. Respondens is a present participle: “answering, he said”."],
       ["scriptum est","perfect passive of scribo: “it stands written”."],
       ["in solo pane","in + abl.; solus is a pronominal adjective (gen. solius, dat. soli)."],
       ["quod procedit","relative clause on verbo; neuter quod matches verbum."],
       ["de ore Dei","de + abl. of os, oris (n.) “mouth”."]],
    v:[["respondeo, -ere","to answer"],["panis, -is (m.)","bread"],["procedo, -ere","to go forth"],["os, oris (n.)","mouth"]],
    t:"A relative pronoun opening a sentence usually just links back: translate qui as “he” or “and he”." },
  { id:"mt5-3", ref:"Matthew 5:3", g:"Gospels", lv:1, k:["ellip","abl","gen"],
    la:"Beati pauperes spiritu: quoniam ipsorum est regnum caelorum.",
    dr:"Blessed are the poor in spirit: for theirs is the kingdom of heaven.",
    p:[["beati","nom. pl. masc. adjective; sunt is understood."],
       ["pauperes","nom. pl. of pauper, -eris (3rd decl.)."],
       ["spiritu","abl. sg. of spiritus, -us (4th decl.): ablative of respect, “in spirit”."],
       ["ipsorum est","gen. pl. of ipse with est: possessive genitive, “theirs is”."],
       ["regnum caelorum","nom. sg. subject + gen. pl. of caelum."]],
    v:[["beatus, -a, -um","blessed, happy"],["pauper, -eris","poor"],["quoniam","because, since"],["regnum, -i (n.)","kingdom"]],
    t:"Verbless clauses are common in the Beatitudes. Supply a form of esse." },
  { id:"mt6-9", ref:"Matthew 6:9", g:"Gospels", lv:1, k:["fut","subj","pass","rel"],
    la:"Sic ergo vos orabitis: Pater noster, qui es in caelis: sanctificetur nomen tuum.",
    dr:"Thus therefore shall you pray: Our Father who art in heaven, hallowed be thy name.",
    p:[["orabitis","2nd pl. future of oro (1st conj., -bi-), with the force of a command."],
       ["Pater","vocative, identical to the nominative here."],
       ["qui es","2nd sg. verb because the antecedent is being addressed."],
       ["sanctificetur","3rd sg. present passive subjunctive, jussive: “let it be hallowed”."],
       ["nomen tuum","nom. sg. neut., subject of the passive verb."]],
    v:[["oro, -are","to pray"],["caelum, -i (n.)","heaven, sky"],["sanctifico, -are","to make holy"],["nomen, -inis (n.)","name"]],
    t:"A present subjunctive in a main clause is usually a wish or command: “let…”, “may…”." },
  { id:"mt7-7", ref:"Matthew 7:7", g:"Gospels", lv:1, k:["imp","fut","pass"],
    la:"Petite, et dabitur vobis: quaerite, et invenietis: pulsate, et aperietur vobis.",
    dr:"Ask, and it shall be given you: seek, and you shall find: knock, and it shall be opened to you.",
    p:[["petite, quaerite, pulsate","2nd pl. present imperatives."],
       ["dabitur","3rd sg. future passive of do: “it will be given”."],
       ["invenietis","2nd pl. future of invenio (4th conj., -ie-)."],
       ["aperietur","3rd sg. future passive of aperio (4th conj.)."],
       ["vobis","dat. pl.: “to you”."]],
    v:[["peto, -ere","to ask, seek"],["quaero, -ere","to seek"],["pulso, -are","to knock"],["aperio, -ire","to open"]],
    t:"Imperative + et + future works like a condition: “ask, and (if you do) you will receive”." },
  { id:"mt11-28", ref:"Matthew 11:28", g:"Gospels", lv:1, k:["imp","fut","rel","pass"],
    la:"Venite ad me omnes qui laboratis, et onerati estis, et ego reficiam vos.",
    dr:"Come to me all you that labor and are burdened, and I will refresh you.",
    p:[["venite","2nd pl. present imperative of venio."],
       ["qui laboratis","relative clause in the 2nd person because it refers to the people addressed."],
       ["onerati estis","2nd pl. perfect passive of onero: “you are (have been) burdened”."],
       ["reficiam","1st sg. future of reficio (3rd -io). In the 3rd/4th conjugations, -am is future in the 1st person."]],
    v:[["laboro, -are","to toil, labor"],["onero, -are","to load, burden"],["reficio, -ere","to restore, refresh"]],
    t:"Reficiam could be present subjunctive in form. Context with et ego makes it a promise: future." },
  { id:"mt16-18", ref:"Matthew 16:18", g:"Gospels", lv:2, k:["fut","dat","gen"],
    la:"Et ego dico tibi, quia tu es Petrus, et super hanc petram aedificabo Ecclesiam meam, et portae inferi non praevalebunt adversus eam.",
    dr:"And I say to thee: That thou art Peter; and upon this rock I will build my church, and the gates of hell shall not prevail against it.",
    p:[["dico tibi","dative of indirect object: “I say to you”."],
       ["quia","introduces a direct statement, like Greek hoti. Late Latin uses quia where classical Latin uses an infinitive."],
       ["super hanc petram","super + accusative; petra plays on Petrus."],
       ["aedificabo","1st sg. future of aedifico (1st conj.)."],
       ["portae inferi","nom. pl. + genitive: “gates of the underworld”."],
       ["praevalebunt","3rd pl. future of praevaleo (2nd conj., -bu-)."]],
    v:[["petra, -ae (f.)","rock"],["aedifico, -are","to build"],["infernus / inferi","underworld, hell"],["adversus (+ acc.)","against"]],
    t:"Watch for quia introducing speech; it often just means a colon or “that”." },
  { id:"mt22-37", ref:"Matthew 22:37", g:"Gospels", lv:2, k:["fut","abl","dat"],
    la:"Ait illi Iesus: Diliges Dominum Deum tuum ex toto corde tuo, et in tota anima tua, et in tota mente tua.",
    dr:"Jesus said to him: Thou shalt love the Lord thy God with thy whole heart, and with thy whole soul, and with thy whole mind.",
    p:[["ait illi","ait, a defective verb of saying; illi is dat. sg. of ille."],
       ["diliges","2nd sg. future of diligo, used as a command: “thou shalt love”."],
       ["ex toto corde tuo","ex + abl. of cor, cordis (n.); totus has gen. totius, dat. toti."],
       ["in tota anima, in tota mente","in + ablative, “with”."]],
    v:[["aio (defective)","to say"],["cor, cordis (n.)","heart"],["anima, -ae (f.)","soul, life"],["mens, mentis (f.)","mind"]],
    t:"A future in a commandment is translated “thou shalt” or “you shall”." },
  { id:"mt28-19", ref:"Matthew 28:19", g:"Gospels", lv:2, k:["part","imp","gen"],
    la:"Euntes ergo docete omnes gentes: baptizantes eos in nomine Patris, et Filii, et Spiritus Sancti:",
    dr:"Going therefore, teach ye all nations; baptizing them in the name of the Father, and of the Son, and of the Holy Ghost.",
    p:[["euntes","nom. pl. present participle of eo: “going”."],
       ["docete","2nd pl. imperative of doceo (2nd conj.)."],
       ["omnes gentes","acc. pl. of gens, gentis (f.) “nation”."],
       ["baptizantes","present participle, nom. pl., agreeing with the understood subject of docete."],
       ["in nomine Patris…","in + abl. of nomen, followed by three genitives."]],
    v:[["eo, ire, ii","to go"],["doceo, -ere","to teach"],["gens, gentis (f.)","nation, people"]],
    t:"Participles agree with the subject of the command, even when that subject (“you”) is unstated." },
  { id:"mk1-15", ref:"Mark 1:15", g:"Gospels", lv:2, k:["dep","imp","part","dat","perf"],
    la:"et dicens: Quoniam impletum est tempus, et appropinquavit regnum Dei: poenitemini, et credite Evangelio.",
    dr:"And saying: The time is accomplished, and the kingdom of God is at hand: repent, and believe the gospel.",
    p:[["dicens","present participle of dico: “saying”."],
       ["quoniam","introduces the quoted words, like quia; leave it untranslated."],
       ["impletum est","perfect passive of impleo: “has been fulfilled”."],
       ["appropinquavit","perfect of appropinquo: “has drawn near”."],
       ["poenitemini","2nd pl. imperative of the deponent poeniteor: passive form, active command, “repent”."],
       ["credite Evangelio","credo takes the dative: “believe the gospel”."]],
    v:[["impleo, -ere","to fill, fulfil"],["appropinquo, -are","to approach"],["poeniteor (dep.)","to repent"]],
    t:"A deponent imperative in -mini looks like a 2nd pl. passive. Context makes it a command." },
  { id:"mk8-36", ref:"Mark 8:36", g:"Gospels", lv:3, k:["subj","dep","dat","fut"],
    la:"Quid enim proderit homini, si lucretur mundum totum et detrimentum animae suae faciat?",
    dr:"For what shall it profit a man, if he gain the whole world, and suffer the loss of his soul?",
    p:[["proderit","3rd sg. future of prosum (prod- before vowels), with the dative homini: “benefit a man”."],
       ["si lucretur","present subjunctive of the deponent lucror: a hypothetical condition."],
       ["mundum totum","acc. object of lucretur; totus “whole” (gen. totius, dat. toti)."],
       ["detrimentum … faciat","idiom: “suffer loss”. Faciat is present subjunctive."],
       ["animae suae","genitive: “of his soul”."]],
    v:[["prosum, prodesse","to benefit, profit (+ dat.)"],["lucror, -ari (dep.)","to gain"],["detrimentum, -i (n.)","loss, damage"]],
    t:"Prosum is sum with pro-/prod-: learn sum’s forms and you know prosum’s." },
  { id:"mk16-15", ref:"Mark 16:15", g:"Gospels", lv:2, k:["part","imp","dat"],
    la:"Et dixit eis: Euntes in mundum universum praedicate Evangelium omni creaturae.",
    dr:"And he said to them: Go ye into the whole world, and preach the gospel to every creature.",
    p:[["eis","dat. pl. of is: “to them”."],
       ["euntes","nom. pl. present participle of eo: “going”. English turns it into a second command."],
       ["in mundum universum","in + accusative: motion into."],
       ["praedicate","2nd pl. imperative of praedico (1st conj.)."],
       ["omni creaturae","dat. sg. fem.: “to every creature”."]],
    v:[["eo, ire, ii","to go"],["universus, -a, -um","whole, entire"],["praedico, -are","to proclaim, preach"]],
    t:"A participle + imperative often becomes two imperatives in English: “Go … and preach”." },
  { id:"lk1-28", ref:"Luke 1:28", g:"Gospels", lv:2, k:["dep","part","abl","imp","ellip"],
    la:"Et ingressus angelus ad eam dixit: Ave gratia plena: Dominus tecum: benedicta tu in mulieribus.",
    dr:"And the angel being come in, said unto her: Hail, full of grace, the Lord is with thee: blessed art thou among women.",
    p:[["ingressus","perfect participle of the deponent ingredior: “having entered”."],
       ["ave","imperative used as a greeting: “hail”."],
       ["gratia plena","plenus with the ablative (classical prose prefers the genitive): “full of grace”."],
       ["tecum","cum + te, with cum attached as an enclitic. Est is understood."],
       ["in mulieribus","in + abl. pl. of mulier: “among women”, a Hebrew way of saying “most blessed”."]],
    v:[["ingredior, -i, ingressus","to go in, enter"],["plenus, -a, -um","full"],["benedictus, -a, -um","blessed"],["mulier, -eris (f.)","woman"]],
    t:"Perfect participles of deponents are active: ingressus = “having entered”." },
  { id:"lk1-38", ref:"Luke 1:38a", g:"Gospels", lv:1, k:["subj","pass","ellip"],
    la:"Dixit autem Maria: Ecce ancilla Domini, fiat mihi secundum verbum tuum.",
    dr:"And Mary said: Behold the handmaid of the Lord: be it done to me according to thy word.",
    p:[["dixit autem","autem here just moves the story on: “and”."],
       ["ecce ancilla","ecce “behold”; sum is understood."],
       ["fiat","3rd sg. present subjunctive of fio, jussive: “let it be done”."],
       ["mihi","dative: “to me”."],
       ["secundum verbum tuum","secundum + accusative: “according to”."]],
    v:[["ancilla, -ae (f.)","handmaid, servant"],["fio, fieri, factus sum","to be done, become"],["secundum (+ acc.)","according to"]],
    t:"Fiat is the same form as in fiat lux (Genesis 1:3): “let it be”." },
  { id:"lk2-7", ref:"Luke 2:7", g:"Gospels", lv:2, k:["perf","abl","dat"],
    la:"Et peperit filium suum primogenitum, et pannis eum involvit, et reclinavit eum in praesepio: quia non erat eis locus in diversorio.",
    dr:"And she brought forth her first born son and wrapped him up in swaddling clothes and laid him in a manger: because there was no room for them in the inn.",
    p:[["peperit","3rd sg. perfect of pario: “gave birth to”."],
       ["pannis","abl. pl. of pannus: ablative of means, “in (with) cloths”."],
       ["involvit, reclinavit","3rd sg. perfects."],
       ["in praesepio","in + abl. of praesepium “manger”."],
       ["non erat eis locus","dative of possession: “they had no place”, “there was no room for them”."]],
    v:[["pario, -ere, peperi","to bear, give birth"],["primogenitus, -a, -um","firstborn"],["pannus, -i (m.)","cloth"],["diversorium, -ii (n.)","inn, lodging"]],
    t:"esse + dative = “to have”. Eis locus non erat = “they had no room”." },
  { id:"lk2-14", ref:"Luke 2:14", g:"Gospels", lv:1, k:["ellip","gen","dat","comp"],
    la:"Gloria in altissimis Deo, et in terra pax hominibus bonae voluntatis.",
    dr:"Glory to God in the highest; and on earth peace to men of good will.",
    p:[["gloria","nom. sg. (1st decl.); sit or est is understood."],
       ["in altissimis","in + abl. pl. of the superlative altissimus: “in the highest (places)”."],
       ["Deo","dat. sg.: “to God”."],
       ["pax","nom. sg. of pax, pacis (f.)."],
       ["hominibus","dat. pl. of homo, hominis."],
       ["bonae voluntatis","genitive of quality describing hominibus: “of good will”."]],
    v:[["altus, -a, -um","high"],["terra, -ae (f.)","earth"],["voluntas, -tatis (f.)","will, good pleasure"]],
    t:"A genitive of quality describes a noun the way an adjective would." },
  { id:"lk15-18", ref:"Luke 15:18", g:"Gospels", lv:1, k:["fut","perf"],
    la:"surgam, et ibo ad patrem meum, et dicam ei: Pater, peccavi in caelum, et coram te:",
    dr:"I will arise, and will go to my father, and say to him: Father, I have sinned against heaven, and before thee:",
    p:[["surgam, dicam","1st sg. futures of surgo and dico (3rd conj.)."],
       ["ibo","1st sg. future of eo."],
       ["ei","dat. sg. of is: “to him”."],
       ["peccavi","1st sg. perfect of pecco: “I have sinned”."],
       ["in caelum","in + accusative: “against heaven”."],
       ["coram te","coram + ablative: “in the presence of”."]],
    v:[["surgo, -ere","to rise"],["pecco, -are","to sin"],["coram (+ abl.)","before, in the presence of"]],
    t:"Surgam and dicam look like subjunctives. Next to the future ibo, they’re clearly futures." },
  { id:"lk23-43", ref:"Luke 23:43", g:"Gospels", lv:1, k:["fut","dat","abl"],
    la:"Et dixit illi Iesus: Amen dico tibi: Hodie mecum eris in paradiso.",
    dr:"And Jesus said to him: Amen I say to thee, this day thou shalt be with me in paradise.",
    p:[["dixit illi","dative: “said to him”."],
       ["amen","Hebrew loanword, indeclinable: “truly”."],
       ["mecum","cum + me, with cum as an enclitic."],
       ["eris","2nd sg. future of sum."],
       ["in paradiso","in + abl."]],
    v:[["hodie (adv.)","today"],["paradisus, -i (m.)","paradise"]],
    t:"Know the future of sum by heart: ero, eris, erit, erimus, eritis, erunt." },
  { id:"jn1-1", ref:"John 1:1", g:"Gospels", lv:1, k:["order","abl"],
    la:"In principio erat Verbum, et Verbum erat apud Deum, et Deus erat Verbum.",
    dr:"In the beginning was the Word, and the Word was with God, and the Word was God.",
    p:[["in principio","in + ablative: point in time, “in the beginning”."],
       ["erat","3rd sg. imperfect indicative of sum: ongoing past, “was”."],
       ["apud Deum","apud + accusative: “with, in the presence of”."],
       ["Deus erat Verbum","Two nominatives with sum. Deus is the predicate, fronted for emphasis; Verbum stays the subject."]],
    v:[["principium, -ii (n.)","beginning"],["verbum, -i (n.)","word"],["apud (+ acc.)","with, at the side of"]],
    t:"With sum, decide which nominative is the subject by asking what the sentence is about." },
  { id:"jn1-5", ref:"John 1:5", g:"Gospels", lv:1, k:["perf","abl"],
    la:"et lux in tenebris lucet, et tenebrae eam non comprehenderunt.",
    dr:"And the light shineth in darkness, and the darkness did not comprehend it.",
    p:[["lux","nom. sg. of lux, lucis (f.)."],
       ["in tenebris","in + abl. pl. Tenebrae is plural in form, singular in meaning."],
       ["lucet","3rd sg. present of luceo."],
       ["comprehenderunt","3rd pl. perfect of comprehendo: “grasp, overcome, understand”."],
       ["eam","acc. sg. fem.; points back to lux."]],
    v:[["lux, lucis (f.)","light"],["tenebrae, -arum (f. pl.)","darkness"],["comprehendo, -ere","to seize, grasp"]],
    t:"Track pronoun gender: eam is feminine, so it refers to lux, not to the plural tenebrae." },
  { id:"jn1-14", ref:"John 1:14", g:"Gospels", lv:3, k:["pass","perf","gen","order"],
    la:"Et Verbum caro factum est, et habitavit in nobis: et vidimus gloriam eius, gloriam quasi Unigeniti a Patre plenum gratiae et veritatis.",
    dr:"And the Word was made flesh, and dwelt among us, (and we saw his glory, the glory as it were of the only begotten of the Father,) full of grace and truth.",
    p:[["caro factum est","perfect of fio “became”, neuter to agree with Verbum; caro is predicate nominative."],
       ["habitavit in nobis","3rd sg. perfect of habito; in nobis = “among us”."],
       ["vidimus","1st pl. perfect of video."],
       ["quasi Unigeniti a Patre","genitive: “as of the Only-begotten from the Father”; a + ablative."],
       ["plenum gratiae et veritatis","plenus + genitive. The agreement is loose (Greek plērēs is often indeclinable); it describes the Word."]],
    v:[["caro, carnis (f.)","flesh"],["fio, fieri, factus sum","to become, be made"],["habito, -are","to dwell"],["quasi","as, as it were"]],
    t:"The Douay-Rheims brackets the middle clause as a parenthesis, so plenum attaches back to Verbum." },
  { id:"jn3-16", ref:"John 3:16", g:"Gospels", lv:2, k:["subj","perf","rel"],
    la:"Sic enim Deus dilexit mundum, ut Filium suum unigenitum daret: ut omnis qui credit in eum, non pereat, sed habeat vitam aeternam.",
    dr:"For God so loved the world, as to give his only begotten Son; that whosoever believeth in him, may not perish, but may have life everlasting.",
    p:[["sic … ut daret","result clause: sic signals ut + subjunctive. Daret is imperfect subj. of do, following the perfect dilexit."],
       ["dilexit","3rd sg. perfect of diligo."],
       ["ut … non pereat, sed habeat","purpose clause in the present subjunctive. Non (not ne) because it contrasts directly with sed."],
       ["credit in eum","credo in + accusative: the Christian Latin idiom “believe in”."],
       ["vitam aeternam","acc. sg., object of habeat."]],
    v:[["diligo, -ere, dilexi","to love"],["unigenitus, -a, -um","only-begotten"],["pereo, -ire","to perish"]],
    t:"Two ut clauses in one verse: the first follows sic (result), the second states the aim (purpose)." },
  { id:"jn6-35", ref:"John 6:35", g:"Gospels", lv:1, k:["fut","rel"],
    la:"Dixit autem eis Iesus: Ego sum panis vitae: qui venit ad me, non esuriet: et qui credit in me, non sitiet umquam.",
    dr:"And Jesus said to them: I am the bread of life: he that cometh to me shall not hunger: and he that believeth in me shall never thirst.",
    p:[["panis vitae","predicate nominative + genitive."],
       ["qui venit ad me","relative clause with no antecedent: “he who comes”."],
       ["esuriet","3rd sg. future of esurio (4th conj.)."],
       ["sitiet","3rd sg. future of sitio (4th conj.)."],
       ["non … umquam","together: “never”."]],
    v:[["esurio, -ire","to hunger"],["sitio, -ire","to thirst"],["umquam (adv.)","ever"]],
    t:"4th conjugation futures use -ie-: veniet, esuriet, sitiet." },
  { id:"jn8-32", ref:"John 8:32", g:"Gospels", lv:1, k:["fut"],
    la:"Et cognoscetis veritatem, et veritas liberabit vos.",
    dr:"And you shall know the truth, and the truth shall make you free.",
    p:[["cognoscetis","2nd pl. future of cognosco (3rd conj.)."],
       ["veritatem","acc. sg. of veritas, object."],
       ["liberabit","3rd sg. future of libero (1st conj., -bi-)."],
       ["vos","acc. pl., object of liberabit."]],
    v:[["cognosco, -ere","to come to know, learn"],["libero, -are","to set free"]],
    t:"Two futures, two conjugations: -etis (3rd) and -bit (1st)." },
  { id:"jn10-11", ref:"John 10:11", g:"Gospels", lv:1, k:["abl","order"],
    la:"Ego sum pastor bonus. Bonus pastor animam suam dat pro ovibus suis.",
    dr:"I am the good shepherd. The good shepherd giveth his life for his sheep.",
    p:[["pastor bonus / bonus pastor","the adjective moves before the noun the second time, for emphasis."],
       ["animam suam","suam is reflexive: it refers to the subject, the shepherd."],
       ["dat","3rd sg. present of do."],
       ["pro ovibus suis","pro + abl. pl. of ovis, ovis (f.) “sheep”."]],
    v:[["pastor, -oris (m.)","shepherd"],["anima, -ae (f.)","soul, life"],["ovis, -is (f.)","sheep"]],
    t:"Anima often means “life” as well as “soul”. The Douay-Rheims chooses “life” here." },
  { id:"jn11-25", ref:"John 11:25", g:"Gospels", lv:2, k:["fut","perf","rel","dep"],
    la:"Dixit ei Iesus: Ego sum resurrectio, et vita: qui credit in me, etiam si mortuus fuerit, vivet:",
    dr:"Jesus said to her: I am the resurrection and the life: he that believeth in me, although he be dead, shall live:",
    p:[["dixit ei","ei is dative of any gender. Context (Martha) makes it “to her”."],
       ["qui credit in me","relative clause with no antecedent: “he who believes”."],
       ["etiam si","“even if”."],
       ["mortuus fuerit","future perfect of the deponent morior: “shall have died”."],
       ["vivet","3rd sg. future of vivo."]],
    v:[["resurrectio, -onis (f.)","resurrection"],["morior, mori, mortuus","to die"],["etiam si","even if"]],
    t:"Latin uses the future perfect for an action finished before another future one. English often uses a present." },
  { id:"jn11-35", ref:"John 11:35", g:"Gospels", lv:1, k:["dep","perf"],
    la:"Et lacrimatus est Iesus.",
    dr:"And Jesus wept.",
    p:[["lacrimatus est","3rd sg. perfect of the deponent lacrimor: passive form, active meaning."],
       ["Iesus","nominative subject, placed after the verb."]],
    v:[["lacrimor, -ari, lacrimatus sum","to weep, shed tears"]],
    t:"A good warm-up: spot the deponent and translate it actively." },
  { id:"jn13-34", ref:"John 13:34", g:"Gospels", lv:2, k:["subj","dat","perf"],
    la:"Mandatum novum do vobis: Ut diligatis invicem, sicut dilexi vos, ut et vos diligatis invicem.",
    dr:"A new commandment I give unto you: That you love one another, as I have loved you, that you also love one another.",
    p:[["mandatum novum","acc. object, placed first for emphasis."],
       ["do vobis","dat. pl.: “to you”."],
       ["ut diligatis","substantive ut clause spelling out the commandment: “that you love”."],
       ["invicem","“one another”."],
       ["dilexi","1st sg. perfect of diligo."],
       ["ut et vos","et = “also” here."]],
    v:[["mandatum, -i (n.)","commandment"],["invicem (adv.)","mutually, one another"],["sicut","just as"]],
    t:"An ut clause can be the content of a noun (command, request): translate “that…”, not “so that…”." },
  { id:"jn14-6", ref:"John 14:6", g:"Gospels", lv:1, k:["order","dat"],
    la:"Dicit ei Iesus: Ego sum via, et veritas, et vita. Nemo venit ad Patrem, nisi per me.",
    dr:"Jesus saith to him: I am the way, and the truth, and the life. No man cometh to the Father, but by me.",
    p:[["dicit","historical present, 3rd sg. of dico."],
       ["ei","dat. sg. of is: “to him”."],
       ["ego sum","the pronoun is emphatic; sum alone would mean “I am”."],
       ["via, veritas, vita","three predicate nominatives."],
       ["nisi per me","nisi “except” + per + accusative."]],
    v:[["via, -ae (f.)","way, road"],["veritas, -tatis (f.)","truth"],["nemo","no one"],["nisi","unless, except"]],
    t:"Latin drops subject pronouns. When ego appears, it carries emphasis." },
  { id:"jn15-13", ref:"John 15:13", g:"Gospels", lv:3, k:["comp","abl","subj"],
    la:"Maiorem hac dilectionem nemo habet, ut animam suam ponat quis pro amicis suis.",
    dr:"Greater love than this no man hath, that a man lay down his life for his friends.",
    p:[["maiorem","acc. sg. fem. comparative of magnus, agreeing with dilectionem."],
       ["hac","ablative of comparison: “than this”."],
       ["ut … ponat","ut + subjunctive explaining hac: “(namely) that someone lay down”."],
       ["quis","indefinite “anyone”, as after si, nisi, ne, num."],
       ["animam ponere","idiom: “lay down one’s life”."]],
    v:[["maior, maius","greater"],["dilectio, -onis (f.)","love"],["pono, -ere","to put, lay down"],["amicus, -i (m.)","friend"]],
    t:"An ablative right after a comparative often means “than”: maior hac = greater than this." },
  { id:"jn20-29", ref:"John 20:29", g:"Gospels", lv:2, k:["perf","rel","ellip"],
    la:"Dixit ei Iesus: Quia vidisti me, Thoma, credidisti: beati qui non viderunt, et crediderunt.",
    dr:"Jesus saith to him: Because thou hast seen me, Thomas, thou hast believed: blessed are they that have not seen, and have believed.",
    p:[["quia","“because”."],
       ["vidisti, credidisti","2nd sg. perfects of video and credo."],
       ["Thoma","vocative of Thomas."],
       ["beati qui","sunt and an antecedent are omitted: “blessed (are those) who”."],
       ["viderunt, crediderunt","3rd pl. perfects."]],
    v:[["video, -ere, vidi","to see"],["credo, -ere, credidi","to believe"]],
    t:"Perfect endings: -i, -isti, -it, -imus, -istis, -erunt." },
  // Acts & Epistles
  { id:"ac1-8", ref:"Acts 1:8", g:"Acts & Epistles", lv:3, k:["fut","part","dat","gen"],
    la:"sed accipietis virtutem supervenientis Spiritus Sancti in vos, et eritis mihi testes in Ierusalem, et in omni Iudaea, et Samaria, et usque ad ultimum terrae.",
    dr:"But you shall receive the power of the Holy Ghost coming upon you, and you shall be witnesses unto me in Jerusalem, and in all Judea, and Samaria, and even to the uttermost part of the earth.",
    p:[["accipietis","2nd pl. future of accipio (3rd -io)."],
       ["supervenientis Spiritus Sancti","genitive present participle agreeing with Spiritus: “of the Holy Spirit coming upon”."],
       ["in vos","in + accusative: “upon you”."],
       ["eritis mihi testes","dative of reference: “witnesses for me”."],
       ["usque ad ultimum terrae","neuter adjective as noun + partitive genitive: “to the farthest part of the earth”."]],
    v:[["virtus, -tutis (f.)","power, strength"],["supervenio, -ire","to come upon"],["testis, -is (m.)","witness"],["usque ad","as far as"]],
    t:"Find the noun a participle agrees with before translating it: supervenientis matches Spiritus, not virtutem." },
  { id:"ac2-38", ref:"Acts 2:38", g:"Acts & Epistles", lv:3, k:["imp","subj","gen","pass"],
    la:"Petrus vero ad illos: Poenitentiam, inquit, agite, et baptizetur unusquisque vestrum in nomine Iesu Christi in remissionem peccatorum vestrorum: et accipietis donum Spiritus Sancti.",
    dr:"But Peter said to them: Do penance, and be baptized every one of you in the name of Jesus Christ, for the remission of your sins: and you shall receive the gift of the Holy Ghost.",
    p:[["Petrus vero ad illos","verb of saying held back until inquit."],
       ["inquit","“he says/said”, always set inside the quotation."],
       ["poenitentiam agite","2nd pl. imperative of ago: “do penance”."],
       ["baptizetur","3rd sg. present passive subjunctive, jussive: “let each be baptized”."],
       ["unusquisque vestrum","partitive genitive: “each one of you”."],
       ["in remissionem","in + accusative of purpose: “for the remission”."]],
    v:[["poenitentia, -ae (f.)","repentance, penance"],["unusquisque","each one"],["remissio, -onis (f.)","forgiveness"],["donum, -i (n.)","gift"]],
    t:"Inquit interrupts a quotation. Move it to the front in English: “Peter said: …”." },
  { id:"rm1-16", ref:"Romans 1:16", g:"Acts & Epistles", lv:2, k:["dat","part","ellip"],
    la:"Non enim erubesco Evangelium. Virtus enim Dei est in salutem omni credenti, Iudaeo primum, et Graeco.",
    dr:"For I am not ashamed of the gospel. For it is the power of God unto salvation to every one that believeth, to the Jew first, and to the Greek.",
    p:[["erubesco","1st sg. present, “I blush at, am ashamed of”, with an accusative object."],
       ["virtus Dei est","the subject (the gospel) is understood."],
       ["in salutem","in + accusative of purpose: “unto salvation”."],
       ["omni credenti","dative of the present participle credens, used as a noun: “to everyone believing”."],
       ["Iudaeo, Graeco","datives in apposition to credenti."]],
    v:[["erubesco, -ere","to blush, be ashamed of"],["salus, -utis (f.)","salvation, health"],["primum (adv.)","first"]],
    t:"A participle with no noun often means “the one who…”: credenti = “to the one who believes”." },
  { id:"rm5-8", ref:"Romans 5:8–9a", g:"Acts & Epistles", lv:3, k:["subj","dep","perf"],
    la:"Commendat autem caritatem suam Deus in nobis: quoniam cum adhuc peccatores essemus, secundum tempus Christus pro nobis mortuus est:",
    dr:"But God commendeth his charity towards us: because when as yet we were sinners according to the time, Christ died for us;",
    p:[["commendat","3rd sg. present of commendo: “shows, proves”."],
       ["in nobis","“towards us”."],
       ["cum … essemus","cum + imperfect subjunctive, circumstantial: “when we were”."],
       ["secundum tempus","“at the appointed time”."],
       ["mortuus est","perfect of the deponent morior: “died”."]],
    v:[["commendo, -are","to commend, prove"],["adhuc (adv.)","still, as yet"],["peccator, -oris (m.)","sinner"]],
    t:"cum + subjunctive is usually “when”, “since” or “although”. Read the main clause to decide." },
  { id:"rm6-23", ref:"Romans 6:23", g:"Acts & Epistles", lv:2, k:["ellip","gen","abl"],
    la:"Stipendia enim peccati, mors. Gratia autem Dei, vita aeterna, in Christo Iesu Domino nostro.",
    dr:"For the wages of sin is death. But the grace of God, life everlasting, in Christ Jesus our Lord.",
    p:[["stipendia","nom. pl. neut. of stipendium: “wages”. The verb is omitted."],
       ["peccati","gen. sg. of peccatum."],
       ["mors","predicate nominative."],
       ["gratia autem Dei","nominative + genitive. Autem marks the contrast: “but”."],
       ["in Christo Iesu Domino nostro","in + ablative, with Domino nostro in apposition."]],
    v:[["stipendium, -ii (n.)","pay, wages"],["peccatum, -i (n.)","sin"],["mors, mortis (f.)","death"]],
    t:"Paul drops est twice. English needs it supplied." },
  { id:"rm8-31", ref:"Romans 8:31", g:"Acts & Epistles", lv:1, k:["fut","ellip"],
    la:"Quid ergo dicemus ad haec? si Deus pro nobis, quis contra nos?",
    dr:"What shall we then say to these things? If God be for us, who is against us?",
    p:[["quid","acc. sg. neut. interrogative, object of dicemus."],
       ["dicemus","1st pl. future of dico, -ere. In the 3rd conjugation, -emus marks the future."],
       ["ad haec","ad + acc. neut. pl. of hic: “to these things”."],
       ["pro nobis","pro + ablative: “for, on behalf of”. Est is omitted."],
       ["contra nos","contra + accusative: “against”."]],
    v:[["ergo","therefore, then"],["pro (+ abl.)","for, on behalf of"],["contra (+ acc.)","against"]],
    t:"Don’t read dicemus as a present. Compare dicimus (we say) with dicemus (we shall say)." },
  { id:"1co13-4", ref:"1 Corinthians 13:4", g:"Acts & Epistles", lv:2, k:["dep","pass","part"],
    la:"Caritas patiens est, benigna est. Caritas non aemulatur, non agit perperam, non inflatur.",
    dr:"Charity is patient, is kind: charity envieth not, dealeth not perversely; is not puffed up;",
    p:[["patiens est","present participle of the deponent patior, used as a predicate adjective."],
       ["benigna","nom. sg. fem. adjective agreeing with caritas."],
       ["aemulatur","3rd sg. present of the deponent aemulor: passive form, active meaning, “envies”."],
       ["agit perperam","ago + the adverb perperam: “acts wrongly”."],
       ["inflatur","3rd sg. present passive of inflo: “is puffed up”."]],
    v:[["caritas, -tatis (f.)","love, charity"],["benignus, -a, -um","kind"],["aemulor, -ari (dep.)","to envy"],["perperam (adv.)","wrongly"]],
    t:"Deponent verbs look passive but translate actively. Inflatur is a true passive." },
  { id:"1co13-13", ref:"1 Corinthians 13:13", g:"Acts & Epistles", lv:2, k:["comp","gen","order"],
    la:"Nunc autem manent fides, spes, caritas, tria haec: maior autem horum est caritas.",
    dr:"And now there remain faith, hope, and charity, these three: but the greatest of these is charity.",
    p:[["manent","3rd pl. present of maneo; its three subjects follow it."],
       ["tria haec","neuter plural summing up the three nouns: “these three (things)”."],
       ["maior","comparative of magnus, where English might expect “greatest”."],
       ["horum","partitive genitive of hic: “of these”."]],
    v:[["maneo, -ere","to remain"],["spes, spei (f.)","hope"],["tres, tria","three"]],
    t:"Latin can use the comparative maior even when picking one out of three. English says “the greatest”, as the Douay-Rheims does." },
  { id:"2co5-17", ref:"2 Corinthians 5:17", g:"Acts & Epistles", lv:3, k:["ellip","perf","pass"],
    la:"Si qua ergo in Christo nova creatura, vetera transierunt, ecce facta sunt omnia nova.",
    dr:"If then any be in Christ a new creature, the old things are passed away, behold all things are made new.",
    p:[["si qua","qua = aliqua, the indefinite after si; est is omitted: “if there is any new creature”."],
       ["vetera","neut. pl. of vetus, used as a noun: “the old things”."],
       ["transierunt","3rd pl. perfect of transeo: “have passed away”."],
       ["facta sunt","perfect of fio: “have become, are made”."],
       ["omnia nova","subject + predicate adjective."]],
    v:[["creatura, -ae (f.)","creature, creation"],["vetus, veteris","old"],["transeo, -ire","to pass over, pass away"]],
    t:"After si, nisi, num, ne, drop the ali- from aliquis: si quis, si qua, si quid." },
  { id:"eph2-8", ref:"Ephesians 2:8", g:"Acts & Epistles", lv:2, k:["abl","pass","perf","gen"],
    la:"Gratia enim estis salvati per fidem, et hoc non ex vobis: Dei enim donum est:",
    dr:"For by grace you are saved through faith, and that not of yourselves, for it is the gift of God;",
    p:[["gratia","ablative of means: “by grace”."],
       ["estis salvati","2nd pl. perfect passive of salvo: “you have been saved”."],
       ["per fidem","per + accusative: “through”."],
       ["hoc non ex vobis","est is omitted."],
       ["Dei donum est","genitive + predicate nominative."]],
    v:[["salvo, -are","to save"],["fides, -ei (f.)","faith"],["donum, -i (n.)","gift"]],
    t:"Without macrons, -a can be nominative or ablative. Here the sentence already has a subject (you), so gratia is ablative." },
  { id:"ph2-8", ref:"Philippians 2:8", g:"Acts & Epistles", lv:2, k:["part","pass","gen"],
    la:"humiliavit semetipsum factus obediens usque ad mortem, mortem autem crucis.",
    dr:"He humbled himself, becoming obedient unto death, even to the death of the cross.",
    p:[["humiliavit","3rd sg. perfect of humilio."],
       ["semetipsum","emphatic reflexive (se + -met + ipsum): “himself”."],
       ["factus","perfect participle of fio: “having become”."],
       ["obediens","present participle used as an adjective: “obedient”."],
       ["mortem autem crucis","repeated for emphasis; crucis is genitive of crux."]],
    v:[["humilio, -are","to humble"],["obediens, -entis","obedient"],["crux, crucis (f.)","cross"]],
    t:"Factus works like an English participle: “having become”, or simply “becoming”." },
  { id:"ph4-13", ref:"Philippians 4:13", g:"Acts & Epistles", lv:1, k:["rel","abl"],
    la:"Omnia possum in eo qui me confortat.",
    dr:"I can do all things in him who strengtheneth me.",
    p:[["omnia","acc. pl. neut.: “all things”."],
       ["possum","1st sg. present of possum (pot- + sum)."],
       ["in eo","in + abl. sg. of is: “in him”."],
       ["confortat","3rd sg. present of conforto, a Late Latin verb, “strengthen”."]],
    v:[["possum, posse","to be able"],["conforto, -are","to strengthen"]],
    t:"Possum takes omnia as its object, with “do” understood: “I can (do) all things”." },
  { id:"ga2-20", ref:"Galatians 2:20a", g:"Acts & Epistles", lv:1, k:["ellip","order"],
    la:"Vivo autem, iam non ego: vivit vero in me Christus.",
    dr:"And I live, now not I; but Christ liveth in me.",
    p:[["vivo","1st sg. present of vivo."],
       ["iam non ego","“no longer I”; vivo is understood again."],
       ["vero","“but, in truth”."],
       ["vivit … Christus","the subject comes last, after the prepositional phrase."]],
    v:[["vivo, -ere","to live"],["iam non","no longer"],["vero","but, indeed"]],
    t:"The first half of the verse only. Ego is stated just to be denied." },
  { id:"hb11-1", ref:"Hebrews 11:1", g:"Acts & Epistles", lv:3, k:["part","gen","order"],
    la:"Est autem fides sperandarum substantia rerum, argumentum non apparentium.",
    dr:"Now faith is the substance of things to be hoped for, the evidence of things that appear not.",
    p:[["autem","postpositive conjunction: “now, moreover”."],
       ["sperandarum … rerum","gerundive, gen. pl. fem., split from its noun (hyperbaton): “of things to be hoped for”."],
       ["substantia, argumentum","predicate nominatives after est."],
       ["non apparentium","gen. pl. present participle of appareo, used as a noun: “of things not appearing”."]],
    v:[["spero, -are","to hope"],["substantia, -ae (f.)","substance, foundation"],["argumentum, -i (n.)","proof, evidence"],["appareo, -ere","to appear"]],
    t:"Match endings across the gap: sperandarum looks for a fem. gen. pl. noun, and finds rerum." },
  { id:"hb13-8", ref:"Hebrews 13:8", g:"Acts & Epistles", lv:1, k:["ellip"],
    la:"Iesus Christus heri, et hodie: ipse et in saecula.",
    dr:"Jesus Christ, yesterday, and today: and the same for ever.",
    p:[["(no verb)","supply est: “is (the same)”."],
       ["heri, hodie","adverbs of time."],
       ["ipse","“the same”."],
       ["in saecula","literally “into the ages”: “for ever”."]],
    v:[["heri (adv.)","yesterday"],["saeculum, -i (n.)","age, generation"]],
    t:"With no verb at all, decide what the sentence asserts and supply “is”." },
  { id:"jas2-26", ref:"James 2:26", g:"Acts & Epistles", lv:2, k:["abl","comp"],
    la:"Sicut enim corpus sine spiritu mortuum est, ita et fides sine operibus mortua est.",
    dr:"For even as the body without the spirit is dead; so also faith without works is dead.",
    p:[["sicut … ita","correlatives: “just as … so”."],
       ["sine spiritu, sine operibus","sine + ablative."],
       ["mortuum, mortua","predicate adjectives: neuter for corpus, feminine for fides."],
       ["et","“also”."]],
    v:[["corpus, -oris (n.)","body"],["opus, operis (n.)","work"],["mortuus, -a, -um","dead"]],
    t:"Adjective endings tell you which noun they go with: mortuum → corpus, mortua → fides." },
  { id:"1pt5-7", ref:"1 Peter 5:7", g:"Acts & Epistles", lv:2, k:["part","dat"],
    la:"omnem sollicitudinem vestram proiicientes in eum, quoniam ipsi cura est de vobis.",
    dr:"Casting all your care upon him, for he hath care of you.",
    p:[["proiicientes","present participle, nom. pl.: “casting”."],
       ["omnem sollicitudinem","acc. sg. of sollicitudo: “all your anxiety”."],
       ["in eum","in + accusative: “onto him”."],
       ["ipsi cura est","dative of possession: “he has care”."],
       ["de vobis","de + ablative: “about you”."]],
    v:[["sollicitudo, -inis (f.)","anxiety, care"],["proiicio, -ere","to throw, cast"],["cura, -ae (f.)","care, concern"]],
    t:"Another dative of possession: ipsi cura est = “he has care”." },
  { id:"1jn4-8", ref:"1 John 4:8", g:"Acts & Epistles", lv:1, k:["rel","perf"],
    la:"Qui non diligit, non novit Deum: quoniam Deus caritas est.",
    dr:"He that loveth not, knoweth not God: for God is charity.",
    p:[["qui non diligit","relative clause with no antecedent: “he who does not love”."],
       ["novit","perfect of nosco with present meaning: “knows”."],
       ["Deus caritas est","subject and predicate nominative. Verb last, as usual."]],
    v:[["diligo, -ere","to love"],["nosco, -ere, novi","to get to know; perf. = know"]],
    t:"Novi, novisti, novit: perfect form, present sense. Memini and odi work the same way." },
  // Apocalypse
  { id:"ap1-8", ref:"Apocalypse 1:8", g:"Apocalypse", lv:2, k:["part","rel","fut"],
    la:"Ego sum alpha et omega, principium et finis, dicit Dominus Deus: qui est, et qui erat, et qui venturus est, omnipotens.",
    dr:"I am Alpha and Omega, the beginning and the end, saith the Lord God, who is, and who was, and who is to come, the Almighty.",
    p:[["alpha et omega","indeclinable Greek letters."],
       ["principium et finis","predicate nominatives."],
       ["qui venturus est","future active participle of venio + est: “who is about to come”."],
       ["omnipotens","adjective used as a noun: “the Almighty”."]],
    v:[["finis, -is (m.)","end"],["venturus, -a, -um","about to come"],["omnipotens, -entis","all-powerful"]],
    t:"-urus + sum means “about to”: venturus est = “is to come”." },
  { id:"ap21-5", ref:"Apocalypse 21:5a", g:"Apocalypse", lv:1, k:["rel","order","abl"],
    la:"Et dixit qui sedebat in throno: Ecce nova facio omnia.",
    dr:"And he that sat on the throne, said: Behold, I make all things new.",
    p:[["qui sedebat","imperfect of sedeo in a relative clause with no antecedent: “he who was sitting”."],
       ["in throno","in + ablative."],
       ["ecce","“behold”."],
       ["nova facio omnia","nova is predicative: “I make all things new”."]],
    v:[["sedeo, -ere","to sit"],["thronus, -i (m.)","throne"],["novus, -a, -um","new"]],
    t:"With facio, a second accusative adjective says what the object becomes." }
];
const GROUPS = ["Gospels", "Acts & Epistles", "Apocalypse"];
const BY_ID = Object.fromEntries(VERSES.map(v => [v.id, v]));

/* ---------- Full New Testament data (loaded per book) ---------- */
/* The five parts of the exam, and the texts behind each. books: [code, name, versesPerChapter, chapterLabels?] */
const PARTS = /*PARTS_JSON*/[];
const PART_INFO = {
  nt: { short: "New Testament", src: "the Latin Vulgate New Testament", ref: "Douay-Rheims", book: "Book", chap: "Chapter" },
  st: { short: "Summa", src: "St Thomas Aquinas, Summa Theologiae (First Part)", ref: "English Dominican translation", book: "Question", chap: "Article" },
  se: { short: "Matins sermon", src: "a patristic sermon or homily read at Matins in the Roman Breviary", ref: "English translation", book: "Season", chap: "Lesson" },
  hy: { short: "Office hymn", src: "a Latin hymn of the Divine Office (Roman Breviary)", ref: "English verse translation", book: "", chap: "Hymn" },
  ps: { short: "Psalms", src: "a Psalm in the Latin Vulgate (Gallican Psalter)", ref: "Douay-Rheims", book: "", chap: "Psalm" }
};
const PART_IDS = PARTS.map(p => p.id);
const BOOKS = [].concat(...PARTS.map(p => p.books.map(b => [b[0], b[1], b[2], p.id, b[3] || null])));
const BOOK = Object.fromEntries(BOOKS.map(b => [b[0], b]));
const partOf = code => (BOOK[code] ? BOOK[code][3] : "nt");
const partBooks = pid => BOOKS.filter(b => b[3] === pid);
const BOOK_NAME = Object.fromEntries(BOOKS.map(b => [b[0], b[1]]));
const REF_CODE = { "Matthew":"mt","Mark":"mk","Luke":"lk","John":"jn","Acts":"ac","Romans":"rm","1 Corinthians":"1co","2 Corinthians":"2co",
  "Galatians":"ga","Ephesians":"eph","Philippians":"ph","Hebrews":"hb","James":"jas","1 Peter":"1pt","1 John":"1jn","Apocalypse":"ap" };
function verseAt(ref) { const m = ref.match(/^(.*) (\d+):(\d+)(?:–(\d+))?/); return { b: REF_CODE[m[1]], c: +m[2], v: +m[3], v2: m[4] ? +m[4] : +m[3] }; }
const WORD_RE = /[A-Za-z]+/g;
const n1 = w => w.toLowerCase().replace(/j/g, "i").replace(/v/g, "u");

let lexPromise = null;
const bookCache = {};
/* The offline copy carries every data file gzipped in window.__LV_DATA. */
async function unpackData(b64) {
  const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const stream = new Blob([bin]).stream().pipeThrough(new DecompressionStream("gzip"));
  return JSON.parse(await new Response(stream).text());
}
function getJSON(url) {
  const pack = window.__LV_DATA;
  if (pack) { const k = url.replace(/^data\//, "").replace(/\?.*$/, ""); if (pack[k]) return unpackData(pack[k]); }
  return fetch(url).then(r => { if (!r.ok) throw new Error(String(r.status)); return r.json(); }); }
function loadLex() { if (!lexPromise) lexPromise = getJSON("data/lexicon.json").catch(e => { lexPromise = null; throw e; }); return lexPromise; }
function loadBook(code) { if (!bookCache[code]) bookCache[code] = getJSON("data/" + code + ".json").catch(e => { delete bookCache[code]; throw e; }); return bookCache[code]; }
function useNT(code) {
  const [st, setSt] = useState({ lex: null, book: null, err: null });
  useEffect(() => {
    if (!code) return;
    let alive = true;
    Promise.all([loadLex(), loadBook(code)])
      .then(([lex, book]) => { if (alive) setSt({ lex, book, err: null }); })
      .catch(() => { if (alive) setSt(s => ({ ...s, err: "The text didn’t load. Check your connection, then reload the page." })); });
    return () => { alive = false; };
  }, [code]);
  return st.book && st.book.code === code ? st : { lex: st.lex, book: null, err: st.err };
}

/* Group a chapter's verses into passages of up to ~45 Latin words (max 4 verses). */
function blocksFor(chapter) {
  const out = []; let cur = []; let words = 0;
  chapter.forEach(v => {
    const n = (v[1].match(WORD_RE) || []).length;
    if (cur.length && (words + n > 45 || cur.length >= 4)) { out.push(cur); cur = []; words = 0; }
    cur.push(v); words += n;
  });
  if (cur.length) out.push(cur);
  return out;
}
const passageKey = (b, c, v) => `${b}.${c}.${v}`;
function parseKey(k) { const [b, c, v] = k.split("."); return { b, c: +c, v: +v }; }
/* Short tag for a row: verse number, stanza number, or Summa section (Obj. 1, Resp., Ad 2). */
const SHORT = l => (l || "").replace("Objection ", "Obj. ").replace("Sed contra", "S.c.").replace("Respondeo", "Resp.").replace("Reply ", "Ad ").replace("Stanza ", "").replace(/^Lesson \d+$/, "");
const rowTag = v => (v[4] != null ? SHORT(v[4]) : String(v[0]));
const promptTag = v => (v[4] != null ? (SHORT(v[4]) || v[4]) : String(v[0]));
function passageLabel(b, c, block, book) {
  const p = partOf(b), a = block[0], z = block[block.length - 1];
  const rng = (x, y) => (x === y ? `${x}` : `${x}–${y}`);
  const meta = book && book.meta ? book.meta[c - 1] : null;
  if (p === "ps") return `Psalm ${c}:${rng(a[0], z[0])}`;
  if (p === "st") return `Summa I, q. ${b.slice(2)}, a. ${c} · ${a[4]}${z !== a ? " – " + z[4] : ""}`;
  if (p === "se") return meta ? meta.label : `${BOOK_NAME[b]}, lesson ${c}`;
  if (p === "hy") {
    const n = book ? book.ch[c - 1].length : 0;
    return `${meta ? meta.label : "Hymn " + c}${n && block.length === n ? " (whole hymn)" : ` · stanza${block.length > 1 ? "s" : ""} ${rng(a[0], z[0])}`}`;
  }
  return `${BOOK_NAME[b]} ${c}:${rng(a[0], z[0])}`;
}
const passageSub = (b, c, book) => { const m = book && book.meta ? book.meta[c - 1] : null; return m ? m.title || "" : ""; };

/* Passage index: difficulty (0–100 within its part) and grammar tags, for picking. */
let pidxPromise = null;
function loadPassages() {
  if (!pidxPromise) pidxPromise = getJSON("data/passages.json").then(idx => {
    const byKey = {};
    Object.entries(idx).forEach(([pid, rows]) => rows.forEach(r => { byKey[`${r[0]}.${r[1]}.${r[2]}`] = { d: r[3], tags: r[4] ? r[4].split(",") : [], n: r[5] }; }));
    return { idx, byKey };
  }).catch(e => { pidxPromise = null; throw e; });
  return pidxPromise;
}
const diffWord = pct => (pct < 34 ? "Easier" : pct < 67 ? "Medium" : "Harder");

/* Ability per exam part: a simple Elo-style estimate on the 0–1 difficulty scale. */
const ABIL0 = { t: 0.6, n: 0 };   // third-year students: start matched to medium-hard passages
const pSuccess = (t, d) => 1 / (1 + Math.exp(-6 * (t - d)));
function applyAbility(prog, part, d, score, k) {
  const a = (prog.ability || {})[part] || ABIL0;
  const p = pSuccess(a.t, d);
  const t = Math.max(-0.3, Math.min(1.3, a.t + k * (score - p) * (a.n < 6 ? 1.6 : 1)));
  return { ...prog, ability: { ...(prog.ability || {}), [part]: { t: +t.toFixed(3), n: a.n + 1 } } };
}
const readiness = a => Math.round(pSuccess((a || ABIL0).t, 0.6) * 100);

/* ---------- Describing a word ---------- */
const POS_L = { "A-":"Adjective","Df":"Adverb","Dq":"Relative adverb","Du":"Interrogative adverb","C-":"Conjunction","G-":"Subordinating conjunction",
  "R-":"Preposition","I-":"Interjection","Nb":"Noun","Ne":"Proper noun","Ma":"Numeral","Mo":"Ordinal numeral","Pp":"Personal pronoun",
  "Pk":"Reflexive pronoun","Ps":"Possessive adjective","Pt":"Reflexive possessive","Pd":"Demonstrative pronoun","Pi":"Interrogative pronoun",
  "Pr":"Relative pronoun","Px":"Indefinite pronoun","Pc":"Reciprocal pronoun","Py":"Quantifier","V-":"Verb","F-":"Foreign word",
  "N?":"Noun","A?":"Adjective","V?":"Verb","D?":"Adverb" };
const T_L = { p:"present", i:"imperfect", r:"perfect", l:"pluperfect", t:"future perfect", f:"future" };
const M_L = { i:"indicative", s:"subjunctive", m:"imperative", n:"infinitive", p:"participle", d:"gerund", g:"gerundive", u:"supine" };
const N_L = { s:"singular", p:"plural" };
const G_L = { m:"masculine", f:"feminine", n:"neuter", o:"masc./neut.", p:"masc./fem.", q:"any gender", r:"fem./neut." };
const C_L = { n:"nominative", a:"accusative", g:"genitive", d:"dative", b:"ablative", v:"vocative", l:"locative", c:"genitive/dative" };
const PERS = { 1:"1st", 2:"2nd", 3:"3rd" };
function parseLabel(pos, m, lemma) {
  if (!m || m === "??") return null;
  const [pe, nu, te, mo, vo, ge, ca, de] = m;
  const voice = vo === "p" ? (/or$/.test(lemma) ? "deponent" : "passive") : vo === "a" ? "active" : "";
  const nominal = [C_L[ca], N_L[nu], G_L[ge]].filter(Boolean);
  if (pos === "V-") {
    if (mo === "p") return [T_L[te], voice, "participle", "·", ...nominal].filter(Boolean).join(" ");
    if (mo === "n") return [T_L[te], voice, "infinitive"].filter(Boolean).join(" ");
    if (mo === "d" || mo === "g" || mo === "u") return [M_L[mo], "·", ...nominal].filter(Boolean).join(" ");
    return [T_L[te], M_L[mo], voice, "·", PERS[pe] && PERS[pe] + " person", N_L[nu]].filter(Boolean).join(" ");
  }
  const deg = de === "c" ? "comparative" : de === "s" ? "superlative" : "";
  return [...nominal, deg].filter(Boolean).join(" ");
}
function readings(entry) {
  if (entry == null || entry === -1) return { kind: "none", ids: [] };
  if (typeof entry === "number") return { kind: "context", ids: [entry] };
  if (typeof entry === "string") return { kind: "compound", ids: entry.split("+").map(Number) };
  return { kind: "lookup", ids: entry };
}
function describe(lex, id) {
  const [li, pos, m] = lex.ana[id];
  const [lemma, gloss] = lex.lemmas[li];
  return { lemma, gloss, pos, posL: POS_L[pos] || "", parse: parseLabel(pos, m, lemma), guess: m === "??", m };
}

/* Concept tags detected from a passage's parsed words. */
const AUTO_ORDER = ["dep", "subj", "absl", "ind", "part", "imp", "comp", "fut", "pass", "perf", "rel", "abl", "dat", "gen"];
const SAY = new Set(["dico", "aio", "inquam", "credo", "puto", "existimo", "arbitror", "scio", "nescio", "sentio", "audio", "intellego", "intelligo",
  "cognosco", "nego", "spero", "ostendo", "affirmo", "assero", "probo", "dubito", "doceo", "respondeo", "ignoro", "confiteor", "testor"]);
function autoTags(lex, verses) {
  const c = {};
  const lem = new Set();
  const add = t => { c[t] = (c[t] || 0) + 1; };
  verses.forEach(v => v[3].forEach(e => {
    const r = readings(e);
    if (r.kind === "none") return;
    const ids = r.kind === "lookup" ? [r.ids[0]] : r.ids;
    ids.forEach(id => {
      const [li, pos, m] = lex.ana[id];
      if (!m || m === "??") return;
      const lemma = lex.lemmas[li][0];
      lem.add(lemma);
      if (pos === "Pr") add("rel");
      if (pos !== "V-") { if (m[7] === "c" || m[7] === "s") add("comp"); }
      if (pos === "V-") {
        if (m[3] === "s") add("subj");
        if (m[3] === "m") add("imp");
        if ("pdg".includes(m[3])) add("part");
        if (m[2] === "f" || m[2] === "t") add("fut");
        if ("rlt".includes(m[2])) add("perf");
        if (m[4] === "p") add(/or$/.test(lemma) ? "dep" : "pass");
        if (m[3] === "n") add("inf");
        if (m[3] === "p" && m[6] === "b") add("absl");
      }
      if (m[6] === "b") add("abl");
      if (m[6] === "g") add("gen");
      if (m[6] === "d") add("dat");
    });
  }));
  if ([...lem].some(l => SAY.has(l)) && (c.inf || lem.has("quod") || lem.has("quia") || lem.has("quoniam"))) add("ind");
  return AUTO_ORDER.filter(t => (["abl", "gen", "dat"].includes(t) ? c[t] >= 2 : c[t] >= 1)).slice(0, 5);
}

/* ---------- Spaced repetition + skill model ---------- */
const DAY = 864e5;
const INTERVALS = [10 * 6e4, 1 * DAY, 3 * DAY, 7 * DAY, 16 * DAY, 35 * DAY]; // box 0..5
const SCORE = { review: 0, partly: 0.5, got: 1 };

function applyGrade(prog, coll, id, tags, score, over) {
  const now = Date.now();
  const prev = (prog[coll] || {})[id] || { box: 0, n: 0, ema: null };
  let box = prev.box;
  if (score === 1) box = Math.min(5, prev.n === 0 ? 2 : box + 1);
  else if (score === 0.5) box = Math.max(1, Math.min(box, 2));
  else box = 0;
  const card = {
    box, n: prev.n + 1, last: now, due: now + INTERVALS[box],
    ema: prev.ema == null ? score : +(prev.ema * 0.6 + score * 0.4).toFixed(3)
  };
  return { ...applySkill(prog, tags, score, over), [coll]: { ...(prog[coll] || {}), [id]: card }, updated: now };
}
function applySkill(prog, tags, score, over) {
  const skill = { ...prog.skill };
  const all = Array.from(new Set([...tags, ...Object.keys(over || {})]));
  all.forEach(tag => {
    const s = skill[tag] || { s: 0.5, n: 0 };
    const sc = over && over[tag] != null ? Math.min(over[tag], score) : score;
    skill[tag] = { s: +(s.s * 0.7 + sc * 0.3).toFixed(3), n: s.n + 1 };
  });
  return { ...prog, skill };
}

function levelTarget(prog) {
  const avg = lv => {
    const seen = VERSES.filter(v => v.lv === lv && prog.cards[v.id]);
    if (!seen.length) return { n: 0, a: 0 };
    return { n: seen.length, a: seen.reduce((s, v) => s + prog.cards[v.id].ema, 0) / seen.length };
  };
  // Students have finished Latin 1–3: start at Intermediate, move up quickly, drop back only on real trouble.
  const b = avg(1), i = avg(2);
  if (i.n >= 3 && i.a >= 0.7) return 3;
  if (b.n >= 3 && b.a < 0.5 && i.a < 0.5) return 1;
  return 2;
}
function weakestTag(prog, tags) {
  let best = null, bestS = 2;
  tags.forEach(t => { const s = prog.skill[t] ? prog.skill[t].s : 0.5; if (s < bestS) { bestS = s; best = t; } });
  return best;
}
function pickNext(prog, currentId, focus, drill) {
  const now = Date.now();
  let pool = VERSES.filter(v => v.id !== currentId);
  if (focus !== "All") pool = pool.filter(v => v.g === focus);
  if (drill) pool = pool.filter(v => v.k.includes(drill));
  if (!pool.length) pool = VERSES.filter(v => v.id !== currentId);
  const due = pool.filter(v => prog.cards[v.id] && prog.cards[v.id].due <= now)
    .sort((a, b) => (prog.cards[a.id].box - prog.cards[b.id].box) || (prog.cards[a.id].due - prog.cards[b.id].due));
  if (due.length) {
    const c = prog.cards[due[0].id];
    return { id: due[0].id, why: c.box === 0 ? "Back for another try: you marked it Needs Review." : "Due for review, to keep it fresh." };
  }
  const target = levelTarget(prog);
  const fresh = pool.filter(v => !prog.cards[v.id]);
  if (fresh.length) {
    const scored = fresh.map(v => {
      const weak = v.k.reduce((s, t) => s + (1 - (prog.skill[t] ? prog.skill[t].s : 0.5)), 0) / v.k.length;
      return { v, score: -Math.abs(v.lv - target) * 3 + weak * 2 + Math.random() * 0.6 };
    }).sort((a, b) => b.score - a.score);
    const v = scored[0].v;
    const w = drill || weakestTag(prog, v.k);
    return { id: v.id, why: `New ${LEVELS[v.lv].toLowerCase()} verse, chosen to practice ${CONCEPTS[w].toLowerCase()}.` };
  }
  const soonest = pool.slice().sort((a, b) => prog.cards[a.id].ema - prog.cards[b.id].ema)[0];
  return { id: soonest.id, why: "Nothing is due. Extra practice on one of your weaker verses." };
}
function duePassages(prog) {
  const now = Date.now();
  return Object.entries(prog.pcards || {}).filter(([, c]) => c.due <= now)
    .sort((a, b) => (a[1].box - b[1].box) || (a[1].due - b[1].due)).map(([k]) => k);
}

/* ---------- Key-word check (a rough hint, not a grade) ---------- */
const STOP = new Set("a an and the of to in on at is be are was were been am art it its that this these those for with by as from but or nor not no so then now if he him his she her they them their we us our i me my you your ye thee thou thy thine who whom which what all any every there unto upon shall will do doth did hath has have had into out up one also even when may might let".split(" "));
const SYN = [
  ["love","charity","loveth","loved"], ["everlasting","eternal"], ["hell","hades","underworld"],
  ["labour","labor","toil","work"], ["refresh","rest","restore"], ["wept","weep","cried","cry"],
  ["say","saith","said","says","speak","spoke","told","tell"], ["hallowed","holy","sanctified"],
  ["handmaid","servant","maidservant","slave"], ["penance","repent","repentance"], ["ghost","spirit"],
  ["comprehend","overcome","understand","grasp","seize"], ["substance","assurance","foundation","reality"],
  ["evidence","proof","conviction"], ["inn","lodging","guestroom"], ["manger","crib","feeding"],
  ["strengtheneth","strengthen","strengthens"], ["puffed","arrogant","proud","inflated"],
  ["envieth","envy","jealous"], ["perversely","wrongly","rudely","badly"], ["behold","look","see","lo"],
  ["burdened","heavy","laden","loaded"], ["begotten","only"], ["commendeth","shows","proves","demonstrates","commend"],
  ["uttermost","farthest","ends","end"], ["world","earth"], ["man","person","human","someone","anyone"],
  ["nations","peoples","gentiles"], ["accomplished","fulfilled","completed"], ["profit","benefit","gain","avail"],
  ["care","anxiety","worry","concern","cares"], ["casting","throwing","cast"], ["word","verbum"],
  ["abide","remain","remains"], ["give","gave","given","giveth"], ["whosoever","whoever","everyone","everybody"],
  ["gospel","evangel"], ["power","strength","might"], ["went","go","goeth","gone","going"], ["came","come","cometh","coming"],
  ["answered","answer","answering","replied","reply"], ["multitude","crowd","crowds","multitudes"], ["amen","truly","verily"]
];
function stem(w) {
  w = w.toLowerCase().replace(/[^a-z]/g, "");
  for (const suf of ["eth", "ing", "est", "ed", "es", "s", "e"]) {
    if (w.endsWith(suf) && w.length - suf.length >= 3) { w = w.slice(0, -suf.length); break; }
  }
  // British/American spellings match: labour = labor, fulfil = fulfill
  return w.replace(/(\w{3})our$/, "$1or").replace(/(.)\1+/g, "$1");
}
const SYNMAP = {};
SYN.forEach(group => { const head = stem(group[0]); group.forEach(g => { SYNMAP[stem(g)] = head; }); });
const canon = w => { const s = stem(w); return SYNMAP[s] || s; };
function coverage(user, ref) {
  const keys = []; const seen = new Set();
  (ref.match(/[A-Za-z]+/g) || []).forEach(w => {
    const lw = w.toLowerCase();
    if (STOP.has(lw) || lw.length < 3) return;
    const c = canon(lw);
    if (!seen.has(c)) { seen.add(c); keys.push({ word: w, c }); }
  });
  const mine = new Set((user.match(/[A-Za-z]+/g) || []).map(canon));
  const missing = keys.filter(k => !mine.has(k.c));
  return { total: keys.length, hit: keys.length - missing.length, missing };
}

/* ---------- Persistence: account storage when available, browser otherwise ---------- */
const LOCAL_KEY = "lectio-vulgata-v2";
const DRAFT_KEY = "lectio-vulgata-drafts";
const UI_KEY = "lectio-vulgata-ui";
const EMPTY = { v: 6, cards: {}, pcards: {}, vcards: {}, vtap: [], sittings: [], mistakes: [], skill: {}, ability: {}, oread: [], exam: "", updated: 0 };
/* Days the Office was read, as day numbers (days since 1 Jan 2000), sorted, unique. */
function cleanRead(a) { return Array.isArray(a) ? [...new Set(a.filter(n => Number.isInteger(n) && n > 9000 && n < 40000))].sort((x, y) => x - y).slice(-20000) : []; }
function normalizeProg(p) {
  return { ...EMPTY, ...p, cards: p.cards || {}, pcards: p.pcards || {}, vcards: p.vcards || {},
    vtap: Array.isArray(p.vtap) ? p.vtap : [], sittings: Array.isArray(p.sittings) ? p.sittings : [], mistakes: Array.isArray(p.mistakes) ? p.mistakes : [], skill: p.skill || {}, ability: p.ability && typeof p.ability === "object" ? p.ability : {}, oread: cleanRead(p.oread) };
}
function readLocal(key) { try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; } }
function writeLocal(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {} }
function loadLocalProgress() {
  const p = readLocal(LOCAL_KEY);
  if (p && p.cards) return normalizeProg(p);
  const old = readLocal("lectio-vulgata-v1");
  if (old && old.status) {
    let prog = { ...EMPTY };
    Object.entries(old.status).forEach(([id, s]) => {
      if (BY_ID[id]) prog = applyGrade(prog, "cards", id, BY_ID[id].k, s === "got" ? 1 : 0);
    });
    return prog;
  }
  return { ...EMPTY };
}
function encodeBackup(prog) {
  return "LV1:" + btoa(unescape(encodeURIComponent(JSON.stringify({ cards: prog.cards, pcards: prog.pcards, vcards: prog.vcards, vtap: prog.vtap, sittings: prog.sittings, mistakes: (prog.mistakes || []).slice(-20), skill: prog.skill, ability: prog.ability, exam: prog.exam }))));
}
function decodeBackup(code) {
  const m = code.trim().match(/^LV1:([A-Za-z0-9+/=]+)$/);
  if (!m) return null;
  try {
    const d = JSON.parse(decodeURIComponent(escape(atob(m[1]))));
    if (!d || typeof d.cards !== "object" || typeof d.skill !== "object") return null;
    const okCard = c => c && typeof c.box === "number" && typeof c.due === "number";
    const cards = {}, pcards = {}, skill = {};
    Object.entries(d.cards).forEach(([id, c]) => { if (BY_ID[id] && okCard(c)) cards[id] = c; });
    Object.entries(d.pcards || {}).forEach(([k, c]) => { if (/^[0-9a-z]+\.\d+\.\d+$/.test(k) && BOOK_NAME[k.split(".")[0]] && okCard(c)) pcards[k] = c; });
    Object.entries(d.skill).forEach(([t, v]) => { if (CONCEPTS[t] && v && typeof v.s === "number") skill[t] = v; });
    const vcards = {};
    Object.entries(d.vcards || {}).forEach(([l, c]) => { if (typeof l === "string" && l.length <= 40 && okCard(c)) vcards[l] = c; });
    const vtap = (Array.isArray(d.vtap) ? d.vtap : []).filter(l => typeof l === "string" && l.length <= 40).slice(0, 300);
    const sittings = (Array.isArray(d.sittings) ? d.sittings : [])
      .filter(x => x && typeof x.ref === "string" && x.ref.length < 60 && typeof x.at === "number" && typeof x.secs === "number")
      .map(x => ({ ref: x.ref, at: x.at, secs: x.secs, len: +x.len || 0, lookups: +x.lookups || 0, cov: typeof x.cov === "number" ? x.cov : null, errs: typeof x.errs === "number" ? x.errs : null, grade: ["got", "partly", "review"].includes(x.grade) ? x.grade : null,
        parts: Array.isArray(x.parts) ? x.parts.slice(0, 5).map(q => ({ p: PART_IDS.includes(q && q.p) ? q.p : "nt", g: ["got", "partly", "review"].includes(q && q.g) ? q.g : null, cov: typeof (q && q.cov) === "number" ? q.cov : null, errs: typeof (q && q.errs) === "number" ? q.errs : null })) : undefined }))
      .slice(-30);
    const s60 = (x, n) => (typeof x === "string" ? x.slice(0, n) : "");
    const mistakes = (Array.isArray(d.mistakes) ? d.mistakes : []).filter(m => m && typeof m.ref === "string")
      .map(m => ({ at: +m.at || 0, ref: s60(m.ref, 60), type: ["tense","mood","voice","number","case","agreement","vocab","omission","addition","sense","idiom"].includes(m.type) ? m.type : "sense",
        concept: CONCEPTS[m.concept] ? m.concept : null, latin: s60(m.latin, 40), fix: s60(m.fix, 60) })).slice(-20);
    const ability = {};
    Object.entries(d.ability || {}).forEach(([k, a]) => { if (PART_IDS.includes(k) && a && Number.isFinite(+a.t) && Number.isFinite(+a.n)) ability[k] = { t: Math.max(-0.3, Math.min(1.3, +a.t)), n: Math.max(0, Math.floor(+a.n)) }; });
    return { ...EMPTY, cards, pcards, vcards, vtap, sittings, mistakes, skill, ability, oread: cleanRead(d.oread), exam: typeof d.exam === "string" ? d.exam : "", updated: Date.now() };
  } catch (e) { return null; }
}

/* ---------- UI pieces ---------- */
function Btn({ children, onClick, variant = "plain", pressed, hint, className = "", ...rest }) {
  const base = "inline-flex items-center justify-center gap-1.5 rounded-md px-3.5 py-2 text-[15px] font-medium transition-colors border select-none disabled:opacity-50";
  const styles = {
    primary: "bg-ink text-paper border-ink hover:bg-[#433c35]",
    plain: "bg-leaf text-ink border-rule hover:border-soft",
    ok: pressed ? "bg-ok text-white border-ok" : "bg-leaf text-ok border-rule hover:bg-oktint",
    mid: pressed ? "bg-mid text-white border-mid" : "bg-leaf text-mid border-rule hover:bg-midtint",
    warn: pressed ? "bg-warn text-white border-warn" : "bg-leaf text-warn border-rule hover:bg-warntint"
  };
  const ring = hint && !pressed ? " ring-2 ring-offset-1 ring-[var(--ink-soft)]" : "";
  return <button type="button" onClick={onClick} aria-pressed={pressed} className={`${base} ${styles[variant]}${ring} ${className}`} {...rest}>{children}</button>;
}

function Stat({ value, label }) {
  return (
    <div className="flex min-w-0 flex-col">
      <span className="latin num text-[1.35rem] font-bold leading-tight text-ink">{value}</span>
      <span className="text-[13px] leading-tight text-soft">{label}</span>
    </div>
  );
}

function SkillRow({ tag, data, onDrill, active }) {
  const pct = data ? Math.round(data.s * 100) : null;
  const color = pct == null ? "var(--rule)" : pct >= 75 ? "var(--ok)" : pct >= 50 ? "var(--mid)" : "var(--warn)";
  return (
    <div className="grid grid-cols-[minmax(0,9.5rem)_1fr_auto] items-center gap-3">
      <button type="button" onClick={() => onDrill(tag)}
        className={`truncate text-left text-[14px] hover:text-rubric ${active ? "font-semibold text-rubric" : "text-ink"}`}
        title={`Drill verses with ${CONCEPTS[tag].toLowerCase()}`}>
        {CONCEPTS[tag]}
      </button>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--rule)]" aria-hidden="true">
        <div className="h-full rounded-full" style={{ width: `${pct ?? 0}%`, background: color }} />
      </div>
      <span className="num w-16 text-right text-[13px] text-soft">{pct == null ? "not yet" : `${pct}%`}</span>
    </div>
  );
}

/* Latin text whose words can be tapped. */
function LatinWords({ text, ids, selected, onPick, prefix = "", marks, noStructure }) {
  const aids = React.useContext(AidsContext);
  const parts = text.split(/([A-Za-z]+)/);
  let k = -1;
  return parts.map((p, i) => {
    if (i % 2 === 0) return p;
    k++;
    const key = prefix + k;
    const shown = aids.acc ? accentWord(p, aids.acc) : p;
    const mk = marks && marks[key];
    const mcls = mk ? ` mk mk-${mk.sev}${mk.on ? " mk-on" : ""}` : "";
    const scls = aids.structure && !noStructure && ids ? structClass(aids.lex, ids[k]) : "";
    const num = mk && mk.first ? <sup className="mk-n">{mk.n}</sup> : null;
    const known = ids && ids[k] !== undefined;
    if (!known) return mk || scls ? <span key={i} className={`${mcls} ${scls}`.trim()}>{shown}{num}</span> : shown;
    return (
      <span key={i} role="button" tabIndex={0} className={`lw${selected === key ? " sel" : ""}${mcls}${scls ? " " + scls : ""}`}
        onClick={() => onPick(key)}
        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPick(key); } }}>{shown}{num}</span>
    );
  });
}
/* Plain Latin (no tapping), with accents when they are switched on. */
function AccentText({ text }) {
  const aids = React.useContext(AidsContext);
  if (!aids.acc) return text;
  return text.replace(/[A-Za-z]+/g, w => accentWord(w, aids.acc));
}

function WordPanel({ lex, word, entry, onClose, where, onTable }) {
  if (!lex || word == null) return null;
  const r = readings(entry);
  const items = r.ids.map(id => describe(lex, id));
  const head = {
    context: "Parsed in context",
    compound: "Two words joined together",
    lookup: items.length > 1 ? "Possible parsings (from this form in other Latin texts)" : "Parsing from this form in other Latin texts",
    none: "No parsing available for this word"
  }[r.kind];
  const guessOnly = items.length && items.every(d => d.guess);
  return (
    <div className="reveal mt-4 rounded-md border border-rule bg-paper px-4 py-3" aria-live="polite">
      <div className="flex items-baseline justify-between gap-3">
        <span lang="la" className="latin text-[1.05rem] font-bold text-ink">{word}</span>
        <button type="button" onClick={onClose} className="text-[13px] text-soft underline">Close</button>
      </div>
      <p className="smallcaps mt-0.5 text-[13px] text-soft">{guessOnly ? "Dictionary guess from the word’s stem" : head}</p>
      <ul className="mt-2 flex flex-col gap-2">
        {items.map((d, i) => (
          <li key={i} className="text-[15px] leading-snug">
            <span lang="la" className="latin font-bold text-rubric">{d.lemma}</span>
            {d.gloss && <span className="text-ink">: {d.gloss}</span>}
            <span className="block text-[14px] text-soft">
              {d.guess ? `Possibly a form of this ${d.posL.toLowerCase()}. Check the ending yourself.` : [d.posL, d.parse].filter(Boolean).join(", ")}
            </span>
          </li>
        ))}
      </ul>
      {onTable && (() => {
        const lis = [...new Set(r.ids.map(id => lex.ana[id][0]))].filter(li => { const [l, , h] = lex.lemmas[li]; return h && MORPH.build(l, h) || MORPH.PRONOUNS[l]; });
        return lis.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
            {lis.slice(0, 3).map(li => <button key={li} type="button" className="text-[13px] font-medium text-rubric underline underline-offset-2" onClick={() => onTable(li, word)}>All forms of <span lang="la" className="latin">{lex.lemmas[li][0]}</span> →</button>)}
          </div>
        );
      })()}
      <ReportParse word={word} where={where} items={items} />
    </div>
  );
}

function BackupPanel({ prog, onRestore }) {
  const [msg, setMsg] = useState("");
  const [paste, setPaste] = useState("");
  const code = encodeBackup(prog);
  const outRef = useRef(null);
  function copy() {
    const done = () => setMsg("Backup code copied. Paste it somewhere safe, or into this page on your other device.");
    const fallback = () => { if (outRef.current) { outRef.current.focus(); outRef.current.select(); } setMsg("Copy the selected code with Ctrl/⌘ + C."); };
    try { navigator.clipboard.writeText(code).then(done, fallback); } catch (e) { fallback(); }
  }
  function restore() {
    const data = decodeBackup(paste);
    if (!data) { setMsg("That code isn’t valid. Paste the whole code, starting with LV1:"); return; }
    onRestore(data); setPaste("");
    setMsg(`Progress restored: ${Object.keys(data.cards).length} drill verses, ${Object.keys(data.pcards).length} passages, ${Object.keys(data.vcards).length} words.`);
  }
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[14px] text-soft">Back up your progress, or move it to another device or browser.</p>
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="backup-out" className="sr-only">Your backup code</label>
        <input id="backup-out" ref={outRef} readOnly value={code}
          className="min-w-0 flex-1 basis-48 truncate rounded-md border border-rule bg-paper px-2 py-1.5 font-mono text-[12px] text-soft" />
        <Btn onClick={copy}>Copy backup code</Btn>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="backup-in" className="sr-only">Paste a backup code</label>
        <input id="backup-in" value={paste} onChange={e => setPaste(e.target.value)} placeholder="Paste a backup code to restore"
          className="min-w-0 flex-1 basis-48 rounded-md border border-rule bg-paper px-2 py-1.5 font-mono text-[12px] text-ink" />
        <Btn onClick={restore} disabled={!paste.trim()}>Restore</Btn>
      </div>
      {msg && <p className="text-[13px] text-ink" aria-live="polite">{msg}</p>}
    </div>
  );
}

function GradeBar({ grade, current, suggest, onGrade, onNext, card, nextLabel = "Next verse →" }) {
  return (
    <div className="flex flex-col gap-3 border-t border-rule pt-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-[15px] text-soft">How did it go?</span>
        <Btn variant="warn" pressed={current === "review"} hint={suggest === "review"} onClick={() => onGrade("review")}>↻ Needs Review</Btn>
        <Btn variant="mid" pressed={current === "partly"} hint={suggest === "partly"} onClick={() => onGrade("partly")}>~ Partly</Btn>
        <Btn variant="ok" pressed={current === "got"} hint={suggest === "got"} onClick={() => onGrade("got")}>✓ Got It</Btn>
        <Btn variant="primary" className="ml-auto" onClick={onNext}>{nextLabel}</Btn>
      </div>
      {current && card && (
        <p className="text-[13px] text-soft">
          {card.box === 0 ? "This will come back later in this session." : `Next review in ${Math.round(INTERVALS[card.box] / DAY)} day${INTERVALS[card.box] / DAY === 1 ? "" : "s"}.`}
          {" "}Changed your mind? Pick a different grade.
        </p>
      )}
    </div>
  );
}

function TranslateBox({ id, draft, setDraft, showDR, setShowDR, showNotes, setShowNotes, notesLabel, onCheck }) {
  const check = () => { setShowDR(true); if (onCheck) onCheck(); };
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={"translation"} className="smallcaps text-[15px] text-soft">Your translation</label>
      <textarea id="translation" rows={4} value={draft}
        onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); check(); } }}
        onChange={e => setDraft(e.target.value)}
        placeholder="Type your English rendering here…"
        className="w-full resize-y rounded-md border border-rule bg-leaf px-4 py-3 text-[16px] leading-relaxed text-ink placeholder:text-[#a59c90]"
        style={{ fontFamily: "var(--font-latin)" }} />
      <Dictate value={draft} onChange={setDraft} label="Speak instead of typing" />
      <div className="flex flex-wrap gap-2">
        <Btn variant="primary" onClick={() => (showDR ? setShowDR(false) : check())} aria-expanded={showDR}>
          {showDR ? "Hide Translation" : "Check Translation"}
        </Btn>
        {setShowNotes && (
          <Btn onClick={() => setShowNotes(s => !s)} aria-expanded={showNotes}>
            {showNotes ? "Hide Grammar Notes" : (notesLabel || "Show Grammar Notes")}
          </Btn>
        )}
        <span className="ml-auto hidden self-center text-[13px] text-soft sm:inline">Ctrl/⌘ + Enter to check</span>
      </div>
    </div>
  );
}

function Coverage({ cov }) {
  if (!cov || !cov.total) return null;
  return (
    <p className="text-[14px] leading-snug text-soft">
      <span className="num font-semibold text-ink">{cov.hit} of {cov.total}</span> key words matched
      {cov.missing.length > 0 && <> · check: {cov.missing.slice(0, 6).map(m => m.word).join(", ")}</>}.
      {" "}A rough guide only: good translations can use different words.
    </p>
  );
}

/* Line a curated drill verse up with the parsed source verse. */
function alignCurated(la, src) {
  if (!src) return null;
  const want = (la.match(WORD_RE) || []);
  const have = (src[1].match(WORD_RE) || []);
  const out = []; let j = 0;
  want.forEach(w => {
    let hit = -1;
    for (let k = j; k < Math.min(have.length, j + 5); k++) if (n1(have[k]) === n1(w)) { hit = k; break; }
    if (hit >= 0) { out.push(src[3][hit]); j = hit + 1; } else out.push(-1);
  });
  return out;
}

/* ---------- Tutor: Claude marks mistakes on screen ---------- */
const ISSUE_TYPES = {
  tense: "Tense", mood: "Mood", voice: "Voice", number: "Person / number", case: "Case & syntax",
  agreement: "Agreement", vocab: "Vocabulary", omission: "Left out", addition: "Added", sense: "Sense", idiom: "Idiom"
};
const FB_KEY = "lectio-vulgata-feedback";
const TUTOR_KEY = "lectio-vulgata-tutor";
/* Compare translations ignoring case, punctuation and spacing, so trivial edits never cost a new check. */
const normText = t => (t || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
let samplePromise = null;
function getSample() {
  if (!samplePromise) {
    samplePromise = (window.claude && window.claude.use ? window.claude.use("sample") : Promise.resolve(null)).catch(() => null)
      .then(sm => sm || (hasAiKey() ? aiSample() : null));
  }
  return samplePromise;
}
const TUTOR_OFF = ["not_granted", "sampling_disabled", "not_declared", "capability_disabled", "capability_removed"];
function tutorErrorText(code, detail) {
  detail = typeof detail === "string" ? detail.replace(/\s+/g, " ").trim().slice(0, 220) : "";
  if (TUTOR_OFF.includes(code)) return "Mistake marking is turned off for this page, so only the key-word check is shown.";
  if (code === "rate_limited") return window.claude && window.claude.use ? "You’ve reached your Claude usage limit for now. Try again later." : "Today’s free AI allowance is used up. It resets overnight." + (hasGroqKey() ? "" : " A free Groq key as a backup adds about a thousand a day (Skill map & backup → AI marking).");
  if (code === "bad_key" && /free tier|billing|FREE_TIER/i.test(detail)) return "Google has switched off its free tier for this key’s project (“Free tier unavailable” in AI Studio). It’s an account flag on Google’s side, not the key. Fixes: verify your age in your Google Account, then make a key in a new project, or make one with a different Google account.";
  if (code === "bad_key") return "Google didn’t accept your Gemini key for marking." + (detail ? ` Google says: “${detail}”` : "") + " Check it in Skill map & backup → AI marking.";
  if (code === "failed" && detail) return `The check didn’t finish. Google says: “${detail}”`;
  if (code === "no_key") return "Add a free Gemini key to have this marked.";
  if (code === "busy") return "The AI is very busy right now (this happens at peak times and usually passes within minutes). Your key is fine: try again shortly." + (hasGroqKey() ? "" : " Adding a free Groq key as a backup avoids this (Skill map & backup → AI marking).");
  if (code === "offline") return "You’re offline. AI marking needs a connection.";
  if (code === "region") return "Google’s free AI isn’t offered in your region.";
  if (code === "session_expired") return "Sign in to Claude again, then try again.";
  if (code === "refused") return "Claude couldn’t check this translation. Try rewording it.";
  if (code === "prompt_too_large") return "This translation is too long to check in one go.";
  return "The check didn’t finish." + (detail ? ` (${detail})` : code ? ` (${code})` : "") + " Try again, or use Test AI in Skill map & backup → AI marking.";
}

/* Compact parsing notes: only words whose form matters (verbs, nouns, adjectives, pronouns). */
const AB = { p: "pres", i: "impf", r: "perf", l: "plpf", t: "futpf", f: "fut" };
const MB = { i: "ind", s: "subj", m: "imper", n: "inf", p: "ptcp", d: "gerund", g: "gerundive", u: "supine" };
const CB = { n: "nom", a: "acc", g: "gen", d: "dat", b: "abl", v: "voc", l: "loc", c: "gen/dat" };
function shortParse(pos, m, lemma) {
  if (!m || m === "??") return "";
  const [pe, nu, te, mo, vo, ge, ca] = m;
  const vc = vo === "p" ? (/or$/.test(lemma) ? "dep" : "pass") : "";
  const nom = [CB[ca], nu === "s" ? "sg" : nu === "p" ? "pl" : "", ge === "m" || ge === "f" || ge === "n" ? ge : ""].filter(Boolean).join(" ");
  if (pos === "V-") {
    if (mo === "p" || mo === "g" || mo === "d") return [AB[te], vc, MB[mo], nom].filter(Boolean).join(" ");
    if (mo === "n") return [AB[te], vc, "inf"].filter(Boolean).join(" ");
    return [AB[te], MB[mo], vc, pe && pe !== "-" ? pe + (nu === "p" ? "pl" : "sg") : ""].filter(Boolean).join(" ");
  }
  return nom;
}
function wordNotes(lex, verses) {
  if (!lex) return "";
  return verses.map(v => {
    const words = v[1].match(WORD_RE) || [];
    const notes = [];
    words.forEach((w, i) => {
      if (!v[3]) return;
      const r = readings(v[3][i]);
      if (r.kind !== "context" && r.kind !== "lookup") return;
      const [li, pos, m] = lex.ana[r.ids[0]];
      if (!/^(V-|Nb|A-|P)/.test(pos) || m === "??") return;
      const lemma = lex.lemmas[li][0];
      const sp = shortParse(pos, m, lemma);
      if (!sp) return;
      notes.push(`${w}=${n1(w) === n1(lemma) ? "" : lemma + " "}${sp}${r.kind === "lookup" && r.ids.length > 1 ? "?" : ""}`);
    });
    return `${promptTag(v)}: ${notes.join("; ")}`;
  }).join("\n");
}

function tutorPrompt(lex, verses, ref, user, part) {
  const notes = wordNotes(lex, verses);
  const info = PART_INFO[part] || PART_INFO.nt;
  return `Latin tutor. Check a student's English translation of ${info.src} for a Latin proficiency exam. The student has completed three years of seminary Latin: use standard grammatical terms and hold them to an examiner's standard.
${ref}
LATIN:
${verses.map(v => `${promptTag(v)} ${v[1]}`).join("\n")}
${notes ? "PARSING (automatic, may err):\n" + notes + "\n" : ""}REFERENCE (${info.ref}${part === "hy" ? "; free and rhymed, so judge only by the Latin" : ""}):
${verses.map(v => `${promptTag(v)} ${v[2]}`).join("\n")}
STUDENT:
${user.slice(0, 4000)}

List real mistakes only: wrong tense/mood/voice/person/number/case/agreement/meaning/sense, Latin left out, meaning added. Judge by the Latin; any accurate English is fine. Ignore spelling, punctuation, thou/you, word order.
Reply with only JSON, at most 5 issues, most important first, [] if accurate:
{"v":"got|partly|review","s":"summary, max 15 words","ok":"one thing done well, max 12 words, or empty","i":[{"sev":"error|minor","t":"${Object.keys(ISSUE_TYPES).join("|")}","la":"exact Latin word(s)","vs":"verse or section tag as shown","you":"exact words copied from student, or empty if left out","fix":"correct English for that part","why":"max 20 words, name the grammar","c":"${Object.keys(CONCEPTS).join("|")}|null"}]}
v: got = no errors (minor allowed), partly = sense right with errors, review = sense wrong or much missing. minor = acceptable but less precise.`;
}

function cleanFeedback(raw) {
  if (!raw || typeof raw !== "object") return null;
  const str = (x, n) => (typeof x === "string" ? x.trim().slice(0, n) : "");
  if (Array.isArray(raw)) raw = raw.length && raw[0] && (raw[0].i || raw[0].v) ? raw[0] : { i: raw };   // some models reply with the issue list alone
  const list = Array.isArray(raw.i) ? raw.i : Array.isArray(raw.issues) ? raw.issues : [];
  const issues = list.slice(0, 6).map(x => {
    const i = x || {};
    const sev = i.sev || i.severity, t = i.t || i.type, c = i.c || i.concept, vs = i.vs != null ? i.vs : i.verse;
    return {
      severity: sev === "minor" ? "minor" : "error",
      type: ISSUE_TYPES[t] ? t : "sense",
      latin: str(i.la || i.latin, 120),
      verse: vs != null && vs !== "" ? String(vs).slice(0, 20) : null,
      yours: str(i.you || i.yours, 200),
      fix: str(i.fix, 200),
      why: str(i.why, 400),
      concept: CONCEPTS[c] ? c : null
    };
  }).filter(i => i.latin || i.yours || i.why);
  const vv = raw.v || raw.verdict;
  const verdict = ["got", "partly", "review"].includes(vv) ? vv : (issues.some(i => i.severity === "error") ? "partly" : "got");
  return { verdict, summary: str(raw.s || raw.summary, 300), praise: str(raw.ok || raw.praise, 200), issues };
}

/* Which Latin words each issue points at: { key: {n, sev, first} } */
function latinMarks(verses, fb, prefixed, active) {
  const out = {};
  if (!fb || !fb.issues) return out;
  fb.issues.forEach((iss, n) => {
    const want = (iss.latin.match(WORD_RE) || []).map(n1);
    if (!want.length) return;
    const hit = v => iss.verse != null && (String(v[0]) === iss.verse || promptTag(v) === iss.verse || rowTag(v) === iss.verse);
    const order = verses.map((v, vi) => vi).sort((a, b) => (hit(verses[a]) ? -1 : 0) - (hit(verses[b]) ? -1 : 0));
    for (const vi of order) {
      const have = (verses[vi][1].match(WORD_RE) || []).map(n1);
      let hits = null;
      for (let s = 0; s <= have.length - want.length && !hits; s++) {
        if (want.every((w, j) => have[s + j] === w)) hits = want.map((_, j) => s + j);
      }
      if (!hits) {
        const loose = want.map(w => have.indexOf(w)).filter(k => k >= 0);
        if (loose.length) hits = loose;
      }
      if (hits) {
        hits.forEach((k, j) => {
          const key = (prefixed ? vi + ":" : "") + k;
          if (!out[key]) out[key] = { n: n + 1, sev: iss.severity, first: j === 0, on: active === n + 1 };
        });
        break;
      }
    }
  });
  return out;
}

/* The student's text with the wrong phrases marked. */
function MarkedText({ text, fb, active, setActive }) {
  if (!fb || !fb.issues || !fb.issues.length) return <>{text}</>;
  const low = text.toLowerCase();
  const ranges = [];
  fb.issues.forEach((iss, n) => {
    const y = iss.yours.toLowerCase();
    if (!y) return;
    let from = 0, at = -1;
    while ((at = low.indexOf(y, from)) >= 0) {
      if (!ranges.some(r => at < r.b && at + y.length > r.a)) break;
      from = at + 1;
    }
    if (at >= 0) ranges.push({ a: at, b: at + y.length, n: n + 1, sev: iss.severity });
  });
  ranges.sort((x, y) => x.a - y.a);
  const parts = []; let pos = 0;
  ranges.forEach(r => {
    if (r.a > pos) parts.push(text.slice(pos, r.a));
    parts.push(
      <mark key={r.a} role="button" tabIndex={0} onClick={() => setActive(active === r.n ? null : r.n)}
        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setActive(active === r.n ? null : r.n); } }}
        className={`mk mk-${r.sev}${active === r.n ? " mk-on" : ""}`}>
        {text.slice(r.a, r.b)}<sup className="mk-n">{r.n}</sup>
      </mark>
    );
    pos = r.b;
  });
  if (pos < text.length) parts.push(text.slice(pos));
  return <>{parts}</>;
}

function TutorPanel({ state, avail, stale, onRun, onStop, active, setActive }) {
  if (avail === false) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Btn onClick={openAiSetup}>Turn on AI marking</Btn>
        <span className="text-[13px] text-soft">Free with your own Gemini key, about a minute to set up. Until then only the key-word check is shown.</span>
      </div>
    );
  }
  if (!state || state.status === "idle" || stale) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Btn variant="primary" onClick={onRun} disabled={avail !== true}>{stale ? "Check again" : "Mark my mistakes"}</Btn>
        <span className="text-[13px] text-soft">{stale ? "You’ve changed your translation since the last check." : `${aiName() === "Claude" ? "Claude" : "The AI"} marks each mistake against the Latin. Each check uses a little of your ${aiName() === "Claude" ? "Claude usage" : "free daily allowance"}, so check once you’re happy with your draft.`}</span>
      </div>
    );
  }
  if (state.status === "loading") {
    return (
      <div className="flex flex-wrap items-center gap-3" aria-live="polite">
        <span className="tutor-dot" aria-hidden="true" />
        <span className="text-[14px] text-ink">{aiName() === "Claude" ? "Claude is" : "The AI is"} reading your translation against the Latin…</span>
        <button type="button" onClick={onStop} className="text-[13px] text-soft underline">Stop</button>
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <div className="flex flex-wrap items-center gap-3" aria-live="polite">
        <span className="text-[14px] text-warn">{state.msg}</span>
        {!TUTOR_OFF.includes(state.code) && <Btn onClick={onRun}>Try again</Btn>}
      </div>
    );
  }
  const fb = state.result;
  const errs = fb.issues.filter(i => i.severity === "error").length;
  const minors = fb.issues.length - errs;
  const vColor = { got: "text-ok", partly: "text-mid", review: "text-warn" }[fb.verdict];
  const vText = { got: "Accurate", partly: "Mostly right", review: "Needs work" }[fb.verdict];
  return (
    <div className="reveal flex flex-col gap-3" aria-live="polite">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className={`smallcaps text-[15px] font-semibold ${vColor}`}>{vText}</span>
        <span className="num text-[13px] text-soft">
          {errs ? `${errs} mistake${errs === 1 ? "" : "s"}` : "No mistakes"}{minors ? ` · ${minors} small point${minors === 1 ? "" : "s"}` : ""}
        </span>
      </div>
      {fb.summary && <p className="text-[15px] leading-snug text-ink">{fb.summary}</p>}
      {fb.issues.length > 0 && (
        <ol className="flex flex-col gap-2">
          {fb.issues.map((iss, i) => (
            <li key={i}>
              <button type="button" onClick={() => setActive(active === i + 1 ? null : i + 1)} aria-pressed={active === i + 1}
                className={`w-full rounded-md border px-3 py-2.5 text-left transition-colors ${active === i + 1 ? "border-rubric bg-rubrictint" : "border-rule bg-leaf hover:border-soft"}`}>
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className={`num inline-flex h-5 w-5 items-center justify-center rounded-full text-[12px] font-bold text-white ${iss.severity === "error" ? "bg-rubric" : "bg-mid"}`}>{i + 1}</span>
                  <span className="smallcaps text-[13px] text-soft">{ISSUE_TYPES[iss.type]}{iss.severity === "minor" ? " · small point" : ""}</span>
                  {iss.latin && <span lang="la" className="latin text-[15px] font-bold text-ink">{iss.latin}</span>}
                </div>
                <p className="mt-1 text-[15px] leading-snug text-ink">
                  {iss.yours ? <>You wrote <span className="line-through decoration-[var(--rubric)]">“{iss.yours}”</span></> : "Left out"}
                  {iss.fix && <> → <strong className="font-semibold text-ok">“{iss.fix}”</strong></>}
                </p>
                {iss.why && <p className="mt-1 text-[14px] leading-snug text-soft">{iss.why}</p>}
                {iss.concept && <span className="mt-1.5 inline-block rounded bg-paper px-2 py-0.5 text-[12px] text-soft">{CONCEPTS[iss.concept]}</span>}
              </button>
            </li>
          ))}
        </ol>
      )}
      {fb.praise && <p className="text-[14px] leading-snug text-ok">✓ {fb.praise}</p>}
      <p className="text-[12px] text-soft">Marked by {aiName() === "Claude" ? "Claude" : readAi().lastBy || "the AI"}. Tap a mistake to see it highlighted in the Latin and in your English. If a correction looks wrong, trust the grammar you know.</p>
    </div>
  );
}

/* Per-concept scores from feedback: errors pull a concept down, minor points less so. */
function feedbackScores(fb) {
  const over = {};
  if (!fb) return over;
  fb.issues.forEach(i => {
    if (!i.concept) return;
    const s = i.severity === "error" ? 0 : 0.5;
    over[i.concept] = over[i.concept] == null ? s : Math.min(over[i.concept], s);
  });
  return over;
}

/* Recurring mistakes, from the log kept in progress. */
function MistakeSummary({ log }) {
  if (!log || !log.length) return null;
  const counts = {};
  log.forEach(m => { const k = m.concept ? "c:" + m.concept : "t:" + m.type; counts[k] = (counts[k] || 0) + 1; });
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const recent = log.slice(-5).reverse();
  return (
    <div>
      <p className="mb-2 text-[14px] text-soft">Your most frequent mistakes, from the AI’s marking. These lower the matching skills above, so the drill brings you more of them.</p>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {top.map(([k, n]) => (
          <span key={k} className="num rounded bg-rubrictint px-2 py-0.5 text-[13px] text-ink">
            {k.startsWith("c:") ? CONCEPTS[k.slice(2)] : ISSUE_TYPES[k.slice(2)]} · {n}
          </span>
        ))}
      </div>
      <ul className="flex flex-col gap-1.5">
        {recent.map((m, i) => (
          <li key={i} className="text-[14px] leading-snug">
            <span className="text-soft">{m.ref}:</span> <span lang="la" className="latin font-bold text-ink">{m.latin}</span>
            {m.fix && <span className="text-ink"> → “{m.fix}”</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

/*@include ai.jsx*/
/*@include classvocab.jsx*/
/*@include aids.jsx*/
/*@include extras.jsx*/
/*@include morph.js*/
/*@include forms.jsx*/
/*@include guide-data.js*/
/*@include guide.jsx*/
/*@include placement.jsx*/
/*@include office.jsx*/
/*@include library.jsx*/

/* ---------- Vocabulary trainer ---------- */
function useLex(on) {
  const [st, setSt] = useState({ lex: null, err: null });
  useEffect(() => {
    if (!on || st.lex) return;
    let alive = true;
    loadLex().then(l => { if (alive) setSt({ lex: l, err: null }); })
      .catch(() => { if (alive) setSt({ lex: null, err: "The word list didn’t load. Check your connection, then reload the page." }); });
    return () => { alive = false; };
  }, [on, st.lex]);
  return st;
}
const vocabCache = new WeakMap();
function vocabOf(lex) {
  if (vocabCache.has(lex)) return vocabCache.get(lex);
  const byLemma = {};
  lex.lemmas.forEach(([l], i) => { if (!(l in byLemma)) byLemma[l] = i; });
  const posOf = {};
  lex.ana.forEach(([li, pos]) => { if (!(li in posOf)) posOf[li] = pos; });
  const freq = {};
  lex.freq.forEach(([li, n, ref, ex, aid], i) => { freq[lex.lemmas[li][0]] = { rank: i + 1, n, ref, ex, aid }; });
  const V = { byLemma, posOf, freq, order: lex.freq.map(f => lex.lemmas[f[0]][0]), tokens: lex.tokens };
  vocabCache.set(lex, V);
  return V;
}
let vocabPromise = null;
function loadVocab() { if (!vocabPromise) vocabPromise = getJSON("data/vocab.json").catch(e => { vocabPromise = null; throw e; }); return vocabPromise; }
const DECKS = [["class", "My class list"], ["all", "All five texts"], ["nt", "New Testament"], ["st", "Summa"], ["se", "Sermons"], ["hy", "Hymns"], ["ps", "Psalms"],
  ["pp", "Principal parts"], ["tap", "Words I looked up"], ["mk", "My mistakes"]];
/* Words any student sitting the exam already knows; they are left out of the decks. */
const BASIC = new Set(("sum possum et in non ad cum de ex e ab a abs per pro sine sub super inter post ante apud propter ego tu nos vos is hic ille ipse iste idem " +
  "qui quis sui se suus meus tuus noster vester autem sed enim ergo igitur nam ut si quod quia quoniam sicut neque nec aut vel atque ac etiam iam nunc tunc ibi ubi " +
  "omnis unus deus dominus homo dico facio video uideo venio uenio do habeo eo fero volo uolo audio magnus bonus malus multus ecce amen nihil nemo que ne iesus christus " +
  "dies terra caelum filius pater mater vir uir mulier rex verbum uerbum spiritus").split(" "));
/* Build a deck as an ordered list of cards. Word cards share their schedule across decks (keyed by lemma). */
function buildDeck(deck, lex, V, vocab, prog, includeCommon) {
  const word = (lemma, ex) => {
    const li = V.byLemma[lemma];
    if (li === undefined || !lex.lemmas[li][1]) return null;
    const [, gloss, head] = lex.lemmas[li];
    const f = ex || V.freq[lemma];
    return { key: lemma, front: head || lemma, sub: POS_L[V.posOf[li]] || "", ex: f && f.ex, ref: f && f.ref, aid: f ? f.aid : -1, back: gloss };
  };
  // Third-year students know the commonest words: leave out the top 400 unless the student asks for them.
  const notBasic = l => !BASIC.has(l.toLowerCase()) && (includeCommon || !(V.freq[l] && V.freq[l].rank <= 400));
  if (deck === "all") return V.order.filter(notBasic).map(l => word(l)).filter(Boolean);
  // Part decks also skip the 150 commonest words overall (they are in "All five texts"), so each opens with that text's own vocabulary.
  if (PART_IDS.includes(deck)) return vocab ? vocab[deck].filter(([li]) => notBasic(lex.lemmas[li][0]) && !(V.freq[lex.lemmas[li][0]] && V.freq[lex.lemmas[li][0]].rank <= 150)).map(([li, n, ref, ex, aid]) => word(lex.lemmas[li][0], { ref, ex, aid })).filter(Boolean) : null;
  if (deck === "tap") return (prog.vtap || []).map(l => word(l)).filter(Boolean);
  if (deck === "class") return (readClass().words || []).map(([l, n, ref, ex, aid]) => word(l, { ref, ex, aid })).filter(Boolean);
  if (deck === "pp") return V.order.filter(notBasic).map(l => { const li = V.byLemma[l]; const [, gloss, pp] = lex.lemmas[li]; return pp && /^V/.test(V.posOf[li]) && pp.includes(",") ? { key: "pp:" + l, front: l, sub: "Give all the principal parts", back: pp, extra: gloss, pp: true } : null; }).filter(Boolean);
  if (deck === "mk") return (prog.mistakes || []).slice().reverse().filter(m => m.latin && m.fix)
    .map(m => ({ key: "mk:" + m.ref + ":" + m.latin, front: m.latin, sub: `${ISSUE_TYPES[m.type] || "Mistake"} · ${m.ref}`, back: m.fix, extra: m.concept ? CONCEPTS[m.concept] : "", mk: true }));
  return [];
}
function pickCard(prog, cards, cur) {
  const now = Date.now(), vc = prog.vcards || {};
  const keys = new Set(cards.map(c => c.key));
  const byKey = Object.fromEntries(cards.map(c => [c.key, c]));
  const due = Object.entries(vc).filter(([k, c]) => keys.has(k) && k !== cur && c.due <= now).sort((a, b) => (a[1].box - b[1].box) || (a[1].due - b[1].due));
  if (due.length) return { card: byKey[due[0][0]], why: due[0][1].box === 0 ? "Back again: you didn’t know it last time." : "Due for review." };
  const i = cards.findIndex(c => !vc[c.key] && c.key !== cur);
  if (i >= 0) return { card: cards[i], why: cards[i].mk ? "A mistake from one of your checked translations." : cards[i].pp ? "New verb for principal parts." : `New card: number ${i + 1} in this deck, by frequency.` };
  const weak = Object.entries(vc).filter(([k]) => keys.has(k) && k !== cur).sort((a, b) => a[1].ema - b[1].ema)[0];
  return weak ? { card: byKey[weak[0]], why: "Nothing is due. Extra practice on a weaker card." } : null;
}
function Snippet({ text }) {
  return text.split(/\[\[|\]\]/).map((part, i) => i % 2 ? <mark key={i} className="rounded bg-rubrictint px-0.5 font-bold text-rubric">{part}</mark> : part);
}

function VocabMode({ prog, onGrade, deck, setDeck, includeCommon, setIncludeCommon }) {
  const { lex, err } = useLex(true);
  const V = lex ? vocabOf(lex) : null;
  const [vocab, setVocab] = useState(null);
  const [verr, setVerr] = useState("");
  const [pick, setPick] = useState(null);
  const [shown, setShown] = useState(false);
  const [learn, setLearn] = useState(0);   // My class list: 0 = the list and quizzes, otherwise flashcards (the number rebuilds the deck)
  const keyRef = useRef(null);
  useEffect(() => {
    if (!PART_IDS.includes(deck) || vocab) return;
    let alive = true;
    loadVocab().then(v => { if (alive) setVocab(v); }).catch(() => { if (alive) setVerr("This deck didn’t load. Check your connection, then try again."); });
    return () => { alive = false; };
  }, [deck, vocab]);
  const cards = useMemo(() => (V ? buildDeck(deck, lex, V, vocab, prog, includeCommon) : null), [deck, V, vocab, includeCommon, deck === "tap" ? prog.vtap : null, deck === "mk" ? prog.mistakes : null, learn]);
  useEffect(() => { setPick(cards ? pickCard(prog, cards, null) : null); setShown(false); }, [cards]);

  function grade(k) {
    const next = onGrade(pick.card.key, k);
    setShown(false);
    setPick(pickCard(next, cards, pick.card.key));
  }
  keyRef.current = { shown, grade, reveal: () => setShown(true), has: !!(pick && pick.card) };
  useEffect(() => {
    const h = e => {
      const t = e.target && e.target.tagName;
      if (t === "INPUT" || t === "TEXTAREA" || t === "SELECT" || t === "BUTTON") return;
      const r = keyRef.current;
      if (!r.has) return;
      if (!r.shown && (e.key === " " || e.key === "Enter")) { e.preventDefault(); r.reveal(); }
      else if (r.shown && ["1", "2", "3"].includes(e.key)) { e.preventDefault(); r.grade(["review", "partly", "got"][+e.key - 1]); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const deckPicker = (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Deck">
        {DECKS.map(([k, l]) => (
          <button key={k} type="button" onClick={() => { setDeck(k); setLearn(0); }} aria-pressed={deck === k}
            className={`rounded-md border px-2.5 py-1 text-[13px] ${deck === k ? "border-rubric bg-rubrictint font-semibold text-rubric" : "border-rule bg-leaf text-ink hover:border-soft"}`}>{l}</button>
        ))}
      </div>
      {deck !== "class" && <label htmlFor="vocab-common" className="flex items-center gap-2 text-[13px] text-soft">
        <input id="vocab-common" type="checkbox" checked={!!includeCommon} onChange={e => setIncludeCommon(e.target.checked)} className="h-4 w-4 accent-[#9a2b22]" />
        Include the 400 commonest words (left out by default, since Latin 1–3 covered them)
      </label>}
      {deck === "class" && learn > 0 && <button type="button" className="self-start text-[14px] text-rubric underline underline-offset-2" onClick={() => setLearn(0)}>‹ My class list (quizzes, word list)</button>}
    </div>
  );
  if (deck === "class" && !learn) return <>{deckPicker}{lex ? <ClassVocab lex={lex} V={V} prog={prog} onGrade={onGrade} onLearn={() => setLearn(Date.now())} /> : <article className="rounded-lg border border-rule bg-leaf px-5 py-6 text-[15px] text-soft">{err || "Loading the word list…"}</article>}</>;
  if (!lex || !cards) return <>{deckPicker}<article className="rounded-lg border border-rule bg-leaf px-5 py-6 text-[15px] text-soft">{err || verr || "Loading the word list…"}</article></>;

  const vc = prog.vcards || {};
  const known = Object.entries(vc).filter(([k, c]) => c.box >= 2 && !k.includes(":"));
  const covered = known.reduce((s, [l]) => s + (V.freq[l] ? V.freq[l].n : 0), 0);
  const pct = V.tokens ? Math.round(covered / V.tokens * 100) : 0;
  const keys = new Set(cards.map(c => c.key));
  const due = Object.entries(vc).filter(([k, c]) => keys.has(k) && c.due <= Date.now()).length;
  const inDeck = cards.filter(c => vc[c.key] && vc[c.key].box >= 2).length;
  const empty = { class: "Add your class’s sections first (‹ My class list).", tap: "Words you tap in passages and drills will collect here.", mk: "Mistakes Claude marks in your checked translations will collect here, so you can re-test them." }[deck];

  if (!pick || !pick.card) return <>{deckPicker}<article className="rounded-lg border border-rule bg-leaf px-5 py-6 text-[15px] text-soft">{cards.length ? "You’ve been through this whole deck." : empty || "This deck is empty."}</article></>;
  const c = pick.card;
  const card = vc[c.key];
  return (
    <>
      {deckPicker}
      <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-[14px] text-soft">
        <span><strong className="num font-semibold text-ink">{known.length}</strong> words known, covering <strong className="num font-semibold text-ink">{pct}%</strong> of the exam texts</span>
        <span>this deck: <strong className="num font-semibold text-ink">{inDeck}</strong> of {cards.length} known · <strong className="num font-semibold text-ink">{due}</strong> due</span>
      </div>

      <article className="rounded-lg border border-rule bg-leaf px-5 py-7 sm:px-8">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <span className="smallcaps text-[14px] text-soft">{c.sub}</span>
          {card && <span className={`text-[13px] ${card.box >= 2 ? "text-ok" : card.box === 0 ? "text-warn" : "text-mid"}`}>{card.box >= 2 ? "Known" : card.box === 0 ? "Needs review" : "Learning"}</span>}
        </div>
        <p className="mb-3 text-[13px] italic text-soft">{pick.why}</p>
        <p lang="la" className="latin text-[2rem] font-bold leading-tight text-ink">{c.front}</p>
        {c.ex && (
          <p lang="la" className="latin mt-4 text-[1.05rem] leading-relaxed text-ink">
            <Snippet text={c.ex} /> <span className="whitespace-nowrap text-[13px] not-italic text-soft">({c.ref})</span>
          </p>
        )}
        {shown ? (
          <div className="reveal mt-5 border-l-2 border-rubric pl-3">
            <p className="text-[1.1rem] leading-snug text-ink">{c.pp ? <span lang="la" className="latin">{c.back}</span> : c.back}</p>
            {c.extra && <p className="mt-1 text-[14px] text-soft">{c.extra}</p>}
            {c.ex && c.aid != null && c.aid >= 0 && (() => {
              const d = describe(lex, c.aid);
              const form = (c.ex.match(/\[\[(.+?)\]\]/) || [])[1];
              return d.parse && form ? <p className="mt-1 text-[14px] text-soft">In the example, <span lang="la" className="latin font-bold text-ink">{form}</span> here: {d.parse.replace(" · ", ", ")}.</p> : null;
            })()}
          </div>
        ) : (
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Btn variant="primary" onClick={() => setShown(true)}>{c.pp ? "Show principal parts" : c.mk ? "Show the correction" : "Show meaning"}</Btn>
            {!c.mk && <Btn onClick={() => grade("know")} title="Mark as known and skip it for five weeks">I know this already</Btn>}
            <span className="ml-1 hidden text-[13px] text-soft sm:inline">Space shows the answer</span>
          </div>
        )}
      </article>

      {shown && (
        <div className="flex flex-wrap items-center gap-2 border-t border-rule pt-4">
          <span className="mr-1 text-[15px] text-soft">Did you know it?</span>
          <Btn variant="warn" onClick={() => grade("review")}>↻ Didn’t know</Btn>
          <Btn variant="mid" onClick={() => grade("partly")}>~ Roughly</Btn>
          <Btn variant="ok" onClick={() => grade("got")}>✓ Knew it</Btn>
          <span className="ml-auto hidden text-[13px] text-soft sm:inline">Keys 1 · 2 · 3</span>
        </div>
      )}
      <p className="text-[13px] text-soft">Each deck is ordered by how often its words appear in that text, so the first few hundred cover most of what you’ll meet. A word you know in one deck counts as known in all of them.</p>
    </>
  );
}

/* Adaptive passage choice within one exam part: due reviews first, then an unseen passage
   whose difficulty gives about a 65% chance of success, favouring your weakest grammar. */
function pickPassage(prog, part, idx, curKey, blind) {
  const now = Date.now();
  const codes = new Set(partBooks(part).map(b => b[0]));
  const due = Object.entries(prog.pcards || {}).filter(([k, c]) => c.due <= now && k !== curKey && codes.has(k.split(".")[0]))
    .sort((a, b) => (a[1].box - b[1].box) || (a[1].due - b[1].due));
  if (due.length) return { key: due[0][0], why: due[0][1].box === 0 ? "Back for another try: you marked it Needs Review." : "Due for review, to keep it fresh." };
  const a = (prog.ability || {})[part] || ABIL0;
  let best = null, bs = -1e9;
  (idx[part] || []).forEach(r => {
    const key = `${r[0]}.${r[1]}.${r[2]}`;
    if ((prog.pcards || {})[key] || key === curKey) return;
    const d = r[3] / 100, p = pSuccess(a.t, d);
    const tags = r[4] ? r[4].split(",") : [];
    const weak = tags.length ? tags.reduce((s, t) => s + (1 - (prog.skill[t] ? prog.skill[t].s : 0.5)), 0) / tags.length : 0.5;
    const sc = -Math.abs(p - 0.65) * 4 + weak * 0.8 + Math.random() * 0.5 - (blind && familiar(r[0], r[1]) ? 1.5 : 0);
    if (sc > bs) { bs = sc; best = { key, d: r[3], p, tags }; }
  });
  if (!best) return null;
  const w = best.tags.length ? weakestTag(prog, best.tags) : null;
  return { key: best.key, why: `${diffWord(best.d)} passage, matched to your level${a.n >= 3 ? ` (about ${Math.round(best.p * 100)}% expected success)` : ""}${w ? `; practises ${CONCEPTS[w].toLowerCase()}` : ""}.` };
}

/* ---------- Exam sitting: one part, or a full five-part mock ---------- */
const EXAM_KEY = "lectio-vulgata-exam";
const WC = t => (t.match(WORD_RE) || []).length;
const mmss = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const SIZES = { short: { w: 25, label: "Short (about 25 words, 1–2 sentences)" }, medium: { w: 50, label: "Medium (about 50 words)" }, long: { w: 100, label: "Long (about 100 words, written-exam size)" } };
const SENT_RE = /[^.;:?!]+[.;:?!]+["”’)]*\s*|[^.;:?!]+$/g;
async function pickSection(part, size, blind) {
  const target = (SIZES[size] || SIZES.short).w;
  const { idx } = await loadPassages();
  const all = idx[part] || [];
  let pool = all.filter(r => r[3] >= 25 && r[3] <= 90);
  if (blind && BLIND_PARTS.has(part)) { const fresh = pool.filter(r => !familiar(r[0], r[1])); if (fresh.length) pool = fresh; }
  const src = pool.length ? pool : all;
  const r = src[Math.floor(Math.random() * src.length)];
  const [code, c, v] = r;
  const book = await loadBook(code);
  const ch = book.ch[c - 1];
  const at = Math.max(0, ch.findIndex(x => x[0] === v));
  let v1 = at + 1, v2 = at + 1, excerpt = 0;
  if (part === "nt" || part === "ps" || part === "hy") {
    if (part === "hy" && size === "long") { v1 = 1; v2 = ch.length; }
    else {
      let i = at, j = at, w = WC(ch[at][1]);
      while (w < target && j + 1 < ch.length) { j++; w += WC(ch[j][1]); }
      while (w < target && i > 0) { i--; w += WC(ch[i][1]); }
      v1 = i + 1; v2 = j + 1;
    }
  } else if (part === "st") {
    if (size === "long") {
      let i = ch.findIndex(x => x[4] === "Respondeo"); if (i < 0) i = at;
      let j = i, w = WC(ch[i][1]);
      while (w < 110 && j + 1 < ch.length) { j++; w += WC(ch[j][1]); }
      v1 = i + 1; v2 = j + 1;
    } else {
      // the section of this article closest in length to the target
      let best = at, bd = 1e9;
      ch.forEach((x, k) => { const d = Math.abs(WC(x[1]) - target); if (d < bd) { bd = d; best = k; } });
      v1 = v2 = best + 1;
      if (WC(ch[best][1]) > target * 1.8) excerpt = target;
    }
  } else {
    v1 = 1; v2 = ch.length;
    if (size !== "long") excerpt = target;
  }
  return { part, b: code, c, v1, v2, d: r[3] / 100, excerpt, text: "" };
}
/* An excerpt keeps whole Latin sentences from the start until the word target is reached. */
function secRows(book, s) {
  const rows = book.ch[s.c - 1].slice(s.v1 - 1, s.v2);
  if (!s.excerpt || rows.length !== 1) return rows;
  const v = rows[0];
  const sents = v[1].match(SENT_RE) || [v[1]];
  let la = "", w = 0;
  for (const t of sents) { la += t; w += WC(t); if (w >= s.excerpt) break; }
  la = la.trim();
  if (WC(la) >= WC(v[1]) - 3) return rows;
  return [[v[0], la, v[2], v[3].slice(0, WC(la)), v[4], true]];
}
const isExcerpt = rows => rows.length === 1 && rows[0][5] === true;
const GRADE_L = { got: "Got it", partly: "Partly", review: "Needs review" };
const GRADE_C = { got: "text-ok", partly: "text-mid", review: "text-warn" };
const GRADE_BG = { got: "bg-oktint text-ok", partly: "bg-midtint text-mid", review: "bg-warntint text-warn" };

function ExamMode({ prog, onRecord, sessionGrade, tutor, onQuiz, focusMode, setFocusMode, blind, setBlind }) {
  const saved = useMemo(() => {
    const x = readLocal(EXAM_KEY) || {};
    let cfg = { mins: 5, help: false, ...(x.cfg || {}) };
    if (!SIZES[cfg.size]) { cfg.size = "short"; cfg.oral = true; if (cfg.mins === 30) cfg.mins = 5; }
    if (!["mock", ...PART_IDS].includes(cfg.scope)) cfg.scope = "nt";
    let run = x.run || null;
    if (run && !run.sections) run = run.b ? { ...run, sections: [{ part: "nt", b: run.b, c: run.c, v1: run.v1, v2: run.v2, d: 0.55, text: run.text || "" }] } : null;
    return { cfg, run };
  }, []);
  const [cfg, setCfg] = useState(saved.cfg);
  const [run, setRun] = useState(saved.run);
  const [data, setData] = useState(null);
  const [lex, setLex] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [word, setWord] = useState(null);

  useEffect(() => { writeLocal(EXAM_KEY, { cfg, run }); }, [cfg, run]);
  const runKey = run ? run.start : null;
  useEffect(() => {
    if (!run) { setData(null); return; }
    let alive = true;
    setData(null);
    Promise.all([Promise.all(run.sections.map(s => loadBook(s.b))), loadLex()])
      .then(([books, lx]) => { if (alive) { setData(books.map((bk, i) => ({ book: bk, rows: secRows(bk, run.sections[i]) }))); setLex(lx); } })
      .catch(() => { if (alive) setErr("The passage didn’t load. Check your connection and try again."); });
    return () => { alive = false; };
  }, [runKey]);

  const running = !!(run && !run.end);
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [running]);
  const limit = run && run.mins ? run.mins * 60 : 0;
  const elapsed = run ? Math.max(0, Math.floor(((run.end || now) - run.start) / 1000)) : 0;
  const left = limit ? Math.max(0, limit - elapsed) : null;
  useEffect(() => { if (running && limit && left === 0) setRun(r => ({ ...r, end: r.start + limit * 1000, timeUp: true })); }, [running, left]);

  async function start() {
    setBusy(true); setErr(""); setWord(null);
    try {
      const parts = cfg.scope === "mock" ? PART_IDS : [cfg.scope];
      const sections = [];
      for (const p of parts) sections.push(await pickSection(p, cfg.size, blind));
      await loadLex();
      setRun({ sections, mins: cfg.mins, help: cfg.help, oral: !!cfg.oral, partner: !!cfg.partner, size: cfg.size, start: Date.now(), lookups: 0, mock: cfg.scope === "mock" });
      setNow(Date.now());
    } catch (e) {
      setErr("The passage didn’t load. Check your connection and try again.");
    } finally { setBusy(false); }
  }
  function finish() { setRun(r => ({ ...r, end: Date.now() })); setWord(null); }
  function setText(i, t) { setRun(r => ({ ...r, sections: r.sections.map((s, j) => (j === i ? { ...s, text: t } : s)) })); }
  function pickWord(k) {
    if (word !== k && running) setRun(r => ({ ...r, lookups: (r.lookups || 0) + 1 }));
    setWord(word === k ? null : k);
  }

  const history = (prog.sittings || []).slice().reverse().slice(0, 8);
  /* When the sitting ends, mark every part straight away if AI marking is on. */
  const autoRef = useRef(null);
  useEffect(() => {
    if (!run || !run.end || !data || !lex || tutor.avail !== true || autoRef.current === run.start) return;
    autoRef.current = run.start;
    data.forEach((d, i) => {
      const s = run.sections[i], tkey = `exam:${run.start}:${i}`;
      if (!s || !s.text.trim() || tutor.fbs[tkey]) return;
      const label = passageLabel(s.b, s.c, d.rows, d.book) + (isExcerpt(d.rows) ? " (opening)" : "");
      tutor.run(tkey, d.rows, label + (isExcerpt(d.rows) ? ". The student translated only the Latin shown; the reference covers more, so ignore its extra text" : "") + (run.oral ? ". This was an oral sight translation, spoken and transcribed by speech recognition; ignore transcription slips and be lenient on wording" : ""), s.text, lex, s.part);
    });
  }, [run && run.end, data, lex, tutor.avail]);

  if (!run) {
    return (
      <>
        <section className="rounded-lg border border-rule bg-leaf px-5 py-6 sm:px-8" aria-label="Set up a sitting">
          <h2 className="latin text-[1.15rem] font-bold text-ink">Practice exam sitting</h2>
          <p className="mt-1 max-w-prose text-[15px] text-soft">
            {cfg.scope === "mock"
              ? "One unseen passage from each of the five exam parts, against a single clock, with word help switched off."
              : "An unseen passage at exam difficulty, against the clock, with word help switched off."}
            {cfg.oral
              ? " Read the Latin aloud, then translate it aloud at sight, as in the oral exam. Then reveal the reference and grade yourself."
              : " Write your translation, then compare, check and grade it."}
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label htmlFor="exam-scope" className="flex flex-col gap-1 text-[14px] text-ink">
              What to sit
              <select id="exam-scope" value={cfg.scope}
                onChange={e => { const v = e.target.value; setCfg(c => ({ ...c, scope: v })); }}
                className="rounded-md border border-rule bg-paper px-2 py-1.5 text-[15px]">
                <option value="mock">Full mock exam (all five parts)</option>
                {PARTS.map((p, i) => <option key={p.id} value={p.id}>{i + 1}. {p.name}</option>)}
              </select>
            </label>
            <label htmlFor="exam-size" className="flex flex-col gap-1 text-[14px] text-ink">
              Length{cfg.scope === "mock" ? " of each part" : ""}
              <select id="exam-size" value={cfg.size} onChange={e => setCfg({ ...cfg, size: e.target.value })}
                className="rounded-md border border-rule bg-paper px-2 py-1.5 text-[15px]">
                {Object.entries(SIZES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </label>
            <label htmlFor="exam-mins" className="flex flex-col gap-1 text-[14px] text-ink">
              Time limit
              <select id="exam-mins" value={cfg.mins} onChange={e => setCfg({ ...cfg, mins: +e.target.value })}
                className="rounded-md border border-rule bg-paper px-2 py-1.5 text-[15px]">
                {[[1, "1 minute"], [2, "2 minutes"], [3, "3 minutes"], [5, "5 minutes"], [10, "10 minutes"], [15, "15 minutes"], [20, "20 minutes"], [30, "30 minutes"], [45, "45 minutes"], [60, "1 hour"], [90, "1 hour 30"], [120, "2 hours"], [0, "No limit"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
            <label htmlFor="exam-oral" className="flex items-center gap-2 self-end pb-1.5 text-[14px] text-ink">
              <input id="exam-oral" type="checkbox" checked={!!cfg.oral} onChange={e => setCfg({ ...cfg, oral: e.target.checked })} className="h-4 w-4 accent-[#9a2b22]" />
              Oral: translate aloud, no typing
            </label>
            <label htmlFor="exam-partner" className="flex items-center gap-2 text-[14px] text-ink sm:col-span-2">
              <input id="exam-partner" type="checkbox" checked={!!cfg.partner} onChange={e => setCfg({ ...cfg, partner: e.target.checked })} className="h-4 w-4 accent-[#9a2b22]" />
              Practising with a partner: show the examiner’s key (reference translation and questions) for them during the sitting
            </label>
            <label htmlFor="exam-help" className="flex items-center gap-2 self-end pb-1.5 text-[14px] text-ink">
              <input id="exam-help" type="checkbox" checked={cfg.help} onChange={e => setCfg({ ...cfg, help: e.target.checked })} className="h-4 w-4 accent-[#9a2b22]" />
              Allow word lookups (counted)
            </label>
            {setBlind && (
              <label htmlFor="exam-blind" className="flex items-center gap-2 text-[14px] text-ink sm:col-span-2">
                <input id="exam-blind" type="checkbox" checked={!!blind} onChange={e => setBlind(e.target.checked)} className="h-4 w-4 accent-[#9a2b22]" />
                Blind: hide New Testament and Psalm references until the end, and avoid the Gospels and best-known psalms
              </label>
            )}
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Btn variant="primary" onClick={start} disabled={busy}>{busy ? "Preparing…" : "Start sitting"}</Btn>
            {err && <span className="text-[14px] text-warn">{err}</span>}
          </div>
        </section>
        {history.length > 0 && (
          <section aria-label="Past sittings">
            <h2 className="smallcaps mb-2 text-[15px] font-semibold text-rubric">Past sittings</h2>
            <div className="overflow-x-auto">
              <table className="num w-full min-w-[30rem] text-left text-[14px]">
                <thead className="text-soft">
                  <tr className="border-b border-rule"><th className="py-1.5 pr-3 font-medium">Date</th><th className="py-1.5 pr-3 font-medium">Sitting</th><th className="py-1.5 pr-3 font-medium">Time</th><th className="py-1.5 font-medium">Your grades</th></tr>
                </thead>
                <tbody>
                  {history.map(s => (
                    <tr key={s.at} className="border-b border-rule align-top">
                      <td className="py-1.5 pr-3 text-soft">{new Date(s.at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</td>
                      <td className="py-1.5 pr-3 text-ink">{s.ref}{s.lookups ? <span className="text-soft"> · {s.lookups} lookups</span> : null}</td>
                      <td className="py-1.5 pr-3 text-ink">{mmss(s.secs)}</td>
                      <td className="py-1.5">
                        {s.parts ? (
                          <span className="flex flex-wrap gap-1">
                            {s.parts.map((q, i) => (
                              <span key={i} title={`${PART_INFO[q.p].short}${q.errs != null ? `, ${q.errs} mistakes marked` : ""}`}
                                className={`rounded px-1.5 py-0.5 text-[12px] ${q.g ? GRADE_BG[q.g] : "bg-paper text-soft"}`}>
                                {PART_IDS.indexOf(q.p) + 1}. {q.g ? GRADE_L[q.g] : "–"}
                              </span>
                            ))}
                          </span>
                        ) : <span className={GRADE_C[s.grade] || ""}>{GRADE_L[s.grade] || "–"}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </>
    );
  }

  const secs = Math.min(elapsed, limit || elapsed);
  const hideRef = part => blind && running && BLIND_PARTS.has(part);
  const title = (run.mock ? "Mock exam: all five parts" : hideRef(run.sections[0].part) ? PART_INFO[run.sections[0].part].short + " · reference hidden" : (data ? passageLabel(run.sections[0].b, run.sections[0].c, data[0].rows, data[0].book) : "")) + (run.oral ? " (oral)" : "");
  const results = (data || []).map((d, i) => {
    const s = run.sections[i];
    const tkey = `exam:${run.start}:${i}`;
    const tstate = tutor.fbs[tkey];
    const tres = tstate && tstate.status === "done" && normText(tstate.text) === normText(s.text) ? tstate.result : null;
    const cov = run.end && s.text.trim() && s.part !== "hy" && !isExcerpt(d.rows) ? coverage(s.text, d.rows.map(v => v[2]).join(" ")) : null;
    const tags = lex ? autoTags(lex, d.rows) : [];
    return { s, d, i, tkey, tstate, tres, cov, tags };
  });
  const rec = {
    ref: title, at: run.start, secs, len: results.reduce((n, r) => n + r.d.rows.length, 0), lookups: run.lookups || 0,
    parts: results.map(r => ({ p: r.s.part, g: null, cov: r.cov && r.cov.total ? Math.round(r.cov.hit / r.cov.total * 100) : null, errs: r.tres ? r.tres.issues.filter(x => x.severity === "error").length : null }))
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rule bg-leaf px-5 py-3">
        <span className="smallcaps text-[15px] font-semibold text-rubric">{title}</span>
        <span className={`num latin text-[1.3rem] font-bold ${left != null && left <= 60 && running ? "text-warn" : "text-ink"}`} aria-live="off">
          {limit ? mmss(running ? left : Math.max(0, limit - elapsed)) : mmss(elapsed)}
          <span className="ml-1.5 font-sans text-[13px] font-normal text-soft">{running ? (limit ? "left" : "elapsed") : run.timeUp ? "time’s up" : "finished"}</span>
        </span>
        {running && !focusMode && setFocusMode && <Btn onClick={() => setFocusMode(true)} title="Large text, nothing else on screen">Focus mode</Btn>}
      </div>
      {!data && <p className="text-[15px] text-soft">{err || "Loading the passages…"}</p>}

      {results.map(({ s, d, i, tkey, tstate, tres, cov, tags }) => {
        const active = typeof tutor.active === "string" && tutor.active.startsWith(i + ":") ? +tutor.active.split(":")[1] : null;
        const setActive = n => tutor.setActive(n == null ? null : `${i}:${n}`);
        const marks = tres ? Object.fromEntries(Object.entries(latinMarks(d.rows, tres, true, active)).map(([k, v]) => [`${i}:${k}`, v])) : null;
        let wordText = null, wordEntry = null;
        if (word && word.startsWith(i + ":")) {
          const [, vi, k] = word.split(":").map(Number);
          const v = d.rows[vi];
          if (v) { wordText = (v[1].match(WORD_RE) || [])[k]; wordEntry = v[3][k]; }
        }
        const label = passageLabel(s.b, s.c, d.rows, d.book) + (isExcerpt(d.rows) ? " (opening)" : "");
        const sub = hideRef(s.part) ? "" : passageSub(s.b, s.c, d.book);
        const g = sessionGrade(`${run.start}:${i}`);
        const suggest = tres ? tres.verdict : cov && cov.total ? (cov.hit / cov.total >= 0.8 ? "got" : cov.hit / cov.total >= 0.5 ? "partly" : "review") : null;
        const over = feedbackScores(tres);
        const ai = tres ? SCORE[tres.verdict] : null;
        return (
          <section key={i} className="flex flex-col gap-4" aria-label={`Part ${PART_IDS.indexOf(s.part) + 1}`}>
            <article className="rounded-lg border border-rule bg-leaf px-5 py-6 sm:px-8 sm:py-7">
              <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span className="smallcaps text-[14px] font-semibold text-rubric">{run.mock ? `Part ${PART_IDS.indexOf(s.part) + 1} · ${PART_INFO[s.part].short}` : PART_INFO[s.part].short}</span>
                <span className="text-[13px] text-soft">{hideRef(s.part) ? "Reference hidden" : label}</span>
              </div>
              {sub && <p className="mb-2 text-[13px] italic text-soft">{sub}</p>}
              <p lang="la" className={`lt latin mt-2 text-[1.18rem] leading-[1.85] text-ink sm:text-[1.28rem]${s.part === "hy" ? " whitespace-pre-line" : ""}`}>
                {d.rows.map((v, vi) => (
                  <span key={vi}>
                    {rowTag(v) && <sup className="num mr-0.5 text-[0.6em] font-bold text-rubric">{rowTag(v)}</sup>}
                    {run.help || run.end
                      ? <LatinWords text={s.part === "hy" ? v[1].replace(/ \/ /g, "\n") : v[1]} ids={v[3]} prefix={`${i}:${vi}:`} selected={word} onPick={pickWord} marks={run.end ? marks : null} />
                      : <AccentText text={s.part === "hy" ? v[1].replace(/ \/ /g, "\n") : v[1]} />}
                    {s.part === "hy" ? "\n\n" : " "}
                  </span>
                ))}
              </p>
              <WordPanel lex={lex} word={wordText} entry={wordEntry} onClose={() => setWord(null)} where={label} />
              {(run.help || run.end) && <p className="mt-3 text-[12px] text-soft">{run.end ? "Tap any word to check its parsing." : `Word lookups are on and counted: ${run.lookups || 0} so far.`}</p>}
            </article>

            {run.partner && running && (
              <details className="rounded-lg border border-rule bg-paper px-4 py-3">
                <summary className="cursor-pointer text-[14px] font-medium text-rubric">Examiner’s key (for your partner)</summary>
                <p className="latin mt-2 text-[1rem] italic leading-relaxed text-ink">{d.rows.map((v, vi) => <span key={vi}>{v[2]} </span>)}</p>
                <div className="mt-3"><ExaminerQuiz lex={lex} verses={d.rows} seed={tkey} showKey /></div>
              </details>
            )}
            {run.oral && running && (
              <p className="text-[14px] text-soft">Read the Latin aloud, then tap Speak and translate it aloud. Your words appear below as text{tutor.avail ? " and are marked when you finish" : ""}; nothing is recorded.{run.mock && i < results.length - 1 ? " Then go on to the next part." : ""}</p>
            )}
            <div className="flex flex-col gap-2">
              <label htmlFor={`exam-translation-${i}`} className="smallcaps text-[15px] text-soft">
                {run.oral ? "What you said" : `Your translation${run.mock ? ` · part ${PART_IDS.indexOf(s.part) + 1}` : ""}`}
              </label>
              {running && <Dictate value={s.text} onChange={t => setText(i, t)} label={run.oral ? "Speak your translation" : "Speak"} />}
              <textarea id={`exam-translation-${i}`} rows={run.oral ? 3 : s.part === "nt" || s.part === "st" ? 8 : 6} value={s.text} readOnly={!running && !run.oral}
                onChange={e => setText(i, e.target.value)}
                placeholder={run.oral ? "Tap Speak, or type what you said…" : "Translate the whole passage here…"}
                className="w-full resize-y rounded-md border border-rule bg-leaf px-4 py-3 text-[16px] leading-relaxed text-ink placeholder:text-[#a59c90] read-only:bg-paper"
                style={{ fontFamily: "var(--font-latin)" }} />
            </div>

            {!running && (
              <>
                <section className="reveal flex flex-col gap-3 border-l-2 border-rubric pl-4" aria-label="Reference translation">
                  <span className="smallcaps text-[14px] text-rubric">{PART_INFO[s.part].ref}</span>
                  <p className="latin text-[1.05rem] italic leading-relaxed text-ink">
                    {d.rows.map((v, vi) => <span key={vi}>{rowTag(v) && <sup className="num mr-0.5 text-[0.65em] not-italic text-rubric">{rowTag(v)}</sup>}{v[2]} </span>)}
                  </p>
                  {s.part === "hy" && <p className="text-[13px] text-soft">This is a rhymed verse translation, so it departs from the Latin. Use it for the sense, and the tutor for accuracy.</p>}
                  {isExcerpt(d.rows) && <p className="text-[13px] text-soft">You translated the opening only; the reference covers the whole {s.part === "se" ? "lesson" : "section"}.</p>}
                  {tres && tres.issues.length > 0 && (
                    <div>
                      <span className="smallcaps text-[14px] text-soft">Yours, marked</span>
                      <p className="latin mt-1 whitespace-pre-wrap text-[1rem] leading-relaxed text-ink">
                        <MarkedText text={s.text} fb={tres} active={active} setActive={setActive} />
                      </p>
                    </div>
                  )}
                  <Coverage cov={cov} />
                  {s.text.trim() && (
                    <TutorPanel state={tstate} avail={tutor.avail} stale={!!(tstate && tstate.status !== "loading" && normText(tstate.text) !== normText(s.text))}
                      onRun={() => tutor.run(tkey, d.rows, label + (isExcerpt(d.rows) ? ". The student translated only the Latin shown; the reference covers more, so ignore its extra text" : "") + (run.oral ? ". This was an oral sight translation, spoken and transcribed by speech recognition; ignore transcription slips and be lenient on wording" : ""), s.text, lex, s.part)} onStop={() => tutor.stop(tkey)}
                      active={active} setActive={setActive} />
                  )}
                </section>
                <ExaminerQuiz lex={lex} verses={d.rows} seed={tkey} onAnswer={onQuiz} />
                <div className="flex flex-wrap items-center gap-2 border-t border-rule pt-4">
                  <span className="mr-1 text-[15px] text-soft">{run.mock ? `How did part ${PART_IDS.indexOf(s.part) + 1} go?` : "How did the sitting go?"}</span>
                  {["review", "partly", "got"].map(k => (
                    <Btn key={k} variant={k === "review" ? "warn" : k === "partly" ? "mid" : "ok"} pressed={g === k} hint={suggest === k}
                      onClick={() => onRecord(rec, i, s, tags, k, over, ai)}>
                      {k === "review" ? "↻ Needs Review" : k === "partly" ? "~ Partly" : "✓ Got It"}
                    </Btn>
                  ))}
                </div>
              </>
            )}
          </section>
        );
      })}

      {running && data && (
        <div className="flex flex-wrap gap-2">
          <Btn variant="primary" onClick={finish}>{run.oral ? "Finish and reveal" : "Finish and check"}</Btn>
          <Btn onClick={() => { setRun(null); setWord(null); }}>Abandon</Btn>
        </div>
      )}
      {!running && (
        <div className="flex justify-end">
          <Btn variant="primary" onClick={() => { setRun(null); setWord(null); }}>New sitting →</Btn>
        </div>
      )}
    </>
  );
}

/* ---------- Links to a passage ---------- */
const ARTIFACT_URL = "https://claude.ai/artifact/X6N5DSQ3q196vb6ZEzgjty";
function ShareLink({ hash }) {
  const [msg, setMsg] = useState("");
  const url = `${APP ? location.origin + location.pathname : ARTIFACT_URL}#${hash}`;
  function copy() {
    const done = () => { setMsg("Link copied"); setTimeout(() => setMsg(""), 2500); };
    try { navigator.clipboard.writeText(url).then(done, () => setMsg(url)); } catch (e) { setMsg(url); }
  }
  return (
    <span className="flex min-w-0 items-center gap-2">
      {msg && <span className="min-w-0 break-all text-ink" aria-live="polite">{msg}</span>}
      <button type="button" onClick={copy} className="text-rubric underline underline-offset-2">Copy link to this passage</button>
    </span>
  );
}

/* ---------- Exam readiness, per part ---------- */
function Readiness({ prog, onPick, onPlace }) {
  return (
    <div className="mt-4 border-t border-rule pt-3">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3">
        <span className="smallcaps text-[14px] font-semibold text-rubric">Exam readiness</span>
        <span className="text-[12px] text-soft">Estimated chance of a good translation of a typical exam passage; the estimate firms up from rough to solid as you grade more. Tap a part to practise it.</span>
      </div>
      <div className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
        {PARTS.map((p, i) => {
          const a = (prog.ability || {})[p.id];
          const ok = a && a.n >= 3;
          const r = readiness(a);
          const color = !ok ? "var(--rule)" : r >= 70 ? "var(--ok)" : r >= 45 ? "var(--mid)" : "var(--warn)";
          return (
            <button key={p.id} type="button" onClick={() => onPick(p.id)}
              className="grid grid-cols-[minmax(0,8.5rem)_1fr_auto] items-center gap-3 rounded py-0.5 text-left hover:text-rubric">
              <span className="truncate text-[14px] text-ink">{i + 1}. {PART_INFO[p.id].short}</span>
              <span className="h-2 overflow-hidden rounded-full bg-[var(--rule)]" aria-hidden="true">
                <span className="block h-full rounded-full" style={{ width: `${ok ? r : 0}%`, background: color }} />
              </span>
              <span className="num w-[6.5rem] text-right text-[13px] text-soft" title={ok ? `Based on ${a.n} graded passages` : ""}>
                {ok ? <>{r}% <span className="text-[11px]">{a.n < 8 ? "rough" : a.n < 20 ? "fair" : "solid"}</span></> : a && a.n ? `${a.n} of 3 done` : "not placed"}
              </span>
            </button>
          );
        })}
      </div>
      {onPlace && (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
          <button type="button" className="font-medium text-rubric underline underline-offset-2" onClick={() => onPlace(PARTS.map(p => p.id))}>Placement check, all five parts (about 10 minutes)</button>
          <span className="text-soft">or tap a part, then “Check my level”.</span>
        </div>
      )}
    </div>
  );
}

const STUDY_MODES = ["drill", "read", "vocab", "forms", "exam"];
function App() {
  const ui0 = readLocal(UI_KEY) || {};
  const [prog, setProg] = useState(loadLocalProgress);
  const [drafts, setDrafts] = useState(() => readLocal(DRAFT_KEY) || {});
  const [mode, setMode] = useState(["read", "vocab", "exam", "forms", "guide", "office", "library"].includes(ui0.mode) ? ui0.mode : "drill");
  const [formsFocus, setFormsFocus] = useState(null);
  const [lastStudy, setLastStudy] = useState(() => (STUDY_MODES.includes(ui0.study) ? ui0.study : "read"));
  useEffect(() => { if (STUDY_MODES.includes(mode)) setLastStudy(mode); }, [mode]);
  const group = STUDY_MODES.includes(mode) || mode === "place" ? "study" : mode === "office" ? "liturgy" : mode;
  const [placeParts, setPlaceParts] = useState(null);
  const placeRes = useRef(null);
  const [store, setStore] = useState("local");
  const [focus, setFocus] = useState("All");
  const [drill, setDrill] = useState(null);
  const [current, setCurrent] = useState(() => pickNext(loadLocalProgress(), null, "All", null));
  const [pos, setPos] = useState(() => ui0.pos && BOOK_NAME[ui0.pos.b] ? ui0.pos : { b: "jn", c: 1, v: 1 });
  const [order, setOrder] = useState(ui0.order === "seq" ? "seq" : "adaptive");
  const [posByPart, setPosByPart] = useState(() => (ui0.posByPart && typeof ui0.posByPart === "object" ? ui0.posByPart : {}));
  const [pidx, setPidx] = useState(null);
  const [posWhy, setPosWhy] = useState("");
  const [showDR, setShowDR] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [word, setWord] = useState(null);
  const [session, setSession] = useState({});
  const [fbs, setFbs] = useState(() => readLocal(FB_KEY) || {});
  const [tutorAvail, setTutorAvail] = useState(null);
  const [activeIssue, setActiveIssue] = useState(null);
  const [tutorCfg, setTutorCfg] = useState(() => { const c = readLocal(TUTOR_KEY) || {}; return { tier: c.tier === "default" ? "default" : "quick", log: Array.isArray(c.log) ? c.log : [] }; });
  const [prefs, setPrefs] = useState(() => ({ accents: false, structure: false, size: 1, deck: "all", welcomed: false, ...(readLocal(PREFS_KEY) || {}) }));
  const [day, setDay] = useState(readDay);
  const [focusMode, setFocusMode] = useState(false);
  const [examKey, setExamKey] = useState(0);
  const practiceRef = useRef(null);
  const [accMap, setAccMap] = useState(null);
  const [lexAll, setLexAll] = useState(null);
  const voice = useLatinVoice();
  const ctlRef = useRef({});
  const cloudRef = useRef(null);
  const chainRef = useRef(Promise.resolve());
  const undoRef = useRef(null);
  const progRef = useRef(prog);
  progRef.current = prog;

  const verse = BY_ID[current.id];
  const at = verseAt(verse.ref);
  const drillNT = useNT(mode === "drill" ? at.b : null);
  const readNT = useNT(mode === "read" ? pos.b : null);

  useEffect(() => { writeLocal(UI_KEY, { mode, pos, order, posByPart, study: lastStudy }); }, [mode, pos, order, posByPart, lastStudy]);
  useEffect(() => { writeLocal(PREFS_KEY, prefs); }, [prefs]);
  useEffect(() => { writeLocal(DAY_KEY, day); }, [day]);
  useEffect(() => { if (prefs.accents && !accMap) loadAccents().then(setAccMap).catch(() => setPrefs(p => ({ ...p, accents: false }))); }, [prefs.accents, accMap]);
  useEffect(() => { if (prefs.structure && !lexAll) loadLex().then(setLexAll).catch(() => {}); }, [prefs.structure, lexAll]);
  // A link ending #p-<book>-<chapter>-<verse> opens that passage.
  useEffect(() => {
    const m = (location.hash || "").match(/^#p-([0-9a-z]+)-(\d+)-(\d+)$/);
    if (m && BOOK[m[1]] && +m[2] >= 1 && +m[2] <= BOOK[m[1]][2].length) { setMode("read"); setPos({ b: m[1], c: +m[2], v: +m[3] }); setPosWhy("Opened from a shared link."); }
  }, []);
  function bump(kind, n = 1) { setDay(d => { const base = d.date === todayStr() ? d : readDay(); return { ...base, [kind]: (base[kind] || 0) + n }; }); }
  useEffect(() => {
    if (mode !== "read" || pidx) return;
    let alive = true;
    loadPassages().then(x => { if (alive) setPidx(x); }).catch(() => {});
    return () => { alive = false; };
  }, [mode, pidx]);
  useEffect(() => { writeLocal(DRAFT_KEY, drafts); }, [drafts]);
  const [aiTick, setAiTick] = useState(0);
  useEffect(() => { let alive = true; getSample().then(sm => { if (alive) setTutorAvail(!!sm); }); return () => { alive = false; }; }, [aiTick]);
  const aiRef = useRef(null);
  useEffect(() => {
    const ch = () => setAiTick(t => t + 1);
    const setup = () => { setShowStats(true); requestAnimationFrame(() => requestAnimationFrame(() => aiRef.current && aiRef.current.scrollIntoView({ block: "center" }))); };
    window.addEventListener("lv-ai-changed", ch); window.addEventListener("lv-ai-setup", setup);
    return () => { window.removeEventListener("lv-ai-changed", ch); window.removeEventListener("lv-ai-setup", setup); };
  }, []);
  useEffect(() => {
    const keep = Object.entries(fbs).filter(([, v]) => v.status === "done").sort((a, b) => b[1].at - a[1].at).slice(0, 150);
    writeLocal(FB_KEY, Object.fromEntries(keep));
  }, [fbs]);
  useEffect(() => { writeLocal(TUTOR_KEY, tutorCfg); }, [tutorCfg]);

  // Account storage when the viewer has it.
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!window.claude || !window.claude.use) return;
      const [user, db] = await Promise.all([window.claude.use("user"), window.claude.use("db")]);
      if (!user || !db || !alive) return;
      const uid = await user.id();
      if (!uid || !alive) return;
      const ref = db.doc("data/users/" + uid + "/progress");
      try {
        const snap = await ref.get();
        const local = progRef.current;
        let confirmed = false;
        if (snap.exists) {
          const remote = JSON.parse(JSON.stringify(snap.data()));
          if ((remote.updated || 0) >= (local.updated || 0)) {
            const merged = normalizeProg(remote);
            setProg(merged); writeLocal(LOCAL_KEY, merged);
          } else {
            await ref.set(local);
          }
          confirmed = true;
        } else if (local.updated) {
          await ref.set(local);
          confirmed = true;
        }
        if (alive) { cloudRef.current = ref; if (confirmed) setStore("cloud"); }
      } catch (e) { /* stay on browser storage */ }
    })();
    return () => { alive = false; };
  }, []);

  function persist(next) {
    writeLocal(LOCAL_KEY, next);
    const ref = cloudRef.current;
    if (!ref) return;
    chainRef.current = chainRef.current
      .then(() => ref.set(next))
      .then(() => setStore("cloud"))
      .catch(e => { if (e && e.code !== "unavailable") { cloudRef.current = null; setStore("local"); } });
  }

  function resetView() { setShowDR(false); setShowNotes(false); setWord(null); setActiveIssue(null); undoRef.current = null; }

  /* ----- tutor ----- */
  function logMistakes(ref, fb) {
    const errs = fb.issues.filter(i => i.severity === "error")
      .map(i => ({ at: Date.now(), ref, type: i.type, concept: i.concept, latin: i.latin.slice(0, 40), fix: i.fix.slice(0, 60) }));
    const p = progRef.current;
    const had = (p.mistakes || []).some(m => m.ref === ref);
    if (!errs.length && !had) return;
    const next = { ...p, mistakes: [...(p.mistakes || []).filter(m => m.ref !== ref), ...errs].slice(-60), updated: Date.now() };
    setProg(next); persist(next);
  }
  async function runTutor(key, verses, ref, text, lex, part = "nt") {
    const t = text.trim();
    if (!t || !verses || !verses.length) return;
    const cur = fbs[key];
    if (cur && normText(cur.text) === normText(t) && (cur.status === "done" || cur.status === "loading")) {
      if (cur.status === "done" && cur.text !== t) setFbs(f => ({ ...f, [key]: { ...cur, text: t } }));
      return;
    }
    const sm = await getSample();
    if (!sm) { setTutorAvail(false); return; }
    if (ctlRef.current[key]) ctlRef.current[key].abort();
    const ctl = new AbortController();
    ctlRef.current[key] = ctl;
    setActiveIssue(null);
    setFbs(f => ({ ...f, [key]: { status: "loading", text: t } }));
    try {
      const raw = await sm.json(tutorPrompt(lex, verses, ref, t, part), { signal: ctl.signal, modelTier: tutorCfg.tier, cache: { gcTime: 864e5 } });
      setTutorCfg(c => ({ ...c, log: [...c.log.filter(x => x > Date.now() - 7 * DAY), Date.now()].slice(-200) }));
      const result = cleanFeedback(raw);
      if (!result) throw { code: "invalid_json" };
      setFbs(f => ({ ...f, [key]: { status: "done", text: t, result, at: Date.now() } }));
      logMistakes(ref, result);
    } catch (e) {
      const code = e && e.code;
      if (code === "cancelled") { setFbs(f => { const n = { ...f }; delete n[key]; return n; }); return; }
      if (TUTOR_OFF.includes(code)) setTutorAvail(false);
      setFbs(f => ({ ...f, [key]: { status: "error", text: t, code, msg: tutorErrorText(code, e && e.msg) } }));
    } finally {
      if (ctlRef.current[key] === ctl) delete ctlRef.current[key];
    }
  }
  function stopTutor(key) { if (ctlRef.current[key]) ctlRef.current[key].abort(); }

  /* ----- drill navigation ----- */
  function goTo(pick) { setCurrent(pick); resetView(); }
  function nextDrill() { goTo(pickNext(prog, verse.id, focus, drill)); }
  function chooseDrill(id) { goTo({ id, why: "Chosen from the list." }); }
  function randomDrill() {
    let pool = VERSES.filter(v => v.id !== verse.id && (focus === "All" || v.g === focus));
    if (!pool.length) pool = VERSES.filter(v => v.id !== verse.id);
    goTo({ id: pool[Math.floor(Math.random() * pool.length)].id, why: "Random pick." });
  }

  /* ----- reading navigation ----- */
  const book = readNT.book;
  const chapterVerses = book ? book.ch[pos.c - 1] : null;
  const blocks = useMemo(() => (chapterVerses ? blocksFor(chapterVerses) : []), [chapterVerses]);
  const blockIdx = Math.max(0, blocks.findIndex(bl => bl.some(v => v[0] === pos.v)));
  const block = blocks[blockIdx] || null;
  const pkey = block ? passageKey(pos.b, pos.c, block[0][0]) : null;

  const curPart = partOf(pos.b);
  const pinfo = PART_INFO[curPart];
  const hideRef = !!prefs.blind && BLIND_PARTS.has(curPart) && !showDR;
  const pdiff = pidx && pkey && pidx.byKey[pkey] ? pidx.byKey[pkey].d : null;
  function goPassage(p, why = "") { setPos(p); setPosWhy(why); resetView(); }
  async function switchPart(pid, adaptive) {
    const saved = { ...posByPart, [curPart]: pos };
    setPosByPart(saved);
    setMode("read");
    if (adaptive) {
      const x = pidx || await loadPassages().catch(() => null);
      if (x) {
        if (!pidx) setPidx(x);
        const pk = pickPassage(prog, pid, x.idx, null, prefs.blind);
        if (pk) return goPassage(parseKey(pk.key), pk.why);
      }
    }
    const p = saved[pid] && BOOK[saved[pid].b] && partOf(saved[pid].b) === pid ? saved[pid] : { b: partBooks(pid)[0][0], c: 1, v: 1 };
    goPassage(p, "");
  }
  function nextPassage() {
    if (order === "adaptive" && pidx) {
      const pk = pickPassage(prog, curPart, pidx.idx, pkey, prefs.blind);
      if (pk) return goPassage(parseKey(pk.key), pk.why);
    }
    const due = duePassages(prog).filter(k => k !== pkey && partOf(k.split(".")[0]) === curPart);
    if (due.length) {
      const c = prog.pcards[due[0]];
      return goPassage(parseKey(due[0]), c.box === 0 ? "Back for another try: you marked it Needs Review." : "Due for review, to keep it fresh.");
    }
    if (blockIdx < blocks.length - 1) return goPassage({ b: pos.b, c: pos.c, v: blocks[blockIdx + 1][0][0] }, "Next passage in order.");
    const list = partBooks(curPart);
    const bi = list.findIndex(b => b[0] === pos.b);
    if (pos.c < list[bi][2].length) return goPassage({ b: pos.b, c: pos.c + 1, v: 1 }, `Start of the next ${pinfo.chap.toLowerCase()}.`);
    if (bi < list.length - 1) return goPassage({ b: list[bi + 1][0], c: 1, v: 1 }, `On to ${list[bi + 1][1]}.`);
    goPassage({ b: list[0][0], c: 1, v: 1 }, "Back to the start.");
  }
  function prevPassage() {
    if (blockIdx > 0) return goPassage({ b: pos.b, c: pos.c, v: blocks[blockIdx - 1][0][0] });
    if (pos.c > 1) return goPassage({ b: pos.b, c: pos.c - 1, v: BOOK[pos.b][2][pos.c - 2] });
  }

  /* ----- grading (shared) ----- */
  function grade(key, coll, id, tags, over, abil) {
    const score = SCORE[key];
    let base = prog;
    const u = undoRef.current;
    if (u && u.coll === coll && u.id === id) {
      const col = { ...(prog[coll] || {}) };
      if (u.card) col[id] = u.card; else delete col[id];
      base = { ...prog, [coll]: col, skill: u.skill, ability: u.ability };
    } else {
      undoRef.current = { coll, id, card: (prog[coll] || {})[id], skill: prog.skill, ability: prog.ability };
    }
    let nextProg = applyGrade(base, coll, id, tags, score, over);
    if (abil) nextProg = applyAbility(nextProg, abil.part, abil.d, abil.ai != null ? score * 0.25 + abil.ai * 0.75 : score, abil.k);
    setProg(nextProg); persist(nextProg);
    setSession(s => ({ ...s, [coll + ":" + id]: key }));
    if (!(u && u.coll === coll && u.id === id)) {
      const wasDue = base[coll] && base[coll][id] && base[coll][id].due <= Date.now();
      if (wasDue) bump("reviews");
      if (coll === "vcards") bump("vocab");
      else if (coll === "pcards" || coll === "cards") bump("passages");
    }
    return nextProg;
  }
  function answerQuiz(concept, ok) {
    bump("quiz");
    if (!concept) return;
    const next = applySkill(progRef.current, [concept], ok ? 1 : 0);
    setProg(next); persist({ ...next, updated: Date.now() });
  }
  function gradeVocab(lemma, key) {
    if (key === "know") {
      const now = Date.now();
      const next = { ...prog, vcards: { ...(prog.vcards || {}), [lemma]: { box: 5, n: 1, last: now, due: now + INTERVALS[5], ema: 1 } }, updated: now };
      setProg(next); persist(next); bump("vocab");
      return next;
    }
    undoRef.current = null;
    return grade(key, "vcards", lemma, []);
  }
  function recordSitting(rec, i, sec, tags, key, over, ai) {
    const uid = rec.at + ":" + i;
    const u = undoRef.current;
    let base = prog;
    if (u && u.coll === "sit" && u.id === uid) base = { ...prog, skill: u.skill, ability: u.ability };
    else undoRef.current = { coll: "sit", id: uid, skill: prog.skill, ability: prog.ability };
    const old = (base.sittings || []).find(x => x.at === rec.at);
    const parts = rec.parts.map((q, j) => ({ ...q, g: j === i ? key : (old && old.parts && old.parts[j] ? old.parts[j].g : null) }));
    const sittings = [...(base.sittings || []).filter(x => x.at !== rec.at), { ...rec, parts }].slice(-30);
    let nextProg = applySkill(base, tags, SCORE[key], over);
    nextProg = applyAbility(nextProg, sec.part, sec.d != null ? sec.d : 0.55, ai != null ? SCORE[key] * 0.25 + ai * 0.75 : SCORE[key], 0.2);
    nextProg = { ...nextProg, sittings, updated: Date.now() };
    if (!old || !(old.parts || []).some(q => q.g)) { if (/\(oral\)$/.test(rec.ref)) bump("oral"); }
    setProg(nextProg); persist(nextProg);
    setSession(s => ({ ...s, ["sit:" + uid]: key }));
  }
  function setExam(date) {
    const nextProg = { ...prog, exam: date, updated: Date.now() };
    setProg(nextProg); persist(nextProg);
  }

  /* ----- derived figures ----- */
  const now = Date.now();
  const mastered = VERSES.filter(v => prog.cards[v.id] && prog.cards[v.id].box >= 3).length;
  const passagesDone = Object.keys(prog.pcards || {}).length;
  const dueDrill = VERSES.filter(v => prog.cards[v.id] && prog.cards[v.id].due <= now).length;
  const dueP = duePassages(prog).length;
  const dueV = Object.values(prog.vcards || {}).filter(c => c.due <= now).length;
  const wordsKnown = Object.values(prog.vcards || {}).filter(c => c.box >= 2).length;
  const target = levelTarget(prog);
  const tally = Object.values(session);
  const cnt = k => tally.filter(t => t === k).length;

  let pace = null;
  if (prog.exam) {
    const days = Math.ceil((new Date(prog.exam + "T12:00:00") - now) / DAY);
    const left = VERSES.length - mastered;
    if (days > 0) {
      const per = Math.ceil(left / Math.max(1, days / 7));
      pace = `${days} days to go. Clear your due reviews first, then spend most of each session on your weakest exam part.`;
    } else pace = "That date has passed. Set your next exam date.";
  }
  const untried = PARTS.find(p => !((prog.ability || {})[p.id] && prog.ability[p.id].n >= 3));
  const weakestPart = PARTS.filter(p => (prog.ability || {})[p.id] && prog.ability[p.id].n >= 3).sort((a, b) => readiness(prog.ability[a.id]) - readiness(prog.ability[b.id]))[0];
  const focusPart = untried || weakestPart;
  const dueAll = dueDrill + dueP + dueV;
  const examLeft = prog.exam ? (() => { const d = Math.ceil((new Date(prog.exam + "T12:00:00") - now) / DAY); return d > 0 ? `${d} days to the exam` : ""; })() : "";
  /* Bring the practice area into view, so a Today step always visibly does something. */
  function showPractice() {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const el = practiceRef.current;
      if (!el) return;
      const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      try { el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" }); } catch (e) { el.scrollIntoView(); }
    }));
  }
  /* Words tapped while reading the Office or Mass join the vocabulary deck, like words tapped in passages. */
  function addTapped(lemmas) {
    const cur = progRef.current, have = cur.vtap || [];
    const fresh = lemmas.filter(l => l && !have.includes(l) && !(cur.vcards || {})[l] && !BASIC.has(l));
    if (!fresh.length) return;
    const next = { ...cur, vtap: [...fresh, ...have].slice(0, 300), updated: Date.now() };
    setProg(next); persist(next);
  }
  function markRead(n, on) {
    const cur = progRef.current;
    const next = { ...cur, oread: cleanRead(on ? [...(cur.oread || []), n] : (cur.oread || []).filter(x => x !== n)), updated: Date.now() };
    setProg(next); persist(next);
  }
  const [officeToday, setOfficeToday] = useState(null);
  useEffect(() => { officeDay(isoOf(new Date())).then(d => { if (d && !d.missing) setOfficeToday(d); }).catch(() => {}); }, []);
  function startPlacement(parts) { setPlaceParts(parts); setMode("place"); resetView(); setPrefs(p => ({ ...p, welcomed: true })); showPractice(); }
  function finishPlacement(res, go) {
    if (res) {
      placeRes.current = res;
      const cur = progRef.current, ab = { ...(cur.ability || {}) };
      Object.entries(res).forEach(([p, r]) => {
        const a = ab[p], w = a && a.n >= 3 ? Math.min(a.n, 10) : 0;
        const t = (a ? a.t : 0) * w / (w + 6) + r.t * 6 / (w + 6);
        ab[p] = { t: +Math.max(-0.3, Math.min(1.3, t)).toFixed(3), n: (a ? a.n : 0) + 4 };
      });
      const next = { ...cur, ability: ab, updated: Date.now() };
      setProg(next); persist(next);
    }
    if (go) {
      const r = placeRes.current || {};
      const pid = Object.keys(r).sort((a, b) => r[a].t - r[b].t)[0] || "nt";
      switchPart(pid, true); showPractice();
    }
  }
  function openLemma(lemma) { setFormsFocus({ li: -1, lemma, at: Date.now() }); setMode("forms"); showPractice(); }
  function openRef(at) { setMode("read"); goPassage({ b: at[0], c: at[1], v: at[2] }, "Opened from the Guide."); showPractice(); }
  function drillConcept(t) { setDrill(t); setMode("drill"); goTo(pickNext(prog, verse.id, focus, t)); showPractice(); }
  function openTable(li, form) { setFormsFocus({ li, form, at: Date.now() }); setMode("forms"); setWord(null); showPractice(); }
  function todayStep(id) {
    setFocusMode(false);
    showPractice();
    if (id === "reviews") {
      if (dueDrill) { setMode("drill"); return goTo(pickNext(prog, null, focus, null)); }
      if (dueP) { const k = duePassages(prog)[0]; setMode("read"); return goPassage(parseKey(k), "Due for review."); }
      if (dueV) { setPrefs(p => ({ ...p, deck: "all" })); return setMode("vocab"); }
      return setMode("drill");
    }
    if (id === "vocab") return setMode("vocab");
    if (id === "passage") {
      if (focusPart && untried) return startPlacement([focusPart.id]);
      return switchPart(focusPart ? focusPart.id : "nt", true);
    }
    if (id === "oral") {
      // Set up a fresh short oral mock, unless a sitting is still running; then remount the exam view so it reads that set-up.
      const x = readLocal(EXAM_KEY) || {};
      if (!x.run || x.run.end) writeLocal(EXAM_KEY, { cfg: { ...(x.cfg || {}), scope: "mock", size: "short", oral: true, mins: 5 }, run: null });
      setExamKey(k => k + 1);
      setMode("exam");
    }
  }
  const firstVisit = !prefs.welcomed && !Object.keys(prog.cards || {}).length && !Object.keys(prog.pcards || {}).length && !Object.keys(prog.vcards || {}).length;
  const focusText = focusPart ? (untried ? `Next focus: ${PART_INFO[focusPart.id].short} (needs a few graded passages to estimate).` : `Weakest part: ${PART_INFO[focusPart.id].short}.`) : "";

  /* ----- drill view data ----- */
  const srcVerse = useMemo(() => {
    if (!drillNT.book) return null;
    const vs = (drillNT.book.ch[at.c - 1] || []).slice(at.v - 1, at.v2);
    if (!vs.length) return null;
    return [at.v, vs.map(v => v[1]).join(" "), vs.map(v => v[2]).join(" "), [].concat(...vs.map(v => v[3]))];
  }, [drillNT.book, at.c, at.v, at.v2]);
  const drillIds = useMemo(() => alignCurated(verse.la, srcVerse), [verse.la, srcVerse]);
  const draftKey = mode === "drill" ? verse.id : pkey;
  const draft = (draftKey && drafts[draftKey]) || "";
  const setDraft = t => setDrafts(d => ({ ...d, [draftKey]: t }));
  const refText = mode === "drill" ? verse.dr : (block ? block.map(v => v[2]).join(" ") : "");
  const cov = useMemo(() => (showDR && draft.trim() ? coverage(draft, refText) : null), [showDR, draft, refText]);
  const ptags = useMemo(() => (readNT.lex && block ? autoTags(readNT.lex, block) : []), [readNT.lex, block]);
  const drillVerses = useMemo(() => [[at.v, verse.la, verse.dr, drillIds || []]], [at.v, verse.la, verse.dr, drillIds]);
  const tState = draftKey ? fbs[draftKey] : null;
  const tStale = !!(tState && tState.status !== "loading" && normText(tState.text) !== normText(draft));
  const tRes = tState && tState.status === "done" && !tStale ? tState.result : null;
  const suggest = tRes ? tRes.verdict : cov && cov.total ? (cov.hit / cov.total >= 0.8 ? "got" : cov.hit / cov.total >= 0.5 ? "partly" : "review") : null;
  const tOver = feedbackScores(tRes);
  const runHere = () => mode === "drill"
    ? runTutor(verse.id, drillVerses, verse.ref, draft, drillNT.lex)
    : (block && runTutor(pkey, block, passageLabel(pos.b, pos.c, block, readNT.book), draft, readNT.lex, curPart));
  /* Passages are marked as soon as you check them, when AI marking is on; single drill verses only when asked. */
  const autoCheck = mode === "read" && tutorAvail === true && (draft.match(/[a-z]+/gi) || []).length >= 5 ? runHere : null;
  const dMarks = mode === "drill" && showDR && tRes ? latinMarks(drillVerses, tRes, false, activeIssue) : null;
  const pMarks = mode === "read" && showDR && tRes && block ? latinMarks(block, tRes, true, activeIssue) : null;
  const tutorBox = draft.trim() ? (
    <TutorPanel state={tState} avail={tutorAvail} stale={tStale} onRun={runHere} onStop={() => stopTutor(draftKey)}
      active={activeIssue} setActive={setActiveIssue} />
  ) : null;
  const yoursBox = draft.trim() ? (
    <div>
      <span className="smallcaps text-[14px] text-soft">Yours</span>
      <p className="latin mt-1 whitespace-pre-wrap text-[1rem] leading-relaxed text-ink">
        <MarkedText text={draft} fb={tRes} active={activeIssue} setActive={setActiveIssue} />
      </p>
    </div>
  ) : null;

  // selected word -> text + entry
  let wordText = null, wordEntry = null;
  if (word != null) {
    if (mode === "drill" && drillIds) {
      const k = +word; wordText = (verse.la.match(WORD_RE) || [])[k]; wordEntry = drillIds[k];
    } else if (mode === "read" && block) {
      const [vi, k] = word.split(":").map(Number);
      const v = block[vi]; if (v) { wordText = (v[1].match(WORD_RE) || [])[k]; wordEntry = v[3][k]; }
    }
  }

  // words you tap join the vocabulary deck
  useEffect(() => {
    const lx = mode === "drill" ? drillNT.lex : readNT.lex;
    if (!lx || wordEntry == null) return;
    const r = readings(wordEntry);
    const ids = r.kind === "lookup" ? r.ids.slice(0, 1) : r.ids;
    const add = ids.map(id => lx.ana[id]).filter(a => a && a[2] !== "??" && a[1] !== "Ne" && lx.lemmas[a[0]][1]).map(a => lx.lemmas[a[0]][0]);
    const cur = prog.vtap || [];
    const fresh = add.filter(l => !cur.includes(l) && !(prog.vcards || {})[l]);
    if (!fresh.length) return;
    const nextProg = { ...prog, vtap: [...fresh, ...cur].slice(0, 300), updated: Date.now() };
    setProg(nextProg); persist(nextProg);
  }, [word]);

  const card = mode === "drill" ? prog.cards[verse.id] : (pkey ? prog.pcards[pkey] : null);
  const status = !card ? null
    : card.box >= 3 ? { t: "Mastered", c: "text-ok" }
    : card.box === 0 ? { t: "Needs review", c: "text-warn" }
    : { t: "Learning", c: "text-mid" };

  const tabCls = on => `rounded-md px-3.5 py-1.5 text-[15px] font-medium ${on ? "bg-ink text-paper" : "text-ink hover:bg-leaf"}`;

  const aidsValue = { acc: prefs.accents ? accMap : null, structure: !!prefs.structure, lex: lexAll };
  const lz = [0.88, 1, 1.15, 1.32][prefs.size == null ? 1 : prefs.size] * (focusMode ? 1.2 : 1);
  const examTutor = { avail: tutorAvail, fbs, run: runTutor, stop: stopTutor, active: activeIssue, setActive: setActiveIssue };
  if (focusMode && mode === "exam") {
    return (
      <AidsContext.Provider value={aidsValue}>
        <div className="flex flex-col gap-5" style={{ "--lz": lz }}>
          <div className="flex items-center justify-between gap-2">
            <span className="smallcaps text-[14px] text-soft">Focus mode</span>
            <Btn onClick={() => setFocusMode(false)}>Exit focus</Btn>
          </div>
          <ReadingAids prefs={prefs} setPrefs={setPrefs} text="" voice={null} />
          <ExamMode key={examKey} prog={prog} onRecord={recordSitting} sessionGrade={at => session["sit:" + at]} tutor={examTutor} onQuiz={answerQuiz} focusMode={focusMode} setFocusMode={setFocusMode} blind={!!prefs.blind} setBlind={v => setPrefs(p => ({ ...p, blind: v }))} />
        </div>
      </AidsContext.Provider>
    );
  }
  return (
    <AidsContext.Provider value={aidsValue}>
    <div className="flex flex-col gap-6" style={{ "--lz": lz }}>
      {/* Header */}
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 border-b border-rule pb-3">
        <div>
          <h1 className="latin text-[1.35rem] font-bold tracking-tight text-ink">Lectio Vulgata</h1>
          <p className="text-[14px] text-soft">Latin exam practice for all five parts, adapting to what you know.</p>
        </div>
        <div className="num flex flex-wrap items-center gap-2 text-[14px] text-soft" aria-live="polite">
          <span className="smallcaps">This session</span>
          <span className="rounded bg-oktint px-2 py-0.5 text-ok">{cnt("got")} got it</span>
          <span className="rounded bg-midtint px-2 py-0.5 text-mid">{cnt("partly")} partly</span>
          <span className="rounded bg-warntint px-2 py-0.5 text-warn">{cnt("review")} review</span>
        </div>
      </header>

      {firstVisit && <WelcomeCard onClose={() => setPrefs(p => ({ ...p, welcomed: true }))} onPlace={() => startPlacement(PARTS.map(p => p.id))} />}
      <TodayCard office={officeToday} officeRead={(prog.oread || []).includes(dayNum(isoOf(new Date())))} onOffice={() => { setMode("office"); resetView(); showPractice(); }} day={day} dueCount={dueAll} focusName={focusPart ? PART_INFO[focusPart.id].short : ""} onStep={todayStep} examLeft={examLeft} placeFirst={!!(focusPart && untried)} />

      {/* Progress ledger */}
      <section className="rounded-lg border border-rule bg-leaf px-5 py-4" aria-label="Your progress">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat value={`${mastered}/${VERSES.length}`} label="drill verses mastered" />
          <Stat value={passagesDone} label="passages translated" />
          <Stat value={wordsKnown} label="words known" />
          <Stat value={dueDrill + dueP + dueV} label="due for review" />
        </div>
        <Readiness prog={prog} onPick={pid => { switchPart(pid, true); showPractice(); }} onPlace={startPlacement} />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[14px] text-soft">{pace || "Set your exam date (in Skill map & backup) to see your countdown."} {focusText}</p>
          <button type="button" onClick={() => setShowStats(s => !s)} aria-expanded={showStats}
            className="text-[14px] font-medium text-rubric underline decoration-rubrictint underline-offset-2 hover:decoration-rubric">
            {showStats ? "Hide skill map & backup" : "Skill map & backup"}
          </button>
        </div>
        {showStats && (
          <div className="reveal mt-4 flex flex-col gap-4 border-t border-rule pt-4">
            <div className="flex flex-wrap items-center gap-3">
              <label htmlFor="exam-date" className="text-[14px] text-ink">Exam date</label>
              <input id="exam-date" type="date" value={prog.exam || ""} onChange={e => setExam(e.target.value)}
                className="rounded-md border border-rule bg-paper px-2 py-1 text-[14px] text-ink" />
            </div>
            <div>
              <p className="mb-2 text-[14px] text-soft">Grammar skills, updated by every grade you give and by the mistakes the AI marks. Tap one to drill it.</p>
              <div className="flex flex-col gap-2">
                {Object.keys(CONCEPTS)
                  .sort((a, b) => (prog.skill[a] ? prog.skill[a].s : 2) - (prog.skill[b] ? prog.skill[b].s : 2))
                  .map(tag => <SkillRow key={tag} tag={tag} data={prog.skill[tag]} active={drill === tag}
                    onDrill={t => { const d = drill === t ? null : t; setDrill(d); setMode("drill"); if (d) goTo(pickNext(prog, verse.id, focus, d)); }} />)}
              </div>
            </div>
            <div ref={aiRef} className="scroll-mt-4 border-t border-rule pt-4">
              <span className="smallcaps mb-2 block text-[14px] font-semibold text-rubric">AI marking</span>
              <AiSetup />
            </div>
            {tutorAvail !== false && window.claude && window.claude.use && (
              <div className="border-t border-rule pt-4">
                <p className="mb-2 text-[14px] text-soft">Mistake checks by Claude use your own Claude usage. Quick uses the least; Thorough is more careful with hard grammar but uses more.</p>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex gap-1 rounded-lg border border-rule bg-paper p-1" role="group" aria-label="Check type">
                    <button type="button" className={tabCls(tutorCfg.tier === "quick")} aria-pressed={tutorCfg.tier === "quick"} onClick={() => setTutorCfg(c => ({ ...c, tier: "quick" }))}>Quick</button>
                    <button type="button" className={tabCls(tutorCfg.tier === "default")} aria-pressed={tutorCfg.tier === "default"} onClick={() => setTutorCfg(c => ({ ...c, tier: "default" }))}>Thorough</button>
                  </div>
                  <span className="num text-[13px] text-soft">{tutorCfg.log.filter(x => x > now - 7 * DAY).length} checks in the last 7 days</span>
                </div>
              </div>
            )}
            {(prog.mistakes || []).length > 0 && (
              <div className="border-t border-rule pt-4"><MistakeSummary log={prog.mistakes} /></div>
            )}
            <div className="border-t border-rule pt-4"><ReportsPanel /></div>
            <div className="border-t border-rule pt-4">
              <BackupPanel prog={prog} onRestore={data => { const merged = { ...data, exam: data.exam || prog.exam }; setProg(merged); persist(merged); undoRef.current = null; }} />
            </div>
            <div className="border-t border-rule pt-4"><ProgressFile prog={prog} onRestore={data => { const merged = { ...data, exam: data.exam || prog.exam }; setProg(merged); persist(merged); undoRef.current = null; }} /></div>
            <div className="border-t border-rule pt-4"><OfflinePanel /></div>
          </div>
        )}
      </section>

      {/* Mode switch */}
      {/* Navigation: four groups; Study has its own row of practice modes. */}
      <div ref={practiceRef} className="flex scroll-mt-4 flex-col gap-2">
        <nav className="grid grid-cols-4 gap-1 rounded-lg border border-rule bg-paper p-1" aria-label="Section">
          {[["study", "Study"], ["liturgy", "Liturgy"], ["library", "Library"], ["guide", "Guide"]].map(([g, l]) => (
            <button key={g} type="button" aria-pressed={group === g} className={`${tabCls(group === g)} text-center`}
              onClick={() => { setMode(g === "study" ? (STUDY_MODES.includes(lastStudy) ? lastStudy : "read") : g === "liturgy" ? "office" : g); resetView(); }}>{l}</button>
          ))}
        </nav>
        {group === "study" && (
          <nav className="flex flex-wrap items-center gap-1 self-start" aria-label="Practice mode">
            {[["drill", "Verse drill"], ["read", `Passages${dueP ? ` · ${dueP} due` : ""}`], ["vocab", `Vocabulary${dueV ? ` · ${dueV} due` : ""}`], ["forms", "Forms"], ["exam", "Exam sitting"]].map(([m, l]) => (
              <button key={m} type="button" aria-pressed={mode === m} onClick={() => { setMode(m); resetView(); }}
                className={`rounded-md border px-3 py-1 text-[14px] ${mode === m ? "border-rubric bg-rubrictint font-semibold text-rubric" : "border-rule bg-leaf text-ink hover:border-soft"}`}>{l}</button>
            ))}
          </nav>
        )}
      </div>

      {mode === "library" ? (
        <LibraryMode onTap={addTapped} onTable={openTable} />
      ) : mode === "office" ? (
        <OfficeMode prog={prog} onRead={markRead} onTable={openTable} onTap={addTapped} />
      ) : mode === "place" && placeParts ? (
        <PlacementCheck key={placeParts.join(",")} parts={placeParts} prog={prog} ai={tutorAvail === true} onAnswer={answerQuiz} onFinish={finishPlacement} onCancel={() => { setMode("read"); setPlaceParts(null); }} />
      ) : mode === "guide" ? (
        <GuideMode onOpen={openRef} onDrill={drillConcept} onPart={pid => { switchPart(pid, true); showPractice(); }} onLemma={openLemma} voice={voice} />
      ) : mode === "forms" ? (
        <FormsMode prog={prog} onAnswer={answerQuiz} focus={formsFocus} />
      ) : mode === "vocab" ? (
        <VocabMode prog={prog} onGrade={gradeVocab} deck={prefs.deck || "all"} setDeck={d => setPrefs(p => ({ ...p, deck: d }))}
          includeCommon={!!prefs.vocabAll} setIncludeCommon={v => setPrefs(p => ({ ...p, vocabAll: v }))} />
      ) : mode === "exam" ? (
        <>
          <ReadingAids prefs={prefs} setPrefs={setPrefs} text="" voice={null} />
          <ExamMode key={examKey} prog={prog} onRecord={recordSitting} sessionGrade={at => session["sit:" + at]} tutor={examTutor} onQuiz={answerQuiz} focusMode={focusMode} setFocusMode={setFocusMode} blind={!!prefs.blind} setBlind={v => setPrefs(p => ({ ...p, blind: v }))} />
        </>
      ) : mode === "drill" ? (
        <>
          {/* Drill controls */}
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor="passage" className="sr-only">Verse</label>
              <select id="passage" value={verse.id} onChange={e => chooseDrill(e.target.value)}
                className="min-w-0 flex-1 basis-56 rounded-md border border-rule bg-leaf px-3 py-2 text-[15px] text-ink">
                {GROUPS.map(g => (
                  <optgroup key={g} label={g}>
                    {VERSES.filter(v => v.g === g).map(v => {
                      const c = prog.cards[v.id];
                      const m = !c ? "" : c.box >= 3 ? "✓ " : c.box === 0 ? "↻ " : "· ";
                      return <option key={v.id} value={v.id}>{m}{v.ref} · {LEVELS[v.lv]}</option>;
                    })}
                  </optgroup>
                ))}
              </select>
              <Btn onClick={randomDrill}>Random Verse 🎲</Btn>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[14px] text-soft">
              <label htmlFor="focus" className="flex items-center gap-2">
                Focus
                <select id="focus" value={focus} onChange={e => setFocus(e.target.value)}
                  className="rounded-md border border-rule bg-leaf px-2 py-1 text-[14px] text-ink">
                  <option>All</option>
                  {GROUPS.map(g => <option key={g}>{g}</option>)}
                </select>
              </label>
              <span>Working level: <strong className="font-semibold text-ink">{LEVELS[target]}</strong></span>
              {drill && (
                <span className="flex items-center gap-2">
                  Drilling <strong className="font-semibold text-rubric">{CONCEPTS[drill]}</strong>
                  <button type="button" className="underline" onClick={() => setDrill(null)}>Stop</button>
                </span>
              )}
            </div>
          </div>

          {/* The verse */}
          <article className="rounded-lg border border-rule bg-leaf px-5 py-6 sm:px-8 sm:py-8">
            <div className="mb-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <span className="smallcaps text-[15px] font-semibold text-rubric">{verse.ref}</span>
              <span className="text-[13px] text-soft">
                {status && <span className={status.c}>{status.t} · </span>}
                {LEVELS[verse.lv]}
              </span>
            </div>
            <p className="mb-3 text-[13px] italic text-soft">{current.why}</p>
            <ReadingAids prefs={prefs} setPrefs={setPrefs} text={verse.la} voice={voice} />
            <p lang="la" className="lt latin initial text-[1.3rem] leading-[1.8] text-ink sm:text-[1.45rem]">
              <LatinWords text={verse.la} ids={drillIds} selected={word} onPick={k => setWord(word === k ? null : k)} marks={dMarks} />
            </p>
            <WordPanel lex={drillNT.lex} word={wordText} entry={wordEntry} onClose={() => setWord(null)} where={verse.ref} onTable={openTable} />
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1.5">
                {verse.k.map(t => <span key={t} className="rounded bg-paper px-2 py-0.5 text-[12px] text-soft">{CONCEPTS[t]}</span>)}
              </div>
              <button type="button" className="text-[13px] text-rubric underline underline-offset-2"
                onClick={() => { setMode("read"); goPassage({ b: at.b, c: at.c, v: at.v }, `In context: ${verse.ref}.`); }}>
                Read in context →
              </button>
            </div>
            {prefs.structure && <StructureKey />}
            <p className="mt-3 text-[12px] text-soft">{drillIds ? "Tap any word for its dictionary form, meaning and parsing." : drillNT.err || "Loading word parsings…"}</p>
          </article>

          {drillIds && <SkeletonCheck lex={drillNT.lex} verses={drillVerses} seed={verse.id} onAnswer={answerQuiz} />}
          <RecordAloud id={"d:" + verse.id} />
          <TranslateBox draft={draft} setDraft={setDraft} showDR={showDR} setShowDR={setShowDR} showNotes={showNotes} setShowNotes={setShowNotes} onCheck={autoCheck} />

          {showDR && (
            <section className="reveal flex flex-col gap-3 border-l-2 border-rubric pl-4" aria-label="Douay-Rheims translation">
              <span className="smallcaps text-[14px] text-rubric">Douay-Rheims</span>
              <p className="latin text-[1.08rem] italic leading-relaxed text-ink">{verse.dr}</p>
              {yoursBox}
              <Coverage cov={cov} />
              {tutorBox}
            </section>
          )}
          {showDR && drillIds && <ExaminerQuiz lex={drillNT.lex} verses={drillVerses} seed={verse.id} onAnswer={answerQuiz} />}

          {showNotes && (
            <section className="reveal grid gap-6 rounded-lg border border-rule bg-leaf px-5 py-5 sm:grid-cols-[1.6fr_1fr] sm:px-6" aria-label="Grammar notes">
              <div className="min-w-0">
                <h2 className="smallcaps mb-2 text-[15px] font-semibold text-rubric">Parsing</h2>
                <dl className="flex flex-col gap-2.5">
                  {verse.p.map(([w, n]) => (
                    <div key={w}>
                      <dt lang="la" className="latin text-[15px] font-bold text-ink">{w}</dt>
                      <dd className="text-[15px] leading-snug text-soft">{n}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <div className="min-w-0">
                <h2 className="smallcaps mb-2 text-[15px] font-semibold text-rubric">Vocabulary</h2>
                <dl className="flex flex-col gap-2">
                  {verse.v.map(([w, g]) => (
                    <div key={w}>
                      <dt lang="la" className="latin text-[14px] text-ink">{w}</dt>
                      <dd className="text-[14px] text-soft">{g}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-4 rounded bg-rubrictint px-3 py-2 text-[14px] leading-snug text-ink">{verse.t}</p>
              </div>
            </section>
          )}

          <GradeBar current={session["cards:" + verse.id]} suggest={suggest} card={card}
            onGrade={k => grade(k, "cards", verse.id, verse.k, tOver, { part: "nt", d: [0, 0.25, 0.5, 0.8][verse.lv], k: 0.05, ai: tRes ? SCORE[tRes.verdict] : null })} onNext={nextDrill} />
        </>
      ) : (
        <>
          {/* Exam part */}
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Exam part">
            {PARTS.map((p, i) => (
              <button key={p.id} type="button" onClick={() => p.id !== curPart && switchPart(p.id, false)} aria-pressed={p.id === curPart}
                className={`rounded-md border px-3 py-1.5 text-[14px] ${p.id === curPart ? "border-rubric bg-rubrictint font-semibold text-rubric" : "border-rule bg-leaf text-ink hover:border-soft"}`}>
                <span className="num">{i + 1}</span> {PART_INFO[p.id].short}
              </button>
            ))}
          </div>

          {!((prog.ability || {})[curPart] && prog.ability[curPart].n >= 3) && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-rubric bg-rubrictint px-4 py-2.5 text-[14px] text-ink">
              <span className="min-w-0 flex-1 basis-60">Not placed in {pinfo.short} yet. A 3-minute check sets your starting level, so passages fit you from the first one.</span>
              <Btn variant="primary" onClick={() => startPlacement([curPart])}>Check my level</Btn>
            </div>
          )}
          {/* Passage controls */}
          <div className="flex flex-wrap items-center gap-2">
            {hideRef && <span className="min-w-0 flex-1 basis-40 text-[14px] italic text-soft">Blind: the reference shows when you check your translation.</span>}
            {!hideRef && partBooks(curPart).length > 1 && (
              <>
                <label htmlFor="book" className="sr-only">{pinfo.book}</label>
                <select id="book" value={pos.b} onChange={e => goPassage({ b: e.target.value, c: 1, v: 1 })}
                  className="min-w-0 flex-1 basis-40 rounded-md border border-rule bg-leaf px-3 py-2 text-[15px] text-ink">
                  {partBooks(curPart).map(([code, name]) => {
                    const done = Object.keys(prog.pcards || {}).filter(k => k.startsWith(code + ".")).length;
                    return <option key={code} value={code}>{name}{done ? ` · ${done} done` : ""}</option>;
                  })}
                </select>
              </>
            )}
            {!hideRef && <label htmlFor="chapter" className="sr-only">{pinfo.chap}</label>}
            {!hideRef && <select id="chapter" value={pos.c} onChange={e => goPassage({ b: pos.b, c: +e.target.value, v: 1 })}
              className="min-w-0 flex-1 basis-40 rounded-md border border-rule bg-leaf px-3 py-2 text-[15px] text-ink">
              {(BOOK[pos.b] || BOOKS[0])[2].map((n, i) => {
                const labels = (BOOK[pos.b] || BOOKS[0])[4];
                const done = Object.keys(prog.pcards || {}).filter(k => k.startsWith(`${pos.b}.${i + 1}.`)).length;
                return <option key={i} value={i + 1}>{labels ? labels[i] : `${pinfo.chap} ${i + 1}`}{done ? ` · ${done} done` : ""}</option>;
              })}
            </select>}
            <Btn onClick={prevPassage} aria-label="Previous passage" disabled={blockIdx === 0 && pos.c === 1}>‹</Btn>
            <Btn onClick={() => blockIdx < blocks.length - 1 ? goPassage({ b: pos.b, c: pos.c, v: blocks[blockIdx + 1][0][0] }) : nextPassage()} aria-label="Following passage">›</Btn>
          </div>
          <div className="-mt-2 flex flex-wrap items-center gap-2 text-[14px] text-soft">
            <span>Next passage:</span>
            <div className="flex gap-1 rounded-lg border border-rule bg-paper p-0.5" role="group" aria-label="How the next passage is chosen">
              <button type="button" className={`rounded px-2.5 py-1 ${order === "adaptive" ? "bg-ink text-paper" : "text-ink"}`} aria-pressed={order === "adaptive"} onClick={() => setOrder("adaptive")}>Matched to your level</button>
              <button type="button" className={`rounded px-2.5 py-1 ${order === "seq" ? "bg-ink text-paper" : "text-ink"}`} aria-pressed={order === "seq"} onClick={() => setOrder("seq")}>In order</button>
            </div>
            {BLIND_PARTS.has(curPart) && (
              <label htmlFor="blind" className="ml-1 flex items-center gap-1.5" title="So you read the Latin instead of recalling the English">
                <input id="blind" type="checkbox" checked={!!prefs.blind} onChange={e => setPrefs(p => ({ ...p, blind: e.target.checked }))} className="h-4 w-4 accent-[#9a2b22]" />
                Blind: hide references, skip the best-known passages
              </label>
            )}
          </div>

          {/* Passages in this chapter / article / hymn */}
          {blocks.length > 1 && (
            <div className="flex flex-wrap gap-1.5" aria-label="Passages here">
              {blocks.map((bl, i) => {
                const k = passageKey(pos.b, pos.c, bl[0][0]);
                const c = prog.pcards[k];
                const tone = !c ? "bg-leaf text-soft border-rule" : c.box >= 3 ? "bg-oktint text-ok border-oktint" : c.box === 0 ? "bg-warntint text-warn border-warntint" : "bg-midtint text-mid border-midtint";
                const a = rowTag(bl[0]) || "1", z = rowTag(bl[bl.length - 1]);
                return (
                  <button key={k} type="button" onClick={() => goPassage({ b: pos.b, c: pos.c, v: bl[0][0] })}
                    className={`num rounded border px-2 py-0.5 text-[12px] ${tone} ${i === blockIdx ? "ring-2 ring-[var(--rubric)]" : ""}`}
                    aria-current={i === blockIdx ? "true" : undefined}>
                    {a}{bl.length > 1 && z !== a ? "–" + z : ""}
                  </button>
                );
              })}
            </div>
          )}

          <article className="rounded-lg border border-rule bg-leaf px-5 py-6 sm:px-8 sm:py-8">
            {!block ? (
              <p className="text-[15px] text-soft">{readNT.err || "Loading the text…"}</p>
            ) : (
              <>
                <div className="mb-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <span className="smallcaps text-[15px] font-semibold text-rubric">{hideRef ? `${pinfo.short} · reference hidden` : passageLabel(pos.b, pos.c, block, readNT.book)}</span>
                  <span className="text-[13px] text-soft">
                    {pdiff != null && <>{diffWord(pdiff)} · </>}
                    {status ? <span className={status.c}>{status.t}</span> : "Not yet translated"}
                  </span>
                </div>
                {!hideRef && passageSub(pos.b, pos.c, readNT.book) && <p className="text-[13px] text-soft">{passageSub(pos.b, pos.c, readNT.book)}</p>}
                {posWhy && !hideRef && <p className="mt-1 text-[13px] italic text-soft">{posWhy}</p>}
                <div className="mt-3"><ReadingAids prefs={prefs} setPrefs={setPrefs} text={block.map(v => v[1]).join(" ")} voice={voice} /></div>
                <p lang="la" className={`lt latin text-[1.22rem] leading-[1.85] text-ink sm:text-[1.32rem]${curPart === "hy" ? " whitespace-pre-line" : ""}`}>
                  {block.map((v, vi) => (
                    <span key={v[0]}>
                      {rowTag(v) && <sup className="num mr-0.5 text-[0.6em] font-bold text-rubric">{rowTag(v)}</sup>}
                      <LatinWords text={curPart === "hy" ? v[1].replace(/ \/ /g, "\n") : v[1]} ids={v[3]} prefix={vi + ":"} selected={word} onPick={k => setWord(word === k ? null : k)} marks={pMarks} />
                      {curPart === "hy" ? "\n\n" : " "}
                    </span>
                  ))}
                </p>
                <WordPanel lex={readNT.lex} word={wordText} entry={wordEntry} onClose={() => setWord(null)} where={passageLabel(pos.b, pos.c, block, readNT.book)} onTable={openTable} />
                {ptags.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5" aria-label="Grammar in this passage">
                    {ptags.map(t => <span key={t} className="rounded bg-paper px-2 py-0.5 text-[12px] text-soft">{CONCEPTS[t]}</span>)}
                  </div>
                )}
                {prefs.structure && <StructureKey />}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[12px] text-soft">
                  <span>Tap any word for its dictionary form, meaning and parsing.</span>
                  {!hideRef && <ShareLink hash={`p-${pos.b}-${pos.c}-${block[0][0]}`} />}
                </div>
              </>
            )}
          </article>

          {block && (
            <>
              <SkeletonCheck lex={readNT.lex} verses={block} seed={pkey} hymn={curPart === "hy"} onAnswer={answerQuiz} />
              <RecordAloud id={"p:" + pkey} />
              <TranslateBox draft={draft} setDraft={setDraft} showDR={showDR} setShowDR={setShowDR} onCheck={autoCheck} />
              {showDR && (
                <section className="reveal flex flex-col gap-3 border-l-2 border-rubric pl-4" aria-label="Reference translation">
                  <span className="smallcaps text-[14px] text-rubric">{pinfo.ref}</span>
                  <p className="latin text-[1.05rem] italic leading-relaxed text-ink">
                    {block.map(v => <span key={v[0]}>{rowTag(v) && <sup className="num mr-0.5 text-[0.65em] not-italic text-rubric">{rowTag(v)}</sup>}{v[2]} </span>)}
                  </p>
                  {curPart === "hy" && <p className="text-[13px] text-soft">This is a rhymed verse translation, so it departs from the Latin. Use it for the sense, and Mark my mistakes for accuracy.</p>}
                  {yoursBox}
                  {curPart !== "hy" && <Coverage cov={cov} />}
                  {tutorBox}
                </section>
              )}
              {showDR && <ExaminerQuiz lex={readNT.lex} verses={block} seed={pkey} onAnswer={answerQuiz} />}
              <GradeBar current={session["pcards:" + pkey]} suggest={curPart === "hy" && !tRes ? null : suggest} card={card} nextLabel="Next passage →"
                onGrade={k => grade(k, "pcards", pkey, ptags, tOver, { part: curPart, d: (pdiff != null ? pdiff : 50) / 100, k: 0.12, ai: tRes ? SCORE[tRes.verdict] : null })} onNext={nextPassage} />
            </>
          )}
        </>
      )}

      <footer className="flex flex-col gap-2 border-t border-rule pt-3 text-[13px] text-soft">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span>{APP ? "App version. Progress saved on this device only; use a backup code to move it." : OFFLINE ? "Offline copy. Progress saved in this browser only; use a backup code to move it." : store === "cloud" ? "Progress saved to your Claude account." : "Progress saved in this browser only. Use a backup code to move it."}</span>
          <ClearButton onConfirm={() => {
            const fresh = { ...EMPTY, exam: prog.exam, updated: Date.now() };
            setProg(fresh); persist(fresh); setSession({}); setDrafts({}); undoRef.current = null;
          }} />
        </div>
        <span>
          Bible: Clementine Vulgate and Douay-Rheims (Challoner), via the bible_databases project.
          Summa: Latin from The Latin Library (via CLTK); English Dominican Fathers translation (Project Gutenberg).
          Breviary hymns and Matins lessons: Divinum Officium project (MIT licence).
          Word parsing: PROIEL, Index Thomisticus, LLCT, UDante and Perseus treebanks (CC BY-NC-SA / BY-SA). Meanings: William Whitaker’s Words.
          Automatic parsings can be wrong; check them against the grammar you know.
        </span>
      </footer>
    </div>
    </AidsContext.Provider>
  );
}

function ClearButton({ onConfirm }) {
  const [armed, setArmed] = useState(false);
  if (!armed) return <button type="button" className="underline decoration-rule underline-offset-2 hover:text-ink" onClick={() => setArmed(true)}>Reset progress</button>;
  return (
    <span className="flex items-center gap-2">
      Clear all your progress and drafts?
      <button type="button" className="font-semibold text-rubric underline" onClick={() => { onConfirm(); setArmed(false); }}>Yes, clear</button>
      <button type="button" className="underline" onClick={() => setArmed(false)}>Cancel</button>
    </span>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
