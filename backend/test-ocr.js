const fs = require('fs');
const express = require('express');
const ocrRouter = require('./src/routes/ocr');

const text = `2x Fries — $10.00
Garlic Bread — $5.00
Chicken Biryani — $15.00
Subtotal        30.00
Tax              2.50
Total           32.50`;

fs.writeFileSync('test-receipt.txt', text);

const app = express();
app.use('/api/ocr', ocrRouter);
const server = app.listen(0, async () => {
  try {
    const form = new FormData();
    form.append(
      'receipt',
      new Blob([fs.readFileSync('test-receipt.txt')], { type: 'text/plain' }),
      'test-receipt.txt',
    );
    const response = await fetch(
      `http://127.0.0.1:${server.address().port}/api/ocr/extract`,
      { method: 'POST', body: form },
    );
    console.log(await response.text());
  } finally {
    server.close();
  }
});
