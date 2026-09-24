import React, { useState } from 'react';
import { X, ShoppingBag, User, MapPin, Truck, Calendar, CreditCard, Coins, Copy, Check, FileText } from 'lucide-react';
import { Dealer, Order, Product } from '../types';
import { copyTextToClipboard } from '../lib/browser';
import { getOrderItemShippingCompany, getOrderItemShippingStatus, getOrderItemTrackingNumber, getOrderShippingStatus } from '../lib/orderShipping';

interface OrderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  products?: Product[];
  dealers?: Dealer[];
  commissionRate?: number;
  viewerRole?: 'customer' | 'dealer' | 'admin';
  viewerDealerId?: string;
}

export default function OrderDetailsModal({
  isOpen,
  onClose,
  order,
  products = [],
  dealers = [],
  commissionRate = 0,
  viewerRole = 'customer',
  viewerDealerId,
}: OrderDetailsModalProps) {
  const [copiedText, setCopiedText] = useState<string | null>(null);

  if (!isOpen || !order) return null;

  const handleCopy = async (text: string, label: string) => {
    if (!(await copyTextToClipboard(text))) return;
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const getSourceBadge = (source?: string) => {
    switch (source) {
      case 'dealer':
        return <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase">Bayi Talebi</span>;
      case 'admin':
        return <span className="bg-purple-100 text-purple-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase">Merkez</span>;
      default:
        return <span className="bg-blue-100 text-blue-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase">Müşteri</span>;
    }
  };

  const getOrderStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full uppercase">Tamamlandı</span>;
      case 'cancelled':
        return <span className="bg-rose-100 text-rose-800 text-xs font-bold px-3 py-1 rounded-full uppercase">İptal Edildi</span>;
      default:
        return <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full uppercase">Bekliyor</span>;
    }
  };

  const getShippingStatusBadge = (status?: string) => {
    switch (status) {
      case 'delivered':
        return <span className="bg-emerald-50 text-emerald-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase">Müşteriye Teslim Edildi</span>;
      case 'shipped':
        return <span className="bg-blue-50 text-blue-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase">Kargoya Verildi / Yolda</span>;
      case 'cancelled':
        return <span className="bg-rose-50 text-rose-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase">İade / İptal</span>;
      default:
        return <span className="bg-amber-50 text-amber-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase">Hazırlanıyor</span>;
    }
  };

  // Helper to find original product data to show its image or details
  const getProductImage = (productId: string) => {
    const found = products.find(p => p.id === productId);
    return found?.image || 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=100&auto=format&fit=crop&q=60';
  };

  const getProductBrand = (productId: string) => {
    const found = products.find(p => p.id === productId);
    return found?.brand || '';
  };

  const getProductCategory = (productId: string) => {
    const found = products.find(p => p.id === productId);
    return found?.category || '';
  };

  const orderDealer = dealers.find(dealer => dealer.id === order.dealerId);
  const centralTotal = order.items.reduce((total, item) => {
    const product = products.find(candidate => candidate.id === item.productId);
    const isDealerProduct = item.source === 'dealer' || Boolean(item.dealerId) || Boolean(product?.dealerId);
    return isDealerProduct ? total : total + item.price * item.quantity;
  }, 0);
  const dealerCommission = order.dealerCommissionAmount !== undefined
    ? Number(order.dealerCommissionAmount)
    : orderDealer
      ? Number((centralTotal * (orderDealer.commissionRate ?? commissionRate) / 100).toFixed(2))
      : Number(order.commissionAmount ?? 0);
  const adminCommission = order.adminCommissionAmount !== undefined
    ? Number(order.adminCommissionAmount)
    : orderDealer
      ? Number(Math.max(0, centralTotal - dealerCommission).toFixed(2))
      : Number(order.adminCommissionAmount ?? 0);
  const displayedShippingStatus = getOrderShippingStatus(
    order,
    viewerRole === 'dealer' ? viewerDealerId : order.dealerId,
  );

  const getItemDealerId = (item: Order['items'][number]) => {
    const productDealerId = products.find(product => product.id === item.productId)?.dealerId;
    return item.dealerId || productDealerId || (item.source === 'dealer' ? 'unknown' : undefined);
  };

  const visibleItems = viewerRole === 'dealer'
    ? order.items.filter(item => getItemDealerId(item) === viewerDealerId || (!getItemDealerId(item) && order.dealerId === viewerDealerId))
    : order.items;
  const centralItems = order.items.filter(item => !getItemDealerId(item));
  const dealerItemGroups = new Map<string, Order['items']>();
  order.items.forEach(item => {
    const dealerId = getItemDealerId(item);
    if (!dealerId) return;
    dealerItemGroups.set(dealerId, [...(dealerItemGroups.get(dealerId) || []), item]);
  });
  const itemSections = viewerRole === 'admin'
    ? [
      ...Array.from(dealerItemGroups.entries()).map(([dealerId, items]) => ({
        key: `dealer-${dealerId}`,
        title: `Bayi Ürünleri - ${dealers.find(dealer => dealer.id === dealerId)?.name || `Bayi ID: ${dealerId}`}`,
        items,
      })),
      ...(centralItems.length > 0 ? [{ key: 'central', title: 'Merkez Platform Ürünleri', items: centralItems }] : []),
    ]
    : [{
      key: viewerRole === 'dealer' ? 'dealer-items' : 'all-items',
      title: viewerRole === 'dealer' ? 'Bayinin Seçilen Ürünleri' : 'Alınan Ürünler',
      items: visibleItems,
    }];
  const displayedItemsTotal = visibleItems.reduce((total, item) => total + item.price * item.quantity, 0);
  const displayedOrderTotal = Number(order.totalPrice ?? 0);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto" id="global-order-details-modal">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-100 relative my-8 animate-scale-up max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-5 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-slate-800 p-2.5 rounded-xl border border-slate-700">
              <ShoppingBag className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-display font-extrabold text-lg sm:text-xl tracking-tight">Sipariş Detay Kartı</h3>
                <span className="bg-white/10 text-slate-300 font-mono text-xs px-2.5 py-0.5 rounded-md font-bold">
                  #{order.id}
                </span>
                {getSourceBadge(order.createdBy)}
              </div>
              <p className="text-[11px] text-slate-400 font-medium mt-1">
                Atanan Bayi: <strong className="text-white font-bold">{order.dealerName}</strong> (ID: {order.dealerId})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-all cursor-pointer"
            id="close-order-details-modal-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Status Bar */}
          <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <Calendar className="w-4 h-4 text-slate-400" />
              <div className="text-xs">
                <span className="text-slate-400 block font-bold uppercase tracking-wider text-[9px]">İşlem Tarihi</span>
                <span className="font-semibold text-slate-700">{new Date(order.date).toLocaleString('tr-TR')}</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <FileText className="w-4 h-4 text-slate-400" />
              <div className="text-xs">
                <span className="text-slate-400 block font-bold uppercase tracking-wider text-[9px]">Sipariş Durumu</span>
                <div className="mt-0.5">{getOrderStatusBadge(order.status)}</div>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <Truck className="w-4 h-4 text-slate-400" />
              <div className="text-xs">
                <span className="text-slate-400 block font-bold uppercase tracking-wider text-[9px]">Kargo Sevk Durumu</span>
                <div className="mt-0.5">{getShippingStatusBadge(displayedShippingStatus)}</div>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <CreditCard className="w-4 h-4 text-slate-400" />
              <div className="text-xs">
                <span className="text-slate-400 block font-bold uppercase tracking-wider text-[9px]">Ödeme Modeli</span>
                <span className="font-extrabold text-indigo-600 block">Sanal POS / Merkez Havuz</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Customer Details Box */}
            <div className="border border-slate-100 rounded-2xl p-5 space-y-4 hover:bg-slate-50/20 transition-all">
              <h4 className="font-display font-extrabold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2.5">
                <User className="w-4.5 h-4.5 text-purple-600" /> Müşteri ve İletişim Bilgileri
              </h4>
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-3 gap-1">
                  <span className="text-slate-400 font-bold">Müşteri Adı:</span>
                  <span className="col-span-2 font-semibold text-slate-800">{order.customerName}</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <span className="text-slate-400 font-bold">E-posta:</span>
                  <span className="col-span-2 font-mono text-slate-700 select-all">{order.customerEmail || 'Belirtilmedi'}</span>
                </div>
                <div className="grid grid-cols-3 gap-1 items-center">
                  <span className="text-slate-400 font-bold">Telefon:</span>
                  <div className="col-span-2 flex items-center gap-2">
                    <span className="font-semibold text-slate-800 font-mono">{order.customerPhone}</span>
                    <button
                      onClick={() => handleCopy(order.customerPhone, 'phone')}
                      className="p-1 hover:bg-slate-100 text-slate-400 hover:text-purple-600 rounded transition-all cursor-pointer"
                      title="Telefon numarasını kopyala"
                    >
                      {copiedText === 'phone' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
                {order.selectedSector && (
                  <div className="grid grid-cols-3 gap-1">
                    <span className="text-slate-400 font-bold">Alışveriş Sektörü:</span>
                    <span className="col-span-2">
                      <span className="bg-purple-50 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded border border-purple-100">
                        {order.selectedSector}
                      </span>
                    </span>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-1">
                  <span className="text-slate-400 font-bold">Müşteri İndirdi mi:</span>
                  <span className="col-span-2">
                    {order.customerDownloaded ? (
                      <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-200">
                        Evet, Müşteri Tarafından İndirilmiştir
                      </span>
                    ) : (
                      <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-200">
                        Hayır, Henüz İndirilmedi
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {order.invoiceDetails && (
              <div className="border border-indigo-100 bg-indigo-50/40 rounded-2xl p-5 space-y-4 md:col-span-2">
                <h4 className="font-display font-extrabold text-xs text-indigo-900 uppercase tracking-wider flex items-center gap-2 border-b border-indigo-100 pb-2.5">
                  <FileText className="w-4 h-4 text-indigo-600" /> Fatura Bilgileri
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700">
                  <span><strong>Tür:</strong> {order.invoiceDetails.type === 'corporate' ? 'Kurumsal' : 'Bireysel'}</span>
                  <span><strong>Ad Soyad:</strong> {order.invoiceDetails.fullName}</span>
                  {order.invoiceDetails.nationalId && <span><strong>T.C. Kimlik No:</strong> {order.invoiceDetails.nationalId}</span>}
                  {order.invoiceDetails.companyName && <span><strong>Firma:</strong> {order.invoiceDetails.companyName}</span>}
                  {order.invoiceDetails.taxNumber && <span><strong>Vergi No:</strong> {order.invoiceDetails.taxNumber}</span>}
                  {order.invoiceDetails.taxOffice && <span><strong>Vergi Dairesi:</strong> {order.invoiceDetails.taxOffice}</span>}
                  <span><strong>Adres:</strong> {order.invoiceDetails.address}</span>
                  <span><strong>Konum:</strong> {order.invoiceDetails.city} / {order.invoiceDetails.district}</span>
                </div>
              </div>
            )}

            {/* Shipment & Address Details Box */}
            <div className="border border-slate-100 rounded-2xl p-5 space-y-4 hover:bg-slate-50/20 transition-all">
              <h4 className="font-display font-extrabold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2.5">
                <MapPin className="w-4.5 h-4.5 text-emerald-600" /> Kargo Alıcı & Adres Detayları
              </h4>
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-3 gap-1">
                  <span className="text-slate-400 font-bold">Alıcı Ad Soyad:</span>
                  <span className="col-span-2 font-bold text-slate-800">{order.shippingReceiver || order.customerName}</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <span className="text-slate-400 font-bold">Alıcı Telefon:</span>
                  <span className="col-span-2 font-semibold text-slate-700 font-mono">{order.shippingPhone || order.customerPhone}</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <span className="text-slate-400 font-bold">Şehir / İlçe:</span>
                  <span className="col-span-2 font-bold text-slate-900">{order.shippingCity || 'İzmir'} / {order.shippingDistrict || 'Konak'}</span>
                </div>
                <div className="grid grid-cols-3 gap-1 items-start">
                  <span className="text-slate-400 font-bold mt-0.5">Açık Adres:</span>
                  <div className="col-span-2 bg-slate-50 p-2.5 rounded-xl border border-slate-150 text-slate-600 leading-relaxed font-medium relative group flex justify-between items-start">
                    <span className="pr-6">{order.shippingAddress || 'Adres bilgisi eklenmemiş.'}</span>
                    {order.shippingAddress && (
                      <button
                        onClick={() => handleCopy(order.shippingAddress!, 'address')}
                        className="p-1 hover:bg-white text-slate-400 hover:text-emerald-600 rounded shadow-3xs transition-all cursor-pointer self-start absolute right-1.5 top-1.5"
                        title="Adresi Kopyala"
                      >
                        {copiedText === 'address' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>
                {order.shippingCompany && (
                  <div className="grid grid-cols-3 gap-1 items-center pt-1">
                    <span className="text-slate-400 font-bold">Kargo Firması:</span>
                    <span className="col-span-2 font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="bg-slate-100 text-slate-700 text-[10px] px-2 py-0.5 rounded font-mono border border-slate-200">
                        {order.shippingCompany}
                      </span>
                    </span>
                  </div>
                )}
                {order.shippingTrackingNumber && (
                  <div className="grid grid-cols-3 gap-1 items-center">
                    <span className="text-slate-400 font-bold">Takip No / Barkod:</span>
                    <div className="col-span-2 flex items-center gap-1.5">
                      <span className="font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-150 px-2 py-0.5 rounded text-[11px] select-all">
                        {order.shippingTrackingNumber}
                      </span>
                      <button
                        onClick={() => handleCopy(order.shippingTrackingNumber!, 'tracking')}
                        className="p-1 hover:bg-slate-100 text-slate-400 hover:text-emerald-600 rounded transition-all cursor-pointer"
                        title="Barkodu kopyala"
                      >
                        {copiedText === 'tracking' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <h4 className="font-display font-extrabold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
              <ShoppingBag className="w-4.5 h-4.5 text-amber-500" /> Sipariş Ürünleri ({visibleItems.length} Kalem)
            </h4>
            {itemSections.map(section => (
              <div key={section.key} className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <h5 className="text-[11px] font-extrabold uppercase tracking-wide text-slate-700">{section.title}</h5>
                  <span className="text-[10px] font-bold text-slate-400">
                    {section.items.length} Kalem · {section.items.reduce((total, item) => total + item.price * item.quantity, 0).toFixed(2)} TL
                  </span>
                </div>
                <div className="border border-slate-150 rounded-2xl overflow-hidden bg-white">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-150">
                        <th className="p-3">Görsel</th>
                        <th className="p-3">Ürün Detayı</th>
                        <th className="p-3 text-center">Miktar</th>
                        <th className="p-3 text-right">Birim Fiyat</th>
                        <th className="p-3 text-right">Toplam Tutar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                      {section.items.map((item, idx) => {
                        const shippingIndex = order.items.indexOf(item);
                        const itemShippingStatus = getOrderItemShippingStatus(order, shippingIndex);
                        const itemShippingCompany = getOrderItemShippingCompany(order, shippingIndex);
                        const itemTrackingNumber = getOrderItemTrackingNumber(order, shippingIndex);
                        return (
                        <tr key={`${section.key}-${item.productId}-${idx}`} className="hover:bg-slate-50/50">
                          <td className="p-3 w-16">
                            <div className="h-10 w-10 bg-slate-50 rounded-lg overflow-hidden border border-slate-150 flex items-center justify-center p-1">
                              <img
                                src={getProductImage(item.productId)}
                                alt={item.name}
                                referrerPolicy="no-referrer"
                                className="max-h-full max-w-full object-contain"
                              />
                            </div>
                          </td>
                          <td className="p-3">
                            <span className="font-bold text-slate-800 block">{item.name}</span>
                            <div className="flex gap-2 text-[9px] mt-0.5 text-slate-400 font-semibold uppercase">
                              {getProductBrand(item.productId) && <span>Marka: {getProductBrand(item.productId)}</span>}
                              {getProductCategory(item.productId) && <span>Kategori: {getProductCategory(item.productId)}</span>}
                              {getItemDealerId(item) && <span>Bayi ID: {getItemDealerId(item)}</span>}
                              {item.storeId && <span>Mağaza: {item.storeId}</span>}
                            </div>
                          </td>
                          <td className="p-3 text-center font-mono font-bold text-slate-700">
                            <div>x{item.quantity} {item.saleUnit === 'box' ? 'Koli' : item.saleUnit === 'dozen' ? 'Düzine' : 'Adet'}{item.unitQuantity && item.unitQuantity > 1 ? ` (${item.unitQuantity} adet)` : ''}</div>
                            <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase mt-0.5 inline-block ${getItemDealerId(item) ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>
                              {getItemDealerId(item) ? 'Bayi Ürünü' : 'Merkez Ürünü'}
                            </span>
                            <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase mt-0.5 ml-1 inline-block ${itemShippingStatus === 'delivered' ? 'bg-emerald-50 text-emerald-700' : itemShippingStatus === 'shipped' ? 'bg-blue-50 text-blue-700' : itemShippingStatus === 'cancelled' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>
                              {itemShippingStatus === 'delivered' ? 'Teslim Edildi' : itemShippingStatus === 'shipped' ? 'Kargoda' : itemShippingStatus === 'cancelled' ? 'İptal' : 'Hazırlanıyor'}
                            </span>
                            {itemShippingStatus === 'shipped' && (
                              <span className="block text-[9px] text-slate-400 mt-1 normal-case">
                                {itemShippingCompany}{itemTrackingNumber ? ` · ${itemTrackingNumber}` : ''}
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right font-mono text-slate-500">{item.price.toFixed(2)} TL</td>
                          <td className="p-3 text-right font-mono font-bold text-slate-900">{(item.price * item.quantity).toFixed(2)} TL</td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
            {visibleItems.length === 0 && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center text-xs font-semibold text-amber-800">
                Bu siparişte bu bayiye ait ürün bulunmuyor.
              </div>
            )}
            {viewerRole === 'dealer' && (
              <div className="flex justify-end rounded-xl bg-emerald-50 px-4 py-3 text-sm font-extrabold text-emerald-800">
                Bayinin Seçilen Ürünleri Toplamı: {displayedItemsTotal.toFixed(2)} TL
              </div>
            )}
          </div>

          {/* Pricing & Commissions Financial Breakdown */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 grid grid-cols-1 md:grid-cols-2 gap-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/2 rounded-full blur-2xl"></div>
            
            {/* Split Details */}
            <div className="space-y-4 relative">
              <h5 className="font-display font-extrabold text-[10px] tracking-wider uppercase text-amber-400 flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-amber-400" /> ESNAF CİRO PAYLAŞIMI VE HAKEDİŞ DETAYLARI
              </h5>
              
              <div className="space-y-2.5 text-xs text-slate-300">
                <div className="flex justify-between items-center bg-white/5 border border-white/5 p-2.5 rounded-xl">
                  <div>
                    <span className="block font-bold">Bayi Komisyonu / Esnaf Hakedişi</span>
                    <span className="text-[9px] text-slate-400 font-semibold uppercase">Komisyon Kazancı</span>
                  </div>
                  <span className="font-mono font-bold text-sm text-emerald-400">+{dealerCommission.toFixed(2)} TL</span>
                </div>

                <div className="flex justify-between items-center bg-white/5 border border-white/5 p-2.5 rounded-xl">
                  <div>
                    <span className="block font-bold">Merkez Platform Kesintisi</span>
                    <span className="text-[9px] text-slate-400 font-semibold uppercase">Sektör Komisyonu</span>
                  </div>
                  <span className="font-mono font-bold text-sm text-indigo-300">
                    +{adminCommission.toFixed(2)} TL
                  </span>
                </div>
              </div>
            </div>

            {/* Total summary info */}
            <div className="flex flex-col justify-between items-end border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-6 text-right space-y-4">
              <div className="w-full space-y-1 text-slate-300 text-xs">
                <div className="flex justify-between md:justify-end gap-6">
                  <span className="text-slate-400 font-bold">Ara Toplam:</span>
                  <span className="font-mono font-semibold">{displayedOrderTotal.toFixed(2)} TL</span>
                </div>
                <div className="flex justify-between md:justify-end gap-6">
                  <span className="text-slate-400 font-bold">Sanal Kargo:</span>
                  <span className="text-emerald-400 font-extrabold">Ücretsiz</span>
                </div>
              </div>

              <div className="w-full border-t border-white/10 pt-3 flex justify-between md:justify-end items-center gap-6">
                <span className="text-amber-400 text-sm font-black uppercase tracking-wider">GENEL TOPLAM</span>
                <span className="font-mono font-black text-2xl text-amber-400">{displayedOrderTotal.toFixed(2)} TL</span>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-150 px-6 py-4 flex justify-between items-center shrink-0 text-xs text-slate-400">
          <span>Buğurca Kırtasiye Yerli Esnaf Can Suyu Sistemi © 2026</span>
          <button
            onClick={onClose}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-6 py-2 rounded-xl transition-all cursor-pointer"
          >
            Detayları Kapat
          </button>
        </div>

      </div>
    </div>
  );
}
