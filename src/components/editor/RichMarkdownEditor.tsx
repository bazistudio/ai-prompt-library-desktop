"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Bold,
  Highlighter,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  ListOrdered,
  CheckSquare,
  Table as TableIcon,
  Quote,
  Smile,
  Image as ImageIcon,
  Link as LinkIcon,
  Globe,
  Undo2,
  Redo2,
  ChevronDown,
  Check,
  Plus,
  Minus,
  Copy,
  ExternalLink,
  Pencil,
  Unlink,
} from "lucide-react";
import { EmojiPickerPopover } from "./EmojiPickerPopover";
import { detectLanguageAndDirection, TextDirection, DetectedLanguageInfo } from "./languageDetector";
import {
  SUPPORTED_LANGUAGES,
  getLanguageByCode,
  DEFAULT_LANGUAGE_CODE,
  LanguageOption,
} from "@/config/languages";

export type TableWidth = "100%" | "66%" | "50%" | "33%" | "auto";
export type ImageWidth = "100%" | "75%" | "50%" | "25%";
export type ImageAlign = "left" | "center" | "right";

interface RichMarkdownEditorProps {
  value: string;
  onChange: (val: string) => void;
  language?: string;
  onLanguageChange?: (lang: string, dir: TextDirection) => void;
  direction?: TextDirection;
  onDirectionChange?: (dir: TextDirection) => void;
  placeholder?: string;
  minHeight?: string;
  className?: string;
}

interface HistoryEntry {
  value: string;
}

interface ActiveLinkState {
  element: HTMLAnchorElement;
  url: string;
  text: string;
  x: number;
  y: number;
}

const MARK_CLASS = "px-1.5 py-0.5 rounded bg-amber-200 dark:bg-amber-800/60 text-amber-950 dark:text-amber-100 font-medium";
const BLOCKQUOTE_CLASS = "border-l-4 border-primary/60 pl-3.5 py-1.5 my-2.5 italic text-muted-foreground bg-muted/20 rounded-r-lg";
const CELL_BLOCKQUOTE_CLASS = "border-l-2 border-primary/60 pl-2 py-0.5 my-1 italic text-muted-foreground bg-muted/20 rounded-r";

// Safe external URL opener using Electron API if present, with browser link click fallback
function openExternalSafe(url: string) {
  if (!url) return;
  let normalized = url.trim();
  if (!/^https?:\/\//i.test(normalized) && !normalized.startsWith("/") && !normalized.startsWith("#")) {
    normalized = `https://${normalized}`;
  }

  try {
    const parsed = new URL(normalized);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return;
    }
  } catch {
    return;
  }

  if (typeof window !== "undefined") {
    if (window.electronAPI?.openExternal) {
      window.electronAPI.openExternal(normalized);
    } else if (window.electron?.openExternal) {
      window.electron.openExternal(normalized);
    } else {
      window.open(normalized, "_blank", "noopener,noreferrer");
    }
  }
}

// Render formatted visual link inner HTML with visible text AND url address badge (Fix 9)
function renderLinkInnerHtml(text: string, url: string): string {
  const isSame = text.trim() === url.trim();
  const linkText = text.trim() || url.trim();
  if (isSame) {
    return `<span class="editor-link-text underline underline-offset-2">${linkText}</span><svg class="h-2.5 w-2.5 opacity-70 shrink-0 inline-block ml-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>`;
  }
  return `<span class="editor-link-text underline underline-offset-2">${linkText}</span><span class="editor-link-url text-[10px] font-mono text-muted-foreground/90 max-w-[150px] truncate ml-0.5 font-normal">(${url})</span><svg class="h-2.5 w-2.5 opacity-70 shrink-0 inline-block ml-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>`;
}

function convertMarkdownInlinesToHtml(text: string): string {
  if (!text) return "";
  let result = text;

  // 1. Handle in-cell checklists (- [ ] task or - [x] task)
  result = result.replace(/(?:^|<br\s*\/?>)\s*-\s*\[([ xX])\]\s*(.*?)(?=<br\s*\/?>|$)/gi, (_, mark, taskText) => {
    const isChecked = mark.toLowerCase() === "x";
    const btnClass = isChecked
      ? "bg-primary border-primary text-primary-foreground"
      : "border-input bg-background hover:bg-muted text-transparent";
    const textClass = isChecked ? "line-through text-muted-foreground" : "text-foreground";
    return `<div data-type="checklist" data-checked="${isChecked}" class="checklist-item flex items-start gap-2 my-1 group"><button type="button" contenteditable="false" class="checklist-box mt-0.5 h-4 w-4 min-w-4 rounded flex items-center justify-center border select-none cursor-pointer transition-colors ${btnClass}"><svg class="h-2.5 w-2.5 stroke-[3]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></button><span class="checklist-text flex-1 outline-none leading-relaxed ${textClass}">${taskText || "<br>"}</span></div>`;
  });

  // 2. Handle in-cell quotes (> quote)
  result = result.replace(/(?:^|<br\s*\/?>)\s*>\s*(.*?)(?=<br\s*\/?>|$)/gi, (_, quoteText) => {
    return `<blockquote class="${CELL_BLOCKQUOTE_CLASS}">${quoteText || "<br>"}</blockquote>`;
  });

  // 3. Convert markdown links [title](url) to clickable <a> tags with visible url address (Fix 9)
  result = result.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_, title, url) =>
      `<a href="${url}" data-type="editor-link" target="_blank" rel="noopener noreferrer" class="editor-link inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary font-medium text-xs transition-colors cursor-pointer select-none mx-0.5" title="${url}">${renderLinkInnerHtml(
        title,
        url
      )}</a>`
  );

  // 4. Convert ==highlight== to <mark class="...">highlight</mark>
  result = result.replace(/==(.*?)==/g, `<mark class="${MARK_CLASS}">$1</mark>`);
  result = result.replace(/<mark>(.*?)<\/mark>/g, `<mark class="${MARK_CLASS}">$1</mark>`);

  // 5. Convert **bold** to <strong>bold</strong>
  result = result.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

  return result;
}

// Split table row while respecting escaped pipes \|
function splitTableRow(rowStr: string): string[] {
  const trimmed = rowStr.trim();
  if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) return [];
  const inner = trimmed.slice(1, -1);
  const cells: string[] = [];
  let current = "";
  let isEscaped = false;

  for (let i = 0; i < inner.length; i++) {
    const char = inner[i];
    if (char === "\\" && !isEscaped) {
      isEscaped = true;
      current += char;
    } else if (char === "|" && !isEscaped) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
      isEscaped = false;
    }
  }
  cells.push(current.trim());
  return cells;
}

// Check if a line is a Markdown table separator (| :--- | :---: | ---: |)
function isTableSeparator(line: string): boolean {
  if (!line) return false;
  const trimmed = line.trim();
  if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) return false;
  const cells = splitTableRow(trimmed);
  if (cells.length === 0) return false;
  return cells.every((c) => /^:?-{1,}:?$/.test(c.trim()));
}

// Table Width Style string generator (Fix 7G, 7H)
export function getTableWidthStyle(width: TableWidth): string {
  switch (width) {
    case "66%":
      return "width: 66.666%; max-width: 100%;";
    case "50%":
      return "width: 50%; max-width: 100%;";
    case "33%":
      return "width: 33.333%; max-width: 100%;";
    case "auto":
      return "width: max-content; max-width: 100%;";
    case "100%":
    default:
      return "width: 100%; max-width: 100%;";
  }
}

// Image Width & Alignment Style string generator (Fix 8 & Book Layout Support)
export function getImageBlockStyle(width: ImageWidth, align: ImageAlign = "center"): string {
  let widthCss = "";
  switch (width) {
    case "25%":
      widthCss = "width: 25%; max-width: 100%; min-width: 220px;";
      break;
    case "50%":
      widthCss = "width: 50%; max-width: 100%; min-width: 260px;";
      break;
    case "75%":
      widthCss = "width: 75%; max-width: 100%; min-width: 300px;";
      break;
    case "100%":
    default:
      widthCss = "width: 100%; max-width: 100%;";
      break;
  }

  let alignCss = "";
  if (width === "100%") {
    alignCss = "margin: 0.875rem auto; float: none; clear: both;";
  } else {
    switch (align) {
      case "left":
        alignCss = "float: left; margin: 0.5rem 1.25rem 0.75rem 0; clear: left;";
        break;
      case "right":
        alignCss = "float: right; margin: 0.5rem 0 0.75rem 1.25rem; clear: right;";
        break;
      case "center":
      default:
        alignCss = "margin: 0.875rem auto; float: none; clear: both;";
        break;
    }
  }

  return `${widthCss} ${alignCss}`;
}

// Helper: detect if cursor/node is inside a table cell (Fix 7H)
function getEnclosingCell(node: Node | null, editor: HTMLElement): HTMLElement | null {
  let curr = node;
  while (curr && curr !== editor) {
    if (curr.nodeType === Node.ELEMENT_NODE) {
      const el = curr as HTMLElement;
      if (el.tagName === "TD" || el.tagName === "TH" || el.classList.contains("table-cell")) {
        return el;
      }
    }
    curr = curr.parentNode;
  }
  return null;
}

// Helper: find nearest anchor element
function findEnclosingAnchor(node: Node | null, editor: HTMLElement): HTMLAnchorElement | null {
  let curr = node;
  while (curr && curr !== editor) {
    if (curr.nodeType === Node.ELEMENT_NODE && (curr as HTMLElement).tagName.toUpperCase() === "A") {
      return curr as HTMLAnchorElement;
    }
    curr = curr.parentNode;
  }
  return null;
}

// Render visual standard grid table block HTML (Fix 7D, 7F, 7G, 7H)
function renderInteractiveTableHtml(
  headerCells: string[],
  rows: string[][],
  width: TableWidth = "100%"
): string {
  const colCount = Math.max(1, headerCells.length);
  const rowCount = rows.length;
  const widthStyle = getTableWidthStyle(width);

  const headerHtml = headerCells
    .map(
      (h) =>
        `<th contenteditable="true" class="table-cell px-3.5 py-2 font-semibold border border-border outline-none focus:bg-primary/10 transition-colors min-w-[80px] break-words whitespace-normal leading-relaxed">${
          h ? convertMarkdownInlinesToHtml(h.replace(/\\\|/g, "|")) : "<br>"
        }</th>`
    )
    .join("");

  const bodyHtml = rows
    .map(
      (row) =>
        `<tr class="hover:bg-muted/15 transition-colors">${row
          .map(
            (cell) =>
              `<td contenteditable="true" class="table-cell px-3.5 py-2 text-foreground/90 border border-border outline-none focus:bg-primary/10 transition-colors min-w-[80px] break-words whitespace-normal leading-relaxed">${
                cell ? convertMarkdownInlinesToHtml(cell.replace(/\\\|/g, "|")) : "<br>"
              }</td>`
          )
          .join("")}</tr>`
    )
    .join("");

  return `<div data-type="table-block" data-table-width="${width}" class="table-block-wrapper my-3.5 border border-border bg-background overflow-hidden select-none mr-auto" style="${widthStyle}">
    <div contenteditable="false" class="table-toolbar flex flex-wrap items-center justify-between gap-1.5 px-3 py-1.5 bg-muted/40 border-b border-border text-xs text-muted-foreground select-none">
      <span class="font-medium text-foreground flex items-center gap-1.5 shrink-0">
        <svg class="h-3.5 w-3.5 text-primary" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18"/><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/></svg>
        Table
        <span class="table-dim-badge text-[10px] font-mono bg-muted px-1.5 py-0.5 border border-border/50 text-muted-foreground">${colCount} cols × ${rowCount} rows</span>
      </span>
      <div class="flex flex-wrap items-center gap-1 shrink-0">
        <button type="button" class="table-add-row-btn px-2 py-0.5 hover:bg-muted hover:text-foreground text-[11px] font-medium border border-border/40 transition-colors cursor-pointer" title="Add Row Below">+ Row</button>
        <button type="button" class="table-del-row-btn px-2 py-0.5 hover:bg-destructive/15 hover:text-destructive text-[11px] font-medium border border-border/40 transition-colors cursor-pointer ${
          rowCount <= 1 ? "opacity-40 cursor-not-allowed" : ""
        }" title="Delete Last Row">− Row</button>
        <div class="h-3 w-[1px] bg-border mx-0.5"></div>
        <button type="button" class="table-add-col-btn px-2 py-0.5 hover:bg-muted hover:text-foreground text-[11px] font-medium border border-border/40 transition-colors cursor-pointer" title="Add Column Right">+ Col</button>
        <button type="button" class="table-del-col-btn px-2 py-0.5 hover:bg-destructive/15 hover:text-destructive text-[11px] font-medium border border-border/40 transition-colors cursor-pointer ${
          colCount <= 1 ? "opacity-40 cursor-not-allowed" : ""
        }" title="Delete Last Column">− Col</button>
        <div class="h-3 w-[1px] bg-border mx-0.5"></div>
        <select class="table-width-select bg-background hover:bg-muted text-foreground text-[11px] font-medium px-1.5 py-0.5 border border-border/60 outline-none cursor-pointer transition-colors" title="Select Table Width">
          <option value="100%" ${width === "100%" ? "selected" : ""}>Full (100%)</option>
          <option value="66%" ${width === "66%" ? "selected" : ""}>2/3 (66%)</option>
          <option value="50%" ${width === "50%" ? "selected" : ""}>1/2 (50%)</option>
          <option value="33%" ${width === "33%" ? "selected" : ""}>1/3 (33%)</option>
          <option value="auto" ${width === "auto" ? "selected" : ""}>Auto</option>
        </select>
        <div class="h-3 w-[1px] bg-border mx-0.5"></div>
        <button type="button" class="table-del-table-btn px-2 py-0.5 hover:bg-destructive/15 hover:text-destructive text-[11px] font-medium border border-border/40 transition-colors cursor-pointer flex items-center gap-1" title="Delete Entire Table">
          <svg class="h-3 w-3 text-destructive" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
          Delete
        </button>
      </div>
    </div>
    <div class="overflow-x-auto max-w-full">
      <table class="w-full text-left text-xs border-collapse">
        <thead class="bg-muted/60 text-foreground font-semibold">
          <tr>${headerHtml}</tr>
        </thead>
        <tbody>${bodyHtml}</tbody>
      </table>
    </div>
  </div>`;
}

