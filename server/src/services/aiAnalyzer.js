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
    model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    console.log('✅ Google Gemini client initialized (gemini-2.5-flash)');
  }
  return model;
}

/**
 * Generate analysis prompt for AKTU-style papers
 */
function generateAnalysisPrompt(extractedText, subject, examName) {
  return `You are an expert exam paper analyzer for AKTU (Dr. A.P.J. Abdul Kalam Technical University) B.Tech examinations.

SUBJECT: ${subject || 'Mathematics-IV / Engineering Mathematics'}
EXAM: ${examName || 'B.Tech 3rd Semester End Term Examination'}

I have extracted text from multiple previous year question papers. Analyze this content and generate a PREDICTED QUESTION PAPER for the upcoming exam.

EXTRACTED TEXT FROM PREVIOUS PAPERS:
"""
${extractedText.substring(0, 8000)}
"""

TASK: Based on the above content, generate a complete predicted question paper following AKTU format.

AKTU PAPER FORMAT:
- Section A: 10 questions × 2 marks = 20 marks (Very Short Answer - definitions, formulas, basic concepts)
- Section B: 5 questions × 10 marks = 50 marks (Long Answer - derivations, proofs, numerical problems)
  Note: Section B has "Attempt any 4 out of 5" or similar choice

IMPORTANT INSTRUCTIONS:
1. Extract ACTUAL questions from the text - look for numbered questions (1., 2., Q1, Q2, etc.)
2. Identify the SPECIFIC topics covered (Laplace Transform, Fourier Series, PDE, Statistics, etc.)
3. Generate questions that are SPECIFIC and DETAILED - not generic
4. Include mathematical expressions where needed (write as: dy/dx, d²y/dx², ∫, Σ, etc.)
5. Questions should be exam-worthy and match AKTU difficulty level

EXAMPLES OF GOOD SPECIFIC QUESTIONS:
- "Find the Laplace transform of t²e^(-3t)sin(2t)."
- "Solve the PDE: ∂²u/∂x² + ∂²u/∂y² = 0 subject to boundary conditions u(0,y)=0, u(a,y)=0, u(x,0)=0, u(x,b)=sin(πx/a)."
- "A random variable X has the probability density function f(x) = kx²(1-x) for 0≤x≤1. Find k and P(X>0.5)."
- "Using Newton-Raphson method, find the root of x³-2x-5=0 correct to 4 decimal places."

EXAMPLES OF BAD GENERIC QUESTIONS (DO NOT GENERATE):
- "Solve the given differential equation using an appropriate method."
- "Calculate the probability for the given random experiment."
- "Apply the appropriate transform method."

Return ONLY this JSON structure:
{
  "predictions": [
    {
      "topic": "Specific Topic Name",
      "question": "Complete specific question with all details and values",
      "difficulty": "Easy|Medium|Hard",
      "probability": 0.85,
      "type": "Short Answer|Long Answer",
      "marks": 2,
      "section": "A",
      "rationale": "Why this question is likely to appear"
    }
  ],
  "summary": ["Topic1", "Topic2", "Topic3", "Topic4", "Topic5"],
  "paperStructure": {
    "totalMarks": 70,
    "duration": "3 hours",
    "sections": [
      {"name": "A", "questions": 10, "marksEach": 2, "total": 20},
      {"name": "B", "questions": 5, "marksEach": 10, "total": 50}
    ]
  }
}

Generate exactly 15 questions:
- 10 questions for Section A (2 marks each, short answer type)
- 5 questions for Section B (10 marks each, long answer type)

Each question must be SPECIFIC with actual values, functions, or scenarios - NOT generic templates.`;
}

/**
 * Analyze questions with Gemini
 */
