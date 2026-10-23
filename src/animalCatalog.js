// 126 Dessins vectoriels d'animaux au format SVG
export const animalCatalog = Array.from({ length: 126 }, (_, i) => {
  const num = i + 1;
  return {
    id: `cb-svg-animal-${num}`,
    slug: `animal-svg-${num}`,
    title: `Animal mignon ${num}`,
    cat: ['Animaux'],
    likes: ((num * 47 + 13) % 920) + 85,
    imagePath: `/svg/animaux/animal-${num}.svg`,
    image: `/svg/animaux/animal-${num}.svg`,
    isSvg: true,
    fresh: num <= 15,
    createdAt: new Date(Date.now() - (126 - num) * 12 * 3600 * 1000).toISOString(),
  };
});
