export interface User {
  id: string;
  name: string;
  role: 'Boulanger' | 'Pâtissier' | 'Vendeur' | 'Responsable';
  pin: string;
  avatarUrl?: string;
  avatarColor?: string;
}

export interface TemperatureTarget {
  id: string;
  name: string;
  zone: 'Fournil' | 'Pâtisserie' | 'Boutique' | 'Réserve';
  type: 'froid_positif' | 'froid_negatif' | 'chambre_pousse' | 'vitrine';
  minTemp: number;
  maxTemp: number;
  currentTemp?: number;
  lastChecked?: string;
  checkedBy?: string;
  status: 'conforme' | 'alerte' | 'non_verifie';
  correctiveAction?: string;
  photoUrl?: string;
}

export interface TemperatureRecord {
  id: string;
  targetId: string;
  targetName: string;
  value: number;
  minTemp: number;
  maxTemp: number;
  status: 'conforme' | 'alerte';
  timestamp: string;
  userId: string;
  userName: string;
  period: 'Matin' | 'Soir';
  correctiveAction?: string;
}

export interface GoodsReceipt {
  id: string;
  supplier: string;
  category?: string;
  lotNumber?: string;
  dlc?: string;
  truckTemp?: number;
  isTempCompliant?: boolean;
  isPackageIntact?: boolean;
  timestamp: string;
  receivedBy?: string;
  photoUrl?: string;
  invoicePhotoUrl?: string;
  goodsPhotoUrl?: string;
  status: 'conforme' | 'refuse' | 'reserve';
  notes?: string;
}

export interface CleaningTask {
  id: string;
  name: string;
  shortName?: string;
  zone: 'Fournil' | 'Laboratoire Pâtisserie' | 'Vente & Magasin' | 'Plonge & Sanitaires';
  frequency: 'Quotidien' | 'Hebdomadaire' | 'Mensuel';
  period?: 'Matin' | 'Soir';
  completed: boolean;
  completedAt?: string;
  completedBy?: string;
  photoUrl?: string;
  machinePhotoUrl?: string;
  instructions: string;
  notes?: string;
  color?: string;
}

export interface SecondaryDlcItem {
  id: string;
  productName: string;
  category: 'Pâtisserie' | 'Boulangerie' | 'Snacking/Salé' | 'Matière Première Ouverte';
  prepDate: string;
  durationHours: number;
  expiryDate: string;
  preparedBy: string;
  lotOriginal?: string;
  storageTemp: string;
  notes?: string;
  isFrozenDessert?: boolean;
}

export interface IngredientSquare {
  id: string;
  name: string;
  category: 'Pâtisserie' | 'Boulangerie' | 'Snacking/Salé' | 'Matière Première Ouverte';
  durationHours: number;
  emoji?: string;
  storageTemp?: string;
  lotOriginal?: string;
}

export interface FrozenDessertSquare {
  id: string;
  name: string;
  category: 'Pâtisserie' | 'Boulangerie' | 'Snacking/Salé';
  durationHours: number;
  emoji?: string;
}


export interface NonConformanceIncident {
  id: string;
  title: string;
  type: 'Panne Froid' | 'Bris de Verre' | 'Nuisibles' | 'Rappel Produit' | 'Autre';
  severity: 'Faible' | 'Moyenne' | 'Critique';
  description: string;
  correctiveAction: string;
  reportedBy: string;
  timestamp: string;
  status: 'Ouvert' | 'Résolu';
  resolvedAt?: string;
}

// 🐭 Module Anti-Nuisibles (Cause #1 de fermeture)
export interface PestBaitStation {
  id: string;
  code: string; // e.g. "P-01", "P-02"
  location: string;
  type: 'Souris/Rats' | 'Insectes/Cafards' | 'Désinsectiseur UV';
  status: 'Intact (RAS)' | 'Consommé / Activité' | 'Appât Remplacé' | 'Piège Réarmé';
  lastChecked: string;
  checkedBy: string;
  notes?: string;
}

export interface PestContractInfo {
  companyName: string;
  contractNumber: string;
  lastVisitDate: string;
  nextVisitDate: string;
  status: 'Actif & Conforme' | 'À renouveler';
  technicianName: string;
  annualFeeHt?: number;
  passagesPerYear?: number;
  siret?: string;
  phone?: string;
}

export interface PestIntervention {
  id: string;
  passageNumber: number; // e.g. 1
  totalPassages: number; // e.g. 4
  date: string; // e.g. "08/06/2026"
  invoiceNumber?: string; // e.g. "F76-26-01207"
  contractNumber: string; // e.g. "CH-25-97"
  technician: string; // e.g. "Jérémy CLAIRE"
  type: string; // e.g. "Dératisation & Désinsectisation"
  locations: string[]; // e.g. ["Local commercial", "Cuisine - four et réfrigérateur"]
  actions: string[]; // List of actions performed
  observations?: string; // Specific observations, e.g. "Postes pvc rongeurs consommation forte"
  status: 'Effectué & Conforme' | 'Planifié';
  amountHt?: number;
  amountTtc?: number;
}

