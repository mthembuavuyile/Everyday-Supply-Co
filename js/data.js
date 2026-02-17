// js/data.js

export const WHATSAPP_NUMBER = "27783284393";

// --- Configuration & Assets ---

const FALLBACK_IMAGE = "https://via.placeholder.com/150?text=No+Image";

const BRAND_IMAGES = {
  "Maggi 2-Minute Noodles": "./images/maggi.png",
  "Eat me Instant Noodles": "./images/eat-me.jpg",
  "Kellogg’s Instant Noodles": "./images/kelloggs.png",
  "Hommi Flavoured Noodles": "./images/hommi.jpg",
};

/**
 * Specific product images (brand + flavor overrides)
 * Use a consistent delimiter.
 */
const PRODUCT_IMAGES = {
  "Hommi Flavoured Noodles|Beef": "./images/hommi-beef.jpg",
  "Hommi Flavoured Noodles|Chicken": "./images/hommi-chicken.jpg",

  "Eat Me Instant Noodles|Hot Chicken": "./images/eat-me-hot-chicken.jpg",

};

/**
 * Hardcoded noodle catalog
 */
const NOODLE_CATALOG = [
  {
    brand: "Maggi 2-Minute Noodles",
    flavors: ["Chicken", "Durban Curry", "Cheese"],
    price5Pack: 36.99,
  },
  {
    brand: "Eat Me Instant Noodles",
    flavors: ["Hot Chicken", "Beef", "Cheese"],
    price5Pack: 24.99,
  },
  {
    brand: "Kellogg’s Instant Noodles",
    flavors: ["Chicken", "Beef", "Cheese", "Durban Curry"],
    price5Pack: 34.99,
  },
  {
    brand: "Hommi Flavoured Noodles",
    flavors: ["Beef", "Chicken"],
    price5Pack: 28.0,
  },
];

// --- Helper Functions ---

/**
 * Resolves the best available image for a product.
 * Priority: Specific Flavor > Brand Logo > Fallback Placeholder
 */
function getProductImage(brand, flavor) {
  const flavorKey = `${brand}|${flavor}`;
  return (
    PRODUCT_IMAGES[flavorKey] || 
    BRAND_IMAGES[brand] || 
    FALLBACK_IMAGE
  );
}

/**
 * Sanitizes and removes duplicates from an array of strings
 */
function sanitizeList(arr) {
  if (!Array.isArray(arr)) return [];
  return [...new Set(arr.map((s) => String(s).trim()).filter(Boolean))];
}

/**
 * Factory function to generate product objects
 */
function generateCatalog({ startId = 1000 } = {}) {
  let currentId = startId;
  
  // Use flatMap for cleaner nested loops
  return NOODLE_CATALOG.flatMap((entry) => {
    const flavors = sanitizeList(entry.flavors);
    
    return flavors.map((flavor) => ({
      id: String(currentId++),
      name: `${entry.brand} — ${flavor} (5-Pack)`,
      brand: entry.brand,
      flavor: flavor,
      category: "Noodles",
      price: Number(entry.price5Pack) || 0,
      image: getProductImage(entry.brand, flavor),
      isManual: true,
      createdAt: new Date().toISOString(), // ISO string is more robust for JSON/Storage
    }));
  });
}

// --- Exports ---

export const manualProducts = generateCatalog({ startId: 1000 });