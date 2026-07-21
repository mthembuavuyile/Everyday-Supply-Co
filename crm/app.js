/**
 * Everyday Supply Co. - Business CRM Engine v2 (Production Real App)
 * Integrated with Firebase Cloud Firestore, Firebase Authentication,
 * Offline Persistence, Real-time Sync, and Full Multi-module CRUD.
 */

// Initial Seed Data for Everyday Supply Co.
const SEED_DATA = {
    products: [
        { id: 'PROD-101', name: 'Moreson Eggs - Box 360 Eggs', category: 'Pantry', price: 380.99, openingStock: 100, stockIn: 50, stockOut: 35, minStock: 25 },
        { id: 'PROD-102', name: 'Sunfoods Mini Shortbread Biscuits', category: 'Pantry', price: 164.99, openingStock: 60, stockIn: 30, stockOut: 40, minStock: 15 },
        { id: 'PROD-103', name: 'Sunfoods Hello Cookie\'s', category: 'Pantry', price: 158.75, openingStock: 50, stockIn: 20, stockOut: 42, minStock: 15 },
        { id: 'PROD-104', name: 'Sunfoods Walnut Cake', category: 'Pantry', price: 159.99, openingStock: 40, stockIn: 20, stockOut: 30, minStock: 10 },
        { id: 'PROD-105', name: 'Hommi Noodles Spicy Beef Flavour', category: 'Noodles', price: 149.99, openingStock: 120, stockIn: 60, stockOut: 130, minStock: 30 },
        { id: 'PROD-106', name: 'Sunfoods Noodles Beef Flavour', category: 'Noodles', price: 149.99, openingStock: 100, stockIn: 40, stockOut: 85, minStock: 30 },
        { id: 'PROD-107', name: 'Instant Noodles Hot & Spicy Flavour', category: 'Noodles', price: 169.25, openingStock: 80, stockIn: 40, stockOut: 75, minStock: 20 },
        { id: 'PROD-108', name: 'Hommi Noodles Cheese Flavour', category: 'Noodles', price: 169.75, openingStock: 75, stockIn: 25, stockOut: 60, minStock: 20 }
    ],
    customers: [
        { id: 'CUST-1001', name: 'Sipho Ndlovu', phone: '0821234567', area: 'Soweto, Johannesburg', status: 'Repeat', dateAdded: '2026-06-10', lastPurchase: '2026-07-18', notes: 'Prefers Moreson eggs boxes in bulk on Mondays.' },
        { id: 'CUST-1002', name: 'Nomsa Dlamini', phone: '0739876543', area: 'Sandton, Johannesburg', status: 'Active', dateAdded: '2026-06-15', lastPurchase: '2026-07-19', notes: 'Buys Sunfoods biscuits and cakes for local tuckshop.' },
        { id: 'CUST-1003', name: 'Thabo Mokoena', phone: '0614567890', area: 'Randburg, Johannesburg', status: 'Repeat', dateAdded: '2026-05-20', lastPurchase: '2026-07-15', notes: 'Regular Hommi noodles wholesale buyer.' },
        { id: 'CUST-1004', name: 'Zanele Khumalo', phone: '0842345678', area: 'Midrand, Johannesburg', status: 'Lead', dateAdded: '2026-07-02', lastPurchase: '', notes: 'Inquired on WhatsApp about delivery prices for 5 boxes of eggs.' },
        { id: 'CUST-1005', name: 'Kagiso Molefe', phone: '0783456789', area: 'Roodepoort, Johannesburg', status: 'Inactive', dateAdded: '2026-04-12', lastPurchase: '2026-05-01', notes: 'Needs follow-up for repeat order discount.' }
    ],
    sales: [
        { id: 'SALE-101', date: '2026-07-19', customerId: 'CUST-1002', customerName: 'Nomsa Dlamini', productId: 'PROD-101', productName: 'Moreson Eggs - Box 360 Eggs', quantity: 5, unitPrice: 380.99, total: 1904.95, paymentStatus: 'Paid', deliveryStatus: 'Delivered' },
        { id: 'SALE-102', date: '2026-07-18', customerId: 'CUST-1001', customerName: 'Sipho Ndlovu', productId: 'PROD-105', productName: 'Hommi Noodles Spicy Beef Flavour', quantity: 10, unitPrice: 149.99, total: 1499.90, paymentStatus: 'Credit', deliveryStatus: 'Delivered' },
        { id: 'SALE-103', date: '2026-07-15', customerId: 'CUST-1003', customerName: 'Thabo Mokoena', productId: 'PROD-107', productName: 'Instant Noodles Hot & Spicy Flavour', quantity: 8, unitPrice: 169.25, total: 1354.00, paymentStatus: 'Paid', deliveryStatus: 'Delivered' }
    ],
    followups: [
        { id: 'FOL-101', date: getTodayISOString(), customerId: 'CUST-1004', customerName: 'Zanele Khumalo', phone: '0842345678', reason: 'New lead', status: 'Pending', notes: 'Send current bulk price list for Moreson Eggs.' },
        { id: 'FOL-102', date: getTodayISOString(), customerId: 'CUST-1001', customerName: 'Sipho Ndlovu', phone: '0821234567', reason: 'Credit', status: 'Pending', notes: 'Check payment for 10 boxes of Hommi noodles (SALE-102).' },
        { id: 'FOL-103', date: '2026-07-22', customerId: 'CUST-1005', customerName: 'Kagiso Molefe', phone: '0783456789', reason: 'Repeat order', status: 'Pending', notes: 'Offer free delivery promotion for 3+ boxes.' }
    ]
};

function getTodayISOString() {
    const today = new Date();
    return today.toISOString().split('T')[0];
}

// Modern Toast Notification Utility
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
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

// App State Management (Firestore + Local Sync)
class CRMStore {
    constructor() {
        this.STORAGE_KEY = 'everyday_supply_crm_v1';
        this.data = this.loadLocalData();
        this.unsubscribers = [];
        this.isCloudConnected = false;
        this.initFirestoreSync();
    }

