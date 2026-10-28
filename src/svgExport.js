/**
 * svgExport.js
 * Système de traitement et d'export SVG → PNG haute précision pour Colorblop.
 *
 * Spécifications respectées :
 * - Détection et extraction automatique des dimensions et du viewBox du SVG (px, pt, mm, cm, in).
 * - Respect systématique du ratio largeur/hauteur (redimensionnement proportionnel 'contain').
 * - Aucun dessin n'est étiré, écrasé, déformé ou rogné.
 * - Détection et suppression des marges vides excessives sans couper les traits (bounding box avec marge de sécurité).
 * - Centrage parfait du dessin dans le canvas final.
 * - Conservation des résolutions et formats actuels (canvas standard 2400x3200).
 * - Ajout de marges blanches propres autour du dessin.
 * - Contours noirs nets et rendu vectoriel haute résolution.
 * - Fonctionne de manière 100% automatique pour tous les dessins existants et futurs.
 */

/**
 * Convertit une chaîne de dimension CSS/SVG en pixels numériques.
 */
export function parseDimensionToPx(value) {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  if (!str) return null;

  const num = parseFloat(str);
  if (isNaN(num) || num <= 0) return null;

  const lower = str.toLowerCase();
  if (lower.endsWith('pt')) return num * (4 / 3); // 1pt = 1.333333px
  if (lower.endsWith('mm')) return num * 3.7795276;
  if (lower.endsWith('cm')) return num * 37.795276;
  if (lower.endsWith('in')) return num * 96;
  if (lower.endsWith('pc')) return num * 16;
  if (lower.endsWith('px')) return num;

  // Unité brute / pixels
  return num;
}

/**
 * Analyse une chaîne SVG pour en extraire le viewBox, les dimensions et le ratio.
 */
export function parseSvgMetadata(svgText) {
  if (!svgText || typeof svgText !== 'string') {
    return null;
  }

  let viewBoxAttr = null;
  let widthAttr = null;
  let heightAttr = null;

  // 1. Tentative avec DOMParser si disponible dans l'environnement
  if (typeof DOMParser !== 'undefined') {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgText, 'image/svg+xml');
      const parserError = doc.querySelector('parsererror');
      if (!parserError) {
        const svgEl = doc.querySelector('svg');
        if (svgEl) {
          viewBoxAttr = svgEl.getAttribute('viewBox');
          widthAttr = svgEl.getAttribute('width');
          heightAttr = svgEl.getAttribute('height');
        }
      }
    } catch (e) {
      // Ignorer et passer aux regex de secours
    }
  }

  // 2. Regex de secours (Node.js ou SVG avec entités XML complexes)
  if (!viewBoxAttr) {
    const vbMatch = svgText.match(/viewBox=[\x22\x27]([^\x22\x27]+)[\x22\x27]/i);
    if (vbMatch) viewBoxAttr = vbMatch[1];
  }
  if (!widthAttr) {
    const wMatch = svgText.match(/<svg[^>]*\bwidth=[\x22\x27]([^\x22\x27]+)[\x22\x27]/i);
    if (wMatch) widthAttr = wMatch[1];
  }
  if (!heightAttr) {
    const hMatch = svgText.match(/<svg[^>]*\bheight=[\x22\x27]([^\x22\x27]+)[\x22\x27]/i);
    if (hMatch) heightAttr = hMatch[1];
  }

  const parsedWidth = parseDimensionToPx(widthAttr);
  const parsedHeight = parseDimensionToPx(heightAttr);

  let minX = 0;
  let minY = 0;
  let vbWidth = null;
  let vbHeight = null;

  if (viewBoxAttr) {
    const parts = viewBoxAttr.trim().split(/[\s,]+/).map(Number);
    if (parts.length === 4 && parts.every(n => !isNaN(n)) && parts[2] > 0 && parts[3] > 0) {
      minX = parts[0];
      minY = parts[1];
      vbWidth = parts[2];
      vbHeight = parts[3];
    }
  }

  // Si aucun viewBox valide n'a été trouvé, déduire à partir de width/height
  if (!vbWidth || !vbHeight) {
    if (parsedWidth && parsedHeight) {
      minX = 0;
      minY = 0;
      vbWidth = parsedWidth;
      vbHeight = parsedHeight;
    } else {
      // Fallback sécurisé standard
      minX = 0;
      minY = 0;
      vbWidth = 1200;
      vbHeight = 1200;
    }
  }

  const intrinsicWidth = parsedWidth || vbWidth;
  const intrinsicHeight = parsedHeight || vbHeight;
  const aspectRatio = vbWidth / vbHeight;

  return {
    viewBox: `${minX} ${minY} ${vbWidth} ${vbHeight}`,
    minX,
    minY,
    vbWidth,
    vbHeight,
    intrinsicWidth,
    intrinsicHeight,
    aspectRatio,
  };
}

/**
 * Prépare une chaîne SVG pour un rendu vectoriel haute résolution sans flou.
 * Force width et height explicites en pixels de grande taille pour éviter le défaut 300x150 des navigateurs.
 */
