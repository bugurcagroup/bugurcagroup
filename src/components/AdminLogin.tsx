import React, { useState } from 'react';
import { LogIn, Lock, User, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { getAuthErrorMessage, loginUser, type UserProfile } from '../lib/auth';

interface AdminLoginProps {
  onLoginSuccess: (profile: UserProfile) => void;
}

export default function AdminLogin({ onLoginSuccess }: AdminLoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const profile = await loginUser(username, password);
      if (profile.role !== 'admin') {
        throw new Error('Bu hesap yönetici yetkisine sahip değil.');
      }
      onLoginSuccess(profile);
    } catch (error) {
      setError(error instanceof Error && error.message.includes('yönetici') ? error.message : getAuthErrorMessage(error));
      setPassword('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white p-8">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                <Lock className="w-6 h-6 text-white" />
              </div>
              <h1 className="font-display font-bold text-2xl tracking-tight">Yönetici Paneli</h1>
            </div>
            <p className="text-amber-100 text-sm text-center">Buğurca Kırtasiye Yönetimi</p>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 font-medium">{error}</p>
              </div>
            )}

            {/* Info Box */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-xs text-amber-900 leading-relaxed">
                <strong className="text-amber-950">Bilgilendirme:</strong> Yönetici paneline erişim için lütfen doğru giriş bilgilerini kullanınız. Yetkisiz erişim denemeleri kaydedilmektedir.
              </p>
            </div>

            {/* Username Field */}
            <div className="space-y-2">
              <label htmlFor="username" className="block text-sm font-bold text-slate-700">
E-posta Adresi
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="E-posta adresinizi girin..."
                  disabled={isLoading}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-medium placeholder-slate-400 focus:outline-hidden focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-bold text-slate-700">
                Şifre
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Şifrenizi girin..."
                  disabled={isLoading}
                  className="w-full pl-11 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-medium placeholder-slate-400 focus:outline-hidden focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !username || !password}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:from-amber-700 active:to-amber-800 text-white font-bold py-3 rounded-xl text-sm transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              {isLoading ? 'Kontrol Ediliyor...' : 'Giriş Yap'}
            </button>

            {/* Security Note */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-xs text-slate-600 leading-relaxed text-center">
                Bu platforma erişim, <strong>yetkili kişiler</strong> tarafından sınırlandırılmıştır. Tüm giriş ve işlemler kayıt altında tutulmaktadır.
              </p>
            </div>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-slate-400 text-xs mt-6 font-medium">
          Buğurca Kırtasiye © 2026 - Güvenli Yönetim Sistemi
        </p>
      </div>
    </div>
  );
}
