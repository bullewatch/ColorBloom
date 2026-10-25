import { jsPDF } from 'jspdf';

/**
 * Génère et télécharge l'attestation officielle de licence commerciale ColorVIP Pro au format PDF.
 */
export function generateCommercialLicensePdf({
  licenseNumber,
  holderName,
  holderEmail,
  interval,
  validFrom,
  validUntil,
}) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // 1. Fond parchemin chaud
  doc.setFillColor(252, 248, 238);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // 2. Bordure double artisanale
  doc.setDrawColor(104, 71, 47); // Marron boisé
  doc.setLineWidth(1.5);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

  doc.setDrawColor(184, 150, 100); // Doré chaud
  doc.setLineWidth(0.6);
  doc.rect(13, 13, pageWidth - 26, pageHeight - 26);

  // 3. En-tête Colorblop
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(59, 32, 11);
  doc.text('COLORBLOP', pageWidth / 2, 28, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(106, 68, 37);
  doc.text('Univers de coloriages et dessins vectoriels • colorblop.com', pageWidth / 2, 34, { align: 'center' });

  // Ligne séparatrice fleurie
  doc.setDrawColor(184, 150, 100);
  doc.setLineWidth(0.8);
  doc.line(30, 39, pageWidth - 30, 39);

  // 4. Titre du certificat
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(41, 76, 35); // Vert forêt Colorblop
  doc.text('ATTESTATION OFFICIELLE DE LICENCE COMMERCIALE', pageWidth / 2, 49, { align: 'center' });

  doc.setFontSize(13);
  doc.setTextColor(90, 46, 18);
  doc.text('Formule souscrite : ColorVIP Pro (' + (interval === 'year' ? 'Annuelle' : 'Mensuelle') + ')', pageWidth / 2, 56, { align: 'center' });

  // 5. Encadré d'identification de la licence
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(216, 186, 142);
  doc.roundedRect(20, 63, pageWidth - 40, 46, 3, 3, 'FD');

  doc.setFontSize(10.5);
  doc.setTextColor(50, 30, 15);

  const leftCol = 26;
  const valCol = 76;
  let y = 72;

  doc.setFont('helvetica', 'bold');
  doc.text('N° DE LICENCE UNIQUE :', leftCol, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(194, 24, 91); // Accent rose framboise
  doc.text(String(licenseNumber || 'CBL-PRO-PENDING'), valCol, y);

  y += 7.5;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(50, 30, 15);
  doc.text('TITULAIRE NOMINATIF :', leftCol, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`${holderName || 'Membre Pro'} (${holderEmail || 'Email associé au compte'})`, valCol, y);

  y += 7.5;
  doc.setFont('helvetica', 'bold');
  doc.text('DATE DE DÉBUT :', leftCol, y);
  doc.setFont('helvetica', 'normal');
  const formattedStart = validFrom ? new Date(validFrom).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Date de souscription';
  doc.text(formattedStart, valCol, y);

  y += 7.5;
  doc.setFont('helvetica', 'bold');
  doc.text('DATE D’EXPIRATION :', leftCol, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(41, 76, 35);
  const formattedEnd = validUntil ? new Date(validUntil).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Période en cours';
  doc.text(formattedEnd + ' (inclus)', valCol, y);

  y += 7.5;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(50, 30, 15);
  doc.text('STATUT DE LA LICENCE :', leftCol, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(34, 139, 34);
  doc.text('ACTIF & CONFORME', valCol, y);

  // 6. Section Droits accordés
  y = 120;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(41, 76, 35);
  doc.text('1. DROITS COMMERCIAUX ACCORDÉS', 20, y);

  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(50, 40, 30);
  const rightsText = [
    'Pendant toute la durée de validité mentionnée ci-dessus, le titulaire est légalement autorisé à :',
    '• Télécharger en quantité illimitée l’ensemble des fichiers vectoriels SVG du catalogue Colorblop.',
    '• Utiliser les illustrations pour fabriquer, imprimer et commercialiser des produits physiques tangibles (vêtements, textiles, mugs, articles de papeterie, stickers, affiches, broderies, découpes vinyle/laser/Cricut).',
    '• Vendre ses créations physiques auprès de particuliers ou d’entreprises, dans la limite de 5 000 unités par modèle.',
    '• Intégrer les illustrations dans des projets finis d’artisanat ou de petite entreprise.',
  ];
  rightsText.forEach(line => {
    doc.text(line, 22, y);
    y += 5.2;
  });

  // 7. Section Restrictions strictes
  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(178, 34, 34); // Rouge bordeaux
  doc.text('2. RESTRICTIONS ET INTERDICTIONS STRICTES', 20, y);

  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(50, 40, 30);
  const restrictionsText = [
    'La présente licence commerciale concède un droit d’exploitation d’usage et n’opère aucun transfert de propriété intellectuelle :',
    '• INTERDICTION STRICTE DE REDISTRIBUTION NUMÉRIQUE : Vous ne pouvez en aucun cas revendre, prêter, donner, sous-licencier ou partager les fichiers informatiques sources (SVG, EPS, PNG, PDF vectoriel).',
    '• INTERDICTION DE REVENTE SUR BANQUES D’IMAGES : Il est rigoureusement interdit de déposer ces visuels sur des plateformes de stock (Shutterstock, Freepik, Adobe Stock, Etsy numérique, etc.).',
    '• REVENDICATION D’AUTEUR : Il est interdit de revendiquer la paternité des créations graphiques de Colorblop.',
    '• CADUCITÉ À L’EXPIRATION : En cas de non-renouvellement ou de résiliation de l’abonnement ColorVIP Pro, toute nouvelle fabrication ou commercialisation cesse immédiatement à la date d’expiration, y compris pour les SVG téléchargés antérieurement.',
  ];
  restrictionsText.forEach(line => {
    const wrapped = doc.splitTextToSize(line, pageWidth - 44);
    doc.text(wrapped, 22, y);
    y += wrapped.length * 4.6;
  });

  // 8. Signature et authenticité
  y = pageHeight - 38;
  doc.setDrawColor(184, 150, 100);
  doc.setLineWidth(0.5);
  doc.line(20, y, pageWidth - 20, y);

  y += 6;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8.5);
  doc.setTextColor(110, 80, 50);
  doc.text('Attestation générée automatiquement par le système officiel Colorblop & Stripe Billing.', 22, y);
  doc.text('Ce document fait foi de licence légale auprès des organismes tiers et plateformes de vente.', 22, y + 4.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(59, 32, 11);
  doc.text('La Direction Colorblop', pageWidth - 25, y + 2, { align: 'right' });
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8.5);
  doc.text('Certifié authentique • colorblop.com', pageWidth - 25, y + 6.5, { align: 'right' });

  // Sauvegarde
  const safeNum = (licenseNumber || 'LICENCE').replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`Attestation-Licence-Commerciale-${safeNum}.pdf`);
}
