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
 * Conçue avec un respect strict des marges, un cachet officiel anti-contrefaçon avec numéro dissimulé,
 * et une signature calligraphique à main levée.
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

  // Marges et largeur de contenu strictement bornées
  const marginX = 20; // 20 mm à gauche et à droite
  const contentWidth = pageWidth - marginX * 2; // 170 mm
  const safeTextWidth = contentWidth - 4; // 166 mm

  // 1. Fond parchemin chaud artisanal
  doc.setFillColor(253, 250, 243);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // 2. Bordures classiques doubles avec coins ouvragés de sécurité
  doc.setDrawColor(95, 62, 38); // Marron boisé soutenu
  doc.setLineWidth(1.2);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

  doc.setDrawColor(190, 155, 95); // Liseré doré chaud
  doc.setLineWidth(0.5);
  doc.rect(13, 13, pageWidth - 26, pageHeight - 26);

  // Coins décoratifs ouvragés
  const cornerSize = 5;
  const corners = [
    [15, 15],
    [pageWidth - 15 - cornerSize, 15],
    [15, pageHeight - 15 - cornerSize],
    [pageWidth - 15 - cornerSize, pageHeight - 15 - cornerSize],
  ];
  doc.setDrawColor(190, 155, 95);
  doc.setLineWidth(0.4);
  corners.forEach(([cx, cy]) => {
    doc.rect(cx, cy, cornerSize, cornerSize);
  });

  // 3. En-tête officiel
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(140, 105, 65);
  doc.text('REGISTRE DE PROPRIÉTÉ INTELLECTUELLE & CRÉATION VECTORIELLE', pageWidth / 2, 22, { align: 'center' });

  doc.setFont('times', 'bold');
  doc.setFontSize(26);
  doc.setTextColor(52, 28, 10);
  doc.text('COLORBLOP', pageWidth / 2, 32, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(100, 65, 35);
  doc.text('Studio de création graphique & catalogue vectoriel • www.colorblop.com', pageWidth / 2, 38, { align: 'center' });

  // Séparateur fin doré
  doc.setDrawColor(190, 155, 95);
  doc.setLineWidth(0.6);
  doc.line(26, 42, pageWidth - 26, 42);

  // 4. Titre de l'attestation
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(34, 70, 30); // Vert forêt Colorblop
  doc.text('ATTESTATION OFFICIELLE DE LICENCE COMMERCIALE', pageWidth / 2, 50, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(80, 45, 20);
  const planLabel = interval === 'year' ? 'Formule ColorVIP Pro (Annuelle)' : 'Formule ColorVIP Pro (Mensuelle)';
  doc.text(planLabel + ' • Certificat d’exploitation légale', pageWidth / 2, 56, { align: 'center' });

  // 5. Cadre officiel d'identification de la licence
  const boxY = 62;
  const boxH = 50;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(205, 175, 130);
  doc.setLineWidth(0.7);
  doc.roundedRect(marginX, boxY, contentWidth, boxH, 2.5, 2.5, 'FD');

  // Liseré intérieur dans le cadre
  doc.setDrawColor(235, 220, 195);
  doc.setLineWidth(0.3);
  doc.roundedRect(marginX + 1.5, boxY + 1.5, contentWidth - 3, boxH - 3, 2, 2, 'S');

  const colLabelX = marginX + 6;
  const colValX = marginX + 58;
  let rowY = boxY + 9;

  // Numéro de licence unique (numéro de série sécurisé)
  const cleanSerial = String(licenseNumber || 'CBL-2026-PRO-OFFICIEL').toUpperCase();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(70, 45, 25);
  doc.text('NUMÉRO DE LICENCE :', colLabelX, rowY);

  doc.setFont('courier', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(175, 20, 60); // Rouge rubis officiel
  doc.text(cleanSerial, colValX, rowY);

  // Badge officiel conforme
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(34, 115, 45);
  doc.text('[ NUMÉRO DE SÉRIE HOMOLOGUÉ ]', colValX + 67, rowY);

  // Titulaire (NOM et Prénom)
  rowY += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(70, 45, 25);
  doc.text('TITULAIRE NOMINATIF :', colLabelX, rowY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(25, 20, 15);
  const cleanHolder = String(holderName || 'DUPONT Jean').toUpperCase();
  doc.text(cleanHolder, colValX, rowY);

  if (holderEmail) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 75, 55);
    const holderWidth = doc.getTextWidth(cleanHolder);
    doc.text(`(${holderEmail})`, colValX + holderWidth + 3, rowY);
  }

  // Calcul exact des dates (même jour calendaire)
  const { formattedStart, formattedEnd } = calculateLicenseDates(validFrom, interval, validUntil);

  // Date de début
  rowY += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(70, 45, 25);
  doc.text('DATE DE DÉBUT :', colLabelX, rowY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 25, 20);
  doc.text(formattedStart, colValX, rowY);

  // Date d'expiration (exactement 1 an ou 1 mois plus tard)
  rowY += 8;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(70, 45, 25);
  doc.text('DATE D’EXPIRATION :', colLabelX, rowY);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(34, 70, 30);
  doc.text(`${formattedEnd} (inclus)`, colValX, rowY);

  // Statut
  rowY += 8;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(70, 45, 25);
  doc.text('STATUT DE LA LICENCE :', colLabelX, rowY);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(34, 139, 34);
  doc.text('ACTIF & LÉGALEMENT CONFORME ✓', colValX, rowY);

  // 6. Section 1 : Droits accordés (Strictement borné aux marges avec splitTextToSize)
  let curY = 122;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(34, 70, 30);
  doc.text('1. DROITS COMMERCIAUX ACCORDÉS AU TITULAIRE', marginX, curY);

  curY += 5.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.8);
  doc.setTextColor(45, 35, 25);

  const rights = [
    'Pendant toute la durée de validité mentionnée ci-dessus, le titulaire nominatif désigné bénéficie du droit non-exclusif d’exploiter les ressources graphiques Colorblop selon les dispositions suivantes :',
    '• Téléchargement illimité : Accès libre et permanent à l’intégralité des fichiers vectoriels SVG du catalogue Colorblop.',
    '• Production physique : Autorisation d’intégrer et d’imprimer ces illustrations sur tous supports tangibles (textiles, vêtements, articles de papeterie, stickers, mugs, affiches, broderies, découpes vinyle/laser/Cricut).',
    '• Vente commerciale autorisée : Droit de commercialiser les créations physiques finies auprès de particuliers ou d’entreprises, dans la limite de 5 000 unités par visuel.',
    '• Artisans et créateurs : Couverture complète pour les créateurs indépendants, ateliers et boutiques physiques ou en ligne.',
  ];

  rights.forEach(item => {
    const lines = doc.splitTextToSize(item, safeTextWidth);
    doc.text(lines, marginX + 2, curY);
    curY += lines.length * 4.2 + 1.2;
  });

  // 7. Section 2 : Restrictions strictes (Strictement borné aux marges avec splitTextToSize)
  curY += 3;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(165, 30, 30); // Rouge bordeaux juridique
  doc.text('2. RESTRICTIONS STRICTES ET SÉCURITÉ JURIDIQUE', marginX, curY);

  curY += 5.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.8);
  doc.setTextColor(45, 35, 25);

  const restrictions = [
    'La présente attestation constitue une licence d’exploitation d’usage et n’opère aucun transfert de propriété intellectuelle :',
    '• Interdiction absolue de redistribution numérique : Revente, prêt, don, sous-licence ou partage des fichiers sources (SVG, PNG, PDF vectoriel) strictement prohibés.',
    '• Interdiction des banques d’images : Dépôt interdit sur plateformes tierces de téléchargement (Freepik, Shutterstock, Adobe Stock, Etsy numérique).',
    '• Non-revendication d’auteur : Interdiction de revendiquer la paternité des œuvres graphiques créées par Colorblop.',
    '• Fin de validité : À l’expiration ou résiliation de l’abonnement, toute nouvelle production ou mise en vente cesse immédiatement.',
  ];

  restrictions.forEach(item => {
    const lines = doc.splitTextToSize(item, safeTextWidth);
    doc.text(lines, marginX + 2, curY);
    curY += lines.length * 4.2 + 1.2;
  });

  // 8. Ligne séparatrice basse avant le pied de page
  const footerDividerY = 227;
  doc.setDrawColor(200, 170, 120);
  doc.setLineWidth(0.6);
  doc.line(marginX, footerDividerY, pageWidth - marginX, footerDividerY);

  // 9. Pied de page - COLONNE GAUCHE (Texte légal sur exactement 3 lignes, largeur max 90mm)
  const footerLeftX = marginX;
  let footerLeftY = footerDividerY + 6.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(90, 65, 45);

  const legalLine1 = 'Attestation générée automatiquement par le système officiel Colorblop & Stripe Billing.';
  const legalLine2 = 'Ce document fait foi de licence légale auprès des organismes tiers,';
  const legalLine3 = 'plateformes de vente et autorités de contrôle de propriété intellectuelle.';

  doc.text(legalLine1, footerLeftX, footerLeftY);
  footerLeftY += 4.2;
  doc.text(legalLine2, footerLeftX, footerLeftY);
  footerLeftY += 4.2;
  doc.text(legalLine3, footerLeftX, footerLeftY);

  // Micro-empreinte d'authenticité horodatée sous le texte légal
  footerLeftY += 6;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.2);
  doc.setTextColor(130, 100, 75);
  doc.text('Authenticité vérifiable sur colorblop.com/license-check', footerLeftX, footerLeftY);
  doc.setFont('courier', 'normal');
  doc.setFontSize(6.8);
  const rawNum = cleanSerial.replace(/[^A-Z0-9]/gi, '');
  doc.text(`EMPREINTE SÉCURISÉE : CB-SEC-${rawNum.slice(-8) || '92487103'}-OK`, footerLeftX, footerLeftY + 3.8);

  // 10. Pied de page - COLONNE DROITE (Cachet officiel + Suite de chiffres dissimulée + Signature à main levée)
  const sealCenterX = pageWidth - 48; // 162 mm
  const sealCenterY = footerDividerY + 18; // 245 mm
  const sealRadius = 14;

  // A. CACHET OFFICIEL (Double cercle avec étoiles et guilloché)
  doc.setDrawColor(160, 35, 35); // Encre vermillon patinée
  doc.setLineWidth(0.8);
  doc.circle(sealCenterX, sealCenterY, sealRadius, 'S');

  doc.setDrawColor(180, 50, 50);
  doc.setLineWidth(0.35);
  doc.setLineDashPattern([0.8, 0.8], 0);
  doc.circle(sealCenterX, sealCenterY, sealRadius - 1.2, 'S');
  doc.setLineDashPattern([], 0);

  doc.setDrawColor(160, 35, 35);
  doc.setLineWidth(0.5);
  doc.circle(sealCenterX, sealCenterY, sealRadius - 2.5, 'S');

  // Textes circulaires et centraux dans le cachet
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.2);
  doc.setTextColor(150, 30, 30);
  doc.text('★ COLORBLOP OFFICIAL SEAL ★', sealCenterX, sealCenterY - 7.5, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('HOMOLOGATION', sealCenterX, sealCenterY - 3.8, { align: 'center' });
  doc.setFontSize(7.8);
  doc.text('LICENCE PRO', sealCenterX, sealCenterY + 0.2, { align: 'center' });

  // Ligne de micro-sécurité médiane
  doc.setDrawColor(160, 35, 35);
  doc.setLineWidth(0.25);
  doc.line(sealCenterX - 9, sealCenterY + 2.6, sealCenterX + 9, sealCenterY + 2.6);

  // SUITE DE CHIFFRES DISSIMULÉE (Anti-contrefaçon, micro-sécurité difficile à reproduire)
  const hiddenSecuritySequence = `•${rawNum.slice(3, 7) || '8492'}•93710528•${rawNum.slice(-4) || '6149'}•`;
  doc.setFont('courier', 'bold');
  doc.setFontSize(4);
  doc.setTextColor(165, 45, 45);
  doc.text(hiddenSecuritySequence, sealCenterX, sealCenterY + 4.8, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5);
  doc.setTextColor(150, 30, 30);
  doc.text('• CERTIFIÉ CONFORME •', sealCenterX, sealCenterY + 8.8, { align: 'center' });

  // B. SIGNATURE À MAIN LEVÉE "Colorblop" (Tracée par-dessus le cachet à l'encre bleu nuit de plume)
  doc.setDrawColor(20, 38, 75); // Bleu nuit d'encre de plume calligraphique
  doc.setLineWidth(0.55);

  const sigStartX = sealCenterX - 16;
  const sigStartY = sealCenterY + 2.5;

  // Courbe calligraphique du "C" majuscule avec boucle d'attaque
  doc.lines(
    [
      [2, -6, 4, -8, 7, -6],      // Boucle supérieure du C
      [2, 2, 2, 6, -1, 9],        // Corps plongeant du C
      [-3, 2, -5, 1, -4, -1],     // Finition courbe basse du C
      [2, -2, 5, -2, 7, 0],       // Transition vers olorblop
    ],
    sigStartX,
    sigStartY,
    [1, 1],
    'S'
  );

  // "olor"
  doc.lines(
    [
      [1.5, -2, 3, -2, 4, 0],     // o
      [1, -4, 2, -6, 2.5, 0],     // l
      [1.5, -2, 3, -2, 4, 0],     // o
      [1.5, -1.5, 2.5, 0, 3, 1],  // r
    ],
    sigStartX + 6,
    sigStartY - 0.5,
    [1, 1],
    'S'
  );

  // "blop"
  doc.lines(
    [
      [1, -5, 2, -7, 3, -1],      // b montant
      [1.5, 0, 2.5, -1, 3, 1],    // ventre b
      [1, -5, 2, -7, 2.5, 0],     // l
      [1.5, -2, 3, -2, 4, 0],     // o
      [1, 1, 2, 6, 2, 9],         // jambage plongeant du p
      [0.5, -4, 2, -5, 3, -2],    // boucle du p
    ],
    sigStartX + 18,
    sigStartY,
    [1, 1],
    'S'
  );

  // Paraphe artisanal manuscrit souligné dynamique sous la signature
  doc.setLineWidth(0.65);
  doc.lines(
    [
      [-8, 3, -18, 4, -28, 2],    // Soulignement fluide revenant vers la gauche
      [-4, -1, -2, -2, 0, -3],    // Boucle finale d'accent
    ],
    sigStartX + 32,
    sigStartY + 6,
    [1, 1],
    'S'
  );

  // C. MENTIONS OFFICIELLES SOUS LE CACHET & LA SIGNATURE
  const sigTextY = sealCenterY + 18.5; // ~263.5 mm
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(52, 28, 10);
  doc.text('La Direction Colorblop', sealCenterX, sigTextY, { align: 'center' });

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(115, 80, 50);
  doc.text('Certifié authentique • colorblop.com', sealCenterX, sigTextY + 4.5, { align: 'center' });

  // Sauvegarde automatique du PDF avec nom propre
  const safeFilenameNum = cleanSerial.replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`Attestation-Licence-Commerciale-${safeFilenameNum}.pdf`);
  return doc;
}
