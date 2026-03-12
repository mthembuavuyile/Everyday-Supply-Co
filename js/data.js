// js/data.js

export const WHATSAPP_NUMBER = "27783284393";

// --- Configuration & Assets ---

const FALLBACK_IMAGE = "https://via.placeholder.com/150?text=No+Image";

export const BRAND_IMAGES = {
  "Maggi 2-Minute Noodles": "https://everydaysupplies.co.za/images/maggi.png",
};

export const PRODUCT_IMAGES = {
  "Maggi 2-Minute Noodles | Chicken": "./images/maggi-chicken.jpg",
};

// --- Helper Functions ---

/**
 * Resolves the best available image for a product.
 * Priority: Specific Flavor > Brand Logo > Fallback Placeholder
 */
export function getProductImage(brand, flavor) {
  const flavorKey = `${brand}|${flavor}`;
  return PRODUCT_IMAGES[flavorKey] || BRAND_IMAGES[brand] || FALLBACK_IMAGE;
}

/**
 * Sanitizes and removes duplicates from an array of strings
 */
export function sanitizeList(arr) {
  if (!Array.isArray(arr)) return [];
  return [...new Set(arr.map((s) => String(s).trim()).filter(Boolean))];
}

// --- Exports ---

/**
 * A single hardcoded product is left here to maintain the expected data 
 * structure (schema) so that components mapping over manualProducts don't break.
 */
export const manualProducts = [
  {
    id: "1000",
    name: "Maggi 2-Minute Noodles — Chicken (5-Pack)",
    brand: "Maggi 2-Minute Noodles",
    flavor: "Chicken",
    category: "Noodles",
    price: 34.99,
    image: getProductImage("Maggi 2-Minute Noodles", "Chicken"),
    isManual: false,
    createdAt: new Date().toISOString(), 
  }
];