/**
 * Dependency-free PDF writer.
 *
 * The examiner dossier has to be generated on the operator's own machine with
 * nothing phoning home, so this emits PDF 1.4 directly rather than driving a
 * headless browser: no Chromium download, no render service, no fonts to ship.
 * It uses the two base-14 fonts every conforming reader already has, which is
 * why the text metrics below are hard-coded — they are the standard Helvetica
 * widths, and wrapping is only correct if the writer knows them.
 */

const HELVETICA_WIDTHS = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556,
  556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667,
  611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667,
  667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500,
  222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
];

const HELVETICA_BOLD_WIDTHS = [
  278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556,
  556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611, 975, 722, 722, 722, 722, 667,
  611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667,
  667, 611, 333, 278, 333, 584, 556, 333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556,
  278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584,
];

export type PdfFont = "regular" | "bold";

function widthOf(text: string, font: PdfFont, size: number): number {
  const table = font === "bold" ? HELVETICA_BOLD_WIDTHS : HELVETICA_WIDTHS;
  let units = 0;
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    const idx = code - 32;
    units += idx >= 0 && idx < table.length ? table[idx]! : 556;
  }
  return (units / 1000) * size;
}

/** Wrap a paragraph to a pixel width using real glyph metrics. */
export function wrapText(text: string, font: PdfFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (widthOf(candidate, font, size) <= maxWidth || !current) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function escapeText(text: string): string {
  return text
    .replaceAll("\\", "\\\\")
    .replaceAll("(", "\\(")
    .replaceAll(")", "\\)")
    // Base-14 Helvetica is WinAnsi; fold the typographic characters we emit.
    .replaceAll("—", "-")
    .replaceAll("–", "-")
    .replaceAll("’", "'")
    .replaceAll("“", '"')
    .replaceAll("”", '"')
    .replaceAll("·", "-")
    .replaceAll("→", "->")
    .replaceAll("≥", ">=")
    .replaceAll("≤", "<=")
    // Anything still outside WinAnsi would render as garbage — drop it.
    .replaceAll(/[^\x20-\x7e]/g, "");
}

export const PAGE_WIDTH = 612;
export const PAGE_HEIGHT = 792;
export const MARGIN = 54;
export const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

type Op = string;

/**
 * Page builder with a text cursor. Callers write top-down in points from the
 * top margin; the builder flips into PDF's bottom-left origin on emit.
 */
export class PdfPage {
  private ops: Op[] = [];
  cursorY = MARGIN;

  private moveTo(y: number): number {
    return PAGE_HEIGHT - y;
  }

  get remaining(): number {
    return PAGE_HEIGHT - MARGIN - this.cursorY;
  }

  text(
    content: string,
    options: { font?: PdfFont; size?: number; x?: number; gray?: number } = {},
  ): void {
    const font = options.font ?? "regular";
    const size = options.size ?? 10;
    const x = MARGIN + (options.x ?? 0);
    const gray = options.gray ?? 0;
    this.cursorY += size;
    this.ops.push(
      `BT ${gray} g /${font === "bold" ? "F2" : "F1"} ${size} Tf 1 0 0 1 ${x.toFixed(2)} ${this.moveTo(this.cursorY).toFixed(2)} Tm (${escapeText(content)}) Tj ET`,
    );
  }

  paragraph(
    content: string,
    options: { font?: PdfFont; size?: number; leading?: number; x?: number; width?: number; gray?: number } = {},
  ): void {
    const font = options.font ?? "regular";
    const size = options.size ?? 10;
    const leading = options.leading ?? size * 1.45;
    const width = options.width ?? CONTENT_WIDTH - (options.x ?? 0);
    for (const line of wrapText(content, font, size, width)) {
      this.text(line, { font, size, x: options.x, gray: options.gray });
      this.cursorY += leading - size;
    }
  }

  space(points: number): void {
    this.cursorY += points;
  }

  rule(options: { gray?: number; thickness?: number } = {}): void {
    const gray = options.gray ?? 0.75;
    const thickness = options.thickness ?? 0.5;
    this.cursorY += 4;
    const y = this.moveTo(this.cursorY).toFixed(2);
    this.ops.push(
      `q ${gray} G ${thickness} w ${MARGIN} ${y} m ${(PAGE_WIDTH - MARGIN).toFixed(2)} ${y} l S Q`,
    );
    this.cursorY += 6;
  }

  /** Filled band used for the verdict callout. */
  box(height: number, gray: number): void {
    const top = this.moveTo(this.cursorY);
    this.ops.push(
      `q ${gray} g ${MARGIN} ${(top - height).toFixed(2)} ${CONTENT_WIDTH} ${height} re f Q`,
    );
  }

  /** Label on the left, value right-aligned to the content edge. */
  row(label: string, value: string, options: { size?: number } = {}): void {
    const size = options.size ?? 9.5;
    this.cursorY += size;
    const y = this.moveTo(this.cursorY).toFixed(2);
    const valueX = PAGE_WIDTH - MARGIN - widthOf(value, "bold", size);
    this.ops.push(
      `BT 0.35 g /F1 ${size} Tf 1 0 0 1 ${MARGIN} ${y} Tm (${escapeText(label)}) Tj ET`,
      `BT 0 g /F2 ${size} Tf 1 0 0 1 ${valueX.toFixed(2)} ${y} Tm (${escapeText(value)}) Tj ET`,
    );
    this.cursorY += 5;
  }

  build(): string {
    return this.ops.join("\n");
  }
}

/** Serialise pages into a complete PDF document. */
export function renderPdf(pages: PdfPage[], title: string): Uint8Array {
  const objects: string[] = [];
  const pageCount = Math.max(1, pages.length);
  // 1 catalog, 2 pages, 3/4 fonts, then (page, content) per page.
  const pageObjIds = pages.map((_, i) => 5 + i * 2);

  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  objects.push(
    `<< /Type /Pages /Kids [${pageObjIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageCount} >>`,
  );
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  objects.push(
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
  );

  pages.forEach((page, index) => {
    const contentId = pageObjIds[index]! + 1;
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`,
    );
    const stream = page.build();
    objects.push(`<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`);
  });

  const infoId = objects.length + 1;
  objects.push(
    `<< /Title (${escapeText(title)}) /Producer (Sovereign Audio Protocol) /Creator (Sovereign Audio Protocol) >>`,
  );

  const chunks: string[] = ["%PDF-1.4\n"];
  const offsets: number[] = [];
  let cursor = chunks[0]!.length;

  objects.forEach((body, index) => {
    offsets.push(cursor);
    const serialised = `${index + 1} 0 obj\n${body}\nendobj\n`;
    chunks.push(serialised);
    cursor += Buffer.byteLength(serialised, "latin1");
  });

  const xrefOffset = cursor;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    xref += `${offset.toString().padStart(10, "0")} 00000 n \n`;
  }
  xref += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info ${infoId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  chunks.push(xref);

  return new Uint8Array(Buffer.from(chunks.join(""), "latin1"));
}