    loadLocalData() {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                console.error("Error parsing stored CRM data, loading seed data", e);
            }
        }
        return JSON.parse(JSON.stringify(SEED_DATA));
    }

    saveLocalData() {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data));
    }

    resetDemoData() {
        this.data = JSON.parse(JSON.stringify(SEED_DATA));
        this.saveLocalData();
        renderAllSections();
        showToast("Reset to default seed data successfully.", "success");
    }

    initFirestoreSync() {
        if (!fbManager.init()) {
            this.updateConnBadge(false, "Local Mode");
            return;
        }

        const db = fbManager.db;

        // Real-time Firestore Listeners
        const collections = ['customers', 'products', 'sales', 'followups'];
        
        collections.forEach(col => {
            const unsub = db.collection(col).onSnapshot(snapshot => {
                const isLive = snapshot.metadata && !snapshot.metadata.fromCache;
                if (isLive) {
                    this.isCloudConnected = true;
                    this.updateConnBadge(true, "Cloud Connected");
                } else {
                    this.updateConnBadge(false, "Local Offline");
                }

                if (snapshot.empty && this.data[col].length > 0 && isLive) {
                    // Seed initial data to Firestore if collection is empty
                    this.seedCollectionToFirestore(col);
                } else {
                    const items = [];
                    snapshot.forEach(doc => {
                        items.push({ id: doc.id, ...doc.data() });
                    });
                    if (items.length > 0) {
                        this.data[col] = items;
                        this.saveLocalData();
                        renderAllSections();
                    }
                }
            }, err => {
                this.isCloudConnected = false;
                console.warn(`Firestore sync note for ${col}: operating in local offline storage mode (${err.code || err.message})`);
                this.updateConnBadge(false, "Local Offline");
            });
            this.unsubscribers.push(unsub);
        });
    }

    async seedCollectionToFirestore(colName) {
        if (!fbManager.db || !this.isCloudConnected) return;
        const db = fbManager.db;
        const batch = db.batch();
        const items = this.data[colName] || [];

        items.forEach(item => {
            const docRef = db.collection(colName).doc(item.id);
            batch.set(docRef, item);
        });

        try {
            await batch.commit();
            console.log(`Successfully seeded ${colName} to Cloud Firestore.`);
        } catch (e) {
            console.warn(`Could not seed ${colName} to Firestore:`, e.message);
        }
    }

    updateConnBadge(isOnline, label) {
        const dot = document.getElementById('firebaseConnDot');
        const text = document.getElementById('firebaseConnText');
        if (dot && text) {
            dot.style.background = isOnline ? 'var(--success)' : 'var(--warning)';
            text.textContent = label;
        }
    }

    // CUSTOMERS CRUD
    getCustomers() {
        return this.data.customers;
    }

    addCustomer(customer) {
        customer.id = 'CUST-' + (1000 + this.data.customers.length + 1);
        customer.dateAdded = getTodayISOString();
        customer.lastPurchase = customer.lastPurchase || '';
        this.data.customers.unshift(customer);
        this.saveLocalData();

        if (fbManager.db && this.isCloudConnected) {
            fbManager.db.collection('customers').doc(customer.id).set(customer).catch(e => console.warn("Cloud write deferred:", e.message));
        }
        showToast(`Customer ${customer.name} added successfully.`, 'success');
        return customer;
    }

    updateCustomer(id, updatedFields) {
        const index = this.data.customers.findIndex(c => c.id === id);
        if (index !== -1) {
            this.data.customers[index] = { ...this.data.customers[index], ...updatedFields };
            this.saveLocalData();

            if (fbManager.db && this.isCloudConnected) {
                fbManager.db.collection('customers').doc(id).update(updatedFields).catch(e => console.warn("Cloud update deferred:", e.message));
            }
            showToast(`Customer updated.`, 'info');
        }
    }

    deleteCustomer(id) {
        const cust = this.data.customers.find(c => c.id === id);
        if (confirm(`Are you sure you want to delete customer "${cust ? cust.name : id}"?`)) {
            this.data.customers = this.data.customers.filter(c => c.id !== id);
            this.saveLocalData();

            if (fbManager.db && this.isCloudConnected) {
                fbManager.db.collection('customers').doc(id).delete().catch(e => console.warn("Cloud delete deferred:", e.message));
            }
            showToast(`Customer deleted.`, 'warning');
            renderCustomers();
            renderDashboard();
        }
    }

    // PRODUCTS & INVENTORY CRUD
    getProducts() {
        return this.data.products.map(p => {
            const currentStock = (parseInt(p.openingStock) || 0) + (parseInt(p.stockIn) || 0) - (parseInt(p.stockOut) || 0);
            const needsRestock = currentStock <= (parseInt(p.minStock) || 10);
            return { ...p, currentStock, needsRestock };
        });
    }

    addProduct(prod) {
        prod.id = 'PROD-' + (100 + this.data.products.length + 1);
        prod.openingStock = parseInt(prod.openingStock) || 0;
        prod.stockIn = 0;
        prod.stockOut = 0;
        prod.minStock = parseInt(prod.minStock) || 10;
        prod.price = parseFloat(prod.price) || 0;
        
        this.data.products.push(prod);
        this.saveLocalData();

        if (fbManager.db && this.isCloudConnected) {
            fbManager.db.collection('products').doc(prod.id).set(prod).catch(e => console.warn("Cloud write deferred:", e.message));
        }
        showToast(`Product ${prod.name} added to inventory.`, 'success');
        return prod;
    }

    deleteProduct(id) {
        const prod = this.data.products.find(p => p.id === id);
        if (confirm(`Are you sure you want to delete product "${prod ? prod.name : id}"?`)) {
            this.data.products = this.data.products.filter(p => p.id !== id);
            this.saveLocalData();

            if (fbManager.db && this.isCloudConnected) {
                fbManager.db.collection('products').doc(id).delete().catch(e => console.warn("Cloud delete deferred:", e.message));
            }
            showToast(`Product removed from inventory.`, 'warning');
            renderStock();
            renderDashboard();
        }
    }

    addStockIn(productId, qty) {
        const prod = this.data.products.find(p => p.id === productId);
        if (prod) {
            const addedQty = parseInt(qty) || 0;
            prod.stockIn = (parseInt(prod.stockIn) || 0) + addedQty;
            this.saveLocalData();

            if (fbManager.db && this.isCloudConnected) {
                fbManager.db.collection('products').doc(productId).update({ stockIn: prod.stockIn }).catch(e => console.warn("Cloud update deferred:", e.message));
            }
            showToast(`Received +${addedQty} boxes of ${prod.name}`, 'success');
        }
    }

    // SALES MODULE CRUD
    getSales() {
        return this.data.sales;
    }

    recordSale(saleData) {
        const customer = this.data.customers.find(c => c.id === saleData.customerId);
        const product = this.data.products.find(p => p.id === saleData.productId);

        const qty = parseInt(saleData.quantity) || 1;
        const price = parseFloat(saleData.unitPrice) || (product ? parseFloat(product.price) : 0);
        const total = qty * price;

        const sale = {
            id: 'SALE-' + (100 + this.data.sales.length + 1),
            date: saleData.date || getTodayISOString(),
            customerId: saleData.customerId,
            customerName: customer ? customer.name : 'Unknown Customer',
            productId: saleData.productId,
            productName: product ? product.name : 'Custom Item',
            quantity: qty,
            unitPrice: price,
            total: total,
            paymentStatus: saleData.paymentStatus || 'Paid',
            deliveryStatus: saleData.deliveryStatus || 'Pending'
        };

        this.data.sales.unshift(sale);

        // Auto deduct stock out
        if (product) {
            product.stockOut = (parseInt(product.stockOut) || 0) + qty;
            if (fbManager.db && this.isCloudConnected) {
                fbManager.db.collection('products').doc(product.id).update({ stockOut: product.stockOut }).catch(e => console.warn("Cloud update deferred:", e.message));
            }
        }

        // Update customer activity
        if (customer) {
            customer.lastPurchase = sale.date;
            if (customer.status === 'Lead' || customer.status === 'Inactive') {
                customer.status = 'Active';
            }
            if (fbManager.db && this.isCloudConnected) {
                fbManager.db.collection('customers').doc(customer.id).update({
                    lastPurchase: customer.lastPurchase,
                    status: customer.status
                }).catch(e => console.warn("Cloud update deferred:", e.message));
            }
        }

        this.saveLocalData();

        if (fbManager.db && this.isCloudConnected) {
            fbManager.db.collection('sales').doc(sale.id).set(sale).catch(e => console.warn("Cloud write deferred:", e.message));
        }
        showToast(`Order ${sale.id} recorded (${qty} boxes).`, 'success');
        return sale;
    }

    updateSaleStatus(saleId, paymentStatus, deliveryStatus) {
        const sale = this.data.sales.find(s => s.id === saleId);
        if (sale) {
            const updates = {};
            if (paymentStatus) { sale.paymentStatus = paymentStatus; updates.paymentStatus = paymentStatus; }
            if (deliveryStatus) { sale.deliveryStatus = deliveryStatus; updates.deliveryStatus = deliveryStatus; }
            this.saveLocalData();

            if (fbManager.db && this.isCloudConnected) {
                fbManager.db.collection('sales').doc(saleId).update(updates).catch(e => console.warn("Cloud update deferred:", e.message));
            }
            showToast(`Order ${saleId} status updated.`, 'info');
        }
    }

    deleteSale(id) {
        if (confirm(`Are you sure you want to delete order ${id}?`)) {
            this.data.sales = this.data.sales.filter(s => s.id !== id);
            this.saveLocalData();

            if (fbManager.db && this.isCloudConnected) {
                fbManager.db.collection('sales').doc(id).delete().catch(e => console.warn("Cloud delete deferred:", e.message));
            }
            showToast(`Order ${id} deleted.`, 'warning');
            renderSales();
            renderDashboard();
        }
    }

    // FOLLOW-UPS MODULE CRUD
    getFollowups() {
        return this.data.followups;
    }

    addFollowup(fol) {
        const customer = this.data.customers.find(c => c.id === fol.customerId);
        fol.id = 'FOL-' + (100 + this.data.followups.length + 1);
        fol.customerName = customer ? customer.name : 'Unknown Customer';
        fol.phone = customer ? customer.phone : fol.phone || '';
        fol.status = 'Pending';

        this.data.followups.unshift(fol);
        this.saveLocalData();

        if (fbManager.db && this.isCloudConnected) {
            fbManager.db.collection('followups').doc(fol.id).set(fol).catch(e => console.warn("Cloud write deferred:", e.message));
        }
        showToast(`Follow-up scheduled for ${fol.customerName}.`, 'success');
    }

    toggleFollowupStatus(id) {
        const fol = this.data.followups.find(f => f.id === id);
        if (fol) {
            fol.status = fol.status === 'Pending' ? 'Completed' : 'Pending';
            this.saveLocalData();

            if (fbManager.db && this.isCloudConnected) {
                fbManager.db.collection('followups').doc(id).update({ status: fol.status }).catch(e => console.warn("Cloud update deferred:", e.message));
            }
            showToast(`Follow-up marked as ${fol.status}.`, 'info');
        }
    }

    deleteFollowup(id) {
        if (confirm(`Delete this follow-up reminder?`)) {
            this.data.followups = this.data.followups.filter(f => f.id !== id);
            this.saveLocalData();

            if (fbManager.db && this.isCloudConnected) {
                fbManager.db.collection('followups').doc(id).delete().catch(e => console.warn("Cloud delete deferred:", e.message));
            }
            showToast(`Follow-up removed.`, 'warning');
            renderFollowups();
            renderDashboard();
        }
    }
}

