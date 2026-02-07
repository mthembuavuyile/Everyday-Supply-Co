const STORAGE_KEY = 'everyday_supply_cart_v1';

export function loadCart() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

export function saveCart(cart) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
}

export function addToCart(cart, product) {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
        existing.qty += 1;
    } else {
        cart.push({ ...product, qty: 1 });
    }
    return [...cart]; // Return new reference to trigger updates
}

export function updateQty(cart, id, delta) {
    return cart.map(item => {
        if (item.id === id) {
            return { ...item, qty: Math.max(0, item.qty + delta) };
        }
        return item;
    }).filter(item => item.qty > 0);
}

export function getCartTotal(cart) {
    return cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
}

export function getCartCount(cart) {
    return cart.reduce((sum, item) => sum + item.qty, 0);
}