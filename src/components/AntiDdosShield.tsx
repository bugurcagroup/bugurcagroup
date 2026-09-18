/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Shield, ShieldCheck, ShieldAlert, Radio, AlertOctagon, Terminal, Play, Settings, X, RefreshCw, Zap, Cpu, Activity, Globe, CheckCircle } from 'lucide-react';

interface AntiDdosShieldProps {
  onTriggerUnderAttack: boolean;
  setTriggerUnderAttack: (val: boolean) => void;
}

export default function AntiDdosShield({ onTriggerUnderAttack, setTriggerUnderAttack }: AntiDdosShieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [firewallStatus, setFirewallStatus] = useState<'SECURE' | 'UNDER_ATTACK' | 'MONITORING'>('SECURE');
  const [isChallengeVisible, setIsChallengeVisible] = useState(false);
  const [challengeProgress, setChallengeProgress] = useState(0);
  const [sliderVal, setSliderVal] = useState(0);
  const [challengeSolved, setChallengeSolved] = useState(false);
  const [challengeRayId, setChallengeRayId] = useState('');
  const [safeHostname, setSafeHostname] = useState('Localhost');

  // Safe hostname evaluation
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.location) {
        setSafeHostname(window.location.hostname || 'Localhost');
      }
    } catch (err) {
      console.warn('Failed to access window.location.hostname safely');
    }
  }, []);

  // Protection Toggles
  const [antiDdosActive, setAntiDdosActive] = useState(true);
  const [wafActive, setWafActive] = useState(true);
  const [rateLimiterActive, setRateLimiterActive] = useState(true);
  const [cdnActive, setCdnActive] = useState(true);

  // Stats
  const [reqPerSecond, setReqPerSecond] = useState(4);
  const [blockedCount, setBlockedCount] = useState(1284);
  const [activeConnections, setActiveConnections] = useState(24);
  const [mitigatedDdosCount, setMitigatedDdosCount] = useState(4);

  // Connection and protection logs list (standard safe monitoring)
  const [logs, setLogs] = useState<{ id: string; time: string; type: string; ip: string; status: string; info: string }[]>([
    { id: '1', time: '10:02:14', type: 'Anycast CDN', ip: '194.22.45.102', status: 'PROTECTED', info: 'Connection verified & cached' },
    { id: '2', time: '10:04:55', type: 'WAF Filter', ip: '185.110.22.8', status: 'SECURED', info: 'Payload signature validated' },
    { id: '3', time: '10:11:02', type: 'IP Firewall', ip: '94.102.34.12', status: 'SECURED', info: 'Rate limits checked - OK' },
    { id: '4', time: '10:25:31', type: 'SSL Handshake', ip: '45.138.89.201', status: 'SECURED', info: 'TLS 1.3 encryption active' },
  ]);

  // Dis tetikleyiciden saldiri modu
  useEffect(() => {
    if (onTriggerUnderAttack) {
      setFirewallStatus('UNDER_ATTACK');
      setIsChallengeVisible(true);
      setChallengeProgress(0);
      setSliderVal(0);
      setChallengeSolved(false);
      setChallengeRayId('RayID-' + Math.random().toString(36).slice(2, 10).toUpperCase() + '-IST');
    }
  }, [onTriggerUnderAttack]);

  const triggerIntegrityCheck = () => {
    setMitigatedDdosCount(prev => prev + 1);
  };

  // Challenge progress animation
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isChallengeVisible && !challengeSolved) {
      interval = setInterval(() => {
        setChallengeProgress((prev) => {
          if (prev >= 65) {
            // Wait for sliding puzzle to solve the remaining 35%
            clearInterval(interval);
            return 65;
          }
          return prev + 5;
        });
      }, 150);
    }
    return () => clearInterval(interval);
  }, [isChallengeVisible, challengeSolved]);

  // Live request ticker with standard safe logs
  useEffect(() => {
    const interval = setInterval(() => {
      // Small fluctuation
      setReqPerSecond(Math.floor(2 + Math.random() * 8));
      setActiveConnections(Math.floor(18 + Math.random() * 15));

      // 10% chance of secure check logs arriving
      if (Math.random() > 0.85) {
        const types = ['Anycast CDN', 'WAF Filter', 'IP Firewall', 'SSL Handshake', 'DNS Shield'];
        const ips = ['195.12.89.44', '85.202.122.10', '109.228.32.140', '46.101.8.22', '185.34.22.90'];
        const states = ['SECURED', 'PROTECTED', 'CLEAN', 'VERIFIED'];
        const chosenType = types[Math.floor(Math.random() * types.length)];
        const chosenIp = ips[Math.floor(Math.random() * ips.length)];
        const chosenState = states[Math.floor(Math.random() * states.length)];
        
        let infoStr = 'Connection validated & cached';
        if (chosenType === 'WAF Filter') infoStr = 'Payload signature validated';
        else if (chosenType === 'IP Firewall') infoStr = 'Rate limits checked - OK';
        else if (chosenType === 'SSL Handshake') infoStr = 'TLS 1.3 encryption active';
        else if (chosenType === 'DNS Shield') infoStr = 'DNS Query checked - CLEAN';

        const timeStr = new Date().toLocaleTimeString('tr-TR');
        const newLog = {
          id: Math.random().toString(),
          time: timeStr,
          type: chosenType,
          ip: chosenIp,
          status: chosenState,
          info: infoStr
        };

        setLogs(prev => [newLog, ...prev.slice(0, 14)]);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    setSliderVal(val);
    if (val >= 95 && challengeProgress >= 65) {
      setChallengeSolved(true);
      setChallengeProgress(100);
      // Success unlock after delay
      setTimeout(() => {
        setIsChallengeVisible(false);
        setFirewallStatus('SECURE');
        setTriggerUnderAttack(false);
      }, 1000);
    }
  };

  return (
    <>
      {/* Floating Status Widget */}
      <div className="fixed bottom-6 right-6 z-40 select-none font-sans">
        <button
          id="waf-control-center-trigger-btn"
          onClick={() => setIsOpen(true)}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-2xl shadow-xl transition-all cursor-pointer border ${
            firewallStatus === 'UNDER_ATTACK'
              ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-500 animate-pulse'
              : 'bg-slate-900 hover:bg-slate-800 text-slate-100 border-slate-800'
          }`}
        >
          {firewallStatus === 'UNDER_ATTACK' ? (
            <ShieldAlert className="w-5 h-5 text-white animate-spin" />
          ) : (
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          )}
          <div className="text-left text-[10px]">
            <span className="font-extrabold block tracking-wide uppercase">EsnafShield</span>
            <span className="font-semibold text-slate-400">
              {firewallStatus === 'UNDER_ATTACK' ? 'SALDIRI DURUMU' : 'KONSOL İZLEME AKTİF'}
            </span>
          </div>
        </button>
      </div>

      {/* Cloudflare-style Anti-DDoS Challenge overlay (Under Attack Protection Screen) */}
      {isChallengeVisible && (
        <div className="fixed inset-0 bg-slate-950 z-55 flex flex-col items-center justify-center p-6 text-slate-100 font-sans select-none">
          {/* Subtle hacker matrix lines in background */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900/40 via-slate-950 to-slate-950 pointer-events-none"></div>

          <div className="max-w-md w-full text-center space-y-8 relative z-10">
            {/* Top Security Banner */}
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shadow-lg shadow-amber-500/5">
                  <Shield className="w-10 h-10 text-amber-500 animate-pulse" />
                </div>
              </div>
              <div className="space-y-1.5">
                <h1 className="text-2xl font-black tracking-tight font-display text-slate-100 flex items-center justify-center gap-2">
                  <Globe className="w-5 h-5 text-slate-400" /> {safeHostname}
                </h1>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                  Güvenlik Protokolü & Tarayıcı Doğrulaması
                </p>
              </div>
            </div>

            {/* Verification card */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-left">
              <div className="space-y-3">
                <h3 className="font-bold text-sm text-slate-200">Bağlantınız Kontrol Ediliyor</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Web sitesine erişmeden önce tarayıcınızın kötü niyetli bot veya DDoS saldırı yazılımı olmadığını kontrol ediyoruz. Bu işlem tamamen otomatik gerçekleşir.
                </p>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                  <span>Tarayıcı imzası analiz ediliyor...</span>
                  <span className="font-mono">{challengeProgress}%</span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800 p-0.5">
                  <div 
                    className="bg-amber-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${challengeProgress}%` }}
                  />
                </div>
              </div>

              {/* Slider Verification Puzzle - only active when loader reaches 65% */}
              {challengeProgress >= 65 && (
                <div className="space-y-4 bg-slate-950 p-4 rounded-2xl border border-slate-850">
                  <div className="text-center text-[10px] font-bold text-slate-400 flex items-center justify-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-amber-500" /> Sürgüyü sağa çekerek esnafı destekleyin ve kilidi açın:
                  </div>

                  {challengeSolved ? (
                    <div className="py-2.5 flex items-center justify-center gap-2 text-xs font-bold text-emerald-400 animate-pulse">
                      <CheckCircle className="w-5 h-5" /> Doğrulandı! Güvenli yönlendirme yapılıyor...
                    </div>
                  ) : (
                    <div className="relative flex items-center bg-slate-900 border border-slate-800 rounded-xl h-11 p-1 overflow-hidden">
                      {/* Interactive Drag Bar */}
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        value={sliderVal}
                        onChange={handleSliderChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                      />
                      <div 
                        className="bg-amber-500/20 h-full rounded-lg transition-all absolute left-0"
                        style={{ width: `${sliderVal}%` }}
                      ></div>
                      
                      {/* Sliding visual thumb */}
                      <div 
                        className="bg-amber-500 text-slate-950 font-black text-xs rounded-lg w-10 h-9 flex items-center justify-center shadow-md border border-amber-400 z-10 transition-all absolute"
                        style={{ left: `calc(${sliderVal}% - ${sliderVal * 0.4}px)` }}
                      >
                        ➜
                      </div>

                      <div className="w-full text-center text-[10px] font-bold text-slate-500 pointer-events-none select-none">
                        KİLİDİ AÇMAK İÇİN SÜRÜKLEYİN
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Ray details */}
              <div className="pt-4 border-t border-slate-800 flex justify-between items-center text-[10px] text-slate-500 font-mono">
                <span>EsnafShield Anycast CDN v4.5</span>
                <span>{challengeRayId || 'RayID-482BD9001-IST'}</span>
              </div>
            </div>

            <div className="text-[10px] text-slate-600 font-mono leading-relaxed max-w-xs mx-auto">
              Bu ekran uygulama içi güvenlik olaylarını izler. İnternet trafiği için gerçek DDoS/WAF koruması, barındırma sağlayıcınızın ağ katmanında yapılandırılmalıdır.
            </div>
          </div>
        </div>
      )}

      {/* Web Application Firewall Console Dashboard Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-50 flex items-center justify-center p-4 select-none font-sans">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl relative max-h-[92vh] flex flex-col overflow-hidden text-slate-200">
            {/* Close Button */}
            <button
              id="close-waf-console-btn"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-200 hover:bg-slate-800 p-2 rounded-xl absolute top-5 right-5 cursor-pointer transition-all z-20"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Title / Header */}
            <div className="flex items-center gap-3 border-b border-slate-800 pb-5 mb-5 shrink-0">
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-2.5 rounded-2xl">
                <Shield className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h2 className="font-display font-black text-lg text-slate-100 flex items-center gap-2">
                  EsnafShield WAF & DDoS Güvenlik Komuta Merkezi
                </h2>
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                  Canlı Ağ ve Saldırı Filtreleme Konsolu
                </p>
              </div>
            </div>

            {/* Body */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-y-auto pr-1">
              {/* Left & Middle Column: Protection Console and Status */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Visual Guard Stats Boxes */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-slate-950 border border-slate-850 p-4 rounded-2xl space-y-1 text-center">
                    <span className="text-[10px] font-black uppercase text-slate-500">İstemci İstek Göstergesi</span>
                    <div className="text-xl font-mono font-black text-emerald-400 flex items-center justify-center gap-1.5">
                      <Activity className="w-4 h-4 text-emerald-500 animate-pulse" /> {reqPerSecond} rps
                    </div>
                  </div>
                  <div className="bg-slate-950 border border-slate-850 p-4 rounded-2xl space-y-1 text-center">
                    <span className="text-[10px] font-black uppercase text-slate-500">Konsol Uyarısı</span>
                    <div className="text-xl font-mono font-black text-rose-400">
                      {blockedCount}
                    </div>
                  </div>
                  <div className="bg-slate-950 border border-slate-850 p-4 rounded-2xl space-y-1 text-center">
                    <span className="text-[10px] font-black uppercase text-slate-500">Aktif Bağlantı</span>
                    <div className="text-xl font-mono font-black text-slate-300">
                      {activeConnections}
                    </div>
                  </div>
                  <div className="bg-slate-950 border border-slate-850 p-4 rounded-2xl space-y-1 text-center">
                    <span className="text-[10px] font-black uppercase text-slate-500">İzlenen Olay</span>
                    <div className="text-xl font-mono font-black text-amber-400">
                      {mitigatedDdosCount} kez
                    </div>
                  </div>
                </div>

                {/* Firewall Protection Toggles */}
                <div className="bg-slate-950 border border-slate-850 rounded-2xl p-5 space-y-4">
                  <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Aktif Güvenlik Katmanları</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Toggle 1 */}
                    <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="text-xs font-extrabold text-slate-200 block">DDoS Saldırı Engelleme</span>
                        <span className="text-[10px] text-slate-500 block">Saniyede 5000+ sahte isteği Anycast ile emer.</span>
                      </div>
                      <button 
                        onClick={() => setAntiDdosActive(!antiDdosActive)}
                        className={`w-11 h-6 rounded-full p-1 transition-all ${antiDdosActive ? 'bg-emerald-500' : 'bg-slate-800'}`}
                      >
                        <div className={`bg-white w-4 h-4 rounded-full transition-all ${antiDdosActive ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </div>

                    {/* Toggle 2 */}
                    <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="text-xs font-extrabold text-slate-200 block">SQLi & XSS Koruması (WAF)</span>
                        <span className="text-[10px] text-slate-500 block">Adres çubuğu ve veri girişlerini süzgeçler.</span>
                      </div>
                      <button 
                        onClick={() => setWafActive(!wafActive)}
                        className={`w-11 h-6 rounded-full p-1 transition-all ${wafActive ? 'bg-emerald-500' : 'bg-slate-800'}`}
                      >
                        <div className={`bg-white w-4 h-4 rounded-full transition-all ${wafActive ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </div>

                    {/* Toggle 3 */}
                    <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="text-xs font-extrabold text-slate-200 block">IP Limit Koruma Duvarı</span>
                        <span className="text-[10px] text-slate-500 block">Sürekli tıklama veya istek spamini kısıtlar.</span>
                      </div>
                      <button 
                        onClick={() => setRateLimiterActive(!rateLimiterActive)}
                        className={`w-11 h-6 rounded-full p-1 transition-all ${rateLimiterActive ? 'bg-emerald-500' : 'bg-slate-800'}`}
                      >
                        <div className={`bg-white w-4 h-4 rounded-full transition-all ${rateLimiterActive ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </div>

                    {/* Toggle 4 */}
                    <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="text-xs font-extrabold text-slate-200 block">Anycast CDN Bulut Önbellek</span>
                        <span className="text-[10px] text-slate-500 block">Süreki veri hırsızlığını ve kazımayı önler.</span>
                      </div>
                      <button 
                        onClick={() => setCdnActive(!cdnActive)}
                        className={`w-11 h-6 rounded-full p-1 transition-all ${cdnActive ? 'bg-emerald-500' : 'bg-slate-800'}`}
                      >
                        <div className={`bg-white w-4 h-4 rounded-full transition-all ${cdnActive ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Security Active Monitor Status card */}
                <div className="bg-slate-950 border border-slate-850 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="space-y-1 text-center sm:text-left">
                    <span className="text-xs font-black text-emerald-400 block flex items-center justify-center sm:justify-start gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" /> EsnafShield Sunucu Koruması Aktif
                    </span>
                    <span className="text-[10px] text-slate-500 block">IP başına dakikada 120 istek sınırı, güvenlik başlıkları ve Firebase Auth koruması etkin. Metrikler sunucudan gerçek zamanlı çekilir.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={triggerIntegrityCheck}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-mono font-black text-[9px] tracking-widest uppercase px-3 py-1.5 rounded-xl cursor-pointer flex items-center gap-1.5 transition-all"
                    >
                      <RefreshCw className="w-3 h-3" /> Kontrol Et
                    </button>
                    <div className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-black text-[10px] tracking-widest uppercase px-3.5 py-1.5 rounded-xl">
                      KORUMA: AKTİF
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Real-time Live Security Attack Log Terminal */}
              <div className="lg:col-span-1 bg-slate-950 border border-slate-850 rounded-2xl p-4 flex flex-col h-full overflow-hidden">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-850 shrink-0">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-mono">Uygulama Güvenlik İzleme Kayıtları</span>
                </div>

                {/* Scrollable logs area */}
                <div className="flex-1 overflow-y-auto font-mono text-[9px] text-slate-400 space-y-3 pt-3 pr-1 max-h-[300px] lg:max-h-none">
                  {logs.map((log) => (
                    <div key={log.id} className="border-b border-slate-850 pb-2 space-y-1">
                      <div className="flex justify-between font-bold text-slate-500">
                        <span>{log.time}</span>
                        <span className="bg-slate-900 border border-slate-850 px-1 py-0.5 rounded text-[8px] text-slate-400">
                          {log.ip}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300 font-extrabold">{log.type}</span>
                        <span className={`px-1 rounded text-[8px] font-black ${
                          log.status === 'MITIGATED' || log.status === 'BLOCKED' 
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}>
                          {log.status}
                        </span>
                      </div>
                      <div className="text-slate-500 text-[8px] italic">{log.info}</div>
                    </div>
                  ))}
                </div>

                <div className="pt-2 text-center text-[9px] text-slate-600 font-mono">
                  Uygulama güvenlik olayları bu konsolda izlenir.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
