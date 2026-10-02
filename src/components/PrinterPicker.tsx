import React, { useState } from 'react';
import { Printer, X, Check, Loader2 } from 'lucide-react';
import { getSelectedPrinter, qzListPrinters, setSelectedPrinter } from '../services/qzPrinter';

// Bouton « Imprimante » : choisir l'imprimante (via QZ Tray) utilisée pour les tickets
export const PrinterPicker: React.FC = () => {
  const [selected, setSelected] = useState<string | null>(getSelectedPrinter());
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [printers, setPrinters] = useState<string[] | null>(null);

  const openPicker = async () => {
    setOpen(true);
    setLoading(true);
    setPrinters(await qzListPrinters());
    setLoading(false);
  };

  const choose = (name: string | null) => {
    setSelectedPrinter(name);
    setSelected(name);
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={openPicker}
        className="h-10 px-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 flex items-center gap-2 cursor-pointer max-w-[180px]"
      >
        <Printer className="w-4 h-4 text-emerald-400 shrink-0" />
        <span className="truncate">{selected || 'Choisir imprimante'}</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-4 space-y-3 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black">Imprimante des tickets</h3>
              <button type="button" onClick={() => setOpen(false)} className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {loading && (
              <div className="py-8 flex justify-center text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            )}

            {!loading && printers === null && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-sm text-amber-200 space-y-1">
                <div className="font-black">QZ Tray n'est pas lancé</div>
                <div className="text-xs text-amber-200/80">Installez-le depuis qz.io puis lancez-le, et réessayez.</div>
              </div>
            )}

            {!loading && printers && (
              <div className="space-y-1.5 max-h-[50vh] overflow-y-auto">
                {printers.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => choose(p)}
                    className={`w-full px-4 py-3 rounded-2xl text-left text-sm font-bold flex items-center justify-between gap-2 cursor-pointer ${
                      selected === p ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 hover:bg-slate-700'
                    }`}
                  >
                    <span className="truncate">{p}</span>
                    {selected === p && <Check className="w-4 h-4 shrink-0" />}
                  </button>
                ))}
              </div>
            )}

            {selected && (
              <button type="button" onClick={() => choose(null)} className="w-full text-xs text-slate-400 hover:text-white py-1 cursor-pointer">
                Ne plus utiliser d'imprimante choisie (impression Chrome)
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
};
