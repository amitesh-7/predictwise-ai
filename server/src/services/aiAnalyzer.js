const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * AI Analysis Service
 * Handles Google Gemini integration for question analysis and prediction
 */

let genAI = null;
let model = null;

function initializeGemini() {
  if (process.env.GEMINI_API_KEY && !genAI) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
    console.log('✅ Google Gemini client initialized (gemini-3-flash-preview)');
  }
  return model;
}

/**
 * Extract meaningful topics from noisy OCR text
 */
function extractTopicsFromText(text) {
  const lower = text.toLowerCase();
  
  // Common math/engineering topics
  const allTopics = [
    'Laplace Transform', 'Fourier Series', 'Fourier Transform', 'Z-Transform',
    'Partial Differential Equations', 'PDE', 'Ordinary Differential Equations', 'ODE',
    'Probability', 'Statistics', 'Random Variables', 'Probability Distribution',
    'Normal Distribution', 'Binomial Distribution', 'Poisson Distribution',
    'Mean', 'Variance', 'Standard Deviation', 'Correlation', 'Regression',
    'Hypothesis Testing', 'Chi-Square Test', 'T-Test', 'F-Test',
    'Matrix', 'Determinant', 'Eigenvalues', 'Eigenvectors', 'Linear Algebra',
    'Integration', 'Differentiation', 'Calculus', 'Limits', 'Continuity',
    'Complex Numbers', 'Complex Analysis', 'Analytic Functions',
    'Vector Calculus', 'Gradient', 'Divergence', 'Curl',
    'Numerical Methods', 'Newton-Raphson', 'Interpolation', 'Curve Fitting',
    'Charpit Method', 'Lagrange Multipliers', 'Auxiliary Equation',
    'Wave Equation', 'Heat Equation', 'Boundary Value Problems',
    'Power Series', 'Taylor Series', 'Maclaurin Series',
    'Beta Function', 'Gamma Function', 'Error Function',
    'Sampling', 'Estimation', 'Confidence Interval',
    'Quality Control', 'Control Charts', 'Statistical Quality Control',
    'Data Structures', 'Algorithms', 'Trees', 'Graphs', 'Sorting',
    'Database', 'SQL', 'Normalization', 'Operating System', 'Networks'
  ];
  
  const foundTopics = allTopics.filter(topic => 
    lower.includes(topic.toLowerCase()) || 
    lower.includes(topic.toLowerCase().replace(/\s+/g, ''))
  );
  
  if (foundTopics.length < 5) {
    foundTopics.push('Differential Equations', 'Probability Theory', 'Statistical Methods', 'Transform Methods', 'Numerical Analysis');
  }
  
  return [...new Set(foundTopics)].slice(0, 10);
}

/**
 * Clean OCR garbage from text
 */
