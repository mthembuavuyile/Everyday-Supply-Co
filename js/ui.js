import { moneyZA } from './utils.js';

export function renderSkeletons(gridEl, count = 10) {
    gridEl.innerHTML = '';
    for (let i = 0; i < count; i++) {
        gridEl.innerHTML += `
            <div class="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 flex flex-col h-full animate-pulse">
                <div class="w-full aspect-square bg-gray-200 rounded-xl mb-4"></div>
                <div class="h-2.5 bg-gray-200 rounded-full w-1/3 mb-2"></div>
                <div class="h-4 bg-gray-200 rounded-full w-3/4 mb-4"></div>
                <div class="mt-auto flex justify-between items-center pt-3 border-t border-gray-50">
                    <div class="h-5 bg-gray-200 rounded-full w-1/4"></div>
                    <div class="h-10 w-24 bg-gray-200 rounded-xl"></div>
                </div>
            </div>
        `;
    }
}

export function renderProducts(gridEl, products, onAdd) {
    gridEl.innerHTML = '';

    if (products.length === 0) {
        gridEl.innerHTML = `
            <div class="col-span-full flex flex-col items-center justify-center py-20 text-gray-400 gap-4">
                <svg class="w-12 h-12 opacity-30" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
                <div class="text-center">
                    <p class="font-extrabold text-gray-600 text-lg">No products found</p>
                    <p class="text-sm">Try adjusting your search or category filter.</p>
                </div>
            </div>`;
        return;
    }

    products.forEach((p, i) => {
        const card = document.createElement('div');
        // Sleek, minimal card with strong hover interaction
        card.className = "product-card bg-white rounded-2xl p-3 md:p-4 shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 border border-gray-100 flex flex-col group cursor-pointer overflow-hidden";
        card.style.animationDelay = `${Math.min(i * 0.04, 0.32)}s`;

        // Check if string contains "bulk" or "box" to show a badge
        const isBulk = (p.name.toLowerCase().includes('bulk') || p.name.toLowerCase().includes('box') || p.name.toLowerCase().includes('pack'));
        const badge = isBulk ? `<div class="absolute top-2 left-2 z-10 bg-emerald-100 text-emerald-800 text-[10px] md:text-xs font-black uppercase tracking-wider px-2 py-1 rounded-lg">Bulk Saver</div>` : '';

        card.innerHTML = `
            <div class="relative w-full aspect-square bg-gray-50 rounded-xl mb-4 overflow-hidden flex items-center justify-center group-hover:bg-white transition-colors">
                ${badge}
                <img
                    src="${p.image}"
                    alt="${p.name}"
                    loading="lazy"
                    class="w-[85%] h-[85%] object-contain group-hover:scale-105 transition-transform duration-500"
                >
            </div>

            <div class="flex-1 flex flex-col">
                <div class="text-[10px] md:text-xs text-gray-400 font-black uppercase tracking-widest mb-1.5">${p.category}</div>
                <h3 class="font-bold text-gray-800 text-sm md:text-base leading-snug mb-3 line-clamp-2 md:line-clamp-3 group-hover:text-emerald-700 transition-colors">${p.name}</h3>

                <div class="mt-auto flex flex-col gap-3 pt-3 border-t border-gray-50/50">
                    <span class="text-lg md:text-xl font-black text-gray-900 tracking-tight">${moneyZA(p.price)}</span>
                    <button
                        class="add-btn w-full bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/20 font-bold text-sm"
                        aria-label="Add ${p.name} to basket"
                    >
                        <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M12 5v14M5 12h14"/>
                        </svg>
                        <span>Add To Cart</span>
                    </button>
                </div>
            </div>
        `;

        card.querySelector('.add-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            onAdd(p);
        });
        
        // Make the whole card click trigger add to cart for better mobile tap target
        card.addEventListener('click', () => onAdd(p));

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
            <div class="w-16 h-16 bg-gray-50 rounded-xl p-1.5 shrink-0 flex items-center justify-center overflow-hidden border border-gray-100/60">
                <img src="${item.image}" alt="${item.name}" class="w-full h-full object-contain">
            </div>
            <div class="flex-1 min-w-0 pr-2">
                <h4 class="font-extrabold text-sm text-gray-900 truncate leading-tight">${item.name}</h4>
                <p class="text-xs text-emerald-700 font-black mt-1">${moneyZA(item.price)}</p>
            </div>
            <div class="flex flex-col items-end gap-2 shrink-0">
                <div class="flex items-center gap-1 bg-gray-50 rounded-lg p-1 h-8 border border-gray-200/50">
                    <button class="minus-btn w-6 h-full flex items-center justify-center text-gray-500 hover:bg-white hover:shadow-sm rounded transition font-bold text-base leading-none" aria-label="Decrease quantity">−</button>
                    <span class="text-xs font-bold w-5 text-center select-none cursor-default">${item.qty}</span>
                    <button class="plus-btn w-6 h-full flex items-center justify-center text-emerald-600 bg-emerald-50 hover:bg-emerald-100 hover:shadow-sm rounded transition font-bold text-base leading-none" aria-label="Increase quantity">+</button>
                </div>
                <span class="text-[10px] font-bold text-gray-400">Total: ${moneyZA(item.price * item.qty)}</span>
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