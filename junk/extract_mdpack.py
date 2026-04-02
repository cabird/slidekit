# /// script
# requires-python = ">=3.11"
# ///
"""Extract an MDPACK bundle into a target directory."""

import hashlib
import base64
import re
import sys
from pathlib import Path

HEADER_RE = re.compile(
    r'^\{o_o\} MDPACK >>> ::(.+?)::(text|binary)::(.+?)::(\d+)::([0-9a-f]{8})::$',
    re.MULTILINE
)

def extract(pack_path: Path, out_dir: Path):
    text = pack_path.read_text(encoding='utf-8')
    headers = list(HEADER_RE.finditer(text))
    print(f"Found {len(headers)} files to extract")

    for idx, m in enumerate(headers):
        rel_path, ftype, enc, byte_len, expected_hash = m.groups()
        byte_len = int(byte_len)

        if Path(rel_path).is_absolute() or '..' in Path(rel_path).parts:
            print(f"ABORT: unsafe path {rel_path}")
            sys.exit(1)

        payload_start = m.end() + 1
        if idx + 1 < len(headers):
            payload_end = headers[idx + 1].start()
        else:
            payload_end = len(text)

        payload = text[payload_start:payload_end]

        if ftype == 'text':
            content = payload.strip() + '\n'
            disk_bytes = content.encode(enc)
        else:
            cleaned = re.sub(r'[\s]', '', payload)
            disk_bytes = base64.b64decode(cleaned)

        actual_hash = hashlib.sha256(disk_bytes).hexdigest()[:8]
        if len(disk_bytes) != byte_len or actual_hash != expected_hash:
            print(f"  WARN: {rel_path} validation mismatch (expected {byte_len}/{expected_hash}, got {len(disk_bytes)}/{actual_hash}) — extracting anyway")

        dest = out_dir / rel_path
        if dest.exists():
            if dest.read_bytes() == disk_bytes:
                print(f"  SKIP (identical): {rel_path}")
                continue
            else:
                print(f"ABORT: {rel_path} already exists and differs")
                sys.exit(1)

        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(disk_bytes)
        print(f"  OK: {rel_path} ({len(disk_bytes)} bytes)")

    print("Done!")

if __name__ == '__main__':
    pack = Path('PRESENTATION_MAKER.mdpack')
    out = Path('presentation_maker')
    extract(pack, out)
