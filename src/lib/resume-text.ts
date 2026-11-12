
export const MAX_FILE_BYTES = 4 * 1024 * 1024; // Vercel serverless request bodies are capped at about 4.5 MB
export const MAX_TEXT_CHARS = 12000;

export class ResumeReadError extends Error {}

export type FileKind = "pdf" | "docx" | "txt";

export function detectKind(name: string, type: string, head: Uint8Array): FileKind | null {
  const n = name.toLowerCase();
  const isZip = head[0] === 0x50 && head[1] === 0x4b; // "PK"
  const isPdf = head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46; // "%PDF"
  if (isPdf) return "pdf";
  if (isZip && (n.endsWith(".docx") || type.includes("wordprocessingml"))) return "docx";
  if (n.endsWith(".txt") || type === "text/plain") return "txt";
  return null;
}

export function cleanText(raw: string): string {
  return raw
    .replace(/\u0000/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Extracts plain text from an uploaded resume. The file is processed in memory and never written anywhere.
export async function fileToText(file: File): Promise<string> {
  if (file.size === 0) throw new ResumeReadError("The file is empty.");
  if (file.size > MAX_FILE_BYTES) throw new ResumeReadError("The file is larger than 4 MB. Upload a smaller file or paste the text.");
  const buf = new Uint8Array(await file.arrayBuffer());
  const kind = detectKind(file.name, file.type, buf.subarray(0, 8));
  if (!kind) throw new ResumeReadError("Upload a PDF, DOCX or TXT file.");

  let text = "";
  try {
    if (kind === "pdf") {
      const { extractText, getDocumentProxy } = await import("unpdf");
      const pdf = await getDocumentProxy(buf);
      const out = await extractText(pdf, { mergePages: true });
      text = Array.isArray(out.text) ? out.text.join("\n") : out.text;
    } else if (kind === "docx") {
      const mammoth = await import("mammoth");
      text = (await mammoth.extractRawText({ buffer: Buffer.from(buf) })).value;
    } else {
      text = new TextDecoder("utf-8").decode(buf);
    }
  } catch {
    throw new ResumeReadError("Could not read that file. It may be corrupted or password protected. Paste the text instead.");
  }
  text = cleanText(text);
  if (text.length < 40) {
    throw new ResumeReadError("No readable text found. Scanned or image-only files are not supported. Paste the text instead.");
  }
  return text.slice(0, MAX_TEXT_CHARS);
}
