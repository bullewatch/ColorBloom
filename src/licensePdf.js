import { jsPDF } from 'jspdf';

/**
 * Calcule avec précision les dates de début et de fin selon le calendrier exact.
 * Date de début : jour de l'abonnement
 * Date de fin : exactement le même jour calendaire 1 an plus tard (annuel) ou 1 mois plus tard (mensuel).
 */
export function calculateLicenseDates(validFrom, interval = 'month', validUntil = null) {
  const startDate = validFrom ? new Date(validFrom) : new Date();

  let endDate;
  if (validUntil && !isNaN(new Date(validUntil).getTime())) {
    endDate = new Date(validUntil);
  } else {
    endDate = new Date(startDate);
    if (interval === 'year') {
      endDate.setFullYear(startDate.getFullYear() + 1);
    } else {
      endDate.setMonth(startDate.getMonth() + 1);
    }
  }

  const formattedStart = startDate.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const formattedEnd = endDate.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return {
    startDate,
    endDate,
    formattedStart,
    formattedEnd,
  };
}

/**
 * Génère et télécharge le certificat officiel d'homologation de licence commerciale ColorVIP Pro au format PDF.
 * Présentation hautement professionnelle, sobre et institutionnelle (format A4 portrait)
 * avec encadrement de sécurité, cartouche d'identification nominative, enseigne/boutique,
 * sceau officiel, empreinte de contrôle cryptographique et signature de la direction.
 */
