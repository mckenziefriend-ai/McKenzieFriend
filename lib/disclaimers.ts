// Shared disclaimer + provenance strings so wording stays consistent across
// the chat UI, statement editor, exported documents and downloads.

export const PRODUCT_DISCLAIMER =
  "McKenzie Friend AI helps you organise and draft your case. It is not a solicitor and does not give legal advice. Check everything before you rely on it or file it at court.";

// Appended to any exported or downloaded document (witness statement,
// chat draft, bundle) so both the litigant and the court retain the signal
// that the text was machine-assisted and needs checking.
export function provenanceFooter(date: Date = new Date()) {
  const stamp = date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  return `Prepared with AI assistance via McKenzieFriend.ai on ${stamp}. This document is not legal advice. You are responsible for checking its accuracy before relying on it or filing it at court.`;
}

// Plain-text form for .txt downloads and clipboard copies.
export function withProvenanceText(body: string, date: Date = new Date()) {
  return `${body.trimEnd()}\n\n---\n${provenanceFooter(date)}\n`;
}
