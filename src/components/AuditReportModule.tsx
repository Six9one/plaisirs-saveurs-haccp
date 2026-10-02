import React, { useState } from 'react';
import type {
  TemperatureTarget,
  TemperatureRecord,
  CleaningTask,
  GoodsReceipt,
  SecondaryDlcItem,
  NonConformanceIncident,
  User,
} from '../types';
import { DEFAULT_USERS } from '../utils/storage';
import {
  Printer,
  Search,
  Sparkles,
  Thermometer,
  PackageCheck,
  Tag,
  Eye,
  X,
  Receipt,
  FileText,
  FileCheck2,
  Trash2,
} from 'lucide-react';
import { safeFormatTime } from '../utils/formatters';
import supplierInvoicesData from '../data/supplierInvoices.json';

interface SupplierInvoice {
  date: string;
  supplier: string;
  number: string;
  avoir: boolean;
  file: string;
}
const SUPPLIER_INVOICES = supplierInvoicesData as SupplierInvoice[];

interface AuditReportModuleProps {
  targets: TemperatureTarget[];
  records: TemperatureRecord[];
  tasks: CleaningTask[];
  receipts: GoodsReceipt[];
  secondaryDlc: SecondaryDlcItem[];
  incidents: NonConformanceIncident[];
  users?: User[];
  currentUser?: User;
  onDeleteReceipt?: (id: string) => void;
  onDeleteRecord?: (id: string) => void;
  onDeleteSecondaryDlc?: (id: string) => void;
}

