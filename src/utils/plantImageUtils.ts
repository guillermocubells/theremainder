/**
 * Determines the main (hero) image for a plant.
 * Priority: primaryImage > first productImage > first image in array.
 */
export function getMainImage(
  images?: string[],
  productImages?: string[],
  primaryImage?: string | null
): string | undefined {
  if (primaryImage) return primaryImage;
  if (productImages && productImages.length > 0) return productImages[0];
  return images?.[0];
}

/**
 * Returns the images to display in the product gallery.
 * If there are product images, show only those. Otherwise show all.
 */
export function getDisplayImages(
  images?: string[],
  productImages?: string[]
): string[] {
  if (productImages && productImages.length > 0) return productImages;
  return images || [];
}