async function analyzeWithAI(extractedText, subject, examName) {
  const geminiModel = initializeGemini();
  
  if (!extractedText || extractedText.length < 100) {
    console.log('⚠️ Insufficient text to analyze');
    return generateSmartFallback(subject);
  }
  
  if (!geminiModel) {
    console.log('⚠️ Gemini not configured, using smart fallback');
    return generateSmartFallback(subject);
  }
  
  try {
    console.log(`🤖 Sending ${extractedText.length} chars to Gemini for analysis...`);
    
    const prompt = generateAnalysisPrompt(extractedText, subject, examName);
    
    const result = await geminiModel.generateContent({
      contents: [{ 
        role: 'user', 
        parts: [{ text: prompt }] 
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 6000,
        responseMimeType: 'application/json'
      }
    });
    
    const response = result.response;
    let content = response.text();
    
    console.log('📥 Received response from Gemini');
    
    // Clean up response
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    const parsed = JSON.parse(content);
    
    if (!parsed.predictions || !Array.isArray(parsed.predictions)) {
      throw new Error('Invalid response structure from Gemini');
    }
    
    // Add IDs and validate
    parsed.predictions = parsed.predictions
      .map((p, i) => ({
        id: i + 1,
        topic: p.topic || 'General',
        question: p.question || '',
        difficulty: ['Easy', 'Medium', 'Hard'].includes(p.difficulty) ? p.difficulty : 'Medium',
        probability: typeof p.probability === 'number' ? Math.min(0.95, Math.max(0.5, p.probability)) : 0.75,
        type: p.type || (p.section === 'A' ? 'Short Answer' : 'Long Answer'),
        marks: p.marks || (p.section === 'A' ? 2 : 10),
        rationale: p.rationale || 'Based on previous year analysis',
        section: ['A', 'B'].includes(p.section) ? p.section : (i < 10 ? 'A' : 'B')
      }))
      .filter(p => p.question.length > 20);
    
    console.log(`✅ Generated ${parsed.predictions.length} predictions`);
    
    return parsed;
  } catch (error) {
    console.error('❌ Gemini analysis error:', error.message);
    return generateSmartFallback(subject);
  }
}

/**
 * Generate smart fallback predictions for Mathematics-IV
 */
function generateSmartFallback(subject) {
  console.log('📊 Generating smart fallback predictions...');
  
  const sectionA = [
    { topic: 'Laplace Transform', question: 'Find the Laplace transform of t·sin(at).', marks: 2 },
    { topic: 'Inverse Laplace', question: 'Find L⁻¹{1/(s²+4s+13)}.', marks: 2 },
    { topic: 'Fourier Series', question: 'State Dirichlet conditions for Fourier series expansion.', marks: 2 },
    { topic: 'PDE Formation', question: 'Form the partial differential equation by eliminating arbitrary constants from z = ax + by + ab.', marks: 2 },
    { topic: 'Probability', question: 'Define mutually exclusive and independent events with examples.', marks: 2 },
    { topic: 'Random Variable', question: 'Define probability density function and state its properties.', marks: 2 },
    { topic: 'Normal Distribution', question: 'Write the probability density function of normal distribution and state its properties.', marks: 2 },
    { topic: 'Correlation', question: 'Define correlation coefficient and give its range.', marks: 2 },
    { topic: 'Hypothesis Testing', question: 'Define null hypothesis and alternative hypothesis.', marks: 2 },
    { topic: 'Chi-Square Test', question: 'State the formula for chi-square test statistic.', marks: 2 }
  ];
  
  const sectionB = [
    { topic: 'Laplace Transform Application', question: 'Using Laplace transform, solve the differential equation d²y/dt² + 4dy/dt + 3y = e⁻ᵗ, given y(0) = 1, y\'(0) = 0.', marks: 10 },
    { topic: 'Fourier Series', question: 'Find the Fourier series expansion of f(x) = x² in the interval (-π, π) and hence show that π²/6 = 1 + 1/4 + 1/9 + 1/16 + ...', marks: 10 },
    { topic: 'Partial Differential Equations', question: 'Solve the wave equation ∂²u/∂t² = c²(∂²u/∂x²) subject to conditions u(0,t) = 0, u(L,t) = 0, u(x,0) = f(x), ∂u/∂t(x,0) = 0.', marks: 10 },
    { topic: 'Probability Distribution', question: 'The probability density function of a random variable X is f(x) = kx²e⁻ˣ for x ≥ 0. Find: (i) value of k, (ii) mean, (iii) variance, (iv) P(X > 2).', marks: 10 },
    { topic: 'Regression Analysis', question: 'Fit a straight line y = a + bx to the following data using least squares method and estimate y when x = 6: x: 1, 2, 3, 4, 5 and y: 2, 5, 3, 8, 7.', marks: 10 }
  ];
  
  const predictions = [
    ...sectionA.map((q, i) => ({
      id: i + 1,
      ...q,
      difficulty: 'Easy',
      probability: 0.80 + Math.random() * 0.15,
      type: 'Short Answer',
      section: 'A',
      rationale: 'Frequently asked in AKTU exams'
    })),
    ...sectionB.map((q, i) => ({
      id: i + 11,
      ...q,
      difficulty: 'Hard',
      probability: 0.75 + Math.random() * 0.15,
      type: 'Long Answer',
      section: 'B',
      rationale: 'Important topic for long answer section'
    }))
  ];
  
  return {
    predictions,
    summary: ['Laplace Transform', 'Fourier Series', 'Partial Differential Equations', 'Probability & Statistics', 'Regression Analysis'],
    paperStructure: {
      totalMarks: 70,
      duration: '3 hours',
      sections: [
        { name: 'A', questions: 10, marksEach: 2, total: 20 },
        { name: 'B', questions: 5, marksEach: 10, total: 50 }
      ]
    }
  };
}

module.exports = {
  analyzeWithAI,
  generateSmartFallback,
  generateAnalysisPrompt,
  initializeGemini
};
