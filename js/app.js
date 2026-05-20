// js/app.js
import { loadCart, saveCart, addToCart, updateQty, getCartTotal, getCartCount } from './cart.js';
import { renderProducts, renderCartItems, updateCartCount, showToast } from './ui.js';
import { byId, moneyZA, debounce } from './utils.js';
import { db } from './firebase.js';
import { collection, getDocs, query, orderBy } from 'https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js';
import { WHATSAPP_NUMBER, FALLBACK_IMAGE } from './data.js';

// State
let cart = loadCart();
let currentCategory = 'all';
let searchQuery = '';
let currentSort = 'default';
let products = [];

// Elements
const gridEl = byId('product-grid');
const cartItemsEl = byId('cart-items');
const cartTotalEl = byId('cart-total');
const cartCountEl = byId('cart-count');
const searchInput = byId('search-input');
const sortSelectEl = byId('sort-select');
const categoryPillsEl = byId('category-pills');
const currentCatTitle = byId('current-category-title');
const productCountEl = byId('product-count');
const navDrawer = byId('nav-drawer');
const navOverlay = byId('nav-overlay');
const drawer = byId('cart-drawer');
const overlay = byId('cart-overlay');

// Inject JSON-LD Schema for SEO
function injectSEOSchema(products) {
  let existingScript = document.getElementById('dynamic-seo-schema');
  if (existingScript) existingScript.remove();

  const script = document.createElement('script');
  script.id = 'dynamic-seo-schema';
  script.type = 'application/ld+json';
  
  const itemListElements = products.map((p, index) => ({
    "@type": "ListItem",
    "position": index + 1,
    "item": {
      "@type": "Product",
      "name": p.name,
      "image": p.image || p.imageUrl,
      "category": p.category,
      "offers": {
        "@type": "Offer",
        "priceCurrency": "ZAR",
        "price": p.price,
        "availability": "https://schema.org/InStock"
      }
    }
  }));

  const schema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "itemListElement": itemListElements
  };

  script.text = JSON.stringify(schema);
  document.head.appendChild(script);
}

// 1. Fetch from Firebase strictly (No manual products)
async function loadLiveProducts() {
  try {
    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);

    products = snap.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data, // Spread remaining fields
        id: doc.id,
        // Safety Fallbacks: Prevents app crashes if Firebase data is missing fields
        name: data.name || 'Unnamed Product',
        category: data.category || 'Uncategorized',
        price: typeof data.price === 'number' ? data.price : parseFloat(data.price) || 0,
        image: data.imageUrl || data.image || FALLBACK_IMAGE,
      };
    });
  } catch (err) {
    console.error('Firestore failed to load products:', err);
    products =[]; // Fallback to empty array so the app doesn't crash
  }
}

// Dynamic Category Pills rendering
function renderCategoryPills() {
  if (!categoryPillsEl) return;
  const categories = ['all', ...new Set(products.map((p) => p.category))].filter(Boolean);
  
  categoryPillsEl.innerHTML = categories.map((cat) => {
    const isActive = currentCategory === cat;
    const label = cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1);
    return `
      <button 
        data-category="${cat}"
        class="category-pill shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 whitespace-nowrap ${
          isActive 
            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/10' 
            : 'bg-white text-gray-600 ring-1 ring-gray-200/60 hover:bg-gray-50'
        }"
      >
        ${label}
      </button>
    `;
  }).join('');
}

