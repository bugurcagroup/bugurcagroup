/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, MapPin, ShoppingBag, Info, ShoppingCart, Trash2, Plus, Minus, CreditCard, ChevronRight, CheckCircle2, AlertTriangle, HelpCircle, Store, X, Mail, Phone, Clock, Newspaper, TrendingUp, Award, BookOpen, Package, Eye, FileText, Globe2, ExternalLink, LogIn, UserPlus } from 'lucide-react';
import { Product, Dealer, CartItem, StoreSettings, Order, Member, LegalAcceptance, InvoiceDetails, SaleUnit } from '../types';

const createCheckoutOrderReference = () => {
  const uniquePart = globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2, 12);
  return `sip-${Date.now().toString(36)}-${uniquePart}`;
};
import { getProductUnitLabel, getProductUnitPrice, getProductUnitQuantity } from '../lib/productUnits';
import OrderDetailsModal from './OrderDetailsModal';
import { uploadFile } from '../lib/storage';
import { copyTextToClipboard } from '../lib/browser';

interface CustomerStoreProps {
  products: Product[];
  categories?: string[];
  dealers: Dealer[];
  orders: Order[];
  selectedDealer: Dealer | null;
  onSelectDealer: (dealer: Dealer | null) => void;
  onOpenDealerSelector: (sector?: string) => void;
  cartItems: CartItem[];
  onAddToCart: (product: Product, saleUnit?: SaleUnit) => void;
  onRemoveFromCart: (productId: string) => void;
  onUpdateCartQuantity: (productId: string, quantity: number) => void;
  onUpdateCartUnit: (productId: string, saleUnit: SaleUnit) => void;
  onClearCart: () => void;
  onCheckout: (
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
    paymentMethod?: 'card' | 'bank_transfer',
    orderReference?: string,
    legalAcceptances?: LegalAcceptance[],
    invoiceDetails?: InvoiceDetails,
    testMode?: boolean
  ) => Promise<string> | string;
  onApplyDealer: (dealer: Omit<Dealer, 'id' | 'salesVolume' | 'commissionEarned' | 'createdAt'>, password: string) => void | Promise<void>;
  isCartOpen: boolean;
  onCloseCart: () => void;
  onTabChange: (tab: string) => void;
  storeName?: string;
  storeSlogan?: string;
  commissionRate?: number;
  storeSettings: StoreSettings;
  isReferralLocked?: boolean;
  onMarkOrderDownloaded?: (orderId: string) => void;
  isApplicationModalOpen?: boolean;
  onCloseApplicationModal?: () => void;
  currentMember: Member | null;
  onMemberLogin: (email: string, password: string) => boolean | Promise<boolean>;
  onForgotPassword: (email: string) => void | Promise<void>;
  onMemberRegister: (name: string, email: string, password: string, phone?: string, legalAcceptances?: LegalAcceptance[]) => Promise<boolean>;
  onMemberLogout: () => void;
  memberAccessRequest?: { mode: 'login' | 'register'; id: number } | null;
}

const DEFAULT_BRAND_MARQUEE_IMAGE = 'https://cdn.builder.io/api/v1/image/assets%2F690dc81201dd442691c0fbf0269adbab%2Fbaa373b7ef684edb945da36057e08b93?format=webp&width=800&height=1200';

export const LEGAL_DOCUMENT_VERSION = 'v1.0';

export const LEGAL_DOCUMENTS = {
  membership: {
    title: 'Üyelik Sözleşmesi',
    sections: [
      ['Kullanım Koşulları ve Sorumluluk Reddi', 'Üye, uygulamaya girdiği andan itibaren tüm sorumluluğun kendisine ait olduğunu; hesap güvenliğinden, şifre paylaşımından ve kendi hesabından yapılan tüm işlemlerden bizzat sorumlu olduğunu kabul eder.'],
      ['Hizmet Sürekliliği', 'İş yeri, uygulamanın kesintisiz, hatasız veya virüssüz olacağını garanti etmez; uygulamayı kullanım sırasında doğabilecek hiçbir doğrudan veya dolaylı zarardan sorumlu tutulamaz.'],
      ['Bilgi Doğruluğu', 'Üye, paylaştığı bilgilerin doğruluğundan sorumludur; yanlış bilgiden kaynaklı kargo veya teslimat hatalarında iş yerinin hiçbir sorumluluğu bulunmamaktadır.']
    ]
  },
  kvkk: {
    title: 'KVKK Aydınlatma Metni',
    sections: [
      ['Veri İşleme ve Paylaşım', 'Üye, üyelik kaydı sırasında paylaştığı kişisel verilerin siparişlerin yönetilmesi ve lojistik süreçlerin tamamlanması için iş ortaklarımızla paylaşılacağını kabul eder.'],
      ['Veri Doğruluğu', 'Üye, kendi verilerini sisteme girerken doğru girmekle yükümlüdür; veri giriş hatalarından kaynaklı doğabilecek tüm olumsuzluklarda sorumluluk tamamen üyeye aittir.'],
      ['Veri Sahibinin Hakları (KVKK Madde 11)', 'KVKK Madde 11 uyarınca üye; kişisel verilerinin işlenip işlenmediğini öğrenme, işlenmişse buna ilişkin bilgi talep etme, işlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme, yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme, eksik veya yanlış işlenmişse düzeltilmesini isteme haklarına sahiptir.'],
      ['Başvuru Yolu', 'KVKK Madde 11 kapsamındaki taleplerinizi bugurcagroup@gmail.com e-posta adresine iletebilirsiniz; başvurular en geç 30 gün içinde sonuçlandırılır.']
    ]
  },
  'distance-sales': {
    title: 'Mesafeli Satış Sözleşmesi',
    sections: [
      ['Teslimat', 'Üye, sipariş oluştururken adres bilgilerini eksiksiz ve doğru girmekle yükümlüdür. Yanlış adres, alıcının adreste bulunamaması veya kargo firmasının teslimat süreçlerindeki gecikmelerden iş yeri sorumlu tutulamaz.'],
      ['Kargo Hasarı', 'Ürün teslim alınırken kargo paketinin hasarlı olması durumunda, üye Hasar Tespit Tutanağı tutturmakla yükümlüdür. Tutanak tutturulmayan hasarlı ürünlerde tüm sorumluluk üyeye aittir.'],
      ['İade Koşulları', 'Üye, cayma hakkını kullanırken ürünün kullanılmamış, etiketi koparılmamış ve orijinal ambalajında olması şartını kabul eder. İade kargo gönderiminde oluşabilecek tüm masraflar ve ürünün kargoda kaybolması veya zarar görmesi riski bizzat üyeye aittir.'],
      ['Sorumluluk Sınırı', 'İş yeri, ürünün niteliğinden veya kargolama süreçlerinden kaynaklı gecikmelerde, mevzuatın zorunlu kıldığı sınırlar dışında hiçbir tazminat veya sorumluluk kabul etmez.']
    ]
  },
  'pre-information': {
    title: 'Ön Bilgilendirme Formu',
    sections: [
      ['Sipariş Öncesi Bilgilendirme', 'Sipariş toplamı, seçilen bayi, teslimat bilgileri, ödeme yöntemi ve kargo bilgileri sipariş onayından önce üyeye sunulur. Üye, bu bilgileri kontrol ederek siparişini onaylar.'],
      ['Teslimat ve İade', 'Teslimat, kargo hasarı ve iade koşulları Mesafeli Satış Sözleşmesi kapsamında uygulanır. Üye, siparişi onaylamadan önce ilgili sözleşmeye kalıcı olarak erişebilir.']
    ]
  },
  'iptal-iade': {
    title: 'İptal ve İade Koşulları',
    sections: [
      ['İade Süresi', 'Ürün teslim tarihinden itibaren 14 gün içinde, yazılı olarak bildirmek koşuluyla cayma hakkınızı kullanabilirsiniz.'],
      ['İade Koşulları', 'İade edilecek ürünler; kullanılmamış, etiketi ve ambalajı zarar görmemiş, faturasıyla birlikte eksiksiz teslim edilmelidir. Kullanılmış ürünler iade kapsamında değildir.'],
      ['Kargo Ücreti', 'Cayma hakkından kaynaklanan iade kargosu, ücretsiz iade anlaşmamız nedeniyle firmamız tarafından karşılanır.'],
      ['İade Bedeli', 'İadeniz tarafımıza ulaştıktan sonra ürün bedeli, ödeme yönteminize uygun şekilde en geç 14 gün içinde iade edilir.']
    ]
  },
  'kargo-teslimat': {
    title: 'Kargo ve Teslimat Koşulları',
    sections: [
      ['Teslimat Süresi', 'Siparişleriniz, siparişin onaylanmasını takiben 1-3 iş günü içinde kargoya teslim edilir; teslim süresi kargo firmasının çalışma koşullarına göre değişebilir.'],
      ['Hasarlı Teslimat', 'Alıcı, paketi teslim alırken hasarlı veya ezilmişse kargo firmasına Hasar Tespit Tutanağı düzenlettirmelidir; tutanaksız teslim alınan paketlerden işletmemiz sorumlu değildir.'],
      ['Teslimat Adresi', 'Sipariş sırasında belirttiğiniz adres esas alınır; eksik veya hatalı adres bildiriminden kaynaklanan gecikmelerden işletmemiz sorumlu değildir.']
    ]
  }
} as const;

interface StoreProductCardProps {
  product: Product;
  selectedDealer: Dealer | null;
  isInCart: CartItem | undefined;
  onAddToCart: (product: Product, saleUnit?: SaleUnit) => void;
  onProductClick?: (product: Product) => void;
  key?: React.Key;
}

