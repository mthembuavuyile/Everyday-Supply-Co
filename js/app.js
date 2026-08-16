// js/app.js
import { loadCart, saveCart, addToCart, updateQty, getCartTotal, getCartCount } from './cart.js';
import { renderProducts, renderCartItems, updateCartCount, showToast } from './ui.js';
import { byId, moneyZA, debounce } from './utils.js';
import { db } from './firebase.js';
import { collection, getDocs, query, orderBy, where, doc, setDoc, updateDoc, increment } from 'https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js';
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
        "availability": p.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"
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
      const opening = parseInt(data.openingStock) || 0;
      const stockIn = parseInt(data.stockIn) || 0;
      const stockOut = parseInt(data.stockOut) || 0;
      const currentStock = opening + stockIn - stockOut;
      return {
        ...data, // Spread remaining fields
        id: doc.id,
        // Safety Fallbacks: Prevents app crashes if Firebase data is missing fields
        name: data.name || 'Unnamed Product',
        category: data.category || 'Uncategorized',
        price: typeof data.price === 'number' ? data.price : parseFloat(data.price) || 0,
        image: data.imageUrl || data.image || FALLBACK_IMAGE,
        currentStock: currentStock,
        inStock: currentStock > 0,
      };
    });
  } catch (err) {
    console.error('Firestore failed to load products:', err);
    products = []; // Fallback to empty array so the app doesn't crash
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
    // Stock check before adding to cart
    if (!product.inStock) {
      showToast(`⚠ ${product.name} is out of stock`);
      return;
    }

    // Check if adding one more would exceed available stock
    const existingInCart = cart.find(item => item.id === product.id);
    const qtyInCart = existingInCart ? existingInCart.qty : 0;
    if (qtyInCart >= product.currentStock) {
      showToast(`⚠ Only ${product.currentStock} of ${product.name} available`);
      return;
    }

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

byId('checkout-btn').addEventListener('click', async () => {
  if (cart.length === 0) return;

  const nameInput = byId('customer-name').value.trim();
  const phoneInput = byId('customer-phone') ? byId('customer-phone').value.trim() : '';
  const addressInput = byId('delivery-address').value.trim();

  if (!nameInput || !phoneInput || !addressInput) {
    showToast('Please fill in your name, phone number, and delivery address');
    return;
  }

  const today = new Date().toISOString().split('T')[0];

  // 1. Check if customer already exists by phone number (merge instead of duplicate)
  let custId;
  try {
    const cleanPhone = phoneInput.replace(/\D/g, '');
    const custQuery = query(collection(db, 'customers'), where('phone', '==', phoneInput));
    const custSnap = await getDocs(custQuery);

    if (!custSnap.empty) {
      // Existing customer found — reuse their ID and update their record
      const existingDoc = custSnap.docs[0];
      custId = existingDoc.id;
      await updateDoc(doc(db, 'customers', custId), {
        name: nameInput,
        area: addressInput,
        status: 'Active',
        lastPurchase: today,
        updatedAt: new Date().toISOString()
      });
    } else {
      // Also try matching with cleaned phone (no spaces/dashes)
      let foundById = false;
      if (cleanPhone !== phoneInput) {
        const custQuery2 = query(collection(db, 'customers'));
        const allCustSnap = await getDocs(custQuery2);
        for (const d of allCustSnap.docs) {
          const existingPhone = (d.data().phone || '').replace(/\D/g, '');
          if (existingPhone === cleanPhone && existingPhone.length > 0) {
            custId = d.id;
            await updateDoc(doc(db, 'customers', custId), {
              name: nameInput,
              area: addressInput,
              status: 'Active',
              lastPurchase: today,
              updatedAt: new Date().toISOString()
            });
            foundById = true;
            break;
          }
        }
      }

      if (!custId) {
        // No existing customer — create new
        custId = 'CUST-' + Date.now();
        const custPayload = {
          id: custId,
          name: nameInput,
          phone: phoneInput,
          area: addressInput,
          status: 'Lead',
          dateAdded: today,
          lastPurchase: '',
          notes: 'Web Storefront Inquiry',
          updatedAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'customers', custId), custPayload);
      }
    }

    // 2. Sync Sales Orders & Reserve Stock in Firestore
    for (let index = 0; index < cart.length; index++) {
      const item = cart[index];
      const saleId = 'SALE-' + Date.now() + '-' + index;
      const totalAmount = (item.qty || 1) * (item.price || 0);

      const salePayload = {
        id: saleId,
        date: today,
        customerId: custId,
        customerName: nameInput,
        productId: item.id || '',
        productName: item.name,
        quantity: item.qty || 1,
        unitPrice: item.price || 0,
        total: totalAmount,
        paymentStatus: 'Pending',
        deliveryStatus: 'Pending WhatsApp',
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'sales', saleId), salePayload);

      // Check stock before reserving
      if (item.id) {
        try {
          await updateDoc(doc(db, 'products', item.id), {
            stockOut: increment(item.qty || 1)
          });
        } catch (sErr) {
          console.warn('Stock deduction note:', sErr.message);
        }
      }
    }
  } catch (err) {
    console.warn('Firestore customer/sale sync note:', err.message);
  }

  const lines = cart
    .map((i) => `• ${i.qty}x ${i.name} (${moneyZA(i.price * i.qty)})`)
    .join('\n');

  const total = moneyZA(getCartTotal(cart));
  const msg = `*New Order Request*\n\n*Customer Details:*\nName: ${nameInput}\nPhone: ${phoneInput}\nAddress: ${addressInput}\n\n*Order Items:*\n${lines}\n\n*Total: ${total}*`;

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

  // Read URL search params
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('search')) {
    searchQuery = urlParams.get('search') || '';
    if (searchInput) searchInput.value = searchQuery;
  }
  if (urlParams.has('category')) {
    currentCategory = urlParams.get('category') || 'all';
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