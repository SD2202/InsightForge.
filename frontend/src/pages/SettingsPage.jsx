import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import Logo from '../components/Logo';
import { User, Mail, Lock, LogOut, ArrowLeft, Save, CheckCircle } from 'lucide-react';

export default function SettingsPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState({ username: '', email: '' });
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const data = await api.getMe();
      setUser(data);
      setNewEmail(data.email);
    } catch (err) {
      setError("Failed to load user profile");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess(false);

    try {
      await api.updateMe({
        email: newEmail,
        password: newPassword || undefined
      });
      setSuccess(true);
      setNewPassword('');
      fetchUser();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  if (loading) return null;

  return (
    <div className="min-h-screen bg-bg text-white pb-20">
      <nav className="glass-card rounded-none border-t-0 border-l-0 border-r-0 border-b border-white/10 px-6 py-4 flex justify-between items-center bg-bg-card/90">
        <div className="flex items-center gap-4 cursor-pointer" onClick={() => navigate('/portfolio')}>
          <ArrowLeft className="w-5 h-5 text-gray-400 hover:text-white transition-colors" />
          <Logo />
        </div>
        <h1 className="text-xl font-bold text-white hidden sm:block">User Settings</h1>
        <button onClick={handleLogout} className="text-red-400 hover:text-red-300 flex items-center gap-2 text-sm font-medium transition-colors">
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </nav>

      <main className="max-w-2xl mx-auto p-6 mt-12 animate-slide-up">
        <div className="text-center mb-10">
          <div className="inline-block p-4 rounded-full bg-primary/10 border border-primary/20 mb-4">
            <User className="w-12 h-12 text-primary" />
          </div>
          <h2 className="text-3xl font-bold text-white">Profile Settings</h2>
          <p className="text-gray-400 mt-2">Personalize your InsightForge experience</p>
        </div>

        <div className="glass-card p-8 border-white/5 bg-white/[0.02]">
          <form onSubmit={handleUpdate} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-2 uppercase tracking-tight">Username (Fixed)</label>
              <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-gray-400">
                <User className="w-4 h-4" />
                <span>{user.username}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input 
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-primary/50"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Change Password (Optional)</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input 
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Leave blank to keep current"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-primary/50"
                />
              </div>
            </div>

            {error && <p className="text-red-400 text-sm text-center">⚠️ {error}</p>}
            {success && <p className="text-primary text-sm flex items-center justify-center gap-2 animate-bounce">
              <CheckCircle className="w-4 h-4" /> Settings updated successfully!
            </p>}

            <button 
              type="submit" 
              disabled={saving}
              className="btn-primary w-full flex justify-center items-center py-4 text-base"
            >
              {saving ? <div className="animate-spin w-5 h-5 border-2 border-black/30 border-t-black rounded-full" /> : <><Save className="w-5 h-5 mr-2" /> Save Changes</>}
            </button>
          </form>
        </div>

        <div className="mt-12 p-8 glass-card border-red-500/10 bg-red-500/[0.01]">
          <h3 className="text-lg font-bold text-red-100 mb-2">Danger Zone</h3>
          <p className="text-sm text-gray-400 mb-6">Logging out will end your current session. You will need your credentials to sign back in.</p>
          <button onClick={handleLogout} className="w-full flex justify-center items-center gap-2 py-3 border border-red-500/30 text-red-500 hover:bg-red-500/10 rounded-xl transition-all font-medium uppercase tracking-wide text-xs">
            <LogOut className="w-4 h-4" /> Immediate Logout
          </button>
        </div>
      </main>
    </div>
  );
}