// Global Store Instance
const store = new CRMStore();

// Helper Formatting & Sanitizing Functions
function formatCurrency(val) {
    return 'R ' + parseFloat(val || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function sanitizeWhatsAppPhone(phone) {
    if (!phone) return '';
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
        cleaned = '27' + cleaned.substring(1);
    }
    return cleaned;
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// DOM Initialization
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initModals();
    initAuthListeners();
    renderAllSections();
});

// Navigation Controller
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item, .bottom-nav-item');
    const sections = document.querySelectorAll('.page-section');
    const sidebar = document.getElementById('sidebar');
    const menuToggle = document.getElementById('menuToggle');
    const mobileOverlay = document.getElementById('mobileOverlay');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetSection = item.getAttribute('data-section');

            document.querySelectorAll('.nav-item, .bottom-nav-item').forEach(el => {
                if (el.getAttribute('data-section') === targetSection) {
                    el.classList.add('active');
                } else {
                    el.classList.remove('active');
                }
            });

            sections.forEach(sec => {
                if (sec.id === targetSection) {
                    sec.classList.add('active');
                } else {
                    sec.classList.remove('active');
                }
            });

            sidebar.classList.remove('open');
            mobileOverlay.classList.remove('active');
            renderSection(targetSection);
        });
    });

    if (menuToggle && mobileOverlay) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
            mobileOverlay.classList.toggle('active');
        });

        mobileOverlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            mobileOverlay.classList.remove('active');
        });
    }
}

