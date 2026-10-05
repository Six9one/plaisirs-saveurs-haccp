import React, { useState, useRef } from 'react';
import type { WasteLog, User } from '../types';
import {
  Trash2,
  Plus,
  CheckCircle2,
  Camera,
  X,
  FileText,
  Search,
  Calendar,
} from 'lucide-react';
import { compressImage } from '../services/imageStorage';

interface WasteModuleProps {
  logs: WasteLog[];
  currentUser: User;
  onAddLog: (log: Omit<WasteLog, 'id'>) => void;
  onDeleteLog?: (id: string) => void;
}

export const WasteModule: React.FC<WasteModuleProps> = ({
  logs,
  currentUser,
  onAddLog,
  onDeleteLog,
}) => {
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Form states
  const [productName, setProductName] = useState<string>('');
  const [category, setCategory] = useState<WasteLog['category']>('Pâtons / Pâte');
  const [quantityKg, setQuantityKg] = useState<string>('');
  const [reason, setReason] = useState<WasteLog['reason']>('DLC Dépassée');
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(undefined);
  const [notes, setNotes] = useState<string>('');
  const [previewModalImg, setPreviewModalImg] = useState<{ url: string; title: string } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Calculations & Analytics
  const totalKg = (logs || []).reduce((acc, curr) => acc + (Number(curr?.quantityKg) || 0), 0);

  const categoryTotals: Record<string, number> = {
    'Pâtons / Pâte': 0,
    'Pâtisseries': 0,
    'Snacking/Salé': 0,
    'Matières Premières': 0,
  };

  (logs || []).forEach((log) => {
    if (categoryTotals[log.category] !== undefined) {
      categoryTotals[log.category] += Number(log.quantityKg) || 0;
    }
  });

  const filteredLogs = (logs || []).filter((log) => {
    const matchesCat = selectedCategoryFilter === 'all' || log.category === selectedCategoryFilter;
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      log.productName.toLowerCase().includes(query) ||
      log.reason.toLowerCase().includes(query) ||
      (log.notes && log.notes.toLowerCase().includes(query)) ||
      log.discardedBy.toLowerCase().includes(query);
    return matchesCat && matchesSearch;
  });

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file, { maxWidth: 1000, maxHeight: 1000, quality: 0.85 });
      setPhotoUrl(compressed);
      showToast('📷 Photo enregistrée !');
    } catch (err) {
      console.error('Image compression error', err);
    }
  };

  const handleAdjustKg = (delta: number) => {
    const current = parseFloat(quantityKg) || 0;
    const next = Math.max(0.1, Math.round((current + delta) * 10) / 10);
    setQuantityKg(next.toString());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName.trim()) {
      alert('Veuillez indiquer le nom de la denrée ou du produit.');
      return;
    }
    if (!(parseFloat(quantityKg) > 0)) {
      alert('Veuillez indiquer la quantité jetée (kg).');
      return;
    }

    const now = new Date();
    const formattedDate = `${now.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })} ${now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;

    onAddLog({
      productName: productName.trim(),
      category,
      quantityKg: parseFloat(quantityKg) || 0,
      reason,
      method: 'Biodéchets Dédiés',
      discardedAt: formattedDate,
      discardedBy: currentUser?.name || 'Inconnu',
      photoUrl,
      notes: notes.trim() || undefined,
    });

    setProductName('');
    setQuantityKg('');
    setNotes('');
    setPhotoUrl(undefined);
    setShowAddModal(false);
    showToast(`✓ Perte "${productName.trim()}" (${quantityKg} kg) consignée !`);
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-24 px-1 sm:px-0 animate-in fade-in duration-150">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-amber-400 text-xs sm:text-sm font-bold px-4 py-3 rounded-2xl shadow-2xl border border-amber-500/40 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ================= 1. COMPACT & SLEEK HEADER ================= */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-lg text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0 shadow-inner">
            <Trash2 className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-black text-white tracking-tight">
                Déchets & Pertes
              </h1>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                DDPP Conforme ✓
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5 font-medium">
              <span>Total écarté :</span>
              <strong className="text-rose-400 font-black font-mono">{totalKg.toFixed(1)} kg</strong>
              <span>•</span>
              <span className="text-slate-400">{logs.length} entrée{logs.length > 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="h-11 px-5 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer whitespace-nowrap self-start sm:self-center"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Déclarer une Perte</span>
        </button>

      </div>

      {/* ================= 2. CATEGORY PILLS WITH LIVE WEIGHTS & SEARCH ================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
          {[
            { id: 'all', label: 'Tous', weight: totalKg },
            { id: 'Pâtons / Pâte', label: '🥖 Pâtons', weight: categoryTotals['Pâtons / Pâte'] },
            { id: 'Pâtisseries', label: '🍰 Pâtisseries', weight: categoryTotals['Pâtisseries'] },
            { id: 'Snacking/Salé', label: '🥪 Snacking', weight: categoryTotals['Snacking/Salé'] },
            { id: 'Matières Premières', label: '🥛 Matières 1ères', weight: categoryTotals['Matières Premières'] },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategoryFilter(cat.id)}
              className={`px-3 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedCategoryFilter === cat.id
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <span>{cat.label}</span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                  selectedCategoryFilter === cat.id
                    ? 'bg-slate-950/20 text-slate-950 font-black'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {cat.weight.toFixed(1)}kg
              </span>
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative min-w-[200px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher produit..."
            className="w-full pl-8.5 pr-3 py-2 rounded-2xl bg-slate-900 border border-slate-800 text-xs font-bold text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
          />
        </div>
      </div>

      {/* ================= 3. LIST OF WASTE RECORDS ================= */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-lg text-white">
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white">
              Historique des Déclarations ({filteredLogs.length} entrée{filteredLogs.length > 1 ? 's' : ''})
            </h3>
          </div>
          <span className="text-xs text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
            ✓ Conforme DDPP
          </span>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="p-10 text-center text-slate-400">
            <Trash2 className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-white">Aucun déchet enregistré</h4>
            <p className="text-xs mt-1">Cliquez sur « Déclarer une Perte » pour enregistrer un retrait.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className="p-3.5 sm:p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md transition-all group"
              >
                {/* Left: Info & Photo */}
                <div className="flex items-center gap-3.5 min-w-0">
                  {log.photoUrl ? (
                    <div
                      onClick={() => setPreviewModalImg({ url: log.photoUrl!, title: log.productName })}
                      className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-700 overflow-hidden cursor-pointer shrink-0 relative group"
                      title="Agrandir la photo de preuve"
                    >
                      <img src={log.photoUrl} alt={log.productName} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-slate-950/40 group-hover:bg-slate-950/10 flex items-center justify-center text-[10px] text-white font-bold">
                        🔍
                      </div>
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 text-slate-500">
                      <Trash2 className="w-5 h-5 text-slate-500" />
                    </div>
                  )}

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <strong className="text-xs sm:text-sm font-black text-white group-hover:text-amber-400 transition-colors truncate">
                        {log.productName}
                      </strong>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                        {log.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-400 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        {log.discardedAt}
                      </span>
                      <span>•</span>
                      <span className="text-slate-300 font-bold">👤 {log.discardedBy}</span>
                    </div>

                    {log.notes && (
                      <p className="text-[11px] text-amber-200/80 italic truncate max-w-md">
                        « {log.notes} »
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Quantity & Reason Badge */}
                <div className="flex items-center justify-between sm:justify-end gap-3.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/80">
                  <div className="text-left sm:text-right space-y-0.5">
                    <span className="text-sm sm:text-base font-black text-rose-400 font-mono block">
                      {log.quantityKg} kg
                    </span>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 inline-block">
                      {log.reason}
                    </span>
                  </div>

                  {onDeleteLog && (
                    <button
                      onClick={() => onDeleteLog(log.id)}
                      className="p-2 rounded-xl bg-slate-900 hover:bg-rose-600 text-slate-500 hover:text-white transition-colors cursor-pointer"
                      title="Supprimer cette ligne"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

      {/* ================= 4. MODAL DECLARATION DE PERTE (SIMPLE & ULTRA RAPIDE) ================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md no-print animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl text-white">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-xs">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    Déclarer une Perte
                  </h3>
                  <span className="text-[11px] text-slate-400 font-medium">
                    Saisie ultra-simple & rapide
                  </span>
                </div>
              </div>

              <button
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-xl bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="pt-4 space-y-4">
              
              {/* 1. Product Name & Quick Tags */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-slate-300">
                  Produit / Denrée <span className="text-amber-400">*</span>
                </label>
                
                <input
                  type="text"
                  required
                  placeholder="Ex : Pâtons tradition, Crème pâtissière..."
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full text-sm p-3 rounded-2xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 font-bold focus:outline-hidden focus:border-amber-500 shadow-inner"
                />

                {/* 4 Smart Quick Chips */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { label: '🥖 Pâtons (3.5kg)', name: 'Pâtons Baguette Tradition', cat: 'Pâtons / Pâte' as const, reason: 'Sur-fermentation' as const, kg: '3.5' },
                    { label: '🍰 Crème (1.2kg)', name: 'Crème Pâtissière', cat: 'Pâtisseries' as const, reason: 'DLC Dépassée' as const, kg: '1.2' },
                    { label: '🥐 Viennoiseries (1.8kg)', name: 'Viennoiseries Invendues', cat: 'Pâtisseries' as const, reason: 'Altération / Goût' as const, kg: '1.8' },
                    { label: '🥪 Sandwichs (2kg)', name: 'Sandwichs J-1', cat: 'Snacking/Salé' as const, reason: 'DLC Dépassée' as const, kg: '2.0' },
                  ].map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setProductName(chip.name);
                        setCategory(chip.cat);
                        setReason(chip.reason);
                        setQuantityKg(chip.kg);
                      }}
                      className="text-[10px] font-bold px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500 text-slate-400 hover:text-amber-400 transition-all cursor-pointer"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Weight Selector (Tactile & Big) */}
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                  <span>Poids de la perte :</span>
                  <div className="flex items-center gap-1">
                    {['1', '2', '5'].map((presetKg) => (
                      <button
                        key={presetKg}
                        type="button"
                        onClick={() => setQuantityKg(presetKg)}
                        className={`text-[10px] px-2 py-0.5 rounded-lg font-mono font-black ${
                          quantityKg === presetKg
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {presetKg}kg
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => handleAdjustKg(-0.5)}
                    className="w-11 h-11 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-black text-lg flex items-center justify-center active:scale-95 transition-all"
                  >
                    -
                  </button>

                  <div className="flex items-baseline gap-1 text-center">
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      required
                      value={quantityKg}
                      onChange={(e) => setQuantityKg(e.target.value)}
                      className="w-24 text-center text-2xl font-black text-rose-400 font-mono bg-transparent focus:outline-hidden"
                    />
                    <span className="text-sm font-black text-slate-400">kg</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAdjustKg(1)}
                    className="w-11 h-11 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-black text-lg flex items-center justify-center active:scale-95 transition-all"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* 3. Reason & Category Row */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">
                    Motif :
                  </label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value as any)}
                    className="w-full text-xs p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold focus:outline-hidden focus:border-amber-500"
                  >
                    <option value="DLC Dépassée">📅 DLC Dépassée</option>
                    <option value="Sur-fermentation">💨 Sur-fermentation</option>
                    <option value="Altération / Goût">👅 Goût / Aspect</option>
                    <option value="Erreur Cuisson">🔥 Brûlé / Cuisson</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">
                    Catégorie :
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full text-xs p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold focus:outline-hidden focus:border-amber-500"
                  >
                    <option value="Pâtons / Pâte">🥖 Pâtons</option>
                    <option value="Pâtisseries">🍰 Pâtisseries</option>
                    <option value="Snacking/Salé">🥪 Snacking</option>
                    <option value="Matières Premières">🥛 Matières 1ères</option>
                  </select>
                </div>
              </div>

              {/* 4. Quick Photo (Optional) & Note */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className={`px-3 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 ${
                    photoUrl
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>{photoUrl ? '✓ Photo' : 'Photo'}</span>
                </button>
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handlePhotoUpload}
                />

                <input
                  type="text"
                  placeholder="Note / Justification (facultatif)..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="flex-1 text-xs p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
                />
              </div>

              {/* 5. Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-98 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/25 cursor-pointer transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 text-slate-950" />
                  <span>Valider la Perte ({quantityKg} kg)</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {previewModalImg && (
        <div
          onClick={() => setPreviewModalImg(null)}
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md cursor-pointer animate-in fade-in"
        >
          <div className="relative max-w-xl max-h-[85vh]">
            <img src={previewModalImg.url} alt={previewModalImg.title} className="rounded-2xl max-h-[80vh] w-auto object-contain border border-slate-700 shadow-2xl" />
            <span className="block text-center text-xs text-slate-400 mt-2 font-bold">{previewModalImg.title} • Cliquer pour fermer</span>
          </div>
        </div>
      )}

    </div>
  );
};
