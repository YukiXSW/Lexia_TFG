const fs = require('fs');
const pdf = require('pdf-parse');

const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: node extract-pdf.js <pdf-file>');
  process.exit(1);
}

const dataBuffer = fs.readFileSync(filePath);
pdf(dataBuffer).then(data => {
  console.log(data.text);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
