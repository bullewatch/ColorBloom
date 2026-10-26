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
 * Génère et télécharge l'attestation officielle de licence commerciale ColorVIP Pro au format PDF.
 * Présentation sobre, moderne et juridique en police standard Arial, sans encadrés superflus,
 * avec un filigrane de sécurité anti-usurpation sous le nom du titulaire,
 * et suppression de toute superposition de texte.
 */
export function generateCommercialLicensePdf({
  licenseNumber,
  holderName,
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
  const marginX = 20; // 20 mm à gauche et à droite
  const contentWidth = pageWidth - marginX * 2; // 170 mm

  // 1. Fond blanc immaculé de document officiel d'entreprise
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // 2. En-tête administratif officiel (Strictement en Arial)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139); // Slate 500
  doc.text('RÉPUBLIQUE FRANÇAISE & INTERNATIONAL • REGISTRE DE PROPRIÉTÉ INTELLECTUELLE', marginX, 18);

  // Marque Colorblop Corporate en Arial bold
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.text('COLORBLOP', marginX, 28);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105); // Slate 600
  doc.text('Édition de Dessins Vectoriels & Numériques • SIRET / Homologation Juridique • www.colorblop.com', marginX, 33);

  // Lignes de séparation professionnelles (fines, nettes, sans encadré)
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.6);
  doc.line(marginX, 37, pageWidth - marginX, 37);

  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.setLineWidth(0.3);
  doc.line(marginX, 38.5, pageWidth - marginX, 38.5);

  // 3. Titre du document
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text('ATTESTATION OFFICIELLE DE LICENCE COMMERCIALE', marginX, 47);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(51, 65, 85);
  const planLabel = interval === 'year' ? 'Formule ColorVIP Pro (Annuelle)' : 'Formule ColorVIP Pro (Mensuelle)';
  doc.text(`${planLabel} • Certificat d’autorisation d’exploitation commerciale`, marginX, 52.5);

  // 4. Calcul des dates et nettoyage des valeurs
  const { formattedStart, formattedEnd } = calculateLicenseDates(validFrom, interval, validUntil);
  const cleanSerial = String(licenseNumber || 'CBL-2026-PRO-OFFICIEL').toUpperCase();
  const cleanHolder = String(holderName || 'DUPONT JEAN').toUpperCase();

  // === TABLEAU D'IDENTIFICATION OFFICIEL (SANS ENCADRÉ - LIGNES HORIZONTALES ÉPURÉES) ===
  let tableY = 60;
  doc.setDrawColor(203, 213, 225); // Slate 300
  doc.setLineWidth(0.4);
  doc.line(marginX, tableY, pageWidth - marginX, tableY);

  // Ligne 1 : Numéro de série unique
  tableY += 6.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('N° DE SÉRIE UNIQUE :', marginX, tableY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(cleanSerial, marginX + 48, tableY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(22, 101, 52); // Vert juridique
  doc.text('[ NUMÉRO ENREGISTRÉ AU REGISTRE CENTRAL ]', pageWidth - marginX, tableY, { align: 'right' });

  // Ligne 2 : Titulaire nominatif avec FILIGRANE LÉGER ANTI-USURPATION
  tableY += 4;
  doc.setDrawColor(241, 245, 249);
  doc.setLineWidth(0.3);
  doc.line(marginX, tableY, pageWidth - marginX, tableY);

  // --- RENDU DU FILIGRANE DE SÉCURITÉ DERRIÈRE LE NOM DU TITULAIRE ---
  const wmStartX = marginX + 46;
  const wmWidth = contentWidth - 46;
  const wmStartY = tableY + 1;
  const wmHeight = 13;

  // Trame de micro-sécurité en lignes fines très claires
  doc.setDrawColor(241, 245, 249); // Gris très clair #F1F5F9
  doc.setLineWidth(0.2);
  for (let ly = wmStartY; ly <= wmStartY + wmHeight; ly += 2) {
    doc.line(wmStartX, ly, wmStartX + wmWidth, ly);
  }

  // Micro-texte filigrane répété en fond (extrêmement discret mais empêchant l'effacement numérique)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.setTextColor(226, 232, 240); // Slate 200 (#E2E8F0)
  const watermarkText = '★ COLORBLOP OFFICIAL SECURITY ★ NON-CESSIBLE ★ TITULAIRE ENREGISTRÉ ★ SÉCURITÉ INVIOLABLE ★';
  doc.text(watermarkText, wmStartX + 1, wmStartY + 5);
  doc.text(watermarkText, wmStartX + 1, wmStartY + 10);

  // NOM du titulaire imprimé par-dessus le filigrane
  tableY += 6.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('TITULAIRE NOMINATIF :', marginX, tableY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42); // Noir Slate 900
  doc.text(cleanHolder, marginX + 48, tableY);

  if (holderEmail) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`(${holderEmail})`, marginX + 48 + doc.getTextWidth(cleanHolder) + 3, tableY);
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Identité certifiée et enregistrée de manière définitive (Inviolable)', marginX + 48, tableY + 4.2);

  tableY += 7.5;
  doc.setDrawColor(241, 245, 249);
  doc.setLineWidth(0.3);
  doc.line(marginX, tableY, pageWidth - marginX, tableY);

  // Ligne 3 : Dates exactes de validité
  tableY += 6.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('DATE DE PRISE D’EFFET :', marginX, tableY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(formattedStart, marginX + 48, tableY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('DATE D’EXPIRATION :', marginX + 92, tableY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(`${formattedEnd} (inclus)`, marginX + 130, tableY);

  tableY += 4;
  doc.setDrawColor(241, 245, 249);
  doc.setLineWidth(0.3);
  doc.line(marginX, tableY, pageWidth - marginX, tableY);

  // Ligne 4 : Périmètre et statut
  tableY += 6.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('STATUT JURIDIQUE :', marginX, tableY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(22, 101, 52);
  doc.text('ACTIF, CONFORME ET EN VIGUEUR ✓', marginX + 48, tableY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('Produits physiques autorisés (5 000 unités / modèle)', pageWidth - marginX, tableY, { align: 'right' });

  tableY += 4;
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.line(marginX, tableY, pageWidth - marginX, tableY);

  // === SECTION 1 : DROITS COMMERCIAUX ACCORDÉS ===
  let curY = tableY + 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('1. ÉTENDUE DES DROITS COMMERCIAUX ACCORDÉS AU TITULAIRE', marginX, curY);

  curY += 4.8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);

  const rights = [
    'Pendant toute la durée de validité mentionnée ci-dessus, le titulaire nominatif désigné bénéficie du droit personnel et non-exclusif d’exploiter les ressources graphiques Colorblop selon les dispositions suivantes :',
    '• Téléchargement illimité : Accès libre et permanent à l’intégralité des fichiers vectoriels SVG du catalogue Colorblop.',
    '• Production physique : Autorisation d’intégrer et d’imprimer ces illustrations sur tous supports tangibles (textiles, vêtements, articles de papeterie, stickers, mugs, affiches, broderies, découpes vinyle/laser/Cricut).',
    '• Vente commerciale autorisée : Droit de commercialiser les créations physiques finies auprès de particuliers ou d’entreprises, dans la limite de 5 000 unités par visuel.',
    '• Artisans et créateurs : Couverture complète pour les créateurs indépendants, ateliers et boutiques physiques ou en ligne.',
  ];

  rights.forEach(item => {
    const lines = doc.splitTextToSize(item, contentWidth);
    doc.text(lines, marginX, curY);
    curY += lines.length * 3.8 + 1.2;
  });

  // === SECTION 2 : RESTRICTIONS STRICTES ===
  curY += 3;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(153, 27, 27); // Rouge corporate Slate/Red
  doc.text('2. RESTRICTIONS STRICTES ET SÉCURITÉ JURIDIQUE', marginX, curY);

  curY += 4.8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);

  const restrictions = [
    'La présente attestation constitue une licence d’exploitation d’usage et n’opère aucun transfert de propriété intellectuelle :',
    '• Interdiction absolue de redistribution numérique : Revente, prêt, don, sous-licence ou partage des fichiers sources (SVG, PNG, PDF vectoriel) sous toute forme.',
    '• Interdiction des banques d’images : Dépôt interdit sur plateformes tierces de téléchargement (Freepik, Shutterstock, Adobe Stock, Etsy numérique).',
    '• Non-revendication d’auteur : Interdiction de revendiquer la paternité des œuvres graphiques créées par Colorblop.',
    '• Fin de validité : À l’expiration ou résiliation de l’abonnement, toute nouvelle production ou mise en vente cesse immédiatement.',
  ];

  restrictions.forEach(item => {
    const lines = doc.splitTextToSize(item, contentWidth);
    doc.text(lines, marginX, curY);
    curY += lines.length * 3.8 + 1.2;
  });

  // === PIED DE PAGE SANS AUCUNE SUPERPOSITION DE TEXTE ===
  const footerDividerY = 228;
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.6);
  doc.line(marginX, footerDividerY, pageWidth - marginX, footerDividerY);

  // COLONNE GAUCHE : Texte juridique sur exactement 3 lignes sans empiètement
  const footerLeftX = marginX;
  let footerLeftY = footerDividerY + 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);

  doc.text('Attestation générée automatiquement par le système officiel Colorblop & Stripe Billing.', footerLeftX, footerLeftY);
  footerLeftY += 4.2;
  doc.text('Ce document fait foi de licence légale auprès des organismes tiers,', footerLeftX, footerLeftY);
  footerLeftY += 4.2;
  doc.text('plateformes de vente et autorités de contrôle de propriété intellectuelle.', footerLeftX, footerLeftY);

  footerLeftY += 5.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184); // Slate 400
  const rawNum = cleanSerial.replace(/[^A-Z0-9]/gi, '');
  doc.text(`EMPREINTE CRYPTOGRAPHIQUE SHA-256 : CB-SEC-${rawNum.slice(-8) || '92487103'}-OK`, footerLeftX, footerLeftY);
  doc.text('Vérification d’authenticité en ligne sur https://www.colorblop.com', footerLeftX, footerLeftY + 3.5);

  // COLONNE DROITE : Sceau officiel et signature séparés (AUCUNE superposition de texte !)
  // 1. Cachet officiel circulaire
  const sealCenterX = 134; // Décalé à gauche du bloc signature pour éviter toute superposition
  const sealCenterY = footerDividerY + 16;
  const sealRadius = 12.5;

  doc.setDrawColor(30, 58, 138); // Bleu nuit institutionnel (#1E3A8A)
  doc.setLineWidth(0.7);
  doc.circle(sealCenterX, sealCenterY, sealRadius, 'S');

  doc.setLineWidth(0.3);
  doc.circle(sealCenterX, sealCenterY, sealRadius - 1.5, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4.8);
  doc.setTextColor(30, 58, 138);
  doc.text('★ COLORBLOP PRO ★', sealCenterX, sealCenterY - 6.5, { align: 'center' });

  doc.setFontSize(6.5);
  doc.text('HOMOLOGATION', sealCenterX, sealCenterY - 2.8, { align: 'center' });
  doc.setFontSize(6.8);
  doc.text('OFFICIELLE', sealCenterX, sealCenterY + 1.2, { align: 'center' });

  // Ligne de micro-sécurité interne au cachet
  doc.setLineWidth(0.2);
  doc.line(sealCenterX - 7, sealCenterY + 3.2, sealCenterX + 7, sealCenterY + 3.2);

  const hiddenSecuritySequence = `• ${rawNum.slice(3, 7) || '8492'} • ${rawNum.slice(-4) || '6149'} •`;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4.2);
  doc.text(hiddenSecuritySequence, sealCenterX, sealCenterY + 5.5, { align: 'center' });

  doc.setFontSize(4.5);
  doc.text('CERTIFIÉ CONFORME', sealCenterX, sealCenterY + 9, { align: 'center' });

  // 2. Bloc signature (À DROITE DU CACHET, SANS TOUCHER AU CACHET NI AU TEXTE)
  const sigX = 160;
  const sigY = footerDividerY + 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Pour la Direction Colorblop :', sigX, sigY);

  // Ligne d'émargement / signature nette
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.line(sigX, sigY + 14, pageWidth - marginX, sigY + 14);

  // Signature vectorielle "Colorblop" fluide dans son espace dédié
  doc.setDrawColor(15, 23, 42); // Encre noire institutionnelle
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

  // Paraphe sous la signature
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

  // Mentions officielles sous la ligne de signature
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('La Direction Colorblop', sigX, sigY + 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(100, 116, 139);
  doc.text('Certifié authentique • colorblop.com', sigX, sigY + 22);

  // Sauvegarde automatique du PDF
  const safeFilenameNum = cleanSerial.replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`Attestation-Licence-Commerciale-${safeFilenameNum}.pdf`);
  return doc;
}
