import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Eye, EyeOff, KeyRound, Save, UserRound, X } from 'lucide-react';
import { Dealer } from '../types';
import { getAuthErrorMessage, updateUserAccount, type UserProfile } from '../lib/auth';

interface UserProfilePanelProps {
  profile: UserProfile;
  dealer?: Dealer | null;
  onClose: () => void;
  onSaved: (profile: UserProfile, dealer?: Dealer) => void | Promise<void>;
}

export default function UserProfilePanel({ profile, dealer, onClose, onSaved }: UserProfilePanelProps) {
  const [displayName, setDisplayName] = useState(profile.displayName || dealer?.owner || '');
  const [companyName, setCompanyName] = useState(profile.companyName || dealer?.name || '');
  const [phone, setPhone] = useState(profile.phone || dealer?.phone || '');
  const [email, setEmail] = useState(profile.email);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirmation, setNewPasswordConfirmation] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDisplayName(profile.displayName || dealer?.owner || '');
    setCompanyName(profile.companyName || dealer?.name || '');
    setPhone(profile.phone || dealer?.phone || '');
    setEmail(profile.email);
  }, [profile, dealer]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSaved(false);

    const normalizedEmail = email.trim().toLowerCase();
    const isEmailChanging = normalizedEmail !== profile.email.trim().toLowerCase();
    const isPasswordChanging = Boolean(newPassword || newPasswordConfirmation);

    if (!displayName.trim() || !normalizedEmail) {
      setError('Ad soyad ve e-posta alanları zorunludur.');
      return;
    }
    if ((isEmailChanging || isPasswordChanging) && !currentPassword) {
      setError('E-posta veya şifre değişikliği için mevcut şifrenizi girin.');
      return;
    }
    if (isPasswordChanging && newPassword.length < 6) {
      setError('Yeni şifre en az 6 karakter olmalıdır.');
      return;
    }
    if (isPasswordChanging && newPassword !== newPasswordConfirmation) {
      setError('Yeni şifre ve tekrarı eşleşmiyor.');
      return;
    }

    setIsSaving(true);
    try {
      const updatedProfile = await updateUserAccount({
        displayName: displayName.trim(),
        companyName: companyName.trim(),
        phone: phone.trim(),
        email: normalizedEmail,
        currentPassword: currentPassword || undefined,
        newPassword: isPasswordChanging ? newPassword : undefined,
      });
      const updatedDealer = dealer
        ? { ...dealer, name: companyName.trim() || dealer.name, owner: displayName.trim(), email: normalizedEmail, phone: phone.trim() }
        : undefined;
      await onSaved(updatedProfile, updatedDealer);
      setCurrentPassword('');
      setNewPassword('');
      setNewPasswordConfirmation('');
      setSaved(true);
    } catch (updateError) {
      setError(getAuthErrorMessage(updateError));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs" role="dialog" aria-modal="true" aria-labelledby="profile-panel-title">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-100 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-500 p-2 text-white"><UserRound className="h-5 w-5" /></div>
            <div>
              <h2 id="profile-panel-title" className="font-display text-lg font-bold text-slate-900">Profil ve Giriş Bilgileri</h2>
              <p className="text-xs font-medium text-slate-500">Hesap bilgilerinizi ve şifrenizi güncelleyin.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700" aria-label="Profili kapat"><X className="h-5 w-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          {error && <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
          {saved && <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-700"><CheckCircle2 className="h-4 w-4" />Profil bilgileriniz güncellendi.</div>}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5 text-xs font-bold text-slate-600">Ad Soyad
              <input value={displayName} onChange={event => setDisplayName(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-900 outline-none transition-colors focus:border-amber-500 focus:bg-white" autoComplete="name" />
            </label>
            <label className="space-y-1.5 text-xs font-bold text-slate-600">Telefon
              <input value={phone} onChange={event => setPhone(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-900 outline-none transition-colors focus:border-amber-500 focus:bg-white" autoComplete="tel" />
            </label>
            {profile.role === 'bayi' && <label className="space-y-1.5 text-xs font-bold text-slate-600 sm:col-span-2">Mağaza / işletme adı
              <input value={companyName} onChange={event => setCompanyName(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-900 outline-none transition-colors focus:border-amber-500 focus:bg-white" autoComplete="organization" />
            </label>}
            <label className="space-y-1.5 text-xs font-bold text-slate-600 sm:col-span-2">E-posta adresi
              <input type="email" value={email} onChange={event => setEmail(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-900 outline-none transition-colors focus:border-amber-500 focus:bg-white" autoComplete="email" />
            </label>
          </div>

          <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2"><KeyRound className="h-4 w-4 text-amber-600" /><h3 className="text-sm font-bold text-slate-800">Şifre değişikliği</h3></div>
            <p className="text-[11px] leading-relaxed text-slate-500">Şifreyi değiştirmek istemiyorsanız yeni şifre alanlarını boş bırakın. E-posta veya şifre değişikliğinde mevcut şifreniz istenir.</p>
            <label className="space-y-1.5 text-xs font-bold text-slate-600">Mevcut şifre
              <input type={showPasswords ? 'text' : 'password'} value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 outline-none transition-colors focus:border-amber-500" autoComplete="current-password" />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5 text-xs font-bold text-slate-600">Yeni şifre
                <input type={showPasswords ? 'text' : 'password'} value={newPassword} onChange={event => setNewPassword(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 outline-none transition-colors focus:border-amber-500" autoComplete="new-password" />
              </label>
              <label className="space-y-1.5 text-xs font-bold text-slate-600">Yeni şifre tekrarı
                <input type={showPasswords ? 'text' : 'password'} value={newPasswordConfirmation} onChange={event => setNewPasswordConfirmation(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 outline-none transition-colors focus:border-amber-500" autoComplete="new-password" />
              </label>
            </div>
            <button type="button" onClick={() => setShowPasswords(value => !value)} className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-slate-800">{showPasswords ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />} Şifreleri göster</button>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50">Vazgeç</button>
            <button type="submit" disabled={isSaving} className="flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-sm transition-colors hover:bg-amber-600 disabled:cursor-wait disabled:opacity-60"><Save className="h-4 w-4" />{isSaving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
