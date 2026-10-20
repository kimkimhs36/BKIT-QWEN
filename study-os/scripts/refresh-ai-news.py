#!/usr/bin/env python3
"""Build a small, source-linked BKIT AI news digest from official RSS/Atom.
No AI-written headlines, scraping login-only pages, or commercial feeds.
Called by a scheduled GitHub Action; generated JSON is consumed by static Pages.
"""
from __future__ import annotations
import datetime as dt
import email.utils
import json
import pathlib
import re
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

SOURCES = (
    ("OpenAI", "https://openai.com/news/rss.xml", "openai.com"),
    ("Google", "https://blog.google/rss/", "blog.google"),
    ("Hugging Face", "https://huggingface.co/blog/feed.xml", "huggingface.co"),
)
KEYWORDS = re.compile(r"\b(ai|gemini|veo|deepmind|machine learning|artificial intelligence|imagen|notebooklm|flow|nano banana|llm|language model)\b", re.I)
ROOT = pathlib.Path(__file__).resolve().parents[1]
TARGET = ROOT / "public" / "ai-news.json"


def text_at(item: ET.Element, tags: tuple[str, ...]) -> str:
    for tag in tags:
        target = item.find(tag)
        if target is not None and target.text:
            return " ".join(target.text.strip().split())
    return ""


def publish_date(value: str) -> str | None:
    if not value:
        return None
    try:
        date = email.utils.parsedate_to_datetime(value)
    except (TypeError, ValueError):
        try:
            date = dt.datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
    if date.tzinfo is None:
        date = date.replace(tzinfo=dt.timezone.utc)
    return date.astimezone(dt.timezone.utc).isoformat().replace("+00:00", "Z")


def valid_url(link: str, domain: str) -> bool:
    try:
        parsed = urllib.parse.urlparse(link)
        return parsed.scheme == "https" and (parsed.hostname == domain or (parsed.hostname or "").endswith("." + domain))
    except ValueError:
        return False


def parse_items(source_name: str, domain: str, raw: bytes) -> list[dict]:
    root = ET.fromstring(raw)
    entries = list(root.findall(".//item"))
    if not entries:
        entries = list(root.findall(".//{http://www.w3.org/2005/Atom}entry"))
    output = []
    for item in entries:
        title = text_at(item, ("title", "{http://www.w3.org/2005/Atom}title"))
        link = text_at(item, ("link", "guid", "{http://www.w3.org/2005/Atom}id"))
        if not link:
            for node in item.findall("{http://www.w3.org/2005/Atom}link"):
                if node.attrib.get("rel", "alternate") == "alternate":
                    link = node.attrib.get("href", "")
                    break
        date = publish_date(text_at(item, ("pubDate", "{http://purl.org/dc/elements/1.1/}date", "{http://www.w3.org/2005/Atom}published", "{http://www.w3.org/2005/Atom}updated")))
        if not title or not date or not valid_url(link, domain):
            continue
        if source_name == "Google" and not KEYWORDS.search(title):
            continue
        if len(title) > 200:
            title = title[:197] + "..."
        output.append({"source": source_name, "title": title, "url": link, "publishedAt": date})
    return output


def run() -> int:
    news: list[dict] = []
    succeeded = []
    for name, url, domain in SOURCES:
        try:
            request = urllib.request.Request(url, headers={
                "User-Agent": "BKIT-AIZone-FeedReader/1.0 (+https://teambkit.com; public official RSS only)",
                "Accept": "application/rss+xml, application/atom+xml, text/xml, application/xml;q=0.9",
            })
            with urllib.request.urlopen(request, timeout=25) as response:
                body = response.read(3_000_000)
            items = parse_items(name, domain, body)
            succeeded.append(name)
            news.extend(items)
            print(name, len(items), "valid articles")
        except Exception as error:
            print(f"{name}: failed ({type(error).__name__}: {error})")
    if not succeeded:
        print("No official feed succeeded: retaining existing public JSON.")
        return 1
    cutoff = dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=90)
    result = {}
    for item in news:
        if dt.datetime.fromisoformat(item["publishedAt"].replace("Z", "+00:00")) < cutoff:
            continue
        result[item["url"]] = item
    sorted_news = sorted(result.values(), key=lambda x: x["publishedAt"], reverse=True)[:40]
    data = {
        "schemaVersion": 1,
        "checkedAt": dt.datetime.now(dt.timezone.utc).isoformat().replace("+00:00", "Z"),
        "frequency": "GitHub Actions checks hourly; actual execution may be delayed",
        "sources": succeeded,
        "articles": sorted_news,
    }
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    TARGET.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Saved", len(sorted_news), "articles to", TARGET)
    return 0


if __name__ == "__main__":
    raise SystemExit(run())
