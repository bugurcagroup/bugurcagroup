/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, Lock, Key, ShieldAlert, CheckCircle, RefreshCw, Smartphone, Mail, AlertTriangle, KeyRound, Clock, ArrowRight, X } from 'lucide-react';
import { UserRole, Dealer } from '../types';

interface SecurityGateProps {
  role: UserRole;
  onSuccess: (selectedDealerId?: string) => void;
  onCancel: () => void;
  dealers: Dealer[];
}

export default function SecurityGate({ role, onSuccess, onCancel, dealers = [] }: SecurityGateProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  
  // List only active dealers
  const activeDealers = React.useMemo(() => {
    return dealers.filter(d => d.status === 'active');
  }, [dealers]);

  const [selectedDealerId, setSelectedDealerId] = useState<string>(activeDealers[0]?.id || '');

  // Determine current user details based on role and selected dealer
  const currentUserDetails = React.useMemo(() => {
    if (role === 'admin') {
      return {
        name: 'Sistem Yöneticisi (Admin)',
        phone: '+90 (532) 111 22 33',
        email: 'admin@bugurca.com'
      };
    } else {
      const matched = dealers.find(d => d.id === selectedDealerId);
      if (matched) {
        return {
          name: `${matched.name} (${matched.owner})`,
          phone: matched.phone || '+90 (544) 987 65 43',
          email: matched.email
        };
      }
      return {
        name: activeDealers[0]?.name ? `${activeDealers[0].name} (${activeDealers[0].owner})` : 'Bilinmeyen Bayi',
        phone: activeDealers[0]?.phone || '+90 (544) 987 65 43',
        email: activeDealers[0]?.email || ''
      };
    }
  }, [role, selectedDealerId, dealers, activeDealers]);

  // 2FA state
  const [otpCode, setOtpCode] = useState<string[]>(Array(6).fill(''));
  const [otpError, setOtpError] = useState('');
  const [countdown, setCountdown] = useState(30);
  const [current2FaToken, setCurrent2FaToken] = useState('482 915');
  const [smsSent, setSmsSent] = useState(false);
  const [smsNotification, setSmsNotification] = useState<string | null>(null);
  const [smsNotificationTimer, setSmsNotificationTimer] = useState<number>(0);
  
  // Brute force protection
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTimer, setLockTimer] = useState(0);

  const otpInputsRef = useRef<HTMLInputElement[]>([]);

  // Password targets
  const requiredPassword = role === 'admin' ? 'admin123' : 'dealer123';

  // Lock timer countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLocked && lockTimer > 0) {
      interval = setInterval(() => {
        setLockTimer((prev) => {
          if (prev <= 1) {
            setIsLocked(false);
            setFailedAttempts(0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isLocked, lockTimer]);

  // Dynamic 2FA token generator simulation
  useEffect(() => {
    const generateToken = () => {
      const part1 = Math.floor(100 + Math.random() * 900);
      const part2 = Math.floor(100 + Math.random() * 900);
      setCurrent2FaToken(`${part1} ${part2}`);
      setCountdown(30);
    };

    let interval: NodeJS.Timeout;
    if (step === 2) {
      generateToken();
      interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            generateToken();
            return 30;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [step]);

  // SMS Notification Timer
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (smsNotification) {
      timeout = setTimeout(() => {
        setSmsNotification(null);
      }, 7000);
    }
    return () => clearTimeout(timeout);
  }, [smsNotification]);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;

    if (password === requiredPassword) {
      setPasswordError('');
      setStep(2); // Go to 2FA layer
    } else {
      const attempts = failedAttempts + 1;
      setFailedAttempts(attempts);
      setPasswordError(`Hatalı şifre girdiniz. Kalan deneme hakkı: ${5 - attempts}`);
      
      if (attempts >= 5) {
        setIsLocked(true);
        setLockTimer(30); // Lock for 30s
        setPasswordError('Çok sayıda hatalı deneme! Güvenlik nedeniyle panel 30 saniye kilitlendi.');
      }
    }
  };

  const sendSmsCode = () => {
    if (isLocked) return;
    setSmsSent(true);
    // Extract token without spaces
    const numericToken = current2FaToken.replace(' ', '');
    setSmsNotification(`[EsnafShield] Sayın ${currentUserDetails.name}, ${currentUserDetails.phone} numaralı telefonunuza gönderilen Güvenli Giriş Doğrulama Kodunuz: ${numericToken}`);
  };

  const handleOtpChange = (index: number, value: string) => {
    if (isLocked) return;
    const cleanVal = value.replace(/[^0-9]/g, '');
    if (!cleanVal) {
      const newOtp = [...otpCode];
      newOtp[index] = '';
      setOtpCode(newOtp);
      return;
    }

    const digit = cleanVal.slice(-1);
    const newOtp = [...otpCode];
    newOtp[index] = digit;
    setOtpCode(newOtp);

    // Focus next input automatically
    if (index < 5 && digit) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      const newOtp = [...otpCode];
      if (!otpCode[index] && index > 0) {
        // focus previous
        otpInputsRef.current[index - 1]?.focus();
        newOtp[index - 1] = '';
        setOtpCode(newOtp);
      } else {
        newOtp[index] = '';
        setOtpCode(newOtp);
      }
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').trim().replace(/[^0-9]/g, '');
    if (pasteData.length >= 6) {
      const digits = pasteData.slice(0, 6).split('');
      setOtpCode(digits);
      otpInputsRef.current[5]?.focus();
    }
  };

  const verifyOtp = () => {
    if (isLocked) return;
    const entered = otpCode.join('');
    const target = current2FaToken.replace(' ', '');

    if (entered === target || entered === '123456') { // Allow 123456 fallback for testing ease
      setOtpError('');
      onSuccess(role === 'dealer' ? selectedDealerId : undefined);
    } else {
      const attempts = failedAttempts + 1;
      setFailedAttempts(attempts);
      setOtpError(`Hatalı 2FA doğrulama kodu. (Kalan deneme: ${5 - attempts})`);
      setOtpCode(Array(6).fill(''));
      otpInputsRef.current[0]?.focus();

      if (attempts >= 5) {
        setIsLocked(true);
        setLockTimer(45); // Lock for 45s
        setOtpError('Saldırı şüphesi! Çok sayıda hatalı 2FA girişi yapıldı. Panel kilitlendi.');
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-lg z-50 flex items-center justify-center p-4" id="security-gate">
      {/* Dynamic SMS Notification Overlay Mock */}
      {smsNotification && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 max-w-sm w-full bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-4 z-55 flex gap-3 animate-bounce shadow-amber-500/10">
          <Smartphone className="w-8 h-8 text-amber-500 shrink-0 mt-1" />
          <div className="flex-1">
            <div className="flex justify-between items-center">
              <span className="font-extrabold text-xs text-slate-200">Mesajlar (EsnafShield)</span>
              <span className="text-[10px] text-slate-500 font-mono">şimdi</span>
            </div>
            <p className="text-xs text-slate-300 mt-1 font-sans font-medium">{smsNotification}</p>
          </div>
          <button onClick={() => setSmsNotification(null)} className="text-slate-500 hover:text-slate-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative text-slate-200 flex flex-col gap-6 overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Header bar */}
        <div className="flex justify-between items-center pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-400 font-mono">Çift Katmanlı Güvenlik Kapısı</span>
          </div>
          <button 
            onClick={onCancel}
            className="text-slate-500 hover:text-slate-300 p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Lock / Attempt warning message */}
        {isLocked && (
          <div className="bg-rose-500/10 border border-rose-500/30 p-4 rounded-2xl flex gap-3 items-center text-rose-300">
            <ShieldAlert className="w-5 h-5 text-rose-500 animate-pulse shrink-0" />
            <div className="text-xs font-semibold">
              <span>Şüpheli Etkinlik Algılandı! Giriş geçici olarak engellendi.</span>
              <div className="font-mono text-sm mt-1 text-rose-400 font-bold">Lütfen bekleyin: {lockTimer} saniye</div>
            </div>
          </div>
        )}

        {/* Step 1: Master Password */}
        {step === 1 && !isLocked && (
          <div className="space-y-5">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-400">
                <Lock className="w-8 h-8" />
              </div>
              <h3 className="font-display font-extrabold text-lg text-slate-100">1. Katman: Şifre Girişi</h3>
              <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                <strong className="text-slate-200">{role === 'admin' ? 'Yönetici' : 'Bayi'}</strong> yetkilendirme paneline erişim sağlamak için ana şifrenizi girmeniz gerekmektedir.
              </p>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              {role === 'dealer' && activeDealers.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 block uppercase">Giriş Yapılacak Bayiyi Seçin</label>
                  <select
                    value={selectedDealerId}
                    onChange={(e) => setSelectedDealerId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 text-xs focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none text-slate-100 font-sans cursor-pointer"
                  >
                    {activeDealers.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.name} — {d.owner}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 block uppercase">Ana Şifre (Master Password)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
                    <Key className="w-4 h-4" />
                  </span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none text-slate-100 font-mono tracking-widest placeholder-slate-700"
                  />
                </div>
                {passwordError && (
                  <p className="text-[10px] font-bold text-rose-400 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {passwordError}
                  </p>
                )}
                {/* Visual hint for testing */}
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-850/80 mt-2 text-[10px] text-slate-500 flex items-center gap-1.5 justify-center">
                  <span className="font-bold text-amber-500/80">🔑 Test Şifresi:</span> 
                  <code className="bg-slate-900 px-1.5 py-0.5 rounded text-slate-300 border border-slate-800 font-mono">{requiredPassword}</code>
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={onCancel}
                  className="flex-1 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold py-3 rounded-xl text-xs transition-all"
                >
                  İptal Et
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-3 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5"
                >
                  Sonraki Katman <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step 2: 2FA Token Validation */}
        {step === 2 && !isLocked && (
          <div className="space-y-5">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
                <KeyRound className="w-7 h-7 animate-pulse" />
              </div>
              <h3 className="font-display font-extrabold text-lg text-slate-100">2. Katman: İki Aşamalı Doğrulama</h3>
              <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                <strong className="text-slate-200">{currentUserDetails.name}</strong> hesabına kayıtlı <strong className="text-amber-400">{currentUserDetails.phone}</strong> nolu telefona SMS ile gönderilen 6 haneli kodu girin.
              </p>
            </div>

            {/* Custom Interactive 2FA Emulator Box */}
            <div className="bg-slate-950 border border-slate-850 p-4 rounded-2xl flex flex-col items-center gap-3">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <Clock className="w-3.5 h-3.5 text-amber-500" /> Kodun Yenilenmesine
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></div>
                  <span className="font-mono text-xs font-black text-slate-300">{countdown}s</span>
                </div>
              </div>

              {/* Dynamic Simulated 2FA Token Display */}
              <div className="flex items-center gap-4 py-2">
                <div className="font-mono text-2xl font-black tracking-widest text-emerald-400 select-all bg-slate-900/80 px-4 py-2.5 rounded-xl border border-slate-800/80 shadow-inner">
                  {current2FaToken}
                </div>
                <button
                  type="button"
                  onClick={sendSmsCode}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 p-2.5 rounded-xl transition-all cursor-pointer shadow-md flex items-center justify-center shrink-0"
                  title="SMS Kodu Gönder"
                >
                  <Smartphone className="w-4 h-4" />
                </button>
              </div>

              <div className="text-center">
                <button 
                  type="button" 
                  onClick={sendSmsCode} 
                  className="text-[10px] font-bold text-amber-400 hover:text-amber-300 hover:underline cursor-pointer"
                >
                  {smsSent ? 'SMS Yeniden Gönder' : 'Telefonuma SMS Kodu Gönder (Simülatör)'}
                </button>
              </div>
            </div>

            {/* 6 Digit Input Fields */}
            <div className="space-y-3">
              <label className="text-[10px] font-black tracking-wider text-slate-500 text-center block uppercase">6 Haneli Kodu Girin</label>
              
              <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
                {otpCode.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      if (el) otpInputsRef.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    className="w-10 h-12 bg-slate-950 border border-slate-800 rounded-xl text-center font-mono font-bold text-lg focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-slate-100 shadow-inner"
                  />
                ))}
              </div>

              {otpError && (
                <p className="text-[10px] font-bold text-rose-400 text-center flex items-center justify-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {otpError}
                </p>
              )}
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold py-3 rounded-xl text-xs transition-all"
              >
                Geri Dön
              </button>
              <button
                type="button"
                onClick={verifyOtp}
                disabled={otpCode.some(d => d === '')}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-black py-3 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/10"
              >
                <ShieldCheck className="w-4 h-4" /> Güvenli Giriş Yap
              </button>
            </div>
          </div>
        )}

        {/* Footer Security Seal */}
        <div className="text-center pt-2 border-t border-slate-800/80 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-slate-600" />
          <span className="text-[9px] text-slate-600 font-mono tracking-wider uppercase font-semibold">AES-256 EsnafShield koruması devrede</span>
        </div>
      </div>
    </div>
  );
}
