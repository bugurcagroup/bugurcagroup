/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type SaleUnit = 'piece' | 'dozen' | 'box';

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  image: string;
  stock: number;
  brand: string;
  images?: string[]; // Birden fazla cihazdan yüklenen görsel
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  dealerId?: string; // Esnafın ID'si. Boş ise merkez ürünüdür.
  source?: 'admin' | 'dealer';
  barcode?: string;
  qrCode?: string;
  dozenQuantity?: number;
  dozenPrice?: number;
  boxQuantity?: number;
  boxPrice?: number;
  packagingType?: 'UNIT' | 'DOZEN' | 'CARTON';
  itemsPerPackage?: number;
  importStatus?: 'ACTIVE' | 'DRAFT';
  createdAt?: string;
}

export interface InvoiceDetails {
  type: 'individual' | 'corporate';
  fullName: string;
  nationalId?: string;
  companyName?: string;
  taxNumber?: string;
  taxOffice?: string;
  address: string;
  city: string;
  district: string;
}

export interface Dealer {
  id: string;
  name: string;
  owner: string;
  city: string;
  district: string;
  address: string;
  phone: string;
  email: string;
  userId?: string;
  status: 'active' | 'pending' | 'suspended';
  salesVolume: number; // Toplam satış tutarı (ciro)
  commissionEarned: number; // Sabit veya özel komisyon tutarı
  createdAt: string;
  commissionRate?: number; // Özel bayi komisyon oranı (%) - boş ise genel mağaza oranı kullanılır
  privateCommissionRate?: number; // Esnafın kendi özel ürün sayfasından satılan ürünlerde bayiye verilecek komisyon oranı (%)
  adminSectorCommissionRate?: number; // Ortak havuz siparişleri için yöneticinin keseceği komisyon oranı (%)
  bankName?: string; // Banka adı
  accountHolder?: string; // Alıcı ad soyad / ünvan
  iban?: string; // TR IBAN
  sector?: string; // Bayinin sektörü (ör. Kırtasiye, Hediyelik Eşya vb.)
  privateDetails?: string; // Bayinin özel detaylı bilgileri
  announcements?: { id: string; title: string; content: string; date: string }[]; // Bayinin özel paylaşımları/duyuruları
}

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  source?: 'central' | 'dealer';
  saleUnit?: SaleUnit;
  unitQuantity?: number;
  unitPrice?: number;
  dealerId?: string;
  isCentral?: boolean;
  storeId?: string;
}

export interface LegalAcceptance {
  documentId: 'membership' | 'kvkk' | 'distance-sales' | 'pre-information';
  version: string;
  acceptedAt: string;
}

export interface Member {
  id: string;
  name: string;
  email: string;
  password?: string;
  phone?: string;
  createdAt: string;
  legalAcceptances?: LegalAcceptance[];
}

export type ShippingStatus = 'preparing' | 'shipped' | 'delivered' | 'cancelled';

export interface Order {
  id: string;
  dealerId: string;
  dealerName: string;
  orderRole?: 'master' | 'sub';
  masterOrderId?: string;
  subOrderIds?: string[];
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  items: OrderItem[];
  totalPrice: number;
  commissionAmount: number; // Geriye dönük toplam komisyon alanı
  dealerCommissionAmount?: number; // Siparişten doğan bayi hak edişi
  adminCommissionAmount?: number; // Yönetici komisyon tutarı (Sadece sektör alışverişlerinden)
  isFromDealerPage?: boolean; // Siparişin bayinin özel sayfasından yapılıp yapılmadığı
  selectedSector?: string; // Alışveriş yapılan sektör
  date: string;
  status: 'completed' | 'pending' | 'cancelled';
  createdBy?: 'customer' | 'dealer' | 'admin';
  adminApproved?: boolean;
  // Kargo ve Entegrasyon Bilgileri
  shippingCompany?: string; // Kargo Firması (Yurtiçi, Aras, MNG, PTT, Trendyol Express)
  shippingTrackingNumber?: string; // Kargo Takip No
  shippingAddress?: string; // Alıcı Adresi
  shippingCity?: string; // Alıcı Şehri
  shippingDistrict?: string; // Alıcı İlçesi
  shippingReceiver?: string; // Alıcı Ad Soyad
  shippingPhone?: string; // Alıcı Telefon No
  shippingStatus?: ShippingStatus; // Eski ve tek bayi siparişleri için kargo durumu
  shippingStatusByDealer?: Record<string, ShippingStatus>; // Çok bayili siparişlerde bayi bazlı kargo durumu
  shippingStatusByItem?: Record<string, ShippingStatus>; // Ürün sıra numarasına göre kargo durumu
  shippingCompanyByItem?: Record<string, string>; // Ürün sıra numarasına göre kargo firması
  shippingTrackingNumberByItem?: Record<string, string>; // Ürün sıra numarasına göre takip numarası
  customerDownloaded?: boolean; // Müşteri tarafından indirilip indirilmediği bilgisi
  orderReference?: string;
  memberId?: string;
  member?: Pick<Member, 'id' | 'name' | 'email'>;
  paymentMethod?: 'card' | 'bank_transfer';
  paymentDestination?: 'central_pool';
  paymentStatus?: 'receipt_pending' | 'under_review' | 'approved' | 'rejected';
  receiptUploaded?: boolean;
  receiptDataUrl?: string;
  receiptFileName?: string;
  receiptStatus?: 'pending' | 'approved' | 'rejected';
  receiptMessage?: string;
  payment?: { method: 'card' | 'bank_transfer'; status: 'receipt_pending' | 'under_review' | 'approved' | 'rejected' };
  receipt?: { uploaded: boolean; dataUrl?: string; fileName?: string; status: 'pending' | 'approved' | 'rejected'; message?: string };
  invoiceDetails?: InvoiceDetails;
  legalAcceptances?: LegalAcceptance[];
  userId?: string;
  dealerUserId?: string;
  createdAt?: string;
  memberHidden?: boolean;
  adminHidden?: boolean;
  commissionVoided?: boolean;
  testMode?: boolean;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  saleUnit: SaleUnit;
  unitQuantity: number;
  unitPrice: number;
}