function renderAllSections() {
    renderDashboard();
    renderCustomers();
    renderSales();
    renderFollowups();
    renderStock();
    renderReports();
}

function renderSection(sectionId) {
    switch (sectionId) {
        case 'dashboard': renderDashboard(); break;
        case 'customers': renderCustomers(); break;
        case 'sales': renderSales(); break;
        case 'followups': renderFollowups(); break;
        case 'stock': renderStock(); break;
        case 'reports': renderReports(); break;
    }
}

// DASHBOARD MODULE RENDERER
function renderDashboard() {
    const customers = store.getCustomers();
    const sales = store.getSales();
    const products = store.getProducts();
    const followups = store.getFollowups();

    const totalCustomers = customers.length;
    const activeCustomers = customers.filter(c => c.status === 'Active' || c.status === 'Repeat').length;
    const boxesSoldThisWeek = sales.reduce((sum, s) => sum + (parseInt(s.quantity) || 0), 0);
    const totalCurrentStock = products.reduce((sum, p) => sum + p.currentStock, 0);

    const today = getTodayISOString();
    const followupsDueToday = followups.filter(f => f.status === 'Pending' && f.date <= today).length;

    const totalRevenue = sales.filter(s => s.paymentStatus === 'Paid').reduce((sum, s) => sum + parseFloat(s.total || 0), 0);
    const totalCredit = sales.filter(s => s.paymentStatus === 'Credit').reduce((sum, s) => sum + parseFloat(s.total || 0), 0);

    document.getElementById('dashTotalCustomers').textContent = totalCustomers;
    document.getElementById('dashActiveCustomers').textContent = activeCustomers;
    document.getElementById('dashBoxesSold').textContent = boxesSoldThisWeek;
    document.getElementById('dashCurrentStock').textContent = totalCurrentStock;
    document.getElementById('dashFollowupsDue').textContent = followupsDueToday;
    document.getElementById('dashTotalRevenue').textContent = formatCurrency(totalRevenue);
    document.getElementById('dashOutstandingCredit').textContent = formatCurrency(totalCredit);

    const folBadge = document.getElementById('followupBadge');
    if (folBadge) {
        folBadge.textContent = followupsDueToday;
        folBadge.style.display = followupsDueToday > 0 ? 'inline-flex' : 'none';
    }

    const recentTableBody = document.getElementById('dashRecentSalesTable');
    if (recentTableBody) {
        const recentSales = sales.slice(0, 5);
        if (recentSales.length === 0) {
            recentTableBody.innerHTML = `<tr><td colspan="7" class="empty-state">No recent sales recorded yet.</td></tr>`;
        } else {
            recentTableBody.innerHTML = recentSales.map(s => `
                <tr>
                    <td><strong>${s.id}</strong></td>
                    <td>${s.date}</td>
                    <td>${escapeHtml(s.customerName)}</td>
                    <td>${escapeHtml(s.productName)}</td>
                    <td><strong>${s.quantity}</strong> boxes</td>
                    <td><strong>${formatCurrency(s.total)}</strong></td>
                    <td><span class="badge badge-${(s.paymentStatus || 'paid').toLowerCase()}">${s.paymentStatus}</span></td>
                </tr>
            `).join('');
        }
    }

    const lowStockAlertContainer = document.getElementById('dashLowStockAlerts');
    if (lowStockAlertContainer) {
        const restockItems = products.filter(p => p.needsRestock);
        if (restockItems.length > 0) {
            lowStockAlertContainer.style.display = 'block';
            lowStockAlertContainer.innerHTML = `
                <div style="background: var(--warning-light); border: 1px solid var(--warning); padding: 14px 18px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <svg class="icon icon-lg" style="color: var(--warning)" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4m0 4h.01"></path></svg>
                        <div>
                            <strong style="color: var(--slate-900); font-size: 14px;">Restock Warning! ${restockItems.length} product(s) below minimum stock level.</strong>
                            <p style="font-size: 12px; color: var(--slate-700); margin-top: 2px;">
                                ${restockItems.map(p => `<strong>${escapeHtml(p.name)}</strong> (${p.currentStock} left, Min: ${p.minStock})`).join(' · ')}
                            </p>
                        </div>
                    </div>
                    <button class="btn btn-sm btn-secondary" onclick="switchToSection('stock')">View Stock</button>
                </div>
            `;
        } else {
            lowStockAlertContainer.style.display = 'none';
        }
    }
}

