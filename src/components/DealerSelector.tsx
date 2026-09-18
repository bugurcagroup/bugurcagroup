/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Search, MapPin, X, HelpCircle, Check, Compass, Building, CheckCircle } from 'lucide-react';
import { Dealer, City } from '../types';
import { CITIES } from '../mockData';

const SECTORS = ['Kırtasiye', 'Hediyelik Eşya', 'İç Giyim', 'Elektronik', 'Giyim', 'Ayakkabı', 'Takılar'];

interface DealerSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  dealers: Dealer[];
  selectedDealerId: string | null;
  onSelectDealer: (dealer: Dealer | null) => void;
  initialSector?: string;
  hasCartItems?: boolean;
  onClearCart?: () => void;
}

export default function DealerSelector({
  isOpen,
  onClose,
  dealers,
  selectedDealerId,
  onSelectDealer,
  initialSector = 'All',
  hasCartItems = false,
  onClearCart,
}: DealerSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState<string>('All');
  const [selectedSector, setSelectedSector] = useState<string>(initialSector);

  // Sync selected sector when modal opens or initialSector changes
  React.useEffect(() => {
    if (isOpen) {
      setSelectedSector(initialSector);
    }
  }, [isOpen, initialSector]);

  // Filter only active dealers for customers
  const activeDealers = useMemo(() => {
    return dealers.filter(d => d.status === 'active');
  }, [dealers]);

  // Cities that actually have active dealers
  const citiesWithDealers = useMemo(() => {
    const set = new Set(activeDealers.map(d => d.city));
    return CITIES.filter(c => set.has(c.name));
  }, [activeDealers]);

  // Filtered list based on search, selected city, and selected sector
  const filteredDealers = useMemo(() => {
    return activeDealers.filter(dealer => {
      const normalizedSearch = searchTerm.toLowerCase();
      const matchesSearch =
        (dealer.name ?? '').toLowerCase().includes(normalizedSearch) ||
        (dealer.owner ?? '').toLowerCase().includes(normalizedSearch) ||
        (dealer.district ?? '').toLowerCase().includes(normalizedSearch) ||
        (dealer.city ?? '').toLowerCase().includes(normalizedSearch);

      const matchesCity = selectedCity === 'All' || dealer.city === selectedCity;
      const matchesSector = selectedSector === 'All' || dealer.sector === selectedSector;

      return matchesSearch && matchesCity && matchesSector;
    });
  }, [activeDealers, searchTerm, selectedCity, selectedSector]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in"
      id="dealer-selector-overlay"
    >
      <div
        className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden"
        id="dealer-selector-modal"
      >
        {/* Header */}
        <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500 text-white p-2 rounded-lg">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg text-slate-900">
                Alışveriş Yapacağınız Bayiyi Seçin
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Siparişleriniz merkezden faturalandırılır, ödemeniz havuzda toplanır ve seçtiğiniz bayiye doğrudan esnaf desteği sağlanır.
              </p>
            </div>
          </div>
          <button
            id="close-dealer-selector-btn"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/50 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {hasCartItems && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-rose-900 text-xs shadow-3xs animate-fade-in">
              <div className="flex gap-3">
                <span className="text-lg">⚠️</span>
                <div>
                  <span className="font-bold block mb-0.5">Alışveriş Ortasında Bayi Değiştirilemez!</span>
                  <span>Mevcut sepetinizdeki ürünler seçili bayiniz ile ilişkilendirilmiştir. Yeni bir bayi seçmek için lütfen önce sepetinizi boşaltın veya siparişinizi tamamlayın.</span>
                </div>
              </div>
              {onClearCart && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Sepetinizi boşaltmak ve bayi seçimi kilidini açmak istediğinize emin misiniz?')) {
                      onClearCart();
                    }
                  }}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-3 py-1.5 rounded-lg text-[10px] transition-all shrink-0 cursor-pointer shadow-xs uppercase tracking-wider"
                >
                  Sepeti Boşalt & Kilidi Aç
                </button>
              )}
            </div>
          )}

          {/* Information banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 text-amber-900 text-xs">
            <HelpCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block mb-0.5">Kritik İş Kuralı:</span>
              Müşterilerin sepet oluşturabilmesi veya satın alma yapabilmesi için bir bayi seçmesi zorunludur. Seçtiğiniz bayi tarayıcınızda saklanacak ve alışverişinizin tamamlanmasıyla birlikte bayiye otomatik kazanç yansıtılacaktır.
            </div>
          </div>

          {/* Map / Regions Quick Selector */}
          <div>
            <span className="text-xs font-bold text-slate-500 tracking-wider uppercase block mb-3">
              📍 İNTERAKTİF BAYİ BUL - BÖLGESEL HIZLI SEÇİM
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2" id="map-region-selectors">
              <button
                id="city-filter-all"
                onClick={() => setSelectedCity('All')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold text-center border transition-all cursor-pointer ${
                  selectedCity === 'All'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                }`}
              >
                🗺️ Tüm Türkiye ({activeDealers.length})
              </button>
              {CITIES.map(city => {
                const count = activeDealers.filter(d => d.city === city.name).length;
                const isSelected = selectedCity === city.name;
                return (
                  <button
                    id={`city-filter-${city.name}`}
                    key={city.name}
                    onClick={() => setSelectedCity(city.name)}
                    disabled={count === 0}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold text-center border transition-all flex flex-col items-center justify-center relative ${
                      count === 0
                        ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed opacity-50'
                        : isSelected
                        ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm font-bold'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 cursor-pointer'
                    }`}
                  >
                    <span>{city.name}</span>
                    <span className={`text-[10px] mt-0.5 ${isSelected ? 'text-slate-950/80' : 'text-slate-400'}`}>
                      {count} Bayi
                    </span>
                    {isSelected && (
                      <span className="absolute -top-1 -right-1 bg-slate-950 text-white rounded-full p-0.5">
                        <Check className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sector Quick Selector */}
          <div>
            <span className="text-xs font-bold text-slate-500 tracking-wider uppercase block mb-3">
              🏷️ SEKTÖRE GÖRE ESNAF FİLTRESİ
            </span>
            <div className="flex flex-wrap gap-2" id="sector-filter-selectors">
              <button
                id="sector-filter-all"
                type="button"
                onClick={() => setSelectedSector('All')}
                className={`py-1.5 px-3 rounded-lg text-xs font-semibold text-center border transition-all cursor-pointer ${
                  selectedSector === 'All'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                }`}
              >
                🗺️ Tüm Sektörler ({activeDealers.length})
              </button>
              {SECTORS.map(sec => {
                const count = activeDealers.filter(d => d.sector === sec).length;
                const isSelected = selectedSector === sec;
                return (
                  <button
                    id={`sector-filter-${sec}`}
                    key={sec}
                    type="button"
                    onClick={() => setSelectedSector(sec)}
                    className={`py-1.5 px-3 rounded-lg text-xs font-semibold text-center border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs font-bold'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span>{sec}</span>
                    <span className={`text-[10px] ml-1.5 px-1.5 py-0.2 rounded-md ${isSelected ? 'bg-blue-700 text-blue-100' : 'bg-slate-100 text-slate-400'}`}>
                      {count} Esnaf
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="dealer-search-input"
                type="text"
                placeholder="Bayi adı, yetkili adı veya ilçe ara..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/10 transition-all"
              />
            </div>
            {selectedCity !== 'All' && (
              <button
                id="clear-city-filter-btn"
                onClick={() => {
                  setSelectedCity('All');
                  setSelectedSector('All');
                }}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                Filtreleri Temizle
              </button>
            )}
          </div>

          {/* Dealers Grid */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold text-slate-500 tracking-wider uppercase">
                Bayi Listesi ({filteredDealers.length} sonuç listeleniyor)
              </span>
            </div>

            {filteredDealers.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-2xl">
                <Building className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <h4 className="text-sm font-semibold text-slate-700">Bayi Bulunamadı</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Seçtiğiniz filtreler veya arama terimi ile eşleşen aktif bayimiz bulunmamaktadır.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" id="dealers-grid">
                {filteredDealers.map(dealer => {
                  const isSelected = selectedDealerId === dealer.id;
                  return (
                    <div
                      id={`dealer-card-${dealer.id}`}
                      key={dealer.id}
                      className={`border rounded-2xl p-5 transition-all flex flex-col justify-between relative ${
                        isSelected
                          ? 'border-amber-500 bg-amber-500/5 ring-2 ring-amber-500/20'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
                      }`}
                    >
                      {isSelected && (
                        <span className="absolute top-4 right-4 bg-amber-500 text-slate-950 font-bold text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Aktif Seçili
                        </span>
                      )}
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                          <span className="flex items-center gap-1 bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wide">
                            <MapPin className="w-3 h-3 text-amber-500" />
                            {dealer.city} / {dealer.district}
                          </span>
                          {dealer.sector && (
                            <span className="bg-blue-100 text-blue-700 text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wide border border-blue-200">
                              🏷️ {dealer.sector}
                            </span>
                          )}
                        </div>
                        <h4 className="font-display font-bold text-sm text-slate-900 mb-1">
                          {dealer.name}
                        </h4>
                        <div className="space-y-1 text-xs text-slate-500 mb-4">
                          <p>
                            <span className="font-semibold text-slate-600">Yetkili:</span> {dealer.owner}
                          </p>
                          <p className="line-clamp-2">
                            <span className="font-semibold text-slate-600">Adres:</span> {dealer.address}
                          </p>
                          <p>
                            <span className="font-semibold text-slate-600">Telefon:</span> {dealer.phone}
                          </p>
                        </div>
                      </div>

                      <button
                        id={`select-dealer-btn-${dealer.id}`}
                        disabled={hasCartItems && !isSelected}
                        onClick={() => {
                          onSelectDealer(dealer);
                          onClose();
                        }}
                        className={`w-full py-2 rounded-xl text-xs font-semibold transition-all ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950 font-bold hover:bg-amber-600 cursor-pointer'
                            : hasCartItems
                            ? 'bg-slate-150 text-slate-400 cursor-not-allowed border border-slate-200'
                            : 'bg-slate-900 text-white hover:bg-slate-800 shadow-xs cursor-pointer'
                        }`}
                      >
                        {isSelected 
                          ? 'Mevcut Alışveriş Bayiniz' 
                          : hasCartItems 
                          ? 'Bayi Değiştirmek İçin Sepeti Boşaltın' 
                          : 'Bu Bayiyi Seçerek Alışveriş Yap'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span>Tüm bayiler %100 yerli kırtasiye esnaflarından oluşmaktadır.</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Sürüm: MVP v1.0</span>
          </div>
        </div>
      </div>
    </div>
  );
}
