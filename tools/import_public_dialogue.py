#!/usr/bin/env python3
"""Fetch a pinned public OASST1 export; retain a filtered, attributed English dialogue sample.
No third-party packages, accounts, credentials, raw archive on disk, or character-corpus edits.
"""
import collections
import gzip
import hashlib
import io
import json
import re
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import HTTPRedirectHandler, ProxyHandler, Request, build_opener

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'datasets/openassistant-oasst1'
REVISION = 'fdf72ae0827c1cda404aff25b6603abec9e3399b'
BASE = f'https://huggingface.co/datasets/OpenAssistant/oasst1/resolve/{REVISION}/'
FILENAME = '2023-04-12_oasst_ready.messages.jsonl.gz'
EXPECTED_SHA256 = '286a6e9a5a413b3272ae9c0b5a20d327983dea1c24342ae28cb244a6da65185c'
BAD_LABELS = ('spam', 'pii', 'not_appropriate', 'hate_speech', 'sexual_content', 'violence')
# Use the existing circus term hashes without copying prohibited names into the corpus.
RUNTIME = (ROOT / 'assets/tinylm.js').read_text()
BLOCK = set(re.findall(r"'([a-z0-9]+)'", re.search(r'const BLOCK = new Set\(\[(.*?)\]\)', RUNTIME, re.S).group(1)))

def fnv(word):
    value = 0x811c9dc5
    for c in word:
        value = ((value ^ ord(c)) * 16777619) & 0xffffffff
    digits = '0123456789abcdefghijklmnopqrstuvwxyz'
    result = ''
    while value:
        result = digits[value % 36] + result
        value //= 36
    return result or '0'


def permitted_url(url):
    p = urlparse(url)
    host = p.hostname or ''
    return p.scheme == 'https' and (host == 'huggingface.co' or host.endswith('.huggingface.co') or host.endswith('.hf.co'))


