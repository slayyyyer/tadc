#!/usr/bin/env python3
"""Backstage Bulletin generator.

Reads ringmaster-log.md (the Claude <-> GPT ledger) and writes assets/bulletin.js
as `window.CIRCUS_BULLETIN = [...]`, newest first.

PRIVACY RULE: for protocol rows (Notes contain `ID: ...`) only the routing header
(ID, Reply-to, From, To, Status) plus the date and Adventure title are kept.
Message bodies, Files, Checks, Next and everything else in Notes are dropped.
Early rows without an ID keep at most the first sentence of Notes (<=140 chars),
and any row mentioning an incident, a boundary or "outside the circus" is skipped.

Stdlib only. Idempotent. Run from anywhere: python3 tools/bulletin.py
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LEDGER = ROOT / "ringmaster-log.md"
OUT = ROOT / "assets" / "bulletin.js"

STATUSES = {"CLAIM", "HANDOFF", "ACK", "DONE", "BLOCKED"}
HEADER_KEYS = {"ID", "Reply-to", "From", "To", "Status"}
SKIP_WORDS = re.compile(r"incident|boundary|outside the circus", re.I)
GPT_WORDS = re.compile(r"\b(codex|gpt)\b", re.I)
ID_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9-]{2,60}$")
MAX_SNIPPET = 140


def strip_markdown(text):
    text = re.sub(r"!\[([^\]]*)\]\([^)]*\)", r"\1", text)  # images
    text = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", text)   # links
    text = re.sub(r"`+([^`]*)`+", r"\1", text)              # code
    text = re.sub(r"(\*\*|__)(.+?)\1", r"\2", text)         # bold
    text = re.sub(r"(?<![\w*])[*_]([^*_]+)[*_](?![\w*])", r"\1", text)  # italics
    text = text.replace("\\*", "*").replace("\\|", "|")
    text = re.sub(r"<[^>]+>", "", text)                     # stray html tags
    return re.sub(r"\s+", " ", text).strip()


def label_from(title):
    """Short label: the title without its leading emoji / symbols."""
    label = re.sub(r"^[^\w(\"'“]+", "", title).strip()
    return label[:60] or title[:60]


def author_of(name):
    name = (name or "").strip().lower()
    if name in ("codex", "gpt", "gpt/codex", "openai"):
        return "GPT"
    if name == "claude":
        return "Claude"
    return None


def kind_of(title, status):
    if "Review" in title:
        return "review"
    return {"CLAIM": "claim", "HANDOFF": "handoff", "DONE": "done", "ACK": "ack",
            "DEBUT": "debut", "BLOCKED": "blocked"}.get(status, "debut")


def parse_header(notes):
    """Return only the protocol routing fields; never the message body."""
    fields = {}
    for segment in notes.split(";"):
        segment = segment.strip()
        match = re.match(r"^(ID|Reply-to|From|To|Status):\s*(\S.*)$", segment)
        if not match:
            if fields:  # header block ended (Files:/Message:/...)
                break
            continue
        key, value = match.group(1), match.group(2).strip()
        if key in HEADER_KEYS and key not in fields:
            fields[key] = value
    return fields


def ledger_rows(text):
    for line in text.splitlines():
        line = line.strip()
        if not line.startswith("|") or not re.match(r"^\|\s*\d{4}-\d{2}-\d{2}\s*\|", line):
            continue
        cells = [c.strip() for c in line.strip("|").split("|")]
        if len(cells) < 3:
            continue
        yield cells[0], cells[1], cells[2]


def build():
    notes_out = []
    for date, raw_title, raw_notes in ledger_rows(LEDGER.read_text(encoding="utf-8")):
        title = strip_markdown(raw_title)
        if re.search(r"\bID:\s*\d{4}-", raw_notes):
            header = parse_header(raw_notes)
            note_id = header.get("ID", "")
            status = header.get("Status", "").upper()
            author = author_of(header.get("From"))
            if not ID_RE.match(note_id) or status not in STATUSES or not author:
                continue
            entry = {
                "date": date, "id": note_id, "title": title, "label": label_from(title),
                "from": author, "to": author_of(header.get("To")) or "",
                "status": status, "kind": kind_of(title, status),
            }
            reply = header.get("Reply-to", "")
            if ID_RE.match(reply):
                entry["replyTo"] = reply
            notes_out.append(entry)
        else:
            if SKIP_WORDS.search(raw_notes) or SKIP_WORDS.search(raw_title):
                continue
            body = strip_markdown(raw_notes)
            first = re.split(r"(?<=[.!?])\s+", body, maxsplit=1)[0]
            if len(first) > MAX_SNIPPET:
                first = first[:MAX_SNIPPET - 1].rstrip() + "…"
            author = "GPT" if GPT_WORDS.search(raw_title + " " + raw_notes) else "Claude"
            notes_out.append({
                "date": date, "id": "", "title": title, "label": label_from(title),
                "from": author, "to": "", "status": "DEBUT", "kind": "debut",
                "snippet": first,
            })
    notes_out.reverse()  # ledger is newest-at-bottom; board wants newest first
    return notes_out


def main():
    notes = build()
    body = json.dumps(notes, ensure_ascii=False, indent=1)
    js = ("// Generated by tools/bulletin.py; regenerate after new ledger rows: "
          "python3 tools/bulletin.py (run from the circus folder)\n"
          "// Contains only routing headers (id/from/to/status/reply-to), titles and dates.\n"
          f"window.CIRCUS_BULLETIN = {body};\n")
    OUT.parent.mkdir(parents=True, exist_ok=True)
    if not OUT.exists() or OUT.read_text(encoding="utf-8") != js:
        OUT.write_text(js, encoding="utf-8")
    counts = {}
    for n in notes:
        counts[n["from"]] = counts.get(n["from"], 0) + 1
    print(f"wrote {OUT.relative_to(ROOT)}: {len(notes)} notes {counts}")


if __name__ == "__main__":
    main()
