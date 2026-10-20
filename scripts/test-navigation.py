"""Test header navigation on every generated page with Chrome DevTools.

Run after ``python scripts/build.py``. Requires Chrome and ``websocket-client``.
The browser profile is left in the ignored ``dist/`` directory.
"""

from __future__ import annotations

import base64
import json
import os
import shutil
import subprocess
import time
from pathlib import Path
from urllib.request import urlopen

from websocket import create_connection


ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
TARGETS = {
    "Home": "index.html",
    "About": "about.html",
    "Publications": "publications.html",
    "Projects": "projects.html",
    "Blog": "blog.html",
    "Contact": "index.html#contact",
}
WIDTHS = (1440, 760, 390, 320)


class Browser:
    def __init__(self) -> None:
        chrome = os.environ.get("CHROME_PATH") or shutil.which("chrome")
        if not chrome:
            chrome = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
        if not Path(chrome).is_file():
            raise RuntimeError("Chrome not found; set CHROME_PATH.")

        profile = DIST / f"navigation-chrome-profile-{os.getpid()}"
        self.process = subprocess.Popen(
            [chrome, "--headless=new", "--disable-gpu", "--no-first-run",
             "--disable-extensions", "--disable-background-networking",
             "--remote-allow-origins=*", "--remote-debugging-port=0",
             f"--user-data-dir={profile}", "about:blank"],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
        )
        try:
            active_port = profile / "DevToolsActivePort"
            deadline = time.monotonic() + 12
            while not active_port.is_file():
                if self.process.poll() is not None or time.monotonic() > deadline:
                    raise RuntimeError("Chrome DevTools did not start.")
                time.sleep(0.1)
            port = active_port.read_text(encoding="utf-8").splitlines()[0]
            with urlopen(f"http://127.0.0.1:{port}/json/list", timeout=3) as response:
                tabs = json.load(response)
            page = next(tab for tab in tabs if tab["type"] == "page")
            self.socket = create_connection(page["webSocketDebuggerUrl"], timeout=5)
            self.number = 0
            self.command("Page.enable")
            self.command("Runtime.enable")
        except Exception:
            self.process.terminate()
            raise

    def command(self, method: str, params: dict | None = None) -> dict:
        self.number += 1
        number = self.number
        self.socket.send(json.dumps({"id": number, "method": method, "params": params or {}}))
        while True:
            message = json.loads(self.socket.recv())
            if message.get("id") != number:
                continue
            if "error" in message:
                raise RuntimeError(f"{method}: {message['error']}")
            return message.get("result", {})

    def evaluate(self, expression: str):
        result = self.command("Runtime.evaluate", {"expression": expression, "returnByValue": True})
        if "exceptionDetails" in result:
            raise RuntimeError(result["exceptionDetails"])
        return result.get("result", {}).get("value")

    def wait_url(self, expected: str) -> bool:
        deadline = time.monotonic() + 4
        while time.monotonic() < deadline:
            try:
                if self.evaluate("location.href") == expected:
                    return True
            except RuntimeError:
                pass
            time.sleep(0.05)
        return False

    def visit(self, url: str) -> None:
        self.command("Page.navigate", {"url": url})
        if not self.wait_url(url):
            raise RuntimeError(f"Did not navigate to {url}")
        deadline = time.monotonic() + 4
        while time.monotonic() < deadline:
            try:
                if self.evaluate("document.readyState") == "complete":
                    return
            except RuntimeError:
                pass
            time.sleep(0.05)
        raise RuntimeError(f"Page did not finish loading: {url}")

    def close(self) -> None:
        self.socket.close()
        self.process.terminate()
        try:
            self.process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            self.process.kill()