// Render visual Image Block HTML (Fix 8 & Book Layout)
function renderInteractiveImageHtml(
  alt: string,
  src: string,
  width: ImageWidth = "100%",
  align: ImageAlign = "center"
): string {
  const styleCss = getImageBlockStyle(width, align);

  return `<div data-type="image-block" data-image-width="${width}" data-image-align="${align}" class="image-block-wrapper my-3.5 border border-border bg-card rounded-xl overflow-hidden select-none max-w-full" style="${styleCss}">
    <div contenteditable="false" class="image-toolbar flex flex-wrap items-center justify-between gap-1.5 px-3 py-1.5 bg-muted/40 border-b border-border text-xs text-muted-foreground select-none">
      <span class="font-medium text-foreground flex items-center gap-1.5 shrink-0">
        <svg class="h-3.5 w-3.5 text-emerald-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
        <span class="truncate max-w-[110px] text-[11px] font-mono text-muted-foreground">${alt || "Image"}</span>
      </span>
      <div class="flex flex-wrap items-center gap-1 shrink-0">
        <div class="flex items-center gap-0.5 bg-background p-0.5 rounded border border-border/50">
          <button type="button" data-align="left" class="image-align-btn px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
            align === "left" ? "bg-primary text-primary-foreground font-semibold" : "hover:bg-muted text-muted-foreground hover:text-foreground"
          }" title="Align Left (Text wraps to right)">Left</button>
          <button type="button" data-align="center" class="image-align-btn px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
            align === "center" ? "bg-primary text-primary-foreground font-semibold" : "hover:bg-muted text-muted-foreground hover:text-foreground"
          }" title="Align Center (Standalone block)">Center</button>
          <button type="button" data-align="right" class="image-align-btn px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
            align === "right" ? "bg-primary text-primary-foreground font-semibold" : "hover:bg-muted text-muted-foreground hover:text-foreground"
          }" title="Align Right (Text wraps to left)">Right</button>
        </div>
        <div class="h-3 w-[1px] bg-border mx-0.5"></div>
        <button type="button" data-size="25%" class="image-size-btn px-1.5 py-0.5 rounded text-[11px] font-medium border border-border/40 transition-colors cursor-pointer ${
          width === "25%" ? "bg-primary text-primary-foreground font-semibold" : "hover:bg-muted text-foreground"
        }" title="Small (25%)">Small</button>
        <button type="button" data-size="50%" class="image-size-btn px-1.5 py-0.5 rounded text-[11px] font-medium border border-border/40 transition-colors cursor-pointer ${
          width === "50%" ? "bg-primary text-primary-foreground font-semibold" : "hover:bg-muted text-foreground"
        }" title="Medium (50%)">Medium</button>
        <button type="button" data-size="75%" class="image-size-btn px-1.5 py-0.5 rounded text-[11px] font-medium border border-border/40 transition-colors cursor-pointer ${
          width === "75%" ? "bg-primary text-primary-foreground font-semibold" : "hover:bg-muted text-foreground"
        }" title="Large (75%)">Large</button>
        <button type="button" data-size="100%" class="image-size-btn px-1.5 py-0.5 rounded text-[11px] font-medium border border-border/40 transition-colors cursor-pointer ${
          width === "100%" ? "bg-primary text-primary-foreground font-semibold" : "hover:bg-muted text-foreground"
        }" title="Full (100%)">Full</button>
        <div class="h-3 w-[1px] bg-border mx-0.5"></div>
        <button type="button" class="image-del-btn px-1.5 py-0.5 rounded hover:bg-destructive/15 hover:text-destructive text-[11px] font-medium border border-border/40 transition-colors cursor-pointer flex items-center gap-1" title="Delete Image">
          <svg class="h-3 w-3 text-destructive" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
          Delete
        </button>
      </div>
    </div>
    <div class="p-2 flex flex-col items-center bg-muted/10">
      <img src="${src}" alt="${alt || "Image"}" class="w-full h-auto object-contain rounded max-h-[500px]" loading="lazy" />
    </div>
  </div>`;
}

