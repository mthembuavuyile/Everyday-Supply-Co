/**
 * js/cart.js
 * BUSINESS LOGIC
 */

// Private state (not accessible directly from console)
let cart = [];
const WHATSAPP_NUMBER = "27783284393";

// Format currency
export const formatMoney = (amount) => {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);
};

// Add item to cart state
export const addItem = (product) => {
    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
        existingItem.qty++;
    } else {
        cart.push({ ...product, qty: 1 });
    }
    return cart; // return updated cart
};

// Get current cart
export const getCart = () => cart;

// Calculate Total
export const getCartTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.qty), 0);
};

// Generate WhatsApp Link
export const checkoutViaWhatsApp = () => {
    if (cart.length === 0) return;

    // 1. Build the message string
    let message = "*New Order from Essentials Market:*\n\n";
    
    cart.forEach(item => {
        message += `• ${item.qty}x ${item.name} (${formatMoney(item.price * item.qty)})\n`;
    });

    const total = formatMoney(getCartTotal());
    message += `\n*TOTAL: ${total}*`;
    message += `\n\nPlease confirm availability and delivery details.`;

    // 2. Encode for URL
    const encodedMessage = encodeURIComponent(message);
    
    // 3. Open WhatsApp
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`, '_blank');
};
