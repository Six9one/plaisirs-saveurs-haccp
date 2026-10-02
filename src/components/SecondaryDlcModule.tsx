import React, { useState, useMemo } from 'react';
import type { SecondaryDlcItem, User, IngredientSquare, FrozenDessertSquare } from '../types';
import {
  DEFAULT_INGREDIENT_SQUARES,
  DEFAULT_FROZEN_DESSERT_SQUARES,
  STORAGE_KEYS,
  getStoredData,
  setStoredData,
} from '../utils/storage';
import {
  printIngredientTicket,
  printFrozenDessertTicket,
  type ThermalPaperFormat,
} from '../services/thermalPrinter';
import {
  Plus,
  Printer,
  X,
  Search,
  CheckCircle2,
  Clock,
  Trash2,
  Edit2,
  RotateCcw,
  Snowflake,
  SlidersHorizontal,
  AlertTriangle,
} from 'lucide-react';

interface SecondaryDlcModuleProps {
  items: SecondaryDlcItem[];
  currentUser: User;
  onAddItem: (item: Omit<SecondaryDlcItem, 'id'>) => void;
  onDeleteItem: (id: string) => void;
}

export const SecondaryDlcModule: React.FC<SecondaryDlcModuleProps> = ({
  items,
  currentUser,
  onAddItem,
  onDeleteItem,
}) => {
  // Navigation entre Ingrédients et Produits Décongelés (ou vue double)
  const [activeSide, setActiveSide] = useState<'ingredients' | 'frozen' | 'both'>('both');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Format d'impression thermique
  const [thermalFormat, setThermalFormat] = useState<ThermalPaperFormat>(() => {
    return (localStorage.getItem(STORAGE_KEYS.THERMAL_FORMAT) as ThermalPaperFormat) || '58mm';
  });

  // Liste des carrés d'ingrédients (persistance localStorage)
  const [ingredientSquares, setIngredientSquares] = useState<IngredientSquare[]>(() => {
    return getStoredData<IngredientSquare[]>(
      STORAGE_KEYS.INGREDIENT_SQUARES,
      DEFAULT_INGREDIENT_SQUARES
    ) || DEFAULT_INGREDIENT_SQUARES;
  });

  // Liste des carrés de desserts décongelés (persistance localStorage)
  const [frozenSquares, setFrozenSquares] = useState<FrozenDessertSquare[]>(() => {
    return getStoredData<FrozenDessertSquare[]>(
      STORAGE_KEYS.FROZEN_DESSERT_SQUARES,
      DEFAULT_FROZEN_DESSERT_SQUARES
    ) || DEFAULT_FROZEN_DESSERT_SQUARES;
  });

  // Notifications et feedback d'impression
  const [recentlyPrintedId, setRecentlyPrintedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals d'ajout / édition
  const [showAddIngredientModal, setShowAddIngredientModal] = useState<boolean>(false);
  const [showAddFrozenModal, setShowAddFrozenModal] = useState<boolean>(false);
  const [editingIngredient, setEditingIngredient] = useState<IngredientSquare | null>(null);
  const [editingFrozen, setEditingFrozen] = useState<FrozenDessertSquare | null>(null);

  // Formulaire Nouvel Ingrédient
  const [newIngName, setNewIngName] = useState<string>('');
  const [newIngCategory, setNewIngCategory] = useState<IngredientSquare['category']>('Snacking/Salé');
  const [newIngHours, setNewIngHours] = useState<number>(24);
  const [newIngEmoji, setNewIngEmoji] = useState<string>('🥗');
  const [newIngTemp, setNewIngTemp] = useState<string>('+2°C à +4°C');

  // Formulaire Nouveau Dessert Décongelé
  const [newFrzName, setNewFrzName] = useState<string>('');
  const [newFrzHours, setNewFrzHours] = useState<number>(24);
  const [newFrzEmoji, setNewFrzEmoji] = useState<string>('🍰');
  const [newFrzCategory, setNewFrzCategory] = useState<FrozenDessertSquare['category']>('Pâtisserie');

  // Sauvegarde des carrés d'ingrédients
  const saveIngredientSquares = (updated: IngredientSquare[]) => {
    setIngredientSquares(updated);
    setStoredData(STORAGE_KEYS.INGREDIENT_SQUARES, updated);
  };

  // Sauvegarde des carrés congelés
  const saveFrozenSquares = (updated: FrozenDessertSquare[]) => {
    setFrozenSquares(updated);
    setStoredData(STORAGE_KEYS.FROZEN_DESSERT_SQUARES, updated);
  };

  // Changement format imprimante
  const handleFormatChange = (fmt: ThermalPaperFormat) => {
    setThermalFormat(fmt);
    localStorage.setItem(STORAGE_KEYS.THERMAL_FORMAT, fmt);
    showToast(`Format d'impression réglé sur : ${fmt === '58mm' ? '58 mm' : fmt === '80mm' ? '80 mm' : 'Sticker 2 cm'}`);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  // ================= ACTION 1 : CLIC SUR CARRÉ INGRÉDIENT -> IMPRESSION DIRECTE =================
  const handlePrintIngredient = (square: IngredientSquare) => {
    const prepDate = new Date();
    const expiryDate = new Date(prepDate.getTime() + square.durationHours * 3600 * 1000);

    // 1. Impression thermique directe
    printIngredientTicket(
      {
        productName: square.name,
        category: square.category,
        prepDate,
        expiryDate,
        operator: currentUser.name,
        storageTemp: square.storageTemp || '+2°C à +4°C',
        lotNumber: `PS-${prepDate.getFullYear().toString().slice(-2)}${(prepDate.getMonth() + 1).toString().padStart(2, '0')}${prepDate.getDate().toString().padStart(2, '0')}`,
      },
      thermalFormat
    );

    // 2. Enregistrement dans l'historique HACCP
    const historyItem: Omit<SecondaryDlcItem, 'id'> = {
      productName: square.name,
      category: square.category,
      prepDate: prepDate.toISOString(),
      durationHours: square.durationHours,
      expiryDate: expiryDate.toISOString(),
      preparedBy: currentUser.name,
      storageTemp: square.storageTemp || '+2°C à +4°C',
      lotOriginal: square.lotOriginal || 'Lot du jour',
      notes: `Ticket thermique imprimé (${square.durationHours}h)`,
      isFrozenDessert: false,
    };
    onAddItem(historyItem);

    // 3. Feedback visuel
    setRecentlyPrintedId(square.id);
    showToast(`🖨️ Ticket imprimé : ${square.name} (DLC +${square.durationHours}h)`);
    setTimeout(() => {
      setRecentlyPrintedId((prev) => (prev === square.id ? null : prev));
    }, 1800);
  };

  // ================= ACTION 2 : CLIC SUR CARRÉ DESSERT DÉCONGELÉ -> IMPRESSION DIRECTE TICKET 2 CM =================
  const handlePrintFrozenDessert = (square: FrozenDessertSquare) => {
    const thawDate = new Date();
    const expiryDate = new Date(thawDate.getTime() + square.durationHours * 3600 * 1000);

    // 1. Impression directe ticket 2 cm avec logo Flocon & mention légale HACCP
    printFrozenDessertTicket(
      {
        dessertName: square.name,
        thawDate,
        expiryDate,
        operator: currentUser.name,
        lotNumber: `DEC-${thawDate.getDate()}${(thawDate.getMonth() + 1).toString().padStart(2, '0')}`,
      },
      'sticker_2cm'
    );

    // 2. Enregistrement dans l'historique HACCP
    const historyItem: Omit<SecondaryDlcItem, 'id'> = {
      productName: `❄️ ${square.name} (Décongelé)`,
      category: square.category,
      prepDate: thawDate.toISOString(),
      durationHours: square.durationHours,
      expiryDate: expiryDate.toISOString(),
      preparedBy: currentUser.name,
      storageTemp: '+2°C à +4°C max',
      lotOriginal: 'Décongélation',
      notes: 'PRODUIT DÉCONGELÉ • NE PAS RECONGELER (Ticket 2 cm imprimé)',
      isFrozenDessert: true,
    };
    onAddItem(historyItem);

    // 3. Feedback visuel
    setRecentlyPrintedId(square.id);
    showToast(`❄️ Ticket 2 cm imprimé : ${square.name} • Ne pas recongeler`);
    setTimeout(() => {
      setRecentlyPrintedId((prev) => (prev === square.id ? null : prev));
    }, 1800);
  };

  // Ajout / Sauvegarde nouvel ingrédient
  const handleSaveIngredient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIngName.trim()) return;

    if (editingIngredient) {
      const updated = ingredientSquares.map((sq) =>
        sq.id === editingIngredient.id
          ? {
              ...sq,
              name: newIngName.trim(),
              category: newIngCategory,
              durationHours: newIngHours,
              emoji: newIngEmoji || '🥗',
              storageTemp: newIngTemp,
            }
          : sq
      );
      saveIngredientSquares(updated);
      showToast(`Ingrédient mis à jour : ${newIngName.trim()}`);
    } else {
      const newSquare: IngredientSquare = {
        id: 'ing_' + Date.now(),
        name: newIngName.trim(),
        category: newIngCategory,
        durationHours: newIngHours,
        emoji: newIngEmoji || '🥗',
        storageTemp: newIngTemp,
      };
      saveIngredientSquares([newSquare, ...ingredientSquares]);
      showToast(`Nouvel ingrédient ajouté : ${newSquare.name}`);
    }

    setEditingIngredient(null);
    setNewIngName('');
    setShowAddIngredientModal(false);
  };

  // Ajout / Sauvegarde nouveau dessert décongelé
  const handleSaveFrozen = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFrzName.trim()) return;

    if (editingFrozen) {
      const updated = frozenSquares.map((sq) =>
        sq.id === editingFrozen.id
          ? {
              ...sq,
              name: newFrzName.trim(),
              category: newFrzCategory,
              durationHours: newFrzHours,
              emoji: newFrzEmoji || '🍰',
            }
          : sq
      );
      saveFrozenSquares(updated);
      showToast(`Dessert mis à jour : ${newFrzName.trim()}`);
    } else {
      const newSquare: FrozenDessertSquare = {
        id: 'frz_' + Date.now(),
        name: newFrzName.trim(),
        category: newFrzCategory,
        durationHours: newFrzHours,
        emoji: newFrzEmoji || '🍰',
      };
      saveFrozenSquares([newSquare, ...frozenSquares]);
      showToast(`Nouveau dessert décongelé ajouté : ${newSquare.name}`);
    }

    setEditingFrozen(null);
    setNewFrzName('');
    setShowAddFrozenModal(false);
  };

  // Suppression d'un carré ingrédient
  const handleDeleteIngredientSquare = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Supprimer le carré ingrédient "${name}" ?`)) {
      saveIngredientSquares(ingredientSquares.filter((sq) => sq.id !== id));
      showToast(`Carré "${name}" supprimé`);
    }
  };

  // Suppression d'un carré dessert décongelé
  const handleDeleteFrozenSquare = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Supprimer le carré dessert "${name}" ?`)) {
      saveFrozenSquares(frozenSquares.filter((sq) => sq.id !== id));
      showToast(`Carré "${name}" supprimé`);
    }
  };

  // Réinitialisation des carrés par défaut
  const handleResetDefaults = () => {
    if (window.confirm('Réinitialiser la liste avec les ingrédients et desserts d’origine ?')) {
      saveIngredientSquares(DEFAULT_INGREDIENT_SQUARES);
      saveFrozenSquares(DEFAULT_FROZEN_DESSERT_SQUARES);
      showToast('Liste réinitialisée aux valeurs recommandées Plaisirs & Saveurs');
    }
  };

  // Filtrage des ingrédients
  const filteredIngredients = useMemo(() => {
    return ingredientSquares.filter((item) => {
      const matchQuery = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = selectedCategory === 'all' || item.category === selectedCategory;
      return matchQuery && matchCat;
    });
  }, [ingredientSquares, searchQuery, selectedCategory]);

  // Filtrage des desserts décongelés
  const filteredFrozen = useMemo(() => {
    return frozenSquares.filter((item) => {
      return item.name.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [frozenSquares, searchQuery]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-28 px-2 sm:px-4 animate-in fade-in duration-200">
      
      {/* ================= 1. HEADER & BARRE D'ÉTAT IMPRIMANTE THERMIQUE ================= */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl text-white">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Titre et statut */}
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0 shadow-inner">
              <Printer className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  Étiquettes &amp; DLC Secondaires
                </h1>
              </div>
            </div>
          </div>

          {/* Contrôles et format imprimante */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            
            {/* Sélecteur de format papier */}
            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-2xl p-1 text-xs">
              <span className="text-[10px] text-slate-400 font-bold px-2 uppercase tracking-wider">Format :</span>
              <button
                type="button"
                onClick={() => handleFormatChange('58mm')}
                className={`px-2.5 py-1 rounded-xl font-bold transition-all cursor-pointer ${
                  thermalFormat === '58mm'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                58 mm
              </button>
              <button
                type="button"
                onClick={() => handleFormatChange('80mm')}
                className={`px-2.5 py-1 rounded-xl font-bold transition-all cursor-pointer ${
                  thermalFormat === '80mm'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                80 mm
              </button>
              <button
                type="button"
                onClick={() => handleFormatChange('sticker_2cm')}
                className={`px-2.5 py-1 rounded-xl font-bold transition-all cursor-pointer ${
                  thermalFormat === 'sticker_2cm'
                    ? 'bg-cyan-500 text-slate-950 shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                2 cm mini
              </button>
            </div>

            {/* Test rapide imprimante */}
            <button
              type="button"
              onClick={() => {
                handlePrintIngredient({
                  id: 'test',
                  name: 'TEST IMPRIMANTE HACCP',
                  category: 'Snacking/Salé',
                  durationHours: 24,
                  emoji: '🖨️',
                  storageTemp: '+2°C à +4°C',
                });
              }}
              className="h-10 px-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-amber-400 text-xs font-bold border border-slate-700 flex items-center gap-2 transition-all cursor-pointer"
              title="Lancer un ticket de test sur votre imprimante"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Test Impression</span>
            </button>

          </div>

        </div>

        {/* ================= BARRE D'ONGLETS / VUE CÔTÉ À CÔTÉ ================= */}
        <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-2xl border border-slate-800 self-start">
            <button
              type="button"
              onClick={() => setActiveSide('both')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                activeSide === 'both'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Tout Afficher (Côte à côte)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSide('ingredients')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                activeSide === 'ingredients'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>🥗 Ingrédients / DLC</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-900 text-amber-300 font-mono">
                {ingredientSquares.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSide('frozen')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                activeSide === 'frozen'
                  ? 'bg-cyan-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-cyan-300'
              }`}
            >
              <Snowflake className="w-3.5 h-3.5 text-cyan-400" />
              <span>❄️ Produits Décongelés (2 cm)</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-900 text-cyan-300 font-mono">
                {frozenSquares.length}
              </span>
            </button>
          </div>

          {/* Recherche rapide */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher tomates, éclair, tarte..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

        </div>

      </div>

      {/* ================= TOAST DE CONFIRMATION D'IMPRESSION ================= */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-500 text-slate-950 px-4 py-3 rounded-2xl shadow-2xl font-black text-xs sm:text-sm flex items-center gap-2.5 animate-in slide-in-from-bottom-5 border-2 border-emerald-300">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ================= CONTENU PRINCIPAL : LES DEUX SECTIONS ================= */}
      <div className={`grid gap-6 ${activeSide === 'both' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>

        {/* ---------------- SECTION GAUCHE / 1 : LES INGRÉDIENTS & DLC SECONDAIRES ---------------- */}
        {(activeSide === 'both' || activeSide === 'ingredients') && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl flex flex-col space-y-4">
            
            {/* Header de la section Ingrédients */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 gap-2">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">🥗</span>
                <div>
                  <h2 className="text-base font-black text-white tracking-tight">
                    Ingrédients &amp; Préparations (DLC)
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    1 carré = 1 clic = impression sticker immédiate
                  </p>
                </div>
              </div>

              {/* Bouton Ajouter Ingrédient */}
              <button
                type="button"
                onClick={() => {
                  setEditingIngredient(null);
                  setNewIngName('');
                  setNewIngHours(24);
                  setNewIngCategory('Snacking/Salé');
                  setNewIngEmoji('🍅');
                  setShowAddIngredientModal(true);
                }}
                className="h-9 px-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 active:scale-95 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer transition-all"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>+ Ajouter Ingrédient</span>
              </button>
            </div>

            {/* Filtres de catégories d'ingrédients */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              {['all', 'Snacking/Salé', 'Pâtisserie', 'Matière Première Ouverte', 'Boulangerie'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap cursor-pointer transition-colors ${
                    selectedCategory === cat
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {cat === 'all' ? 'Tous' : cat}
                </button>
              ))}
            </div>

            {/* GRILLE DES CARRÉS D'INGRÉDIENTS */}
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-3 gap-2.5 sm:gap-3 flex-1 auto-rows-fr">
              {filteredIngredients.map((item) => {
                const isJustPrinted = recentlyPrintedId === item.id;

                return (
                  <div
                    key={item.id}
                    onClick={() => handlePrintIngredient(item)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') handlePrintIngredient(item);
                    }}
                    className={`group relative rounded-2xl p-3 sm:p-3.5 flex flex-col justify-between text-left transition-all cursor-pointer border select-none ${
                      isJustPrinted
                        ? 'bg-emerald-500 text-slate-950 border-emerald-300 scale-95 shadow-xl shadow-emerald-500/30'
                        : 'bg-slate-950 hover:bg-slate-800/90 text-white border-slate-800 hover:border-amber-500/60 hover:shadow-lg hover:shadow-amber-500/10 active:scale-95'
                    }`}
                  >
                    
                    {/* En-tête du carré : Emoji + Bouton action discret */}
                    <div className="flex items-start justify-between gap-1">
                      <span />

                      <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingIngredient(item);
                            setNewIngName(item.name);
                            setNewIngCategory(item.category);
                            setNewIngHours(item.durationHours);
                            setNewIngEmoji(item.emoji || '🥗');
                            setNewIngTemp(item.storageTemp || '+2°C à +4°C');
                            setShowAddIngredientModal(true);
                          }}
                          className="w-6 h-6 rounded-lg bg-slate-900/90 hover:bg-amber-500 hover:text-slate-950 text-slate-400 flex items-center justify-center transition-colors"
                          title="Modifier cet ingrédient"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteIngredientSquare(item.id, item.name, e)}
                          className="w-6 h-6 rounded-lg bg-slate-900/90 hover:bg-rose-500 hover:text-white text-slate-400 flex items-center justify-center transition-colors"
                          title="Supprimer ce carré"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Nom de l'ingrédient */}
                    <div className="my-2">
                      <h3
                        className={`text-xs sm:text-sm font-black leading-snug line-clamp-2 ${
                          isJustPrinted ? 'text-slate-950' : 'text-white group-hover:text-amber-300'
                        }`}
                      >
                        {item.name}
                      </h3>
                    </div>

                    {/* Pied du carré : Durée DLC + Icône Imprimante */}
                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-end text-[11px] font-black">

                      <div
                        className={`flex items-center gap-1 ${
                          isJustPrinted ? 'text-slate-950 font-black' : 'text-amber-400 group-hover:scale-110 transition-transform'
                        }`}
                      >
                        <Printer className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span className="text-[10px] uppercase tracking-wider font-extrabold">
                          {isJustPrinted ? 'Imprimé !' : 'Imprimer'}
                        </span>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>

            {filteredIngredients.length === 0 && (
              <div className="py-12 text-center text-slate-500 text-xs">
                Aucun ingrédient ne correspond à la recherche.
              </div>
            )}

          </div>
        )}

        {/* ---------------- SECTION DROITE / 2 : LES DESSERTS & PRODUITS DÉCONGELÉS (TICKETS 2 CM) ---------------- */}
        {(activeSide === 'both' || activeSide === 'frozen') && (
          <div className="bg-slate-900 border border-cyan-500/30 rounded-3xl p-4 sm:p-5 shadow-xl flex flex-col space-y-4 relative overflow-hidden">
            
            {/* Effet froid / fond discret */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"></div>

            {/* Header de la section Produits Décongelés */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 gap-2 relative z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 flex items-center justify-center shrink-0">
                  <img
                    src="/snowflake.png"
                    alt="Logo Flocon"
                    className="w-5 h-5 object-contain"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = 'none';
                    }}
                  />
                  <Snowflake className="w-4 h-4 text-cyan-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-black text-white tracking-tight">
                      Desserts &amp; Produits Décongelés
                    </h2>
                  </div>
                </div>
              </div>

              {/* Bouton Ajouter Dessert Décongelé */}
              <button
                type="button"
                onClick={() => {
                  setEditingFrozen(null);
                  setNewFrzName('');
                  setNewFrzHours(24);
                  setNewFrzCategory('Pâtisserie');
                  setNewFrzEmoji('🍰');
                  setShowAddFrozenModal(true);
                }}
                className="h-9 px-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 active:scale-95 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-cyan-500/20 cursor-pointer transition-all"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>+ Ajouter Dessert</span>
              </button>
            </div>

            {/* Bandeau d'information légale HACCP */}
            <div className="p-2.5 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 flex items-center gap-2.5 text-xs text-cyan-100">
              <AlertTriangle className="w-4 h-4 text-cyan-400 shrink-0" />
              <p className="text-[11px] leading-tight">
                <strong>Norme DDPP :</strong> Tout dessert décongelé remis en vente doit afficher sa date de décongélation et la mention formelle <em>« Produit décongelé • Ne pas recongeler »</em>.
              </p>
            </div>

            {/* GRILLE DES CARRÉS DESSERTS DÉCONGELÉS */}
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-3 gap-2.5 sm:gap-3 flex-1 auto-rows-fr relative z-10">
              {filteredFrozen.map((item) => {
                const isJustPrinted = recentlyPrintedId === item.id;

                return (
                  <div
                    key={item.id}
                    onClick={() => handlePrintFrozenDessert(item)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') handlePrintFrozenDessert(item);
                    }}
                    className={`group relative rounded-2xl p-3 sm:p-3.5 flex flex-col justify-between text-left transition-all cursor-pointer border select-none ${
                      isJustPrinted
                        ? 'bg-cyan-400 text-slate-950 border-cyan-200 scale-95 shadow-xl shadow-cyan-400/30'
                        : 'bg-slate-950 hover:bg-slate-900/90 text-white border-cyan-500/30 hover:border-cyan-400 hover:shadow-lg hover:shadow-cyan-500/20 active:scale-95'
                    }`}
                  >
                    
                    {/* En-tête : Logo Flocon officiel + Icône edit/delete */}
                    <div className="flex items-start justify-between gap-1">
                      <div className="flex items-center gap-1.5">
                        <img
                          src="/snowflake.png"
                          alt="Flocon"
                          className="w-5 h-5 object-contain"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>

                      <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingFrozen(item);
                            setNewFrzName(item.name);
                            setNewFrzCategory(item.category);
                            setNewFrzHours(item.durationHours);
                            setNewFrzEmoji(item.emoji || '🍰');
                            setShowAddFrozenModal(true);
                          }}
                          className="w-6 h-6 rounded-lg bg-slate-900/90 hover:bg-cyan-500 hover:text-slate-950 text-slate-400 flex items-center justify-center transition-colors"
                          title="Modifier ce dessert"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteFrozenSquare(item.id, item.name, e)}
                          className="w-6 h-6 rounded-lg bg-slate-900/90 hover:bg-rose-500 hover:text-white text-slate-400 flex items-center justify-center transition-colors"
                          title="Supprimer ce carré"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Nom du dessert décongelé */}
                    <div className="my-2">
                      <h3
                        className={`text-xs sm:text-sm font-black leading-snug line-clamp-2 ${
                          isJustPrinted ? 'text-slate-950' : 'text-white group-hover:text-cyan-300'
                        }`}
                      >
                        {item.name}
                      </h3>
                    </div>

                    {/* Pied du carré : Sticker 2cm badge + Impression directe */}
                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-end text-[11px] font-black">

                      <div
                        className={`flex items-center gap-1 ${
                          isJustPrinted ? 'text-slate-950 font-black' : 'text-cyan-400 group-hover:scale-110 transition-transform'
                        }`}
                      >
                        <Printer className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span className="text-[10px] uppercase tracking-wider font-extrabold">
                          {isJustPrinted ? 'Imprimé !' : 'Imprimer'}
                        </span>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>

            {filteredFrozen.length === 0 && (
              <div className="py-12 text-center text-slate-500 text-xs">
                Aucun produit décongelé ne correspond à la recherche.
              </div>
            )}

          </div>
        )}

      </div>

      {/* ================= 3. HISTORIQUE DES IMPRESSIONS DU JOUR ================= */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 text-white shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Clock className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm sm:text-base font-black text-white">
              Journal des Étiquettes Imprimées ({items.length})
            </h3>
          </div>

          <button
            type="button"
            onClick={handleResetDefaults}
            className="text-[11px] text-slate-400 hover:text-amber-400 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Réinitialiser les carrés recommandés</span>
          </button>
        </div>

        {items.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            Aucun ticket imprimé aujourd'hui. Cliquez sur un carré au-dessus pour sortir votre première étiquette !
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 mt-3">
            {items.slice(0, 9).map((item) => {
              const isFrozen = item.isFrozenDessert || item.productName.includes('❄️');

              return (
                <div
                  key={item.id}
                  className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <strong className="text-white font-bold truncate">{item.productName}</strong>
                      {isFrozen && (
                        <span className="text-[9px] font-black px-1.5 py-0.2 rounded-md bg-cyan-500/20 text-cyan-300">
                          2 cm
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5 space-x-2">
                      <span>DLC : <strong className="text-amber-400">{new Date(item.expiryDate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</strong></span>
                      <span>• Par {item.preparedBy}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        if (isFrozen) {
                          handlePrintFrozenDessert({
                            id: item.id,
                            name: item.productName.replace('❄️ ', '').replace(' (Décongelé)', ''),
                            category: item.category as any,
                            durationHours: item.durationHours,
                          });
                        } else {
                          handlePrintIngredient({
                            id: item.id,
                            name: item.productName,
                            category: item.category,
                            durationHours: item.durationHours,
                            storageTemp: item.storageTemp,
                          });
                        }
                      }}
                      className="p-2 rounded-xl bg-slate-900 hover:bg-amber-500 hover:text-slate-950 text-amber-400 border border-slate-800 transition-colors"
                      title="Réimprimer ce ticket"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteItem(item.id)}
                      className="p-2 rounded-xl bg-slate-900 hover:bg-rose-500 hover:text-white text-slate-500 transition-colors"
                      title="Supprimer du journal"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ================= MODAL 1 : AJOUTER / MODIFIER UN INGRÉDIENT ================= */}
      {showAddIngredientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs no-print">
          <div className="bg-slate-900 text-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-800 animate-in fade-in zoom-in-95 max-h-[92vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xl">🥗</span>
                <h3 className="text-base font-black text-white">
                  {editingIngredient ? 'Modifier Ingrédient' : 'Ajouter un Ingrédient'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddIngredientModal(false)}
                className="w-8 h-8 rounded-xl bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveIngredient} className="space-y-3.5 mt-4">
              
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-1">
                  Nom de l'ingrédient ou préparation :
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: Tomates fraîches coupées, Poulet mariné..."
                  value={newIngName}
                  onChange={(e) => setNewIngName(e.target.value)}
                  className="w-full text-xs p-3 rounded-2xl border border-slate-700 bg-slate-950 text-white font-bold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-1">
                    Catégorie :
                  </label>
                  <select
                    value={newIngCategory}
                    onChange={(e) => setNewIngCategory(e.target.value as any)}
                    className="w-full text-xs p-3 rounded-2xl border border-slate-700 bg-slate-950 text-white font-bold focus:outline-none focus:border-amber-500"
                  >
                    <option value="Snacking/Salé">Snacking / Salé</option>
                    <option value="Pâtisserie">Pâtisserie</option>
                    <option value="Boulangerie">Boulangerie</option>
                    <option value="Matière Première Ouverte">Matière Première</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-1">
                    Durée DLC :
                  </label>
                  <select
                    value={newIngHours}
                    onChange={(e) => setNewIngHours(Number(e.target.value))}
                    className="w-full text-xs p-3 rounded-2xl border border-slate-700 bg-slate-950 text-white font-bold focus:outline-none focus:border-amber-500"
                  >
                    <option value={12}>12 Heures (Service jour)</option>
                    <option value={24}>24 Heures (J+1)</option>
                    <option value={48}>48 Heures (J+2)</option>
                    <option value={72}>72 Heures (J+3)</option>
                    <option value={120}>5 Jours max</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-1">
                    Emoji / Icône :
                  </label>
                  <div className="flex gap-1.5 flex-wrap">
                    {['🍅', '🥬', '🍗', '🥓', '🧀', '🍮', '🥚', '🥣', '🐟', '🍓'].map((em) => (
                      <button
                        key={em}
                        type="button"
                        onClick={() => setNewIngEmoji(em)}
                        className={`w-8 h-8 rounded-xl text-lg flex items-center justify-center cursor-pointer transition-all ${
                          newIngEmoji === em
                            ? 'bg-amber-500 text-slate-950 scale-110'
                            : 'bg-slate-950 border border-slate-800'
                        }`}
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-1">
                    Température :
                  </label>
                  <input
                    type="text"
                    value={newIngTemp}
                    onChange={(e) => setNewIngTemp(e.target.value)}
                    className="w-full text-xs p-3 rounded-2xl border border-slate-700 bg-slate-950 text-white font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddIngredientModal(false)}
                  className="flex-1 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 cursor-pointer transition-all"
                >
                  {editingIngredient ? 'Enregistrer Modifications' : 'Ajouter le Carré'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ================= MODAL 2 : AJOUTER / MODIFIER UN DESSERT DÉCONGELÉ ================= */}
      {showAddFrozenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs no-print">
          <div className="bg-slate-900 text-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-cyan-500/40 animate-in fade-in zoom-in-95 max-h-[92vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Snowflake className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-black text-white">
                  {editingFrozen ? 'Modifier Dessert Décongelé' : 'Ajouter Dessert Décongelé'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddFrozenModal(false)}
                className="w-8 h-8 rounded-xl bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveFrozen} className="space-y-3.5 mt-4">
              
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-1">
                  Nom du dessert (imprimé en gros sur le ticket) :
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: Éclair Chocolat, Tarte Framboise, Opéra..."
                  value={newFrzName}
                  onChange={(e) => setNewFrzName(e.target.value)}
                  className="w-full text-xs p-3 rounded-2xl border border-slate-700 bg-slate-950 text-white font-bold focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-1">
                    Durée après décongélation :
                  </label>
                  <select
                    value={newFrzHours}
                    onChange={(e) => setNewFrzHours(Number(e.target.value))}
                    className="w-full text-xs p-3 rounded-2xl border border-slate-700 bg-slate-950 text-white font-bold focus:outline-none focus:border-cyan-500"
                  >
                    <option value={24}>24 Heures (1 jour)</option>
                    <option value={48}>48 Heures (2 jours)</option>
                    <option value={72}>72 Heures (3 jours)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-1">
                    Rayon :
                  </label>
                  <select
                    value={newFrzCategory}
                    onChange={(e) => setNewFrzCategory(e.target.value as any)}
                    className="w-full text-xs p-3 rounded-2xl border border-slate-700 bg-slate-950 text-white font-bold focus:outline-none focus:border-cyan-500"
                  >
                    <option value="Pâtisserie">Pâtisserie</option>
                    <option value="Boulangerie">Boulangerie</option>
                    <option value="Snacking/Salé">Snacking / Salé</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-1">
                  Emoji du carré :
                </label>
                <div className="flex gap-1.5 flex-wrap">
                  {['🍰', '🍫', '☕', '🫐', '🍋', '🥞', '🎂', '🍮', '🍏', '🍪', '🥧', '🥖'].map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setNewFrzEmoji(em)}
                      className={`w-8 h-8 rounded-xl text-lg flex items-center justify-center cursor-pointer transition-all ${
                        newFrzEmoji === em
                          ? 'bg-cyan-500 text-slate-950 scale-110'
                          : 'bg-slate-950 border border-slate-800'
                      }`}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>

              {/* Aperçu direct du ticket 2 cm */}
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider mb-2">
                  Aperçu du sticker 2 cm :
                </span>
                <div className="border border-white/20 p-2 rounded bg-white text-black text-center max-w-[220px] mx-auto text-[10px]">
                  <div className="flex items-center justify-center gap-1 font-black text-xs uppercase">
                    <span>❄️</span>
                    <span>{newFrzName.trim() || 'NOM DU DESSERT'}</span>
                  </div>
                  <div className="bg-black text-white text-[8px] font-black my-1 py-0.5">
                    PRODUIT DÉCONGELÉ • NE PAS RECONGELER
                  </div>
                  <div className="flex justify-between text-[7px] font-bold">
                    <span>Décongelé : Aujourd'hui</span>
                    <span>DLC : +{newFrzHours}h</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddFrozenModal(false)}
                  className="flex-1 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 active:scale-95 text-slate-950 font-black text-xs shadow-md shadow-cyan-500/20 cursor-pointer transition-all"
                >
                  {editingFrozen ? 'Enregistrer Modifications' : 'Ajouter le Dessert'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
