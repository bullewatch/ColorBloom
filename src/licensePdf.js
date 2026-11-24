import { jsPDF, GState } from 'jspdf';

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
 * Formate une date de naissance au format lisible "JJ mois AAAA" ou "JJ/MM/AAAA".
 */
function formatBirthDate(rawDate) {
  if (!rawDate) return null;
  try {
    const cleanStr = String(rawDate).trim();
    if (cleanStr.includes('-')) {
      const [year, month, day] = cleanStr.split('-');
      if (year && month && day) {
        const d = new Date(Number(year), Number(month) - 1, Number(day));
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          });
        }
        return `${day}/${month}/${year}`;
      }
    }
    return cleanStr;
  } catch {
    return String(rawDate);
  }
}

/**
 * Génère et télécharge le certificat officiel d'homologation de licence commerciale ColorVIP Pro au format PDF.
 * Présentation hautement professionnelle, sobre, officielle et neutre (format A4 portrait)
 * avec encadrement de sécurité épuré, cartouche d'identification nominative à colonnes protégées,
 * sceau circulaire officiel parfaitement calibré et signature de la direction.
 */
export function generateCommercialLicensePdf({
  licenseNumber,
  holderName,
  firstName,
  lastName,
  birthDate,
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
  const marginX = 16; // 16 mm de marge latérale
  const contentWidth = pageWidth - marginX * 2; // 178 mm

  // 1. Fond blanc immaculé
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // 2. Encadrement officiel sobre et neutre (Double filet d'attestation)
  doc.setDrawColor(30, 41, 59); // Slate 800
  doc.setLineWidth(0.5);
  doc.rect(9, 9, pageWidth - 18, pageHeight - 18, 'S');

  doc.setDrawColor(203, 213, 225); // Slate 300
  doc.setLineWidth(0.2);
  doc.rect(10.5, 10.5, pageWidth - 21, pageHeight - 21, 'S');

  // 3. En-tête administratif sobre et officiel
  // Côté gauche : Marque & Registre
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.text('COLORBLOP', marginX, 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105); // Slate 600
  doc.text('Édition d’Art & Illustrations Vectorielles  •  www.colorblop.com', marginX, 27);

  // Côté droit : Référence et nature de l'acte
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 58, 138); // Bleu nuit institutionnel (#1E3A8A)
  doc.text('LICENCE COMMERCIALE D’EXPLOITATION', pageWidth - marginX, 20, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Attestation officielle de droits d’exploitation physique', pageWidth - marginX, 24.5, { align: 'right' });
  doc.text('Réf. légale : Code de la Propriété Intellectuelle Art. L122-6 & L122-7', pageWidth - marginX, 28.5, { align: 'right' });

  // Lignes de séparation épurées
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.5);
  doc.line(marginX, 32, pageWidth - marginX, 32);

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.line(marginX, 33.2, pageWidth - marginX, 33.2);

  // 4. Titre officiel du certificat
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text('CERTIFICAT DE LICENCE COMMERCIALE', marginX, 41);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  const planLabel = interval === 'year' ? 'Formule ColorVIP Pro (Licence Annuelle)' : 'Formule ColorVIP Pro (Licence Mensuelle)';
  doc.text(`${planLabel}  •  Attestation nominative pour créations physiques et artisanales`, marginX, 46);

  // 5. Calcul des dates et résolution des informations
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

  // Résolution de la date de naissance
  const cleanBirth = formatBirthDate(birthDate);

  // Résolution de la boutique / enseigne
  let cleanShop = '';
  if (shopName && shopName.trim()) {
    cleanShop = shopName.trim();
  } else {
    cleanShop = 'Artisan / Créateur Indépendant (Vente directe & Ateliers)';
  }

  const cleanEmail = holderEmail ? String(holderEmail).trim() : 'Email client enregistré';

  // === TABLEAU D'IDENTIFICATION OFFICIEL & CADRE DE SÉCURITÉ ANTI-FALSIFICATION ===
  const tableY = 51;
  const tableHeight = 60;
  const col1X = marginX + 3.5;
  const colValX = marginX + 50;
  const rightX = pageWidth - marginX - 3.5;

  // 1. Fond teinté du cartouche sécurisé
  doc.setFillColor(248, 250, 252); // Slate 50
  doc.rect(marginX, tableY, contentWidth, tableHeight, 'F');

  // 2. Zone délimitée pour les motifs de sécurité (clipping strict)
  doc.saveGraphicsState();
  doc.rect(marginX, tableY, contentWidth, tableHeight);
  doc.clip();

  // 2.A. Trame de sécurité guilloche (micro-lignes géométriques obliques)
  doc.setGState(new GState({ opacity: 0.12 }));
  doc.setDrawColor(148, 163, 184); // Slate 400
  doc.setLineWidth(0.12);
  for (let x = marginX - tableHeight; x <= marginX + contentWidth + tableHeight; x += 4) {
    doc.line(x, tableY, x + tableHeight, tableY + tableHeight);
  }

  // 2.B. Filigrane de sécurité "Ghost Code" imprimé en transparence derrière le nom et les données
  doc.setGState(new GState({ opacity: 0.10 }));
  doc.setFont('courier', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(30, 58, 138); // Bleu nuit institutionnel

  // Répétitions transparentes du numéro de licence sous les lignes sensibles
  doc.text(`${cleanSerial}   •   COLORBLOP SÉCURISÉ   •   ${cleanSerial}`, marginX + 4, tableY + 16);
  doc.text(`${cleanSerial}   •   CERTIFIÉ INVIOLABLE   •   ${cleanSerial}`, marginX - 10, tableY + 34);
  doc.text(`${cleanSerial}   •   TITULAIRE HOMOLOGUÉ   •   ${cleanSerial}`, marginX + 8, tableY + 51);

  doc.restoreGraphicsState();

  // 3. Bordure externe du cartouche sécurisé
  doc.setDrawColor(203, 213, 225); // Slate 300
  doc.setLineWidth(0.35);
  doc.rect(marginX, tableY, contentWidth, tableHeight, 'S');

  // LIGNE 1 : N° DE LICENCE UNIQUE & STATUT
  let rowY = tableY + 6.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('NUMÉRO DE LICENCE :', col1X, rowY);

  doc.setFont('courier', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(cleanSerial, colValX, rowY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(22, 101, 52); // Vert officiel
  doc.text('STATUT : VALIDE & ACTIF', rightX, rowY, { align: 'right' });

  // Séparateur 1/2
  rowY += 3;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.line(marginX + 2, rowY, pageWidth - marginX - 2, rowY);

  // LIGNE 2 : TITULAIRE OFFICIEL
  rowY += 6.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('TITULAIRE OFFICIEL :', col1X, rowY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(cleanHolder, colValX, rowY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`(${cleanEmail})`, rightX, rowY, { align: 'right' });

  // Séparateur 2/3
  rowY += 3;
  doc.line(marginX + 2, rowY, pageWidth - marginX - 2, rowY);

  // LIGNE 3 : DATE DE NAISSANCE DU TITULAIRE
  rowY += 6.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('DATE DE NAISSANCE :', col1X, rowY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(cleanBirth ? cleanBirth : 'Non renseignée', colValX, rowY);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('Identification officielle du bénéficiaire légal', rightX, rowY, { align: 'right' });

  // Séparateur 3/4
  rowY += 3;
  doc.line(marginX + 2, rowY, pageWidth - marginX - 2, rowY);

  // LIGNE 4 : BOUTIQUE / ENSEIGNE / MARQUE
  rowY += 6.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('BOUTIQUE / ENSEIGNE :', col1X, rowY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 58, 138); // Bleu institutionnel
  doc.text(cleanShop, colValX, rowY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Exploitation commerciale & artisanale', rightX, rowY, { align: 'right' });

  // Séparateur 4/5
  rowY += 3;
  doc.line(marginX + 2, rowY, pageWidth - marginX - 2, rowY);

  // LIGNE 5 : PÉRIODE DE VALIDITÉ
  rowY += 6.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('PÉRIODE DE VALIDITÉ :', col1X, rowY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`Du ${formattedStart} au ${formattedEnd} (inclus)`, colValX, rowY);

  // Séparateur 5/6
  rowY += 3;
  doc.line(marginX + 2, rowY, pageWidth - marginX - 2, rowY);

  // LIGNE 6 : PLAFOND & CONFECTION PHYSIQUE
  rowY += 6.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('VOLUME AUTORISÉ :', col1X, rowY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(21, 128, 61); // Vert
  doc.text('Jusqu’à 5 000 pièces physiques finies par visuel', colValX, rowY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Tous supports matériels tangibles', rightX, rowY, { align: 'right' });

  // Fil de micro-impression de sécurité anti-falsification (au bas du cartouche)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(3.8);
  doc.setTextColor(148, 163, 184); // Slate 400
  doc.text(
    `FIL DE SÉCURITÉ ANTI-FRAUDE  •  TITULAIRE CERTIFIÉ : ${cleanHolder}  •  N° DE LICENCE : ${cleanSerial}  •  HOMOLOGATION COLORBLOP OFFICIELLE  •  VÉRIFICATION : HTTPS://COLORBLOP.COM`,
    col1X,
    tableY + tableHeight - 1.6
  );

  // === SECTION 1 : ÉTENDUE DES DROITS COMMERCIAUX ===
  let curY = tableY + tableHeight + 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('1. ÉTENDUE DES DROITS COMMERCIAUX ACCORDÉS AU TITULAIRE', marginX, curY);

  curY += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.6);
  doc.setTextColor(51, 65, 85);

  const rights = [
    'Pendant toute la période de validité certifiée ci-dessus, le titulaire nominatif et son enseigne bénéficient du droit légal et non-exclusif d’exploiter commercialement les illustrations vectorielles de la plateforme Colorblop selon les clauses suivantes :',
    '- Accès vectoriel intégral : Téléchargement illimité des fichiers sources vectoriels SVG haute fidélité du catalogue Colorblop.',
    '- Confection physique artisanale et industrielle : Droit d’intégrer et d’apposer les visuels sur tous supports matériels tangibles (textiles, t-shirts, sacs, broderies, papeterie, stickers, mugs, objets en bois/acrylique, découpe vinyle Cricut/Silhouette/laser).',
    '- Vente commerciale autorisée : Droit de commercialiser les créations matérielles finies directement aux consommateurs ou aux entreprises, en boutiques physiques, marchés artisanaux ou boutiques en ligne (Etsy, Shopify, site web personnel), jusqu’à 5 000 unités par visuel.',
    '- Garantie juridique d’exploitation : Ce certificat confère au titulaire une garantie légale d’exploitation contre toute réclamation de contrefaçon pour ses produits physiques finis.',
  ];

  rights.forEach(item => {
    const lines = doc.splitTextToSize(item, contentWidth);
    doc.text(lines, marginX, curY);
    curY += lines.length * 3.3 + 0.8;
  });

  // === SECTION 2 : RESTRICTIONS STRICTES & PROPRIÉTÉ INTELLECTUELLE ===
  curY += 1.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(153, 27, 27); // Rouge sobre
  doc.text('2. RESTRICTIONS STRICTES & PROTECTION DE LA PROPRIÉTÉ INTELLECTUELLE', marginX, curY);

  curY += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.6);
  doc.setTextColor(51, 65, 85);

  const restrictions = [
    'Le présent document constitue une licence d’exploitation commerciale sur support physique et n’opère aucun transfert de droit d’auteur ni de propriété intellectuelle originale :',
    '- Interdiction absolue de revente numérique : Il est formellement interdit de revendre, céder, prêter, sous-licencier, donner ou redistribuer les fichiers numériques (formats SVG, EPS, PNG, PDF vectoriel ou tout format dérivé).',
    '- Interdiction des banques d’images & fichiers digitaux : Interdiction stricte de proposer les fichiers en téléchargement numérique direct sur des plateformes tierces (ex : vente de fichiers SVG ou digitaux sur Etsy, Creative Fabrica, Freepik, Shutterstock).',
    '- Respect de la paternité artistique : Interdiction de s’attribuer la création originale des illustrations vectorielles conçues par Colorblop.',
    '- Fin de validité : À l’expiration ou en cas de résiliation de l’abonnement, toute nouvelle confection physique doit cesser immédiatement.',
  ];

  restrictions.forEach(item => {
    const lines = doc.splitTextToSize(item, contentWidth);
    doc.text(lines, marginX, curY);
    curY += lines.length * 3.3 + 0.8;
  });

  // === PIED DE PAGE OFFICIEL (SCEAU, MENTIONS ET SIGNATURE) ===
  const footerDividerY = 227;
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.line(marginX, footerDividerY, pageWidth - marginX, footerDividerY);

  // COLONNE GAUCHE : Mentions légales et empreinte cryptographique
  const footerLeftX = marginX;
  let footerLeftY = footerDividerY + 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(71, 85, 105);

  doc.text('Document officiel délivré par le registre central Colorblop.', footerLeftX, footerLeftY);
  footerLeftY += 3.8;
  doc.text('Fait foi auprès des plateformes de vente (Etsy, salons, etc.)', footerLeftX, footerLeftY);
  footerLeftY += 3.8;
  doc.text('et des autorités de contrôle de la propriété intellectuelle.', footerLeftX, footerLeftY);

  footerLeftY += 4.5;
  doc.setFont('courier', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(100, 116, 139);
  const rawNum = cleanSerial.replace(/[^A-Z0-9]/gi, '');
  doc.text(`EMPREINTE DE CONTRÔLE SHA-256 : CBL-AUTH-${rawNum.slice(-8) || '92487103'}-SEC`, footerLeftX, footerLeftY);
  doc.setFont('helvetica', 'normal');
  doc.text('Vérification d’authenticité en ligne sur https://colorblop.com', footerLeftX, footerLeftY + 3.4);

  // COLONNE CENTRALE : Sceau officiel circulaire calibré (aucune écriture ne déborde)
  const sealCenterX = 118;
  const sealCenterY = footerDividerY + 16;
  const sealRadius = 12.5;

  doc.setDrawColor(30, 58, 138); // Bleu nuit institutionnel
  doc.setLineWidth(0.6);
  doc.circle(sealCenterX, sealCenterY, sealRadius, 'S');

  doc.setLineWidth(0.2);
  doc.circle(sealCenterX, sealCenterY, sealRadius - 1.2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.2);
  doc.setTextColor(30, 58, 138);
  doc.text('COLORBLOP', sealCenterX, sealCenterY - 5.5, { align: 'center' });

  doc.setFontSize(5.5);
  doc.text('LICENCE PRO', sealCenterX, sealCenterY - 2.2, { align: 'center' });

  // Filet de sécurité interne au tampon
  doc.setLineWidth(0.2);
  doc.line(sealCenterX - 5, sealCenterY - 0.5, sealCenterX + 5, sealCenterY - 0.5);

  doc.setFontSize(4.8);
  doc.text('HOMOLOGUÉE', sealCenterX, sealCenterY + 2.8, { align: 'center' });

  doc.setFontSize(4);
  doc.text(`N° ${rawNum.slice(-4) || '9901'}`, sealCenterX, sealCenterY + 5.5, { align: 'center' });

  doc.setFontSize(3.8);
  doc.text('CERTIFIÉ CONFORME', sealCenterX, sealCenterY + 8.2, { align: 'center' });

  // COLONNE DROITE : Bloc signature Direction Colorblop
  const sigX = 148;
  const sigY = footerDividerY + 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Pour la Direction Colorblop :', sigX, sigY);

  // Tracé fluide manuscrit de signature pour Florian
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.45);

  const sX = sigX + 4;
  const sY = sigY + 9;

  // Lettrage manuscrit fluide "Florian"
  doc.lines(
    [
      [1.2, -3.5, 2.5, -4.5, 4.2, -3.8],
      [1.2, 1.2, 1.2, 3.2, -0.6, 5],
      [-1.8, 1.2, -3, 0.6, -2.2, -0.6],
      [1.2, -1.2, 3, -1.2, 4.5, 0],
    ],
    sX,
    sY,
    [1, 1],
    'S'
  );

  doc.lines(
    [
      [0.8, -1.2, 1.8, -1.2, 2.5, 0],
      [0.6, -2.5, 1.2, -3.8, 1.8, 0],
      [0.8, -1.2, 1.8, -1.2, 2.5, 0],
      [0.8, -0.8, 1.5, 0, 1.8, 0.6],
    ],
    sX + 4,
    sY - 0.3,
    [1, 1],
    'S'
  );

  doc.lines(
    [
      [0.6, -3, 1.2, -4, 1.8, -0.6],
      [0.8, 0, 1.5, -0.6, 1.8, 0.6],
      [0.6, -3, 1.2, -4, 1.6, 0],
      [0.8, -1.2, 1.6, -1.2, 2.4, 0],
      [0.6, 0.6, 1.2, 3.8, 1.2, 5.2],
    ],
    sX + 11,
    sY,
    [1, 1],
    'S'
  );

  // Paraphe
  doc.setLineWidth(0.4);
  doc.lines(
    [
      [-5, 1.6, -12, 2.2, -18, 1.2],
    ],
    sX + 20,
    sY + 3,
    [1, 1],
    'S'
  );

  // Ligne de signature
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.25);
  doc.line(sigX, sigY + 14, pageWidth - marginX, sigY + 14);

  // Titres officiels
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(15, 23, 42);
  doc.text('Florian Marenghi', sigX, sigY + 17.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Fondateur & Illustrateur de Colorblop', sigX, sigY + 21);

  // Sauvegarde automatique du PDF
  const safeFilenameNum = cleanSerial.replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`Certificat-Licence-Commerciale-${safeFilenameNum}.pdf`);
  return doc;
}