export const AuditReportModule: React.FC<AuditReportModuleProps> = ({
  targets,
  records,
  tasks,
  receipts,
  secondaryDlc,
  users = DEFAULT_USERS,
  onDeleteReceipt,
  onDeleteRecord,
  onDeleteSecondaryDlc,
}) => {
  // Tab switcher
  const [activeTab, setActiveTab] = useState<
    'factures' | 'receipts' | 'cleanings' | 'temperatures' | 'dlc' | 'full_dossier'
  >('factures');

  // Factures fournisseurs (PDF dans /public/factures)
  const invoiceYears = Array.from(new Set(SUPPLIER_INVOICES.map((i) => i.date.slice(0, 4)))).sort().reverse();
  const invoiceSuppliers = Array.from(new Set(SUPPLIER_INVOICES.map((i) => i.supplier)));
  const [invoiceYear, setInvoiceYear] = useState<string>(invoiceYears[0] ?? '');
  const [invoiceSupplier, setInvoiceSupplier] = useState<string>('Tous');
  const [openInvoice, setOpenInvoice] = useState<SupplierInvoice | null>(null);
  const invoiceMonths = Object.entries(
    SUPPLIER_INVOICES.filter(
      (i) => i.date.startsWith(invoiceYear) && (invoiceSupplier === 'Tous' || i.supplier === invoiceSupplier)
    ).reduce<Record<string, SupplierInvoice[]>>((acc, inv) => {
      const label = new Date(inv.date + 'T12:00:00').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      (acc[label] ||= []).push(inv);
      return acc;
    }, {})
  );

  const [dateFilter, setDateFilter] = useState<'today' | '7days' | '30days' | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string } | null>(null);

  const currentDateFormatted = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const currentTimeFormatted = new Date().toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const formatDisplayDate = (timestamp: string): string => {
    if (!timestamp) return 'Aujourd’hui';
    if (timestamp.includes('/')) {
      const parts = timestamp.split(' ');
      return parts[0];
    }
    if (timestamp.includes('Aujourd')) return 'Aujourd’hui';
    const d = new Date(timestamp);
    if (isNaN(d.getTime())) return timestamp;
    return d.toLocaleDateString('fr-FR');
  };

  // Calculate cutoff timestamp for filter
  const getFilterCutoff = () => {
    const now = new Date();
    if (dateFilter === 'today') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return start.getTime();
    }
    if (dateFilter === '7days') {
      return now.getTime() - 7 * 24 * 3600 * 1000;
    }
    if (dateFilter === '30days') {
      return now.getTime() - 30 * 24 * 3600 * 1000;
    }
    return 0;
  };

  const cutoff = getFilterCutoff();

  const isDateIncluded = (timestampOrDateStr?: string) => {
    if (dateFilter === 'all' || !timestampOrDateStr) return true;
    const t = new Date(timestampOrDateStr).getTime();
    return isNaN(t) || t >= cutoff;
  };

  // Filtered Datasets
  const filteredReceipts = receipts.filter((r) => {
    const matchDate = isDateIncluded(r.timestamp);
    const matchSearch =
      !searchQuery.trim() ||
      r.supplier.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.lotNumber && r.lotNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.category && r.category.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchDate && matchSearch;
  });

  const filteredCleanings = tasks.filter((t) => {
    if (!t.completed) return false;
    const matchDate = isDateIncluded(t.completedAt ? new Date().toISOString() : undefined);
    const matchSearch =
      !searchQuery.trim() ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.zone.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.completedBy && t.completedBy.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchDate && matchSearch;
  });

  const filteredRecords = records.filter((rec) => {
    const matchDate = isDateIncluded(rec.timestamp);
    const matchSearch =
      !searchQuery.trim() ||
      rec.targetName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.userName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchDate && matchSearch;
  });

  const filteredDlc = secondaryDlc.filter((item) => {
    const matchDate = isDateIncluded(item.prepDate);
    const matchSearch =
      !searchQuery.trim() ||
      item.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.lotOriginal && item.lotOriginal.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchDate && matchSearch;
  });

  const handlePrint = () => {
    window.print();
  };

  const tabBtns = [
    { id: 'factures' as const, label: 'Factures', icon: Receipt },
    { id: 'receipts' as const, label: 'Réceptions', icon: PackageCheck },
    { id: 'cleanings' as const, label: 'Nettoyage', icon: Sparkles },
    { id: 'temperatures' as const, label: 'Températures', icon: Thermometer },
    { id: 'dlc' as const, label: 'DLC', icon: Tag },
  ];

  return (
    <div className="space-y-3 max-w-5xl mx-auto pb-24 px-1 sm:px-0 animate-in fade-in duration-150">

      {/* En-tête minimal */}
      <div className="no-print flex items-center justify-between gap-3 px-1">
        <h2 className="text-lg font-black text-white">Historique</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab(activeTab === 'full_dossier' ? 'factures' : 'full_dossier')}
            className="h-10 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>{activeTab === 'full_dossier' ? 'Fermer le dossier' : 'Dossier HACCP'}</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="h-10 px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimer</span>
          </button>
        </div>
      </div>

      {/* Onglets */}
      <div className="no-print grid grid-cols-5 gap-2">
        {tabBtns.map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`py-3 rounded-2xl flex flex-col items-center gap-1 font-black text-xs sm:text-sm transition-all cursor-pointer ${
                active
                  ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                  : 'bg-slate-900 border border-slate-800 text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* FACTURES FOURNISSEURS (PDF) */}
      {activeTab === 'factures' && (
        <div className="no-print space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {invoiceYears.map((y) => (
              <button
                key={y}
                type="button"
                onClick={() => setInvoiceYear(y)}
                className={`px-5 py-2 rounded-2xl text-sm font-black cursor-pointer ${
                  invoiceYear === y ? 'bg-white text-slate-950' : 'bg-slate-900 border border-slate-800 text-slate-300'
                }`}
              >
                {y}
              </button>
            ))}
            <span className="w-px h-6 bg-slate-800 mx-1" />
            {['Tous', ...invoiceSuppliers].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setInvoiceSupplier(s)}
                className={`px-3 py-2 rounded-2xl text-xs font-bold cursor-pointer ${
                  invoiceSupplier === s ? 'bg-amber-500 text-slate-950' : 'bg-slate-900 border border-slate-800 text-slate-300'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {invoiceMonths.map(([month, list]) => (
            <div key={month} className="space-y-1.5">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 px-1 pt-1">{month}</h3>
              {list.map((inv) => (
                <button
                  key={inv.file}
                  type="button"
                  onClick={() => setOpenInvoice(inv)}
                  className="w-full bg-slate-900 border border-slate-800 hover:border-amber-500/50 active:scale-[0.99] px-4 py-3 rounded-2xl flex items-center justify-between gap-3 text-left transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="w-5 h-5 text-amber-400 shrink-0" />
                    <span className="text-sm font-black text-white truncate">{inv.supplier}</span>
                    {inv.avoir && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300">Avoir</span>
                    )}
                  </div>
                  <span className="text-sm font-bold text-slate-300 shrink-0">
                    {new Date(inv.date + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                  </span>
                </button>
              ))}
            </div>
          ))}

          {invoiceMonths.length === 0 && (
            <div className="py-10 text-center text-slate-500 text-sm">Aucune facture</div>
          )}
        </div>
      )}

      {/* Visionneuse PDF */}
      {openInvoice && (
        <div className="no-print fixed inset-0 z-50 bg-slate-950/95 flex flex-col p-3 gap-2">
          <div className="flex items-center justify-between gap-2">
            <div className="text-white font-black text-sm truncate">
              {openInvoice.supplier} • {new Date(openInvoice.date + 'T12:00:00').toLocaleDateString('fr-FR')}
            </div>
            <div className="flex items-center gap-2">
              <a
                href={openInvoice.file}
                target="_blank"
                rel="noreferrer"
                className="h-10 px-4 rounded-2xl bg-slate-800 text-white font-bold text-xs flex items-center"
              >
                Ouvrir
              </a>
              <button
                type="button"
                onClick={() => setOpenInvoice(null)}
                className="h-10 w-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center cursor-pointer"
                aria-label="Fermer"
              >
                <X className="w-5 h-5 stroke-[3]" />
              </button>
            </div>
          </div>
          <iframe src={openInvoice.file} title="Facture" className="flex-1 w-full rounded-2xl bg-white" />
        </div>
      )}

      {/* Recherche & filtre date (autres onglets) */}
      {activeTab !== 'factures' && activeTab !== 'full_dossier' && (
      <div className="no-print bg-slate-900 border border-slate-800 rounded-3xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-white">
        
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher (fournisseur, machine, lot...)"
            className="w-full pl-9 pr-3.5 py-2 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-medium text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Date Filter Segmented Control */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto bg-slate-950 p-1 rounded-2xl border border-slate-800 overflow-x-auto">
          <button
            type="button"
            onClick={() => setDateFilter('today')}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              dateFilter === 'today' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            Aujourd'hui
          </button>
          <button
            type="button"
            onClick={() => setDateFilter('7days')}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              dateFilter === '7days' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            7 jours
          </button>
          <button
            type="button"
            onClick={() => setDateFilter('30days')}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              dateFilter === '30days' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            30 jours
          </button>
          <button
            type="button"
            onClick={() => setDateFilter('all')}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              dateFilter === 'all' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            Tout
          </button>
        </div>

      </div>

      )}

      {/* ================= 4. TAB CONTENTS ================= */}

      {/* 4.1 FACTURES & RECEPTIONS TAB */}
      {activeTab === 'receipts' && (
        <div className="space-y-3 no-print">
          {filteredReceipts.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center text-slate-400">
              <PackageCheck className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-white">Aucune facture ou réception trouvée</h4>
              <p className="text-xs mt-1">Ajoutez vos livraisons dans l'onglet "Réception" avec photo du bon ou de la facture.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredReceipts.map((rec) => (
                <div
                  key={rec.id}
                  className="bg-slate-900 border border-slate-800 rounded-3xl p-4 flex flex-col justify-between space-y-3 shadow-md"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-400 border border-blue-500/30">
                          {rec.category || 'Livraison'}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          {formatDisplayDate(rec.timestamp)} • {safeFormatTime(rec.timestamp)}
                        </span>
                      </div>
                      <h4 className="text-base font-black text-white mt-1">
                        {rec.supplier}
                      </h4>
                      {rec.notes && (
                        <p className="text-xs text-slate-300 font-medium italic">"{rec.notes}"</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${
                          rec.status === 'conforme'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {rec.status === 'conforme' ? '✓ Conforme' : '⚠️ Non Conforme'}
                      </span>

                      {onDeleteReceipt && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteReceipt(rec.id);
                          }}
                          className="p-1.5 rounded-xl bg-slate-950 hover:bg-rose-600 text-slate-400 hover:text-white border border-slate-800 transition-colors cursor-pointer"
                          title="Supprimer cette facture"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Photos Section */}
                  <div className="flex items-center gap-2">
                    {rec.invoicePhotoUrl ? (
                      <button
                        type="button"
                        onClick={() =>
                          setLightboxImage({
                            url: rec.invoicePhotoUrl!,
                            title: `Facture / Bon • ${rec.supplier}`,
                          })
                        }
                        className="flex-1 h-24 rounded-2xl overflow-hidden border border-slate-700 relative group cursor-pointer"
                      >
                        <img
                          src={rec.invoicePhotoUrl}
                          alt="Facture"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-1 text-white font-bold text-[10px] opacity-90 group-hover:opacity-100 backdrop-blur-xs">
                          <Eye className="w-3.5 h-3.5" /> Voir Facture
                        </div>
                      </button>
                    ) : (
                      <div className="flex-1 h-20 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-600 text-xs font-semibold">
                        Pas de photo facture
                      </div>
                    )}

                    {rec.goodsPhotoUrl && (
                      <button
                        type="button"
                        onClick={() =>
                          setLightboxImage({
                            url: rec.goodsPhotoUrl!,
                            title: `Marchandises • ${rec.supplier}`,
                          })
                        }
                        className="w-24 h-24 rounded-2xl overflow-hidden border border-slate-700 relative group cursor-pointer"
                      >
                        <img
                          src={rec.goodsPhotoUrl}
                          alt="Marchandises"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-1 text-white font-bold text-[10px] opacity-90 group-hover:opacity-100 backdrop-blur-xs">
                          <Eye className="w-3 h-3" /> Colis
                        </div>
                      </button>
                    )}
                  </div>

                  {/* Metadata Row */}
                  <div className="text-[11px] text-slate-400 font-medium flex items-center justify-between pt-2 border-t border-slate-800/80">
                    <span>Lot : <strong className="text-slate-200">{rec.lotNumber || 'N/A'}</strong></span>
                    <span>T° Camion : <strong className="text-amber-400">{rec.truckTemp !== undefined ? `${rec.truckTemp}°C` : 'Ambiante'}</strong></span>
                    <span>Reçu par : <strong className="text-slate-200">{rec.receivedBy || 'Opérateur'}</strong></span>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4.2 NETTOYAGE MACHINES TAB */}
      {activeTab === 'cleanings' && (
        <div className="space-y-3 no-print">
          {filteredCleanings.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center text-slate-400">
              <Sparkles className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-white">Aucun nettoyage enregistré</h4>
              <p className="text-xs mt-1">Validez vos nettoyages de machines depuis l'onglet "Nettoyage".</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {filteredCleanings.map((task) => {
                const userObj = users.find((u) => u.name === task.completedBy);
                return (
                  <div
                    key={task.id}
                    className="bg-slate-900 border border-slate-800 rounded-3xl p-4 flex flex-col justify-between space-y-3 shadow-md"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {task.zone}
                        </span>
                        <h4 className="text-sm sm:text-base font-black text-white mt-1">
                          {task.name}
                        </h4>
                      </div>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950">
                        Fait ✓
                      </span>
                    </div>

                    {/* Cleaning Photo Preview if available */}
                    {task.photoUrl ? (
                      <button
                        type="button"
                        onClick={() =>
                          setLightboxImage({
                            url: task.photoUrl!,
                            title: `Preuve Nettoyage • ${task.name}`,
                          })
                        }
                        className="h-28 w-full rounded-2xl overflow-hidden border border-emerald-500/30 relative group cursor-pointer"
                      >
                        <img
                          src={task.photoUrl}
                          alt="Nettoyage"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-1 text-white font-bold text-[11px] opacity-90 group-hover:opacity-100 backdrop-blur-xs">
                          <Eye className="w-4 h-4" /> Preuve Nettoyage Propre
                        </div>
                      </button>
                    ) : (
                      <div className="h-16 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-500 text-xs font-semibold">
                        Nettoyé sans photo
                      </div>
                    )}

                    {/* Operator & Note */}
                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <div
                          className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center text-[10px] font-black text-white shrink-0"
                          style={{
                            backgroundColor: userObj?.avatarColor || '#10b981',
                            border: `1.5px solid ${userObj?.avatarColor || '#10b981'}`,
                          }}
                        >
                          {userObj?.avatarUrl ? (
                            <img src={userObj.avatarUrl} alt={userObj.name} className="w-full h-full object-cover" />
                          ) : (
                            (task.completedBy || 'U').charAt(0)
                          )}
                        </div>
                        <span className="font-bold text-white">{task.completedBy}</span>
                      </div>
                      <span className="text-slate-400 font-mono text-[11px]">{task.completedAt}</span>
                    </div>

                    {task.notes && (
                      <p className="text-[11px] text-slate-300 bg-slate-950/60 p-2 rounded-xl border border-slate-800 font-medium">
                        "{task.notes}"
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 4.3 RELEVES TEMPERATURES TAB */}
      {activeTab === 'temperatures' && (
        <div className="space-y-3 no-print">
          {filteredRecords.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center text-slate-400">
              <Thermometer className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-white">Aucun relevé de température trouvé</h4>
              <p className="text-xs mt-1">Utilisez l'onglet "Relevés" pour saisir ou auto-générer les températures.</p>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-md overflow-hidden">
              <div className="space-y-2">
                {filteredRecords.map((rec) => (
                  <div
                    key={rec.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-white text-sm">{rec.targetName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          (Norme: {rec.minTemp}°C à {rec.maxTemp}°C)
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {formatDisplayDate(rec.timestamp)} • {safeFormatTime(rec.timestamp)} • Par <strong className="text-slate-200">{rec.userName}</strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5 self-end sm:self-center">
                      <span
                        className={`text-base font-black font-mono px-3 py-1 rounded-xl ${
                          rec.status === 'alerte'
                            ? 'bg-rose-900/40 text-rose-300 border border-rose-700/50'
                            : 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
                        }`}
                      >
                        {rec.value > 0 ? `+${rec.value}` : rec.value}°C
                      </span>
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          rec.status === 'alerte' ? 'bg-rose-600 text-white' : 'bg-emerald-500 text-slate-950'
                        }`}
                      >
                        {rec.status === 'alerte' ? 'Alerte' : 'Conforme ✓'}
                      </span>

                      {onDeleteRecord && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteRecord(rec.id);
                          }}
                          className="p-1.5 rounded-xl bg-slate-950 hover:bg-rose-600 text-slate-400 hover:text-white border border-slate-800 transition-colors cursor-pointer"
                          title="Supprimer ce relevé"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4.4 DLC SECONDAIRES TAB */}
      {activeTab === 'dlc' && (
        <div className="space-y-3 no-print">
          {filteredDlc.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center text-slate-400">
              <Tag className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-white">Aucune DLC secondaire enregistrée</h4>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {filteredDlc.map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-900 border border-slate-800 rounded-3xl p-4 flex flex-col justify-between space-y-2 shadow-md"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {item.category}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-slate-400 font-mono">Lot: {item.lotOriginal || 'N/A'}</span>
                      {onDeleteSecondaryDlc && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteSecondaryDlc(item.id);
                          }}
                          className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-950 transition-colors cursor-pointer"
                          title="Supprimer cette DLC"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <h4 className="text-base font-black text-white leading-snug">{item.productName}</h4>
                  <div className="text-xs text-slate-300 space-y-0.5 pt-2 border-t border-slate-800 font-medium">
                    <p>Préparé le : <strong className="text-white">{item.prepDate}</strong></p>
                    <p>À consommer avant : <strong className="text-amber-400">{item.expiryDate}</strong></p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= 5. OFFICIAL CERTIFIED DOSSIER SANITAIRE (PRINT READY / A4) ================= */}
      {(activeTab === 'full_dossier' || true) && (
        <div className={`bg-white text-slate-900 rounded-3xl p-5 sm:p-10 shadow-2xl border border-slate-200 ${activeTab !== 'full_dossier' ? 'hidden print:block' : 'block'}`}>
          
          {/* Top Bar for viewing full dossier (No-Print) */}
          <div className="no-print mb-6 p-3 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between gap-2 shadow-lg">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
              <FileCheck2 className="w-4 h-4" />
              <span>Dossier d'Audit PMS Ouvert</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-1.5 cursor-pointer active:scale-95 transition-transform"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimer PDF</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('factures')}
                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
              >
                <X className="w-3.5 h-3.5" />
                <span>✕ Fermer le dossier</span>
              </button>
            </div>
          </div>

          {/* Header of Audit Document */}
          <div className="flex items-start justify-between gap-4 pb-6 border-b-2 border-slate-900">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-amber-500 text-slate-950 font-black text-2xl flex items-center justify-center shadow-md">
                P&S
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-950 uppercase tracking-tight">
                  Plaisirs & Saveurs • Dossier Sanitaire
                </h1>
                <p className="text-xs text-slate-600 font-semibold">
                  Plan de Maîtrise Sanitaire (PMS) • Réglementation HACCP (CE n° 852/2004)
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[10px] font-black px-2.5 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-md uppercase">
                    Registre Conforme
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    Édité le {currentDateFormatted} à {currentTimeFormatted}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-right hidden sm:block">
              <div className="text-xs font-black uppercase text-slate-900">Boulangerie-Pâtisserie</div>
              <div className="text-[11px] text-slate-600">Plaisirs & Saveurs Artisanale</div>
              <div className="text-[10px] text-slate-500 font-mono mt-1">Ref: HACCP-2026-PS</div>
            </div>
          </div>

          {/* Bakery Metadata Box */}
          <div className="my-6 p-4 bg-slate-50 border border-slate-200 rounded-2xl grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-500 block">Établissement</span>
              <strong className="text-slate-900">Plaisirs & Saveurs</strong>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-500 block">Responsables</span>
              <strong className="text-slate-900">Bader L. / Adel B.</strong>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-500 block">Équipe Boulangerie</span>
              <strong className="text-slate-900">Hamza M., Said N., Said dz</strong>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-500 block">Enceintes Froid</span>
              <strong className="text-slate-900">{targets.length} appareils suivis</strong>
            </div>
          </div>

          {/* Section 1: Relevés de Températures */}
          <div className="my-6 space-y-2">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2 border-b border-slate-300 pb-1">
              <Thermometer className="w-4 h-4 text-amber-600" />
              1. Registre des Relevés de Températures (Froid Positif & Négatif)
            </h3>
            
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 text-[11px] font-black uppercase text-slate-700">
                  <th className="p-2">Appareil</th>
                  <th className="p-2">Norme</th>
                  <th className="p-2">T° Relevée</th>
                  <th className="p-2">Statut</th>
                  <th className="p-2">Date & Heure</th>
                  <th className="p-2">Opérateur</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {records.slice(-10).reverse().map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50">
                    <td className="p-2 font-bold text-slate-900">{rec.targetName}</td>
                    <td className="p-2 text-slate-600 font-mono">{rec.minTemp}°C à {rec.maxTemp}°C</td>
                    <td className="p-2 font-black font-mono">{rec.value > 0 ? `+${rec.value}` : rec.value}°C</td>
                    <td className="p-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${rec.status === 'alerte' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
                        {rec.status === 'alerte' ? 'Alerte' : 'Conforme'}
                      </span>
                    </td>
                    <td className="p-2 text-slate-600 font-mono">{new Date(rec.timestamp).toLocaleDateString('fr-FR')} {safeFormatTime(rec.timestamp)}</td>
                    <td className="p-2 text-slate-800 font-medium">{rec.userName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Section 2: Réceptions & Factures */}
          <div className="my-6 space-y-2">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2 border-b border-slate-300 pb-1">
              <Receipt className="w-4 h-4 text-blue-600" />
              2. Traçabilité des Réceptions de Marchandises & Factures
            </h3>
            
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 text-[11px] font-black uppercase text-slate-700">
                  <th className="p-2">Fournisseur / Catégorie</th>
                  <th className="p-2">N° Lot</th>
                  <th className="p-2">T° Camion</th>
                  <th className="p-2">Conformité</th>
                  <th className="p-2">Date</th>
                  <th className="p-2">Réceptionné par</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {receipts.slice(-8).reverse().map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50">
                    <td className="p-2 font-bold text-slate-900">{rec.supplier} {rec.category ? `(${rec.category})` : ''}</td>
                    <td className="p-2 font-mono text-slate-700">{rec.lotNumber || 'N/A'}</td>
                    <td className="p-2 font-mono">{rec.truckTemp !== undefined ? `${rec.truckTemp}°C` : 'Ambiante'}</td>
                    <td className="p-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-100 text-emerald-800">
                        Conforme
                      </span>
                    </td>
                    <td className="p-2 text-slate-600 font-mono">{new Date(rec.timestamp).toLocaleDateString('fr-FR')}</td>
                    <td className="p-2 text-slate-800 font-medium">{rec.receivedBy || 'Opérateur'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Section 3: Plan de Nettoyage */}
          <div className="my-6 space-y-2">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2 border-b border-slate-300 pb-1">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              3. Registre du Plan de Nettoyage & Désinfection
            </h3>
            
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 text-[11px] font-black uppercase text-slate-700">
                  <th className="p-2">Matériel / Zone</th>
                  <th className="p-2">Fréquence</th>
                  <th className="p-2">Statut</th>
                  <th className="p-2">Nettoyé par</th>
                  <th className="p-2">Remarque</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {tasks.filter((t) => t.completed).map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="p-2 font-bold text-slate-900">{t.name} ({t.zone})</td>
                    <td className="p-2 text-slate-600">{t.frequency}</td>
                    <td className="p-2 font-black text-emerald-700">Validé ✓ ({t.completedAt})</td>
                    <td className="p-2 font-medium text-slate-800">{t.completedBy}</td>
                    <td className="p-2 text-slate-600 italic">{t.notes || 'R.A.S.'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Section 4: Plan de Lutte Anti-Nuisibles (EDEN VERT 3D) */}
          <div className="my-6 space-y-2">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2 border-b border-slate-300 pb-1">
              <FileCheck2 className="w-4 h-4 text-emerald-600" />
              4. Lutte Anti-Nuisibles • Contrat Officiel EDEN VERT 3D (MJC 3D)
            </h3>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Prestataire Agréé</span>
                  <strong className="text-slate-900">EDEN VERT 3D (SARL MJC 3D)</strong>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">N° Contrat & Réf</span>
                  <strong className="text-slate-900 font-mono">CH-25-97 (DCH-25-226)</strong>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Technicien Certibiocide</span>
                  <strong className="text-slate-900">Jérémy CLAIRE (02.35.03.84.59)</strong>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Fréquence</span>
                  <strong className="text-emerald-700">4 passages/an (Trimestriel)</strong>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between text-[11px] text-slate-700">
                <span>Dernier passage réalisé : <strong className="text-slate-900">08/06/2026</strong> (Facture F76-26-01207 • 162,00 € TTC)</span>
                <span>Prochaine visite planifiée : <strong className="text-amber-700">08/09/2026</strong></span>
                <span className="text-emerald-700 font-bold">✓ Traitement préventif & curatif rongeurs / blattes conforme HACCP</span>
              </div>
            </div>
          </div>

          {/* Signatures & Bakery Stamp */}
          <div className="mt-10 pt-6 border-t-2 border-slate-900 grid grid-cols-2 gap-8 text-xs">
            <div className="p-4 border border-dashed border-slate-400 rounded-2xl h-28 flex flex-col justify-between">
              <span className="font-black uppercase text-slate-600">Visa du Responsable (Adel B. / Bader L.) :</span>
              <span className="font-mono text-[10px] text-slate-400">Signature électronique certifiée Plaisirs & Saveurs</span>
            </div>
            <div className="p-4 border border-dashed border-slate-400 rounded-2xl h-28 flex flex-col justify-between text-right">
              <span className="font-black uppercase text-slate-600">Tampon de l'Établissement :</span>
              <span className="font-mono text-[10px] text-slate-400">Boulangerie-Pâtisserie Plaisirs & Saveurs</span>
            </div>
          </div>

          {/* Bottom Action Close (No-Print) */}
          <div className="no-print mt-8 pt-4 border-t border-slate-200 flex items-center justify-center">
            <button
              type="button"
              onClick={() => setActiveTab('factures')}
              className="px-6 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs sm:text-sm flex items-center gap-2 cursor-pointer shadow-lg active:scale-95 transition-transform"
            >
              <X className="w-4 h-4 stroke-[3] text-rose-400" />
              <span>✕ Fermer le dossier et revenir aux modules</span>
            </button>
          </div>

        </div>
      )}

      {/* ================= LIGHTBOX MODAL ================= */}
      {lightboxImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm no-print">
          <div className="bg-slate-900 text-white w-full max-w-lg rounded-3xl overflow-hidden border border-slate-800 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="p-4 flex items-center justify-between border-b border-slate-800">
              <h4 className="text-sm font-bold text-white truncate max-w-[80%]">{lightboxImage.title}</h4>
              <button
                onClick={() => setLightboxImage(null)}
                className="p-1 text-slate-400 hover:text-white rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 bg-slate-950 flex items-center justify-center max-h-[70vh] overflow-auto">
              <img
                src={lightboxImage.url}
                alt={lightboxImage.title}
                className="max-h-[65vh] w-auto object-contain rounded-2xl shadow-md"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
