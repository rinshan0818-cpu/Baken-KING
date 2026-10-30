"""Check embedded JavaScript syntax without executing the application."""
from html.parser import HTMLParser
from pathlib import Path
import subprocess
import tempfile

class Scripts(HTMLParser):
    def __init__(self):
        super().__init__()
        self.active = False
        self.chunks = []
        self.scripts = []

    def handle_starttag(self, tag, attrs):
        if tag == "script":
            self.active = not dict(attrs).get("src")
            self.chunks = []

    def handle_data(self, data):
        if self.active:
            self.chunks.append(data)

    def handle_endtag(self, tag):
        if tag == "script" and self.active:
            self.scripts.append("".join(self.chunks))
            self.active = False

parser = Scripts()
parser.feed(Path("index.html").read_text(encoding="utf-8"))
if not parser.scripts:
    raise SystemExit("No inline JavaScript found")
for index, source in enumerate(parser.scripts, 1):
    with tempfile.TemporaryDirectory() as directory:
        path = Path(directory) / "inline.js"
        path.write_text(source, encoding="utf-8")
        subprocess.run(["node", "--check", str(path)], check=True)
print(f"PASS: {len(parser.scripts)} inline JavaScript blocks parse successfully")
