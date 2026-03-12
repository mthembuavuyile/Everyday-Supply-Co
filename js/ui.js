import { moneyZA } from './utils.js';

export function renderProducts(gridEl, products, onAdd) {
    gridEl.innerHTML = '';

    if (products.length === 0) {
        gridEl.innerHTML = `
            <div class="col-span-full flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
                <svg class="w-10 h-10 opacity-30" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
                <p class="font-medium text-sm">No products found matching your search.</p>
            </div>`;
        return;
    }

    products.forEach((p, i) => {
        const card = document.createElement('div');
        card.className = "product-card bg-white rounded-2xl p-4 shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 flex flex-col group cursor-default";
        card.style.animationDelay = `${Math.min(i * 0.04, 0.32)}s`;

        card.innerHTML = `
            <div class="img-container rounded-xl mb-4 bg-gray-50">
                <img
                    src="${p.image}"
                    alt="${p.name}"
                    loading="lazy"
                    class="w-3/4 h-3/4 object-contain group-hover:scale-110 transition-transform duration-300"
                >
            </div>

            <div class="flex-1 flex flex-col">
                <div class="text-xs text-gray-400 font-bold uppercase tracking-wide mb-1">${p.category}</div>
                <h3 class="font-bold text-gray-800 text-base leading-snug mb-2 line-clamp-2">${p.name}</h3>

                <div class="mt-auto flex items-center justify-between pt-3 border-t border-gray-50">
                    <span class="text-lg font-extrabold text-emerald-700">${moneyZA(p.price)}</span>
                    <button
                        class="add-btn bg-gray-900 hover:bg-emerald-600 active:scale-90 text-white w-9 h-9 rounded-lg flex items-center justify-center transition-all shadow-sm"
                        aria-label="Add ${p.name} to basket"
                    >
                        <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                            <path d="M12 5v14M5 12h14"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;

        card.querySelector('.add-btn').addEventListener('click', () => onAdd(p));
        gridEl.appendChild(card);
    });
}

export function renderCartItems(containerEl, cart, onUpdateQty) {
    containerEl.innerHTML = '';

    if (cart.length === 0) {
        containerEl.innerHTML = `
            <div class="flex flex-col items-center justify-center h-48 text-gray-400 gap-2">
                <svg class="w-8 h-8 opacity-40" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
                </svg>
                <p class="text-sm font-medium">Your basket is empty.</p>
            </div>`;
        return;
    }

    cart.forEach(item => {
        const row = document.createElement('div');
        row.className = "flex items-center gap-3 bg-white p-2 rounded-xl border border-gray-100 shadow-sm";

        row.innerHTML = `
            <div class="w-14 h-14 bg-gray-50 rounded-lg p-1 shrink-0 flex items-center justify-center overflow-hidden">
                <img src="${item.image}" alt="${item.name}" class="w-full h-full object-contain">
            </div>
            <div class="flex-1 min-w-0">
                <h4 class="font-bold text-sm text-gray-800 truncate leading-tight">${item.name}</h4>
                <p class="text-xs text-emerald-600 font-semibold mt-0.5">${moneyZA(item.price)}</p>
            </div>
            <div class="flex items-center gap-1 bg-gray-50 rounded-lg p-1 h-8 shrink-0">
                <button class="minus-btn w-6 h-full flex items-center justify-center text-gray-500 hover:bg-white hover:shadow rounded transition font-bold text-base leading-none" aria-label="Decrease quantity">−</button>
                <span class="text-xs font-bold w-6 text-center select-none">${item.qty}</span>
                <button class="plus-btn w-6 h-full flex items-center justify-center text-gray-500 hover:bg-white hover:shadow rounded transition font-bold text-base leading-none" aria-label="Increase quantity">+</button>
            </div>
        `;

        row.querySelector('.minus-btn').addEventListener('click', () => onUpdateQty(item.id, -1));
        row.querySelector('.plus-btn').addEventListener('click', () => onUpdateQty(item.id, 1));

        containerEl.appendChild(row);
    });
}

export function updateCartCount(el, count) {
    el.textContent = count;
    el.classList.toggle('scale-0',   count === 0);
    el.classList.toggle('scale-100', count > 0);
}