// CUSTOMER MODULE RENDERER
function renderCustomers() {
    const customers = store.getCustomers();
    const filterStatus = document.getElementById('customerFilterStatus')?.value || 'all';
    const searchQuery = document.getElementById('customerSearchInput')?.value.toLowerCase() || '';

    let filtered = customers.filter(c => {
        const matchesStatus = filterStatus === 'all' || c.status.toLowerCase() === filterStatus.toLowerCase();
        const matchesSearch = c.name.toLowerCase().includes(searchQuery) ||
                              c.phone.includes(searchQuery) ||
                              c.area.toLowerCase().includes(searchQuery);
        return matchesStatus && matchesSearch;
    });

    const tbody = document.getElementById('customersTableBody');
    if (!tbody) return;

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="empty-state">No customers found.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(c => {
        const waPhone = sanitizeWhatsAppPhone(c.phone);
        const waLink = waPhone ? `https://wa.me/${waPhone}?text=${encodeURIComponent('Hi ' + c.name + ', following up from Everyday Supply Co.')}` : '#';

        return `
            <tr>
                <td><strong>${c.id}</strong></td>
                <td><strong style="color: var(--slate-900);">${escapeHtml(c.name)}</strong></td>
                <td>
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <span>${escapeHtml(c.phone)}</span>
                        ${waPhone ? `<a href="${waLink}" target="_blank" class="btn btn-sm btn-whatsapp" style="padding: 2px 6px;" title="Chat on WhatsApp">
                            <svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                        </a>` : ''}
                    </div>
                </td>
                <td>${escapeHtml(c.area)}</td>
                <td><span class="badge badge-${(c.status || 'lead').toLowerCase()}">${c.status}</span></td>
                <td>${c.dateAdded}</td>
                <td>${c.lastPurchase ? c.lastPurchase : '<span style="color:var(--slate-400)">None</span>'}</td>
                <td style="text-align: right;">
                    <div style="display: inline-flex; gap: 4px;">
                        <button class="btn btn-sm btn-secondary" onclick="openSaleModalForCustomer('${c.id}')" title="Record Sale">+ Sale</button>
                        <button class="btn btn-sm btn-outline" onclick="openFollowupModalForCustomer('${c.id}')" title="Schedule Followup">+ Followup</button>
                        <button class="btn btn-sm btn-secondary btn-icon-only" onclick="openEditCustomerModal('${c.id}')" title="Edit Customer">
                            <svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                        <button class="btn btn-sm btn-danger-outline btn-icon-only" onclick="store.deleteCustomer('${c.id}')" title="Delete Customer">
                            <svg class="icon icon-sm" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// SALES MODULE RENDERER
function renderSales() {
    const sales = store.getSales();
    const filterPayment = document.getElementById('salesFilterPayment')?.value || 'all';
    const searchQuery = document.getElementById('salesSearchInput')?.value.toLowerCase() || '';

    let filtered = sales.filter(s => {
        const matchesPayment = filterPayment === 'all' || s.paymentStatus.toLowerCase() === filterPayment.toLowerCase();
        const matchesSearch = (s.customerName || '').toLowerCase().includes(searchQuery) ||
                              (s.productName || '').toLowerCase().includes(searchQuery) ||
                              (s.id || '').toLowerCase().includes(searchQuery);
        return matchesPayment && matchesSearch;
    });

    const tbody = document.getElementById('salesTableBody');
    if (!tbody) return;

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="empty-state">No sales records found.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(s => `
        <tr>
            <td><strong>${s.id}</strong></td>
            <td>${s.date}</td>
            <td><strong>${escapeHtml(s.customerName)}</strong></td>
            <td>${escapeHtml(s.productName)}</td>
            <td><strong>${s.quantity}</strong> boxes</td>
            <td>${formatCurrency(s.unitPrice)}</td>
            <td><strong style="color: var(--slate-900);">${formatCurrency(s.total)}</strong></td>
            <td>
                <select class="filter-select" style="padding: 2px 6px; font-size: 11px;" onchange="updateSalePaymentStatus('${s.id}', this.value)">
                    <option value="Paid" ${s.paymentStatus === 'Paid' ? 'selected' : ''}>Paid</option>
                    <option value="Credit" ${s.paymentStatus === 'Credit' ? 'selected' : ''}>Credit</option>
                </select>
            </td>
            <td>
                <select class="filter-select" style="padding: 2px 6px; font-size: 11px;" onchange="updateSaleDeliveryStatus('${s.id}', this.value)">
                    <option value="Pending" ${s.deliveryStatus === 'Pending' ? 'selected' : ''}>Pending</option>
                    <option value="Out for Delivery" ${s.deliveryStatus === 'Out for Delivery' ? 'selected' : ''}>Out for Delivery</option>
                    <option value="Delivered" ${s.deliveryStatus === 'Delivered' ? 'selected' : ''}>Delivered</option>
                    <option value="Cancelled" ${s.deliveryStatus === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                </select>
            </td>
            <td style="text-align: right;">
                <button class="btn btn-sm btn-danger-outline btn-icon-only" onclick="store.deleteSale('${s.id}')" title="Delete Sale Record">
                    <svg class="icon icon-sm" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
            </td>
        </tr>
    `).join('');
}

// FOLLOW-UP MODULE RENDERER
function renderFollowups() {
    const followups = store.getFollowups();
    const filterStatus = document.getElementById('followupFilterStatus')?.value || 'all';

    let filtered = followups.filter(f => {
        if (filterStatus === 'all') return true;
        return f.status.toLowerCase() === filterStatus.toLowerCase();
    });

    const container = document.getElementById('followupsGrid');
    if (!container) return;

    if (filtered.length === 0) {
        container.innerHTML = `<div class="empty-state" style="grid-column: 1 / -1;">No follow-up items found.</div>`;
        return;
    }

    const today = getTodayISOString();

    container.innerHTML = filtered.map(f => {
        const isToday = f.date === today;
        const isOverdue = f.date < today && f.status === 'Pending';
        const waPhone = sanitizeWhatsAppPhone(f.phone);
        const waLink = waPhone ? `https://wa.me/${waPhone}?text=${encodeURIComponent('Hi ' + f.customerName + ', contacting you regarding Everyday Supply Co order / inquiry.')}` : '#';

        return `
            <div class="card" style="margin-bottom: 0; border-left: 4px solid ${f.status === 'Completed' ? 'var(--success)' : isOverdue ? 'var(--danger)' : 'var(--primary)'}">
                <div class="card-header" style="margin-bottom: 10px; padding-bottom: 8px;">
                    <span class="badge ${f.status === 'Completed' ? 'badge-active' : isOverdue ? 'badge-restock' : 'badge-lead'}">
                        ${f.status === 'Completed' ? 'Completed' : isOverdue ? 'Overdue' : isToday ? 'Due Today' : f.date}
                    </span>
                    <span class="badge badge-repeat">${escapeHtml(f.reason)}</span>
                </div>
                <h4 style="font-size: 15px; font-weight: 700; color: var(--slate-900); margin-bottom: 4px;">${escapeHtml(f.customerName)}</h4>
                <p style="font-size: 12px; color: var(--slate-500); margin-bottom: 12px;">Phone: ${escapeHtml(f.phone)}</p>
                <div style="background: var(--slate-50); padding: 10px; border-radius: var(--radius-md); font-size: 13px; color: var(--slate-700); margin-bottom: 14px;">
                    ${escapeHtml(f.notes || 'No detailed notes provided.')}
                </div>
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                    <div style="display: flex; gap: 6px;">
                        <button class="btn btn-sm ${f.status === 'Completed' ? 'btn-secondary' : 'btn-primary'}" onclick="toggleFollowup('${f.id}')">
                            <svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"></path></svg>
                            ${f.status === 'Completed' ? 'Mark Pending' : 'Mark Completed'}
                        </button>
                        ${waPhone ? `<a href="${waLink}" target="_blank" class="btn btn-sm btn-whatsapp">
                            <svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                            WhatsApp
                        </a>` : ''}
                    </div>
                    <button class="btn btn-sm btn-danger-outline btn-icon-only" onclick="store.deleteFollowup('${f.id}')" title="Delete Followup">
                        <svg class="icon icon-sm" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// STOCK MODULE RENDERER
function renderStock() {
    const products = store.getProducts();
    const tbody = document.getElementById('stockTableBody');
    if (!tbody) return;

    if (products.length === 0) {
        tbody.innerHTML = `<tr><td colspan="11" class="empty-state">No products registered in inventory.</td></tr>`;
        return;
    }

    tbody.innerHTML = products.map(p => `
        <tr>
            <td><strong>${p.id}</strong></td>
            <td><strong style="color: var(--slate-900);">${escapeHtml(p.name)}</strong></td>
            <td><span class="badge badge-lead">${escapeHtml(p.category)}</span></td>
            <td>${formatCurrency(p.price)}</td>
            <td>${p.openingStock}</td>
            <td style="color: var(--success); font-weight: 600;">+${p.stockIn}</td>
            <td style="color: var(--danger); font-weight: 600;">-${p.stockOut}</td>
            <td><strong style="font-size: 15px; color: ${p.needsRestock ? 'var(--danger)' : 'var(--slate-900)'}">${p.currentStock}</strong></td>
            <td>${p.minStock}</td>
            <td>
                ${p.needsRestock ? 
                    `<span class="badge badge-restock">Restock Warning</span>` : 
                    `<span class="badge badge-ok">Sufficient</span>`
                }
            </td>
            <td style="text-align: right;">
                <div style="display: inline-flex; gap: 4px;">
                    <button class="btn btn-sm btn-secondary" onclick="openStockInModal('${p.id}', '${escapeHtml(p.name)}')">+ Stock In</button>
                    <button class="btn btn-sm btn-danger-outline btn-icon-only" onclick="store.deleteProduct('${p.id}')" title="Delete Product">
                        <svg class="icon icon-sm" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// REPORTS MODULE RENDERER
function renderReports() {
    const sales = store.getSales();
    const customers = store.getCustomers();

    const totalBoxesSold = sales.reduce((sum, s) => sum + (parseInt(s.quantity) || 0), 0);
    const totalRevenue = sales.filter(s => s.paymentStatus === 'Paid').reduce((sum, s) => sum + parseFloat(s.total || 0), 0);
    const outstandingCredit = sales.filter(s => s.paymentStatus === 'Credit').reduce((sum, s) => sum + parseFloat(s.total || 0), 0);
    
    const newCustomersCount = customers.filter(c => c.status === 'Lead' || c.status === 'Active').length;
    const repeatCustomersCount = customers.filter(c => c.status === 'Repeat').length;

    document.getElementById('repTotalBoxes').textContent = totalBoxesSold;
    document.getElementById('repTotalRevenue').textContent = formatCurrency(totalRevenue);
    document.getElementById('repOutstandingCredit').textContent = formatCurrency(outstandingCredit);
    document.getElementById('repNewCustomers').textContent = newCustomersCount;
    document.getElementById('repRepeatCustomers').textContent = repeatCustomersCount;

    const topProdTbody = document.getElementById('repTopProductsBody');
    if (topProdTbody) {
        const prodSalesMap = {};
        sales.forEach(s => {
            const name = s.productName || 'Unknown Product';
            if (!prodSalesMap[name]) {
                prodSalesMap[name] = { boxes: 0, revenue: 0 };
            }
            prodSalesMap[name].boxes += (parseInt(s.quantity) || 0);
            prodSalesMap[name].revenue += parseFloat(s.total || 0);
        });

        const sortedProds = Object.keys(prodSalesMap).map(k => ({
            name: k,
            boxes: prodSalesMap[k].boxes,
            revenue: prodSalesMap[k].revenue
        })).sort((a, b) => b.boxes - a.boxes);

        topProdTbody.innerHTML = sortedProds.map(item => `
            <tr>
                <td><strong>${escapeHtml(item.name)}</strong></td>
                <td><strong>${item.boxes}</strong> boxes</td>
                <td>${formatCurrency(item.revenue)}</td>
            </tr>
        `).join('');
    }
}

// MODALS AND FORMS CONTROLLER
function initModals() {
    // Add New Customer
    const customerForm = document.getElementById('customerForm');
    if (customerForm) {
        customerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(customerForm);
            const newCust = {
                name: formData.get('name'),
                phone: formData.get('phone'),
                area: formData.get('area'),
                status: formData.get('status'),
                notes: formData.get('notes')
            };
            store.addCustomer(newCust);
            closeModal('customerModal');
            customerForm.reset();
            renderCustomers();
            renderDashboard();
        });
    }

    // Edit Customer
    const editCustomerForm = document.getElementById('editCustomerForm');
    if (editCustomerForm) {
        editCustomerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(editCustomerForm);
            const id = formData.get('id');
            const updated = {
                name: formData.get('name'),
                phone: formData.get('phone'),
                area: formData.get('area'),
                status: formData.get('status'),
                notes: formData.get('notes')
            };
            store.updateCustomer(id, updated);
            closeModal('editCustomerModal');
            renderCustomers();
            renderDashboard();
        });
    }

    // Add New Product
    const productForm = document.getElementById('productForm');
    if (productForm) {
        productForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(productForm);
            const newProd = {
                name: formData.get('name'),
                category: formData.get('category'),
                price: formData.get('price'),
                openingStock: formData.get('openingStock'),
                minStock: formData.get('minStock')
            };
            store.addProduct(newProd);
            closeModal('productModal');
            productForm.reset();
            renderStock();
            renderDashboard();
        });
    }

    // Record Sale
    const saleForm = document.getElementById('saleForm');
    if (saleForm) {
        saleForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(saleForm);
            const saleData = {
                date: formData.get('date'),
                customerId: formData.get('customerId'),
                productId: formData.get('productId'),
                quantity: formData.get('quantity'),
                unitPrice: formData.get('unitPrice'),
                paymentStatus: formData.get('paymentStatus'),
                deliveryStatus: formData.get('deliveryStatus')
            };
            store.recordSale(saleData);
            closeModal('saleModal');
            saleForm.reset();
            renderAllSections();
        });
    }

    // Add Followup
    const followupForm = document.getElementById('followupForm');
    if (followupForm) {
        followupForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(followupForm);
            const folData = {
                date: formData.get('date'),
                customerId: formData.get('customerId'),
                reason: formData.get('reason'),
                notes: formData.get('notes')
            };
            store.addFollowup(folData);
            closeModal('followupModal');
            followupForm.reset();
            renderFollowups();
            renderDashboard();
        });
    }

    // Stock In
    const stockInForm = document.getElementById('stockInForm');
    if (stockInForm) {
        stockInForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const prodId = document.getElementById('stockInProductId').value;
            const qty = document.getElementById('stockInQuantity').value;
            store.addStockIn(prodId, qty);
            closeModal('stockInModal');
            stockInForm.reset();
            renderStock();
            renderDashboard();
        });
    }

    // Firebase Settings Form
    const fbForm = document.getElementById('firebaseSettingsForm');
    if (fbForm) {
        const cfg = fbManager.config;
        if (document.getElementById('cfgApiKey')) document.getElementById('cfgApiKey').value = cfg.apiKey || '';
        if (document.getElementById('cfgAuthDomain')) document.getElementById('cfgAuthDomain').value = cfg.authDomain || '';
        if (document.getElementById('cfgProjectId')) document.getElementById('cfgProjectId').value = cfg.projectId || '';
        if (document.getElementById('cfgStorageBucket')) document.getElementById('cfgStorageBucket').value = cfg.storageBucket || '';
        if (document.getElementById('cfgMessagingSenderId')) document.getElementById('cfgMessagingSenderId').value = cfg.messagingSenderId || '';
        if (document.getElementById('cfgAppId')) document.getElementById('cfgAppId').value = cfg.appId || '';

        const pasteBox = document.getElementById('cfgPasteBox');
        if (pasteBox) {
            pasteBox.addEventListener('input', () => {
                const text = pasteBox.value;
                const extract = (key) => {
                    const match = text.match(new RegExp(`${key}\\s*:\\s*["']([^"']+)["']`));
                    return match ? match[1] : '';
                };
                if (extract('apiKey')) document.getElementById('cfgApiKey').value = extract('apiKey');
                if (extract('authDomain')) document.getElementById('cfgAuthDomain').value = extract('authDomain');
                if (extract('projectId')) document.getElementById('cfgProjectId').value = extract('projectId');
                if (extract('storageBucket')) document.getElementById('cfgStorageBucket').value = extract('storageBucket');
                if (extract('messagingSenderId')) document.getElementById('cfgMessagingSenderId').value = extract('messagingSenderId');
                if (extract('appId')) document.getElementById('cfgAppId').value = extract('appId');
            });
        }

        fbForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const newCfg = {
                apiKey: document.getElementById('cfgApiKey').value.trim(),
                authDomain: document.getElementById('cfgAuthDomain').value.trim(),
                projectId: document.getElementById('cfgProjectId').value.trim(),
                storageBucket: document.getElementById('cfgStorageBucket').value.trim(),
                messagingSenderId: document.getElementById('cfgMessagingSenderId').value.trim(),
                appId: document.getElementById('cfgAppId').value.trim()
            };
            fbManager.saveConfig(newCfg);
            showToast("Firebase Config saved! Reloading for live Cloud sync...", "success");
        });
    }

    // Auth Form
    const authForm = document.getElementById('authForm');
    if (authForm) {
        authForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('authEmail').value;
            const pass = document.getElementById('authPassword').value;
            handleEmailPasswordSignIn(email, pass);
        });
    }
}

