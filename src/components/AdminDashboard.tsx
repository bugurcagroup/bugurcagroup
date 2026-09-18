/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { uploadFile } from '../lib/storage';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  CheckCircle, 
  ShieldAlert, 
  ShieldCheck,
  Award, 
  TrendingUp, 
  Coins, 
  Activity, 
  ShoppingBag, 
  Users, 
  Check, 
  X, 
  Upload,
  Download,
  Image,
  FileText, 
  FileSpreadsheet,
  LayoutGrid, 
  Settings, 
  Palette, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Percent,
  Sliders,
  Building,
  Truck,
  Eye,
  RefreshCw,
  Archive
} from 'lucide-react';
import { Product, Dealer, Order, StoreSettings, CommissionRequest, Member } from '../types';
import type { DealerApplication } from '../lib/dealers';
import { calculateOrderFinancials } from '../lib/finance';
import { createAppBackup, restoreAppBackup } from '../lib/backup';
import { CITIES } from '../mockData';
import OrderDetailsModal from './OrderDetailsModal';
import ArchivePanel from './ArchivePanel';
import type { ArchiveRecord } from '../lib/archive';

GlobalWorkerOptions.workerSrc = pdfWorker;

const ALL_TURKISH_CITIES = [
  'Adana', 'Adıyaman', 'Afyonkarahisar', 'Ağrı', 'Amasya', 'Ankara', 'Antalya', 'Artvin', 'Aydın', 'Balıkesir',
  'Bilecik', 'Bingöl', 'Bitlis', 'Bolu', 'Burdur', 'Bursa', 'Çanakkale', 'Çankırı', 'Çorum', 'Denizli',
  'Diyarbakır', 'Edirne', 'Elazığ', 'Erzincan', 'Erzurum', 'Eskişehir', 'Gaziantep', 'Giresun', 'Gümüşhane', 'Hakkari',
  'Hatay', 'Isparta', 'Mersin', 'İstanbul', 'İzmir', 'Kars', 'Kastamonu', 'Kayseri', 'Kırklareli', 'Kırşehir',
  'Kocaeli', 'Konya', 'Kütahya', 'Malatya', 'Manisa', 'Kahramanmaraş', 'Mardin', 'Muğla', 'Muş', 'Nevşehir',
  'Niğde', 'Ordu', 'Rize', 'Sakarya', 'Samsun', 'Siirt', 'Sinop', 'Sivas', 'Tekirdağ', 'Tokat',
  'Trabzon', 'Tunceli', 'Şanlıurfa', 'Uşak', 'Van', 'Yozgat', 'Zonguldak', 'Aksaray', 'Bayburt', 'Karaman',
  'Kırıkkale', 'Batman', 'Şırnak', 'Bartın', 'Ardahan', 'Iğdır', 'Yalova', 'Karabük', 'Kilis', 'Osmaniye',
  'Düzce'
].sort((a, b) => a.localeCompare(b, 'tr'));

interface AdminDashboardProps {
  products: Product[];
  dealers: Dealer[];
  dealerApplications: DealerApplication[];
  orders: Order[];
  members: Member[];
  onSaveMembers: (members: Member[]) => void | Promise<void>;
  onSaveProduct: (product: Product) => void | Promise<void>;
  categories?: string[];
  onAddCategory?: (name: string) => void | Promise<void>;
  onDeleteProduct: (id: string) => void;
  onUpdateDealerStatus: (id: string, status: Dealer['status']) => void;
  onUpdateDealerApplicationStatus: (id: string, status: DealerApplication['status']) => void | Promise<void>;
  onApproveDealerApplication: (application: DealerApplication) => void | Promise<void>;
  activeSubTab: string; // 'dashboard', 'products', 'dealers', 'orders', 'settings'
  setActiveSubTab: (tab: string) => void;
  
  // Master Admin Additions
  storeSettings: StoreSettings;
  onSaveStoreSettings: (settings: StoreSettings) => void;
  onDeleteDealer: (id: string) => void;
  onSaveDealer: (dealer: Dealer, password?: string) => void | Promise<void>;
  onSaveOrdersList: (orders: Order[]) => void;
  onDeleteMemberOrder: (orderId: string) => void | Promise<void>;
  onPermanentDeleteOrder?: (orderId: string) => void | Promise<void>;
  onSetOrderCommissionStatus?: (orderId: string, voided: boolean) => void | Promise<void>;
  onResetFinancialData: () => void | Promise<void>;
  onDeleteTestOrders: () => void | Promise<void>;
  onBackupRestored?: () => void | Promise<void>;

  commissionRequests: CommissionRequest[];
  onApproveCommissionRequest: (requestId: string) => void;
  onRejectCommissionRequest: (requestId: string) => void;
  onPayCommissionDirectly: (dealerId: string, amount: number) => void | Promise<void>;

  securityGateEnabled?: boolean;
  setSecurityGateEnabled?: (enabled: boolean) => void;
  onBulkUpdatePrices?: (
    scope: 'all' | 'category',
    category: string,
    action: 'increase' | 'discount',
    percent: number
  ) => void;
  onSaveProductsBulk?: (products: Product[]) => void;
  archives: ArchiveRecord[];
  onRestoreArchive: (record: ArchiveRecord) => void | Promise<void>;
  onPermanentlyDeleteArchive: (record: ArchiveRecord) => void | Promise<void>;
  onArchiveReceipt: (orderId: string) => void | Promise<void>;
}

