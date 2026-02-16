import { loadCart, saveCart, addToCart, updateQty, getCartTotal, getCartCount } from './cart.js';
import { renderProducts, renderCartItems, updateCartCount } from './ui.js';
import { byId, moneyZA, debounce } from './utils.js';
import { db } from './firebase.js';
import { collection, getDocs, query, orderBy } from 'https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js';
import { manualProducts, WHATSAPP_NUMBER } from './data.js';

// State
let cart = loadCart();
let currentCategory = 'all';
let searchQuery = '';
let products = [];

// Elements
const gridEl = byId('product-grid');
const cartItemsEl = byId('cart-items');
const cartTotalEl = byId('cart-total');
const cartCountEl = byId('cart-count');
const searchInput = byId('search-input');
const categorySelect = byId('category-filter');
const drawer = byId('cart-drawer');
const overlay = byId('cart-overlay');

// 1. Fetch & Merge Logic (Same idea as Admin, just different fields needed)
async function loadLiveProducts() {
  let dbProducts = [];
  try {
    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);

    dbProducts = snap.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        // Normalize
        image: data.imageUrl || data.image || 'https://via.placeholder.com/150',
      };
    });
  } catch (err) {
    console.error('Firestore failed:', err);
  }

  // Merge
  products = [...manualProducts, ...dbProducts];
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
    toggleCart(true);
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

// Event Listeners
byId('cart-btn').addEventListener('click', () => toggleCart(true));
byId('cart-close').addEventListener('click', () => toggleCart(false));
overlay.addEventListener('click', () => toggleCart(false));

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
  // Show skeleton or loading?
  gridEl.innerHTML = '<div class="col-span-full text-center text-gray-400">Loading products...</div>';
  
  await loadLiveProducts();

  // Populate Category Dropdown dynamically
  const categories = [...new Set(products.map((p) => p.category))].filter(Boolean).sort();
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