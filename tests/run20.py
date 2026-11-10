"""AI marking with a Gemini key: setup, marking in Read and in an exam sitting, falling back to Flash-Lite, speech input.
Google is mocked: the page's calls to generativelanguage.googleapis.com are answered here."""
import subprocess, time, sys, os, json
from playwright.sync_api import sync_playwright
here = os.path.dirname(os.path.abspath(__file__))
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8783", "--bind", "127.0.0.1", "--directory", here], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1); errs = []; calls = []
FB = {"v": "partly", "s": "Sense right; one tense slip.", "ok": "Good word order.", "i": [{"sev": "error", "t": "tense", "la": "erat", "vs": "1", "you": "is", "fix": "was", "why": "erat is imperfect of sum.", "c": "null"}]}
state = {"flash429": False, "queryOnly": False}
def gemini(route):
    req = route.request; url = req.url
    if req.method == "OPTIONS":
        return route.fulfill(status=204, headers={"access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "GET,POST"})
    h = {"access-control-allow-origin": "*", "content-type": "application/json"}
    key = req.headers.get("x-goog-api-key", "")
    if ":generateContent" in url and state["queryOnly"]:
        if key: return route.fulfill(status=401, headers=h, body=json.dumps({"error": {"code": 401, "message": "Request had invalid authentication credentials.", "status": "UNAUTHENTICATED", "details": [{"reason": "ACCESS_TOKEN_TYPE_UNSUPPORTED"}]}}))
        key = url.split("key=")[1] if "key=" in url else ""
        key = key.replace("%2E", ".").replace("%2e", ".")
    if not key.startswith("AQ.GOOD"):
        return route.fulfill(status=400, headers=h, body=json.dumps({"error": {"code": 400, "message": "API key not valid. Please pass a valid API key.", "status": "INVALID_ARGUMENT"}}))
    if "/models?" in url:
        return route.fulfill(status=200, headers=h, body=json.dumps({"models": [
            {"name": "models/gemini-3.8-flash", "supportedGenerationMethods": ["generateContent"]},
            {"name": "models/gemini-flash-latest", "supportedGenerationMethods": ["generateContent"]},
            {"name": "models/gemini-flash-lite-latest", "supportedGenerationMethods": ["generateContent"]},
            {"name": "models/gemini-3.8-flash-image", "supportedGenerationMethods": ["generateContent"]}]}))
    model = url.split("/models/")[1].split(":")[0]
    body = json.loads(req.post_data or "{}")
    prompt = body["contents"][0]["parts"][0]["text"]
    calls.append((model, prompt[:60].replace("\n", " ")))
    if state["flash429"] and model == "gemini-flash-latest":
        return route.fulfill(status=429, headers=h, body=json.dumps({"error": {"code": 429, "message": "Quota exceeded", "status": "RESOURCE_EXHAUSTED",
            "details": [{"@type": "type.googleapis.com/google.rpc.QuotaFailure", "violations": [{"quotaId": "GenerateRequestsPerDayPerProjectPerModel-FreeTier"}]}]}}))
    return route.fulfill(status=200, headers=h, body=json.dumps({"candidates": [{"content": {"parts": [{"text": "```json\n" + json.dumps(FB) + "\n```"}]}}]}))
try:
    with sync_playwright() as p:
        b = p.chromium.launch(); ctx = b.new_context(viewport={"width": 400, "height": 900}); pg = ctx.new_page()
        ctx.route("https://generativelanguage.googleapis.com/**", gemini)
        ctx.add_init_script("Object.defineProperty(window, 'claude', { value: undefined, writable: false, configurable: false })")  # as in the phone app: no Claude
        pg.on("pageerror", lambda e: errs.append("PAGEERROR " + str(e)))
        pg.on("console", lambda m: m.type == "error" and "ERR_" not in m.text and "status of 4" not in m.text and errs.append("CONSOLE " + m.text))
        pg.goto("http://127.0.0.1:8783/t.html"); pg.wait_for_selector("text=Today’s session", timeout=20000)
        pg.click("[aria-label='Welcome'] button:has-text('Skip for now')")
        # Read: without a key, the tutor offers setup
        pg.click("nav[aria-label='Practice mode'] button:has-text('Passages')"); pg.wait_for_selector("#translation", timeout=15000)
        pg.fill("#translation", "In the beginning is the Word and the Word was with God")
        pg.click("button:has-text('Check Translation')"); pg.wait_for_timeout(500)
        print("1 no key:", pg.locator("button:has-text('Turn on AI marking')").count(), "setup button")
        pg.click("button:has-text('Turn on AI marking')"); pg.wait_for_selector("#ai-key", timeout=5000)
        pg.fill("#ai-key", "AIzaBADBADBADBADBADBADBADBADBADBAD12345"); pg.click("button:has-text('Save key')"); pg.wait_for_timeout(800)
        print("  bad key:", pg.locator("text=isn’t valid").count() > 0)
        pg.fill("#ai-key", "AQ.GOODGOODGOODGOOD-GOODGOODGOODGOOD_123"); pg.click("button:has-text('Save key')"); pg.wait_for_selector("text=Gemini key added", timeout=5000)
        print("  saved:", pg.locator("text=Gemini key added").inner_text(), "| models:", json.loads(pg.evaluate("localStorage.getItem('lectio-vulgata-ai')"))["models"])
        # Read: Check Translation marks automatically
        pg.click("button:has-text('Hide Translation')"); pg.click("button:has-text('Check Translation')"); pg.wait_for_selector("text=Marked by Gemini", timeout=10000)
        print("2 read auto-marked:", pg.locator("text=Mostly right").count() > 0, "| issue:", pg.locator("ol li:has(.smallcaps)").first.inner_text().replace("\n", " ")[:80], "| calls:", calls[-1][0])
        # Exam sitting: marks every part on Finish; Flash daily limit → Flash-Lite
        state["flash429"] = True
        pg.click("nav[aria-label='Practice mode'] button:has-text('Exam sitting')"); pg.wait_for_selector("text=Start sitting", timeout=10000)
        pg.select_option("#exam-scope", "nt"); pg.uncheck("#exam-oral"); pg.click("button:has-text('Start sitting')"); pg.wait_for_selector("#exam-translation-0", timeout=15000)
        pg.fill("#exam-translation-0", "And he said to them, this is my translation of the passage here")
        n0 = len(calls); pg.click("button:has-text('Finish and check')"); pg.wait_for_selector("text=Marked by Gemini", timeout=15000)
        print("3 exam auto-marked; models tried:", [c[0] for c in calls[n0:]], "| full today:", json.loads(pg.evaluate("localStorage.getItem('lectio-vulgata-ai')")).get("full") is not None)
        print("  suggested grade:", pg.locator("button[class*='ring']").all_inner_texts() or "(see hint)")
        pg.click("button:has-text('~ Partly')"); pg.wait_for_timeout(300)
        ab = json.loads(pg.evaluate("localStorage.getItem('lectio-vulgata-v2')"))["ability"]
        print("  ability nt:", ab.get("nt"))
        # Oral sitting: dictation button (Chromium has webkitSpeechRecognition)
        pg.click("button:has-text('New sitting →')"); pg.check("#exam-oral"); pg.click("button:has-text('Start sitting')"); pg.wait_for_selector("#exam-translation-0", timeout=15000)
        print("4 oral: speak button:", pg.locator("button:has-text('Speak your translation')").count(), "| record button:", pg.locator("button:has-text('Record')").count())
        pg.click("button:has-text('Abandon')")
        # Placement with AI: translate, marked
        pg.click("nav[aria-label='Practice mode'] button:has-text('Passages')"); pg.wait_for_timeout(800)
        if pg.locator("button:has-text('Check my level')").count():
            pg.click("button:has-text('Check my level')")
        else:
            pg.click("text=Placement check, all five parts")
        pg.wait_for_selector("[aria-label='Placement check']", timeout=10000)
        print("6 placement intro:", pg.locator("[aria-label='Placement check'] p").first.inner_text()[:120])
        pg.click("[aria-label='Placement check'] button:has-text('Start')"); pg.wait_for_selector("#pl-tr", timeout=20000)
        state["flash429"] = False
        pg.fill("#pl-tr", "This is my translation of the sentence"); n0 = len(calls)
        pg.click("button:has-text('Mark it')"); pg.wait_for_selector("text=Reference:", timeout=10000)
        print("  marked:", pg.locator("[aria-label='Placement question'] .smallcaps.font-semibold").last.inner_text(), "| prompt sent:", calls[n0:][0][1][:40] if calls[n0:] else None)
        print("  then grammar question:", pg.locator("[aria-label='Placement question'] p.font-medium").count())
        pg.click("text=Stop the check"); pg.wait_for_timeout(500)
        if pg.locator("button:has-text('Remove key')").count() == 0: pg.click("button:has-text('Skill map & backup')")
        # A key Google accepts only as ?key=: the app switches over by itself
        state["queryOnly"] = True
        pg.click("nav[aria-label='Practice mode'] button:has-text('Passages')"); pg.wait_for_selector("#translation", timeout=15000)
        pg.fill("#translation", "Another try at this passage in plain English words"); n0 = len(calls)
        pg.click("button:has-text('Check Translation')"); pg.wait_for_selector("text=Marked by Gemini", timeout=15000)
        print("7 query-only key: marked; auth now:", json.loads(pg.evaluate("localStorage.getItem('lectio-vulgata-ai')")).get("auth"))
        state["queryOnly"] = False
        if pg.locator("button:has-text('Remove key')").count() == 0: pg.click("button:has-text('Skill map & backup')")
        # Remove key → setup offered again
        pg.click("button:has-text('Remove key')"); pg.wait_for_timeout(300)
        print("5 removed:", pg.locator("#ai-key").count() == 1)
        b.close()
finally:
    srv.terminate()
print("ERRORS:", errs)
