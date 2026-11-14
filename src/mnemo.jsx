/* ---------- Memory aids on word cards (Settings → Flashcards & study): a picture and the student's own memory hook ----------
   Pictures: a built-in emoji for common concrete words (drawn by the device's own emoji font, so nothing to license; shown only
   when the card's meaning contains the keyword, so a homonym like liber "children" gets none), or the student's own emoji, or
   their own photo or drawing (kept on this device in IndexedDB, shrunk to 320 px; not in the backup).
   Hooks: a keyword image, a derivative, a sentence: whatever the student writes (prog.mnemo[lemma] = { t, e }, in the backup). */
const PICS_RAW = `
aqua 💧 water
ignis 🔥 fire
sol ☀️ sun
luna 🌙 moon
stella ⭐ star
caelum ☁️ heaven|sky
terra 🌍 earth|land
mare 🌊 sea
mons ⛰️ mountain
flumen 🏞️ river
arbor 🌳 tree
lignum 🪵 wood|tree
flos 🌸 flower
herba 🌿 grass|herb
panis 🍞 bread
vinum 🍷 wine
oleum 🫒 oil
mel 🍯 honey
sal 🧂 salt
piscis 🐟 fish
ovis 🐑 sheep
agnus 🐑 lamb
leo 🦁 lion
lupus 🐺 wolf
columba 🕊️ dove
avis 🐦 bird
serpens 🐍 serpent|snake
equus 🐎 horse
canis 🐕 dog
bos 🐂 ox
asinus 🫏 ass|donkey
uva 🍇 grape
ficus 🌳 fig
granum 🌾 grain
semen 🌱 seed
messis 🌾 harvest
domus 🏠 house|home
porta 🚪 gate|door
ostium 🚪 door
templum 🏛️ temple
civitas 🏙️ city
urbs 🏙️ city
navis ⛵ ship
via 🛣️ way|road
gladius 🗡️ sword
crux ✝️ cross
corona 👑 crown
rex 🤴 king
regina 👸 queen
mater 👩 mother
pater 👨 father
puer 👦 boy|child
puella 👧 girl
infans 👶 infant|child
oculus 👁️ eye
manus ✋ hand
pes 🦶 foot
cor ❤️ heart
caput 🗣️ head
os 👄 mouth
auris 👂 ear
lingua 👅 tongue
sanguis 🩸 blood
lapis 🪨 stone
petra 🪨 rock
aurum 🪙 gold
argentum 🪙 silver
lux 💡 light
nox 🌃 night
dies 🌞 day
ventus 💨 wind
pluvia 🌧️ rain
nubes ☁️ cloud
nix ❄️ snow
calix 🍷 cup|chalice
lucerna 🪔 lamp
rete 🕸️ net
vestis 👘 garment|clothing
angelus 👼 angel
ecclesia ⛪ church
altare 🕯️ altar
sepulcrum ⚱️ tomb|sepulchre
mors 💀 death
vita 🌱 life
somnus 😴 sleep
lacrima 💧 tear
risus 😄 laugh
cibus 🍲 food
fructus 🍎 fruit
lilium 🌷 lily
spina 🌵 thorn
hortus 🏡 garden
desertum 🏜️ desert
mundus 🌍 world
numerus 🔢 number
tempus ⏳ time
annus 📅 year
hora 🕐 hour
nomen 🏷️ name
verbum 💬 word
vox 🗣️ voice
carmen 🎵 song
canticum 🎵 song|canticle
epistula ✉️ letter|epistle
pecunia 💰 money
thesaurus 💎 treasure
pastor 🧑‍🌾 shepherd
miles 🪖 soldier
nauta ⚓ sailor
medicus 🩺 physician|doctor
servus ⛓️ servant|slave
discipulus 🧑‍🎓 disciple|pupil
magister 🧑‍🏫 master|teacher
frater 🧑‍🤝‍🧑 brother
soror 👭 sister
filius 👦 son
mulier 👩 woman
vir 👨 man
senex 👴 old man
ala 🪽 wing
penna 🪶 feather
ovum 🥚 egg
sagitta 🏹 arrow
arcus 🏹 bow
scutum 🛡️ shield
turris 🗼 tower
murus 🧱 wall
pons 🌉 bridge
tuba 🎺 trumpet
cithara 🎻 harp|lyre
oratio 🙏 prayer
ieiunium 🍽️ fast
baptismus 💧 baptism
fons ⛲ fountain|spring
puteus 🪣 well
`;
const PICS = {};
PICS_RAW.trim().split("\n").forEach(l => { const [w, e, k] = l.trim().split(/\s+/); if (w && k) PICS[w] = [e, new RegExp("\\b(" + k + ")", "i")]; });
function stockPic(lemma, gloss) { const p = PICS[lemma]; return p && p[1].test(gloss || "") ? p[0] : null; }
/* own photos: IndexedDB, one store, key = lemma, value = a JPEG data URL */
function picDb() {
  if (!picDb.p) picDb.p = new Promise((res, rej) => { const r = indexedDB.open("lectio-vulgata-pics", 1); r.onupgradeneeded = () => r.result.createObjectStore("p"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  return picDb.p;
}
function picGet(k) { return picDb().then(db => new Promise(res => { const q = db.transaction("p").objectStore("p").get(k); q.onsuccess = () => res(q.result || null); q.onerror = () => res(null); })).catch(() => null); }
function picPut(k, v) { return picDb().then(db => new Promise((res, rej) => { const t = db.transaction("p", "readwrite"); if (v == null) t.objectStore("p").delete(k); else t.objectStore("p").put(v, k); t.oncomplete = () => res(); t.onerror = () => rej(t.error); })); }
function shrinkImage(file, max = 320) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => { const s = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement("canvas"); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); res(c.toDataURL("image/jpeg", 0.8)); };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error("not an image")); };
    img.src = url;
  });
}
function useOwnPic(lemma) {
  const [pic, setPic] = useState(null);
  useEffect(() => { let alive = true; setPic(null); if (lemma) picGet(lemma).then(v => { if (alive) setPic(v); }); const h = e => { if (e.detail === lemma) picGet(lemma).then(v => { if (alive) setPic(v); }); }; window.addEventListener("lv-pic", h); return () => { alive = false; window.removeEventListener("lv-pic", h); }; }, [lemma]);
  return pic;
}
/* The picture for a card: own photo > own emoji > built-in emoji. */
function CardPicture({ lemma, gloss, mine }) {
  const own = useOwnPic(lemma);
  const e = (mine && mine.e) || stockPic(lemma, gloss);
  if (own) return <img src={own} alt="" className="reveal mt-3 max-h-40 max-w-[12rem] rounded-md border border-rule object-contain" />;
  if (!e) return null;
  return <span className="reveal mt-2 block text-[3rem] leading-none" role="img" aria-label={mine && mine.e ? "your picture" : "picture"}>{e}</span>;
}
/* Front of the card: the hint button (Settings: hooks "hint") and the picture when it is a clue (pictures "front", or English → Latin). */
function MemoryFront({ lemma, gloss, mine, rev }) {
  const S = useSettings();
  const [hint, setHint] = useState(false);
  useEffect(() => setHint(false), [lemma]);
  const pic = S.pics === "front" || (rev && S.pics !== "off");
  return <>
    {pic && <CardPicture lemma={lemma} gloss={gloss} mine={mine} />}
    {S.hooks === "hint" && mine && mine.t && (hint
      ? <p className="reveal mt-3 rounded-md bg-paper px-3 py-2 text-[15px] italic text-ink"><span className="not-italic text-soft">Your hook: </span>{mine.t}</p>
      : <button type="button" className="mt-3 block text-[14px] text-rubric underline underline-offset-2" onClick={() => setHint(true)}>Hint: my memory hook</button>)}
  </>;
}
/* Back of the card: the picture, the hook, and the editor. */
function MemoryBack({ lemma, gloss, mine, rev, card, onSave }) {
  const S = useSettings();
  const own = useOwnPic(lemma);
  const [edit, setEdit] = useState(false);
  const [t, setT] = useState(""), [e, setE] = useState("");
  const [msg, setMsg] = useState("");
  useEffect(() => { setEdit(false); setMsg(""); }, [lemma]);
  const open = () => { setT((mine && mine.t) || ""); setE((mine && mine.e) || ""); setEdit(true); };
  const slipping = card && (card.lapses || 0) >= 1 && !(mine && mine.t);
  const showPic = S.pics !== "off" && !(S.pics === "front" || rev);
  const stock = stockPic(lemma, gloss);
  function save() { onSave(lemma, { t: t.trim().slice(0, 300), e: [...e.trim()].slice(0, 4).join("") }); setEdit(false); }
  async function pickFile(f) {
    if (!f) return;
    try { await picPut(lemma, await shrinkImage(f)); window.dispatchEvent(new CustomEvent("lv-pic", { detail: lemma })); setMsg("Picture saved on this device."); }
    catch (err) { setMsg("That file couldn’t be read as a picture."); }
  }
  async function dropPic() { await picPut(lemma, null).catch(() => {}); window.dispatchEvent(new CustomEvent("lv-pic", { detail: lemma })); setMsg("Picture removed."); }
  return (
    <div className="mt-2">
      {showPic && <CardPicture lemma={lemma} gloss={gloss} mine={mine} />}
      {S.hooks !== "off" && mine && mine.t && !edit && <p className="mt-2 rounded-md bg-paper px-3 py-2 text-[15px] italic text-ink"><span className="not-italic text-soft">Your hook: </span>{mine.t}</p>}
      {!edit ? (
        <div className="mt-2 flex flex-wrap items-baseline gap-x-3 text-[13px]">
          {slipping && S.hooks !== "off" && <span className="text-mid">This one keeps slipping: a memory hook may help.</span>}
          <button type="button" className="text-rubric underline underline-offset-2" onClick={open}>{mine && (mine.t || mine.e) || own ? "✎ Edit my hook / picture" : "✎ Add a memory hook or picture"}</button>
          {msg && <span className="text-soft">{msg}</span>}
        </div>
      ) : (
        <section className="reveal mt-3 flex flex-col gap-2 rounded-md border border-rule bg-paper px-3 py-3" aria-label="My memory hook">
          <label htmlFor="mn-t" className="text-[13px] text-soft">Memory hook: a sound-alike picture, an English word from it, a short sentence. Your own works best.</label>
          <textarea id="mn-t" rows={2} value={t} onChange={x => setT(x.target.value)} maxLength={300} placeholder="equus → “equal”: two identical horses"
            className="rounded-md border border-rule bg-leaf px-2 py-1.5 text-[15px] text-ink" />
          <div className="flex flex-wrap items-center gap-2 text-[13px]">
            <label htmlFor="mn-e" className="text-soft">Picture: an emoji</label>
            <input id="mn-e" value={e} onChange={x => setE(x.target.value)} placeholder={stock || "🐎"} className="w-16 rounded-md border border-rule bg-leaf px-2 py-1 text-center text-[18px]" />
            <span className="text-soft">or</span>
            <label className="cursor-pointer rounded-md border border-rule bg-leaf px-2.5 py-1 text-ink hover:border-soft">Choose a photo or drawing<input type="file" accept="image/*" className="sr-only" onChange={x => pickFile(x.target.files && x.target.files[0])} /></label>
            {own && <button type="button" className="text-rubric underline underline-offset-2" onClick={dropPic}>Remove my photo</button>}
          </div>
          {msg && <p className="text-[12px] text-soft">{msg}</p>}
          <div className="flex flex-wrap gap-2">
            <Btn variant="primary" onClick={save}>Save</Btn>
            <Btn onClick={() => setEdit(false)}>Cancel</Btn>
            {mine && (mine.t || mine.e) && <Btn onClick={() => { onSave(lemma, null); setEdit(false); }}>Delete hook</Btn>}
          </div>
          <p className="text-[11px] text-soft">Hooks and emoji travel in your backup; photos stay on this device.</p>
        </section>
      )}
    </div>
  );
}
