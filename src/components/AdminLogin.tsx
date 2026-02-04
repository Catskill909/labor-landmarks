import React, { useState } from 'react';
import { Eye, EyeOff, Lock, ShieldAlert, Loader2 } from 'lucide-react';

interface AdminLoginProps {
    onLoginSuccess: () => void;
}

const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess }) => {
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/admin/verify-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ password }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                sessionStorage.setItem('isAdminAuthenticated', 'true');
                sessionStorage.setItem('adminToken', password); // Store for API auth
                onLoginSuccess();
            } else {
                setError(data.error || 'Invalid password');
            }
        } catch (err) {
            console.error('Login error:', err);
            setError('Connection error. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-6 font-sans">
            <div className="w-full max-w-md">
                {/* Decorative elements */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 via-white/20 to-red-600 opacity-50"></div>

                <div className="space-y-8">
                    <div className="text-center space-y-2">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/5 border border-white/10 mb-4 shadow-2xl">
                            <Lock className="w-8 h-8 text-red-600" />
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight text-white">Admin Access</h1>
                        <p className="text-gray-500 text-sm font-medium">Labor Landmarks Registry</p>
                    </div>

                    <div className="glass border border-white/10 rounded-3xl p-8 shadow-2xl space-y-6 relative overflow-hidden">
                        {/* Subtle glow effect */}
                        <div className="absolute -top-24 -right-24 w-48 h-48 bg-red-600/10 blur-[100px] pointer-events-none"></div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 ml-1">
                                    Master Password
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Lock className="h-4 w-4 text-gray-500 group-focus-within:text-red-500 transition-colors" />
                                    </div>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        autoFocus
                                        placeholder="••••••••"
                                        className="block w-full pl-11 pr-12 py-4 bg-white/[0.03] border border-white/5 rounded-2xl text-white placeholder:text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-600/50 focus:border-red-600/50 transition-all duration-300"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-white transition-colors"
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-5 w-5" />
                                        ) : (
                                            <Eye className="h-5 w-5" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {error && (
                                <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-300">
                                    <ShieldAlert className="h-5 w-5 text-red-500 shrink-0" />
                                    <p className="text-sm font-medium text-red-400">{error}</p>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="group relative w-full py-4 bg-white text-black font-bold rounded-2xl hover:bg-red-600 hover:text-white transition-all duration-300 overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <div className="relative z-10 flex items-center justify-center gap-2">
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                            <span>Authenticating...</span>
                                        </>
                                    ) : (
                                        <span>Enter Dashboard</span>
                                    )}
                                </div>
                            </button>
                        </form>
                    </div>

                    <div className="text-center">
                        <button
                            onClick={() => window.location.href = '/'}
                            className="text-gray-500 hover:text-white text-xs font-medium transition-colors"
                        >
                            ← Back to Map View
                        </button>
                    </div>
                </div>
            </div>

            <style>{`
        .glass {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }
      `}</style>
        </div>
    );
};

export default AdminLogin;
