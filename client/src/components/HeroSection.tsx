import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Brain, Zap, Target, TrendingUp } from "lucide-react";
import GradientOrbs from "./GradientOrbs";

const HeroSection = () => {
  const floatingIcons = [
    { icon: Brain, delay: 0, x: '10%', y: '20%' },
    { icon: Zap, delay: 0.5, x: '85%', y: '15%' },
    { icon: Target, delay: 1, x: '75%', y: '70%' },
    { icon: TrendingUp, delay: 1.5, x: '15%', y: '75%' },
  ];

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden mesh-gradient">
      <GradientOrbs variant="hero" />
      
      {/* Floating Icons - hidden on mobile */}
      {floatingIcons.map((item, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 0.6, scale: 1 }}
          transition={{ delay: item.delay + 0.5, duration: 0.5 }}
          className="absolute hidden lg:block"
          style={{ left: item.x, top: item.y }}
        >
          <motion.div
            animate={{ y: [0, -15, 0], rotate: [0, 5, 0] }}
            transition={{ duration: 4 + index, repeat: Infinity, ease: "easeInOut" }}
            className="glass-card p-3 sm:p-4 rounded-xl sm:rounded-2xl"
          >
            <item.icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
          </motion.div>
        </motion.div>
      ))}

      <div className="container mx-auto px-4 pt-20 sm:pt-24 pb-12 sm:pb-16 relative z-10">
        <div className="max-w-5xl mx-auto text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full glass-card mb-6 sm:mb-8"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            >
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
            </motion.div>
            <span className="text-xs sm:text-sm font-medium">AI-Powered Question Prediction</span>
          </motion.div>

          {/* Main Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mb-4 sm:mb-6 leading-tight"
          >
            Predict Your{" "}
            <span className="relative inline-block">
              <span className="text-gradient">Exam Questions</span>
              <motion.svg
                className="absolute -bottom-1 sm:-bottom-2 left-0 w-full"
                viewBox="0 0 300 12"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1, delay: 0.8 }}
              >
                <motion.path
                  d="M2 10 Q 150 -5 298 10"
                  fill="none"
                  stroke="url(#gradient)"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="hsl(230, 80%, 60%)" />
                    <stop offset="50%" stopColor="hsl(280, 70%, 60%)" />
                    <stop offset="100%" stopColor="hsl(320, 70%, 60%)" />
                  </linearGradient>
                </defs>
              </motion.svg>
            </span>
            <br />
            <span className="text-muted-foreground text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl">with AI Precision</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-sm sm:text-base md:text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 sm:mb-10 px-2"
          >
            Upload your previous year question papers and let our AI analyze patterns 
            to predict the most likely questions for your upcoming exams.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4"
          >
            <Link to="/upload" className="w-full sm:w-auto">
              <Button 
                variant="hero" 
                size="lg" 
                className="group relative overflow-hidden text-sm sm:text-base md:text-lg px-6 sm:px-8 py-4 sm:py-5 md:py-6 rounded-xl sm:rounded-2xl shadow-glow w-full sm:w-auto"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  Start Analyzing
                  <motion.span
                    animate={{ x: [0, 5, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                  </motion.span>
                </span>
                <motion.div
                  className="absolute inset-0 bg-white/20"
                  initial={{ x: '-100%', skewX: -15 }}
                  whileHover={{ x: '100%' }}
                  transition={{ duration: 0.6 }}
                />
              </Button>
            </Link>
            <Link to="/dashboard" className="w-full sm:w-auto">
              <Button 
                variant="outline" 
                size="lg" 
                className="text-sm sm:text-base md:text-lg px-6 sm:px-8 py-4 sm:py-5 md:py-6 rounded-xl sm:rounded-2xl glass-card hover:shadow-elevated w-full sm:w-auto"
              >
                View Demo
              </Button>
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-12 sm:mt-16 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 max-w-3xl mx-auto"
          >
            {[
              { value: "95%", label: "Accuracy Rate" },
              { value: "10K+", label: "Papers Analyzed" },
              { value: "50+", label: "Exam Types" },
              { value: "24/7", label: "AI Available" },
            ].map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 + index * 0.1 }}
                whileHover={{ scale: 1.05 }}
                className="glass-card p-3 sm:p-4 rounded-xl sm:rounded-2xl text-center"
              >
                <div className="text-xl sm:text-2xl md:text-3xl font-bold text-gradient">{stat.value}</div>
                <div className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Scroll Indicator - hidden on mobile */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 hidden sm:block"
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-5 h-8 sm:w-6 sm:h-10 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-1.5 sm:p-2"
          >
            <motion.div
              animate={{ y: [0, 12, 0], opacity: [1, 0, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-primary"
            />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
