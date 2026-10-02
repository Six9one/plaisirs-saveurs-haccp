import React, { useState } from 'react';
import type {
  PestBaitStation,
  PestContractInfo,
  PestIntervention,
  PestInvoice,
  User,
} from '../types';
import {
  DEFAULT_PEST_INTERVENTIONS,
  DEFAULT_PEST_INVOICES,
} from '../utils/storage';
import {
  Bug,
  Plus,
  X,
  FileText,
  Receipt,
  Truck,
  Printer,
  ChevronRight,
} from 'lucide-react';
import contractP1 from '../assets/contract_edenvert_p1.jpg';
import contractP2 from '../assets/contract_edenvert_p2.jpg';

interface PestControlModuleProps {
  stations: PestBaitStation[];
  contract: PestContractInfo;
  interventions?: PestIntervention[];
  invoices?: PestInvoice[];
  currentUser: User;
  onUpdateStationStatus: (id: string, status: PestBaitStation['status'], notes?: string) => void;
  onAddStation: (station: Omit<PestBaitStation, 'id'>) => void;
  onUpdateContract?: (contract: PestContractInfo) => void;
  onAddIntervention?: (intervention: Omit<PestIntervention, 'id'>) => void;
  onAddInvoice?: (invoice: Omit<PestInvoice, 'id'>) => void;
}