def main() -> None:
    pages = [DIST / name for name in ("index.html", "about.html", "publications.html", "projects.html", "blog.html")]
    pages.extend(sorted((DIST / "posts").glob("*.html")))
    if any(not page.is_file() for page in pages):
        raise SystemExit("Build the site before testing navigation.")

    failures: list[str] = []
    clicks = 0
    browser = Browser()
    screenshot_dir = os.environ.get("NAV_SCREENSHOT_DIR")
    if screenshot_dir:
        Path(screenshot_dir).mkdir(parents=True, exist_ok=True)
    try:
        for width in WIDTHS:
            browser.command("Emulation.setDeviceMetricsOverride", {
                "width": width, "height": 900, "deviceScaleFactor": 1, "mobile": False,
            })
            for page in pages:
                name = str(page.relative_to(DIST))
                browser.visit(page.as_uri())
                links = browser.evaluate("""[...document.querySelectorAll('header nav a')].map(a => {
                    const r = a.getBoundingClientRect();
                    return {name: a.textContent.trim().split(/\\s+/)[0], current: a.getAttribute('aria-current'),
                        shown: !!(r.width && r.height), left: r.left, right: r.right,
                        top: r.top, bottom: r.bottom};
                })""")
                actual = [link["name"] for link in links]
                expected = list(TARGETS) if page.name != "index.html" else list(TARGETS)[1:]
                if actual != expected:
                    failures.append(f"{width}px {name}: links {actual}; expected {expected}")

                expected_current = {
                    "about.html": "About", "publications.html": "Publications",
                    "projects.html": "Projects", "blog.html": "Blog",
                }.get(page.name)
                if page.parent.name == "posts":
                    expected_current = "Blog"
                current = [link["name"] for link in links if link["current"] == "page"]
                if current != ([expected_current] if expected_current else []):
                    failures.append(f"{width}px {name}: active link {current}; expected {expected_current}")

                for link in links:
                    if not link["shown"]:
                        failures.append(f"{width}px {name}: {link['name']} hidden")
                    elif link["left"] < -1 or link["right"] > width + 1:
                        failures.append(f"{width}px {name}: {link['name']} outside viewport")
                for index, first in enumerate(links):
                    for second in links[index + 1:]:
                        if (first["shown"] and second["shown"]
                                and first["left"] < second["right"] - 1
                                and second["left"] < first["right"] - 1
                                and first["top"] < second["bottom"] - 1
                                and second["top"] < first["bottom"] - 1):
                            failures.append(f"{width}px {name}: {first['name']} overlaps {second['name']}")

                if screenshot_dir and width in (390, 320):
                    shot = browser.command("Page.captureScreenshot", {
                        "format": "png", "clip": {"x": 0, "y": 0, "width": width,
                                                  "height": 180, "scale": 1},
                    })["data"]
                    filename = name.replace("\\", "-").replace("/", "-").removesuffix(".html")
                    (Path(screenshot_dir) / f"{filename}-{width}.png").write_bytes(base64.b64decode(shot))

                if width not in (1440, 390):
                    continue
                for label, target in TARGETS.items():
                    if label not in actual or not next(link for link in links if link["name"] == label)["shown"]:
                        continue
                    browser.visit(page.as_uri())
                    expression = ("[...document.querySelectorAll('header nav a')]"
                                  f".find(a => a.textContent.trim().split(/\\s+/)[0] === {json.dumps(label)}).click()")
                    try:
                        browser.evaluate(expression)
                    except RuntimeError:
                        # A page load can discard the execution context before Chrome responds.
                        pass
                    expected_url = (DIST / target.split("#")[0]).as_uri()
                    if "#" in target:
                        expected_url += "#" + target.split("#", 1)[1]
                    if not browser.wait_url(expected_url):
                        failures.append(f"{width}px {name}: {label} led to {browser.evaluate('location.href')}")
                        continue
                    clicks += 1
                    if "#" in target:
                        anchor = target.split("#", 1)[1]
                        if not browser.evaluate(f"!!document.getElementById({json.dumps(anchor)})"):
                            failures.append(f"{width}px {name}: {label} target missing")
    finally:
        browser.close()

    if failures:
        raise SystemExit("Navigation check failed:\n" + "\n".join(failures))
    print(f"Navigation OK: {len(pages)} pages, {len(WIDTHS)} widths, {clicks} clicks.")


if __name__ == "__main__":
    main()
