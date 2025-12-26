import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import GradientOrbs from "@/components/GradientOrbs";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { jsPDF } from "jspdf";
import { Download, TrendingUp, BarChart3, Target, BookOpen, ChevronDown, FileText, Percent, AlertTriangle, CheckCircle, Sparkles, Zap } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from "recharts";

const Dashboard = () => {
  const location = useLocation();
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [, setAnalysisData] = useState<any>(null);
  const [trendData] = useState<any[]>([]);
  const [chapterWeightage, setChapterWeightage] = useState<any[]>([]);
  const [difficultyTrend, setDifficultyTrend] = useState<any[]>([
    { year: '2021', easy: 5, medium: 8, hard: 4 },
    { year: '2022', easy: 4, medium: 10, hard: 5 },
    { year: '2023', easy: 6, medium: 7, hard: 6 },
    { year: '2024', easy: 5, medium: 9, hard: 5 },
    { year: '2025', easy: 7, medium: 6, hard: 6 },
  ]);
  const [predictedQuestions, setPredictedQuestions] = useState<any[]>([]);
  const [topicRecurrence, setTopicRecurrence] = useState<any[]>([]);
  const [stats, setStats] = useState({ papersAnalyzed: 0, questionsExtracted: 0, topicsCovered: 0, avgAccuracy: 0 });
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const state = location.state as any;
        if (state?.analysis) {
          setAnalysisData(state.analysis);
          processAnalysisData(state.analysis);
        } else {
          const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001';
          const subjectCode = state?.subjectCode || 'KCS301';
          
          // Build headers with auth token
          const headers: HeadersInit = {};
          if (session?.access_token) {
            headers['Authorization'] = `Bearer ${session.access_token}`;
          }
          
          const response = await fetch(`${API_BASE}/api/predictions/${subjectCode}`, { headers });
          if (response.ok) {
            const data = await response.json();
            setAnalysisData(data);
            processAnalysisData(data);
          } else {
            toast.error("Failed to load dashboard data");
          }
        }
      } catch (error) {
        toast.error("Error loading dashboard data");
      } finally {
        setLoading(false);
      }
    };
    loadDashboardData();
  }, [location.state, session]);

  const processAnalysisData = (data: any) => {
    if (!data) return;
    if (data.predictions?.length) {
      const questions = data.predictions.map((pred: any, idx: number) => ({
        id: pred.id || (idx + 1),
        topic: pred.topic || 'Unknown Topic',
        chapter: pred.topic || 'Unknown Topic',
        probability: typeof pred.probability === 'number' ? Math.round(pred.probability * 100) : 0,
        difficulty: pred.difficulty || 'Medium',
        question: pred.question || `Explain important concepts about ${pred.topic}`,
        type: pred.type || 'Long Answer',
        rationale: pred.rationale || 'This topic has appeared frequently in previous exams.',
        section: pred.section || 'A'
      }));
      setPredictedQuestions(questions);
    }
    if (data.recurrence?.length) setTopicRecurrence(data.recurrence);
    if (data.trends?.difficultyProgression) setDifficultyTrend(data.trends.difficultyProgression);
    if (data.summary?.length) {
      setChapterWeightage(data.summary.slice(0, 5).map((item: any, idx: number) => ({
        name: typeof item === 'string' ? item : item.topic || `Topic ${idx + 1}`,
        value: idx + 1,
        color: ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899'][idx % 5],
      })));
    }
    setStats({
      papersAnalyzed: data.analysis?.papersAnalyzed || 0,
      questionsExtracted: data.analysis?.questionsExtracted || 0,
      topicsCovered: data.analysis?.topicsCovered || 0,
      avgAccuracy: data.analysis?.avgAccuracy || 0,
    });
  };

  const getDifficultyColor = (d: string) => {
    if (d === "Easy") return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
    if (d === "Medium") return "text-amber-500 bg-amber-500/10 border-amber-500/20";
    if (d === "Hard") return "text-rose-500 bg-rose-500/10 border-rose-500/20";
    return "text-muted-foreground bg-muted";
  };

  const downloadPredictedPaper = () => {
    if (!predictedQuestions.length) { 
      toast.error("No predicted questions available"); 
      return; 
    }
    
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);
      let yPos = margin;
      
      // Helper function to add new page if needed
      const checkPageBreak = (requiredSpace: number) => {
        if (yPos + requiredSpace > pageHeight - margin) {
          doc.addPage();
          yPos = margin;
          return true;
        }
        return false;
      };
      
      // Helper function to wrap text
      const addWrappedText = (text: string, x: number, y: number, maxWidth: number, lineHeight: number, fontSize: number) => {
        doc.setFontSize(fontSize);
        const lines = doc.splitTextToSize(text, maxWidth);
        lines.forEach((line: string, index: number) => {
          checkPageBreak(lineHeight);
          doc.text(line, x, yPos + (index * lineHeight));
        });
        return lines.length * lineHeight;
      };
      
      // Title
      doc.setFillColor(99, 102, 241); // Primary color
      doc.rect(0, 0, pageWidth, 45, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.text("Predicted Question Paper", margin, 25);
      
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text(`Generated by PredictWiseAI | ${new Date().toLocaleDateString()}`, margin, 37);
      
      yPos = 60;
      doc.setTextColor(0, 0, 0);
      
      // Stats summary
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(margin, yPos, contentWidth, 25, 3, 3, 'F');
      
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      const statsText = `Papers Analyzed: ${stats.papersAnalyzed} | Questions Found: ${stats.questionsExtracted} | Topics: ${stats.topicsCovered} | Accuracy: ${stats.avgAccuracy}%`;
      doc.text(statsText, margin + 5, yPos + 15);
      
      yPos += 40;
      
      // Questions
      predictedQuestions.forEach((q, index) => {
        // Check if we need a new page (estimate space needed)
        checkPageBreak(60);
        
        // Question box background
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(226, 232, 240);
        
        // Left accent bar color based on difficulty
        if (q.difficulty === 'Easy') {
          doc.setFillColor(16, 185, 129); // Green
        } else if (q.difficulty === 'Medium') {
          doc.setFillColor(245, 158, 11); // Amber
        } else {
          doc.setFillColor(239, 68, 68); // Red
        }
        doc.rect(margin, yPos, 4, 50, 'F');
        
        // Question number and probability badge
        doc.setFillColor(99, 102, 241);
        doc.roundedRect(margin + 10, yPos + 3, 35, 12, 2, 2, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text(`Q${index + 1} - ${q.probability}%`, margin + 13, yPos + 11);
        
        // Difficulty badge
        if (q.difficulty === 'Easy') {
          doc.setFillColor(209, 250, 229);
          doc.setTextColor(6, 95, 70);
        } else if (q.difficulty === 'Medium') {
          doc.setFillColor(254, 243, 199);
          doc.setTextColor(146, 64, 14);
        } else {
          doc.setFillColor(254, 226, 226);
          doc.setTextColor(153, 27, 27);
        }
        doc.roundedRect(margin + 50, yPos + 3, 25, 12, 2, 2, 'F');
        doc.setFontSize(8);
        doc.text(q.difficulty, margin + 53, yPos + 11);
        
        // Topic
        doc.setTextColor(99, 102, 241);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(q.topic, margin + 10, yPos + 28);
        
        // Question text
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const questionLines = doc.splitTextToSize(q.question, contentWidth - 20);
        let questionHeight = 0;
        questionLines.forEach((line: string, lineIndex: number) => {
          doc.text(line, margin + 10, yPos + 38 + (lineIndex * 5));
          questionHeight = 38 + ((lineIndex + 1) * 5);
        });
        
        // Type badge
        doc.setFillColor(241, 245, 249);
        doc.setTextColor(71, 85, 105);
        doc.setFontSize(8);
        const typeText = `Type: ${q.type}`;
        doc.text(typeText, margin + 10, yPos + questionHeight + 8);
        
        yPos += Math.max(55, questionHeight + 15);
        
        // Add spacing between questions
        yPos += 8;
      });
      
      // Footer on last page
      const totalPages = doc.internal.pages.length - 1;
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 20, pageHeight - 10);
        doc.text("PredictWiseAI - AI-Powered Exam Prediction", margin, pageHeight - 10);
      }
      
      // Save the PDF
      const fileName = `Predicted_Questions_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      toast.success("PDF downloaded successfully!");
      
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error("Failed to generate PDF");
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16 flex items-center justify-center min-h-[60vh]">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center mx-auto mb-6"
          >
            <Sparkles className="w-8 h-8 text-white" />
          </motion.div>
          <h2 className="text-xl font-semibold mb-2">Loading Dashboard</h2>
          <p className="text-muted-foreground">Preparing your predictions...</p>
        </motion.div>
      </main>
      <Footer />
    </div>
  );

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <GradientOrbs variant="minimal" />
      <Navbar />
      
      <main className="pt-24 pb-16 relative z-10">
        <div className="container mx-auto px-4">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
          >
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-card mb-3">
                <Zap className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">AI Analysis Complete</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold">
                Prediction <span className="text-gradient">Dashboard</span>
              </h1>
            </div>
            <Button 
              variant="hero" 
              onClick={downloadPredictedPaper}
              className="shadow-glow"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Paper
            </Button>
          </motion.div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { icon: FileText, label: "Papers Analyzed", value: stats.papersAnalyzed, gradient: "from-violet-500 to-purple-500" },
              { icon: Target, label: "Questions Found", value: stats.questionsExtracted, gradient: "from-blue-500 to-cyan-500" },
              { icon: BookOpen, label: "Topics Covered", value: stats.topicsCovered, gradient: "from-emerald-500 to-teal-500" },
              { icon: Percent, label: "Accuracy", value: `${stats.avgAccuracy}%`, gradient: "from-amber-500 to-orange-500" },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -4 }}
                className="glass-card p-5 rounded-2xl"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center mb-4 shadow-lg`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                <p className="text-3xl font-bold mb-1">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </motion.div>
            ))}
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Topic Trends */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-card p-6 rounded-2xl"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-semibold text-lg">Topic Trends</h3>
              </div>
              <div className="h-64">
                <ResponsiveContainer>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="year" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px' }} />
                    <Line type="monotone" dataKey="mechanics" stroke="#6366f1" strokeWidth={3} dot={{ fill: '#6366f1', strokeWidth: 2 }} />
                    <Line type="monotone" dataKey="thermodynamics" stroke="#8b5cf6" strokeWidth={3} dot={{ fill: '#8b5cf6', strokeWidth: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Chapter Weightage */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="glass-card p-6 rounded-2xl"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-semibold text-lg">Chapter Weightage</h3>
              </div>
              <div className="h-64">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={chapterWeightage} innerRadius={60} outerRadius={90} dataKey="value" paddingAngle={5}>
                      {chapterWeightage.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Difficulty Progression */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="glass-card p-6 rounded-2xl"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-semibold text-lg">Difficulty Progression</h3>
              </div>
              <div className="h-64">
                <ResponsiveContainer>
                  <AreaChart data={difficultyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="year" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px' }} />
                    <Area type="monotone" dataKey="easy" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
                    <Area type="monotone" dataKey="medium" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} />
                    <Area type="monotone" dataKey="hard" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* High Recurrence Topics */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="glass-card p-6 rounded-2xl"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center">
                  <Target className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-semibold text-lg">High Recurrence Topics</h3>
              </div>
              <div className="space-y-3">
                {topicRecurrence.map((t, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.1 }}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-xl"
                  >
                    <div>
                      <p className="font-medium">{t.topic}</p>
                      <p className="text-xs text-muted-foreground">Last asked: {t.lastAsked}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${t.frequency * 10}%` }}
                          transition={{ delay: 0.8 + i * 0.1, duration: 0.5 }}
                          className="h-full bg-gradient-primary rounded-full"
                        />
                      </div>
                      <span className="text-sm font-semibold w-8">{t.frequency}/10</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Predicted Questions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="glass-card p-6 rounded-2xl"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Predicted Questions</h3>
                <p className="text-sm text-muted-foreground">{predictedQuestions.length} questions predicted</p>
              </div>
            </div>
            
            <div className="space-y-4">
              {predictedQuestions.map((q, index) => (
                <motion.div
                  key={q.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 + index * 0.05 }}
                  className="border border-border/50 rounded-2xl overflow-hidden bg-background/50"
                >
                  <button 
                    onClick={() => setExpandedQuestion(expandedQuestion === q.id ? null : q.id)} 
                    className="w-full p-5 flex items-center justify-between hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <motion.div 
                        whileHover={{ scale: 1.1 }}
                        className="w-14 h-14 rounded-2xl bg-gradient-primary flex items-center justify-center text-white font-bold text-lg shadow-glow"
                      >
                        {q.probability}%
                      </motion.div>
                      <div className="text-left">
                        <p className="font-semibold">{q.topic}</p>
                        <p className="text-sm text-muted-foreground">{q.type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1.5 rounded-full text-xs font-medium border ${getDifficultyColor(q.difficulty)}`}>
                        {q.difficulty}
                      </span>
                      <motion.div
                        animate={{ rotate: expandedQuestion === q.id ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      </motion.div>
                    </div>
                  </button>
                  
                  <AnimatePresence>
                    {expandedQuestion === q.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5 space-y-4">
                          <div className="p-4 bg-muted/30 rounded-xl">
                            <p className="text-sm font-semibold mb-2 text-primary">Question:</p>
                            <p className="leading-relaxed">{q.question}</p>
                          </div>
                          {q.rationale && (
                            <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
                              <p className="text-sm font-semibold mb-2 text-primary">Why this is predicted:</p>
                              <p className="text-sm text-muted-foreground italic">{q.rationale}</p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Dashboard;
