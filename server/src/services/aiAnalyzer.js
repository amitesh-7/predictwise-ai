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
 * Generate analysis prompt - completely dynamic based on extracted content
 */
function generateAnalysisPrompt(extractedText, subject, examName) {
  return `You are an expert exam paper analyzer and predictor.

SUBJECT: ${subject || 'Unknown Subject'}
EXAM: ${examName || 'University Examination'}

I have extracted text from previous year question papers. Analyze this content and generate a PREDICTED QUESTION PAPER for the upcoming exam.

EXTRACTED TEXT FROM PREVIOUS PAPERS:
"""
${extractedText.substring(0, 12000)}
"""

YOUR TASK:
1. ANALYZE the extracted text to understand what subject/topics it covers
2. IDENTIFY the actual questions, topics, and patterns from the text
3. GENERATE predicted questions based ONLY on what you see in the extracted text
4. DO NOT assume or add topics that are not present in the extracted content

IMPORTANT RULES:
- Generate questions ONLY related to topics found in the extracted text
- If the text is about Human Values, generate Human Values questions
- If the text is about Physics, generate Physics questions
- If the text is about any other subject, generate questions for THAT subject
- DO NOT generate Mathematics questions unless the extracted text is about Mathematics
- Match the style and format of questions from the extracted text

PAPER FORMAT (adapt based on extracted content):
- Section A: Short Answer Questions (2 marks each) - definitions, brief explanations
- Section B: Medium/Long Answer Questions (5-10 marks each) - detailed explanations, essays

For each question:
- Make it SPECIFIC based on the actual content from the papers
- Use terminology and concepts from the extracted text
- Match the difficulty level seen in the papers

Return ONLY this JSON structure:
{
  "predictions": [
    {
      "topic": "Actual topic from the extracted text",
      "question": "Specific question based on the content",
      "difficulty": "Easy|Medium|Hard",
      "probability": 0.85,
      "type": "Short Answer|Long Answer",
      "marks": 2,
      "section": "A",
      "rationale": "Why this question is likely based on the papers"
    }
  ],
  "summary": ["Topic1", "Topic2", "Topic3", "Topic4", "Topic5"],
  "detectedSubject": "The subject detected from the content",
  "paperStructure": {
    "totalMarks": 70,
    "duration": "3 hours",
    "sections": [
      {"name": "A", "questions": 10, "marksEach": 2, "total": 20},
      {"name": "B", "questions": 5, "marksEach": 10, "total": 50}
    ]
  }
}

Generate 15 questions total:
- 10 for Section A (short answer, 2 marks)
- 5 for Section B (long answer, 10 marks)

Base ALL questions on the actual content extracted. Do not invent topics not present in the text.`;
}

/**
 * Analyze with Gemini
 */
async function analyzeWithAI(extractedText, subject, examName) {
  const geminiModel = initializeGemini();
  
  if (!extractedText || extractedText.length < 100) {
    console.log('⚠️ Insufficient text to analyze');
    return {
      predictions: [],
      summary: [],
      error: 'Insufficient text extracted from documents'
    };
  }
  
  if (!geminiModel) {
    console.log('⚠️ Gemini not configured');
    return {
      predictions: [],
      summary: [],
      error: 'AI service not configured'
    };
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
        maxOutputTokens: 8000,
        responseMimeType: 'application/json'
      }
    });
    
    const response = result.response;
    let content = response.text();
    
    console.log('📥 Received response from Gemini');
    
    // Clean up response
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    // Try to fix common JSON issues
    try {
      // Fix unterminated strings by finding incomplete strings at the end
      if (content.lastIndexOf('"') > content.lastIndexOf('"}')) {
        content = content.substring(0, content.lastIndexOf('"')) + '"}]}';
      }
    } catch (e) {}
    
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (parseError) {
      console.error('JSON parse error, attempting to extract predictions...');
      // Try to extract predictions array manually
      const predictionsMatch = content.match(/"predictions"\s*:\s*\[([\s\S]*?)\]/);
      if (predictionsMatch) {
        try {
          const fixedContent = `{"predictions": [${predictionsMatch[1]}], "summary": []}`;
          parsed = JSON.parse(fixedContent);
        } catch (e) {
          throw new Error('Could not parse AI response');
        }
      } else {
        throw parseError;
      }
    }
    
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
        section: ['A', 'B', 'C'].includes(p.section) ? p.section : (i < 10 ? 'A' : 'B')
      }))
      .filter(p => p.question.length > 15);
    
    // Update subject if detected
    if (parsed.detectedSubject) {
      console.log(`   Detected subject: ${parsed.detectedSubject}`);
    }
    
    console.log(`✅ Generated ${parsed.predictions.length} predictions`);
    
    return parsed;
  } catch (error) {
    console.error('❌ Gemini analysis error:', error.message);
    
    // Try to generate fallback based on extracted text
    return generateDynamicFallback(extractedText, subject);
  }
}