export default function AdminDashboard({
  products,
  dealers,
  dealerApplications,
  orders,
  members,
  onSaveMembers,
  onSaveProduct,
  onSaveProductsBulk,
  categories: sharedCategories = [],
  onAddCategory,
  onDeleteProduct,
  onUpdateDealerStatus,
  onUpdateDealerApplicationStatus,
  onApproveDealerApplication,
  activeSubTab,
  setActiveSubTab,
  storeSettings,
  onSaveStoreSettings,
  onDeleteDealer,
  onSaveDealer,
  onSaveOrdersList,
  onDeleteMemberOrder,
  onPermanentDeleteOrder,
  onSetOrderCommissionStatus,
  onResetFinancialData,
  onDeleteTestOrders,
  onBackupRestored,
  commissionRequests,
  onApproveCommissionRequest,
  onRejectCommissionRequest,
  onPayCommissionDirectly,
  securityGateEnabled = false,
  setSecurityGateEnabled,
  onBulkUpdatePrices,
  archives,
  onRestoreArchive,
  onPermanentlyDeleteArchive,
  onArchiveReceipt,
}: AdminDashboardProps) {
  const pendingRequests = useMemo(() => {
    return commissionRequests.filter(r => r.status === 'pending');
  }, [commissionRequests]);

  const archiveRequests = useMemo(() => {
    return commissionRequests.filter(r => r.status !== 'pending');
  }, [commissionRequests]);

  // --- ÜRÜN CRUD STATE'LERİ ---
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [isBackupProcessing, setIsBackupProcessing] = useState(false);
  const backupFileInputRef = useRef<HTMLInputElement>(null);
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [productFormMode, setProductFormMode] = useState<'add' | 'edit'>('add');
  const [editingProductId, setEditingProductId] = useState('');
  const [prodName, setProdName] = useState('');

  // --- TOPLU FİYAT GÜNCELLEME STATE'LERİ ---
  const [isBulkUpdateOpen, setIsBulkUpdateOpen] = useState(false);
  const [bulkScope, setBulkScope] = useState<'all' | 'category'>('all');
  const [bulkCategory, setBulkCategory] = useState('Kalemler & Yazım Gereçleri');
  const [bulkAction, setBulkAction] = useState<'increase' | 'discount'>('increase');
  const [bulkPercent, setBulkPercent] = useState<number>(10);
  const [bulkUpdateConfirmOpen, setBulkUpdateConfirmOpen] = useState(false);
  const [bulkUpdateSuccess, setBulkUpdateSuccess] = useState(false);
  const [prodBrand, setProdBrand] = useState('');
  const [prodCategory, setProdCategory] = useState('Kalemler & Yazım Gereçleri');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [prodPrice, setProdPrice] = useState(0);
  const [prodStock, setProdStock] = useState(0);
  const [prodImage, setProdImage] = useState('');
  const [prodImages, setProdImages] = useState<string[]>([]);
  const [isProductImgDragging, setIsProductImgDragging] = useState(false);
  const [isProductUploading, setIsProductUploading] = useState(false);
  const [imageUploadStatus, setImageUploadStatus] = useState('');
  const [prodDescription, setProdDescription] = useState('');
  const [prodBarcode, setProdBarcode] = useState('');
  const [prodQrCode, setProdQrCode] = useState('');
  const [prodDozenQuantity, setProdDozenQuantity] = useState(12);
  const [prodDozenPrice, setProdDozenPrice] = useState(0);
  const [prodBoxQuantity, setProdBoxQuantity] = useState(0);
  const [prodBoxPrice, setProdBoxPrice] = useState(0);

  // --- TOPLU ÜRÜN İÇE AKTARMA STATE'LERİ ---
  const [productAddTab, setProductAddTab] = useState<'single' | 'bulk'>('single');
  const [bulkImportFile, setBulkImportFile] = useState<File | null>(null);
  const [bulkImportProgress, setBulkImportProgress] = useState<number>(0);
  const [bulkImportStage, setBulkImportStage] = useState<string>('');
  const [isBulkImporting, setIsBulkImporting] = useState<boolean>(false);
  const [bulkParsedProducts, setBulkParsedProducts] = useState<Product[]>([]);

  // --- BAYİ CRUD STATE'LERİ ---
  const [isDealerFormOpen, setIsDealerFormOpen] = useState(false);
  const [dealerFormMode, setDealerFormMode] = useState<'add' | 'edit'>('add');
  const [editingDealerId, setEditingDealerId] = useState('');
  const [dlrName, setDlrName] = useState('');
  const [dlrOwner, setDlrOwner] = useState('');
  const [dlrCity, setDlrCity] = useState('İstanbul');
  const [dlrCityManual, setDlrCityManual] = useState(false);
  const [dlrManualCityValue, setDlrManualCityValue] = useState('');
  const [dlrDistrict, setDlrDistrict] = useState('');
  const [dlrAddress, setDlrAddress] = useState('');
  const [dlrPhone, setDlrPhone] = useState('');
  const [dlrEmail, setDlrEmail] = useState('');
  const [dlrPassword, setDlrPassword] = useState('');
  const [dlrStatus, setDlrStatus] = useState<Dealer['status']>('active');
  const [dlrCommissionRate, setDlrCommissionRate] = useState<number | ''>('');
  const [dlrPrivateCommissionRate, setDlrPrivateCommissionRate] = useState<number | ''>('');
  const [dlrAdminSectorCommissionRate, setDlrAdminSectorCommissionRate] = useState<number | ''>('');
  const [dlrSector, setDlrSector] = useState('Kırtasiye');

  // --- DOĞRUDAN KOMİSYON ÖDEME STATE'LERİ ---
  const [isDirectPayModalOpen, setIsDirectPayModalOpen] = useState(false);
  const [directPayDealer, setDirectPayDealer] = useState<Dealer | null>(null);
  const [directPayAmount, setDirectPayAmount] = useState<number>(0);

  // --- SİPARİŞ DÜZENLEME STATE'LERİ ---
  const [isOrderFormOpen, setIsOrderFormOpen] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState('');
  const [ordCustName, setOrdCustName] = useState('');
  const [ordCustEmail, setOrdCustEmail] = useState('');
  const [ordCustPhone, setOrdCustPhone] = useState('');
  const [ordStatus, setOrdStatus] = useState<'completed' | 'pending' | 'cancelled'>('completed');
  const [ordShippingCompany, setOrdShippingCompany] = useState('Yurtiçi Kargo');
  const [ordShippingTrackingNumber, setOrdShippingTrackingNumber] = useState('');
  const [ordShippingReceiver, setOrdShippingReceiver] = useState('');
  const [ordShippingPhone, setOrdShippingPhone] = useState('');
  const [ordShippingAddress, setOrdShippingAddress] = useState('');
  const [ordShippingCity, setOrdShippingCity] = useState('İstanbul');
  const [ordShippingDistrict, setOrdShippingDistrict] = useState('');
  const [ordShippingStatus, setOrdShippingStatus] = useState<'preparing' | 'shipped' | 'delivered' | 'cancelled'>('preparing');
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<Order | null>(null);

  // --- TEMA & AYARLAR STATE'LERİ ---
  const [isAdminNewOrderFormOpen, setIsAdminNewOrderFormOpen] = useState(false);
  const [adminOrderDealerId, setAdminOrderDealerId] = useState(dealers[0]?.id || '');
  const [adminOrderProductId, setAdminOrderProductId] = useState(products[0]?.id || '');
  const [adminOrderQuantity, setAdminOrderQuantity] = useState(1);
  const [adminCustName, setAdminCustName] = useState('');
  const [adminCustPhone, setAdminCustPhone] = useState('');
  const [adminCustAddress, setAdminCustAddress] = useState('');

  const [settingsName, setSettingsName] = useState(storeSettings.storeName);
  const [settingsLogo, setSettingsLogo] = useState(storeSettings.logoUrl || '');
  const [settingsSlogan, setSettingsSlogan] = useState(storeSettings.storeSlogan);
  const [settingsCommission, setSettingsCommission] = useState(storeSettings.commissionRate);
  const [centralBankName, setCentralBankName] = useState(storeSettings.centralBankName || '');
  const [centralAccountHolder, setCentralAccountHolder] = useState(storeSettings.centralAccountHolder || '');
  const [centralIban, setCentralIban] = useState(storeSettings.centralIban || '');
  const [centralBankInstructions, setCentralBankInstructions] = useState(storeSettings.centralBankInstructions || '');
  const [isSettingsSavedSuccess, setIsSettingsSavedSuccess] = useState(false);

  // --- CMS CONTENT MANAGEMENT STATES ---
  const [featuredTitle, setFeaturedTitle] = useState(storeSettings.featuredTitle || 'Öne Çıkan Koleksiyon Ürünleri');
  const [featuredProductIds, setFeaturedProductIds] = useState<string[]>(storeSettings.featuredProductIds || []);
  const [aboutTitle, setAboutTitle] = useState(storeSettings.aboutTitle || 'Biz Kimiz & Tarihçemiz');
  const [aboutText, setAboutText] = useState(storeSettings.aboutText || '');
  const [aboutHistory, setAboutHistory] = useState(storeSettings.aboutHistory || '');
  const [newsletterTitle, setNewsletterTitle] = useState(storeSettings.newsletterTitle || 'E-Bültenimize Kaydolun');
  const [newsletterSubtitle, setNewsletterSubtitle] = useState(storeSettings.newsletterSubtitle || '');
  const [contactEmail, setContactEmail] = useState(storeSettings.contactEmail || '');
  const [contactPhone, setContactPhone] = useState(storeSettings.contactPhone || '');
  const [contactAddress, setContactAddress] = useState(storeSettings.contactAddress || '');
  const [contactWorkingHours, setContactWorkingHours] = useState(storeSettings.contactWorkingHours || '');
  const [newsList, setNewsList] = useState<any[]>(storeSettings.newsList || []);
  const [enableProductModal, setEnableProductModal] = useState(storeSettings.enableProductModal !== false);
  const [enableProductZoom, setEnableProductZoom] = useState(storeSettings.enableProductZoom !== false);
  const [zoomScale, setZoomScale] = useState(storeSettings.zoomScale || 2);
  const [showcaseScrollSpeed, setShowcaseScrollSpeed] = useState(storeSettings.showcaseScrollSpeed !== undefined ? storeSettings.showcaseScrollSpeed : 80);
  const [showcaseProductIds, setShowcaseProductIds] = useState<string[]>(storeSettings.showcaseProductIds || []);
  const defaultBrandMarqueeImage = 'https://cdn.builder.io/api/v1/image/assets%2F690dc81201dd442691c0fbf0269adbab%2Fbaa373b7ef684edb945da36057e08b93?format=webp&width=800&height=1200';
  const [brandMarqueeEnabled, setBrandMarqueeEnabled] = useState(storeSettings.brandMarqueeEnabled !== false);
  const [brandMarqueeTitle, setBrandMarqueeTitle] = useState(storeSettings.brandMarqueeTitle || 'Güvendiğimiz Markalar');
  const [brandMarqueeImages, setBrandMarqueeImages] = useState<string[]>(storeSettings.brandMarqueeImages?.length ? storeSettings.brandMarqueeImages : [defaultBrandMarqueeImage]);
  const [newBrandMarqueeImage, setNewBrandMarqueeImage] = useState('');
  const [footerEnabled, setFooterEnabled] = useState(storeSettings.footerEnabled !== false);
  const [footerTitle, setFooterTitle] = useState(storeSettings.footerTitle || 'Esnafın dijital adresi');
  const [footerDescription, setFooterDescription] = useState(storeSettings.footerDescription || 'Yerel kırtasiye esnafını ve müşterileri güvenli bir alışveriş deneyiminde buluşturuyoruz.');
  const [footerShowAbout, setFooterShowAbout] = useState(storeSettings.footerShowAbout !== false);
  const [footerShowContact, setFooterShowContact] = useState(storeSettings.footerShowContact !== false);
  const [footerShowShortcuts, setFooterShowShortcuts] = useState(storeSettings.footerShowShortcuts !== false);
  const [footerMapEnabled, setFooterMapEnabled] = useState(storeSettings.footerMapEnabled !== false);
  const [footerLocationEyebrow, setFooterLocationEyebrow] = useState(storeSettings.footerLocationEyebrow || 'Bizi ziyaret edin');
  const [footerLocationTitle, setFooterLocationTitle] = useState(storeSettings.footerLocationTitle || 'Konumumuz');
  const [footerDirectionsLabel, setFooterDirectionsLabel] = useState(storeSettings.footerDirectionsLabel || 'Yol Tarifi Al');
  const [footerMapLabel, setFooterMapLabel] = useState(storeSettings.footerMapLabel || 'Konumu Aç');
  const [footerShortcuts, setFooterShortcuts] = useState(storeSettings.footerShortcuts?.length ? storeSettings.footerShortcuts : [
    { id: 'products', label: 'Ürünlere Git', href: '#products-grid' },
    { id: 'contact', label: 'İletişim', href: '#contact-info-section' },
    { id: 'about', label: 'Biz Kimiz?', href: '#about-details' },
    { id: 'history', label: 'Tarihçemiz', href: '#history-details' },
    { id: 'news', label: 'Duyurular', href: '#news-details' },
    { id: 'footer', label: 'Sayfanın Sonu', href: '#store-footer' }
  ]);
  const [footerLocations, setFooterLocations] = useState(storeSettings.footerLocations?.length ? storeSettings.footerLocations : [
    { id: 'main-office', label: 'Dünya İş Merkezi', address: storeSettings.contactAddress || 'Yusup Paşa Mahallesi, Dünya İş Merkezi Giriş, Eyyübiye / Şanlıurfa', coordinates: '37.1553535,38.7917175' }
  ]);
  const [footerPanel, setFooterPanel] = useState<'footer' | 'about' | 'shortcuts' | 'locations' | null>(null);
  const [footerAboutLinks, setFooterAboutLinks] = useState(storeSettings.footerAboutLinks?.length ? storeSettings.footerAboutLinks : [
    { id: 'about', label: 'Biz Kimiz?', href: '#about-details' },
    { id: 'news', label: 'Haberler & Duyurular', href: '#news-details' },
    { id: 'featured', label: 'Öne Çıkanlar', href: '#featured-collections-section' }
  ]);
  const [newFooterAboutLabel, setNewFooterAboutLabel] = useState('');
  const [newFooterAboutHref, setNewFooterAboutHref] = useState('');
  const [newFooterShortcutLabel, setNewFooterShortcutLabel] = useState('');
  const [newFooterShortcutHref, setNewFooterShortcutHref] = useState('');
  const [newFooterLocationLabel, setNewFooterLocationLabel] = useState('');
  const [newFooterLocationAddress, setNewFooterLocationAddress] = useState('');
  const [newFooterLocationCoordinates, setNewFooterLocationCoordinates] = useState('');
  const [telegramNotificationsEnabled, setTelegramNotificationsEnabled] = useState(storeSettings.telegramNotificationsEnabled === true);
  const [telegramOrderNotifications, setTelegramOrderNotifications] = useState(storeSettings.telegramOrderNotifications !== false);
  const [telegramActivityNotifications, setTelegramActivityNotifications] = useState(storeSettings.telegramActivityNotifications === true);
  const [telegramChatId, setTelegramChatId] = useState(storeSettings.telegramChatId || '');
  const [telegramTestStatus, setTelegramTestStatus] = useState<string | null>(null);

  // News creation states
  const [newNewsTitle, setNewNewsTitle] = useState('');
  const [newNewsContent, setNewNewsContent] = useState('');
  const [newNewsEmoji, setNewNewsEmoji] = useState('🎒');
  const [newsFeedback, setNewsFeedback] = useState<{ text: string, type: 'success' | 'info' } | null>(null);

  const [newsletterEmails, setNewsletterEmails] = useState<string[]>([]);

  const selectedPalette = useMemo(() => {
    const THEME_PALETTES = [
      {
        id: 'honey_yellow',
        name: 'Bal Sarısı',
        description: 'Sarı Butter & Bal',
        emoji: '🍯',
        accentColor: '#f59e0b',
        bgColor: '#fffdf5',
        cardColor: '#fef8e3',
        textColor: '#854d0e',
        borderColor: '#fbdf80',
        accentText: 'text-amber-700',
        accentBg: 'bg-amber-400'
      },
      {
        id: 'bubblegum_pink',
        name: 'Şeker Pembesi',
        description: 'Bubblegum & Candy',
        emoji: '🌸',
        accentColor: '#ff5a79',
        bgColor: '#fff9fb',
        cardColor: '#ffeef2',
        textColor: '#9f1239',
        borderColor: '#fca5bc',
        accentText: 'text-rose-700',
        accentBg: 'bg-rose-400'
      },
      {
        id: 'cloud_blue',
        name: 'Bulut Mavisi',
        description: 'Sky Blue Toy',
        emoji: '☁️',
        accentColor: '#38bdf8',
        bgColor: '#f7fbff',
        cardColor: '#eaf5ff',
        textColor: '#1e3a8a',
        borderColor: '#93c9ff',
        accentText: 'text-sky-700',
        accentBg: 'bg-sky-400'
      },
      {
        id: 'mint_green',
        name: 'Elma Yeşili',
        description: 'Mint & Apple Green',
        emoji: '🍏',
        accentColor: '#22c55e',
        bgColor: '#f6fdf9',
        cardColor: '#e6f9ed',
        textColor: '#14532d',
        borderColor: '#87e5a4',
        accentText: 'text-emerald-700',
        accentBg: 'bg-emerald-400'
      },
      {
        id: 'grape_purple',
        name: 'Lolipop Moru',
        description: 'Grape Candy Purple',
        emoji: '🍇',
        accentColor: '#a855f7',
        bgColor: '#faf8ff',
        cardColor: '#f2ebff',
        textColor: '#581c87',
        borderColor: '#cca6ff',
        accentText: 'text-purple-700',
        accentBg: 'bg-purple-400'
      },
      {
        id: 'sunset_orange',
        name: 'Sıcak Portakal',
        description: 'Sunset Orange',
        emoji: '🍊',
        accentColor: '#f97316',
        bgColor: '#fffbf7',
        cardColor: '#ffeedb',
        textColor: '#9a3412',
        borderColor: '#ffb875',
        accentText: 'text-orange-700',
        accentBg: 'bg-orange-400'
      },
      {
        id: 'ocean_teal',
        name: 'Okyanus Turkuaz',
        description: 'Ocean Teal',
        emoji: '🌊',
        accentColor: '#0d9488',
        bgColor: '#f4fcfc',
        cardColor: '#daf6f6',
        textColor: '#115e59',
        borderColor: '#6be0e0',
        accentText: 'text-teal-700',
        accentBg: 'bg-teal-400'
      },
      {
        id: 'forest_green',
        name: 'Orman Yeşili',
        description: 'Forest Green',
        emoji: '🌲',
        accentColor: '#65a30d',
        bgColor: '#fbfdf7',
        cardColor: '#eff7e4',
        textColor: '#3f6212',
        borderColor: '#b4df80',
        accentText: 'text-lime-700',
        accentBg: 'bg-lime-400'
      }
    ];
    return THEME_PALETTES.find(p => p.id === storeSettings.theme) || THEME_PALETTES[0];
  }, [storeSettings.theme]);

  React.useEffect(() => {
    setSettingsName(storeSettings.storeName);
    setSettingsLogo(storeSettings.logoUrl || '');
    setSettingsSlogan(storeSettings.storeSlogan);
    setSettingsCommission(storeSettings.commissionRate);
    setFeaturedTitle(storeSettings.featuredTitle || 'Öne Çıkan Koleksiyon Ürünleri');
    setFeaturedProductIds(storeSettings.featuredProductIds || []);
    setAboutTitle(storeSettings.aboutTitle || 'Biz Kimiz & Tarihçemiz');
    setAboutText(storeSettings.aboutText || '');
    setAboutHistory(storeSettings.aboutHistory || '');
    setNewsletterTitle(storeSettings.newsletterTitle || 'E-Bültenimize Kaydolun');
    setNewsletterSubtitle(storeSettings.newsletterSubtitle || '');
    setContactEmail(storeSettings.contactEmail || '');
    setContactPhone(storeSettings.contactPhone || '');
    setContactAddress(storeSettings.contactAddress || '');
    setContactWorkingHours(storeSettings.contactWorkingHours || '');
    setNewsList(storeSettings.newsList || []);
    setEnableProductModal(storeSettings.enableProductModal !== false);
    setEnableProductZoom(storeSettings.enableProductZoom !== false);
    setZoomScale(storeSettings.zoomScale || 2);
    setShowcaseScrollSpeed(storeSettings.showcaseScrollSpeed !== undefined ? storeSettings.showcaseScrollSpeed : 80);
    setShowcaseProductIds(storeSettings.showcaseProductIds || []);
    setBrandMarqueeEnabled(storeSettings.brandMarqueeEnabled !== false);
    setBrandMarqueeTitle(storeSettings.brandMarqueeTitle || 'Güvendiğimiz Markalar');
    setBrandMarqueeImages(storeSettings.brandMarqueeImages?.length ? storeSettings.brandMarqueeImages : [defaultBrandMarqueeImage]);
    setFooterEnabled(storeSettings.footerEnabled !== false);
    setFooterTitle(storeSettings.footerTitle || 'Esnafın dijital adresi');
    setFooterDescription(storeSettings.footerDescription || 'Yerel kırtasiye esnafını ve müşterileri güvenli bir alışveriş deneyiminde buluşturuyoruz.');
    setFooterShowAbout(storeSettings.footerShowAbout !== false);
    setFooterShowContact(storeSettings.footerShowContact !== false);
    setFooterShowShortcuts(storeSettings.footerShowShortcuts !== false);
    setFooterMapEnabled(storeSettings.footerMapEnabled !== false);
    setFooterLocationEyebrow(storeSettings.footerLocationEyebrow || 'Bizi ziyaret edin');
    setFooterLocationTitle(storeSettings.footerLocationTitle || 'Konumumuz');
    setFooterDirectionsLabel(storeSettings.footerDirectionsLabel || 'Yol Tarifi Al');
    setFooterMapLabel(storeSettings.footerMapLabel || 'Konumu Aç');
    setFooterAboutLinks(storeSettings.footerAboutLinks?.length ? storeSettings.footerAboutLinks : [
      { id: 'about', label: 'Biz Kimiz?', href: '#about-details' },
      { id: 'news', label: 'Haberler & Duyurular', href: '#news-details' },
      { id: 'featured', label: 'Öne Çıkanlar', href: '#featured-collections-section' }
    ]);
    setFooterShortcuts(storeSettings.footerShortcuts?.length ? storeSettings.footerShortcuts : [
      { id: 'products', label: 'Ürünlere Git', href: '#products-grid' },
      { id: 'contact', label: 'İletişim', href: '#contact-info-section' },
    { id: 'about', label: 'Biz Kimiz?', href: '#about-details' },
    { id: 'history', label: 'Tarihçemiz', href: '#history-details' },
    { id: 'news', label: 'Duyurular', href: '#news-details' },
    { id: 'footer', label: 'Sayfanın Sonu', href: '#store-footer' }
    ]);
    setFooterLocations(storeSettings.footerLocations?.length ? storeSettings.footerLocations : [
      { id: 'main-office', label: 'Dünya İş Merkezi', address: storeSettings.contactAddress || 'Yusup Paşa Mahallesi, Dünya İş Merkezi Giriş, Eyyübiye / Şanlıurfa', coordinates: '37.1553535,38.7917175' }
    ]);
    setTelegramNotificationsEnabled(storeSettings.telegramNotificationsEnabled === true);
    setTelegramOrderNotifications(storeSettings.telegramOrderNotifications !== false);
    setTelegramActivityNotifications(storeSettings.telegramActivityNotifications === true);
    setTelegramChatId(storeSettings.telegramChatId || '');
  }, [storeSettings]);

  // --- HESAPLAMALAR ---
  const dealerFinancials = useMemo<Map<string, { salesVolume: number; commissionEarned: number }>>(() => {
    const stats = new Map<string, { salesVolume: number; commissionEarned: number }>();
    dealers.forEach(dealer => stats.set(dealer.id, {
      salesVolume: 0,
      commissionEarned: 0,
    }));

    orders
      .filter(order => order.status === 'completed' && order.adminApproved !== false && !order.commissionVoided)
      .forEach(order => {
        const dealer = dealers.find(item => item.id === order.dealerId);
        if (!dealer) return;
        const current = stats.get(dealer.id) || { salesVolume: 0, commissionEarned: 0 };
        const totalPrice = Number(order.totalPrice ?? 0);
        const dealerRate = dealer.commissionRate ?? storeSettings.commissionRate;
        const storedCommission = Number(order.commissionAmount ?? 0);
        const commission = storedCommission > 0
          ? storedCommission
          : Number((totalPrice * dealerRate / 100).toFixed(2));
        current.salesVolume += totalPrice;
        current.commissionEarned += commission;
        stats.set(dealer.id, current);
      });

    return stats;
  }, [dealers, orders, storeSettings.commissionRate]);

  const totalSalesVolume = useMemo(() => {
    return orders
      .filter(order => order.status === 'completed' && order.adminApproved !== false && order.orderRole !== 'sub')
      .reduce((total, order) => total + Number(order.totalPrice ?? 0), 0);
  }, [orders]);

  const centralPoolBalance = useMemo(() => {
    return orders
      .filter(order => order.status === 'completed' && order.adminApproved !== false && order.orderRole !== 'sub')
      .reduce((total, order) => total + Number(order.totalPrice ?? 0), 0);
  }, [orders]);

  const totalCommissions = useMemo(() => {
    return Array.from(dealerFinancials.values()).reduce<number>((acc, stats) => acc + Number((stats as { commissionEarned: number }).commissionEarned), 0);
  }, [dealerFinancials]);

  const totalPaidCommissions = useMemo(() => {
    return commissionRequests
      .filter(r => r.status === 'approved')
      .reduce((acc, r) => acc + Number(r.amount ?? 0), 0);
  }, [commissionRequests]);

  const pendingDealersCount = useMemo(() => {
    return dealers.filter(d => d.status === 'pending').length;
  }, [dealers]);

  const topDealers = useMemo(() => {
    return [...dealers].sort((a, b) =>
      (dealerFinancials.get(b.id)?.salesVolume ?? 0) - (dealerFinancials.get(a.id)?.salesVolume ?? 0)
    );
  }, [dealers, dealerFinancials]);

  const directPayAvailableAmount = directPayDealer
    ? Number(dealerFinancials.get(directPayDealer.id)?.commissionEarned ?? 0)
    : 0;

  const categories = useMemo(() => {
    const defaultCategories = [
      'Kalemler & Yazım Gereçleri',
      'Defter & Kağıt Ürünleri',
      'Sırt Çantaları & Kutuları',
      'Okul & Ofis Araçları'
    ];
    return Array.from(new Set([...defaultCategories, ...sharedCategories, ...products.map(product => product.category).filter(Boolean)]));
  }, [products, sharedCategories]);

  // --- SIFIRLAMA FONKSİYONLARI ---
  const resetProductForm = () => {
    setProdName('');
    setProdBrand('');
    setProdCategory('Kalemler & Yazım Gereçleri');
    setNewCategoryName('');
    setIsAddingCategory(false);
    setProdPrice(0);
    setProdStock(0);
    setProdImage('');
    setProdImages([]);
    setProdDescription('');
    setProdBarcode('');
    setProdQrCode('');
    setProdDozenQuantity(12);
    setProdDozenPrice(0);
    setProdBoxQuantity(0);
    setProdBoxPrice(0);
    setEditingProductId('');
    setProductFormMode('add');
    setIsProductFormOpen(false);
    setProductAddTab('single');
    setBulkImportFile(null);
    setBulkParsedProducts([]);
    setBulkImportProgress(0);
    setBulkImportStage('');
    setIsBulkImporting(false);
  };

  // --- TOPLU ÜRÜN İÇE AKTARMA YARDIMCI METOTLARI ---
  const getStationeryImage = (name: string, category: string): string => {
    const lowercaseName = name.toLowerCase();
    if (category === 'Kalemler & Yazım Gereçleri' || lowercaseName.includes('kalem') || lowercaseName.includes('uç') || lowercaseName.includes('rotring') || lowercaseName.includes('pencil') || lowercaseName.includes('pen')) {
      const images = [
        'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=500&auto=format&fit=crop&q=60',
        'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=500&auto=format&fit=crop&q=60',
        'https://images.unsplash.com/photo-1569003339405-ea396a5a8a90?w=500&auto=format&fit=crop&q=60'
      ];
      return images[Math.floor(Math.random() * images.length)];
    }
    if (category === 'Defter & Kağıt Ürünleri' || lowercaseName.includes('defter') || lowercaseName.includes('ajanda') || lowercaseName.includes('kağıt') || lowercaseName.includes('karton') || lowercaseName.includes('notebook') || lowercaseName.includes('paper')) {
      const images = [
        'https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=500&auto=format&fit=crop&q=60',
        'https://images.unsplash.com/photo-1517842645767-c639042777db?w=500&auto=format&fit=crop&q=60',
        'https://images.unsplash.com/photo-1516414447565-b14be0adf13e?w=500&auto=format&fit=crop&q=60'
      ];
      return images[Math.floor(Math.random() * images.length)];
    }
    if (category === 'Sırt Çantaları & Kutuları' || lowercaseName.includes('çanta') || lowercaseName.includes('kalemlik') || lowercaseName.includes('cüzdan') || lowercaseName.includes('backpack') || lowercaseName.includes('bag')) {
      const images = [
        'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500&auto=format&fit=crop&q=60',
        'https://images.unsplash.com/photo-1575844261156-872744096012?w=500&auto=format&fit=crop&q=60'
      ];
      return images[Math.floor(Math.random() * images.length)];
    }
    // Default to Okul & Ofis Araçları
    const images = [
      'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=500&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=500&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1452860606245-08befc0ff44b?w=500&auto=format&fit=crop&q=60'
    ];
    return images[Math.floor(Math.random() * images.length)];
  };

  const normalizeImportKey = (value: unknown) => String(value ?? '').trim().toLocaleLowerCase('tr-TR').replace(/[ıİ]/g, 'i').replace(/[ğĞ]/g, 'g').replace(/[üÜ]/g, 'u').replace(/[şŞ]/g, 's').replace(/[öÖ]/g, 'o').replace(/[çÇ]/g, 'c').replace(/[^a-z0-9]/g, '');

  const parseImportNumber = (value: unknown) => {
    const text = String(value ?? '').replace(/[^0-9,.-]/g, '').replace(/\.(?=.*\.)/g, '').replace(',', '.');
    const number = Number(text);
    return Number.isFinite(number) ? number : 0;
  };

  const parsePackaging = (text: string) => {
    const normalized = text.toLocaleLowerCase('tr-TR');
    const dozen = normalized.match(/(\d+)\s*['’]?li|duzine|düzine|gross/);
    const carton = normalized.match(/koli|karton|carton|koli içi\s*(\d+)|koli\s*(\d+)/);
    if (carton) return { packagingType: 'CARTON' as const, itemsPerPackage: Number(carton[1] || carton[2] || 1) };
    if (dozen) return { packagingType: 'DOZEN' as const, itemsPerPackage: Number(dozen[1] || 12) };
    return { packagingType: 'UNIT' as const, itemsPerPackage: 1 };
  };

  const inferImportCategory = (name: string, category: string) => {
    if (category.trim()) return category.trim();
    const text = name.toLocaleLowerCase('tr-TR');
    if (/kalem|tukenmez|tükenmez|versatil|yazı|yazi|silgi/.test(text)) return 'Kalemler & Yazım Gereçleri';
    if (/defter|kağıt|kagit|ajanda|bloknot|fotokopi/.test(text)) return 'Defter & Kağıt Ürünleri';
    if (/çanta|canta|kalemlik|kutu/.test(text)) return 'Sırt Çantaları & Kutuları';
    return 'Okul & Ofis Araçları';
  };

  const createProductsFromRows = (rows: Record<string, unknown>[], embeddedImages: string[] = []): Product[] => {
    const getValue = (row: Record<string, unknown>, keys: string[]) => {
      const entry = Object.entries(row).find(([key]) => keys.includes(normalizeImportKey(key)));
      return entry?.[1] ?? '';
    };
    return rows.map((row, index): Product | null => {
      const name = String(getValue(row, ['urunadi', 'urun', 'product', 'productname', 'title', 'baslik'])).trim();
      if (!name) return null;
      const brand = String(getValue(row, ['marka', 'brand', 'uretici', 'üretici'])).trim() || 'Genel';
      const category = inferImportCategory(name, String(getValue(row, ['kategori', 'category', 'bolum', 'bölüm'])));
      const packagingText = String(getValue(row, ['ambalaj', 'ambalajtipi', 'paket', 'pakettipi', 'package', 'unit'])) || name;
      const packaging = parsePackaging(packagingText);
      const image = embeddedImages[index] || String(getValue(row, ['gorsel', 'görsel', 'resim', 'image', 'imageurl', 'foto'])).trim() || getStationeryImage(name, category);
      return {
        id: `prod-bulk-${Date.now()}-${index}`,
        name,
        brand,
        category,
        price: parseImportNumber(getValue(row, ['fiyat', 'price', 'birimfiyat', 'unitprice'])),
        stock: parseImportNumber(getValue(row, ['stok', 'stock', 'adet', 'miktar', 'stockquantity'])),
        image,
        images: [image],
        packagingType: packaging.packagingType,
        itemsPerPackage: packaging.itemsPerPackage,
        dozenQuantity: packaging.packagingType === 'DOZEN' ? packaging.itemsPerPackage : undefined,
        boxQuantity: packaging.packagingType === 'CARTON' ? packaging.itemsPerPackage : undefined,
        description: `${brand} ${name}`,
        importStatus: 'DRAFT' as const,
        createdAt: new Date().toISOString(),
      } satisfies Product;
    }).filter((product): product is Product => product !== null);
  };

  const handleBulkFileChange = async (file: File) => {
    if (!file) return;
    setBulkImportFile(file);
    setIsBulkImporting(true);
    setBulkImportProgress(10);
    setBulkImportStage('Dosya okunuyor ve tablo yapısı çıkarılıyor...');
    try {
      const extension = file.name.toLocaleLowerCase('tr-TR').split('.').pop();
      let rows: Record<string, unknown>[] = [];
      let embeddedImages: string[] = [];
      if (extension === 'xlsx' || extension === 'xls') {
        const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: '' });
        setBulkImportProgress(65);
        setBulkImportStage('Excel satırları, fiyatlar ve ambalaj bilgileri ayrıştırılıyor...');
      } else if (extension === 'docx') {
        const arrayBuffer = await file.arrayBuffer();
        const [textResult, htmlResult] = await Promise.all([
          mammoth.extractRawText({ arrayBuffer }),
          mammoth.convertToHtml({ arrayBuffer }, { convertImage: mammoth.images.imgElement(image => image.read('base64').then(data => ({ src: `data:${image.contentType};base64,${data}` }))) }),
        ]);
        const htmlImages = htmlResult.value.match(/data:image\/[a-z0-9.+-]+;base64,[^"']+/gi) || [];
        embeddedImages = htmlImages;
        rows = textResult.value.split(/\r?\n/).map(line => line.trim()).filter(Boolean).map(line => {
          const cells = line.split(/\t|;|\|/).map(cell => cell.trim());
          return { 'Ürün Adı': cells[0] || '', Fiyat: cells[1] || '', Stok: cells[2] || '', Kategori: cells[3] || '', Marka: cells[4] || '', Ambalaj: cells[5] || '' };
        });
        setBulkImportProgress(65);
        setBulkImportStage('Word tabloları ve gömülü görseller ayrıştırılıyor...');
      } else if (extension === 'pdf') {
        const pdf = await getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
        const lines: string[] = [];
        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          const page = await pdf.getPage(pageNumber);
          const content = await page.getTextContent();
          lines.push(content.items.map(item => 'str' in item ? item.str : '').join(' ').trim());
        }
        rows = lines.flatMap(line => line.split(/\r?\n/)).map(line => {
          const cells = line.split(/\t|;|\|/).map(cell => cell.trim());
          return { 'Ürün Adı': cells[0] || '', Fiyat: cells[1] || '', Stok: cells[2] || '', Kategori: cells[3] || '', Marka: cells[4] || '', Ambalaj: cells[5] || '' };
        }).filter(row => row['Ürün Adı']);
        setBulkImportProgress(65);
        setBulkImportStage('PDF metin blokları ve ürün satırları ayrıştırılıyor...');
      } else {
        throw new Error('Bu dosya türü desteklenmiyor. Excel, Word veya PDF yükleyiniz.');
      }
      setBulkImportStage('Kategori, görsel ve ambalaj bilgileri eşleştiriliyor...');
      const parsed = createProductsFromRows(rows, embeddedImages);
      if (parsed.length === 0) throw new Error('Dosyada ürün satırı bulunamadı. Başlıkları Ürün Adı, Fiyat, Stok, Kategori ve Marka şeklinde düzenleyiniz.');
      setBulkParsedProducts(parsed);
      setBulkImportProgress(100);
      setBulkImportStage(`${parsed.length} ürün önizleme için hazırlandı.`);
    } catch (error) {
      setBulkImportFile(null);
      alert(error instanceof Error ? error.message : 'Dosya ayrıştırılamadı.');
    } finally {
      setIsBulkImporting(false);
    }
  };

  const handleUpdateBulkParsedProduct = (index: number, updatedProduct: Product) => {
    setBulkParsedProducts(prev => {
      const copy = [...prev];
      copy[index] = updatedProduct;
      return copy;
    });
  };

  const handleRemoveBulkParsedProduct = (index: number) => {
    setBulkParsedProducts(prev => prev.filter((_, idx) => idx !== index));
  };

  const resetDealerForm = () => {
    setDlrName('');
    setDlrOwner('');
    setDlrCity('İstanbul');
    setDlrCityManual(false);
    setDlrManualCityValue('');
    setDlrDistrict('');
    setDlrAddress('');
    setDlrPhone('');
    setDlrEmail('');
    setDlrPassword('');
    setDlrStatus('active');
    setDlrCommissionRate('');
    setDlrPrivateCommissionRate('');
    setDlrAdminSectorCommissionRate('');
    setDlrSector('Kırtasiye');
    setEditingDealerId('');
    setDealerFormMode('add');
    setIsDealerFormOpen(false);
  };

  const resetOrderForm = () => {
    setEditingOrderId('');
    setOrdCustName('');
    setOrdCustEmail('');
    setOrdCustPhone('');
    setOrdStatus('completed');
    setOrdShippingCompany('Yurtiçi Kargo');
    setOrdShippingTrackingNumber('');
    setOrdShippingReceiver('');
    setOrdShippingPhone('');
    setOrdShippingAddress('');
    setOrdShippingCity('İstanbul');
    setOrdShippingDistrict('');
    setOrdShippingStatus('preparing');
    setIsOrderFormOpen(false);
  };

  // --- DÜZENLEME AÇMA METOTLARI ---
  const openProductEdit = (p: Product) => {
    setProductFormMode('edit');
    setEditingProductId(p.id);
    setProdName(p.name);
    setProdBrand(p.brand);
    setProdCategory(p.category);
    setProdPrice(p.price);
    setProdStock(p.stock);
    setProdImage(p.image);
    setProdImages(p.images || (p.image ? [p.image] : []));
    setProdDescription(p.description);
    setProdBarcode(p.barcode || '');
    setProdQrCode(p.qrCode || '');
    setProdDozenQuantity(p.dozenQuantity || 12);
    setProdDozenPrice(p.dozenPrice || 0);
    setProdBoxQuantity(p.boxQuantity || 0);
    setProdBoxPrice(p.boxPrice || 0);
    setIsProductFormOpen(true);
  };

  const openDealerEdit = (d: Dealer) => {
    setDealerFormMode('edit');
    setEditingDealerId(d.id);
    setDlrName(d.name);
    setDlrOwner(d.owner);
    
    const isStandard = ALL_TURKISH_CITIES.includes(d.city);
    if (isStandard) {
      setDlrCity(d.city);
      setDlrCityManual(false);
      setDlrManualCityValue('');
    } else {
      setDlrCity('Diğer');
      setDlrCityManual(true);
      setDlrManualCityValue(d.city);
    }

    setDlrDistrict(d.district);
    setDlrAddress(d.address);
    setDlrPhone(d.phone);
    setDlrEmail(d.email);
    setDlrPassword('');
    setDlrStatus(d.status);
    setDlrCommissionRate(d.commissionRate !== undefined ? d.commissionRate : '');
    setDlrPrivateCommissionRate(d.privateCommissionRate !== undefined ? d.privateCommissionRate : '');
    setDlrAdminSectorCommissionRate(d.adminSectorCommissionRate !== undefined ? d.adminSectorCommissionRate : '');
    setDlrSector(d.sector || 'Kırtasiye');
    setIsDealerFormOpen(true);
  };

  const openOrderEdit = (o: Order) => {
    setEditingOrderId(o.id);
    setOrdCustName(o.customerName);
    setOrdCustEmail(o.customerEmail);
    setOrdCustPhone(o.customerPhone);
    setOrdStatus(o.status);
    setOrdShippingCompany(o.shippingCompany || 'Yurtiçi Kargo');
    setOrdShippingTrackingNumber(o.shippingTrackingNumber || '');
    setOrdShippingReceiver(o.shippingReceiver || o.customerName);
    setOrdShippingPhone(o.shippingPhone || o.customerPhone);
    setOrdShippingAddress(o.shippingAddress || '');
    setOrdShippingCity(o.shippingCity || 'İstanbul');
    setOrdShippingDistrict(o.shippingDistrict || '');
    setOrdShippingStatus(o.shippingStatus || 'preparing');
    setIsOrderFormOpen(true);
  };

  // --- ÜRÜN GÖRSEL YÜKLEME METOTLARI (CİHAZDAN SINIRSIZ VE TÜM BOYUTLAR) ---
  const processFiles = async (files: FileList) => {
    setIsProductUploading(true);
    setImageUploadStatus('Görseller optimize ediliyor...');
    try {
      const uploadedUrls = await Promise.all(Array.from(files).map(file => {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
        return uploadFile(`products/admin/${Date.now()}-${safeName}`, file, {
          onStatus: status => setImageUploadStatus(status === 'optimizing' ? 'Görseller optimize ediliyor...' : 'Optimize edilen görseller yükleniyor...'),
        });
      }));
      setProdImages(prev => [...prev, ...uploadedUrls]);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Ürün görseli yüklenemedi.');
    } finally {
      setIsProductUploading(false);
      setImageUploadStatus('');
    }
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setIsProductUploading(true);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
      const uploadedUrl = await uploadFile(`settings/logo/${Date.now()}-${safeName}`, file, {
        onStatus: status => setImageUploadStatus(status === 'optimizing' ? 'Logo optimize ediliyor...' : 'Optimize edilen logo yükleniyor...'),
      });
      setSettingsLogo(uploadedUrl);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Logo yüklenemedi.');
    } finally {
      setIsProductUploading(false);
    }
  };

  const handleBrandMarqueeFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setIsProductUploading(true);
    try {
      const uploadedUrls = await Promise.all((Array.from(e.target.files) as File[]).map(file => {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
        return uploadFile(`settings/brands/${Date.now()}-${safeName}`, file, {
          onStatus: status => setImageUploadStatus(status === 'optimizing' ? 'Marka görselleri optimize ediliyor...' : 'Optimize edilen marka görselleri yükleniyor...'),
        });
      }));
      setBrandMarqueeImages(prev => [...prev, ...uploadedUrls]);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Marka görseli yüklenemedi.');
    } finally {
      setIsProductUploading(false);
      e.target.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsProductImgDragging(true);
  };

  const handleDragLeave = () => {
    setIsProductImgDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsProductImgDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleRemoveProductImage = (indexToRemove: number) => {
    setProdImages(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // --- SUBMIT METOTLARI ---
  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName || !prodBrand || prodPrice <= 0) {
      alert('Lütfen tüm zorunlu ürün bilgilerini giriniz.');
      return;
    }
    const defaultImg = prodImages[0] || prodImage || 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=500&auto=format&fit=crop&q=60';
    const updatedProduct: Product = {
      id: productFormMode === 'add' ? `prod-${Date.now().toString().slice(-4)}` : editingProductId,
      name: prodName,
      brand: prodBrand,
      category: prodCategory,
      price: Number(prodPrice),
      stock: Number(prodStock),
      image: defaultImg,
      images: prodImages.length > 0 ? prodImages : [defaultImg],
      description: prodDescription,
      barcode: prodBarcode.trim() || undefined,
      qrCode: prodQrCode.trim() || undefined,
      dozenQuantity: prodDozenQuantity > 0 ? Number(prodDozenQuantity) : undefined,
      dozenPrice: prodDozenPrice > 0 ? Number(prodDozenPrice) : undefined,
      boxQuantity: prodBoxQuantity > 0 ? Number(prodBoxQuantity) : undefined,
      boxPrice: prodBoxPrice > 0 ? Number(prodBoxPrice) : undefined,
    };
    await onSaveProduct(updatedProduct);
    resetProductForm();
  };

  const handleDealerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dlrName || !dlrOwner || !dlrDistrict || !dlrPhone) {
      alert('Lütfen zorunlu bayi bilgilerini doldurunuz.');
      return;
    }
    
    const cityToSave = dlrCityManual ? dlrManualCityValue.trim() : dlrCity;
    if (!cityToSave) {
      alert('Lütfen geçerli bir şehir adı giriniz veya seçiniz.');
      return;
    }

    const updatedDealer: Dealer = {
      id: dealerFormMode === 'add' ? `bayi-${Date.now().toString().slice(-4)}` : editingDealerId,
      name: dlrName,
      owner: dlrOwner,
      sector: dlrSector,
      city: cityToSave,
      district: dlrDistrict,
      address: dlrAddress || 'Adres bilgisi girilmedi.',
      phone: dlrPhone,
      email: dlrEmail || `${dlrDistrict.toLowerCase()}@kirtasiye.com`,
      status: dlrStatus,
      commissionRate: dlrCommissionRate !== '' ? Number(dlrCommissionRate) : undefined,
      privateCommissionRate: dlrPrivateCommissionRate !== '' ? Number(dlrPrivateCommissionRate) : undefined,
      adminSectorCommissionRate: dlrAdminSectorCommissionRate !== '' ? Number(dlrAdminSectorCommissionRate) : undefined,
      salesVolume: dealerFormMode === 'add' ? 0 : dealers.find(d => d.id === editingDealerId)?.salesVolume || 0,
      commissionEarned: dealerFormMode === 'add' ? 0 : dealers.find(d => d.id === editingDealerId)?.commissionEarned || 0,
      createdAt: dealerFormMode === 'add' ? new Date().toISOString() : dealers.find(d => d.id === editingDealerId)?.createdAt || new Date().toISOString()
    };
    if (dealerFormMode === 'add' && !dlrPassword) {
      alert('Yeni bayi için Firebase Authentication şifresi gereklidir.');
      return;
    }
    void onSaveDealer(updatedDealer, dlrPassword || undefined);
    resetDealerForm();
  };

  const handleOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ordCustName || !ordCustPhone) {
      alert('Lütfen müşteri bilgilerini doldurunuz.');
      return;
    }

    const updatedOrders = orders.map(o => {
      if (o.id === editingOrderId) {
        // Recalculate commission if state is being changed
        // If state changed to cancelled, commission is 0. If changed back to completed, recalculate!
        let calculatedCommission = o.commissionAmount;
        if (ordStatus === 'cancelled') {
          calculatedCommission = 0;
        } else if (o.status === 'cancelled' && ordStatus === 'completed') {
          const matchingDealer = dealers.find(d => d.id === o.dealerId);
          if (matchingDealer) {
            calculatedCommission = calculateOrderFinancials(
              o.totalPrice,
              matchingDealer,
              storeSettings,
              Boolean(o.isFromDealerPage),
            ).dealerCommissionAmount;
          }
        }

        return {
          ...o,
          customerName: ordCustName,
          customerEmail: ordCustEmail,
          customerPhone: ordCustPhone,
          status: ordStatus,
          commissionAmount: calculatedCommission,
          shippingCompany: ordShippingCompany,
          shippingTrackingNumber: ordShippingTrackingNumber || `tr-${Date.now().toString().slice(-4)}`,
          shippingReceiver: ordShippingReceiver,
          shippingPhone: ordShippingPhone,
          shippingAddress: ordShippingAddress,
          shippingCity: ordShippingCity,
          shippingDistrict: ordShippingDistrict,
          shippingStatus: ordShippingStatus
        };
      }
      return o;
    });

    onSaveOrdersList(updatedOrders);
    resetOrderForm();
  };

  // --- SİPARİŞİ LİSTEDEN SİL ---
  const handleOrderDelete = (id: string) => {
    if (confirm(`Sipariş ID: ${id} kaydını çöp kutusuna taşımak istediğinize emin misiniz?`)) {
      void Promise.resolve(onDeleteMemberOrder(id)).catch(error => alert(error instanceof Error ? error.message : 'Sipariş arşivlenemedi.'));
    }
  };

  const handleMemberOrderDelete = async (orderId: string) => {
    if (!confirm(`Bu siparişi üyenin panelinden gizlemek istediğinizden emin misiniz?\n\nSipariş yönetici panelinde ve mali kayıtlarda (havuz bakiyesi) korunacak, sadece üye panelinden gizlenecektir.`)) return;
    try {
      await onDeleteMemberOrder(orderId);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Sipariş gizleme işlemi başarısız oldu.');
    }
  };

  const handlePermanentOrderDelete = async (orderId: string) => {
    if (!confirm(`⚠️ KALICI SİLME UYARISI\n\nBu siparişi yönetici panelinden de kalıcı olarak gizlemek istediğinizden emin misiniz?\n\nMali kayıtlar (havuz bakiyesi ve komisyon tutarları) KORUNACAKTIR. Sipariş yalnızca panelden gizlenecektir.`)) return;
    try {
      await onPermanentDeleteOrder?.(orderId);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Kalıcı silme işlemi başarısız oldu.');
    }
  };

  // --- BAYİ SİPARİŞİ ONAYLAMA (GELEN BAYİ VEYA MÜŞTERİ TALEBİ) ---
  const handleReceiptDecision = (orderId: string, decision: 'approved' | 'rejected') => {
    const updated = orders.map(order => {
      if (order.id !== orderId) return order;

      const matchingDealer = dealers.find(dealer => dealer.id === order.dealerId);
      const financials = matchingDealer
        ? calculateOrderFinancials(order.totalPrice, matchingDealer, storeSettings, Boolean(order.isFromDealerPage))
        : null;
      const approved = decision === 'approved';

      return {
        ...order,
        receiptStatus: decision,
        paymentStatus: decision,
        adminApproved: approved,
        status: approved ? 'completed' as const : 'pending' as const,
        receiptMessage: approved ? 'Dekont yönetici tarafından onaylandı.' : 'Dekont doğrulanamadı. Lütfen yeni bir dekont yükleyin.',
        payment: { method: 'bank_transfer' as const, status: decision },
        receipt: { uploaded: true, dataUrl: order.receiptDataUrl, fileName: order.receiptFileName, status: decision, message: approved ? 'Dekont yönetici tarafından onaylandı.' : 'Dekont doğrulanamadı. Lütfen yeni bir dekont yükleyin.' },
        ...(approved && financials ? {
          commissionAmount: financials.dealerCommissionAmount,
          adminCommissionAmount: financials.adminCommissionAmount,
        } : {}),
      };
    });
    void onSaveOrdersList(updated);
  };

  const handleReceiptDelete = (orderId: string) => {
    if (!confirm(`Sipariş ${orderId} dekontunu çöp kutusuna taşımak istediğinize emin misiniz?`)) return;
    void Promise.resolve(onArchiveReceipt(orderId)).catch(error => alert(error instanceof Error ? error.message : 'Dekont arşivlenemedi.'));
  };

  const handleApproveOrder = (orderId: string) => {
    const updated = orders.map(o => {
      if (o.id === orderId) {
        // Find matching dealer to calculate accurate commission
        const matchingDealer = dealers.find(d => d.id === o.dealerId);
        if (!matchingDealer) return o;
        const financials = calculateOrderFinancials(
          o.totalPrice,
          matchingDealer,
          storeSettings,
          Boolean(o.isFromDealerPage),
        );

        return {
          ...o,
          adminApproved: true,
          status: 'completed' as const,
          paymentStatus: o.paymentMethod === 'bank_transfer' ? 'approved' as const : o.paymentStatus,
          receiptStatus: o.paymentMethod === 'bank_transfer' ? 'approved' as const : o.receiptStatus,
          payment: o.payment ? { ...o.payment, status: 'approved' as const } : o.payment,
          receipt: o.receipt ? { ...o.receipt, status: 'approved' as const, message: 'Sipariş yönetici tarafından onaylandı.' } : o.receipt,
          commissionAmount: financials.dealerCommissionAmount,
          adminCommissionAmount: financials.adminCommissionAmount,
        };
      }
      return o;
    });
    onSaveOrdersList(updated);
    alert(`Sipariş ${orderId} onaylandı ve ilgili bayinin hakedişine/cirosuna yansıtıldı.`);
  };

  // --- ADMİN DOĞRUDAN SİPARİŞ OLUŞTURMA (SİPARİŞ ALINDI ONAYLI) ---
  const handleAdminNewOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const targetDealerId = adminOrderDealerId || dealers[0]?.id;
    const targetProductId = adminOrderProductId || products[0]?.id;

    const dealer = dealers.find(d => d.id === targetDealerId);
    const product = products.find(p => p.id === targetProductId);

    if (!dealer || !product) {
      alert('Lütfen geçerli bir bayi ve ürün seçin.');
      return;
    }

    const price = product.price;
    const totalPrice = price * adminOrderQuantity;
    const financials = calculateOrderFinancials(totalPrice, dealer, storeSettings, false);

    const newOrder: Order = {
      id: `sip-${Date.now().toString().slice(-4)}`,
      dealerId: dealer.id,
      dealerName: dealer.name,
      customerName: adminCustName || 'Süper Admin Siparişi',
      customerEmail: `${dealer.id}@kirtasiye.com`,
      customerPhone: adminCustPhone || dealer.phone,
      items: [
        {
          productId: product.id,
          name: product.name,
          quantity: adminOrderQuantity,
          price: price
        }
      ],
      totalPrice,
      commissionAmount: financials.dealerCommissionAmount,
      adminCommissionAmount: financials.adminCommissionAmount,
      date: new Date().toISOString(),
      status: 'completed',
      createdBy: 'admin',
      adminApproved: true,
      shippingCompany: 'Merkez Kargo',
      shippingTrackingNumber: `BG-${Math.floor(100000 + Math.random() * 900000)}`,
      shippingAddress: adminCustAddress || dealer.address,
      shippingCity: dealer.city,
      shippingDistrict: dealer.district,
      shippingReceiver: adminCustName || dealer.owner,
      shippingPhone: adminCustPhone || dealer.phone,
      shippingStatus: 'preparing'
    };

    onSaveOrdersList([...orders, newOrder]);
    
    // Reset states
    setIsAdminNewOrderFormOpen(false);
    setAdminCustName('');
    setAdminCustPhone('');
    setAdminCustAddress('');
    setAdminOrderQuantity(1);
    
    alert('Doğrudan sipariş oluşturuldu ve bayiye gönderildi (Sipariş Alındı Onaylı).');
  };

  // --- AYARLARI KAYDET ---
  const ensureBrandImageUrls = async (images: string[]) => {
    return Promise.all(images.map(async (image, index) => {
      if (!image.startsWith('data:')) return image;
      const [metadata, encoded] = image.split(',', 2);
      const mimeType = metadata.match(/^data:(.*?);base64$/)?.[1] || 'image/png';
      const binary = atob(encoded);
      const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
      const extension = mimeType.split('/')[1] || 'png';
      const file = new File([bytes], `legacy-brand-${Date.now()}-${index}.${extension}`, { type: mimeType });
      return uploadFile(`settings/brands/${Date.now()}-${index}.${extension}`, file);
    }));
  };

  const handleSaveSettings = async (themeName?: StoreSettings['theme']) => {
    const nextTheme = themeName || storeSettings.theme;
    const persistedBrandMarqueeImages = await ensureBrandImageUrls(brandMarqueeImages);
    setBrandMarqueeImages(persistedBrandMarqueeImages);
    const newSettings: StoreSettings = {
      theme: nextTheme,
      storeName: settingsName || 'Buğurca Kırtasiye',
      logoUrl: settingsLogo.trim(),
      storeSlogan: settingsSlogan || 'Yerli Kırtasiye Esnafını Koruyan Hibrit E-Ticaret Modeli',
      commissionRate: Number(settingsCommission),
      centralBankName,
      centralAccountHolder,
      centralIban,
      centralBankInstructions,
      featuredTitle,
      featuredProductIds,
      aboutTitle,
      aboutText,
      aboutHistory,
      newsletterTitle,
      newsletterSubtitle,
      contactEmail,
      contactPhone,
      contactAddress,
      contactWorkingHours,
      newsList,
      enableProductModal,
      enableProductZoom,
      zoomScale: Number(zoomScale),
      showcaseScrollSpeed: Number(showcaseScrollSpeed),
      showcaseProductIds,
      brandMarqueeEnabled,
      brandMarqueeTitle,
      brandMarqueeImages: persistedBrandMarqueeImages,
      footerEnabled,
      footerTitle,
      footerDescription,
      footerShowAbout,
      footerShowContact,
      footerShowShortcuts,
      footerMapEnabled,
      footerLocationEyebrow,
      footerLocationTitle,
      footerDirectionsLabel,
      footerMapLabel,
      footerAboutLinks,
      footerShortcuts,
      footerLocations,
      telegramNotificationsEnabled,
      telegramOrderNotifications,
      telegramActivityNotifications,
      telegramChatId
    };
    onSaveStoreSettings(newSettings);
    setIsSettingsSavedSuccess(true);
    setTimeout(() => setIsSettingsSavedSuccess(false), 3000);
  };

  const saveAndApplyNewsList = async (updatedList: any[]) => {
    setNewsList(updatedList);
    const persistedBrandMarqueeImages = await ensureBrandImageUrls(brandMarqueeImages);
    setBrandMarqueeImages(persistedBrandMarqueeImages);
    const newSettings: StoreSettings = {
      theme: storeSettings.theme,
      storeName: settingsName || 'Buğurca Kırtasiye',
      logoUrl: settingsLogo.trim(),
      storeSlogan: settingsSlogan || 'Yerli Kırtasiye Esnafını Koruyan Hibrit E-Ticaret Modeli',
      commissionRate: Number(settingsCommission),
      centralBankName,
      centralAccountHolder,
      centralIban,
      centralBankInstructions,
      featuredTitle,
      featuredProductIds,
      aboutTitle,
      aboutText,
      aboutHistory,
      newsletterTitle,
      newsletterSubtitle,
      contactEmail,
      contactPhone,
      contactAddress,
      contactWorkingHours,
      newsList: updatedList,
      enableProductModal,
      enableProductZoom,
      zoomScale: Number(zoomScale),
      showcaseScrollSpeed: Number(showcaseScrollSpeed),
      showcaseProductIds,
      brandMarqueeEnabled,
      brandMarqueeTitle,
      brandMarqueeImages: persistedBrandMarqueeImages,
      footerEnabled,
      footerTitle,
      footerDescription,
      footerShowAbout,
      footerShowContact,
      footerShowShortcuts,
      footerMapEnabled,
      footerLocationEyebrow,
      footerLocationTitle,
      footerDirectionsLabel,
      footerMapLabel,
      footerAboutLinks,
      footerShortcuts,
      footerLocations,
      telegramNotificationsEnabled,
      telegramOrderNotifications,
      telegramActivityNotifications,
      telegramChatId
    };
    onSaveStoreSettings(newSettings);
  };

  const handleDownloadBackup = async () => {
    if (!confirm('Sitedeki ürün, bayi, üye, sipariş ve ayar verilerini indirmek istediğinizden emin misiniz?')) return;
    setIsBackupProcessing(true);
    try {
      const backup = await createAppBackup();
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bugurca-site-yedegi-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Site verileri indirilemedi.');
    } finally {
      setIsBackupProcessing(false);
    }
  };

  const handleBackupFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!confirm('Seçilen yedek mevcut site verilerinin üzerine yazılacak. Geri yüklemek istediğinizden emin misiniz?')) return;

    setIsBackupProcessing(true);
    try {
      const backup = JSON.parse(await file.text());
      await restoreAppBackup(backup);
      await onBackupRestored?.();
      alert('Yedek başarıyla geri yüklendi. Site son yedek durumuna getirildi.');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Yedek geri yüklenemedi.');
    } finally {
      setIsBackupProcessing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in" id="admin-dashboard">
      {/* Admin Panel Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-slate-200">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
              MERKEZİ YETKİ
            </span>
            <span className="bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
              DİNAMİK YÖNETİM
            </span>
          </div>
          <h2 className="font-display font-extrabold text-2xl text-slate-900 tracking-tight">
            Süper Admin Master Konsolu
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Temayı değiştirin, platform ismini düzenleyin, komisyon oranını yönetin ve tüm ürün, bayi, sipariş verilerini güncelleyin.
          </p>
        </div>

        {/* Action Buttons based on subtabs */}
        <div className="flex gap-2">
          {activeSubTab === 'products' && (
            <div className="flex gap-2">
              <button
                id="admin-bulk-update-btn"
                onClick={() => {
                  setIsBulkUpdateOpen(!isBulkUpdateOpen);
                  setIsProductFormOpen(false);
                }}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shadow-md shadow-amber-600/15 cursor-pointer"
              >
                <Percent className="w-4 h-4" /> Toplu Fiyat Güncelle
              </button>
              <button
                id="admin-add-product-btn"
                onClick={() => {
                  setProductFormMode('add');
                  setIsProductFormOpen(true);
                  setIsBulkUpdateOpen(false);
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shadow-md shadow-purple-600/15 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Yeni Ürün Tanımla
              </button>
            </div>
          )}
          {activeSubTab === 'dealers' && (
            <button
              id="admin-add-dealer-btn"
              onClick={() => {
                setDealerFormMode('add');
                setIsDealerFormOpen(true);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shadow-md shadow-emerald-600/15 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Doğrudan Esnaf Bayi Ekle
            </button>
          )}
        </div>
      </div>

      {/* ADMIN TABS MENU */}
      <div className="flex flex-wrap border-b border-slate-200 gap-1 bg-slate-100/80 p-1 rounded-2xl w-fit" id="admin-sub-tabs">
        <button
          id="admin-subtab-dashboard"
          onClick={() => setActiveSubTab('dashboard')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'dashboard'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" /> Raporlar & İstatistik
        </button>
        <button
          id="admin-subtab-settings"
          onClick={() => setActiveSubTab('settings')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'settings'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
          }`}
        >
          <Palette className="w-3.5 h-3.5" /> Görünüm, Tema & Ayarlar
        </button>
        <button
          id="admin-subtab-products"
          onClick={() => setActiveSubTab('products')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'products'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" /> Ürün Kataloğu
        </button>
        <button
          id="admin-subtab-dealers"
          onClick={() => setActiveSubTab('dealers')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'dealers'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
          }`}
        >
          <Users className="w-3.5 h-3.5" /> Bayiler & Esnaflar ({dealers.length})
        </button>
        <button
          id="admin-subtab-members"
          onClick={() => setActiveSubTab('members')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'members'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
          }`}
        >
          <Users className="w-3.5 h-3.5" /> Üyeler ({members.length})
        </button>
        <button
          id="admin-subtab-archive"
          onClick={() => setActiveSubTab('archive')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'archive'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
          }`}
        >
          <Archive className="w-3.5 h-3.5" /> Çöp Kutusu ({archives.length})
        </button>
        <button
          id="admin-subtab-orders"
          onClick={() => setActiveSubTab('orders')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'orders'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
          }`}
        >
          <FileText className="w-3.5 h-3.5" /> Siparişleri Yönet ({orders.filter(order => !order.adminHidden).length})
        </button>
      </div>

      {activeSubTab === 'archive' && (
        <ArchivePanel
          records={archives}
          onRestore={onRestoreArchive}
          onPermanentlyDelete={onPermanentlyDeleteArchive}
        />
      )}

      {/* --- 1. OVERVIEW DASHBOARD TAB --- */}
      {activeSubTab === 'dashboard' && (
        <div className="space-y-8" id="admin-overview-section">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 shadow-2xs">
              <span className="text-slate-400 text-[10px] font-bold tracking-wider uppercase">MERKEZİ CİRO HACMİ</span>
              <p className="text-xl font-extrabold text-slate-900 font-mono">
                {totalSalesVolume.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL
              </p>
              <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> Tüm Bayiler Toplamı
              </span>
              <button
                type="button"
                onClick={async () => {
                  if (!window.confirm('Yalnızca test modunda oluşturulan tüm siparişleri silmek istediğinizden emin misiniz? Gerçek siparişler korunacaktır.')) return;
                  await onDeleteTestOrders();
                }}
                className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 hover:text-amber-800 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" /> Tüm Testleri Sil
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!window.confirm('Sipariş, ciro, komisyon ve ödeme talebi kayıtlarını sıfırlamak istediğinizden emin misiniz? Bayi, üye, ürün ve ayarlar korunacaktır.')) return;
                  await onResetFinancialData();
                }}
                className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 hover:text-rose-800 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" /> Sipariş ve Finans Verilerini Sıfırla
              </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 shadow-2xs">
              <span className="text-slate-400 text-[10px] font-bold tracking-wider uppercase">TOPLAM ESNAF KOMİSYONU</span>
              <p className="text-xl font-extrabold text-amber-600 font-mono">
                {totalCommissions.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL
              </p>
              <span className="text-[10px] text-amber-600 font-semibold flex items-center gap-1">
                <Percent className="w-3 h-3" /> Sabit Oran: %{storeSettings.commissionRate}
              </span>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 shadow-2xs">
              <span className="text-slate-400 text-[10px] font-bold tracking-wider uppercase">ÖDENEN TOPLAM KOMİSYON</span>
              <p className="text-xl font-extrabold text-blue-600 font-mono">
                {totalPaidCommissions.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL
              </p>
              <span className="text-[10px] text-blue-600 font-semibold flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Ödenmiş/Onaylı Talepler
              </span>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 shadow-2xs">
              <span className="text-slate-400 text-[10px] font-bold tracking-wider uppercase">ONAY BEKLEYEN BAYİLER</span>
              <p className="text-xl font-extrabold text-slate-900 font-mono">
                {pendingDealersCount} Bayi
              </p>
              <span className="text-[10px] text-purple-600 font-medium">
                Yeni başvuru kuyruğu
              </span>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 shadow-2xs">
              <span className="text-slate-400 text-[10px] font-bold tracking-wider uppercase">KATALOGDAKİ ÜRÜNLER</span>
              <p className="text-xl font-extrabold text-slate-900 font-mono">
                {products.length} Çeşit
              </p>
              <span className="text-[10px] text-slate-500 font-medium">
                Merkez envanter listesi
              </span>
            </div>
          </div>

          {/* Pending dealer approvals alert */}
          {pendingDealersCount > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-2xs">
              <div className="flex gap-3 items-start">
                <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-xs text-slate-900">Onay Sırasında Bekleyen Esnaflar Var!</h4>
                  <p className="text-xs text-slate-500">
                    Sistemde onay verilmemiş {pendingDealersCount} kırtasiye esnafı bulunuyor. Onay vererek satış ortağı olmalarını sağlayın.
                  </p>
                </div>
              </div>
              <button
                id="pending-approval-action-btn"
                onClick={() => setActiveSubTab('dealers')}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer"
              >
                Esnaf Listesine Git
              </button>
            </div>
          )}

          {/* Performance chart */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-2xs">
              <div>
                <h3 className="font-display font-bold text-xs text-slate-900 tracking-tight uppercase">
                  Esnaf Bayileri Ciro Dağılım Grafiği
                </h3>
                <p className="text-[10px] text-slate-400">Her bayinin platformdaki toplam cirosunu ve kazandığı %{storeSettings.commissionRate} komisyonu takip edin.</p>
              </div>

              <div className="pt-4" id="custom-performance-chart">
                {dealers.length === 0 ? (
                  <p className="text-center text-slate-400 text-xs py-8">Kayıtlı bayi bulunmuyor.</p>
                ) : (
                  <div className="space-y-4">
                    {dealers.map(dealer => {
                      const financials = dealerFinancials.get(dealer.id);
                      const salesVolume = financials?.salesVolume ?? 0;
                      const commissionEarned = financials?.commissionEarned ?? 0;
                      const maxVolume = Math.max(...Array.from(dealerFinancials.values()).map(stats => Number((stats as { salesVolume: number }).salesVolume)), 1);
                      const percentage = (salesVolume / maxVolume) * 100;
                      return (
                        <div key={dealer.id} className="space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-semibold text-slate-700 truncate max-w-[200px]">
                              {dealer.name} ({dealer.city})
                            </span>
                            <span className="font-mono text-slate-500">
                              {salesVolume.toLocaleString('tr-TR')} TL (Komisyon: <strong className="text-amber-600">{commissionEarned.toLocaleString('tr-TR')} TL</strong>)
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                            <div
                              style={{ width: `${Math.max(percentage, 2)}%` }}
                              className={`h-full rounded-full transition-all duration-1000 ${
                                dealer.status === 'active' ? 'bg-purple-600' : 'bg-slate-300'
                              }`}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Top performing dealers */}
            <div className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-2xs">
              <h3 className="font-display font-bold text-xs text-slate-900 tracking-tight uppercase">
                🏆 Ciro Liderleri Sıralaması
              </h3>
              <div className="divide-y divide-slate-100" id="top-dealers-rank">
                {topDealers.slice(0, 5).map((dealer, idx) => (
                  <div key={dealer.id} className="py-2.5 flex items-center justify-between gap-3 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-2">
                      <span className={`w-5.5 h-5.5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        idx === 0 ? 'bg-amber-500 text-slate-950' :
                        idx === 1 ? 'bg-slate-200 text-slate-700' :
                        idx === 2 ? 'bg-amber-700/20 text-amber-800' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <h4 className="font-bold text-xs text-slate-800 truncate max-w-[120px]">{dealer.name}</h4>
                        <span className="text-[9px] text-slate-400">{dealer.city} / {dealer.district}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-mono font-bold text-xs text-slate-900 block">
                        {Number(dealer.salesVolume ?? 0).toLocaleString('tr-TR')} TL
                      </span>
                      <span className="text-[9px] text-amber-600 font-semibold">
                        {Number(dealer.commissionEarned ?? 0).toFixed(2)} TL
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* EsnafShield High Security Panel */}
          <div className="hidden bg-slate-900 text-white rounded-3xl p-6 relative overflow-hidden shadow-lg border border-slate-800" id="esnafshield-admin-panel">
            <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl"></div>
            <div className="relative space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-500/20 text-emerald-400 p-2.5 rounded-xl border border-emerald-500/30">
                    <ShieldCheck className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="font-display font-extrabold text-base text-slate-100 flex items-center gap-2">
                      EsnafShield™ Siber Güvenlik Altyapısı Aktif
                    </h4>
                    <p className="text-[10px] text-emerald-400 font-mono tracking-wider uppercase font-semibold">
                      Saldırı Engelleme & Veri Koruma Katmanı (DoS / DDoS Korumalı)
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                  {setSecurityGateEnabled && (
                    <button
                      type="button"
                      onClick={() => setSecurityGateEnabled(!securityGateEnabled)}
                      className={`font-black text-[10px] uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all cursor-pointer border ${
                        securityGateEnabled
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                          : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                      }`}
                    >
                      {securityGateEnabled ? '2FA Kapat' : '2FA Aktifleştir'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      document.getElementById('waf-control-center-trigger-btn')?.click();
                    }}
                    className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-[10px] uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-md shadow-emerald-500/15"
                  >
                    WAF Komuta Merkezini Aç
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
                Sistemimiz, kötü niyetli kişi veya bot yazılımlarından gelebilecek her türlü DoS/DDoS saldırısı, SQL Injection, XSS siber saldırı girişimlerine ve veri hırsızlığına karşı askeri düzeyde koruma kalkanıyla donatılmıştır.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs pt-2">
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-1.5">
                  <span className={`text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded ${securityGateEnabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-500'}`}>
                    {securityGateEnabled ? 'KORUMA ETKİN' : 'DEVRE DIŞI'}
                  </span>
                  <strong className="text-white block text-xs">Telefonla Giriş Kapısı (2FA):</strong>
                  <p className="text-slate-400 text-[10px] leading-relaxed">
                    Yönetici ve Bayiler sisteme girerken kayıtlı telefon numaralarına 6 haneli doğrulama SMS'i gönderilir. {securityGateEnabled ? 'Şu an telefon doğrulama koruması devrededir.' : 'Şu an pasiftir, doğrudan geçiş sağlanabilir.'}
                  </p>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-1.5">
                  <span className="bg-emerald-500/20 text-emerald-400 text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded">AKTİF</span>
                  <strong className="text-white block text-xs">DoS / DDoS Filtresi:</strong>
                  <p className="text-slate-400 text-[10px] leading-relaxed">
                    Saniyede gelebilecek yüzbinlerce sahte istek Anycast CDN sunucularımızda emilerek sistemin çökmesi veya aksaması %100 önlenir.
                  </p>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-1.5">
                  <span className="bg-emerald-500/20 text-emerald-400 text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded">DEVREDE</span>
                  <strong className="text-white block text-xs">WAF Saldırı Filtresi:</strong>
                  <p className="text-slate-400 text-[10px] leading-relaxed">
                    Tüm adres girdileri, SQLi ve XSS kalkanıyla temizlenerek veritabanımızın çalınması, manipüle edilmesi veya zarar görmesi engellenir.
                  </p>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-1.5">
                  <span className="bg-emerald-500/20 text-emerald-400 text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded">ŞİFRELİ</span>
                  <strong className="text-white block text-xs">Veri Tabanı Bütünlüğü:</strong>
                  <p className="text-slate-400 text-[10px] leading-relaxed">
                    Depolanan esnaf ve sipariş bilgileri AES-256 standardı ile şifrelenir ve harici sızmalara karşı izole ortamlarda yedeklenir.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- 2. CONFIGURATIONS & THEME MANAGER TAB --- */}
      {activeSubTab === 'settings' && (
        <div className="space-y-6" id="admin-settings-section">
          <div className="bg-white border border-blue-200 rounded-2xl p-6 space-y-4 shadow-2xs" id="admin-backup-section">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="font-display font-bold text-sm text-slate-900 uppercase flex items-center gap-2">
                  <Download className="w-4.5 h-4.5 text-blue-600" />
                  Site Verileri Yedekleme ve Geri Yükleme
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Ürün, bayi, üye, sipariş, ayar ve komisyon verilerini JSON kod dosyası olarak saklayın veya son yedeğe geri dönün.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleDownloadBackup}
                  disabled={isBackupProcessing}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer disabled:cursor-wait"
                >
                  <Download className="w-3.5 h-3.5" />
                  {isBackupProcessing ? 'İşleniyor...' : 'Veri İndir'}
                </button>
                <input
                  ref={backupFileInputRef}
                  type="file"
                  accept="application/json,.json"
                  onChange={handleBackupFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => backupFileInputRef.current?.click()}
                  disabled={isBackupProcessing}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 cursor-pointer disabled:cursor-wait"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Veri Yükle
                </button>
              </div>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] leading-relaxed text-amber-800">
              Geri yükleme mevcut verilerin üzerine yazılır ve yedekte bulunmayan belgeler ilgili koleksiyonlardan kaldırılır. Yedek dosyasını güvenli bir cihazda saklayın; kullanıcı parolaları dışa aktarılmaz.
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-2xs">
            <div>
              <h3 className="font-display font-bold text-sm text-slate-900 uppercase flex items-center gap-2">
                <Palette className="w-4.5 h-4.5 text-purple-600" />
                Ana Ekran Renk & Tema Seçenekleri
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Uygulamanın müşteri ve bayi panellerindeki ana renk şemasını ve butik arka plan stilini tek tıkla değiştirin.
              </p>
            </div>

            {/* New, Modern, Interactive Color Selection System */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
              
              {/* Left Side: Dynamic Theme Palette Options */}
              <div className="lg:col-span-7 space-y-4">
                <span className="text-[11px] font-bold text-slate-500 tracking-wider uppercase block flex items-center gap-1.5">
                  🎨 Mevcut Renk Paletleri
                </span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {[
                    {
                      id: 'honey_yellow',
                      name: 'Bal Sarısı',
                      description: 'Sarı Butter & Bal',
                      emoji: '🍯',
                      accentColor: '#f59e0b',
                      bgColor: '#fffdf5',
                      cardColor: '#fef8e3',
                      textColor: '#854d0e',
                      borderColor: '#fbdf80',
                      glowClass: 'hover:shadow-[0_0_15px_rgba(245,158,11,0.15)] focus:shadow-[0_0_15px_rgba(245,158,11,0.2)] border-amber-500/35 bg-amber-50/10'
                    },
                    {
                      id: 'bubblegum_pink',
                      name: 'Şeker Pembesi',
                      description: 'Bubblegum & Candy',
                      emoji: '🌸',
                      accentColor: '#ff5a79',
                      bgColor: '#fff9fb',
                      cardColor: '#ffeef2',
                      textColor: '#9f1239',
                      borderColor: '#fca5bc',
                      glowClass: 'hover:shadow-[0_0_15px_rgba(255,90,121,0.15)] focus:shadow-[0_0_15px_rgba(255,90,121,0.2)] border-rose-500/35 bg-rose-50/10'
                    },
                    {
                      id: 'cloud_blue',
                      name: 'Bulut Mavisi',
                      description: 'Sky Blue Toy',
                      emoji: '☁️',
                      accentColor: '#38bdf8',
                      bgColor: '#f7fbff',
                      cardColor: '#eaf5ff',
                      textColor: '#1e3a8a',
                      borderColor: '#93c9ff',
                      glowClass: 'hover:shadow-[0_0_15px_rgba(56,189,248,0.15)] focus:shadow-[0_0_15px_rgba(56,189,248,0.2)] border-blue-500/35 bg-blue-50/10'
                    },
                    {
                      id: 'mint_green',
                      name: 'Elma Yeşili',
                      description: 'Mint & Apple Green',
                      emoji: '🍏',
                      accentColor: '#22c55e',
                      bgColor: '#f6fdf9',
                      cardColor: '#e6f9ed',
                      textColor: '#14532d',
                      borderColor: '#87e5a4',
                      glowClass: 'hover:shadow-[0_0_15px_rgba(34,197,94,0.15)] focus:shadow-[0_0_15px_rgba(34,197,94,0.2)] border-emerald-500/35 bg-emerald-50/10'
                    },
                    {
                      id: 'grape_purple',
                      name: 'Lolipop Moru',
                      description: 'Grape Candy Purple',
                      emoji: '🍇',
                      accentColor: '#a855f7',
                      bgColor: '#faf8ff',
                      cardColor: '#f2ebff',
                      textColor: '#581c87',
                      borderColor: '#cca6ff',
                      glowClass: 'hover:shadow-[0_0_15px_rgba(168,85,247,0.15)] focus:shadow-[0_0_15px_rgba(168,85,247,0.2)] border-purple-500/35 bg-purple-50/10'
                    },
                    {
                      id: 'sunset_orange',
                      name: 'Sıcak Portakal',
                      description: 'Sunset Orange',
                      emoji: '🍊',
                      accentColor: '#f97316',
                      bgColor: '#fffbf7',
                      cardColor: '#ffeedb',
                      textColor: '#9a3412',
                      borderColor: '#ffb875',
                      glowClass: 'hover:shadow-[0_0_15px_rgba(249,115,22,0.15)] focus:shadow-[0_0_15px_rgba(249,115,22,0.2)] border-orange-500/35 bg-orange-50/10'
                    },
                    {
                      id: 'ocean_teal',
                      name: 'Okyanus Turkuaz',
                      description: 'Ocean Teal',
                      emoji: '🌊',
                      accentColor: '#0d9488',
                      bgColor: '#f4fcfc',
                      cardColor: '#daf6f6',
                      textColor: '#115e59',
                      borderColor: '#6be0e0',
                      glowClass: 'hover:shadow-[0_0_15px_rgba(13,148,136,0.15)] focus:shadow-[0_0_15px_rgba(13,148,136,0.2)] border-teal-500/35 bg-teal-50/10'
                    },
                    {
                      id: 'forest_green',
                      name: 'Orman Yeşili',
                      description: 'Forest Green',
                      emoji: '🌲',
                      accentColor: '#65a30d',
                      bgColor: '#fbfdf7',
                      cardColor: '#eff7e4',
                      textColor: '#3f6212',
                      borderColor: '#b4df80',
                      glowClass: 'hover:shadow-[0_0_15px_rgba(101,163,13,0.15)] focus:shadow-[0_0_15px_rgba(101,163,13,0.2)] border-lime-500/35 bg-lime-50/10'
                    }
                  ].map((themeOpt) => {
                    const isActive = storeSettings.theme === themeOpt.id;
                    return (
                      <button
                        key={themeOpt.id}
                        type="button"
                        onClick={() => handleSaveSettings(themeOpt.id as any)}
                        className={`border text-left rounded-2xl p-3.5 flex flex-col justify-between gap-3.5 transition-all duration-300 cursor-pointer ${
                          isActive
                            ? `${themeOpt.glowClass} border-2 ring-1`
                            : 'border-slate-200 hover:border-slate-350 bg-white hover:bg-slate-50/60 hover:scale-[1.01]'
                        }`}
                        style={{
                          borderColor: isActive ? themeOpt.accentColor : undefined,
                          boxShadow: isActive ? `0 0 16px -2px ${themeOpt.accentColor}30` : undefined,
                          ringColor: isActive ? themeOpt.accentColor : undefined
                        }}
                      >
                        <div className="flex items-start justify-between w-full">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shadow-sm border border-slate-100" style={{ backgroundColor: themeOpt.cardColor }}>
                              {themeOpt.emoji}
                            </div>
                            <div>
                              <h4 className="font-bold text-xs text-slate-800">{themeOpt.name}</h4>
                              <span className="text-[10px] text-slate-400 font-medium">{themeOpt.description}</span>
                            </div>
                          </div>
                          
                          {isActive ? (
                            <span className="bg-emerald-50 text-emerald-700 text-[9px] font-bold px-2 py-0.5 rounded-md border border-emerald-200/50 flex items-center gap-0.5 animate-fade-in">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Aktif
                            </span>
                          ) : (
                            <span className="text-[9px] text-slate-400 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">Seç</span>
                          )}
                        </div>

                        {/* Theme color swatch chips */}
                        <div className="flex items-center justify-between w-full pt-1 border-t border-slate-100/70 text-[9px]">
                          <span className="text-[9px] text-slate-400 font-medium">Palet Kartelası:</span>
                          <div className="flex items-center gap-1">
                            <span className="w-3.5 h-3.5 rounded-full border border-slate-200 shadow-3xs" style={{ backgroundColor: themeOpt.bgColor }} title={`Arka Plan: ${themeOpt.bgColor}`}></span>
                            <span className="w-3.5 h-3.5 rounded-full border border-slate-200 shadow-3xs" style={{ backgroundColor: themeOpt.cardColor }} title={`Kart: ${themeOpt.cardColor}`}></span>
                            <span className="w-3.5 h-3.5 rounded-full border border-slate-200 shadow-3xs" style={{ backgroundColor: themeOpt.accentColor }} title={`Vurgu: ${themeOpt.accentColor}`}></span>
                            <span className="w-3.5 h-3.5 rounded-full border border-slate-200 shadow-3xs" style={{ backgroundColor: themeOpt.textColor }} title={`Metin: ${themeOpt.textColor}`}></span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              
              {/* Right Side: Live Store Appearance Simulator */}
              <div className="lg:col-span-5 flex flex-col">
                <div className="border border-slate-200 bg-slate-50/50 rounded-2xl p-4 flex-1 flex flex-col space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      📱 Anlık Mağaza Önizleme Simülatörü
                    </span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                      Canlı
                    </span>
                  </div>
                  
                  {/* Mock Phone Frame */}
                  <div className="mx-auto w-full max-w-[270px] border-4 border-slate-800 rounded-[2.5rem] overflow-hidden shadow-lg flex flex-col relative aspect-[9/16] transition-colors duration-300" style={{ backgroundColor: selectedPalette.bgColor }}>
                    {/* Status bar */}
                    <div className="bg-slate-900 text-white py-1.5 px-5 flex justify-between items-center text-[8px] font-sans select-none z-10 shrink-0">
                      <span className="font-semibold">12:30</span>
                      <div className="flex items-center gap-1 opacity-80">
                        <span>5G</span>
                        <div className="w-3.5 h-2 border border-white rounded-xs p-0.2 flex items-center">
                          <div className="h-full w-2.5 bg-white rounded-3xs"></div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Simulator Store Screen */}
                    <div className="flex-1 flex flex-col overflow-y-auto select-none p-3 space-y-3 text-left" style={{ color: selectedPalette.textColor }}>
                      {/* Mini Mock Header */}
                      <div className="flex items-center justify-between p-2.5 rounded-xl border transition-colors duration-300" style={{ backgroundColor: selectedPalette.cardColor, borderColor: selectedPalette.borderColor }}>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">{selectedPalette.emoji}</span>
                          <span className="font-display font-black text-[10px] tracking-tight truncate max-w-[100px]" style={{ color: selectedPalette.textColor }}>
                            {settingsName || storeSettings.storeName}
                          </span>
                        </div>
                        <div className="w-5.5 h-5.5 rounded-lg flex items-center justify-center text-[9px] shadow-sm transition-colors duration-300" style={{ backgroundColor: selectedPalette.accentColor, color: '#fff' }}>
                          🛒
                        </div>
                      </div>
                      
                      {/* Mini Mock Hero Banner */}
                      <div className="p-3 rounded-xl text-center space-y-1 relative overflow-hidden flex flex-col justify-center items-center text-white transition-colors duration-300" style={{ backgroundColor: selectedPalette.accentColor }}>
                        <div className="absolute inset-0 bg-black/5"></div>
                        <span className="relative text-[7px] bg-white/20 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider text-white">
                          Esnaf Güvencesi
                        </span>
                        <p className="relative font-display font-black text-[9px] leading-tight text-white line-clamp-2">
                          {settingsSlogan || storeSettings.storeSlogan}
                        </p>
                      </div>
                      
                      {/* Mini Mock Products List */}
                      <div className="space-y-1.5">
                        <span className="text-[8px] font-bold uppercase tracking-widest opacity-75">
                          Popüler Ürünler
                        </span>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-2 rounded-xl border flex flex-col space-y-1 bg-white transition-colors duration-300" style={{ borderColor: selectedPalette.borderColor }}>
                            <div className="h-9 rounded-lg bg-slate-50 flex items-center justify-center text-xs">🎒</div>
                            <span className="text-[8px] font-bold text-slate-800 leading-tight truncate">Okul Sırt Çantası</span>
                            <div className="flex items-center justify-between pt-0.5">
                              <span className="text-[8px] font-mono font-bold text-slate-900">450 TL</span>
                              <div className="w-4 h-4 rounded-md flex items-center justify-center text-[8px] text-white transition-colors duration-300" style={{ backgroundColor: selectedPalette.accentColor }}>+</div>
                            </div>
                          </div>
                          
                          <div className="p-2 rounded-xl border flex flex-col space-y-1 bg-white transition-colors duration-300" style={{ borderColor: selectedPalette.borderColor }}>
                            <div className="h-9 rounded-lg bg-slate-50 flex items-center justify-center text-xs">✏️</div>
                            <span className="text-[8px] font-bold text-slate-800 leading-tight truncate">Renkli Kalem Seti</span>
                            <div className="flex items-center justify-between pt-0.5">
                              <span className="text-[8px] font-mono font-bold text-slate-900">85 TL</span>
                              <div className="w-4 h-4 rounded-md flex items-center justify-center text-[8px] text-white transition-colors duration-300" style={{ backgroundColor: selectedPalette.accentColor }}>+</div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Mini Mock Footer */}
                      <div className="text-[7px] text-center opacity-60 pt-1.5 border-t" style={{ borderColor: selectedPalette.borderColor }}>
                        {settingsName || storeSettings.storeName} © 2026
                      </div>
                    </div>
                  </div>
                  
                  {/* Selected Theme Details Panel */}
                  <div className="bg-white border border-slate-100 rounded-xl p-3.5 space-y-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">🎨 Seçili Tema Detayları</span>
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div className="flex items-center gap-1.5 p-1.5 bg-slate-50 rounded-lg border border-slate-100">
                        <span className="w-3.5 h-3.5 rounded-full border border-slate-200" style={{ backgroundColor: selectedPalette.bgColor }}></span>
                        <div>
                          <p className="font-semibold text-slate-700">Arka Plan</p>
                          <p className="font-mono text-[9px] text-slate-400">{selectedPalette.bgColor}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 p-1.5 bg-slate-50 rounded-lg border border-slate-100">
                        <span className="w-3.5 h-3.5 rounded-full border border-slate-200" style={{ backgroundColor: selectedPalette.cardColor }}></span>
                        <div>
                          <p className="font-semibold text-slate-700">Kart Dolgusu</p>
                          <p className="font-mono text-[9px] text-slate-400">{selectedPalette.cardColor}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 p-1.5 bg-slate-50 rounded-lg border border-slate-100">
                        <span className="w-3.5 h-3.5 rounded-full border border-slate-200" style={{ backgroundColor: selectedPalette.accentColor }}></span>
                        <div>
                          <p className="font-semibold text-slate-700">Vurgu Rengi</p>
                          <p className="font-mono text-[9px] text-slate-400">{selectedPalette.accentColor}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 p-1.5 bg-slate-50 rounded-lg border border-slate-100">
                        <span className="w-3.5 h-3.5 rounded-full border border-slate-200" style={{ backgroundColor: selectedPalette.textColor }}></span>
                        <div>
                          <p className="font-semibold text-slate-700">Metin Rengi</p>
                          <p className="font-mono text-[9px] text-slate-400">{selectedPalette.textColor}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* General Brand Details Form */}
            <div className="border-t border-slate-100 pt-6 space-y-4">
              <h3 className="font-display font-bold text-xs text-slate-900 uppercase flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-purple-600" />
                Uygulama İsim & Kampanya İçerikleri Yönetimi
              </h3>

              {isSettingsSavedSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-3.5 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0" /> Ayarlar başarıyla kaydedildi! Müşteri ve bayi ekranları otomatik güncellendi.
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Mağaza / Platform Adı *</label>
                    <input
                      type="text"
                      value={settingsName}
                      onChange={e => setSettingsName(e.target.value)}
                      placeholder="Mağaza adını girin..."
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                    />
                  </div>

                  <div className="space-y-3 rounded-2xl border border-purple-200 bg-purple-50/60 p-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Üst Menü Logosu</label>
                      <p className="text-[10px] text-slate-400">Müşteri ve yönetici ekranlarının üst menüsünde görünecek logoyu değiştirin.</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {settingsLogo ? (
                        <img src={settingsLogo} alt="Mevcut mağaza logosu" className="size-14 shrink-0 rounded-xl border border-purple-200 bg-white object-cover shadow-sm" />
                      ) : (
                        <div className="flex size-14 shrink-0 items-center justify-center rounded-xl border border-dashed border-purple-300 bg-white text-[10px] font-semibold text-purple-400">Logo yok</div>
                      )}
                      <div className="min-w-0 flex-1 space-y-2">
                        <input
                          id="store-logo-file-input"
                          type="file"
                          accept="image/*"
                          onChange={handleLogoFileChange}
                          className="hidden"
                        />
                        <label
                          htmlFor="store-logo-file-input"
                          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-purple-200 bg-white px-3 py-2 text-xs font-bold text-purple-700 transition-colors hover:bg-purple-100"
                        >
                          <Upload className="h-3.5 w-3.5" />
                          Cihazdan logo seç
                        </label>
                        <input
                          type="url"
                          value={settingsLogo}
                          onChange={e => setSettingsLogo(e.target.value)}
                          placeholder="https://.../logo.png"
                          className="w-full rounded-xl border border-purple-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-purple-500 focus:outline-hidden focus:ring-1 focus:ring-purple-500"
                        />
                      </div>
                    </div>
                    {settingsLogo && (
                      <button
                        type="button"
                        onClick={() => setSettingsLogo('')}
                        className="text-[10px] font-bold text-rose-600 hover:text-rose-700"
                      >
                        Logoyu kaldır
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Kampanya Sloganı / Kahraman Banner Mesajı *</label>
                    <textarea
                      rows={2}
                      value={settingsSlogan}
                      onChange={e => setSettingsSlogan(e.target.value)}
                      placeholder="Banner sloganını girin..."
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:border-purple-500 focus:ring-1 focus:ring-purple-500 resize-none mb-4"
                    />
                  </div>
                </div>

                {/* Financial Customization inside Settings */}
                <div className="space-y-4 bg-slate-50 border border-slate-200 rounded-2xl p-5">
                  <div className="flex justify-between items-center">
                    <label className="block text-[11px] font-bold text-slate-600">Esnaf Sabit Komisyon Oranı (%) *</label>
                    <span className="font-mono font-extrabold text-sm text-purple-700 bg-purple-100/60 px-2 py-0.5 rounded-md">%{settingsCommission}</span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Müşterilerin ciro ödemesinden esnaflara otomatik aktarılacak kazanç oranı. Komisyon oranını değiştirirseniz, ciro liderliği sıralamaları ve esnaf bakiyeleri güncel orana göre yeniden hesaplanır!
                  </p>

                  <input
                    type="range"
                    min="0"
                    max="50"
                    step="0.5"
                    value={settingsCommission}
                    onChange={e => setSettingsCommission(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-bold font-mono">
                    <span>%0 (Min)</span>
                    <span>%25</span>
                    <span>%50 (Maks)</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 bg-amber-50 border border-amber-200 rounded-2xl p-5">
                <div>
                  <h4 className="font-display font-bold text-xs text-slate-800">Ortak Havuz Banka Hesabı</h4>
                  <p className="text-[10px] text-slate-500 mt-1">Banka havalesi seçildiğinde bu bilgiler üye checkout ekranında gösterilir.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input value={centralBankName} onChange={e => setCentralBankName(e.target.value)} placeholder="Banka adı" className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl text-xs" />
                  <input value={centralAccountHolder} onChange={e => setCentralAccountHolder(e.target.value)} placeholder="Hesap sahibi / ticari unvan" className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl text-xs" />
                </div>
                <input value={centralIban} onChange={e => setCentralIban(e.target.value)} placeholder="TR00 0000 0000 0000 0000 0000 00" className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl text-xs font-mono" />
                <textarea value={centralBankInstructions} onChange={e => setCentralBankInstructions(e.target.value)} placeholder="Havale açıklaması ve ödeme talimatı" rows={2} className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl text-xs resize-none" />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => handleSaveSettings()}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md cursor-pointer"
                >
                  Değişiklikleri ve Tema Değişimini Kaydet
                </button>
              </div>
            </div>

            {/* CMS Content Management Panel */}
            <div className="border-t border-slate-100 pt-6 space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-display font-bold text-xs text-slate-900 uppercase flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-purple-600" />
                    Dinamik İçerik Yönetimi (CMS)
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Müşteri arayüzündeki seçtiklerimiz, hakkımızda, haberler, e-bülten ve iletişim bölümlerini buradan anlık güncelleyin.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 1. SEÇTİKLERİMİZ VE ÖNE ÇIKAN KOLEKSİYONLAR */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                    <span className="text-sm">⭐</span>
                    <h4 className="font-display font-bold text-xs text-slate-800">Seçtiklerimiz & Öne Çıkan Koleksiyon Ürünleri</h4>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">Bölüm Başlığı *</label>
                      <input
                        type="text"
                        value={featuredTitle}
                        onChange={e => setFeaturedTitle(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">Koleksiyona Eklenecek Ürünleri Seçin ({featuredProductIds.length} ürün seçildi)</label>
                      <p className="text-[9px] text-slate-400 mb-2">Seçtiğiniz ürünler ana sayfada "Seçtiklerimiz" vitrininde sergilenir.</p>
                      <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl bg-white p-2.5 space-y-1.5">
                        {products.map(p => {
                          const isChecked = featuredProductIds.includes(p.id);
                          return (
                            <label key={p.id} className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded-lg cursor-pointer text-xs">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  if (isChecked) {
                                    setFeaturedProductIds(featuredProductIds.filter(id => id !== p.id));
                                  } else {
                                    setFeaturedProductIds([...featuredProductIds, p.id]);
                                  }
                                }}
                                className="rounded text-purple-600 focus:ring-purple-500"
                              />
                              <span className="text-slate-700 font-medium truncate flex-1">{p.name}</span>
                              <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md font-mono">{p.price} TL</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. KAYAN MARKA ŞERİDİ */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <div className="flex items-center gap-2">
                      <Image className="w-4 h-4 text-purple-600" />
                      <h4 className="font-display font-bold text-xs text-slate-800">Kayan Marka Şeridi</h4>
                    </div>
                    <label className="flex items-center gap-2 text-[10px] font-bold text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={brandMarqueeEnabled}
                        onChange={e => setBrandMarqueeEnabled(e.target.checked)}
                        className="rounded text-purple-600 focus:ring-purple-500"
                      />
                      Aktif
                    </label>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">Şerit Başlığı</label>
                      <input
                        type="text"
                        value={brandMarqueeTitle}
                        onChange={e => setBrandMarqueeTitle(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs"
                        placeholder="Güvendiğimiz Markalar"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">Cihazdan marka görseli ekle</label>
                      <input
                        id="brand-marquee-file-input"
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleBrandMarqueeFileChange}
                        className="hidden"
                      />
                      <label
                        htmlFor="brand-marquee-file-input"
                        className="flex items-center justify-center gap-2 w-full px-3 py-2 bg-purple-50 border border-purple-200 text-purple-700 rounded-xl text-xs font-bold hover:bg-purple-100 cursor-pointer transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        Cihazdan görsel seç
                      </label>
                      <p className="text-[9px] text-slate-400 mt-1">Birden fazla JPG, PNG, WEBP veya GIF görseli seçebilirsiniz.</p>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">Görsel URL'si ile marka ekle</label>
                      <div className="flex gap-2">
                        <input
                          type="url"
                          value={newBrandMarqueeImage}
                          onChange={e => setNewBrandMarqueeImage(e.target.value)}
                          className="min-w-0 flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs"
                          placeholder="https://.../marka-gorseli.png"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const imageUrl = newBrandMarqueeImage.trim();
                            if (!imageUrl) return;
                            setBrandMarqueeImages([...brandMarqueeImages, imageUrl]);
                            setNewBrandMarqueeImage('');
                          }}
                          className="bg-purple-600 hover:bg-purple-700 text-white px-3 rounded-xl text-xs font-bold cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {brandMarqueeImages.map((imageUrl, index) => (
                        <div key={`${imageUrl}-${index}`} className="relative bg-white border border-slate-200 rounded-xl p-2 group">
                          <img src={imageUrl} alt={`Marka ${index + 1}`} className="w-full h-20 object-contain rounded-lg" />
                          <button
                            type="button"
                            onClick={() => setBrandMarqueeImages(brandMarqueeImages.filter((_, imageIndex) => imageIndex !== index))}
                            className="absolute top-1 right-1 bg-rose-500 hover:bg-rose-600 text-white p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            aria-label={`Marka ${index + 1} görselini sil`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                    {brandMarqueeImages.length === 0 && (
                      <p className="text-[10px] text-slate-400">Henüz marka görseli eklenmedi. Şerit müşteri sayfasında görünmez.</p>
                    )}
                  </div>
                </div>

                {/* 3. FOOTER & HARİTA YÖNETİMİ */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 lg:col-span-2">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">🧭</span>
                      <h4 className="font-display font-bold text-xs text-slate-800">Footer, Kısa Yollar & Harita</h4>
                    </div>
                    <label className="flex items-center gap-2 text-[10px] font-bold text-slate-600 cursor-pointer">
                      <input type="checkbox" checked={footerEnabled} onChange={e => setFooterEnabled(e.target.checked)} className="rounded text-purple-600 focus:ring-purple-500" />
                      Footer aktif
                    </label>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">Footer başlığı</label>
                      <input type="text" value={footerTitle} onChange={e => setFooterTitle(e.target.value)} className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">Footer açıklaması</label>
                      <textarea rows={2} value={footerDescription} onChange={e => setFooterDescription(e.target.value)} className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs resize-none" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    <button type="button" onClick={() => setFooterPanel(footerPanel === 'footer' ? null : 'footer')} className={`text-left border rounded-xl p-2 text-[10px] font-bold cursor-pointer transition-colors ${footerPanel === 'footer' ? 'bg-purple-100 border-purple-300 text-purple-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
                      Footer metni
                    </button>
                    <button type="button" onClick={() => setFooterPanel(footerPanel === 'about' ? null : 'about')} className={`text-left border rounded-xl p-2 text-[10px] font-bold cursor-pointer transition-colors ${footerPanel === 'about' ? 'bg-purple-100 border-purple-300 text-purple-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
                      Hakkımızda butonları
                    </button>
                    <button type="button" onClick={() => setFooterPanel(footerPanel === 'shortcuts' ? null : 'shortcuts')} className={`text-left border rounded-xl p-2 text-[10px] font-bold cursor-pointer transition-colors ${footerPanel === 'shortcuts' ? 'bg-purple-100 border-purple-300 text-purple-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
                      Kısa yolları yönet
                    </button>
                    <button type="button" onClick={() => setFooterPanel(footerPanel === 'locations' ? null : 'locations')} className={`text-left border rounded-xl p-2 text-[10px] font-bold cursor-pointer transition-colors ${footerPanel === 'locations' ? 'bg-purple-100 border-purple-300 text-purple-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
                      Konumları yönet
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFooterMapEnabled(true);
                        setFooterPanel('locations');
                      }}
                      className={`flex items-center gap-2 border rounded-xl p-2 text-[10px] font-bold cursor-pointer transition-colors ${footerPanel === 'locations' ? 'bg-purple-100 border-purple-300 text-purple-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                    >
                      <span className={`w-2 h-2 rounded-full ${footerMapEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      Harita aktif · Konum ekle
                    </button>
                  </div>

                  {footerPanel === 'footer' && (
                    <div className="bg-white border border-purple-200 rounded-xl p-3 space-y-3">
                      <p className="text-[10px] font-bold text-purple-700">Footer sütunlarının görünürlüğü</p>
                      <div className="flex flex-wrap gap-2">
                        <label className="flex items-center gap-2 text-[10px] font-bold text-slate-600 cursor-pointer"><input type="checkbox" checked={footerShowAbout} onChange={e => setFooterShowAbout(e.target.checked)} className="rounded text-purple-600 focus:ring-purple-500" /> Hakkımızda</label>
                        <label className="flex items-center gap-2 text-[10px] font-bold text-slate-600 cursor-pointer"><input type="checkbox" checked={footerShowContact} onChange={e => setFooterShowContact(e.target.checked)} className="rounded text-purple-600 focus:ring-purple-500" /> İletişim</label>
                        <label className="flex items-center gap-2 text-[10px] font-bold text-slate-600 cursor-pointer"><input type="checkbox" checked={footerShowShortcuts} onChange={e => setFooterShowShortcuts(e.target.checked)} className="rounded text-purple-600 focus:ring-purple-500" /> Kısa yollar</label>
                      </div>
                    </div>
                  )}

                  {footerPanel === 'about' && (
                    <div className="bg-white border border-purple-200 rounded-xl p-3 space-y-3">
                      <p className="text-[10px] font-bold text-purple-700">Hakkımızda butonu ekle</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input type="text" value={newFooterAboutLabel} onChange={e => setNewFooterAboutLabel(e.target.value)} placeholder="Buton adı" className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs" />
                        <div className="flex gap-2">
                          <input type="text" value={newFooterAboutHref} onChange={e => setNewFooterAboutHref(e.target.value)} placeholder="#bolum veya https://" className="min-w-0 flex-1 px-3 py-1.5 border border-slate-200 rounded-xl text-xs" />
                          <button type="button" onClick={() => { const label = newFooterAboutLabel.trim(); const href = newFooterAboutHref.trim(); if (!label || !href) return; setFooterAboutLinks([...footerAboutLinks, { id: `about-link-${Date.now()}`, label, href }]); setNewFooterAboutLabel(''); setNewFooterAboutHref(''); }} className="bg-purple-600 hover:bg-purple-700 text-white px-3 rounded-xl cursor-pointer"><Plus className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {footerAboutLinks.map(link => (
                          <div key={link.id} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2">
                            <input type="text" value={link.label} onChange={e => setFooterAboutLinks(footerAboutLinks.map(item => item.id === link.id ? { ...item, label: e.target.value } : item))} className="min-w-0 flex-1 px-2 py-1 border border-slate-200 rounded-lg text-[10px]" />
                            <input type="text" value={link.href} onChange={e => setFooterAboutLinks(footerAboutLinks.map(item => item.id === link.id ? { ...item, href: e.target.value } : item))} className="min-w-0 flex-1 px-2 py-1 border border-slate-200 rounded-lg text-[10px]" />
                            <button type="button" onClick={() => setFooterAboutLinks(footerAboutLinks.filter(item => item.id !== link.id))} className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer" aria-label={`${link.label} butonunu sil`}><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {footerPanel === 'shortcuts' && (
                    <div className="bg-white border border-purple-200 rounded-xl p-3 space-y-3">
                      <p className="text-[10px] font-bold text-purple-700">Kısa yol ekle</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input type="text" value={newFooterShortcutLabel} onChange={e => setNewFooterShortcutLabel(e.target.value)} placeholder="Buton adı" className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs" />
                        <div className="flex gap-2">
                          <input type="text" value={newFooterShortcutHref} onChange={e => setNewFooterShortcutHref(e.target.value)} placeholder="#bolum veya https://" className="min-w-0 flex-1 px-3 py-1.5 border border-slate-200 rounded-xl text-xs" />
                          <button type="button" onClick={() => { const label = newFooterShortcutLabel.trim(); const href = newFooterShortcutHref.trim(); if (!label || !href) return; setFooterShortcuts([...footerShortcuts, { id: `shortcut-${Date.now()}`, label, href }]); setNewFooterShortcutLabel(''); setNewFooterShortcutHref(''); }} className="bg-purple-600 hover:bg-purple-700 text-white px-3 rounded-xl cursor-pointer"><Plus className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {footerShortcuts.map(shortcut => (
                          <div key={shortcut.id} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2">
                            <input type="text" value={shortcut.label} onChange={e => setFooterShortcuts(footerShortcuts.map(item => item.id === shortcut.id ? { ...item, label: e.target.value } : item))} className="min-w-0 flex-1 px-2 py-1 border border-slate-200 rounded-lg text-[10px]" />
                            <input type="text" value={shortcut.href} onChange={e => setFooterShortcuts(footerShortcuts.map(item => item.id === shortcut.id ? { ...item, href: e.target.value } : item))} className="min-w-0 flex-1 px-2 py-1 border border-slate-200 rounded-lg text-[10px]" />
                            <button type="button" onClick={() => setFooterShortcuts(footerShortcuts.filter(item => item.id !== shortcut.id))} className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer" aria-label={`${shortcut.label} kısa yolunu sil`}><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {footerPanel === 'locations' && (
                    <div className="bg-white border border-purple-200 rounded-xl p-3 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[10px] font-bold text-purple-700">Haritada gösterilecek konumları yönet</p>
                        <label className="flex items-center gap-2 text-[10px] font-bold text-slate-600 cursor-pointer">
                          <input type="checkbox" checked={footerMapEnabled} onChange={e => setFooterMapEnabled(e.target.checked)} className="rounded text-purple-600 focus:ring-purple-500" />
                          Haritayı göster
                        </label>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <label className="text-[10px] font-bold text-slate-600">Üst etiket<input type="text" value={footerLocationEyebrow} onChange={e => setFooterLocationEyebrow(e.target.value)} className="mt-1 w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-normal" /></label>
                        <label className="text-[10px] font-bold text-slate-600">Bölüm başlığı<input type="text" value={footerLocationTitle} onChange={e => setFooterLocationTitle(e.target.value)} className="mt-1 w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-normal" /></label>
                        <label className="text-[10px] font-bold text-slate-600">Yol tarifi butonu<input type="text" value={footerDirectionsLabel} onChange={e => setFooterDirectionsLabel(e.target.value)} className="mt-1 w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-normal" /></label>
                        <label className="text-[10px] font-bold text-slate-600">Konum butonu<input type="text" value={footerMapLabel} onChange={e => setFooterMapLabel(e.target.value)} className="mt-1 w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-normal" /></label>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input type="text" value={newFooterLocationLabel} onChange={e => setNewFooterLocationLabel(e.target.value)} placeholder="Konum adı (Merkez Ofis)" className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs" />
                        <input type="text" value={newFooterLocationAddress} onChange={e => setNewFooterLocationAddress(e.target.value)} placeholder="Açık adres" className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs" />
                        <div className="flex gap-2">
                          <input type="text" value={newFooterLocationCoordinates} onChange={e => setNewFooterLocationCoordinates(e.target.value)} placeholder="Koordinat (isteğe bağlı)" className="min-w-0 flex-1 px-3 py-1.5 border border-slate-200 rounded-xl text-xs" />
                          <button type="button" onClick={() => { const label = newFooterLocationLabel.trim(); const address = newFooterLocationAddress.trim(); const coordinates = newFooterLocationCoordinates.trim(); if (!label || !address) return; setFooterLocations([...footerLocations, { id: `location-${Date.now()}`, label, address, ...(coordinates ? { coordinates } : {}) }]); setNewFooterLocationLabel(''); setNewFooterLocationAddress(''); setNewFooterLocationCoordinates(''); }} className="bg-purple-600 hover:bg-purple-700 text-white px-3 rounded-xl cursor-pointer"><Plus className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {footerLocations.map(location => (
                          <div key={location.id} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2">
                            <input type="radio" name="active-footer-location" checked={footerLocations[0]?.id === location.id} onChange={() => setFooterLocations([location, ...footerLocations.filter(item => item.id !== location.id)])} className="text-purple-600 focus:ring-purple-500" />
                            <input type="text" value={location.label} onChange={e => setFooterLocations(footerLocations.map(item => item.id === location.id ? { ...item, label: e.target.value } : item))} className="w-28 px-2 py-1 border border-slate-200 rounded-lg text-[10px]" />
                            <input type="text" value={location.address} onChange={e => setFooterLocations(footerLocations.map(item => item.id === location.id ? { ...item, address: e.target.value } : item))} className="min-w-0 flex-1 px-2 py-1 border border-slate-200 rounded-lg text-[10px]" />
                            <input type="text" value={location.coordinates || ''} onChange={e => setFooterLocations(footerLocations.map(item => item.id === location.id ? { ...item, coordinates: e.target.value } : item))} placeholder="Koordinat" className="w-32 px-2 py-1 border border-slate-200 rounded-lg text-[10px]" />
                            <button type="button" onClick={() => setFooterLocations(footerLocations.filter(item => item.id !== location.id))} className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer" aria-label={`${location.label} konumunu sil`}><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <p className="text-[9px] text-slate-400">Değişiklikler, aşağıdaki “Değişiklikleri ve Tema Değişimini Kaydet” butonuna bastığınızda müşteri sayfasına uygulanır.</p>
                </div>

                {/* TELEGRAM YÖNETİCİ BİLDİRİMLERİ */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 lg:col-span-2">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">✈️</span>
                      <h4 className="font-display font-bold text-xs text-slate-800">Telegram Yönetici Bildirimleri</h4>
                    </div>
                    <label className="flex items-center gap-2 text-[10px] font-bold text-slate-600 cursor-pointer">
                      <input type="checkbox" checked={telegramNotificationsEnabled} onChange={e => setTelegramNotificationsEnabled(e.target.checked)} className="rounded text-purple-600 focus:ring-purple-500" />
                      Bildirimler aktif
                    </label>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">Telegram Chat ID</label>
                      <input type="text" value={telegramChatId} onChange={e => setTelegramChatId(e.target.value)} placeholder="Örn: 123456789" className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs" />
                    </div>
                    <div className="flex flex-col justify-end gap-2">
                      <div className="flex flex-wrap gap-3">
                        <label className="flex items-center gap-2 text-[10px] font-bold text-slate-600 cursor-pointer"><input type="checkbox" checked={telegramOrderNotifications} onChange={e => setTelegramOrderNotifications(e.target.checked)} className="rounded text-purple-600 focus:ring-purple-500" /> Yeni siparişler</label>
                        <label className="flex items-center gap-2 text-[10px] font-bold text-slate-600 cursor-pointer"><input type="checkbox" checked={telegramActivityNotifications} onChange={e => setTelegramActivityNotifications(e.target.checked)} className="rounded text-purple-600 focus:ring-purple-500" /> Diğer hareketler</label>
                      </div>
                      <button type="button" onClick={() => setTelegramTestStatus('Telegram testi kullanılamıyor: statik Firebase Hosting üzerinde sunucu endpoint’i bulunmuyor.')} className="self-start bg-slate-400 text-white px-3 py-1.5 rounded-xl text-[10px] font-bold cursor-pointer">Bağlantıyı test et</button>
                    </div>
                  </div>
                  <p className="text-[9px] text-slate-400">Bot tokenı güvenlik için yönetici panelinde tutulmaz. Sunucu ortamında <strong>TELEGRAM_BOT_TOKEN</strong> değişkeniyle tanımlanmalıdır. Müşteri ekranında Telegram ayarı gösterilmez.</p>
                  {telegramTestStatus && <p className="text-[10px] font-semibold text-slate-600">{telegramTestStatus}</p>}
                </div>

                {/* 4. BİZ KİMİZ & TARİHÇEMİZ */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                    <span className="text-sm">📖</span>
                    <h4 className="font-display font-bold text-xs text-slate-800">Biz Kimiz & Tarihçemiz (Hakkımızda)</h4>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">Bölüm Başlığı *</label>
                      <input
                        type="text"
                        value={aboutTitle}
                        onChange={e => setAboutTitle(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">Biz Kimiz Detayı *</label>
                      <textarea
                        rows={3}
                        value={aboutText}
                        onChange={e => setAboutText(e.target.value)}
                        placeholder="Kurumsal vizyonumuz, amacımız..."
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">Tarihçemiz Detayı *</label>
                      <textarea
                        rows={3}
                        value={aboutHistory}
                        onChange={e => setAboutHistory(e.target.value)}
                        placeholder="Kuruluş yılımız, geçmişimiz, dönüm noktalarımız..."
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* KAYAN GÖRSEL VİTRİNİ VE HIZ AYARI */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                    <span className="text-sm">🎠</span>
                    <h4 className="font-display font-bold text-xs text-slate-800">Kayan Görsel Vitrini & Akış Hızı</h4>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">Görsel Akış Hızı *</label>
                      <select
                        value={showcaseScrollSpeed}
                        onChange={e => setShowcaseScrollSpeed(Number(e.target.value))}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                      >
                        <option value={120}>Çok Yavaş (120 sn) - En Sakin Akış</option>
                        <option value={80}>Normal (80 sn) - Önerilen Akış</option>
                        <option value={50}>Orta Hızlı (50 sn) - Belirgin Akış</option>
                        <option value={30}>Hızlı (30 sn) - Seri Akış</option>
                        <option value={15}>Çok Hızlı (15 sn)</option>
                        <option value={0}>Duraklatılmış (Hareketsiz Vitrin)</option>
                      </select>
                      <p className="text-[9px] text-slate-400 mt-1">Kayan ürün afişlerinin geçiş hızını buradan yavaşlatabilir veya sabitleyebilirsiniz.</p>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">
                        Kayan Vitrinde Gösterilecek Ürünler ({showcaseProductIds.length} ürün seçildi)
                      </label>
                      <p className="text-[9px] text-slate-400 mb-2">
                        Seçtiğiniz ürünler ana sayfadaki dev kayan afiş bandında yer alır. Boş bırakırsanız tüm merkez ürünler otomatik kaydırılır.
                      </p>
                      <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl bg-white p-2.5 space-y-1.5">
                        {products.map(p => {
                          const isChecked = showcaseProductIds.includes(p.id);
                          return (
                            <label key={p.id} className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded-lg cursor-pointer text-xs">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  if (isChecked) {
                                    setShowcaseProductIds(showcaseProductIds.filter(id => id !== p.id));
                                  } else {
                                    setShowcaseProductIds([...showcaseProductIds, p.id]);
                                  }
                                }}
                                className="rounded text-purple-600 focus:ring-purple-500"
                              />
                              <span className="text-slate-700 font-medium truncate flex-1">{p.name}</span>
                              <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md font-mono">{p.price} TL</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. İLETİŞİM BİLGİLERİ */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                    <span className="text-sm">📞</span>
                    <h4 className="font-display font-bold text-xs text-slate-800">İletişim Bilgileri</h4>
                  </div>
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">E-posta Adresi *</label>
                        <input
                          type="email"
                          value={contactEmail}
                          onChange={e => setContactEmail(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">Telefon Numarası *</label>
                        <input
                          type="text"
                          value={contactPhone}
                          onChange={e => setContactPhone(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">Çalışma Saatleri *</label>
                      <input
                        type="text"
                        value={contactWorkingHours}
                        onChange={e => setContactWorkingHours(e.target.value)}
                        placeholder="Örn: Hafta İçi: 09:00 - 19:00"
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">Merkez Adres Bilgisi *</label>
                      <textarea
                        rows={2}
                        value={contactAddress}
                        onChange={e => setContactAddress(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs resize-none"
                      />
                    </div>
                  </div>
                </div>



                {/* 5. HABERLER & DUYURULAR YÖNETİMİ */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 lg:col-span-2">
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                    <span className="text-sm">📰</span>
                    <h4 className="font-display font-bold text-xs text-slate-800">Haberler & Duyurular Yönetimi</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                    {/* Haber Ekle Formu */}
                    <div className="md:col-span-5 bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">📣 Yeni Haber / Kampanya / Duyuru Ekle</span>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-600 mb-1">Başlık *</label>
                        <input
                          type="text"
                          value={newNewsTitle}
                          onChange={e => setNewNewsTitle(e.target.value)}
                          placeholder="Örn: Askıda Kırtasiye Kampanyası"
                          className="w-full px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] font-bold text-slate-600 mb-1">Simge / Emoji</label>
                          <select
                            value={newNewsEmoji}
                            onChange={e => setNewNewsEmoji(e.target.value)}
                            className="w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                          >
                            <option value="🎒">🎒 Okul Çantası</option>
                            <option value="📈">📈 Grafik</option>
                            <option value="💳">💳 Kredi Kartı</option>
                            <option value="✏️">✏️ Kalem</option>
                            <option value="🎉">🎉 Kutlama</option>
                            <option value="📢">📢 Duyuru</option>
                            <option value="🎁">🎁 Hediye</option>
                            <option value="💚">💚 Kalp</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-600 mb-1">Tarih</label>
                          <input
                            type="date"
                            defaultValue={new Date().toISOString().slice(0, 10)}
                            id="news-date-input"
                            className="w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-600 mb-1">İçerik Açıklaması *</label>
                        <textarea
                          rows={2}
                          value={newNewsContent}
                          onChange={e => setNewNewsContent(e.target.value)}
                          placeholder="Haber veya duyurunun tüm detayı..."
                          className="w-full px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs resize-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (!newNewsTitle || !newNewsContent) {
                            setNewsFeedback({ text: 'Lütfen başlık ve açıklama alanlarını doldurun!', type: 'info' });
                            setTimeout(() => setNewsFeedback(null), 3000);
                            return;
                          }
                          const dateVal = (document.getElementById('news-date-input') as HTMLInputElement)?.value || new Date().toISOString().slice(0,10);
                          const newArticle = {
                            id: `news-${Date.now().toString()}`,
                            title: newNewsTitle,
                            content: newNewsContent,
                            date: dateVal,
                            emoji: newNewsEmoji
                          };
                          const updatedList = [newArticle, ...newsList];
                          saveAndApplyNewsList(updatedList);
                          
                          // Reset form
                          setNewNewsTitle('');
                          setNewNewsContent('');
                          
                          setNewsFeedback({ text: 'Haber/Kampanya başarıyla eklendi!', type: 'success' });
                          setTimeout(() => setNewsFeedback(null), 3500);
                        }}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11px] py-1.5 rounded-lg cursor-pointer animate-fade-in"
                      >
                        Haber/Kampanya Ekle & Kaydet
                      </button>
                    </div>

                    {/* Mevcut Haberler Listesi */}
                    <div className="md:col-span-7 bg-white border border-slate-200 rounded-xl p-4 flex flex-col h-full max-h-[300px]">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase block">📋 Ekli Haberler & Kampanyalar ({newsList.length})</span>
                        {newsFeedback && (
                          <span className="text-[9px] font-bold text-indigo-600 animate-pulse">{newsFeedback.text}</span>
                        )}
                      </div>
                      <div className="overflow-y-auto space-y-2 flex-1 pr-1">
                        {newsList.length === 0 ? (
                          <p className="text-[10px] text-slate-400 text-center py-8">Kayıtlı haber veya duyuru bulunmuyor.</p>
                        ) : (
                          newsList.map(n => (
                            <div key={n.id} className="border border-slate-100 rounded-lg p-2.5 hover:bg-slate-50/50 flex gap-2.5 items-start">
                              <span className="text-base bg-slate-100 p-1 rounded-md shrink-0">{n.emoji}</span>
                              <div className="flex-1 space-y-0.5">
                                <div className="flex justify-between items-start">
                                  <h5 className="font-bold text-[11px] text-slate-800 line-clamp-1">{n.title}</h5>
                                  <span className="text-[9px] font-mono text-slate-400 shrink-0">{n.date}</span>
                                </div>
                                <p className="text-[10px] text-slate-500 leading-tight line-clamp-2">{n.content}</p>
                              </div>
                              <button
                                type="button"
                                title="Haber/Kampanyayı Sil"
                                onClick={() => {
                                  const updated = newsList.filter(item => item.id !== n.id);
                                  saveAndApplyNewsList(updated);
                                  setNewsFeedback({ text: 'Silindi ve kaydedildi!', type: 'success' });
                                  setTimeout(() => setNewsFeedback(null), 3000);
                                }}
                                className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1.5 border border-rose-100 rounded-lg shrink-0 cursor-pointer flex items-center gap-1 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-bold">Sil</span>
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 6. ÜRÜN DETAY MODALİ & BÜYÜTEÇ AYARLARI */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 lg:col-span-2 animate-fade-in">
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                    <span className="text-sm">🔍</span>
                    <h4 className="font-display font-bold text-xs text-slate-800">Ürün Detay Modali & Büyüteç Görsel Zoom Ayarları</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">📱 Ürün Detay Modali</span>
                      <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg">
                        <div>
                          <strong className="text-xs text-slate-700 block">Modali Aktifleştir</strong>
                          <span className="text-[9px] text-slate-400">Kartlara tıklanınca detay penceresi açılır.</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={enableProductModal}
                            onChange={e => setEnableProductModal(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                        </label>
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">🔍 Büyüteç Görsel Zoom</span>
                      <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg">
                        <div>
                          <strong className="text-xs text-slate-700 block">Büyüteç Efekti</strong>
                          <span className="text-[9px] text-slate-400">Fare görselin üstündeyken yakınlaşır.</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={enableProductZoom}
                            onChange={e => setEnableProductZoom(e.target.checked)}
                            className="sr-only peer"
                            disabled={!enableProductModal}
                          />
                          <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600 peer-disabled:opacity-50"></div>
                        </label>
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">🔎 Büyüteç Yakınlaştırma Katsayısı</span>
                      <div className="space-y-1 bg-slate-50 p-2.5 rounded-lg">
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-bold text-slate-700">Zoom Derecesi: <span className="font-mono text-purple-600 font-black">{zoomScale}x</span></label>
                        </div>
                        <input
                          type="range"
                          min="1.5"
                          max="4"
                          step="0.5"
                          value={zoomScale}
                          onChange={e => setZoomScale(Number(e.target.value))}
                          disabled={!enableProductModal || !enableProductZoom}
                          className="w-full accent-purple-600 disabled:opacity-50 cursor-pointer"
                        />
                        <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                          <span>1.5x (Az)</span>
                          <span>4.0x (Çok)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* SAVE CMS CHANGES BUTTON */}
              <div className="flex justify-end pt-3 border-t border-slate-100">
                <button
                  onClick={() => handleSaveSettings()}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-6 py-2.5 rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-2"
                >
                  <Check className="w-4 h-4" /> <span>Tüm Görünüm ve CMS Değişikliklerini Kaydet</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- 3. PRODUCT CATALOG MANAGER TAB --- */}
      {activeSubTab === 'products' && (
        <div className="space-y-6" id="admin-products-section">
          {isBulkUpdateOpen && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6 space-y-4 animate-fade-in" id="bulk-price-update-container">
              <div className="flex justify-between items-center border-b border-amber-200 pb-3">
                <div className="flex items-center gap-2">
                  <Percent className="w-5 h-5 text-amber-600" />
                  <h3 className="font-display font-bold text-xs text-slate-900 uppercase tracking-wider">
                    Toplu Ürün Fiyatı Güncelleme Paneli
                  </h3>
                </div>
                <button onClick={() => setIsBulkUpdateOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                {/* 1. Scope (Tüm Ürünler / Kategoriye Göre) */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Grup / Kapsam</label>
                  <select
                    value={bulkScope}
                    onChange={e => setBulkScope(e.target.value as 'all' | 'category')}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden"
                  >
                    <option value="all">Tüm Ürünler</option>
                    <option value="category">Kategoriye Göre</option>
                  </select>
                </div>

                {/* 2. Category selection (conditional) */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Kategori {bulkScope === 'all' && <span className="text-slate-300">(Devre Dışı)</span>}
                  </label>
                  <select
                    disabled={bulkScope === 'all'}
                    value={bulkCategory}
                    onChange={e => setBulkCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    {categories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* 3. Action Type (Zam / İndirim) */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">İşlem Tipi</label>
                  <select
                    value={bulkAction}
                    onChange={e => setBulkAction(e.target.value as 'increase' | 'discount')}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden"
                  >
                    <option value="increase">Fiyat Artışı (Zam) %</option>
                    <option value="discount">İndirim (Fiyat Düşüşü) %</option>
                  </select>
                </div>

                {/* 4. Percentage value */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Yüzdelik Oran (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    required
                    value={bulkPercent}
                    onChange={e => setBulkPercent(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Custom Confirmation Step */}
              {bulkUpdateConfirmOpen && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 space-y-3 animate-fade-in" id="bulk-confirm-step">
                  <div className="flex gap-2 items-center font-bold">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>⚠️ Değişiklik Onayı Gerekiyor</span>
                  </div>
                  <p className="leading-relaxed">
                    Seçtiğiniz <strong>{bulkScope === 'all' ? 'tüm ürünlere' : `"${bulkCategory}" kategorisindeki ürünlere`}</strong> anlık olarak <strong>{bulkAction === 'increase' ? `%${bulkPercent} oranında ZAM (fiyat artışı)` : `%${bulkPercent} oranında İNDİRİM`}</strong> uygulanacaktır. Bu işlem kalıcıdır ve tüm bayilerdeki satış fiyatlarını etkileyecektir. Devam etmek istiyor musunuz?
                  </p>
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setBulkUpdateConfirmOpen(false)}
                      className="bg-white hover:bg-slate-50 text-slate-700 font-bold border border-slate-200 px-3 py-1.5 rounded-lg text-xs cursor-pointer"
                    >
                      Hayır, İptal Et
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onBulkUpdatePrices && onBulkUpdatePrices(bulkScope, bulkCategory, bulkAction, bulkPercent);
                        setBulkUpdateConfirmOpen(false);
                        setBulkUpdateSuccess(true);
                      }}
                      className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-1.5 rounded-lg text-xs cursor-pointer shadow-sm"
                    >
                      Evet, Onayla ve Uygula
                    </button>
                  </div>
                </div>
              )}

              {/* Custom Success State */}
              {bulkUpdateSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-xs text-emerald-900 space-y-2 animate-fade-in" id="bulk-success-step">
                  <div className="flex gap-2 items-center font-bold">
                    <span className="text-emerald-600 text-sm">✓</span>
                    <span>İşlem Başarılı</span>
                  </div>
                  <p className="leading-relaxed">
                    Ürün fiyatları başarıyla güncellendi! Yeni fiyatlar tüm dükkanlarda ve katalog listesinde anlık olarak aktif hale getirilmiştir.
                  </p>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setBulkUpdateSuccess(false);
                        setIsBulkUpdateOpen(false);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1 rounded-lg text-xs cursor-pointer"
                    >
                      Tamam
                    </button>
                  </div>
                </div>
              )}

              {!bulkUpdateConfirmOpen && !bulkUpdateSuccess && (
                <div className="flex justify-end gap-2 pt-2 border-t border-amber-200/50">
                  <button
                    type="button"
                    onClick={() => setIsBulkUpdateOpen(false)}
                    className="bg-white hover:bg-slate-100 text-slate-700 font-bold border border-slate-200 px-4 py-2 rounded-xl text-xs cursor-pointer"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (bulkPercent <= 0 || bulkPercent >= 100) {
                        alert('Lütfen 1 ile 99 arasında geçerli bir yüzde girin.');
                        return;
                      }
                      setBulkUpdateConfirmOpen(true);
                    }}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-5 py-2 rounded-xl text-xs cursor-pointer shadow-md shadow-amber-600/10"
                  >
                    Fiyatları Güncelle
                  </button>
                </div>
              )}
            </div>
          )}

          {isProductFormOpen && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4" id="product-form-container">
              <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                <h3 className="font-display font-bold text-xs text-slate-900">
                  {productFormMode === 'add' ? 'Yeni Kırtasiye Ürünü Kaydı' : 'Ürün Düzenle'}
                </h3>
                <button onClick={resetProductForm} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Tab Selector for Single vs Bulk */}
              {productFormMode === 'add' && (
                <div className="flex border-b border-slate-200 gap-1 pb-1" id="product-form-tabs">
                  <button
                    type="button"
                    onClick={() => setProductAddTab('single')}
                    className={`px-4 py-2 text-xs font-bold border-b-2 cursor-pointer transition-all ${
                      productAddTab === 'single'
                        ? 'border-purple-600 text-purple-600 font-extrabold'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Tekli Ürün Tanımla
                  </button>
                  <button
                    type="button"
                    onClick={() => setProductAddTab('bulk')}
                    className={`px-4 py-2 text-xs font-bold border-b-2 cursor-pointer transition-all ${
                      productAddTab === 'bulk'
                        ? 'border-purple-600 text-purple-600 font-extrabold'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    🚀 Toplu Ürün Ekle (Excel, Word, PDF)
                  </button>
                </div>
              )}

              {productAddTab === 'bulk' && productFormMode === 'add' ? (
                /* --- TOPLU ÜRÜN İÇE AKTARMA PANELİ --- */
                <div className="space-y-4 animate-fade-in" id="bulk-product-import-view">
                  {bulkParsedProducts.length === 0 && !isBulkImporting ? (
                    <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center bg-white space-y-4 transition-all hover:border-purple-400">
                      <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                        <Upload className="w-6 h-6 animate-bounce" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-800 font-display">Toplu Ürün Belgesi Yükleyin veya Sürükleyin</p>
                        <p className="text-[10px] text-slate-400">Excel (.xlsx, .xls), Word (.docx) veya PDF (.pdf) dosyaları otomatik olarak çözümlenir.</p>
                      </div>

                      <div className="relative w-fit mx-auto">
                        <input
                          type="file"
                          accept=".xlsx,.xls,.docx,.pdf"
                          onChange={e => {
                            if (e.target.files && e.target.files.length > 0) {
                              handleBulkFileChange(e.target.files[0]);
                            }
                          }}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <button type="button" className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md shadow-purple-600/10 cursor-pointer">
                          Bilgisayardan Dosya Seç
                        </button>
                      </div>

                    </div>
                  ) : isBulkImporting ? (
                    <div className="border border-slate-200 bg-white rounded-2xl p-10 text-center space-y-4 animate-fade-in">
                      <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                        <div className="absolute inset-0 rounded-full border-4 border-slate-150 border-t-purple-600 animate-spin"></div>
                        <span className="text-xl">⚡</span>
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-sm font-bold text-slate-900 font-display">Yapay Zeka Akıllı Dosya Okuyucu Çalışıyor</h4>
                        <p className="text-xs text-slate-500 animate-pulse font-medium">{bulkImportStage}</p>
                      </div>
                      <div className="max-w-xs mx-auto bg-slate-100 rounded-full h-2 overflow-hidden shadow-inner">
                        <div className="bg-gradient-to-r from-purple-500 to-indigo-600 h-2 transition-all duration-300" style={{ width: `${bulkImportProgress}%` }}></div>
                      </div>
                      <span className="text-xs font-mono font-bold text-purple-600 block">{bulkImportProgress}% Tamamlandı</span>
                    </div>
                  ) : (
                    <div className="space-y-4 animate-fade-in">
                      <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex items-start gap-3">
                          <span className="bg-purple-100 text-purple-700 w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0">✨</span>
                          <div>
                            <strong className="text-xs text-slate-900 block font-display">
                              Belge Başarıyla Ayrıştırıldı: <span className="text-purple-700 font-mono font-bold">{bulkImportFile?.name}</span>
                            </strong>
                            <p className="text-[10px] text-slate-500 leading-normal">
                              Dosya içerisindeki ürün, fiyat ve marka matrisi çıkarıldı. Görseller ve kategoriler otomatik eşleştirildi. Kataloğa aktarmadan önce değerleri güncelleyebilirsiniz.
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setBulkParsedProducts([]);
                            setBulkImportFile(null);
                          }}
                          className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-[10px] px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-2xs shrink-0"
                        >
                          Yeni Dosya Yükle
                        </button>
                      </div>

                      {/* Parsed products grid editor */}
                      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs" id="admin-bulk-parsed-table">
                            <thead>
                              <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
                                <th className="p-3.5">Görsel</th>
                                <th className="p-3.5">Ürün Adı *</th>
                                <th className="p-3.5">Marka *</th>
                                <th className="p-3.5">Kategori</th>
                                <th className="p-3.5 font-mono">Fiyat (TL) *</th>
                                <th className="p-3.5 text-center">Stok</th>
                                <th className="p-3.5">Ambalaj</th>
                                <th className="p-3.5 text-right">İşlem</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                              {bulkParsedProducts.map((product, idx) => (
                                <tr key={product.id} className="hover:bg-slate-50/40">
                                  <td className="p-3.5">
                                    <div className="relative w-10 h-10 shrink-0">
                                      <img
                                        src={product.image}
                                        alt=""
                                        referrerPolicy="no-referrer"
                                        className="w-10 h-10 object-contain rounded-lg bg-slate-50 p-1 border border-slate-150"
                                      />
                                      <span className="absolute -top-1 -right-1 bg-purple-600 text-white text-[7px] font-extrabold px-1 py-0.2 rounded-full shadow-xs" title="Görsel ve kategori yapay zeka ile otomatik eşleştirildi">AI</span>
                                    </div>
                                  </td>
                                  <td className="p-3.5">
                                    <input
                                      type="text"
                                      value={product.name}
                                      required
                                      onChange={e => handleUpdateBulkParsedProduct(idx, { ...product, name: e.target.value })}
                                      className="w-full min-w-[200px] px-3 py-1.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-purple-500 rounded-xl text-xs text-slate-900 focus:outline-hidden font-bold"
                                    />
                                  </td>
                                  <td className="p-3.5">
                                    <input
                                      type="text"
                                      value={product.brand}
                                      required
                                      onChange={e => handleUpdateBulkParsedProduct(idx, { ...product, brand: e.target.value })}
                                      className="w-28 px-3 py-1.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-purple-500 rounded-xl text-xs text-slate-900 focus:outline-hidden"
                                    />
                                  </td>
                                  <td className="p-3.5">
                                    <select
                                      value={product.category}
                                      onChange={e => {
                                        const cat = e.target.value;
                                        const img = getStationeryImage(product.name, cat);
                                        handleUpdateBulkParsedProduct(idx, { ...product, category: cat, image: img, images: [img] });
                                      }}
                                      className="w-48 px-3 py-1.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-purple-500 rounded-xl text-xs text-slate-900 focus:outline-hidden"
                                    >
                                      {categories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                      ))}
                                    </select>
                                  </td>
                                  <td className="p-3.5">
                                    <input
                                      type="number"
                                      value={product.price}
                                      min="0.01"
                                      step="0.01"
                                      required
                                      onChange={e => handleUpdateBulkParsedProduct(idx, { ...product, price: Number(e.target.value) })}
                                      className="w-24 px-3 py-1.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-purple-500 rounded-xl text-xs text-slate-900 font-mono font-bold focus:outline-hidden"
                                    />
                                  </td>
                                  <td className="p-3.5">
                                    <input
                                      type="number"
                                      value={product.stock}
                                      min="0"
                                      required
                                      onChange={e => handleUpdateBulkParsedProduct(idx, { ...product, stock: Number(e.target.value) })}
                                      className="w-20 px-3 py-1.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-purple-500 rounded-xl text-xs text-slate-900 font-mono text-center focus:outline-hidden"
                                    />
                                  </td>
                                  <td className="p-3.5">
                                    <select
                                      value={product.packagingType || 'UNIT'}
                                      onChange={e => handleUpdateBulkParsedProduct(idx, { ...product, packagingType: e.target.value as Product['packagingType'] })}
                                      className="w-24 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-[10px] text-slate-900"
                                    >
                                      <option value="UNIT">Tekli</option>
                                      <option value="DOZEN">Düzine</option>
                                      <option value="CARTON">Koli</option>
                                    </select>
                                    <input
                                      type="number"
                                      min="1"
                                      value={product.itemsPerPackage || 1}
                                      onChange={e => handleUpdateBulkParsedProduct(idx, { ...product, itemsPerPackage: Number(e.target.value) })}
                                      className="mt-1 w-24 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-[10px] text-slate-900"
                                    />
                                  </td>
                                  <td className="p-3.5 text-right">
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveBulkParsedProduct(idx)}
                                      className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-2 border border-rose-100 rounded-xl transition-all cursor-pointer inline-flex items-center"
                                      title="Listeden Kaldır"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Bulk actions bottom footer */}
                      <div className="flex justify-between items-center pt-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Kataloğa eklenecek: {bulkParsedProducts.length} Ürün</span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={resetProductForm}
                            className="bg-white hover:bg-slate-100 text-slate-700 font-bold border border-slate-200 px-4 py-2 rounded-xl text-xs cursor-pointer transition-all"
                          >
                            İptal
                          </button>
                          <button
                            type="button"
                            disabled={bulkParsedProducts.length === 0}
                            onClick={async () => {
                              if (!onSaveProductsBulk) return;
                              try {
                                const productsForSave = await Promise.all(bulkParsedProducts.map(async product => {
                                  if (!product.image.startsWith('data:image/')) return { ...product, importStatus: 'ACTIVE' as const };
                                  const [metadata, encoded] = product.image.split(',');
                                  const mimeType = metadata.match(/data:(.*?);base64/)?.[1] || 'image/png';
                                  const imageFile = new File([Uint8Array.from(atob(encoded), character => character.charCodeAt(0))], `${product.id}.png`, { type: mimeType });
                                  const imageUrl = await uploadFile(`products/import/${product.id}.png`, imageFile);
                                  return { ...product, image: imageUrl, images: [imageUrl], importStatus: 'ACTIVE' as const };
                                }));
                                await onSaveProductsBulk(productsForSave);
                                alert(`${productsForSave.length} ürün görselleri, kategorileri ve ambalaj bilgileriyle başarıyla aktarıldı.`);
                                resetProductForm();
                              } catch (error) {
                                alert(error instanceof Error ? error.message : 'Toplu ürün aktarımı tamamlanamadı.');
                              }
                            }}
                            className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md shadow-purple-600/15 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            <CheckCircle2 className="w-4 h-4" /> Kataloğa Aktar ve Yayınla ({bulkParsedProducts.length} Ürün)
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* --- TEKLİ ÜRÜN TANIMLAMA / DÜZENLEME FORMU --- */
                <form onSubmit={handleProductSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Ürün Adı *</label>
                        <input
                          type="text"
                          required
                          placeholder="Örn: Rotring 500 Versatil Kalem 0.7mm"
                          value={prodName}
                          onChange={e => setProdName(e.target.value)}
                          className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Marka *</label>
                        <input
                          type="text"
                          required
                          placeholder="Örn: Rotring"
                          value={prodBrand}
                          onChange={e => setProdBrand(e.target.value)}
                          className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Kategori *</label>
                        <select
                          required
                          value={prodCategory}
                          onChange={e => setProdCategory(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden"
                        >
                          {categories.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                        {onAddCategory && (
                          <div className="mt-2 flex gap-2">
                            {isAddingCategory ? (
                              <>
                                <input
                                  type="text"
                                  value={newCategoryName}
                                  onChange={e => setNewCategoryName(e.target.value)}
                                  placeholder="Yeni kategori adı"
                                  className="min-w-0 flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden"
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  disabled={!newCategoryName.trim()}
                                  onClick={async () => {
                                    const categoryName = newCategoryName.trim();
                                    if (!categoryName) return;
                                    setIsAddingCategory(true);
                                    await onAddCategory(categoryName);
                                    setProdCategory(categoryName);
                                    setNewCategoryName('');
                                    setIsAddingCategory(false);
                                  }}
                                  className="shrink-0 rounded-xl bg-emerald-600 px-3 py-2 text-[10px] font-bold text-white disabled:opacity-50"
                                >Ekle</button>
                                <button type="button" onClick={() => { setNewCategoryName(''); setIsAddingCategory(false); }} className="shrink-0 rounded-xl border border-slate-200 px-3 py-2 text-[10px] font-bold text-slate-600">İptal</button>
                              </>
                            ) : (
                              <button type="button" onClick={() => setIsAddingCategory(true)} className="text-[10px] font-bold text-blue-600 hover:text-blue-700">+ Yeni kategori ekle</button>
                            )}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Fiyat (TL) *</label>
                        <input
                          type="number"
                          required
                          min="0.1"
                          step="0.01"
                          value={prodPrice || ''}
                          onChange={e => setProdPrice(Number(e.target.value))}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Stok Miktarı *</label>
                        <input
                          type="number"
                          required
                          min="0"
                          value={prodStock || ''}
                          onChange={e => setProdStock(Number(e.target.value))}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden"
                        />
                      </div>
                    </div>

                    <div className="md:col-span-2 bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-700">Satış Birimleri ve Kodlar</span>
                        <span className="text-[10px] text-slate-400">Adet fiyatı yukarıdaki temel fiyattır</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <input value={prodDozenQuantity || ''} onChange={e => setProdDozenQuantity(Number(e.target.value))} type="number" min="1" placeholder="Düzine içi adet" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs" />
                        <input value={prodDozenPrice || ''} onChange={e => setProdDozenPrice(Number(e.target.value))} type="number" min="0" step="0.01" placeholder="Düzine fiyatı" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs" />
                        <input value={prodBoxQuantity || ''} onChange={e => setProdBoxQuantity(Number(e.target.value))} type="number" min="1" placeholder="Koli içi adet" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs" />
                        <input value={prodBoxPrice || ''} onChange={e => setProdBoxPrice(Number(e.target.value))} type="number" min="0" step="0.01" placeholder="Koli fiyatı" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs" />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input value={prodBarcode} onChange={e => setProdBarcode(e.target.value)} placeholder="Ürün barkod numarası" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono" />
                        <input value={prodQrCode} onChange={e => setProdQrCode(e.target.value)} placeholder="Karekod içeriği / numarası" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Açıklama</label>
                      <textarea
                        rows={3}
                        value={prodDescription}
                        onChange={e => setProdDescription(e.target.value)}
                        placeholder="Ürün açıklaması..."
                        className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden resize-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-4 flex flex-col justify-between">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Cihazdan Ürün Fotoğrafı Yükle *</label>
                      <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => document.getElementById('admin-product-file-input')?.click()}
                        className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5 ${
                          isProductImgDragging 
                            ? 'border-purple-500 bg-purple-50' 
                            : 'border-slate-200 hover:border-purple-400 hover:bg-slate-50/50'
                        }`}
                      >
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          id="admin-product-file-input"
                          onChange={handleImageFileChange}
                          className="hidden"
                        />
                        <Upload className={`w-6 h-6 ${isProductImgDragging ? 'text-purple-600 animate-bounce' : 'text-slate-400'}`} />
                        <span className="text-[11px] text-slate-600 font-medium">
                          Sürükleyip bırakın veya <strong className="text-purple-600">tıklayarak seçin</strong>
                        </span>
                        <span className="text-[9px] text-slate-400">
                          Sınırsız sayıda ve tüm boyutlarda görsel yüklenebilir
                        </span>
                        {isProductUploading && (
                          <span className="mt-1 flex items-center gap-1 text-[10px] font-bold text-purple-700">
                            <RefreshCw className="h-3 w-3 animate-spin" /> {imageUploadStatus || 'Görsel işleniyor...'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Görsel Galerisi / Önizleme */}
                    {prodImages.length > 0 && (
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold text-slate-600">Yüklenen Fotoğraflar ({prodImages.length})</label>
                        <div className="grid grid-cols-4 gap-2 max-h-36 overflow-y-auto p-1 bg-slate-50 border border-slate-100 rounded-xl">
                          {prodImages.map((img, idx) => (
                            <div key={idx} className="relative aspect-square rounded-lg border border-slate-200 bg-white overflow-hidden group">
                              <img src={img} alt={`Önizleme ${idx + 1}`} className="w-full h-full object-contain p-0.5" />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveProductImage(idx);
                                }}
                                className="absolute top-1 right-1 bg-rose-500/80 hover:bg-rose-600 text-white p-1 rounded-full transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100 cursor-pointer shadow-xs"
                                title="Görseli Kaldır"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                              {idx === 0 && (
                                <span className="absolute bottom-0 left-0 right-0 bg-purple-600/90 text-white text-[8px] font-bold text-center py-0.5">
                                  Ana Görsel
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={resetProductForm}
                        className="flex-1 bg-white hover:bg-slate-100 text-slate-700 font-bold border border-slate-200 py-2.5 rounded-xl text-xs cursor-pointer"
                      >
                        Vazgeç
                      </button>
                      <button
                        type="submit"
                        className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 rounded-xl text-xs cursor-pointer"
                      >
                        Kaydet
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Products catalog list table */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-2xs">
            <h3 className="font-display font-bold text-xs text-slate-900 tracking-tight uppercase">
              Merkezi Ürün Stok Kataloğu ({products.length} Çeşit)
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs" id="admin-products-table">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
                    <th className="p-3">Görsel</th>
                    <th className="p-3">Ürün Detayı</th>
                    <th className="p-3">Kategori</th>
                    <th className="p-3 font-mono">Fiyat</th>
                    <th className="p-3 text-center">Merkez Stok</th>
                    <th className="p-3 text-right">Düzenleme</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                  {products.map(product => (
                    <tr id={`admin-prod-row-${product.id}`} key={product.id} className="hover:bg-slate-50/50">
                      <td className="p-3">
                        <img
                          src={product.image}
                          alt={product.name}
                          referrerPolicy="no-referrer"
                          className="w-9 h-9 object-contain rounded-lg bg-slate-50 p-1 border border-slate-150"
                        />
                      </td>
                      <td className="p-3">
                        <span className="font-bold text-slate-900 block">{product.name}</span>
                        <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.2 rounded font-semibold uppercase">{product.brand}</span>
                      </td>
                      <td className="p-3 text-slate-500">{product.category}</td>
                      <td className="p-3 font-mono font-semibold text-slate-900">{product.price.toFixed(2)} TL</td>
                      <td className="p-3 text-center font-mono">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          product.stock > 15 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                        }`}>
                          {product.stock} Adet
                        </span>
                      </td>
                      <td className="p-3 text-right space-x-1.5">
                        <button
                          id={`edit-prod-btn-${product.id}`}
                          onClick={() => openProductEdit(product)}
                          className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-purple-600 rounded-lg transition-all inline-flex items-center cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          id={`delete-prod-btn-${product.id}`}
                          onClick={() => {
                            if (confirm(`${product.name} envanter kaydını kalıcı olarak silmek istiyor musunuz?`)) {
                              onDeleteProduct(product.id);
                            }
                          }}
                          className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-all inline-flex items-center cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- 4. DEALER RECORDS & COMPLETE CRUD MANAGEMENT TAB --- */}
      {activeSubTab === 'dealers' && (
        <div className="space-y-6" id="admin-dealers-section">
          {/* POS Havuz & Komisyon Özet Bento Bölümü */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="admin-commission-bento">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-2 shadow-2xs relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl"></div>
              <span className="text-slate-400 text-[10px] font-bold tracking-wider uppercase block">MERKEZ POS HAVUZ BAKİYESİ</span>
              <p className="text-3xl font-extrabold text-slate-900 font-mono">
                {centralPoolBalance.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL
              </p>
              <p className="text-[10px] text-slate-400">Tamamlanmış ve onaylanmış tüm siparişlerin merkez POS toplamı</p>
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="button"
                  onClick={async () => {
                    if (!window.confirm('Merkez POS havuzunu ve ilgili sipariş/finans kayıtlarını sıfırlamak istediğinizden emin misiniz? Kayıtlar çöp kutusuna taşınacaktır.')) return;
                    await onResetFinancialData();
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[10px] font-bold text-rose-700 transition-colors hover:bg-rose-100 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" /> POS Havuzunu Sıfırla
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!window.confirm('Yalnızca test modunda oluşturulan bilgileri sıfırlamak istediğinizden emin misiniz? Gerçek siparişler korunacaktır.')) return;
                    await onDeleteTestOrders();
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[10px] font-bold text-amber-700 transition-colors hover:bg-amber-100 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" /> Test Bilgilerini Sıfırla
                </button>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-2 shadow-2xs relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl"></div>
              <span className="text-slate-400 text-[10px] font-bold tracking-wider uppercase block">TOPLAM ÖDENECEK KOMİSYON</span>
              <p className="text-3xl font-extrabold text-amber-600 font-mono">
                {totalCommissions.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL
              </p>
              <p className="text-[10px] text-slate-400">Bayilerin hak ettiği ve henüz çekmediği toplam komisyon</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-2 shadow-2xs relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-xl"></div>
              <span className="text-slate-400 text-[10px] font-bold tracking-wider uppercase block">BEKLEYEN ÖDEME TALEPLERİ</span>
              <p className="text-3xl font-extrabold text-purple-600 font-mono">
                {pendingRequests.length} Adet
              </p>
              <p className="text-[10px] text-slate-400">Esnaflardan gelen ve onay bekleyen ödeme talepleri</p>
            </div>
          </div>

          {/* Bayi Komisyon Ödeme Talepleri Bölümü */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4" id="admin-pending-commission-requests">
            <h3 className="font-display font-bold text-xs text-slate-900 tracking-tight uppercase flex items-center gap-2">
              <Coins className="w-4.5 h-4.5 text-amber-500" />
              Bayi Komisyon Çekim Talepleri (Onay Bekleyenler)
            </h3>

            {pendingRequests.length === 0 ? (
              <div className="bg-white border border-slate-100 rounded-xl p-6 text-center text-slate-400 text-xs">
                Mevcut onay bekleyen esnaf komisyon çekim talebi bulunmuyor.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingRequests.map(req => (
                  <div key={req.id} className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-2xs">
                    <div className="flex justify-between items-start border-b border-slate-100 pb-2">
                      <div>
                        <span className="text-[9px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full font-bold">
                          TALEP NO: {req.id}
                        </span>
                        <h4 className="font-bold text-sm text-slate-900 mt-1">{req.dealerName}</h4>
                      </div>
                      <div className="text-right">
                        <span className="text-base font-extrabold text-emerald-600 font-mono block">
                          {Number(req.amount ?? 0).toLocaleString('tr-TR')} TL
                        </span>
                        <span className="text-[9px] text-slate-400">
                          {new Date(req.date).toLocaleDateString('tr-TR')}
                        </span>
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-600 space-y-1 border border-slate-100">
                      <p><strong>Banka Adı:</strong> {req.bankName}</p>
                      <p><strong>Hesap Sahibi:</strong> {req.accountHolder}</p>
                      <p className="font-mono text-[11px] break-all"><strong>IBAN:</strong> {req.iban}</p>
                    </div>

                    <div className="flex gap-2 text-xs font-semibold">
                      <button
                        onClick={() => onRejectCommissionRequest(req.id)}
                        className="flex-1 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 py-2 rounded-lg transition-all cursor-pointer"
                      >
                        Reddet
                      </button>
                      <button
                        onClick={() => onApproveCommissionRequest(req.id)}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Check className="w-4 h-4" /> <span>Onayla ve Havuzdan Öde</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Direct Dealer Add / Edit Form Modal */}
          {isDealerFormOpen && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4" id="dealer-form-container">
              <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                <h3 className="font-display font-bold text-xs text-slate-900">
                  {dealerFormMode === 'add' ? 'Yeni Esnaf Kırtasiye Bayisi Kaydet' : 'Esnaf Bayi Profilini Düzenle'}
                </h3>
                <button onClick={resetDealerForm} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleDealerSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Esnaf Mağaza Ticari Adı *</label>
                      <input
                        type="text"
                        required
                        placeholder="Örn: Moda Defter Dünyası"
                        value={dlrName}
                        onChange={e => setDlrName(e.target.value)}
                        className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Esnaf Sahibi Ad Soyad *</label>
                      <input
                        type="text"
                        required
                        placeholder="Örn: Mehmet Can"
                        value={dlrOwner}
                        onChange={e => setDlrOwner(e.target.value)}
                        className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1 font-semibold text-purple-700">Faaliyet Sektörü *</label>
                      <select
                        value={dlrSector}
                        onChange={e => setDlrSector(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-purple-200 focus:border-purple-500 rounded-xl text-xs text-slate-900 focus:outline-hidden font-semibold text-purple-700"
                      >
                        {['Kırtasiye', 'Hediyelik Eşya', 'İç Giyim', 'Elektronik', 'Giyim', 'Ayakkabı', 'Takılar'].map(secName => (
                          <option key={secName} value={secName}>{secName}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Şehir *</label>
                      <select
                        value={dlrCityManual ? 'Diğer' : dlrCity}
                        onChange={e => {
                          const val = e.target.value;
                          if (val === 'Diğer') {
                            setDlrCityManual(true);
                          } else {
                            setDlrCityManual(false);
                            setDlrCity(val);
                          }
                        }}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden"
                      >
                        {ALL_TURKISH_CITIES.map(cityName => (
                          <option key={cityName} value={cityName}>{cityName}</option>
                        ))}
                        <option value="Diğer">✍️ Diğer / Manuel Giriş...</option>
                      </select>
                      {dlrCityManual && (
                        <div className="mt-1.5 animate-in fade-in duration-150">
                          <input
                            type="text"
                            required
                            placeholder="Şehir adını girin..."
                            value={dlrManualCityValue}
                            onChange={e => setDlrManualCityValue(e.target.value)}
                            className="w-full px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:border-emerald-500 focus:bg-white focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">İlçe *</label>
                      <input
                        type="text"
                        required
                        placeholder="Örn: Kadıköy"
                        value={dlrDistrict}
                        onChange={e => setDlrDistrict(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">İletişim Telefonu *</label>
                      <input
                        type="text"
                        required
                        placeholder="05..."
                        value={dlrPhone}
                        onChange={e => setDlrPhone(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">E-posta Adresi *</label>
                      <input
                        type="email"
                        required
                        placeholder="kullanici@posta.com"
                        value={dlrEmail}
                        onChange={e => setDlrEmail(e.target.value)}
                        className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden"
                      />
                    </div>
                    {dealerFormMode === 'add' && (
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Giriş Şifresi *</label>
                        <input
                          type="text"
                          required
                          placeholder="Şifre..."
                          value={dlrPassword}
                          onChange={e => setDlrPassword(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden"
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Yayın Durumu *</label>
                      <select
                        value={dlrStatus}
                        onChange={e => setDlrStatus(e.target.value as Dealer['status'])}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden"
                      >
                        <option value="active">Aktif (Yayında)</option>
                        <option value="pending">Onay Bekliyor</option>
                        <option value="suspended">Askıya Alındı</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1 font-semibold text-purple-700">Özel Oran (%)</label>
                      <input
                        type="number"
                        min="0.1"
                        max="100"
                        step="0.1"
                        placeholder={`Genel: %${storeSettings.commissionRate}`}
                        value={dlrCommissionRate}
                        onChange={e => setDlrCommissionRate(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full px-3 py-2 bg-white border-purple-200 focus:border-purple-500 rounded-xl text-xs text-slate-900 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1 font-semibold text-emerald-700">Vitrin Komisyon (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        placeholder="Varsayılan: %5"
                        value={dlrPrivateCommissionRate}
                        onChange={e => setDlrPrivateCommissionRate(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full px-3 py-2 bg-white border-emerald-200 focus:border-emerald-500 rounded-xl text-xs text-slate-900 focus:outline-hidden font-medium text-emerald-700"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1 font-semibold text-rose-700">Sektör Komisyonu (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        placeholder={`Varsayılan: %${(storeSettings?.sectorAdminCommissions && storeSettings.sectorAdminCommissions[dlrSector]) !== undefined ? storeSettings.sectorAdminCommissions[dlrSector] : 10}`}
                        value={dlrAdminSectorCommissionRate}
                        onChange={e => setDlrAdminSectorCommissionRate(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full px-3 py-2 bg-white border-rose-200 focus:border-rose-500 rounded-xl text-xs text-slate-900 focus:outline-hidden font-medium text-rose-700"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 flex flex-col justify-between">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Fiziki Dükkan Adresi</label>
                    <textarea
                      rows={4}
                      placeholder="Sokak, no, mahalle detayları..."
                      value={dlrAddress}
                      onChange={e => setDlrAddress(e.target.value)}
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden resize-none"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={resetDealerForm}
                      className="flex-1 bg-white hover:bg-slate-100 text-slate-700 font-bold border border-slate-200 py-2.5 rounded-xl text-xs cursor-pointer"
                    >
                      Vazgeç
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs cursor-pointer"
                    >
                      Esnafı Kaydet
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* Dealer applications submitted from the public form */}
          {dealerApplications.filter(application => application.status === 'pending').length > 0 && (
            <div className="bg-purple-50/60 border border-purple-200 rounded-2xl p-6 space-y-4">
              <h3 className="font-display font-bold text-xs text-slate-900 tracking-tight uppercase flex items-center gap-2">
                <ShieldAlert className="w-4.5 h-4.5 text-purple-500" />
                Yeni Bayi Başvuruları ({dealerApplications.filter(application => application.status === 'pending').length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dealerApplications.filter(application => application.status === 'pending').map(application => (
                  <div key={application.id} className="border border-purple-100 bg-white rounded-2xl p-5 space-y-3 shadow-2xs">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[9px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full font-bold uppercase">BAŞVURU FORMU</span>
                        <h4 className="font-display font-bold text-sm text-slate-900 mt-1">{application.name}</h4>
                        <p className="text-[10px] text-purple-600 font-mono font-bold mt-1">Bayi ID: {application.dealerId || 'Eski başvuru'}</p>
                      </div>
                      <span className="text-[9px] text-slate-400 font-mono">{new Date(application.createdAt).toLocaleDateString('tr-TR')}</span>
                    </div>
                    <div className="space-y-1 text-xs text-slate-600 leading-relaxed">
                      <p><strong>Esnaf Yetkili:</strong> {application.owner}</p>
                      <p><strong>Sektör:</strong> {application.sector || 'Belirtilmedi'}</p>
                      <p><strong>Konum:</strong> {application.city} / {application.district}</p>
                      <p><strong>İletişim:</strong> {application.phone} | {application.email}</p>
                      <p><strong>Adres:</strong> {application.address}</p>
                    </div>
                    <div className="flex gap-2 pt-2 border-t border-slate-100">
                      <button type="button" onClick={() => void Promise.resolve(onUpdateDealerApplicationStatus(application.id, 'rejected')).catch(() => alert('Bayi başvurusu reddedilemedi.'))} className="flex-1 bg-white hover:bg-rose-50 text-rose-600 font-bold border border-rose-200 py-2 rounded-xl text-xs transition-all cursor-pointer">Reddet</button>
                      <button type="button" onClick={() => void Promise.resolve(onApproveDealerApplication(application)).catch(error => alert(error instanceof Error ? error.message : 'Bayi başvurusu onaylanamadı.'))} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 rounded-xl text-xs transition-all cursor-pointer">Başvuruyu Onayla</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending Approvals Widget */}
          {dealers.filter(d => d.status === 'pending').length > 0 && (
            <div className="bg-amber-50/50 border border-amber-200 rounded-2xl p-6 space-y-4">
              <h3 className="font-display font-bold text-xs text-slate-900 tracking-tight uppercase flex items-center gap-2">
                <ShieldAlert className="w-4.5 h-4.5 text-amber-500" />
                Bayilik İsteyen Esnaf Onay Kuyruğu ({dealers.filter(d => d.status === 'pending').length})
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dealers
                  .filter(d => d.status === 'pending')
                  .map(dealer => (
                    <div
                      id={`pending-dealer-${dealer.id}`}
                      key={dealer.id}
                      className="border border-amber-100 bg-white rounded-2xl p-5 space-y-3 relative overflow-hidden shadow-2xs"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[9px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold uppercase">
                            YENİ BAŞVURU
                          </span>
                          <h4 className="font-display font-bold text-sm text-slate-900 mt-1">{dealer.name}</h4>
                        </div>
                        <span className="text-[9px] text-slate-400 font-mono">
                          {new Date(dealer.createdAt).toLocaleDateString('tr-TR')}
                        </span>
                      </div>

                      <div className="space-y-1 text-xs text-slate-600 leading-relaxed">
                        <p><strong>Esnaf Yetkili:</strong> {dealer.owner}</p>
                        <p><strong>Sektör:</strong> {dealer.sector || 'Belirtilmedi'}</p>
                        <p><strong>Konum:</strong> {dealer.city} / {dealer.district}</p>
                        <p><strong>İletişim:</strong> {dealer.phone} | {dealer.email}</p>
                        <p><strong>Adres:</strong> {dealer.address}</p>
                      </div>

                      <div className="flex gap-2 pt-2 border-t border-slate-100">
                        <button
                          onClick={() => onUpdateDealerStatus(dealer.id, 'suspended')}
                          className="flex-1 bg-white hover:bg-rose-50 text-rose-600 font-bold border border-rose-200 py-2 rounded-xl text-xs transition-all cursor-pointer"
                        >
                          Reddet / Engelle
                        </button>
                        <button
                          onClick={() => onUpdateDealerStatus(dealer.id, 'active')}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl text-xs transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" /> <span>Bayiliği Onayla</span>
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Master Esnaflar List Directory with full Edit/Delete actions */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-2xs">
            <h3 className="font-display font-bold text-xs text-slate-900 tracking-tight uppercase">
              Tüm Esnaf Bayileri ve Kontrol Paneli ({dealers.length} Bayi Kayıtlı)
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs" id="admin-dealers-table">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
                    <th className="p-3">Kırtasiye Detayı</th>
                    <th className="p-3">Şehir / İlçe</th>
                    <th className="p-3">İletişim</th>
                    <th className="p-3 text-right">Toplam Satış (Ciro)</th>
                    <th className="p-3 text-right">Komisyon Hak Edişi</th>
                    <th className="p-3 text-center">Yayın Durumu</th>
                    <th className="p-3 text-right">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                  {dealers.map(dealer => (
                    <tr id={`admin-dealer-row-${dealer.id}`} key={dealer.id} className="hover:bg-slate-50/50">
                      <td className="p-3">
                        <span className="font-bold text-slate-900 block">{dealer.name}</span>
                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-slate-400">Yetkili: {dealer.owner}</span>
                          {dealer.sector && (
                            <span className="bg-blue-50 text-blue-700 text-[9px] font-extrabold px-1.5 py-0.2 rounded uppercase border border-blue-100">
                              {dealer.sector}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-slate-500">{dealer.city} / {dealer.district}</td>
                      <td className="p-3 space-y-0.5 text-slate-400">
                        <p>{dealer.phone}</p>
                        <p className="text-[10px]">{dealer.email}</p>
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900">
                        {(dealerFinancials.get(dealer.id)?.salesVolume ?? 0).toLocaleString('tr-TR')} TL
                      </td>
                      <td className="p-3 text-right font-mono text-amber-600">
                        <span className="font-extrabold block">{(dealerFinancials.get(dealer.id)?.commissionEarned ?? 0).toLocaleString('tr-TR')} TL</span>
                        <div className="text-[9px] text-slate-400 font-medium flex flex-col items-end">
                          <span>Ortak: {dealer.commissionRate !== undefined ? `%${dealer.commissionRate} Özel` : `%${storeSettings.commissionRate} Genel`}</span>
                          <span>Vitrin: {dealer.privateCommissionRate !== undefined ? `%${dealer.privateCommissionRate} Özel` : '%5 Genel'}</span>
                          <span>Sektör Kesintisi: {dealer.adminSectorCommissionRate !== undefined ? `%${dealer.adminSectorCommissionRate} Özel` : `%${(storeSettings?.sectorAdminCommissions && dealer.sector && storeSettings.sectorAdminCommissions[dealer.sector]) !== undefined ? storeSettings.sectorAdminCommissions[dealer.sector!] : 10} Genel`}</span>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                          dealer.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700'
                            : dealer.status === 'pending'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}>
                          {dealer.status === 'active' ? 'Aktif' : dealer.status === 'pending' ? 'Bekliyor' : 'Askıda'}
                        </span>
                      </td>
                      <td className="p-3 text-right space-x-1 flex justify-end items-center">
                        {(dealerFinancials.get(dealer.id)?.commissionEarned ?? 0) > 0 && (
                          <button
                            onClick={() => {
                              setDirectPayDealer(dealer);
                              setDirectPayAmount(dealerFinancials.get(dealer.id)?.commissionEarned ?? 0);
                              setIsDirectPayModalOpen(true);
                            }}
                            className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-2 py-0.5 rounded text-[10px] hover:shadow-xs transition-all cursor-pointer flex items-center gap-1 mr-1"
                            title="Doğrudan Komisyon Ödemesi Yap"
                          >
                            <Coins className="w-3 h-3" /> Komisyon Öde
                          </button>
                        )}
                        <button
                          onClick={() => openDealerEdit(dealer)}
                          className="p-1 hover:bg-slate-100 text-slate-500 hover:text-purple-600 rounded-lg cursor-pointer"
                          title="Bayi Profilini Düzenle"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {dealer.status === 'active' ? (
                          <button
                            onClick={() => onUpdateDealerStatus(dealer.id, 'suspended')}
                            className="bg-rose-50 text-rose-700 font-bold px-1.5 py-0.5 rounded text-[10px] hover:bg-rose-100 cursor-pointer"
                            title="Satışları Askıya Al"
                          >
                            Durdur
                          </button>
                        ) : (
                          <button
                            onClick={() => onUpdateDealerStatus(dealer.id, 'active')}
                            className="bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.5 rounded text-[10px] hover:bg-emerald-100 cursor-pointer"
                            title="Aktifleştir"
                          >
                            Başlat
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (confirm(`${dealer.name} esnaf kaydını ve sistem entegrasyonunu tamamen silmek istediğinize emin misiniz? Bu işlem geri alınamaz!`)) {
                              void Promise.resolve(onDeleteDealer(dealer.id)).catch(error => alert(error instanceof Error ? error.message : 'Bayi silinemedi.'));
                            }
                          }}
                          className="p-1 hover:bg-rose-100 text-rose-400 hover:text-rose-600 rounded-lg cursor-pointer"
                          title="Bayiyi Kalıcı Olarak Sil"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'members' && (
        <div className="space-y-6" id="admin-members-section">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div><h3 className="font-display font-bold text-base text-slate-900">Üye Yönetimi</h3><p className="text-xs text-slate-500">Kayıtlı üyeleri seçerek iletişim ve sipariş geçmişlerini yönetin.</p></div>
              <span className="bg-purple-100 text-purple-700 rounded-full px-3 py-1 text-[11px] font-bold">{members.length} üye</span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-1 space-y-2 max-h-[32rem] overflow-y-auto">
                {members.map(member => (
                  <button key={member.id} type="button" onClick={() => setSelectedMemberId(member.id)} className={`w-full text-left p-3 rounded-xl border cursor-pointer transition-colors ${selectedMemberId === member.id ? 'bg-purple-50 border-purple-300' : 'bg-slate-50 border-slate-200 hover:bg-white hover:border-purple-200'}`}>
                    <span className="block text-xs font-bold text-slate-800">{member.name}</span>
                    <span className="block text-[10px] text-slate-500">{member.email}</span>
                  </button>
                ))}
                {members.length === 0 && <p className="text-xs text-slate-400 py-4">Henüz kayıtlı üye bulunmuyor.</p>}
              </div>
              {selectedMemberId && (() => {
                const member = members.find(item => item.id === selectedMemberId);
                if (!member) return null;
                const memberOrders = orders.filter(order => order.memberId === member.id && !order.adminHidden);
                const visibleCount = memberOrders.filter(o => !o.memberHidden).length;
                const hiddenCount = memberOrders.filter(o => o.memberHidden).length;
                return (
                  <div className="lg:col-span-2 bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
                    <div className="flex items-center justify-between"><h4 className="font-display font-bold text-sm text-slate-900">{member.name} · Üye Detayları</h4><button type="button" onClick={() => { void Promise.resolve(onSaveMembers(members.filter(item => item.id !== member.id))).then(() => setSelectedMemberId(null)).catch(() => undefined); }} className="text-[10px] font-bold text-rose-600 hover:text-rose-800 cursor-pointer">Üyeyi Sil</button></div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input value={member.name} onChange={e => onSaveMembers(members.map(item => item.id === member.id ? { ...item, name: e.target.value } : item))} className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs" placeholder="Ad Soyad" />
                      <input value={member.email} onChange={e => onSaveMembers(members.map(item => item.id === member.id ? { ...item, email: e.target.value } : item))} className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs" placeholder="E-posta" />
                      <input value={member.phone || ''} onChange={e => onSaveMembers(members.map(item => item.id === member.id ? { ...item, phone: e.target.value } : item))} className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs" placeholder="Telefon" />
                      <span className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-[10px] text-slate-500">Kayıt: {new Date(member.createdAt).toLocaleDateString('tr-TR')}</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h5 className="text-[11px] font-bold text-slate-700">Sipariş Geçmişi</h5>
                        <span className="bg-slate-100 text-slate-600 rounded-full px-2 py-0.5 text-[9px] font-bold">{visibleCount} görünür</span>
                        {hiddenCount > 0 && <span className="bg-amber-100 text-amber-700 rounded-full px-2 py-0.5 text-[9px] font-bold">{hiddenCount} üyeden gizli</span>}
                      </div>
                      {memberOrders.map(order => (
                        <div key={order.id} className={`flex flex-wrap items-center justify-between gap-2 rounded-lg p-2 text-[10px] border ${order.memberHidden ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'}`}>
                          <div className="flex flex-wrap items-center gap-2 min-w-0">
                            <span className="font-mono font-bold text-slate-800">{order.id}</span>
                            <span className="text-slate-600">{order.totalPrice.toFixed(2)} TL</span>
                            <span className="text-slate-500">{order.paymentMethod === 'card' ? 'Kart onaylı' : order.receiptStatus === 'approved' ? 'Dekont onaylı' : order.receiptStatus === 'rejected' ? 'Dekont reddedildi' : 'İnceleniyor'}</span>
                            {order.memberHidden && (
                              <span className="bg-amber-100 text-amber-700 rounded-full px-2 py-0.5 text-[9px] font-bold border border-amber-200">Üyeden Gizlendi</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {!order.memberHidden ? (
                              <button
                                type="button"
                                onClick={() => handleMemberOrderDelete(order.id)}
                                className="inline-flex items-center gap-1 rounded-lg bg-amber-50 border border-amber-200 px-2 py-1 font-bold text-amber-700 hover:bg-amber-100 cursor-pointer text-[9px]"
                                title="Üyenin panelinden gizle (mali kayıtlar korunur)"
                              >
                                <Trash2 className="w-3 h-3" /> Üyeden Gizle
                              </button>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => handlePermanentOrderDelete(order.id)}
                              className="inline-flex items-center gap-1 rounded-lg bg-rose-50 border border-rose-200 px-2 py-1 font-bold text-rose-700 hover:bg-rose-100 cursor-pointer text-[9px]"
                              title="Yönetici panelinden de kalıcı olarak gizle (mali kayıtlar korunur)"
                            >
                              <Trash2 className="w-3 h-3" /> Kalıcı Sil
                            </button>
                          </div>
                        </div>
                      ))}
                      {memberOrders.length === 0 && <p className="text-[10px] text-slate-400">Bu üyeye ait sipariş bulunmuyor.</p>}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* --- 5. DETAILED ORDER TRANSACTION MANAGEMENT TAB --- */}
      {activeSubTab === 'orders' && (
        <div className="space-y-6" id="admin-orders-section">
          <div className="bg-white border border-amber-200 rounded-2xl p-5 space-y-4 shadow-sm" id="admin-receipts-panel">
            <div className="flex items-center justify-between"><div><h3 className="font-display font-bold text-base text-slate-900">Dekontlar</h3><p className="text-xs text-slate-500">Silinmeyen dekontlar burada birikir. Dekontu görüntüleyin, onaylayın, reddedin veya sipariş onayından sonra silin.</p></div><span className="bg-amber-100 text-amber-800 rounded-full px-3 py-1 text-[11px] font-bold">{orders.filter(o => o.receiptUploaded && o.receiptStatus !== 'approved').length} dekont</span></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{orders.filter(o => o.receiptUploaded && o.receiptStatus !== 'approved').map(order => <div key={order.id} className="border border-slate-200 rounded-xl p-3 space-y-3"><div className="flex justify-between text-xs"><span className="font-mono font-bold">{order.id}</span><span className="font-bold text-slate-600">{order.customerEmail}</span></div>{order.receiptDataUrl && <img src={order.receiptDataUrl} alt="Dekont" className="w-full max-h-48 object-contain rounded-lg bg-slate-50 border border-slate-100" />}{order.receiptFileName && <p className="text-[10px] text-slate-500">{order.receiptFileName}</p>}<div className="flex gap-2"><button onClick={() => handleReceiptDecision(order.id, 'approved')} className="flex-1 bg-emerald-600 text-white rounded-lg py-2 text-[11px] font-bold cursor-pointer">Onayla</button><button onClick={() => handleReceiptDecision(order.id, 'rejected')} className="flex-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg py-2 text-[11px] font-bold cursor-pointer">Reddet</button><button onClick={() => handleReceiptDelete(order.id)} className="bg-slate-100 text-slate-700 border border-slate-200 rounded-lg px-3 py-2 text-[11px] font-bold cursor-pointer hover:bg-slate-200" title="Dekontu sil"><Trash2 className="w-3 h-3 inline mr-1" />Sil</button></div><span className="text-[10px] font-bold text-slate-500">Durum: {order.receiptStatus || 'pending'}</span></div>)}</div>
            {orders.filter(o => o.receiptUploaded && o.receiptStatus !== 'approved').length === 0 && <p className="text-xs text-slate-400 py-4">Henüz yüklenmiş dekont bulunmuyor.</p>}
          </div>
          {/* Order Editing Form */}
          {isOrderFormOpen && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4" id="order-form-container">
              <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                <h3 className="font-display font-bold text-xs text-slate-900">
                  Sipariş Detayı & Müşteri İletişim Bilgilerini Güncelle (ID: {editingOrderId})
                </h3>
                <button onClick={resetOrderForm} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleOrderSubmit} className="space-y-6">
                {/* Section 1: Customer & Status */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-4 shadow-2xs">
                  <h4 className="font-display font-bold text-xs text-purple-700 uppercase tracking-wider">
                    1. Müşteri & Ödeme Durumu Bilgileri
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Müşteri Ad Soyad *</label>
                      <input
                        type="text"
                        required
                        value={ordCustName}
                        onChange={e => setOrdCustName(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Müşteri E-posta Adresi</label>
                      <input
                        type="email"
                        value={ordCustEmail}
                        onChange={e => setOrdCustEmail(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Müşteri Telefon No *</label>
                      <input
                        type="text"
                        required
                        value={ordCustPhone}
                        onChange={e => setOrdCustPhone(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Sipariş & Komisyon Durumu *</label>
                      <select
                        value={ordStatus}
                        onChange={e => setOrdStatus(e.target.value as any)}
                        className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden font-semibold"
                      >
                        <option value="completed">Tamamlandı (Ciro ve %{storeSettings.commissionRate} Esnaf Komisyonu Aktif)</option>
                        <option value="pending">Ödeme Havuzda / Beklemede</option>
                        <option value="cancelled">İptal Edildi (Ciro ve Esnaf Komisyonu Geri Alınır!)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section 2: Shipping address & receiver */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-4 shadow-2xs">
                  <h4 className="font-display font-bold text-xs text-purple-700 uppercase tracking-wider">
                    2. Alıcı & Teslimat Adresi Bilgileri
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Alıcı Ad Soyad *</label>
                      <input
                        type="text"
                        required
                        value={ordShippingReceiver}
                        onChange={e => setOrdShippingReceiver(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Alıcı Telefonu *</label>
                      <input
                        type="text"
                        required
                        value={ordShippingPhone}
                        onChange={e => setOrdShippingPhone(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Alıcı Şehri *</label>
                      <select
                        value={ordShippingCity}
                        onChange={e => setOrdShippingCity(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden"
                      >
                        {CITIES.map(c => (
                          <option key={c.name} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Alıcı İlçesi *</label>
                      <input
                        type="text"
                        required
                        value={ordShippingDistrict}
                        onChange={e => setOrdShippingDistrict(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden"
                      />
                    </div>
                    <div className="md:col-span-4">
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Açık Adres *</label>
                      <textarea
                        rows={2}
                        required
                        value={ordShippingAddress}
                        onChange={e => setOrdShippingAddress(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden resize-none"
                        placeholder="Mahalle, sokak, no, daire..."
                      />
                    </div>
                  </div>
                </div>

                {/* Section 3: Cargo Integration */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-4 shadow-2xs">
                  <h4 className="font-display font-bold text-xs text-purple-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-purple-600" /> 3. Kargo Firması Entegrasyonu & Gönderi Durumu
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Anlaşmalı Kargo Entegrasyonu *</label>
                      <select
                        value={ordShippingCompany}
                        onChange={e => setOrdShippingCompany(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden font-semibold"
                      >
                        <option value="Yurtiçi Kargo">Yurtiçi Kargo Entegrasyonu</option>
                        <option value="Aras Kargo">Aras Kargo Entegrasyonu</option>
                        <option value="MNG Kargo">MNG Kargo Entegrasyonu</option>
                        <option value="PTT Kargo">PTT Kargo Entegrasyonu</option>
                        <option value="Sürat Kargo">Sürat Kargo Entegrasyonu</option>
                        <option value="Trendyol Express">Trendyol Express Entegrasyonu</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Kargo Takip No (Barkod) *</label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          value={ordShippingTrackingNumber}
                          onChange={e => setOrdShippingTrackingNumber(e.target.value)}
                          placeholder="Barkod veya takip numarası..."
                          className="w-full pl-3 pr-20 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setOrdShippingTrackingNumber(`BG-${Math.floor(100000 + Math.random() * 900000)}`)}
                          className="absolute right-1 top-1 bg-purple-100 hover:bg-purple-200 text-purple-700 font-bold text-[9px] px-2 py-1 rounded-lg transition-all"
                        >
                          Kod Üret
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1 font-semibold text-purple-700">Kargo Gönderi Durumu *</label>
                      <select
                        value={ordShippingStatus}
                        onChange={e => setOrdShippingStatus(e.target.value as any)}
                        className="w-full px-3 py-2 bg-slate-50/50 border-purple-200 focus:border-purple-500 rounded-xl text-xs text-slate-900 focus:outline-hidden font-semibold"
                      >
                        <option value="preparing">Paketleniyor / Hazırlanıyor</option>
                        <option value="shipped">Kargoya Verildi / Yolda</option>
                        <option value="delivered">Müşteriye Teslim Edildi</option>
                        <option value="cancelled">İade / İptal</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex gap-3 justify-end pt-2">
                  <button
                    type="button"
                    onClick={resetOrderForm}
                    className="bg-white hover:bg-slate-100 text-slate-700 font-bold border border-slate-200 px-6 py-2.5 rounded-xl text-xs cursor-pointer"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-8 py-2.5 rounded-xl text-xs cursor-pointer shadow-md shadow-purple-600/15 animate-pulse"
                  >
                    Tüm Sipariş ve Kargo Bilgilerini Güncelle
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Admin Yeni Sipariş Oluşturma Formu (Modal) */}
          {isAdminNewOrderFormOpen && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4 mb-6 animate-fadeIn" id="admin-new-order-modal">
              <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                <h3 className="font-display font-bold text-xs text-slate-900 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-purple-600" />
                  Yönetici Konsolundan Doğrudan Sipariş Sevk Et (Sipariş Alındı Onaylı)
                </h3>
                <button onClick={() => setIsAdminNewOrderFormOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAdminNewOrderSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Hedef Esnaf Bayi *</label>
                      <select
                        required
                        value={adminOrderDealerId}
                        onChange={e => setAdminOrderDealerId(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden"
                      >
                        <option value="">-- Bayi Seçin --</option>
                        {dealers.filter(d => d.status === 'active').map(d => (
                          <option key={d.id} value={d.id}>{d.name} ({d.city}/{d.district})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Gönderilecek Ürün *</label>
                      <select
                        required
                        value={adminOrderProductId}
                        onChange={e => setAdminOrderProductId(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden"
                      >
                        <option value="">-- Ürün Seçin --</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.name} - {p.price} TL (Stok: {p.stock})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Müşteri / Alıcı Ad Soyad *</label>
                      <input
                        type="text"
                        required
                        placeholder="Örn: Ahmet Yılmaz"
                        value={adminCustName}
                        onChange={e => setAdminCustName(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Alıcı Telefonu *</label>
                      <input
                        type="text"
                        required
                        placeholder="Örn: 0555..."
                        value={adminCustPhone}
                        onChange={e => setAdminCustPhone(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1 font-semibold text-purple-700">Sipariş Adedi *</label>
                      <input
                        type="number"
                        required
                        min="1"
                        max="100"
                        value={adminOrderQuantity}
                        onChange={e => setAdminOrderQuantity(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-white border-purple-200 focus:border-purple-500 rounded-xl text-xs text-slate-900 focus:outline-hidden font-bold"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 flex flex-col justify-between">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1 font-semibold text-purple-700">Müşteri Açık Adresi *</label>
                    <textarea
                      rows={3}
                      required
                      placeholder="Sokak, no, mahalle detayları..."
                      value={adminCustAddress}
                      onChange={e => setAdminCustAddress(e.target.value)}
                      className="w-full px-3.5 py-2 bg-white border-purple-200 rounded-xl text-xs text-slate-900 focus:outline-hidden resize-none"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAdminNewOrderFormOpen(false)}
                      className="flex-1 bg-white hover:bg-slate-100 text-slate-700 font-bold border border-slate-200 py-2.5 rounded-xl text-xs cursor-pointer"
                    >
                      Vazgeç
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 rounded-xl text-xs cursor-pointer shadow-md"
                    >
                      Siparişi Bayiye Gönder
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* Orders log database with rich visualizers */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-2xs">
            <div className="flex justify-between items-center flex-wrap gap-4">
              <div className="space-y-1">
                <h3 className="font-display font-bold text-xs text-slate-900 tracking-tight uppercase flex items-center gap-1.5">
                  <FileText className="w-4.5 h-4.5 text-purple-600" />
                  Merkezi Sipariş Havuzu & Operasyon İşlemleri ({orders.filter(o => !o.adminHidden).length} Sipariş)
                </h3>
                <p className="text-[10px] text-slate-400 font-medium">
                  * Sipariş geçmişinden gizlenen kayıtların bayi hakedişleri korunur; komisyon yalnızca komisyon yönetiminden kaldırılır.
                </p>
              </div>

              <button
                onClick={() => {
                  setAdminOrderDealerId(dealers.filter(d => d.status === 'active')[0]?.id || '');
                  setAdminOrderProductId(products[0]?.id || '');
                  setIsAdminNewOrderFormOpen(true);
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Yeni Sipariş Talebi Gönder (Doğrudan Bayiye)
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs" id="admin-orders-control-table">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
                    <th className="p-3">Sipariş No</th>
                    <th className="p-3">İşlem Tarihi</th>
                    <th className="p-3">Müşteri & Alıcı</th>
                    <th className="p-3">Kargo & Sevk Detayları</th>
                    <th className="p-3">Atanan Esnaf Bayi</th>
                    <th className="p-3">Toplam Tutar</th>
                    <th className="p-3">Bayi Komisyonu</th>
                    <th className="p-3">Yönetici Komisyonu</th>
                    <th className="p-3 text-center">Durum</th>
                    <th className="p-3 text-right">Düzenleme</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                  {orders.filter(o => !o.adminHidden).length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-6 text-center text-slate-400 text-xs">Henüz sistemde sipariş kaydı oluşmamıştır.</td>
                    </tr>
                  ) : (
                    [...orders].reverse().filter(order => !order.adminHidden).map(order => (
                      <tr id={`admin-order-row-${order.id}`} key={order.id} onClick={() => setSelectedOrderDetail(order)} className={`hover:bg-slate-50/50 cursor-pointer ${!order.adminApproved ? 'bg-amber-50/20' : ''}`} title="Detaylı görüntülemek için tıklayın">
                        <td className="p-3 font-semibold text-slate-900">
                          <span className="block">{order.id}</span>
                          {order.orderRole === 'master' ? (
                            <span className="inline-block mt-1 text-[9px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded-sm font-bold uppercase">
                              Ana Sipariş
                            </span>
                          ) : order.orderRole === 'sub' ? (
                            <span className="inline-block mt-1 text-[9px] bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded-sm font-bold uppercase">
                              Alt Sipariş · {order.masterOrderId}
                            </span>
                          ) : order.createdBy === 'dealer' ? (
                            <span className="inline-block mt-1 text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-sm font-bold uppercase">
                              Bayi Talebi
                            </span>
                          ) : order.createdBy === 'admin' ? (
                            <span className="inline-block mt-1 text-[9px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded-sm font-bold uppercase">
                              Merkez
                            </span>
                          ) : (
                            <span className="inline-block mt-1 text-[9px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-sm font-bold uppercase">
                              Müşteri
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-slate-400">{new Date(order.date).toLocaleDateString('tr-TR')}</td>
                        <td className="p-3">
                          <span className="font-bold text-slate-800 block">{order.customerName}</span>
                          <span className="text-[9px] text-slate-400 block">Tel: {order.customerPhone}</span>
                          {order.shippingReceiver && order.shippingReceiver !== order.customerName && (
                            <span className="text-[9px] text-purple-600 block">Alıcı: {order.shippingReceiver}</span>
                          )}
                          {order.customerDownloaded ? (
                            <span className="inline-flex items-center gap-1 mt-1 text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-sm font-bold uppercase" title="Müşteri alışveriş sonrası sipariş detaylarını indirmiştir">
                              📥 Müşteri İndirdi
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 mt-1 text-[9px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-sm font-bold uppercase" title="Müşteri henüz sipariş detaylarını indirmemiştir">
                              ⏳ İndirilmedi
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="space-y-1">
                            <span className="text-[10px] bg-slate-100 text-slate-700 font-bold px-1.5 py-0.5 rounded flex items-center gap-1 w-fit">
                              <Truck className="w-3 h-3 text-purple-600" />
                              {order.shippingCompany || 'Yurtiçi Kargo'}
                            </span>
                            {order.shippingTrackingNumber ? (
                              <span className="text-[9px] font-mono text-slate-500 block">
                                Takip: <span className="font-semibold select-all text-purple-700">{order.shippingTrackingNumber}</span>
                              </span>
                            ) : (
                              <span className="text-[9px] text-amber-500 font-semibold block">Takip No Yok</span>
                            )}
                            <span className={`px-1.5 py-0.2 rounded-sm text-[9px] font-bold uppercase w-fit block ${
                              order.shippingStatus === 'delivered'
                                ? 'bg-emerald-50 text-emerald-700'
                                : order.shippingStatus === 'shipped'
                                ? 'bg-blue-50 text-blue-700'
                                : order.shippingStatus === 'cancelled'
                                ? 'bg-rose-50 text-rose-700'
                                : 'bg-amber-50 text-amber-700'
                            }`}>
                              {order.shippingStatus === 'delivered' ? 'Teslim Edildi' : order.shippingStatus === 'shipped' ? 'Yolda / Sevk Edildi' : order.shippingStatus === 'cancelled' ? 'İptal / İade' : 'Hazırlanıyor'}
                            </span>
                            {order.shippingAddress && (
                              <span className="text-[9px] text-slate-400 block max-w-[160px] truncate" title={`${order.shippingCity}/${order.shippingDistrict}: ${order.shippingAddress}`}>
                                📍 {order.shippingCity} / {order.shippingDistrict}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="font-semibold text-slate-700 block">{order.dealerName}</span>
                          <span className="text-[9px] text-slate-400">ID: {order.dealerId}</span>
                        </td>
                        <td className="p-3 font-mono font-semibold text-slate-900">{order.totalPrice.toFixed(2)} TL</td>
                        <td className="p-3 font-mono font-bold text-emerald-600">
                          {order.status === 'cancelled' ? (
                            <span className="text-rose-500 line-through">0.00 TL</span>
                          ) : (
                            <div className="flex flex-col items-start font-mono">
                              <span>+{Number(order.commissionAmount ?? 0).toFixed(2)} TL</span>
                              {order.isFromDealerPage && (
                                <span className="text-[8px] bg-amber-50 text-amber-700 px-1 py-0.2 rounded-sm font-bold uppercase mt-0.5 whitespace-nowrap font-sans">Vitrin Hakedişi</span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="p-3 font-mono font-bold text-indigo-600">
                          {order.status === 'cancelled' ? (
                            <span className="text-rose-500 line-through">0.00 TL</span>
                          ) : order.isFromDealerPage ? (
                            <span className="text-indigo-600 font-bold text-xs flex flex-col items-start font-mono">
                              <span>+{(order.adminCommissionAmount ?? 0).toFixed(2)} TL</span>
                              <span className="text-[8px] bg-emerald-50 text-emerald-700 px-1 py-0.2 rounded-sm font-bold uppercase mt-0.5 whitespace-nowrap font-sans">Vitrin Kesintisi</span>
                            </span>
                          ) : (
                            `+${(order.adminCommissionAmount ?? 0).toFixed(2)} TL`
                          )}
                        </td>
                        <td className="p-3 text-center space-y-1.5">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase block w-fit mx-auto ${
                            order.status === 'completed'
                              ? 'bg-emerald-50 text-emerald-700'
                              : order.status === 'pending'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}>
                            {order.status === 'completed' ? 'Tamamlandı' : order.status === 'pending' ? 'Bekliyor' : 'İptal Edildi'}
                          </span>

                          {!order.adminApproved ? (
                            <span className="px-1.5 py-0.5 rounded-sm text-[8px] font-extrabold uppercase bg-amber-100 text-amber-800 border border-amber-200 block w-fit mx-auto animate-pulse">
                              Onay Bekliyor
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded-sm text-[8px] font-bold uppercase bg-emerald-100 text-emerald-800 block w-fit mx-auto">
                              Onaylandı
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right space-y-1.5 shrink-0">
                          <div className="flex flex-col items-end gap-1.5">
                            {!order.adminApproved && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleApproveOrder(order.id); }}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[9px] px-2 py-1 rounded-md transition-all flex items-center justify-center gap-1 cursor-pointer shadow-sm shadow-emerald-600/10"
                                title="Siparişi Onayla & Bayiye Sevk Et"
                              >
                                <Check className="w-3 h-3" /> <span>Onayla</span>
                              </button>
                            )}
                            <div className="flex gap-1 justify-end">
                              <button
                                onClick={(e) => { e.stopPropagation(); setSelectedOrderDetail(order); }}
                                className="p-1 hover:bg-slate-100 text-slate-500 hover:text-blue-600 rounded-lg inline-flex items-center cursor-pointer"
                                title="Sipariş Detaylarını Görüntüle"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); openOrderEdit(order); }}
                                className="p-1 hover:bg-slate-100 text-slate-500 hover:text-purple-600 rounded-lg inline-flex items-center cursor-pointer"
                                title="Siparişi / Bilgileri Düzenle"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              {onSetOrderCommissionStatus && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSetOrderCommissionStatus(order.id, !order.commissionVoided);
                                  }}
                                  className={`p-1 rounded-lg inline-flex items-center cursor-pointer ${order.commissionVoided ? 'text-emerald-600 hover:bg-emerald-50' : 'text-amber-500 hover:bg-amber-50'}`}
                                  title={order.commissionVoided ? 'Bayi komisyonunu yeniden aktifleştir' : 'Bayi komisyonunu yönetici olarak kaldır'}
                                >
                                  <Coins className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                onClick={(e) => { e.stopPropagation(); handleOrderDelete(order.id); }}
                                className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg inline-flex items-center cursor-pointer"
                                title="Siparişi geçmişten gizle; komisyonu koru"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
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

      {/* --- DOĞRUDAN KOMİSYON ÖDEME MODAL OVERLAY --- */}
      {isDirectPayModalOpen && directPayDealer && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-display font-bold text-slate-900 text-sm uppercase flex items-center gap-1.5">
                <Coins className="w-5 h-5 text-amber-500" />
                Doğrudan Komisyon Ödeme Paneli
              </h3>
              <button
                onClick={() => {
                  setIsDirectPayModalOpen(false);
                  setDirectPayDealer(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 text-blue-800 leading-relaxed">
                Bu panel üzerinden esnaftan bir çekim talebi gelmesini beklemeden, birikmiş komisyon hakedişini <strong>Merkez POS Havuzundan</strong> doğrudan bayinin banka hesabına gönderebilirsiniz.
              </div>

              <div className="space-y-2">
                <div className="flex justify-between py-1.5 border-b border-slate-50">
                  <span className="text-slate-500">Bayi Adı:</span>
                  <span className="font-bold text-slate-800">{directPayDealer.name}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-50">
                  <span className="text-slate-500">Esnaf Sahibi:</span>
                  <span className="font-bold text-slate-800">{directPayDealer.owner}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-50">
                  <span className="text-slate-500">Birimci Komisyon:</span>
                  <span className="font-extrabold text-amber-600 font-mono">{directPayAvailableAmount.toFixed(2)} TL</span>
                </div>
              </div>

              <div className="bg-amber-50/50 rounded-xl p-3 border border-amber-200/50 space-y-2">
                <h4 className="font-bold text-slate-700 flex items-center gap-1">Hesap / Banka Bilgileri</h4>
                <div className="space-y-1 text-[11px] text-slate-600">
                  <p><strong>Banka:</strong> {directPayDealer.bankName || 'Halkbank'}</p>
                  <p><strong>Alıcı:</strong> {directPayDealer.accountHolder || directPayDealer.owner}</p>
                  <p className="font-mono text-slate-700 break-all bg-white border border-slate-100 rounded p-1 mt-1 text-[10px]">
                    {directPayDealer.iban || 'TR... (Belirtilmemiş)'}
                  </p>
                </div>
              </div>

              <div className="space-y-1 pt-2">
                <label className="block text-[11px] font-bold text-slate-600">Gönderilecek Ödeme Tutarı (TL) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  max={directPayAvailableAmount}
                  step="0.01"
                  value={directPayAmount || ''}
                  onChange={(e) => setDirectPayAmount(e.target.value === '' ? 0 : Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:border-blue-500 focus:bg-white"
                />
                <span className="text-[10px] text-slate-400 block font-semibold">
                  * Maksimum {directPayAvailableAmount.toFixed(2)} TL transfer edilebilir.
                </span>
              </div>
            </div>

            <div className="flex gap-2 pt-3 border-t border-slate-100 text-xs">
              <button
                type="button"
                onClick={() => {
                  setIsDirectPayModalOpen(false);
                  setDirectPayDealer(null);
                }}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={async () => {
                  const amount = Number(directPayAmount);
                  if (!Number.isFinite(amount) || amount <= 0 || amount > directPayAvailableAmount) {
                    alert(`Lütfen 0 ile ${directPayAvailableAmount.toFixed(2)} TL arasında geçerli bir ödeme tutarı giriniz.`);
                    return;
                  }
                  try {
                    await onPayCommissionDirectly(directPayDealer.id, Number(amount.toFixed(2)));
                    setIsDirectPayModalOpen(false);
                    setDirectPayDealer(null);
                    setDirectPayAmount(0);
                  } catch (error) {
                    alert(error instanceof Error ? error.message : 'Komisyon ödemesi kaydedilemedi.');
                  }
                }}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-1 cursor-pointer shadow-md"
              >
                <Check className="w-4 h-4" /> <span>Havuzdan Öde</span>
              </button>
            </div>
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