function StoreProductCard({ product, selectedDealer, isInCart, onAddToCart, onProductClick }: StoreProductCardProps) {
  const images = product.images && product.images.length > 0 ? product.images : [product.image];
  const [activeImgIndex, setActiveImgIndex] = useState(0);
  const [selectedUnit, setSelectedUnit] = useState<SaleUnit>('piece');
  const unitOptions: SaleUnit[] = [
    'piece',
    ...(product.dozenQuantity || product.dozenPrice ? ['dozen' as SaleUnit] : []),
    ...(product.boxQuantity || product.boxPrice ? ['box' as SaleUnit] : []),
  ];

  return (
    <div
      id={`product-card-${product.id}`}
      onClick={() => onProductClick && onProductClick(product)}
      className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between hover:shadow-md hover:border-slate-300 transition-all overflow-hidden relative group cursor-pointer"
    >
      {/* Brand badge */}
      <div className="flex justify-between items-start mb-3">
        <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
          {product.brand}
        </span>
        <span className="text-[10px] font-semibold text-slate-400">
          Stok: {product.stock}
        </span>
      </div>

      {/* Image with hover indicator/preview thumbnails if multiple exists */}
      <div className="h-40 w-full mb-4 rounded-xl overflow-hidden bg-slate-50 relative flex flex-col items-center justify-center">
        <img
          src={images[activeImgIndex] || product.image}
          alt={product.name}
          referrerPolicy="no-referrer"
          className="max-h-[80%] max-w-[90%] object-contain transition-transform duration-500 group-hover:scale-105"
        />

        {/* Gallery Dot Indicators */}
        {images.length > 1 && (
          <div className="absolute bottom-1.5 left-0 right-0 flex justify-center gap-1 overflow-x-auto max-w-full px-2 py-0.5">
            {images.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveImgIndex(idx);
                }}
                className={`w-1.5 h-1.5 rounded-full transition-all shrink-0 cursor-pointer ${
                  idx === activeImgIndex ? 'bg-amber-500 scale-125' : 'bg-slate-300 hover:bg-slate-400'
                }`}
                title={`Görsel ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Metadata */}
      <div className="space-y-1.5 flex-1 flex flex-col justify-between mb-4">
        <div>
          <h4 className="font-display font-bold text-sm text-slate-900 group-hover:text-amber-600 transition-colors line-clamp-1">
            {product.name}
          </h4>
          <p className="text-xs text-slate-400 line-clamp-2 mt-1 h-8">
            {product.description}
          </p>
        </div>
        <div className="pt-2 space-y-2">
          <div className="grid grid-cols-3 gap-1 text-[9px] font-semibold text-slate-500">
            <span className="bg-slate-50 border border-slate-100 rounded-md px-1 py-1 text-center">Adet<br /><strong className="text-slate-900">{getProductUnitPrice(product, 'piece').toFixed(2)} TL</strong></span>
            {product.dozenQuantity || product.dozenPrice ? <span className="bg-blue-50 border border-blue-100 rounded-md px-1 py-1 text-center">Düzine ({getProductUnitQuantity(product, 'dozen')} adet)<br /><strong className="text-blue-900">{getProductUnitPrice(product, 'dozen').toFixed(2)} TL</strong></span> : <span />}
            {product.boxQuantity || product.boxPrice ? <span className="bg-amber-50 border border-amber-100 rounded-md px-1 py-1 text-center">Koli ({getProductUnitQuantity(product, 'box')} adet)<br /><strong className="text-amber-900">{getProductUnitPrice(product, 'box').toFixed(2)} TL</strong></span> : <span />}
          </div>
          <div className="flex justify-between items-center">
            <span className="text-base font-bold text-slate-950 font-mono">
              {getProductUnitPrice(product, selectedUnit).toFixed(2)} TL / {getProductUnitLabel(selectedUnit)}
            </span>
          {/* Quick thumbnail strip for easy select on hover/click */}
          {images.length > 1 && (
            <div className="flex gap-0.5 border border-slate-100 rounded p-0.5 bg-slate-50 max-w-[50%] overflow-x-auto">
              {images.slice(0, 4).map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  alt="thumbnail"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveImgIndex(idx);
                  }}
                  className={`w-5 h-5 object-contain rounded border cursor-pointer transition-all ${
                    idx === activeImgIndex ? 'border-amber-500 bg-white' : 'border-slate-200 opacity-60 hover:opacity-100'
                  }`}
                />
              ))}
              {images.length > 4 && (
                <span className="text-[8px] text-slate-400 font-bold self-center px-0.5">+{images.length - 4}</span>
              )}
            </div>
          )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <label className="text-[10px] font-bold text-slate-500">Birim:</label>
        <select
          value={selectedUnit}
          onChange={event => setSelectedUnit(event.target.value as SaleUnit)}
          onClick={event => event.stopPropagation()}
          className="flex-1 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-[10px] text-slate-700"
          aria-label={`${product.name} satış birimi`}
        >
          {unitOptions.map(unit => <option key={unit} value={unit}>{getProductUnitLabel(unit)} — {getProductUnitPrice(product, unit).toFixed(2)} TL</option>)}
        </select>
      </div>

      {/* Add Button */}
      <button
        id={`add-to-cart-btn-${product.id}`}
        onClick={(e) => {
          e.stopPropagation();
          onAddToCart(product, selectedUnit);
        }}
        className={`w-full py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
          selectedDealer
            ? 'bg-amber-500 text-slate-950 hover:bg-amber-600'
            : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
        }`}
      >
        <ShoppingCart className="w-3.5 h-3.5" />
        {selectedDealer ? (
          isInCart ? `Sepette Var (${isInCart.quantity})` : 'Sepete Ekle'
        ) : (
          'Bayi Seç ve Sepete Ekle'
        )}
      </button>
    </div>
  );
}

const TURKISH_CITIES = [
  'Adana', 'Adıyaman', 'Afyonkarahisar', 'Ağrı', 'Aksaray', 'Amasya', 'Ankara', 'Antalya', 'Ardahan', 'Artvin', 'Aydın',
  'Balıkesir', 'Bartın', 'Batman', 'Bayburt', 'Bilecik', ' Bingöl', 'Bitlis', 'Bolu', 'Burdur', 'Bursa',
  'Çanakkale', 'Çankırı', 'Çorum', 'Denizli', 'Diyarbakır', 'Düzce', 'Edirne', 'Elazığ', 'Erzincan', 'Erzurum',
  'Eskişehir', 'Gaziantep', 'Giresun', 'Gümüşhane', 'Hakkari', 'Hatay', 'Iğdır', 'Isparta', 'İstanbul', 'İzmir',
  'Kahramanmaraş', 'Karabük', 'Karaman', 'Kars', 'Kastamonu', 'Kayseri', 'Kırıkkale', 'Kırklareli', 'Kırşehir', 'Kilis',
  'Kocaeli', 'Konya', 'Kütahya', 'Malatya', 'Manisa', 'Mardin', 'Mersin', 'Muğla', 'Muş', 'Nevşehir',
  'Niğde', 'Ordu', 'Osmaniye', 'Rize', 'Sakarya', 'Samsun', 'Siirt', 'Sinop', 'Sivas', 'Şanlıurfa',
  'Şırnak', 'Tekirdağ', 'Tokat', 'Trabzon', 'Tunceli', 'Uşak', 'Van', 'Yalova', 'Yozgat', 'Zonguldak'
].map(city => city.trim());

const weatherDescription = (code: number) => {
  if (code === 0) return { label: 'Açık', icon: '☀️' };
  if ([1, 2].includes(code)) return { label: 'Parçalı Bulutlu', icon: '⛅' };
  if (code === 3) return { label: 'Kapalı', icon: '☁️' };
  if ([45, 48].includes(code)) return { label: 'Sisli', icon: '🌫️' };
  if ([51, 53, 55, 56, 57].includes(code)) return { label: 'Çiseleme', icon: '🌦️' };
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { label: 'Yağmurlu', icon: '🌧️' };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { label: 'Karlı', icon: '🌨️' };
  if ([95, 96, 99].includes(code)) return { label: 'Gök Gürültülü', icon: '⛈️' };
  return { label: 'Değişken', icon: '🌤️' };
};

export default function CustomerStore({
  products,
  categories: sharedCategories = [],
  dealers,
  orders,
  selectedDealer,
  onSelectDealer,
  onOpenDealerSelector,
  cartItems,
  onAddToCart,
  onRemoveFromCart,
  onUpdateCartQuantity,
  onUpdateCartUnit,
  onClearCart,
  onCheckout,
  onApplyDealer,
  isCartOpen,
  onCloseCart,
  onTabChange,
  storeName = 'Buğurca Kırtasiye',
  storeSlogan = 'Yerli Kırtasiye Esnafını Koruyan Hibrit E-Ticaret Modeli',
  commissionRate = 0,
  storeSettings,
  isReferralLocked = false,
  onMarkOrderDownloaded,
  isApplicationModalOpen: propIsApplicationModalOpen,
  onCloseApplicationModal: propOnCloseApplicationModal,
  currentMember,
  onMemberLogin,
  onForgotPassword,
  onMemberRegister,
  onMemberLogout,
  memberAccessRequest,
}: CustomerStoreProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedPreviewSector, setSelectedPreviewSector] = useState<string | null>(null);
  const [isViewingPrivatePage, setIsViewingPrivatePage] = useState<boolean>(false);
  const [customerSelectedSector, setCustomerSelectedSector] = useState<string>('Kırtasiye');
  const [safeOrigin, setSafeOrigin] = useState('https://bugurca.com');
  const [privateStoreTab, setPrivateStoreTab] = useState<'special' | 'central'>('special');
  const [footerOpenDetails, setFooterOpenDetails] = useState<'contact' | 'about' | 'history' | 'news' | null>(null);
  const brandMarqueeImages = storeSettings.brandMarqueeImages?.length
    ? storeSettings.brandMarqueeImages
    : [DEFAULT_BRAND_MARQUEE_IMAGE];
  const footerShortcuts = storeSettings?.footerShortcuts?.length ? storeSettings.footerShortcuts : [
    { id: 'products', label: 'Ürünlere Git', href: '#products-grid' },
    { id: 'contact', label: 'İletişim', href: '#contact-info-section' },
    { id: 'about', label: 'Biz Kimiz?', href: '#about-details' },
    { id: 'history', label: 'Tarihçemiz', href: '#history-details' },
    { id: 'news', label: 'Duyurular', href: '#news-details' },
    { id: 'footer', label: 'Sayfanın Sonu', href: '#store-footer' }
  ];
  const footerAboutLinks = storeSettings?.footerAboutLinks?.length ? storeSettings.footerAboutLinks : [
    { id: 'about', label: 'Biz Kimiz?', href: '#about-details' },
    { id: 'news', label: 'Haberler & Duyurular', href: '#news-details' },
    { id: 'featured', label: 'Öne Çıkanlar', href: '#featured-collections-section' }
  ];
  const activeFooterLocation = storeSettings?.footerLocations?.[0];
  const businessAddress = activeFooterLocation?.address || storeSettings?.contactAddress || 'Yusup Paşa Mahallesi, Dünya İş Merkezi Giriş, Eyyübiye / Şanlıurfa';
  const locationCoordinates = activeFooterLocation?.coordinates || '37.1553535,38.7917175';
  const mapDestination = `${activeFooterLocation?.label || storeName}, ${businessAddress}`;
  const locationMapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${mapDestination} ${locationCoordinates}`)}`;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${businessAddress} ${locationCoordinates}`)}&travelmode=driving`;

  // Automatically show private page if a dealer is active
  React.useEffect(() => {
    setIsViewingPrivatePage(false);
    setPrivateStoreTab('central');
    setCustomerSelectedSector(selectedDealer?.sector || 'Kırtasiye');
  }, [selectedDealer]);

  // Safe window.location.origin evaluation
  React.useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.location) {
        setSafeOrigin(window.location.origin || 'https://bugurca.com');
      }
    } catch (err) {
      console.warn('Failed to access window.location.origin safely');
    }
  }, []);
  
  // Checkout Modal State & Fields

  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [checkoutOrderReference, setCheckoutOrderReference] = useState(createCheckoutOrderReference);
  const [isEsnafMarketplaceInfoOpen, setIsEsnafMarketplaceInfoOpen] = useState(false);

  // Müşteri Sipariş Bilgileri
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [invoiceType, setInvoiceType] = useState<InvoiceDetails['type']>('individual');
  const [invoiceFullName, setInvoiceFullName] = useState('');
  const [invoiceNationalId, setInvoiceNationalId] = useState('');
  const [invoiceCompanyName, setInvoiceCompanyName] = useState('');
  const [invoiceTaxNumber, setInvoiceTaxNumber] = useState('');
  const [invoiceTaxOffice, setInvoiceTaxOffice] = useState('');
  const [invoiceAddress, setInvoiceAddress] = useState('');
  const [invoiceCity, setInvoiceCity] = useState('İstanbul');
  const [invoiceDistrict, setInvoiceDistrict] = useState('');
  const [receiptDataUrl, setReceiptDataUrl] = useState('');
  const [receiptFileName, setReceiptFileName] = useState('');
  const [isReceiptUploading, setIsReceiptUploading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'bank_transfer'>('bank_transfer');
  const [accountOpen, setAccountOpen] = useState(false);
  const [accountMode, setAccountMode] = useState<'login' | 'register'>('login');
  const [accountName, setAccountName] = useState('');
  const [accountEmail, setAccountEmail] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [accountPhone, setAccountPhone] = useState('');
  const [isAccountSubmitting, setIsAccountSubmitting] = useState(false);
  const [hasAcceptedMembershipTerms, setHasAcceptedMembershipTerms] = useState(false);
  const [hasAcceptedCheckoutTerms, setHasAcceptedCheckoutTerms] = useState(false);
  const [activeLegalDocument, setActiveLegalDocument] = useState<keyof typeof LEGAL_DOCUMENTS | null>(null);
  const [hasAcceptedCheckoutKvkk, setHasAcceptedCheckoutKvkk] = useState(false);
  const [isOrderSuccess, setIsOrderSuccess] = useState(false);
  const [recentOrderId, setRecentOrderId] = useState('');
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<Order | null>(null);

  // Saat ve Hava Durumu Paneli State'leri
  const [isClockPanelOpen, setIsClockPanelOpen] = useState(false);
  const [isWeatherPanelOpen, setIsWeatherPanelOpen] = useState(false);
  const [isCurrencyPanelOpen, setIsCurrencyPanelOpen] = useState(false);
  const [isNewsPanelOpen, setIsNewsPanelOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedWeatherCity, setSelectedWeatherCity] = useState('İstanbul');
  const [weatherData, setWeatherData] = useState<{ city: string; temperature: number; description: string; icon: string; humidity: number; wind: number; forecast: { day: string; icon: string; temp: number }[] } | null>(null);
  const [isWeatherLoading, setIsWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState('');
  const [currencyRates, setCurrencyRates] = useState<{ code: string; name: string; value: string }[]>([]);
  const [currencyUpdatedAt, setCurrencyUpdatedAt] = useState<Date | null>(null);
  const [currencyError, setCurrencyError] = useState('');
  const [isCurrencyLoading, setIsCurrencyLoading] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const loadWeather = async () => {
      setIsWeatherLoading(true);
      setWeatherError('');
      try {
        const geoResponse = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(selectedWeatherCity)}&count=1&language=tr&format=json`, { signal: controller.signal });
        const geoData = await geoResponse.json();
        const location = geoData.results?.[0];
        if (!location) throw new Error('Şehir bulunamadı');
        const weatherResponse = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&daily=temperature_2m_max,weather_code&forecast_days=3&timezone=Europe%2FIstanbul`, { signal: controller.signal });
        const data = await weatherResponse.json();
        const current = data.current;
        const currentDescription = weatherDescription(current.weather_code);
        setWeatherData({
          city: selectedWeatherCity,
          temperature: Math.round(current.temperature_2m),
          description: currentDescription.label,
          icon: currentDescription.icon,
          humidity: Math.round(current.relative_humidity_2m),
          wind: Math.round(current.wind_speed_10m),
          forecast: (data.daily?.time || []).map((date: string, index: number) => ({
            day: index === 0 ? 'Bugün' : new Date(`${date}T12:00:00`).toLocaleDateString('tr-TR', { weekday: 'short' }),
            icon: weatherDescription(data.daily.weather_code[index]).icon,
            temp: Math.round(data.daily.temperature_2m_max[index])
          }))
        });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') setWeatherError('Hava durumu verisi alınamadı. Lütfen tekrar deneyin.');
      } finally {
        if (!controller.signal.aborted) setIsWeatherLoading(false);
      }
    };
    loadWeather();
    const refreshTimer = window.setInterval(loadWeather, 10 * 60 * 1000);
    return () => {
      controller.abort();
      window.clearInterval(refreshTimer);
    };
  }, [selectedWeatherCity]);

  useEffect(() => {
    const controller = new AbortController();
    const loadCurrencyRates = async () => {
      setIsCurrencyLoading(true);
      setCurrencyError('');
      try {
        const response = await fetch('https://open.er-api.com/v6/latest/TRY', { signal: controller.signal });
        if (!response.ok) throw new Error('Kur kaynağına ulaşılamadı');
        const data = await response.json();
        if (data.result !== 'success' || !data.rates?.USD || !data.rates?.EUR || !data.rates?.GBP) throw new Error('Kur verisi alınamadı');
        setCurrencyRates([
          { code: 'USD', name: 'Amerikan Doları', value: (1 / data.rates.USD).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 4 }) },
          { code: 'EUR', name: 'Euro', value: (1 / data.rates.EUR).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 4 }) },
          { code: 'GBP', name: 'İngiliz Sterlini', value: (1 / data.rates.GBP).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 4 }) },
        ]);
        setCurrencyUpdatedAt(new Date((data.time_last_update_unix || Math.floor(Date.now() / 1000)) * 1000));
      } catch (error) {
        if ((error as Error).name !== 'AbortError') setCurrencyError('Canlı kur verisi alınamadı. Lütfen tekrar deneyin.');
      } finally {
        if (!controller.signal.aborted) setIsCurrencyLoading(false);
      }
    };
    loadCurrencyRates();
    const refreshTimer = window.setInterval(loadCurrencyRates, 15 * 60 * 1000);
    return () => {
      controller.abort();
      window.clearInterval(refreshTimer);
    };
  }, []);

  // Ürün Detay Modali State'i
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [modalActiveImgIndex, setModalActiveImgIndex] = useState(0);
  const [modalQuantity, setModalQuantity] = useState(1);
  const [modalSelectedUnit, setModalSelectedUnit] = useState<SaleUnit>('piece');
  const [zoomPos, setZoomPos] = useState({ x: 0, y: 0, mouseX: 0, mouseY: 0 });
  const [showZoom, setShowZoom] = useState(false);
  const modalImgRef = useRef<HTMLImageElement>(null);

  React.useEffect(() => {
    if (selectedProduct) {
      setModalActiveImgIndex(0);
      setModalQuantity(1);
      setModalSelectedUnit('piece');
      setShowZoom(false);
    }
  }, [selectedProduct]);

  // Sandbox / Test Payment Mode States
  const [isSandboxMode, setIsSandboxMode] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const checkoutSubmissionRef = useRef(false);
  const [paymentError, setPaymentError] = useState('');

  const openAccountPanel = (mode: 'login' | 'register') => {
    setAccountMode(mode);
    setAccountOpen(true);
    window.setTimeout(() => {
      document.getElementById('member-account-panel')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 0);
  };

  useEffect(() => {
    if (memberAccessRequest) openAccountPanel(memberAccessRequest.mode);
  }, [memberAccessRequest]);

  const requireMemberForShopping = () => {
    if (currentMember) return true;
    openAccountPanel('login');
    alert('Alışverişe devam etmek için önce üye olun veya giriş yapın.');
    return false;
  };

  const handleProtectedAddToCart = (product: Product, saleUnit: SaleUnit = 'piece') => {
    if (requireMemberForShopping()) onAddToCart(product, saleUnit);
  };

  const handleProtectedDealerSelector = (sector?: string) => {
    if (requireMemberForShopping()) onOpenDealerSelector(sector);
  };

  // Kargo ve Entegrasyon Bilgileri State'leri
  const [shippingCompany, setShippingCompany] = useState('Yurtiçi Kargo');
  const [shippingReceiver, setShippingReceiver] = useState('');
  const [shippingPhone, setShippingPhone] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [shippingCity, setShippingCity] = useState('İstanbul');
  const [shippingDistrict, setShippingDistrict] = useState('');

  // Bayi Başvuru State'leri
  const [localIsApplicationModalOpen, setLocalIsApplicationModalOpen] = useState(false);
  const isApplicationModalOpen = propIsApplicationModalOpen !== undefined ? propIsApplicationModalOpen : localIsApplicationModalOpen;
  const setIsApplicationModalOpen = propOnCloseApplicationModal !== undefined ? (val: boolean) => {
    if (!val && propOnCloseApplicationModal) propOnCloseApplicationModal();
  } : setLocalIsApplicationModalOpen;
  const [isApplicationSuccess, setIsApplicationSuccess] = useState(false);
  const [isApplicationSubmitting, setIsApplicationSubmitting] = useState(false);
  const [applicationError, setApplicationError] = useState('');
  const [appShopName, setAppShopName] = useState('');
  const [appOwnerName, setAppOwnerName] = useState('');
  const [appSector, setAppSector] = useState('Kırtasiye');
  const [appCity, setAppCity] = useState('İstanbul');
  const [appDistrict, setAppDistrict] = useState('');
  const [appAddress, setAppAddress] = useState('');
  const [appPhone, setAppPhone] = useState('');
  const [appEmail, setAppEmail] = useState('');
  const [appPassword, setAppPassword] = useState('');

  // Prefill kargo alıcı bilgileri
  React.useEffect(() => {
    if (customerName && !shippingReceiver) {
      setShippingReceiver(customerName);
    }
  }, [customerName]);

  React.useEffect(() => {
    if (customerPhone && !shippingPhone) {
      setShippingPhone(customerPhone);
    }
  }, [customerPhone]);

  // Aktif sekme veya sayfadaki ürün kümesi
  const currentTabProducts = useMemo(() => {
    return products.filter(product => {
      if (selectedDealer) {
        if (privateStoreTab === 'special') {
          // Bu esnafa ait özel ürünler - SADECE referral link ile gelmişse (isReferralLocked)
          if (!isReferralLocked) return false;
          return product.dealerId === selectedDealer.id;
        } else {
          // Ortak (Merkez) ürünleri
          return !product.dealerId;
        }
      } else {
        // Genel ortak liste - Sadece merkez ürünleri, esnaf ürünleri asla görünmez
        return !product.dealerId;
      }
    });
  }, [products, selectedDealer, privateStoreTab, isReferralLocked]);

  // Kategoriler ürünlerden otomatik oluşturulur
  const categories = useMemo(() => {
    const defaultCategories = [
      'Kalemler & Yazım Gereçleri',
      'Defter & Kağıt Ürünleri',
      'Sırt Çantaları & Kutuları',
      'Okul & Ofis Araçları'
    ];
    const productCategories: string[] = Array.from(new Set(currentTabProducts.map(product => product.category).filter((category): category is string => Boolean(category))));
    const allCategories = Array.from(new Set([...sharedCategories, ...productCategories]));
    const orderedCategories = [
      ...defaultCategories.filter(category => allCategories.includes(category)),
      ...allCategories.filter(category => !defaultCategories.includes(category))
    ];
    return ['All', ...orderedCategories];
  }, [currentTabProducts, sharedCategories]);

  // Filtrelenmiş Ürünler
  const filteredProducts = useMemo(() => {
    return currentTabProducts.filter(product => {
      const normalizedSearch = searchTerm.trim().toLowerCase();
      const matchesSearch =
        product.name.toLowerCase().includes(normalizedSearch) ||
        product.brand.toLowerCase().includes(normalizedSearch) ||
        product.description.toLowerCase().includes(normalizedSearch) ||
        product.barcode?.toLowerCase().includes(normalizedSearch) ||
        product.qrCode?.toLowerCase().includes(normalizedSearch);

      const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [currentTabProducts, searchTerm, selectedCategory]);

  // Hero Arkaplan Ürün Kaydırma Listesi (Seamless loop için)
  const bgProducts = useMemo(() => {
    let sourceProducts = products;
    if (storeSettings.showcaseProductIds && storeSettings.showcaseProductIds.length > 0) {
      sourceProducts = products.filter(p => storeSettings.showcaseProductIds?.includes(p.id));
    } else {
      sourceProducts = products.filter(p => !p.dealerId);
    }
    if (sourceProducts.length === 0) {
      sourceProducts = products.filter(p => !p.dealerId);
    }
    if (sourceProducts.length === 0) return [];
    let list = [...sourceProducts];
    // En az 15 ürün olmasını sağlıyoruz ki ekranı doldursun ve kesintisiz kaysın
    while (list.length < 15) {
      list = [...list, ...sourceProducts];
    }
    // Infinite marquee için listeyi ikiye katlıyoruz
    return [...list, ...list];
  }, [products, storeSettings.showcaseProductIds]);

  // Sepet Genel Toplamı (En güncel fiyatlarla)
  const cartTotal = useMemo(() => {
    return cartItems.reduce((acc, item) => {
      const currentProduct = products.find(p => p.id === item.product.id);
      const price = currentProduct ? getProductUnitPrice(currentProduct, item.saleUnit) : item.unitPrice;
      return acc + price * item.quantity;
    }, 0);
  }, [cartItems, products]);

  // Hak Edilen Komisyon (Dynamic)
  const calculatedCommission = useMemo(() => {
    return Number((cartTotal * (commissionRate / 100)).toFixed(2));
  }, [cartTotal, commissionRate]);


  const handleReceiptUpload = async (file: File) => {
    if (!currentMember?.id) return;
    setIsReceiptUploading(true);
    setPaymentError('');
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
      const url = await uploadFile(`receipts/${currentMember.id}/${Date.now()}-${safeName}`, file, {
        onStatus: status => setPaymentError(status === 'optimizing' ? 'Dekont optimize ediliyor...' : 'Optimize edilen dekont yükleniyor...'),
      });
      setReceiptFileName(file.name);
      setReceiptDataUrl(url);
      setPaymentError('');
    } catch (error) {
      setPaymentError(error instanceof Error ? error.message : 'Dekont yüklenemedi.');
      setReceiptFileName('');
      setReceiptDataUrl('');
    } finally {
      setIsReceiptUploading(false);
    }
  };

  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDealer) {
      alert('Lütfen önce bir bayi seçin!');
      return;
    }
    if (!currentMember) {
      setAccountOpen(true);
      alert('Sipariş oluşturmak için önce üye girişi yapmalısınız.');
      return;
    }
    if (cartItems.length === 0) {
      alert('Sepetiniz boş!');
      return;
    }
    // Stok kontrolü - oversell önleme
    const stockCheck = cartItems.find(item => {
      const product = products.find(p => p.id === item.product.id);
      return product && product.stock < item.quantity * item.unitQuantity;
    });
    if (stockCheck) {
      const product = products.find(p => p.id === stockCheck.product.id);
      alert(`Yetersiz stok! "${stockCheck.product.name}" için mevcut stok: ${product?.stock || 0}, sepetinizde gereken toplam birim: ${stockCheck.quantity * stockCheck.unitQuantity}`);
      return;
    }
    if (!hasAcceptedCheckoutTerms || !hasAcceptedCheckoutKvkk) {
      alert('Mesafeli Satış Sözleşmesi, Ön Bilgilendirme Formu ve KVKK Aydınlatma Metni onayları gereklidir.');
      return;
    }
    if (!shippingReceiver || !shippingPhone || !shippingAddress || !shippingDistrict) {
      alert('Lütfen teslimat ve kargo bilgilerini eksiksiz doldurun!');
      return;
    }
    if (!invoiceFullName || !invoiceAddress || !invoiceCity || !invoiceDistrict || (invoiceType === 'individual' && !invoiceNationalId) || (invoiceType === 'corporate' && (!invoiceCompanyName || !invoiceTaxNumber || !invoiceTaxOffice))) {
      alert('Lütfen fatura bilgilerini eksiksiz doldurun.');
      return;
    }

    const invoiceDetails: InvoiceDetails = {
      type: invoiceType,
      fullName: invoiceFullName,
      nationalId: invoiceType === 'individual' ? invoiceNationalId : undefined,
      companyName: invoiceType === 'corporate' ? invoiceCompanyName : undefined,
      taxNumber: invoiceType === 'corporate' ? invoiceTaxNumber : undefined,
      taxOffice: invoiceType === 'corporate' ? invoiceTaxOffice : undefined,
      address: invoiceAddress,
      city: invoiceCity,
      district: invoiceDistrict,
    };

    if (isReceiptUploading) {
      setPaymentError('Dekont yüklemesi tamamlanana kadar bekleyin.');
      return;
    }
    if (paymentMethod === 'bank_transfer' && !receiptDataUrl) {
      setPaymentError('Banka havalesi dekontunu yüklemeden sipariş oluşturamazsınız.');
      return;
    }
    if (paymentMethod === 'card' && (!/^\d{4}( \d{4}){3}$/.test(cardNumber) || !/^\d{2}\/\d{2}$/.test(cardExpiry) || !/^\d{3}$/.test(cardCvc))) {
      setPaymentError('POS ödemesi için 16 haneli kart numarası, geçerli son kullanma tarihi ve 3 haneli CVC girin.');
      return;
    }
    if (checkoutSubmissionRef.current) return;
    checkoutSubmissionRef.current = true;
    setPaymentError('');
    setIsProcessingPayment(true);

    setTimeout(async () => {
      try {
        const createdOrderId = await onCheckout(
          customerName,
          customerEmail,
          customerPhone,
          shippingCompany,
          shippingReceiver,
          shippingPhone,
          shippingAddress,
          shippingCity,
          shippingDistrict,
          customerSelectedSector,
          isViewingPrivatePage && privateStoreTab === 'special',
          receiptDataUrl,
          receiptFileName,
          paymentMethod,
          checkoutOrderReference,
          [
            { documentId: 'distance-sales', version: LEGAL_DOCUMENT_VERSION, acceptedAt: new Date().toISOString() },
            { documentId: 'pre-information', version: LEGAL_DOCUMENT_VERSION, acceptedAt: new Date().toISOString() }
          ],
          invoiceDetails,
          isSandboxMode && paymentMethod === 'card'
        );
        if (!createdOrderId) throw new Error('Sipariş kaydı oluşturulamadı.');
        setRecentOrderId(createdOrderId);
        setCheckoutOrderReference(createCheckoutOrderReference());
        onClearCart();
        setIsOrderSuccess(true);
      } catch (error) {
        console.error('Sandbox sipariş oluşturma hatası:', error);
        const errorCode = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
        setPaymentError(errorCode ? `Sipariş oluşturulamadı (${errorCode}). Lütfen tekrar deneyin.` : 'Sipariş oluşturulamadı. Lütfen tekrar deneyin.');
      } finally {
        checkoutSubmissionRef.current = false;
        setIsProcessingPayment(false);
      }
    }, 1800);
  };

  const handleApplicationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appShopName || !appOwnerName || !appDistrict || !appAddress || !appPhone || !appEmail || !appPassword) {
      alert('Lütfen tüm başvuru bilgilerini ve şifrenizi eksiksiz doldurun!');
      return;
    }
    if (appPassword.length < 6) {
      alert('Bayi giriş şifresi en az 6 karakter olmalıdır.');
      return;
    }

    if (isApplicationSubmitting) return;

    setApplicationError('');
    setIsApplicationSubmitting(true);
    try {
      await onApplyDealer({
        name: appShopName.trim(),
        owner: appOwnerName.trim(),
        sector: appSector,
        city: appCity,
        district: appDistrict.trim(),
        address: appAddress.trim(),
        phone: appPhone.trim(),
        email: appEmail.trim().toLowerCase(),
        status: 'pending'
      }, appPassword);
      setIsApplicationSuccess(true);
    } catch (error: any) {
      // Cloud Functions HttpsError handling
      const errorCode = error?.code || error?.details?.code || '';
      const errorMessage = error?.message || '';
      const isConflict = errorCode === 'already-exists' || errorCode === '409' || errorCode === 'aborted' ||
        errorMessage.includes('already exists') || errorMessage.includes('already-exists') ||
        errorMessage.includes('409') || errorMessage.includes('zaten bir bayi hesabı');

      setApplicationError(isConflict
        ? 'Bu e-posta adresiyle zaten bir bayi hesabı veya başvurusu bulunuyor. Farklı bir e-posta adresi deneyin.'
        : 'Bayi başvurusu kaydedilemedi. Lütfen internet bağlantınızı kontrol edip tekrar deneyin.');
      console.error('Bayi başvuru hatası:', error);
    } finally {
      setIsApplicationSubmitting(false);
    }
  };

  const handleCloseApplication = () => {
    setIsApplicationModalOpen(false);
    setIsApplicationSuccess(false);
    setIsApplicationSubmitting(false);
    setApplicationError('');
    setAppShopName('');
    setAppOwnerName('');
    setAppSector('Kırtasiye');
    setAppCity('İstanbul');
    setAppDistrict('');
    setAppAddress('');
    setAppPhone('');
    setAppEmail('');
    setAppPassword('');
  };

  const handleCloseSuccess = () => {
    setIsOrderSuccess(false);
    setIsCheckoutModalOpen(false);
    onClearCart();
    setCustomerName('');
    setCustomerEmail('');
    setCustomerPhone('');
    setShippingReceiver('');
    setShippingPhone('');
    setShippingAddress('');
    setShippingDistrict('');
    setCardNumber('');
    setCardExpiry('');
    setCardCvc('');
    setReceiptDataUrl('');
    setReceiptFileName('');
    setHasAcceptedCheckoutTerms(false);
    setHasAcceptedCheckoutKvkk(false);
    setPaymentError('');
  };

  const handleDownloadOrderDetails = () => {
    if (!recentOrderId) return;
    
    // Find the order matching the ID
    const matchedOrder = orders.find(o => o.id === recentOrderId);
    const orderItemsText = matchedOrder
      ? matchedOrder.items.map(item => `- ${item.name} (Adet: ${item.quantity}, Birim Fiyat: ${item.price.toFixed(2)} TL, Toplam: ${(item.price * item.quantity).toFixed(2)} TL)`).join('\n')
      : cartItems.map(item => `- ${item.product.name} (Adet: ${item.quantity}, Birim Fiyat: ${item.product.price.toFixed(2)} TL, Toplam: ${(item.product.price * item.quantity).toFixed(2)} TL)`).join('\n');
      
    const totalVal = matchedOrder ? matchedOrder.totalPrice : cartTotal;
    const dateStr = matchedOrder ? new Date(matchedOrder.date).toLocaleString('tr-TR') : new Date().toLocaleString('tr-TR');
    
    const textContent = `==================================================
              BUĞURCA KIRTASİYE
         YENİLİKÇİ ESNAF DESTEK SİSTEMİ