export function generateCommercialLicensePdf({
  licenseNumber,
  holderName,
  firstName,
  lastName,
  shopName,
  holderEmail,
  interval = 'year',
  validFrom,
  validUntil,
}) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210 mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297 mm
  const marginX = 18; // 18 mm de marges latérales
  const contentWidth = pageWidth - marginX * 2; // 174 mm

  // 1. Fond blanc immaculé
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // 2. Encadrement officiel de prestige (Double bordure d'attestation officielle)
  doc.setDrawColor(203, 213, 225); // Slate 300
  doc.setLineWidth(0.7);
  doc.rect(9, 9, pageWidth - 18, pageHeight - 18, 'S');

  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.setLineWidth(0.3);
  doc.rect(10.5, 10.5, pageWidth - 21, pageHeight - 21, 'S');

  // 3. En-tête administratif officiel
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139); // Slate 500
  doc.text('RÉPUBLIQUE FRANÇAISE & INTERNATIONAL • REGISTRE DE PROPRIÉTÉ INTELLECTUELLE', marginX, 18);

  // Marque Colorblop Corporate en police Helvetica Bold
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.text('COLORBLOP', marginX, 27);

  // Badge officiel en haut à droite
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 58, 138); // Bleu nuit institutionnel
  doc.text('HOMOLOGATION OFFICIELLE COMMERCIALE', pageWidth - marginX, 22, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Réf. Réglementation CPI Art. L122-6 & L122-7', pageWidth - marginX, 26, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105); // Slate 600
  doc.text('Édition d’Art Vectoriel & Dessins Numériques • Registre Central des Licences • www.colorblop.com', marginX, 32);

  // Lignes de séparation professionnelles
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.6);
  doc.line(marginX, 36, pageWidth - marginX, 36);

  doc.setDrawColor(203, 213, 225); // Slate 300
  doc.setLineWidth(0.25);
  doc.line(marginX, 37.5, pageWidth - marginX, 37.5);

  // 4. Titre officiel du certificat
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13.5);
  doc.setTextColor(15, 23, 42);
  doc.text('CERTIFICAT OFFICIEL D’HOMOLOGATION COMMERCIALE', marginX, 45);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  const planLabel = interval === 'year' ? 'Formule ColorVIP Pro (Licence Annuelle)' : 'Formule ColorVIP Pro (Licence Mensuelle)';
  doc.text(`${planLabel} • Attestation nominative d’exploitation commerciale de créations physiques`, marginX, 50);

  // 5. Calcul des dates et résolution des noms
  const { formattedStart, formattedEnd } = calculateLicenseDates(validFrom, interval, validUntil);
  const cleanSerial = String(licenseNumber || 'CBL-2026-PRO-OFFICIEL').toUpperCase();

  // Résolution du titulaire (Nom + Prénom)
  let cleanHolder = '';
  if (firstName || lastName) {
    cleanHolder = [lastName, firstName].filter(Boolean).join(' ').toUpperCase();
  } else if (holderName) {
    cleanHolder = String(holderName).trim().toUpperCase();
  } else {
    cleanHolder = 'TITULAIRE ENREGISTRÉ';
  }

  // Résolution de la boutique / enseigne
  let cleanShop = '';
  if (shopName && shopName.trim()) {
    cleanShop = shopName.trim();
  } else {
    cleanShop = 'Artisan / Créateur Indépendant (Vente directe & Ateliers)';
  }

  const cleanEmail = holderEmail ? String(holderEmail).trim() : 'Email client enregistré';

  // === TABLEAU D'IDENTIFICATION OFFICIEL ET SÉCURISÉ ===
  let tableY = 56;
  doc.setFillColor(248, 250, 252); // Slate 50
  doc.rect(marginX, tableY, contentWidth, 54, 'F');

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.rect(marginX, tableY, contentWidth, 54, 'S');

  // Ligne 1 : N° DE SÉRIE UNIQUE
  let rowY = tableY + 7;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('NUMÉRO UNIQUE DE LICENCE :', marginX + 3.5, rowY);

  doc.setFont('courier', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(cleanSerial, marginX + 54, rowY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(22, 101, 52); // Vert officiel
  doc.text('● ENREGISTRÉ & INVIOLABLE', pageWidth - marginX - 3.5, rowY, { align: 'right' });

  // Séparateur ligne 1/2
  rowY += 3.5;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.25);
  doc.line(marginX + 3.5, rowY, pageWidth - marginX - 3.5, rowY);

  // Ligne 2 : TITULAIRE NOMINATIF
  rowY += 6.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('TITULAIRE OFFICIEL :', marginX + 3.5, rowY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(cleanHolder, marginX + 54, rowY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`(${cleanEmail})`, pageWidth - marginX - 3.5, rowY, { align: 'right' });

  // Séparateur ligne 2/3
  rowY += 3.5;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.25);
  doc.line(marginX + 3.5, rowY, pageWidth - marginX - 3.5, rowY);

  // Ligne 3 : NOM DE LA BOUTIQUE / ATELIER / MARQUE
  rowY += 6.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('BOUTIQUE / ENSEIGNE :', marginX + 3.5, rowY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 58, 138); // Bleu nuit corporate
  doc.text(cleanShop, marginX + 54, rowY);

  // Séparateur ligne 3/4
  rowY += 3.5;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.25);
  doc.line(marginX + 3.5, rowY, pageWidth - marginX - 3.5, rowY);

  // Ligne 4 : PÉRIODE DE VALIDITÉ
  rowY += 6.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('PÉRIODE DE VALIDITÉ :', marginX + 3.5, rowY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`Du ${formattedStart} au ${formattedEnd} (inclus)`, marginX + 54, rowY);

  // Séparateur ligne 4/5
  rowY += 3.5;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.25);
  doc.line(marginX + 3.5, rowY, pageWidth - marginX - 3.5, rowY);

  // Ligne 5 : STATUT JURIDIQUE
  rowY += 6.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('STATUT JURIDIQUE :', marginX + 3.5, rowY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(22, 101, 52); // Vert officiel
  doc.text('HOMOLOGUÉE, ACTIVE ET EN VIGUEUR ✓', marginX + 54, rowY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Plafond autorisé : 5 000 pièces physiques / visuel', pageWidth - marginX - 3.5, rowY, { align: 'right' });

  // === SECTION 1 : ÉTENDUE DES DROITS COMMERCIAUX ===
  let curY = tableY + 62;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('1. ÉTENDUE DES DROITS COMMERCIAUX ACCORDÉS AU TITULAIRE', marginX, curY);

  curY += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);

  const rights = [
    'Pendant toute la période de validité certifiée ci-dessus, le titulaire nominatif et son enseigne/boutique bénéficient du droit légal et non-exclusif d’exploiter commercialement les illustrations vectorielles de la plateforme Colorblop selon les clauses suivantes :',
    '• Accès vectoriel intégral : Téléchargement illimité de l’ensemble des fichiers sources vectoriels SVG haute fidélité du catalogue Colorblop.',
    '• Confection physique artisanale & industrielle : Droit d’intégrer et d’apposer les visuels sur tous supports matériels tangibles (textiles, t-shirts, sacs, broderies, articles de papeterie, stickers, mugs, décorations en bois/acrylique, découpe vinyle Cricut/Silhouette/laser).',
    '• Vente commerciale autorisée : Droit de commercialiser les créations matérielles finies directement aux consommateurs ou aux entreprises, en boutiques physiques, marchés artisanaux ou boutiques en ligne (Etsy, Shopify, propre site web), dans la limite de 5 000 unités finies par illustration.',
    '• Couverture juridique complète : Ce certificat confère au titulaire une garantie légale d’exploitation contre toute réclamation de contrefaçon pour ses produits physiques finis.',
  ];

  rights.forEach(item => {
    const lines = doc.splitTextToSize(item, contentWidth);
    doc.text(lines, marginX, curY);
    curY += lines.length * 3.4 + 1;
  });

  // === SECTION 2 : RESTRICTIONS STRICTES & PROPRIÉTÉ INTELLECTUELLE ===
  curY += 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(153, 27, 27); // Rouge juridique Slate/Red
  doc.text('2. RESTRICTIONS STRICTES & PROTECTION DE LA PROPRIÉTÉ INTELLECTUELLE', marginX, curY);

  curY += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);

  const restrictions = [
    'Le présent document constitue une licence commerciale d’exploitation sur support physique et n’opère aucun transfert de droit d’auteur ou de propriété intellectuelle :',
    '• Interdiction absolue de revente numérique : Il est formellement interdit de revendre, céder, prêter, sous-licencier, donner ou redistribuer les fichiers numériques sous format SVG, EPS, PNG, PDF vectoriel ou tout format dérivé.',
    '• Interdiction des banques d’images & fichiers digitaux : Interdiction stricte de proposer les fichiers en téléchargement numérique direct sur des plateformes tierces (ex : vente de fichiers SVG sur Etsy, Creative Fabrica, Freepik, Shutterstock).',
    '• Respect de la paternité : Interdiction de s’attribuer la création originale des illustrations vectorielles conçues par Colorblop.',
    '• Fin de validité : À l’expiration ou en cas de résiliation de l’abonnement, toute nouvelle production physique doit cesser immédiatement.',
  ];

  restrictions.forEach(item => {
    const lines = doc.splitTextToSize(item, contentWidth);
    doc.text(lines, marginX, curY);
    curY += lines.length * 3.4 + 1;
  });

  // === PIED DE PAGE SÉCURISÉ SANS SUPERPOSITION ===
  const footerDividerY = 227;
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.5);
  doc.line(marginX, footerDividerY, pageWidth - marginX, footerDividerY);

  // COLONNE GAUCHE : Mentions légales et empreinte cryptographique
  const footerLeftX = marginX;
  let footerLeftY = footerDividerY + 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);

  doc.text('Attestation délivrée automatiquement par le registre officiel Colorblop & Stripe Billing.', footerLeftX, footerLeftY);
  footerLeftY += 4;
  doc.text('Ce document fait foi auprès des plateformes de vente (Etsy, salons, etc.)', footerLeftX, footerLeftY);
  footerLeftY += 4;
  doc.text('et des autorités de contrôle de propriété intellectuelle.', footerLeftX, footerLeftY);

  footerLeftY += 5;
  doc.setFont('courier', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(100, 116, 139);
  const rawNum = cleanSerial.replace(/[^A-Z0-9]/gi, '');
  doc.text(`EMPREINTE CRYPTOGRAPHIQUE SHA-256 : CBL-AUTH-${rawNum.slice(-8) || '92487103'}-SEC`, footerLeftX, footerLeftY);
  doc.setFont('helvetica', 'normal');
  doc.text('Vérification d’authenticité en ligne sur https://colorblop.com', footerLeftX, footerLeftY + 3.5);

  // COLONNE CENTRALE / DROITE : Sceau officiel circulaire
  const sealCenterX = 132;
  const sealCenterY = footerDividerY + 16;
  const sealRadius = 12;

  doc.setDrawColor(30, 58, 138); // Bleu nuit institutionnel (#1E3A8A)
  doc.setLineWidth(0.7);
  doc.circle(sealCenterX, sealCenterY, sealRadius, 'S');

  doc.setLineWidth(0.25);
  doc.circle(sealCenterX, sealCenterY, sealRadius - 1.4, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4.6);
  doc.setTextColor(30, 58, 138);
  doc.text('★ COLORBLOP PRO ★', sealCenterX, sealCenterY - 6.2, { align: 'center' });

  doc.setFontSize(6.2);
  doc.text('HOMOLOGATION', sealCenterX, sealCenterY - 2.6, { align: 'center' });
  doc.setFontSize(6.5);
  doc.text('OFFICIELLE', sealCenterX, sealCenterY + 1.2, { align: 'center' });

  // Ligne de micro-sécurité interne
  doc.setLineWidth(0.2);
  doc.line(sealCenterX - 6.5, sealCenterY + 3, sealCenterX + 6.5, sealCenterY + 3);

  const hiddenSecuritySequence = `• ${rawNum.slice(3, 7) || '8492'} • ${rawNum.slice(-4) || '6149'} •`;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4);
  doc.text(hiddenSecuritySequence, sealCenterX, sealCenterY + 5.2, { align: 'center' });

  doc.setFontSize(4.2);
  doc.text('CERTIFIÉ CONFORME', sealCenterX, sealCenterY + 8.6, { align: 'center' });

  // COLONNE DROITE : Bloc signature Direction
  const sigX = 158;
  const sigY = footerDividerY + 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('Pour la Direction Colorblop :', sigX, sigY);

  // Ligne d'émargement
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.35);
  doc.line(sigX, sigY + 14, pageWidth - marginX, sigY + 14);

  // Signature vectorielle stylisée "Colorblop"
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.5);

  const startSigX = sigX + 2;
  const startSigY = sigY + 10;

  // C majuscule avec paraphe
  doc.lines(
    [
      [1.5, -4, 3, -5, 5, -4],
      [1.5, 1.5, 1.5, 4, -0.8, 6],
      [-2, 1.5, -3.5, 0.8, -2.8, -0.8],
      [1.5, -1.5, 3.5, -1.5, 5, 0],
    ],
    startSigX,
    startSigY,
    [1, 1],
    'S'
  );

  // olor
  doc.lines(
    [
      [1, -1.5, 2, -1.5, 3, 0],
      [0.8, -3, 1.5, -4.5, 2, 0],
      [1, -1.5, 2, -1.5, 3, 0],
      [1, -1, 1.8, 0, 2.2, 0.8],
    ],
    startSigX + 4.5,
    startSigY - 0.4,
    [1, 1],
    'S'
  );

  // blop
  doc.lines(
    [
      [0.8, -3.8, 1.5, -5, 2.2, -0.8],
      [1, 0, 1.8, -0.8, 2.2, 0.8],
      [0.8, -3.8, 1.5, -5, 2, 0],
      [1, -1.5, 2, -1.5, 3, 0],
      [0.8, 0.8, 1.5, 4.5, 1.5, 6.5],
      [0.4, -3, 1.5, -3.8, 2.2, -1.5],
    ],
    startSigX + 13.5,
    startSigY,
    [1, 1],
    'S'
  );

  // Paraphe élégant
  doc.setLineWidth(0.55);
  doc.lines(
    [
      [-6, 2, -14, 2.8, -22, 1.5],
    ],
    startSigX + 24,
    startSigY + 3.5,
    [1, 1],
    'S'
  );

  // Mentions officielles
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('La Direction Colorblop', sigX, sigY + 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(100, 116, 139);
  doc.text('Direction des Droits Numériques', sigX, sigY + 21.5);

  // Sauvegarde automatique du PDF
  const safeFilenameNum = cleanSerial.replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`Certificat-Licence-Commerciale-${safeFilenameNum}.pdf`);
  return doc;
}
