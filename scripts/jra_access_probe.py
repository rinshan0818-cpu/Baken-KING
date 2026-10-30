"""Probe one explicitly supplied JRA card URL for server-side reachability.

No crawling, URL guessing, login, retry loops, proxying, or publication.
Run only after verifying that automated access is permitted for this URL.
"""
import argparse
import json
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse

ALLOWED = {"jra.jp", "www.jra.go.jp", "sp.jra.jp", "app.jra.jp"}

def probe(url, timeout=12):
    parsed = urlparse(url)
    if parsed.scheme != "https" or parsed.hostname not in ALLOWED:
        raise ValueError("jra_https_url_required")
    request = Request(url, headers={"User-Agent": "Baken-KING-availability-check/1.0"})
    try:
        with urlopen(request, timeout=timeout) as response:
            final = urlparse(response.geturl())
            if final.scheme != "https" or final.hostname not in ALLOWED:
                raise ValueError("redirect_outside_jra")
            data = response.read(5_000_001)
            if len(data) > 5_000_000:
                raise ValueError("html_too_large")
            content_type = response.headers.get("Content-Type", "")
            return {"ok": True, "status": response.status,
                    "contentType": content_type, "bytes": len(data),
                    "hasHtml": "html" in content_type.lower()}
    except HTTPError as exc:
        return {"ok": False, "status": exc.code, "error": "http_error"}
    except URLError as exc:
        return {"ok": False, "error": type(exc.reason).__name__}

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--url", required=True)
    p.add_argument("--authorized", action="store_true",
                   help="Confirm automated access is permitted before requesting")
    args = p.parse_args()
    if not args.authorized:
        p.error("Automated access permission must be confirmed (--authorized)")
    print(json.dumps(probe(args.url), ensure_ascii=False))

if __name__ == "__main__":
    main()
