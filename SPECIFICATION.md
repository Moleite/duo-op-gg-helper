# Spécification détaillée - Extension Duo.GG Helper

## 1. Vue d'ensemble

**Nom de l'extension** : Duo.GG helper  
**Version** : 1.0  
**Auteur** : Moleite  
**Type** : Extension Chrome/Edge (Manifest V3)  
**Description** : Extension d'aide pour filtrer et organiser les joueurs sur la plateforme Duo.GG (plateforme de recherche de partenaires pour League of Legends)

## 2. Architecture technique

### 2.1 Structure des fichiers

```
DuoGG/
├── manifest.json          # Configuration de l'extension
├── popup.html             # Interface utilisateur (popup)
├── popup.js               # Logique de la popup
├── popup.css              # Styles de la popup
├── blacklist.txt          # Liste noire des joueurs (un nom par ligne)
├── icon-*.png             # Icônes de l'extension (16, 32, 48, 128px)
├── duo.svg                # Logo Duo
├── duo_full.svg           # Logo complet Duo
└── injects/
    └── inject_filter.js   # Script injecté dans la page pour le filtrage
```

### 2.2 Permissions requises

- **`scripting`** : Permet d'injecter des scripts dans les pages web
- **`host_permissions: <all_urls>`** : Accès à toutes les URLs pour injecter le script de filtrage

### 2.3 Flux d'exécution

1. L'utilisateur clique sur l'icône de l'extension → ouverture de `popup.html`
2. La popup charge les paramètres sauvegardés depuis `localStorage`
3. La popup charge la blacklist depuis `blacklist.txt`
4. L'utilisateur configure les filtres et clique sur "Filter"
5. Le script `inject_filter.js` est injecté dans l'onglet actif
6. La fonction `window.duoGGFilter()` est appelée avec les paramètres
7. Les éléments de la liste sont filtrés selon les critères
8. Des badges statistiques sont affichés en haut à droite de la page

## 3. Interface utilisateur (Popup)

### 3.1 Structure HTML

La popup contient :
- **Header** : Logo Duo + texte "helper"
- **Contrôles de filtrage** :
  - Sélecteur de rôle (Role)
  - Sélecteur de tier (Tier)
  - Sélecteur de division (Division)
  - Champ de saisie pour le winrate minimum (Winrate)
- **Actions** :
  - Bouton "Filter" pour appliquer les filtres
  - Icône d'information (i) affichant la blacklist au survol

### 3.2 Options de filtrage

#### 3.2.1 Rôle (Role)
- **Valeurs** :
  - `All Positions` (par défaut)
  - `Top`
  - `Jungle`
  - `Mid`
  - `ADC`
  - `Supp`

#### 3.2.2 Tier (Rang)
- **Valeurs** :
  - `All` (par défaut)
  - `Iron`
  - `Bronze`
  - `Silver`
  - `Gold`
  - `Platinum`
  - `Emerald`
  - `Diamond`
  - `Master`
  - `GM`
  - `Challenger`

#### 3.2.3 Division
- **Valeurs** :
  - `I` (par défaut)
  - `II`
  - `III`
  - `IV`

#### 3.2.4 Winrate minimum
- **Type** : Champ numérique
- **Plage** : 0-100
- **Format** : Nombre entier (ex: 27)
- **Valeur vide** : Aucun filtre de winrate appliqué

### 3.3 Persistance des données

Les sélections utilisateur sont sauvegardées dans `localStorage` :
- `duogg_role` : Rôle sélectionné
- `duogg_tier` : Tier sélectionné
- `duogg_division` : Division sélectionnée
- `duogg_winrate_min` : Winrate minimum (chaîne vide si non défini)

### 3.4 Blacklist

- **Fichier** : `blacklist.txt`
- **Format** : Un nom de joueur par ligne
- **Commentaires** : Lignes commençant par `#` ignorées
- **Sensibilité à la casse** : Non (comparaison insensible à la casse)
- **Affichage** : Tooltip au survol de l'icône "i" dans la popup

## 4. Logique de filtrage

### 4.1 Sélection des éléments

Le script identifie les éléments de la liste via :
```javascript
document.querySelectorAll("li.MuiCollapse-root")
```

### 4.2 Extraction des données

Pour chaque élément de la liste, le script extrait :

#### 4.2.1 Nom du joueur (Summoner Name)
**Méthodes d'extraction** (dans l'ordre de priorité) :
1. Lien `<a>` avec `href` contenant `/summoners/`
2. Élément `<strong>` ou `<b>`
3. Premier `<span>` avec texte valide (≥3 caractères, ne correspondant pas au format de rang `[A-Z]{1,2}\d`)