class PublicRedirects(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if not permitted_url(newurl):
            raise ValueError('Public download redirected outside approved dataset hosts')
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def download(name, limit):
    url = BASE + name
    if not permitted_url(url):
        raise ValueError('Unexpected source host')
    opener = build_opener(ProxyHandler({}), PublicRedirects())
    with opener.open(Request(url, headers={'User-Agent': 'CircusDatasetImporter/1.0'}), timeout=45) as response:
        data = response.read(limit + 1)
    if len(data) > limit:
        raise ValueError('Dataset download exceeds size limit')
    return data


def clean(text):
    return re.sub(r'\s+', ' ', str(text)).strip()


def reason(message):
    if message.get('lang') != 'en':
        return 'language'
    if message.get('deleted') or message.get('review_result') is not True or message.get('synthetic') is not False:
        return 'review_or_synthetic'
    labels = message.get('labels') or {}
    if any(not isinstance(labels.get(k), dict) or labels[k].get('value', 1) != 0 for k in BAD_LABELS):
        return 'flagged_or_missing_labels'
    if labels.get('toxicity', {}).get('value', 1) > .05 or labels.get('quality', {}).get('value', 0) < .5:
        return 'quality'
    text = clean(message.get('text', ''))
    if not 12 <= len(text) <= 600:
        return 'length'
    if re.search(r'https?://|www\.|@|\d{4,}|\+?\d[\d ()-]{7,}\d|```|<[^>]+>', text):
        return 'contact_code_or_identifier'
    if re.search(r'\b(my name is|i live at|my address|my phone|my email|password|api key|secret key)\b', text, re.I):
        return 'personal_or_secret_pattern'
    words = re.findall(r'[a-z0-9]+', text.lower())
    if any(fnv(word) in BLOCK for word in words):
        return 'circus_excluded_terms'
    if re.search(r'\b(python|javascript|sql|typescript|html|code|function|algorithm|programming|server|linux)\b', text, re.I):
        return 'technical_content'
    return None


def split_for(tree_id):
    bucket = int(hashlib.sha256(tree_id.encode()).hexdigest()[:8], 16) % 100
    return 'train' if bucket < 80 else 'validation' if bucket < 90 else 'test'


def make_pairs(messages, limit=3000):
    pairs = []
    for message in messages.values():
        parent = messages.get(message.get('parent_id'))
        if message.get('role') != 'assistant' or parent is None or parent.get('role') != 'prompter':
            continue
        if message.get('rank') not in (0, None) or message['tree_id'] != parent['tree_id']:
            continue
        pairs.append({'source': 'OpenAssistant/oasst1', 'license': 'Apache-2.0',
            'conversation_id': message['tree_id'], 'prompt_id': parent['message_id'],
            'reply_id': message['message_id'], 'prompt': parent['text'], 'reply': message['text']})
    pairs.sort(key=lambda p: hashlib.sha256((p['conversation_id'] + p['reply_id']).encode()).hexdigest())
    result = {key: [] for key in ('train', 'validation', 'test')}
    seen = set()
    for pair in pairs:
        # Remove repeated prompts OR replies globally, including across different trees.
        keys = [clean(pair[k]).casefold() for k in ('prompt', 'reply')]
        if any(k in seen for k in keys):
            continue
        seen.update(keys)
        result[split_for(pair['conversation_id'])].append(pair)
        if sum(map(len, result.values())) >= limit:
            break
    return result


def main():
    print('Downloading pinned public export (about 34 MB); raw data stays in memory.', flush=True)
    license_text = download('LICENSE', 100_000)
    if b'Apache License' not in license_text or b'Version 2.0' not in license_text:
        raise ValueError('Unexpected license')
    compressed = download(FILENAME, 64 * 1024 * 1024)
    archive_hash = hashlib.sha256(compressed).hexdigest()
    if archive_hash != EXPECTED_SHA256:
        raise ValueError('Source checksum mismatch')
    messages, rejected = {}, collections.Counter()
    scanned = 0
    with gzip.GzipFile(fileobj=io.BytesIO(compressed)) as stream:
        for raw in stream:
            scanned += 1
            message = json.loads(raw)
            rejected_for = reason(message)
            if rejected_for:
                rejected[rejected_for] += 1
                continue
            # Discard volunteer IDs, dates, and all unrelated metadata before retaining any records.
            messages[message['message_id']] = {
                'message_id': message['message_id'], 'parent_id': message.get('parent_id'),
                'tree_id': message['message_tree_id'], 'role': message['role'],
                'rank': message.get('rank'), 'text': clean(message['text'])}
    splits = make_pairs(messages)
    if not sum(map(len, splits.values())):
        raise ValueError('No usable dialogue pairs after filtering')
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / 'LICENSE').write_bytes(license_text)
    hashes = {}
    for split, pairs in splits.items():
        data = ''.join(json.dumps(p, ensure_ascii=False) + '\n' for p in pairs)
        (OUT / f'{split}.jsonl').write_text(data)
        hashes[f'{split}.jsonl'] = hashlib.sha256(data.encode()).hexdigest()
    provenance = {'dataset': 'OpenAssistant/oasst1', 'license': 'Apache-2.0', 'revision': REVISION,
        'source_url': BASE + FILENAME, 'source_sha256': archive_hash, 'source_bytes': len(compressed),
        'scanned_messages': scanned, 'retained_messages_before_pairing': len(messages),
        'pairs': {k: len(v) for k, v in splits.items()}, 'rejected_messages': dict(rejected),
        'files_sha256': hashes, 'selection_limit': 3000, 'modified': True,
        'changes': ['English, positively reviewed, nonsynthetic messages only',
          'Zero reported spam/PII/inappropriate/hate/sexual/violence labels; toxicity <= .05; quality >= .5',
          '12-600 characters; omit contact/identifier patterns, code/technical content and circus-excluded terms',
          'Direct prompt/reply pairs; first-ranked or unranked reply; whitespace normalized',
          'Only message/conversation IDs retained; volunteer IDs and timestamps omitted',
          'Global exact text deduplication; 80/10/10 hash-based conversation splits'],
        'limitations': ['Automated filtering is not a guarantee of safety, accuracy or absence of personal details.',
          'General assistant dialogue, not circus dialogue. Manual review remains necessary before training.',
          'No model trained or runtime vocabulary changed by this import.']}
    (OUT / 'provenance.json').write_text(json.dumps(provenance, indent=2) + '\n')
    print(json.dumps({'scanned': scanned, 'retained': len(messages), 'pairs': provenance['pairs'], 'rejected': rejected}), flush=True)


if __name__ == '__main__':
    main()