export function prepareHighResSvgString(svgText, targetMaxDim = 3200) {
  const meta = parseSvgMetadata(svgText);
  if (!meta) return svgText;

  let renderW = targetMaxDim;
  let renderH = targetMaxDim;

  if (meta.aspectRatio >= 1) {
    renderW = targetMaxDim;
    renderH = Math.max(100, Math.round(targetMaxDim / meta.aspectRatio));
  } else {
    renderH = targetMaxDim;
    renderW = Math.max(100, Math.round(targetMaxDim * meta.aspectRatio));
  }

  // Remplacement ou injection des attributs dans la balise racine <svg>
  return svgText.replace(/<svg\b([^>]*)>/i, (match, attrs) => {
    let cleanAttrs = attrs
      .replace(/\bwidth=[\x22\x27][^\x22\x27]*[\x22\x27]/gi, '')
      .replace(/\bheight=[\x22\x27][^\x22\x27]*[\x22\x27]/gi, '')
      .replace(/\bviewBox=[\x22\x27][^\x22\x27]*[\x22\x27]/gi, '')
      .replace(/\bpreserveAspectRatio=[\x22\x27][^\x22\x27]*[\x22\x27]/gi, '')
      .trim();

    return `<svg ${cleanAttrs} width="${renderW}" height="${renderH}" viewBox="${meta.viewBox}" preserveAspectRatio="xMidYMid meet">`;
  });
}

/**
 * Détecte les limites réelles du dessin (bounding box des traits)
 * pour supprimer les marges vides excessives sans couper les traits.
 */
export function detectDrawingBounds(pixelData, width, height, options = {}) {
  const alphaThreshold = options.alphaThreshold ?? 25;
  const whiteThreshold = options.whiteThreshold ?? 242; // En deçà de 242, c'est considéré comme un trait/ombrage

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  let strokePixelCount = 0;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * width * 4;
    for (let x = 0; x < width; x++) {
      const idx = rowOffset + (x * 4);
      const a = pixelData[idx + 3];

      if (a > alphaThreshold) {
        const r = pixelData[idx];
        const g = pixelData[idx + 1];
        const b = pixelData[idx + 2];

        // Le pixel fait partie du dessin s'il n'est pas blanc
        if (r < whiteThreshold || g < whiteThreshold || b < whiteThreshold) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
          strokePixelCount++;
        }
      }
    }
  }

  // Si aucun trait détecté (dessin vide ou totalement blanc), renvoyer toute l'image
  if (strokePixelCount === 0 || minX > maxX || minY > maxY) {
    return {
      minX: 0,
      minY: 0,
      maxX: width - 1,
      maxY: height - 1,
      contentWidth: width,
      contentHeight: height,
      cropX: 0,
      cropY: 0,
      cropW: width,
      cropH: height,
      isEmpty: true,
    };
  }

  const rawW = maxX - minX + 1;
  const rawH = maxY - minY + 1;

  // Marge de sécurité (safety padding) pour s'assurer qu'aucun trait fin ou anti-aliasé n'est coupé
  const padSafetyRatio = options.safetyPaddingRatio ?? 0.025; // 2.5% de marge de sécurité
  const padX = Math.max(4, Math.round(rawW * padSafetyRatio));
  const padY = Math.max(4, Math.round(rawH * padSafetyRatio));

  const cropX = Math.max(0, minX - padX);
  const cropY = Math.max(0, minY - padY);
  const cropW = Math.min(width - cropX, rawW + padX * 2);
  const cropH = Math.min(height - cropY, rawH + padY * 2);

  return {
    minX,
    minY,
    maxX,
    maxY,
    contentWidth: rawW,
    contentHeight: rawH,
    cropX,
    cropY,
    cropW,
    cropH,
    isEmpty: false,
  };
}

/**
 * Calcule le redimensionnement proportionnel 'contain' et le centrage parfait
 * dans le canvas final au format demandé (par défaut 2400x3200).
 */
export function calculateContainPlacement(contentW, contentH, targetW = 2400, targetH = 3200, options = {}) {
  // Marge de page (5% par défaut pour un rendu coloriage équilibré)
  const pageMarginRatio = options.pageMarginRatio ?? 0.05;
  const maxAvailableW = targetW * (1 - 2 * pageMarginRatio);
  const maxAvailableH = targetH * (1 - 2 * pageMarginRatio);

  const scale = Math.min(maxAvailableW / contentW, maxAvailableH / contentH);
  const destW = Math.round(contentW * scale);
  const destH = Math.round(contentH * scale);

  const destX = Math.round((targetW - destW) / 2);
  const destY = Math.round((targetH - destH) / 2);

  return {
    targetW,
    targetH,
    destX,
    destY,
    destW,
    destH,
    scale,
    aspectRatio: contentW / contentH,
  };
}

/**
 * Charge une source image (URL, blob, svg) en élément Image HTML.
 */
function loadImageElement(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(new Error('Échec du chargement de l’image : ' + (src.slice ? src.slice(0, 100) : err)));
    img.src = src;
  });
}