export interface PestInvoice {
  id: string;
  invoiceNumber: string; // e.g. "F76-26-01207"
  invoiceDate: string; // e.g. "09/06/2026"
  saleDate: string; // e.g. "08/06/2026"
  contractNumber: string; // e.g. "CH-25-97"
  passageLabel: string; // e.g. "Passage N°1 sur 4"
  object: string; // e.g. "DERATISATION"
  designation: string; // e.g. "Dératisation / Désinsectisation - CONTRAT HYGIENE"
  qty: number; // 1
  unitPriceHt: number; // 135.00
  totalHt: number; // 135.00
  tvaRate: number; // 20
  tvaAmount: number; // 27.00
  totalTtc: number; // 162.00
  isPaid: boolean;
  paymentMethod: string; // "Comptant"
  paymentDueDate: string;
  bankName: string;
  iban: string;
  bic: string;
  deratisationText: string;
  desinsectisationText: string;
  locations: string[];
  observations?: string;
}


// 🗑️ Module Déchets & Destruction Denrées Périmées (Cause #4 de fermeture)
export interface WasteLog {
  id: string;
  productName: string;
  category: 'Pâtons / Pâte' | 'Pâtisseries' | 'Matières Premières' | 'Snacking/Salé';
  quantityKg: number;
  reason: 'DLC Dépassée' | 'Sur-fermentation' | 'Altération / Goût' | 'Erreur Cuisson';
  discardedAt: string;
  discardedBy: string;
  method: 'Biodéchets Dédiés' | 'Destruction Volontaire';
  photoUrl?: string;
  notes?: string;
}

// 🛡️ Simulateur Audit DDPP & Alim'confiance (Prévention Fermetures & Amendes)
export interface DdpAuditPoint {
  id: string;
  category: 'Lutte Nuisibles' | 'Chaîne du Froid' | 'Hygiène Locaux & Lave-Mains' | 'Traçabilité & DLC' | 'PMS & Formation';
  title: string;
  description: string;
  fineRiskEur: number;
  isImmediateClosureRisk: boolean;
  status: 'Conforme' | 'Non-Conforme' | 'À Vérifier';
  correctiveAdvice: string;
}

// 🧴 Produits Agréés & Fiches Techniques EN 1276 / EN 13697 / EN 1650
export interface ApprovedProduct {
  id: string;
  name: string;
  brand: 'Diversey' | 'Ecolab' | 'Anios' | 'Tork' | 'Gilac' | 'Autre Agréé';
  category: 'Surfaces & Inox' | 'Petit Matériel & Sans Rinçage' | 'Sols & Plonge Surpuissant' | 'Machine à Granité & Circuits' | 'Lave-Mains Bactéricide' | 'Stockage Hermétique Anti-Insectes';
  norms: string[]; // e.g. ["EN 1276", "EN 1650", "EN 13697", "Contact Alimentaire"]
  usage: string;
  targetEquipment: string[]; // e.g. ["Diviseuse", "Pétrin", "Cercles à tartes", "Tours inox"]
  dosage: string; // e.g. "2% (20 ml / L)"
  dilutionPercent?: number; // 2
  contactTime: string; // e.g. "5 minutes"
  needsRinse: boolean;
  imageUrl?: string;
  safetyDataSheetUrl?: string;
  officialRef?: string;
  instructions: string[];
  precautions: string;
  inStock: boolean;
  verifiedDate?: string;
}

// 🥐 Matrice des 14 Allergènes Majeurs (Règlement INCO n°1169/2011)
export type MajorAllergen =
  | 'Gluten (Blé/Seigle/Orge)'
  | 'Lait & Lactose (Beurre/Crème)'
  | 'Œufs'
  | 'Fruits à coque (Amandes/Noisettes)'
  | 'Soja (Lécithine)'
  | 'Graines de sésame'
  | 'Moutarde'
  | 'Poisson'
  | 'Arachides'
  | 'Céleri'
  | 'Crustacés'
  | 'Mollusques'
  | 'Lupin'
  | 'Sulfites (>10mg/kg)';

export interface AllergenItem {
  id: string;
  name: string;
  category: 'Viennoiseries' | 'Pains & Baguettes' | 'Pâtisseries' | 'Snacking & Salé';
  description: string;
  allergens: MajorAllergen[];
  tracesPossible?: MajorAllergen[];
  lastUpdated: string;
  isHouseMade: boolean;
}
