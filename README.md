# PredictWiseAI

AI-powered exam question prediction platform that analyzes previous year question papers (PYQs) to predict likely questions for upcoming exams using Google Gemini AI and advanced OCR.

![PredictWiseAI](https://img.shields.io/badge/PredictWiseAI-AI%20Powered-6366f1?style=for-the-badge)
![React](https://img.shields.io/badge/React-18-61dafb?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js)
![Gemini](https://img.shields.io/badge/Google-Gemini%20AI-4285F4?style=flat-square&logo=google)

## ✨ Features

- 🔐 **User Authentication** - Email/password and Google OAuth via Supabase
- � ***Multi-format Upload** - Support for PDF, images (PNG, JPG), and text files
- 🔍 **Advanced OCR** - Extract text from scanned PDFs using Tesseract.js + pdf-to-png-converter
- 🤖 **Gemini AI Analysis** - Google Gemini 3 Flash powered question prediction
- 📊 **Interactive Dashboard** - Visualize topic distribution, difficulty trends, and recurrence
- � **Expam Paper Format** - Questions organized by Section A (2 marks), B (5 marks), C (10 marks)
- 📥 **PDF Export** - Download predicted papers as professionally formatted PDFs
- 🎆 **Particle Animation** - Interactive particle background with mouse tracking
- 🌙 **Dark Mode** - Beautiful glassmorphism UI optimized for dark theme
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile

## 🏗️ Project Structure

```
├── client/                 # React frontend (Vite + TypeScript)
│   ├── src/
│   │   ├── components/     # UI components (ParticleBackground, Navbar, etc.)
│   │   ├── pages/          # Page components (Dashboard, Upload, Login, etc.)
│   │   ├── hooks/          # Custom hooks (useAuth, useAnalysisHistory)
│   │   ├── integrations/   # Supabase client
│   │   ├── types/          # TypeScript types
│   │   └── data/           # Exam templates
│   ├── vercel.json         # Vercel deployment config
│   └── package.json
├── server/                 # Node.js backend (Express)
│   ├── src/
│   │   ├── routes/         # API routes (analyze, predictions, etc.)
│   │   ├── services/       # Core services (aiAnalyzer, ocrExtractor, etc.)
│   │   └── middleware/     # Validation, rate limiting
│   ├── vercel.json         # Vercel deployment config
│   └── package.json
├── database/
│   ├── schema.sql          # Supabase database schema
│   └── README.md
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- [Supabase](https://supabase.com) account (free tier works)
- [Google AI Studio](https://aistudio.google.com) API key (Gemini)

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/predictwiseai.git
cd predictwiseai

# Install client dependencies
cd client && npm install

# Install server dependencies
cd ../server && npm install
```

### 2. Environment Setup

**Client** (`client/.env`):
```env
VITE_API_BASE=http://localhost:3001
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Server** (`server/.env`):
```env
PORT=3001
NODE_ENV=development
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
```

### 3. Database Setup

1. Create a new project at [Supabase](https://supabase.com)
2. Go to SQL Editor and run the contents of `database/schema.sql`
3. Copy your project URL and anon key to the `.env` files

### 4. Start Development

```bash
# Terminal 1 - Start server
cd server && npm run dev

# Terminal 2 - Start client
cd client && npm run dev
```

- 🌐 Frontend: http://localhost:5173
- 🔧 Backend: http://localhost:3001
- 📡 API Health: http://localhost:3001/api/health

## 🚀 Deployment (Vercel)

### Deploy Server
```bash
cd server
vercel --prod
```

### Deploy Client
```bash
cd client
vercel --prod
```

### Environment Variables

**Client (Vercel Dashboard):**
| Variable | Description |
|----------|-------------|
| `VITE_API_BASE` | Your deployed server URL |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key |

**Server (Vercel Dashboard):**
| Variable | Description |
|----------|-------------|
| `NODE_ENV` | `production` |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon key |
| `GEMINI_API_KEY` | Google Gemini API key |
| `ALLOWED_ORIGINS` | Your client URL (for CORS) |

## 📡 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | API info and status |
| `/api/health` | GET | Health check |
| `/api/analyze` | POST | Upload and analyze PDFs (auth required) |
| `/api/predictions/:code` | GET | Get predictions by subject code |
| `/api/predictions` | GET | List all analyzed subjects |
| `/api/progress/:jobId` | GET | SSE progress stream |
| `/api/analytics` | GET | Platform usage analytics |
| `/api/export` | POST | Export predictions |

## 🎨 Key Components

### ParticleBackground
Interactive canvas-based particle system with:
- Pulsing/glowing particles
- Mouse-tracking connections
- Smooth floating animation
- Multi-color gradient effects

### Dashboard
- Stats cards (papers analyzed, questions found, topics, accuracy)
- Topic distribution pie chart
- Difficulty trend area chart
- High recurrence topics with progress bars
- Section-wise question display (A, B, C)
- Expandable question cards with rationale
- PDF download with exam paper formatting

### OCR Pipeline
1. PDF text extraction (pdf-parse, pdf2json)
2. If scanned → Convert to PNG (pdf-to-png-converter)
3. Run Tesseract.js OCR on images
4. Clean OCR garbage patterns
5. Extract topics and send to Gemini AI

## 📋 Supported Exam Templates

- AKTU B.Tech (multiple subjects)
- JEE Main/Advanced
- NEET UG
- GATE CS
- CBSE Board
- UPSC CSE
- Custom (user-defined)

## 🛠️ Tech Stack

### Frontend
- React 18 + TypeScript
- Vite
- Tailwind CSS + shadcn/ui
- Framer Motion
- Recharts
- jsPDF
- React Router v6

### Backend
- Node.js + Express
- Google Gemini AI (@google/generative-ai)
- Tesseract.js (OCR)
- pdf-to-png-converter
- pdf-parse, pdf2json
- Joi (validation)
- Express Rate Limit

### Database & Auth
- Supabase (PostgreSQL)
- Supabase Auth
- Row Level Security (RLS)

## 📁 Database Schema

```sql
-- Main tables
user_analyses    -- Stores analysis results per user
predictions      -- Individual predictions
analysis_results -- Analysis metadata
pyqs            -- Previous year questions
exam_templates  -- Exam configuration

-- RLS enabled for user-specific data access
```

## 🔒 Security

- JWT authentication via Supabase
- Row Level Security on all tables
- Input validation with Joi
- Rate limiting (100 req/15min general, 10 req/hour for analysis)
- Helmet.js security headers
- CORS configuration
- No permanent file storage

## 📄 License

MIT License

---

Built with ❤️ for students preparing for exams
