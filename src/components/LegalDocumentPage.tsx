import { ArrowLeft, Mail, Phone } from 'lucide-react';

export type LegalDocumentSlug =
  | 'mesafeli-satis-sozlesmesi'
  | 'on-bilgilendirme-formu'
  | 'iptal-iade-kosullari'
  | 'kvkk-aydinlatma-metni'
  | 'kargo-teslimat-kosullari';

type LegalSection = { heading?: string; text: string };

type LegalDocument = {
  title: string;
  sections: LegalSection[];
};

const COMPANY = {
  name: 'EFEKTİF TEKNOLOJİ İÇ VE DIŞ TİCARET LİMİTED ŞİRKETİ',
  address: 'Yusufpaşa Mah. 886 Sk. Dünya İş Merkezi No: 15/C Eyyübiye / ŞANLIURFA',
  phone: '0507 249 76 46',
  email: 'bugurcagroup@gmail.com',
  mersis: '0141067990400001',
  tax: 'Topçumeydanı VD / 141 067 9904',
};

const DOCUMENTS: Record<LegalDocumentSlug, LegalDocument> = {
  'mesafeli-satis-sozlesmesi': {
    title: 'MESAFELİ SATIŞ SÖZLEŞMESİ',
    sections: [
      { heading: '1. TARAFLAR', text: `SATICI\nTicaret Unvanı: ${COMPANY.name}\nAdres: ${COMPANY.address}\nTelefon: ${COMPANY.phone}\nE-posta: ${COMPANY.email}\nMERSİS No: ${COMPANY.mersis}\nVergi Dairesi / No: ${COMPANY.tax}\n\nALICI\nAdı/Soyadı/Unvanı: [Müşteri / Bayi Adı veya Unvanı]\nAdres: [Teslimat Adresi]\nTelefon: [Telefon]\nE-posta: [E-posta]` },
      { heading: '2. KONU', text: 'İşbu sözleşmenin konusu, Alıcının bugurcagroup.com internet sitesinde elektronik ortamda siparişini yaptığı, özellikleri ve satış fiyatı belirtilen ürünlerin satışı ve teslimi ile tarafların hak ve yükümlülüklerinin belirlenmesidir. Türk Borçlar Kanunu ve B2B bayi alımlarına ilişkin hükümler saklıdır.' },
      { heading: '3. GENEL HÜKÜMLER', text: '3.1. Alıcı, sözleşme konusu ürünün temel özellikleri, satış fiyatı, ödeme şekli ve teslimata ilişkin ön bilgileri okuyup bilgi sahibi olduğunu ve elektronik ortamda teyit ettiğini kabul eder.\n\n3.2. Ürün, yasal 30 günlük süreyi aşmamak kaydıyla ön bilgilerde belirtilen sürede teslim edilir. Kargo bedeli aksi belirtilmedikçe Alıcıya aittir.\n\n3.3. Kredi kartının yetkisiz kişilerce haksız kullanımı nedeniyle bedelin ödenmemesi halinde ürün, Satıcı tarafından 3 gün içinde iade edilir.' },
      { heading: '4. CAYMA HAKKI', text: 'Alıcı, malın tesliminden itibaren 14 (on dört) gün içerisinde hiçbir gerekçe göstermeksizin cayma hakkına sahiptir.\n\nCayma Hakkının Kullanılamayacağı Haller: Ambalajı, mührü veya koruyucu unsurları açılmış hijyenik ürünler; kişiye veya işletmeye özel hazırlanan mallar ve hızla bozulabilen mallar.' },
      { heading: '5. UYUŞMAZLIKLAR', text: 'Ticaret Bakanlığı tarafından ilan edilen parasal sınırlara kadar Alıcının yerleşim yerindeki Tüketici Hakem Heyetleri ile Tüketici Mahkemeleri yetkilidir.' },
    ],
  },
  'on-bilgilendirme-formu': {
    title: 'ÖN BİLGİLENDİRME FORMU',
    sections: [
      { heading: 'Satıcı Bilgileri', text: `${COMPANY.name}\n${COMPANY.address}\nTelefon: ${COMPANY.phone}\nE-posta: ${COMPANY.email}` },
      { heading: 'Ürün/Hizmetin Nitelikleri', text: 'Sitede yer alan ürün görselleri, teknik açıklamalar ve KDV dahil satış fiyatları esas alınır.' },
      { heading: 'Toplam Bedel', text: 'Sepet onayında gösterilen KDV dahil ürün toplamı ve varsa kargo bedeli, siparişin toplam bedelidir.' },
      { heading: 'Ödemeler', text: 'Kredi kartı, banka kartı veya havale/EFT yöntemleriyle ödeme yapılabilir.' },
      { heading: 'Teslimat', text: 'Siparişler anlaşmalı kargo firmalarıyla sevk edilir. Teslimat süresi ortalama 3-5 iş günüdür ve kargo koşullarına göre değişebilir.' },
    ],
  },
  'iptal-iade-kosullari': {
    title: 'İPTAL VE İADE KOŞULLARI',
    sections: [
      { heading: 'İade Süresi', text: 'Mesafeli satışlarda cayma hakkı süresi, ürünün tesliminden itibaren 14 gündür.' },
      { heading: 'İade Koşulları', text: 'Orijinal kutu, ambalaj ve aksesuarlar eksiksiz ve hasarsız olmalı; kurumsal iadelerde fatura veya iade faturası eklenmelidir.' },
      { heading: 'Kargo Ücreti', text: 'Cayma hakkı kapsamındaki iadelerde kargo masrafları Alıcı tarafından karşılanır. Ayıplı veya kusurlu ürünlerde kargo ücreti Satıcıya aittir.' },
      { heading: 'İade Bedeli', text: 'İade edilen ürün tarafımıza ulaştıktan sonra bedel, ödeme yöntemine uygun olarak 14 iş günü içerisinde iade edilir.' },
    ],
  },
  'kvkk-aydinlatma-metni': {
    title: 'KİŞİSEL VERİLERİN KORUNMASI KANUNU (KVKK) AYDINLATMA METNİ',
    sections: [
      { heading: 'Veri Sorumlusu', text: `${COMPANY.name} (${COMPANY.address}).` },
      { heading: '1. İşlenen Veriler', text: 'Kimlik, iletişim, finansal işlem ve log güvenlik bilgileri işlenebilir.' },
      { heading: '2. İşleme Amaçları', text: 'Veriler; siparişlerin alınması, faturalandırma, teslimat ve yasal yükümlülüklerin yerine getirilmesi amaçlarıyla işlenir.' },
      { heading: '3. Aktarım', text: 'Veriler; kargo firmaları, mali müşavirlik veya muhasebe yazılımları ve kanunen yetkili mercilerle, gerekli olduğu ölçüde paylaşılabilir.' },
      { heading: '4. Haklarınız (KVKK Madde 11)', text: `Veri sorumlusuna başvurarak verilerinizin işlenip işlenmediğini öğrenme ve düzeltilmesini talep etme dahil KVKK Madde 11 kapsamındaki haklarınızı kullanabilirsiniz. Başvuru: ${COMPANY.email}` },
    ],
  },
  'kargo-teslimat-kosullari': {
    title: 'KARGO VE TESLİMAT KOŞULLARI',
    sections: [
      { heading: 'Teslimat Süresi', text: 'Onaylanan siparişler 1-3 iş günü içerisinde kargoya verilir. Kargo firmasının operasyonel koşullarına göre teslimat süresi değişebilir.' },
      { heading: 'Hasarlı Teslimat', text: 'Alıcı, paketi teslim alırken kargo görevlisinin yanında kontrol etmeli ve hasar varsa Hasar Tespit Tutanağı tutturtmalıdır. Tutanaksız teslimatlarda hasarın ispatı Alıcıya aittir.' },
    ],
  },
};

