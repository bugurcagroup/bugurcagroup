/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Store, User, CreditCard, Coins, ShoppingBag, FileText, Settings, ArrowRight, CheckCircle2, AlertCircle, RefreshCw, Check, Plus, Clock, AlertTriangle, Trash2, Share2, Copy, Download, QrCode, FileImage, Share, Edit, Package, Truck, Trash, Eye, Smartphone } from 'lucide-react';
import { Dealer, Order, Product, CommissionRequest } from '../types';
import QRCode from 'qrcode';
import OrderDetailsModal from './OrderDetailsModal';
import { uploadFile } from '../lib/storage';
import { copyTextToClipboard } from '../lib/browser';

interface DealerDashboardProps {
  dealers: Dealer[];
  categories?: string[];
  orders: Order[];
  products: Product[];
  onUpdateDealerProfile: (dealer: Dealer) => void | Promise<void>;
  onCreateOrder: (order: Omit<Order, 'id' | 'date' | 'commissionAmount'>) => void;
  activeSubTab: string; // 'dashboard', 'orders', 'products'
  setActiveSubTab: (tab: string) => void;
  commissionRate?: number;
  commissionRequests: CommissionRequest[];
  onSendCommissionRequest: (request: Omit<CommissionRequest, 'id' | 'status' | 'date'>) => void;
  selectedDealerId?: string;
  onSaveProduct?: (product: Product) => void;
  onSaveProductsBulk?: (products: Product[]) => void;
  onDeleteProduct?: (id: string) => void;
  onSaveOrdersList?: (orders: Order[]) => void;
  onUpdateOrder?: (orderId: string, changes: Partial<Order>) => Promise<void>;
}

