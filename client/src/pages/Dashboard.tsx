import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ParticleBackground from "@/components/ParticleBackground";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import { Download, BarChart3, Target, BookOpen, ChevronDown, FileText, Percent, AlertTriangle, CheckCircle, Sparkles, Zap, Upload } from "lucide-react";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from "recharts";

interface PredictedQuestion {
  id: number;
  topic: string;
  probability: number;
  difficulty: string;
  question: string;
  type: string;
  rationale: string;
  section: string;
  marks: number;
}

const Dashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [chapterWeightage, setChapterWeightage] = useState<any[]>([]);
  const [difficultyTrend, setDifficultyTrend] = useState<any[]>([]);
  const [predictedQuestions, setPredictedQuestions] = useState<PredictedQuestion[]>([]);
  const [topicRecurrence, setTopicRecurrence] = useState<any[]>([]);
  const [stats, setStats] = useState({ papersAnalyzed: 0, questionsExtracted: 0, topicsCovered: 0, avgAccuracy: 0 });
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);
  const [currentExamInfo, setCurrentExamInfo] = useState({ name: '', subject: '', subjectCode: '' });
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    // Clear any stale state and check for fresh analysis data
    const state = location.state as any;
    
    // Only load data if it's a fresh analysis (has timestamp within last 5 minutes)
    const isFreshAnalysis = state?.analysis?.generatedAt && 
      (Date.now() - new Date(state.analysis.generatedAt).getTime()) < 5 * 60 * 1000;
    
    if (state?.analysis && isFreshAnalysis) {
      processAnalysisData(state.analysis);
      if (state.analysis.exam) {
        setCurrentExamInfo({
          name: state.analysis.exam.name || '',
          subject: state.analysis.exam.subject || '',
          subjectCode: state.analysis.exam.subjectCode || ''
        });
      }
      setHasData(true);
      
      // Clear the location state to prevent stale data on refresh
      window.history.replaceState({}, document.title);
    } else {
      setHasData(false);
      setPredictedQuestions([]);
      setChapterWeightage([]);
      setDifficultyTrend([]);
      setTopicRecurrence([]);
      setStats({ papersAnalyzed: 0, questionsExtracted: 0, topicsCovered: 0, avgAccuracy: 0 });
    }
    setLoading(false);
  }, [location.state]);

  const processAnalysisData = (data: any) => {
    if (!data) return;
    if (data.predictions?.length) {
      const questions = data.predictions.map((pred: any, idx: number) => ({
        id: pred.id || (idx + 1),
        topic: pred.topic || 'Unknown Topic',
        probability: typeof pred.probability === 'number' ? Math.round(pred.probability * 100) : 0,
        difficulty: pred.difficulty || 'Medium',
        question: pred.question || `Explain important concepts about ${pred.topic}`,
        type: pred.type || 'Long Answer',
        rationale: pred.rationale || 'This topic has appeared frequently in previous exams.',
        section: pred.section || 'B',
        marks: pred.marks || (pred.section === 'A' ? 2 : pred.section === 'B' ? 5 : 10)
      }));
      setPredictedQuestions(questions);
    }
    if (data.recurrence?.length) setTopicRecurrence(data.recurrence);
    if (data.trends?.difficultyProgression?.length) setDifficultyTrend(data.trends.difficultyProgression);
    if (data.summary?.length) {
      setChapterWeightage(data.summary.slice(0, 5).map((item: any, idx: number) => ({
        name: typeof item === 'string' ? item : item.topic || `Topic ${idx + 1}`,
        value: 20 - idx * 3,
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
    if (d === "Easy") return "text-emerald-400 bg-emerald-500/20 border-emerald-500/30";
    if (d === "Medium") return "text-amber-400 bg-amber-500/20 border-amber-500/30";
    if (d === "Hard") return "text-rose-400 bg-rose-500/20 border-rose-500/30";
    return "text-muted-foreground bg-muted";
  };

  const getSectionQuestions = (section: string) => predictedQuestions.filter(q => q.section === section);

  const getSectionInfo = (section: string) => {
    const info: Record<string, { title: string; marks: number; description: string }> = {
      'A': { title: 'Section A - Short Answer', marks: 2, description: 'Answer all questions briefly (2 marks each)' },
      'B': { title: 'Section B - Medium Answer', marks: 5, description: 'Answer with detailed explanations (5 marks each)' },
      'C': { title: 'Section C - Long Answer', marks: 10, description: 'Answer comprehensively with examples (10 marks each)' }
    };
    return info[section] || { title: `Section ${section}`, marks: 5, description: '' };
  };

  const downloadPredictedPaper = () => {
    if (!predictedQuestions.length) { toast.error("No predicted questions available"); return; }
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - (margin * 2);
      let yPos = margin;
      
      const checkPageBreak = (space: number) => { if (yPos + space > pageHeight - margin) { doc.addPage(); yPos = margin; } };
      
      doc.setFillColor(99, 102, 241);
      doc.rect(0, 0, pageWidth, 50, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text(currentExamInfo.name || "University Examination", pageWidth / 2, 18, { align: 'center' });
      doc.setFontSize(14);
      doc.text(currentExamInfo.subject || "Subject", pageWidth / 2, 30, { align: 'center' });
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Subject Code: ${currentExamInfo.subjectCode || 'N/A'} | Time: 3 Hours | Max Marks: 70`, pageWidth / 2, 42, { align: 'center' });
      
      yPos = 60;
      doc.setTextColor(0, 0, 0);
      
      ['A', 'B', 'C'].forEach(section => {
        const sectionQuestions = predictedQuestions.filter(q => q.section === section);
        if (sectionQuestions.length === 0) return;
        const sectionInfo = getSectionInfo(section);
        checkPageBreak(30);
        doc.setFillColor(99, 102, 241);
        doc.roundedRect(margin, yPos, contentWidth, 12, 2, 2, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(`${sectionInfo.title} (${sectionInfo.marks} marks each)`, margin + 5, yPos + 8);
        yPos += 18;
        doc.setTextColor(0, 0, 0);
        
        sectionQuestions.forEach((q, idx) => {
          checkPageBreak(20);
          const qNum = section === 'A' ? idx + 1 : section === 'B' ? idx + 6 : idx + 11;
          doc.setFontSize(10);
          doc.setFont("helvetica", "bold");
          doc.text(`Q${qNum}.`, margin, yPos + 5);
          doc.setFont("helvetica", "normal");
          const lines = doc.splitTextToSize(q.question, contentWidth - 15);
          lines.forEach((line: string, i: number) => { checkPageBreak(5); doc.text(line, margin + 12, yPos + 5 + (i * 5)); });
          yPos += 10 + (lines.length * 5);
        });
        yPos += 5;
      });
      
      doc.save(`${currentExamInfo.subject || 'Predicted'}_Paper_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success("PDF downloaded!");
    } catch (e) { toast.error("Failed to generate PDF"); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background relative">
        <ParticleBackground />
        <div className="relative z-10">
          <Navbar />
          <main className="pt-24 pb-16 flex items-center justify-center min-h-[60vh]">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="w-16 h-16 rounded-2xl bg-gradient-to-r from-primary to-purple-500 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary/25">
                <Sparkles className="w-8 h-8 text-white" />
              </motion.div>
              <h2 className="text-xl font-semibold mb-2">Loading Dashboard</h2>
              <p className="text-muted-foreground">Preparing your predictions...</p>
            </motion.div>
          </main>
          <Footer />
        </div>
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="min-h-screen bg-background relative">
        <ParticleBackground />
        <div className="relative z-10">
          <Navbar />
          <main className="pt-24 pb-16">
            <div className="container mx-auto px-4">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
                <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card mb-6">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">AI-Powered Predictions</span>
                </motion.div>
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
                  Prediction <span className="text-gradient">Dashboard</span>
                </h1>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="max-w-lg mx-auto">
                <div className="glass-card p-12 rounded-2xl text-center border border-border/50">
                  <motion.div whileHover={{ scale: 1.05, rotate: 5 }} className="w-24 h-24 rounded-2xl bg-gradient-to-r from-primary to-purple-500 flex items-center justify-center mx-auto mb-8 shadow-lg shadow-primary/25">
                    <Upload className="w-12 h-12 text-white" />
                  </motion.div>
                  <h2 className="text-2xl font-bold mb-3">No Predictions Yet</h2>
                  <p className="text-muted-foreground mb-8">Upload your previous year question papers to generate AI-powered predictions for your upcoming exams.</p>
                  <Button onClick={() => navigate('/upload')} size="lg" className="bg-gradient-to-r from-primary to-purple-500 hover:opacity-90 text-white shadow-lg shadow-primary/25 px-8">
                    <Upload className="w-5 h-5 mr-2" />Upload Papers
                  </Button>
                </div>
              </motion.div>
            </div>
          </main>
          <Footer />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative">
      <ParticleBackground />
      <div className="relative z-10">
        <Navbar />
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4">
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card mb-4">
                  <Zap className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">AI Analysis Complete</span>
                </motion.div>
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-2">
                  Prediction <span className="text-gradient">Dashboard</span>
                </h1>
                {currentExamInfo.subject && (
                  <p className="text-muted-foreground text-lg">{currentExamInfo.subject} ({currentExamInfo.subjectCode})</p>
                )}
              </div>
              <Button onClick={downloadPredictedPaper} size="lg" className="bg-gradient-to-r from-primary to-purple-500 hover:opacity-90 text-white shadow-lg shadow-primary/25">
                <Download className="w-5 h-5 mr-2" />Download Paper
              </Button>
            </motion.div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
              {[
                { icon: FileText, label: "Papers Analyzed", value: stats.papersAnalyzed, gradient: "from-violet-500 to-purple-500" },
                { icon: Target, label: "Questions Found", value: stats.questionsExtracted, gradient: "from-blue-500 to-cyan-500" },
                { icon: BookOpen, label: "Topics Covered", value: stats.topicsCovered, gradient: "from-emerald-500 to-teal-500" },
                { icon: Percent, label: "Accuracy", value: `${stats.avgAccuracy}%`, gradient: "from-amber-500 to-orange-500" },
              ].map((stat, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} whileHover={{ y: -4, scale: 1.02 }} className="glass-card p-6 rounded-2xl border border-border/50">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center mb-4 shadow-lg`}>
                    <stat.icon className="w-7 h-7 text-white" />
                  </div>
                  <p className="text-3xl font-bold mb-1">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </motion.div>
              ))}
            </div>

            {/* Charts */}
            {(chapterWeightage.length > 0 || difficultyTrend.length > 0 || topicRecurrence.length > 0) && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
                {chapterWeightage.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-6 rounded-2xl border border-border/50">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
                        <BarChart3 className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="font-semibold text-lg">Topic Distribution</h3>
                    </div>
                    <div className="h-64">
                      <ResponsiveContainer>
                        <PieChart>
                          <Pie data={chapterWeightage} innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={5}>
                            {chapterWeightage.map((e, i) => <Cell key={i} fill={e.color} />)}
                          </Pie>
                          <Tooltip contentStyle={{ background: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px', color: '#fff' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-4">
                      {chapterWeightage.map((item, i) => (
                        <span key={i} className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: `${item.color}20`, color: item.color }}>{item.name}</span>
                      ))}
                    </div>
                  </motion.div>
                )}

                {difficultyTrend.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card p-6 rounded-2xl border border-border/50">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg">
                        <AlertTriangle className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="font-semibold text-lg">Difficulty Trend</h3>
                    </div>
                    <div className="h-64">
                      <ResponsiveContainer>
                        <AreaChart data={difficultyTrend}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                          <XAxis dataKey="year" stroke="rgba(255,255,255,0.5)" />
                          <YAxis stroke="rgba(255,255,255,0.5)" />
                          <Tooltip contentStyle={{ background: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px', color: '#fff' }} />
                          <Area type="monotone" dataKey="easy" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
                          <Area type="monotone" dataKey="medium" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} />
                          <Area type="monotone" dataKey="hard" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </motion.div>
                )}

                {topicRecurrence.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="glass-card p-6 rounded-2xl border border-border/50 lg:col-span-2">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center shadow-lg">
                        <Target className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="font-semibold text-lg">High Recurrence Topics</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {topicRecurrence.map((t, i) => (
                        <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.1 }} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-border/30">
                          <div>
                            <p className="font-medium">{t.topic}</p>
                            <p className="text-xs text-muted-foreground">Last: {t.lastAsked}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                              <motion.div initial={{ width: 0 }} animate={{ width: `${t.frequency * 10}%` }} transition={{ delay: 0.8 + i * 0.1, duration: 0.5 }} className="h-full bg-gradient-to-r from-primary to-purple-500 rounded-full" />
                            </div>
                            <span className="text-sm font-bold text-primary">{t.frequency}/10</span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>
            )}

            {/* Questions */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="glass-card p-6 rounded-2xl border border-border/50">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-primary to-purple-500 flex items-center justify-center shadow-lg shadow-primary/25">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-xl">Predicted Question Paper</h3>
                  <p className="text-sm text-muted-foreground">{predictedQuestions.length} questions • Total: 70 marks</p>
                </div>
              </div>
              
              {['A', 'B', 'C'].map(section => {
                const sectionQuestions = getSectionQuestions(section);
                const sectionInfo = getSectionInfo(section);
                if (sectionQuestions.length === 0) return null;
                
                return (
                  <div key={section} className="mb-8 last:mb-0">
                    <div className="flex items-center justify-between mb-4 p-4 bg-gradient-to-r from-primary/10 to-purple-500/10 rounded-xl border border-primary/20">
                      <div>
                        <h4 className="font-semibold text-primary">{sectionInfo.title}</h4>
                        <p className="text-xs text-muted-foreground">{sectionInfo.description}</p>
                      </div>
                      <span className="px-4 py-2 bg-primary/20 rounded-full text-sm font-medium text-primary">
                        {sectionQuestions.length} × {sectionInfo.marks} = {sectionQuestions.length * sectionInfo.marks} marks
                      </span>
                    </div>
                    
                    <div className="space-y-3">
                      {sectionQuestions.map((q, index) => {
                        const qNum = section === 'A' ? index + 1 : section === 'B' ? index + 6 : index + 11;
                        return (
                          <motion.div key={q.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 + index * 0.03 }} className="border border-border/50 rounded-xl overflow-hidden bg-white/5 hover:bg-white/10 transition-colors">
                            <button onClick={() => setExpandedQuestion(expandedQuestion === q.id ? null : q.id)} className="w-full p-4 flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-primary to-purple-500 flex items-center justify-center text-white font-bold shadow-lg shadow-primary/25">Q{qNum}</div>
                                <div className="text-left">
                                  <p className="font-medium">{q.topic}</p>
                                  <p className="text-xs text-muted-foreground">{q.type} • {q.marks} marks</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary/20 text-primary">{q.probability}%</span>
                                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getDifficultyColor(q.difficulty)}`}>{q.difficulty}</span>
                                <motion.div animate={{ rotate: expandedQuestion === q.id ? 180 : 0 }}>
                                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                                </motion.div>
                              </div>
                            </button>
                            <AnimatePresence>
                              {expandedQuestion === q.id && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                  <div className="px-4 pb-4 space-y-3">
                                    <div className="p-4 bg-white/5 rounded-xl border border-border/30">
                                      <p className="text-sm font-semibold mb-2 text-primary">Question:</p>
                                      <p className="leading-relaxed">{q.question}</p>
                                    </div>
                                    {q.rationale && (
                                      <div className="p-4 bg-primary/5 rounded-xl border border-primary/20">
                                        <p className="text-xs font-semibold mb-1 text-primary">Why predicted:</p>
                                        <p className="text-sm text-muted-foreground">{q.rationale}</p>
                                      </div>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </motion.div>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default Dashboard;
