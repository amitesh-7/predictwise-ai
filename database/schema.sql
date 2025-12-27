-- PredictWiseAI Database Schema
-- Run this SQL in your Supabase project's SQL Editor

-- Drop existing tables (optional - uncomment if you want to reset)
-- DROP TABLE IF EXISTS user_analyses CASCADE;
-- DROP TABLE IF EXISTS analysis_results CASCADE;
-- DROP TABLE IF EXISTS predictions CASCADE;
-- DROP TABLE IF EXISTS pyqs CASCADE;
-- DROP TABLE IF EXISTS exam_templates CASCADE;

-- User analysis history (main table for storing all predictions)
CREATE TABLE IF NOT EXISTS user_analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_code TEXT NOT NULL,
  subject_name TEXT NOT NULL,
  exam_name TEXT,
  analysis_data JSONB NOT NULL,
  files_count INTEGER DEFAULT 0,
  questions_extracted INTEGER DEFAULT 0,
  predictions_count INTEGER DEFAULT 0,
  processing_time INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create PYQs table (Previous Year Questions)
CREATE TABLE IF NOT EXISTS pyqs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  filename TEXT NOT NULL,
  subject_code TEXT NOT NULL,
  subject_name TEXT NOT NULL,
  year INTEGER NOT NULL,
  exam_type TEXT NOT NULL,
  file_url TEXT,
  extracted_text TEXT,
  questions JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create predictions table
CREATE TABLE IF NOT EXISTS predictions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_code TEXT NOT NULL,
  topic TEXT NOT NULL,
  question TEXT NOT NULL,
  difficulty TEXT CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
  question_type TEXT,
  probability DECIMAL(3,2),
  predicted_year INTEGER,
  analysis_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create analysis_results table
CREATE TABLE IF NOT EXISTS analysis_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  subject_code TEXT NOT NULL,
  analysis_type TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Exam templates table
CREATE TABLE IF NOT EXISTS exam_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  subjects JSONB NOT NULL DEFAULT '[]',
  question_format TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_analyses_user ON user_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_analyses_subject ON user_analyses(subject_code);
CREATE INDEX IF NOT EXISTS idx_user_analyses_created ON user_analyses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pyqs_subject_year ON pyqs(subject_code, year);
CREATE INDEX IF NOT EXISTS idx_predictions_subject ON predictions(subject_code);
CREATE INDEX IF NOT EXISTS idx_analysis_subject_type ON analysis_results(subject_code, analysis_type);

-- Enable Row Level Security
ALTER TABLE user_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE pyqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_templates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own analyses" ON user_analyses;
DROP POLICY IF EXISTS "Users can insert own analyses" ON user_analyses;
DROP POLICY IF EXISTS "Users can delete own analyses" ON user_analyses;
DROP POLICY IF EXISTS "Allow all on pyqs" ON pyqs;
DROP POLICY IF EXISTS "Allow all on predictions" ON predictions;
DROP POLICY IF EXISTS "Allow all on analysis_results" ON analysis_results;
DROP POLICY IF EXISTS "Public read templates" ON exam_templates;

-- Policies for user_analyses (user-specific)
CREATE POLICY "Users can view own analyses" ON user_analyses 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analyses" ON user_analyses 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own analyses" ON user_analyses 
  FOR DELETE USING (auth.uid() = user_id);

-- Policies for other tables
CREATE POLICY "Allow all on pyqs" ON pyqs FOR ALL USING (true);
CREATE POLICY "Allow all on predictions" ON predictions FOR ALL USING (true);
CREATE POLICY "Allow all on analysis_results" ON analysis_results FOR ALL USING (true);
CREATE POLICY "Public read templates" ON exam_templates FOR SELECT USING (true);