// Modal Helpers & Openers
function openCustomerModal() {
    document.getElementById('customerForm').reset();
    openModal('customerModal');
}

function openEditCustomerModal(id) {
    const cust = store.getCustomers().find(c => c.id === id);
    if (!cust) return;
    document.getElementById('editCustomerId').value = cust.id;
    document.getElementById('editCustomerName').value = cust.name;
    document.getElementById('editCustomerPhone').value = cust.phone;
    document.getElementById('editCustomerArea').value = cust.area;
    document.getElementById('editCustomerStatus').value = cust.status || 'Active';
    document.getElementById('editCustomerNotes').value = cust.notes || '';
    openModal('editCustomerModal');
}

function openProductModal() {
    document.getElementById('productForm').reset();
    openModal('productModal');
}

function openSaleModalForCustomer(customerId = '') {
    populateCustomerDropdown('saleCustomerSelect', customerId);
    populateProductDropdown('saleProductSelect');
    document.getElementById('saleDateInput').value = getTodayISOString();
    openModal('saleModal');
}

function openFollowupModalForCustomer(customerId = '') {
    populateCustomerDropdown('followupCustomerSelect', customerId);
    document.getElementById('followupDateInput').value = getTodayISOString();
    openModal('followupModal');
}

function openStockInModal(productId, productName) {
    document.getElementById('stockInProductId').value = productId;
    document.getElementById('stockInProductName').textContent = productName;
    openModal('stockInModal');
}

