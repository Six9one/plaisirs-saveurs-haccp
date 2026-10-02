import React, { useState, useRef } from 'react';
import type { GoodsReceipt, User } from '../types';
import {
  PackageCheck,
  Camera,
  Plus,
  CheckCircle2,
  Trash2,
  Clock,
  Thermometer,
  FileText,
  Package,
  X,
  Sparkles,
} from 'lucide-react';
import { compressImage } from '../services/imageStorage';
import { HistoricalInvoiceModal } from './HistoricalInvoiceModal';
import { SupplierInvoices } from './SupplierInvoices';

interface ReceptionModuleProps {
  receipts: GoodsReceipt[];
  currentUser: User;
  onAddReceipt: (receipt: Omit<GoodsReceipt, 'id'>) => void;
  onAddBatchReceipts?: (receipts: Omit<GoodsReceipt, 'id'>[]) => void;
  onDeleteReceipt?: (id: string) => void;
}

export const ReceptionModule: React.FC<ReceptionModuleProps> = ({
  receipts,
  currentUser,
  onAddReceipt,
  onAddBatchReceipts,
  onDeleteReceipt,
}) => {
  const [showForm, setShowForm] = useState<boolean>(false);
  const [showHistoricalModal, setShowHistoricalModal] = useState<boolean>(false);
  const [supplier, setSupplier] = useState<string>('');
  const [truckTemp, setTruckTemp] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Dual Photos (Facture & Marchandise)
  const [invoicePhoto, setInvoicePhoto] = useState<string | undefined>(undefined);
  const [goodsPhoto, setGoodsPhoto] = useState<string | undefined>(undefined);

  // Lightbox modal for full photo view
  const [previewModalImg, setPreviewModalImg] = useState<{ url: string; title: string } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const invoiceInputRef = useRef<HTMLInputElement>(null);
  const goodsInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };


  const handleInvoiceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.8 });
      setInvoicePhoto(compressed);
    } catch (err) {
      console.error('Image compression failed', err);
    }
  };

  const handleGoodsUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.8 });
      setGoodsPhoto(compressed);
    } catch (err) {
      console.error('Image compression failed', err);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplier.trim()) {
      alert('Veuillez indiquer le nom du fournisseur ou du magasin (ex: Metro, Transgourmet, Courses).');
      return;
    }

    const tempVal = truckTemp ? parseFloat(truckTemp) : undefined;
    const isCompliant = tempVal === undefined ? true : tempVal <= 4.0;

    const now = new Date();
    const timeFormatted = now.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) + ' ' + now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    onAddReceipt({
      supplier: supplier.trim(),
      category: 'Courses / Marchandises',
      truckTemp: tempVal,
      isTempCompliant: isCompliant,
      isPackageIntact: true,
      timestamp: timeFormatted,
      receivedBy: currentUser?.name || 'Utilisateur',
      invoicePhotoUrl: invoicePhoto,
      goodsPhotoUrl: goodsPhoto,
      photoUrl: invoicePhoto || goodsPhoto,
      status: isCompliant ? 'conforme' : 'reserve',
      notes: notes.trim() || undefined,
    });

    // Reset Form
    setSupplier('');
    setTruckTemp('');
    setNotes('');
    setInvoicePhoto(undefined);
    setGoodsPhoto(undefined);
    setShowForm(false);
    showToast(`✓ Réception "${supplier}" enregistrée avec succès !`);
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-24 animate-in fade-in duration-150">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-white text-slate-950 text-xs sm:text-sm font-bold px-4 py-3 rounded-2xl shadow-2xl border border-slate-200 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3">
          <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Bar (TwinPizza style) */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:px-5 sm:py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3.5 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <PackageCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-white leading-tight">
              Réception Marchandises
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Contrôle livraison, pointage et archivage factures
            </p>
          </div>
        </div>

        {/* Action Buttons: Aligned Grid on Mobile / Flex on Desktop */}
        <div className={`grid ${currentUser?.name === 'Adel B.' ? 'grid-cols-2' : 'grid-cols-1'} gap-2 w-full md:w-auto md:flex md:items-center shrink-0`}>
          {currentUser?.name === 'Adel B.' && (
            <button
              type="button"
              onClick={() => setShowHistoricalModal(true)}
              className="h-10 px-3 sm:px-3.5 rounded-2xl bg-amber-500/15 hover:bg-amber-500/25 active:scale-95 text-amber-400 border border-amber-500/30 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs whitespace-nowrap"
            >
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Archiver Factures</span>
            </button>
          )}

          <button
            onClick={() => setShowForm(!showForm)}
            className={`h-10 px-3.5 sm:px-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shrink-0 whitespace-nowrap ${
              showForm
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                : 'bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 shadow-emerald-500/20'
            }`}
          >
            {showForm ? (
              <>
                <X className="w-4 h-4 shrink-0" />
                <span>Fermer</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 shrink-0 stroke-[3]" />
                <span>Faire les Courses</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* "Nouvelle Réception" Form Card (Exact TwinPizza Layout) */}
      {showForm && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl text-white animate-in fade-in zoom-in-95 duration-150">
          
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <Package className="w-4 h-4 text-emerald-400" />
              <span>Nouvelle Réception</span>
            </div>
            <button
              onClick={() => setShowForm(false)}
              className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="pt-4 space-y-4">
            
            {/* Row 1: Fournisseur & Température */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Fournisseur */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Fournisseur <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="KFA, Metro, Transgourmet, Soufflet..."
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  className="w-full text-xs sm:text-sm p-3 rounded-2xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                />
              </div>

              {/* Température à réception */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Thermometer className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Température à réception (°C)</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="Ex: 3.5"
                  value={truckTemp}
                  onChange={(e) => setTruckTemp(e.target.value)}
                  className="w-full text-xs sm:text-sm p-3 rounded-2xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 font-mono focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>

            {/* Row 2: Deux grandes zones de photos (Facture & Marchandise) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              
              {/* Photo Facture */}
              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Photo Facture</span>
                  </span>
                  <span className="text-[10px] text-amber-400 font-mono">Recommandé</span>
                </div>

                {invoicePhoto ? (
                  <div className="relative h-36 w-full rounded-2xl overflow-hidden border border-emerald-500/50 shadow-md group">
                    <img
                      src={invoicePhoto}
                      alt="Facture"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setInvoicePhoto(undefined)}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-900/80 hover:bg-rose-600 text-white text-xs font-bold backdrop-blur-xs transition-colors"
                      title="Supprimer la photo"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => invoiceInputRef.current?.click()}
                    className="h-32 sm:h-36 rounded-2xl border-2 border-dashed border-slate-700 hover:border-emerald-500 bg-slate-950/50 hover:bg-slate-950 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer text-slate-400 hover:text-emerald-400"
                  >
                    <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400">
                      <Camera className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-slate-300">Prendre la Facture</span>
                  </div>
                )}

                <input
                  ref={invoiceInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleInvoiceUpload}
                  className="hidden"
                />
              </div>

              {/* Photo Marchandise */}
              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Photo Marchandise</span>
                  </span>
                  <span className="text-[10px] text-amber-400 font-mono">Recommandé</span>
                </div>

                {goodsPhoto ? (
                  <div className="relative h-36 w-full rounded-2xl overflow-hidden border border-emerald-500/50 shadow-md group">
                    <img
                      src={goodsPhoto}
                      alt="Marchandise"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setGoodsPhoto(undefined)}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-900/80 hover:bg-rose-600 text-white text-xs font-bold backdrop-blur-xs transition-colors"
                      title="Supprimer la photo"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => goodsInputRef.current?.click()}
                    className="h-32 sm:h-36 rounded-2xl border-2 border-dashed border-slate-700 hover:border-emerald-500 bg-slate-950/50 hover:bg-slate-950 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer text-slate-400 hover:text-emerald-400"
                  >
                    <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400">
                      <Camera className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-slate-300">Prendre la Marchandise</span>
                  </div>
                )}

                <input
                  ref={goodsInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleGoodsUpload}
                  className="hidden"
                />
              </div>

            </div>

            {/* Row 3: Notes / Remarques */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Notes / Remarques :
              </label>
              <input
                type="text"
                placeholder="Ex: DLC courte sur la mozza, 1 carton manquant, emballages propres..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full text-xs sm:text-sm p-3 rounded-2xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
              />
            </div>

            {/* Row 4: Submit Buttons */}
            <div className="flex flex-col sm:flex-row gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 py-3 rounded-2xl bg-white text-slate-950 font-bold text-xs hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="flex-1 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-bold text-xs transition-all shadow-lg shadow-emerald-600/25 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Valider la Réception</span>
              </button>
            </div>

          </form>

        </div>
      )}

      {/* Bottom Section: RÉCEPTIONS DU JOUR */}
      <div className="pt-2">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider font-mono">
            <Clock className="w-4 h-4" />
            <span>RÉCEPTIONS DU JOUR ({receipts.length})</span>
          </div>
        </div>

        {receipts.length === 0 ? (
          /* Empty State */
          <div className="bg-slate-900/60 border border-dashed border-slate-800 rounded-3xl p-8 sm:p-12 text-center text-white flex flex-col items-center justify-center my-2 shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-slate-800 text-emerald-400 flex items-center justify-center mb-3 border border-slate-700">
              <PackageCheck className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-white">Aucune réception aujourd'hui</h3>
            <p className="text-xs text-slate-400 max-w-sm mt-1 mb-5">
              Enregistrez vos livraisons de marchandises et courses pour archiver les factures et contrôler la chaîne du froid.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="py-2.5 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Enregistrer une Réception</span>
            </button>
          </div>
        ) : (
          /* Receipts List */
          <div className="space-y-2.5">
            {receipts.map((rec) => (
              <div
                key={rec.id}
                className="bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs transition-colors"
              >
                {/* Left: Supplier Info & Time */}
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-slate-950 text-emerald-400 border border-slate-800 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                    <Package className="w-5 h-5" />
                  </div>
                  
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-white truncate">
                      {rec.supplier}
                    </h4>
                    <div className="text-xs text-slate-400 flex items-center gap-2 flex-wrap mt-0.5">
                      <span className="font-mono">{rec.timestamp}</span>
                      {rec.receivedBy && <span>• {rec.receivedBy}</span>}
                      {rec.notes && <span className="text-slate-300 italic truncate max-w-xs">• "{rec.notes}"</span>}
                    </div>
                  </div>
                </div>

                {/* Right: Temp Badge + Photo Thumbnails + Delete */}
                <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0">
                  {rec.truckTemp !== undefined ? (
                    <span
                      className={`text-xs font-black font-mono px-2.5 py-1 rounded-xl ${
                        rec.truckTemp <= 4
                          ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/50'
                          : 'bg-rose-950/80 text-rose-400 border border-rose-800/50'
                      }`}
                    >
                      {rec.truckTemp > 0 ? `+${rec.truckTemp}` : rec.truckTemp}°C
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-slate-500 font-mono px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-800">
                      Conforme ✓
                    </span>
                  )}

                  {/* Facture Thumbnail */}
                  {rec.invoicePhotoUrl && (
                    <button
                      type="button"
                      onClick={() => setPreviewModalImg({ url: rec.invoicePhotoUrl!, title: `Facture - ${rec.supplier}` })}
                      className="w-9 h-9 rounded-xl overflow-hidden border border-slate-700 hover:border-emerald-400 transition-colors shrink-0 cursor-pointer"
                      title="Voir la facture"
                    >
                      <img src={rec.invoicePhotoUrl} alt="Facture" className="w-full h-full object-cover" />
                    </button>
                  )}

                  {/* Marchandise Thumbnail */}
                  {rec.goodsPhotoUrl && (
                    <button
                      type="button"
                      onClick={() => setPreviewModalImg({ url: rec.goodsPhotoUrl!, title: `Marchandise - ${rec.supplier}` })}
                      className="w-9 h-9 rounded-xl overflow-hidden border border-slate-700 hover:border-emerald-400 transition-colors shrink-0 cursor-pointer"
                      title="Voir la marchandise"
                    >
                      <img src={rec.goodsPhotoUrl} alt="Marchandise" className="w-full h-full object-cover" />
                    </button>
                  )}

                  {/* Delete Button */}
                  {onDeleteReceipt && (
                    <button
                      onClick={() => {
                        if (confirm(`Supprimer la réception de "${rec.supplier}" ?`)) {
                          onDeleteReceipt(rec.id);
                          showToast(`Réception "${rec.supplier}" supprimée.`);
                        }
                      }}
                      className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                      title="Supprimer"
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

      {/* Lightbox Photo Preview Modal */}
      {previewModalImg && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md no-print cursor-pointer"
          onClick={() => setPreviewModalImg(null)}
        >
          <div
            className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-4 shadow-2xl text-white overflow-hidden animate-in fade-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h4 className="text-sm font-bold text-white truncate">{previewModalImg.title}</h4>
              <button
                onClick={() => setPreviewModalImg(null)}
                className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>
            <div className="mt-3 max-h-[70vh] rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center">
              <img
                src={previewModalImg.url}
                alt="Aperçu"
                className="w-full h-full max-h-[70vh] object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* Historical Invoices Archiving Modal (Adel B) */}
      {showHistoricalModal && (
        <HistoricalInvoiceModal
          currentUser={currentUser}
          onClose={() => setShowHistoricalModal(false)}
          onAddBatchReceipts={(batch) => {
            if (onAddBatchReceipts) {
              onAddBatchReceipts(batch);
            } else {
              batch.forEach((r) => onAddReceipt(r));
            }
            showToast(`✓ ${batch.length} facture${batch.length > 1 ? 's' : ''} archivée${batch.length > 1 ? 's' : ''} avec succès !`);
          }}
        />
      )}


      {/* Factures de réception marchandises (PDF) */}
      <div className="pt-2">
        <h2 className="text-sm font-black text-white px-1 mb-2">Factures</h2>
        <SupplierInvoices />
      </div>
    </div>
  );
};
