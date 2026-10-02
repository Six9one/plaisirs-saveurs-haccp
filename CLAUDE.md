# Plaisirs & Saveurs • Hygiène & HACCP

Plan de Maîtrise Sanitaire (PMS) & Traçabilité HACCP pour Boulangerie-Pâtisserie Artisanale.
Déployé en production sur Vercel : [https://plaisirs-saveurs-haccp.vercel.app/](https://plaisirs-saveurs-haccp.vercel.app/)

## 🛠️ Stack Technique
- **Framework** : React 19 + TypeScript + Vite
- **Styling** : Tailwind CSS v4
- **Icônes** : Lucide React
- **Impression** : `src/services/thermalPrinter.ts` (Impression directe pour imprimantes thermiques 58mm / 80mm / étiquettes autocollantes 2 cm)
- **Persistance** : `localStorage` + synchronisation optionnelle Supabase (`src/services/cloudSync.ts`)

## 📦 Commandes Principales
```bash
npm run dev     # Lance le serveur local (http://localhost:5173)
npm run build   # Vérifie les types TypeScript et compile le bundle de production
npm run lint    # Lancement du linter (oxlint)
```

## 🏗️ Structure & Architecture des Modules
- `src/components/SecondaryDlcModule.tsx` : Module d'étiquetage en **1 clic** pour imprimante thermique.
  - **Carrés Ingrédients** : Boutons tactiles pour chaque ingrédient/préparation (Tomates, crèmes, salades...). 1 clic = impression immédiate du ticket DLC secondaire avec calcul automatique de la date limite (+24h, +48h, etc.) et opérateur actif.
  - **Carrés Desserts Décongelés** : Section dédiée aux produits et pâtisseries décongelés (Éclairs, tartes, macarons...). 1 clic = impression du **ticket 2 cm** avec le **logo flocon de neige** (`/snowflake.png`) et la mention légale sanitaire obligatoire : `PRODUIT DÉCONGELÉ • NE PAS RECONGELER`.
  - Boutons pour ajouter, modifier ou supprimer des ingrédients et desserts personnalisés.
- `src/services/thermalPrinter.ts` : Service d'impression thermique par iframe invisible isolée (évite les conflits CSS de la page, gère les largeurs 58mm/80mm et étiquettes 2cm, joue un bip sonore de caisse Web Audio API).
- `src/components/TemperatureModule.tsx` : Relevés quotidiens des températures frigos et vitrines.
- `src/components/CleaningModule.tsx` : Plan de Nettoyage et Désinfection (PND).
- `src/components/ReceptionModule.tsx` : Contrôle réception marchandises et numéros de lots.
- `src/components/PestControlModule.tsx` : Suivi 3D dératisation / désinsectisation (contrat EDEN VERT).
- `src/components/AuditReportModule.tsx` : Génération de rapports d'inspection et export PDF.
- `src/components/MobileDashboard.tsx` & `MobileNavBar.tsx` : Interface mobile / tablette optimisée pour l'équipe en laboratoire/fournil.

## 📝 Derniers Changements Récents
1. Suppression de l'ancienne bannière d'attente "Bientôt disponible" dans les étiquettes.
2. Implémentation complète de la grille de carrés d'ingrédients tactiles avec impression thermique 1-clic.
3. Création du format ticket 2 cm pour les desserts décongelés avec le logo officiel flocon de neige et la mention légale HACCP "Ne pas recongeler".
4. Suppression de l'onglet "Produits Agréés EN 1276" de la barre de navigation.
5. Déploiement automatique synchronisé sur GitHub (`Six9one/plaisirs-saveurs-haccp`) et Vercel.