#### 4.2.2 Rôle principal du joueur
- Recherche d'icônes SVG avec classe `position-icon.w-6.h-6` et attribut `aria-label`
- Exclusion des icônes avec classe `looking-for`
- Valeurs possibles : `Top`, `Jungle`, `Mid`, `ADC`, `Support`

#### 4.2.3 Rôles recherchés (Looking For)
- Recherche d'icônes SVG avec classe `position-icon.w-6.h-6.looking-for`
- Si aucune trouvée, utilise toutes les icônes sauf le rôle principal
- Retourne un tableau de rôles recherchés

#### 4.2.4 Indicateur "+" (Looking For Plus)
- Recherche d'un `<span>` avec classe `text-gray-400` contenant "+"
- Ou recherche dans tous les `<span>` pour le texte "+"

#### 4.2.5 Code de rang
- Format : `[A-Z]{1,2}\d` (ex: `G2`, `D1`, `M1`, `GM1`, `C1`)
- Extraction depuis les `<span>` de l'élément
- Mapping :
  - `I` → Iron
  - `B` → Bronze
  - `S` → Silver
  - `G` → Gold
  - `P` → Platinum
  - `E` → Emerald
  - `D` → Diamond
  - `M1` → Master
  - `GM1` → GM
  - `C1` → Challenger

#### 4.2.6 Winrate global
- Recherche de spans contenant "xxW" et "xxL" (victoires/défaites)
- Localisation du conteneur parent (`div.w-38` ou similaire)
- Extraction du pourcentage depuis un span au format `\d{1,3}%`
- Retourne un nombre entre 0 et 100

### 4.3 Filtres appliqués (dans l'ordre)

#### 4.3.1 Filtre Blacklist
- **Condition** : Le nom du joueur (normalisé en minuscules) est présent dans la blacklist
- **Action** : Suppression de l'élément
- **Log** : Raison "blacklist"

#### 4.3.2 Filtre Doublons
- **Condition** : Le nom du joueur apparaît déjà dans la liste
- **Action** : Suppression des occurrences suivantes
- **Log** : Raison "duplicate"

#### 4.3.3 Filtre Même Rôle
- **Condition** : Le rôle principal du joueur correspond au rôle sélectionné par l'utilisateur
- **Action** : Suppression de l'élément
- **Log** : Raison "sameRole"
- **Note** : Non appliqué si "All Positions" est sélectionné

#### 4.3.4 Filtre "Looking For"
- **Condition** : Le joueur ne recherche pas le rôle de l'utilisateur ET n'a pas d'indicateur "+"
- **Action** : Suppression de l'élément
- **Log** : Raison "lookingFor"
- **Note** : 
  - Les joueurs avec "+" sont toujours conservés
  - Les joueurs recherchant "All Positions" ou "All" sont conservés
  - Non appliqué si "All Positions" est sélectionné

#### 4.3.5 Filtre Compatibilité de Rang
- **Condition** : Le rang du joueur n'est pas compatible avec le rang de l'utilisateur selon les règles de Duo.GG
- **Action** : Suppression de l'élément
- **Log** : Raison "rank"
- **Note** : Non appliqué si "All" est sélectionné

**Règles de compatibilité de rang** :

| Mon Rang | Rangs compatibles |
|----------|-------------------|
| Iron | Iron, Bronze, Silver |
| Bronze | Iron, Bronze, Silver |
| Silver | Iron, Bronze, Silver, Gold |
| Gold | Silver, Gold, Platinum |
| Platinum | Gold, Platinum, Emerald |
| Emerald | Platinum, Emerald, Diamond (dans 2 divisions) |
| Diamond I | Diamond I/II/III, Master, GM, Challenger |
| Diamond II-IV | Diamond, Emerald (dans 2 divisions) |
| Master/GM/Challenger | Diamond I, Master, GM, Challenger |

**Note spéciale** : Pour Emerald ↔ Diamond, la compatibilité est calculée via un index de ladder permettant un écart maximum de 2 divisions.

#### 4.3.6 Filtre Winrate Minimum
- **Condition** : Le winrate du joueur est strictement inférieur au winrate minimum spécifié
- **Action** : Suppression de l'élément
- **Log** : Raison "winRate"
- **Note** : 
  - Si le winrate ne peut pas être extrait, l'élément est conservé (fail-open)
  - Non appliqué si aucun winrate minimum n'est spécifié

