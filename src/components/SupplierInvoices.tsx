import React, { useMemo, useState } from 'react';
import { FileText, X } from 'lucide-react';
import supplierInvoicesData from '../data/supplierInvoices.json';

// Factures fournisseurs (PDF dans /public/factures), réutilisées par Réception et Historique
export interface SupplierInvoice {
  date: string; // AAAA-MM-JJ
  supplier: string;
  number: string;
  avoir: boolean;
  file: string;
}

export const SUPPLIER_INVOICES = supplierInvoicesData as SupplierInvoice[];

const frDate = (iso: string, opts: Intl.DateTimeFormatOptions) =>
  new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', opts);

export const SupplierInvoices: React.FC = () => {
  const years = useMemo(
    () => Array.from(new Set(SUPPLIER_INVOICES.map((i) => i.date.slice(0, 4)))).sort().reverse(),
    []
  );
  const suppliers = useMemo(() => Array.from(new Set(SUPPLIER_INVOICES.map((i) => i.supplier))), []);
  const [year, setYear] = useState<string>(years[0] ?? '');
  const [supplier, setSupplier] = useState<string>('Tous');
  const [open, setOpen] = useState<SupplierInvoice | null>(null);

  const months = Object.entries(
    SUPPLIER_INVOICES.filter(
      (i) => i.date.startsWith(year) && (supplier === 'Tous' || i.supplier === supplier)
    ).reduce<Record<string, SupplierInvoice[]>>((acc, inv) => {
      const label = frDate(inv.date, { month: 'long', year: 'numeric' });
      (acc[label] ||= []).push(inv);
      return acc;
    }, {})
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {years.map((y) => (
          <button
            key={y}
            type="button"
            onClick={() => setYear(y)}
            className={`px-5 py-2 rounded-2xl text-sm font-black cursor-pointer ${
              year === y ? 'bg-white text-slate-950' : 'bg-slate-900 border border-slate-800 text-slate-300'
            }`}
          >
            {y}
          </button>
        ))}
        <span className="w-px h-6 bg-slate-800 mx-1" />
        {['Tous', ...suppliers].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSupplier(s)}
            className={`px-3 py-2 rounded-2xl text-xs font-bold cursor-pointer ${
              supplier === s ? 'bg-amber-500 text-slate-950' : 'bg-slate-900 border border-slate-800 text-slate-300'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {months.map(([month, list]) => (
        <div key={month} className="space-y-1.5">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 px-1 pt-1">{month}</h3>
          {list.map((inv) => (
            <button
              key={inv.file}
              type="button"
              onClick={() => setOpen(inv)}
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
                {frDate(inv.date, { weekday: 'short', day: 'numeric', month: 'short' })}
              </span>
            </button>
          ))}
        </div>
      ))}

      {months.length === 0 && <div className="py-10 text-center text-slate-500 text-sm">Aucune facture</div>}

      {open && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 flex flex-col p-3 gap-2">
          <div className="flex items-center justify-between gap-2">
            <div className="text-white font-black text-sm truncate">
              {open.supplier} • {frDate(open.date, { day: 'numeric', month: 'long', year: 'numeric' })}
              <span className="text-slate-500 font-mono font-normal"> • N° {open.number}</span>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={open.file}
                target="_blank"
                rel="noreferrer"
                className="h-10 px-4 rounded-2xl bg-slate-800 text-white font-bold text-xs flex items-center"
              >
                Ouvrir
              </a>
              <button
                type="button"
                onClick={() => setOpen(null)}
                className="h-10 w-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center cursor-pointer"
                aria-label="Fermer"
              >
                <X className="w-5 h-5 stroke-[3]" />
              </button>
            </div>
          </div>
          <iframe src={open.file} title="Facture" className="flex-1 w-full rounded-2xl bg-white" />
        </div>
      )}
    </div>
  );
};
