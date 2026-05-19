import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import Logo from '../components/Logo';
import { 
  MoreVertical, 
  Trash2, 
  Edit2, 
  Database, 
  Calendar, 
  Settings, 
  Plus, 
  ArrowRight,
  Search,
  Check,
  X
} from 'lucide-react';

export default function PortfolioPage() {
  const [portfolio, setPortfolio] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeMenu, setActiveMenu] = useState(null); // jobId of active menu
  const [editingJob, setEditingJob] = useState(null); // {jobId, name}
  const [deletingJob, setDeletingJob] = useState(null); // jobId
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        const data = await api.getPortfolio();
        setPortfolio(data);
      } catch (err) {
        console.error("Portfolio error:", err);
        if (err.response?.status === 401) {
          localStorage.removeItem('token');
          navigate('/login');
        } else {
          setError("Failed to load your portfolio. Please try again later.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchPortfolio();
  }, [navigate]);

  const handleDelete = async (jobId) => {
    try {
      await api.deletePortfolio(jobId);
      setPortfolio(portfolio.filter(j => j.job_id !== jobId));
      setDeletingJob(null);
    } catch (err) {
      setError("Failed to delete dataset.");
    }
  };

  const handleRename = async (e) => {
    e.preventDefault();
    try {
      await api.patchPortfolio(editingJob.jobId, editingJob.name);
      setPortfolio(portfolio.map(j => 
        j.job_id === editingJob.jobId ? { ...j, original_filename: editingJob.name } : j
      ));
      setEditingJob(null);
    } catch (err) {
      setError("Failed to rename dataset.");
    }
  };

  return (
    <div className="min-h-screen bg-bg text-white pb-12">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 glass-card rounded-none border-t-0 border-l-0 border-r-0 border-b border-white/10 px-6 py-4 flex justify-between items-center backdrop-blur-md bg-bg-card/90">
        <Logo />
        <div className="flex items-center gap-6">
          <button 
            onClick={() => navigate('/settings')}
            className="btn-primary text-sm py-2 px-5 flex items-center gap-2"
          >
            <Settings className="w-4 h-4" /> Settings
          </button>
          <button onClick={() => navigate('/upload')} className="btn-primary text-sm py-2 px-5 flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Analysis
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 mt-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Your Portfolio</h1>
          <p className="text-gray-300">Review your previously processed datasets and insights.</p>
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 mb-8">
            ⚠️ {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : portfolio.length === 0 ? (
          <div className="glass-card p-12 text-center flex flex-col items-center justify-center border-dashed border-2 animate-fade-in">
            <div className="text-5xl mb-4 opacity-50">📂</div>
            <h3 className="text-xl font-bold text-white mb-2">No datasets yet</h3>
            <p className="text-gray-300 mb-6 max-w-md">Upload your first dataset to generate automated insights and charts.</p>
            <button onClick={() => navigate('/upload')} className="btn-primary">
              Upload Dataset
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {portfolio.map((job, idx) => (
              <div 
                key={job.job_id} 
                className="glass-card p-6 flex flex-col hover:border-primary/50 transition-all cursor-pointer group animate-slide-up relative bg-white/[0.02]"
                style={{ animationDelay: `${idx * 0.1}s`, animationFillMode: 'forwards' }}
                onClick={() => navigate(`/dashboard/${job.job_id}`)}
              >
                {/* 3-Dot Dropdown */}
                <div className="absolute top-4 right-4 z-20">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenu(activeMenu === job.job_id ? null : job.job_id);
                    }}
                    className="p-1 hover:bg-white/10 rounded-full text-gray-300 hover:text-white transition-colors"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>
                  
                  {activeMenu === job.job_id && (
                    <div className="absolute right-0 mt-2 w-32 glass-card bg-bg-card border-white/10 shadow-2xl overflow-hidden py-1 z-30">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingJob({ jobId: job.job_id, name: job.original_filename });
                          setActiveMenu(null);
                        }}
                        className="w-full text-left px-4 py-2 text-xs hover:bg-primary/10 flex items-center gap-2 text-gray-300 hover:text-primary transition-colors"
                      >
                        <Edit2 className="w-3 h-3" /> Rename
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingJob(job.job_id);
                          setActiveMenu(null);
                        }}
                        className="w-full text-left px-4 py-2 text-xs hover:bg-red-500/10 flex items-center gap-2 text-gray-300 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-start mb-4 pr-8">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-black transition-colors">
                      <Database className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white truncate w-40" title={job.original_filename}>
                        {job.original_filename}
                      </h3>
                      <p className="text-[10px] text-gray-300 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {new Date(job.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mb-6">
                  <span className="text-[10px] px-2 py-1 rounded bg-white/5 border border-white/10 text-gray-300">{job.file_size_mb} MB</span>
                  <span className={`text-[10px] px-2 py-1 rounded border ${job.status === 'PROCESSED' ? 'border-primary/30 text-primary bg-primary/5' : 'border-yellow-500/30 text-yellow-500 bg-yellow-500/5'}`}>
                    {job.status}
                  </span>
                </div>

                {job.brief && (
                  <div className="mt-auto pt-4 border-t border-white/5">
                    <div className="flex justify-between text-[11px] text-gray-300 mb-2">
                      <span>{(job.brief.rows ?? 0).toLocaleString()} Rows</span>
                      <span>{job.brief.cols ?? 0} Columns</span>
                    </div>
                    {job.brief.top_insight && (
                      <p className="text-[11px] text-gray-300 italic line-clamp-2 leading-relaxed">
                        "{job.brief.top_insight}"
                      </p>
                    )}
                  </div>
                )}
                
                <div className="mt-4 flex items-center text-xs text-primary font-bold tracking-wider uppercase opacity-0 group-hover:opacity-100 transition-opacity">
                  View Insights <ArrowRight className="w-3 h-3 ml-2" />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Rename Modal */}
      {editingJob && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
          <div className="glass-card max-w-sm w-full p-8 animate-slide-up">
            <h3 className="text-xl font-bold text-white mb-6">Rename Dataset</h3>
            <form onSubmit={handleRename}>
              <input 
                autoFocus
                type="text"
                value={editingJob.name}
                onChange={(e) => setEditingJob({...editingJob, name: e.target.value})}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50 mb-6"
              />
              <div className="flex gap-4">
                <button type="button" onClick={() => setEditingJob(null)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1">Update</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deletingJob && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
          <div className="glass-card max-w-sm w-full p-8 animate-slide-up border-red-500/30">
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mb-6 mx-auto">
              <Trash2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2 text-center">Delete Dataset?</h3>
            <p className="text-gray-300 text-center mb-8 text-sm">This action cannot be undone. All insights and cached results will be permanently removed.</p>
            <div className="flex gap-4">
              <button onClick={() => setDeletingJob(null)} className="btn-secondary flex-1">Keep it</button>
              <button onClick={() => handleDelete(deletingJob)} className="btn-primary bg-red-500 hover:bg-red-600 border-red-500 text-white flex-1">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
