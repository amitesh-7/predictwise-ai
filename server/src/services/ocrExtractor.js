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
 * Extract text from PDF using Gemini Vision
 */
async function extractTextFromPDF(pdfBuffer) {
  try {
    const ai = initializeGemini();
    const model = ai.getGenerativeModel({ model: MODEL_NAME });
    
    const base64Pdf = pdfBuffer.toString('base64');
    
    console.log('   Sending PDF to Gemini Vision...');
    
    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: 'application/pdf',
          data: base64Pdf
        }
      },
      `Extract ALL text from this exam paper PDF.
       Include every question, sub-question, instruction, and marking scheme.
       Preserve the structure with section headers (Section A, B, C etc).
       For each question, include the question number and full text.
       Output ONLY the extracted text, no commentary or explanations.`
    ]);
    
    const text = result.response.text();
    
    console.log(`   ✅ Gemini extracted ${text.length} characters`);
    
    return {
      text: text.trim(),
      success: text.length > 50,
      avgConfidence: 95,
      method: 'gemini-vision'
    };
  } catch (error) {
    console.error('Gemini PDF extraction error:', error.message);
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
    
    if (result.success && result.text) {
      return result;
    }
    
    return {
      text: '',
      success: false,
      pagesProcessed: 0,
      avgConfidence: 0,
      method: 'none',
      error: result.error || 'Could not extract text from PDF'
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