function cleanOCRText(text) {
  if (!text) return '';
  
  return text
    // Remove random single characters and symbols at start
    .replace(/^[^a-zA-Z]*/, '')
    // Remove OCR artifacts like "i. si. 9 2 5" or "I K3 C PTS"
    .replace(/^[a-zA-Z]\s*\.\s*[a-zA-Z]{1,3}\s*\.\s*[\d\s]+/gi, '')
    .replace(/^[A-Z]\s+[A-Z0-9]{1,3}\s+[A-Z]\s+[A-Z]{2,4}\s+/g, '')
    // Remove strings of random characters
    .replace(/[^\w\s]{3,}/g, ' ')
    // Remove isolated single letters/numbers
    .replace(/\s[a-zA-Z0-9]\s/g, ' ')
    // Clean up multiple spaces
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Generate analysis prompt
 */
function generateAnalysisPrompt(questions, subject, examName) {
  // Clean OCR garbage from questions
  const cleanedQuestions = questions
    .map(q => cleanOCRText(q))
    .map(q => q.replace(/[^\w\s\.\?\!\,\:\;\-\(\)\'\"\/\+\=\*\^]/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(q => {
      // Must have meaningful content
      if (q.length < 20) return false;
      if (!/[a-zA-Z]{5,}/.test(q)) return false;
      // Must start with a letter or number
      if (!/^[a-zA-Z0-9]/.test(q)) return false;
      // Should have at least 4 words
      if (q.split(/\s+/).length < 4) return false;
      return true;
    });
  
  const topicsFound = extractTopicsFromText(cleanedQuestions.join(' '));
  
  return `You are an expert exam paper generator for "${subject}" (${examName || 'university exam'}).

The following text was extracted from previous year exam papers using OCR. The text may contain errors and garbage characters - IGNORE any nonsensical text.

Topics identified from previous papers: ${topicsFound.join(', ')}

Raw extracted content (may contain OCR errors):
${cleanedQuestions.slice(0, 20).join('\n').substring(0, 3000)}

YOUR TASK: Generate a COMPLETE PREDICTED QUESTION PAPER based on the topics above.

PAPER STRUCTURE:
- SECTION A: 5 Short Answer Questions (2 marks each) - Define, State, What is...
- SECTION B: 5 Medium Answer Questions (5 marks each) - Explain, Derive, Solve...  
- SECTION C: 3 Long Answer Questions (10 marks each) - Discuss in detail, Prove and explain...

CRITICAL RULES:
1. Generate CLEAN, GRAMMATICALLY CORRECT questions only
2. Each question must be a COMPLETE sentence starting with a capital letter
3. Questions must be specific to "${subject}" - use proper mathematical/technical terminology
4. DO NOT include any OCR garbage, random characters, or incomplete sentences
5. Use proper notation: x^2 for squared, dy/dx for derivatives, integral for integrals
6. Every question must make sense and be answerable

EXAMPLES OF GOOD QUESTIONS:
- "Define the Laplace transform and state its properties."
- "Solve the differential equation dy/dx + 2y = e^x."
- "Explain the method of variation of parameters with an example."

EXAMPLES OF BAD QUESTIONS (DO NOT GENERATE):
- "i. si. 9 2 5 When is the test statistic..."
- "I K3 C PTS Ary kc GN Fr 9 SIE RE..."
- Any question starting with random characters

Return this EXACT JSON structure:

GENERATE A PROPER EXAM PAPER with these sections:

SECTION A - Short Answer Questions (2 marks each)
- 5 questions requiring brief answers
- Questions like: Define X, What is Y, List Z, State the formula for...

SECTION B - Medium Answer Questions (5 marks each)  
- 5 questions requiring detailed explanations
- Questions like: Explain X with example, Derive Y, Solve Z...

SECTION C - Long Answer Questions (10 marks each)
- 3 questions requiring comprehensive answers
- Questions like: Discuss in detail, Prove and explain, Solve step by step...

STRICT RULES:
1. Each question must be COMPLETE and grammatically correct
2. Questions should be specific to "${subject}"
3. Include mathematical expressions where appropriate (use simple text like x^2, dy/dx, integral, etc.)
4. Make questions realistic and exam-worthy
5. DO NOT include any OCR garbage or random characters

Return this EXACT JSON structure:
{
  "predictions": [
    {
      "topic": "Topic Name",
      "question": "Complete question text here?",
      "difficulty": "Easy",
      "probability": 0.90,
      "type": "Short Answer",
      "marks": 2,
      "section": "A",
      "rationale": "Frequently asked in previous exams"
    }
  ],
  "summary": ["Topic1", "Topic2", "Topic3", "Topic4", "Topic5"],
  "paperStructure": {
    "totalMarks": 70,
    "duration": "3 hours",
    "sections": [
      {"name": "A", "questions": 5, "marksEach": 2, "total": 10},
      {"name": "B", "questions": 5, "marksEach": 5, "total": 25},
      {"name": "C", "questions": 3, "marksEach": 10, "total": 30}
    ]
  },
  "trends": {
    "difficultyProgression": [
      {"year": "2022", "easy": 5, "medium": 5, "hard": 3},
      {"year": "2023", "easy": 5, "medium": 5, "hard": 3},
      {"year": "2024", "easy": 5, "medium": 5, "hard": 3}
    ]
  }
}

Generate exactly 13 questions (5 for Section A, 5 for Section B, 3 for Section C).
Return ONLY valid JSON.`;
}

/**
 * Analyze questions with Gemini
 */
async function analyzeWithAI(questions, subject, examName) {
  const geminiModel = initializeGemini();
  
  if (!questions || questions.length === 0) {
    console.log('⚠️ No questions to analyze');
    return {
      predictions: [{
        id: 1,
        topic: 'No Questions Found',
        question: 'Could not extract questions from the uploaded files.',
        difficulty: 'Medium',
        probability: 0,
        type: 'Error',
        rationale: 'No questions were extracted from the uploaded documents',
        section: 'A'
      }],
      summary: ['No data available'],
      trends: { difficultyProgression: [] },
      error: 'No questions extracted from files'
    };
  }
  
  if (!geminiModel) {
    console.log('⚠️ Gemini not configured, using smart fallback');
    return generateSmartFallback(questions, subject);
  }
  
  try {
    console.log(`🤖 Sending ${questions.length} items to Gemini for analysis...`);
    
    const prompt = generateAnalysisPrompt(questions, subject, examName);
    
    const result = await geminiModel.generateContent({
      contents: [{ 
        role: 'user', 
        parts: [{ text: prompt }] 
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4000,
        responseMimeType: 'application/json'
      }
    });
    
    const response = result.response;
    let content = response.text();
    
    console.log('📥 Received response from Gemini');
    
    // Clean up response - remove markdown code blocks if present
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    const parsed = JSON.parse(content);
    
    if (!parsed.predictions || !Array.isArray(parsed.predictions)) {
      throw new Error('Invalid response structure from Gemini');
    }
    
    // Clean and validate predictions
    parsed.predictions = parsed.predictions
      .map((p, i) => ({
        id: i + 1,
        topic: cleanText(p.topic) || 'General Topic',
        question: cleanText(p.question) || '',
        difficulty: ['Easy', 'Medium', 'Hard'].includes(p.difficulty) ? p.difficulty : 'Medium',
        probability: typeof p.probability === 'number' ? Math.min(0.95, Math.max(0.3, p.probability)) : 0.5,
        type: p.type || 'Long Answer',
        marks: p.marks || (p.section === 'A' ? 2 : p.section === 'B' ? 5 : 10),
        rationale: cleanText(p.rationale) || 'Based on analysis of previous papers',
        section: ['A', 'B', 'C'].includes(p.section) ? p.section : 'B'
      }))
      .filter(p => {
        // Topic validation
        if (p.topic.length < 3 || p.topic.length > 100) return false;
        if (!/^[A-Z]/.test(p.topic)) return false;
        if (/^[,.\s\d]/.test(p.topic)) return false;
        
        // Question validation - must be clean and meaningful
        if (p.question.length < 25 || p.question.length > 500) return false;
        if (!/^[A-Z]/.test(p.question)) return false; // Must start with capital
        if (/^[,.\s\d]/.test(p.question)) return false; // No punctuation/number start
        if (!/[a-zA-Z]{5,}/.test(p.question)) return false; // Must have real words
        if (p.question.split(/\s+/).length < 5) return false; // At least 5 words
        
        // Reject if contains obvious OCR garbage patterns
        if (/[A-Z]\s+[A-Z0-9]{1,2}\s+[A-Z]\s+[A-Z]{2,3}\s+[A-Z]/.test(p.question)) return false;
        if (/\bi\.\s*si\./i.test(p.question)) return false;
        if (/[^\w\s]{2,}/.test(p.question.substring(0, 20))) return false;
        
        return true;
      });
    
    parsed.predictions.sort((a, b) => b.probability - a.probability);
    
    console.log(`✅ Generated ${parsed.predictions.length} predictions`);
    
    return parsed;
  } catch (error) {
    console.error('❌ Gemini analysis error:', error.message);
    return generateSmartFallback(questions, subject);
  }
}

/**
 * Generate smart fallback predictions
 */
function generateSmartFallback(questions, subject) {
  console.log('📊 Generating smart fallback predictions...');
  
  const topicAnalysis = analyzeQuestionTopics(questions);
  const predictions = [];
  let id = 1;
  
  // Generate predictions based on detected topics
  for (const [topic, count] of Object.entries(topicAnalysis)) {
    if (predictions.length >= 10) break;
    
    predictions.push({
      id: id++,
      topic: capitalizeWords(topic),
      question: generateQuestionForTopic(topic, subject),
      difficulty: 'Medium',
      probability: Math.min(0.85, 0.5 + (count * 0.05)),
      type: 'Long Answer',
      rationale: `Topic "${topic}" appeared ${count} times in the analyzed papers`,
      section: predictions.length < 3 ? 'A' : predictions.length < 7 ? 'B' : 'C'
    });
  }
  
  // Add default questions if not enough
  const defaultTopics = ['Differential Equations', 'Probability', 'Statistics', 'Transform Methods', 'Numerical Methods'];
  for (const topic of defaultTopics) {
    if (predictions.length >= 10) break;
    if (predictions.some(p => p.topic.toLowerCase().includes(topic.toLowerCase()))) continue;
    
    predictions.push({
      id: id++,
      topic: topic,
      question: generateQuestionForTopic(topic, subject),
      difficulty: 'Medium',
      probability: 0.6,
      type: 'Long Answer',
      rationale: `${topic} is a fundamental topic in ${subject}`,
      section: 'B'
    });
  }
  
  return {
    predictions: predictions.slice(0, 10),
    summary: Object.keys(topicAnalysis).slice(0, 5).map(capitalizeWords),
    trends: {
      difficultyProgression: [
        { year: '2022', easy: 5, medium: 8, hard: 4 },
        { year: '2023', easy: 6, medium: 7, hard: 5 },
        { year: '2024', easy: 5, medium: 9, hard: 4 }
      ]
    }
  };
}

/**
 * Generate a question for a given topic
 */
function generateQuestionForTopic(topic, subject) {
  const templates = {
    'laplace': 'Find the Laplace transform of the given function and verify using the definition.',
    'fourier': 'Obtain the Fourier series expansion of the given periodic function.',
    'differential': 'Solve the given differential equation using an appropriate method.',
    'probability': 'Calculate the probability for the given random experiment and explain your approach.',
    'statistics': 'Compute the mean, variance, and standard deviation for the given data set.',
    'matrix': 'Find the eigenvalues and eigenvectors of the given matrix.',
    'integration': 'Evaluate the given integral using appropriate techniques.',
    'transform': 'Apply the appropriate transform method to solve the given problem.',
    'numerical': 'Use numerical methods to find the approximate solution to the given equation.',
    'default': `Explain the concept of ${topic} with suitable examples and applications.`
  };
  
  const lower = topic.toLowerCase();
  for (const [key, template] of Object.entries(templates)) {
    if (lower.includes(key)) return template;
  }
  return templates.default.replace('${topic}', topic);
}

/**
 * Analyze topics from questions
 */
function analyzeQuestionTopics(questions) {
  const topicCounts = {};
  const keywords = [
    'laplace', 'fourier', 'transform', 'differential', 'equation',
    'probability', 'statistics', 'distribution', 'random', 'variable',
    'matrix', 'determinant', 'eigenvalue', 'vector', 'linear',
    'integration', 'derivative', 'calculus', 'limit', 'series',
    'numerical', 'interpolation', 'regression', 'correlation',
    'hypothesis', 'testing', 'confidence', 'sampling', 'estimation'
  ];
  
  questions.forEach(q => {
    const lower = q.toLowerCase();
    keywords.forEach(kw => {
      if (lower.includes(kw)) {
        topicCounts[kw] = (topicCounts[kw] || 0) + 1;
      }
    });
  });
  
  return Object.fromEntries(
    Object.entries(topicCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
  );
}

/**
 * Clean text
 */
function cleanText(text) {
  if (!text) return '';
  return text
    .replace(/[^\w\s\.\?\!\,\:\;\-\(\)\'\"\/\+\=\*\%]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,?!;:])/g, '$1')
    .replace(/([.,?!;:])\s*/g, '$1 ')
    .trim();
}

/**
 * Capitalize words
 */
function capitalizeWords(str) {
  return str.split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

module.exports = {
  analyzeWithAI,
  generateSmartFallback,
  generateAnalysisPrompt,
  initializeGemini
};
