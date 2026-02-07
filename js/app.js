import { products, WHATSAPP_NUMBER } from './data.js';
import { loadCart, saveCart, addToCart, updateQty, getCartTotal, getCartCount } from './cart.js';
import { renderProducts, renderCartItems, updateCartCount } from './ui.js';
import { byId, moneyZA, debounce } from './utils.js';

// State
let cart = loadCart();
let currentCategory = 'all';
let searchQuery = '';

// Elements
const gridEl = byId('product-grid');
const cartItemsEl = byId('cart-items');
const cartTotalEl = byId('cart-total');
const cartCountEl = byId('cart-count');
const searchInput = byId('search-input');
const categorySelect = byId('category-filter');

// Cart Drawer Logic
const drawer = byId('cart-drawer');
const overlay = byId('cart-overlay');

function toggleCart(open) {
    if (open) {
        drawer.classList.remove('translate-x-full');
        overlay.classList.remove('opacity-0', 'pointer-events-none');
    } else {
        drawer.classList.add('translate-x-full');
        overlay.classList.add('opacity-0', 'pointer-events-none');
    }
}

byId('cart-btn').addEventListener('click', () => toggleCart(true));
byId('cart-close').addEventListener('click', () => toggleCart(false));
overlay.addEventListener('click', () => toggleCart(false));

// App Logic
function refreshUI() {
    // Filter Products
    const filtered = products.filter(p => {
        const matchesCat = currentCategory === 'all' || p.category === currentCategory;
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCat && matchesSearch;
    });

    renderProducts(gridEl, filtered, (product) => {
        cart = addToCart(cart, product);
        saveCart(cart);
        refreshCart();
        toggleCart(true); // Open cart on add
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

// Event Listeners
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
    
    const lines = cart.map(i => `• ${i.qty}x ${i.name} (${moneyZA(i.price * i.qty)})`).join('\n');
    const total = moneyZA(getCartTotal(cart));
    const msg = `*New Order Request*\n\n${lines}\n\n*Total: ${total}*`;
    
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
});

// Init
function init() {
    // Populate Categories
    const categories = [...new Set(products.map(p => p.category))].sort();
    categories.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        categorySelect.appendChild(opt);
    });

    refreshUI();
    refreshCart();
}

init();