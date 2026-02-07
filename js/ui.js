import { moneyZA } from './utils.js';

export function renderProducts(gridEl, products, onAdd) {
    gridEl.innerHTML = '';

    if (products.length === 0) {
        gridEl.innerHTML = `<div class="col-span-full text-center text-gray-400 py-10">No products found matching your search.</div>`;
        return;
    }

    products.forEach(p => {
        const card = document.createElement('div');
        card.className = "product-card bg-white rounded-2xl p-4 shadow-sm hover:shadow-lg transition-shadow border border-gray-100 flex flex-col";
        
        const badgeHTML = p.badge 
            ? `<span class="absolute top-3 left-3 px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md ${p.badge.type === 'hot' ? 'bg-orange-100 text-orange-600' : 'bg-emerald-100 text-emerald-600'}">${p.badge.text}</span>` 
            : '';

        card.innerHTML = `
            <div class="relative img-container rounded-xl mb-4 overflow-hidden">
                ${badgeHTML}
                <img src="${p.image}" alt="${p.name}" class="w-full h-full object-contain hover:scale-105 transition-transform duration-300" loading="lazy">
            </div>
            
            <div class="flex-1 flex flex-col">
                <div class="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">${p.category}</div>
                <h3 class="font-bold text-gray-800 text-lg leading-tight mb-2">${p.name}</h3>
                
                <div class="mt-auto flex items-center justify-between pt-4 border-t border-gray-50">
                    <span class="text-xl font-extrabold text-emerald-700">${moneyZA(p.price)}</span>
                    <button class="add-btn bg-gray-900 hover:bg-emerald-600 text-white w-10 h-10 rounded-xl flex items-center justify-center transition-colors shadow-lg shadow-gray-200">
                        <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"></path></svg>
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
        containerEl.innerHTML = `<div class="text-center text-gray-400 mt-10">Your basket is empty.</div>`;
        return;
    }

    cart.forEach(item => {
        const row = document.createElement('div');
        row.className = "flex items-center gap-4 bg-white p-3 rounded-xl border border-gray-100 shadow-sm";
        
        row.innerHTML = `
            <div class="w-16 h-16 bg-gray-50 rounded-lg p-1 shrink-0">
                <img src="${item.image}" class="w-full h-full object-contain">
            </div>
            <div class="flex-1 min-w-0">
                <h4 class="font-bold text-sm text-gray-800 truncate">${item.name}</h4>
                <p class="text-xs text-gray-500">${moneyZA(item.price)}</p>
            </div>
            <div class="flex items-center gap-2 bg-gray-50 rounded-lg p-1">
                <button class="minus-btn w-6 h-6 flex items-center justify-center text-gray-500 hover:bg-white hover:shadow rounded-md transition">-</button>
                <span class="text-sm font-bold w-4 text-center">${item.qty}</span>
                <button class="plus-btn w-6 h-6 flex items-center justify-center text-gray-500 hover:bg-white hover:shadow rounded-md transition">+</button>
            </div>
        `;

        row.querySelector('.minus-btn').addEventListener('click', () => onUpdateQty(item.id, -1));
        row.querySelector('.plus-btn').addEventListener('click', () => onUpdateQty(item.id, 1));
        
        containerEl.appendChild(row);
    });
}

export function updateCartCount(el, count) {
    el.textContent = count;
    if (count > 0) {
        el.classList.remove('scale-0');
        el.classList.add('scale-100');
    } else {
        el.classList.add('scale-0');
        el.classList.remove('scale-100');
    }
}