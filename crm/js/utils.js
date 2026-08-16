/**
 * Everyday Supply Co. - Business CRM & Inventory Hub (Production Real App)
 * Integrated with Firebase Authentication (Single Gateway), Cloud Firestore,
 * Real-time Sync, Multi-module CRUD, Automatic Stock Deduction, and Zero Simulation Data.
 */

// Utility Helpers
function byId(id) {
    return document.getElementById(id);
}

// Team member definitions
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function moneyZA(val) {
    const num = parseFloat(val) || 0;
    return 'R ' + num.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
}

function getTodayISOString() {
    const today = new Date();
    return today.toISOString().split('T')[0];
}

const FALLBACK_IMAGE = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%2394a3b8" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';

// WhatsApp Helper - Builds a click-to-chat URL with pre-filled message
function buildWhatsAppUrl(phone, customerName, context) {
    if (!phone) return '#';
    const cleanPhone = phone.replace(/\D/g, '');
    const intlPhone = cleanPhone.startsWith('0') ? '27' + cleanPhone.slice(1) : cleanPhone;
    const companyName = fbManager.branding ? fbManager.branding.companyName : 'our team';
    let message = '';
    if (context === 'greeting') {
        message = `Hi ${customerName || 'there'}, this is ${companyName}. How can we assist you today?`;
    } else if (context === 'followup-new-lead') {
        message = `Hi ${customerName || 'there'}, thanks for your interest in ${companyName}. I wanted to follow up on your inquiry. Are you available to chat?`;
    } else if (context === 'followup-repeat') {
        message = `Hi ${customerName || 'there'}, it's ${companyName}. Are you ready to place your next order? Let us know what you need.`;
    } else if (context === 'followup-credit') {
        message = `Hi ${customerName || 'there'}, this is ${companyName}. I'm reaching out regarding your outstanding balance. When would be convenient to arrange payment?`;
    } else {
        message = `Hi ${customerName || 'there'}, this is ${companyName}. Just checking in — is there anything you need?`;
    }
    return `https://wa.me/${intlPhone}?text=${encodeURIComponent(message)}`;
}

// Toast Notification Utility
function showToast(message, type = 'info') {
    const container = byId('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <svg class="icon icon-sm" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
        <span>${escapeHtml(message)}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// Non-blocking Custom Confirmation Modal Utility
let pendingConfirmCallback = null;

function showConfirmDialog(title, message, confirmBtnLabel, onConfirm) {
    if (byId('confirmModalTitle')) byId('confirmModalTitle').textContent = title;
    if (byId('confirmModalText')) byId('confirmModalText').textContent = message;

    const actionBtn = byId('confirmModalActionBtn');
    if (actionBtn) {
        actionBtn.textContent = confirmBtnLabel || 'Confirm';
        pendingConfirmCallback = onConfirm;
    }
    openModal('confirmModal');
}

// Delegated action listener for dynamic table buttons
document.addEventListener('click', (e) => {
    // Confirmation modal action button
    if (e.target && e.target.id === 'confirmModalActionBtn') {
        if (typeof pendingConfirmCallback === 'function') {
            const callback = pendingConfirmCallback;
            pendingConfirmCallback = null;
            closeModal('confirmModal');
            callback();
        } else {
            closeModal('confirmModal');
        }
        return;
    }

    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const action = btn.dataset.action;
    const id = btn.dataset.id;
    if (!action || !id) return;

    if (action === 'stock-in') {
        const prod = store.getProducts().find(p => p.id === id);
        if (prod) openStockInModal(prod.id, prod.name);
    } else if (action === 'correct-stock') {
        openStockCorrectionModal(id);
    } else if (action === 'edit-product') {
        openProductModal(true, id);
    } else if (action === 'delete-product') {
        store.deleteProduct(id);
    } else if (action === 'add-sale-cust') {
        openSaleModalForCustomer(id);
    } else if (action === 'edit-customer') {
        openCustomerModal(true, id);
    } else if (action === 'delete-customer') {
        store.deleteCustomer(id);
    } else if (action === 'complete-followup') {
        store.markFollowupComplete(id);
    } else if (action === 'delete-followup') {
        store.deleteFollowup(id);
    } else if (action === 'mark-sale-paid') {
        const sale = store.getSales().find(s => s.id === id);
        if (sale) store.updateSaleStatus(id, 'Paid', 'Processing');
    } else if (action === 'edit-sale-status') {
        openEditSaleStatusModal(id);
    } else if (action === 'delete-sale') {
        store.deleteSale(id);
    }
});

// App State Manager (Strict Real Data, No Simulation Seed Data)
