"""Correcting words misread in scanned Latin (build_extra.py, build_readers.py): a word unknown to the app and to The Latin
Library is replaced by its likeliest known reading, when one reading clearly outranks the others. Call load() first."""
import os, re, json, glob, unicodedata, collections
def norm(x):
    x = unicodedata.normalize("NFD", x.lower()).replace("æ", "ae").replace("œ", "oe")
    return "".join(c for c in x if not unicodedata.combining(c)).replace("j", "i").replace("v", "u")

# ---------- words known to the app: for correcting misread words in the scanned Catechism ----------
# A word is known if the app's morphology makes it or it occurs in The Latin Library (argument 8: the CLTK collection);
# a misread word is replaced only by its likeliest known reading, ranked by how often each occurs there.
FREQ = collections.Counter()
def load(tll, genforms):
    """tll: the CLTK Latin Library collection; genforms: tools/summa/generated_forms.mjs output"""
    global KNOWN
    for f in glob.glob(os.path.join(tll, "**", "*.txt"), recursive=True):
        FREQ.update(norm(x) for x in re.findall(r"[A-Za-zÀ-ÿ]+", open(f, encoding="utf-8", errors="replace").read()))
    KNOWN = {norm(k) for k in json.load(open(genforms))} | set(FREQ)
KNOWN = set()
# Misreadings typical of this scan (letter -> what it was read as), tried one or two at a time
CONF = [("e", "c"), ("i", "l"), ("u", "n"), ("n", "u"), ("m", "rn"), ("ri", "n"), ("i", "t"), ("t", "i"), ("e", "o"), ("a", "e"),
        ("s", "f"), ("f", "s"), ("h", "b"), ("o", "c"), ("u", "ii"), ("li", "h"), ("d", "cl"), ("in", "m"), ("ae", "e"), ("c", "e"), ("q", "g"), ("m", "ra"), ("m", "ni"), ("fl", "fi"), ("um", "nm")]
def variants(w):
    out = set()
    for a, b in CONF:   # b was printed where a was meant
        i = w.find(b)
        while i >= 0:
            out.add(w[:i] + a + w[i + len(b):]); i = w.find(b, i + 1)
    return out
fixed = {}
def fix_word(w):
    if len(w) < 3 or norm(w) in KNOWN or not w.isalpha(): return w
    if w in fixed: return fixed[w]
    cap = w[:1].isupper()
    lw = w.lower()
    one = [v for v in variants(lw) if norm(v) in KNOWN]
    if not one:
        two = {v2 for v in variants(lw) for v2 in variants(v) if norm(v2) in KNOWN}
        one = sorted(two)
    r = w
    if one:
        best = sorted(one, key=lambda v: -FREQ[norm(v)])
        f1, f2 = FREQ[norm(best[0])], (FREQ[norm(best[1])] if len(best) > 1 and norm(best[1]) != norm(best[0]) else 0)
        if (f1 >= 3 and f1 >= 4 * f2) or (len({norm(v) for v in one}) == 1 and not FREQ):
            r = best[0]; r = r.upper() if w.isupper() else r[:1].upper() + r[1:] if cap else r
    fixed[w] = r
    return r
def fix_text(t):
    t = t.replace("~", "").replace("  ", " ")
    return re.sub(r"[A-Za-zÀ-ÿ]+", lambda m: fix_word(m.group(0)), t).strip()

