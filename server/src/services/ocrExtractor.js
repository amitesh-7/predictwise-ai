const Tesseract = require('tesseract.js');

/**
 * OCR Extraction Service
 * Handles text extraction from scanned PDFs and images
 * Uses pdf2json for text extraction and Tesseract.js for OCR on images
 * Optimized for Vercel serverless deployment
 */

let worker = null;

/**
 * Initialize Tesseract worker
 */
async function initializeWorker() {
  if (!worker) {
    console.log('🔧 Initializing Tesseract OCR worker...');
    worker = await Tesseract.createWorker('eng', 1, {
      logger: m => {
        if (m.status === 'recognizing text' && m.progress > 0) {
          const pct = Math.round(m.progress * 100);
          if (pct % 20 === 0) {
            process.stdout.write(`\r   OCR Progress: ${pct}%`);
          }
        }
      }
    });
    console.log('\n✅ Tesseract OCR worker ready');
  }
  return worker;
}

/**
 * Extract text from image buffer using OCR
 */
async function extractTextFromImage(imageBuffer) {
  try {
    const w = await initializeWorker();
    const { data: { text, confidence } } = await w.recognize(imageBuffer);
    
    return {
      text: cleanOCRText(text),
      confidence: Math.round(confidence),
      success: true
    };
  } catch (error) {
    console.error('OCR extraction error:', error.message);
    return {
      text: '',
      confidence: 0,
      success: false,
      error: error.message
    };
  }
}

/**
 * Extract text from PDF using pdf2json (for text-based PDFs)
 */
async function extractTextWithPdf2Json(pdfBuffer) {
  return new Promise((resolve) => {
    try {
      const PDFParser = require('pdf2json');
      const pdfParser = new PDFParser();
      
      pdfParser.on('pdfParser_dataError', errData => {
        resolve({ text: '', success: false, error: errData.parserError });
      });
      
      pdfParser.on('pdfParser_dataReady', pdfData => {
        try {
          const text = pdfParser.getRawTextContent();
          const pages = pdfData.Pages || [];
          resolve({
            text: cleanOCRText(text || ''),
            numPages: pages.length,
            success: true,
            method: 'pdf2json'
          });
        } catch (e) {
          resolve({ text: '', success: false, error: e.message });
        }
      });
      
      pdfParser.parseBuffer(pdfBuffer);
    } catch (error) {
      resolve({ text: '', success: false, error: error.message });
    }
  });
}

/**
 * Extract text using pdf-parse library
 */
async function extractTextWithPdfParse(pdfBuffer) {
  try {
    const pdfParse = require('pdf-parse');
    const data = await pdfParse(pdfBuffer);
    
    return {
      text: cleanOCRText(data.text || ''),
      numPages: data.numpages,
      success: data.text && data.text.length > 50,
      method: 'pdf-parse'
    };
  } catch (error) {
    return { text: '', success: false, error: error.message };
  }
}

/**
 * Extract text from scanned PDF
 * Uses multiple text extraction methods - no image conversion needed for Vercel
 */
async function extractTextFromScannedPDF(pdfBuffer, options = {}) {
  console.log('📄 Processing PDF for text extraction...');
  
  try {
    // Method 1: Try pdf-parse first (most reliable for text PDFs)
    console.log('   Trying pdf-parse extraction...');
    const pdfParseResult = await extractTextWithPdfParse(pdfBuffer);
    
    if (pdfParseResult.success && pdfParseResult.text.length > 200) {
      console.log(`✅ pdf-parse extracted ${pdfParseResult.text.length} characters`);
      return {
        text: pdfParseResult.text,
        success: true,
        pagesProcessed: pdfParseResult.numPages,
        avgConfidence: 95,
        method: 'pdf-parse'
      };
    }
    
    // Method 2: Try pdf2json as fallback
    console.log('   Trying pdf2json extraction...');
    const pdf2jsonResult = await extractTextWithPdf2Json(pdfBuffer);
    
    if (pdf2jsonResult.success && pdf2jsonResult.text && pdf2jsonResult.text.length > 200) {
      console.log(`✅ pdf2json extracted ${pdf2jsonResult.text.length} characters`);
      return {
        text: pdf2jsonResult.text,
        success: true,
        pagesProcessed: pdf2jsonResult.numPages,
        avgConfidence: 90,
        method: 'pdf2json'
      };
    }
    
    // Combine results if both have partial text
    const combinedText = [pdfParseResult.text, pdf2jsonResult.text]
      .filter(t => t && t.length > 0)
      .join('\n\n');
    
    if (combinedText.length > 100) {
      console.log(`✅ Combined extraction: ${combinedText.length} characters`);
      return {
        text: combinedText,
        success: true,
        pagesProcessed: pdfParseResult.numPages || pdf2jsonResult.numPages || 1,
        avgConfidence: 80,
        method: 'combined'
      };
    }
    
    // If PDF is truly scanned (image-based), inform user
    console.log('⚠️ PDF appears to be scanned/image-based. Limited text extraction in serverless environment.');
    return {
      text: combinedText || '',
      success: combinedText.length > 50,
      pagesProcessed: pdfParseResult.numPages || pdf2jsonResult.numPages || 0,
      avgConfidence: combinedText.length > 50 ? 60 : 0,
      method: 'limited',
      warning: 'PDF appears to be scanned. For best results, use text-based PDFs.'
    };
    
  } catch (error) {
    console.error('PDF extraction error:', error);
    return {
      text: '',
      success: false,
      error: error.message
    };
  }
}

/**
 * Clean OCR/PDF extracted text
 */
function cleanOCRText(text) {
  if (!text) return '';
  
  return text
    // Decode URL-encoded characters (pdf2json encodes these)
    .replace(/%20/g, ' ')
    .replace(/%0A/g, '\n')
    .replace(/%2C/g, ',')
    .replace(/%3A/g, ':')
    .replace(/%3B/g, ';')
    .replace(/%28/g, '(')
    .replace(/%29/g, ')')
    .replace(/%5B/g, '[')
    .replace(/%5D/g, ']')
    .replace(/%2F/g, '/')
    .replace(/%3F/g, '?')
    .replace(/%26/g, '&')
    .replace(/%3D/g, '=')
    .replace(/%25/g, '%')
    // Fix common OCR errors
    .replace(/[|]/g, 'I')
    // Fix spacing
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    // Remove very short lines (noise)
    .split('\n')
    .filter(line => line.trim().length > 2)
    .join('\n')
    .trim();
}

/**
 * Terminate worker when done
 */
async function terminateWorker() {
  if (worker) {
    await worker.terminate();
    worker = null;
  }
}

module.exports = {
  extractTextFromImage,
  extractTextFromScannedPDF,
  extractTextWithPdf2Json,
  extractTextWithPdfParse,
  cleanOCRText,
  initializeWorker,
  terminateWorker
};
