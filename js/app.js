// js/app.js
import { loadCart, saveCart, addToCart, updateQty, getCartTotal, getCartCount } from './cart.js';
import { renderProducts, renderCartItems, updateCartCount } from './ui.js';
import { byId, moneyZA, debounce } from './utils.js';
import { db } from './firebase.js';
import { collection, getDocs, query, orderBy } from 'https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js';
import { WHATSAPP_NUMBER, FALLBACK_IMAGE } from './data.js';

// State
let cart = loadCart();
let currentCategory = 'all';
let searchQuery = '';
let products =[];

// Elements
const gridEl = byId('product-grid');
const cartItemsEl = byId('cart-items');
const cartTotalEl = byId('cart-total');
const cartCountEl = byId('cart-count');
const searchInput = byId('search-input');
const categorySelect = byId('category-filter');
const navDrawer = byId('nav-drawer');
const navOverlay = byId('nav-overlay');
const drawer = byId('cart-drawer');
const overlay = byId('cart-overlay');

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

// UI Refresh
function refreshUI() {
  const filtered = products.filter((p) => {
    const matchesCat = currentCategory === 'all' || p.category === currentCategory;
    const matchesSearch = (p.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  renderProducts(gridEl, filtered, (product) => {
    cart = addToCart(cart, product);
    saveCart(cart);
    refreshCart();
    
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

categorySelect.addEventListener('change', (e) => {
  currentCategory = e.target.value;
  refreshUI();
});

byId('checkout-btn').addEventListener('click', () => {
  if (cart.length === 0) return;

  const lines = cart
    .map((i) => `• ${i.qty}x ${i.name} (${moneyZA(i.price * i.qty)})`)
    .join('\n');

  const total = moneyZA(getCartTotal(cart));
  const msg = `*New Order Request*\n\n${lines}\n\n*Total: ${total}*`;

  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
});

// Init
async function init() {
  gridEl.innerHTML = `
    <div class="col-span-full text-center py-10 flex flex-col items-center justify-center gap-3">
        <div class="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p class="text-gray-500 font-medium animate-pulse">Loading live products...</p>
    </div>`;
  
  await loadLiveProducts();

  // Populate Category Dropdown dynamically based strictly on Firebase data
  const categories =[...new Set(products.map((p) => p.category))].filter(Boolean).sort();
  categorySelect.innerHTML = `<option value="all">All Categories</option>`;
  categories.forEach((cat) => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    categorySelect.appendChild(opt);
  });

  refreshUI();
  refreshCart();
}

init();