export default function DealerDashboard({
  dealers,
  categories: sharedCategories = [],
  orders,
  products,
  onUpdateDealerProfile,
  onCreateOrder,
  activeSubTab,
  setActiveSubTab,
  commissionRate = 0,
  commissionRequests = [],
  onSendCommissionRequest,
  selectedDealerId: propSelectedDealerId,
  onSaveProduct,
  onSaveProductsBulk,
  onDeleteProduct,
  onSaveOrdersList,
  onUpdateOrder,
}: DealerDashboardProps) {
  // Simülatör için aktif bayilerden birini seçme
  const activeDealers = useMemo(() => {
    return dealers.filter(d => d.status === 'active');
  }, [dealers]);

  const [selectedDealerId, setSelectedDealerId] = useState<string>(propSelectedDealerId || activeDealers[0]?.id || '');

  // Keep state in sync with prop if it changes externally (like when logging in)
  React.useEffect(() => {
    if (propSelectedDealerId) {
      setSelectedDealerId(propSelectedDealerId);
    }
  }, [propSelectedDealerId]);

  // Şu an simüle edilen bayi nesnesi
  const currentDealer = useMemo(() => {
    return dealers.find(d => d.id === selectedDealerId) || activeDealers[0];
  }, [dealers, selectedDealerId, activeDealers]);

  // Bayi Profil Düzenleme State'leri
  const [owner, setOwner] = useState(currentDealer?.owner || '');
  const [email, setEmail] = useState(currentDealer?.email || '');
  const [phone, setPhone] = useState(currentDealer?.phone || '');
  const [address, setAddress] = useState(currentDealer?.address || '');
  const [bankName, setBankName] = useState(currentDealer?.bankName || '');
  const [accountHolder, setAccountHolder] = useState(currentDealer?.accountHolder || '');
  const [isProfileEditing, setIsProfileEditing] = useState(false);
  const [isProfileSaved, setIsProfileSaved] = useState(false);
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [profileSaveError, setProfileSaveError] = useState('');

  // Özel sayfa detayları ve paylaşımlar state'leri
  const [privateDetails, setPrivateDetails] = useState(currentDealer?.privateDetails || '');
  const [announcements, setAnnouncements] = useState<any[]>(currentDealer?.announcements || []);
  const [newAnnouncementTitle, setNewAnnouncementTitle] = useState('');
  const [newAnnouncementContent, setNewAnnouncementContent] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [safeOrigin, setSafeOrigin] = useState('https://bugurca.com');

  // Safe window.location.origin evaluation
  React.useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.location) {
        setSafeOrigin(window.location.origin || 'https://bugurca.com');
      }
    } catch (err) {
      console.warn('Failed to access window.location.origin safely inside DealerDashboard');
    }
  }, []);

  // Bayi QR Kodu Oluşturma State'i ve Fonksiyonları
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  React.useEffect(() => {
    if (currentDealer && safeOrigin) {
      const url = `${safeOrigin}?bayi=${currentDealer.id}`;
      QRCode.toDataURL(url, {
        width: 350,
        margin: 2,
        color: {
          dark: '#0f172a', // Slate 900
          light: '#ffffff'
        }
      })
      .then(urlData => {
        setQrDataUrl(urlData);
      })
      .catch(err => {
        console.error('QR Kodu oluşturulurken hata oluştu:', err);
      });
    }
  }, [currentDealer, safeOrigin]);

  const downloadQR = () => {
    if (!qrDataUrl || !currentDealer) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `${currentDealer.name.replace(/\s+/g, '_')}_QR_Kodu.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadFlyer = () => {
    if (!qrDataUrl || !currentDealer) return;
    
    // Create a high-quality Canvas for the flyer
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 850;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // 1. Background Gradient (Aesthetic Deep Slate to Blue-Grey)
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, '#0f172a'); // slate-900
    grad.addColorStop(1, '#020617'); // slate-950
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 2. Double border decoration
    ctx.strokeStyle = '#f59e0b'; // amber-500
    ctx.lineWidth = 8;
    ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);
    
    ctx.strokeStyle = '#38bdf8'; // sky-400
    ctx.lineWidth = 2;
    ctx.strokeRect(30, 30, canvas.width - 60, canvas.height - 60);

    // 3. Header Texts
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('YERLİ KIRTASİYE ESNAF MODELİ', canvas.width / 2, 85);
    
    ctx.fillStyle = '#f59e0b'; // amber-500
    ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
    ctx.fillText('MAHALLE KIRTASİYENİZİ DESTEKLEYİN', canvas.width / 2, 115);
    
    // 4. White central card for QR code
    ctx.fillStyle = '#ffffff';
    const rx = 100;
    const ry = 165;
    const rw = 400;
    const rh = 400;
    const radius = 24;
    ctx.beginPath();
    ctx.moveTo(rx + radius, ry);
    ctx.lineTo(rx + rw - radius, ry);
    ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + radius);
    ctx.lineTo(rx + rw, ry + rh - radius);
    ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - radius, ry + rh);
    ctx.lineTo(rx + radius, ry + rh);
    ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - radius);
    ctx.lineTo(rx, ry + radius);
    ctx.quadraticCurveTo(rx, ry, rx + radius, ry);
    ctx.closePath();
    ctx.fill();

    // Draw QR Code image in the center of the white card
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ctx.drawImage(img, 150, 215, 300, 300);
      
      // Scan instruction inside card
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 15px system-ui, -apple-system, sans-serif';
      ctx.fillText('KAMERANIZ İLE KODU TARAYIN', canvas.width / 2, 535);
      
      // 5. Dealer Details below card
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 30px system-ui, -apple-system, sans-serif';
      ctx.fillText(currentDealer.name, canvas.width / 2, 630);
      
      ctx.fillStyle = '#94a3b8'; // slate-400
      ctx.font = 'normal 15px system-ui, -apple-system, sans-serif';
      ctx.fillText(currentDealer.address || 'Mahalle Kırtasiyeniz', canvas.width / 2, 665);
      
      // Call to Action
      ctx.fillStyle = '#f59e0b'; // amber-500
      ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
      ctx.fillText('Doğrudan Sipariş Verin & Esnafı Destekleyin!', canvas.width / 2, 725);
      
      ctx.fillStyle = '#38bdf8'; // sky-400
      ctx.font = '14px monospace';
      ctx.fillText(`${safeOrigin}?bayi=${currentDealer.id}`, canvas.width / 2, 765);
      
      // Download the resulting canvas
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `${currentDealer.name.replace(/\s+/g, '_')}_Tanitici_Afiş.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };
    img.src = qrDataUrl;
  };

  const shareQR = async () => {
    if (!currentDealer) return;
    const url = `${safeOrigin}?bayi=${currentDealer.id}`;
    const shareText = `Merhaba! Kırtasiyemizin özel sipariş sayfasına buradan ulaşıp esnafımızı destekleyerek online alışveriş yapabilirsiniz: ${url}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${currentDealer.name} - Online Sipariş`,
          text: shareText,
          url: url,
        });
      } catch (err) {
        console.warn('Native share failed or canceled', err);
      }
    } else if (await copyTextToClipboard(url)) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  // Komisyon Çekim Simülasyonu State'leri
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState(0);
  const [iban, setIban] = useState(currentDealer?.iban || '');
  const [isWithdrawSuccess, setIsWithdrawSuccess] = useState(false);

  // Bayi panelinde görünecek tüm siparişler:
  // Müşterinin oluşturduğu siparişler (onay beklese de gösterilir — ödeme merkeze yapılmıştır)
  // Admin/merkez kaynaklı siparişler (her zaman görünür)
  // Yalnızca bayinin kendi oluşturduğu ve admin onayı bekleyenler ayrı sekmede
  const dealerOrders = useMemo(() => {
    if (!currentDealer) return [];
    return orders.filter(o =>
      o.dealerId === currentDealer.id &&
      !(o.createdBy === 'dealer' && o.adminApproved === false)
    );
  }, [orders, currentDealer]);

  // Bayinin Kendi Talebi Olan ve Onay Bekleyen Siparişler
  const pendingDealerOrders = useMemo(() => {
    if (!currentDealer) return [];
    return orders.filter(o => o.dealerId === currentDealer.id && o.createdBy === 'dealer' && o.adminApproved === false);
  }, [orders, currentDealer]);

  const dealerTotalSales = useMemo(() => dealerOrders
    .filter(order => order.status === 'completed' && order.adminApproved !== false)
    .reduce((total, order) => total + Number(order.totalPrice ?? 0), 0), [dealerOrders]);
  const dealerEarnedCommission = useMemo(() => dealerOrders
    .filter(order => order.status === 'completed' && order.adminApproved !== false && !order.commissionVoided)
    .reduce((total, order) => total + Number(order.commissionAmount ?? 0), 0), [dealerOrders]);

  // Bayinin Kendi Komisyon Talepleri
  const myRequests = useMemo(() => {
    if (!currentDealer) return [];
    return commissionRequests.filter(r => r.dealerId === currentDealer.id);
  }, [commissionRequests, currentDealer]);

  const totalPaidCommissions = useMemo(() => {
    return myRequests
      .filter(r => r.status === 'approved')
      .reduce((acc, r) => acc + Number(r.amount ?? 0), 0);
  }, [myRequests]);

  const pendingCommissionAmount = useMemo(() => {
    return myRequests
      .filter(r => r.status === 'pending')
      .reduce((acc, r) => acc + Number(r.amount ?? 0), 0);
  }, [myRequests]);

  const withdrawableCommission = useMemo(() => {
    return Math.max(
      0,
      dealerEarnedCommission - totalPaidCommissions - pendingCommissionAmount
    );
  }, [dealerEarnedCommission, totalPaidCommissions, pendingCommissionAmount]);

  // Yeni Sipariş Talebi Gönder State'leri
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');
  const [packageType, setPackageType] = useState<'single' | 'dozen' | 'box'>('single');
  const [packageQuantity, setPackageQuantity] = useState<number>(1);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [isOrderRequestSuccess, setIsOrderRequestSuccess] = useState(false);

  const getMultiplier = (type: 'single' | 'dozen' | 'box') => {
    if (type === 'dozen') return 12;
    if (type === 'box') return 48;
    return 1;
  };

  const totalUnitsCalculated = packageQuantity * getMultiplier(packageType);

  const handleNewOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || packageQuantity <= 0) {
      alert('Lütfen geçerli bir ürün ve miktar seçin.');
      return;
    }

    const selectedProduct = products.find(p => p.id === selectedProductId);
    if (!selectedProduct) {
      alert('Ürün bulunamadı.');
      return;
    }

    const multiplier = getMultiplier(packageType);
    const totalUnits = packageQuantity * multiplier;
    const pkgLabel = packageType === 'dozen' ? 'Düzine' : packageType === 'box' ? 'Koli' : 'Adet';

    // Sipariş talebi oluştur (adminApproved: false, createdBy: 'dealer')
    onCreateOrder({
      dealerId: currentDealer.id,
      dealerName: currentDealer.name,
      customerName: clientName || 'Bayi Stok Siparişi',
      customerEmail: currentDealer.email,
      customerPhone: clientPhone || currentDealer.phone,
      items: [
        {
          productId: selectedProduct.id,
          name: `${selectedProduct.name} (${packageQuantity} ${pkgLabel})`,
          quantity: totalUnits,
          price: selectedProduct.price
        }
      ],
      totalPrice: selectedProduct.price * totalUnits,
      status: 'pending',
      createdBy: 'dealer',
      adminApproved: false,
      shippingCompany: 'Merkez Kargo',
      shippingTrackingNumber: '',
      shippingAddress: clientAddress || currentDealer.address,
      shippingCity: currentDealer.city,
      shippingDistrict: currentDealer.district,
      shippingReceiver: clientName || currentDealer.owner,
      shippingPhone: clientPhone || currentDealer.phone,
      shippingStatus: 'preparing'
    });

    setIsOrderRequestSuccess(true);
    setTimeout(() => {
      setIsNewOrderModalOpen(false);
      setIsOrderRequestSuccess(false);
      setClientName('');
      setClientPhone('');
      setClientAddress('');
      setPackageQuantity(1);
      setPackageType('single');
    }, 2500);
  };

  // Sync profile fields when switching dealers
  React.useEffect(() => {
    if (currentDealer) {
      setOwner(currentDealer.owner);
      setEmail(currentDealer.email);
      setPhone(currentDealer.phone);
      setAddress(currentDealer.address);
      setBankName(currentDealer.bankName || '');
      setAccountHolder(currentDealer.accountHolder || '');
      setIban(currentDealer.iban || '');
      setPrivateDetails(currentDealer.privateDetails || '');
      setAnnouncements(currentDealer.announcements || []);
      setIsProfileSaved(false);
      setIsProfileEditing(false);
    }
  }, [currentDealer]);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentDealer) return;

    const updatedDealer: Dealer = {
      ...currentDealer,
      owner,
      email,
      phone,
      address,
      bankName,
      accountHolder,
      iban,
      privateDetails,
      announcements,
    };

    setIsProfileSaving(true);
    setProfileSaveError('');
    setIsProfileSaved(false);
    try {
      await onUpdateDealerProfile(updatedDealer);
      setIsProfileEditing(false);
      setIsProfileSaved(true);
      setTimeout(() => setIsProfileSaved(false), 3000);
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      setProfileSaveError(message.includes('permission') || message.includes('Permission')
        ? 'Banka bilgileri kaydedilemedi. Firebase Console üzerinde güncel firestore.rules dosyasını yayınlayın ve users/{UID} belgesinde role alanının "bayi" olduğunu kontrol edin.'
        : message || 'Profil bilgileri kaydedilemedi.');
    } finally {
      setIsProfileSaving(false);
    }
  };

  // Dealer Custom Product States
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productFormMode, setProductFormMode] = useState<'add' | 'edit'>('add');
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  
  const [prodName, setProdName] = useState('');
  const [prodCategory, setProdCategory] = useState('Kalemler & Yazım Gereçleri');
  const [prodPrice, setProdPrice] = useState(0);
  const [prodDescription, setProdDescription] = useState('');
  const [prodBrand, setProdBrand] = useState('');
  const [prodStock, setProdStock] = useState(10);
  const [prodDozenQuantity, setProdDozenQuantity] = useState(12);
  const [prodDozenPrice, setProdDozenPrice] = useState(0);
  const [prodBoxQuantity, setProdBoxQuantity] = useState(0);
  const [prodBoxPrice, setProdBoxPrice] = useState(0);
  const [prodImage, setProdImage] = useState('https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3');

  // New features for bulk upload & unlimited mobile device uploads:
  const [activeProductAddMode, setActiveProductAddMode] = useState<'single' | 'bulk'>('single');
  const [mobileSessionCode, setMobileSessionCode] = useState<string>('');
  const [mobileQrDataUrl, setMobileQrDataUrl] = useState<string>('');
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [isPollingMobile, setIsPollingMobile] = useState<boolean>(false);
  const [imageInputMethod, setImageInputMethod] = useState<'upload' | 'phone' | 'url'>('upload');
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [imageUploadStatus, setImageUploadStatus] = useState('');

  interface BulkProductInput {
    id: string;
    name: string;
    category: string;
    price: number;
    brand: string;
    stock: number;
    dozenQuantity: number;
    dozenPrice: number;
    boxQuantity: number;
    boxPrice: number;
    description: string;
    image: string;
  }
  const [bulkRows, setBulkRows] = useState<BulkProductInput[]>([
    { id: '1', name: '', category: 'Kalemler & Yazım Gereçleri', price: 0, brand: '', stock: 10, dozenQuantity: 12, dozenPrice: 0, boxQuantity: 0, boxPrice: 0, description: '', image: '' }
  ]);
  const [pastedDataText, setPastedDataText] = useState<string>('');
  const [showPasteBox, setShowPasteBox] = useState<boolean>(false);

  // Generate QR code for mobile upload
  React.useEffect(() => {
    if (isProductModalOpen && mobileSessionCode && safeOrigin) {
      const uploadUrl = `${safeOrigin}/mobile-upload?code=${mobileSessionCode}`;
      QRCode.toDataURL(uploadUrl, { width: 180, margin: 1 })
        .then(url => {
          setMobileQrDataUrl(url);
        })
        .catch(err => console.error('Failed to generate mobile QR code', err));
    }
  }, [isProductModalOpen, mobileSessionCode, safeOrigin]);

  // Mobil fotoğraf aktarımı için statik Hosting üzerinde sunucu pollingi kullanılmaz.
  React.useEffect(() => {
    if (!isProductModalOpen || !mobileSessionCode) {
      setIsPollingMobile(false);
      setUploadedPhotos([]);
    }
  }, [isProductModalOpen, mobileSessionCode]);

  const handleLocalImageUpload = async (file: File, index?: number) => {
    setIsImageUploading(true);
    setImageUploadStatus('Görsel optimize ediliyor...');
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
      const imageUrl = await uploadFile(`products/${currentDealer?.id || 'dealer'}/${Date.now()}-${safeName}`, file, {
        onStatus: status => setImageUploadStatus(status === 'optimizing' ? 'Görsel optimize ediliyor...' : 'Optimize edilen görsel yükleniyor...'),
      });
      if (index !== undefined) {
        setBulkRows(prev => prev.map((row, idx) => idx === index ? { ...row, image: imageUrl } : row));
      } else {
        setProdImage(imageUrl);
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Görsel yüklenemedi.');
    } finally {
      setIsImageUploading(false);
      setImageUploadStatus('');
    }
  };

  const handleMobilePhotoSelect = async (photo: string, index?: number) => {
    const response = await fetch(photo);
    const blob = await response.blob();
    const file = new File([blob], `mobile-${Date.now()}.webp`, { type: blob.type || 'image/webp' });
    await handleLocalImageUpload(file, index);
  };

  // Parse excel copy-pasted TSV or CSV
  const handleParsePastedData = () => {
    if (!pastedDataText.trim()) return;

    const lines = pastedDataText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const parsedRows: BulkProductInput[] = lines.map((line, idx) => {
      let parts = line.split('\t');
      if (parts.length < 2) parts = line.split(';');
      if (parts.length < 2) parts = line.split(',');

      const name = parts[0] || '';
      const priceVal = parts[1] ? parseFloat(parts[1].replace(/[^\d.,]/g, '').replace(',', '.')) : 0;
      const category = parts[2] || 'Kalemler & Yazım Gereçleri';
      const brand = parts[3] || currentDealer?.name || '';
      const stockVal = parts[4] ? parseInt(parts[4].replace(/[^\d]/g, '')) : 10;
      const description = parts[5] || '';
      const dozenQuantity = parts[6] ? parseInt(parts[6].replace(/[^\d]/g, '')) : 12;
      const dozenPrice = parts[7] ? parseFloat(parts[7].replace(/[^\d.,]/g, '').replace(',', '.')) : 0;
      const boxQuantity = parts[8] ? parseInt(parts[8].replace(/[^\d]/g, '')) : 0;
      const boxPrice = parts[9] ? parseFloat(parts[9].replace(/[^\d.,]/g, '').replace(',', '.')) : 0;

      return {
        id: `bulk-${Date.now()}-${idx}`,
        name,
        category,
        price: isNaN(priceVal) ? 0 : priceVal,
        brand,
        stock: isNaN(stockVal) ? 10 : stockVal,
        dozenQuantity: isNaN(dozenQuantity) ? 12 : dozenQuantity,
        dozenPrice: isNaN(dozenPrice) ? 0 : dozenPrice,
        boxQuantity: isNaN(boxQuantity) ? 0 : boxQuantity,
        boxPrice: isNaN(boxPrice) ? 0 : boxPrice,
        description,
        image: ''
      };
    });

    setBulkRows(parsedRows);
    setShowPasteBox(false);
    setPastedDataText('');
    alert(`${parsedRows.length} adet ürün başarıyla içe aktarıldı!`);
  };

  const addBulkRow = () => {
    setBulkRows(prev => [
      ...prev,
      {
        id: `bulk-row-${Date.now()}-${prev.length}`,
        name: '',
        category: 'Kalemler & Yazım Gereçleri',
        price: 0,
        brand: currentDealer?.name || '',
        stock: 10,
        dozenQuantity: 12,
        dozenPrice: 0,
        boxQuantity: 0,
        boxPrice: 0,
        description: '',
        image: ''
      }
    ]);
  };

  const removeBulkRow = (index: number) => {
    if (bulkRows.length <= 1) return;
    setBulkRows(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleBulkFieldChange = (index: number, field: keyof BulkProductInput, value: any) => {
    setBulkRows(prev => prev.map((row, idx) => idx === index ? { ...row, [field]: value } : row));
  };

  // Filter products that belong to this dealer
  const dealerProducts = useMemo(() => {
    if (!currentDealer) return [];
    return products.filter(p => p.dealerId === currentDealer.id);
  }, [products, currentDealer]);

  const handleProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (activeProductAddMode === 'bulk') {
      // Bulk Product Save Flow
      const invalidRows = bulkRows.filter(row => !row.name.trim() || row.price <= 0);
      if (invalidRows.length > 0) {
        alert('Lütfen tüm satırlardaki ürün adlarını ve pozitif fiyat değerlerini doldurun.');
        return;
      }

      const productsToSave: Product[] = bulkRows.map((row, idx) => ({
        id: `prod-dlr-${Date.now()}-${idx}`,
        name: row.name,
        category: row.category,
        price: Number(row.price),
        brand: row.brand || currentDealer?.name || 'Özel Esnaf',
        description: row.description || 'Toplu eklenen esnaf ürünü',
        image: row.image || 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
        stock: Number(row.stock),
        dozenQuantity: row.dozenQuantity > 0 ? Number(row.dozenQuantity) : undefined,
        dozenPrice: row.dozenPrice > 0 ? Number(row.dozenPrice) : undefined,
        boxQuantity: row.boxQuantity > 0 ? Number(row.boxQuantity) : undefined,
        boxPrice: row.boxPrice > 0 ? Number(row.boxPrice) : undefined,
        dealerId: currentDealer.id,
        source: 'dealer'
      }));

      if (onSaveProductsBulk) {
        onSaveProductsBulk(productsToSave);
      } else if (onSaveProduct) {
        // Fallback: save individually
        productsToSave.forEach(p => onSaveProduct(p));
      } else {
        alert('Ürün kaydetme fonksiyonu bulunamadı.');
        return;
      }

      setIsProductModalOpen(false);
      alert(`${productsToSave.length} adet ürün kataloğunuza başarıyla toplu olarak eklendi!`);
      return;
    }

    // Single Product Save Flow
    if (!prodName.trim() || prodPrice <= 0) {
      alert('Lütfen geçerli ürün adı ve pozitif bir fiyat girin.');
      return;
    }
    if (!onSaveProduct) {
      alert('Ürün kaydetme fonksiyonu bulunamadı.');
      return;
    }

    const targetId = productFormMode === 'add' ? `prod-dlr-${Date.now()}` : (editingProductId || '');
    const newProduct: Product = {
      id: targetId,
      name: prodName,
      category: prodCategory,
      price: Number(prodPrice),
      brand: prodBrand || currentDealer.name,
      description: prodDescription || 'Özel esnaf ürünü',
      image: prodImage || 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
      stock: Number(prodStock),
      dozenQuantity: prodDozenQuantity > 0 ? Number(prodDozenQuantity) : undefined,
      dozenPrice: prodDozenPrice > 0 ? Number(prodDozenPrice) : undefined,
      boxQuantity: prodBoxQuantity > 0 ? Number(prodBoxQuantity) : undefined,
      boxPrice: prodBoxPrice > 0 ? Number(prodBoxPrice) : undefined,
      dealerId: currentDealer.id,
      source: 'dealer'
    };

    onSaveProduct(newProduct);
    setIsProductModalOpen(false);
    
    // Reset form
    setProdName('');
    setProdCategory('Kalemler & Yazım Gereçleri');
    setProdPrice(0);
    setProdDescription('');
    setProdBrand('');
    setProdStock(10);
    setProdDozenQuantity(12);
    setProdDozenPrice(0);
    setProdBoxQuantity(0);
    setProdBoxPrice(0);
    setProdImage('https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3');
    
    alert(`Ürün başarıyla ${productFormMode === 'add' ? 'eklendi' : 'güncellendi'}.`);
  };

  const openAddProductModal = () => {
    setProductFormMode('add');
    setEditingProductId(null);
    setProdName('');
    setProdCategory('Kalemler & Yazım Gereçleri');
    setProdPrice(0);
    setProdDescription('');
    setProdBrand(currentDealer?.name || '');
    setProdStock(10);
    setProdDozenQuantity(12);
    setProdDozenPrice(0);
    setProdBoxQuantity(0);
    setProdBoxPrice(0);
    setProdImage('https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3');
    
    // Reset bulk & mobile connection state
    setActiveProductAddMode('single');
    const newCode = `sess-${Math.floor(100000 + Math.random() * 900000)}`;
    setMobileSessionCode(newCode);
    setUploadedPhotos([]);
    setImageInputMethod('upload');
    setBulkRows([
      { id: '1', name: '', category: 'Kalemler & Yazım Gereçleri', price: 0, brand: currentDealer?.name || '', stock: 10, dozenQuantity: 12, dozenPrice: 0, boxQuantity: 0, boxPrice: 0, description: '', image: '' }
    ]);
    
    setIsProductModalOpen(true);
  };

  const openEditProductModal = (product: Product) => {
    setProductFormMode('edit');
    setEditingProductId(product.id);
    setProdName(product.name);
    setProdCategory(product.category);
    setProdPrice(product.price);
    setProdDescription(product.description);
    setProdBrand(product.brand);
    setProdStock(product.stock);
    setProdDozenQuantity(product.dozenQuantity || 12);
    setProdDozenPrice(product.dozenPrice || 0);
    setProdBoxQuantity(product.boxQuantity || 0);
    setProdBoxPrice(product.boxPrice || 0);
    setProdImage(product.image);

    // Reset bulk & mobile state for editing
    setActiveProductAddMode('single');
    const newCode = `sess-${Math.floor(100000 + Math.random() * 900000)}`;
    setMobileSessionCode(newCode);
    setUploadedPhotos([]);
    setImageInputMethod('url');

    setIsProductModalOpen(true);
  };

  const handleDeleteProductClick = (id: string) => {
    if (confirm('Bu ürünü kataloğunuzdan tamamen silmek istediğinize emin misiniz?')) {
      if (onDeleteProduct) {
        onDeleteProduct(id);
        alert('Ürün başarıyla silindi.');
      }
    }
  };

  // Order Management States
  const [selectedOrderToManage, setSelectedOrderToManage] = useState<Order | null>(null);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<Order | null>(null);
  const [manageShippingStatus, setManageShippingStatus] = useState<'preparing' | 'shipped' | 'delivered' | 'cancelled'>('preparing');
  const [manageShippingCompany, setManageShippingCompany] = useState('Yurtiçi Kargo');
  const [manageTrackingNumber, setManageTrackingNumber] = useState('');

  const openManageOrderModal = (order: Order) => {
    setSelectedOrderToManage(order);
    setManageShippingStatus(order.shippingStatus || 'preparing');
    setManageShippingCompany(order.shippingCompany || 'Yurtiçi Kargo');
    setManageTrackingNumber(order.shippingTrackingNumber || '');
  };

  const handleUpdateOrderShipping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderToManage) return;

    const nextStatus = manageShippingStatus === 'delivered' ? 'completed' as const : selectedOrderToManage.status;
    if (manageShippingStatus === 'shipped' && !manageTrackingNumber.trim()) {
      alert('Kargoya verildi durumunda takip numarası zorunludur.');
      return;
    }

    const changes: Partial<Order> = {
      shippingStatus: manageShippingStatus,
      shippingCompany: manageShippingCompany,
      shippingTrackingNumber: manageTrackingNumber.trim() || undefined,
      status: nextStatus,
    };

    try {
      if (onUpdateOrder) {
        await onUpdateOrder(selectedOrderToManage.id, changes);
      } else if (onSaveOrdersList) {
        const updatedOrders = orders.map(o =>
          o.id === selectedOrderToManage.id ? { ...o, ...changes } : o
        );
        onSaveOrdersList(updatedOrders);
      } else {
        alert('Sipariş güncelleme fonksiyonu bulunamadı.');
        return;
      }
      setSelectedOrderToManage(null);
      alert('Kargo ve sipariş bilgileri başarıyla güncellendi.');
    } catch {
      alert('Güncelleme sırasında bir hata oluştu. Lütfen tekrar deneyin.');
    }
  };

  const handleAddAnnouncement = () => {
    if (!newAnnouncementTitle.trim() || !newAnnouncementContent.trim()) {
      alert('Lütfen başlık ve içerik giriniz.');
      return;
    }
    const newAnn = {
      id: `ann-${Date.now()}`,
      title: newAnnouncementTitle,
      content: newAnnouncementContent,
      date: new Date().toISOString()
    };
    const updatedAnnouncements = [newAnn, ...announcements];
    setAnnouncements(updatedAnnouncements);
    setNewAnnouncementTitle('');
    setNewAnnouncementContent('');
    
    // Auto-save changes immediately!
    const updatedDealer: Dealer = {
      ...currentDealer,
      owner,
      email,
      phone,
      address,
      bankName,
      accountHolder,
      iban,
      privateDetails,
      announcements: updatedAnnouncements,
    };
    onUpdateDealerProfile(updatedDealer);
  };

  const handleRemoveAnnouncement = (annId: string) => {
    const updatedAnnouncements = announcements.filter(a => a.id !== annId);
    setAnnouncements(updatedAnnouncements);
    
    // Auto-save changes immediately!
    const updatedDealer: Dealer = {
      ...currentDealer,
      owner,
      email,
      phone,
      address,
      bankName,
      accountHolder,
      iban,
      privateDetails,
      announcements: updatedAnnouncements,
    };
    onUpdateDealerProfile(updatedDealer);
  };

  const handleWithdrawSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentDealer) return;
    if (withdrawAmount < 10 || withdrawAmount > withdrawableCommission) {
      alert(`Çekim tutarı 10,00 TL ile ${withdrawableCommission.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL arasında olmalıdır.`);
      return;
    }
    if (!iban.startsWith('TR') || iban.replace(/\s/g, '').length !== 26) {
      alert('Lütfen geçerli bir TR IBAN numarası girin (26 Karakter).');
      return;
    }
    if (!bankName.trim()) {
      alert('Lütfen Banka Adı giriniz.');
      return;
    }
    if (!accountHolder.trim()) {
      alert('Lütfen Alıcı Ad Soyad / Ünvan giriniz.');
      return;
    }

    // Komisyon Talebi Gönder
    onSendCommissionRequest({
      dealerId: currentDealer.id,
      dealerName: currentDealer.name,
      amount: withdrawAmount,
      bankName: bankName,
      accountHolder: accountHolder,
      iban: iban
    });

    setIsWithdrawSuccess(true);
  };

  const closeWithdrawModal = () => {
    setIsWithdrawModalOpen(false);
    setIsWithdrawSuccess(false);
    setWithdrawAmount(0);
    setIban(currentDealer?.iban || '');
  };

  if (!currentDealer) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h3 className="font-display font-bold text-lg text-slate-800">Aktif Bayi Bulunamadı</h3>
        <p className="text-slate-500 text-xs mt-1">Sistemde henüz aktif veya onaylanmış bir bayi bulunmuyor.</p>
        <span className="text-[11px] text-amber-600 font-semibold block mt-4">
          * Lütfen üst menüden "Yönetici" panelini açarak bekleyen bir bayiyi onaylayın.
        </span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8" id="dealer-dashboard-view">
      {/* Dealer Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 text-blue-700 p-3 rounded-2xl">
            <Store className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-display font-extrabold text-2xl text-slate-900 tracking-tight">
                {currentDealer.name}
              </h2>
              {currentDealer.sector && (
                <span className="bg-blue-50 text-blue-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md uppercase border border-blue-100 tracking-wide">
                  🏷️ {currentDealer.sector}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Bayi ID: <span className="font-mono text-slate-700">{currentDealer.id}</span> | Yetkili: {currentDealer.owner}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            id="dealer-subtab-dashboard"
            onClick={() => setActiveSubTab('dashboard')}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeSubTab === 'dashboard'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Finans & Bilgilerim
          </button>
          <button
            id="dealer-subtab-orders"
            onClick={() => setActiveSubTab('orders')}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeSubTab === 'orders'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Gelen Siparişler ({dealerOrders.length})
          </button>
          <button
            id="dealer-subtab-products"
            onClick={() => setActiveSubTab('products')}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeSubTab === 'products'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Ürün & Katalog Yönetimi ({dealerProducts.length})
          </button>
        </div>
      </div>

      {/* 1. FINANCIAL SUMMARY & PROFILE TAB */}
      {activeSubTab === 'dashboard' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" id="dealer-dashboard-main">
          {/* Financial Cards */}
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {/* Sales volume card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3 shadow-2xs">
                <span className="text-slate-400 text-[10px] font-bold tracking-wider uppercase block">TOPLAM SATIŞ (CİRO)</span>
                <p className="text-2xl font-extrabold text-slate-900 font-mono">
                  {dealerTotalSales.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL
                </p>
                <div className="bg-slate-50 rounded-xl p-2.5 flex justify-between items-center text-xs text-slate-500">
                  <span>Yönlendirilen Sipariş</span>
                  <span className="font-bold text-slate-800">{dealerOrders.length} Adet</span>
                </div>
              </div>

              {/* Commission balance card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3 shadow-2xs relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl"></div>
                <span className="text-slate-400 text-[10px] font-bold tracking-wider uppercase block">
                  BİRİKEN HAKEDİŞ BAKİYESİ
                </span>
                <p className="text-2xl font-extrabold text-amber-600 font-mono">
                  {withdrawableCommission.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL
                </p>
                <div className="text-[10px] text-slate-500 space-y-0.5 border-t border-slate-100 pt-1.5 font-medium">
                  <div className="flex justify-between">
                    <span>Ortak Havuz Bayi Payı:</span>
                    <span className="font-bold text-slate-700">%{currentDealer.commissionRate !== undefined ? currentDealer.commissionRate : commissionRate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Vitrin Yönetici Kesintisi:</span>
                    <span className="font-bold text-emerald-600">%{currentDealer.privateCommissionRate !== undefined ? currentDealer.privateCommissionRate : 5}</span>
                  </div>
                </div>

                <button
                  id="dealer-withdraw-commission-btn"
                  onClick={() => {
                    if (withdrawableCommission < 10) {
                      alert('Çekilebilecek en az 10,00 TL bakiyeniz bulunmamaktadır.');
                    } else {
                      setWithdrawAmount(Number(withdrawableCommission.toFixed(2)));
                      setIsWithdrawModalOpen(true);
                    }
                  }}
                  disabled={withdrawableCommission < 10}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2 rounded-xl text-[10px] flex items-center justify-center gap-1.5 transition-all shadow-xs disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed cursor-pointer"
                >
                  <CreditCard className="w-3.5 h-3.5" /> Komisyon Talebi Gönder
                </button>
              </div>

              {/* Total payout history card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3 shadow-2xs relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl"></div>
                <span className="text-slate-400 text-[10px] font-bold tracking-wider uppercase block">
                  TOPLAM ÖDEME GEÇMİŞİ
                </span>
                <p className="text-2xl font-extrabold text-emerald-600 font-mono">
                  {totalPaidCommissions.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL
                </p>
                <div className="bg-emerald-50 text-emerald-800 rounded-xl p-2.5 flex items-center gap-1.5 text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Ödenen Komisyon Talepleri</span>
                </div>
              </div>
            </div>

            {/* Business flow information block */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3 text-xs leading-relaxed text-slate-600 shadow-2xs">
              <h4 className="font-display font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                <Coins className="w-4.5 h-4.5 text-blue-600" />
                Bayi Kazanç Modeli Nasıl Çalışır?
              </h4>
              <p>
                Müşteri platformda ortak ürünlerden alışveriş yaparken sizi seçtiğinde, sipariş onaylandığı anda sistem otomatik olarak <strong>%{currentDealer.commissionRate !== undefined ? currentDealer.commissionRate : commissionRate} komisyonu</strong> hakediş bakiyenize ekler.
              </p>
              <p>
                Kendi eklediğiniz <strong>Özel Vitrin Ürünlerinizden</strong> satılan siparişlerde ise, sipariş tutarından sadece yönetici tarafından belirlenen <strong>%{currentDealer.privateCommissionRate !== undefined ? currentDealer.privateCommissionRate : 5} komisyon kesintisi</strong> yapılır. Kalan <strong>%{100 - (currentDealer.privateCommissionRate !== undefined ? currentDealer.privateCommissionRate : 5)} hakediş tutarı</strong> doğrudan sizin bakiyenize (Hakediş) yansır.
              </p>
              <p className="font-semibold text-slate-700">
                Tüm sipariş ödemeleri güvenli bir şekilde Merkez Havuz Hesabında toplanır. Sipariş teslim edilip onaylandıktan sonra biriken kazancınızı dilediğiniz zaman "Komisyon Talebi Gönder" butonuyla IBAN adresinize talep edebilirsiniz.
              </p>
            </div>

            {/* Commission Payout Request List */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-2xs">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h4 className="font-display font-bold text-slate-900 uppercase text-xs tracking-wider flex items-center gap-1.5">
                  <CreditCard className="w-4.5 h-4.5 text-amber-500" />
                  Komisyon Ödeme Talepleriniz
                </h4>
                <span className="bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full text-[10px]">
                  {myRequests.length} Talep
                </span>
              </div>

              {myRequests.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">
                  Henüz bir komisyon ödeme talebinde bulunmadınız.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto pr-1">
                  {myRequests.map((req) => (
                    <div key={req.id} className="py-3 flex justify-between items-center text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800">{req.amount.toFixed(2)} TL</span>
                          <span className="text-[10px] text-slate-400 font-mono">{req.id}</span>
                        </div>
                        <p className="text-[10px] text-slate-400">
                          {req.bankName} - {req.iban.slice(0, 6)}...{req.iban.slice(-4)}
                        </p>
                        <p className="text-[9px] text-slate-400">
                          {new Date(req.date).toLocaleDateString('tr-TR')} {new Date(req.date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div>
                        {req.status === 'pending' && (
                          <span className="bg-amber-50 text-amber-700 border border-amber-200/50 px-2 py-1 rounded-full text-[9px] font-bold flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-500" /> <span>Onay Bekliyor</span>
                          </span>
                        )}
                        {req.status === 'approved' && (
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/50 px-2 py-1 rounded-full text-[9px] font-bold flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-500" /> <span>Ödendi</span>
                          </span>
                        )}
                        {req.status === 'rejected' && (
                          <span className="bg-rose-50 text-rose-700 border border-rose-200/50 px-2 py-1 rounded-full text-[9px] font-bold flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 text-rose-500" /> <span>İptal Edildi</span>
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* QR CODE & SHARING CARD */}
            <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 border border-slate-200 rounded-2xl p-6 space-y-4 shadow-2xs relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl"></div>
              
              <div className="flex flex-col md:flex-row gap-6 items-center">
                {/* Dynamically Generated Real QR Code */}
                <div className="w-32 h-32 bg-white p-2 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center shrink-0 relative group">
                  {qrDataUrl ? (
                    <img 
                      src={qrDataUrl} 
                      alt="Bayi QR Kodu" 
                      className="w-full h-full object-contain rounded-lg transition-transform duration-200 group-hover:scale-105" 
                    />
                  ) : (
                    <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                  )}
                  {/* Small overlay badge */}
                  <span className="absolute -bottom-2 bg-amber-500 text-slate-950 text-[8px] font-extrabold px-2 py-0.5 rounded-full font-sans uppercase shadow-xs">
                    REAL QR
                  </span>
                </div>

                <div className="flex-1 space-y-3.5 text-center md:text-left w-full">
                  <div className="space-y-1">
                    <h4 className="font-display font-bold text-slate-900 text-sm tracking-wider uppercase flex items-center justify-center md:justify-start gap-1.5">
                      <QrCode className="w-4.5 h-4.5 text-amber-500" />
                      Bayi QR Kodu & Özel Sayfa Linki
                    </h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Özel sayfanızın linkini ve QR kodunu sosyal medyada, broşürlerinizde veya WhatsApp gruplarınızda paylaşarak doğrudan sipariş alabilirsiniz! QR kodunu indirmek ve tanıtım afişi oluşturmak için aşağıdaki butonları kullanabilirsiniz.
                    </p>
                  </div>

                  {/* Share Link Input with Copy button */}
                  <div className="flex items-center gap-1.5 max-w-md bg-white border border-slate-200 rounded-xl p-1 shadow-3xs mx-auto md:mx-0">
                    <span className="text-[10px] font-mono text-slate-500 pl-2 truncate select-all max-w-[150px] sm:max-w-[260px]">
                      {safeOrigin + '?bayi=' + currentDealer.id}
                    </span>
                    <button
                      id="dealer-copy-link-btn"
                      onClick={async () => {
                        if (await copyTextToClipboard(safeOrigin + '?bayi=' + currentDealer.id)) {
                          setCopiedLink(true);
                          setTimeout(() => setCopiedLink(false), 2000);
                        }
                      }}
                      className="ml-auto bg-slate-900 hover:bg-slate-800 text-white font-bold px-3 py-1.5 rounded-lg text-[10px] transition-all cursor-pointer flex items-center gap-1 shrink-0"
                    >
                      {copiedLink ? (
                        <span className="flex items-center gap-1">
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Kopyalandı!</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Copy className="w-3.5 h-3.5" />
                          <span>Kopyala</span>
                        </span>
                      )}
                    </button>
                  </div>

                  {/* Dynamic Action Buttons for Downloading & Sharing */}
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-1">
                    {/* Only QR download */}
                    <button
                      id="download-only-qr-btn"
                      onClick={downloadQR}
                      className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-3xs"
                      title="Sadece QR kodunu görsel (PNG) olarak indirir"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-600" />
                      <span>QR Kodunu İndir</span>
                    </button>

                    {/* Marketing Poster download */}
                    <button
                      id="download-poster-btn"
                      onClick={downloadFlyer}
                      className="bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-bold px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-sm shadow-amber-500/15"
                      title="Kırtasiyenizin adıyla hazır basılabilir afiş (A4 PNG) indirir"
                    >
                      <FileImage className="w-3.5 h-3.5" />
                      <span>Tanıtım Afişi İndir (A4)</span>
                    </button>

                    {/* Share Button */}
                    <button
                      id="native-share-qr-btn"
                      onClick={shareQR}
                      className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-sm shadow-blue-500/10"
                      title="Sistem paylaşım menüsünü açar veya kopyalar"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Hızlı Paylaş</span>
                    </button>
                  </div>

                  {/* Social media sharing quick links */}
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-1.5 pt-1 border-t border-slate-200/60">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mr-1">Sosyal Paylaşım:</span>
                    
                    {/* WhatsApp */}
                    <a
                      href={`https://api.whatsapp.com/send?text=${encodeURIComponent('Merhaba! Bizim mahalle kırtasiyesi özel sayfamızdan ürünlerimizi inceleyebilir ve sipariş verebilirsiniz: ' + safeOrigin + '?bayi=' + currentDealer.id)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/50 text-emerald-700 font-bold px-2.5 py-1 rounded-lg text-[10px] flex items-center gap-1 transition-all"
                    >
                      💬 WhatsApp
                    </a>
                    
                    {/* Facebook */}
                    <a
                      href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(safeOrigin + '?bayi=' + currentDealer.id)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-blue-50 hover:bg-blue-100 border border-blue-200/50 text-blue-700 font-bold px-2.5 py-1 rounded-lg text-[10px] flex items-center gap-1 transition-all"
                    >
                      📘 Facebook
                    </a>

                    {/* Twitter/X */}
                    <a
                      href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(safeOrigin + '?bayi=' + currentDealer.id)}&text=${encodeURIComponent('Kırtasiyemizin özel sayfasından doğrudan online sipariş verin!')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 font-bold px-2.5 py-1 rounded-lg text-[10px] flex items-center gap-1 transition-all"
                    >
                      🐦 Twitter/X
                    </a>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Profile & Custom Page Column */}
          <div className="lg:col-span-1 space-y-6">
            {/* Profile management */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-2xs">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-display font-bold text-sm text-slate-900 uppercase flex items-center gap-1.5">
                <Settings className="w-4.5 h-4.5 text-blue-600" />
                Bayi Profil Ayarları
              </h3>
              {!isProfileEditing && (
                <button
                  id="dealer-edit-profile-btn"
                  onClick={() => setIsProfileEditing(true)}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                >
                  Düzenle
                </button>
              )}
            </div>

            {isProfileSaved && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-3 text-xs font-semibold flex items-center gap-1.5 animate-scale">
                <Check className="w-4 h-4 text-emerald-600" /> <span>Profil ve banka bilgileriniz kaydedildi.</span>
              </div>
            )}
            {profileSaveError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-3 text-xs font-semibold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" /> <span>{profileSaveError}</span>
              </div>
            )}

            <form onSubmit={handleProfileSave} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Firma / Mağaza Adı</label>
                <input
                  type="text"
                  disabled
                  value={currentDealer.name}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-xs text-slate-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Şehir / İlçe</label>
                <input
                  type="text"
                  disabled
                  value={`${currentDealer.city} / ${currentDealer.district}`}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-xs text-slate-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Yetkili Adı Soyadı</label>
                <input
                  id="dealer-form-owner"
                  type="text"
                  disabled={!isProfileEditing}
                  value={owner}
                  onChange={e => setOwner(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Telefon Numarası</label>
                <input
                  id="dealer-form-phone"
                  type="text"
                  disabled={!isProfileEditing}
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">E-posta Adresi</label>
                <input
                  id="dealer-form-email"
                  type="email"
                  disabled={!isProfileEditing}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Detaylı Adres</label>
                <textarea
                  id="dealer-form-address"
                  disabled={!isProfileEditing}
                  rows={2}
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Banka Adı</label>
                <input
                  id="dealer-form-bankname"
                  type="text"
                  placeholder="örn. Ziraat Bankası"
                  disabled={!isProfileEditing}
                  value={bankName}
                  onChange={e => setBankName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Hesap Sahibi (Alıcı Adı)</label>
                <input
                  id="dealer-form-accholder"
                  type="text"
                  placeholder="Hesap sahibi adı"
                  disabled={!isProfileEditing}
                  value={accountHolder}
                  onChange={e => setAccountHolder(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">TR IBAN Numarası</label>
                <input
                  id="dealer-form-iban"
                  type="text"
                  placeholder="TR..."
                  disabled={!isProfileEditing}
                  value={iban}
                  onChange={e => setIban(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>

              {isProfileEditing && (
                <div className="flex gap-2">
                  <button
                    id="dealer-cancel-profile-btn"
                    type="button"
                    onClick={() => {
                      setIsProfileEditing(false);
                      setOwner(currentDealer.owner);
                      setEmail(currentDealer.email);
                      setPhone(currentDealer.phone);
                      setAddress(currentDealer.address);
                      setBankName(currentDealer.bankName || '');
                      setAccountHolder(currentDealer.accountHolder || '');
                      setIban(currentDealer.iban || '');
                    }}
                    className="flex-1 bg-white border border-slate-200 text-slate-700 py-1.5 rounded-lg text-xs cursor-pointer"
                  >
                    Vazgeç
                  </button>
                  <button
                    id="dealer-save-profile-btn"
                    type="submit"
                    disabled={isProfileSaving}
                    className="flex-1 bg-blue-600 text-white font-semibold py-1.5 rounded-lg text-xs cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-wait"
                  >
                    {isProfileSaving ? 'Kaydediliyor...' : 'Kaydet'}
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* CARD 2: CUSTOM PAGE DETAILS & ANNOUNCEMENTS */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5 shadow-2xs" id="dealer-custom-page-manager">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="font-display font-bold text-sm text-slate-900 uppercase flex items-center gap-1.5">
                <Store className="w-4.5 h-4.5 text-amber-500" />
                Bayi Özel Sayfa Yönetimi
              </h3>
              <p className="text-[10px] text-slate-400 mt-1 font-medium">
                Özel sayfanızda müşterilerinize görünecek olan bilgileri ve paylaşımları buradan yönetin.
              </p>
            </div>

            {/* 1. Detaylı Özel Bilgiler */}
            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Detaylı Özel Bilgiler</label>
              <textarea
                id="dealer-private-details-textarea"
                rows={4}
                value={privateDetails}
                onChange={e => setPrivateDetails(e.target.value)}
                placeholder="Müşterilerinize kendinizi tanıtın, dükkanınızın tarihçesini, öne çıkan özelliklerini, aktif kampanyalarınızı veya çalışma saatlerinizi buraya yazabilirsiniz..."
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:border-amber-500 resize-none leading-relaxed"
              />
              <button
                id="dealer-save-private-details-btn"
                onClick={() => {
                  const updatedDealer: Dealer = {
                    ...currentDealer,
                    owner,
                    email,
                    phone,
                    address,
                    bankName,
                    accountHolder,
                    iban,
                    privateDetails,
                    announcements,
                  };
                  onUpdateDealerProfile(updatedDealer);
                  alert('Özel bilgileriniz başarıyla güncellendi!');
                }}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 rounded-xl text-[10px] transition-all cursor-pointer shadow-xs animate-scale"
              >
                Özel Bilgileri Kaydet
              </button>
            </div>

            {/* 2. Özel Duyurular & Paylaşımlar */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Yeni Duyuru / Paylaşım Ekle</label>
              <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <input
                  type="text"
                  placeholder="Paylaşım Başlığı..."
                  value={newAnnouncementTitle}
                  onChange={e => setNewAnnouncementTitle(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:border-amber-500"
                />
                <textarea
                  placeholder="Paylaşım İçeriği (Duyuru, kampanya, yeni gelen ürünler vb.)..."
                  rows={2}
                  value={newAnnouncementContent}
                  onChange={e => setNewAnnouncementContent(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:border-amber-500 resize-none"
                />
                <button
                  id="dealer-add-announcement-btn"
                  onClick={handleAddAnnouncement}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-1.5 rounded-lg text-[10px] transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Paylaşımı Yayınla
                </button>
              </div>

              {/* Aktif Paylaşımlar Listesi */}
              <div className="space-y-2">
                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Aktif Paylaşımlarınız ({announcements.length})</span>
                {announcements.length === 0 ? (
                  <p className="text-[10px] text-slate-400 text-center py-2 italic">Henüz bir paylaşım yapmadınız.</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {announcements.map((ann: any) => (
                      <div key={ann.id} className="bg-white border border-slate-100 rounded-xl p-2.5 space-y-1 relative group hover:border-slate-200 transition-all">
                        <button
                          onClick={() => handleRemoveAnnouncement(ann.id)}
                          className="absolute top-2 right-2 text-rose-400 hover:text-rose-600 p-0.5 rounded hover:bg-rose-50 cursor-pointer"
                          title="Paylaşımı Sil"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <h4 className="font-bold text-slate-800 text-[11px] pr-6">{ann.title}</h4>
                        <p className="text-slate-500 text-[10px] leading-normal">{ann.content}</p>
                        <span className="text-[8px] text-slate-400 font-mono block">
                          {new Date(ann.date).toLocaleDateString('tr-TR')} {new Date(ann.date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    )}

      {/* 2. ORDER LIST LOGS TAB */}
      {activeSubTab === 'orders' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-2xs" id="dealer-orders-list">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-display font-bold text-sm text-slate-900 tracking-tight uppercase flex items-center gap-1.5">
                  <ShoppingBag className="w-5 h-5 text-blue-600" />
                  Sizin Üzerinizden Geçen Siparişler ({dealerOrders.length} Sipariş)
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Müşteriler tarafından onaylanmış veya admin tarafından yönlendirilmiş aktif siparişleriniz.
                </p>
              </div>
              <button
                id="dealer-new-order-request-btn"
                onClick={() => {
                  setSelectedProductId(products[0]?.id || '');
                  setIsNewOrderModalOpen(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Yeni Sipariş Talebi Gönder
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs" id="dealer-orders-table">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
                    <th className="p-3">Sipariş ID</th>
                    <th className="p-3">Müşteri Detayı</th>
                    <th className="p-3">Tarih</th>
                    <th className="p-3">Alınan Ürünler</th>
                    <th className="p-3 text-right">Sipariş Tutarı</th>
                    <th className="p-3 text-right">Kazanılan Net Komisyon ({currentDealer.commissionRate !== undefined ? `%${currentDealer.commissionRate}` : `%${commissionRate}`})</th>
                    <th className="p-3 text-right">Merkez Payı / Kesinti</th>
                    <th className="p-3 text-right font-semibold">Süreç / Kargo Durumu</th>
                    <th className="p-3 text-right font-semibold">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                  {dealerOrders.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-6 text-center text-slate-400 text-xs">Müşteriler henüz sizi seçerek bir sipariş vermedi.</td>
                    </tr>
                  ) : (
                    [...dealerOrders].reverse().map(order => (
                      <tr id={`dealer-order-row-${order.id}`} key={order.id} onClick={() => setSelectedOrderDetail(order)} className="hover:bg-slate-50/50 cursor-pointer" title="Detaylı bilgi için tıklayın">
                        <td className="p-3 font-bold text-slate-900">
                          <span className="flex items-center gap-1">
                            {order.id}
                            {order.createdBy === 'admin' && (
                              <span className="bg-purple-100 text-purple-700 text-[9px] px-1.5 py-0.2 rounded font-bold" title="Admin tarafından doğrudan gönderilen sipariş">
                                Merkezden
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="font-bold text-slate-800 block">{order.customerName}</span>
                          <span className="text-[10px] text-slate-400">{order.customerPhone}</span>
                        </td>
                        <td className="p-3 text-slate-400">{new Date(order.date).toLocaleDateString('tr-TR')}</td>
                        <td className="p-3 max-w-[200px] truncate" title={order.items.map(i => `${i.name} (${i.quantity})`).join(', ')}>
                          {order.items.map(i => `${i.name} (x${i.quantity})`).join(', ')}
                        </td>
                        <td className="p-3 text-right font-mono text-slate-900 font-semibold">
                          {Number(order.totalPrice ?? 0).toFixed(2)} TL
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-600">
                          <div className="flex flex-col items-end">
                            <span>+{Number(order.commissionAmount ?? 0).toFixed(2)} TL</span>
                            {order.isFromDealerPage && (
                              <span className="text-[8px] bg-amber-50 text-amber-700 px-1.5 py-0.2 rounded font-bold uppercase mt-0.5 whitespace-nowrap">Vitrin Satışı</span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-indigo-600">
                          <div className="flex flex-col items-end">
                            <span className="text-rose-600">
                              -{(order.adminCommissionAmount ?? 0).toFixed(2)} TL
                            </span>
                            {order.isFromDealerPage ? (
                              <span className="text-[8px] bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded font-bold uppercase mt-0.5 whitespace-nowrap">Vitrin Kesintisi</span>
                            ) : (
                              <span className="text-[8px] bg-slate-50 text-slate-500 px-1.5 py-0.2 rounded font-bold uppercase mt-0.5 whitespace-nowrap">Ortak Havuz</span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                            order.shippingStatus === 'delivered' ? 'bg-emerald-50 text-emerald-700' :
                            order.shippingStatus === 'shipped' ? 'bg-purple-50 text-purple-700' :
                            'bg-blue-50 text-blue-700'
                          }`}>
                            {order.shippingStatus === 'delivered' ? 'Teslim Edildi' :
                             order.shippingStatus === 'shipped' ? `Sevk Edildi (${order.shippingCompany || 'Yurtiçi Kargo'})` :
                             order.shippingStatus === 'cancelled' ? 'İptal / İade' :
                             'Hazırlanıyor'}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5 ml-auto">
                            <button
                              onClick={(e) => { e.stopPropagation(); setSelectedOrderDetail(order); }}
                              className="bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-700 text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
                              title="Sipariş Detaylarını Görüntüle"
                            >
                              <Eye className="w-3.5 h-3.5" /> Detay
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); openManageOrderModal(order); }}
                              className="bg-slate-100 hover:bg-amber-50 hover:text-amber-600 text-slate-700 text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
                              title="Kargo ve Sipariş Sürecini Yönet"
                            >
                              <Truck className="w-3.5 h-3.5" /> Yönet
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pending Requests Section */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-2xs">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="font-display font-bold text-sm text-slate-900 tracking-tight uppercase flex items-center gap-1.5">
                <Clock className="w-5 h-5 text-amber-500" />
                Merkez Onayı Bekleyen Sipariş Talepleriniz ({pendingDealerOrders.length} Talep)
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Kendi stoğunuz veya müşterileriniz adına oluşturup Merkeze (Admin) gönderdiğiniz, onay bekleyen siparişler. Admin onayından sonra bakiye ve süreçlerinize yansıyacaktır.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
                    <th className="p-3">Talep ID</th>
                    <th className="p-3">Alıcı / Detay</th>
                    <th className="p-3">Tarih</th>
                    <th className="p-3">Ürün Detayı</th>
                    <th className="p-3 text-right">Toplam Tutar</th>
                    <th className="p-3 text-right">Tahmini Komisyon</th>
                    <th className="p-3 text-right">Durum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                  {pendingDealerOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-400 text-xs">Onay bekleyen sipariş talebiniz bulunmamaktadır.</td>
                    </tr>
                  ) : (
                    [...pendingDealerOrders].reverse().map(order => (
                      <tr key={order.id} onClick={() => setSelectedOrderDetail(order)} className="hover:bg-slate-50/50 cursor-pointer" title="Detaylı bilgi için tıklayın">
                        <td className="p-3 font-bold text-slate-900">{order.id}</td>
                        <td className="p-3">
                          <span className="font-bold text-slate-800 block">{order.customerName}</span>
                          <span className="text-[10px] text-slate-400">{order.customerPhone}</span>
                        </td>
                        <td className="p-3 text-slate-400">{new Date(order.date).toLocaleDateString('tr-TR')}</td>
                        <td className="p-3">
                          {order.items.map(i => `${i.name} (x${i.quantity})`).join(', ')}
                        </td>
                        <td className="p-3 text-right font-mono text-slate-900 font-semibold">
                          {Number(order.totalPrice ?? 0).toFixed(2)} TL
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-slate-400">
                          {Number(order.commissionAmount ?? 0).toFixed(2)} TL
                        </td>
                        <td className="p-3 text-right">
                          <span className="bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 animate-pulse">
                            <Clock className="w-3 h-3" /> Admin Onayı Bekliyor
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. PRODUCT & CATALOG MANAGEMENT TAB */}
      {activeSubTab === 'products' && (
        <div className="space-y-6" id="dealer-products-tab">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-2xs">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-display font-bold text-sm text-slate-900 tracking-tight uppercase flex items-center gap-1.5">
                  <Package className="w-5 h-5 text-blue-600" />
                  Kendi Ürünleriniz & Katalog Yönetimi ({dealerProducts.length} Ürün)
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Müşteriler mağazanızı seçtiğinde veya özel esnaf sayfanızda görüntülenecek ürün kataloğunuzu yönetin.
                </p>
              </div>
              <button
                id="dealer-add-product-btn"
                onClick={openAddProductModal}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Yeni Ürün Tanımla
              </button>
            </div>

            {dealerProducts.length === 0 ? (
              <div className="text-center py-12 space-y-4 border-2 border-dashed border-slate-100 rounded-xl">
                <div className="bg-slate-50 text-slate-400 p-4 rounded-full w-14 h-14 flex items-center justify-center mx-auto">
                  <Package className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-slate-800">Henüz Kayıtlı Ürününüz Yok</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Kataloğunuza eklediğiniz ürünler, müşteriler mağazanızı seçtiklerinde görüntülenebilir ve doğrudan sepete eklenebilir.
                  </p>
                </div>
                <button
                  onClick={openAddProductModal}
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all cursor-pointer"
                >
                  İlk Ürününüzü Ekleyin
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {dealerProducts.map(product => (
                  <div
                    key={product.id}
                    id={`dealer-product-card-${product.id}`}
                    className="bg-white border border-slate-100 rounded-2xl overflow-hidden hover:border-slate-200 hover:shadow-xs transition-all flex flex-col h-full"
                  >
                    <div className="relative aspect-video bg-slate-50 overflow-hidden">
                      <img
                        src={product.image}
                        alt={product.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute top-2 left-2 bg-blue-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-md uppercase">
                        {product.category}
                      </span>
                    </div>
                    <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-400 font-bold block">{product.brand}</span>
                        <h4 className="font-bold text-slate-800 text-xs line-clamp-2" title={product.name}>
                          {product.name}
                        </h4>
                        <p className="text-[10px] text-slate-400 line-clamp-2 font-medium">
                          {product.description}
                        </p>
                      </div>
                      <div className="grid grid-cols-3 gap-1 text-[9px] font-semibold text-slate-500">
                        <span className="bg-slate-50 border border-slate-100 rounded-md px-1 py-1 text-center">Adet<br /><strong className="text-slate-900">{Number(product.price ?? 0).toFixed(2)} TL</strong></span>
                        {product.dozenQuantity || product.dozenPrice ? <span className="bg-blue-50 border border-blue-100 rounded-md px-1 py-1 text-center">Düzine ({product.dozenQuantity || 12} adet)<br /><strong className="text-blue-900">{Number(product.dozenPrice ?? product.price * (product.dozenQuantity || 12)).toFixed(2)} TL</strong></span> : <span />}
                        {product.boxQuantity || product.boxPrice ? <span className="bg-amber-50 border border-amber-100 rounded-md px-1 py-1 text-center">Koli ({product.boxQuantity || 1} adet)<br /><strong className="text-amber-900">{Number(product.boxPrice ?? product.price * (product.boxQuantity || 1)).toFixed(2)} TL</strong></span> : <span />}
                      </div>
                      <div className="pt-2 border-t border-slate-50 flex items-center justify-between">
                        <div>
                          <span className="text-[9px] text-slate-400 block font-bold">KATALOG FİYATI</span>
                          <span className="font-mono font-extrabold text-sm text-slate-900">
                            {Number(product.price ?? 0).toFixed(2)} TL
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] text-slate-400 block font-bold">STOK</span>
                          <span className={`text-[10px] font-bold ${product.stock > 5 ? 'text-slate-600' : 'text-amber-600'}`}>
                            {product.stock} Adet
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="p-3 bg-slate-50 border-t border-slate-100 flex gap-2">
                      <button
                        onClick={() => openEditProductModal(product)}
                        className="flex-1 bg-white hover:bg-blue-50 hover:text-blue-600 text-slate-700 text-[10px] font-bold py-1.5 px-3 rounded-lg border border-slate-200 hover:border-blue-200 transition-all flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Edit className="w-3 h-3" /> Düzenle
                      </button>
                      <button
                        onClick={() => handleDeleteProductClick(product.id)}
                        className="bg-white hover:bg-rose-50 hover:text-rose-600 text-slate-400 hover:border-rose-200 p-1.5 rounded-lg border border-slate-200 transition-all cursor-pointer"
                        title="Ürünü Sil"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* PRODUCT ADD/EDIT MODAL */}
      {isProductModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in" id="dealer-product-form-modal">
          <div className={`bg-white rounded-2xl w-full p-6 shadow-2xl border border-slate-100 relative max-h-[90vh] overflow-y-auto transition-all duration-300 ${activeProductAddMode === 'bulk' && productFormMode === 'add' ? 'max-w-5xl' : 'max-w-lg'}`}>
            <button
              onClick={() => setIsProductModalOpen(false)}
              className="text-slate-400 hover:text-slate-600 p-1.5 bg-slate-50 hover:bg-slate-100 rounded-lg absolute top-4 right-4 cursor-pointer transition-colors"
            >
              Kapat
            </button>
            
            <form onSubmit={handleProductSubmit} className="space-y-5">
              <div className="text-center pb-3 border-b border-slate-100">
                <h3 className="font-display font-bold text-lg text-slate-900 flex items-center justify-center gap-1.5">
                  <Package className="w-5 h-5 text-blue-600" />
                  {productFormMode === 'add' ? 'Kataloğa Yeni Ürün Ekle' : 'Ürün Bilgilerini Düzenle'}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Kendi mağazanıza özel fiyat, stok ve görseller ile yeni ürünler tanımlayın.
                </p>
              </div>

              {/* Mode Selection Tabs (Only shown on Add) */}
              {productFormMode === 'add' && (
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setActiveProductAddMode('single')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      activeProductAddMode === 'single'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Tekli Ürün Ekle
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveProductAddMode('bulk')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      activeProductAddMode === 'bulk'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Toplu Ürün Ekle (Excel / CSV / Çoklu Satır)
                  </button>
                </div>
              )}

              {/* --- SINGLE PRODUCT FORM --- */}
              {activeProductAddMode === 'single' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Ürün Adı *</label>
                    <input
                      type="text"
                      required
                      value={prodName}
                      onChange={e => setProdName(e.target.value)}
                      placeholder="Örn: Pritt Yapıştırıcı Stick 22gr"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:border-blue-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Kategori *</label>
                    <select
                      value={prodCategory}
                      onChange={e => setProdCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:border-blue-500 focus:bg-white"
                    >
                      <option value="Kalemler & Yazım Gereçleri">Kalemler & Yazım Gereçleri</option>
                      <option value="Defterler & Bloknotlar">Defterler & Bloknotlar</option>
                      <option value="Ofis & Masaüstü">Ofis & Masaüstü</option>
                      <option value="Boyama & El Sanatları">Boyama & El Sanatları</option>
                      <option value="Çantalar & Aksesuarlar">Çantalar & Aksesuarlar</option>
                      <option value="Dosyalama & Arşivleme">Dosyalama & Arşivleme</option>
                      <option value="Gıda / Atıştırmalık">Gıda / Atıştırmalık</option>
                      <option value="Giyim / Tekstil">Giyim / Tekstil</option>
                      <option value="Teknoloji / Elektronik">Teknoloji / Elektronik</option>
                      <option value="Hediyelik Eşya / Diğer">Hediyelik Eşya / Diğer</option>
                      {sharedCategories.filter(category => !['Kalemler & Yazım Gereçleri', 'Defterler & Bloknotlar', 'Ofis & Masaüstü', 'Boyama & El Sanatları', 'Çantalar & Aksesuarlar', 'Dosyalama & Arşivleme', 'Gıda / Atıştırmalık', 'Giyim / Tekstil', 'Teknoloji / Elektronik', 'Hediyelik Eşya / Diğer'].includes(category)).map(category => <option key={category} value={category}>{category}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Marka / Üretici</label>
                    <input
                      type="text"
                      value={prodBrand}
                      onChange={e => setProdBrand(e.target.value)}
                      placeholder="Örn: Pritt"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:border-blue-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Fiyat (KDV Dahil, TL) *</label>
                    <input
                      type="number"
                      required
                      min="0.1"
                      step="0.01"
                      value={prodPrice || ''}
                      onChange={e => setProdPrice(Number(e.target.value))}
                      placeholder="Örn: 45.90"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:border-blue-500 focus:bg-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Başlangıç Stoğu *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={prodStock === undefined ? '' : prodStock}
                      onChange={e => setProdStock(Number(e.target.value))}
                      placeholder="Örn: 50"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:border-blue-500 focus:bg-white font-mono"
                    />
                  </div>

                  <div className="sm:col-span-2 bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-700">Satış Birimleri</span>
                      <span className="text-[10px] text-slate-400">Adet fiyatı yukarıdaki temel fiyattır</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <input value={prodDozenQuantity || ''} onChange={e => setProdDozenQuantity(Number(e.target.value))} type="number" min="1" placeholder="Düzine içi adet" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs" />
                      <input value={prodDozenPrice || ''} onChange={e => setProdDozenPrice(Number(e.target.value))} type="number" min="0" step="0.01" placeholder="Düzine fiyatı (TL)" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs" />
                      <input value={prodBoxQuantity || ''} onChange={e => setProdBoxQuantity(Number(e.target.value))} type="number" min="1" placeholder="Koli içi adet" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs" />
                      <input value={prodBoxPrice || ''} onChange={e => setProdBoxPrice(Number(e.target.value))} type="number" min="0" step="0.01" placeholder="Koli fiyatı (TL)" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs" />
                    </div>
                  </div>

                  {/* ADVANCED MULTI-DEVICE IMAGE COMPONENT */}
                  <div className="sm:col-span-2 border border-slate-100 bg-slate-50/50 p-4 rounded-2xl space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="block text-[11px] font-bold text-slate-700">Ürün Fotoğrafı / Görseli *</label>
                      <div className="flex gap-1.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                        <button
                          type="button"
                          onClick={() => setImageInputMethod('upload')}
                          className={`px-2 py-1 text-[10px] font-bold rounded-md transition-colors cursor-pointer ${
                            imageInputMethod === 'upload' ? 'bg-white text-slate-900 shadow-3xs' : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          Cihazdan Yükle
                        </button>
                        <button
                          type="button"
                          onClick={() => setImageInputMethod('phone')}
                          className={`px-2 py-1 text-[10px] font-bold rounded-md transition-colors cursor-pointer ${
                            imageInputMethod === 'phone' ? 'bg-white text-slate-900 shadow-3xs' : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          Sınırsız Telefondan Yükle
                        </button>
                        <button
                          type="button"
                          onClick={() => setImageInputMethod('url')}
                          className={`px-2 py-1 text-[10px] font-bold rounded-md transition-colors cursor-pointer ${
                            imageInputMethod === 'url' ? 'bg-white text-slate-900 shadow-3xs' : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          Görsel URL
                        </button>
                      </div>
                    </div>

                    {/* METHOD 1: LOCAL FILE UPLOAD (DRAG AND DROP) */}
                    {imageInputMethod === 'upload' && (
                      <div className="space-y-3">
                        <label className="border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer bg-white hover:bg-blue-50/5 transition-all text-center group">
                          <FileImage className="w-8 h-8 text-slate-400 group-hover:text-blue-500 transition-colors mb-1.5" />
                          <span className="text-xs font-bold text-slate-800">Cihazınızdan Fotoğraf Seçin</span>
                          <span className="text-[10px] text-slate-400 mt-0.5">Veya sürükleyip bırakın</span>
                          {isImageUploading && <span className="mt-1 flex items-center gap-1 text-[10px] font-bold text-blue-700"><RefreshCw className="h-3 w-3 animate-spin" /> {imageUploadStatus || 'Görsel işleniyor...'}</span>}
                          <input
                            type="file"
                            accept="image/*"
                            disabled={isImageUploading}
                            onChange={e => {
                              if (e.target.files && e.target.files[0]) {
                                void handleLocalImageUpload(e.target.files[0]);
                              }
                            }}
                            className="hidden"
                          />
                        </label>
                      </div>
                    )}

                    {/* METHOD 2: MULTI DEVICE PHONE UPLOAD (QR CONNECTIVITY) */}
                    {imageInputMethod === 'phone' && (
                      <div className="space-y-3 bg-white p-3.5 border border-slate-200 rounded-xl animate-fade-in">
                        <div className="flex flex-col sm:flex-row gap-4 items-center">
                          {mobileQrDataUrl ? (
                            <div className="bg-slate-50 p-2 border border-slate-100 rounded-xl shadow-3xs shrink-0 relative group">
                              <img src={mobileQrDataUrl} alt="Mobil Yükleme Karekod" className="w-32 h-32" />
                              <span className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center text-[10px] text-white font-bold text-center p-2 leading-relaxed">
                                Telefon kamerası ile taratın
                              </span>
                            </div>
                          ) : (
                            <div className="w-32 h-32 bg-slate-100 rounded-xl flex items-center justify-center animate-pulse shrink-0">
                              <RefreshCw className="w-6 h-6 text-slate-300 animate-spin" />
                            </div>
                          )}

                          <div className="space-y-1.5 flex-1 text-center sm:text-left">
                            <h4 className="text-xs font-bold text-slate-800 flex items-center justify-center sm:justify-start gap-1">
                              <Smartphone className="w-4 h-4 text-blue-600" />
                              Sınırsız Mobil Cihaz Senkronizasyonu
                            </h4>
                            <p className="text-[10px] text-slate-500 leading-relaxed">
                              Telefonunuz, tabletiniz veya herhangi bir harici cihazın kamerası ile çektiğiniz fotoğrafları, ürün kataloğuna <strong>anında ve sınırsız</strong> aktarın.
                            </p>
                            <div className="flex flex-wrap gap-1.5 justify-center sm:justify-start pt-1">
                              <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[9px] font-mono font-bold">
                                Kod: {mobileSessionCode}
                              </span>
                              {isPollingMobile && (
                                <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-[9px] font-bold flex items-center gap-1 animate-pulse">
                                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping"></span>
                                  Cihaz Bekleniyor...
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Polled Images */}
                        {uploadedPhotos.length > 0 ? (
                          <div className="space-y-1.5 pt-2.5 border-t border-slate-100">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              Telefondan Gelen Fotoğraflar ({uploadedPhotos.length}) - Seçmek için tıklayın
                            </span>
                            <div className="grid grid-cols-4 gap-2 max-h-32 overflow-y-auto pr-1">
                              {uploadedPhotos.map((photo, idx) => (
                                <button
                                  type="button"
                                  key={idx}
                                  onClick={() => void handleMobilePhotoSelect(photo)}
                                  className={`aspect-square bg-slate-50 border rounded-lg overflow-hidden relative transition-all cursor-pointer ${
                                    prodImage === photo 
                                      ? 'border-blue-500 ring-2 ring-blue-500/30 ring-offset-1' 
                                      : 'border-slate-200 hover:border-slate-400'
                                  }`}
                                >
                                  <img src={photo} alt={`Mobil ${idx+1}`} className="w-full h-full object-cover" />
                                  {prodImage === photo && (
                                    <span className="absolute inset-0 bg-blue-500/20 flex items-center justify-center text-white text-[10px] font-bold">
                                      ✓ Seçildi
                                    </span>
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-4 bg-slate-50 border border-dashed border-slate-100 rounded-lg text-[10px] text-slate-400">
                            Telefonunuzdan henüz bir görsel yüklenmedi.
                          </div>
                        )}
                      </div>
                    )}

                    {/* METHOD 3: URL INPUT */}
                    {imageInputMethod === 'url' && (
                      <input
                        type="url"
                        value={prodImage}
                        onChange={e => setProdImage(e.target.value)}
                        placeholder="Görsel web adresi girin veya varsayılanı kullanın"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:border-blue-500"
                      />
                    )}

                    {/* Image Preview & Indicator */}
                    {prodImage && (
                      <div className="flex items-center gap-3 bg-white p-2.5 border border-slate-200 rounded-xl">
                        <img src={prodImage} alt="Önizleme" className="w-12 h-12 rounded-lg object-cover border border-slate-100" />
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] text-slate-400 font-bold block">AKTİF SEÇİLİ GÖRSEL</span>
                          <span className="text-[10px] text-slate-600 font-mono truncate block">{prodImage.startsWith('data:') ? 'Yerel / Mobil Fotoğraf' : prodImage}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setProdImage('https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3')}
                          className="text-[10px] text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-100 px-2 py-1 rounded-md cursor-pointer font-bold"
                        >
                          Varsayılana Sıfırla
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Ürün Açıklaması</label>
                    <textarea
                      rows={3}
                      value={prodDescription}
                      onChange={e => setProdDescription(e.target.value)}
                      placeholder="Müşterileri bilgilendirmek için ürün detaylarını yazın..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:border-blue-500 focus:bg-white resize-none"
                    />
                  </div>
                </div>
              )}

              {/* --- BULK PRODUCTS GRID FORM --- */}
              {activeProductAddMode === 'bulk' && productFormMode === 'add' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-bold text-slate-800">Hızlı Excel/CSV Verisi İçe Aktar</h4>
                      <p className="text-[10px] text-slate-400">Excel sütunlarını kopyalayıp doğrudan yapıştırarak toplu liste oluşturun.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPasteBox(!showPasteBox)}
                      className="bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg cursor-pointer flex items-center gap-1.5"
                    >
                      <Copy className="w-3.5 h-3.5" /> {showPasteBox ? 'Kapat' : 'Excel/CSV Yapıştır'}
                    </button>
                  </div>

                  {showPasteBox && (
                    <div className="bg-white border border-slate-200 p-4 rounded-xl space-y-3 animate-scale">
                      <span className="text-[10px] text-slate-500 leading-relaxed block">
                        Aşağıdaki metin kutusuna kopyaladığınız satırları yapıştırın. <br />
                        Sütun sırası: <strong>Ürün Adı</strong> [sekme/virgül] <strong>Fiyat</strong> [sekme/virgül] <strong>Kategori</strong> [sekme/virgül] <strong>Marka</strong> [sekme/virgül] <strong>Stok</strong> [sekme/virgül] <strong>Açıklama</strong> [sekme/virgül] <strong>Düzine İçi Adet</strong> [sekme/virgül] <strong>Düzine Fiyatı</strong> [sekme/virgül] <strong>Koli İçi Adet</strong> [sekme/virgül] <strong>Koli Fiyatı</strong> olmalıdır.
                      </span>
                      <textarea
                        rows={4}
                        value={pastedDataText}
                        onChange={e => setPastedDataText(e.target.value)}
                        placeholder={`Örn:\nPritt Stick Yapıştırıcı\t32.50\tBoyama & El Sanatları\tPritt\t100\tKağıt karton yapıştırıcı\nMetodik Kareli Defter\t18.90\tDefterler & Bloknotlar\tGıpta\t50\tA4 dikişli defter`}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 focus:outline-hidden focus:border-blue-500 focus:bg-white resize-none"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setShowPasteBox(false);
                            setPastedDataText('');
                          }}
                          className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-[11px] font-bold rounded-lg cursor-pointer"
                        >
                          İptal
                        </button>
                        <button
                          type="button"
                          onClick={handleParsePastedData}
                          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-lg cursor-pointer"
                        >
                          Verileri Çözümle & Ekle
                        </button>
                      </div>
                    </div>
                  )}

                  {/* QR code and polling for bulk mode photos */}
                  <div className="bg-slate-50/50 border border-slate-200/60 p-3.5 rounded-xl flex flex-wrap sm:flex-nowrap gap-4 items-center justify-between">
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Smartphone className="w-4 h-4 text-blue-600" />
                        Toplu Eklerken Telefondan Fotoğraf Gönderin
                      </h4>
                      <p className="text-[10px] text-slate-500 leading-relaxed max-w-xl">
                        Telefon kamerasından QR ile çekeceğiniz tüm fotoğraflar aşağıdaki havuza anlık düşer. <br />
                        Ardından, ürün satırlarındaki <strong>"Seç"</strong> butonuyla telefondan gelen fotoğrafları eşleştirebilirsiniz!
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[9px] font-mono font-bold">
                          Senkronizasyon Kodu: {mobileSessionCode}
                        </span>
                        {isPollingMobile && (
                          <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded text-[9px] font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                            Karekod Senkronize
                          </span>
                        )}
                      </div>
                    </div>
                    {mobileQrDataUrl && (
                      <div className="bg-white p-1.5 border border-slate-200 rounded-xl shadow-4xs shrink-0 relative group">
                        <img src={mobileQrDataUrl} alt="QR" className="w-20 h-20" />
                        <span className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center text-[8px] text-white font-bold text-center p-1 leading-normal">
                          Telefonla Tarat
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Shared phone photos horizontal list */}
                  {uploadedPhotos.length > 0 && (
                    <div className="bg-blue-50/30 border border-blue-100 p-2.5 rounded-xl space-y-1.5">
                      <span className="text-[9px] font-bold text-blue-800 uppercase tracking-wider block">
                        Senkronize Mobil Görsel Havuzu ({uploadedPhotos.length}) - Sürükleyin veya Satırdan Eşleştirin:
                      </span>
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {uploadedPhotos.map((photo, idx) => (
                          <div key={idx} className="w-12 h-12 rounded-lg border border-slate-200 overflow-hidden shrink-0 relative shadow-4xs">
                            <img src={photo} alt="Mobil Temp" className="w-full h-full object-cover" />
                            <span className="absolute bottom-0 right-0 bg-emerald-500 text-white rounded-full p-0.5 text-[6px] font-bold">
                              ✓
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Bulk Table */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white max-w-full overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse min-w-[800px]">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-[10px] uppercase tracking-wider">
                          <th className="p-2.5 w-1/4">Ürün Adı *</th>
                          <th className="p-2.5 w-1/5">Kategori *</th>
                          <th className="p-2.5 w-1/12">Fiyat (TL) *</th>
                          <th className="p-2.5 w-1/12">Marka</th>
                          <th className="p-2.5 w-1/12">Stok *</th>
                          <th className="p-2.5 w-1/12">Düzine</th>
                          <th className="p-2.5 w-1/12">Koli</th>
                          <th className="p-2.5 w-1/5">Görsel</th>
                          <th className="p-2.5 w-[50px] text-center">İşlem</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bulkRows.map((row, idx) => (
                          <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                            <td className="p-2">
                              <input
                                type="text"
                                required
                                value={row.name}
                                onChange={e => handleBulkFieldChange(idx, 'name', e.target.value)}
                                placeholder="Örn: Kareli Defter"
                                className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded text-xs focus:bg-white"
                              />
                            </td>
                            <td className="p-2">
                              <select
                                value={row.category}
                                onChange={e => handleBulkFieldChange(idx, 'category', e.target.value)}
                                className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded text-xs focus:bg-white"
                              >
                                <option value="Kalemler & Yazım Gereçleri">Kalemler & Yazım Gereçleri</option>
                                <option value="Defterler & Bloknotlar">Defterler & Bloknotlar</option>
                                <option value="Ofis & Masaüstü">Ofis & Masaüstü</option>
                                <option value="Boyama & El Sanatları">Boyama & El Sanatları</option>
                                <option value="Çantalar & Aksesuarlar">Çantalar & Aksesuarlar</option>
                                <option value="Dosyalama & Arşivleme">Dosyalama & Arşivleme</option>
                                <option value="Gıda / Atıştırmalık">Gıda / Atıştırmalık</option>
                                <option value="Giyim / Tekstil">Giyim / Tekstil</option>
                                <option value="Teknoloji / Elektronik">Teknoloji / Elektronik</option>
                                <option value="Hediyelik Eşya / Diğer">Hediyelik Eşya / Diğer</option>
                              </select>
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                required
                                min="0.1"
                                step="0.01"
                                value={row.price || ''}
                                onChange={e => handleBulkFieldChange(idx, 'price', Number(e.target.value))}
                                placeholder="24.90"
                                className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded text-xs font-mono focus:bg-white"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={row.brand}
                                onChange={e => handleBulkFieldChange(idx, 'brand', e.target.value)}
                                placeholder="Gıpta"
                                className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded text-xs focus:bg-white"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                required
                                min="0"
                                value={row.stock}
                                onChange={e => handleBulkFieldChange(idx, 'stock', Number(e.target.value))}
                                className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded text-xs font-mono focus:bg-white"
                              />
                            </td>
                            <td className="p-2 space-y-1">
                              <input type="number" min="1" value={row.dozenQuantity || ''} onChange={e => handleBulkFieldChange(idx, 'dozenQuantity', Number(e.target.value))} placeholder="İç adet" className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded text-xs font-mono focus:bg-white" />
                              <input type="number" min="0" step="0.01" value={row.dozenPrice || ''} onChange={e => handleBulkFieldChange(idx, 'dozenPrice', Number(e.target.value))} placeholder="Fiyat" className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded text-xs font-mono focus:bg-white" />
                            </td>
                            <td className="p-2 space-y-1">
                              <input type="number" min="1" value={row.boxQuantity || ''} onChange={e => handleBulkFieldChange(idx, 'boxQuantity', Number(e.target.value))} placeholder="İç adet" className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded text-xs font-mono focus:bg-white" />
                              <input type="number" min="0" step="0.01" value={row.boxPrice || ''} onChange={e => handleBulkFieldChange(idx, 'boxPrice', Number(e.target.value))} placeholder="Fiyat" className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded text-xs font-mono focus:bg-white" />
                            </td>
                            <td className="p-2 space-y-1">
                              <div className="flex gap-1 items-center">
                                {row.image ? (
                                  <img src={row.image} alt="Row" className="w-7 h-7 rounded object-cover border border-slate-200" />
                                ) : (
                                  <div className="w-7 h-7 bg-slate-100 rounded flex items-center justify-center text-[8px] text-slate-400 font-bold shrink-0">Yok</div>
                                )}
                                <input
                                  type="text"
                                  value={row.image}
                                  onChange={e => handleBulkFieldChange(idx, 'image', e.target.value)}
                                  placeholder="Görsel URL veya Yükle"
                                  className="flex-1 p-1 bg-slate-50 border border-slate-200 rounded text-[10px] focus:bg-white"
                                />
                              </div>
                              <div className="flex gap-1">
                                <label className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer shrink-0">
                                  Dosya
                                  <input
                                    type="file"
                                    accept="image/*"
                                    disabled={isImageUploading}
                                    onChange={e => {
                                      if (e.target.files && e.target.files[0]) {
                                        void handleLocalImageUpload(e.target.files[0], idx);
                                      }
                                    }}
                                    className="hidden"
                                  />
                                </label>
                                {uploadedPhotos.length > 0 && (
                                  <select
                                    onChange={e => {
                                      if (e.target.value) void handleMobilePhotoSelect(e.target.value, idx);
                                    }}
                                    value={uploadedPhotos.includes(row.image) ? row.image : ''}
                                    className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-1 py-0.5 rounded text-[9px] font-bold border-none cursor-pointer flex-1"
                                  >
                                    <option value="">Telefondan Seç...</option>
                                    {uploadedPhotos.map((photo, pIdx) => (
                                      <option key={pIdx} value={photo}>Fotoğraf #{pIdx + 1}</option>
                                    ))}
                                  </select>
                                )}
                              </div>
                            </td>
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() => removeBulkRow(idx)}
                                disabled={bulkRows.length <= 1}
                                className="text-slate-400 hover:text-rose-600 disabled:opacity-30 p-1 rounded-lg transition-colors cursor-pointer"
                                title="Satırı Sil"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <button
                    type="button"
                    onClick={addBulkRow}
                    className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold border border-dashed border-slate-300 hover:border-slate-400 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> Yeni Ürün Satırı Ekle
                  </button>
                </div>
              )}

              {/* Form Footer Buttons */}
              <div className="pt-4 border-t border-slate-100 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  {activeProductAddMode === 'bulk' && productFormMode === 'add' 
                    ? `Seçilen ${bulkRows.length} Ürünü Kataloğa Kaydet` 
                    : (productFormMode === 'add' ? 'Ürünü Kaydet' : 'Değişiklikleri Kaydet')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ORDER SHIPPING & STATUS MANAGEMENT MODAL */}
      {selectedOrderToManage && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in" id="dealer-order-shipping-modal">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 relative">
            <button
              onClick={() => setSelectedOrderToManage(null)}
              className="text-slate-400 hover:text-slate-600 p-1.5 bg-slate-50 rounded-lg absolute top-4 right-4 cursor-pointer"
            >
              Kapat
            </button>
            <form onSubmit={handleUpdateOrderShipping} className="space-y-4">
              <div className="text-center pb-2 border-b border-slate-100">
                <h3 className="font-display font-bold text-lg text-slate-900 flex items-center justify-center gap-1.5">
                  <Truck className="w-5 h-5 text-blue-600" />
                  Kargo ve Sipariş Durumu
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Sipariş No: <span className="font-mono font-bold text-slate-800">{selectedOrderToManage.id}</span>
                </p>
              </div>

              <div className="bg-slate-50 rounded-xl p-3 text-xs space-y-1 text-slate-600">
                <div className="flex justify-between">
                  <span>Alıcı Müşteri:</span>
                  <span className="font-bold text-slate-800">{selectedOrderToManage.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Sipariş Tutarı:</span>
                  <span className="font-mono font-bold text-slate-800">{selectedOrderToManage.totalPrice.toFixed(2)} TL</span>
                </div>
                <div className="flex justify-between">
                  <span>Net Komisyonunuz:</span>
                  <span className="font-mono font-bold text-emerald-600">+{selectedOrderToManage.commissionAmount.toFixed(2)} TL</span>
                </div>
                <div className="pt-2 border-t border-slate-200 mt-1 flex flex-col gap-0.5">
                  <span className="font-bold text-[10px] text-slate-500">Alınan Ürünler:</span>
                  <span className="text-[10px] text-slate-500 font-medium">
                    {selectedOrderToManage.items.map(i => `${i.name} (x${i.quantity})`).join(', ')}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Sipariş & Gönderim Süreci Durumu *</label>
                  <select
                    value={manageShippingStatus}
                    onChange={e => setManageShippingStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:border-blue-500 focus:bg-white"
                  >
                    <option value="preparing">Hazırlanıyor (Merkez / Mağaza)</option>
                    <option value="shipped">Sevk Edildi / Kargoya Verildi</option>
                    <option value="delivered">Teslim Edildi (Ödeme Esnafa Kesinleşir)</option>
                    <option value="cancelled">İptal Edildi</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Anlaşmalı Kargo Firması</label>
                  <select
                    value={manageShippingCompany}
                    onChange={e => setManageShippingCompany(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:border-blue-500 focus:bg-white"
                  >
                    <option value="Yurtiçi Kargo">Yurtiçi Kargo</option>
                    <option value="Aras Kargo">Aras Kargo</option>
                    <option value="MNG Kargo">MNG Kargo</option>
                    <option value="Sürat Kargo">Sürat Kargo</option>
                    <option value="PTT Kargo">PTT Kargo</option>
                    <option value="Trendyol Express">Trendyol Express</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Kargo Takip Numarası</label>
                  <input
                    type="text"
                    value={manageTrackingNumber}
                    onChange={e => setManageTrackingNumber(e.target.value)}
                    placeholder="Örn: YT7432850931"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:border-blue-500 focus:bg-white font-mono"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedOrderToManage(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  Bilgileri Güncelle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NEW ORDER REQUEST MODAL */}
      {isNewOrderModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in" id="dealer-new-order-modal">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 relative max-h-[90vh] overflow-y-auto">
            <button
              id="close-new-order-modal"
              onClick={() => setIsNewOrderModalOpen(false)}
              className="text-slate-400 hover:text-slate-600 p-1 bg-slate-50 rounded-lg absolute top-4 right-4 cursor-pointer"
            >
              Kapat
            </button>

            {!isOrderRequestSuccess ? (
              <form onSubmit={handleNewOrderSubmit} className="space-y-4">
                <div className="text-center pb-2 border-b border-slate-100">
                  <h3 className="font-display font-bold text-lg text-slate-900 flex items-center justify-center gap-1.5">
                    <ShoppingBag className="w-5 h-5 text-blue-600" />
                    Yeni Sipariş Talebi Gönder
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Merkez depodan kendi mağaza stoğunuz veya bir müşteriniz adına onaylı sipariş talebinde bulunun.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Talep Edilen Ürün *</label>
                    <select
                      value={selectedProductId}
                      onChange={e => setSelectedProductId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:border-blue-500 focus:bg-white"
                    >
                      {products.map(product => (
                        <option key={product.id} value={product.id}>
                          {product.name} ({product.price.toFixed(2)} TL) - Stok: {product.stock}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1.5">Paketleme Tipi *</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setPackageType('single')}
                        className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-all cursor-pointer ${
                          packageType === 'single'
                            ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-2xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        Tekli (1'li)
                      </button>
                      <button
                        type="button"
                        onClick={() => setPackageType('dozen')}
                        className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-all cursor-pointer ${
                          packageType === 'dozen'
                            ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-2xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        Düzine (12'li)
                      </button>
                      <button
                        type="button"
                        onClick={() => setPackageType('box')}
                        className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-all cursor-pointer ${
                          packageType === 'box'
                            ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-2xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        Koli (48'li)
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Paket/Sipariş Miktarı *</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={packageQuantity}
                        onChange={e => setPackageQuantity(Math.max(1, Number(e.target.value)))}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:border-blue-500 focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Toplam Ödeme Tutarı</label>
                      <div className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-xs text-slate-500 font-mono font-bold flex items-center h-[38px]">
                        {((products.find(p => p.id === selectedProductId)?.price || 0) * totalUnitsCalculated).toFixed(2)} TL
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-3 flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-medium">Toplam Sevk Edilecek Ürün Adedi:</span>
                    <span className="font-bold text-slate-800 bg-white px-2 py-1 rounded-md border border-slate-100 font-mono">
                      {totalUnitsCalculated} Adet
                    </span>
                  </div>

                  <div className="border-t border-slate-100 pt-3 space-y-3">
                    <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Teslimat / Alıcı Detayları</h4>
                    
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-1">Alıcı Adı Soyadı (Boş bırakılırsa bayiye sevk edilir)</label>
                      <input
                        type="text"
                        placeholder="Örn: Ahmet Yılmaz veya Mağaza Stoğu"
                        value={clientName}
                        onChange={e => setClientName(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:border-blue-500 focus:bg-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1">Alıcı Telefon No</label>
                        <input
                          type="text"
                          placeholder="05xx xxx xx xx"
                          value={clientPhone}
                          onChange={e => setClientPhone(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:border-blue-500 focus:bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1">Sevk Adresi (Boş ise bayi adresi)</label>
                        <input
                          type="text"
                          placeholder="Detaylı adres bilgisi"
                          value={clientAddress}
                          onChange={e => setClientAddress(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:border-blue-500 focus:bg-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                  >
                    Talebi Merkeze Gönder
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center py-6 space-y-4">
                <div className="bg-emerald-500 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto shadow-md">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-slate-900">Talep Alındı</h3>
                  <p className="text-xs text-slate-500 mt-1 font-medium">
                    Sipariş talebiniz başarıyla oluşturuldu ve süper admin onay paneline iletildi.
                  </p>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 text-[11px] text-slate-500 text-left">
                  <strong>İşlem Özeti:</strong>
                  <p className="mt-1">Ürün: {products.find(p => p.id === selectedProductId)?.name}</p>
                  <p>Miktar: {packageQuantity} {packageType === 'dozen' ? 'Düzine' : packageType === 'box' ? 'Koli' : 'Adet'} ({totalUnitsCalculated} Adet)</p>
                  <p>Toplam Tutar: {((products.find(p => p.id === selectedProductId)?.price || 0) * totalUnitsCalculated).toFixed(2)} TL</p>
                  <p>Durum: Admin Onayı Bekliyor</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Withdraw Commission Modal Simulation */}
      {isWithdrawModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in" id="dealer-withdraw-modal">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 relative">
            <button
              id="close-withdraw-modal"
              onClick={closeWithdrawModal}
              className="text-slate-400 hover:text-slate-600 p-1 bg-slate-50 rounded-lg absolute top-4 right-4 cursor-pointer"
            >
              Vazgeç
            </button>

            {!isWithdrawSuccess ? (
              <form onSubmit={handleWithdrawSubmit} className="space-y-4">
                <div className="text-center pb-2 border-b border-slate-100">
                  <h3 className="font-display font-bold text-lg text-slate-900">Banka Hesabına Komisyon Çekim Talebi</h3>
                  <p className="text-xs text-slate-500 mt-1 font-medium">
                    Mevcut biriken komisyon hakedişlerinizi banka hesabınıza çekmek için ödeme talebi gönderin. Talep yönetici tarafından incelenip onaylanacaktır.
                  </p>
                </div>

                <div className="bg-amber-50/70 p-4 rounded-xl space-y-1 text-xs border border-amber-200/50">
                  <div className="flex justify-between text-slate-700 font-semibold">
                    <span>Çekilebilir Toplam Bakiye:</span>
                    <span className="font-mono text-amber-700 font-bold">{withdrawableCommission.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL</span>
                  </div>
                  <div className="flex justify-between text-slate-500 text-[10px]">
                    <span>Asgari Çekim Limiti:</span>
                    <span>10.00 TL</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Çekilecek Tutar (TL) *</label>
                    <input
                      id="withdraw-amount-input"
                      type="number"
                      required
                      min="10"
                      max={withdrawableCommission}
                      step="0.01"
                      placeholder="0.00"
                      value={withdrawAmount || ''}
                      onChange={e => setWithdrawAmount(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:border-blue-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Banka Adı *</label>
                    <input
                      id="withdraw-bankname-input"
                      type="text"
                      required
                      placeholder="Örn. Ziraat Bankası, Garanti..."
                      value={bankName}
                      onChange={e => setBankName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:border-blue-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Alıcı Adı Soyadı / Ünvanı *</label>
                    <input
                      id="withdraw-accholder-input"
                      type="text"
                      required
                      placeholder="Hesap Sahibinin Tam Adı / Ticari Ünvanı"
                      value={accountHolder}
                      onChange={e => setAccountHolder(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:border-blue-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">TR IBAN Numarası *</label>
                    <input
                      id="withdraw-iban-input"
                      type="text"
                      required
                      placeholder="TR00 0000 0000 0000 0000 0000 00"
                      value={iban}
                      onChange={e => setIban(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:border-blue-500 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    id="submit-withdraw-btn"
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                  >
                    Komisyon Talebini Gönder
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center py-6 space-y-4">
                <div className="bg-amber-500 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto shadow-md">
                  <Clock className="w-7 h-7 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-slate-900">Talep Merkeze Gönderildi</h3>
                  <p className="text-xs text-slate-500 mt-1 font-medium">
                    {withdrawAmount.toFixed(2)} TL tutarındaki komisyon hakediş talebiniz yönetici onay paneline başarıyla iletilmiştir.
                  </p>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 text-[11px] text-slate-500 text-left space-y-1">
                  <strong>İşlem Detayları:</strong>
                  <p>Banka: {bankName}</p>
                  <p>Alıcı: {accountHolder}</p>
                  <p className="break-all">IBAN: {iban}</p>
                  <p>Durum: <span className="text-amber-600 font-bold">Admin Onayı Bekliyor</span></p>
                </div>

                <button
                  id="withdraw-success-close-btn"
                  onClick={closeWithdrawModal}
                  className="w-full bg-slate-900 text-white font-semibold py-2 rounded-xl text-xs hover:bg-slate-800 cursor-pointer"
                >
                  Kapat ve Takip Et
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {/* GLOBAL ORDER DETAILS COMPREHENSIVE MODAL CARD */}
      <OrderDetailsModal
        isOpen={selectedOrderDetail !== null}
        onClose={() => setSelectedOrderDetail(null)}
        order={selectedOrderDetail}
        products={products}
      />
    </div>
  );
}
