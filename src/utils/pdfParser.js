import pdfParse from 'pdf-parse';
import fs from 'fs';

export async function parsePDF(pdfPath) {
  try {
    const dataBuffer = fs.readFileSync(pdfPath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  } catch (error) {
    throw new Error(`Failed to parse PDF: ${error.message}`);
  }
}