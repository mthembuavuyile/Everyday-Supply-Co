/**
 * js/app.js
 * UI Controller
 */

import { products } from './data.js';
import * as Cart from './cart.js';

// DOM Elements
const grid = document.getElementById('product-grid');
const cartCount = document.getElementById('cart-count');
const sortSelect = document.getElementById('sort-select');
const toast = document.getElementById('toast');

// Menu Elements
const menuBtn = document.getElementById('menu-btn');
const mobileMenu = document.getElementById('mobile-menu');

// Cart Modal Elements
const cartBtn = document.getElementById('cart-btn');
const closeCartBtn = document.getElementById('close-cart');
const cartModal = document.getElementById('cart-modal');
const cartItemsContainer = document.getElementById('cart-items');
const cartTotalEl = document.getElementById('cart-total');
const checkoutBtn = document.getElementById('checkout-btn');

document.addEventListener('DOMContentLoaded', () => {
  renderProducts(products);
  updateCartUI();
});

// ------- Products -------
function renderProducts(items) {
  grid.innerHTML = items
    .map(
      (product) => `
      <article class="card">
        <div style="position:relative">
          ${
            product.badge
              ? `<span class="tag" style="position:absolute; top:10px; left:10px; background:#FFE4E6; color:#E11D48; padding:2px 8px; border-radius:6px; font-size:0.75rem; font-weight:800">${product.badge}</span>`
              : ''
          }
          <img src="${product.image}" alt="${product.name}" class="card-img" loading="lazy">
        </div>

        <div class="card-body">
          <span class="card-tag">${product.category}</span>
          <h3 class="card-title">
            ${product.name}
            ${
              product.size
                ? `<small style="color:#6B7280; font-weight:600"> (${product.size})</small>`
                : ''
            }
          </h3>

          <div class="card-price">
            <span>${Cart.formatMoney(product.price)}</span>
          </div>

          <button class="btn-add js-add-cart" type="button" data-id="${product.id}">
            Add to Cart
          </button>
        </div>
      </article>
    `
    )
    .join('');
}

// ------- Cart UI -------
function updateCartUI() {
  const cart = Cart.getCart();

  // Badge
  const totalQty = cart.reduce((acc, item) => acc + item.qty, 0);
  cartCount.textContent = totalQty;

  // Items
  if (cart.length === 0) {
    cartItemsContainer.innerHTML = '<p class="empty-msg">Your cart is empty.</p>';
  } else {
    cartItemsContainer.innerHTML = cart
      .map(
        (item) => `
        <div class="cart-item">
          <div>
            <strong>${item.name}</strong><br>
            <small>${item.qty} × ${Cart.formatMoney(item.price)}</small>
          </div>
          <div><strong>${Cart.formatMoney(item.price * item.qty)}</strong></div>
        </div>
      `
      )
      .join('');
  }

  cartTotalEl.textContent = Cart.formatMoney(Cart.getCartTotal());
}

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.remove('hidden');
  window.clearTimeout(showToast._t);
  showToast._t = window.setTimeout(() => toast.classList.add('hidden'), 1800);
}

// ------- Mobile Menu (single, working toggle) -------
function openMobileMenu() {
  mobileMenu.hidden = false;          // allow animation
  requestAnimationFrame(() => mobileMenu.classList.add('active'));
  menuBtn.classList.add('active');
  menuBtn.setAttribute('aria-expanded', 'true');
  menuBtn.setAttribute('aria-label', 'Close menu');
}

function closeMobileMenu() {
  mobileMenu.classList.remove('active');
  menuBtn.classList.remove('active');
  menuBtn.setAttribute('aria-expanded', 'false');
  menuBtn.setAttribute('aria-label', 'Open menu');

  // wait for transition then hide for accessibility
  window.setTimeout(() => {
    if (!mobileMenu.classList.contains('active')) mobileMenu.hidden = true;
  }, 220);
}

function toggleMobileMenu() {
  const isOpen = menuBtn.getAttribute('aria-expanded') === 'true';
  if (isOpen) closeMobileMenu();
  else openMobileMenu();
}

menuBtn.addEventListener('click', toggleMobileMenu);

// close on link click
mobileMenu.querySelectorAll('a').forEach((a) => {
  a.addEventListener('click', closeMobileMenu);
});

// close on Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (menuBtn.getAttribute('aria-expanded') === 'true') closeMobileMenu();
    if (!cartModal.classList.contains('hidden')) cartModal.classList.add('hidden');
  }
});

// ------- Add to cart (delegation) -------
grid.addEventListener('click', (e) => {
  const btn = e.target.closest('.js-add-cart');
  if (!btn) return;

  const id = Number(btn.dataset.id);
  const product = products.find((p) => p.id === id);
  if (!product) return;

  Cart.addItem(product);
  updateCartUI();
  showToast('Added to cart');
});

// ------- Sorting -------
sortSelect.addEventListener('change', (e) => {
  const value = e.target.value;
  let sorted = [...products];

  if (value === 'price-asc') sorted.sort((a, b) => a.price - b.price);
  if (value === 'price-desc') sorted.sort((a, b) => b.price - a.price);

  renderProducts(sorted);
});

// ------- Cart Modal -------
cartBtn.addEventListener('click', () => cartModal.classList.remove('hidden'));
closeCartBtn.addEventListener('click', () => cartModal.classList.add('hidden'));

cartModal.addEventListener('click', (e) => {
  if (e.target === cartModal) cartModal.classList.add('hidden');
});

checkoutBtn.addEventListener('click', () => {
  Cart.checkoutViaWhatsApp();
});
