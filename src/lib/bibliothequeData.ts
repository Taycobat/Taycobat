export interface BiblioItem {
  lib: string
  pu: number
  unit: string
}

export interface BiblioCategory {
  nom: string
  items: BiblioItem[]
}

export interface BiblioMetier {
  id: string
  icon: string
  nom: string
  categories: BiblioCategory[]
}

export const METIERS: BiblioMetier[] = [
  {
    id: 'gros-oeuvre',
    icon: '🧱',
    nom: 'Gros œuvre',
    categories: [
      {
        nom: 'Maçonnerie',
        items: [
          { lib: 'Parpaing creux 20×20×50', pu: 42, unit: 'm²' },
          { lib: 'Parpaing creux 15×20×50', pu: 38, unit: 'm²' },
          { lib: 'Brique plâtrière 5cm', pu: 28, unit: 'm²' },
          { lib: 'Béton armé fondation', pu: 185, unit: 'm³' },
          { lib: 'Béton armé dalle', pu: 165, unit: 'm³' },
          { lib: 'Chainage horizontal BA', pu: 35, unit: 'ml' },
          { lib: 'Chainage vertical BA', pu: 32, unit: 'ml' },
          { lib: 'Linteau béton armé', pu: 45, unit: 'ml' },
          { lib: 'Enduit monocouche façade', pu: 35, unit: 'm²' },
          { lib: 'Enduit ciment 2 couches', pu: 28, unit: 'm²' },
        ],
      },
      {
        nom: 'Terrassement',
        items: [
          { lib: 'Décapage terre végétale 20cm', pu: 8, unit: 'm²' },
          { lib: 'Fouille en rigole', pu: 35, unit: 'm³' },
          { lib: 'Fouille en pleine masse', pu: 28, unit: 'm³' },
          { lib: 'Remblai compacté', pu: 22, unit: 'm³' },
          { lib: 'Evacuation terres excédentaires', pu: 18, unit: 'm³' },
          { lib: 'Film polyéthylène 200µ', pu: 3, unit: 'm²' },
          { lib: 'Hérisson tout venant 20cm', pu: 12, unit: 'm²' },
        ],
      },
    ],
  },
  {
    id: 'charpente',
    icon: '🏠',
    nom: 'Charpente & couverture',
    categories: [
      {
        nom: 'Charpente',
        items: [
          { lib: 'Fermette industrielle', pu: 65, unit: 'm²' },
          { lib: 'Charpente traditionnelle chêne', pu: 120, unit: 'm²' },
          { lib: 'Solivage bois plancher', pu: 45, unit: 'm²' },
          { lib: 'Liteaunage sapin', pu: 8, unit: 'ml' },
          { lib: 'Volige sapin 18mm', pu: 18, unit: 'm²' },
        ],
      },
      {
        nom: 'Couverture',
        items: [
          { lib: 'Tuile terre cuite (pose)', pu: 52, unit: 'm²' },
          { lib: 'Tuile béton (pose)', pu: 42, unit: 'm²' },
          { lib: 'Ardoise naturelle (pose)', pu: 85, unit: 'm²' },
          { lib: 'Bac acier simple peau', pu: 32, unit: 'm²' },
          { lib: 'Faîtière scellée', pu: 22, unit: 'ml' },
          { lib: 'Gouttière zinc demi-ronde', pu: 28, unit: 'ml' },
          { lib: 'Descente zinc Ø80', pu: 25, unit: 'ml' },
        ],
      },
    ],
  },
  {
    id: 'plomberie',
    icon: '🚿',
    nom: 'Plomberie chauffage',
    categories: [
      {
        nom: 'Sanitaire',
        items: [
          { lib: 'Pose WC complet', pu: 380, unit: 'u' },
          { lib: 'Pose lavabo + robinetterie', pu: 320, unit: 'u' },
          { lib: 'Pose douche italienne complète', pu: 1800, unit: 'u' },
          { lib: 'Pose baignoire + robinetterie', pu: 650, unit: 'u' },
          { lib: 'Pose bidet + robinetterie', pu: 350, unit: 'u' },
          { lib: 'Pose chauffe-eau 200L', pu: 850, unit: 'u' },
          { lib: 'Alimentation eau cuivre Ø14', pu: 18, unit: 'ml' },
          { lib: 'Evacuation PVC Ø100', pu: 22, unit: 'ml' },
        ],
      },
      {
        nom: 'Chauffage',
        items: [
          { lib: 'Pose radiateur acier', pu: 280, unit: 'u' },
          { lib: 'Pose chaudière gaz murale', pu: 2800, unit: 'u' },
          { lib: 'Tube cuivre chauffage Ø16', pu: 15, unit: 'ml' },
          { lib: 'Pose plancher chauffant', pu: 65, unit: 'm²' },
          { lib: 'Pose pompe à chaleur air/eau', pu: 8500, unit: 'u' },
        ],
      },
    ],
  },
  {
    id: 'electricite',
    icon: '⚡',
    nom: 'Électricité',
    categories: [
      {
        nom: 'Installation',
        items: [
          { lib: 'Point lumineux simple', pu: 85, unit: 'u' },
          { lib: 'Prise de courant 2P+T', pu: 65, unit: 'u' },
          { lib: 'Interrupteur va-et-vient', pu: 75, unit: 'u' },
          { lib: 'Tableau électrique 2 rangées', pu: 450, unit: 'u' },
          { lib: 'Tableau électrique 4 rangées', pu: 750, unit: 'u' },
          { lib: 'Disjoncteur différentiel 30mA', pu: 85, unit: 'u' },
          { lib: 'Câble R2V 3G2.5', pu: 4, unit: 'ml' },
          { lib: 'Gaine ICTA Ø20', pu: 2, unit: 'ml' },
          { lib: 'Spot LED encastrable', pu: 45, unit: 'u' },
          { lib: 'Prise RJ45 Cat6', pu: 95, unit: 'u' },
        ],
      },
    ],
  },
  {
    id: 'carrelage',
    icon: '🔲',
    nom: 'Carrelage',
    categories: [
      {
        nom: 'Pose',
        items: [
          { lib: 'Carrelage sol 30×30 (pose)', pu: 45, unit: 'm²' },
          { lib: 'Carrelage sol 60×60 (pose)', pu: 55, unit: 'm²' },
          { lib: 'Carrelage imitation bois (pose)', pu: 58, unit: 'm²' },
          { lib: 'Faïence murale 30×60 (pose)', pu: 52, unit: 'm²' },
          { lib: 'Mosaïque (pose)', pu: 75, unit: 'm²' },
          { lib: 'Plinthes carrelage', pu: 14, unit: 'ml' },
          { lib: 'Ragréage sol', pu: 12, unit: 'm²' },
          { lib: 'Seuil de porte', pu: 25, unit: 'u' },
        ],
      },
    ],
  },
  {
    id: 'peinture',
    icon: '🎨',
    nom: 'Peinture',
    categories: [
      {
        nom: 'Travaux de peinture',
        items: [
          { lib: 'Peinture acrylique murs (2 couches)', pu: 18, unit: 'm²' },
          { lib: 'Peinture plafond (2 couches)', pu: 22, unit: 'm²' },
          { lib: 'Enduit de lissage murs', pu: 8, unit: 'm²' },
          { lib: 'Peinture boiserie laquée', pu: 25, unit: 'm²' },
          { lib: 'Papier peint (pose)', pu: 28, unit: 'm²' },
          { lib: 'Crépi extérieur', pu: 32, unit: 'm²' },
          { lib: 'Ravalement façade complet', pu: 55, unit: 'm²' },
          { lib: 'Traitement anti-humidité', pu: 35, unit: 'm²' },
        ],
      },
    ],
  },
  {
    id: 'menuiserie',
    icon: '🪵',
    nom: 'Menuiserie',
    categories: [
      {
        nom: 'Portes & fenêtres',
        items: [
          { lib: 'Fenêtre PVC double vitrage', pu: 350, unit: 'u' },
          { lib: 'Porte-fenêtre PVC 2 vantaux', pu: 550, unit: 'u' },
          { lib: 'Baie vitrée coulissante alu', pu: 1200, unit: 'u' },
          { lib: 'Porte intérieure bois (pose)', pu: 280, unit: 'u' },
          { lib: 'Porte blindée (pose)', pu: 1500, unit: 'u' },
          { lib: 'Volet roulant PVC motorisé', pu: 450, unit: 'u' },
          { lib: 'Porte de garage sectionnelle', pu: 1800, unit: 'u' },
        ],
      },
      {
        nom: 'Aménagement',
        items: [
          { lib: 'Cuisine équipée (pose)', pu: 180, unit: 'ml' },
          { lib: 'Placard sur mesure', pu: 350, unit: 'ml' },
          { lib: 'Parquet flottant (pose)', pu: 35, unit: 'm²' },
          { lib: 'Parquet massif chêne (pose)', pu: 75, unit: 'm²' },
          { lib: 'Plinthe bois', pu: 8, unit: 'ml' },
        ],
      },
    ],
  },
  {
    id: 'isolation',
    icon: '🧤',
    nom: 'Isolation',
    categories: [
      {
        nom: 'Isolation thermique',
        items: [
          { lib: 'Isolation laine de verre 100mm', pu: 22, unit: 'm²' },
          { lib: 'Isolation laine de roche 120mm', pu: 28, unit: 'm²' },
          { lib: 'Isolation polyuréthane 80mm', pu: 35, unit: 'm²' },
          { lib: 'ITE polystyrène 140mm', pu: 95, unit: 'm²' },
          { lib: 'Doublage collé placo+isolant', pu: 42, unit: 'm²' },
          { lib: 'Plaque BA13 standard (pose)', pu: 18, unit: 'm²' },
          { lib: 'Plaque BA13 hydrofuge (pose)', pu: 22, unit: 'm²' },
          { lib: 'Faux plafond BA13 sur ossature', pu: 45, unit: 'm²' },
        ],
      },
    ],
  },
  {
    id: 'demolition',
    icon: '🔨',
    nom: 'Démolition',
    categories: [
      {
        nom: 'Travaux de démolition',
        items: [
          { lib: 'Démolition cloison', pu: 15, unit: 'm²' },
          { lib: 'Démolition mur porteur (avec IPN)', pu: 180, unit: 'ml' },
          { lib: 'Dépose carrelage sol', pu: 12, unit: 'm²' },
          { lib: 'Dépose faïence murale', pu: 10, unit: 'm²' },
          { lib: 'Dépose sanitaire', pu: 80, unit: 'u' },
          { lib: 'Évacuation gravats', pu: 45, unit: 'm³' },
          { lib: 'Location benne 8m³', pu: 350, unit: 'u' },
        ],
      },
    ],
  },
  {
    id: 'espaces-verts',
    icon: '🌿',
    nom: 'Espaces verts',
    categories: [
      {
        nom: 'Aménagement extérieur',
        items: [
          { lib: 'Engazonnement (semis)', pu: 8, unit: 'm²' },
          { lib: 'Gazon en rouleau (pose)', pu: 15, unit: 'm²' },
          { lib: 'Terrasse bois (pose)', pu: 85, unit: 'm²' },
          { lib: 'Dalle béton extérieur', pu: 65, unit: 'm²' },
          { lib: 'Clôture grillage H1.5m', pu: 35, unit: 'ml' },
          { lib: 'Clôture aluminium', pu: 120, unit: 'ml' },
          { lib: 'Portail aluminium coulissant', pu: 2500, unit: 'u' },
        ],
      },
    ],
  },
]
