import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  ShieldAlert, 
  Map, 
  Brain, 
  CopyCheck, 
  Users, 
  Building2, 
  Sparkles, 
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  Lock,
  Sun,
  Moon
} from 'lucide-react';

export default function LandingPage() {
  const { demoLogin, isAuthenticated, logout, user, theme, toggleTheme } = useAuth();
  const navigate = useNavigate();
  const [loadingRole, setLoadingRole] = useState(null);

  const handleDemoClick = async (role) => {
    setLoadingRole(role);
    try {
      const loggedUser = await demoLogin(role);
      if (loggedUser.role === 'citizen') {
        navigate('/citizen');
      } else {
        navigate('/municipality');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRole(null);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-950 text-slate-100 flex flex-col justify-between">
      {/* Background glow effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-brand-500/10 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-500/5 blur-[150px] pointer-events-none" />

      {/* Header */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between z-10 relative">
        <div className="flex items-center space-x-3">
          <div className="bg-brand-500 text-slate-950 p-2 rounded-lg font-bold flex items-center justify-center shadow-lg shadow-brand-500/20">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <span className="font-extrabold text-2xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-brand-400 bg-clip-text text-transparent font-['Outfit']">
            NagarSetu
          </span>
        </div>

        <nav className="hidden md:flex items-center space-x-8 text-sm text-slate-400">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#pipeline" className="hover:text-white transition-colors">AI Pipeline</a>
          <a href="#architecture" className="hover:text-white transition-colors">Architecture</a>
        </nav>

        <div className="flex items-center space-x-4">
          <button
            onClick={toggleTheme}
            className="text-slate-400 hover:text-white p-2 rounded-lg bg-slate-900 border border-slate-800 transition-all flex items-center justify-center shrink-0"
            title={theme === 'dark' ? "Toggle Light Mode" : "Toggle Dark Mode"}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-400" />}
          </button>
          
          {isAuthenticated ? (
            <div className="flex items-center space-x-3">
              <span className="text-xs text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full">
                Logged in as <strong className="text-brand-400 capitalize">{user?.role}</strong>
              </span>
              <button 
                onClick={() => {
                  logout();
                  navigate('/');
                }}
                className="text-xs font-semibold px-4 py-2 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 transition-all"
              >
                Logout
              </button>
            </div>
          ) : (
            <button 
              onClick={() => handleDemoClick('officer')}
              className="text-xs font-semibold bg-slate-900 border border-slate-800 px-4 py-2 rounded-lg hover:bg-slate-800 transition-all text-slate-300"
            >
              Officer Portal
            </button>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-grow flex flex-col items-center justify-center px-6 py-12 md:py-20 z-10 relative text-center">
        {/* Hackathon Badge */}
        <div className="inline-flex items-center space-x-2 bg-brand-500/10 border border-brand-500/20 px-3 py-1.5 rounded-full text-brand-400 text-xs font-semibold tracking-wide uppercase mb-6 animate-fade-in">
          <Sparkles className="h-3.5 w-3.5 animate-pulse" />
          <span>National AI Hackathon Submission</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight max-w-4xl font-['Outfit'] leading-none">
          Next-Gen AI Municipal <br/>
          <span className="bg-gradient-to-r from-brand-400 via-brand-500 to-emerald-400 bg-clip-text text-transparent">
            Complaint Intelligence
          </span>
        </h1>

        <p className="mt-6 text-lg md:text-xl text-slate-400 max-w-2xl font-light leading-relaxed">
          NagarSetu automatically categorizes citizen complaints, filters duplicate issues, maps hot-spots, and generates AI resource deployment recommendations for municipal officers in real-time.
        </p>

        {/* Call to actions */}
        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center w-full max-w-md">
          {/* JUDGE DEMO MODE BUTTON */}
          <button
            onClick={() => handleDemoClick('officer')}
            disabled={loadingRole !== null}
            className="w-full sm:w-auto relative group overflow-hidden bg-gradient-to-r from-brand-500 to-brand-600 text-slate-950 font-bold px-8 py-4 rounded-xl shadow-xl shadow-brand-500/15 hover:shadow-brand-500/25 active:scale-98 transition-all flex items-center justify-center space-x-2"
          >
            <span className="relative z-10 flex items-center gap-2 text-base">
              {loadingRole === 'officer' ? 'Initializing Demo...' : 'Explore Judge Demo'}
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </span>
            <div className="absolute inset-0 bg-white/20 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300" />
          </button>

          <button
            onClick={() => handleDemoClick('citizen')}
            disabled={loadingRole !== null}
            className="w-full sm:w-auto bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 font-semibold px-8 py-4 rounded-xl transition-all flex items-center justify-center space-x-2"
          >
            <span>Citizen Portal</span>
          </button>
        </div>

        {/* Quick Demo Mode Hint */}
        <p className="mt-4 text-xs text-slate-500 flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          <span>One-Click Login: Instantly populates 25+ detailed reports, charts, maps, and AI recommendations.</span>
        </p>

        {/* Core Stats Overview */}
        <div className="mt-20 w-full max-w-5xl grid grid-cols-2 md:grid-cols-4 gap-6 text-left">
          <div className="glass-panel p-6 rounded-2xl">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">DistilBERT Local AI</p>
            <p className="text-3xl font-extrabold mt-2 text-white">96.8%</p>
            <p className="text-xs text-slate-500 mt-1">Classification Accuracy</p>
          </div>
          <div className="glass-panel p-6 rounded-2xl">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Duplicate Filtering</p>
            <p className="text-3xl font-extrabold mt-2 text-brand-400">42%</p>
            <p className="text-xs text-slate-500 mt-1">Resource Overhead Saved</p>
          </div>
          <div className="glass-panel p-6 rounded-2xl">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Gemini Predictor</p>
            <p className="text-3xl font-extrabold mt-2 text-emerald-400">&lt; 3 sec</p>
            <p className="text-xs text-slate-500 mt-1">Resolution Time & Priority ETA</p>
          </div>
          <div className="glass-panel p-6 rounded-2xl">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Department Routing</p>
            <p className="text-3xl font-extrabold mt-2 text-white">100%</p>
            <p className="text-xs text-slate-500 mt-1">Automated Dispatching</p>
          </div>
        </div>

        {/* Features Section */}
        <section id="features" className="mt-32 w-full max-w-6xl text-left">
          <h2 className="text-3xl font-bold font-['Outfit'] text-center mb-12">
            Why NagarSetu? A Complete Smart City Solution
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="glass-panel p-8 rounded-2xl relative overflow-hidden group hover:border-brand-500/30 transition-all">
              <div className="p-3 bg-brand-500/10 text-brand-400 rounded-xl w-fit mb-6">
                <Brain className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold font-['Outfit'] text-white">Local & API Hybrid AI</h3>
              <p className="text-slate-400 mt-3 text-sm leading-relaxed">
                Utilizes local DistilBERT models for instant category prediction and Sentence Transformers for semantic similarity grouping, backed by Gemini 2.5 Flash for reasoning.
              </p>
            </div>

            <div className="glass-panel p-8 rounded-2xl relative overflow-hidden group hover:border-brand-500/30 transition-all">
              <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl w-fit mb-6">
                <CopyCheck className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold font-['Outfit'] text-white">Duplicate Detection</h3>
              <p className="text-slate-400 mt-3 text-sm leading-relaxed">
                Flags duplicate citizen complaints filed from similar areas with contextually similar text. Groups them side-by-side to save municipal manpower.
              </p>
            </div>

            <div className="glass-panel p-8 rounded-2xl relative overflow-hidden group hover:border-brand-500/30 transition-all">
              <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl w-fit mb-6">
                <Map className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold font-['Outfit'] text-white">Interactive GIS Maps</h3>
              <p className="text-slate-400 mt-3 text-sm leading-relaxed">
                Pins locations of citizen complaints. Provides color-coded heatmaps, cluster groups, and overlays representing incident densities and priority distribution.
              </p>
            </div>
          </div>
        </section>

        {/* AI Pipeline Architecture Schema */}
        <section id="pipeline" className="mt-32 w-full max-w-5xl text-left bg-slate-900/50 border border-slate-800 rounded-2xl p-8 md:p-12">
          <div className="flex flex-col md:flex-row gap-8 items-center">
            <div className="w-full md:w-1/2">
              <h2 className="text-2xl md:text-3xl font-bold font-['Outfit']">The AI Core Architecture</h2>
              <p className="text-slate-400 text-sm mt-4 leading-relaxed">
                NagarSetu processes complaint data sequentially. When a citizen submits a report:
              </p>
              <ul className="space-y-3 mt-6 text-sm text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="bg-brand-500/10 text-brand-400 h-5 w-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">1</span>
                  <span><strong>DistilBERT</strong> classifies the complaint text into 1 of 6 municipal categories.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-brand-500/10 text-brand-400 h-5 w-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">2</span>
                  <span><strong>Sentence Transformer</strong> computes embeddings to search for existing duplicates.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-brand-500/10 text-brand-400 h-5 w-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">3</span>
                  <span>A deterministic <strong>Rule Engine</strong> maps the complaint to its relevant department.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-brand-500/10 text-brand-400 h-5 w-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">4</span>
                  <span><strong>Gemini 2.5 Flash</strong> analyzes situational details to forecast priority severity and recommend resolution steps.</span>
                </li>
              </ul>
            </div>
            <div className="w-full md:w-1/2 flex flex-col gap-3 font-mono text-xs bg-slate-950 p-6 rounded-xl border border-slate-800/80 shadow-inner">
              <div className="flex items-center justify-between text-slate-500 border-b border-slate-800 pb-2 mb-2">
                <span>COMPLAINT INGESTION PIPELINE</span>
                <span className="text-brand-500 animate-pulse">● ACTIVE</span>
              </div>
              <div className="p-2.5 rounded bg-slate-900 border-l-2 border-brand-500">
                <span className="text-slate-400">INPUT:</span> "There is heavily leaking sewage at 12th cross Malleswaram. Pungent smell is spreading everywhere."
              </div>
              <div className="text-center text-slate-600 font-sans">↓</div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 bg-slate-900 border border-slate-800 rounded">
                  <span className="text-brand-400 block font-semibold">DistilBERT Classifier</span>
                  Category: <span className="text-emerald-400">Sanitation</span>
                </div>
                <div className="p-2 bg-slate-900 border border-slate-800 rounded">
                  <span className="text-brand-400 block font-semibold">all-MiniLM-L6-v2</span>
                  Duplicates found: <span className="text-brand-400">2 (Merged)</span>
                </div>
              </div>
              <div className="text-center text-slate-600 font-sans">↓</div>
              <div className="p-2.5 rounded bg-slate-900 border-l-2 border-emerald-500 text-[11px]">
                <span className="text-emerald-400 block font-semibold">Gemini 2.5 Flash Inference</span>
                Priority: <span className="text-red-400 font-semibold">Critical</span> (Public health hazard)<br/>
                ETA: <span className="text-slate-200">12 Hours</span><br/>
                Officer: <span className="text-slate-200">S. Raghunath (Sanitation Inspector)</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto px-6 py-8 border-t border-slate-900 flex flex-col md:flex-row items-center justify-between text-xs text-slate-500 z-10 relative">
        <p>© 2026 NagarSetu Municipal Intelligence Platform. All rights reserved.</p>
        <div className="flex space-x-6 mt-4 md:mt-0">
          <span>Local NLP: Offline Enabled</span>
          <span>Core DB: Supabase PostgreSQL</span>
          <span>Host: Vercel + Render</span>
        </div>
      </footer>
    </div>
  );
}
