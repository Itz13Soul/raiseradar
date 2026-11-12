import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { grounded, keepGrounded, cleanItems } from "../src/lib/resume-extract";
import { detectKind, cleanText } from "../src/lib/resume-text";

describe("resume extraction guards", () => {
  const src = "Backend Engineer, Pune. Python, Django, PostgreSQL, payments APIs.";
  it("keeps skills that are in the text and drops invented ones", () => {
    assert.deepEqual(keepGrounded(["Python", "payments", "Kubernetes", "PostgreSQL"], src), ["Python", "payments", "PostgreSQL"]);
  });
  it("matches multi-word skills by words", () => {
    assert.equal(grounded("payment API", src), true);
    assert.equal(grounded("machine learning", src), false);
  });
  it("dedupes and caps items", () => {
    assert.deepEqual(cleanItems(["A", " a ", "B", "C"], 2), ["A", "B"]);
  });
});

describe("resume file detection", () => {
  it("detects by content, not just name", () => {
    assert.equal(detectKind("x.pdf", "", new Uint8Array([0x25, 0x50, 0x44, 0x46])), "pdf");
    assert.equal(detectKind("x.docx", "", new Uint8Array([0x50, 0x4b, 3, 4])), "docx");
    assert.equal(detectKind("x.txt", "text/plain", new Uint8Array([104, 105])), "txt");
    assert.equal(detectKind("x.exe", "", new Uint8Array([0x4d, 0x5a])), null);
    assert.equal(detectKind("fake.pdf", "", new Uint8Array([0x4d, 0x5a])), null);
  });
  it("cleans whitespace", () => {
    assert.equal(cleanText("a  b\n\n\n\nc \n d"), "a b\n\nc\nd");
  });
});

describe("sample files", { skip: !existsSync("tests/fixtures/sample-resume.pdf") }, () => {
  it("extracts text from a real PDF and DOCX", async () => {
    const { fileToText } = await import("../src/lib/resume-text");
    const pdf = await fileToText(new File([readFileSync("tests/fixtures/sample-resume.pdf")], "r.pdf"));
    assert.match(pdf, /Backend Engineer/);
    const docx = await fileToText(new File([readFileSync("tests/fixtures/sample-resume.docx")], "r.docx"));
    assert.match(docx, /PostgreSQL/);
  });
});