==================================================
SİPARİŞ BİLGİLERİNİZ VE DETAYLARI
--------------------------------------------------
Sipariş No      : ${recentOrderId}
İşlem Tarihi    : ${dateStr}
Ödeme Türü      : Sanal POS (Merkez Havuz Güvenceli)
Desteklenen Bayi: ${selectedDealer?.name || 'Süper Merkez'} (${selectedDealer?.owner || ''})
--------------------------------------------------
MÜŞTERİ BİLGİLERİ
--------------------------------------------------
Ad Soyad        : ${customerName}
E-posta Adresi  : ${customerEmail}
Telefon Numarası: ${customerPhone}
--------------------------------------------------
TESLİMAT VE KARGO BİLGİLERİ
--------------------------------------------------
Alıcı Ad Soyad  : ${shippingReceiver || customerName}
Alıcı Telefon   : ${shippingPhone || customerPhone}
Kargo Firması   : ${shippingCompany}
Teslimat Adresi : ${shippingAddress}
Bölge           : ${shippingDistrict} / ${shippingCity}
--------------------------------------------------
SİPARİŞ EDİLEN ÜRÜNLER
--------------------------------------------------
${orderItemsText}
--------------------------------------------------
GENEL TOPLAM    : ${totalVal.toFixed(2)} TL
--------------------------------------------------
✓ Bu sipariş yerli kırtasiye esnafımız yararına kaydedilmiştir.
✓ Sipariş detayları müşteri tarafından indirilmiştir.