export type UserRole = 'customer' | 'dealer' | 'admin' | 'developer';

export interface City {
  name: string;
  region: string;
}

export interface APIEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  description: string;
  requestBody?: string;
  responseBody: string;
}

export interface ERTable {
  name: string;
  description: string;
  columns: {
    name: string;
    type: string;
    key?: 'PK' | 'FK';
    description: string;
  }[];
}

export interface StoreSettings {
  theme: 'honey_yellow' | 'bubblegum_pink' | 'cloud_blue' | 'mint_green' | 'grape_purple' | 'sunset_orange' | 'ocean_teal' | 'forest_green';
  storeName: string;
  storeSlogan: string;
  commissionRate: number; // e.g. 1 (for 1%), 2 (for 2%), etc.
  showDevDocs?: boolean;
  adminPoolBalance?: number; // Admin havuz bakiyesi (bütün esnafların ödemelerinin yapıldığı ana merkez havuz)
  centralBankName?: string;
  centralAccountHolder?: string;
  centralIban?: string;
  centralBankInstructions?: string;

  // CMS Content Management fields
  logoUrl?: string;
  bannerUrl?: string;
  announcementText?: string;
  isAnnouncementActive?: boolean;
  featuredTitle?: string;
  featuredProductIds?: string[];
  aboutTitle?: string;
  aboutText?: string;
  aboutHistory?: string;
  newsletterTitle?: string;
  newsletterSubtitle?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactAddress?: string;
  contactWorkingHours?: string;
  newsList?: { id: string; title: string; content: string; date: string; emoji: string }[];
  enableProductModal?: boolean;
  enableProductZoom?: boolean;
  zoomScale?: number;
  sectorAdminCommissions?: Record<string, number>; // Admin commission % per sector
  adminEarnedCommissions?: number; // Total commission earned by admin from sector purchases
  defaultPrivateCommissionRate?: number; // Varsayılan esnaf özel sayfa komisyon oranı (%)
  showcaseScrollSpeed?: number; // Kayan görsellerin kayma hızı (saniye, varsayılan 80)
  showcaseProductIds?: string[]; // Kayan görsel vitrininde gösterilecek ürünlerin ID listesi
  brandMarqueeEnabled?: boolean;
  brandMarqueeTitle?: string;
  brandMarqueeImages?: string[];
  footerEnabled?: boolean;
  footerTitle?: string;
  footerDescription?: string;
  footerShowAbout?: boolean;
  footerShowContact?: boolean;
  footerShowShortcuts?: boolean;
  footerMapEnabled?: boolean;
  footerLocationEyebrow?: string;
  footerLocationTitle?: string;
  footerDirectionsLabel?: string;
  footerMapLabel?: string;

  // Yasal Künye (üye işyeri / banka denetiminde zorunlu) — Firestore settings/general üzerinden beslenir,
  // GitHub'da placeholder olarak durur; gerçek tüzel veri yalnızca Firestore dokümanında tutulur.
  legalCompanyTitle?: string;
  legalTaxOffice?: string;
  legalTaxNumber?: string;
  legalMersisNumber?: string;
  legalTradeRegistryNumber?: string;
  legalLandlinePhone?: string;
  legalEmail?: string;
  legalEffectiveDate?: string;
  footerShortcuts?: { id: string; label: string; href: string }[];
  footerAboutLinks?: { id: string; label: string; href: string }[];
  footerLocations?: { id: string; label: string; address: string; coordinates?: string }[];
  telegramNotificationsEnabled?: boolean;
  telegramOrderNotifications?: boolean;
  telegramActivityNotifications?: boolean;
  telegramChatId?: string;
}

export interface CommissionRequest {
  id: string;
  dealerId: string;
  dealerName: string;
  amount: number;
  bankName: string;
  accountHolder: string;
  iban: string;
  status: 'pending' | 'approved' | 'rejected';
  date: string;
  dealerUserId?: string;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
}

export type DealerTransactionType = 'commission' | 'payout' | 'dealer_product_payout';

export interface DealerTransaction {
  id: string;
  dealerId: string;
  amount: number;
  type: DealerTransactionType;
  date: string;
  createdAt?: string;
  note?: string;
}