function populateCustomerDropdown(selectId, selectedId = '') {
    const select = document.getElementById(selectId);
    if (!select) return;
    const customers = store.getCustomers();
    select.innerHTML = '<option value="">Select Customer...</option>' + 
        customers.map(c => `<option value="${c.id}" ${c.id === selectedId ? 'selected' : ''}>${escapeHtml(c.name)} (${escapeHtml(c.area)})</option>`).join('');
}

function populateProductDropdown(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;
    const products = store.getProducts();
    select.innerHTML = '<option value="">Select Product...</option>' +
        products.map(p => `<option value="${p.id}" data-price="${p.price}">${escapeHtml(p.name)} - R${p.price} (${p.currentStock} in stock)</option>`).join('');
    
    select.onchange = function() {
        const opt = select.options[select.selectedIndex];
        const price = opt.getAttribute('data-price');
        const priceInput = document.getElementById('saleUnitPriceInput');
        if (priceInput && price) {
            priceInput.value = price;
        }
    };
}

function updateSalePaymentStatus(saleId, status) {
    store.updateSaleStatus(saleId, status, null);
    renderDashboard();
    renderReports();
}

function updateSaleDeliveryStatus(saleId, status) {
    store.updateSaleStatus(saleId, null, status);
}

function toggleFollowup(id) {
    store.toggleFollowupStatus(id);
    renderFollowups();
    renderDashboard();
}