Bizleri tercih ettiğiniz için teşekkür ederiz!
==================================================`;

    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `siparis-bilgileri-${recentOrderId}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    // Trigger download status callback
    if (onMarkOrderDownloaded) {
      onMarkOrderDownloaded(recentOrderId);
    }
  };

  const scrollSpeed = storeSettings.showcaseScrollSpeed !== undefined ? storeSettings.showcaseScrollSpeed : 80;
  const memberOrders = currentMember
    ? orders.filter(order => order.memberId === currentMember.id && order.orderRole !== 'sub' && !order.memberHidden && !order.adminHidden)
    : [];

  const latestNews = storeSettings.newsList?.slice(0, 4) ?? [];

  const weather = weatherData || {
    city: selectedWeatherCity,
    temperature: '—',
    description: 'Veri yükleniyor',
    icon: '⛅',
    humidity: '—',
    wind: '—',
    forecast: [],
  };

  return (
    <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 overflow-hidden" id="customer-store">
      <img
        src="https://images.pexels.com/photos/28503361/pexels-photo-28503361.jpeg"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover opacity-[0.075] pointer-events-none z-0"
      />
      <div className="wooden-pencil-rail wooden-pencil-rail-left" aria-hidden="true">
        <span className="wooden-pencil"></span>
        <span className="wooden-pencil wooden-pencil-offset"></span>
        <span className="wooden-pencil"></span>
      </div>
      <div className="wooden-pencil-rail wooden-pencil-rail-right" aria-hidden="true">
        <span className="wooden-pencil"></span>
        <span className="wooden-pencil wooden-pencil-offset"></span>
        <span className="wooden-pencil"></span>
      </div>
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3" aria-label="Anlık bilgi panelleri">
        <button onClick={() => setIsClockPanelOpen(true)} className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-2 shadow-sm hover:shadow-md hover:border-blue-200 transition-all cursor-pointer text-left">
          <span className="bg-blue-50 rounded-lg p-2"><Clock className="w-4 h-4 text-blue-500" /></span>
          <span><span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Takvim & Saat</span><span className="font-mono text-sm font-bold text-slate-800">{currentTime.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span></span>
        </button>
        <button onClick={() => setIsCurrencyPanelOpen(true)} className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-2 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all cursor-pointer text-left">
          <span className="bg-emerald-50 rounded-lg p-2"><TrendingUp className="w-4 h-4 text-emerald-500" /></span>
          <span><span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Canlı Kurlar</span><span className="text-sm font-bold text-slate-800">USD {currencyRates.find(rate => rate.code === 'USD')?.value ?? '—'} ₺</span></span>
        </button>
        <button onClick={() => setIsNewsPanelOpen(true)} className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-2 shadow-sm hover:shadow-md hover:border-amber-200 transition-all cursor-pointer text-left">
          <span className="bg-amber-50 rounded-lg p-2"><Newspaper className="w-4 h-4 text-amber-500" /></span>
          <span className="min-w-0"><span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Canlı Haberler</span><span className="block text-sm font-bold text-slate-800 truncate">{latestNews[0]?.title || 'Güncel duyurular'}</span></span>
        </button>
        <button onClick={() => setIsWeatherPanelOpen(true)} className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-2 shadow-sm hover:shadow-md hover:border-sky-200 transition-all cursor-pointer text-left">
          <span className="text-2xl">{weather.icon}</span>
          <span><span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Hava Durumu</span><span className="text-sm font-bold text-slate-800">{weather.temperature}°C · {weather.city}</span></span>
        </button>
      </section>

      {/* Büyük Saat Paneli (Modal) */}
      {isClockPanelOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 relative">
            <button
              onClick={() => setIsClockPanelOpen(false)}
              className="text-slate-400 hover:text-slate-600 p-1 bg-slate-50 rounded-lg absolute top-4 right-4 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="text-center space-y-4">
              <Clock className="w-10 h-10 text-blue-600 mx-auto" />
              <h3 className="font-display font-bold text-xl text-slate-900">Anlık Saat ve Tarih</h3>
              <p className="font-mono text-4xl font-extrabold text-slate-900">
                {currentTime.toLocaleTimeString('tr-TR')}
              </p>
              <p className="text-sm text-slate-600">
                {currentTime.toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
        </div>
      )}

      {isCurrencyPanelOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 relative">
            <button onClick={() => setIsCurrencyPanelOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 bg-slate-50 rounded-lg absolute top-4 right-4 cursor-pointer" aria-label="Kur panelini kapat"><X className="w-5 h-5" /></button>
            <div className="space-y-5">
              <div><div className="flex items-center gap-2 text-emerald-600"><TrendingUp className="w-5 h-5" /><span className="text-[10px] font-bold uppercase tracking-wider">Piyasa Özeti</span></div><h3 className="font-display font-bold text-xl text-slate-900 mt-1">Canlı Döviz Kurları</h3><p className="text-xs text-slate-500 mt-1">Son güncelleme: {currencyUpdatedAt ? currencyUpdatedAt.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : 'Yükleniyor'}</p></div>
              {isCurrencyLoading && !currencyRates.length && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">Canlı kurlar yükleniyor...</p>}
              {currencyError && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{currencyError}</p>}
              <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                {currencyRates.map(rate => <div key={rate.code} className="flex items-center justify-between px-4 py-3"><div><p className="text-sm font-bold text-slate-800">{rate.code}</p><p className="text-[11px] text-slate-500">{rate.name}</p></div><div className="text-right"><p className="font-mono text-sm font-bold text-slate-900">{rate.value} ₺</p><p className="text-[10px] font-bold text-emerald-600">Güncel</p></div></div>)}
              </div>
            </div>
          </div>
        </div>
      )}

      {isNewsPanelOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 relative">
            <button onClick={() => setIsNewsPanelOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 bg-slate-50 rounded-lg absolute top-4 right-4 cursor-pointer" aria-label="Haber panelini kapat"><X className="w-5 h-5" /></button>
            <div className="space-y-5"><div><div className="flex items-center gap-2 text-amber-600"><Newspaper className="w-5 h-5" /><span className="text-[10px] font-bold uppercase tracking-wider">Güncel Akış</span></div><h3 className="font-display font-bold text-xl text-slate-900 mt-1">Canlı Haberler</h3></div>
              {latestNews.length ? <div className="space-y-3">{latestNews.map((news: any, index: number) => <article key={news.id || index} className="border border-slate-100 rounded-xl p-4"><p className="text-sm font-bold text-slate-800">{news.title}</p>{news.content && <p className="text-xs text-slate-500 mt-1 leading-relaxed">{news.content}</p>}</article>)}</div> : <p className="bg-slate-50 rounded-xl p-4 text-sm text-slate-500">Şu an gösterilecek güncel duyuru bulunmuyor.</p>}
            </div>
          </div>
        </div>
      )}

      {/* Büyük Hava Durumu Paneli (Modal) */}
      {isWeatherPanelOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 relative">
            <button
              onClick={() => setIsWeatherPanelOpen(false)}
              className="text-slate-400 hover:text-slate-600 p-1 bg-slate-50 rounded-lg absolute top-4 right-4 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div><span className="text-[10px] font-bold uppercase tracking-wider text-sky-600">Şehir seçimi</span><h3 className="font-display font-bold text-xl text-slate-900 mt-1">Hava Durumu</h3></div>
                <span className="text-5xl">{weather.icon}</span>
              </div>
              <select value={selectedWeatherCity} onChange={e => setSelectedWeatherCity(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-800 outline-hidden focus:border-sky-500" aria-label="Hava durumu şehri seçin">
                {TURKISH_CITIES.map(city => <option key={city} value={city}>{city}</option>)}
              </select>
              {isWeatherLoading && <p className="rounded-lg bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700">{selectedWeatherCity} hava durumu yükleniyor...</p>}
              {weatherError && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{weatherError}</p>}
              <div className="text-center">
                <h4 className="text-sm font-bold text-slate-700">{weather.city}</h4>
                <p className="font-mono text-4xl font-extrabold text-slate-900">{weather.temperature}°C</p>
                <p className="text-sm text-slate-600">{weather.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                <p>Nem: <strong className="text-slate-800">{weather.humidity}%</strong></p>
                <p>Rüzgar: <strong className="text-slate-800">{weather.wind} km/s</strong></p>
              </div>
              <div className="border-t border-slate-100 pt-4 space-y-2">
                <h4 className="text-sm font-bold text-slate-700">3 Günlük Tahmin</h4>
                <div className="flex justify-around">
                  {weather.forecast.map((day, index) => (
                    <div key={index} className="text-center space-y-1">
                      <p className="text-lg">{day.icon}</p>
                      <p className="text-xs font-bold text-slate-800">{day.day}</p>
                      <p className="text-[10px] text-slate-500">{day.temp}°C</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        {currentMember ? (
          <button onClick={() => openAccountPanel('login')} className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 shadow-sm hover:border-amber-400 cursor-pointer">
            <ShoppingBag className="w-4 h-4 text-amber-500" /> {currentMember.name} · Hesabım
          </button>
        ) : (
          <>
            <button type="button" onClick={() => openAccountPanel('login')} className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 shadow-sm hover:border-amber-400 cursor-pointer">
              <LogIn className="w-4 h-4 text-amber-500" /> Üye Girişi
            </button>
            <button type="button" onClick={() => openAccountPanel('register')} className="flex items-center gap-2 bg-amber-500 border border-amber-500 rounded-xl px-4 py-2 text-xs font-bold text-slate-950 shadow-sm hover:bg-amber-400 cursor-pointer">
              <UserPlus className="w-4 h-4" /> Kayıt Ol
            </button>
          </>
        )}
      </div>
      {accountOpen && <div id="member-account-panel" className="bg-white border border-amber-200 rounded-2xl p-5 shadow-sm space-y-3 max-w-md ml-auto">
        {currentMember && !isAccountSubmitting ? <><p className="text-sm font-bold text-slate-800">{currentMember.name}</p><p className="text-xs text-slate-500">{currentMember.email}</p><button onClick={onMemberLogout} className="text-xs font-bold text-rose-600 cursor-pointer">Çıkış Yap</button></> : <form onSubmit={async e => { e.preventDefault(); setIsAccountSubmitting(true); setAccountOpen(false); try { const ok = accountMode === 'login' ? await onMemberLogin(accountEmail, accountPassword) : await onMemberRegister(accountName, accountEmail, accountPassword, accountPhone, hasAcceptedMembershipTerms ? [{ documentId: 'membership', version: LEGAL_DOCUMENT_VERSION, acceptedAt: new Date().toISOString() }, { documentId: 'kvkk', version: LEGAL_DOCUMENT_VERSION, acceptedAt: new Date().toISOString() }] : []); if (!ok) setAccountOpen(true); } finally { setIsAccountSubmitting(false); } }} className="space-y-2">
          {accountMode === 'register' && <><input required value={accountName} onChange={e => setAccountName(e.target.value)} placeholder="Ad Soyad" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs" /><input value={accountPhone} onChange={e => setAccountPhone(e.target.value)} placeholder="Telefon" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs" /><div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-600"><input type="checkbox" checked={hasAcceptedMembershipTerms} onChange={e => setHasAcceptedMembershipTerms(e.target.checked)} className="mt-0.5 shrink-0 accent-amber-500" /><span><button type="button" onClick={() => setActiveLegalDocument('membership')} className="font-bold text-amber-700 underline cursor-pointer">Üyelik Sözleşmesi&apos;ni</button> ve <button type="button" onClick={() => setActiveLegalDocument('kvkk')} className="font-bold text-amber-700 underline cursor-pointer">KVKK Aydınlatma Metni&apos;ni</button> okudum, kabul ediyorum.</span></div></>}
          <input required type="email" value={accountEmail} onChange={e => setAccountEmail(e.target.value)} placeholder="E-posta" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs" />
          <input required type="password" value={accountPassword} onChange={e => setAccountPassword(e.target.value)} placeholder="Şifre" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs" />
          <button disabled={isAccountSubmitting || (accountMode === 'register' && !hasAcceptedMembershipTerms)} className="w-full bg-slate-900 text-white rounded-lg py-2 text-xs font-bold cursor-pointer disabled:cursor-not-allowed disabled:opacity-50">{isAccountSubmitting ? 'İşleniyor...' : accountMode === 'login' ? 'Giriş Yap' : 'Üye Ol'}</button>
          {accountMode === 'login' && <button type="button" onClick={() => onForgotPassword(accountEmail)} className="text-[11px] text-slate-500 hover:text-amber-700 font-bold cursor-pointer">Şifremi unuttum</button>}
          <button type="button" onClick={() => setAccountMode(accountMode === 'login' ? 'register' : 'login')} className="text-[11px] text-amber-700 font-bold cursor-pointer">{accountMode === 'login' ? 'Yeni üyelik oluştur' : 'Zaten üyeyim, giriş yap'}</button>
        </form>}
      </div>}
      {currentMember && (
        <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4" id="member-orders-panel">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-display font-bold text-base text-slate-900">Sipariş Geçmişim</h3>
              <p className="text-[11px] text-slate-500">Geçmiş siparişlerinizi, ödeme durumlarını, teslimat ve kargo takip bilgilerini buradan izleyebilirsiniz.</p>
            </div>
            <span className="bg-slate-100 text-slate-600 rounded-full px-3 py-1 text-[11px] font-bold">{memberOrders.length} sipariş</span>
          </div>
          {memberOrders.length === 0 ? (
            <p className="text-xs text-slate-500 py-2">Henüz kayıtlı siparişiniz bulunmuyor.</p>
          ) : (
            <div className="space-y-4">
              {memberOrders.map(order => {
                const paymentApproved = order.paymentStatus === 'approved' || order.adminApproved === true;
                const paymentLabel = order.paymentMethod === 'card' ? 'Kart ödemesi otomatik onaylandı' : order.receiptStatus === 'approved' ? 'Dekont yönetici tarafından onaylandı' : order.receiptStatus === 'rejected' ? (order.receiptMessage || 'Dekont reddedildi') : 'Dekont yönetici onayı bekliyor';
                const orderStatusLabel = order.status === 'completed' ? 'Sipariş onaylandı' : order.status === 'cancelled' ? 'Sipariş iptal edildi' : 'Sipariş onay bekliyor';
                const shippingStatusLabel = order.shippingStatus === 'delivered' ? 'Teslim edildi' : order.shippingStatus === 'shipped' ? 'Kargoya verildi' : order.shippingStatus === 'cancelled' ? 'Kargo iptal edildi' : 'Hazırlanıyor';
                return (
                  <article key={order.id} className="border border-slate-200 rounded-xl p-4 space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-mono text-xs font-bold text-slate-900">{order.id}</p>
                        <p className="text-[11px] text-slate-500 mt-1">{new Date(order.date).toLocaleString('tr-TR')}</p>
                      </div>
                      <div className="flex flex-wrap gap-1.5 text-[10px] font-bold">
                        <span className={`rounded-full px-2.5 py-1 ${paymentApproved ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{paymentLabel}</span>
                        <span className="rounded-full px-2.5 py-1 bg-slate-100 text-slate-600">{orderStatusLabel}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-[11px]">
                      <div><span className="block text-slate-400 font-semibold">Ödeme yöntemi</span><strong className="text-slate-700">{order.paymentMethod === 'card' ? 'Kart' : 'Banka havalesi / Dekont'}</strong></div>
                      <div><span className="block text-slate-400 font-semibold">Bayi</span><strong className="text-slate-700">{order.dealerName}</strong></div>
                      <div><span className="block text-slate-400 font-semibold">Toplam</span><strong className="text-slate-900">{order.totalPrice.toFixed(2)} TL</strong></div>
                      <div><span className="block text-slate-400 font-semibold">Kargo durumu</span><strong className="text-slate-700">{shippingStatusLabel}</strong></div>
                    </div>
                    <div className="border-t border-slate-100 pt-3">
                      <p className="text-[11px] font-bold text-slate-700 mb-2">Sipariş ürünleri</p>
                      <div className="space-y-1.5">
                        {order.items.map((item, index) => (
                          <div key={`${order.id}-${item.productId}-${index}`} className="flex flex-wrap justify-between gap-2 text-[11px] text-slate-600">
                            <span>{item.name} × {item.quantity}</span><span>{(item.price * item.quantity).toFixed(2)} TL</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border-t border-slate-100 pt-3 text-[11px]">
                      <div><p className="font-bold text-slate-700 mb-1">Teslimat bilgileri</p><p className="text-slate-600">{order.shippingReceiver || order.customerName} · {order.shippingPhone || order.customerPhone}</p><p className="text-slate-600">{order.shippingAddress || 'Adres bilgisi yok'}, {order.shippingDistrict || ''} / {order.shippingCity || ''}</p></div>
                      <div><p className="font-bold text-slate-700 mb-1">Kargo takip</p><p className="text-slate-600">Firma: {order.shippingCompany || 'Belirtilmedi'}</p><p className="font-mono text-amber-700 font-bold">Takip no: {order.shippingTrackingNumber || 'Henüz oluşturulmadı'}</p></div>
                    </div>
                    {order.paymentMethod === 'bank_transfer' && <p className="text-[10px] text-slate-500 bg-slate-50 rounded-lg p-2">Dekont: {order.receiptFileName || (order.receiptUploaded ? 'Yüklendi' : 'Yüklenmedi')} · {paymentLabel}</p>}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}
      {/* Hero Banner with Sliding Background Products & Enhanced Legibility */}
      <style>{`
        @keyframes scroll-bg-products {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-bg-scroll {
          display: flex;
          width: max-content;
          animation: ${scrollSpeed > 0 ? `scroll-bg-products ${scrollSpeed}s linear infinite` : 'none'};
        }
        .animate-bg-scroll:hover {
          animation-play-state: paused;
        }
        .text-glow-premium {
          text-shadow: 0 4px 12px rgba(0, 0, 0, 0.65), 0 2px 4px rgba(0, 0, 0, 0.5);
        }
        .desc-glow-premium {
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.55), 0 1px 3px rgba(0, 0, 0, 0.4);
        }
        .wooden-pencil-rail {
          position: absolute;
          top: 2.5rem;
          bottom: 2.5rem;
          z-index: 5;
          display: none;
          flex-direction: column;
          justify-content: space-around;
          gap: 1rem;
          pointer-events: none;
        }
        .wooden-pencil-rail-left { left: 1rem; }
        .wooden-pencil-rail-right { right: 1rem; }
        .wooden-pencil {
          display: block;
          width: 0.9rem;
          height: 7rem;
          border-radius: 0.45rem 0.45rem 0.2rem 0.2rem;
          background: linear-gradient(90deg, #8b5a2b 0%, #d69e62 38%, #f4c27a 62%, #75401f 100%);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
          transform: rotate(4deg);
        }
        .wooden-pencil::before {
          content: '';
          display: block;
          width: 0;
          height: 0;
          margin-left: 0.05rem;
          border-left: 0.4rem solid transparent;
          border-right: 0.4rem solid transparent;
          border-bottom: 0.85rem solid #e8c39e;
          transform: translateY(-0.75rem);
        }
        .wooden-pencil::after {
          content: '';
          display: block;
          width: 0.22rem;
          height: 0.28rem;
          margin: -0.57rem auto 0;
          border-radius: 50%;
          background: #334155;
        }
        .wooden-pencil-offset { transform: rotate(-5deg); }
        @media (min-width: 1280px) {
          .wooden-pencil-rail { display: flex; }
        }
      `}</style>

      {isViewingPrivatePage && selectedDealer ? (
        <div className="space-y-8 animate-fadeIn" id="dealer-private-store-view">
          {/* Custom Isolated Dealer Banner Header */}
          <div className="relative bg-slate-900 border border-slate-800 rounded-3xl p-8 text-white overflow-hidden shadow-2xl">
            {/* Subtle neon glowing accents */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none"></div>
            
            <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
              <div className="space-y-4 max-w-2xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="bg-amber-500 text-slate-950 text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                    <Award className="w-3 h-3 animate-bounce" /> ÖZEL ESNAF VİTRİNİ
                  </span>
                  <span className="bg-slate-800 text-slate-300 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                    🏷️ {selectedDealer.sector || 'Genel'}
                  </span>
                  <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                    ✓ %100 Esnaf Destekli
                  </span>
                </div>
                
                <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-white tracking-tight leading-tight">
                  {selectedDealer.name} Dijital Butiği
                </h2>
                <p className="text-sm text-slate-300 leading-relaxed font-medium">
                  Süper Merkez altyapısı ile korunan bu özel vitrinde yapacağınız tüm harcamalar doğrudan esnafımız <strong>{selectedDealer.owner}</strong> hesabına aktarılır. Bu mahalle dükkanı dijital dünyada sizinle büyüyor!
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-slate-400 font-semibold">
                  <span className="flex items-center gap-1 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700/50">
                    <MapPin className="w-4 h-4 text-amber-500" /> {selectedDealer.city} / {selectedDealer.district}
                  </span>
                  <span className="flex items-center gap-1 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700/50">
                    <Phone className="w-4 h-4 text-emerald-500" /> {selectedDealer.phone}
                  </span>
                  <span className="flex items-center gap-1 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700/50">
                    <Mail className="w-4 h-4 text-blue-500" /> {selectedDealer.email}
                  </span>
                </div>
              </div>

              {/* Exclusive Sharing & QR Panel right in the header */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 w-full lg:w-96 space-y-4 shrink-0 shadow-lg" id="private-share-card">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-amber-500 uppercase tracking-wider block">
                    📢 ESNAF PAYLAŞIM VE KAREKODU
                  </span>
                  <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded-md font-mono">REFERRAL</span>
                </div>
                
                {/* Specialized Interactive QR Code */}
                <div className="flex items-center gap-4 bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
                  <div className="bg-white p-1.5 rounded-lg shrink-0 shadow-md">
                    <svg width="68" height="68" viewBox="0 0 100 100" className="text-slate-900">
                      <rect width="100" height="100" fill="white" />
                      {/* Corners */}
                      <rect x="10" y="10" width="25" height="25" fill="black" />
                      <rect x="15" y="15" width="15" height="15" fill="white" />
                      <rect x="18" y="18" width="9" height="9" fill="black" />
                      
                      <rect x="65" y="10" width="25" height="25" fill="black" />
                      <rect x="70" y="15" width="15" height="15" fill="white" />
                      <rect x="73" y="18" width="9" height="9" fill="black" />
                      
                      <rect x="10" y="65" width="25" height="25" fill="black" />
                      <rect x="15" y="70" width="15" height="15" fill="white" />
                      <rect x="18" y="73" width="9" height="9" fill="black" />
                      
                      {/* Simulated random QR blocks */}
                      <rect x="42" y="12" width="6" height="6" fill="black" />
                      <rect x="50" y="24" width="6" height="12" fill="black" />
                      <rect x="42" y="42" width="18" height="18" fill="black" />
                      <rect x="48" y="48" width="6" height="6" fill="white" />
                      <rect x="12" y="45" width="6" height="12" fill="black" />
                      <rect x="24" y="42" width="12" height="6" fill="black" />
                      <rect x="72" y="45" width="12" height="12" fill="black" />
                      <rect x="65" y="65" width="6" height="12" fill="black" />
                      <rect x="80" y="75" width="12" height="6" fill="black" />
                      <rect x="75" y="80" width="6" height="12" fill="black" />
                      {/* Center point sector icon helper */}
                      <circle cx="50" cy="50" r="8" fill="#f59e0b" />
                      <text x="46" y="54" fontSize="11" fill="white" fontWeight="bold">★</text>
                    </svg>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-300">Özel Esnaf Karekodu</p>
                    <p className="text-[9px] text-slate-400 leading-snug">Bu karekodu telefonunuzdan okutarak doğrudan {selectedDealer.name} vitrinine bağlanabilirsiniz!</p>
                  </div>
                </div>

                {/* Copy share link input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 block">Butik Bağlantısı</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      readOnly 
                      value={`${safeOrigin}?dealer=${selectedDealer.id}`}
                      className="bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-300 px-2.5 py-1.5 rounded-lg flex-1 outline-hidden"
                    />
                    <button
                      onClick={async () => {
                        if (await copyTextToClipboard(`${safeOrigin}?dealer=${selectedDealer.id}`)) {
                          alert('Özel esnaf bağlantısı panoya kopyalandı!');
                        }
                      }}
                      className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer"
                    >
                      Kopyala
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Private Store Shopping Content Area */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              {/* Navigation options back to main */}
              {!isReferralLocked && (
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
                  <button
                    onClick={() => {
                      if (cartItems && cartItems.length > 0) {
                        alert(`Alışverişiniz devam ederken bayi seçimini değiştiremez veya sıfırlayamazsınız! Mevcut sepetiniz "${selectedDealer?.name}" esnafımıza aittir. Genel mağazaya dönmek için lütfen önce sepetinizi boşaltın veya siparişinizi tamamlayın.`);
                        return;
                      }
                      onSelectDealer(null); // Clear dealer selection to return to main customer view
                      setIsViewingPrivatePage(false);
                    }}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    ← Genel Merkez Mağazasına Dön
                  </button>
                  <p className="text-[10px] text-slate-400 text-center leading-normal">
                    Genel merkez mağazasına dönerek tüm esnafların ortak havuzunu ve diğer kategorileri inceleyebilirsiniz.
                  </p>
                </div>
              )}
              {/* Physical Location Detail Card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
                <h4 className="font-display font-bold text-xs text-slate-900 uppercase">📍 ESNAF LOKAL BİLGİLERİ</h4>
                <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
                  <p><strong>Dükkan Sorumlusu:</strong> {selectedDealer.owner}</p>
                  <p><strong>Telefon:</strong> {selectedDealer.phone}</p>
                  <p><strong>E-posta:</strong> {selectedDealer.email}</p>
                  <p><strong>Adres:</strong> {selectedDealer.address}</p>
                  <p><strong>Bölge:</strong> {selectedDealer.city} / {selectedDealer.district}</p>
                </div>
              </div>
            </div>

            {/* Product Showcase Catalog */}
            <div className="lg:col-span-3 space-y-6">
              {/* Esnaf Özel Vitrin Katalog Seçici */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="font-display font-extrabold text-sm text-slate-900">
                    {privateStoreTab === 'special' ? '🏪 Esnafın Kendi Özel Ürünleri' : '📦 Platform Ortak Ürünleri'}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    {privateStoreTab === 'special'
                      ? (isReferralLocked
                        ? 'Bu bayinin kendi fiziksel stoğundan eklediği ve yönettiği ürünler.'
                        : '⚠️ Özel ürünler sadece esnafın kendi paylaşım linki (QR/Kod) ile erişilebilir. Linki esnaftan isteyiniz.')
                      : 'Merkez depomuzdaki ortak ürünler. Siparişiniz yine bu esnaf tarafından sevk edilir.'}
                  </p>
                </div>
                
                <div className="flex p-1 bg-slate-100 rounded-xl w-full sm:w-auto self-stretch sm:self-auto shrink-0">
                  <button
                    onClick={() => {
                      if (!isReferralLocked) {
                        alert('Özel ürünler sadece esnafın kendi paylaşım linki (QR/Kod) ile erişilebilir. Linki esnaftan isteyiniz.');
                        return;
                      }
                      setPrivateStoreTab('special');
                      setSelectedCategory('All');
                    }}
                    disabled={!isReferralLocked}
                    className={`flex-1 sm:flex-none py-1.5 px-3.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      !isReferralLocked
                        ? 'opacity-50 cursor-not-allowed'
                        : privateStoreTab === 'special'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Award className="w-3.5 h-3.5 text-amber-500" />
                    Özel Ürünleri ({products.filter(p => p.dealerId === selectedDealer.id).length})
                  </button>
                  <button
                    onClick={() => {
                      setPrivateStoreTab('central');
                      setSelectedCategory('All');
                    }}
                    className={`flex-1 sm:flex-none py-1.5 px-3.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      privateStoreTab === 'central'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Package className="w-3.5 h-3.5 text-blue-500" />
                    Ortak Ürünler ({products.filter(p => !p.dealerId).length})
                  </button>
                </div>
              </div>

              {/* Search and Category filters */}
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Butik, marka veya barkod ara..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-amber-500 focus:bg-white transition-all"
                  />
                </div>

                {/* Category tabs */}
                <div className="flex flex-wrap gap-1.5">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`py-1 px-2.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                        selectedCategory === cat
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-100'
                      }`}
                    >
                      {cat === 'All' ? 'Tüm Ürünler' : cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Display products */}
              {filteredProducts.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-2xs">
                  <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h4 className="font-display font-extrabold text-sm text-slate-900 mb-1">Aramanızla Eşleşen Ürün Bulunamadı</h4>
                  <p className="text-xs text-slate-500">Lütfen farklı bir anahtar kelime girmeyi veya diğer kategorileri filtrelemeyi deneyin.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredProducts.map(product => {
                    const isInCart = cartItems.find(item => item.product.id === product.id);
                    return (
                      <div key={product.id} className="relative group">
                        <StoreProductCard
                          product={product}
                          selectedDealer={selectedDealer}
                          isInCart={isInCart}
                          onAddToCart={handleProtectedAddToCart}
                          onProductClick={(product) => { if (requireMemberForShopping()) setSelectedProduct(product); }}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="relative bg-slate-950 rounded-3xl p-6 sm:p-8 overflow-hidden shadow-xl border border-slate-900 flex flex-col justify-center items-center">
            {/* Subtle brand visual glowing circles */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -ml-16 -mb-16 pointer-events-none"></div>

            {/* Title / Badge to keep it structured and visually appealing */}
            <div className="relative z-10 text-center mb-6 space-y-3 flex flex-col items-center">
              <div className="flex flex-wrap gap-2 justify-center">
                <span className="bg-amber-500 text-slate-950 text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                  ⚡ HIZLI DETAY VE ÜRÜN İNCELEME
                </span>
                {selectedDealer && (
                  <span className="bg-emerald-600 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                    🏪 DESTEKLENEN BAYİ: {selectedDealer.name}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-medium max-w-xl">
                İncelemek istediğiniz ürünün üzerine tıklayabilir, fareyi üzerine getirerek akışı durdurabilirsiniz.
              </p>
            </div>

            {/* Full-width Sliding Track */}
            <div className="relative w-full overflow-hidden select-none z-10 flex items-center py-4">
              <div className="animate-bg-scroll flex gap-6">
                {bgProducts.map((p, idx) => (
                  <div 
                    key={`${p.id}-hero-bg-${idx}`} 
                    onClick={() => {
                      if (storeSettings?.enableProductModal !== false) {
                        setSelectedProduct(p);
                      }
                    }}
                    className="bg-white rounded-2xl p-5 w-64 h-72 sm:w-72 sm:h-80 flex flex-col items-center justify-between shrink-0 shadow-lg border border-slate-200 cursor-pointer transform hover:scale-[1.03] active:scale-95 transition-all group/card relative animate-none"
                  >
                    {/* Brand Badge */}
                    <span className="absolute top-3 left-3 bg-slate-100 text-slate-700 text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      {p.brand}
                    </span>
                    
                    {/* Price Tag */}
                    <span className="absolute top-3 right-3 bg-amber-500 text-slate-950 text-[10px] font-extrabold px-2 py-0.5 rounded-full font-mono">
                      {p.price.toFixed(2)} TL
                    </span>

                    {/* Image */}
                    <div className="h-40 w-40 sm:h-44 sm:w-44 flex items-center justify-center p-2 bg-slate-50 rounded-xl shadow-xs border border-slate-100/60 mt-4 group-hover/card:bg-white transition-colors">
                      <img src={p.image} alt={p.name} loading="lazy" decoding="async" referrerPolicy="no-referrer" className="max-h-full max-w-full object-contain filter drop-shadow-xs group-hover/card:scale-105 transition-transform duration-300" />
                    </div>

                    {/* Footer Info */}
                    <div className="w-full text-center mt-3 space-y-1">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-800 truncate px-1 group-hover/card:text-amber-600 transition-colors">
                        {p.name}
                      </h4>
                      <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 font-extrabold uppercase group-hover/card:text-slate-600 transition-colors">
                        Detayları İncele →
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

      {/* Sektör Seçimi ve Özel Sayfa Yönlendirme */}
      <div className="bg-slate-50 border border-slate-200/60 rounded-3xl p-6 mb-8" id="sector-shopping-options">
        {selectedDealer ? (
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6">
            <div className="space-y-3 flex-1">
              <div className="flex items-center gap-2">
                <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                  🏪 AKTİF SEÇİLİ ESNAF BAYİSİ
                </span>
                <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                  {selectedDealer.sector || 'Genel Sektör'}
                </span>
              </div>
              <h3 className="font-display font-extrabold text-xl text-slate-900">
                {selectedDealer.name} Dijital Mağazası
              </h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Bu bayimizin özel vitrinine yönlendirilen butonu kullanarak kendisinin hazırladığı özel duyuruları, paylaşımları ve detayları görüntüleyebilirsiniz. Ayrıca alışveriş yapmak istediğiniz sektörü aşağıdan kolayca seçebilirsiniz!
              </p>

              {/* Sektör Seçim Butonları */}
              <div className="pt-2 space-y-2">
                <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  🛍️ Alışveriş Sektörü Seçin:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {['Kırtasiye', 'Hediyelik Eşya', 'İç Giyim', 'Elektronik', 'Giyim', 'Ayakkabı', 'Takılar'].map(sec => {
                    const isSecSelected = customerSelectedSector === sec;
                    return (
                      <button
                        key={sec}
                        id={`customer-sec-btn-${sec}`}
                        onClick={() => setCustomerSelectedSector(sec)}
                        className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                          isSecSelected
                            ? 'bg-amber-500 text-slate-950 border-amber-500 font-extrabold shadow-sm'
                            : 'bg-white text-slate-600 hover:bg-slate-100 border-slate-200'
                        }`}
                      >
                        {sec}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-center items-center p-6 bg-white border border-slate-150 rounded-2xl lg:w-80 shrink-0 gap-3 text-center">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">YÖNLENDİRME MERKEZİ</span>
              <p className="text-[11px] text-slate-500">Esnafımızın özel fırsatlarına, karekoduna ve bağlantı paylaşım paneline erişmek için tıklayın:</p>
              
              {!isViewingPrivatePage ? (
                <button
                  id="go-to-private-store-btn"
                  onClick={() => setIsViewingPrivatePage(true)}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold py-3 px-4 rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md active:scale-95"
                >
                  🏪 Esnafın Özel Sayfasına Git →
                </button>
              ) : (
                <div className="w-full bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-emerald-800 text-xs font-bold flex items-center justify-center gap-1">
                  ✓ Özel Vitrinde Bulunuyorsunuz
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-4">
            <div className="space-y-1">
              <h3 className="font-display font-extrabold text-base text-slate-900 flex items-center gap-2">
                ⚠️ Lütfen Alışverişe Başlamak İçin Esnaf Bayi Seçin
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Super Merkez esnaf koruma modelinde her sipariş bir esnaf bayi ile eşleştirilir. Sektör bazlı komisyon avantajları bu sayede esnafa yönlendirilir.
              </p>
            </div>
            <button
              id="warning-select-dealer-btn"
              onClick={() => handleProtectedDealerSelector('All')}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold py-2.5 px-5 rounded-xl text-xs transition-all shadow-md shrink-0 cursor-pointer"
            >
              Esnaf Listesini Gör & Bayi Seç
            </button>
          </div>
        )}
      </div>

      {/* Main Catalog View */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Category Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-2xs">
            <h3 className="font-display font-bold text-sm text-slate-900 tracking-tight uppercase">
              Kategoriler
            </h3>
            <div className="flex flex-col gap-1">
              {categories.map(cat => {
                const count = cat === 'All'
                  ? currentTabProducts.length
                  : currentTabProducts.filter(p => p.category === cat).length;
                return (
                  <button
                    id={`cat-btn-${cat}`}
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`flex justify-between items-center px-3.5 py-2.5 rounded-xl text-xs font-semibold text-left transition-all cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <span>{cat === 'All' ? 'Tüm Ürünler' : cat}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                      selectedCategory === cat ? 'bg-slate-950/15 text-slate-950' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Banner inside sidebar */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3 shadow-2xs">
            <h4 className="font-display font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Info className="w-4 h-4 text-amber-500" />
              Sistem İşleyişi
            </h4>
            <ul className="text-xs text-slate-500 space-y-2 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0"></span>
                <span>Ürünler merkezden tek elden yüklenir ve listelenir.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0"></span>
                <span>Müşteri harita veya listeden kendi bayisini seçer.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0"></span>
                <span>Ödemeler merkez ana hesabına aktarılır.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0"></span>
                <span className="font-medium text-slate-700">Bayi, her satıştan kazanılan desteği kendi paneline nakit bakiye olarak çeker.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Product Catalog Grid */}
        <div className="lg:col-span-3 space-y-6">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
            <div className="relative w-full sm:max-w-xs">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="product-search-input"
                type="text"
                placeholder="Ürün, marka veya barkod ara..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/10 transition-all"
              />
            </div>
            <div className="text-xs text-slate-500 font-semibold self-end sm:self-auto shrink-0">
              Gösterilen Ürün: <span className="text-slate-800">{filteredProducts.length} adet</span>
            </div>
          </div>

          {/* Products Cards */}
          {filteredProducts.length === 0 ? (
            <div className="text-center py-16 bg-white border border-slate-200 rounded-3xl">
              <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h4 className="text-base font-bold text-slate-800">Ürün Bulunamadı</h4>
              <p className="text-xs text-slate-500 mt-1">Arama kriterlerinizle eşleşen kırtasiye ürünü bulunamadı.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6" id="products-grid">
              {filteredProducts.map(product => {
                const isInCart = cartItems.find(item => item.product.id === product.id);
                return (
                  <StoreProductCard
                    key={product.id}
                    product={product}
                    selectedDealer={selectedDealer}
                    isInCart={isInCart}
                    onAddToCart={handleProtectedAddToCart}
                    onProductClick={(p) => {
                      if (storeSettings?.enableProductModal !== false && requireMemberForShopping()) {
                        setSelectedProduct(p);
                      }
                    }}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 1. SEÇTİKLERİMİZ & ÖNE ÇIKAN KOLEKSİYONLAR */}
      {storeSettings?.featuredProductIds && storeSettings.featuredProductIds.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xs animate-fade-in" id="featured-collections-section">
          <div className="border-b border-slate-100 pb-4 flex justify-between items-center">
            <div className="space-y-1">
              <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                YÖNETİCİNİN SEÇİMİ
              </span>
              <h3 className="font-display font-extrabold text-xl sm:text-2xl text-slate-900 tracking-tight">
                {storeSettings.featuredTitle || 'Öne Çıkan Koleksiyon Ürünleri'}
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-semibold bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100 font-mono">
              ★ Editör Seçimi
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products
              .filter(p => storeSettings.featuredProductIds?.includes(p.id))
              .map(product => {
                const isInCart = cartItems.find(item => item.product.id === product.id);
                return (
                  <div
                    key={product.id}
                    onClick={() => {
                      if (storeSettings?.enableProductModal !== false) {
                        setSelectedProduct(product);
                      }
                    }}
                    className="border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between hover:shadow-lg hover:border-amber-400 transition-all bg-amber-50/5 relative group overflow-hidden cursor-pointer"
                  >
                    <div className="absolute top-3 left-3 z-10">
                      <span className="bg-amber-500 text-slate-950 text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-0.5 shadow-sm">
                        ★ Öne Çıkan
                      </span>
                    </div>
                    
                    <div className="h-32 w-full mb-3 rounded-lg overflow-hidden bg-white relative flex items-center justify-center p-2 border border-slate-100">
                      <img
                        src={product.image}
                        alt={product.name}
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                        className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>

                    <div className="space-y-1 flex-1 flex flex-col justify-between">
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{product.brand}</span>
                        <h4 className="font-display font-bold text-xs text-slate-800 line-clamp-1">{product.name}</h4>
                        <p className="text-[11px] text-slate-400 line-clamp-2 h-8 leading-tight">{product.description}</p>
                      </div>
                      <div className="pt-2 flex justify-between items-center">
                        <span className="text-sm font-bold text-slate-900 font-mono">{product.price.toFixed(2)} TL</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleProtectedAddToCart(product);
                          }}
                          className="bg-amber-500 hover:bg-amber-600 text-slate-950 p-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer shadow-xs"
                        >
                          <ShoppingCart className="w-3 h-3" />
                          {isInCart ? `(${isInCart.quantity})` : 'Ekle'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {storeSettings?.brandMarqueeEnabled !== false && brandMarqueeImages.length > 0 && (
        <section className="brand-marquee" aria-label="Markalarımız">
          <div className="brand-marquee__heading">
            <span className="brand-marquee__eyebrow">MARKALARIMIZ</span>
            <h3 className="brand-marquee__title">{storeSettings?.brandMarqueeTitle || 'Güvendiğimiz Markalar'}</h3>
          </div>
          <div className="brand-marquee__viewport">
            <div className="brand-marquee__track">
              {[...Array(2)].flatMap((_, groupIndex) =>
                brandMarqueeImages.map((imageUrl, itemIndex) => (
                  <div className="brand-marquee__card" key={`${groupIndex}-${itemIndex}`} aria-hidden={groupIndex === 1}>
                    <img
                      src={imageUrl}
                      alt={groupIndex === 0 ? 'Marka görseli' : ''}
                      loading="lazy"
                      decoding="async"
                      className="brand-marquee__image"
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      )}


        </>
      )}


      <footer className="store-footer" id="store-footer">
        <div className="store-footer__content">
          <section className="store-footer__intro">
            <span className="store-footer__eyebrow">BUĞURCA KIRTASİYE</span>
            <h3 className="store-footer__title">Buğurca Kırtasiye</h3>
            <p className="store-footer__company">EFEKTİF TEKNOLOJİ İÇ VE DIŞ TİCARET LİMİTED ŞİRKETİ</p>
            <p className="store-footer__description">Yerel kırtasiye esnaflarını teknolojiyle buluşturan, adil komisyon ve şeffaf hakediş altyapısıyla esnafı destekleyen e-ticaret ve bayi yönetim sistemi.</p>
            <div className="store-footer__trust-list" aria-label="Güvenlik bilgileri">
              <span>256-Bit SSL Koruması</span>
              <span>3D Secure Güvenli Ödeme</span>
            </div>
          </section>

          <div className="store-footer__columns">
            <section>
              <h4 className="store-footer__heading">Mevzuat ve Sözleşmeler</h4>
              <nav className="store-footer__links" aria-label="Mevzuat ve sözleşmeler">
                <a href="/mesafeli-satis-sozlesmesi">Mesafeli Satış Sözleşmesi</a>
                <a href="/on-bilgilendirme-formu">Ön Bilgilendirme Formu</a>
                <a href="/iptal-iade-kosullari">İptal ve İade Koşulları</a>
                <a href="/kvkk-aydinlatma-metni">KVKK Aydınlatma Metni</a>
                <a href="/kargo-teslimat-kosullari">Kargo ve Teslimat Koşulları</a>
              </nav>
            </section>
            <section>
              <h4 className="store-footer__heading">Müşteri Hizmetleri</h4>
              <div className="store-footer__contact">
                <a href="tel:+905072497646"><Phone className="w-3.5 h-3.5" /> Müşteri Destek: 0507 249 76 46</a>
                <a href="mailto:bugurcagroup@gmail.com"><Mail className="w-3.5 h-3.5" /> E-Posta: bugurcagroup@gmail.com</a>
                <span>Çalışma Saatleri: Hafta içi 08:30 - 18:30 | Cumartesi 09:00 - 15:00</span>
              </div>
            </section>
            <section>
              <h4 className="store-footer__heading">Ödeme Yöntemleri</h4>
              <div className="store-footer__payment-list" aria-label="Ödeme yöntemleri">
                <span>TROY</span><span>VISA</span><span>MASTERCARD</span><span>MAESTRO</span>
              </div>
            </section>
          </div>

          <section className="store-footer__company-info">
            <h4>Buğurca Kırtasiye</h4>
            <p><strong>EFEKTİF TEKNOLOJİ İÇ VE DIŞ TİCARET LİMİTED ŞİRKETİ</strong></p>
            <p>Adres: Yusufpaşa Mah. 886 Sk. Dünya İş Merkezi No: 15/C Eyyübiye / ŞANLIURFA | Tel: <a href="tel:+905072497646">0507 249 76 46</a> | E-posta: <a href="mailto:bugurcagroup@gmail.com">bugurcagroup@gmail.com</a></p>
            <p>Vergi No: Topçumeydanı V.D. / 141 067 9904 | Tic. Sicil No: 23529 | Mersis No: 0141067990400001</p>
          </section>
        </div>
      </footer>

      {/* Cart Drawer Overlay */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex justify-end animate-fade-in" id="cart-drawer">
          <div className="bg-white w-full max-w-md h-full flex flex-col shadow-2xl relative border-l border-slate-100">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-amber-500" />
                <h3 className="font-display font-bold text-base text-slate-900">Alışveriş Sepeti</h3>
              </div>
              <button
                id="close-cart-btn"
                onClick={onCloseCart}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-200/50 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Dealer Match Alert */}
              {selectedDealer ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex gap-2.5 items-start text-xs text-amber-900">
                  <Store className="w-5 h-5 text-amber-500 shrink-0" />
                  <div>
                    Bu alışverişiniz <strong className="text-amber-950 font-bold">{selectedDealer.name}</strong> bayimiz ile ilişkilendirildi.
                  </div>
                </div>
              ) : (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 flex gap-2.5 items-start text-xs text-rose-900">
                  <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
                  <div>
                    Alışverişinizi tamamlayabilmek için bir bayi seçmelisiniz.
                    <button
                      id="cart-select-dealer-trigger"
                      onClick={() => handleProtectedDealerSelector()}
                      className="text-rose-700 underline font-semibold block mt-1 hover:text-rose-900 cursor-pointer"
                    >
                      Bayi Seçmek İçin Tıklayın
                    </button>
                  </div>
                </div>
              )}

              {/* Items List */}
              {cartItems.length === 0 ? (
                <div className="text-center py-20">
                  <ShoppingBag className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-400 text-xs font-semibold">Sepetiniz henüz boş.</p>
                  <button
                    id="cart-start-shopping-btn"
                    onClick={onCloseCart}
                    className="mt-4 bg-slate-900 text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-slate-850 transition-all cursor-pointer"
                  >
                    Kataloğa Dön
                  </button>
                </div>
              ) : (
                <div className="space-y-4" id="cart-items-list">
                  {cartItems.map(item => (
                    <div
                      id={`cart-item-${item.product.id}`}
                      key={item.product.id}
                      className="flex gap-4 p-3 bg-slate-50 border border-slate-100 rounded-xl items-center justify-between"
                    >
                      <img
                        src={item.product.image}
                        alt={item.product.name}
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                        className="w-12 h-12 object-contain rounded-lg bg-white p-1"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-xs text-slate-800 truncate">
                          {item.product.name}
                        </h4>
                        <span className="text-[10px] text-slate-500 block font-mono">
                          {getProductUnitPrice(item.product, item.saleUnit).toFixed(2)} TL × {item.quantity} {getProductUnitLabel(item.saleUnit)}
                        </span>
                        <select
                          value={item.saleUnit}
                          onChange={event => onUpdateCartUnit(item.product.id, event.target.value as SaleUnit)}
                          className="mt-1 bg-white border border-slate-200 rounded-md text-[10px] px-1.5 py-1 text-slate-700"
                          aria-label={`${item.product.name} satış birimi`}
                        >
                          <option value="piece">Adet</option>
                          {(item.product.dozenQuantity || item.product.dozenPrice) && <option value="dozen">Düzine</option>}
                          {(item.product.boxQuantity || item.product.boxPrice) && <option value="box">Koli</option>}
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Control buttons */}
                        <div className="flex items-center border border-slate-200 rounded-lg bg-white p-0.5">
                          <button
                            id={`decrease-qty-btn-${item.product.id}`}
                            onClick={() => onUpdateCartQuantity(item.product.id, item.quantity - 1)}
                            className="text-slate-500 hover:bg-slate-100 p-1 rounded-sm cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-2 text-xs font-bold text-slate-800">{item.quantity}</span>
                          <button
                            id={`increase-qty-btn-${item.product.id}`}
                            onClick={() => onUpdateCartQuantity(item.product.id, item.quantity + 1)}
                            className="text-slate-500 hover:bg-slate-100 p-1 rounded-sm cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Remove */}
                        <button
                          id={`remove-cart-item-btn-${item.product.id}`}
                          onClick={() => onRemoveFromCart(item.product.id)}
                          className="text-slate-400 hover:text-rose-600 p-1.5 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer Summary & Checkout */}
            {cartItems.length > 0 && (
              <div className="p-6 border-t border-slate-100 bg-slate-50 space-y-4 shrink-0">
                <div className="space-y-1.5 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>Ara Toplam (KDV Dahil)</span>
                    <span className="font-semibold font-mono">{cartTotal.toFixed(2)} TL</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sanal Kargo</span>
                    <span className="text-emerald-600 font-bold">Ücretsiz</span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-slate-900 pt-2 border-t border-slate-200">
                    <span>Genel Toplam</span>
                    <span className="font-mono text-amber-600">{cartTotal.toFixed(2)} TL</span>
                  </div>
                </div>

                <button
                  id="cart-checkout-btn"
                  onClick={() => {
                    if (!selectedDealer) {
                      handleProtectedDealerSelector();
                    } else {
                      setCheckoutOrderReference(`sip-${Date.now().toString().slice(-6)}`);
                      setIsCheckoutModalOpen(true);
                    }
                  }}
                  className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition-all text-sm flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                >
                  <CreditCard className="w-4 h-4" />
                  Ödeme Aşamasına Geç
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Checkout Modal (Simulating credit card payment and Central Pool concept) */}
      {isCheckoutModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in" id="checkout-modal">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 relative max-h-[90vh] flex flex-col">
            <button
              id="close-checkout-modal"
              onClick={() => setIsCheckoutModalOpen(false)}
              className="text-slate-400 hover:text-slate-600 p-1 bg-slate-50 rounded-lg absolute top-4 right-4 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {isProcessingPayment && (
              <div className="absolute inset-0 bg-white/95 backdrop-blur-xs z-50 rounded-2xl flex flex-col items-center justify-center p-6 space-y-4">
                <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                <div className="text-center">
                  <h4 className="font-display font-extrabold text-base text-slate-900">Ödeme Provizyonu Alınıyor...</h4>
                  <p className="text-xs text-slate-500 mt-1">Sanal POS ile Merkez Havuz Hesabı üzerinden güvenli işlem yapılıyor.</p>
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5 text-xs text-amber-800 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                  <strong>Sandbox / Test Modu Aktif</strong>
                </div>
              </div>
            )}

            {!isOrderSuccess ? (
              <form onSubmit={handleCheckoutSubmit} className="space-y-4 flex-1 overflow-y-auto pr-1">
                <div className="text-center pb-2 border-b border-slate-100">
                  <h3 className="font-display font-bold text-lg text-slate-900">Merkezi Ödeme Ekranı</h3>
                  <p className="text-xs text-slate-500">
                    Sanal POS ödemesi doğrudan merkez havuz hesabına aktarılacaktır.
                  </p>
                </div>

                {/* Dealer matched details inside form */}
                {selectedDealer && (
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-900 flex items-center gap-2">
                    <Store className="w-4 h-4 text-blue-600 shrink-0" />
                    <div>
                      Siparişiniz <strong className="font-bold">{selectedDealer.name}</strong> bayimiz ile ilişkilendirilecektir.
                    </div>
                  </div>
                )}

                {/* Form fields */}
                <div className="space-y-4">
                  <div className="border-b border-slate-100 pb-2">
                    <span className="text-xs font-bold text-slate-700 tracking-wider uppercase block">
                      1. İletişim Bilgileri
                    </span>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Ad Soyad *</label>
                    <input
                      id="customer-name-input"
                      type="text"
                      required
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                      placeholder="Ahmet Yılmaz"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:border-amber-500 focus:bg-white focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">E-posta Adresi *</label>
                      <input
                        id="customer-email-input"
                        type="email"
                        required
                        value={customerEmail}
                        onChange={e => setCustomerEmail(e.target.value)}
                        placeholder="ahmet@example.com"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:border-amber-500 focus:bg-white focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Telefon Numarası *</label>
                      <input
                        id="customer-phone-input"
                        type="tel"
                        required
                        value={customerPhone}
                        onChange={e => setCustomerPhone(e.target.value)}
                        placeholder="0532 123 45 67"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:border-amber-500 focus:bg-white focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  <div className="border-b border-slate-100 pt-2 pb-2">
                    <span className="text-xs font-bold text-slate-700 tracking-wider uppercase block">
                      2. Kargo Entegrasyonu & Teslimat Bilgileri
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Kargo Firması *</label>
                      <select
                        value={shippingCompany}
                        onChange={e => setShippingCompany(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:border-amber-500 focus:bg-white focus:ring-1 focus:ring-amber-500"
                      >
                        <option value="Yurtiçi Kargo">Yurtiçi Kargo</option>
                        <option value="Aras Kargo">Aras Kargo</option>
                        <option value="MNG Kargo">MNG Kargo</option>
                        <option value="PTT Kargo">PTT Kargo</option>
                        <option value="Trendyol Express">Trendyol Express</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Alıcı Ad Soyad *</label>
                      <input
                        type="text"
                        required
                        value={shippingReceiver}
                        onChange={e => setShippingReceiver(e.target.value)}
                        placeholder="Alıcının Adı Soyadı"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:border-amber-500 focus:bg-white focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Alıcı Telefonu *</label>
                      <input
                        type="tel"
                        required
                        value={shippingPhone}
                        onChange={e => setShippingPhone(e.target.value)}
                        placeholder="Telefon"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:border-amber-500 focus:bg-white focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Şehir *</label>
                      <select
                        value={shippingCity}
                        onChange={e => setShippingCity(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:border-amber-500"
                      >
                        {TURKISH_CITIES.map(city => (
                          <option key={city} value={city}>{city}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">İlçe *</label>
                      <input
                        type="text"
                        required
                        value={shippingDistrict}
                        onChange={e => setShippingDistrict(e.target.value)}
                        placeholder="Örn: Kadıköy"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Açık Adres *</label>
                      <textarea
                        required
                        rows={2}
                        value={shippingAddress}
                        onChange={e => setShippingAddress(e.target.value)}
                        placeholder="Detaylı kargo teslimat adresi..."
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:border-amber-500 focus:bg-white focus:ring-1 focus:ring-amber-500 resize-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3 bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-bold text-indigo-900">3. Fatura Bilgilerini Girin</p>
                    <div className="flex gap-2 text-[10px] font-bold">
                      <label className="flex items-center gap-1">
                        <input type="radio" name="invoice-type" checked={invoiceType === 'individual'} onChange={() => setInvoiceType('individual')} /> Bireysel
                      </label>
                      <label className="flex items-center gap-1">
                        <input type="radio" name="invoice-type" checked={invoiceType === 'corporate'} onChange={() => setInvoiceType('corporate')} /> Kurumsal
                      </label>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input required value={invoiceFullName} onChange={event => setInvoiceFullName(event.target.value)} placeholder="Ad Soyad *" className="w-full px-3 py-2 bg-white border border-indigo-100 rounded-lg text-xs text-slate-900" />
                    {invoiceType === 'individual' ? (
                      <input required value={invoiceNationalId} onChange={event => setInvoiceNationalId(event.target.value)} inputMode="numeric" maxLength={11} placeholder="T.C. Kimlik No *" className="w-full px-3 py-2 bg-white border border-indigo-100 rounded-lg text-xs text-slate-900" />
                    ) : (
                      <input required value={invoiceCompanyName} onChange={event => setInvoiceCompanyName(event.target.value)} placeholder="Firma Unvanı *" className="w-full px-3 py-2 bg-white border border-indigo-100 rounded-lg text-xs text-slate-900" />
                    )}
                  </div>
                  {invoiceType === 'corporate' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input required value={invoiceTaxNumber} onChange={event => setInvoiceTaxNumber(event.target.value)} inputMode="numeric" placeholder="Vergi Numarası *" className="w-full px-3 py-2 bg-white border border-indigo-100 rounded-lg text-xs text-slate-900" />
                      <input required value={invoiceTaxOffice} onChange={event => setInvoiceTaxOffice(event.target.value)} placeholder="Vergi Dairesi *" className="w-full px-3 py-2 bg-white border border-indigo-100 rounded-lg text-xs text-slate-900" />
                    </div>
                  )}
                  <textarea required rows={2} value={invoiceAddress} onChange={event => setInvoiceAddress(event.target.value)} placeholder="Fatura adresi *" className="w-full px-3 py-2 bg-white border border-indigo-100 rounded-lg text-xs text-slate-900 resize-none" />
                  <div className="grid grid-cols-2 gap-3">
                    <select value={invoiceCity} onChange={event => setInvoiceCity(event.target.value)} className="w-full px-3 py-2 bg-white border border-indigo-100 rounded-lg text-xs text-slate-900">
                      {TURKISH_CITIES.map(city => <option key={city} value={city}>{city}</option>)}
                    </select>
                    <input required value={invoiceDistrict} onChange={event => setInvoiceDistrict(event.target.value)} placeholder="İlçe *" className="w-full px-3 py-2 bg-white border border-indigo-100 rounded-lg text-xs text-slate-900" />
                  </div>
                </div>

                <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <p className="text-xs font-bold text-slate-700">4. Ödeme yöntemi seçin</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <label className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-bold cursor-pointer ${paymentMethod === 'card' ? 'bg-amber-50 border-amber-300 text-amber-900' : 'bg-white border-slate-200 text-slate-600'}`}>
                      <input type="radio" name="payment-method" checked={paymentMethod === 'card'} onChange={() => { setPaymentMethod('card'); setIsSandboxMode(true); }} /> Kart ile ödeme
                    </label>
                    <label className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-bold cursor-pointer ${paymentMethod === 'bank_transfer' ? 'bg-amber-50 border-amber-300 text-amber-900' : 'bg-white border-slate-200 text-slate-600'}`}>
                      <input type="radio" name="payment-method" checked={paymentMethod === 'bank_transfer'} onChange={() => { setPaymentMethod('bank_transfer'); setIsSandboxMode(false); }} /> Banka havalesi / EFT
                    </label>
                  </div>
                </div>

                {/* Bank transfer account details and receipt upload */}
                {paymentMethod === 'bank_transfer' && <div className="space-y-3 bg-amber-50 p-4 rounded-xl border border-amber-200">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-900"><FileText className="w-4 h-4" /> Banka Havalesi / EFT</div>
                  <p className="text-[11px] text-amber-800">Aşağıdaki ortak havuz hesabına <strong>{cartTotal.toFixed(2)} TL</strong> gönderin. Dekontu yüklemeden önce banka açıklama alanına aşağıdaki sipariş numarasını yazın. Yönetici onayından sonra siparişiniz işleme alınır.</p>
                  <div className="bg-white border-2 border-amber-300 rounded-xl p-3 space-y-1">
                    <span className="block text-[10px] font-bold text-amber-700 uppercase tracking-wide">Havale açıklamasına yazılacak sipariş numarası</span>
                    <strong className="block font-mono text-lg text-slate-900 tracking-wider select-all">{checkoutOrderReference}</strong>
                    <span className="block text-[10px] text-slate-500">Bu numarayı banka transferinin açıklama alanına yazdıktan sonra dekontu yükleyin.</span>
                  </div>
                  <div className="bg-white border border-amber-200 rounded-xl p-3 space-y-1.5 text-[11px] text-slate-700">
                    <p><strong>Banka:</strong> {storeSettings?.centralBankName || 'Banka bilgisi henüz tanımlanmadı'}</p>
                    <p><strong>Hesap sahibi:</strong> {storeSettings?.centralAccountHolder || 'Hesap sahibi bilgisi henüz tanımlanmadı'}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <strong>IBAN:</strong>
                      <span className="font-mono font-bold break-all text-slate-900">{storeSettings?.centralIban || 'IBAN bilgisi henüz tanımlanmadı'}</span>
                      {storeSettings?.centralIban && <button type="button" onClick={() => navigator.clipboard?.writeText(storeSettings.centralIban || '')} className="shrink-0 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg px-2 py-1 text-[10px] font-bold cursor-pointer">IBAN Kopyala</button>}
                    </div>
                    {storeSettings?.centralBankInstructions && <p className="border-t border-amber-100 pt-1.5"><strong>Not:</strong> {storeSettings.centralBankInstructions}</p>}
                  </div>
                  <div className="pt-1">
                    <div className="text-[11px] font-bold text-amber-900 mb-1">Banka Havalesi / EFT Dekontu *</div>
                    <input required type="file" accept="image/*,.pdf" disabled={isReceiptUploading} onChange={e => { const file = e.target.files?.[0]; if (file) void handleReceiptUpload(file); }} className="w-full text-xs disabled:opacity-50" />
                    {isReceiptUploading && <p className="text-[11px] font-bold text-amber-700 mt-1">Dekont optimize ediliyor ve Firebase Storage&apos;a yükleniyor...</p>}
                    {receiptFileName && !isReceiptUploading && <p className="text-[11px] font-bold text-emerald-700 mt-1">Dekont yüklendi: {receiptFileName}</p>}
                  </div>
                  {paymentError && <p className="text-[10px] text-rose-600 font-bold bg-rose-50 border border-rose-100 p-2 rounded-lg">⚠️ {paymentError}</p>}
                </div>}

                {/* Simulated payment card fields */}
                <div className={paymentMethod === 'card' ? 'space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200' : 'hidden'}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 tracking-wider uppercase flex items-center gap-1.5">
                      💳 Sanal POS Ödeme Entegrasyonu
                    </span>
                    <label className="inline-flex items-center gap-1 cursor-pointer bg-amber-100/60 border border-amber-200 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full select-none">
                      <input
                        type="checkbox"
                        checked={isSandboxMode}
                        onChange={e => setIsSandboxMode(e.target.checked)}
                        className="sr-only"
                      />
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Test / Sandbox Modu
                    </label>
                  </div>

                  {isSandboxMode && (
                    <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-dashed border-slate-200">
                      <span className="text-[10px] text-slate-500 font-medium">Test ödemesi için kart bilgisi üretilsin mi?</span>
                      <button
                        type="button"
                        onClick={() => {
                          setCardNumber('4355 8899 1234 5678');
                          setCardExpiry('12/28');
                          setCardCvc('345');
                          setPaymentError('');
                        }}
                        className="bg-slate-900 hover:bg-slate-800 text-white text-[9px] font-bold px-2 py-1 rounded-md transition-all cursor-pointer"
                      >
                        Bilgileri Otomatik Doldur
                      </button>
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Kart Numarası *</label>
                    <input
                      type="text"
                      required={false}
                      value={cardNumber}
                      onChange={e => {
                        let val = e.target.value.replace(/\D/g, '');
                        val = val.slice(0, 16);
                        const matches = val.match(/\d{4,16}/g);
                        const match = matches && matches[0] || '';
                        const parts = [];
                        for (let i = 0, len = match.length; i < len; i += 4) {
                          parts.push(match.substring(i, i + 4));
                        }
                        setCardNumber(parts.length > 0 ? parts.join(' ') : val);
                      }}
                      placeholder="4355 8899 1234 5678"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-mono"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Son Kullanma *</label>
                      <input
                        type="text"
                        required={false}
                        value={cardExpiry}
                        onChange={e => {
                          let val = e.target.value.replace(/\D/g, '');
                          if (val.length > 2) {
                            val = val.slice(0, 2) + '/' + val.slice(2, 4);
                          }
                          setCardExpiry(val.slice(0, 5));
                        }}
                        placeholder="MM / YY"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">CVC *</label>
                      <input
                        type="password"
                        required={false}
                        value={cardCvc}
                        onChange={e => setCardCvc(e.target.value.replace(/\D/g, '').slice(0, 3))}
                        placeholder="•••"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-mono"
                      />
                    </div>
                  </div>

                  {paymentError && (
                    <p className="text-[10px] text-rose-600 font-bold bg-rose-50 border border-rose-100 p-2 rounded-lg">
                      ⚠️ {paymentError}
                    </p>
                  )}

                  <p className="text-[10px] text-slate-400 text-center font-medium">
                    * Güvenli Sandbox Ortamı: Gerçek kart bilginiz kaydedilmez, her kart ile başarılı test ödemesi alınır.
                  </p>
                </div>

                {/* Hukuki ve Yasal Bilgilendirme Kutusu */}
                <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3 text-[10px] text-slate-500 space-y-1" id="checkout-legal-notice">
                  <span className="font-bold text-slate-700 block">⚖️ Hukuki ve Yasal Bilgilendirme:</span>
                  <p className="leading-relaxed">
                    Ödemeler doğrudan <strong>Buğurca Kırtasiye Merkez Havuzu</strong> adına kayıtlıdır. Fatura merkezce düzenli olarak kargo ile teslim edilir. Seçilen bayiye esnaf desteği iç sistem raporlarında tutularak hakediş prosedürüyle bayi hesabına yansıtılır.
                  </p>
                </div>

                <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-600">
                  <input type="checkbox" checked={hasAcceptedCheckoutTerms} onChange={e => setHasAcceptedCheckoutTerms(e.target.checked)} className="mt-0.5 shrink-0 accent-amber-500" />
                  <span><button type="button" onClick={() => setActiveLegalDocument('distance-sales')} className="font-bold text-amber-700 underline cursor-pointer">Mesafeli Satış Sözleşmesi&apos;ni</button> ve <button type="button" onClick={() => setActiveLegalDocument('pre-information')} className="font-bold text-amber-700 underline cursor-pointer">Ön Bilgilendirme Formu&apos;nu</button> okudum, onaylıyorum.</span>
                </div>
                <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-600">
                  <input type="checkbox" checked={hasAcceptedCheckoutKvkk} onChange={e => setHasAcceptedCheckoutKvkk(e.target.checked)} className="mt-0.5 shrink-0 accent-amber-500" />
                  <span><button type="button" onClick={() => setActiveLegalDocument('kvkk')} className="font-bold text-amber-700 underline cursor-pointer">KVKK Aydınlatma Metni&apos;ni</button> okudum, kabul ediyorum.</span>
                </div>

                <div className="pt-3">
                  <button
                    id="submit-payment-btn"
                    type="submit"
                    disabled={isProcessingPayment || !hasAcceptedCheckoutTerms || !hasAcceptedCheckoutKvkk}
                    className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition-all text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:bg-slate-400 disabled:cursor-not-allowed"
                  >
                    {isProcessingPayment ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Ödeme İşleniyor...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        {cartTotal.toFixed(2)} TL Ödemeyi Tamamla ve Siparişi İlet
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center py-8 space-y-5 flex-1 overflow-y-auto">
                <div className="bg-emerald-500 text-white w-14 h-14 rounded-full flex items-center justify-center mx-auto shadow-md">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-display font-extrabold text-xl text-slate-900">Sipariş Başarıyla Alındı!</h3>
                  <p className="text-xs text-emerald-600 font-semibold mt-1">Sipariş Numarası: {recentOrderId}</p>
                </div>

                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs text-slate-600 text-left space-y-2">
                  <p>
                    <strong>Sayın {customerName},</strong> eğitim siparişiniz için teşekkür ederiz! Merkez operasyonumuz hemen kargo hazırlıklarına başlamıştır.
                  </p>
                  <p>
                    Bu sipariş karşılığında <strong>{selectedDealer?.name}</strong> bayimizin hesabına esnaf desteği anında aktarılmıştır.
                  </p>
                  <p className="border-t border-slate-200/50 pt-2 text-[10px]">
                    <strong>Kargo Sevk Detayı:</strong> {shippingCompany} ile {shippingReceiver} ({shippingPhone}) adına kargolanacaktır. Adres: {shippingAddress}, {shippingDistrict}/{shippingCity}. Takip numarası sistem tarafından üretilmiştir: <strong className="font-mono text-amber-700 bg-amber-50 px-1 py-0.5 rounded">{`sip-${Date.now().toString().slice(-4)}`} sevk kodu ile otomatik entegre edilmiştir.</strong>
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    id="order-success-download-details-btn"
                    type="button"
                    onClick={handleDownloadOrderDetails}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg transition-all hover:scale-[1.01] border border-emerald-500 animate-pulse hover:animate-none"
                  >
                    <FileText className="w-4 h-4 text-emerald-200" />
                    Sipariş Bilgilerinizi İndirin
                  </button>

                  {orders.find(o => o.id === recentOrderId)?.customerDownloaded && (
                    <div className="text-[11px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-150 py-1.5 px-3 rounded-lg flex items-center justify-center gap-1">
                      ✓ Sipariş detayları müşteri tarafından indirilmiştir.
                    </div>
                  )}

                  <button
                    id="order-success-ok-btn"
                    onClick={handleCloseSuccess}
                    className="w-full bg-slate-900 text-white font-semibold py-2.5 rounded-xl text-xs hover:bg-slate-800 cursor-pointer"
                  >
                    Alışverişe Devam Et
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* "Bayimiz Olun" Dealer Application Modal */}
      {isApplicationModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in" id="dealer-application-modal">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 relative max-h-[90vh] flex flex-col">
            <button
              id="close-application-modal"
              onClick={handleCloseApplication}
              className="text-slate-400 hover:text-slate-600 p-1 bg-slate-50 rounded-lg absolute top-4 right-4 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {!isApplicationSuccess ? (
              <form onSubmit={handleApplicationSubmit} className="space-y-4 flex-1 overflow-y-auto pr-1">
                <div className="text-center pb-2 border-b border-slate-100">
                  <h3 className="font-display font-bold text-lg text-slate-900">Bayilik / Esnaf Başvuru Formu</h3>
                  <p className="text-xs text-slate-500">
                    Kendi mahallenizde Buğurca Kırtasiye bayisi olmak için bilgilerinizi iletin.
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Dükkan / Bayi Adı *</label>
                    <input
                      id="app-shop-name"
                      type="text"
                      required
                      value={appShopName}
                      onChange={e => setAppShopName(e.target.value)}
                      placeholder="Örn: Kuzey Kırtasiye Kitabevi"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:border-emerald-500 focus:bg-white focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Yetkili Esnaf Ad Soyad *</label>
                    <input
                      id="app-owner-name"
                      type="text"
                      required
                      value={appOwnerName}
                      onChange={e => setAppOwnerName(e.target.value)}
                      placeholder="Örn: Kemal Kuzey"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:border-emerald-500 focus:bg-white focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Hizmet Verdiğiniz Sektör *</label>
                    <select
                      id="app-sector"
                      value={appSector}
                      onChange={e => setAppSector(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:border-emerald-500 focus:bg-white focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="Kırtasiye">Kırtasiye</option>
                      <option value="Hediyelik Eşya">Hediyelik Eşya</option>
                      <option value="İç Giyim">İç Giyim</option>
                      <option value="Elektronik">Elektronik</option>
                      <option value="Giyim">Giyim</option>
                      <option value="Ayakkabı">Ayakkabı</option>
                      <option value="Takılar">Takılar</option>
                      <option value="Diğer Sektörler">Diğer Sektörler</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">İl (Şehir) *</label>
                      <select
                        id="app-city"
                        value={appCity}
                        onChange={e => setAppCity(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:border-emerald-500 focus:bg-white focus:ring-1 focus:ring-emerald-500"
                      >
                        {TURKISH_CITIES.map(city => (
                          <option key={city} value={city}>{city}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">İlçe *</label>
                      <input
                        id="app-district"
                        type="text"
                        required
                        value={appDistrict}
                        onChange={e => setAppDistrict(e.target.value)}
                        placeholder="Örn: Beşiktaş"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:border-emerald-500 focus:bg-white focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Telefon Numarası *</label>
                      <input
                        id="app-phone"
                        type="tel"
                        required
                        value={appPhone}
                        onChange={e => setAppPhone(e.target.value)}
                        placeholder="05..."
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">E-posta Adresi *</label>
                      <input
                        id="app-email"
                        type="email"
                        required
                        value={appEmail}
                        onChange={e => setAppEmail(e.target.value)}
                        placeholder="ornek@kirtasiye.com"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Bayi Giriş Şifresi * (Onaylandıktan sonra giriş yapmak için kullanılacak)</label>
                    <input
                      id="app-password"
                      type="password"
                      required
                      value={appPassword}
                      onChange={e => setAppPassword(e.target.value)}
                      placeholder="Giriş şifrenizi belirleyin..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:border-emerald-500 focus:bg-white focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Detaylı Fiziki Adres *</label>
                    <textarea
                      id="app-address"
                      required
                      rows={3}
                      value={appAddress}
                      onChange={e => setAppAddress(e.target.value)}
                      placeholder="Sokak, numara, mahalle ve bina detayları..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:border-emerald-500 focus:bg-white focus:ring-1 focus:ring-emerald-500 resize-none"
                    />
                  </div>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-[11px] text-emerald-950 leading-relaxed">
                  <strong>Hakediş Bilgilendirmesi:</strong> Başvurunuz yönetici (admin) panelindeki onay kuyruğuna düşecektir. Onaylandıktan sonra sistemde aktifleşecek, müşterileriniz sizi seçerek alışveriş yapabilecek ve her alışverişte belirlenen komisyon tutarı anında hakediş bakiyenize yansıyacaktır.
                </div>

                {applicationError && (
                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-[11px] text-rose-800" role="alert">
                    {applicationError}
                  </div>
                )}

                <div className="pt-2">
                  <button
                    id="submit-application-btn"
                    type="submit"
                    disabled={isApplicationSubmitting}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-100" />
                    {isApplicationSubmitting ? 'Başvuru gönderiliyor...' : 'Başvuruyu Tamamla ve Gönder'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center py-8 space-y-5 flex-1 overflow-y-auto">
                <div className="bg-emerald-500 text-white w-14 h-14 rounded-full flex items-center justify-center mx-auto shadow-md">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-display font-extrabold text-xl text-slate-900">Başvurunuz Alındı!</h3>
                  <p className="text-xs text-emerald-600 font-semibold mt-1">Başvurunuz incelenmek üzere sisteme kaydedildi.</p>
                </div>

                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs text-slate-600 text-left space-y-2">
                  <p>
                    Sayın <strong>{appOwnerName}</strong>, <strong>{appShopName}</strong> adlı dükkanınız için yaptığınız bayilik başvurusu başarıyla ulaştı.
                  </p>
                  <p>
                    Süper Admin onayından sonra bayiniz <strong>{appCity} ({appDistrict})</strong> listesinde aktifleşecektir. Bu aşamadan sonra sisteme bayi olarak giriş yapıp raporlarınızı inceleyebilirsiniz.
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    id="application-success-ok-btn"
                    onClick={handleCloseApplication}
                    className="w-full bg-slate-900 text-white font-semibold py-2.5 rounded-xl text-xs hover:bg-slate-800 cursor-pointer"
                  >
                    Anladım, Alışverişe Geri Dön
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Product Detail Modal with Hover Magnifier */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in" id="product-detail-modal">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl border border-slate-150 relative max-h-[92vh] flex flex-col overflow-hidden animate-scale-up">
            {/* Close Button */}
            <button
              id="close-product-detail-modal"
              onClick={() => setSelectedProduct(null)}
              className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-xl absolute top-4 right-4 cursor-pointer transition-all z-20"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Body */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1 overflow-y-auto pr-1">
              {/* Left Column: Image Gallery & Zoom */}
              <div className="space-y-4 flex flex-col justify-between">
                {/* Active Image Container with Zoom */}
                {(() => {
                  const images = selectedProduct.images && selectedProduct.images.length > 0 ? selectedProduct.images : [selectedProduct.image];
                  const currentImage = images[modalActiveImgIndex] || selectedProduct.image;
                  const zoomScale = storeSettings?.zoomScale || 2;
                  const enableZoom = storeSettings?.enableProductZoom !== false;

                  return (
                    <div className="flex-1 flex flex-col justify-center">
                      <div 
                        className="relative h-72 sm:h-96 w-full rounded-2xl border border-slate-100 bg-slate-50/50 flex items-center justify-center overflow-hidden cursor-crosshair select-none"
                        onMouseMove={(e) => {
                          if (!enableZoom) return;
                          const rect = e.currentTarget.getBoundingClientRect();
                          const mouseX = e.clientX - rect.left;
                          const mouseY = e.clientY - rect.top;
                          
                          // Percentage positions
                          const pctX = (mouseX / rect.width) * 100;
                          const pctY = (mouseY / rect.height) * 100;
                          
                          setZoomPos({ x: pctX, y: pctY, mouseX, mouseY });
                          setShowZoom(true);
                        }}
                        onMouseLeave={() => setShowZoom(false)}
                      >
                        {/* Base Image */}
                        <img
                          ref={modalImgRef}
                          src={currentImage}
                          alt={selectedProduct.name}
                          referrerPolicy="no-referrer"
                          className="max-h-[85%] max-w-[85%] object-contain pointer-events-none"
                        />

                        {/* Interactive Magnifying Glass */}
                        {enableZoom && showZoom && (
                          <div
                            className="absolute rounded-full border-2 border-amber-500 shadow-2xl pointer-events-none bg-white z-10"
                            style={{
                              width: '240px',
                              height: '240px',
                              left: `${zoomPos.mouseX - 120}px`,
                              top: `${zoomPos.mouseY - 120}px`,
                              backgroundImage: `url(${currentImage})`,
                              backgroundRepeat: 'no-repeat',
                              backgroundPosition: `${zoomPos.x}% ${zoomPos.y}%`,
                              backgroundSize: `${(zoomScale + 1.5) * 100}%`,
                            }}
                          />
                        )}

                        {/* Zoom Indicator Badge */}
                        {enableZoom && (
                          <div className="absolute top-3 right-3 bg-slate-900/85 text-white text-[10px] px-2 py-1 rounded-lg font-bold pointer-events-none flex items-center gap-1 font-sans z-10">
                            <Search className="w-3 h-3 text-amber-400" /> Görselde Yakınlaştır
                          </div>
                        )}
                      </div>

                      {/* Image Thumbnails strip */}
                      {images.length > 1 && (
                        <div className="flex gap-2 justify-center mt-3 overflow-x-auto py-1">
                          {images.map((img, idx) => (
                            <img
                              key={idx}
                              src={img}
                              alt={`thumb-${idx}`}
                              onClick={() => setModalActiveImgIndex(idx)}
                              className={`w-12 h-12 object-contain rounded-xl border-2 cursor-pointer p-1 bg-white transition-all ${
                                idx === modalActiveImgIndex ? 'border-amber-500 scale-105' : 'border-slate-200 opacity-60 hover:opacity-100'
                              }`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Right Column: Details & Adding Actions */}
              <div className="flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  {/* Category & Brand tags */}
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                      {selectedProduct.brand}
                    </span>
                    <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                      {selectedProduct.category}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400 font-mono">
                      Stok: {selectedProduct.stock} adet mevcut
                    </span>
                  </div>

                  {/* Name and Price */}
                  <div className="space-y-2">
                    <h2 className="font-display font-extrabold text-xl sm:text-2xl text-slate-900 leading-tight">
                      {selectedProduct.name}
                    </h2>
                    <div className="grid grid-cols-3 gap-2 text-[10px] font-semibold text-slate-500">
                      <span className="bg-slate-50 border border-slate-100 rounded-lg p-2 text-center">Adet<br /><strong className="text-slate-900">{getProductUnitPrice(selectedProduct, 'piece').toFixed(2)} TL</strong></span>
                      {selectedProduct.dozenQuantity || selectedProduct.dozenPrice ? <span className="bg-blue-50 border border-blue-100 rounded-lg p-2 text-center">Düzine ({getProductUnitQuantity(selectedProduct, 'dozen')} adet)<br /><strong className="text-blue-900">{getProductUnitPrice(selectedProduct, 'dozen').toFixed(2)} TL</strong></span> : <span />}
                      {selectedProduct.boxQuantity || selectedProduct.boxPrice ? <span className="bg-amber-50 border border-amber-100 rounded-lg p-2 text-center">Koli ({getProductUnitQuantity(selectedProduct, 'box')} adet)<br /><strong className="text-amber-900">{getProductUnitPrice(selectedProduct, 'box').toFixed(2)} TL</strong></span> : <span />}
                    </div>
                    <div className="text-2xl font-black text-slate-950 font-mono">
                      {getProductUnitPrice(selectedProduct, modalSelectedUnit).toFixed(2)} TL / {getProductUnitLabel(modalSelectedUnit)}
                    </div>
                  </div>

                  <hr className="border-slate-100" />

                  {/* Description */}
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ürün Açıklaması</h4>
                    <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      {selectedProduct.description}
                    </p>
                  </div>

                  {/* Premium Quality badge */}
                  <div className="flex items-center gap-2.5 p-3 bg-amber-50/50 border border-amber-200/40 rounded-xl">
                    <Award className="w-5 h-5 text-amber-500 shrink-0" />
                    <div>
                      <h5 className="font-bold text-xs text-slate-800">%100 Esnaf Dayanışması</h5>
                      <p className="text-[10px] text-slate-500">Bu üründen yapılacak alışveriş yerel kırtasiye bayinize can suyu olmaktadır.</p>
                    </div>
                  </div>
                </div>

                {/* Add to Cart Actions */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  {selectedDealer ? (
                    <div className="space-y-3">
                      {/* Unit and quantity selector */}
                      <div className="space-y-2 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                        <label className="text-xs font-bold text-slate-700 block">Satış Birimi:</label>
                        <select
                          value={modalSelectedUnit}
                          onChange={event => setModalSelectedUnit(event.target.value as SaleUnit)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700"
                        >
                          <option value="piece">Adet — {getProductUnitPrice(selectedProduct, 'piece').toFixed(2)} TL</option>
                          {(selectedProduct.dozenQuantity || selectedProduct.dozenPrice) && <option value="dozen">Düzine ({getProductUnitQuantity(selectedProduct, 'dozen')} adet) — {getProductUnitPrice(selectedProduct, 'dozen').toFixed(2)} TL</option>}
                          {(selectedProduct.boxQuantity || selectedProduct.boxPrice) && <option value="box">Koli ({getProductUnitQuantity(selectedProduct, 'box')} adet) — {getProductUnitPrice(selectedProduct, 'box').toFixed(2)} TL</option>}
                        </select>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-700">Miktar:</span>
                        <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-1 shadow-2xs">
                          <button
                            type="button"
                            onClick={() => setModalQuantity(q => Math.max(1, q - 1))}
                            className="p-1 hover:bg-slate-50 rounded-lg text-slate-500 cursor-pointer transition-colors"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-8 text-center font-mono font-bold text-xs text-slate-900 select-none">
                            {modalQuantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => setModalQuantity(q => Math.min(selectedProduct.stock, q + 1))}
                            className="p-1 hover:bg-slate-50 rounded-lg text-slate-500 cursor-pointer transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        </div>
                      </div>

                      {/* Add Button */}
                      <button
                        onClick={() => {
                          if (!requireMemberForShopping()) return;
                          onAddToCart(selectedProduct, modalSelectedUnit);
                          for (let i = 1; i < modalQuantity; i++) {
                            onAddToCart(selectedProduct, modalSelectedUnit);
                          }
                          setSelectedProduct(null);
                          alert(`${modalQuantity} ${getProductUnitLabel(modalSelectedUnit)} ${selectedProduct.name} başarıyla sepetinize eklendi!`);
                        }}
                        className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-3.5 rounded-2xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                      >
                        <ShoppingCart className="w-4 h-4" />
                        Seçilen Birimi Sepete Ekle ({modalQuantity} {getProductUnitLabel(modalSelectedUnit)})
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="bg-rose-50 border border-rose-100 p-3.5 rounded-2xl flex items-start gap-2.5">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-xs text-rose-800 block">Esnaf / Bayi Seçimi Yapılmadı</strong>
                          <span className="text-[10px] text-rose-600">Alışverişe devam edebilmek için lütfen önce yerel esnafınızı destekleyecek bayinizi seçin.</span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedProduct(null);
                          handleProtectedDealerSelector();
                        }}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-2xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <MapPin className="w-4 h-4 text-amber-400 animate-bounce" />
                        Önce Bir Kırtasiye Esnafı Seçin
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SEKTÖRDEKİ ESNAFLAR - MARKETPLACE INFO MODAL */}
      {isEsnafMarketplaceInfoOpen && (
        <div
          className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in"
          id="esnaf-marketplace-info-modal"
        >
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden">
            {/* Header */}
            <div className="bg-blue-600 text-white px-6 py-5 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-blue-700 p-2.5 rounded-xl">
                  <Store className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-display font-extrabold text-lg sm:text-xl tracking-tight">
                    Esnaf Marketplace & Katalog Sistemi
                  </h3>
                  <p className="text-[10px] text-blue-100 font-medium uppercase tracking-wider">
                    Sistem Nasıl Çalışır?
                  </p>
                </div>
              </div>
              <button
                id="close-esnaf-info-modal"
                type="button"
                onClick={() => setIsEsnafMarketplaceInfoOpen(false)}
                className="text-blue-100 hover:text-white p-1.5 rounded-xl hover:bg-blue-700/50 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
              {/* Project Summary */}
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 space-y-2">
                <span className="text-blue-800 text-[10px] font-extrabold tracking-wider uppercase block">PROJE ÖZETİ</span>
                <p className="text-xs text-blue-900 leading-relaxed font-semibold">
                  Uygulama içerisine "Sektördeki Esnaflar" modülü eklenerek, esnafların kendi ürünlerini yükleyebileceği, müşterilerin buradan alışveriş yapabileceği ve yönetici bazlı komisyon kesintili bir ödeme sisteminin kurulması.
                </p>
              </div>

              {/* Functional Modules Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border border-slate-100 rounded-2xl p-4.5 space-y-2.5 hover:bg-slate-50/50 transition-colors">
                  <span className="bg-slate-100 text-slate-800 text-[9px] font-bold px-2 py-0.5 rounded-md uppercase">1. Admin Paneli & Esnaf Yönetimi</span>
                  <ul className="text-[11px] text-slate-500 space-y-1.5 list-disc pl-4 leading-relaxed">
                    <li><strong className="text-slate-700">Sektör Tanımlama:</strong> Admin panelinde Sektör Yönetimi (Gıda, Giyim, Teknoloji vb.) oluşturulur ve komisyon oranları belirlenir.</li>
                    <li><strong className="text-slate-700">Esnaf Kaydı:</strong> Esnaflar için kullanıcı adı, şifre, sektör seçimi ve mağaza adı bilgilerini içeren esnaf profilleri oluşturulur.</li>
                    <li><strong className="text-slate-700">Özel Yetkilendirme:</strong> Esnaflara sadece kendi ürünlerini ve siparişlerini görebilecekleri esnaf yönetim yetkisi tanımlanır.</li>
                  </ul>
                </div>

                <div className="border border-slate-100 rounded-2xl p-4.5 space-y-2.5 hover:bg-slate-50/50 transition-colors">
                  <span className="bg-slate-100 text-slate-800 text-[9px] font-bold px-2 py-0.5 rounded-md uppercase">2. Esnaf Yönetim Paneli</span>
                  <ul className="text-[11px] text-slate-500 space-y-1.5 list-disc pl-4 leading-relaxed">
                    <li><strong className="text-slate-700">Ürün Yönetimi:</strong> Esnaf, kendi paneline giriş yaptığında kendi ürünlerini (ekleme, güncelleme, silme, fiyat ve stok belirleme) ekleyip yönetebilir.</li>
                    <li><strong className="text-slate-700">Sipariş Takibi:</strong> Esnaf, sadece kendi ürünlerini içeren siparişleri görür ve durumunu (hazırlanıyor, kargolandı vb.) güncelleyebilir.</li>
                  </ul>
                </div>

                <div className="border border-slate-100 rounded-2xl p-4.5 space-y-2.5 hover:bg-slate-50/50 transition-colors">
                  <span className="bg-slate-100 text-slate-800 text-[9px] font-bold px-2 py-0.5 rounded-md uppercase">3. Müşteri Arayüzü & Alışveriş</span>
                  <ul className="text-[11px] text-slate-500 space-y-1.5 list-disc pl-4 leading-relaxed">
                    <li><strong className="text-slate-700">Sektörel Katalog:</strong> Müşteriler esnafları sektörlerine göre süzebilir, seçtikleri esnafın özel kataloğunu inceleyebilir.</li>
                    <li><strong className="text-slate-700">Sipariş Entegrasyonu:</strong> Alınan ürünler esnafın ID'si ile ilişkilendirilerek ortak ödeme ve sevk havuzuna aktarılır.</li>
                  </ul>
                </div>

                <div className="border border-slate-100 rounded-2xl p-4.5 space-y-2.5 hover:bg-slate-50/50 transition-colors">
                  <span className="bg-slate-100 text-slate-800 text-[9px] font-bold px-2 py-0.5 rounded-md uppercase">4. Komisyon & Finans Yönetimi</span>
                  <ul className="text-[11px] text-slate-500 space-y-1.5 list-disc pl-4 leading-relaxed">
                    <li><strong className="text-slate-700">Ortak Havuz Hesabı:</strong> Müşteri ödemeleri doğrudan esnafa aktarılmaz, ortak havuz hesabında bloke edilir.</li>
                    <li><strong className="text-slate-700">Komisyon Hakedişi:</strong> Sipariş tamamlandığında, belirlenen komisyon kesilerek net tutar anında esnafa aktarılır. Esnaf parasını IBAN'ına çekebilir.</li>
                  </ul>
                </div>
              </div>

              {/* Dynamic Interactive Sector Link */}
              <div className="border-t border-slate-100 pt-6 space-y-4">
                <div className="text-center">
                  <h4 className="font-display font-extrabold text-sm text-slate-900 uppercase tracking-wider">
                    🛍️ HEMEN ESNAFLARI KEŞFEDİN
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Aşağıdaki sektörlerden birini seçerek ilgili esnaflarımızın özel kataloglarını listeleyip alışverişe başlayabilirsiniz:
                  </p>
                </div>

                <div className="flex flex-wrap justify-center gap-2.5">
                  {['Kırtasiye', 'Hediyelik Eşya', 'İç Giyim', 'Elektronik', 'Giyim', 'Ayakkabı', 'Takılar'].map(sec => {
                    const sectorCount = dealers.filter(d => d.status === 'active' && d.sector === sec).length;
                    return (
                      <button
                        key={sec}
                        id={`marketplace-sector-btn-${sec}`}
                        type="button"
                        onClick={() => {
                          setIsEsnafMarketplaceInfoOpen(false);
                          handleProtectedDealerSelector(sec);
                        }}
                        className="bg-slate-900 hover:bg-blue-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 border border-slate-800"
                      >
                        <span>{sec}</span>
                        <span className="bg-white/10 text-white/80 text-[10px] px-1.5 py-0.2 rounded font-semibold font-mono">
                          {sectorCount} Esnaf
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 flex justify-between items-center text-[11px] text-slate-400">
              <span>Sektörel Esnaf Marketplace Sistemi © 2026</span>
              <span className="font-semibold text-blue-600 uppercase tracking-wider">Yerli Esnaf Can Suyu Modeli</span>
            </div>
          </div>
        </div>
      )}

      {activeLegalDocument && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs" role="dialog" aria-modal="true" aria-labelledby="legal-document-title">
          <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Yasal Bilgiler · {LEGAL_DOCUMENT_VERSION}</p>
                <h3 id="legal-document-title" className="font-display text-lg font-bold text-slate-900">{LEGAL_DOCUMENTS[activeLegalDocument].title}</h3>
              </div>
              <button type="button" onClick={() => setActiveLegalDocument(null)} className="rounded-lg bg-slate-50 p-1 text-slate-400 transition-colors hover:text-slate-600 cursor-pointer" aria-label="Yasal metin penceresini kapat">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2 border-b border-slate-100 px-5 py-3">
              {(Object.keys(LEGAL_DOCUMENTS) as (keyof typeof LEGAL_DOCUMENTS)[]).map(documentId => (
                <button key={documentId} type="button" onClick={() => setActiveLegalDocument(documentId)} className={`rounded-full px-3 py-1.5 text-[10px] font-bold transition-colors cursor-pointer ${activeLegalDocument === documentId ? 'bg-amber-500 text-slate-950' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  {LEGAL_DOCUMENTS[documentId].title}
                </button>
              ))}
            </div>
            <div className="space-y-5 overflow-y-auto p-5 text-xs leading-relaxed text-slate-600">
              {LEGAL_DOCUMENTS[activeLegalDocument].sections.map(([heading, content]) => (
                <section key={heading}>
                  <h4 className="mb-1 font-bold text-slate-800">{heading}</h4>
                  <p>{content}</p>
                </section>
              ))}
              <p className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-[11px] text-amber-900">Bu metin {LEGAL_DOCUMENT_VERSION} sürümüyle yayımlanmıştır. Onay kayıtlarında sözleşme sürümü ve onay zamanı saklanır.</p>
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
        dealers={dealers}
        commissionRate={commissionRate}
        viewerRole="customer"
      />
    </div>
  );
}
