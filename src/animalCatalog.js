// Dessins vectoriels d'animaux au format SVG (118, 119 et 125 retirés)
// Sécurité : Les aperçus web utilisent les PNG pré-rendus haute qualité
// Les fichiers SVG sources sont strictement protégés et réservés aux abonnés ColorVIP / ColorVIP Pro
const excludedAnimals = new Set([118, 119, 125]);

export const animalCatalog = Array.from({ length: 126 }, (_, i) => i + 1)
  .filter(num => !excludedAnimals.has(num))
  .map(num => ({
    id: `cb-svg-animal-${num}`,
    slug: `animal-svg-${num}`,
    title: `Animal mignon ${num}`,
    cat: ['Animaux'],
    likes: ((num * 47 + 13) % 920) + 85,
    imagePath: `/previews/animaux/animal-${num}.png`,
    image: `/previews/animaux/animal-${num}.png`,
    svgAssetId: `animal-${num}`,
    isSvg: true,
    fresh: num <= 15,
    createdAt: new Date(Date.now() - (126 - num) * 12 * 3600 * 1000).toISOString(),
  }));
