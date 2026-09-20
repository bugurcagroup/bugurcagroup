/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { UserRole, Product, Dealer, Order, CartItem, StoreSettings, CommissionRequest, Member, LegalAcceptance, InvoiceDetails, SaleUnit } from './types';

// Component Imports
import Header from './components/Header';
import DealerSelector from './components/DealerSelector';
import CustomerStore from './components/CustomerStore';
import AdminDashboard from './components/AdminDashboard';
import DealerDashboard from './components/DealerDashboard';
import SecurityGate from './components/SecurityGate';
import AntiDdosShield from './components/AntiDdosShield';
import MobilePhotoUpload from './components/MobilePhotoUpload';
import AdminLogin from './components/AdminLogin';
import UserProfilePanel from './components/UserProfilePanel';
import { getAuthErrorMessage, loginUser, logoutUser, provisionDealerAuth, registerUser, resetPassword, type UserProfile } from './lib/auth';
import { submitDealerApplicationWithAuth } from './lib/dealerAdmin';
import { deleteProduct as deleteFirestoreProduct, getProductsFromFirestore, subscribeToProducts, upsertProduct, upsertProductsBatch } from './lib/products';
import { getDealersFromFirestore, subscribeToDealerApplications, subscribeToDealers, subscribeToPublicDealers, updateDealerApplicationStatus, upsertDealer, upsertDealerPrivate } from './lib/dealers';
import { DEFAULT_STORE_SETTINGS, getStoreSettings, subscribeToStoreSettings, updateStoreSettings } from './lib/settings';
import { addCategory, subscribeToCategories } from './lib/categories';
import { getMembersFromFirestore, saveMembersToFirestore, subscribeToMembers, upsertDealerMemberProfile } from './lib/users';
import { createOrder as createFirestoreOrder, createOrderBundle as createFirestoreOrderBundle, deleteAllOrders, deleteAllTestOrders, getAllOrders, hideOrderFromAdmin, hideOrderFromMember, replaceOrders, subscribeToAllOrders, subscribeToDealerOrders, subscribeToUserOrders, upsertOrder, updateOrder as firestoreUpdateOrder } from './lib/orders';
import { createCommissionRequest as createFirestoreCommissionRequest, createCommissionTransaction, deleteAllCommissionData, getAllCommissionRequests, subscribeToAllCommissionRequests, subscribeToDealerCommissionRequests, updateCommissionStatus } from './lib/commissions';
import { calculateOrderFinancials } from './lib/finance';
import { getProductUnitPrice, getProductUnitQuantity } from './lib/productUnits';
import { deleteDealerAccount, migrateDealerRecords } from './lib/dealerAdmin';
import { useAuth } from './contexts/AuthContext';
import { archiveReceipt, permanentlyDeleteArchive, restoreArchive, subscribeToArchives, type ArchiveRecord } from './lib/archive';

// Icons for extra styling/info
import { Info, HelpCircle, ArrowRight, Store, BookOpen, AlertCircle, Sparkles, LogIn, LogOut, X } from 'lucide-react';

