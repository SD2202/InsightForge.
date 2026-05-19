import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { api } from '../api/client';
import Logo from '../components/Logo';

export default function UploadPage() {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const onDrop = useCallback(async (acceptedFiles, fileRejections) => {
    let file = acceptedFiles[0];

    // Robust Windows MIME type fallback: check extension if dropzone rejected it
    if (!file && fileRejections.length > 0) {
      const rejectedFile = fileRejections[0].file;
      const ext = rejectedFile.name.split('.').pop().toLowerCase();
      if (['csv', 'xlsx', 'xls'].includes(ext)) {
        file = rejectedFile;
      } else {
        setError(fileRejections[0].errors[0].message || "Invalid file type. Please upload a CSV or Excel file.");
        return;
      }
    }

    if (!file) return;

    setError('');
    setIsUploading(true);

    try {
      // 1. Upload the file
      const uploadRes = await api.uploadFile(file);
      
      // 2. Navigate to processing page, passing the job_id
      navigate(`/process/${uploadRes.job_id}`);
      
    } catch (err) {
      console.error("Upload error:", err);
      
      // If the backend says 401 Unauthorized, the session is completely dead/invalid
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/');
        return;
      }

      setError(
        err.response?.data?.detail || 
        err.message || 
        "Failed to upload file. Please ensure it's a valid CSV or Excel file under 50MB."
      );
      setIsUploading(false);
    }
  }, [navigate]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'text/plain': ['.csv'],
      'application/csv': ['.csv'],
      'text/comma-separated-values': ['.csv'],
      'application/vnd.ms-excel': ['.xls', '.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    maxSize: 50 * 1024 * 1024, // 50MB
    multiple: false
  });

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[100px] pointer-events-none"></div>
      
      <div className="w-full max-w-2xl z-10 flex flex-col items-center">
        <Logo className="mb-12 scale-125" />
        
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">
            Transform raw data into <span className="gradient-text">instant insights</span>
          </h1>
          <p className="text-lg text-gray-400 max-w-xl mx-auto">
            Upload your dataset. We'll clean it, analyze patterns, and generate human-readable insights in seconds.
          </p>
        </div>

        {/* Dropzone */}
        <div 
          {...getRootProps()} 
          className={`w-full glass-card p-12 text-center cursor-pointer border-2 border-dashed transition-all duration-300
            ${isDragActive ? 'dropzone-active' : 'border-border hover:border-primary/50 hover:bg-white/[0.02]'}
            ${isUploading ? 'opacity-50 pointer-events-none' : ''}
          `}
        >
          <input {...getInputProps()} />
          
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className={`p-4 rounded-full bg-bg-elevated text-primary mb-2 transition-transform duration-300 ${isDragActive ? 'scale-110' : ''}`}>
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            
            {isUploading ? (
              <div className="space-y-3">
                <p className="text-xl font-semibold text-white">Uploading your dataset...</p>
                <div className="w-64 h-2 bg-bg-elevated rounded-full overflow-hidden mx-auto mt-4">
                  <div className="h-full bg-primary shimmer rounded-full w-full"></div>
                </div>
              </div>
            ) : isDragActive ? (
              <p className="text-xl font-semibold text-primary drop-shadow-glow">Drop it here! 🚀</p>
            ) : (
              <>
                <p className="text-xl font-semibold text-white">Drag & drop your file here</p>
                <p className="text-sm text-gray-400">or click to browse</p>
                
                <div className="flex gap-3 justify-center mt-6 pt-4 border-t border-border/50">
                  <span className="stat-badge">.CSV</span>
                  <span className="stat-badge">.XLSX</span>
                  <span className="stat-badge">Max 50MB</span>
                </div>
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-start gap-3 w-full animate-slide-up">
            <span className="shrink-0 mt-0.5">⚠️</span>
            <p>{error}</p>
          </div>
        )}

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-center max-w-3xl opacity-80">
          <div className="flex flex-col items-center p-4">
            <div className="text-2xl mb-2">🧹</div>
            <h3 className="font-semibold mb-1">Auto-Cleaning</h3>
            <p className="text-xs text-gray-400">Handles missing values, duplicates & outliers instantly.</p>
          </div>
          <div className="flex flex-col items-center p-4">
            <div className="text-2xl mb-2">🧠</div>
            <h3 className="font-semibold mb-1">Smart Analysis</h3>
            <p className="text-xs text-gray-400">Detects distributions, correlations & importance.</p>
          </div>
          <div className="flex flex-col items-center p-4">
            <div className="text-2xl mb-2">📝</div>
            <h3 className="font-semibold mb-1">Plain English</h3>
            <p className="text-xs text-gray-400">Translates complex stats into human-readable sentences.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