### 4.4 Affichage des statistiques

Après le filtrage, des badges sont affichés en haut à droite de la page :

- **Blacklist removed** : Nombre d'éléments supprimés par la blacklist
- **Duplicates removed** : Nombre de doublons supprimés
- **Same role removed** : Nombre d'éléments supprimés (même rôle)
- **Looking for removed** : Nombre d'éléments supprimés (incompatibilité "Looking For")
- **Rank removed** : Nombre d'éléments supprimés (incompatibilité de rang)
- **WinRate removed** : Nombre d'éléments supprimés (winrate trop bas)
- **Remaining rows** : Nombre d'éléments restants après filtrage

### 4.5 Logging détaillé

Le script génère des logs dans la console du navigateur :
- Groupe principal : `[DuoGG] Filter run`
- Paramètres d'entrée
- Nombre initial de lignes
- Statistiques de suppression par catégorie
- Tableaux détaillés des éléments supprimés (par raison)
- Tableau global de tous les éléments supprimés

## 5. Styles et design

### 5.1 Thème de couleur

- **Fond principal** : `#1c1c1f` (gris très foncé)
- **Header** : `#31313c` (gris foncé)
- **Champs de saisie** : `#2a2a33` (fond), `#3a3a45` (bordure)
- **Bouton principal** : `#00bba3` (turquoise), `#00998c` (au survol)
- **Texte** : `#cfcfd6` (gris clair), blanc pour les valeurs

### 5.2 Typographie

- **Police** : Roboto, sans-serif
- **Taille** : 12-13px pour les champs, 20px pour le titre

### 5.3 Badges statistiques

- **Position** : Fixe, en haut à droite (12px depuis les bords)
- **Style** : Fond noir semi-transparent (`rgba(0,0,0,0.75)`), bordure blanche semi-transparente
- **Effet** : Backdrop blur (flou d'arrière-plan)
- **Z-index** : `2147483647` (maximum) pour rester au-dessus de tout

## 6. Gestion des erreurs

### 6.1 Erreurs de chargement

- **Blacklist** : Si le fichier ne peut pas être chargé, retourne un tableau vide (pas d'erreur bloquante)
- **Injection de script** : Les erreurs sont loggées dans la console
- **Fonction non trouvée** : Si `window.duoGGFilter` n'existe pas après injection, retourne `{ error: "duoGGFilter_not_found" }`

### 6.2 Robustesse

- **Extraction de données** : Si une donnée ne peut pas être extraite, des valeurs par défaut sont utilisées
- **Winrate** : Si le winrate ne peut pas être lu, l'élément est conservé (fail-open)
- **Normalisation** : Tous les textes sont normalisés (trim, lowercase pour les noms)

## 7. Limitations et contraintes

### 7.1 Dépendances DOM

- L'extension dépend de la structure HTML de Duo.GG
- Utilise des sélecteurs CSS spécifiques (`li.MuiCollapse-root`, `svg.position-icon`, etc.)
- Toute modification de la structure HTML de Duo.GG peut nécessiter une mise à jour

### 7.2 Cadres (Frames)

- Le script ne s'exécute que dans le frame principal (`window.top !== window`)
- Les iframes sont ignorées

### 7.3 Compatibilité

- **Manifest V3** uniquement (Chrome/Edge récents)
- Nécessite une page Duo.GG active pour fonctionner

## 8. Cas d'usage

### 8.1 Scénario typique

1. L'utilisateur ouvre Duo.GG dans son navigateur
2. Il clique sur l'icône de l'extension
3. Il configure ses filtres :
   - Rôle : `ADC`
   - Tier : `Gold`
   - Division : `II`
   - Winrate : `50`
4. Il clique sur "Filter"
5. La liste est filtrée automatiquement
6. Les statistiques s'affichent en haut à droite

### 8.2 Gestion de la blacklist

- L'utilisateur peut modifier `blacklist.txt` pour ajouter/supprimer des joueurs
- Les modifications nécessitent un rechargement de l'extension ou de la popup
- Format simple : un nom par ligne, commentaires avec `#`

## 9. Améliorations possibles

- Synchronisation de la blacklist via Chrome Sync Storage
- Interface pour gérer la blacklist depuis la popup
- Export/import des paramètres de filtrage
- Historique des filtres appliqués
- Filtres supplémentaires (ex: nombre de jeux récents, champions joués)
- Mode sombre/clair pour la popup
- Notifications lorsque de nouveaux joueurs correspondent aux critères
