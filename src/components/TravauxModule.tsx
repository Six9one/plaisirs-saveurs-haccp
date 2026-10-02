import React, { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Hammer, Play, X } from 'lucide-react';
import travauxData from '../data/travaux.json';

// Travaux réalisés après la fermeture : photos dans /public/travaux, liste dans src/data/travaux.json
interface TravauxPhoto {
  file: string; // ex. /travaux/cuisine-1.jpg
  title: string;
  zone?: string;
  date?: string; // AAAA-MM-JJ
}

const PHOTOS = travauxData as TravauxPhoto[];
const thumb = (file: string) => file.replace('/travaux/', '/travaux/thumbs/');

// Précharge toutes les photos une seule fois (ensuite gardées en cache par le navigateur)
let preloaded = false;
function preloadAll() {
  if (preloaded) return;
  preloaded = true;
  PHOTOS.forEach((p) => {
    const t = new Image();
    t.src = thumb(p.file);
  });
  PHOTOS.forEach((p) => {
    const f = new Image();
    f.decoding = 'async';
    f.src = p.file;
  });
}

export const TravauxModule: React.FC = () => {
  const [index, setIndex] = useState<number | null>(null);
  const [touchX, setTouchX] = useState<number | null>(null);

  useEffect(() => {
    preloadAll();
  }, []);

  const next = useCallback(() => setIndex((i) => (i === null ? i : (i + 1) % PHOTOS.length)), []);
  const prev = useCallback(() => setIndex((i) => (i === null ? i : (i - 1 + PHOTOS.length) % PHOTOS.length)), []);

  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'Escape') setIndex(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, next, prev]);

  const zones = Array.from(new Set(PHOTOS.map((p) => p.zone || 'Travaux')));
  const current = index !== null ? PHOTOS[index] : null;

  return (
    <div className="space-y-4 max-w-6xl mx-auto pb-24 px-2 sm:px-0">
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
            <Hammer className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-white leading-tight">Travaux réalisés</h1>
            <p className="text-xs text-slate-400">{PHOTOS.length} photos</p>
          </div>
        </div>
        {PHOTOS.length > 0 && (
          <button
            type="button"
            onClick={() => setIndex(0)}
            className="h-11 px-5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm flex items-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4" /> Diaporama
          </button>
        )}
      </div>

      {PHOTOS.length === 0 && (
        <div className="py-16 text-center text-slate-500 text-sm">Photos bientôt ajoutées</div>
      )}

      {zones.map((zone) => (
        <div key={zone} className="space-y-2">
          {zones.length > 1 && (
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 px-1">{zone}</h2>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {PHOTOS.map((p, i) =>
              (p.zone || 'Travaux') !== zone ? null : (
                <button
                  key={p.file}
                  type="button"
                  onClick={() => setIndex(i)}
                  className="group relative aspect-[4/3] rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 cursor-pointer"
                >
                  <img src={thumb(p.file)} alt={p.title} decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  <div className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-black/85 to-transparent text-left">
                    <div className="text-sm font-black text-white leading-tight">{p.title}</div>
                  </div>
                </button>
              )
            )}
          </div>
        </div>
      ))}

      {current && index !== null && (
        <div
          className="fixed inset-0 z-50 bg-black flex flex-col"
          onTouchStart={(e) => setTouchX(e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touchX === null) return;
            const dx = e.changedTouches[0].clientX - touchX;
            if (dx < -50) next();
            if (dx > 50) prev();
            setTouchX(null);
          }}
        >
          <div className="flex items-center justify-between p-3 text-white">
            <div className="font-black text-base">
              {current.title}
              <span className="text-white/50 font-bold text-sm"> • {index + 1}/{PHOTOS.length}</span>
            </div>
            <button
              type="button"
              onClick={() => setIndex(null)}
              className="w-11 h-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center cursor-pointer"
              aria-label="Fermer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="flex-1 relative flex items-center justify-center min-h-0">
            <img src={current.file} alt={current.title} className="max-w-full max-h-full object-contain" />
            <button type="button" onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center cursor-pointer" aria-label="Précédente">
              <ChevronLeft className="w-8 h-8" />
            </button>
            <button type="button" onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center cursor-pointer" aria-label="Suivante">
              <ChevronRight className="w-8 h-8" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
