/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Camera, Upload, CheckCircle, AlertCircle, RefreshCw, Trash2, Smartphone, Image as ImageIcon } from 'lucide-react';

export default function MobilePhotoUpload() {
  const [code, setCode] = useState<string>('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Extract session code from URL query parameter
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlCode = params.get('code') || params.get('session');
      if (urlCode) {
        setCode(urlCode);
        // Fetch any photos already uploaded for this code
        fetchPhotos(urlCode);
      }
    } catch (e) {
      console.warn('Failed to parse URL query parameters');
    }
  }, []);

  const fetchPhotos = async (_sessionCode: string) => {
    setPhotos([]);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (!code) {
      setStatusMsg({ type: 'error', text: 'Lütfen geçerli bir bağlantı kullanın. QR kodunu tekrar taratın.' });
      return;
    }

    setStatusMsg({ type: 'error', text: 'Mobil fotoğraf aktarımı şu anda kullanılamıyor. Firebase Storage tabanlı aktarım yapılandırılmalıdır.' });
  };

  const handleClearAll = async () => {
    if (!code) return;
    if (confirm('Yüklediğiniz tüm fotoğrafları silmek istediğinize emin misiniz?')) {
      setPhotos([]);
      setStatusMsg({ type: 'success', text: 'Bu cihazdaki fotoğraf listesi temizlendi.' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-4 sm:p-6" id="mobile-photo-upload-container">
      {/* Premium Header */}
      <div className="w-full max-w-md text-center py-6 space-y-2">
        <div className="inline-flex bg-blue-100 text-blue-700 p-3 rounded-2xl shadow-3xs animate-scale">
          <Smartphone className="w-8 h-8" />
        </div>
        <h1 className="font-display font-extrabold text-xl text-slate-900 tracking-tight">
          Esnaf Mobil Fotoğraf Yükleyici
        </h1>
        <p className="text-xs text-slate-500 max-w-xs mx-auto">
          Telefonunuzla çektiğiniz fotoğrafları bilgisayardaki ürün tanımlama formuna anında gönderin.
        </p>
      </div>

      {/* Main Panel */}
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 space-y-6 shadow-sm">
        {code ? (
          <div className="space-y-5">
            {/* Session info */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex justify-between items-center text-xs">
              <span className="text-slate-500 font-semibold">Bağlantı Kodu:</span>
              <span className="font-mono font-extrabold bg-blue-50 text-blue-700 px-3 py-1 rounded-xl border border-blue-100 text-sm tracking-widest">
                {code}
              </span>
            </div>

            {/* Status alerts */}
            {statusMsg && (
              <div className={`p-4 rounded-2xl text-xs font-semibold flex items-start gap-2 animate-scale ${
                statusMsg.type === 'success' 
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' 
                  : 'bg-rose-50 border border-rose-200 text-rose-800'
              }`}>
                {statusMsg.type === 'success' ? (
                  <CheckCircle className="w-4.5 h-4.5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4.5 h-4.5 text-rose-600 shrink-0 mt-0.5" />
                )}
                <span>{statusMsg.text}</span>
              </div>
            )}

            {/* Drag drop and touch targets */}
            <div className="space-y-3">
              {/* Camera Direct Option */}
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 hover:border-blue-500 bg-slate-50 hover:bg-slate-50/50 rounded-2xl p-6 cursor-pointer transition-all gap-2 text-center group">
                <Camera className="w-8 h-8 text-slate-400 group-hover:text-blue-500 transition-colors" />
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Kamerayı Aç / Fotoğraf Çek</span>
                  <span className="text-[10px] text-slate-400">Doğrudan kamerayla çekim yapın</span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  disabled={isUploading}
                  className="hidden"
                />
              </label>

              {/* Gallery Direct Option */}
              <label className="flex flex-col items-center justify-center border border-slate-200 hover:border-blue-500 bg-white hover:bg-slate-50/50 rounded-2xl p-4 cursor-pointer transition-all gap-2 text-center group">
                <div className="flex gap-1">
                  <ImageIcon className="w-5 h-5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                  <Upload className="w-5 h-5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-700 block">Galeriden Çoklu Görsel Seç</span>
                  <span className="text-[9px] text-slate-400">Telefon galerinizi açın</span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  disabled={isUploading}
                  className="hidden"
                />
              </label>
            </div>

            {/* Loader */}
            {isUploading && (
              <div className="flex items-center justify-center gap-2 py-4 bg-blue-50 text-blue-700 rounded-xl text-xs font-semibold">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                <span>Fotoğraflar optimize ediliyor ve bilgisayara aktarılıyor...</span>
              </div>
            )}

            {/* Uploaded Photos Section */}
            {photos.length > 0 && (
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Aktarılan Görseller ({photos.length})
                  </span>
                  <button
                    onClick={handleClearAll}
                    className="text-[10px] text-rose-500 hover:text-rose-700 font-bold flex items-center gap-1 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-100 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Hepsini Temizle
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto pr-1">
                  {photos.map((photo, idx) => (
                    <div key={idx} className="aspect-square bg-slate-50 rounded-xl border border-slate-100 overflow-hidden relative group shadow-3xs animate-scale">
                      <img
                        src={photo}
                        alt={`Yüklenen Fotoğraf ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-1 right-1 bg-emerald-500 text-white rounded-full p-0.5 text-[8px] font-bold shadow-xs">
                        ✓
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 space-y-4">
            <div className="bg-rose-50 text-rose-600 w-12 h-12 rounded-full flex items-center justify-center mx-auto border border-rose-100">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Geçersiz Bağlantı</h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1 leading-relaxed">
                Lütfen bilgisayardaki ürün tanımlama panelinde yer alan QR kodu mobil cihazınızla taratın.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 text-[10px] text-slate-400 text-center space-y-1">
        <p>Gelişmiş hibrit esnaf sipariş platformu teknolojisi.</p>
        <p className="font-mono">Güvenli Peer-to-Web Senkronizasyonu</p>
      </div>
    </div>
  );
}
