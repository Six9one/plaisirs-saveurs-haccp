import React from 'react';
import {
  Thermometer,
  PackageCheck,
  Tag,
  Sparkles,
  Bug,
  FileSpreadsheet,
  HelpCircle,
  FlaskConical,
} from 'lucide-react';

export type TabType =
  | 'temperatures'
  | 'reception'
  | 'secondary_dlc'
  | 'cleaning'
  | 'approved_products'
  | 'pest_control'
  | 'waste'
  | 'audit_report'
  | 'ddpp_simulator'
  | 'user_guide';

interface NavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  pendingTemperaturesCount: number;
  pendingCleaningCount: number;
  closureRiskCount?: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onTabChange,
  pendingTemperaturesCount,
  pendingCleaningCount,
}) => {
  const tabs = [
    {
      id: 'temperatures' as TabType,
      label: 'Relevés',
      sublabel: 'Frigos & Vitrines',
      icon: Thermometer,
      badge: pendingTemperaturesCount > 0 ? `${pendingTemperaturesCount}` : null,
      badgeColor: 'bg-amber-500',
    },
    {
      id: 'reception' as TabType,
      label: 'Réception',
      sublabel: 'Courses & Lots',
      icon: PackageCheck,
    },
    {
      id: 'secondary_dlc' as TabType,
      label: 'Étiquettes',
      sublabel: 'DLC & Décongélation',
      icon: Tag,
    },
    {
      id: 'cleaning' as TabType,
      label: 'Nettoyage',
      sublabel: 'PND & Machines',
      icon: Sparkles,
      badge: pendingCleaningCount > 0 ? `${pendingCleaningCount}` : null,
      badgeColor: 'bg-indigo-500',
    },
    {
      id: 'approved_products' as TabType,
      label: 'Produits',
      sublabel: 'Agréés EN 1276',
      icon: FlaskConical,
    },
    {
      id: 'pest_control' as TabType,
      label: 'Nuisibles',
      sublabel: 'Pièges & 3D',
      icon: Bug,
    },
    {
      id: 'audit_report' as TabType,
      label: 'Historique',
      sublabel: 'Factures & PDF',
      icon: FileSpreadsheet,
    },
    {
      id: 'user_guide' as TabType,
      label: 'Guide & Tutos',
      sublabel: 'Fiches A4 & Aide',
      icon: HelpCircle,
    },
  ];

  return (
    <nav className="bg-slate-900 border-b border-slate-800 text-white sticky top-20 z-20 shadow-md no-print py-2 px-2 sm:px-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-8 gap-1.5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-all ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                    : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                <div
                  className={`p-1.5 rounded-lg shrink-0 ${
                    isActive ? 'bg-slate-950/15 text-slate-950' : 'bg-slate-700/60 text-amber-400'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs leading-tight font-bold truncate flex items-center justify-between">
                    <span>{tab.label}</span>
                    {tab.badge && (
                      <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold text-white ${tab.badgeColor}`}>
                        {tab.badge}
                      </span>
                    )}
                  </div>
                  <div className={`text-[10px] truncate ${isActive ? 'text-slate-900/80 font-medium' : 'text-slate-400'}`}>
                    {tab.sublabel}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
