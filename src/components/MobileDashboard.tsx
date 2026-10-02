import React from 'react';
import type { TabType } from './Navigation';
import {
  Thermometer,
  PackageCheck,
  Tag,
  Sparkles,
  Bug,
  Trash2,
  FileSpreadsheet,
  HelpCircle,
  Hammer,
} from 'lucide-react';

interface MobileDashboardProps {
  onSelectModule: (tab: TabType) => void;
  pendingTemperaturesCount: number;
  pendingCleaningCount: number;
}

export const MobileDashboard: React.FC<MobileDashboardProps> = ({
  onSelectModule,
  pendingTemperaturesCount,
  pendingCleaningCount,
}) => {
  const modules = [
    {
      id: 'travaux' as TabType,
      title: 'Travaux réalisés',
      subtitle: 'Photos après fermeture',
      icon: Hammer,
      cardBg: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-900/30 font-bold',
      iconBg: 'bg-emerald-800 text-white',
      badge: '📸 Photos',
      badgeBg: 'bg-emerald-950 text-emerald-200',
    },
    {
      id: 'temperatures' as TabType,
      title: 'Relevés',
      subtitle: 'Frigos & Vitrines',
      icon: Thermometer,
      cardBg: 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-900/30',
      iconBg: 'bg-blue-800 text-white',
      badge: pendingTemperaturesCount > 0 ? `${pendingTemperaturesCount} à faire` : 'OK ✓',
      badgeBg: pendingTemperaturesCount > 0 ? 'bg-amber-400 text-slate-950' : 'bg-blue-950 text-blue-200',
    },
    {
      id: 'reception' as TabType,
      title: 'Réception',
      subtitle: 'Lots Farines & Beurre',
      icon: PackageCheck,
      cardBg: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-900/30',
      iconBg: 'bg-indigo-800 text-white',
      badge: 'Livraisons',
      badgeBg: 'bg-indigo-950 text-indigo-200',
    },
    {
      id: 'secondary_dlc' as TabType,
      title: 'Étiquettes',
      subtitle: 'Stickers & Décongélation',
      icon: Tag,
      cardBg: 'bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-900/30',
      iconBg: 'bg-amber-800 text-white',
      badge: '1-Clic 🖨️',
      badgeBg: 'bg-amber-950 text-amber-200',
    },
    {
      id: 'cleaning' as TabType,
      title: 'Nettoyage',
      subtitle: 'PND & Machines',
      icon: Sparkles,
      cardBg: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-900/30',
      iconBg: 'bg-emerald-800 text-white',
      badge: pendingCleaningCount > 0 ? `${pendingCleaningCount}` : 'Fait ✓',
      badgeBg: pendingCleaningCount > 0 ? 'bg-rose-500 text-white' : 'bg-emerald-950 text-emerald-200',
    },
    {
      id: 'pest_control' as TabType,
      title: 'Nuisibles',
      subtitle: 'Pièges & EDEN VERT',
      icon: Bug,
      cardBg: 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-900/30',
      iconBg: 'bg-purple-800 text-white',
      badge: '4 Pièges',
      badgeBg: 'bg-purple-950 text-purple-200',
    },
    {
      id: 'waste' as TabType,
      title: 'Déchets',
      subtitle: 'Destruction Denrées',
      icon: Trash2,
      cardBg: 'bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-900/30',
      iconBg: 'bg-orange-800 text-white',
      badge: 'Invendus',
      badgeBg: 'bg-orange-950 text-orange-200',
    },
    {
      id: 'audit_report' as TabType,
      title: 'Historique & PDF',
      subtitle: 'Factures, PND & T°',
      icon: FileSpreadsheet,
      cardBg: 'bg-gradient-to-br from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 font-black',
      iconBg: 'bg-slate-950 text-amber-400',
      badge: '📄 Export PDF',
      badgeBg: 'bg-slate-950 text-white',
    },
    {
      id: 'user_guide' as TabType,
      title: 'Guide & Tutos',
      subtitle: 'Fiches A4 & Infographies',
      icon: HelpCircle,
      cardBg: 'bg-teal-600 hover:bg-teal-700 text-white shadow-lg shadow-teal-900/30 font-bold',
      iconBg: 'bg-teal-800 text-white',
      badge: '📘 Manuel',
      badgeBg: 'bg-teal-950 text-teal-200',
    },
  ];

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-20">
      {/* 2-Column on mobile / 4-Column on desktop */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
        {modules.map((mod) => {
          const Icon = mod.icon;
          return (
            <button
              key={mod.id}
              onClick={() => onSelectModule(mod.id)}
              className={`p-4 rounded-3xl flex flex-col justify-between text-left transition-transform active:scale-95 min-h-[135px] ${mod.cardBg}`}
            >
              <div className="flex items-start justify-between">
                <div className={`p-3 rounded-2xl shadow-inner ${mod.iconBg}`}>
                  <Icon className="w-6 h-6" />
                </div>
                {mod.badge && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs ${mod.badgeBg}`}>
                    {mod.badge}
                  </span>
                )}
              </div>

              <div className="mt-3">
                <h3 className="text-base font-black tracking-tight text-white">{mod.title}</h3>
                <p className="text-xs text-white/80 font-medium truncate mt-0.5">{mod.subtitle}</p>
              </div>
            </button>
          );
        })}
      </div>

    </div>
  );
};
