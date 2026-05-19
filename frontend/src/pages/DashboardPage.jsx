import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import Logo from '../components/Logo';
import InsightCard from '../components/InsightCard';
import ChartSuggestions from '../components/ChartSuggestions';
import DataPreview from '../components/DataPreview';

export default function DashboardPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [insightFilter, setInsightFilter] = useState('all');
  const [activeView, setActiveView] = useState('insights'); // 'insights' or 'charts'

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const result = await api.getResults(jobId);
        setData(result);
      } catch (err) {
        console.error("Failed to fetch results:", err);
        setError(err.response?.data?.detail || "Could not load results. They may have expired.");
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [jobId]);

  const handleDownload = async () => {
    try {
      await api.downloadCleanedCsv(jobId);
    } catch (err) {
      console.error("Failed to download CSV:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-4xl font-heading font-bold animate-pulse">Loading...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-6 text-center">
        <Logo className="mb-8" />
        <div className="glass-card max-w-md w-full p-8">
          <div className="text-4xl mb-4">🔍</div>
          <h2 className="text-2xl font-heading font-bold text-white mb-2">Results Not Found</h2>
          <p className="text-charcoal font-medium mb-6 text-sm">{error || "The processing job could not be found."}</p>
          <button onClick={() => navigate('/')} className="btn-primary w-full">Start Over</button>
        </div>
      </div>
    );
  }

  const { insights, chart_suggestions, preview, metadata, processing_time_seconds, preprocessing_status_analysis } = data;

  const filteredInsights = insights.filter(insight => 
    insightFilter === 'all' ? true : insight.severity === insightFilter
  );

  return (
    <div className="min-h-screen bg-bg text-white font-sans pb-12">
      {/* Navbar segment */}
      <nav className="sticky top-0 z-50 glass-card rounded-none border-t-0 border-l-0 border-r-0 border-b border-white/10 px-6 py-4 flex justify-between items-center bg-black/90 backdrop-blur-md">
        <Logo />
        <div className="flex items-center gap-4">
          <span className="text-xs text-white/60 font-bold hidden sm:inline-block">
            Processed in <span className="font-mono">{processing_time_seconds}s</span>
          </span>
          <button 
            onClick={handleDownload} 
            className="btn-secondary text-sm py-2 px-4"
            title="Download Cleaned Data"
          >
            📥 Download CSV
          </button>
          <button onClick={() => navigate('/portfolio')} className="btn-secondary text-sm py-2 px-4">
            Back to Portfolio
          </button>
          <button onClick={() => navigate('/upload')} className="btn-primary text-sm py-2 px-4">
            Analyze New File
          </button>
        </div>
      </nav>

      {/* Modern View Switcher */}
      <div className="max-w-7xl mx-auto px-6 mt-8 flex justify-center">
        <div className="bg-brand-gray border border-white/10 p-1 rounded-xl flex gap-1 shadow-lg">
          <button
            onClick={() => setActiveView('insights')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeView === 'insights' ? 'bg-white text-black shadow-md font-semibold' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
          >
            <span>💡</span> Insights & Data
          </button>
          <button
            onClick={() => setActiveView('charts')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeView === 'charts' ? 'bg-white text-black shadow-md font-semibold' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
          >
            <span>📊</span> Visual Chart Center
          </button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto p-6 mt-2">
        {activeView === 'insights' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in">
            {/* Left Column: Insights */}
            <div className="lg:col-span-8 space-y-8">
              <section>
                <div className="mb-6 flex items-end justify-between border-b border-white/10 pb-4">
                  <div>
                    <h2 className="text-4xl font-heading font-bold text-white flex items-center gap-3">
                      <span className="bg-white/5 text-white p-2 text-2xl border border-white/10 rounded-lg">💡</span>
                      Key Insights
                    </h2>
                    <p className="text-white/60 font-semibold mt-2 ml-14">Auto-generated findings in plain English.</p>
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    <span className="stat-badge">
                      {filteredInsights.length} Insights
                    </span>
                    <div className="flex gap-2">
                      {['all', 'success', 'warning', 'info'].map(f => (
                        <button 
                          key={f} 
                          onClick={() => setInsightFilter(f)}
                          className={`text-xs font-bold uppercase px-3 py-1.5 border border-white/10 rounded-lg transition-all ${insightFilter === f ? 'bg-white text-black font-semibold' : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'}`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {filteredInsights.length > 0 ? filteredInsights.map((insight, idx) => (
                    <InsightCard key={insight.id || idx} insight={insight} index={idx} />
                  )) : (
                    <div className="glass-card p-6 text-center font-bold">No insights match this filter.</div>
                  )}
                </div>
              </section>

              <section className="animate-fade-in" style={{ animationDelay: '0.2s', animationFillMode: 'forwards', opacity: 0 }}>
                <h2 className="text-3xl font-heading font-bold text-white flex items-center gap-3 mb-6">
                  <span className="bg-white/5 text-white p-2 text-xl border border-white/10 rounded-lg">🗂️</span>
                  Preview Dataset
                </h2>
                <DataPreview data={preview} />
              </section>
            </div>

            {/* Right Column: Meta */}
            <div className="lg:col-span-4 space-y-8">
              {/* Data Summary Card */}
              <section className="glass-card p-6 animate-fade-in" style={{ animationDelay: '0.1s', animationFillMode: 'forwards', opacity: 0 }}>
                <h3 className="section-title mb-5 flex items-center gap-2">
                  <span className="text-white text-xl">📐</span> Data Summary
                </h3>
                
                <div className="space-y-4 font-semibold text-sm">
                  <div className="flex justify-between items-center py-2 border-b border-white/10">
                    <span className="text-white/60 uppercase">Original Rows</span>
                    <span className="font-mono text-white">{metadata.original_rows.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-white/10">
                    <span className="text-white/60 uppercase">Cleaned Rows</span>
                    <span className="font-mono text-white bg-white/5 border border-white/10 px-2 py-1 rounded-md">{metadata.cleaned_rows.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-white/10">
                    <span className="text-white/60 uppercase">Columns</span>
                    <span className="font-mono text-white">{metadata.cleaned_cols}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-white/10">
                    <span className="text-white/60 uppercase">Duplicates Removed</span>
                    <span className="font-mono text-white">{metadata.duplicates_removed.toLocaleString()}</span>
                  </div>
                  {preprocessing_status_analysis && (
                    <div className="flex justify-between items-center py-2">
                      <span className="text-white/60 uppercase">Changed Rows</span>
                      <span className="font-mono text-white">{preprocessing_status_analysis.changed_rows.toLocaleString()}</span>
                    </div>
                  )}
                  {preprocessing_status_analysis && (
                    <div className="flex justify-between items-center py-2 border-t border-dashed border-white/10 mt-2">
                      <span className="text-violet-400 font-bold uppercase">Total Corrections Made</span>
                      <span className="font-mono text-violet-400 font-bold bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-md">
                        {preprocessing_status_analysis.total_corrections_made.toLocaleString()} Fixes
                      </span>
                    </div>
                  )}
                </div>
              </section>

              {/* Preprocessing Quality & Status Card */}
              {preprocessing_status_analysis && (
                <section className="glass-card p-6 animate-fade-in" style={{ animationDelay: '0.2s', animationFillMode: 'forwards', opacity: 0 }}>
                  <h3 className="section-title mb-5 flex items-center gap-2">
                    <span className="text-white text-xl">✨</span> Preprocessing Status
                  </h3>
                  
                  <div className="space-y-4 text-sm font-semibold">
                    <div className="flex justify-between items-center py-2 border-b border-white/10">
                      <span className="text-white/60 uppercase">Data Quality Score</span>
                      <span className="font-mono text-violet-400 font-bold text-lg bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-md">
                        {preprocessing_status_analysis.score}/100
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-2 border-b border-white/10">
                      <span className="text-white/60 uppercase">Clean Status</span>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${
                        preprocessing_status_analysis.status_label === 'Fully Preprocessed'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : preprocessing_status_analysis.status_label === 'Partially Preprocessed'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                      }`}>
                        {preprocessing_status_analysis.status_label}
                      </span>
                    </div>

                    <div className="space-y-2 py-2 border-b border-white/10">
                      <div className="flex justify-between items-center">
                        <span className="text-white/60 uppercase">Missing Values Imputed</span>
                        <span className="font-mono text-white">{preprocessing_status_analysis.missing_values_raw}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-white/60 uppercase">Duplicates Cleared</span>
                        <span className="font-mono text-white">{preprocessing_status_analysis.duplicates_raw}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-white/60 uppercase">Whitespace Stripped</span>
                        <span className="font-mono text-white">{preprocessing_status_analysis.whitespace_anomalies_raw}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-white/60 uppercase">Downcasted Float Ints</span>
                        <span className="font-mono text-white">{preprocessing_status_analysis.float_integers_raw}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-white/60 uppercase">Outliers Capped (IQR)</span>
                        <span className="font-mono text-white">{preprocessing_status_analysis.outliers_capped_raw}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-white/60 uppercase">Constraint Issues Fixed</span>
                        <span className="font-mono text-white">{preprocessing_status_analysis.validation_negatives_fixed}</span>
                      </div>
                    </div>

                    {preprocessing_status_analysis.float_integer_columns && preprocessing_status_analysis.float_integer_columns.length > 0 && (
                      <div className="py-2 border-b border-white/10 space-y-1.5">
                        <span className="text-[10px] uppercase font-bold text-white/45 tracking-wider block">Auto-Downcasted Columns</span>
                        <div className="flex flex-wrap gap-1.5">
                          {preprocessing_status_analysis.float_integer_columns.map(col => (
                            <span key={col} className="text-xs bg-white/5 border border-white/10 text-white/80 px-2 py-0.5 rounded font-mono">
                              {col}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="text-xs text-white/50 leading-relaxed font-normal bg-black/40 border border-white/5 p-3.5 rounded-xl">
                      <span className="font-bold text-white/70 block mb-1">💡 Automated Diagnostics Summary:</span>
                      {preprocessing_status_analysis.summary_message}
                    </div>

                    <button
                      onClick={handleDownload}
                      className="btn-primary w-full text-xs py-3 mt-2 flex items-center justify-center gap-2"
                    >
                      📥 Download Cleaned Dataset (.csv)
                    </button>
                  </div>
                </section>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-8 animate-fade-in">
            <ChartSuggestions suggestions={chart_suggestions} data={preview} />
          </div>
        )}
      </main>
    </div>
  );
}