export default function App() {
  const { currentUser: firebaseUser, setCurrentUser } = useAuth();

  // Global States
  const [currentRole, setCurrentRole] = useState<UserRole>('customer');
  const [activeTab, setActiveTab] = useState<string>('store');
  const [adminSubTab, setAdminSubTab] = useState<string>('dashboard');
  const [dealerSubTab, setDealerSubTab] = useState<string>('dashboard');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);

  // Security & DDoS mitigation states
  const [pendingRoleChange, setPendingRoleChange] = useState<UserRole | null>(null);
  const [securityGateEnabled, setSecurityGateEnabled] = useState(false);
  const [authorizedRoles, setAuthorizedRoles] = useState<Record<string, boolean>>({
    customer: true,
    developer: true
  });
  const [triggerUnderAttack, setTriggerUnderAttack] = useState(false);

  // Dynamic Store Settings State
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(DEFAULT_STORE_SETTINGS);

  // Database lists
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [dealerApplications, setDealerApplications] = useState<import('./lib/dealers').DealerApplication[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [commissionRequests, setCommissionRequests] = useState<CommissionRequest[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [archives, setArchives] = useState<ArchiveRecord[]>([]);
  const [currentMember, setCurrentMember] = useState<Member | null>(null);

  // Selected dealer (Müşterinin eşleştiği bayi)
  const [selectedDealer, setSelectedDealer] = useState<Dealer | null>(null);
  const [dealerSelectorInitialSector, setDealerSelectorInitialSector] = useState<string>('All');
  const [referralInfo, setReferralInfo] = useState<string | null>(null);
  const [isReferralLocked, setIsReferralLocked] = useState(false);

  // Cart
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const [loggedInDealer, setLoggedInDealer] = useState<Dealer | null>(null);
  const dealerMigrationStartedRef = useRef(false);

  const getSavedPanelTab = (role: 'admin' | 'bayi' | 'customer') => {
    if (!firebaseUser || typeof window === 'undefined') return null;
    return window.localStorage.getItem(`bugurca:${firebaseUser.uid}:${role}:active-tab`);
  };

  const savePanelTab = (role: 'admin' | 'bayi' | 'customer', tab: string) => {
    if (!firebaseUser || typeof window === 'undefined') return;
    window.localStorage.setItem(`bugurca:${firebaseUser.uid}:${role}:active-tab`, tab);
  };

  const handleCustomerTabChange = (tab: string) => {
    setActiveTab(tab);
    savePanelTab('customer', tab);
  };

  const handleAdminTabChange = (tab: string) => {
    setAdminSubTab(tab);
    savePanelTab('admin', tab);
  };

  const handleDealerTabChange = (tab: string) => {
    setDealerSubTab(tab);
    savePanelTab('bayi', tab);
  };

  useEffect(() => {
    if (!firebaseUser || firebaseUser.role !== 'customer') {
      setCurrentMember(null);
      return;
    }
    setCurrentMember({
      id: firebaseUser.uid,
      name: firebaseUser.displayName || firebaseUser.email,
      email: firebaseUser.email,
      phone: firebaseUser.phone,
      createdAt: firebaseUser.createdAt || new Date().toISOString(),
      legalAcceptances: firebaseUser.legalAcceptances as LegalAcceptance[] | undefined,
    });
  }, [firebaseUser]);

  useEffect(() => {
    if (!firebaseUser?.uid) {
      setOrders([]);
      return;
    }

    if (firebaseUser.role === 'bayi' && !loggedInDealer) {
      setOrders([]);
      return;
    }

    const logOrderSubscriptionError = (scope: string) => (error: Error) => {
      console.error(`${scope} siparişleri canlı dinlenemedi`, error);
    };
    const unsubscribe = firebaseUser.role === 'admin'
      ? subscribeToAllOrders(setOrders, logOrderSubscriptionError('Merkez'))
      : firebaseUser.role === 'bayi' && loggedInDealer
        ? subscribeToDealerOrders(loggedInDealer.id, loggedInDealer.userId, setOrders, logOrderSubscriptionError('Bayi'))
        : subscribeToUserOrders(firebaseUser.uid, firebaseUser.email, setOrders, logOrderSubscriptionError('Üye'));

    return unsubscribe;
  }, [firebaseUser?.uid, firebaseUser?.email, firebaseUser?.role, loggedInDealer?.id, loggedInDealer?.userId]);

  // Modals Visibility
  const [isDealerSelectorOpen, setIsDealerSelectorOpen] = useState(false);
  const [isDealerLoginOpen, setIsDealerLoginOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isApplicationModalOpen, setIsApplicationModalOpen] = useState(false);
  const [memberAccessRequest, setMemberAccessRequest] = useState<{ mode: 'login' | 'register'; id: number } | null>(null);
  const [isProfilePanelOpen, setIsProfilePanelOpen] = useState(false);

  const handleOpenDealerSelector = (sector: string = 'All') => {
    setDealerSelectorInitialSector(sector);
    setIsDealerSelectorOpen(true);
  };

  // Listen to storeSettings theme changes to set HTML data attribute
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', storeSettings.theme);
  }, [storeSettings.theme]);

  // Firebase-backed data stays synchronized across open sessions.
  useEffect(() => {
    const subscribeDealersForRole = firebaseUser?.role === 'admin'
      ? subscribeToDealers
      : subscribeToPublicDealers;
    const unsubscribeDealers = subscribeDealersForRole(loadedDealers => {
      setDealers(loadedDealers);
      const params = new URLSearchParams(window.location.search);
      const urlDealerId = params.get('dealer') || params.get('bayi');
      const matched = loadedDealers.find(dealer => dealer.id === urlDealerId && dealer.status === 'active');
      if (matched) {
        setSelectedDealer(matched);
        setReferralInfo(matched.name);
        setIsReferralLocked(true);
        // Referans bağlantısıyla gelen ziyaretçi her zaman tanıtım vitrinini görür, özel paneli değil
        setCurrentRole('customer');
        setActiveTab('store');
        window.history.replaceState(null, '', window.location.pathname);
      }
    }, () => console.warn('Firebase bayileri canlı dinlenemedi'));
    const unsubscribeProducts = subscribeToProducts(setProducts, () => console.warn('Firebase ürünleri canlı dinlenemedi'));
    const unsubscribeCategories = subscribeToCategories(setCategories, () => console.warn('Firebase kategorileri canlı dinlenemedi'));
    const unsubscribeSettings = subscribeToStoreSettings(setStoreSettings, () => console.warn('Firebase mağaza ayarları canlı dinlenemedi'));

    return () => {
      unsubscribeDealers();
      unsubscribeProducts();
      unsubscribeCategories();
      unsubscribeSettings();
    };
  }, [firebaseUser?.role]);

  useEffect(() => {
    if (!firebaseUser) return;

    if (firebaseUser.role === 'admin') {
      if (!dealerMigrationStartedRef.current) {
        dealerMigrationStartedRef.current = true;
        void migrateDealerRecords().catch(error => {
          console.warn('Bayi veri migrationı henüz çalıştırılamadı:', error);
        });
      }
      setIsAdminAuthenticated(true);
      setCurrentRole('admin');
      setAdminSubTab(getSavedPanelTab('admin') || 'dashboard');
      return;
    }

    // Referans/bağlı bayi linkiyle gelmişse, giriş yapan bayi bile hangi roldeyse gelsin her zaman tanıtım vitrinini görür (özel panel değil)
    if (isReferralLocked) {
      setCurrentRole('customer');
      setActiveTab('store');
      return;
    }

    if (firebaseUser.role === 'bayi') {
      const matchingDealer = dealers.find(dealer =>
        dealer.email?.trim().toLowerCase() === firebaseUser.email.trim().toLowerCase()
      );
      if (matchingDealer && matchingDealer.status === 'active') {
        setLoggedInDealer(matchingDealer);
        setCurrentRole('dealer');
        setDealerSubTab(getSavedPanelTab('bayi') || 'dashboard');
      }
      return;
    }

    setCurrentRole('customer');
    setActiveTab(getSavedPanelTab('customer') || 'store');
  }, [firebaseUser, dealers, isReferralLocked]);

  useEffect(() => {
    if (firebaseUser?.role !== 'admin') {
      setDealerApplications([]);
      return;
    }

    return subscribeToDealerApplications(setDealerApplications, () => console.warn('Bayi başvuruları canlı dinlenemedi'));
  }, [firebaseUser?.role]);

  useEffect(() => {
    if (firebaseUser?.role !== 'admin') {
      setArchives([]);
      return;
    }
    return subscribeToArchives(setArchives, () => console.warn('Arşiv kayıtları canlı dinlenemedi'));
  }, [firebaseUser?.role]);

  useEffect(() => {
    if (firebaseUser?.role !== 'admin') {
      setMembers([]);
      return;
    }

    return subscribeToMembers(setMembers, () => console.warn('Firestore üyeleri canlı dinlenemedi'));
  }, [firebaseUser?.role]);

  useEffect(() => {
    if (firebaseUser?.role === 'admin') {
      return subscribeToAllCommissionRequests(setCommissionRequests, error => console.error('Merkez komisyon talepleri canlı dinlenemedi', error));
    }
    if (firebaseUser?.role === 'bayi' && loggedInDealer) {
      return subscribeToDealerCommissionRequests(loggedInDealer.id, loggedInDealer.userId, setCommissionRequests, error => console.error('Bayi komisyon talepleri canlı dinlenemedi', error));
    }
    setCommissionRequests([]);
    return undefined;
  }, [firebaseUser?.role, loggedInDealer?.id, loggedInDealer?.userId]);

  // Sync and process ?dealer= or ?bayi= query parameter when dealers update from the server
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.location) {
        const params = new URLSearchParams(window.location.search);
        const urlDealerId = params.get('dealer') || params.get('bayi');

        if (urlDealerId) {
          const matched = dealers.find(d => d.id === urlDealerId && d.status === 'active');
          if (matched) {
            setSelectedDealer(matched);
            setReferralInfo(matched.name);
            setIsReferralLocked(true);
            // Referans/bağlı bayi linki, bayi hangi roldeyse gelsin her zaman tanıtım vitrinini gösterir
            setCurrentRole('customer');
            setActiveTab('store');
            // Clear query parameter cleanly without page refresh
            try {
              const newurl = window.location.protocol + "//" + window.location.host + window.location.pathname;
              window.history.replaceState(null, '', newurl);
            } catch (err) {
              console.warn('Failed to replace state safely');
            }
          }
        }
      }
    } catch (err) {
      console.warn('Failed to parse dealer referral search parameters when dealers state updated', err);
    }
  }, [dealers]);

  const handleRoleChange = (role: UserRole) => {
    // Yönetici rolü yalnızca doğrulanmış yönetici hesabıyla açılabilir.
    if (role === 'admin') return;

    if (securityGateEnabled && role === 'dealer' && !authorizedRoles[role]) {
      setPendingRoleChange(role);
      return;
    }

    setCurrentRole(role);
    if (role === 'dealer') {
      setDealerSubTab('dashboard');
    } else if (role === 'developer') {
      // no subtab
    } else {
      setActiveTab('store');
    }
  };

  const handleMemberRegister = async (name: string, email: string, password: string, phone?: string, legalAcceptances: LegalAcceptance[] = []) => {
    if (!legalAcceptances.some(acceptance => acceptance.documentId === 'membership') || !legalAcceptances.some(acceptance => acceptance.documentId === 'kvkk')) {
      alert('Üyelik Sözleşmesi ve KVKK Aydınlatma Metni onayı gereklidir.');
      return false;
    }
    try {
      const profile = await registerUser(email, password, {
        displayName: name.trim(),
        phone,
        legalAcceptances,
      });
      const member: Member = {
        id: profile.uid,
        name: profile.displayName || name.trim(),
        email: profile.email,
        phone: profile.phone,
        createdAt: profile.createdAt || new Date().toISOString(),
        legalAcceptances,
      };
      setCurrentMember(member);
      return true;
    } catch (error) {
      alert(`Kayıt oluşturulamadı: ${getAuthErrorMessage(error)}`);
      return false;
    }
  };

  const handleForgotPassword = async (email: string) => {
    if (!email.trim()) {
      alert('Lütfen önce e-posta adresinizi yazın.');
      return;
    }
    try {
      await resetPassword(email);
      alert('Şifre yenileme bağlantısı e-posta adresinize gönderildi. Gelen kutunuzu ve spam klasörünü kontrol edin.');
    } catch (error) {
      alert(`Şifre yenileme bağlantısı gönderilemedi: ${getAuthErrorMessage(error)}`);
    }
  };

  const handleMemberLogin = async (email: string, password: string) => {
    try {
      const profile = await loginUser(email, password);
      const member: Member = {
        id: profile.uid,
        name: profile.displayName || profile.email,
        email: profile.email,
        phone: profile.phone,
        createdAt: profile.createdAt || new Date().toISOString(),
        legalAcceptances: profile.legalAcceptances as LegalAcceptance[] | undefined,
      };
      setCurrentMember(member);
      return true;
    } catch {
      alert('E-posta veya şifre hatalı.');
      return false;
    }
  };

  const handleMemberLogout = async () => {
    await logoutUser();
    setCurrentMember(null);
  };

  const handleLogoutDealer = async () => {
    await logoutUser();
    setLoggedInDealer(null);
    setCurrentRole('customer');
    setActiveTab('store');
    alert('Bayi çıkışı başarıyla yapıldı.');
  };

  const handleLogoutAdmin = async () => {
    await logoutUser();
    setIsAdminAuthenticated(false);
    setCurrentRole('customer');
    setActiveTab('store');
  };

  const handleAdminLoginSuccess = (profile: UserProfile) => {
    if (profile.role !== 'admin') return;
    setIsAdminAuthenticated(true);
    setCurrentRole('admin');
    setAdminSubTab('dashboard');
  };

  const handleLoginDealerSubmit = async (emailInput: string, passwordInput: string): Promise<boolean> => {
    try {
      const profile = await loginUser(emailInput, passwordInput);
      if (profile.role === 'admin') {
        setIsAdminAuthenticated(true);
        setCurrentRole('admin');
        setAdminSubTab('dashboard');
        setIsDealerLoginOpen(false);
        alert('Yönetici girişi başarılı. Yönetici paneli açıldı.');
        return true;
      }
      if (profile.role !== 'bayi') {
        alert('Bu hesap bayi yetkisine sahip değil.');
        return false;
      }
      const matched = dealers.find(d => d.email && d.email.toLowerCase().trim() === profile.email.toLowerCase().trim());
      if (!matched) {
        await logoutUser();
        alert('Bu bayi kaydı yönetici tarafından silinmiştir. Yeni başvuru için lütfen bayi başvuru formunu kullanın.');
        return false;
      }
      if (matched.status === 'pending') {
        alert('Bayiliğiniz onay bekliyor durumundadır. Yönetici onayından sonra giriş yapabilirsiniz.');
        return false;
      }
      if (matched?.status === 'suspended') {
        alert('Bayiliğiniz askıya alınmıştır. Lütfen sistem yöneticisi ile iletişime geçiniz.');
        return false;
      }
      const linkedDealer = matched ? { ...matched, userId: profile.uid } : null;
      setLoggedInDealer(linkedDealer);
      setCurrentRole('dealer');
      setDealerSubTab('dashboard');
      setIsDealerLoginOpen(false);

      alert(`Hoş geldiniz, ${profile.displayName || profile.email}! Başarıyla giriş yaptınız.`);
      return true;
    } catch {
      alert('E-posta veya şifre hatalı.');
      return false;
    }
  };

  const handleLogoClick = () => {
    setCurrentRole('customer');
    setActiveTab('store');
    setIsCartOpen(false);
    setIsDealerSelectorOpen(false);
    setIsDealerLoginOpen(false);
    setIsApplicationModalOpen(false);
  };

  // Müşterinin eşleştiği bayiyi güncelleme işlemi
  const handleSelectDealer = (dealer: Dealer | null) => {
    if (cartItems.length > 0 && selectedDealer && (!dealer || selectedDealer.id !== dealer.id)) {
      alert(`Alışveriş ortasında bayi değiştiremezsiniz! Mevcut sepetiniz "${selectedDealer.name}" bayimiz ile ilişkilendirilmiştir. Yeni bir bayi seçmek için lütfen önce sepetinizi boşaltın.`);
      return;
    }
    setSelectedDealer(dealer);
  };

  // Sepet İşlemleri
  const handleAddToCart = (product: Product, saleUnit: SaleUnit = 'piece') => {
    // KRİTİK GEREKSİNİM: Bayi seçilmemişse sepete eklemeyi durdur ve bayi seçtir!
    if (!selectedDealer) {
      setIsDealerSelectorOpen(true);
      return;
    }

    setCartItems(prevItems => {
      const existing = prevItems.find(item => item.product.id === product.id && item.saleUnit === saleUnit);
      if (existing) {
        return prevItems.map(item =>
          item.product.id === product.id && item.saleUnit === saleUnit
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prevItems, {
        product,
        quantity: 1,
        saleUnit,
        unitQuantity: getProductUnitQuantity(product, saleUnit),
        unitPrice: getProductUnitPrice(product, saleUnit),
      }];
    });
  };

  const handleRemoveFromCart = (productId: string) => {
    setCartItems(prev => prev.filter(item => item.product.id !== productId));
  };

  const handleUpdateCartUnit = (productId: string, saleUnit: SaleUnit) => {
    setCartItems(previous => previous.map(item => item.product.id === productId ? {
      ...item,
      saleUnit,
      unitQuantity: getProductUnitQuantity(item.product, saleUnit),
      unitPrice: getProductUnitPrice(item.product, saleUnit),
    } : item));
  };

  const handleUpdateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveFromCart(productId);
      return;
    }
    setCartItems(prev =>
      prev.map(item => (item.product.id === productId ? { ...item, quantity } : item))
    );
  };

  const handleClearCart = () => {
    setCartItems([]);
    setIsCartOpen(false);
  };

  // Alışveriş Tamamlama (Checkout)
  const handleCheckout = async (
    name: string,
    email: string,
    phone: string,
    shippingCompany: string,
    shippingReceiver: string,
    shippingPhone: string,
    shippingAddress: string,
    shippingCity: string,
    shippingDistrict: string,
    selectedSector?: string,
    isFromDealerPage?: boolean,
    receiptDataUrl?: string,
    receiptFileName?: string,
    paymentMethod: 'card' | 'bank_transfer' = 'bank_transfer',
    orderReference?: string,
    legalAcceptances: LegalAcceptance[] = [],
    invoiceDetails?: InvoiceDetails,
    testMode = false
  ): Promise<string> => {
    if (!selectedDealer || !currentMember) return '';
    if (!legalAcceptances.some(acceptance => acceptance.documentId === 'distance-sales') || !legalAcceptances.some(acceptance => acceptance.documentId === 'pre-information')) return '';

    if (cartItems.length === 0) return '';

    const totalPrice = cartItems.reduce((acc, item) => {
      const currentProduct = products.find(product => product.id === item.product.id);
      const price = currentProduct ? getProductUnitPrice(currentProduct, item.saleUnit) : item.unitPrice;
      return acc + price * item.quantity;
    }, 0);
    const orderItems = cartItems.map(item => {
      const currentProduct = products.find(product => product.id === item.product.id);
      const price = currentProduct ? getProductUnitPrice(currentProduct, item.saleUnit) : item.unitPrice;
      return {
        productId: item.product.id,
        name: `${item.product.name} (${item.saleUnit === 'box' ? 'Koli' : item.saleUnit === 'dozen' ? 'Düzine' : 'Adet'})`,
        quantity: item.quantity,
        price,
        source: item.product.source === 'dealer' || Boolean(item.product.dealerId) ? 'dealer' as const : 'central' as const,
        dealerId: item.product.dealerId,
        isCentral: !item.product.dealerId,
        storeId: item.product.dealerId ? undefined : 'central',
        saleUnit: item.saleUnit,
        unitQuantity: item.unitQuantity,
        unitPrice: price,
      };
    });
    const groupedItems = new Map<string, typeof orderItems>();
    orderItems.forEach(item => {
      const groupId = item.dealerId || 'central';
      groupedItems.set(groupId, [...(groupedItems.get(groupId) || []), item]);
    });
    const paymentStatus = paymentMethod === 'card' ? 'approved' as const : 'under_review' as const;
    const orderStatus = paymentMethod === 'card' ? 'completed' as const : 'pending' as const;
    const sharedOrderData = {
      customerName: name,
      customerEmail: email,
      customerPhone: phone,
      status: orderStatus,
      createdBy: 'customer' as const,
      adminApproved: paymentMethod === 'card',
      shippingCompany,
      shippingAddress,
      shippingCity,
      shippingDistrict,
      shippingReceiver,
      shippingPhone,
      shippingStatus: 'preparing' as const,
      isFromDealerPage: Boolean(isFromDealerPage),
      selectedSector: selectedSector || selectedDealer.sector || 'Kırtasiye',
      orderReference,
      memberId: currentMember.id,
      userId: currentMember.id,
      member: { id: currentMember.id, name: currentMember.name, email: currentMember.email },
      paymentMethod,
      paymentDestination: 'central_pool' as const,
      paymentStatus,
      receiptUploaded: Boolean(receiptDataUrl),
      receiptDataUrl,
      receiptFileName,
      receiptStatus: paymentMethod === 'card' ? 'approved' as const : 'pending' as const,
      legalAcceptances,
      payment: { method: paymentMethod, status: paymentStatus },
      receipt: { uploaded: Boolean(receiptDataUrl), dataUrl: receiptDataUrl, fileName: receiptFileName, status: paymentMethod === 'card' ? 'approved' as const : 'pending' as const },
      invoiceDetails,
      testMode,
    };
    const subOrders = Array.from(groupedItems.entries()).map(([dealerId, items]) => {
      const dealer = dealers.find(item => item.id === dealerId);
      const subTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const financials = dealer
        ? calculateOrderFinancials(subTotal, dealer, storeSettings, Boolean(isFromDealerPage))
        : { dealerCommissionAmount: 0, adminCommissionAmount: 0 };
      return {
        ...sharedOrderData,
        dealerId,
        dealerUserId: dealer?.userId,
        dealerName: dealer?.name || 'Merkez Mağaza',
        items,
        totalPrice: subTotal,
        commissionAmount: financials.dealerCommissionAmount,
        adminCommissionAmount: financials.adminCommissionAmount,
      };
    });
    const masterOrder = {
      ...sharedOrderData,
      dealerId: 'master',
      dealerName: 'Ana Sipariş',
      items: orderItems,
      totalPrice,
      commissionAmount: subOrders.reduce((sum, order) => sum + order.commissionAmount, 0),
      adminCommissionAmount: subOrders.reduce((sum, order) => sum + (order.adminCommissionAmount || 0), 0),
    };

    return createFirestoreOrderBundle(masterOrder, subOrders);
  };

  const handleMarkOrderDownloaded = async (orderId: string) => {
    const order = orders.find(item => item.id === orderId);
    if (!order) return;
    await upsertOrder({ ...order, customerDownloaded: true });
    setOrders(previous => previous.map(item => item.id === orderId ? { ...item, customerDownloaded: true } : item));
  };

  // Yeni Bayi Başvurusu (Bayimiz Olun)
  const handleApplyDealer = async (
    dealerData: Omit<Dealer, 'id' | 'salesVolume' | 'commissionEarned' | 'createdAt'>,
    password: string,
  ) => {
    await submitDealerApplicationWithAuth({
      name: dealerData.name,
      owner: dealerData.owner,
      sector: dealerData.sector,
      city: dealerData.city,
      district: dealerData.district,
      address: dealerData.address,
      phone: dealerData.phone,
      email: dealerData.email,
      password,
    });
  };

  const handleSaveOrdersList = async (updatedOrders: Order[]) => {
    await replaceOrders(updatedOrders);
    setOrders(updatedOrders);
  };

  const handleUpdateOrder = async (orderId: string, changes: Partial<Order>) => {
    await firestoreUpdateOrder(orderId, changes);
    setOrders(previous => previous.map(o => o.id === orderId ? { ...o, ...changes } : o));
  };

  const handleDeleteMemberOrder = async (orderId: string) => {
    await hideOrderFromMember(orderId);
    setOrders(previous => previous.map(order => order.id === orderId ? { ...order, memberHidden: true } : order));
  };

  const handleAdminPermanentDeleteOrder = async (orderId: string) => {
    await hideOrderFromAdmin(orderId);
    setOrders(previous => previous.map(order => order.id === orderId ? { ...order, adminHidden: true } : order));
  };

  const handleSetOrderCommissionStatus = async (orderId: string, voided: boolean) => {
    const order = orders.find(item => item.id === orderId);
    if (!order) return;
    const updated = { ...order, commissionVoided: voided };
    await upsertOrder(updated);
    setOrders(previous => previous.map(item => item.id === orderId ? updated : item));
  };

  const handleDeleteTestOrders = async () => {
    await deleteAllTestOrders();
    setOrders(previous => previous.filter(order => !order.testMode));
  };

  const handleArchiveReceipt = async (orderId: string) => {
    await archiveReceipt(orderId);
    setOrders(previous => previous.map(order => order.id === orderId ? { ...order, receiptUploaded: false, receiptDataUrl: undefined, receiptFileName: undefined } : order));
  };

  const handleResetFinancialData = async () => {
    await Promise.all([
      deleteAllOrders(),
      deleteAllCommissionData(),
    ]);
    setOrders([]);
    setCommissionRequests([]);
  };

  const handleBackupRestored = async () => {
    const [loadedProducts, loadedDealers, loadedSettings, loadedOrders, loadedMembers, loadedCommissionRequests] = await Promise.all([
      getProductsFromFirestore(),
      getDealersFromFirestore(),
      getStoreSettings(),
      getAllOrders(),
      getMembersFromFirestore(),
      getAllCommissionRequests(),
    ]);
    setProducts(loadedProducts);
    setDealers(loadedDealers);
    setStoreSettings(loadedSettings);
    setOrders(loadedOrders);
    setMembers(loadedMembers);
    setCommissionRequests(loadedCommissionRequests);
  };

  // --- ADMIN PANELI İŞLEMLERİ ---
  const handleAdminSaveProduct = async (product: Product) => {
    const productWithSource = {
      ...product,
      source: product.dealerId ? 'dealer' as const : 'admin' as const,
    };
    await upsertProduct(productWithSource);
    setProducts(previous => {
      const existingIndex = previous.findIndex(item => item.id === productWithSource.id);
      if (existingIndex === -1) return [...previous, productWithSource];
      return previous.map(item => item.id === productWithSource.id ? productWithSource : item);
    });
  };

  const handleAdminSaveProductsBulk = async (newProducts: Product[]) => {
    const productsWithSource = newProducts.map(product => ({
      ...product,
      source: product.dealerId ? 'dealer' as const : 'admin' as const,
    }));
    const importedCategories = Array.from(new Set(productsWithSource.map(product => product.category)));
    await upsertProductsBatch(productsWithSource, importedCategories);
    setProducts(previous => {
      const merged = [...previous];
      productsWithSource.forEach(product => {
        const index = merged.findIndex(item => item.id === product.id);
        if (index === -1) merged.push(product);
        else merged[index] = product;
      });
      return merged;
    });
  };

  const handleAdminBulkUpdatePrices = async (
    scope: 'all' | 'category',
    category: string,
    action: 'increase' | 'discount',
    percent: number
  ) => {
    const currentProducts = products;
    const updated = currentProducts.map(p => {
      if (scope === 'category' && p.category !== category) {
        return p;
      }
      let newPrice = p.price;
      if (action === 'increase') {
        newPrice = p.price * (1 + percent / 100);
      } else if (action === 'discount') {
        newPrice = p.price * (1 - percent / 100);
      }
      newPrice = Number(Math.max(0.01, newPrice).toFixed(2));
      return {
        ...p,
        price: newPrice
      };
    });
    await Promise.all(updated.map(product => upsertProduct(product)));
    setProducts(updated);
  };

  const handleAdminDeleteProduct = async (id: string) => {
    await deleteFirestoreProduct(id);
    setProducts(previous => previous.filter(product => product.id !== id));
  };

  const handleRestoreArchive = async (record: ArchiveRecord) => {
    await restoreArchive(record);
  };

  const handlePermanentlyDeleteArchive = async (record: ArchiveRecord) => {
    await permanentlyDeleteArchive(record);
  };

  const handleAdminUpdateDealerStatus = async (id: string, status: Dealer['status']) => {
    const matched = dealers.find(d => d.id === id);
    if (matched) {
      let updated: Dealer = { ...matched, status };
      if (status === 'active') {
        const memberProfileId = await upsertDealerMemberProfile(updated);
        if (memberProfileId !== updated.id) updated = { ...updated, userId: memberProfileId };
      }
      await upsertDealer(updated);
      setDealers(previous => previous.map(dealer => dealer.id === id ? updated : dealer));

      // If active dealer selected by customer is suspended, clear it
      if (selectedDealer?.id === id && status !== 'active') {
        setSelectedDealer(null);
      }
    }
  };

  // --- BAYİ PANELI İŞLEMLERİ ---
  const handleDealerUpdateProfile = async (dealer: Dealer) => {
    await upsertDealerPrivate(dealer);
    setDealers(previous => previous.map(item => item.id === dealer.id ? dealer : item));
    if (loggedInDealer?.id === dealer.id) setLoggedInDealer(dealer);

    // If it's the currently selected dealer by customer, update too
    if (selectedDealer?.id === dealer.id) {
      setSelectedDealer(dealer);
    }
  };

  const handleProfileSaved = async (profile: UserProfile, updatedDealer?: Dealer) => {
    setCurrentUser(profile);
    if (profile.role === 'customer') {
      setCurrentMember({
        id: profile.uid,
        name: profile.displayName || profile.email,
        email: profile.email,
        phone: profile.phone,
        createdAt: profile.createdAt || new Date().toISOString(),
        legalAcceptances: profile.legalAcceptances as LegalAcceptance[] | undefined,
      });
    }
    if (updatedDealer) await handleDealerUpdateProfile(updatedDealer);
  };

  // --- KOMİSYON / HAKEDİŞ İŞLEMLERİ ---
  const handleCreateCommissionRequest = async (requestData: Omit<CommissionRequest, 'id' | 'status' | 'date'>) => {
    const requestWithUser = { ...requestData, dealerUserId: firebaseUser?.uid };
    const requestId = await createFirestoreCommissionRequest(requestWithUser);
    setCommissionRequests(previous => [...previous, { ...requestWithUser, id: requestId, status: 'pending', date: new Date().toISOString() }]);
  };

  const handleApproveCommissionRequest = async (requestId: string) => {
    await updateCommissionStatus(requestId, 'approved');
    setCommissionRequests(previous => previous.map(request => request.id === requestId ? { ...request, status: 'approved' } : request));
  };

  const handleRejectCommissionRequest = async (requestId: string) => {
    await updateCommissionStatus(requestId, 'rejected');
    setCommissionRequests(previous => previous.map(request => request.id === requestId ? { ...request, status: 'rejected' } : request));
  };

  const handlePayCommissionDirectly = async (dealerId: string, amount: number) => {
    await createCommissionTransaction(dealerId, amount, 'payout');
  };

  const isMobileUploadPage = typeof window !== 'undefined' && window.location.pathname === '/mobile-upload';

  if (isMobileUploadPage) {
    return <MobilePhotoUpload />;
  }

  // Show admin login screen if admin role is selected but not authenticated
  if (currentRole === 'admin' && !isAdminAuthenticated) {
    return <AdminLogin onLoginSuccess={handleAdminLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col justify-between" id="app-root-container">
      {/* Top Header Section */}
      <Header
        currentRole={currentRole}
        selectedDealer={selectedDealer}
        onOpenDealerSelector={() => handleOpenDealerSelector('All')}
        onLogoClick={handleLogoClick}
        cartCount={cartItems.reduce((acc, item) => acc + item.quantity, 0)}
        onOpenCart={() => setIsCartOpen(true)}
        activeTab={currentRole === 'admin' ? adminSubTab : (currentRole === 'dealer' ? dealerSubTab : activeTab)}
        setActiveTab={currentRole === 'admin' ? handleAdminTabChange : (currentRole === 'dealer' ? handleDealerTabChange : handleCustomerTabChange)}
        storeName={storeSettings.storeName}
        logoUrl={storeSettings.logoUrl}
        authorizedRoles={authorizedRoles}
        securityGateEnabled={securityGateEnabled}
        isReferralLocked={isReferralLocked}
        loggedInDealer={loggedInDealer}
        onLogoutDealer={handleLogoutDealer}
        onLogoutAdmin={handleLogoutAdmin}
        onOpenDealerLogin={() => setIsDealerLoginOpen(true)}
        newsList={storeSettings.newsList || []}
        onOpenDealerApplication={() => setIsApplicationModalOpen(true)}
        isMemberLoggedIn={Boolean(currentMember)}
        onOpenMemberAccess={(mode) => {
          setActiveTab('store');
          setMemberAccessRequest({ mode, id: Date.now() });
        }}
        onOpenProfile={() => setIsProfilePanelOpen(true)}
        onLockRole={(role) => {
          setAuthorizedRoles(prev => ({ ...prev, [role]: false }));
          if (currentRole === role) {
            setCurrentRole('customer');
            setActiveTab('store');
          }
        }}
      />

      {/* Main Content Render */}
      <main className="flex-1">
        {/* CUSTOMER VIEWS */}
        {currentRole === 'customer' && (
          <>
            {referralInfo && (
              <div className="bg-amber-500 text-slate-950 font-bold px-4 py-3 text-center text-xs flex items-center justify-center gap-2 shadow-md" id="referral-banner">
                <Sparkles className="w-4 h-4 text-slate-950 animate-pulse" />
                <span>Ayrıcalıklı Bağlantı: <strong>{referralInfo}</strong> adlı esnafımızın özel referans ve karekod bağlantısı ile giriş yaptınız! Alışverişiniz bu esnafımızı destekleyecektir.</span>
                <button onClick={() => setReferralInfo(null)} className="ml-3 bg-slate-950/20 hover:bg-slate-950/40 text-slate-950 px-2 py-1 rounded-md text-[10px] uppercase font-bold transition-all cursor-pointer">Anlaşıldı</button>
              </div>
            )}

            {activeTab === 'store' && (
              <CustomerStore
                products={products}
                categories={categories}
                dealers={dealers}
                orders={orders}
                selectedDealer={selectedDealer}
                onSelectDealer={handleSelectDealer}
                onOpenDealerSelector={(sector) => handleOpenDealerSelector(sector)}
                cartItems={cartItems}
                onAddToCart={handleAddToCart}
                onRemoveFromCart={handleRemoveFromCart}
                onUpdateCartQuantity={handleUpdateCartQuantity}
                onUpdateCartUnit={handleUpdateCartUnit}
                onClearCart={handleClearCart}
                onCheckout={handleCheckout}
                onApplyDealer={handleApplyDealer}
                isCartOpen={isCartOpen}
                onCloseCart={() => setIsCartOpen(false)}
                onTabChange={handleCustomerTabChange}
                storeName={storeSettings.storeName}
                storeSlogan={storeSettings.storeSlogan}
                commissionRate={storeSettings.commissionRate}
                storeSettings={storeSettings}
                isReferralLocked={isReferralLocked}
                onMarkOrderDownloaded={handleMarkOrderDownloaded}
                isApplicationModalOpen={isApplicationModalOpen}
                onCloseApplicationModal={() => setIsApplicationModalOpen(false)}
                currentMember={currentMember}
                onMemberLogin={handleMemberLogin}
                onForgotPassword={handleForgotPassword}
                onMemberRegister={handleMemberRegister}
                onMemberLogout={handleMemberLogout}
                memberAccessRequest={memberAccessRequest}
              />
            )}

            {activeTab === 'about' && (
              <div className="max-w-4xl mx-auto px-4 py-12 space-y-8" id="about-platform">
                <div className="text-center space-y-3">
                  <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                    İŞ MODELİ & SOSYAL KAZANIM
                  </span>
                  <h2 className="font-display font-extrabold text-3xl text-slate-900 tracking-tight">
                    Yerli Kırtasiye Esnafını Koruyan Hibrit E-Ticaret Modeli
                  </h2>
                  <p className="text-slate-500 text-sm max-w-2xl mx-auto leading-relaxed">
                    Buğurca Kırtasiye, geleneksel kırtasiye mağazalarını e-ticaret çağında desteklemek amacıyla tasarlanmış yenilikçi, çok satıcılı (multi-vendor) hibrit bir platformdur.
                  </p>
                </div>

                {/* Steps Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3 text-center">
                    <div className="bg-amber-500 text-white w-10 h-10 rounded-full flex items-center justify-center mx-auto font-bold font-display text-base shadow-md">
                      1
                    </div>
                    <h4 className="font-bold text-sm text-slate-800">Merkezi Ürün & Stok</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Süper admin tüm ürün çeşitlerini merkeze girer. Bayiler ürün ekleme, görsel yükleme veya kargo detaylarıyla zaman kaybetmez.
                    </p>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3 text-center">
                    <div className="bg-amber-500 text-white w-10 h-10 rounded-full flex items-center justify-center mx-auto font-bold font-display text-base shadow-md">
                      2
                    </div>
                    <h4 className="font-bold text-sm text-slate-800">Konum Bazlı Bayi Eşleşmesi</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Müşteri alışveriş yaparken listeden veya haritadan kendi mahalle kırtasiyesini seçer. Sipariş doğrudan bu bayi ile ilişkilendirilir.
                    </p>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3 text-center">
                    <div className="bg-amber-500 text-white w-10 h-10 rounded-full flex items-center justify-center mx-auto font-bold font-display text-base shadow-md">
                      3
                    </div>
                    <h4 className="font-bold text-sm text-slate-800">%1 Otomatik Komisyon</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Sipariş tutarı merkezi havuzda toplanır. Fatura kesilip kargo hazırlanırken, ciro üzerinden %1 komisyon bayinin hakedişine eklenir.
                    </p>
                  </div>
                </div>

                {/* Legal compliance / finance block */}
                <div className="bg-slate-900 text-white rounded-3xl p-8 relative overflow-hidden shadow-lg">
                  <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl"></div>
                  <div className="relative space-y-4">
                    <h4 className="font-display font-extrabold text-xl tracking-tight flex items-center gap-2 text-amber-400">
                      <Sparkles className="w-5 h-5 text-amber-400" />
                      Yasal ve Vergisel Güvence (Merkez Havuz Modeli)
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      Geleneksel pazaryerlerindeki en büyük hukuki engel olan "ödemenin kimin hesabına geçeceği ve faturayı kimin keseceği" karmaşasını tamamen çözüyoruz.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
                      <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-1.5">
                        <strong className="text-white block">Merkez Ödeme Toplama:</strong>
                        <p className="text-slate-300">
                          Ödemeler tek bir sanal POS ({storeSettings.storeName} Merkez) üzerinden çekilir. KDV beyanı ve fatura merkezi muhasebece kargo paketiyle müşteriye gönderilir.
                        </p>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-1.5">
                        <strong className="text-white block">Esnaf Komisyon Faturası:</strong>
                        <p className="text-slate-300">
                          Bayilerimiz biriken hakedişlerini çekerken merkeze "Komisyon Bedeli Hizmet Faturası" düzenlerler. Böylelikle tüm süreç yasal mevzuatlara %100 uyumludur.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'announcements' && (
              <div className="max-w-4xl mx-auto px-4 py-12 space-y-8 animate-fade-in" id="announcements-platform">
                <div className="text-center space-y-3">
                  <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                    📢 GÜNCEL GELİŞMELER & DUYURULAR
                  </span>
                  <h2 className="font-display font-extrabold text-3xl text-slate-900 tracking-tight">
                    Platform Duyuruları & Esnaf Bülteni
                  </h2>
                  <p className="text-slate-500 text-sm max-w-2xl mx-auto leading-relaxed">
                    Yönetici panelinden anlık yayınlanan en son haberleri, esnaf duyurularını ve platform güncellemelerini buradan takip edebilirsiniz.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-6 max-w-3xl mx-auto pt-4">
                  {!storeSettings.newsList || storeSettings.newsList.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3 shadow-xs">
                      <div className="text-4xl">📢</div>
                      <h4 className="font-bold text-slate-800 text-sm">Kayıtlı Duyuru Bulunmuyor</h4>
                      <p className="text-xs text-slate-400 max-w-xs mx-auto">
                        Şu anda yayınlanmış aktif bir duyuru veya haber bulunmamaktadır. Lütfen daha sonra tekrar kontrol edin.
                      </p>
                    </div>
                  ) : (
                    storeSettings.newsList.map((announcement) => (
                      <div
                        key={announcement.id}
                        className="bg-white border border-slate-200 hover:border-amber-500/30 rounded-2xl p-6 shadow-2xs hover:shadow-xs transition-all flex gap-4 items-start"
                      >
                        <div className="text-3xl bg-amber-50 p-3 rounded-xl shrink-0 flex items-center justify-center border border-amber-100 shadow-3xs">
                          {announcement.emoji || '📢'}
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <h3 className="font-display font-bold text-base text-slate-900 tracking-tight">
                              {announcement.title}
                            </h3>
                            <span className="bg-slate-100 text-slate-500 text-[10px] font-bold font-mono px-2.5 py-0.5 rounded-full">
                              {announcement.date}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                            {announcement.content}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* DEALER VIEWS */}
        {currentRole === 'dealer' && (
          <DealerDashboard
            dealers={dealers}
            categories={categories}
            orders={orders}
            products={products}
            onUpdateDealerProfile={handleDealerUpdateProfile}
            onCreateOrder={async (newOrder) => {
              const orderId = await createFirestoreOrder({ ...newOrder, commissionAmount: 0, userId: newOrder.userId || firebaseUser?.uid || '' });
              setOrders(previous => [...previous, { ...newOrder, id: orderId, date: new Date().toISOString() }]);
            }}
            activeSubTab={dealerSubTab}
            setActiveSubTab={handleDealerTabChange}
            commissionRate={storeSettings.commissionRate}
            commissionRequests={commissionRequests}
            onSendCommissionRequest={handleCreateCommissionRequest}
            selectedDealerId={loggedInDealer ? loggedInDealer.id : selectedDealer?.id}
            onSaveProduct={handleAdminSaveProduct}
            onSaveProductsBulk={handleAdminSaveProductsBulk}
            onDeleteProduct={handleAdminDeleteProduct}
            onSaveOrdersList={handleSaveOrdersList}
            onUpdateOrder={handleUpdateOrder}
          />
        )}

        {/* SUPER ADMIN VIEWS */}
        {currentRole === 'admin' && (
          <AdminDashboard
            products={products}
            categories={categories}
            dealers={dealers}
            dealerApplications={dealerApplications}
            orders={orders}
            members={members}
            onSaveMembers={async (updatedMembers) => {
              try {
                await saveMembersToFirestore(members, updatedMembers);
                setMembers(updatedMembers);
              } catch (error) {
                console.error('Üye değişiklikleri Firestore\'a kaydedilemedi:', error);
                alert('Üye değişikliği kaydedilemedi. Lütfen tekrar deneyin.');
                throw error;
              }
            }}
            onSaveProduct={handleAdminSaveProduct}
            onAddCategory={async (name) => { await addCategory(name); }}
            onSaveProductsBulk={handleAdminSaveProductsBulk}
            onDeleteProduct={handleAdminDeleteProduct}
            archives={archives}
            onRestoreArchive={handleRestoreArchive}
            onPermanentlyDeleteArchive={handlePermanentlyDeleteArchive}
            onArchiveReceipt={handleArchiveReceipt}
            onBulkUpdatePrices={handleAdminBulkUpdatePrices}
            onUpdateDealerStatus={handleAdminUpdateDealerStatus}
            onUpdateDealerApplicationStatus={async (id, status) => {
              await updateDealerApplicationStatus(id, status);
              setDealerApplications(previous => previous.map(application => application.id === id ? { ...application, status } : application));
            }}
            onApproveDealerApplication={async (application) => {
              const authUid = application.authUid;
              if (!authUid) {
                throw new Error('Bu başvuru Auth hesabı olmadan oluşturulmuş. Bayinin formu kendi şifresiyle yeniden göndermesi gerekir.');
              }
              const dealer: Dealer = {
                id: application.dealerId || application.id,
                name: application.name,
                owner: application.owner,
                sector: application.sector,
                city: application.city,
                district: application.district,
                address: application.address,
                phone: application.phone,
                email: application.email,
                status: 'active',
                salesVolume: 0,
                commissionEarned: 0,
                createdAt: application.createdAt,
                userId: authUid,
              };
              const profileId = await upsertDealerMemberProfile({ ...dealer, authUid });
              const linkedDealer = { ...dealer, userId: authUid || profileId };
              await upsertDealer(linkedDealer);
              await updateDealerApplicationStatus(application.id, 'approved');
              setDealers(previous => previous.some(item => item.id === linkedDealer.id)
                ? previous.map(item => item.id === linkedDealer.id ? linkedDealer : item)
                : [...previous, linkedDealer]);
              setDealerApplications(previous => previous.map(item => item.id === application.id ? { ...item, status: 'approved' } : item));
            }}
            activeSubTab={adminSubTab}
            setActiveSubTab={handleAdminTabChange}
            storeSettings={storeSettings}
            commissionRequests={commissionRequests}
            onApproveCommissionRequest={handleApproveCommissionRequest}
            onRejectCommissionRequest={handleRejectCommissionRequest}
            onPayCommissionDirectly={handlePayCommissionDirectly}
            securityGateEnabled={securityGateEnabled}
            setSecurityGateEnabled={setSecurityGateEnabled}
            onSaveStoreSettings={async (newSettings) => {
              await updateStoreSettings(newSettings);
              setStoreSettings(previous => ({ ...previous, ...newSettings }));
            }}
            onDeleteDealer={async (id) => {
              const dealer = dealers.find(item => item.id === id);
              const profileIds = [id, dealer?.userId].filter((profileId, index, ids): profileId is string => Boolean(profileId) && ids.indexOf(profileId) === index);
              await deleteDealerAccount(id);
              setMembers(previous => previous.filter(member => !profileIds.includes(member.id)));
              setDealers(previous => previous.filter(item => item.id !== id));
              if (selectedDealer?.id === id) {
                setSelectedDealer(null);
              }
            }}
            onSaveDealer={async (dealer, password) => {
              const existingDealer = dealers.find(item => item.id === dealer.id);
              const authAccount = password
                ? await provisionDealerAuth(dealer.email, password, dealer.owner || dealer.name)
                : existingDealer?.userId
                  ? { uid: existingDealer.userId }
                  : null;
              if (!authAccount) {
                throw new Error('Yeni bayi için Firebase Authentication şifresi gereklidir.');
              }
              const memberProfileId = await upsertDealerMemberProfile({ ...dealer, authUid: authAccount.uid });
              const linkedDealer = { ...dealer, userId: authAccount.uid || memberProfileId };
              await upsertDealer(linkedDealer);
              setDealers(previous => previous.map(item => item.id === linkedDealer.id ? linkedDealer : item));
              if (selectedDealer?.id === linkedDealer.id) {
                setSelectedDealer(linkedDealer);
              }
            }}
            onSaveOrdersList={handleSaveOrdersList}
            onDeleteMemberOrder={handleDeleteMemberOrder}
            onPermanentDeleteOrder={handleAdminPermanentDeleteOrder}
            onSetOrderCommissionStatus={handleSetOrderCommissionStatus}
            onResetFinancialData={handleResetFinancialData}
            onDeleteTestOrders={handleDeleteTestOrders}
            onBackupRestored={handleBackupRestored}
          />
        )}
      </main>

      {/* Global Modals */}
      {firebaseUser && isProfilePanelOpen && (
        <UserProfilePanel
          profile={firebaseUser}
          dealer={loggedInDealer}
          onClose={() => setIsProfilePanelOpen(false)}
          onSaved={handleProfileSaved}
        />
      )}

      <DealerSelector
        isOpen={isDealerSelectorOpen}
        onClose={() => setIsDealerSelectorOpen(false)}
        dealers={dealers}
        selectedDealerId={selectedDealer?.id || null}
        onSelectDealer={handleSelectDealer}
        initialSector={dealerSelectorInitialSector}
        hasCartItems={cartItems.length > 0}
        onClearCart={handleClearCart}
      />

      {/* High-Level Security Authentication Gate (Double Layer) */}
      {pendingRoleChange && (
        <SecurityGate
          role={pendingRoleChange}
          dealers={dealers}
          onSuccess={(selDealerId) => {
            setAuthorizedRoles(prev => ({ ...prev, [pendingRoleChange]: true }));
            setCurrentRole(pendingRoleChange);
            if (pendingRoleChange === 'admin') {
              setAdminSubTab('dashboard');
            } else if (pendingRoleChange === 'dealer') {
              setDealerSubTab('dashboard');
              if (selDealerId) {
                const matched = dealers.find(d => d.id === selDealerId);
                if (matched) {
                  setSelectedDealer(matched);
                }
              }
            }
            setPendingRoleChange(null);
          }}
          onCancel={() => {
            setPendingRoleChange(null);
          }}
        />
      )}

      {/* Dealer Login Modal */}
      {isDealerLoginOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4" id="dealer-login-modal">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-emerald-600 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LogIn className="w-5 h-5 stroke-[2.5]" />
                <h3 className="font-display font-bold text-sm">Kırtasiye Esnaf Bayi Girişi</h3>
              </div>
              <button 
                onClick={() => setIsDealerLoginOpen(false)} 
                className="text-emerald-100 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form 
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const email = (form.elements.namedItem('email') as HTMLInputElement).value;
                const password = (form.elements.namedItem('password') as HTMLInputElement).value;
                await handleLoginDealerSubmit(email, password);
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">E-posta Adresi *</label>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="ornek@kirtasiye.com"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:border-emerald-500 focus:bg-white focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Giriş Şifresi *</label>
                <input
                  name="password"
                  type="password"
                  required
                  placeholder="Şifrenizi girin..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:border-emerald-500 focus:bg-white focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <button
                type="button"
                onClick={(event) => handleForgotPassword(((event.currentTarget.form?.elements.namedItem('email')) as HTMLInputElement)?.value || '')}
                className="text-[11px] text-emerald-700 font-bold hover:text-emerald-800 cursor-pointer"
              >
                Şifremi unuttum
              </button>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsDealerLoginOpen(false)}
                  className="flex-1 bg-white hover:bg-slate-50 text-slate-700 font-bold border border-slate-200 py-2.5 rounded-xl text-xs cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold py-2.5 rounded-xl text-xs cursor-pointer transition-colors shadow-sm"
                >
                  Giriş Yap
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Interactive WAF & DDoS Shield System - Only visible and controllable in Admin view */}
      {currentRole === 'admin' && (
        <AntiDdosShield
          onTriggerUnderAttack={triggerUnderAttack}
          setTriggerUnderAttack={setTriggerUnderAttack}
        />
      )}

      {/* Footer Branding + Yasal Künye */}
      <footer className="bg-white border-t border-slate-200 py-8 text-xs text-slate-400 shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5 text-center md:text-left">
          <div className="md:flex md:justify-between md:items-start gap-6 space-y-5 md:space-y-0">
            <div className="md:flex-1 space-y-2">
              <p className="font-semibold text-slate-600 font-display">
                <p className="font-semibold text-slate-600 font-display">{storeSettings.storeName} E-Ticaret Platformu © 2026</p>
              </p>
              <p className="max-w-md mx-auto md:mx-0 leading-relaxed text-[10px]">
                Bu platform kırtasiye esnaflarını desteklemek için geliştirilmiş bir MVP simülatörüdür. Görsel tasarım ve ciro hakediş mantığı gerçek zamanlı çalışmaktadır.
              </p>
              <div className="pt-1 text-[10px] text-slate-500 space-y-1.5 leading-relaxed">
                <p className="text-slate-600 font-semibold text-[11px]">Yasal Bilgiler (Künye)</p>
                <p><span className="font-medium text-slate-500">Şirket Ünvanı:</span> Efektif Teknoloji İç ve Dış Ticaret Limited Şirketi</p>
                <p><span className="font-medium text-slate-500">Vergi Dairesi / Vergi No:</span> Topçumeydanı V.D. / 141 067 9040 0001</p>
                <p><span className="font-medium text-slate-500">MERSİS / Ticaret Sicil No:</span> 0141067990400001 / 23529</p>
                <p><span className="font-medium text-slate-500">Merkez Adres:</span> Yusufpaşa Mah. 886 Sk. Dünya İş Merkezi No: 15/C Eyyübiye / ŞANLIURFA</p>
                <p><span className="font-medium text-slate-500">Sabit Telefon:</span> 0507 249 76 46</p>
                <p><span className="font-medium text-slate-500">E-posta:</span> {storeSettings.contactEmail ? <a className="text-sky-600 hover:underline" href={`mailto:${storeSettings.contactEmail}`}>{storeSettings.contactEmail}</a> : 'bugurcagroup@gmail.com'}</p>
              </div>
            </div>
            <div className="md:w-72 space-y-3 md:pt-2">
                <p className="text-slate-600 font-semibold text-[11px]">Mevzuat ve Sözleşmeler</p>
              <nav className="grid grid-cols-1 gap-1.5 text-[10px]">
                    <a className="text-sky-600 hover:underline text-left" href="#mesafeli-satis">Mesafeli Satış Sözleşmesi</a>
                    <a className="text-sky-600 hover:underline text-left" href="#on-bilgilendirme">Ön Bilgilendirme Formu</a>
                    <a className="text-sky-600 hover:underline text-left" href="#iptal-iade">İptal ve İade Koşulları</a>
                <a className="text-sky-600 hover:underline text-left" href="#kvkk">KVKK Aydınlatma Metni</a>
                    <a className="text-sky-600 hover:underline text-left" href="#kargo-teslimat">Kargo ve Teslimat Koşulları</a>
              </nav>
              <div className="pt-1 text-[10px] text-slate-500 space-y-1">
                <p className="text-slate-600 font-semibold text-[11px]">İletişim</p>
                <p>{storeSettings.contactPhone ? <a className="text-sky-600 hover:underline" href={`tel:${storeSettings.contactPhone}`}>{storeSettings.contactPhone}</a> : 'Sabit telefon: Tedarik Edilecek'}</p>
                <p>{storeSettings.contactEmail ? <a className="text-sky-600 hover:underline" href={`mailto:${storeSettings.contactEmail}`}>{storeSettings.contactEmail}</a> : 'E-posta: Tedarik Edilecek'}</p>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