export default function LegalDocumentPage({ slug }: { slug: LegalDocumentSlug }) {
  const document = DOCUMENTS[slug];

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-800 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <a href="/" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-amber-700 hover:text-amber-800">
          <ArrowLeft className="h-4 w-4" /> Ana sayfaya dön
        </a>
        <article className="overflow-hidden rounded-2xl border border-amber-100 bg-white shadow-sm">
          <header className="border-b border-amber-100 bg-amber-50 px-6 py-7 sm:px-10">
            <p className="text-xs font-extrabold tracking-[0.18em] text-amber-700">BUĞURCA KIRTASİYE</p>
            <h1 className="mt-3 text-xl font-extrabold leading-tight text-slate-900 sm:text-2xl">{document.title}</h1>
            <p className="mt-3 text-xs text-slate-600">{COMPANY.name}</p>
          </header>
          <div className="space-y-7 px-6 py-7 sm:px-10">
            {document.sections.map(section => (
              <section key={section.heading}>
                {section.heading && <h2 className="mb-2 text-sm font-extrabold text-slate-900">{section.heading}</h2>}
                <p className="whitespace-pre-line text-sm leading-7 text-slate-600">{section.text}</p>
              </section>
            ))}
          </div>
          <footer className="border-t border-slate-100 bg-slate-50 px-6 py-5 text-xs text-slate-600 sm:px-10">
            <p className="font-bold text-slate-800">İletişim</p>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
              <a href={`tel:+90${COMPANY.phone.replace(/\s/g, '').replace(/^0/, '')}`} className="inline-flex items-center gap-1 hover:text-amber-700"><Phone className="h-3.5 w-3.5" /> {COMPANY.phone}</a>
              <a href={`mailto:${COMPANY.email}`} className="inline-flex items-center gap-1 hover:text-amber-700"><Mail className="h-3.5 w-3.5" /> {COMPANY.email}</a>
            </div>
          </footer>
        </article>
      </div>
    </main>
  );
}
