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
    const state = location.state as any;
    const isFreshAnalysis = state?.analysis?.generatedAt && 
      (Date.now() - new Date(state.analysis.generatedAt).getTime()) < 5 * 60 * 1000;
    
    if (state?.analysis && isFreshAnalysis) {
      processAnalysisData(state.analysis);
      if (state.analysis.exam) {
        setCurrentExamInfo({ name: state.analysis.exam.name || '', subject: state.analysis.exam.subject || '', subjectCode: state.analysis.exam.subjectCode || '' });
      }
      setHasData(true);
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
      setPredictedQuestions(data.predictions.map((pred: any, idx: number) => ({
        id: pred.id || (idx + 1), topic: pred.topic || 'Unknown Topic',
        probability: typeof pred.probability === 'number' ? Math.round(pred.probability * 100) : 0,
        difficulty: pred.difficulty || 'Medium', question: pred.question || `Explain ${pred.topic}`,
        type: pred.type || 'Long Answer', rationale: pred.rationale || 'Frequently asked topic.',
        section: pred.section || 'B', marks: pred.marks || (pred.section === 'A' ? 2 : pred.section === 'B' ? 5 : 10)
      })));
    }
    if (data.recurrence?.length) setTopicRecurrence(data.recurrence);
    if (data.trends?.difficultyProgression?.length) setDifficultyTrend(data.trends.difficultyProgression);
    if (data.summary?.length) {
      setChapterWeightage(data.summary.slice(0, 5).map((item: any, idx: number) => ({
        name: typeof item === 'string' ? item : item.topic || `Topic ${idx + 1}`,
        value: 20 - idx * 3, color: ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899'][idx % 5],
      })));
    }
    setStats({ papersAnalyzed: data.analysis?.papersAnalyzed || 0, questionsExtracted: data.analysis?.questionsExtracted || 0,
      topicsCovered: data.analysis?.topicsCovered || 0, avgAccuracy: data.analysis?.avgAccuracy || 0 });
  };

  const getDifficultyColor = (d: string) => {
    if (d === "Easy") return "text-emerald-400 bg-emerald-500/20 border-emerald-500/30";
    if (d === "Medium") return "text-amber-400 bg-amber-500/20 border-amber-500/30";
    if (d === "Hard") return "text-rose-400 bg-rose-500/20 border-rose-500/30";
    return "text-muted-foreground bg-muted";
  };

  const getSectionQuestions = (section: string) => predictedQuestions.filter(q => q.section === section);
  const getSectionInfo = (section: string) => {
    const info: Record<string, { title: string; shortTitle: string; marks: number; description: string }> = {
      'A': { title: 'Section A - Short Answer', shortTitle: 'Section A', marks: 2, description: '2 marks each' },
      'B': { title: 'Section B - Medium Answer', shortTitle: 'Section B', marks: 5, description: '5 marks each' },
      'C': { title: 'Section C - Long Answer', shortTitle: 'Section C', marks: 10, description: '10 marks each' }
    };
    return info[section] || { title: `Section ${section}`, shortTitle: `Section ${section}`, marks: 5, description: '' };
  };

  const downloadPredictedPaper = () => {
    if (!predictedQuestions.length) { toast.error("No questions available"); return; }
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
      doc.text(`Code: ${currentExamInfo.subjectCode || 'N/A'} | Time: 3 Hours | Marks: 70`, pageWidth / 2, 42, { align: 'center' });
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
          <main className="pt-20 sm:pt-24 pb-16 flex items-center justify-center min-h-[60vh] px-4">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-r from-primary to-purple-500 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary/25">
                <Sparkles className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
              </motion.div>
              <h2 className="text-lg sm:text-xl font-semibold mb-2">Loading Dashboard</h2>
              <p className="text-muted-foreground text-sm sm:text-base">Preparing predictions...</p>
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
          <main className="pt-20 sm:pt-24 pb-16 px-4">
            <div className="container mx-auto">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8 sm:mb-12">
                <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full glass-card mb-4 sm:mb-6">
                  <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                  <span className="text-xs sm:text-sm font-medium">AI-Powered Predictions</span>
                </motion.div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
                  Prediction <span className="text-gradient">Dashboard</span>
                </h1>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="max-w-lg mx-auto">
                <div className="glass-card p-6 sm:p-10 md:p-12 rounded-2xl text-center border border-border/50">
                  <motion.div whileHover={{ scale: 1.05 }} className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-r from-primary to-purple-500 flex items-center justify-center mx-auto mb-6 sm:mb-8 shadow-lg shadow-primary/25">
                    <Upload className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-white" />
                  </motion.div>
                  <h2 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-3">No Predictions Yet</h2>
                  <p className="text-muted-foreground mb-6 sm:mb-8 text-sm sm:text-base">Upload previous year papers to generate AI predictions.</p>
                  <Button onClick={() => navigate('/upload')} size="lg" className="bg-gradient-to-r from-primary to-purple-500 hover:opacity-90 text-white shadow-lg shadow-primary/25 px-6 sm:px-8 text-sm sm:text-base">
                    <Upload className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />Upload Papers
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
        <main className="pt-20 sm:pt-24 pb-16 px-4">
          <div className="container mx-auto">
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6 sm:mb-10 flex flex-col gap-4">
              <div>
                <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full glass-card mb-3 sm:mb-4">
                  <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                  <span className="text-xs sm:text-sm font-medium">AI Analysis Complete</span>
                </motion.div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-1 sm:mb-2">
                  Prediction <span className="text-gradient">Dashboard</span>
                </h1>
                {currentExamInfo.subject && (
                  <p className="text-muted-foreground text-sm sm:text-base md:text-lg">{currentExamInfo.subject} ({currentExamInfo.subjectCode})</p>
                )}
              </div>
              <Button onClick={downloadPredictedPaper} className="bg-gradient-to-r from-primary to-purple-500 hover:opacity-90 text-white shadow-lg shadow-primary/25 w-full sm:w-auto sm:self-start">
                <Download className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />Download Paper
              </Button>
            </motion.div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-10">
              {[
                { icon: FileText, label: "Papers", value: stats.papersAnalyzed, gradient: "from-violet-500 to-purple-500" },
                { icon: Target, label: "Questions", value: stats.questionsExtracted, gradient: "from-blue-500 to-cyan-500" },
                { icon: BookOpen, label: "Topics", value: stats.topicsCovered, gradient: "from-emerald-500 to-teal-500" },
                { icon: Percent, label: "Accuracy", value: `${stats.avgAccuracy}%`, gradient: "from-amber-500 to-orange-500" },
              ].map((stat, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="glass-card p-3 sm:p-4 md:p-6 rounded-xl sm:rounded-2xl border border-border/50">
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-lg sm:rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center mb-2 sm:mb-4 shadow-lg`}>
                    <stat.icon className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-white" />
                  </div>
                  <p className="text-xl sm:text-2xl md:text-3xl font-bold mb-0.5 sm:mb-1">{stat.value}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">{stat.label}</p>
                </motion.div>
              ))}
            </div>

            {/* Charts */}
            {(chapterWeightage.length > 0 || difficultyTrend.length > 0 || topicRecurrence.length > 0) && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-10">
                {chapterWeightage.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-border/50">
                    <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
                        <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      </div>
                      <h3 className="font-semibold text-base sm:text-lg">Topic Distribution</h3>
                    </div>
                    <div className="h-48 sm:h-56 md:h-64">
                      <ResponsiveContainer>
                        <PieChart>
                          <Pie data={chapterWeightage} innerRadius={40} outerRadius={70} dataKey="value" paddingAngle={5}>
                            {chapterWeightage.map((e, i) => <Cell key={i} fill={e.color} />)}
                          </Pie>
                          <Tooltip contentStyle={{ background: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-3 sm:mt-4">
                      {chapterWeightage.map((item, i) => (
                        <span key={i} className="text-[10px] sm:text-xs px-2 py-0.5 sm:py-1 rounded-full truncate max-w-[120px]" style={{ backgroundColor: `${item.color}20`, color: item.color }}>{item.name}</span>
                      ))}
                    </div>
                  </motion.div>
                )}

                {difficultyTrend.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-border/50">
                    <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg">
                        <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      </div>
                      <h3 className="font-semibold text-base sm:text-lg">Difficulty Trend</h3>
                    </div>
                    <div className="h-48 sm:h-56 md:h-64">
                      <ResponsiveContainer>
                        <AreaChart data={difficultyTrend}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                          <XAxis dataKey="year" stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 10 }} />
                          <YAxis stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 10 }} />
                          <Tooltip contentStyle={{ background: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }} />
                          <Area type="monotone" dataKey="easy" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
                          <Area type="monotone" dataKey="medium" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} />
                          <Area type="monotone" dataKey="hard" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </motion.div>
                )}

                {topicRecurrence.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="glass-card p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-border/50 lg:col-span-2">
                    <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center shadow-lg">
                        <Target className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      </div>
                      <h3 className="font-semibold text-base sm:text-lg">High Recurrence Topics</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                      {topicRecurrence.map((t, i) => (
                        <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.1 }} className="flex items-center justify-between p-3 sm:p-4 bg-white/5 rounded-lg sm:rounded-xl border border-border/30">
                          <div className="min-w-0 flex-1 mr-2">
                            <p className="font-medium text-sm sm:text-base truncate">{t.topic}</p>
                            <p className="text-[10px] sm:text-xs text-muted-foreground">Last: {t.lastAsked}</p>
                          </div>
                          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                            <div className="w-16 sm:w-24 h-1.5 sm:h-2 bg-white/10 rounded-full overflow-hidden">
                              <motion.div initial={{ width: 0 }} animate={{ width: `${t.frequency * 10}%` }} className="h-full bg-gradient-to-r from-primary to-purple-500 rounded-full" />
                            </div>
                            <span className="text-xs sm:text-sm font-bold text-primary w-8">{t.frequency}/10</span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>
            )}

            {/* Questions */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="glass-card p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-border/50">
              <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-8">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-r from-primary to-purple-500 flex items-center justify-center shadow-lg shadow-primary/25">
                  <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-base sm:text-xl">Predicted Questions</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">{predictedQuestions.length} questions • 70 marks</p>
                </div>
              </div>
              
              {['A', 'B', 'C'].map(section => {
                const sectionQuestions = getSectionQuestions(section);
                const sectionInfo = getSectionInfo(section);
                if (sectionQuestions.length === 0) return null;
                
                return (
                  <div key={section} className="mb-6 sm:mb-8 last:mb-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 sm:mb-4 p-3 sm:p-4 bg-gradient-to-r from-primary/10 to-purple-500/10 rounded-lg sm:rounded-xl border border-primary/20">
                      <div>
                        <h4 className="font-semibold text-primary text-sm sm:text-base">
                          <span className="hidden sm:inline">{sectionInfo.title}</span>
                          <span className="sm:hidden">{sectionInfo.shortTitle}</span>
                        </h4>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">{sectionInfo.description}</p>
                      </div>
                      <span className="px-2 sm:px-4 py-1 sm:py-2 bg-primary/20 rounded-full text-xs sm:text-sm font-medium text-primary self-start sm:self-auto">
                        {sectionQuestions.length} × {sectionInfo.marks} = {sectionQuestions.length * sectionInfo.marks}
                      </span>
                    </div>
                    
                    <div className="space-y-2 sm:space-y-3">
                      {sectionQuestions.map((q, index) => {
                        const qNum = section === 'A' ? index + 1 : section === 'B' ? index + 6 : index + 11;
                        return (
                          <motion.div key={q.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 + index * 0.03 }} className="border border-border/50 rounded-lg sm:rounded-xl overflow-hidden bg-white/5">
                            <button onClick={() => setExpandedQuestion(expandedQuestion === q.id ? null : q.id)} className="w-full p-3 sm:p-4 flex items-start sm:items-center justify-between gap-2 sm:gap-4 text-left">
                              <div className="flex items-start sm:items-center gap-2 sm:gap-4 min-w-0 flex-1">
                                <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-r from-primary to-purple-500 flex items-center justify-center text-white font-bold text-xs sm:text-base shadow-lg shadow-primary/25 flex-shrink-0">Q{qNum}</div>
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium text-sm sm:text-base truncate">{q.topic}</p>
                                  <p className="text-[10px] sm:text-xs text-muted-foreground">{q.type} • {q.marks}m</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
                                <span className="hidden xs:inline-flex px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium bg-primary/20 text-primary">{q.probability}%</span>
                                <span className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium border ${getDifficultyColor(q.difficulty)}`}>{q.difficulty}</span>
                                <motion.div animate={{ rotate: expandedQuestion === q.id ? 180 : 0 }}>
                                  <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                                </motion.div>
                              </div>
                            </button>
                            <AnimatePresence>
                              {expandedQuestion === q.id && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                  <div className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-2 sm:space-y-3">
                                    <div className="p-3 sm:p-4 bg-white/5 rounded-lg sm:rounded-xl border border-border/30">
                                      <p className="text-xs sm:text-sm font-semibold mb-1 sm:mb-2 text-primary">Question:</p>
                                      <p className="text-sm sm:text-base leading-relaxed">{q.question}</p>
                                    </div>
                                    {q.rationale && (
                                      <div className="p-3 sm:p-4 bg-primary/5 rounded-lg sm:rounded-xl border border-primary/20">
                                        <p className="text-[10px] sm:text-xs font-semibold mb-1 text-primary">Why predicted:</p>
                                        <p className="text-xs sm:text-sm text-muted-foreground">{q.rationale}</p>
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
