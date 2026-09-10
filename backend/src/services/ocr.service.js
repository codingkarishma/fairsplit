const { createWorker } = require('tesseract.js');

const SKIP_KEYWORDS =
  /subtotal|^\s*total\b|grand total|tax|tip|cash|change|tendered|balance|card|amount due|thank you|receipt|table|server|guests|entry|contactless|approved|ref:|status|phone|www\.|invalid date|gstin|hsn|invoice no|counter|cashier|customer id|customer name|mobile no|tax invoice|tender|gross total|total discount|total invoice amount|total received|change due|no of items|total qty|cgst|sgst|cess|place of supply|registered office|return policy/i;
const SKIP_PATTERNS = [
  /^\s*\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\s*$/,
  /https?:\/\/|www\./i,
  /^\s*(time|date|ref|auth|approval)\s*:/i,
];
const PRICE_PATTERN = /[₹$€£]?\s*([0-9,]+\.?[0-9]*)/g;

function parseReceiptLines(lines, { skipDecorativeLines = false } = {}) {
  return lines.reduce((items, line) => {
    if (
      !line.trim() ||
      SKIP_KEYWORDS.test(line) ||
      SKIP_PATTERNS.some((pattern) => pattern.test(line))
    )
      return items;
    if (skipDecorativeLines && /^[-|=]/.test(line)) {
      return items;
    }

    const matches = [...line.matchAll(PRICE_PATTERN)];
    if (!matches.length) return items;
    const lastMatch = matches[matches.length - 1];
    const price = parseFloat(lastMatch[1].replace(/,/g, ''));
    const priceCents = Math.round(price * 100);
    if (isNaN(price) || priceCents <= 0) return items;

    const name = line
      .slice(0, lastMatch.index)
      .trim()
      .replace(/[₹$\-—:|]\s*$/, '')
      .trim();
    if (name.length < 2) return items;
    items.push({ name, priceCents, rawLine: line });
    return items;
  }, []);
}

const OCRService = {
  parseReceiptLines,

  /**
   * Extract line items from a receipt image using Tesseract.js.
   * Returns array of { name, priceCents, rawLine }.
   *
   * IMPORTANT: OCR is not perfect — this is a heuristic, not a guarantee.
   * The host review/edit screen is MANDATORY (per design doc).
   *
   * Strategy: Find ALL numbers on each line, take the LAST one as the price.
   * Receipts consistently put prices at the end of the line.
   */
  async extractItems(imagePath) {
    const worker = await createWorker('eng');

    try {
      const {
        data: { text },
      } = await worker.recognize(imagePath);

      return parseReceiptLines(text.split('\n'), { skipDecorativeLines: true });
    } finally {
      await worker.terminate();
    }
  },
};

module.exports = OCRService;
