const { createWorker } = require('tesseract.js');

const OCRService = {
  /**
   * Extract line items from a receipt image using Tesseract.js.
   * Returns array of { name, price, rawLine }.
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

      // Split into lines, filter empty
      const lines = text.split('\n').filter((line) => line.trim().length > 0);
      const items = [];
      const SKIP_KEYWORDS =
        /subtotal|^total$|grand total|tax|tip|cash|change|tendered|balance|card|amount due|thank you/i;

      for (const line of lines) {
        // Skip header/footer/separator lines
        if (
          line.startsWith('-') ||
          line.startsWith('|') ||
          line.startsWith('=')
        ) {
          continue;
        }
        if (SKIP_KEYWORDS.test(line)) continue;

        // Find ALL number-like tokens on the line
        // Handles: ₹150, $3.50, 150.00, 150,00
        const allMatches = [...line.matchAll(/[₹$]?\s*([0-9,]+\.?[0-9]*)/g)];
        if (allMatches.length === 0) continue;

        // Take the LAST match — prices are printed at the end of receipt lines
        const lastMatch = allMatches[allMatches.length - 1];
        const priceStr = lastMatch[1].replace(/,/g, '');
        const price = parseFloat(priceStr);
        if (isNaN(price) || price <= 0) continue;

        // Extract name: everything BEFORE the last match
        let name = line.slice(0, lastMatch.index).trim();

        // Clean up: remove trailing currency symbols and whitespace
        name = name.replace(/[₹$\-—:|]\s*$/, '').trim();

        if (!name || name.length < 2) continue;

        items.push({ name, price, rawLine: line });
      }

      return items;
    } finally {
      await worker.terminate();
    }
  },
};

module.exports = OCRService;
