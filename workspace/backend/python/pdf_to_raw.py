#!/usr/bin/env python3
"""
PdfRawExtractor - Extract raw text from PDF using pdfplumber.

Usage:
    python pdf_to_raw.py --pdf <pdf_path>

Output (JSON):
    {
        "ok": true,
        "engine": "pdfplumber",
        "engineVersion": "0.11.10",
        "pageCount": int,
        "textPageCount": int,
        "emptyPageCount": int,
        "characterCount": int,
        "rawSha256": str,
        "rawText": str
    }

Errors (JSON):
    {"ok": false, "error": str, "code": str}
"""

import argparse
import hashlib
import json
import sys
from pathlib import Path

import pdfplumber


def sha256_hex(data: str) -> str:
    return hashlib.sha256(data.encode("utf-8")).hexdigest()


def extract_raw_text(pdf_path: str) -> dict:
    raw_text_parts = []
    text_page_count = 0
    empty_page_count = 0

    with pdfplumber.open(pdf_path) as pdf:
        page_count = len(pdf.pages)

        for page_num, page in enumerate(pdf.pages, start=1):
            text = page.extract_text() or ""
            text = text.replace("\r\n", "\n").replace("\r", "\n")

            if text.strip():
                text_page_count += 1
            else:
                empty_page_count += 1

            raw_text_parts.append(f"--- PAGE {page_num} / {page_count} ---\n{text}")

    raw_text = "\n\n".join(raw_text_parts)
    character_count = len(raw_text)
    raw_sha256 = sha256_hex(raw_text)

    return {
        "ok": True,
        "engine": "pdfplumber",
        "engineVersion": "0.11.10",
        "pageCount": page_count,
        "textPageCount": text_page_count,
        "emptyPageCount": empty_page_count,
        "characterCount": character_count,
        "rawSha256": raw_sha256,
        "rawText": raw_text,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Extract raw text from a PDF using pdfplumber.")
    parser.add_argument("--pdf", required=True, help="Absolute path to the PDF file")
    args = parser.parse_args()

    pdf_path = Path(args.pdf)

    if not pdf_path.exists():
        print(json.dumps({"ok": False, "error": f"PDF file not found: {pdf_path}", "code": "FILE_NOT_FOUND"}, ensure_ascii=False))
        sys.exit(1)

    if not pdf_path.is_file():
        print(json.dumps({"ok": False, "error": f"Path is not a file: {pdf_path}", "code": "NOT_A_FILE"}, ensure_ascii=False))
        sys.exit(1)

    try:
        result = extract_raw_text(str(pdf_path))
        print(json.dumps(result, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({"ok": False, "error": str(e), "code": "EXTRACTION_ERROR"}, ensure_ascii=False))
        sys.exit(1)


if __name__ == "__main__":
    main()
