import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDropzone } from "react-dropzone";
import { useNavigate, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ExamTemplateSelector from "@/components/ExamTemplateSelector";
import ParticleBackground from "@/components/ParticleBackground";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Upload, FileText, Image, X, Loader2, ArrowRight, CheckCircle, AlertCircle, Sparkles, CloudUpload, Lock, LogIn } from "lucide-react";
import { toast } from "sonner";
import type { UploadedFile } from "@/types";
import type { ExamTemplate, Subject } from "@/data/examTemplates";

const UploadPage = () => {
  const navigate = useNavigate();
  const { user, session, loading: authLoading } = useAuth();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [examName, setExamName] = useState("");
  const [subject, setSubject] = useState("");
  const [subjectCode, setSubjectCode] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<ExamTemplate | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);

  const handleTemplateSelect = (template: ExamTemplate, subj: Subject | null) => {
    setSelectedTemplate(template);
    setSelectedSubject(subj);
    setExamName(template.displayName);
    if (subj) {
      setSubject(subj.name);
      setSubjectCode(subj.code);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (!user) {
      toast.error("Please sign in to upload files");
      return;
    }
    
    const newFiles = acceptedFiles.map((file) => ({
      id: Math.random().toString(36).substring(7),
      file,
      preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
      status: "pending" as const,
      year: "",
    }));
    setFiles((prev) => [...prev, ...newFiles]);
    toast.success(`${acceptedFiles.length} file(s) added`);
  }, [user]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"], "image/*": [".png", ".jpg", ".jpeg"], "text/plain": [".txt"] },
    multiple: true,
    disabled: !user,
  });

  const removeFile = (id: string) => setFiles((prev) => prev.filter((f) => f.id !== id));
  const updateFileYear = (id: string, year: string) => setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, year } : f)));

  const handleAnalyze = async () => {
    if (!user) {
      toast.error("Please sign in to use AI analysis");
      navigate('/login');
      return;
    }
    
    if (files.length < 2) { 
      toast.error("Please upload at least 2 question papers"); 
      return; 
    }
    
    if (!examName.trim()) { 
      toast.error("Please enter the exam name"); 
      return; 
    }
    
    if (!subject.trim()) { 
      toast.error("Please enter the subject name"); 
      return; 
    }
    
    if (!subjectCode.trim()) { 
      toast.error("Please enter the subject code"); 
      return; 
    }

    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('examName', examName.trim());
      formData.append('subject', subject.trim());
      formData.append('subjectCode', subjectCode.trim());
      formData.append('useOCR', 'true'); // Always enable OCR
      files.forEach((file) => {
        formData.append('files', file.file);
        formData.append(`year_${file.file.name}`, file.year || new Date().getFullYear().toString());
      });

      setFiles(prev => prev.map(f => ({ ...f, status: "processing" })));
      const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001';
      
      // Build headers with auth token
      const headers: HeadersInit = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      
      const response = await fetch(`${API_BASE}/api/analyze`, { 
        method: 'POST', 
        body: formData,
        headers
      });

      if (!response.ok) {
        let errMsg = response.statusText;
        try { 
          const body = await response.text(); 
          const json = JSON.parse(body); 
          errMsg = json.message || json.error || body; 
        } catch {}
        throw new Error(errMsg);
      }

      const result = await response.json();
      setFiles(prev => prev.map(f => ({ ...f, status: "done" })));
      toast.success("Analysis complete!");
      setTimeout(() => navigate("/dashboard", { state: { subjectCode, analysis: result.analysis, subject } }), 1500);
    } catch (error: any) {
      console.error('Analysis error:', error);
      toast.error(error?.message || 'Analysis failed');
      setFiles(prev => prev.map(f => ({ ...f, status: "error" })));
    } finally {
      setIsProcessing(false);
    }
  };

  const getFileIcon = (file: File) => file.type.startsWith("image/") ? Image : FileText;

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 pb-16 flex items-center justify-center min-h-[60vh]">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center"
          >
            <Sparkles className="w-8 h-8 text-white" />
          </motion.div>
        </main>
        <Footer />
      </div>
    );
  }

  // Show sign-in prompt if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-background relative">
        <ParticleBackground />
        <div className="relative z-10">
          <Navbar />
        
        <main className="pt-20 sm:pt-24 pb-16">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-lg mx-auto text-center py-8 sm:py-12 md:py-16"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
                className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-xl sm:rounded-2xl bg-gradient-primary flex items-center justify-center mx-auto mb-6 sm:mb-8 shadow-glow"
              >
                <Lock className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-white" />
              </motion.div>
              
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">
                Sign In <span className="text-gradient">Required</span>
              </h1>
              <p className="text-sm sm:text-base md:text-lg text-muted-foreground mb-6 sm:mb-8 max-w-md mx-auto px-2">
                To use our AI-powered question prediction, please sign in or create a free account. 
                This helps us provide you with personalized analysis and save your history.
              </p>

              <div className="glass-card p-4 sm:p-6 rounded-xl sm:rounded-2xl mb-6 sm:mb-8">
                <h3 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Why sign in?</h3>
                <ul className="text-left space-y-2 sm:space-y-3 text-muted-foreground text-sm sm:text-base">
                  <li className="flex items-center gap-2 sm:gap-3">
                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0" />
                    Save your analysis history
                  </li>
                  <li className="flex items-center gap-2 sm:gap-3">
                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0" />
                    Access predictions anytime
                  </li>
                  <li className="flex items-center gap-2 sm:gap-3">
                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0" />
                    Export results in multiple formats
                  </li>
                  <li className="flex items-center gap-2 sm:gap-3">
                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0" />
                    Track your exam preparation progress
                  </li>
                </ul>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
                <Link to="/login" className="w-full sm:w-auto">
                  <Button variant="hero" size="lg" className="shadow-glow w-full sm:w-auto">
                    <LogIn className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                    Sign In
                  </Button>
                </Link>
                <Link to="/signup" className="w-full sm:w-auto">
                  <Button variant="outline" size="lg" className="glass-card w-full sm:w-auto">
                    Create Free Account
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </main>
        <Footer />
        </div>
      </div>
    );
  }

  // Authenticated user view
  return (
    <div className="min-h-screen bg-background relative">
      <ParticleBackground />
      <div className="relative z-10">
        <Navbar />
      
      <main className="pt-20 sm:pt-24 pb-16 relative z-10">
        <div className="container mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="max-w-4xl mx-auto"
          >
            {/* Header */}
            <div className="text-center mb-8 sm:mb-12">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full glass-card mb-4 sm:mb-6"
              >
                <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                <span className="text-xs sm:text-sm font-medium">AI-Powered Analysis</span>
              </motion.div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4">
                Upload Your <span className="text-gradient">Question Papers</span>
              </h1>
              <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto px-2">
                Upload 5-10 years of previous papers. Our AI will analyze patterns and generate predictions.
              </p>
            </div>

            {/* Template Selector */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-6 sm:mb-8"
            >
              <ExamTemplateSelector
                onSelect={handleTemplateSelect}
                selectedTemplate={selectedTemplate}
                selectedSubject={selectedSubject}
              />
            </motion.div>

            {/* Form Fields */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-card p-4 sm:p-6 rounded-xl sm:rounded-2xl mb-6 sm:mb-8"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                <div className="sm:col-span-2 md:col-span-1">
                  <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">Exam Name</label>
                  <input 
                    type="text" 
                    value={examName} 
                    onChange={(e) => setExamName(e.target.value)} 
                    placeholder="e.g., JEE Main, NEET" 
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base rounded-lg sm:rounded-xl border border-border/50 bg-background/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" 
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">Subject</label>
                  <input 
                    type="text" 
                    value={subject} 
                    onChange={(e) => setSubject(e.target.value)} 
                    placeholder="e.g., Physics" 
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base rounded-lg sm:rounded-xl border border-border/50 bg-background/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" 
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">Subject Code</label>
                  <input 
                    type="text" 
                    value={subjectCode} 
                    onChange={(e) => setSubjectCode(e.target.value.toUpperCase())} 
                    placeholder="e.g., KCS301" 
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base rounded-lg sm:rounded-xl border border-border/50 bg-background/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" 
                  />
                </div>
              </div>
            </motion.div>

            {/* Dropzone */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div 
                {...getRootProps()} 
                className={`relative glass-card rounded-xl sm:rounded-2xl p-6 sm:p-8 md:p-12 text-center cursor-pointer transition-all duration-300 overflow-hidden group ${
                  isDragActive ? "ring-2 ring-primary shadow-glow" : "hover:shadow-elevated"
                }`}
              >
                <input {...getInputProps()} />
                
                <motion.div
                  animate={{
                    scale: isDragActive ? 1.5 : 1,
                    opacity: isDragActive ? 0.2 : 0.05,
                  }}
                  className="absolute inset-0 bg-gradient-primary rounded-xl sm:rounded-2xl"
                />

                <div className="relative z-10">
                  <motion.div 
                    animate={{ y: isDragActive ? -10 : 0 }}
                    className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-xl sm:rounded-2xl bg-gradient-primary/10 flex items-center justify-center mx-auto mb-4 sm:mb-6"
                  >
                    <motion.div
                      animate={{ scale: isDragActive ? 1.2 : 1 }}
                      transition={{ type: "spring" }}
                    >
                      <CloudUpload className={`w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 ${isDragActive ? 'text-primary' : 'text-muted-foreground'}`} />
                    </motion.div>
                  </motion.div>
                  
                  <h3 className="font-semibold text-base sm:text-lg md:text-xl mb-1.5 sm:mb-2">
                    {isDragActive ? "Drop your files here" : "Drag & drop question papers"}
                  </h3>
                  <p className="text-muted-foreground text-xs sm:text-sm md:text-base mb-4 sm:mb-6">
                    Supports PDF, images (PNG, JPG), and text files
                  </p>
                  
                  <Button variant="outline" size="default" className="glass-card text-sm sm:text-base">
                    <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2" />
                    Browse Files
                  </Button>
                </div>
              </div>
            </motion.div>

            {/* File List */}
            <AnimatePresence>
              {files.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }} 
                  animate={{ opacity: 1, height: 'auto' }} 
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-6 sm:mt-8"
                >
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <h3 className="font-semibold text-sm sm:text-base md:text-lg">Uploaded Files ({files.length})</h3>
                    <span className="text-xs sm:text-sm text-muted-foreground">
                      {files.filter(f => f.status === 'done').length} processed
                    </span>
                  </div>
                  
                  <div className="space-y-2 sm:space-y-3">
                    {files.map((file, index) => {
                      const FileIcon = getFileIcon(file.file);
                      const isImage = file.file.type.startsWith("image/");
                      
                      return (
                        <motion.div 
                          key={file.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ delay: index * 0.05 }}
                          className="glass-card p-3 sm:p-4 rounded-lg sm:rounded-xl"
                        >
                          <div className="flex items-center gap-2 sm:gap-4">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-muted/50 flex items-center justify-center overflow-hidden flex-shrink-0">
                              {file.preview ? (
                                <img src={file.preview} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <FileIcon className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground" />
                              )}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm sm:text-base truncate">{file.file.name}</p>
                              <p className="text-xs sm:text-sm text-muted-foreground">
                                {(file.file.size / 1024 / 1024).toFixed(2)} MB
                                {isImage && <span className="ml-1 sm:ml-2 text-primary">• OCR</span>}
                              </p>
                            </div>
                            
                            <input 
                              type="text" 
                              value={file.year} 
                              onChange={(e) => updateFileYear(file.id, e.target.value)} 
                              placeholder="Year" 
                              className="w-16 sm:w-20 md:w-24 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg border border-border/50 bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/50" 
                            />
                            
                            <div className="w-8 sm:w-10 flex justify-center flex-shrink-0">
                              <AnimatePresence mode="wait">
                                {file.status === "pending" && (
                                  <motion.button 
                                    key="remove"
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    exit={{ scale: 0 }}
                                    onClick={() => removeFile(file.id)} 
                                    className="p-1.5 sm:p-2 hover:bg-destructive/10 rounded-lg transition-colors"
                                  >
                                    <X className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground hover:text-destructive" />
                                  </motion.button>
                                )}
                                {file.status === "processing" && (
                                  <motion.div
                                    key="processing"
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1, rotate: 360 }}
                                    transition={{ rotate: { duration: 1, repeat: Infinity, ease: "linear" } }}
                                  >
                                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                                  </motion.div>
                                )}
                                {file.status === "done" && (
                                  <motion.div
                                    key="done"
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                  >
                                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
                                  </motion.div>
                                )}
                                {file.status === "error" && (
                                  <motion.div
                                    key="error"
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                  >
                                    <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-destructive" />
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Analyze Button */}
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-6 sm:mt-8 text-center"
                  >
                    <Button 
                      variant="hero" 
                      size="lg" 
                      onClick={handleAnalyze} 
                      disabled={isProcessing}
                      className="text-sm sm:text-base md:text-lg px-6 sm:px-8 md:px-10 py-4 sm:py-5 md:py-6 rounded-xl sm:rounded-2xl shadow-glow group w-full sm:w-auto"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin mr-2" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                          Start AI Analysis
                          <motion.span
                            animate={{ x: [0, 5, 0] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                            className="ml-2"
                          >
                            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                          </motion.span>
                        </>
                      )}
                    </Button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </main>
      <Footer />
      </div>
    </div>
  );
};

export default UploadPage;
