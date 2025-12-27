const express = require('express');
const { validateSubjectCode } = require('../middleware/validation');
const { predictionsLimiter } = require('../middleware/rateLimit');

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

/**
 * GET /api/predictions/:subjectCode
 * Get predictions for a subject (user-specific)
 */
router.get('/:subjectCode',
  predictionsLimiter,
  validateSubjectCode,
  async (req, res) => {
    try {
      const { subjectCode } = req.validatedParams;
      const userId = getUserIdFromToken(req);
      
      // Try to fetch from database (user-specific)
      if (global.supabase && userId) {
        // First try user-specific results
        const { data, error } = await global.supabase
          .from('user_analyses')
          .select('*')
          .eq('user_id', userId)
          .eq('subject_code', subjectCode)
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (!error && data && data.length > 0) {
          console.log(`📊 Found user-specific analysis for ${subjectCode}`);
          return res.json({
            success: true,
            source: 'database',
            ...data[0].analysis_data
          });
        }
      }
      
      // Return empty data if no stored results
      res.json({
        success: true,
        source: 'empty',
        predictions: [],
        summary: [],
        trends: { difficultyProgression: [] },
        recurrence: [],
        analysis: { 
          papersAnalyzed: 0, 
          questionsExtracted: 0, 
          topicsCovered: 0, 
          avgAccuracy: 0 
        },
        message: 'No analysis found. Upload some papers to get started!'
      });
    } catch (error) {
      console.error('Predictions fetch error:', error);
      res.status(500).json({ 
        error: 'Failed to fetch predictions',
        message: error.message
      });
    }
  }
);

/**
 * GET /api/predictions
 * List all available subjects with predictions (user-specific)
 */
router.get('/',
  predictionsLimiter,
  async (req, res) => {
    try {
      const userId = getUserIdFromToken(req);
      
      if (global.supabase && userId) {
        // Get user-specific analyses
        const { data, error } = await global.supabase
          .from('user_analyses')
          .select('subject_code, subject_name, exam_name, created_at, predictions_count')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        
        if (!error && data) {
          // Group by subject code
          const subjects = {};
          data.forEach(item => {
            if (!subjects[item.subject_code]) {
              subjects[item.subject_code] = {
                subjectCode: item.subject_code,
                subjectName: item.subject_name,
                examName: item.exam_name,
                lastAnalyzed: item.created_at,
                analysisCount: 0,
                totalPredictions: 0
              };
            }
            subjects[item.subject_code].analysisCount++;
            subjects[item.subject_code].totalPredictions += item.predictions_count || 0;
          });
          
          return res.json({
            success: true,
            subjects: Object.values(subjects)
          });
        }
      }
      
      // Return empty if no user or no data
      res.json({
        success: true,
        subjects: [],
        message: userId ? 'No analyses found' : 'Please sign in to view your analyses'
      });
    } catch (error) {
      console.error('Predictions list error:', error);
      res.status(500).json({ error: 'Failed to fetch subjects' });
    }
  }
);

module.exports = router;