export const PestControlModule: React.FC<PestControlModuleProps> = ({
  stations,
  contract,
  interventions = DEFAULT_PEST_INTERVENTIONS,
  invoices = DEFAULT_PEST_INVOICES,
  currentUser,
  onUpdateStationStatus,
  onAddStation,
  onAddIntervention,
  onAddInvoice,
}) => {
  // Simple clean tab navigation: 'overview' | 'invoices' | 'passages' | 'stations' | 'contract'
  const [activeTab, setActiveTab] = useState<'invoices' | 'passages' | 'stations' | 'contract'>('invoices');
  const [openPassageId, setOpenPassageId] = useState<string | null>(null);

  // Modals
  const [showAddStationModal, setShowAddStationModal] = useState<boolean>(false);
  const [showAddInterventionModal, setShowAddInterventionModal] = useState<boolean>(false);
  const [showAddInvoiceModal, setShowAddInvoiceModal] = useState<boolean>(false);
  const [viewContractModal, setViewContractModal] = useState<boolean>(false);
  const [activeContractPage, setActiveContractPage] = useState<1 | 2>(1);

  // Selected items for modal view
  const [selectedStation, setSelectedStation] = useState<PestBaitStation | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<PestInvoice | null>(null);
  const [checkStatus, setCheckStatus] = useState<PestBaitStation['status']>('Intact (RAS)');
  const [checkNotes, setCheckNotes] = useState<string>('');

  // Form states for new station
  const [code, setCode] = useState<string>(`P-0${stations.length + 1}`);
  const [location, setLocation] = useState<string>('');
  const [type, setType] = useState<PestBaitStation['type']>('Souris/Rats');

  // Form states for new intervention
  const [newIntDate, setNewIntDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newIntPassageNum, setNewIntPassageNum] = useState<number>(1);
  const [newIntTechnician, setNewIntTechnician] = useState<string>('Jérémy CLAIRE (Certibiocide)');
  const [newIntInvoiceNum, setNewIntInvoiceNum] = useState<string>('');
  const [newIntObs, setNewIntObs] = useState<string>('Passage trimestriel conforme.');

  // Form states for new invoice
  const [newInvNumber, setNewInvNumber] = useState<string>('F76-26-0' + Math.floor(1000 + Math.random() * 9000));
  const [newInvDate, setNewInvDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newInvHt, setNewInvHt] = useState<number>(135.0);

  const isAdmin = currentUser?.name === 'Adel B.' || currentUser?.role === 'Responsable';

  const handleInspect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStation) return;
    onUpdateStationStatus(selectedStation.id, checkStatus, checkNotes);
    setSelectedStation(null);
    setCheckNotes('');
  };

  const handleCreateStation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!location.trim()) return;
    onAddStation({
      code: code.trim(),
      location: location.trim(),
      type,
      status: 'Intact (RAS)',
      lastChecked: 'Aujourd’hui',
      checkedBy: currentUser.name,
      notes: 'Poste contrôlé et conforme.',
    });
    setLocation('');
    setCode(`P-0${stations.length + 2}`);
    setShowAddStationModal(false);
  };

  const handleCreateIntervention = (e: React.FormEvent) => {
    e.preventDefault();
    if (onAddIntervention) {
      const [yyyy, mm, dd] = newIntDate.split('-');
      const formattedDate = dd && mm && yyyy ? `${dd}/${mm}/${yyyy}` : newIntDate;

      onAddIntervention({
        passageNumber: newIntPassageNum,
        totalPassages: 4,
        date: formattedDate,
        invoiceNumber: newIntInvoiceNum.trim() || undefined,
        contractNumber: contract.contractNumber || 'CH-25-97',
        technician: newIntTechnician.trim(),
        type: 'Dératisation & Désinsectisation',
        locations: ['Local commercial', 'Cuisine', 'Fournil'],
        actions: ['Contrôle rodonticides', 'Gel anti-blattes'],
        observations: newIntObs.trim(),
        status: 'Effectué & Conforme',
        amountHt: 135.0,
        amountTtc: 162.0,
      });
    }
    setShowAddInterventionModal(false);
  };

  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (onAddInvoice) {
      const [yyyy, mm, dd] = newInvDate.split('-');
      const formattedDate = dd && mm && yyyy ? `${dd}/${mm}/${yyyy}` : newInvDate;
      const ht = Number(newInvHt) || 135.0;
      const tva = Math.round(ht * 0.2 * 100) / 100;
      const ttc = Math.round((ht + tva) * 100) / 100;

      onAddInvoice({
        invoiceNumber: newInvNumber.trim(),
        invoiceDate: formattedDate,
        saleDate: formattedDate,
        contractNumber: contract.contractNumber || 'CH-25-97',
        passageLabel: 'Passage Contrat Hygiène',
        object: 'DERATISATION',
        designation: 'Dératisation / Désinsectisation - CONTRAT HYGIENE',
        qty: 1,
        unitPriceHt: ht,
        totalHt: ht,
        tvaRate: 20,
        tvaAmount: tva,
        totalTtc: ttc,
        isPaid: true,
        paymentMethod: 'Comptant (Virement bancaire)',
        paymentDueDate: formattedDate,
        bankName: 'BPVF MANTES GAMBETTA',
        iban: 'FR76 1870 7000 1231 6216 5787 808',
        bic: 'CCBPFRPPVER',
        deratisationText: 'Traitement préventif contre les rongeurs réalisé à l’aide d’un rodonticide anticoagulant conforme aux normes HACCP.',
        desinsectisationText: 'Traitement de désinsectisation contre les blattes par gel insecticide rémanent.',
        locations: ['Local commercial', 'Cuisine - four et réfrigérateur'],
        observations: 'Facture trimestrielle conforme.',
      });
    }
    setShowAddInvoiceModal(false);
  };

  const tabs = [
    { id: 'invoices' as const, label: 'Factures', icon: Receipt, count: invoices.length },
    { id: 'passages' as const, label: 'Passages', icon: Truck, count: interventions.length },
    { id: 'contract' as const, label: 'Contrat', icon: FileText, count: null },
    { id: 'stations' as const, label: 'Pièges', icon: Bug, count: stations.length },
  ];
  // Un passage « Planifié » dont la date est passée compte comme fait
  const isPast = (d: string) => {
    const [dd, mm, yyyy] = d.split('/').map(Number);
    if (!dd || !mm || !yyyy) return false;
    return new Date(yyyy, mm - 1, dd, 23, 59) < new Date();
  };
  const isPlanned = (i: PestIntervention) => i.status === 'Planifié' && !isPast(i.date);
  const nextPassage = interventions.find(isPlanned);

  return (
    <div className="space-y-3 max-w-4xl mx-auto pb-24 px-2 sm:px-0 animate-in fade-in duration-200">

      {/* En-tête minimal */}
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
            <Bug className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-white leading-tight">Nuisibles</h1>
            <p className="text-xs text-slate-400">EDEN VERT 3D</p>
          </div>
        </div>
        <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-emerald-500/15 text-emerald-300">
          {nextPassage ? `Prochain passage : ${nextPassage.date}` : '✓ Tout est en règle'}
        </span>
      </div>

      {/* 4 gros boutons */}
      <div className="grid grid-cols-4 gap-2">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`py-3 rounded-2xl flex flex-col items-center gap-1 font-black text-sm transition-all cursor-pointer ${
                active
                  ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                  : 'bg-slate-900 border border-slate-800 text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Icon className="w-6 h-6" />
              <span>
                {t.label}
                {t.count !== null && <span className="opacity-60 font-bold"> {t.count}</span>}
              </span>
            </button>
          );
        })}
      </div>

      {/* FACTURES */}
      {activeTab === 'invoices' && (
        <div className="space-y-2 animate-in fade-in">
          {invoices.map((inv) => (
            <button
              key={inv.id}
              type="button"
              onClick={() => setSelectedInvoice(inv)}
              className="w-full bg-slate-900 border border-slate-800 hover:border-amber-500/50 active:scale-[0.99] p-4 rounded-2xl flex items-center justify-between gap-3 text-left transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Receipt className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <div className="text-sm font-black text-white">{inv.saleDate}</div>
                  <div className="text-[11px] font-mono text-slate-500">{inv.invoiceNumber}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-black font-mono text-white">{inv.totalTtc.toFixed(2)} €</span>
                <span className="text-emerald-400 font-black">✓</span>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </div>
            </button>
          ))}
          {isAdmin && (
            <button
              type="button"
              onClick={() => setShowAddInvoiceModal(true)}
              className="w-full p-3 rounded-2xl border border-dashed border-slate-700 text-slate-400 hover:text-amber-400 hover:border-amber-500/50 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Ajouter
            </button>
          )}
        </div>
      )}

      {/* PASSAGES */}
      {activeTab === 'passages' && (
        <div className="space-y-2 animate-in fade-in">
          {interventions.map((int) => {
            const isFuture = isPlanned(int);
            const open = openPassageId === int.id;
            return (
              <div key={int.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenPassageId(open ? null : int.id)}
                  className="w-full p-4 flex items-center justify-between gap-3 text-left cursor-pointer hover:bg-slate-800/50"
                >
                  <div className="flex items-center gap-3">
                    <Truck className={`w-5 h-5 shrink-0 ${isFuture ? 'text-amber-400' : 'text-emerald-400'}`} />
                    <div>
                      <div className="text-sm font-black text-white">{int.date}</div>
                      <div className="text-[11px] text-slate-500">Passage {int.passageNumber}/{int.totalPassages}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-black ${isFuture ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {isFuture ? 'Prévu' : '✓ Fait'}
                    </span>
                    <ChevronRight className={`w-4 h-4 text-slate-500 transition-transform ${open ? 'rotate-90' : ''}`} />
                  </div>
                </button>
                {open && (
                  <div className="px-4 pb-4 text-xs text-slate-300 space-y-1">
                    <div>{int.locations.join(' • ')}</div>
                    {int.actions && int.actions.length > 0 && <div>{int.actions.join(' • ')}</div>}
                    {int.observations && <div className="text-slate-400">{int.observations}</div>}
                    {int.invoiceNumber && <div className="font-mono text-slate-500">{int.invoiceNumber}</div>}
                  </div>
                )}
              </div>
            );
          })}
          {isAdmin && (
            <button
              type="button"
              onClick={() => setShowAddInterventionModal(true)}
              className="w-full p-3 rounded-2xl border border-dashed border-slate-700 text-slate-400 hover:text-amber-400 hover:border-amber-500/50 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Ajouter
            </button>
          )}
        </div>
      )}

      {/* CONTRAT */}
      {activeTab === 'contract' && (
        <div className="grid grid-cols-2 gap-3 animate-in fade-in">
          {([1, 2] as const).map((page) => (
            <button
              key={page}
              type="button"
              onClick={() => {
                setActiveContractPage(page);
                setViewContractModal(true);
              }}
              className="bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-2xl p-2 cursor-pointer transition-all"
            >
              <div className="h-64 rounded-xl overflow-hidden bg-white">
                <img src={page === 1 ? contractP1 : contractP2} alt={`Page ${page}`} className="w-full h-full object-cover object-top" />
              </div>
              <div className="text-sm font-black text-white pt-2">Page {page}</div>
            </button>
          ))}
        </div>
      )}

      {/* PIÈGES */}
      {activeTab === 'stations' && (
        <div className="grid grid-cols-2 gap-2 animate-in fade-in">
          {stations.map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => {
                setSelectedStation(st);
                setCheckStatus(st.status);
                setCheckNotes(st.notes || '');
              }}
              className="bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-2xl p-4 text-left cursor-pointer transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-black text-amber-400">{st.code}</span>
                <span className="text-emerald-400 font-black">✓</span>
              </div>
              <div className="text-sm font-black text-white mt-1">{st.location}</div>
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowAddStationModal(true)}
            className="rounded-2xl border border-dashed border-slate-700 text-slate-400 hover:text-amber-400 hover:border-amber-500/50 text-xs font-bold flex items-center justify-center gap-1.5 p-4 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Ajouter
          </button>
        </div>
      )}

      {/* ================= MODAL: INVOICE HIGH-RESOLUTION VIEWER ================= */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/90 backdrop-blur-md no-print animate-in fade-in duration-150">
          <div className="bg-white text-slate-900 rounded-3xl w-full max-w-3xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Toolbar */}
            <div className="p-3.5 sm:p-4 border-b border-slate-200 flex items-center justify-between gap-3 bg-slate-100">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-amber-600" />
                <span className="text-xs sm:text-sm font-black text-slate-900">
                  Facture Officielle N° {selectedInvoice.invoiceNumber}
                </span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-600 text-white uppercase">
                  ✓ Payée Comptant
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimer</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedInvoice(null)}
                  className="w-8 h-8 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Document sheet */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-6 text-slate-800 text-xs font-sans">
              
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b pb-5">
                <div>
                  <div className="bg-slate-950 text-white p-2.5 px-4 rounded-xl inline-block shadow-sm">
                    <span className="text-xl sm:text-2xl font-black tracking-wider text-amber-400 font-serif">
                      EDEN VERT 3D
                    </span>
                    <div className="text-[8px] tracking-widest text-slate-300 uppercase font-mono mt-0.5">
                      DÉRATISATION | DÉSINSECTISATION • DEPUIS 1978
                    </div>
                  </div>
                </div>

                <div className="text-left sm:text-right space-y-0.5">
                  <div className="text-base sm:text-lg font-black text-slate-900 font-mono">
                    Facture N° {selectedInvoice.invoiceNumber}
                  </div>
                  <div className="text-xs text-slate-600">
                    Rouen, le <strong className="text-slate-900">{selectedInvoice.invoiceDate}</strong>
                  </div>
                  <div className="text-xs text-slate-600">
                    Date de vente : <strong className="text-slate-900">{selectedInvoice.saleDate}</strong>
                  </div>
                </div>
              </div>

              {/* Addresses */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-black uppercase text-slate-500 block mb-1">
                    Adresse d'intervention :
                  </span>
                  <strong className="text-xs text-slate-900 block font-bold">
                    PLAISIRS ET SAVEURS
                  </strong>
                  <span className="text-xs text-slate-700 block">
                    59 Rue Georges Clemenceau, 76530 Grand-Couronne
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-black uppercase text-slate-500 block mb-1">
                    Client :
                  </span>
                  <strong className="text-xs text-slate-900 block font-bold">
                    PLAISIRS ET SAVEURS
                  </strong>
                  <span className="text-xs text-slate-700 block">
                    59 Rue Georges Clemenceau, 76530 Grand-Couronne, France
                  </span>
                </div>
              </div>

              {/* Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Désignation</th>
                      <th className="p-3 text-center">Qté</th>
                      <th className="p-3 text-right">PU HT</th>
                      <th className="p-3 text-right">Total HT</th>
                      <th className="p-3 text-center">TVA</th>
                      <th className="p-3 text-right">Total TTC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-800">
                    <tr>
                      <td className="p-3 space-y-2">
                        <strong className="font-black text-slate-900 block text-xs">
                          {selectedInvoice.designation}
                        </strong>
                        <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-200">
                          {selectedInvoice.deratisationText}
                        </div>
                        {selectedInvoice.observations && (
                          <div className="text-[11px] font-bold text-amber-900 bg-amber-50 p-2 rounded-xl border border-amber-200">
                            {selectedInvoice.observations}
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-center font-mono align-top">1</td>
                      <td className="p-3 text-right font-mono align-top">{selectedInvoice.unitPriceHt.toFixed(2)} €</td>
                      <td className="p-3 text-right font-mono align-top font-bold">{selectedInvoice.totalHt.toFixed(2)} €</td>
                      <td className="p-3 text-center font-mono align-top">{selectedInvoice.tvaRate}%</td>
                      <td className="p-3 text-right font-mono align-top font-black text-slate-900">{selectedInvoice.totalTtc.toFixed(2)} €</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="flex flex-col sm:flex-row justify-between gap-6 pt-2">
                <div className="flex-1 text-[11px] text-slate-600 space-y-1 p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="font-bold text-slate-800">Règlement : Comptant (Virement bancaire)</div>
                  <div>Banque : {selectedInvoice.bankName}</div>
                  <div className="font-mono text-[10px]">IBAN : {selectedInvoice.iban}</div>
                </div>

                <div className="w-full sm:w-56 space-y-1 text-xs bg-slate-100 p-3.5 rounded-2xl border border-slate-200 shrink-0">
                  <div className="flex justify-between text-slate-700">
                    <span>Total HT :</span>
                    <span className="font-mono font-bold">{selectedInvoice.totalHt.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between text-slate-700">
                    <span>TVA (20%) :</span>
                    <span className="font-mono font-bold">{selectedInvoice.tvaAmount.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between text-sm font-black text-slate-950 pt-2 border-t border-slate-300">
                    <span>Total TTC :</span>
                    <span className="font-mono text-amber-600">{selectedInvoice.totalTtc.toFixed(2)} €</span>
                  </div>
                </div>
              </div>

            </div>

            <div className="p-3 border-t border-slate-200 bg-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs cursor-pointer"
              >
                Fermer
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ================= MODAL: FULLSCREEN CONTRACT VIEWER ================= */}
      {viewContractModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/90 backdrop-blur-md no-print animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-white">
            
            <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-3 bg-slate-950">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm sm:text-base font-black text-white">
                  Contrat Signé EDEN VERT 3D • Page {activeContractPage} / 2
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setViewContractModal(false)}
                className="w-8 h-8 rounded-xl bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Switch tabs */}
            <div className="px-4 py-2 bg-slate-950 border-b border-slate-800 flex gap-2">
              <button
                type="button"
                onClick={() => setActiveContractPage(1)}
                className={`px-3 py-1 rounded-xl text-xs font-bold cursor-pointer ${
                  activeContractPage === 1 ? 'bg-amber-500 text-slate-950' : 'bg-slate-900 text-slate-400'
                }`}
              >
                Page 1 : Prestations & Tarifs
              </button>
              <button
                type="button"
                onClick={() => setActiveContractPage(2)}
                className={`px-3 py-1 rounded-xl text-xs font-bold cursor-pointer ${
                  activeContractPage === 2 ? 'bg-amber-500 text-slate-950' : 'bg-slate-900 text-slate-400'
                }`}
              >
                Page 2 : Signatures
              </button>
            </div>

            {/* Image */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-950 flex items-center justify-center">
              <img
                src={activeContractPage === 1 ? contractP1 : contractP2}
                alt="Contrat"
                className="max-w-2xl w-full h-auto rounded-xl border border-slate-800 shadow-2xl"
              />
            </div>

            <div className="p-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => setActiveContractPage(activeContractPage === 1 ? 2 : 1)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 text-white font-bold cursor-pointer"
              >
                {activeContractPage === 1 ? 'Page suivante (Signatures) →' : '← Page précédente (Prestations)'}
              </button>

              <button
                type="button"
                onClick={() => setViewContractModal(false)}
                className="px-4 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-black cursor-pointer"
              >
                Fermer
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ================= MODAL: AJOUTER PIÈGE ================= */}
      {showAddStationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs no-print">
          <div className="bg-slate-900 text-white rounded-3xl max-w-md w-full p-5 shadow-2xl border border-slate-800 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-black text-white">Nouveau Piège / Boîte</h3>
              <button onClick={() => setShowAddStationModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateStation} className="py-3 space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Code :</label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Emplacement :</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Fournil - Arrière du four"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Type de Piège :</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-bold"
                >
                  <option value="Souris/Rats">Souris / Rats (Boîte PVC)</option>
                  <option value="Insectes/Cafards">Insectes / Blattes (Gel)</option>
                  <option value="Désinsectiseur UV">Désinsectiseur UV</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddStationModal(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-amber-500 text-slate-950 font-black"
                >
                  Ajouter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: CONTRÔLER PIÈGE ================= */}
      {selectedStation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs no-print">
          <div className="bg-slate-900 text-white rounded-3xl max-w-md w-full p-5 shadow-2xl border border-slate-800 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="text-xs font-mono font-black text-amber-400">{selectedStation.code}</span>
                <h3 className="text-sm font-black text-white mt-0.5">{selectedStation.location}</h3>
              </div>
              <button onClick={() => setSelectedStation(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleInspect} className="py-3 space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-bold mb-1">État constaté :</label>
                <select
                  value={checkStatus}
                  onChange={(e) => setCheckStatus(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-bold"
                >
                  <option value="Intact (RAS)">✓ Intact (RAS - Aucune activité)</option>
                  <option value="Consommé / Activité">⚠️ Consommé / Activité détectée</option>
                  <option value="Appât Remplacé">🔄 Appât renouvelé</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Note :</label>
                <input
                  type="text"
                  placeholder="R.A.S."
                  value={checkNotes}
                  onChange={(e) => setCheckNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedStation(null)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-amber-500 text-slate-950 font-black"
                >
                  Valider
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: AJOUTER PASSAGE ================= */}
      {showAddInterventionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs no-print">
          <div className="bg-slate-900 text-white rounded-3xl max-w-md w-full p-5 shadow-2xl border border-slate-800 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-black text-white">Saisir un Passage 3D</h3>
              <button onClick={() => setShowAddInterventionModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateIntervention} className="py-3 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Date :</label>
                  <input
                    type="date"
                    required
                    value={newIntDate}
                    onChange={(e) => setNewIntDate(e.target.value)}
                    className="w-full p-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Passage N° :</label>
                  <select
                    value={newIntPassageNum}
                    onChange={(e) => setNewIntPassageNum(Number(e.target.value))}
                    className="w-full p-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-bold"
                  >
                    <option value={1}>Passage 1 / 4</option>
                    <option value={2}>Passage 2 / 4</option>
                    <option value={3}>Passage 3 / 4</option>
                    <option value={4}>Passage 4 / 4</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Technicien :</label>
                <input
                  type="text"
                  value={newIntTechnician}
                  onChange={(e) => setNewIntTechnician(e.target.value)}
                  className="w-full p-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">N° Facture :</label>
                <input
                  type="text"
                  placeholder="Ex: F76-26-01207"
                  value={newIntInvoiceNum}
                  onChange={(e) => setNewIntInvoiceNum(e.target.value)}
                  className="w-full p-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Observations :</label>
                <textarea
                  rows={2}
                  value={newIntObs}
                  onChange={(e) => setNewIntObs(e.target.value)}
                  className="w-full p-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddInterventionModal(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-amber-500 text-slate-950 font-black"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: AJOUTER FACTURE ================= */}
      {showAddInvoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs no-print">
          <div className="bg-slate-900 text-white rounded-3xl max-w-md w-full p-5 shadow-2xl border border-slate-800 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-black text-white">Ajouter une Facture</h3>
              <button onClick={() => setShowAddInvoiceModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="py-3 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">N° Facture :</label>
                  <input
                    type="text"
                    required
                    value={newInvNumber}
                    onChange={(e) => setNewInvNumber(e.target.value)}
                    className="w-full p-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Date :</label>
                  <input
                    type="date"
                    required
                    value={newInvDate}
                    onChange={(e) => setNewInvDate(e.target.value)}
                    className="w-full p-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Montant HT (€) :</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={newInvHt}
                  onChange={(e) => setNewInvHt(parseFloat(e.target.value) || 135)}
                  className="w-full p-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono font-bold"
                />
                <div className="text-[11px] text-amber-400 font-bold mt-1">
                  Total TTC : {(Number(newInvHt) * 1.2).toFixed(2)} € (TVA 20%)
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddInvoiceModal(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-amber-500 text-slate-950 font-black"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default PestControlModule;
