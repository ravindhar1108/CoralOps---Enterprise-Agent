"use client";

import { useState } from "react";
import { KeyRound, ShieldCheck, Database, LayoutDashboard, GitMerge } from "lucide-react";

export default function AnalyzePage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [keys, setKeys] = useState({
    sonar: "",
    github: "",
    linear: "",
    sentry: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulate dynamic backend provisioning
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
      // In a real implementation, this would POST to a provisioning service
      // that spins up a new Coral process with these specific environment variables
    }, 2500);
  };

  return (
    <div className="flex-1 bg-[#050505] text-neutral-200 p-8 overflow-y-auto flex items-center justify-center">
      <div className="w-full max-w-2xl bg-[#111] border border-[#222] rounded-2xl p-8 relative overflow-hidden shadow-2xl">
        
        {/* Glow effect */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500"></div>

        <div className="text-center mb-10">
          <h1 className="text-3xl font-semibold text-white tracking-tight mb-2">Analyse Your Project</h1>
          <p className="text-neutral-500">Provide your API keys to provision a dynamic Coral intelligence instance.</p>
        </div>

        {success ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-6 animate-in fade-in zoom-in duration-500">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/50">
              <ShieldCheck className="w-10 h-10 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-medium text-white">Instance Provisioned!</h2>
            <p className="text-neutral-400 text-center max-w-md">
              Your isolated Coral MCP agent has been successfully deployed and is actively federating your APIs.
            </p>
            <button 
              onClick={() => window.location.href = '/dashboard'}
              className="mt-4 px-6 py-3 bg-white text-black font-semibold rounded-lg hover:bg-neutral-200 transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="space-y-4">
              <div className="group">
                <label className="flex items-center text-sm font-medium text-neutral-400 mb-1.5 group-focus-within:text-indigo-400 transition-colors">
                  <Database className="w-4 h-4 mr-2" /> SonarQube Token
                </label>
                <div className="relative">
                  <input 
                    type="password" 
                    required
                    value={keys.sonar}
                    onChange={(e) => setKeys({...keys, sonar: e.target.value})}
                    placeholder="sqp_..." 
                    className="w-full bg-[#1a1a1a] border border-[#333] focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-4 py-3 text-white placeholder-neutral-600 outline-none transition-all"
                  />
                  <KeyRound className="absolute right-4 top-3.5 w-4 h-4 text-neutral-600" />
                </div>
              </div>

              <div className="group">
                <label className="flex items-center text-sm font-medium text-neutral-400 mb-1.5 group-focus-within:text-indigo-400 transition-colors">
                  <GitMerge className="w-4 h-4 mr-2" /> GitHub Personal Access Token
                </label>
                <div className="relative">
                  <input 
                    type="password" 
                    required
                    value={keys.github}
                    onChange={(e) => setKeys({...keys, github: e.target.value})}
                    placeholder="ghp_..." 
                    className="w-full bg-[#1a1a1a] border border-[#333] focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-4 py-3 text-white placeholder-neutral-600 outline-none transition-all"
                  />
                  <KeyRound className="absolute right-4 top-3.5 w-4 h-4 text-neutral-600" />
                </div>
              </div>

              <div className="group">
                <label className="flex items-center text-sm font-medium text-neutral-400 mb-1.5 group-focus-within:text-indigo-400 transition-colors">
                  <LayoutDashboard className="w-4 h-4 mr-2" /> Linear API Key
                </label>
                <div className="relative">
                  <input 
                    type="password" 
                    required
                    value={keys.linear}
                    onChange={(e) => setKeys({...keys, linear: e.target.value})}
                    placeholder="lin_api_..." 
                    className="w-full bg-[#1a1a1a] border border-[#333] focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-4 py-3 text-white placeholder-neutral-600 outline-none transition-all"
                  />
                  <KeyRound className="absolute right-4 top-3.5 w-4 h-4 text-neutral-600" />
                </div>
              </div>

              <div className="group">
                <label className="flex items-center text-sm font-medium text-neutral-400 mb-1.5 group-focus-within:text-indigo-400 transition-colors">
                  <ShieldCheck className="w-4 h-4 mr-2" /> Sentry Auth Token
                </label>
                <div className="relative">
                  <input 
                    type="password" 
                    required
                    value={keys.sentry}
                    onChange={(e) => setKeys({...keys, sentry: e.target.value})}
                    placeholder="sntrys_..." 
                    className="w-full bg-[#1a1a1a] border border-[#333] focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-4 py-3 text-white placeholder-neutral-600 outline-none transition-all"
                  />
                  <KeyRound className="absolute right-4 top-3.5 w-4 h-4 text-neutral-600" />
                </div>
              </div>
            </div>

            <div className="pt-4">
              <button 
                type="submit" 
                disabled={loading}
                className="w-full relative flex items-center justify-center bg-white hover:bg-neutral-200 text-black font-semibold rounded-lg py-3 transition-all overflow-hidden disabled:bg-neutral-500"
              >
                {loading ? (
                  <>
                    <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                    <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin mr-3"></div>
                    Provisioning Engine...
                  </>
                ) : (
                  "Deploy Dynamic Agent"
                )}
              </button>
              <p className="text-center text-xs text-neutral-500 mt-4">
                Keys are stored temporarily in-memory and are never persisted to disk.
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
