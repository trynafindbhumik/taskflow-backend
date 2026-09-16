// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse = require('pdf-parse');

export interface ParsedDocument {
  filename: string;
  text: string;
  pageCount?: number;
}

/**
 * Parses attached file buffers or base64 data to extract plain text.
 */
export async function parseDocument(
  filename: string,
  contentBase64OrBuffer: string | Buffer,
  mimeType?: string
): Promise<ParsedDocument> {
  const buffer = Buffer.isBuffer(contentBase64OrBuffer)
    ? contentBase64OrBuffer
    : Buffer.from(
        contentBase64OrBuffer.replace(/^data:[^;]+;base64,/, ''),
        'base64'
      );

  const isPdf =
    filename.toLowerCase().endsWith('.pdf') ||
    (mimeType && mimeType.includes('pdf'));

  if (isPdf) {
    try {
      let extractedText = '';
      let pageCount: number | undefined;

      const pdfModule =
        typeof pdfParse === 'function'
          ? pdfParse
          : pdfParse?.PDFParse
          ? pdfParse
          : pdfParse?.default;

      if (typeof pdfModule === 'function') {
        const parsed = await pdfModule(buffer);
        extractedText = parsed.text ? parsed.text.trim() : '';
        pageCount = parsed.numpages;
      } else if (pdfModule && pdfModule.PDFParse) {
        const parser = new pdfModule.PDFParse({ data: buffer });
        try {
          const parsed = await parser.getText();
          extractedText = parsed.text ? parsed.text.trim() : '';
          pageCount = parsed.total ?? parsed.pages?.length;
        } finally {
          await parser.destroy?.();
        }
      } else {
        throw new Error('Unsupported pdf-parse module format');
      }

      return {
        filename,
        text: extractedText,
        pageCount,
      };
    } catch (err) {
      console.error(`Failed to parse PDF file ${filename}:`, err);
      return {
        filename,
        text: `[Error: Failed to parse text content from PDF file "${filename}"]`,
      };
    }
  }

  // Fallback for TXT, MD, JSON, CSV files
  const textContent = buffer.toString('utf-8').trim();
  return {
    filename,
    text: textContent,
  };
}