function markdownToHtml(md: string): string {
  if (!md) return '<p class="my-1 leading-relaxed"><br></p>';
  const lines = md.split(/\r?\n/);
  const htmlParts: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Check for image metadata directive: <!-- image-width: 50% image-align: left --> (Fix 8)
    let imageWidth: ImageWidth = "100%";
    let imageAlign: ImageAlign = "center";
    const isImgDirective = /^<!--\s*image-(?:width|size|align).*?-->$/i.test(line.trim());
    if (isImgDirective) {
      const widthM = line.match(/(?:image-width|image-size):\s*(100%|75%|50%|25%|small|medium|large|full)/i);
      if (widthM) {
        const rawVal = widthM[1].toLowerCase();
        if (rawVal === "small" || rawVal === "25%") imageWidth = "25%";
        else if (rawVal === "medium" || rawVal === "50%") imageWidth = "50%";
        else if (rawVal === "large" || rawVal === "75%") imageWidth = "75%";
        else imageWidth = "100%";
      }
      const alignM = line.match(/image-align:\s*(left|center|right)/i);
      if (alignM) {
        imageAlign = alignM[1].toLowerCase() as ImageAlign;
      }

      let nextIdx = i + 1;
      while (nextIdx < lines.length && lines[nextIdx].trim() === "") {
        nextIdx++;
      }
      if (nextIdx < lines.length && /^!\[(.*?)\]\((.*?)\)$/.test(lines[nextIdx].trim())) {
        i = nextIdx;
        line = lines[i];
      }
    }

    // Image block detection (![alt](src)) (Fix 8)
    const imgMatch = line.trim().match(/^!\[(.*?)\]\((.*?)\)$/);
    if (imgMatch) {
      const alt = imgMatch[1];
      const src = imgMatch[2];
      htmlParts.push(renderInteractiveImageHtml(alt, src, imageWidth, imageAlign));
      continue;
    }

    // Check for table-width metadata directive (Fix 7F, 7G, 7H)
    let tableWidth: TableWidth = "100%";
    const widthMatch = line.trim().match(/^<!--\s*table-width:\s*(100%|66%|50%|33%|auto)\s*-->$/i);
    if (widthMatch) {
      tableWidth = widthMatch[1].toLowerCase() as TableWidth;
      let nextIdx = i + 1;
      while (nextIdx < lines.length && lines[nextIdx].trim() === "") {
        nextIdx++;
      }
      if (nextIdx < lines.length && lines[nextIdx].trim().startsWith("|") && lines[nextIdx].trim().endsWith("|")) {
        i = nextIdx;
        line = lines[i];
      }
    }

    // Table block detection (Fix 7B, 7C, 7D, 7F, 7G, 7H)
    if (
      line.trim().startsWith("|") &&
      line.trim().endsWith("|") &&
      i + 1 < lines.length &&
      isTableSeparator(lines[i + 1])
    ) {
      const headerCells = splitTableRow(line);
      i += 1; // skip separator line

      const rows: string[][] = [];
      while (i + 1 < lines.length && lines[i + 1].trim().startsWith("|") && lines[i + 1].trim().endsWith("|")) {
        i++;
        rows.push(splitTableRow(lines[i]));
      }

      htmlParts.push(renderInteractiveTableHtml(headerCells, rows, tableWidth));
      continue;
    }

    const h4Match = line.match(/^####\s+(.*)$/);
    const h3Match = line.match(/^###\s+(.*)$/);
    const h2Match = line.match(/^##\s+(.*)$/);
    const h1Match = line.match(/^#\s+(.*)$/);
    const checklistMatch = line.match(/^(\s*)-\s*\[([ xX])\]\s*(.*)$/);
    const quoteMatch = line.match(/^>\s*(.*)$/);

    if (checklistMatch) {
      const isChecked = checklistMatch[2].toLowerCase() === "x";
      const itemText = convertMarkdownInlinesToHtml(checklistMatch[3]);
      const btnClass = isChecked
        ? "bg-primary border-primary text-primary-foreground"
        : "border-input bg-background hover:bg-muted text-transparent";
      const textClass = isChecked ? "line-through text-muted-foreground" : "text-foreground";
      htmlParts.push(
        `<div data-type="checklist" data-checked="${isChecked}" class="checklist-item flex items-start gap-2.5 my-1.5 px-0.5 group"><button type="button" contenteditable="false" class="checklist-box mt-0.5 h-4.5 w-4.5 min-w-4.5 rounded flex items-center justify-center border select-none cursor-pointer transition-colors ${btnClass}"><svg class="h-3 w-3 stroke-[3]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></button><span class="checklist-text flex-1 outline-none leading-relaxed ${textClass}">${itemText || "<br>"}</span></div>`
      );
    } else if (quoteMatch) {
      const quoteText = convertMarkdownInlinesToHtml(quoteMatch[1]);
      htmlParts.push(
        `<blockquote class="${BLOCKQUOTE_CLASS}">${quoteText || "<br>"}</blockquote>`
      );
    } else if (h4Match) {
      const text = convertMarkdownInlinesToHtml(h4Match[1]) || "<br>";
      htmlParts.push(`<h4 class="text-base font-semibold text-foreground mt-1.5 mb-1 leading-snug no-underline">${text}</h4>`);
    } else if (h3Match) {
      const text = convertMarkdownInlinesToHtml(h3Match[1]) || "<br>";
      htmlParts.push(`<h3 class="text-lg font-semibold text-foreground mt-2 mb-1 leading-snug no-underline">${text}</h3>`);
    } else if (h2Match) {
      const text = convertMarkdownInlinesToHtml(h2Match[1]) || "<br>";
      htmlParts.push(`<h2 class="text-xl font-semibold text-foreground mt-3 mb-1.5 leading-snug tracking-tight no-underline">${text}</h2>`);
    } else if (h1Match) {
      const text = convertMarkdownInlinesToHtml(h1Match[1]) || "<br>";
      htmlParts.push(`<h1 class="text-2xl font-bold text-foreground mt-4 mb-2 leading-tight tracking-tight no-underline">${text}</h1>`);
    } else if (line === "") {
      htmlParts.push('<p class="my-1 leading-relaxed"><br></p>');
    } else {
      htmlParts.push(`<p class="my-1 leading-relaxed">${convertMarkdownInlinesToHtml(line)}</p>`);
    }
  }

  return htmlParts.join("");
}

function serializeChildren(el: HTMLElement): string {
  let result = "";
  for (const child of Array.from(el.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      result += child.textContent || "";
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const childEl = child as HTMLElement;
      const tag = childEl.tagName.toUpperCase();
      if (tag === "BR") {
        result += "";
      } else if (tag === "SVG" || childEl.closest("svg")) {
        result += "";
      } else {
        result += serializeElement(childEl);
      }
    }
  }
  return result;
}

// Serialize single cell content while keeping rich elements intact (Fix 7H)
function serializeCellContent(cell: HTMLElement): string {
  const parts: string[] = [];
  for (const child of Array.from(cell.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent || "";
      if (text) parts.push(text);
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const childEl = child as HTMLElement;
      const tag = childEl.tagName.toUpperCase();
      if (tag === "BR") {
        parts.push("<br>");
      } else if (childEl.getAttribute("data-type") === "checklist" || childEl.classList.contains("checklist-item")) {
        const isChecked = childEl.getAttribute("data-checked") === "true";
        const textSpan = childEl.querySelector(".checklist-text") as HTMLElement;
        const taskContent = textSpan ? serializeChildren(textSpan).trim() : serializeChildren(childEl).trim();
        parts.push(isChecked ? `- [x] ${taskContent}` : `- [ ] ${taskContent}`);
      } else if (tag === "BLOCKQUOTE") {
        const inner = serializeChildren(childEl).trim();
        parts.push(`> ${inner}`);
      } else {
        const inner = serializeElement(childEl);
        if (inner) parts.push(inner);
      }
    }
  }
  return parts.join("<br>").trim().replace(/\|/g, "\\|");
}

// Serialize Table Block back to standard Markdown with optional width comment (Fix 7B, 7C, 7D, 7F, 7G, 7H)
function serializeTableElement(tableWrapper: HTMLElement): string {
  const table = tableWrapper.querySelector("table");
  if (!table) return "";

  const width = (tableWrapper.getAttribute("data-table-width") as TableWidth) || "100%";
  const widthComment = width && width !== "100%" ? `<!-- table-width: ${width} -->\n` : "";

  const thead = table.querySelector("thead");
  const tbody = table.querySelector("tbody");

  const headerCells: string[] = [];
  if (thead) {
    const ths = Array.from(thead.querySelectorAll("th"));
    for (const th of ths) {
      const text = serializeCellContent(th);
      headerCells.push(text || " ");
    }
  }

  const colCount = Math.max(1, headerCells.length);
  while (headerCells.length < colCount) {
    headerCells.push(" ");
  }

  const headerLine = `| ${headerCells.join(" | ")} |`;
  const dividerLine = `| ${new Array(colCount).fill(":---").join(" | ")} |`;

  const bodyLines: string[] = [];
  if (tbody) {
    const trs = Array.from(tbody.querySelectorAll("tr"));
    for (const tr of trs) {
      const tds = Array.from(tr.querySelectorAll("td"));
      const rowCells: string[] = [];
      for (let c = 0; c < colCount; c++) {
        const td = tds[c];
        const text = td ? serializeCellContent(td) : "";
        rowCells.push(text || " ");
      }
      bodyLines.push(`| ${rowCells.join(" | ")} |`);
    }
  }

  return `${widthComment}${headerLine}\n${dividerLine}\n${bodyLines.join("\n")}`;
}

// Serialize Image Block back to standard Markdown with optional width & alignment comment (Fix 8 & Book Layout)
function serializeImageElement(imageWrapper: HTMLElement): string {
  const img = imageWrapper.querySelector("img");
  if (!img) return "";

  const src = img.getAttribute("src") || "";
  const alt = img.getAttribute("alt") || "Image";
  const width = (imageWrapper.getAttribute("data-image-width") as ImageWidth) || "100%";
  const align = (imageWrapper.getAttribute("data-image-align") as ImageAlign) || "center";

  let comment = "";
  if (width !== "100%" || align !== "center") {
    comment = `<!-- image-width: ${width} image-align: ${align} -->\n`;
  }

  return `${comment}![${alt}](${src})`;
}

function serializeElement(el: HTMLElement): string {
  const tag = el.tagName.toUpperCase();

  // Image Block (Fix 8)
  if (el.getAttribute("data-type") === "image-block" || el.classList.contains("image-block-wrapper")) {
    return serializeImageElement(el);
  }

  // Table Block (Fix 7B, 7C, 7D, 7F, 7G, 7H)
  if (el.getAttribute("data-type") === "table-block" || el.classList.contains("table-block-wrapper")) {
    return serializeTableElement(el);
  }

  // Checklist Item
  if (el.getAttribute("data-type") === "checklist" || el.classList.contains("checklist-item")) {
    const isChecked = el.getAttribute("data-checked") === "true";
    const textSpan = el.querySelector(".checklist-text") as HTMLElement;
    const taskContent = textSpan ? serializeChildren(textSpan).trim() : serializeChildren(el).trim();
    return isChecked ? `- [x] ${taskContent}` : `- [ ] ${taskContent}`;
  }

  // Blockquote
  if (tag === "BLOCKQUOTE") {
    const inner = serializeChildren(el).trim();
    return `> ${inner}`;
  }

  // Highlight <mark>
  if (tag === "MARK") {
    const inner = serializeChildren(el);
    if (!inner.trim()) return inner;
    return `==${inner}==`;
  }

  // Link <a> (Fix 9: cleanly extract text and url)
  if (tag === "A") {
    const href = el.getAttribute("href") || "";
    const textSpan = el.querySelector(".editor-link-text");
    let text = "";
    if (textSpan) {
      text = serializeChildren(textSpan as HTMLElement).trim();
    } else {
      const clone = el.cloneNode(true) as HTMLElement;
      clone.querySelectorAll("svg, .editor-link-url").forEach((s) => s.remove());
      text = serializeChildren(clone).trim();
    }
    return `[${text || href}](${href})`;
  }

  // If element is a partial heading span with font-size, preserve outerHTML
  if (tag === "SPAN" && el.getAttribute("style")) {
    const style = el.getAttribute("style") || "";
    if (style.includes("font-size")) {
      return el.outerHTML;
    }
    if (style.includes("font-weight: bold") || style.includes("font-weight: 700") || style.includes("font-weight:bold")) {
      const inner = serializeChildren(el);
      return inner.trim() ? `**${inner}**` : "";
    }
  }

  // Bold <strong> or <b>
  if (tag === "STRONG" || tag === "B") {
    const inner = serializeChildren(el);
    if (!inner.trim()) return inner;
    if (inner.startsWith("**") && inner.endsWith("**") && inner.length >= 4) {
      return inner;
    }
    return `**${inner}**`;
  }

  return serializeChildren(el);
}

function domToMarkdown(container: HTMLElement): string {
  const lines: string[] = [];
  const children = Array.from(container.childNodes);

  if (children.length === 0) {
    return container.innerText || container.textContent || "";
  }

  for (let i = 0; i < children.length; i++) {
    const node = children[i];

    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || "";
      if (text.trim() !== "" || children.length === 1) {
        lines.push(text);
      }
      continue;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const tag = el.tagName.toUpperCase();

      if (el.getAttribute("data-type") === "image-block" || el.classList.contains("image-block-wrapper")) {
        const imageMd = serializeImageElement(el);
        lines.push(imageMd);
      } else if (el.getAttribute("data-type") === "table-block" || el.classList.contains("table-block-wrapper")) {
        const tableMd = serializeTableElement(el);
        lines.push(tableMd);
      } else if (el.getAttribute("data-type") === "checklist" || el.classList.contains("checklist-item")) {
        const line = serializeElement(el);
        lines.push(line);
      } else if (tag === "BLOCKQUOTE") {
        const line = serializeElement(el);
        lines.push(line);
      } else if (tag === "H1") {
        const text = serializeElement(el).trim();
        lines.push(`# ${text}`);
      } else if (tag === "H2") {
        const text = serializeElement(el).trim();
        lines.push(`## ${text}`);
      } else if (tag === "H3") {
        const text = serializeElement(el).trim();
        lines.push(`### ${text}`);
      } else if (tag === "H4") {
        const text = serializeElement(el).trim();
        lines.push(`#### ${text}`);
      } else if (tag === "BR") {
        lines.push("");
      } else {
        const content = serializeElement(el);
        if (content === "\n" || content === "") {
          lines.push("");
        } else {
          const sublines = content.split("\n");
          for (const subline of sublines) {
            lines.push(subline);
          }
        }
      }
    }
  }

  return lines.join("\n");
}

function createChecklistItem(text: string = "", isChecked: boolean = false): HTMLElement {
  const item = document.createElement("div");
  item.setAttribute("data-type", "checklist");
  item.setAttribute("data-checked", String(isChecked));
  item.className = "checklist-item flex items-start gap-2.5 my-1.5 px-0.5 group";

  const btn = document.createElement("button");
  btn.setAttribute("type", "button");
  btn.setAttribute("contenteditable", "false");
  btn.className = `checklist-box mt-0.5 h-4.5 w-4.5 min-w-4.5 rounded flex items-center justify-center border select-none cursor-pointer transition-colors ${
    isChecked
      ? "bg-primary border-primary text-primary-foreground"
      : "border-input bg-background hover:bg-muted text-transparent"
  }`;
  btn.innerHTML = `<svg class="h-3 w-3 stroke-[3]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

  const textSpan = document.createElement("span");
  textSpan.className = `checklist-text flex-1 outline-none leading-relaxed ${
    isChecked ? "line-through text-muted-foreground" : "text-foreground"
  }`;
  if (text) {
    textSpan.innerHTML = convertMarkdownInlinesToHtml(text);
  } else {
    textSpan.innerHTML = "<br>";
  }

  item.appendChild(btn);
  item.appendChild(textSpan);
  return item;
}

// Calculate next contiguous number from local context (Fix 7H)
function getNextNumberedListIndex(targetNode: Node | null): number {
  if (!targetNode) return 1;

  let curr = targetNode.previousSibling;
  while (curr) {
    if (curr.nodeType === Node.ELEMENT_NODE) {
      const el = curr as HTMLElement;
      const text = (el.textContent || "").trim();

      if (
        el.getAttribute("data-type") === "checklist" ||
        el.getAttribute("data-type") === "table-block" ||
        el.getAttribute("data-type") === "image-block" ||
        el.classList.contains("checklist-item") ||
        el.classList.contains("table-block-wrapper") ||
        el.classList.contains("image-block-wrapper") ||
        ["H1", "H2", "H3", "H4", "BLOCKQUOTE", "TABLE", "HR", "PRE"].includes(el.tagName.toUpperCase())
      ) {
        return 1;
      }

      const match = text.match(/^(\d+)\.\s+/);
      if (match) {
        const num = parseInt(match[1], 10);
        return num + 1;
      }

      return 1;
    } else if (curr.nodeType === Node.TEXT_NODE) {
      const text = (curr.textContent || "").trim();
      if (text !== "") {
        const match = text.match(/^(\d+)\.\s+/);
        if (match) {
          return parseInt(match[1], 10) + 1;
        }
        return 1;
      }
    }
    curr = curr.previousSibling;
  }

  return 1;
}

function placeCursorAtEnd(node: Node) {
  const selection = window.getSelection();
  if (!selection) return;
  const range = document.createRange();
  range.selectNodeContents(node);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

// Table Configuration Popover Component (Fix 7A, 7D)
interface TableConfigPopoverProps {
  onClose: () => void;
  onInsert: (rows: number, cols: number) => void;
}

function TableConfigPopover({ onClose, onInsert }: TableConfigPopoverProps) {
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);

  const minRows = 1;
  const maxRows = 15;
  const minCols = 1;
  const maxCols = 8;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="absolute left-0 top-full mt-1.5 w-64 rounded-xl border border-border bg-popover text-popover-foreground shadow-xl z-50 p-3 text-xs select-none">
      <div className="flex items-center justify-between font-semibold border-b border-border/50 pb-2 mb-2.5">
        <span className="text-foreground flex items-center gap-1.5">
          <TableIcon className="h-3.5 w-3.5 text-primary" />
          Insert Table
        </span>
        <span className="text-[10px] text-muted-foreground font-normal">
          {cols} cols × {rows} rows
        </span>
      </div>

      {/* Row Counter (Data Rows) */}
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-foreground">Rows (Data)</span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={rows <= minRows}
            onClick={() => setRows((r) => Math.max(minRows, r - 1))}
            className="h-6 w-6 rounded flex items-center justify-center border border-border bg-muted/50 hover:bg-muted text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <Minus className="h-3 w-3" />
          </button>
          <span className="w-5 text-center font-bold text-foreground font-mono">{rows}</span>
          <button
            type="button"
            disabled={rows >= maxRows}
            onClick={() => setRows((r) => Math.min(maxRows, r + 1))}
            className="h-6 w-6 rounded flex items-center justify-center border border-border bg-muted/50 hover:bg-muted text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Column Counter */}
      <div className="flex items-center justify-between mb-2.5">
        <span className="font-medium text-foreground">Columns</span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={cols <= minCols}
            onClick={() => setCols((c) => Math.max(minCols, c - 1))}
            className="h-6 w-6 rounded flex items-center justify-center border border-border bg-muted/50 hover:bg-muted text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <Minus className="h-3 w-3" />
          </button>
          <span className="w-5 text-center font-bold text-foreground font-mono">{cols}</span>
          <button
            type="button"
            disabled={cols >= maxCols}
            onClick={() => setCols((c) => Math.min(maxCols, c + 1))}
            className="h-6 w-6 rounded flex items-center justify-center border border-border bg-muted/50 hover:bg-muted text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Live Grid Preview */}
      <div className="space-y-1 mb-3">
        <div className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
          Live Preview
        </div>
        <div className="p-2 border border-border bg-muted/20 flex flex-col items-center justify-center min-h-[70px] max-h-[110px] overflow-auto">
          <div
            className="grid gap-1 w-full max-w-full"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
          >
            {/* Header Row */}
            {Array.from({ length: cols }).map((_, c) => (
              <div
                key={`h-${c}`}
                className="h-3.5 bg-primary/40 border border-primary/50"
                title="Header cell"
              />
            ))}
            {/* Data Rows */}
            {Array.from({ length: rows }).map((_, r) =>
              Array.from({ length: cols }).map((_, c) => (
                <div
                  key={`d-${r}-${c}`}
                  className="h-3.5 bg-muted/80 border border-border/80"
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/50">
        <button
          type="button"
          onClick={onClose}
          className="px-2.5 py-1 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onInsert(rows, cols)}
          className="px-3 py-1 rounded-md text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-2xs cursor-pointer"
        >
          Insert Table
        </button>
      </div>
    </div>
  );
}

// Link Configuration Popover Component (Fix 9)
interface LinkConfigPopoverProps {
  initialText: string;
  initialUrl: string;
  isEditing: boolean;
  onClose: () => void;
  onInsert: (text: string, url: string) => void;
}

function LinkConfigPopover({
  initialText,
  initialUrl,
  isEditing,
  onClose,
  onInsert,
}: LinkConfigPopoverProps) {
  const [text, setText] = useState(initialText);
  const [url, setUrl] = useState(initialUrl);
  const urlInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    urlInputRef.current?.focus();
    if (initialUrl) {
      urlInputRef.current?.select();
    }
  }, [initialUrl]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleApply = (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const cleanUrl = url.trim();
    if (!cleanUrl) return;
    onInsert(text.trim() || cleanUrl, cleanUrl);
  };

  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      className="absolute left-0 top-full mt-1.5 w-72 rounded-xl border border-border bg-popover text-popover-foreground shadow-xl z-50 p-3 text-xs select-none"
    >
      <div className="space-y-2.5">
        <div className="flex items-center justify-between font-semibold border-b border-border/50 pb-1.5">
          <span className="text-foreground flex items-center gap-1.5">
            <LinkIcon className="h-3.5 w-3.5 text-primary" />
            {isEditing ? "Edit Link" : "Insert Link"}
          </span>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-muted-foreground mb-1">
            Link Text
          </label>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                e.stopPropagation();
                handleApply(e);
              }
            }}
            placeholder="e.g. OpenAI"
            className="w-full px-2.5 py-1.5 rounded-md border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-muted-foreground mb-1">
            Destination URL
          </label>
          <input
            ref={urlInputRef}
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                e.stopPropagation();
                handleApply(e);
              }
            }}
            placeholder="https://example.com"
            className="w-full px-2.5 py-1.5 rounded-md border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary font-mono text-[11px]"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/50">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            className="px-2.5 py-1 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!url.trim()}
            onClick={handleApply}
            className="px-3 py-1 rounded-md text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-2xs cursor-pointer"
          >
            {isEditing ? "Update Link" : "Insert Link"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function RichMarkdownEditor({
  value,
  onChange,
  language = DEFAULT_LANGUAGE_CODE,
  onLanguageChange,
  direction = "ltr",
  onDirectionChange,
  placeholder = "Write your prompt in Markdown, with tables, checklists, and images...",
  minHeight = "min-h-[380px]",
  className = "",
}: RichMarkdownEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const langDropdownRef = useRef<HTMLDivElement>(null);
  const tablePopoverRef = useRef<HTMLDivElement>(null);
  const linkPopoverRef = useRef<HTMLDivElement>(null);

  // Link Range & Anchor Tracking (Fix 9)
  const savedLinkRangeRef = useRef<Range | null>(null);
  const activeLinkAnchorRef = useRef<HTMLAnchorElement | null>(null);

  // Undo / Redo History Stack
  const historyRef = useRef<HistoryEntry[]>([{ value }]);
  const historyIndexRef = useRef<number>(0);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isUndoRedoActionRef = useRef<boolean>(false);
  const lastEmittedValueRef = useRef<string>(value);

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [showTablePopover, setShowTablePopover] = useState(false);

  // Link Popover State (Fix 9)
  const [linkPopoverState, setLinkPopoverState] = useState<{
    isOpen: boolean;
    initialText: string;
    initialUrl: string;
    isEditing: boolean;
  }>({
    isOpen: false,
    initialText: "",
    initialUrl: "",
    isEditing: false,
  });

  // Floating Contextual Link Action Bar (Fix 9)
  const [activeLinkBar, setActiveLinkBar] = useState<ActiveLinkState | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const [activeHeading, setActiveHeading] = useState<number | null>(null);
  const [isBoldActive, setIsBoldActive] = useState(false);
  const [isHighlightActive, setIsHighlightActive] = useState(false);
  const [isNumberedActive, setIsNumberedActive] = useState(false);
  const [isQuoteActive, setIsQuoteActive] = useState(false);
  const [detectedLang, setDetectedLang] = useState<DetectedLanguageInfo>({
    direction: "ltr",
    scriptName: "English / Latin",
    languageCode: "en",
    hasRtlCharacters: false,
    hasLtrCharacters: false,
    isMixed: false,
  });

  const updateUndoRedoState = useCallback(() => {
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
  }, []);

  // Push new state to history stack
  const pushHistory = useCallback(
    (newValue: string, isImmediate = true) => {
      if (isUndoRedoActionRef.current) return;

      const currentEntry = historyRef.current[historyIndexRef.current];
      if (currentEntry && currentEntry.value === newValue) return;

      const applyPush = () => {
        const newHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
        newHistory.push({ value: newValue });

        // Cap history to 150 items
        if (newHistory.length > 150) {
          newHistory.shift();
        }

        historyRef.current = newHistory;
        historyIndexRef.current = newHistory.length - 1;
        updateUndoRedoState();
      };

      if (isImmediate) {
        if (typingTimerRef.current) {
          clearTimeout(typingTimerRef.current);
          typingTimerRef.current = null;
        }
        applyPush();
      } else {
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        typingTimerRef.current = setTimeout(() => {
          applyPush();
        }, 400);
      }
    },
    [updateUndoRedoState]
  );

  // Sync initial and external prop changes to editor innerHTML
  useEffect(() => {
    if (editorRef.current && value !== lastEmittedValueRef.current) {
      editorRef.current.innerHTML = markdownToHtml(value);
      lastEmittedValueRef.current = value;
      historyRef.current = [{ value }];
      historyIndexRef.current = 0;
      updateUndoRedoState();
    }
  }, [value, updateUndoRedoState]);

  // Initial load
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML === "") {
      editorRef.current.innerHTML = markdownToHtml(value);
    }
  }, []);

  // Listen for native DOM change events on unmanaged select inputs (e.g. table-width-select) (Fix 7G, 7H)
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const handleNativeChange = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target && target.classList.contains("table-width-select")) {
        const select = target as HTMLSelectElement;
        const newWidth = (select.value as TableWidth) || "100%";
        const tableWrapper = select.closest('[data-type="table-block"]') as HTMLElement;
        if (tableWrapper) {
          tableWrapper.setAttribute("data-table-width", newWidth);
          tableWrapper.style.cssText = getTableWidthStyle(newWidth);

          const newMd = domToMarkdown(editor);
          lastEmittedValueRef.current = newMd;
          pushHistory(newMd, true);
          onChange(newMd);
        }
      }
    };

    editor.addEventListener("change", handleNativeChange);
    return () => {
      editor.removeEventListener("change", handleNativeChange);
    };
  }, [onChange, pushHistory]);

  // Perform Undo
  const handleUndo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      isUndoRedoActionRef.current = true;
      historyIndexRef.current -= 1;
      const target = historyRef.current[historyIndexRef.current];
      lastEmittedValueRef.current = target.value;
      if (editorRef.current) {
        editorRef.current.innerHTML = markdownToHtml(target.value);
      }
      onChange(target.value);
      updateUndoRedoState();

      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.focus();
        }
        isUndoRedoActionRef.current = false;
        updateCursorContext();
      }, 10);
    }
  }, [onChange, updateUndoRedoState]);

  // Perform Redo
  const handleRedo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      isUndoRedoActionRef.current = true;
      historyIndexRef.current += 1;
      const target = historyRef.current[historyIndexRef.current];
      lastEmittedValueRef.current = target.value;
      if (editorRef.current) {
        editorRef.current.innerHTML = markdownToHtml(target.value);
      }
      onChange(target.value);
      updateUndoRedoState();

      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.focus();
        }
        isUndoRedoActionRef.current = false;
        updateCursorContext();
      }, 10);
    }
  }, [onChange, updateUndoRedoState]);

  // Track cursor position to update active toolbar states
  const updateCursorContext = () => {
    const editor = editorRef.current;
    if (!editor) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      setActiveHeading(null);
      setIsBoldActive(false);
      setIsHighlightActive(false);
      setIsNumberedActive(false);
      setIsQuoteActive(false);
      return;
    }

    let node: Node | null = selection.anchorNode;
    let headingLevel: number | null = null;
    let insideMark = false;
    let insideNumbered = false;
    let insideQuote = false;

    while (node && node !== editor) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        const tag = el.tagName.toUpperCase();
        if (tag === "H1") headingLevel = 1;
        else if (tag === "H2") headingLevel = 2;
        else if (tag === "H3") headingLevel = 3;
        else if (tag === "H4") headingLevel = 4;
        else if (tag === "BLOCKQUOTE") insideQuote = true;
        else if (tag === "MARK") insideMark = true;
        else if (tag === "SPAN" && el.getAttribute("style")) {
          const style = el.getAttribute("style") || "";
          if (style.includes("1.5em")) headingLevel = 1;
          else if (style.includes("1.3em")) headingLevel = 2;
          else if (style.includes("1.15em")) headingLevel = 3;
          else if (style.includes("1.05em")) headingLevel = 4;
        }

        if (el.parentNode === editor || el.closest(".table-cell")) {
          const text = (el.textContent || "").trim();
          if (/^\d+\.\s+/.test(text)) {
            insideNumbered = true;
          }
        }
      }
      node = node.parentNode;
    }

    setActiveHeading(headingLevel);
    setIsHighlightActive(insideMark);
    setIsNumberedActive(insideNumbered);
    setIsQuoteActive(insideQuote);

    try {
      setIsBoldActive(document.queryCommandState("bold"));
    } catch {
      setIsBoldActive(false);
    }
  };

  // Close dropdowns and popovers on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(e.target as Node)) {
        setShowLangDropdown(false);
      }
      if (tablePopoverRef.current && !tablePopoverRef.current.contains(e.target as Node)) {
        setShowTablePopover(false);
      }
      if (linkPopoverRef.current && !linkPopoverRef.current.contains(e.target as Node)) {
        setLinkPopoverState((prev) => ({ ...prev, isOpen: false }));
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  // Update language and direction detection
  useEffect(() => {
    const langInfo = detectLanguageAndDirection(value);
    setDetectedLang(langInfo);
  }, [value]);

  const currentLangOption = getLanguageByCode(language);
  let activeDirection: "ltr" | "rtl" = "ltr";
  if (language === "auto" || direction === "auto") {
    activeDirection = detectedLang.direction;
  } else if (direction === "ltr" || direction === "rtl") {
    activeDirection = direction;
  } else {
    activeDirection = currentLangOption.direction === "rtl" ? "rtl" : "ltr";
  }

  // Handle explicit language selection
  const handleSelectLanguage = (opt: LanguageOption) => {
    setShowLangDropdown(false);
    const newDir: TextDirection = opt.direction;
    onLanguageChange?.(opt.code, newDir);
    onDirectionChange?.(newDir);
  };

  // Toggle Bold formatting on selected text or cursor
  const toggleBold = () => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.focus();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) return;

    document.execCommand("bold", false);

    const newMd = domToMarkdown(editor);
    lastEmittedValueRef.current = newMd;
    pushHistory(newMd, true);
    onChange(newMd);
    updateCursorContext();
  };

  // Toggle Highlight formatting on selected text or cursor (Fix 3)
  const toggleHighlight = () => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.focus();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) return;

    let markParent: HTMLElement | null = null;
    let curr: Node | null = range.startContainer;
    while (curr && curr !== editor) {
      if (curr.nodeType === Node.ELEMENT_NODE && (curr as HTMLElement).tagName.toUpperCase() === "MARK") {
        markParent = curr as HTMLElement;
        break;
      }
      curr = curr.parentNode;
    }

    if (markParent) {
      const parent = markParent.parentNode;
      if (parent) {
        while (markParent.firstChild) {
          parent.insertBefore(markParent.firstChild, markParent);
        }
        parent.removeChild(markParent);
      }
    } else if (!range.collapsed) {
      const selectedText = range.toString();
      if (!selectedText) return;

      const mark = document.createElement("mark");
      mark.className = MARK_CLASS;
      mark.textContent = selectedText;

      range.deleteContents();
      range.insertNode(mark);

      const r = document.createRange();
      r.selectNodeContents(mark);
      selection.removeAllRanges();
      selection.addRange(r);
    }

    const newMd = domToMarkdown(editor);
    lastEmittedValueRef.current = newMd;
    pushHistory(newMd, true);
    onChange(newMd);
    updateCursorContext();
  };

  // Insert or convert to Interactive Checklist item (Fix 4, Fix 7H: in-cell safe)
  const insertChecklist = () => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.focus();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) return;

    const enclosingCell = getEnclosingCell(range.startContainer, editor);

    if (enclosingCell) {
      const currentText = range.toString() || (enclosingCell.textContent || "").trim();
      const newItem = createChecklistItem(currentText, false);
      enclosingCell.innerHTML = "";
      enclosingCell.appendChild(newItem);

      const textSpan = newItem.querySelector(".checklist-text") as HTMLElement;
      if (textSpan) {
        placeCursorAtEnd(textSpan);
      }
    } else {
      let containingBlock: Node | null = range.startContainer;
      while (containingBlock && containingBlock.parentNode !== editor) {
        containingBlock = containingBlock.parentNode;
      }

      const currentText = range.toString() || (containingBlock ? (containingBlock.textContent || "").trim() : "");
      const newItem = createChecklistItem(currentText, false);

      if (containingBlock && containingBlock.parentNode === editor) {
        editor.replaceChild(newItem, containingBlock);
      } else {
        editor.appendChild(newItem);
      }

      const textSpan = newItem.querySelector(".checklist-text") as HTMLElement;
      if (textSpan) {
        const r = document.createRange();
        if (currentText) {
          r.selectNodeContents(textSpan);
          r.collapse(false);
        } else {
          r.setStart(textSpan, 0);
          r.collapse(true);
        }
        selection.removeAllRanges();
        selection.addRange(r);
      }
    }

    const newMd = domToMarkdown(editor);
    lastEmittedValueRef.current = newMd;
    pushHistory(newMd, true);
    onChange(newMd);
    updateCursorContext();
  };

  // Smart Numbered List creation (Fix 5, Fix 7H: in-cell safe)
  const insertNumberedList = () => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.focus();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) return;

    const enclosingCell = getEnclosingCell(range.startContainer, editor);

    if (enclosingCell) {
      const currentText = range.toString() || (enclosingCell.textContent || "").trim();
      const nextIndex = getNextNumberedListIndex(range.startContainer);

      if (/^\d+\.\s*/.test(currentText)) {
        placeCursorAtEnd(enclosingCell);
        return;
      }

      if (currentText) {
        enclosingCell.innerHTML = `${nextIndex}. ${convertMarkdownInlinesToHtml(currentText)}`;
      } else {
        enclosingCell.innerHTML = `${nextIndex}. &nbsp;`;
      }
      placeCursorAtEnd(enclosingCell);
    } else {
      let containingBlock: Node | null = range.startContainer;
      while (containingBlock && containingBlock.parentNode !== editor) {
        containingBlock = containingBlock.parentNode;
      }

      const nextIndex = getNextNumberedListIndex(containingBlock);

      if (containingBlock && containingBlock.parentNode === editor) {
        const blockEl = containingBlock as HTMLElement;
        let text = (blockEl.textContent || "").trim();

        if (/^\d+\.\s*/.test(text)) {
          placeCursorAtEnd(blockEl);
          return;
        }

        const p = document.createElement("p");
        p.className = "my-1 leading-relaxed";
        if (text) {
          p.innerHTML = `${nextIndex}. ${convertMarkdownInlinesToHtml(text)}`;
        } else {
          p.innerHTML = `${nextIndex}. &nbsp;`;
        }

        editor.replaceChild(p, containingBlock);
        placeCursorAtEnd(p);
      } else {
        const p = document.createElement("p");
        p.className = "my-1 leading-relaxed";
        p.innerHTML = `${nextIndex}. &nbsp;`;
        editor.appendChild(p);
        placeCursorAtEnd(p);
      }
    }

    const newMd = domToMarkdown(editor);
    lastEmittedValueRef.current = newMd;
    pushHistory(newMd, true);
    onChange(newMd);
    updateCursorContext();
  };

  // Quote Tool (Fix 6, Fix 7H: in-cell safe)
  const toggleQuote = () => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.focus();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) return;

    const enclosingCell = getEnclosingCell(range.startContainer, editor);

    if (enclosingCell) {
      const existingBq = enclosingCell.querySelector("blockquote");
      if (existingBq) {
        const inner = existingBq.innerHTML || "";
        enclosingCell.innerHTML = inner.trim() ? inner : "<br>";
        placeCursorAtEnd(enclosingCell);
      } else {
        const text = range.toString().trim() || (enclosingCell.textContent || "").trim();
        const bq = document.createElement("blockquote");
        bq.className = CELL_BLOCKQUOTE_CLASS;
        bq.innerHTML = text ? convertMarkdownInlinesToHtml(text) : "<br>";
        enclosingCell.innerHTML = "";
        enclosingCell.appendChild(bq);
        placeCursorAtEnd(bq);
      }
    } else {
      let containingBlock: Node | null = range.startContainer;
      while (containingBlock && containingBlock.parentNode !== editor) {
        containingBlock = containingBlock.parentNode;
      }

      const isQuote = containingBlock && (containingBlock as HTMLElement).tagName.toUpperCase() === "BLOCKQUOTE";

      if (isQuote && containingBlock) {
        const blockEl = containingBlock as HTMLElement;
        const innerHtml = blockEl.innerHTML || "";
        const p = document.createElement("p");
        p.className = "my-1 leading-relaxed";
        p.innerHTML = innerHtml.trim() ? innerHtml : "<br>";
        editor.replaceChild(p, containingBlock);
        placeCursorAtEnd(p);
      } else {
        const selectedText = range.toString().trim();
        const bq = document.createElement("blockquote");
        bq.className = BLOCKQUOTE_CLASS;

        if (selectedText) {
          bq.innerHTML = convertMarkdownInlinesToHtml(selectedText);
          if (containingBlock && containingBlock.parentNode === editor && selectedText === (containingBlock.textContent || "").trim()) {
            editor.replaceChild(bq, containingBlock);
          } else {
            range.deleteContents();
            range.insertNode(bq);
          }
          placeCursorAtEnd(bq);
        } else if (containingBlock && containingBlock.parentNode === editor) {
          const blockEl = containingBlock as HTMLElement;
          const rawContent = (blockEl.textContent || "").trim();
          if (rawContent) {
            bq.innerHTML = convertMarkdownInlinesToHtml(rawContent);
          } else {
            bq.innerHTML = "<br>";
          }
          editor.replaceChild(bq, containingBlock);
          placeCursorAtEnd(bq);
        } else {
          bq.innerHTML = "<br>";
          editor.appendChild(bq);
          placeCursorAtEnd(bq);
        }
      }
    }

    const newMd = domToMarkdown(editor);
    lastEmittedValueRef.current = newMd;
    pushHistory(newMd, true);
    onChange(newMd);
    updateCursorContext();
  };

  // Insert a Real Visual Table Block (Fix 7C, 7D, 7F, 7G, 7H)
  const insertTableBlock = (rows: number, cols: number) => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.focus();
    const selection = window.getSelection();
    let range: Range | null = null;
    if (selection && selection.rangeCount > 0) {
      range = selection.getRangeAt(0);
    }

    const headerCells = new Array(cols).fill("");
    const dataRows = Array.from({ length: rows }, () => new Array(cols).fill(""));
    const html = renderInteractiveTableHtml(headerCells, dataRows, "100%");

    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;
    const tableBlockEl = tempDiv.firstElementChild as HTMLElement;
    if (!tableBlockEl) return;

    let containingBlock: Node | null = range ? range.startContainer : null;
    while (containingBlock && containingBlock.parentNode !== editor) {
      containingBlock = containingBlock.parentNode;
    }

    if (containingBlock && containingBlock.parentNode === editor) {
      const text = (containingBlock.textContent || "").trim();
      if (text === "") {
        editor.replaceChild(tableBlockEl, containingBlock);
      } else {
        editor.insertBefore(tableBlockEl, containingBlock.nextSibling);
      }
    } else {
      editor.appendChild(tableBlockEl);
    }

    if (!tableBlockEl.nextElementSibling || tableBlockEl.nextElementSibling.getAttribute("data-type") === "table-block") {
      const nextP = document.createElement("p");
      nextP.className = "my-1 leading-relaxed";
      nextP.innerHTML = "<br>";
      editor.insertBefore(nextP, tableBlockEl.nextSibling);
    }

    // Focus first header cell
    const firstCell = tableBlockEl.querySelector("th.table-cell") as HTMLElement;
    if (firstCell && selection) {
      const r = document.createRange();
      r.setStart(firstCell, 0);
      r.collapse(true);
      selection.removeAllRanges();
      selection.addRange(r);
    }

    const newMd = domToMarkdown(editor);
    lastEmittedValueRef.current = newMd;
    pushHistory(newMd, true);
    onChange(newMd);
    updateCursorContext();
  };

  // Insert a Real Visual Image Block Directly into the Editor (Fix 8 & Book Layout)
  const insertImageBlock = (alt: string, src: string, width: ImageWidth = "100%", align: ImageAlign = "center") => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.focus();
    const selection = window.getSelection();
    let range: Range | null = null;
    if (selection && selection.rangeCount > 0) {
      range = selection.getRangeAt(0);
    }

    const html = renderInteractiveImageHtml(alt, src, width, align);
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;
    const imageBlockEl = tempDiv.firstElementChild as HTMLElement;
    if (!imageBlockEl) return;

    let containingBlock: Node | null = range ? range.startContainer : null;
    while (containingBlock && containingBlock.parentNode !== editor) {
      containingBlock = containingBlock.parentNode;
    }

    if (containingBlock && containingBlock.parentNode === editor) {
      const text = (containingBlock.textContent || "").trim();
      if (text === "") {
        editor.replaceChild(imageBlockEl, containingBlock);
      } else {
        editor.insertBefore(imageBlockEl, containingBlock.nextSibling);
      }
    } else {
      editor.appendChild(imageBlockEl);
    }

    const nextP = document.createElement("p");
    nextP.className = "my-1 leading-relaxed clear-both";
    nextP.innerHTML = "<br>";
    editor.insertBefore(nextP, imageBlockEl.nextSibling);

    placeCursorAtEnd(nextP);

    const newMd = domToMarkdown(editor);
    lastEmittedValueRef.current = newMd;
    pushHistory(newMd, true);
    onChange(newMd);
    updateCursorContext();
  };

  // Position and display Link Action Bar right anchored to the clicked link
  const showLinkActionBar = (linkEl: HTMLAnchorElement) => {
    const href = linkEl.getAttribute("href") || "";
    const textSpan = linkEl.querySelector(".editor-link-text");
    const rawText = textSpan ? textSpan.textContent || href : linkEl.textContent || href;

    const rect = linkEl.getBoundingClientRect();
    const barHeight = 40;
    const barWidth = 320;

    let topPos = rect.top - barHeight - 8;
    if (topPos < 10) {
      topPos = rect.bottom + 8;
    }

    let leftPos = rect.left;
    if (leftPos + barWidth > window.innerWidth - 16) {
      leftPos = Math.max(16, window.innerWidth - barWidth - 16);
    }
    if (leftPos < 16) {
      leftPos = 16;
    }

    setActiveLinkBar({
      element: linkEl,
      url: href,
      text: rawText,
      x: leftPos,
      y: topPos,
    });
  };

  // Handle Link Toolbar Click -> Open Popover with Selection / Active Anchor (Fix 9)
  const handleOpenLinkPopover = () => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.focus();
    const selection = window.getSelection();
    let selectedText = "";
    let range: Range | null = null;
    let enclosingAnchor: HTMLAnchorElement | null = null;

    if (selection && selection.rangeCount > 0) {
      range = selection.getRangeAt(0);
      if (editor.contains(range.commonAncestorContainer)) {
        selectedText = range.toString();
        enclosingAnchor = findEnclosingAnchor(range.startContainer, editor);
      }
    }

    if (enclosingAnchor) {
      activeLinkAnchorRef.current = enclosingAnchor;
      savedLinkRangeRef.current = null;
      const textSpan = enclosingAnchor.querySelector(".editor-link-text");
      const currentText = textSpan ? textSpan.textContent || "" : enclosingAnchor.textContent || "";
      setLinkPopoverState({
        isOpen: true,
        initialText: currentText,
        initialUrl: enclosingAnchor.getAttribute("href") || "",
        isEditing: true,
      });
    } else {
      activeLinkAnchorRef.current = null;
      savedLinkRangeRef.current = range ? range.cloneRange() : null;
      setLinkPopoverState({
        isOpen: true,
        initialText: selectedText,
        initialUrl: "",
        isEditing: false,
      });
    }
  };

  // Insert or Update Link in DOM with visible URL badge (Fix 9)
  const insertOrUpdateLink = (text: string, rawUrl: string) => {
    const editor = editorRef.current;
    if (!editor) return;

    let url = rawUrl.trim();
    if (!/^https?:\/\//i.test(url) && !url.startsWith("/") && !url.startsWith("#")) {
      url = `https://${url}`;
    }

    editor.focus();

    if (activeLinkAnchorRef.current && editor.contains(activeLinkAnchorRef.current)) {
      const a = activeLinkAnchorRef.current;
      a.setAttribute("href", url);
      a.setAttribute("title", url);
      a.setAttribute("data-type", "editor-link");
      a.className = "editor-link inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary font-medium text-xs transition-colors cursor-pointer select-none mx-0.5";
      a.innerHTML = renderLinkInnerHtml(text, url);
      activeLinkAnchorRef.current = null;
      placeCursorAtEnd(a);
    } else {
      const selection = window.getSelection();
      let range: Range | null = savedLinkRangeRef.current;
      if (!range && selection && selection.rangeCount > 0) {
        range = selection.getRangeAt(0);
      }

      const a = document.createElement("a");
      a.setAttribute("href", url);
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener noreferrer");
      a.setAttribute("title", url);
      a.setAttribute("data-type", "editor-link");
      a.className = "editor-link inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary font-medium text-xs transition-colors cursor-pointer select-none mx-0.5";
      a.innerHTML = renderLinkInnerHtml(text, url);

      if (range && editor.contains(range.commonAncestorContainer)) {
        range.deleteContents();
        range.insertNode(a);
        const r = document.createRange();
        r.setStartAfter(a);
        r.collapse(true);
        selection?.removeAllRanges();
        selection?.addRange(r);
      } else {
        const lastChild = editor.lastElementChild;
        if (lastChild && lastChild.tagName.toUpperCase() === "P") {
          lastChild.appendChild(a);
        } else {
          const p = document.createElement("p");
          p.className = "my-1 leading-relaxed";
          p.appendChild(a);
          editor.appendChild(p);
        }
        placeCursorAtEnd(a);
      }
      savedLinkRangeRef.current = null;
    }

    const newMd = domToMarkdown(editor);
    lastEmittedValueRef.current = newMd;
    pushHistory(newMd, true);
    onChange(newMd);
    updateCursorContext();
  };

  // Remove / Unlink Anchor (Fix 9)
  const handleRemoveLink = (anchor: HTMLAnchorElement) => {
    const editor = editorRef.current;
    if (!editor || !editor.contains(anchor)) return;

    const parent = anchor.parentNode;
    if (!parent) return;

    const textSpan = anchor.querySelector(".editor-link-text");
    const rawText = textSpan ? textSpan.textContent || "" : anchor.textContent || "";

    const textNode = document.createTextNode(rawText);
    parent.replaceChild(textNode, anchor);
    setActiveLinkBar(null);

    const newMd = domToMarkdown(editor);
    lastEmittedValueRef.current = newMd;
    pushHistory(newMd, true);
    onChange(newMd);
    updateCursorContext();
  };

  // Insert helper for inline wrapping / text insertion (for emojis, etc.)
  const insertText = (before: string, after: string = "", defaultText: string = "") => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.focus();
    const selection = window.getSelection();
    let selected = "";
    let range: Range | null = null;

    if (selection && selection.rangeCount > 0) {
      range = selection.getRangeAt(0);
      if (editor.contains(range.commonAncestorContainer)) {
        selected = range.toString();
      }
    }

    const textToInsert = `${before}${selected || defaultText}${after}`;

    if (document.queryCommandSupported("insertText")) {
      document.execCommand("insertText", false, textToInsert);
    } else if (range) {
      range.deleteContents();
      const textNode = document.createTextNode(textToInsert);
      range.insertNode(textNode);
      range.setStartAfter(textNode);
      range.setEndAfter(textNode);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }

    const newMd = domToMarkdown(editor);
    lastEmittedValueRef.current = newMd;
    pushHistory(newMd, true);
    onChange(newMd);
    updateCursorContext();
  };

  // Intelligent heading handler
  const setHeadingLevel = (level: 1 | 2 | 3 | 4) => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.focus();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) {
      const newRange = document.createRange();
      newRange.selectNodeContents(editor);
      newRange.collapse(false);
      selection.removeAllRanges();
      selection.addRange(newRange);
    }

    const currentRange = selection.getRangeAt(0);
    const selectedText = currentRange.toString();

    const sizeMap: Record<1 | 2 | 3 | 4, string> = {
      1: "1.5em",
      2: "1.3em",
      3: "1.15em",
      4: "1.05em",
    };

    const blockClassNames: Record<1 | 2 | 3 | 4, string> = {
      1: "text-2xl font-bold text-foreground mt-4 mb-2 leading-tight tracking-tight no-underline",
      2: "text-xl font-semibold text-foreground mt-3 mb-1.5 leading-snug tracking-tight no-underline",
      3: "text-lg font-semibold text-foreground mt-2 mb-1 leading-snug no-underline",
      4: "text-base font-semibold text-foreground mt-1.5 mb-1 leading-snug no-underline",
    };

    const enclosingCell = getEnclosingCell(currentRange.startContainer, editor);

    if (enclosingCell) {
      if (selectedText.trim()) {
        const span = document.createElement("span");
        span.setAttribute("style", `font-size: ${sizeMap[level]}; font-weight: bold; text-decoration: none;`);
        span.textContent = selectedText;

        currentRange.deleteContents();
        currentRange.insertNode(span);

        const r = document.createRange();
        r.selectNodeContents(span);
        selection.removeAllRanges();
        selection.addRange(r);
      } else {
        const cellText = (enclosingCell.textContent || "").trim();
        const span = document.createElement("span");
        span.setAttribute("style", `font-size: ${sizeMap[level]}; font-weight: bold; text-decoration: none;`);
        span.innerHTML = cellText ? convertMarkdownInlinesToHtml(cellText) : "<br>";
        enclosingCell.innerHTML = "";
        enclosingCell.appendChild(span);
        placeCursorAtEnd(span);
      }

      setActiveHeading(level);
      const newMd = domToMarkdown(editor);
      lastEmittedValueRef.current = newMd;
      pushHistory(newMd, true);
      onChange(newMd);
      return;
    }

    let containingBlock: Node | null = currentRange.startContainer;
    while (containingBlock && containingBlock.parentNode !== editor) {
      containingBlock = containingBlock.parentNode;
    }

    const blockFullText = (containingBlock?.textContent || "").trim();
    const isPartialSelection =
      !currentRange.collapsed &&
      selectedText.trim().length > 0 &&
      containingBlock &&
      selectedText.trim() !== blockFullText;

    if (isPartialSelection) {
      let parentSpan: HTMLElement | null = null;
      let currNode: Node | null = currentRange.startContainer;
      while (currNode && currNode !== containingBlock) {
        if (currNode.nodeType === Node.ELEMENT_NODE && (currNode as HTMLElement).tagName.toUpperCase() === "SPAN") {
          parentSpan = currNode as HTMLElement;
          break;
        }
        currNode = currNode.parentNode;
      }

      if (parentSpan && parentSpan.getAttribute("style")) {
        parentSpan.style.fontSize = sizeMap[level];
        parentSpan.style.fontWeight = "bold";
        parentSpan.style.textDecoration = "none";
      } else {
        const span = document.createElement("span");
        span.setAttribute("style", `font-size: ${sizeMap[level]}; font-weight: bold; text-decoration: none;`);
        span.textContent = selectedText;

        currentRange.deleteContents();
        currentRange.insertNode(span);

        const r = document.createRange();
        r.selectNodeContents(span);
        selection.removeAllRanges();
        selection.addRange(r);
      }

      setActiveHeading(level);
      const newMd = domToMarkdown(editor);
      lastEmittedValueRef.current = newMd;
      pushHistory(newMd, true);
      onChange(newMd);
      return;
    }

    const children = Array.from(editor.childNodes);
    const affectedNodes: ChildNode[] = [];

    for (const child of children) {
      if (currentRange.intersectsNode ? currentRange.intersectsNode(child) : true) {
        affectedNodes.push(child);
      }
    }

    let targetNodes = affectedNodes;
    if (targetNodes.length === 0 && containingBlock) {
      targetNodes = [containingBlock as ChildNode];
    }

    if (targetNodes.length === 0) {
      const hTag = `h${level}`;
      const newEl = document.createElement(hTag);
      newEl.className = blockClassNames[level];
      newEl.innerHTML = "<br>";
      editor.appendChild(newEl);

      const r = document.createRange();
      r.setStart(newEl, 0);
      r.collapse(true);
      selection.removeAllRanges();
      selection.addRange(r);
    } else {
      let firstNewNode: HTMLElement | null = null;
      let lastNewNode: HTMLElement | null = null;

      for (const node of targetNodes) {
        const rawContent = (node as HTMLElement).innerHTML || node.textContent || "";
        const hTag = `h${level}`;
        const newEl = document.createElement(hTag);
        newEl.className = blockClassNames[level];

        const cleanContent = rawContent.replace(/^#{1,6}\s*/, "").trim();
        if (cleanContent) {
          newEl.innerHTML = cleanContent;
        } else {
          newEl.innerHTML = "<br>";
        }

        editor.replaceChild(newEl, node);
        if (!firstNewNode) firstNewNode = newEl;
        lastNewNode = newEl;
      }

      if (firstNewNode && lastNewNode) {
        const r = document.createRange();
        r.selectNodeContents(firstNewNode);
        selection.removeAllRanges();
        selection.addRange(r);
      }
    }

    setActiveHeading(level);
    const newMd = domToMarkdown(editor);
    lastEmittedValueRef.current = newMd;
    pushHistory(newMd, true);
    onChange(newMd);
  };

  // Keyboard shortcut listener
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const isMac = typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
    const modifier = isMac ? e.metaKey : e.ctrlKey;

    if (modifier && !e.altKey) {
      if (e.key === "z" || e.key === "Z") {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      } else if (e.key === "y" || e.key === "Y") {
        e.preventDefault();
        handleRedo();
        return;
      } else if (e.key === "b" || e.key === "B") {
        e.preventDefault();
        toggleBold();
        return;
      }
    }

    // Tab key navigation between table cells
    if (e.key === "Tab") {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        let curr: Node | null = range.startContainer;
        let cellEl: HTMLElement | null = null;
        while (curr && curr !== editorRef.current) {
          if (curr.nodeType === Node.ELEMENT_NODE && (curr as HTMLElement).classList.contains("table-cell")) {
            cellEl = curr as HTMLElement;
            break;
          }
          curr = curr.parentNode;
        }

        if (cellEl) {
          e.preventDefault();
          const tableBlock = cellEl.closest('[data-type="table-block"]') as HTMLElement;
          if (tableBlock) {
            const allCells = Array.from(tableBlock.querySelectorAll(".table-cell")) as HTMLElement[];
            const idx = allCells.indexOf(cellEl);
            if (idx !== -1) {
              const targetIdx = e.shiftKey ? idx - 1 : idx + 1;
              if (targetIdx >= 0 && targetIdx < allCells.length) {
                allCells[targetIdx].focus();
                const r = document.createRange();
                r.selectNodeContents(allCells[targetIdx]);
                r.collapse(false);
                selection.removeAllRanges();
                selection.addRange(r);
              } else if (targetIdx >= allCells.length && editorRef.current) {
                let nextEl = tableBlock.nextElementSibling as HTMLElement;
                if (!nextEl || nextEl.getAttribute("data-type") === "table-block" || nextEl.getAttribute("data-type") === "image-block") {
                  const p = document.createElement("p");
                  p.className = "my-1 leading-relaxed";
                  p.innerHTML = "<br>";
                  editorRef.current.insertBefore(p, tableBlock.nextSibling);
                  nextEl = p;
                }
                placeCursorAtEnd(nextEl);
              }
            }
          }
          return;
        }
      }
    }

    // ArrowDown from the last row of a table
    if (e.key === "ArrowDown") {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        let curr: Node | null = range.startContainer;
        let cellEl: HTMLElement | null = null;
        while (curr && curr !== editorRef.current) {
          if (curr.nodeType === Node.ELEMENT_NODE && (curr as HTMLElement).classList.contains("table-cell")) {
            cellEl = curr as HTMLElement;
            break;
          }
          curr = curr.parentNode;
        }

        if (cellEl) {
          const tableBlock = cellEl.closest('[data-type="table-block"]') as HTMLElement;
          const tr = cellEl.closest("tr");
          const tbody = tableBlock?.querySelector("tbody");
          const lastTr = tbody?.lastElementChild;

          if (tr === lastTr && tableBlock && editorRef.current) {
            e.preventDefault();
            let nextEl = tableBlock.nextElementSibling as HTMLElement;
            if (!nextEl || nextEl.getAttribute("data-type") === "table-block" || nextEl.getAttribute("data-type") === "image-block") {
              const p = document.createElement("p");
              p.className = "my-1 leading-relaxed";
              p.innerHTML = "<br>";
              editorRef.current.insertBefore(p, tableBlock.nextSibling);
              nextEl = p;
            }
            placeCursorAtEnd(nextEl);
            return;
          }
        }
      }
    }

    // Enter key handling
    if (e.key === "Enter" && !e.shiftKey) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);

        let cellCurr: Node | null = range.startContainer;
        let tableCellItem: HTMLElement | null = null;
        while (cellCurr && cellCurr !== editorRef.current) {
          if (cellCurr.nodeType === Node.ELEMENT_NODE && (cellCurr as HTMLElement).classList.contains("table-cell")) {
            tableCellItem = cellCurr as HTMLElement;
            break;
          }
          cellCurr = cellCurr.parentNode;
        }

        if (tableCellItem) {
          e.preventDefault();
          document.execCommand("insertLineBreak");
          return;
        }

        let curr: Node | null = range.startContainer;
        let checklistItem: HTMLElement | null = null;
        while (curr && curr !== editorRef.current) {
          if (curr.nodeType === Node.ELEMENT_NODE && (curr as HTMLElement).classList.contains("checklist-item")) {
            checklistItem = curr as HTMLElement;
            break;
          }
          curr = curr.parentNode;
        }

        if (checklistItem && editorRef.current) {
          e.preventDefault();
          const textSpan = checklistItem.querySelector(".checklist-text") as HTMLElement;
          const currentText = textSpan ? (textSpan.textContent || "").trim() : "";

          if (currentText === "") {
            const p = document.createElement("p");
            p.className = "my-1 leading-relaxed";
            p.innerHTML = "<br>";
            editorRef.current.replaceChild(p, checklistItem);
            placeCursorAtEnd(p);
          } else {
            const nextItem = createChecklistItem("", false);
            editorRef.current.insertBefore(nextItem, checklistItem.nextSibling);

            const nextTextSpan = nextItem.querySelector(".checklist-text") as HTMLElement;
            if (nextTextSpan) {
              const r = document.createRange();
              r.setStart(nextTextSpan, 0);
              r.collapse(true);
              selection.removeAllRanges();
              selection.addRange(r);
            }
          }

          const newMd = domToMarkdown(editorRef.current);
          lastEmittedValueRef.current = newMd;
          pushHistory(newMd, false);
          onChange(newMd);
          updateCursorContext();
          return;
        }

        let blockquoteItem: HTMLElement | null = null;
        let bqCurr: Node | null = range.startContainer;
        while (bqCurr && bqCurr !== editorRef.current) {
          if (bqCurr.nodeType === Node.ELEMENT_NODE && (bqCurr as HTMLElement).tagName.toUpperCase() === "BLOCKQUOTE") {
            blockquoteItem = bqCurr as HTMLElement;
            break;
          }
          bqCurr = bqCurr.parentNode;
        }

        if (blockquoteItem && editorRef.current) {
          const rawBqText = (blockquoteItem.textContent || "").trim();
          if (rawBqText === "") {
            e.preventDefault();
            const p = document.createElement("p");
            p.className = "my-1 leading-relaxed";
            p.innerHTML = "<br>";
            editorRef.current.replaceChild(p, blockquoteItem);
            placeCursorAtEnd(p);

            const newMd = domToMarkdown(editorRef.current);
            lastEmittedValueRef.current = newMd;
            pushHistory(newMd, false);
            onChange(newMd);
            updateCursorContext();
            return;
          }
        }

        let containingBlock: Node | null = range.startContainer;
        while (containingBlock && containingBlock.parentNode !== editorRef.current) {
          containingBlock = containingBlock.parentNode;
        }

        if (containingBlock && editorRef.current) {
          const blockEl = containingBlock as HTMLElement;
          const rawText = (blockEl.textContent || "").trim();
          const numberedMatch = rawText.match(/^(\d+)\.\s*(.*)$/);

          if (numberedMatch) {
            e.preventDefault();
            const currentNum = parseInt(numberedMatch[1], 10);
            const itemContent = numberedMatch[2].trim();

            if (itemContent === "") {
              const p = document.createElement("p");
              p.className = "my-1 leading-relaxed";
              p.innerHTML = "<br>";
              editorRef.current.replaceChild(p, containingBlock);
              placeCursorAtEnd(p);
            } else {
              const nextNum = currentNum + 1;
              const nextP = document.createElement("p");
              nextP.className = "my-1 leading-relaxed";
              nextP.innerHTML = `${nextNum}. &nbsp;`;

              editorRef.current.insertBefore(nextP, containingBlock.nextSibling);
              placeCursorAtEnd(nextP);

              let sibling = nextP.nextSibling;
              let expectedNum = nextNum + 1;
              while (sibling) {
                if (sibling.nodeType === Node.ELEMENT_NODE) {
                  const sibEl = sibling as HTMLElement;
                  const sibText = (sibEl.textContent || "").trim();
                  const sibMatch = sibText.match(/^(\d+)\.\s*(.*)$/);
                  if (sibMatch) {
                    const sibContent = sibMatch[2];
                    sibEl.innerHTML = `${expectedNum}. ${convertMarkdownInlinesToHtml(sibContent)}`;
                    expectedNum++;
                    sibling = sibling.nextSibling;
                    continue;
                  }
                }
                break;
              }
            }

            const newMd = domToMarkdown(editorRef.current);
            lastEmittedValueRef.current = newMd;
            pushHistory(newMd, false);
            onChange(newMd);
            updateCursorContext();
            return;
          }
        }
      }
    }
  };

  // Handle right-click context menu on links -> Auto-copy destination URL to clipboard & show Action Bar (Fix 9)
  const handleEditorContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const linkEl = target.closest("a") as HTMLAnchorElement;
    if (linkEl && editorRef.current?.contains(linkEl)) {
      e.preventDefault();
      e.stopPropagation();
      const href = linkEl.getAttribute("href") || "";
      if (href) {
        if (typeof navigator !== "undefined" && navigator.clipboard) {
          navigator.clipboard.writeText(href);
          setCopiedUrl(true);
          setTimeout(() => setCopiedUrl(false), 2000);
        }
      }
      showLinkActionBar(linkEl);
    }
  };

  // Handle direct clicks: Left-Click links (Fix 9), Checkbox toggle, Image controls, Table actions
  const handleEditorClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;

    // 0. Click on Link -> Open in Browser & show Link Action Bar (Fix 9)
    const linkEl = target.closest("a") as HTMLAnchorElement;
    if (linkEl && editorRef.current?.contains(linkEl)) {
      e.preventDefault();
      e.stopPropagation();
      showLinkActionBar(linkEl);
      const href = linkEl.getAttribute("href") || "";
      if (href) {
        openExternalSafe(href);
      }
      return;
    } else {
      setActiveLinkBar(null);
    }

    // A. If clicking in empty bottom area of the editor below all content (Fix 7H, Fix 8)
    if (target === editorRef.current && editorRef.current) {
      const lastChild = editorRef.current.lastElementChild;
      if (
        lastChild &&
        (lastChild.getAttribute("data-type") === "table-block" ||
          lastChild.getAttribute("data-type") === "image-block" ||
          lastChild.classList.contains("table-block-wrapper") ||
          lastChild.classList.contains("image-block-wrapper"))
      ) {
        const p = document.createElement("p");
        p.className = "my-1 leading-relaxed clear-both";
        p.innerHTML = "<br>";
        editorRef.current.appendChild(p);
        placeCursorAtEnd(p);

        const newMd = domToMarkdown(editorRef.current);
        lastEmittedValueRef.current = newMd;
        pushHistory(newMd, false);
        onChange(newMd);
        return;
      }
    }

    // B. Image Alignment Button Click (Fix 8: Left / Center / Right Alignment)
    const imgAlignBtn = target.closest(".image-align-btn");
    if (imgAlignBtn) {
      e.preventDefault();
      e.stopPropagation();
      const newAlign = (imgAlignBtn.getAttribute("data-align") as ImageAlign) || "center";
      const imageWrapper = target.closest('[data-type="image-block"]') as HTMLElement;
      if (imageWrapper && editorRef.current) {
        const currentSize = (imageWrapper.getAttribute("data-image-width") as ImageWidth) || "100%";
        imageWrapper.setAttribute("data-image-align", newAlign);
        imageWrapper.style.cssText = getImageBlockStyle(currentSize, newAlign);

        const allAlignBtns = imageWrapper.querySelectorAll(".image-align-btn");
        allAlignBtns.forEach((b) => {
          if (b.getAttribute("data-align") === newAlign) {
            b.className = "image-align-btn px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer bg-primary text-primary-foreground font-semibold";
          } else {
            b.className = "image-align-btn px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer hover:bg-muted text-muted-foreground hover:text-foreground";
          }
        });

        const newMd = domToMarkdown(editorRef.current);
        lastEmittedValueRef.current = newMd;
        pushHistory(newMd, true);
        onChange(newMd);
      }
      return;
    }

    // C. Image Size Button Click (Fix 8: Live Resizing)
    const imgSizeBtn = target.closest(".image-size-btn");
    if (imgSizeBtn) {
      e.preventDefault();
      e.stopPropagation();
      const newSize = (imgSizeBtn.getAttribute("data-size") as ImageWidth) || "100%";
      const imageWrapper = target.closest('[data-type="image-block"]') as HTMLElement;
      if (imageWrapper && editorRef.current) {
        const currentAlign = (imageWrapper.getAttribute("data-image-align") as ImageAlign) || "center";
        imageWrapper.setAttribute("data-image-width", newSize);
        imageWrapper.style.cssText = getImageBlockStyle(newSize, currentAlign);

        const allBtns = imageWrapper.querySelectorAll(".image-size-btn");
        allBtns.forEach((b) => {
          if (b.getAttribute("data-size") === newSize) {
            b.className = "image-size-btn px-1.5 py-0.5 rounded text-[11px] font-medium border border-border/40 transition-colors cursor-pointer bg-primary text-primary-foreground font-semibold";
          } else {
            b.className = "image-size-btn px-1.5 py-0.5 rounded text-[11px] font-medium border border-border/40 transition-colors cursor-pointer hover:bg-muted text-foreground";
          }
        });

        const newMd = domToMarkdown(editorRef.current);
        lastEmittedValueRef.current = newMd;
        pushHistory(newMd, true);
        onChange(newMd);
      }
      return;
    }

    // D. Image Delete Button Click (Fix 8)
    const imgDelBtn = target.closest(".image-del-btn");
    if (imgDelBtn) {
      e.preventDefault();
      e.stopPropagation();
      const imageWrapper = target.closest('[data-type="image-block"]') as HTMLElement;
      if (imageWrapper && editorRef.current) {
        const editor = editorRef.current;
        let nextFocusTarget: HTMLElement | null = imageWrapper.nextElementSibling as HTMLElement;
        if (!nextFocusTarget) {
          nextFocusTarget = imageWrapper.previousElementSibling as HTMLElement;
        }

        if (editor.children.length <= 1) {
          const p = document.createElement("p");
          p.className = "my-1 leading-relaxed";
          p.innerHTML = "<br>";
          editor.appendChild(p);
          nextFocusTarget = p;
        }

        imageWrapper.remove();

        if (nextFocusTarget) {
          placeCursorAtEnd(nextFocusTarget);
        }

        const newMd = domToMarkdown(editor);
        lastEmittedValueRef.current = newMd;
        pushHistory(newMd, true);
        onChange(newMd);
      }
      return;
    }

    // E. Checklist Checkbox Toggle Click
    const box = target.closest(".checklist-box");
    if (box) {
      e.preventDefault();
      e.stopPropagation();
      const item = box.closest(".checklist-item") as HTMLElement;
      if (item) {
        const currentlyChecked = item.getAttribute("data-checked") === "true";
        const newChecked = !currentlyChecked;
        item.setAttribute("data-checked", String(newChecked));

        const textSpan = item.querySelector(".checklist-text") as HTMLElement;

        if (newChecked) {
          box.className = "checklist-box mt-0.5 h-4.5 w-4.5 min-w-4.5 rounded flex items-center justify-center border select-none cursor-pointer transition-colors bg-primary border-primary text-primary-foreground";
          if (textSpan) {
            textSpan.className = "checklist-text flex-1 outline-none leading-relaxed line-through text-muted-foreground";
          }
        } else {
          box.className = "checklist-box mt-0.5 h-4.5 w-4.5 min-w-4.5 rounded flex items-center justify-center border select-none cursor-pointer transition-colors border-input bg-background hover:bg-muted text-transparent";
          if (textSpan) {
            textSpan.className = "checklist-text flex-1 outline-none leading-relaxed text-foreground";
          }
        }

        if (editorRef.current) {
          const newMd = domToMarkdown(editorRef.current);
          lastEmittedValueRef.current = newMd;
          pushHistory(newMd, true);
          onChange(newMd);
        }
      }
      return;
    }

    // F. Table Delete Entire Table Button Click (Fix 7H)
    const delTableBtn = target.closest(".table-del-table-btn");
    if (delTableBtn) {
      e.preventDefault();
      e.stopPropagation();
      const tableWrapper = target.closest('[data-type="table-block"]') as HTMLElement;
      if (tableWrapper && editorRef.current) {
        const editor = editorRef.current;
        let nextFocusTarget: HTMLElement | null = tableWrapper.nextElementSibling as HTMLElement;
        if (!nextFocusTarget) {
          nextFocusTarget = tableWrapper.previousElementSibling as HTMLElement;
        }

        if (editor.children.length <= 1) {
          const p = document.createElement("p");
          p.className = "my-1 leading-relaxed";
          p.innerHTML = "<br>";
          editor.appendChild(p);
          nextFocusTarget = p;
        }

        tableWrapper.remove();

        if (nextFocusTarget) {
          placeCursorAtEnd(nextFocusTarget);
        }

        const newMd = domToMarkdown(editor);
        lastEmittedValueRef.current = newMd;
        pushHistory(newMd, true);
        onChange(newMd);
      }
      return;
    }

    // G. Table Row & Column Action Button Clicks (Fix 7B, 7C, 7D, 7F, 7G, 7H)
    const addRowBtn = target.closest(".table-add-row-btn");
    const delRowBtn = target.closest(".table-del-row-btn");
    const addColBtn = target.closest(".table-add-col-btn");
    const delColBtn = target.closest(".table-del-col-btn");

    if (addRowBtn || delRowBtn || addColBtn || delColBtn) {
      e.preventDefault();
      e.stopPropagation();

      const tableWrapper = target.closest('[data-type="table-block"]') as HTMLElement;
      if (!tableWrapper || !editorRef.current) return;

      const thead = tableWrapper.querySelector("thead");
      const tbody = tableWrapper.querySelector("tbody");
      if (!thead || !tbody) return;

      const colCount = thead.querySelectorAll("th").length;
      const rows = Array.from(tbody.querySelectorAll("tr"));

      if (addRowBtn) {
        const newTr = document.createElement("tr");
        newTr.className = "hover:bg-muted/15 transition-colors";
        for (let c = 0; c < colCount; c++) {
          const newTd = document.createElement("td");
          newTd.contentEditable = "true";
          newTd.className = "table-cell px-3.5 py-2 text-foreground/90 border border-border outline-none focus:bg-primary/10 transition-colors min-w-[80px] break-words whitespace-normal leading-relaxed";
          newTd.innerHTML = "<br>";
          newTr.appendChild(newTd);
        }
        tbody.appendChild(newTr);
      } else if (delRowBtn) {
        if (rows.length > 1) {
          tbody.removeChild(rows[rows.length - 1]);
        }
      } else if (addColBtn) {
        if (colCount < 8) {
          const headTr = thead.querySelector("tr");
          if (headTr) {
            const newTh = document.createElement("th");
            newTh.contentEditable = "true";
            newTh.className = "table-cell px-3.5 py-2 font-semibold border border-border outline-none focus:bg-primary/10 transition-colors min-w-[80px] break-words whitespace-normal leading-relaxed";
            newTh.innerHTML = "<br>";
            headTr.appendChild(newTh);
          }
          for (const tr of rows) {
            const newTd = document.createElement("td");
            newTd.contentEditable = "true";
            newTd.className = "table-cell px-3.5 py-2 text-foreground/90 border border-border outline-none focus:bg-primary/10 transition-colors min-w-[80px] break-words whitespace-normal leading-relaxed";
            newTd.innerHTML = "<br>";
            tr.appendChild(newTd);
          }
        }
      } else if (delColBtn) {
        if (colCount > 1) {
          const headTr = thead.querySelector("tr");
          if (headTr && headTr.lastElementChild) {
            headTr.removeChild(headTr.lastElementChild);
          }
          for (const tr of rows) {
            if (tr.lastElementChild) {
              tr.removeChild(tr.lastElementChild);
            }
          }
        }
      }

      const newColCount = thead.querySelectorAll("th").length;
      const newRowCount = tbody.querySelectorAll("tr").length;
      const badge = tableWrapper.querySelector(".table-dim-badge");
      if (badge) {
        badge.textContent = `${newColCount} cols × ${newRowCount} rows`;
      }

      const rowDelBtn = tableWrapper.querySelector(".table-del-row-btn");
      if (rowDelBtn) {
        if (newRowCount <= 1) {
          rowDelBtn.classList.add("opacity-40", "cursor-not-allowed");
        } else {
          rowDelBtn.classList.remove("opacity-40", "cursor-not-allowed");
        }
      }

      const colDelBtn = tableWrapper.querySelector(".table-del-col-btn");
      if (colDelBtn) {
        if (newColCount <= 1) {
          colDelBtn.classList.add("opacity-40", "cursor-not-allowed");
        } else {
          colDelBtn.classList.remove("opacity-40", "cursor-not-allowed");
        }
      }

      const newMd = domToMarkdown(editorRef.current);
      lastEmittedValueRef.current = newMd;
      pushHistory(newMd, true);
      onChange(newMd);
      return;
    }

    updateCursorContext();
  };

  // Image Upload Handler (Fix 8)
  const handleImageFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Image is larger than 5MB. Please choose a smaller image.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        const altText = file.name.replace(/\.[^/.]+$/, "") || "Image";
        insertImageBlock(altText, dataUrl, "100%", "center");
      }
    };
    reader.readAsDataURL(file);
  };

  // Drag & Drop Image directly onto Editor (Fix 8)
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("image/")) {
        e.preventDefault();
        handleImageFile(file);
      }
    }
  };

  // Calculate Metrics
  const words = value.trim() ? value.trim().split(/\s+/).length : 0;
  const chars = value.length;
  const readTimeMin = Math.max(1, Math.ceil(words / 200));

  return (
    <div className={`rounded-2xl border border-border bg-card shadow-xs flex flex-col overflow-hidden ${className}`}>
      {/* 1. Main Focused V1 Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 p-2 bg-muted/40 border-b border-border text-foreground select-none">
        {/* Left/Center Toolbar Tools */}
        <div className="flex flex-wrap items-center gap-0.5">
          {/* History: Undo / Redo */}
          <button
            type="button"
            title="Undo (Ctrl+Z)"
            disabled={!canUndo}
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleUndo}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              canUndo
                ? "hover:bg-muted text-foreground"
                : "opacity-40 text-muted-foreground cursor-not-allowed"
            }`}
          >
            <Undo2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Redo (Ctrl+Y / Ctrl+Shift+Z)"
            disabled={!canRedo}
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleRedo}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              canRedo
                ? "hover:bg-muted text-foreground"
                : "opacity-40 text-muted-foreground cursor-not-allowed"
            }`}
          >
            <Redo2 className="h-4 w-4" />
          </button>

          <div className="h-4 w-[1px] bg-border mx-1" />

          {/* Headings: H1, H2, H3, H4 */}
          <button
            type="button"
            title="H1 Heading"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setHeadingLevel(1)}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              activeHeading === 1
                ? "bg-primary/20 text-primary font-bold shadow-2xs"
                : "hover:bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            <Heading1 className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="H2 Heading"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setHeadingLevel(2)}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              activeHeading === 2
                ? "bg-primary/20 text-primary font-bold shadow-2xs"
                : "hover:bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            <Heading2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="H3 Heading"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setHeadingLevel(3)}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              activeHeading === 3
                ? "bg-primary/20 text-primary font-bold shadow-2xs"
                : "hover:bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            <Heading3 className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="H4 Heading"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setHeadingLevel(4)}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              activeHeading === 4
                ? "bg-primary/20 text-primary font-bold shadow-2xs"
                : "hover:bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            <Heading4 className="h-4 w-4" />
          </button>

          <div className="h-4 w-[1px] bg-border mx-1" />

          {/* Text: Bold & Highlight */}
          <button
            type="button"
            title="Bold (Ctrl+B)"
            onMouseDown={(e) => e.preventDefault()}
            onClick={toggleBold}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isBoldActive
                ? "bg-primary/20 text-primary font-bold shadow-2xs"
                : "hover:bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            <Bold className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Highlight (==text==)"
            onMouseDown={(e) => e.preventDefault()}
            onClick={toggleHighlight}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isHighlightActive
                ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold shadow-2xs"
                : "hover:bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            <Highlighter className="h-4 w-4" />
          </button>

          <div className="h-4 w-[1px] bg-border mx-1" />

          {/* Structure: Checklist, Numbered List, Quote, Table */}
          <button
            type="button"
            title="Interactive Checklist (- [ ] )"
            onMouseDown={(e) => e.preventDefault()}
            onClick={insertChecklist}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <CheckSquare className="h-4 w-4 text-primary" />
          </button>
          <button
            type="button"
            title="Numbered List (1. )"
            onMouseDown={(e) => e.preventDefault()}
            onClick={insertNumberedList}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isNumberedActive
                ? "bg-primary/20 text-primary font-bold shadow-2xs"
                : "hover:bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            <ListOrdered className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Quote (> )"
            onMouseDown={(e) => e.preventDefault()}
            onClick={toggleQuote}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isQuoteActive
                ? "bg-primary/20 text-primary font-bold shadow-2xs"
                : "hover:bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            <Quote className="h-4 w-4" />
          </button>

          {/* Table Config Popover (Fix 7A, 7B, 7C, 7D, 7F, 7G, 7H) */}
          <div className="relative" ref={tablePopoverRef}>
            <button
              type="button"
              title="Insert Table"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setShowTablePopover(!showTablePopover)}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                showTablePopover
                  ? "bg-primary/20 text-primary font-bold shadow-2xs"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <TableIcon className="h-4 w-4" />
            </button>
            {showTablePopover && (
              <TableConfigPopover
                onClose={() => setShowTablePopover(false)}
                onInsert={(rows, cols) => {
                  setShowTablePopover(false);
                  insertTableBlock(rows, cols);
                }}
              />
            )}
          </div>

          <div className="h-4 w-[1px] bg-border mx-1" />

          {/* Insert: Link Config Popover (Fix 9) */}
          <div className="relative" ref={linkPopoverRef}>
            <button
              type="button"
              title="Insert or Edit Link [title](url)"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleOpenLinkPopover}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                linkPopoverState.isOpen
                  ? "bg-primary/20 text-primary font-bold shadow-2xs"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <LinkIcon className="h-4 w-4" />
            </button>
            {linkPopoverState.isOpen && (
              <LinkConfigPopover
                initialText={linkPopoverState.initialText}
                initialUrl={linkPopoverState.initialUrl}
                isEditing={linkPopoverState.isEditing}
                onClose={() => setLinkPopoverState((prev) => ({ ...prev, isOpen: false }))}
                onInsert={(text, url) => {
                  setLinkPopoverState((prev) => ({ ...prev, isOpen: false }));
                  insertOrUpdateLink(text, url);
                }}
              />
            )}
          </div>

          {/* Hidden Image Input & Visual Image Block Inserter (Fix 8) */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleImageFile(e.target.files[0]);
                e.target.value = "";
              }
            }}
          />
          <button
            type="button"
            title="Insert Local Image"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <ImageIcon className="h-4 w-4 text-emerald-500" />
          </button>

          {/* Emoji Picker Popover */}
          <div className="relative">
            <button
              type="button"
              title="Insert Icons & Emojis"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex items-center gap-1"
            >
              <Smile className="h-4 w-4 text-amber-500" />
            </button>
            <EmojiPickerPopover
              isOpen={showEmojiPicker}
              onClose={() => setShowEmojiPicker(false)}
              onSelect={(item) => insertText(item, "")}
            />
          </div>
        </div>

        {/* Right Toolbar: Compact Multilingual Language Selector */}
        <div className="relative ml-auto" ref={langDropdownRef}>
          <button
            type="button"
            onClick={() => setShowLangDropdown(!showLangDropdown)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border bg-background hover:bg-muted text-foreground text-xs font-medium transition-all shadow-2xs cursor-pointer"
            title="Change primary prompt language and text direction"
          >
            <Globe className="h-3.5 w-3.5 text-primary" />
            <span className="font-medium text-muted-foreground">Language:</span>
            <span className="font-semibold text-foreground">{currentLangOption.nativeName}</span>
            <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform duration-200 ${showLangDropdown ? "rotate-180" : ""}`} />
          </button>

          {/* Language Selector Dropdown Menu */}
          {showLangDropdown && (
            <div className="absolute right-0 top-full mt-1.5 w-56 max-h-72 overflow-y-auto rounded-xl border border-border bg-popover shadow-lg z-50 p-1.5 text-xs text-popover-foreground scrollbar-thin">
              <div className="px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/50 mb-1">
                Select Prompt Language
              </div>
              <div className="space-y-0.5">
                {SUPPORTED_LANGUAGES.map((lang) => {
                  const isSelected = (language || "en").toLowerCase() === lang.code.toLowerCase();
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => handleSelectLanguage(lang)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-primary/15 text-primary font-semibold"
                          : "hover:bg-muted text-foreground"
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{lang.nativeName}</span>
                        {lang.code !== "auto" && lang.name !== lang.nativeName && (
                          <span className="text-[10px] text-muted-foreground">{lang.name}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] uppercase font-mono px-1 py-0.2 rounded bg-muted text-muted-foreground border border-border/40">
                          {lang.direction}
                        </span>
                        {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Single Unified Editor Workspace Body */}
      <div className="relative flex flex-col flex-1 bg-background">
        {(!value || value.trim() === "") && (
          <div
            className="absolute top-5 left-5 pointer-events-none text-muted-foreground/60 text-sm select-none"
            dir={activeDirection}
          >
            {placeholder}
          </div>
        )}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={() => {
            if (editorRef.current) {
              const newMd = domToMarkdown(editorRef.current);
              lastEmittedValueRef.current = newMd;
              pushHistory(newMd, false);
              onChange(newMd);
              updateCursorContext();
            }
          }}
          onKeyDown={handleKeyDown}
          onKeyUp={updateCursorContext}
          onClick={handleEditorClick}
          onContextMenu={handleEditorContextMenu}
          onDrop={handleDrop}
          dir={activeDirection}
          className={`w-full p-5 text-sm leading-relaxed bg-transparent text-foreground focus:outline-none scrollbar-thin overflow-y-auto ${minHeight}`}
          style={{ minHeight: "380px" }}
        />

        {/* 3. Floating Contextual Link Action Toolbar (Fix 9) */}
        {activeLinkBar && (
          <div
            style={{ left: activeLinkBar.x, top: activeLinkBar.y }}
            onMouseDown={(e) => e.stopPropagation()}
            className="fixed z-50 flex items-center gap-1.5 bg-popover/95 backdrop-blur-md border border-border text-popover-foreground shadow-2xl rounded-xl px-2 py-1 text-xs select-none animate-in fade-in zoom-in-95 duration-100 max-w-[95vw]"
          >
            {/* Direct Clickable Destination URL Badge */}
            <button
              type="button"
              onClick={() => {
                openExternalSafe(activeLinkBar.url);
                setActiveLinkBar(null);
              }}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary font-mono text-[11px] max-w-[180px] truncate border border-primary/25 transition-colors cursor-pointer"
              title={`Open ${activeLinkBar.url} in browser`}
            >
              <LinkIcon className="h-3 w-3 shrink-0" />
              <span className="truncate">{activeLinkBar.url}</span>
            </button>

            {/* Open in Browser Action */}
            <button
              type="button"
              onClick={() => {
                openExternalSafe(activeLinkBar.url);
                setActiveLinkBar(null);
              }}
              className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-muted text-foreground transition-colors cursor-pointer text-xs font-semibold"
              title="Open link in browser"
            >
              <ExternalLink className="h-3.5 w-3.5 text-primary" />
              <span>Open</span>
            </button>

            <div className="h-3.5 w-[1px] bg-border mx-0.5" />

            {/* Copy Link Action */}
            <button
              type="button"
              onClick={() => {
                if (typeof navigator !== "undefined" && navigator.clipboard) {
                  navigator.clipboard.writeText(activeLinkBar.url);
                }
                setActiveLinkBar(null);
              }}
              className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-muted text-foreground transition-colors cursor-pointer text-xs font-medium"
              title="Copy link address"
            >
              <Copy className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Copy</span>
            </button>

            {/* Edit Link Action */}
            <button
              type="button"
              onClick={() => {
                activeLinkAnchorRef.current = activeLinkBar.element;
                savedLinkRangeRef.current = null;
                setLinkPopoverState({
                  isOpen: true,
                  initialText: activeLinkBar.text,
                  initialUrl: activeLinkBar.url,
                  isEditing: true,
                });
                setActiveLinkBar(null);
              }}
              className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-muted text-foreground transition-colors cursor-pointer text-xs font-medium"
              title="Edit link"
            >
              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Edit</span>
            </button>

            {/* Remove / Unlink Action */}
            <button
              type="button"
              onClick={() => {
                handleRemoveLink(activeLinkBar.element);
                setActiveLinkBar(null);
              }}
              className="p-1 rounded-lg hover:bg-destructive/15 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
              title="Remove link"
            >
              <Unlink className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* 4. Footer Status Bar (Language & Script, Word & Char Counts) */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-muted/30 border-t border-border text-xs text-muted-foreground select-none">
        <div className="flex items-center gap-2">
          <Globe className="h-3.5 w-3.5 text-primary" />
          <span>
            Script: <strong className="text-foreground font-semibold">{detectedLang.scriptName}</strong>
          </span>
          {detectedLang.isMixed && (
            <span className="text-primary text-[10px] font-semibold bg-primary/10 px-2 py-0.5 rounded-full">
              Mixed Direction
            </span>
          )}
          <span className="text-muted-foreground/40">•</span>
          <span className="uppercase font-mono text-[11px] bg-muted px-1.5 py-0.5 rounded border border-border">
            {activeDirection.toUpperCase()}
          </span>
        </div>

        <div className="flex items-center gap-3 font-mono text-[11px]">
          <span>{words} words</span>
          <span>{chars} characters</span>
          <span className="text-muted-foreground/60 hidden sm:inline">~{readTimeMin} min read</span>
        </div>
      </div>
    </div>
  );
}
