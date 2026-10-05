import React from 'react';
import type { TabType } from './Navigation';
import { Home, Thermometer, Sparkles, Tag } from 'lucide-react';
import type { User } from '../types';

interface MobileNavBarProps {
  activeTab: TabType | 'home';
  onSelectTab: (tab: TabType | 'home') => void;
  onOpenPinModal: () => void;
  currentUser?: User;
  currentUserName: string;
}

export const MobileNavBar: React.FC<MobileNavBarProps> = ({
  activeTab,
  onSelectTab,
  onOpenPinModal,
  currentUser,
  currentUserName,
}) => {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-3 py-2 flex items-center justify-around text-slate-400 no-print">
      
      <button
        onClick={() => onSelectTab('home')}
        className={`flex flex-col items-center gap-1 p-1.5 rounded-2xl transition-colors ${
          activeTab === 'home' ? 'text-amber-400 font-bold' : 'hover:text-white'
        }`}
      >
        <Home className="w-5 h-5" />
        <span className="text-[10px]">Accueil</span>
      </button>

      <button
        onClick={() => onSelectTab('temperatures')}
        className={`flex flex-col items-center gap-1 p-1.5 rounded-2xl transition-colors ${
          activeTab === 'temperatures' ? 'text-amber-400 font-bold' : 'hover:text-white'
        }`}
      >
        <Thermometer className="w-5 h-5" />
        <span className="text-[10px]">Relevés</span>
      </button>

      <button
        onClick={() => onSelectTab('secondary_dlc')}
        className={`flex flex-col items-center gap-1 p-1.5 rounded-2xl transition-colors ${
          activeTab === 'secondary_dlc' ? 'text-amber-400 font-bold' : 'hover:text-white'
        }`}
      >
        <Tag className="w-5 h-5" />
        <span className="text-[10px]">Étiquettes</span>
      </button>

      <button
        onClick={() => onSelectTab('cleaning')}
        className={`flex flex-col items-center gap-1 p-1.5 rounded-2xl transition-colors ${
          activeTab === 'cleaning' ? 'text-amber-400 font-bold' : 'hover:text-white'
        }`}
      >
        <Sparkles className="w-5 h-5" />
        <span className="text-[10px]">Nettoyage</span>
      </button>

      {/* User Avatar Button */}
      <button
        onClick={onOpenPinModal}
        className="flex flex-col items-center gap-1 p-1 rounded-2xl transition-colors hover:opacity-80 active:scale-95"
        title="Changer d'utilisateur"
      >
        <div
          className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center text-white font-black text-xs shadow-md"
          style={{
            border: `2.5px solid ${currentUser?.avatarColor || '#f59e0b'}`,
            background: currentUser?.avatarColor || '#f59e0b',
          }}
        >
          {currentUser?.avatarUrl ? (
            <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-full h-full object-cover" />
          ) : (
            (currentUserName || 'U').charAt(0)
          )}
        </div>
        <span
          className="text-[10px] font-bold truncate max-w-[46px]"
          style={{ color: currentUser?.avatarColor || '#f59e0b' }}
        >
          {currentUserName ? currentUserName.split(' ')[0] : 'Profil'}
        </span>
      </button>

    </div>
  );
};
