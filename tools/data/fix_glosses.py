"""Correct lemma glosses that the stem-guessing in build.py gets wrong. Run after build.py / apply_fixes.py:
    python3 -I tools/data/fix_glosses.py data
Roman numerals (article and chapter numbers: "art. ix") were matched to imus by their stem; they get their value instead."""
import json, re, sys
D = sys.argv[1]
lex = json.load(open(f"{D}/lexicon.json"))
ROMAN = re.compile(r"^(?=[ivxlcdm]+$)m{0,4}(cm|cd|d?c{0,3})(xc|xl|l?x{0,3})(ix|iv|v?i{0,3})$")
REAL = {"vix", "lix", "dic", "mi", "di", "vi", "mixi"}
VAL = {"i": 1, "v": 5, "x": 10, "l": 50, "c": 100, "d": 500, "m": 1000}
def value(s):
    t = 0
    for a, b in zip(s, s[1:] + " "):
        t += -VAL[a] if b != " " and VAL[b] > VAL[a] else VAL[a]
    return t
n = 0
for l in lex["lemmas"]:
    k = l[0].lower()
    if k not in REAL and ROMAN.match(k):
        l[1] = f"the Roman numeral {value(k)} (a number, not a word to learn)"; n += 1
# Glosses the build took from the wrong homograph (reported by students).
GLOSS = {
    "malum": "evil, misfortune, harm; (with long a, malum) apple",
    "mala": "jaw, cheek (in a text, mala is usually 'evils': plural of malum, or of malus 'bad')",
}
g = 0
for l in lex["lemmas"]:
    if l[0] in GLOSS and l[1] != GLOSS[l[0]]:
        l[1] = GLOSS[l[0]]; g += 1
print("glosses corrected:", g)
json.dump(lex, open(f"{D}/lexicon.json", "w"), ensure_ascii=False, separators=(",", ":"))
print("Roman numerals glossed:", n)
