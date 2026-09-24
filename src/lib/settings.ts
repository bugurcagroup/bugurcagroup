import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { firestore } from './firebase';
import type { StoreSettings } from '../types';

const SETTINGS_DOC = doc(firestore, 'settings', 'general');

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  theme: 'honey_yellow',
  storeName: 'Buğurca Kırtasiye',
  storeSlogan: 'Yerli Kırtasiye Esnafını Koruyan Hibrit E-Ticaret Modeli',
  commissionRate: 0,
  defaultPrivateCommissionRate: 5,
  adminPoolBalance: 0,
  logoUrl: 'https://cdn.builder.io/api/v1/image/assets%2F690dc81201dd442691c0fbf0269adbab%2Ff68680587b154e779a76b8693182a79c?format=webp&width=800&height=1200',
  bannerUrl: '',
  announcementText: '',
  isAnnouncementActive: false,
  brandMarqueeEnabled: true,
  brandMarqueeTitle: 'Güvendiğimiz Markalar',
  brandMarqueeImages: ['https://cdn.builder.io/api/v1/image/assets%2F690dc81201dd442691c0fbf0269adbab%2Fbaa373b7ef684edb945da36057e08b93?format=webp&width=800&height=1200'],
  footerEnabled: true,
  footerTitle: 'Esnafın dijital adresi',
  footerDescription: 'Yerel kırtasiye esnafını ve müşterileri güvenli bir alışveriş deneyiminde buluşturuyoruz.',
  footerShowAbout: true,
  footerShowContact: true,
  footerShowShortcuts: true,
  footerMapEnabled: true,
  footerLocationEyebrow: 'Bizi ziyaret edin',
  footerLocationTitle: 'Konumumuz',
  footerDirectionsLabel: 'Yol Tarifi Al',
  footerMapLabel: 'Konumu Aç',
  footerShortcuts: [
    { id: 'products', label: 'Ürünlere Git', href: '#products-grid' },
    { id: 'contact', label: 'İletişim', href: '#contact-info-section' },
    { id: 'about', label: 'Biz Kimiz?', href: '#about-details' },
    { id: 'history', label: 'Tarihçemiz', href: '#history-details' },
    { id: 'news', label: 'Duyurular', href: '#news-details' },
    { id: 'footer', label: 'Sayfanın Sonu', href: '#store-footer' },
  ],
  footerAboutLinks: [
    { id: 'about', label: 'Biz Kimiz?', href: '#about-details' },
    { id: 'news', label: 'Haberler & Duyurular', href: '#news-details' },
    { id: 'featured', label: 'Öne Çıkanlar', href: '#featured-collections-section' },
  ],
  footerLocations: [
    { id: 'main-office', label: 'Dünya İş Merkezi', address: 'Yusup Paşa Mahallesi, Dünya İş Merkezi Giriş, Eyyübiye / Şanlıurfa', coordinates: '37.1553535,38.7917175' },
  ],
  newsList: [],
  enableProductModal: true,
  enableProductZoom: true,
  zoomScale: 2,
  showcaseScrollSpeed: 80,
  showcaseProductIds: [],
  featuredProductIds: [],
  telegramNotificationsEnabled: false,
  telegramOrderNotifications: true,
  telegramActivityNotifications: false,
  telegramChatId: '',
};

export const getStoreSettings = async (): Promise<StoreSettings> => {
  const snapshot = await getDoc(SETTINGS_DOC);
  if (!snapshot.exists()) return DEFAULT_STORE_SETTINGS;
  const storedSettings = snapshot.data() as Partial<StoreSettings>;
  return { ...DEFAULT_STORE_SETTINGS, ...storedSettings, logoUrl: storedSettings.logoUrl || DEFAULT_STORE_SETTINGS.logoUrl };
};

export const subscribeToStoreSettings = (onChange: (settings: StoreSettings) => void, onError: (error: Error) => void) => onSnapshot(
  SETTINGS_DOC,
  snapshot => {
    if (!snapshot.exists()) {
      onChange(DEFAULT_STORE_SETTINGS);
      return;
    }
    const storedSettings = snapshot.data() as Partial<StoreSettings>;
    onChange({ ...DEFAULT_STORE_SETTINGS, ...storedSettings, logoUrl: storedSettings.logoUrl || DEFAULT_STORE_SETTINGS.logoUrl });
  },
  error => onError(error),
);

export const updateStoreSettings = async (settings: Partial<StoreSettings>): Promise<void> => {
  await setDoc(SETTINGS_DOC, settings, { merge: true });
};
