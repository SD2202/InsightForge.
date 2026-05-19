import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import Logo from '../components/Logo';

const STEPS = [
  "Uploading dataset...",
  "Cleaning data (imputing missing, removing dupes)...",
  "Analyzing patterns and distributions...",
  "Generating human-readable insights...",
  "Finalizing dashboard..."
];

export default function ProcessingPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  
  const [currentStep, setCurrentStep] = useState(1); // Start at step 1 (uploading is done)
  const [error, setError] = useState(null);

  useEffect(() => {
    // Animate through fake steps just for a better UX while the backend works
    const interval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev < STEPS.length - 1) return prev + 1;
        return prev;
      });
    }, 2500);

    // Call the processing endpoint
    const processData = async () => {
      try {
        await api.processDataset(jobId);
        // Completed successfully, jump to last step briefly then redirect
        setCurrentStep(STEPS.length - 1);
        setTimeout(() => {
          navigate(`/dashboard/${jobId}`);
        }, 800);
      } catch (err) {
        console.error("Processing failed:", err);
        setError(err.response?.data?.detail || "An error occurred while processing the dataset.");
        clearInterval(interval);
      }
    };

    processData();

    return () => clearInterval(interval);
  }, [jobId, navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <Logo className="mb-8" />
        <div className="glass-card max-w-md w-full p-8">
          <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
            ⚠️
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Processing Failed</h2>
          <p className="text-gray-400 mb-6 text-sm">{error}</p>
          <button 
            onClick={() => navigate('/')}
            className="btn-primary w-full"
          >
            Try Another File
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/20 rounded-full blur-[120px] animate-pulse-slow"></div>
      
      <div className="z-10 flex flex-col items-center max-w-md w-full">
        <Logo className="mb-16" />

        {/* Animated Rings Loader */}
        <div className="relative w-32 h-32 mb-12">
          {/* Outer ring */}
          <div className="absolute inset-0 rounded-full border-2 border-border/50"></div>
          {/* Spinning dashed ring */}
          <div className="absolute inset-0 rounded-full border-t-2 border-r-2 border-primary animate-spin-slow"></div>
          {/* Inner pulsating circle */}
          <div className="absolute inset-4 rounded-full bg-primary/10 animate-glow"></div>
          {/* Center icon */}
          <div className="absolute inset-0 flex items-center justify-center text-2xl">
            ⚙️
          </div>
        </div>

        {/* Steps */}
        <div className="w-full space-y-4">
          {STEPS.map((step, idx) => {
            const isActive = idx === currentStep;
            const isPast = idx < currentStep;
            const isFuture = idx > currentStep;

            return (
              <div 
                key={idx} 
                className={`flex items-center gap-4 transition-all duration-500 ${
                  isActive ? 'opacity-100 scale-105' : 
                  isPast ? 'opacity-50' : 'opacity-20'
                }`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold transition-colors duration-500 ${
                  isActive ? 'bg-primary text-black shadow-glow' : 
                  isPast ? 'bg-primary/20 text-primary' : 
                  'bg-white/5 text-white/30'
                }`}>
                  {isPast ? '✓' : idx + 1}
                </div>
                <span className={`text-sm font-medium transition-colors duration-500 ${
                  isActive ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]' : 
                  'text-gray-400'
                }`}>
                  {step}
                </span>
                
                {/* Active step progress indicator */}
                {isActive && (
                  <div className="ml-auto w-16 h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-primary animate-progress rounded-full"></div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
