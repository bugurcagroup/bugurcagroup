/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Store, Code, MapPin, ShoppingCart, HelpCircle, Shield, Megaphone, LogIn, LogOut, UserPlus, UserRound } from 'lucide-react';
import { UserRole, Dealer } from '../types';

interface HeaderProps {
  currentRole: UserRole;
  selectedDealer: Dealer | null;
  onOpenDealerSelector: () => void;
  onLogoClick: () => void;
  cartCount: number;
  onOpenCart: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  storeName?: string;
  logoUrl?: string;
  onLockRole?: (role: 'admin' | 'dealer') => void;
  authorizedRoles?: Record<string, boolean>;
  securityGateEnabled?: boolean;
  isReferralLocked?: boolean;
  loggedInDealer?: Dealer | null;
  onLogoutDealer?: () => void;
  onLogoutAdmin?: () => void;
  onOpenDealerLogin?: () => void;
  newsList?: any[];
  onOpenDealerApplication?: () => void;
  isMemberLoggedIn?: boolean;
  onOpenMemberAccess?: (mode: 'login' | 'register') => void;
  onOpenProfile?: () => void;
}

export default function Header({
  currentRole,
  selectedDealer,
  onOpenDealerSelector,
  onLogoClick,
  cartCount,
  onOpenCart,
  activeTab,
  setActiveTab,
  storeName,
  logoUrl,
  onLockRole,
  authorizedRoles,
  securityGateEnabled = false,
  isReferralLocked = false,
  loggedInDealer = null,
  onLogoutDealer,
  onLogoutAdmin,
  onOpenDealerLogin,
  newsList = [],
  onOpenDealerApplication,
  isMemberLoggedIn = false,
  onOpenMemberAccess,
  onOpenProfile,
}: HeaderProps) {
  const [unread, setUnread] = React.useState(false);

  React.useEffect(() => {
    if (newsList && newsList.length > 0) {
      const latestId = newsList[0].id;
      try {
        const seenId = window.localStorage.getItem('seen_announcement_id');
        setUnread(seenId !== latestId && activeTab !== 'announcements');
      } catch {
        setUnread(activeTab !== 'announcements');
      }
    } else {
      setUnread(false);
    }
  }, [newsList, activeTab]);

  const handleAnnouncementsClick = () => {
    setActiveTab('announcements');
    if (newsList && newsList.length > 0) {
      try {
        window.localStorage.setItem('seen_announcement_id', newsList[0].id);
      } catch {
        // Bazı gizlilik modlarında kalıcı depolama kullanılamaz.
      }
      setUnread(false);
    }
  };
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs" id="app-header">
      <div className="bg-slate-900 text-slate-300 border-b border-slate-850">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 sm:px-6 lg:px-8">
          <p className="flex-1 text-center text-xs leading-relaxed text-slate-200 sm:text-left sm:text-sm">
            <span className="font-semibold text-amber-300">Ey iman edenler!</span> Size verdiğimiz rızıkların temiz ve helâl olanlarından yiyin! Eğer yalnız Allah’a kulluk ediyorsanız O’na şükredin! <span className="whitespace-nowrap font-bold text-amber-300">Bakara / 172. Ayet</span>
          </p>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {(isMemberLoggedIn || Boolean(loggedInDealer) || currentRole === 'admin') && (
              <button
                type="button"
                onClick={onOpenProfile}
                className="flex items-center gap-1.5 rounded-md border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold text-white transition-all hover:bg-white/20"
              >
                <UserRound className="h-3.5 w-3.5" />
                Profilim
              </button>
            )}
            {!isMemberLoggedIn && currentRole === 'customer' && (
            <>
              <button
                id="member-login-btn"
                onClick={() => onOpenMemberAccess?.('login')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-md text-xs transition-all cursor-pointer shadow-xs"
              >
                <LogIn className="w-3.5 h-3.5" />
                Üye Girişi
              </button>
              <button
                id="member-register-btn"
                onClick={() => onOpenMemberAccess?.('register')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-md text-xs transition-all cursor-pointer border border-white/20"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Kayıt Ol
              </button>
            </>
          )}

          {/* Admin Çıkış Butonu */}
          {currentRole === 'admin' && (
            <button
              onClick={onLogoutAdmin}
              className="ml-1 text-[9px] bg-amber-800 hover:bg-rose-700 text-white font-bold px-2 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1"
              title="Yönetici Çıkışı"
            >
              <LogOut className="w-2.5 h-2.5" />
              Yönetici Çıkış
            </button>
          )}

          {/* Bayi Giriş / Çıkış Kontrolleri */}
          {loggedInDealer ? (
            <div className="flex items-center gap-2 bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded-md text-[10px]">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
              <span>Giriş: <strong className="text-white">{loggedInDealer.name}</strong></span>
              <button
                onClick={onLogoutDealer}
                className="ml-1 text-[9px] bg-emerald-800 hover:bg-rose-700 text-white font-bold px-1.5 py-0.5 rounded transition-all cursor-pointer flex items-center gap-0.5"
                title="Çıkış Yap"
              >
                <LogOut className="w-2.5 h-2.5" />
                Çıkış
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenDealerLogin}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold rounded-md text-xs transition-all cursor-pointer shadow-xs"
            >
              <LogIn className="w-3.5 h-3.5" />
              Bayi Girişi Yap
            </button>
          )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Brand Logo */}
          {(!isReferralLocked || currentRole !== 'customer') ? (
            <button
              type="button"
              onClick={onLogoClick}
              title="Ana sayfaya dön"
              className="flex items-center gap-3 cursor-pointer text-left"
            >
              <img
                src={logoUrl || 'https://cdn.builder.io/api/v1/image/assets%2F690dc81201dd442691c0fbf0269adbab%2Ff68680587b154e779a76b8693182a79c?format=webp&width=800&height=1200'}
                alt="Buğurca Kırtasiye logosu"
                width={44}
                height={44}
                decoding="async"
                className="size-11 rounded-xl object-cover shadow-md shadow-amber-500/10"
              />
              <div>
                <h1 className="font-display font-bold text-lg text-slate-900 tracking-tight leading-none">
                  {storeName || 'Buğurca Kırtasiye'}
                </h1>
              </div>
            </button>
          ) : (
            <button
              type="button"
              onClick={onLogoClick}
              title="Ana sayfaya dön"
              className="flex items-center gap-2 cursor-pointer text-left"
            >
              <span className="bg-amber-500/10 border border-amber-500/25 text-amber-800 p-2 px-3.5 rounded-xl flex items-center gap-1.5 font-bold text-xs uppercase tracking-wide shadow-3xs">
                <Store className="w-4 h-4 text-amber-500" />
                <span>{selectedDealer ? selectedDealer.name : storeName} Özel Vitrini</span>
              </span>
            </button>
          )}

          {/* Context Tab Navigation (Adaptive Based on Role) */}
          <nav className="hidden md:flex space-x-1" id="main-nav">
            {currentRole === 'customer' && (
              <>
                {!isReferralLocked && (
                  <>
                    <button
                      id="tab-btn-store"
                      onClick={() => setActiveTab('store')}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                        activeTab === 'store'
                          ? 'bg-amber-50 text-amber-700'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      Ürün Kataloğu
                    </button>
                    <button
                      id="tab-btn-apply-dealer"
                      onClick={() => {
                        setActiveTab('store');
                        if (onOpenDealerApplication) {
                          onOpenDealerApplication();
                        }
                      }}
                      className="px-4 py-2 text-sm font-semibold rounded-lg transition-all flex items-center gap-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 cursor-pointer"
                    >
                      <Store className="w-4 h-4 text-emerald-500" />
                      <span>Bayimiz Olun</span>
                    </button>
                  </>
                )}
                <button
                  id="tab-btn-announcements"
                  onClick={handleAnnouncementsClick}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-1.5 cursor-pointer relative ${
                    activeTab === 'announcements'
                      ? 'bg-amber-50 text-amber-700'
                      : unread
                        ? 'bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 text-white font-bold animate-pulse shadow-md shadow-rose-200 border border-rose-400 scale-105'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Megaphone className={`w-4 h-4 ${unread && activeTab !== 'announcements' ? 'text-white' : 'text-amber-500'}`} />
                  <span>Duyurular</span>
                  {unread && activeTab !== 'announcements' && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
                    </span>
                  )}
                </button>

                <button
                  id="tab-btn-sector-dealers"
                  onClick={onOpenDealerSelector}
                  className="px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white shadow-xs hover:shadow-md hover:scale-102 hover:brightness-105 active:scale-98"
                >
                  <MapPin className="w-4 h-4 animate-pulse text-amber-100" />
                  <span>Sektördeki Esnaflar</span>
                </button>
              </>
            )}
            {currentRole === 'dealer' && (
              <>
                <button
                  id="tab-btn-dealer-dashboard"
                  onClick={() => setActiveTab('dashboard')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                    activeTab === 'dashboard'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Bayi Özet Paneli
                </button>
                <button
                  id="tab-btn-dealer-orders"
                  onClick={() => setActiveTab('orders')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                    activeTab === 'orders'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Sipariş ve Komisyonlarım
                </button>
              </>
            )}
            {currentRole === 'admin' && (
              <>
                <button
                  id="tab-btn-admin-dashboard"
                  onClick={() => setActiveTab('dashboard')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                    activeTab === 'dashboard'
                      ? 'bg-purple-50 text-purple-700'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Yönetici Konsolu
                </button>
                <button
                  id="tab-btn-admin-products"
                  onClick={() => setActiveTab('products')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                    activeTab === 'products'
                      ? 'bg-purple-50 text-purple-700'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Ürün Yönetimi
                </button>
                <button
                  id="tab-btn-admin-dealers"
                  onClick={() => setActiveTab('dealers')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                    activeTab === 'dealers'
                      ? 'bg-purple-50 text-purple-700'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Bayi Başvuruları & Yönetimi
                </button>
              </>
            )}
            {currentRole === 'developer' && (
              <>
                <button
                  id="tab-btn-dev-docs"
                  onClick={() => setActiveTab('docs')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                    activeTab === 'docs'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Mimarî & API Dokümanları
                </button>
              </>
            )}
          </nav>

          {/* Selected Dealer Widget and Cart */}
          <div className="flex items-center gap-3">
            {/* Dealer status widget */}
            {(!isReferralLocked || currentRole !== 'customer') && (
              <div className="flex items-center">
                {selectedDealer ? (
                  <button
                    id="header-selected-dealer"
                    onClick={onOpenDealerSelector}
                    className="flex items-center gap-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-full py-1 px-3.5 text-xs text-amber-800 transition-all font-medium cursor-pointer"
                  >
                    <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="max-w-[120px] sm:max-w-[180px] truncate">
                      {selectedDealer.city} - {selectedDealer.name}
                    </span>
                    <span className="text-[10px] bg-amber-500 text-white px-1.5 py-0.2 rounded-full font-semibold">
                      Seçili
                    </span>
                  </button>
                ) : (
                  <button
                    id="header-select-dealer-trigger"
                    onClick={onOpenDealerSelector}
                    className="flex items-center gap-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-full py-1 px-3.5 text-xs font-semibold animate-pulse transition-all cursor-pointer"
                  >
                    <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    Alışveriş için Bayi Seçin
                  </button>
                )}
              </div>
            )}

            {/* Shopping Cart Trigger (Customer Role Only) */}
            {currentRole === 'customer' && (
              <button
                id="cart-trigger-btn"
                onClick={onOpenCart}
                className="relative bg-slate-50 hover:bg-slate-100 border border-slate-200 p-2.5 rounded-xl text-slate-700 hover:text-slate-950 transition-all cursor-pointer"
              >
                <ShoppingCart className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white text-[10px] font-bold rounded-full w-5.5 h-5.5 flex items-center justify-center border-2 border-white animate-scale">
                    {cartCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
