# QPatternLab

AI-powered exam question prediction platform that analyzes previous year question papers (PYQs) to predict likely questions for upcoming exams using advanced pattern recognition and machine learning.

![QPatternLab](https://img.shields.io/badge/QPatternLab-AI%20Powered-6366f1?style=for-the-badge)
![React](https://img.shields.io/badge/React-18-61dafb?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js)

## ✨ Features

- 🔐 **User Authentication** - Email/password and Google OAuth via Supabase
- 📄 **Multi-format Upload** - Support for PDF, images (PNG, JPG), and text files
- 🔍 **Smart OCR** - Extract text from scanned PDFs using Tesseract.js
- 🤖 **AI Analysis** - OpenAI-powered question pattern recognition
- 📊 **Interactive Dashboard** - Visualize trends, topic weightage, and difficulty progression
- 🎯 **Prediction Scores** - Confidence percentages for each predicted question
- 📥 **Export Options** - Download results as HTML, JSON, CSV, or TXT
- 🌙 **Dark Mode** - Beautiful glassmorphism UI with light/dark themes
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile

## 🏗️ Project Structure

```
├── client/                 # React frontend (Vite + TypeScript)
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── services/       # API client
│   │   ├── types/          # TypeScript types
│   │   └── data/           # Static data (exam templates)
│   └── ...
├── server/                 # Node.js backend (Express)
│   ├── src/
│   │   ├── routes/         # API route handlers
│   │   ├── services/       # Business logic
│   │   └── middleware/     # Express middleware
│   └── ...
├── database/               # Database schema
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- [Supabase](https://supabase.com) account (free tier works)
- [OpenAI](https://platform.openai.com) API key

### 1. Clone & Install

```bash
# Clone the repository
git clone https://github.com/yourusername/qpatternlab.git
cd qpatternlab

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
OPENAI_API_KEY=sk-your_openai_api_key
```

### 3. Database Setup

1. Create a new project at [Supabase](https://supabase.com)
2. Go to SQL Editor and run the contents of `database/schema.sql`
3. Copy your project URL and anon key to the `.env` files

### 4. Google OAuth Setup (Optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create OAuth 2.0 credentials
3. Add redirect URI: `https://your-project.supabase.co/auth/v1/callback`
4. In Supabase Dashboard → Authentication → Providers → Google:
   - Enable Google provider
   - Enter your Client ID and Client Secret

### 5. Start Development

```bash
# Terminal 1 - Start server
cd server && npm run dev

# Terminal 2 - Start client
cd client && npm run dev
```

- 🌐 Frontend: http://localhost:5173
- 🔧 Backend: http://localhost:3001
- 📡 API Health: http://localhost:3001/api/health

## 📡 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/health/detailed` | GET | Detailed system status |
| `/api/analyze` | POST | Upload and analyze PDFs |
| `/api/predictions/:code` | GET | Get predictions by subject code |
| `/api/predictions` | GET | List all analyzed subjects |
| `/api/progress/:jobId` | GET | SSE progress stream |
| `/api/analytics` | GET | Platform usage analytics |
| `/api/export` | POST | Export predictions |

## 🎨 UI Features

- **Glassmorphism Design** - Modern frosted glass effects
- **Particle Background** - Interactive particle animation
- **Gradient Orbs** - Animated floating gradient backgrounds
- **Smooth Animations** - Framer Motion powered transitions
- **Responsive Layout** - Mobile-first design approach

## 📋 Supported Exam Templates

- AKTU B.Tech (9 subjects)
- JEE Main/Advanced
- NEET UG
- GATE CS
- CBSE Board
- UPSC CSE
- Custom (user-defined)

## 🛠️ Tech Stack

### Frontend
- React 18 + TypeScript
- Vite (build tool)
- Tailwind CSS + shadcn/ui
- Framer Motion (animations)
- Recharts (data visualization)
- React Router v6
- TanStack Query

### Backend
- Node.js + Express
- pdf-parse & pdf2json (PDF extraction)
- pdfjs-dist (text layer extraction)
- Tesseract.js (OCR)
- OpenAI API (AI analysis)
- Joi (validation)
- Express Rate Limit

### Database & Auth
- Supabase (PostgreSQL)
- Supabase Auth (Email + Google OAuth)

## 📁 Key Files

```
client/
├── src/components/
│   ├── ParticleBackground.tsx   # Interactive particles
│   ├── GlassCard.tsx            # Glassmorphism card
│   ├── GradientOrbs.tsx         # Animated backgrounds
│   └── ...
├── src/pages/
│   ├── Index.tsx                # Landing page
│   ├── Upload.tsx               # File upload (auth required)
│   ├── Dashboard.tsx            # Results dashboard
│   ├── Login.tsx                # Authentication
│   └── ...
└── src/hooks/
    ├── useAuth.ts               # Auth state management
    └── useAnalysisHistory.ts    # History management

server/
├── src/services/
│   ├── aiAnalyzer.js            # OpenAI integration
│   ├── pdfExtractor.js          # PDF text extraction
│   ├── ocrExtractor.js          # OCR processing
│   └── questionExtractor.js     # Question parsing
└── src/routes/
    ├── analyze.js               # Main analysis endpoint
    └── ...
```

## 🔒 Security Features

- Input validation with Joi schemas
- Rate limiting on all endpoints
- Helmet.js security headers
- CORS configuration
- Authentication required for AI analysis
- No permanent file storage

## 📄 License

MIT License - feel free to use this project for learning and personal use.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

Built with ❤️ for students preparing for exams
