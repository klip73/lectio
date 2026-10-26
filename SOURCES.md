# Sources

Every text and dictionary the page uses, where it comes from, and its licence. `tools/data/fetch_sources.sh` downloads all of them at the exact versions used.

| Folder | What | Where | Licence |
|---|---|---|---|
| `bd` | Clementine Vulgate and Douay-Rheims (Challoner) | github.com/scrollmapper/bible_databases @ e1b254c | public domain texts |
| `do` | Breviary hymns and Matins lessons (Latin and English) | github.com/DivinumOfficium/divinum-officium @ daa8217 | MIT |
| `tll` | Summa Theologiae, Latin (The Latin Library, via CLTK) | github.com/cltk/lat_text_latin_library @ 76229ac | public domain text |
| `pg17611.txt` | Summa Theologica, English, First Part (Dominican Fathers) | gutenberg.org/ebooks/17611 | public domain (Gutenberg licence) |
| `pt` | PROIEL treebank: parsed Vulgate New Testament | github.com/proiel/proiel-treebank @ 8e38896 | CC BY-NC-SA 4.0 |
| `ud-ITTB` | Index Thomisticus treebank (Aquinas) | github.com/UniversalDependencies/UD_Latin-ITTB @ b19bcbd | CC BY-NC-SA 3.0 |
| `ud-LLCT` | Late Latin Charter treebank | github.com/UniversalDependencies/UD_Latin-LLCT @ 173cd11 | CC BY-SA 4.0 |
| `ud-PROIEL` | PROIEL (Universal Dependencies edition) | github.com/UniversalDependencies/UD_Latin-PROIEL @ ae7c7c5 | CC BY-NC-SA 3.0 |
| `ud-Perseus` | Perseus Latin treebank | github.com/UniversalDependencies/UD_Latin-Perseus @ ab43a14 | CC BY-NC-SA 2.5 |
| `ud-UDante` | UDante treebank | github.com/UniversalDependencies/UD_Latin-UDante @ e024204 | CC BY-NC-SA 3.0 |
| `ww` | William Whitaker's Words dictionary (DICTLINE) | github.com/mk270/whitakers-words @ 1f2f0fb | free use, see its LICENSE |

Several treebanks are licensed non-commercial (NC): the page must stay free, with the credits shown in its footer.

`tools/data/cache/corpora.json` holds the Summa, Matins lessons and hymns already extracted by `corpora.py`, so the data can be rebuilt without the Gutenberg file.
