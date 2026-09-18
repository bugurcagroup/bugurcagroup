import { useMemo, useState } from 'react';
import { Archive, Trash2, RotateCcw } from 'lucide-react';
import type { ArchiveEntityType, ArchiveRecord } from '../lib/archive';

interface ArchivePanelProps {
  records: ArchiveRecord[];
  onRestore: (record: ArchiveRecord) => void | Promise<void>;
  onPermanentlyDelete: (record: ArchiveRecord) => void | Promise<void>;
}

const labels: Record<ArchiveEntityType, string> = {
  order: 'Siparişler',
  product: 'Ürünler',
  commission_request: 'Komisyon Talepleri',
  transaction: 'Komisyon İşlemleri',
  receipt: 'Dekontlar',
};

export default function ArchivePanel({ records, onRestore, onPermanentlyDelete }: ArchivePanelProps) {
  const [activeType, setActiveType] = useState<ArchiveEntityType | 'all'>('all');
  const visibleRecords = useMemo(
    () => activeType === 'all' ? records : records.filter(record => record.entityType === activeType),
    [activeType, records],
  );

  return (
    <section className="space-y-6" id="admin-archive-section">
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex gap-3 items-start">
        <Archive className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <h2 className="font-display font-bold text-sm text-amber-950">Çöp Kutusu / Arşiv Yönetimi</h2>
          <p className="text-xs text-amber-800 mt-1">Silinen kayıtlar burada tutulur. Geri yükleme canlı sisteme geri ekler; kalıcı silme geri alınamaz.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setActiveType('all')} className={`px-3 py-2 rounded-xl text-xs font-bold cursor-pointer ${activeType === 'all' ? 'bg-purple-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>Tümü ({records.length})</button>
        {(Object.keys(labels) as ArchiveEntityType[]).map(type => (
          <button key={type} type="button" onClick={() => setActiveType(type)} className={`px-3 py-2 rounded-xl text-xs font-bold cursor-pointer ${activeType === type ? 'bg-purple-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
            {labels[type]} ({records.filter(record => record.entityType === type).length})
          </button>
        ))}
      </div>

      {visibleRecords.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-sm text-slate-500">Bu kategoride arşivlenmiş kayıt yok.</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {visibleRecords.map(record => (
            <article key={record.id} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[10px] uppercase font-black tracking-wider text-purple-600">{labels[record.entityType]}</span>
                  <h3 className="font-bold text-sm text-slate-900 mt-1">Kayıt: {record.sourceId}</h3>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">{new Date(record.archivedAt).toLocaleString('tr-TR')}</span>
              </div>
              <p className="text-xs text-slate-500">Kaynak: <strong>{record.sourceCollection}</strong></p>
              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => void Promise.resolve(onRestore(record)).catch(error => alert(error instanceof Error ? error.message : 'Kayıt geri yüklenemedi.'))} className="flex-1 inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-2 text-xs font-bold cursor-pointer">
                  <RotateCcw className="w-3.5 h-3.5" /> Geri Yükle
                </button>
                <button type="button" onClick={() => { if (window.confirm('Bu kayıt tüm sistemden kalıcı olarak silinsin mi? Bu işlem geri alınamaz.')) void Promise.resolve(onPermanentlyDelete(record)).catch(error => alert(error instanceof Error ? error.message : 'Kayıt kalıcı olarak silinemedi.')); }} className="flex-1 inline-flex items-center justify-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl py-2 text-xs font-bold cursor-pointer">
                  <Trash2 className="w-3.5 h-3.5" /> Kalıcı Sil
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
