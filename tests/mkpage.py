"""Make tests/t.html: the built page with a stand-in for claude.ai (no account, a fake tutor) and a local React bundle."""
import re, os, subprocess
here = os.path.dirname(os.path.abspath(__file__))
root = os.path.dirname(here)
b = open(os.path.join(root, "dist", "lectio-vulgata.html")).read()
stub = re.search(r'<script>\nwindow.__prompts.*?</script>', open(os.path.join(here, "stub.html")).read(), re.S).group(0)
stub = stub.replace('localStorage.setItem("lectio-vulgata-ui", JSON.stringify({mode:"read", pos:{b:"mt",c:5,v:16}}));', '')
b = b.replace('<script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js"></script>\n<script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js"></script>', stub + '\n<script src="react-bundle.js"></script>')
b = re.sub(r'<link[^>]*fonts.googleapis[^>]*>', '', b)
open(os.path.join(here, 't.html'), 'w').write('<!doctype html><html><head><meta charset="utf-8"></head><body>' + b + '</body></html>')
if not os.path.exists(os.path.join(here, "react-bundle.js")):
    NM = os.environ.get("NODE_MODULES", "/opt/npm-tools/node_modules")
    subprocess.run(["node", "-e", f"require('{NM}/esbuild').buildSync({{entryPoints:['{here}/react-entry.js'],bundle:true,minify:true,outfile:'{here}/react-bundle.js',nodePaths:['{NM}'],define:{{'process.env.NODE_ENV':'\"production\"'}}}})"], check=True)
if not os.path.exists(os.path.join(here, "data")): os.symlink(os.path.join(root, "data"), os.path.join(here, "data"))