/**
 * Generate dynamic fallback based on extracted text
 */
function generateDynamicFallback(extractedText, subject) {
  console.log('📊 Generating dynamic fallback predictions...');
  
  // Extract key topics/words from the text
  const words = extractedText.toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 4);
  
  // Count word frequency
  const wordCount = {};
  words.forEach(w => {
    wordCount[w] = (wordCount[w] || 0) + 1;
  });
  
  // Get top topics (most frequent meaningful words)
  const stopWords = new Set(['which', 'their', 'about', 'would', 'there', 'these', 'being', 'between', 'through', 'during', 'before', 'after', 'above', 'below', 'should', 'could', 'might', 'must', 'shall', 'will', 'have', 'been', 'were', 'they', 'them', 'this', 'that', 'with', 'from', 'your', 'what', 'when', 'where', 'write', 'explain', 'define', 'discuss', 'describe', 'marks', 'answer', 'question', 'following', 'given']);
  
  const topTopics = Object.entries(wordCount)
    .filter(([word]) => !stopWords.has(word))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([word]) => word.charAt(0).toUpperCase() + word.slice(1));
  
  // Generate questions based on detected topics
  const predictions = [];
  const questionTemplates = {
    sectionA: [
      'Define {topic} and explain its significance.',
      'What do you understand by {topic}?',
      'List the key characteristics of {topic}.',
      'Explain the concept of {topic} briefly.',
      'What is the importance of {topic}?',
      'Define {topic} with examples.',
      'What are the main features of {topic}?',
      'Briefly explain {topic}.',
      'What is meant by {topic}?',
      'State the meaning of {topic}.'
    ],
    sectionB: [
      'Discuss {topic} in detail with suitable examples.',
      'Explain the role of {topic} in modern context. Elaborate with examples.',
      'What is {topic}? Discuss its importance and applications.',
      'Critically analyze the concept of {topic} and its relevance.',
      'Write a detailed note on {topic} with appropriate examples.'
    ]
  };
  
  // Generate Section A questions
  for (let i = 0; i < 10 && i < topTopics.length; i++) {
    const topic = topTopics[i];
    const template = questionTemplates.sectionA[i % questionTemplates.sectionA.length];
    predictions.push({
      id: i + 1,
      topic: topic,
      question: template.replace('{topic}', topic.toLowerCase()),
      difficulty: 'Easy',
      probability: 0.75 + Math.random() * 0.15,
      type: 'Short Answer',
      marks: 2,
      section: 'A',
      rationale: `Topic "${topic}" appears frequently in the uploaded papers`
    });
  }
  
  // Generate Section B questions
  for (let i = 0; i < 5 && i < topTopics.length; i++) {
    const topic = topTopics[i];
    const template = questionTemplates.sectionB[i % questionTemplates.sectionB.length];
    predictions.push({
      id: 11 + i,
      topic: topic,
      question: template.replace('{topic}', topic.toLowerCase()),
      difficulty: 'Hard',
      probability: 0.70 + Math.random() * 0.15,
      type: 'Long Answer',
      marks: 10,
      section: 'B',
      rationale: `Important topic for detailed answer based on paper analysis`
    });
  }
  
  return {
    predictions,
    summary: topTopics.slice(0, 5),
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
  generateAnalysisPrompt,
  initializeGemini
};