// UI Refresh
function refreshUI() {
  const filtered = products.filter((p) => {
    const matchesCat = currentCategory === 'all' || p.category === currentCategory;
    const matchesSearch = (p.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  // Sort Pipeline
  if (currentSort === 'price-low') {
    filtered.sort((a, b) => a.price - b.price);
  } else if (currentSort === 'price-high') {
    filtered.sort((a, b) => b.price - a.price);
  } else if (currentSort === 'name-asc') {
    filtered.sort((a, b) => a.name.localeCompare(b.name));
  }

  // Update headers
  if (currentCatTitle) {
      currentCatTitle.textContent = currentCategory === 'all' 
        ? (searchQuery ? 'Search Results' : 'All Products') 
        : currentCategory.charAt(0).toUpperCase() + currentCategory.slice(1);
  }
  if (productCountEl) {
      productCountEl.textContent = `${filtered.length} items`;
  }

  // Sync category pills selection
  renderCategoryPills();

  renderProducts(gridEl, filtered, (product) => {
    cart = addToCart(cart, product);
    saveCart(cart);
    refreshCart();

    // Bottom toast — always visible regardless of header scroll state
    showToast(`✓ ${product.name} added to basket`);

    // Visual pop animation on the cart icon
    const cartBtn = byId('cart-btn');
    cartBtn.classList.add('scale-110', 'border-emerald-500');
    setTimeout(() => {
      cartBtn.classList.remove('scale-110', 'border-emerald-500');
    }, 200);
  });
}

function refreshCart() {
  renderCartItems(cartItemsEl, cart, (id, delta) => {
    cart = updateQty(cart, id, delta);
    saveCart(cart);
    refreshCart();
  });

  cartTotalEl.textContent = moneyZA(getCartTotal(cart));
  updateCartCount(cartCountEl, getCartCount(cart));
}

// Drawer Logic
function toggleCart(open) {
  if (open) {
    drawer.classList.remove('translate-x-full');
    overlay.classList.remove('opacity-0', 'pointer-events-none');
  } else {
    drawer.classList.add('translate-x-full');
    overlay.classList.add('opacity-0', 'pointer-events-none');
  }
}

// Nav Drawer Logic
function toggleNav(open) {
  if (open) {
    navDrawer.classList.remove('translate-x-full');
    navOverlay.classList.remove('opacity-0', 'pointer-events-none');
  } else {
    navDrawer.classList.add('translate-x-full');
    navOverlay.classList.add('opacity-0', 'pointer-events-none');
  }
}

// Event Listeners
byId('cart-btn').addEventListener('click', () => toggleCart(true));
byId('cart-close').addEventListener('click', () => toggleCart(false));
overlay.addEventListener('click', () => toggleCart(false));
byId('nav-btn').addEventListener('click', () => toggleNav(true));
byId('nav-close').addEventListener('click', () => toggleNav(false));
navOverlay.addEventListener('click', () => toggleNav(false));

searchInput.addEventListener('input', debounce((e) => {
    searchQuery = e.target.value;
    refreshUI();
}, 300));

if (sortSelectEl) {
  sortSelectEl.addEventListener('change', (e) => {
    currentSort = e.target.value;
    refreshUI();
  });
}

if (categoryPillsEl) {
  categoryPillsEl.addEventListener('click', (e) => {
    const pill = e.target.closest('.category-pill');
    if (!pill) return;
    currentCategory = pill.dataset.category;
    refreshUI();
  });
}

byId('checkout-btn').addEventListener('click', () => {
  if (cart.length === 0) return;

  const nameInput = byId('customer-name').value.trim();
  const addressInput = byId('delivery-address').value.trim();

  if (!nameInput || !addressInput) {
    showToast('Please enter your name and delivery address');
    return;
  }

  const lines = cart
    .map((i) => `• ${i.qty}x ${i.name} (${moneyZA(i.price * i.qty)})`)
    .join('\n');

  const total = moneyZA(getCartTotal(cart));
  const msg = `*New Order Request*\n\n*Customer Details:*\nName: ${nameInput}\nAddress: ${addressInput}\n\n*Order Items:*\n${lines}\n\n*Total: ${total}*`;

  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
});

// Init
async function init() {
  import('./ui.js').then(module => {
     if(module.renderSkeletons && gridEl) module.renderSkeletons(gridEl, 10);
  });
  
  await loadLiveProducts();

  // Inject schema once products are loaded
  if (products.length > 0) {
      injectSEOSchema(products);
  }

  refreshUI();
  refreshCart();
}

// Header Reveal/Hide on Scroll
let lastScrollY = window.scrollY;
const announcementBar = document.getElementById('announcement-bar');
const headerContainer = document.getElementById('main-header');
const stickyFilterBar = document.querySelector('.sticky');

// Heights: announcement bar ~28px mobile / 32px desktop, header 76px / 84px
// Total combined stack = 104px mobile / 116px desktop
// We translate each element up by its own height so they both fully clear the viewport.
// The header sits below the announcement bar, so its own -translate-y-full (76px/84px)
// is enough since the announcement bar moves independently.

window.addEventListener('scroll', () => {
    const currentScrollY = window.scrollY;
    const isScrollingDown = currentScrollY > lastScrollY && currentScrollY > 80;

    if (isScrollingDown) {
        // Slide both fully off the top
        if (announcementBar) announcementBar.style.transform = 'translateY(-100%)';
        if (headerContainer) {
            // Header is positioned below the bar; translate it up by bar+own height
            const barH = announcementBar ? announcementBar.offsetHeight : 28;
            headerContainer.style.transform = `translateY(calc(-100% - ${barH}px))`;
        }
        if (stickyFilterBar) stickyFilterBar.style.top = '0px';
    } else {
        // Restore both
        if (announcementBar) announcementBar.style.transform = '';
        if (headerContainer) headerContainer.style.transform = '';
        if (stickyFilterBar) {
            stickyFilterBar.style.top = window.innerWidth < 768 ? '104px' : '116px';
        }
    }
    lastScrollY = currentScrollY;
}, { passive: true });

init();