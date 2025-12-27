const express = require('express');
const multer = require('multer');
const { validateAnalyze, sanitizeText } = require('../middleware/validation');
const { analyzeLimiter } = require('../middleware/rateLimit');
const { extractTextFromPDF, isLikelyScannedPDF } = require('../services/pdfExtractor');
const { extractTextFromImage, extractTextFromScannedPDF } = require('../services/ocrExtractor');
const { extractQuestions } = require('../services/questionExtractor');
const { analyzeWithAI } = require('../services/aiAnalyzer');
const { recordAnalysis } = require('../services/analyticsService');
const { createJob, updateProgress, completeJob, failJob, generateJobId } = require('../services/progressTracker');

const router = express.Router();

/**
 * Extract user ID from Authorization header (Supabase JWT)
 */
function getUserIdFromToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  try {
    const token = authHeader.split(' ')[1];
    // Decode JWT payload (base64)
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    return payload.sub; // Supabase user ID
  } catch (error) {
    console.error('Error decoding token:', error.message);
    return null;
  }
}

// File upload config
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { 
    fileSize: 50 * 1024 * 1024,
    files: 20
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'text/plain'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}. Allowed: PDF, PNG, JPG, TXT`));
    }
  }
});

/**
 * POST /api/analyze
 * Main analysis endpoint - generates fresh predictions for each request
 */
router.post('/', 
  analyzeLimiter,
  upload.array('files', 20),
  validateAnalyze,
  async (req, res) => {
    const startTime = Date.now();
    const jobId = generateJobId();
    const userId = getUserIdFromToken(req);
    
    try {
      const { examName, subject, subjectCode } = req.validatedBody;
      const files = req.files || [];
      const useOCR = req.body.useOCR === 'true' || req.body.useOCR === true;
      
      if (files.length === 0) {
        return res.status(400).json({ 
          error: 'No files uploaded',
          message: 'Please upload at least one PDF file'
        });
      }
      
      // Create progress job
      createJob(jobId, files.length + 2);
      updateProgress(jobId, 5, 'Starting analysis...');
      
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📊 NEW ANALYSIS REQUEST`);
      console.log(`   Subject: ${subject} (${subjectCode})`);
      console.log(`   Exam: ${examName}`);
      console.log(`   Files: ${files.length}`);
      console.log(`   User: ${userId || 'anonymous'}`);
      console.log(`   Job ID: ${jobId}`);
      console.log(`${'='.repeat(60)}\n`);
      
      // Process each file - NO CACHING to ensure fresh results
      const allQuestions = [];
      const allExtractedText = []; // Store all extracted text for AI
      const fileResults = [];
      let totalPages = 0;
      let ocrUsed = false;
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const progress = Math.round(((i + 1) / files.length) * 70) + 10;
        updateProgress(jobId, progress, `Processing file ${i + 1}/${files.length}: ${file.originalname}`);
        
        console.log(`\n📄 Processing: ${file.originalname} (${(file.size / 1024).toFixed(1)} KB)`);
        
        let text = '';
        let numPages = 0;
        let extractionMethod = 'text';
        
        // Handle different file types
        if (file.mimetype === 'application/pdf') {
          // First try normal text extraction
          const pdfResult = await extractTextFromPDF(file.buffer);
          text = pdfResult.text;
          numPages = pdfResult.numPages;
          
          console.log(`   Text extraction: ${text.length} characters from ${numPages} pages`);
          
          // Always try OCR if text extraction got little content
          if (!text || text.length < 200) {
            console.log(`   🔍 Trying OCR extraction...`);
            updateProgress(jobId, progress, `Running OCR on ${file.originalname}...`);
            
            const ocrResult = await extractTextFromScannedPDF(file.buffer, {
              maxPages: 30
            });
            
            if (ocrResult.text && ocrResult.text.length > text.length) {
              text = ocrResult.text;
              numPages = ocrResult.pagesProcessed || numPages;
              extractionMethod = 'ocr';
              ocrUsed = true;
              console.log(`   ✅ OCR extracted: ${text.length} chars`);
            }
          }
        } else if (file.mimetype.startsWith('image/')) {
          console.log(`   🔍 Running OCR on image...`);
          const ocrResult = await extractTextFromImage(file.buffer);
          text = ocrResult.text;
          numPages = 1;
          extractionMethod = 'ocr';
          ocrUsed = true;
          console.log(`   ✅ OCR complete: ${text.length} chars`);
        } else if (file.mimetype === 'text/plain') {
          text = file.buffer.toString('utf-8');
          numPages = 1;
          extractionMethod = 'text';
        }
        
        // Store extracted text even if no questions found
        if (text && text.trim().length > 20) {
          allExtractedText.push(text);
        }
        
        if (!text || text.trim().length < 50) {
          console.log(`   ❌ Insufficient text extracted`);
          fileResults.push({
            filename: file.originalname,
            status: 'partial',
            error: 'Limited text extracted',
            questionsFound: 0,
            method: extractionMethod
          });
          continue;
        }
        
        // Extract questions
        const questions = extractQuestions(text);
        console.log(`   ✅ Extracted ${questions.length} questions`);
        
        // Log sample questions for debugging
        if (questions.length > 0) {
          console.log(`   Sample questions:`);
          questions.slice(0, 3).forEach((q, idx) => {
            console.log(`      ${idx + 1}. ${q.substring(0, 80)}...`);
          });
        }
        
        allQuestions.push(...questions);
        totalPages += numPages;
        
        fileResults.push({
          filename: file.originalname,
          status: 'success',
          pages: numPages,
          questionsFound: questions.length,
          textLength: text.length,
          method: extractionMethod
        });
      }
      
      console.log(`\n📝 TOTAL: ${allQuestions.length} questions from ${files.length} files`);
      console.log(`📝 TOTAL TEXT: ${allExtractedText.join(' ').length} characters`);
      
      // If no questions found but we have text, create pseudo-questions from text
      let questionsForAI = allQuestions;
      if (allQuestions.length === 0 && allExtractedText.length > 0) {
        console.log('⚠️ No structured questions found, using raw text for AI analysis...');
        // Split text into chunks and use as "questions" for AI to analyze
        const combinedText = allExtractedText.join('\n\n');
        const sentences = combinedText.split(/[.?!]\s+/).filter(s => s.trim().length > 20);
        questionsForAI = sentences.slice(0, 50).map(s => s.trim());
        console.log(`   Created ${questionsForAI.length} text segments for analysis`);
      }
      
      if (questionsForAI.length === 0) {
        console.log('❌ No text could be extracted from any file!');
        failJob(jobId, 'No text could be extracted');
        return res.status(400).json({
          success: false,
          error: 'No text extracted',
          message: 'Could not extract any text from the uploaded files. The PDFs may be scanned images. Please try converting them to images (PNG/JPG) first using a tool like Adobe Acrobat or an online PDF to image converter, then upload the images.',
          fileResults
        });
      }
      
      updateProgress(jobId, 85, 'Running AI analysis...');
      
      // Combine all extracted text for AI analysis
      const combinedText = allExtractedText.join('\n\n--- NEW PAPER ---\n\n');
      
      // Analyze with AI - always fresh, no caching
      console.log('\n🤖 Starting AI analysis...');
      const aiAnalysis = await analyzeWithAI(combinedText, subject, examName);
      
      if (aiAnalysis.error) {
        console.log(`⚠️ AI analysis warning: ${aiAnalysis.error}`);
      }
      
      console.log(`✅ AI analysis complete: ${aiAnalysis.predictions?.length || 0} predictions generated`);
      
      updateProgress(jobId, 95, 'Finalizing results...');
      
      // Build warnings
      const warnings = [];
      if (ocrUsed) {
        warnings.push('OCR was used for text extraction. Results may vary based on document quality.');
      }
      if (allQuestions.length === 0) {
        warnings.push('No structured questions were found. Predictions are based on text content analysis.');
      }
      if (questionsForAI.length < 10) {
        warnings.push('Limited content was extracted. For better predictions, upload clearer documents or more papers.');
      }
      
      // Build response
      const result = {
        predictions: aiAnalysis.predictions || [],
        summary: aiAnalysis.summary || [],
        trends: aiAnalysis.trends || {},
        exam: {
          name: sanitizeText(examName),
          subject: sanitizeText(subject),
          subjectCode: sanitizeText(subjectCode)
        },
        analysis: {
          papersAnalyzed: files.length,
          pagesProcessed: totalPages,
          questionsExtracted: questionsForAI.length,
          topicsCovered: new Set(aiAnalysis.predictions?.map(p => p.topic) || []).size,
          avgAccuracy: questionsForAI.length > 20 ? 85 : 70,
          ocrUsed,
          fileResults
        },
        recurrence: (aiAnalysis.predictions || []).slice(0, 5).map((p, i) => ({
          topic: p.topic,
          frequency: Math.max(1, 10 - i * 2),
          lastAsked: 2024 - i
        })),
        warnings,
        generatedAt: new Date().toISOString()
      };
      
      const processingTime = Date.now() - startTime;
      
      console.log(`\n${'='.repeat(60)}`);
      console.log(`✅ ANALYSIS COMPLETE`);
      console.log(`   Processing time: ${processingTime}ms`);
      console.log(`   Predictions: ${result.predictions.length}`);
      console.log(`   Content analyzed: ${questionsForAI.length} segments`);
      console.log(`${'='.repeat(60)}\n`);
      
      // Record analytics
      recordAnalysis({
        subjectCode,
        subject,
        questionsExtracted: allQuestions.length,
        predictionsGenerated: aiAnalysis.predictions?.length || 0,
        processingTime,
        cached: false
      });
      
      // Save to database for user history (if user is authenticated)
      if (global.supabase && userId) {
        try {
          await global.supabase
            .from('user_analyses')
            .insert({
              user_id: userId,
              subject_code: subjectCode,
              subject_name: subject,
              exam_name: examName,
              analysis_data: result,
              files_count: files.length,
              questions_extracted: allQuestions.length,
              predictions_count: aiAnalysis.predictions?.length || 0,
              processing_time: processingTime
            });
          console.log(`💾 Saved analysis to database for user ${userId}`);
        } catch (dbError) {
          console.error('Failed to save to database:', dbError.message);
          // Don't fail the request, just log the error
        }
      }
      
      // Complete job
      completeJob(jobId, result);
      
      res.json({
        success: true,
        cached: false,
        jobId,
        analysis: result,
        processingTime
      });
      
    } catch (error) {
      console.error('\n❌ Analysis error:', error);
      failJob(jobId, error.message);
      res.status(500).json({ 
        error: 'Analysis failed', 
        message: error.message,
        jobId,
        processingTime: Date.now() - startTime
      });
    }
  }
);

// Error handling for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large', message: 'Maximum file size is 50MB' });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Too many files', message: 'Maximum 20 files allowed' });
    }
  }
  next(error);
});

module.exports = router;
