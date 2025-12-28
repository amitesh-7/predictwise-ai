const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * OCR Extraction Service using Google Gemini Vision API
 * Handles text extraction from scanned PDFs and images
 */

let genAI = null;
const MODEL_NAME = 'gemini-2.5-flash';

/**
 * Initialize Gemini client
 */
function initializeGemini() {
  if (!genAI) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    console.log('✅ Gemini Vision client initialized');
  }
  return genAI;
}

/**
 * Sleep helper for retry delays
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Extract text from image buffer using Gemini Vision
 */
async function extractTextFromImage(imageBuffer, mimeType = 'image/png') {
  try {
    const ai = initializeGemini();
    const model = ai.getGenerativeModel({ model: MODEL_NAME });
    
    const base64Image = imageBuffer.toString('base64');
    
    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: mimeType,
          data: base64Image
        }
      },
      `Extract ALL text from this exam paper image. 
       Include every question, sub-question, instruction, and marking scheme.
       Preserve the structure with section headers (Section A, B, C etc).
       Output ONLY the extracted text, no commentary.`
    ]);
    
    const text = result.response.text();
    
    return {
      text: text.trim(),
      confidence: 95,
      success: true
    };
  } catch (error) {
    console.error('Gemini Vision extraction error:', error.message);
    return {
      text: '',
      confidence: 0,
      success: false,
      error: error.message
    };
  }
}

/**
 * Extract text from PDF using Gemini Vision with retry
 */
async function extractTextFromPDF(pdfBuffer, retryCount = 0) {
  const MAX_RETRIES = 2;
  
  try {
    const ai = initializeGemini();
    const model = ai.getGenerativeModel({ model: MODEL_NAME });
    
    // Check PDF size - Gemini has limits (20MB for PDFs)
    const sizeMB = pdfBuffer.length / (1024 * 1024);
    console.log(`   PDF size: ${sizeMB.toFixed(2)} MB`);
    
    if (sizeMB > 20) {
      console.log(`   ⚠️ PDF too large (${sizeMB.toFixed(1)}MB), max 20MB`);
      return {
        text: '',
        success: false,
        error: 'PDF too large for vision API (max 20MB)',
        method: 'gemini-vision'
      };
    }
    
    const base64Pdf = pdfBuffer.toString('base64');
    
    console.log('   Sending PDF to Gemini Vision...');
    
    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: 'application/pdf',
          data: base64Pdf
        }
      },
      `You are an OCR system. Extract ALL text from this exam paper PDF exactly as it appears.

INSTRUCTIONS:
1. Extract every question with its number (Q1, Q2, 1., 2., etc.)
2. Include all sub-parts (a), (b), (c) or (i), (ii), (iii)
3. Preserve section headers (Section A, Section B, etc.)
4. Include marks allocation if shown [2 marks], (5 marks), etc.
5. Extract mathematical expressions as text (e.g., dy/dx, x^2, integral)
6. Include any instructions or notes

OUTPUT: Only the extracted text, nothing else. No explanations or commentary.`
    ]);
    
    const text = result.response.text();
    
    if (!text || text.length < 50) {
      throw new Error('Insufficient text extracted');
    }
    
    console.log(`   ✅ Gemini extracted ${text.length} characters`);
    
    return {
      text: text.trim(),
      success: true,
      pagesProcessed: 1,
      avgConfidence: 95,
      method: 'gemini-vision'
    };
  } catch (error) {
    console.error(`   ❌ Gemini PDF extraction error (attempt ${retryCount + 1}):`, error.message);
    
    // Retry on rate limit or temporary errors
    if (retryCount < MAX_RETRIES && (
      error.message.includes('429') || 
      error.message.includes('quota') ||
      error.message.includes('rate') ||
      error.message.includes('temporarily')
    )) {
      const delay = (retryCount + 1) * 5000; // 5s, 10s delays
      console.log(`   ⏳ Retrying in ${delay/1000}s...`);
      await sleep(delay);
      return extractTextFromPDF(pdfBuffer, retryCount + 1);
    }
    
    return {
      text: '',
      success: false,
      error: error.message,
      method: 'gemini-vision'
    };
  }
}

/**
 * Extract text from scanned PDF using Gemini
 */
async function extractTextFromScannedPDF(pdfBuffer, options = {}) {
  console.log('📄 Processing PDF with Gemini Vision...');
  
  try {
    const result = await extractTextFromPDF(pdfBuffer);
    return result;
  } catch (error) {
    console.error('PDF extraction error:', error);
    return {
      text: '',
      success: false,
      error: error.message,
      method: 'gemini-vision'
    };
  }
}

/**
 * Clean extracted text
 */
function cleanOCRText(text) {
  if (!text) return '';
  
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .split('\n')
    .filter(line => line.trim().length > 2)
    .join('\n')
    .trim();
}

module.exports = {
  extractTextFromImage,
  extractTextFromScannedPDF,
  extractTextFromPDF,
  cleanOCRText,
  initializeGemini
};
