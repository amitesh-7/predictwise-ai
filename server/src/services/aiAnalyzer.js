const OpenAI = require('openai');

/**
 * AI Analysis Service
 * Handles OpenAI integration for question analysis and prediction
 */

let openai = null;

function initializeOpenAI() {
  if (process.env.OPENAI_API_KEY && !openai) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    console.log('✅ OpenAI client initialized');
  }
  return openai;
}

/**
 * Generate analysis prompt with actual questions
 */
function generateAnalysisPrompt(questions, subject, examName) {
  // Clean up OCR noise from questions before sending to AI
  const cleanedQuestions = questions
    .map(q => q.replace(/[^\w\s\.\?\!\,\:\;\-\(\)\'\"\/\+\=\*]/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(q => q.length > 15 && /[a-zA-Z]{4,}/.test(q));
  
  // Extract just keywords and topics from the noisy text
  const topicsFound = extractTopicsFromText(cleanedQuestions.join(' '));
  
  return `You are an expert exam question generator for "${subject}" (${examName || 'university exam'}).

Based on analysis of previous year papers, these TOPICS were frequently covered:
${topicsFound.join(', ')}

YOUR TASK: Generate 10 HIGH-QUALITY exam questions for "${subject}" subject.

STRICT RULES - FOLLOW EXACTLY:
1. DO NOT copy any text from input - write fresh, clean questions
2. Each question MUST be grammatically perfect English
3. Each question MUST be complete and make sense on its own
4. Topics should be properly capitalized (e.g., "Laplace Transform", "Partial Differential Equations")
5. Questions should be typical university exam style

GENERATE THIS EXACT JSON STRUCTURE:
{
  "predictions": [
    {
      "topic": "Laplace Transform",
      "question": "Find the Laplace transform of f(t) = t*e^(-2t) and state the conditions for its existence.",
      "difficulty": "Medium",
      "probability": 0.85,
      "type": "Numerical",
      "rationale": "Laplace transforms are fundamental and appear frequently in exams",
      "section": "B"
    },
    {
      "topic": "Partial Differential Equations",
      "question": "Solve the partial differential equation: ∂²u/∂x² + ∂²u/∂y² = 0 using the method of separation of variables.",
      "difficulty": "Hard",
      "probability": 0.80,
      "type": "Derivation",
      "rationale": "PDE solving methods are core topics in mathematics",
      "section": "C"
    }
  ],
  "summary": ["Laplace Transform", "Fourier Series", "PDE", "Probability", "Statistics"],
  "trends": {
    "difficultyProgression": [
      {"year": "2022", "easy": 5, "medium": 8, "hard": 4},
      {"year": "2023", "easy": 6, "medium": 7, "hard": 5},
      {"year": "2024", "easy": 5, "medium": 9, "hard": 4}
    ]
  }
}

Generate 10 different questions covering various topics in ${subject}. Return ONLY valid JSON.`;
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
    'Quality Control', 'Control Charts', 'Statistical Quality Control'
  ];
  
  const foundTopics = allTopics.filter(topic => 
    lower.includes(topic.toLowerCase()) || 
    lower.includes(topic.toLowerCase().replace(/\s+/g, ''))
  );
  
  // If few topics found, add some defaults based on subject
  if (foundTopics.length < 5) {
    foundTopics.push('Differential Equations', 'Probability Theory', 'Statistical Methods', 'Transform Methods', 'Numerical Analysis');
  }
  
  return [...new Set(foundTopics)].slice(0, 10);
}

/**
 * Analyze questions with OpenAI
 */
async function analyzeWithAI(questions, subject, examName) {
  const client = initializeOpenAI();
  
  // If no questions extracted, return error-like response
  if (!questions || questions.length === 0) {
    console.log('⚠️ No questions to analyze');
    return {
      predictions: [{
        id: 1,
        topic: 'No Questions Found',
        question: 'Could not extract questions from the uploaded files. Please ensure the PDFs contain readable text.',
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
  
  // If OpenAI not configured, use smart fallback
  if (!client) {
    console.log('⚠️ OpenAI not configured, using smart fallback');
    return generateSmartFallback(questions, subject);
  }
  
  try {
    console.log(`🤖 Sending ${questions.length} questions to OpenAI for analysis...`);
    
    const prompt = generateAnalysisPrompt(questions, subject, examName);
    
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an expert university exam question writer. Generate clean, professional exam questions.

ABSOLUTE RULES:
1. NEVER copy text from user input - always write fresh questions
2. Every question must be perfect English with no errors
3. Every topic name must be properly capitalized
4. Questions must be complete sentences that make sense
5. Output only valid JSON

Example of GOOD output:
- Topic: "Laplace Transform" (not "la place" or "laplace trans")
- Question: "Find the Laplace transform of sin(at) and verify using the definition." (not OCR garbage)

Example of BAD output (NEVER DO THIS):
- Topic: ", i. si. 9 2 5" 
- Question: "Attempt all questions in brief. 2x10=20 Gm ui I Maks"`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 4000,
      temperature: 0.7
    });
    
    const content = response.choices[0].message.content;
    console.log('📥 Received response from OpenAI');
    
    const parsed = JSON.parse(content);
    
    // Validate response structure
    if (!parsed.predictions || !Array.isArray(parsed.predictions)) {
      throw new Error('Invalid response structure from OpenAI');
    }
    
    // Clean and validate all predictions - reject garbage
    parsed.predictions = parsed.predictions
      .map((p, i) => ({
        id: i + 1,
        topic: cleanText(p.topic) || 'General Topic',
        question: cleanText(p.question) || '',
        difficulty: ['Easy', 'Medium', 'Hard'].includes(p.difficulty) ? p.difficulty : 'Medium',
        probability: typeof p.probability === 'number' ? Math.min(0.95, Math.max(0.3, p.probability)) : 0.5,
        type: p.type || 'Long Answer',
        rationale: cleanText(p.rationale) || 'Based on analysis of previous papers',
        section: ['A', 'B', 'C'].includes(p.section) ? p.section : 'B'
      }))
      .filter(p => {
        // Reject predictions with garbage
        if (p.topic.length < 3 || p.topic.length > 100) return false;
        if (p.question.length < 20 || p.question.length > 500) return false;
        if (!/^[A-Z]/.test(p.topic)) return false; // Topic must start with capital
        if (/^\d|^[,.\s]/.test(p.topic)) return false; // Topic can't start with number/punctuation
        if (!/[a-zA-Z]{5,}/.test(p.question)) return false; // Question must have real words
        return true;
      });
    
    // Sort by probability
    parsed.predictions.sort((a, b) => b.probability - a.probability);
    
    console.log(`✅ Generated ${parsed.predictions.length} predictions`);
    
    return parsed;
  } catch (error) {
    console.error('❌ OpenAI analysis error:', error.message);
    return generateSmartFallback(questions, subject);
  }
}

/**
 * Generate smart fallback predictions based on actual extracted questions
 */
function generateSmartFallback(questions, subject) {
  console.log('📊 Generating smart fallback predictions...');
  
  // Analyze question patterns
  const topicAnalysis = analyzeQuestionTopics(questions);
  const questionTypes = analyzeQuestionTypes(questions);
  
  // Generate predictions based on actual questions
  const predictions = [];
  let id = 1;
  
  // Use actual questions as base for predictions
  const uniqueQuestions = [...new Set(questions)];
  const topQuestions = uniqueQuestions.slice(0, 15);
  
  for (const q of topQuestions) {
    if (predictions.length >= 10) break;
    
    // Extract topic from question
    const topic = extractTopicFromQuestion(q, subject);
    
    // Check if we already have this topic
    if (predictions.some(p => p.topic.toLowerCase() === topic.toLowerCase())) {
      continue;
    }
    
    predictions.push({
      id: id++,
      topic: topic,
      question: cleanQuestion(q),
      difficulty: guessDifficulty(q),
      probability: Math.round((0.85 - (predictions.length * 0.05)) * 100) / 100,
      type: guessQuestionType(q),
      rationale: `This question or similar variations appeared in the analyzed papers`,
      section: predictions.length < 3 ? 'A' : predictions.length < 7 ? 'B' : 'C'
    });
  }
  
  // If we don't have enough predictions, add topic-based ones
  for (const [topic, count] of Object.entries(topicAnalysis)) {
    if (predictions.length >= 10) break;
    if (predictions.some(p => p.topic.toLowerCase().includes(topic.toLowerCase()))) continue;
    
    predictions.push({
      id: id++,
      topic: capitalizeWords(topic),
      question: `Explain the concept of ${topic} with suitable examples and applications.`,
      difficulty: 'Medium',
      probability: Math.min(0.8, 0.4 + (count * 0.1)),
      type: 'Long Answer',
      rationale: `Topic "${topic}" appeared ${count} times in the analyzed papers`,
      section: 'B'
    });
  }
  
  return {
    predictions: predictions.slice(0, 10),
    summary: Object.keys(topicAnalysis).slice(0, 5).map(capitalizeWords),
    trends: {
      difficultyProgression: [
        { year: '2021', easy: 5, medium: 8, hard: 4 },
        { year: '2022', easy: 4, medium: 10, hard: 5 },
        { year: '2023', easy: 6, medium: 7, hard: 6 },
        { year: '2024', easy: 5, medium: 9, hard: 5 }
      ]
    }
  };
}

/**
 * Analyze topics from questions
 */
function analyzeQuestionTopics(questions) {
  const topicCounts = {};
  
  // Common CS/Engineering keywords
  const keywords = [
    'algorithm', 'data structure', 'tree', 'graph', 'sorting', 'searching',
    'array', 'linked list', 'stack', 'queue', 'hash', 'heap', 'binary',
    'complexity', 'recursion', 'dynamic programming', 'greedy', 'backtracking',
    'database', 'sql', 'normalization', 'transaction', 'query', 'index',
    'operating system', 'process', 'thread', 'memory', 'scheduling', 'deadlock',
    'network', 'protocol', 'tcp', 'ip', 'routing', 'osi', 'http',
    'compiler', 'parsing', 'lexical', 'syntax', 'semantic',
    'oop', 'inheritance', 'polymorphism', 'encapsulation', 'abstraction',
    'pointer', 'function', 'class', 'object', 'method', 'variable',
    'loop', 'condition', 'exception', 'error', 'debug',
    'file', 'input', 'output', 'stream', 'buffer',
    'security', 'encryption', 'authentication', 'authorization',
    'web', 'api', 'rest', 'json', 'xml', 'html', 'css',
    'machine learning', 'neural network', 'classification', 'regression',
    'physics', 'chemistry', 'mathematics', 'calculus', 'algebra',
    'mechanics', 'thermodynamics', 'electromagnetism', 'optics', 'waves'
  ];
  
  questions.forEach(q => {
    const lower = q.toLowerCase();
    keywords.forEach(kw => {
      if (lower.includes(kw)) {
        topicCounts[kw] = (topicCounts[kw] || 0) + 1;
      }
    });
  });
  
  // Sort by frequency
  return Object.fromEntries(
    Object.entries(topicCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
  );
}

/**
 * Analyze question types
 */
function analyzeQuestionTypes(questions) {
  const types = { short: 0, long: 0, numerical: 0, derivation: 0 };
  
  questions.forEach(q => {
    const lower = q.toLowerCase();
    if (lower.includes('derive') || lower.includes('prove') || lower.includes('show that')) {
      types.derivation++;
    } else if (lower.includes('calculate') || lower.includes('find the value') || lower.includes('solve')) {
      types.numerical++;
    } else if (lower.includes('explain') || lower.includes('describe') || lower.includes('discuss') || q.length > 100) {
      types.long++;
    } else {
      types.short++;
    }
  });
  
  return types;
}

/**
 * Extract topic from a question
 */
function extractTopicFromQuestion(question, subject) {
  const lower = question.toLowerCase();
  
  // Try to find specific topic keywords
  const topicPatterns = [
    /(?:explain|describe|discuss|what is|define)\s+(?:the\s+)?(?:concept of\s+)?([a-z\s]+?)(?:\.|,|\?|$)/i,
    /(?:write|give)\s+(?:a\s+)?(?:short\s+)?note on\s+([a-z\s]+?)(?:\.|,|\?|$)/i,
    /([a-z\s]+?)\s+(?:algorithm|method|technique|approach)/i
  ];
  
  for (const pattern of topicPatterns) {
    const match = question.match(pattern);
    if (match && match[1] && match[1].length > 3 && match[1].length < 50) {
      return capitalizeWords(match[1].trim());
    }
  }
  
  // Fallback: use first few meaningful words
  const words = question.split(/\s+/).slice(0, 6).join(' ');
  return words.length > 50 ? words.substring(0, 50) + '...' : words;
}

/**
 * Clean up question text
 */
function cleanQuestion(question) {
  return question
    .replace(/^\d+[\.\)]\s*/, '') // Remove question numbers
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Guess difficulty from question
 */
function guessDifficulty(question) {
  const lower = question.toLowerCase();
  
  if (lower.includes('derive') || lower.includes('prove') || lower.includes('analyze') || 
      lower.includes('compare and contrast') || lower.includes('design')) {
    return 'Hard';
  }
  
  if (lower.includes('define') || lower.includes('list') || lower.includes('name') ||
      lower.includes('what is') || question.length < 50) {
    return 'Easy';
  }
  
  return 'Medium';
}

/**
 * Guess question type
 */
function guessQuestionType(question) {
  const lower = question.toLowerCase();
  
  if (lower.includes('derive') || lower.includes('prove')) return 'Derivation';
  if (lower.includes('calculate') || lower.includes('find') || lower.includes('solve')) return 'Numerical';
  if (lower.includes('define') || lower.includes('list') || question.length < 80) return 'Short Answer';
  return 'Long Answer';
}

/**
 * Capitalize words
 */
function capitalizeWords(str) {
  return str.split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Clean text - remove OCR noise and fix formatting
 */
function cleanText(text) {
  if (!text) return '';
  return text
    .replace(/[^\w\s\.\?\!\,\:\;\-\(\)\'\"\/\+\=\*\%]/g, ' ') // Remove special chars
    .replace(/\s+/g, ' ') // Normalize spaces
    .replace(/\s+([.,?!;:])/g, '$1') // Fix punctuation spacing
    .replace(/([.,?!;:])\s*/g, '$1 ') // Add space after punctuation
    .trim();
}

module.exports = {
  analyzeWithAI,
  generateSmartFallback,
  generateAnalysisPrompt,
  initializeOpenAI
};