/**
 * Exporte n'importe quel dessin (SVG ou image matricielle) sur un canvas haute résolution
 * parfaitement proportionné, sans déformation, avec rognage des marges vides et centrage.
 *
 * @param {string|object} source - URL, chaîne SVG, ou objet dessin ({ image, isSvg, ... })
 * @param {object} options - Options d'export
 * @returns {Promise<HTMLCanvasElement>} Canvas final haute résolution
 */
export async function exportDrawingToCanvas(source, options = {}) {
  const targetW = options.targetWidth || 2400;
  const targetH = options.targetHeight || 3200;
  const background = options.background !== undefined ? options.background : '#ffffff';
  const trimMargins = options.trimMargins !== false;

  let imageSrc = '';
  let isSvg = false;
  let svgRawText = null;

  if (typeof source === 'string') {
    if (source.trim().startsWith('<svg') || source.trim().startsWith('<?xml')) {
      isSvg = true;
      svgRawText = source;
    } else {
      imageSrc = source;
      isSvg = source.toLowerCase().includes('.svg') || source.startsWith('data:image/svg+xml');
    }
  } else if (source && typeof source === 'object') {
    imageSrc = source.image || source.imagePath || source.url || '';
    isSvg = Boolean(source.isSvg) || imageSrc.toLowerCase().includes('.svg');
    if (source.svgText) {
      isSvg = true;
      svgRawText = source.svgText;
    }
  }

  let highResBlobUrl = null;
  let img = null;

  try {
    if (isSvg) {
      // 1. Récupération du texte SVG si pas déjà fourni
      if (!svgRawText && imageSrc) {
        try {
          const res = await fetch(imageSrc);
          const contentType = res.headers.get('content-type') || '';
          if (contentType.includes('svg') || imageSrc.toLowerCase().includes('.svg')) {
            const fetchedText = await res.text();
            if (fetchedText.includes('<svg')) {
              svgRawText = fetchedText;
            }
          }
        } catch (e) {
          console.warn('Impossible de récupérer le SVG brut, repli sur imageSrc :', e);
        }
      }

      // 2. Si on a le texte SVG, on le prépare à très haute résolution
      if (svgRawText) {
        const preparedSvg = prepareHighResSvgString(svgRawText, 3200);
        const blob = new Blob([preparedSvg], { type: 'image/svg+xml;charset=utf-8' });
        highResBlobUrl = URL.createObjectURL(blob);
        img = await loadImageElement(highResBlobUrl);
      } else {
        img = await loadImageElement(imageSrc);
      }
    } else {
      // Image matricielle standard
      img = await loadImageElement(imageSrc);
    }

    const renderW = img.naturalWidth || img.width || 1200;
    const renderH = img.naturalHeight || img.height || 1200;

    // 3. Canvas d'analyse pour détection des traits et marges
    const analysisCanvas = document.createElement('canvas');
    analysisCanvas.width = renderW;
    analysisCanvas.height = renderH;
    const analysisCtx = analysisCanvas.getContext('2d', { willReadFrequently: true });
    analysisCtx.clearRect(0, 0, renderW, renderH);
    analysisCtx.drawImage(img, 0, 0, renderW, renderH);

    // 4. Détection et suppression des marges vides excessives
    let bounds;
    if (trimMargins) {
      const imgData = analysisCtx.getImageData(0, 0, renderW, renderH);
      bounds = detectDrawingBounds(imgData.data, renderW, renderH, {
        safetyPaddingRatio: options.safetyPaddingRatio ?? 0.025,
      });
    } else {
      bounds = {
        cropX: 0,
        cropY: 0,
        cropW: renderW,
        cropH: renderH,
      };
    }

    // 5. Calcul proportionnel contain & centrage
    const placement = calculateContainPlacement(bounds.cropW, bounds.cropH, targetW, targetH, {
      pageMarginRatio: options.pageMarginRatio ?? 0.05,
    });

    // 6. Rendu final sur le canvas cible
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = targetW;
    finalCanvas.height = targetH;
    const ctx = finalCanvas.getContext('2d');

    // Remplissage du fond (blanc par défaut ou transparent)
    if (background && background !== 'transparent') {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, targetW, targetH);
    } else {
      ctx.clearRect(0, 0, targetW, targetH);
    }

    // Paramètres de lissage haute qualité
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Dessin proportionnel centré sans aucune déformation
    ctx.drawImage(
      analysisCanvas,
      bounds.cropX,
      bounds.cropY,
      bounds.cropW,
      bounds.cropH,
      placement.destX,
      placement.destY,
      placement.destW,
      placement.destH
    );

    return finalCanvas;
  } finally {
    if (highResBlobUrl) {
      URL.revokeObjectURL(highResBlobUrl);
    }
  }
}

/**
 * Exporte un dessin directement sous forme de Blob PNG haute résolution.
 */
export async function exportDrawingToPngBlob(source, options = {}) {
  const canvas = await exportDrawingToCanvas(source, options);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Échec de la génération du Blob PNG'));
    }, 'image/png');
  });
}
