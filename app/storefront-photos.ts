export const COLLECTION_COVER_SIZES = "(max-width: 350px) 38vw, (max-width: 699px) calc(50vw - 19px), (max-width: 1151px) 33vw, 374px";
export const SLICE_PHOTO_SIZES = "(max-width: 359px) calc(42vw - 14px), (max-width: 699px) calc(50vw - 20px), (max-width: 899px) calc(50vw - 35px), 240px";
export const CONE_COVER = "/images/cascao-trufado-trio-home-20261114-v4713.webp";
export const CONE_FALLBACK_COVER = "/images/cones-trufados-trio-20261108.webp";

// Os derivados são redimensionamentos do enquadramento aprovado de cada card.
const sliceWidths: Readonly<Record<string, readonly number[]>> = {
  "/fatia-abacaxi-brigadeiro-branco-card-20261108.webp": [360, 576, 670],
  "/fatia-bombom-uva.avif": [360, 900],
  "/fatia-bombom-uva-massa-branca-20261126.webp": [360, 576, 1122],
  "/fatia-oreo-ninho-chocolate-20261127.webp": [360, 576, 1122],
  "/fatia-chocolate-cenoura-card-6de0c35d.webp": [360, 576, 670],
  "/fatia-chocolate-maracuja-card.webp": [360, 576, 670],
  "/fatia-chocolate-morango-card.webp": [360, 576, 670],
  "/fatia-chocolatudo-card-518c74f4.webp": [360, 640],
  "/fatia-coco-cremoso-morango-card.webp": [360, 576, 670],
  "/fatia-ninho-morango-card.webp": [360, 576, 670],
  "/fatia-prestigio-card.webp": [360, 576, 670],
};

export function slicePhotoSources(source: string) {
  const widths = sliceWidths[source];
  if (!widths) return undefined;
  const file = source.slice(1, source.lastIndexOf("."));
  return widths.map((width, index) => index === widths.length - 1
    ? `${source} ${width}w`
    : `/images/responsivas/${file}-${width}-v1.webp ${width}w`).join(", ");
}

export function collectionPhotoSources(source: string, width: number) {
  const base = source.slice(0, -".webp".length);
  const responsive = base.replace("/images/", "/images/responsivas/");
  const small = source === CONE_FALLBACK_COVER ? `${responsive}-360-v1.webp` : `${base}-360.webp`;
  const medium = width > 720 ? `, ${responsive}-576-v1.webp 576w` : "";
  return `${small} 360w${medium}, ${source} ${width}w`;
}