function switchToSection(secId) {
    const navItem = document.querySelector(`.nav-item[data-section="${secId}"]`);
    if (navItem) navItem.click();
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('active');
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
}

function resetFirebaseConfig() {
    if (confirm("Reset Firebase configuration and local demo data to defaults?")) {
        store.resetDemoData();
        fbManager.resetConfig();
    }
}

function resetDemoData() {
    if (confirm("Are you sure you want to reset all customer, order, and inventory records to initial demo seed data?")) {
        store.resetDemoData();
    }
}

// AUTHENTICATION HANDLERS
function initAuthListeners() {
    if (!fbManager.auth) return;

    fbManager.auth.onAuthStateChanged(user => {
        const emailDisp = document.getElementById('userEmailDisplay');
        const roleBadge = document.getElementById('userRoleBadge');
        const authBtn = document.getElementById('authBtn');

        if (user) {
            fbManager.currentUser = user;
            if (emailDisp) emailDisp.textContent = user.email || 'Authenticated User';
            if (roleBadge) roleBadge.textContent = 'Admin Staff';
            if (authBtn) {
                authBtn.title = "Sign Out";
                authBtn.onclick = handleSignOut;
            }
            showToast(`Signed in as ${user.email}`, 'success');
        } else {
            fbManager.currentUser = null;
            if (emailDisp) emailDisp.textContent = 'Guest User';
            if (roleBadge) roleBadge.textContent = 'Offline Mode';
            if (authBtn) {
                authBtn.title = "Sign In";
                authBtn.onclick = toggleAuthModal;
            }
        }
    });
}

function toggleAuthModal() {
    if (fbManager.currentUser) {
        handleSignOut();
    } else {
        openModal('authModal');
    }
}

function handleEmailPasswordSignIn(email, password) {
    if (!fbManager.auth) {
        showToast("Firebase Auth not initialized. Running in local mode.", "warning");
        closeModal('authModal');
        return;
    }

    fbManager.auth.signInWithEmailAndPassword(email, password)
        .then(() => closeModal('authModal'))
        .catch(err => {
            // If user doesn't exist, create demo account automatically
            if (err.code === 'auth/user-not-found') {
                fbManager.auth.createUserWithEmailAndPassword(email, password)
                    .then(() => closeModal('authModal'))
                    .catch(e => showToast(`Auth Error: ${e.message}`, 'error'));
            } else {
                showToast(`Sign in error: ${err.message}`, 'error');
            }
        });
}

function handleGoogleSignIn() {
    if (!fbManager.auth) {
        showToast("Firebase Auth not initialized.", "warning");
        return;
    }
    const provider = new firebase.auth.GoogleAuthProvider();
    fbManager.auth.signInWithPopup(provider)
        .then(() => closeModal('authModal'))
        .catch(err => showToast(`Google Auth Error: ${err.message}`, 'error'));
}

function handleSignOut() {
    if (fbManager.auth) {
        fbManager.auth.signOut().then(() => showToast("Signed out successfully.", "info"));
    }
}

// EXPORT CSV FUNCTIONALITY
function exportSalesCSV() {
    const sales = store.getSales();
    let csv = 'Sale ID,Date,Customer,Product,Quantity,Unit Price (ZAR),Total (ZAR),Payment Status,Delivery Status\n';
    sales.forEach(s => {
        csv += `"${s.id}","${s.date}","${s.customerName}","${s.productName}",${s.quantity},${s.unitPrice},${s.total},"${s.paymentStatus}","${s.deliveryStatus}"\n`;
    });
    downloadCSV(csv, `Everyday_Supply_Sales_${getTodayISOString()}.csv`);
}

function exportCustomersCSV() {
    const customers = store.getCustomers();
    let csv = 'Customer ID,Name,Phone,Area,Status,Date Added,Last Purchase,Notes\n';
    customers.forEach(c => {
        csv += `"${c.id}","${c.name}","${c.phone}","${c.area}","${c.status}","${c.dateAdded}","${c.lastPurchase}","${(c.notes || '').replace(/"/g, '""')}"\n`;
    });
    downloadCSV(csv, `Everyday_Supply_Customers_${getTodayISOString()}.csv`);
}

function downloadCSV(csvContent, fileName) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
