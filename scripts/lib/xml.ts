/**
 * Thin typed layer over fast-xml-parser.
 *
 * We use a vetted parser rather than hand-rolled tag-stripping because we are
 * about to parse ~35 varied instruments whose CLML will contain constructs the
 * Children Act does not (CDATA, comments, namespace quirks, entity edge cases).
 * A hand-rolled tokenizer's failure mode is *silent mis-parsing*, which here
 * means showing a litigant the wrong statutory text.
 *
 * `preserveOrder: true` gives a document-ordered tree, which is what faithful
 * text extraction requires. Each node is `{ TagName: ClmlNode[], ":@"?: attrs }`
 * or a text node `{ "#text": string }`.
 */

import { XMLParser } from "fast-xml-parser";

export type Attrs = Record<string, string>;

export type ClmlNode = {
  ":@"?: Attrs;
  "#text"?: string;
} & {
  [tag: string]: ClmlNode[] | Attrs | string | undefined;
};

const parser = new XMLParser({
  preserveOrder: true,
  ignoreAttributes: false,
  attributeNamePrefix: "",
  // We control whitespace ourselves in the formatter.
  trimValues: false,
  processEntities: true,
  // Keep "1" a string, not the number 1 — provision numbers are identifiers.
  parseTagValue: false,
  parseAttributeValue: false,
});

export function parseXml(xml: string): ClmlNode[] {
  return parser.parse(xml) as ClmlNode[];
}

/** The element name of a node, or null for text nodes. */
export function tagOf(node: ClmlNode): string | null {
  for (const key of Object.keys(node)) {
    if (key !== ":@" && key !== "#text") return key;
  }
  return null;
}

export function childrenOf(node: ClmlNode): ClmlNode[] {
  const tag = tagOf(node);
  if (!tag) return [];
  const value = node[tag];
  return Array.isArray(value) ? value : [];
}

export function attrsOf(node: ClmlNode): Attrs {
  const attrs = node[":@"];
  return attrs && typeof attrs === "object" && !Array.isArray(attrs) ? (attrs as Attrs) : {};
}

export function isTextNode(node: ClmlNode): boolean {
  return typeof node["#text"] === "string";
}

export function textOf(node: ClmlNode): string {
  return typeof node["#text"] === "string" ? node["#text"] : "";
}

export function childByTag(node: ClmlNode, tag: string): ClmlNode | null {
  return childrenOf(node).find((child) => tagOf(child) === tag) ?? null;
}

/** Depth-first walk over every element node in document order. */
export function walk(nodes: ClmlNode[], visit: (node: ClmlNode, tag: string) => void): void {
  for (const node of nodes) {
    const tag = tagOf(node);
    if (tag) visit(node, tag);
    walk(childrenOf(node), visit);
  }
}

/** Flattened text of a subtree, optionally skipping some elements entirely. */
export function deepText(nodes: ClmlNode[], skipTags: ReadonlySet<string> = new Set()): string {
  let out = "";
  for (const node of nodes) {
    if (isTextNode(node)) {
      out += textOf(node);
      continue;
    }
    const tag = tagOf(node);
    if (tag && skipTags.has(tag)) continue;
    out += deepText(childrenOf(node), skipTags);
  }
  return out;
}

export function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}
