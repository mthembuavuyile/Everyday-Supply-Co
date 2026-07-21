/**
 * Everyday Supply Co. - Business CRM & Inventory Hub (Production Real App)
 * Integrated with Firebase Authentication (Single Gateway), Cloud Firestore,
 * Real-time Sync, Multi-module CRUD, Automatic Stock Deduction, and Zero Simulation Data.
 */

// Utility Helpers
function byId(id) {
    return document.getElementById(id);
}

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

// App State Manager (Strict Real Data, No Simulation Seed Data)
class ProductionHubStore {
    constructor() {
        this.STORAGE_KEY = 'everyday_supply_prod_hub_v2';
        this.data = {
            products: [],
            customers: [],
            sales: [],
            followups: []
        };
        this.isCloudConnected = false;
        this.unsubscribers = [];
    }

    loadLocalCache() {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (stored) {
            try {
                this.data = JSON.parse(stored);
            } catch (e) {
                console.error("Cache read error:", e);
            }
        }
    }

    saveLocalCache() {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data));
    }

    initFirestoreListeners() {
        if (!fbManager.init()) {
            this.updateConnBadge(false, "Local Offline");
            return;
        }

        const db = fbManager.db;
        if (!db) return;
        const collections = ['products', 'customers', 'sales', 'followups'];

        // Clear existing listeners
        this.unsubscribers.forEach(unsub => typeof unsub === 'function' && unsub());
        this.unsubscribers = [];

        collections.forEach(col => {
            try {
                const unsub = db.collection(col).onSnapshot(snapshot => {
                    const isLive = snapshot.metadata && !snapshot.metadata.fromCache;
                    this.isCloudConnected = isLive;
                    this.updateConnBadge(isLive, isLive ? "Cloud Syncing" : "Local Offline");

                    const items = [];
                    snapshot.forEach(doc => {
                        items.push({ id: doc.id, ...doc.data() });
                    });

                    this.data[col] = items;
                    this.saveLocalCache();
                    renderAllSections();
                }, err => {
                    console.warn(`Firestore sync note for ${col}:`, err.message);
                    this.updateConnBadge(false, "Local Offline");
                });

                this.unsubscribers.push(unsub);
            } catch (err) {
                console.warn(`Failed to attach listener for ${col}:`, err);
            }
        });
    }

    updateConnBadge(isOnline, label) {
        const dot = byId('firebaseConnDot');
        const text = byId('firebaseConnText');
        if (dot && text) {
            dot.style.background = isOnline ? 'var(--success)' : 'var(--warning)';
            text.textContent = label;
        }
    }

    // PRODUCTS
    getProducts() {
        return this.data.products.map(p => {
            const opening = parseInt(p.openingStock) || 0;
            const stockIn = parseInt(p.stockIn) || 0;
            const stockOut = parseInt(p.stockOut) || 0;
            const currentStock = opening + stockIn - stockOut;
            const minStock = parseInt(p.minStock) || 5;
            const needsRestock = currentStock <= minStock;
            const image = p.imageUrl || p.image || FALLBACK_IMAGE;
            return { ...p, openingStock: opening, stockIn, stockOut, currentStock, minStock, needsRestock, image };
        });
    }

    async saveProduct(productData) {
        const db = fbManager.db;
        const isEdit = !!productData.id;
        const docId = isEdit ? productData.id : 'PROD-' + Date.now();

        const payload = {
            name: productData.name,
            category: productData.category || 'General',
            price: parseFloat(productData.price) || 0,
            imageUrl: productData.imageUrl || '',
            openingStock: parseInt(productData.openingStock) || 0,
            minStock: parseInt(productData.minStock) || 5,
            updatedAt: new Date().toISOString()
        };

        if (!isEdit) {
            payload.createdAt = new Date().toISOString();
            payload.stockIn = 0;
            payload.stockOut = 0;
        }

        // Optimistically update local data
        if (isEdit) {
            const index = this.data.products.findIndex(p => p.id === docId);
            if (index !== -1) {
                this.data.products[index] = { ...this.data.products[index], ...payload };
            }
        } else {
            this.data.products.push({ id: docId, ...payload });
        }
        this.saveLocalCache();
        renderAllSections();

        showToast(isEdit ? "Product updated." : "Product added to catalog.", "success");

        if (db) {
            try {
                if (isEdit) {
                    await db.collection('products').doc(docId).update(payload);
                } else {
                    await db.collection('products').doc(docId).set(payload);
                }
            } catch (err) {
                console.error("Firestore save product error:", err);
                showToast("Cloud sync warning: " + err.message, "warning");
            }
        }
    }

    async deleteProduct(id) {
        const prod = this.data.products.find(p => p.id === id);
        if (!confirm(`Permanently delete product "${prod ? prod.name : id}"?`)) return;

        // Optimistically remove locally
        this.data.products = this.data.products.filter(p => p.id !== id);
        this.saveLocalCache();
        renderAllSections();
        showToast("Product deleted.", "warning");

        const db = fbManager.db;
        if (db) {
            try {
                await db.collection('products').doc(id).delete();
            } catch (err) {
                console.error("Firestore delete error:", err);
            }
        }
    }

    async addStockIn(productId, additionalQty) {
        const prod = this.data.products.find(p => p.id === productId);
        if (!prod) return;

        const newStockIn = (parseInt(prod.stockIn) || 0) + parseInt(additionalQty);

        // Optimistically update locally
        prod.stockIn = newStockIn;
        this.saveLocalCache();
        renderAllSections();
        showToast(`Added ${additionalQty} boxes to stock for ${prod.name}.`, "success");

        const db = fbManager.db;
        if (db) {
            try {
                const inc = firebase.firestore.FieldValue.increment(parseInt(additionalQty));
                await db.collection('products').doc(productId).update({ stockIn: inc });
            } catch (err) {
                console.error("Firestore stock update error:", err);
            }
        }
    }

    // CUSTOMERS
    getCustomers() {
        return this.data.customers;
    }

    async saveCustomer(customerData) {
        const db = fbManager.db;
        const isEdit = !!customerData.id;
        const docId = isEdit ? customerData.id : 'CUST-' + Date.now();

        const payload = {
            name: customerData.name,
            phone: customerData.phone,
            area: customerData.area,
            status: customerData.status || 'Active',
            notes: customerData.notes || '',
            updatedAt: new Date().toISOString()
        };

        if (!isEdit) {
            payload.dateAdded = getTodayISOString();
            payload.lastPurchase = '';
        }

        // Optimistically update local data
        if (isEdit) {
            const index = this.data.customers.findIndex(c => c.id === docId);
            if (index !== -1) {
                this.data.customers[index] = { ...this.data.customers[index], ...payload };
            }
        } else {
            this.data.customers.push({ id: docId, ...payload });
        }
        this.saveLocalCache();
        renderAllSections();

        showToast(isEdit ? "Customer details updated." : `Customer ${payload.name} added.`, "success");

        if (db) {
            try {
                if (isEdit) {
                    await db.collection('customers').doc(docId).update(payload);
                } else {
                    await db.collection('customers').doc(docId).set(payload);
                }
            } catch (err) {
                console.error("Firestore save customer error:", err);
                showToast("Cloud sync warning: " + err.message, "warning");
            }
        }
    }

    async deleteCustomer(id) {
        const cust = this.data.customers.find(c => c.id === id);
        if (!confirm(`Delete customer record "${cust ? cust.name : id}"?`)) return;

        // Optimistically remove locally
        this.data.customers = this.data.customers.filter(c => c.id !== id);
        this.saveLocalCache();
        renderAllSections();
        showToast("Customer record deleted.", "warning");

        const db = fbManager.db;
        if (db) {
            try {
                await db.collection('customers').doc(id).delete();
            } catch (err) {
                console.error("Firestore delete customer error:", err);
            }
        }
    }

    // SALES & AUTOMATIC STOCK DEDUCTION
    getSales() {
        return this.data.sales;
    }

    async addSale(saleData) {
        const db = fbManager.db;

        const saleId = 'SALE-' + Date.now();
        const quantity = parseInt(saleData.quantity) || 1;
        const unitPrice = parseFloat(saleData.unitPrice) || 0;
        const total = quantity * unitPrice;

        const customer = this.data.customers.find(c => c.id === saleData.customerId);
        const product = this.data.products.find(p => p.id === saleData.productId);

        const payload = {
            id: saleId,
            date: saleData.date || getTodayISOString(),
            customerId: saleData.customerId,
            customerName: customer ? customer.name : 'Unknown Customer',
            productId: saleData.productId,
            productName: product ? product.name : 'Unknown Product',
            quantity: quantity,
            unitPrice: unitPrice,
            total: total,
            paymentStatus: saleData.paymentStatus || 'Paid',
            deliveryStatus: saleData.deliveryStatus || 'Delivered',
            createdAt: new Date().toISOString()
        };

        // Optimistically update local data
        this.data.sales.push(payload);

        if (product) {
            product.stockOut = (parseInt(product.stockOut) || 0) + quantity;
        }

        if (customer) {
            customer.lastPurchase = payload.date;
            if (customer.status === 'Lead' || customer.status === 'Inactive') {
                customer.status = 'Active';
            }
        }

        this.saveLocalCache();
        renderAllSections();
        showToast(`Sale recorded successfully! ${quantity} boxes deducted from inventory.`, "success");

        if (db) {
            try {
                // 1. Record Sale
                await db.collection('sales').doc(saleId).set(payload);

                // 2. Auto-deduct stock from product stockOut
                if (product) {
                    const inc = firebase.firestore.FieldValue.increment(quantity);
                    await db.collection('products').doc(product.id).update({
                        stockOut: inc
                    });
                }

                // 3. Update customer lastPurchase and status
                if (customer) {
                    await db.collection('customers').doc(customer.id).update({
                        lastPurchase: payload.date,
                        status: customer.status
                    });
                }
            } catch (err) {
                console.error("Firestore add sale error:", err);
            }
        }
    }

    async deleteSale(id) {
        if (!confirm("Delete this sales order record?")) return;

        // Optimistically remove locally
        this.data.sales = this.data.sales.filter(s => s.id !== id);
        this.saveLocalCache();
        renderAllSections();
        showToast("Sales order deleted.", "warning");

        const db = fbManager.db;
        if (db) {
            try {
                await db.collection('sales').doc(id).delete();
            } catch (err) {
                console.error("Firestore delete sale error:", err);
            }
        }
    }

    // FOLLOW-UPS
    getFollowups() {
        return this.data.followups;
    }

    async saveFollowup(folData) {
        const db = fbManager.db;
        const folId = 'FOL-' + Date.now();
        const customer = this.data.customers.find(c => c.id === folData.customerId);

        const payload = {
            id: folId,
            date: folData.date || getTodayISOString(),
            customerId: folData.customerId,
            customerName: customer ? customer.name : 'Customer',
            phone: customer ? customer.phone : '',
            reason: folData.reason || 'General',
            status: 'Pending',
            notes: folData.notes || '',
            createdAt: new Date().toISOString()
        };

        // Optimistically save locally
        this.data.followups.push(payload);
        this.saveLocalCache();
        renderAllSections();
        showToast("Follow-up reminder scheduled.", "success");

        if (db) {
            try {
                await db.collection('followups').doc(folId).set(payload);
            } catch (err) {
                console.error("Firestore save followup error:", err);
            }
        }
    }

    async markFollowupComplete(id) {
        const fol = this.data.followups.find(f => f.id === id);
        if (fol) {
            fol.status = 'Completed';
            this.saveLocalCache();
            renderAllSections();
            showToast("Follow-up marked as completed.", "success");
        }

        const db = fbManager.db;
        if (db) {
            try {
                await db.collection('followups').doc(id).update({ status: 'Completed' });
            } catch (err) {
                console.error("Firestore update followup error:", err);
            }
        }
    }

    async deleteFollowup(id) {
        if (!confirm("Delete this follow-up reminder?")) return;

        this.data.followups = this.data.followups.filter(f => f.id !== id);
        this.saveLocalCache();
        renderAllSections();
        showToast("Follow-up deleted.", "warning");

        const db = fbManager.db;
        if (db) {
            try {
                await db.collection('followups').doc(id).delete();
            } catch (err) {
                console.error("Firestore delete followup error:", err);
            }
        }
    }
}

// Global Store Instance
const store = new ProductionHubStore();

// --- SINGLE AUTHENTICATION GATEWAY ---
function initAuthGateway() {
    const authOverlay = byId('auth-overlay');
    const mainApp = byId('main-app');
    const authForm = byId('authLoginForm');
    const authErrorMsg = byId('authErrorMsg');
    const googleBtn = byId('googleSignInBtn');

    if (!fbManager.init()) return;

    fbManager.auth.onAuthStateChanged(user => {
        if (user) {
            if (authOverlay) authOverlay.style.display = 'none';
            if (mainApp) mainApp.style.display = 'flex';

            const email = user.email || 'Admin User';
            if (byId('userEmailDisplay')) byId('userEmailDisplay').textContent = email;
            if (byId('settingsEmailDisplay')) byId('settingsEmailDisplay').textContent = email;
            if (byId('settingsAvatar')) byId('settingsAvatar').textContent = email.charAt(0).toUpperCase();

            // Connect real-time Firestore listeners for production data
            store.initFirestoreListeners();
        } else {
            if (authOverlay) authOverlay.style.display = 'flex';
            if (mainApp) mainApp.style.display = 'none';
        }
    });

    if (authForm) {
        authForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = byId('loginEmail').value;
            const password = byId('loginPassword').value;

            if (authErrorMsg) authErrorMsg.style.display = 'none';

            try {
                await fbManager.auth.signInWithEmailAndPassword(email, password);
            } catch (err) {
                console.error("Auth error:", err);
                if (authErrorMsg) {
                    authErrorMsg.textContent = "Invalid login credentials. Access Denied.";
                    authErrorMsg.style.display = 'block';
                }
            }
        });
    }

    if (googleBtn) {
        googleBtn.addEventListener('click', async () => {
            const provider = new firebase.auth.GoogleAuthProvider();
            try {
                await fbManager.auth.signInWithPopup(provider);
            } catch (err) {
                console.error("Google sign-in error:", err);
                if (authErrorMsg) {
                    authErrorMsg.textContent = "Google Sign-in failed: " + err.message;
                    authErrorMsg.style.display = 'block';
                }
            }
        });
    }

    // Sign out handlers
    const logoutBtns = [byId('headerLogoutBtn'), byId('settingsLogoutBtn')];
    logoutBtns.forEach(btn => {
        if (btn) {
            btn.addEventListener('click', () => {
                fbManager.auth.signOut();
            });
        }
    });
}

// --- RENDER SECTIONS ---

function renderAllSections() {
    renderDashboard();
    renderStock();
    renderCustomers();
    renderSales();
    renderFollowups();
    renderReports();
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// 1. DASHBOARD
function renderDashboard() {
    const products = store.getProducts();
    const customers = store.getCustomers();
    const sales = store.getSales();
    const followups = store.getFollowups();

    // Calculated metrics
    const totalCustomers = customers.length;
    const activeCustomers = customers.filter(c => c.status === 'Active' || c.status === 'Repeat').length;
    const boxesSold = sales.reduce((sum, s) => sum + (parseInt(s.quantity) || 0), 0);
    const totalStock = products.reduce((sum, p) => sum + p.currentStock, 0);

    const todayISO = getTodayISOString();
    const followupsDue = followups.filter(f => f.status === 'Pending' && f.date <= todayISO).length;

    const totalRevenue = sales
        .filter(s => s.paymentStatus === 'Paid')
        .reduce((sum, s) => sum + (parseFloat(s.total) || 0), 0);

    const outstandingCredit = sales
        .filter(s => s.paymentStatus === 'Credit')
        .reduce((sum, s) => sum + (parseFloat(s.total) || 0), 0);

    // Update DOM
    if (byId('dashTotalCustomers')) byId('dashTotalCustomers').textContent = totalCustomers;
    if (byId('dashActiveCustomers')) byId('dashActiveCustomers').textContent = activeCustomers;
    if (byId('dashBoxesSold')) byId('dashBoxesSold').textContent = boxesSold;
    if (byId('dashCurrentStock')) byId('dashCurrentStock').textContent = totalStock;
    if (byId('dashFollowupsDue')) byId('dashFollowupsDue').textContent = followupsDue;
    if (byId('dashTotalRevenue')) byId('dashTotalRevenue').textContent = moneyZA(totalRevenue);
    if (byId('dashOutstandingCredit')) byId('dashOutstandingCredit').textContent = moneyZA(outstandingCredit);

    // Follow-up badge
    const badge = byId('followupBadge');
    if (badge) {
        if (followupsDue > 0) {
            badge.textContent = followupsDue;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    }

    // Low stock alert banner
    const lowStockAlerts = products.filter(p => p.needsRestock);
    const alertBox = byId('dashLowStockAlerts');
    if (alertBox) {
        if (lowStockAlerts.length > 0) {
            alertBox.innerHTML = `
                <div class="card" style="background: var(--warning-light); border: 1px solid var(--warning); padding: 16px;">
                    <div style="display: flex; items-center; gap: 12px; color: #92400e;">
                        <svg class="icon icon-lg" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                        <div>
                            <strong style="font-size: 14px;">Attention: ${lowStockAlerts.length} Product(s) Below Min Stock Level</strong>
                            <p style="font-size: 12px; margin-top: 2px;">Items needing restock: ${lowStockAlerts.map(p => `${p.name} (${p.currentStock} left)`).join(', ')}</p>
                        </div>
                    </div>
                </div>
            `;
        } else {
            alertBox.innerHTML = '';
        }
    }

    // Recent Sales Table
    const recentTable = byId('dashRecentSalesTable');
    if (recentTable) {
        recentTable.innerHTML = '';
        const recentSales = [...sales].reverse().slice(0, 5);

        if (recentSales.length === 0) {
            recentTable.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; color: var(--slate-400); padding: 24px;">
                        No sales recorded yet. Click "+ Record Sale" to create your first order.
                    </td>
                </tr>
            `;
            return;
        }

        recentSales.forEach(s => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${escapeHtml(s.id)}</strong></td>
                <td>${escapeHtml(s.date)}</td>
                <td>${escapeHtml(s.customerName)}</td>
                <td>${escapeHtml(s.productName)}</td>
                <td>${s.quantity}</td>
                <td><strong>${moneyZA(s.total)}</strong></td>
                <td><span class="badge ${s.paymentStatus === 'Paid' ? 'badge-paid' : 'badge-credit'}">${escapeHtml(s.paymentStatus)}</span></td>
            `;
            recentTable.appendChild(tr);
        });
    }
}

// 2. STOCK & PRODUCT CATALOG
function renderStock() {
    const tableBody = byId('stockTableBody');
    if (!tableBody) return;
    tableBody.innerHTML = '';

    const products = store.getProducts();
    const queryStr = (byId('stockSearchInput')?.value || '').toLowerCase();

    const filtered = products.filter(p =>
        p.name.toLowerCase().includes(queryStr) ||
        p.category.toLowerCase().includes(queryStr)
    );

    if (filtered.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="10" style="text-align: center; color: var(--slate-400); padding: 32px;">
                    No products found in inventory. Click "+ Add New Product" to create catalog items.
                </td>
            </tr>
        `;
        return;
    }

    filtered.forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div class="product-cell">
                    <img src="${p.image}" class="product-thumb" onerror="this.src='${FALLBACK_IMAGE}'">
                    <div>
                        <div class="product-info-name">${escapeHtml(p.name)}</div>
                        <div class="product-info-id">${escapeHtml(p.id)}</div>
                    </div>
                </div>
            </td>
            <td><span class="badge badge-category">${escapeHtml(p.category)}</span></td>
            <td><strong>${moneyZA(p.price)}</strong></td>
            <td>${p.openingStock}</td>
            <td style="color: var(--success); font-weight: 600;">+${p.stockIn}</td>
            <td style="color: var(--danger); font-weight: 600;">-${p.stockOut}</td>
            <td><strong style="font-size: 15px; color: ${p.needsRestock ? 'var(--danger)' : 'var(--slate-900)'};">${p.currentStock}</strong></td>
            <td>${p.minStock}</td>
            <td><span class="badge ${p.needsRestock ? 'badge-restock' : 'badge-instock'}">${p.needsRestock ? 'LOW STOCK' : 'In Stock'}</span></td>
            <td style="text-align: right;">
                <div style="display: flex; gap: 4px; justify-content: flex-end;">
                    <button class="btn btn-sm btn-secondary" onclick="openStockInModal('${p.id}', '${escapeHtml(p.name.replace(/'/g, "\\'"))}')">+ Stock In</button>
                    <button class="btn btn-sm btn-secondary" onclick="openProductModal(true, '${p.id}')">Edit</button>
                    <button class="btn btn-sm btn-danger-outline" onclick="store.deleteProduct('${p.id}')">Delete</button>
                </div>
            </td>
        `;
        tableBody.appendChild(tr);
    });
}

// 3. CUSTOMER DATABASE
function renderCustomers() {
    const tableBody = byId('customersTableBody');
    if (!tableBody) return;
    tableBody.innerHTML = '';

    const customers = store.getCustomers();
    const queryStr = (byId('customerSearchInput')?.value || '').toLowerCase();
    const statusFilter = byId('customerFilterStatus')?.value || 'all';

    const filtered = customers.filter(c => {
        const matchesQuery = c.name.toLowerCase().includes(queryStr) ||
            c.phone.toLowerCase().includes(queryStr) ||
            c.area.toLowerCase().includes(queryStr);
        const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
        return matchesQuery && matchesStatus;
    });

    if (filtered.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; color: var(--slate-400); padding: 32px;">
                    No customers found. Click "+ Add New Customer" to register clients.
                </td>
            </tr>
        `;
        return;
    }

    filtered.forEach(c => {
        const tr = document.createElement('tr');
        const cleanPhone = c.phone.replace(/\D/g, '');
        const waLink = cleanPhone ? `https://wa.me/27${cleanPhone.startsWith('0') ? cleanPhone.slice(1) : cleanPhone}` : '#';

        tr.innerHTML = `
            <td><strong>${escapeHtml(c.id)}</strong></td>
            <td><strong>${escapeHtml(c.name)}</strong></td>
            <td>
                <a href="${waLink}" target="_blank" style="color: var(--primary); text-decoration: none; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;">
                    <svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                    ${escapeHtml(c.phone)}
                </a>
            </td>
            <td>${escapeHtml(c.area)}</td>
            <td><span class="badge ${c.status === 'Active' || c.status === 'Repeat' ? 'badge-paid' : 'badge-credit'}">${escapeHtml(c.status)}</span></td>
            <td>${escapeHtml(c.dateAdded || '-')}</td>
            <td>${escapeHtml(c.lastPurchase || 'None')}</td>
            <td style="text-align: right;">
                <div style="display: flex; gap: 4px; justify-content: flex-end;">
                    <button class="btn btn-sm btn-primary" onclick="openSaleModalForCustomer('${c.id}')">+ Sale</button>
                    <button class="btn btn-sm btn-secondary" onclick="openCustomerModal(true, '${c.id}')">Edit</button>
                    <button class="btn btn-sm btn-danger-outline" onclick="store.deleteCustomer('${c.id}')">Delete</button>
                </div>
            </td>
        `;
        tableBody.appendChild(tr);
    });
}

// 4. SALES tracking
function renderSales() {
    const tableBody = byId('salesTableBody');
    if (!tableBody) return;
    tableBody.innerHTML = '';

    const sales = store.getSales();
    const queryStr = (byId('salesSearchInput')?.value || '').toLowerCase();
    const paymentFilter = byId('salesFilterPayment')?.value || 'all';

    const filtered = sales.filter(s => {
        const matchesQuery = s.customerName.toLowerCase().includes(queryStr) ||
            s.productName.toLowerCase().includes(queryStr) ||
            s.id.toLowerCase().includes(queryStr);
        const matchesPayment = paymentFilter === 'all' || s.paymentStatus === paymentFilter;
        return matchesQuery && matchesPayment;
    });

    if (filtered.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; color: var(--slate-400); padding: 32px;">
                    No sales records found.
                </td>
            </tr>
        `;
        return;
    }

    filtered.forEach(s => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${escapeHtml(s.id)}</strong></td>
            <td>${escapeHtml(s.date)}</td>
            <td><strong>${escapeHtml(s.customerName)}</strong></td>
            <td>${escapeHtml(s.productName)}</td>
            <td><strong>${s.quantity}</strong></td>
            <td>${moneyZA(s.unitPrice)}</td>
            <td><strong>${moneyZA(s.total)}</strong></td>
            <td><span class="badge ${s.paymentStatus === 'Paid' ? 'badge-paid' : 'badge-credit'}">${escapeHtml(s.paymentStatus)}</span></td>
            <td>${escapeHtml(s.deliveryStatus)}</td>
        `;
        tableBody.appendChild(tr);
    });
}

// 5. FOLLOW-UPS
function renderFollowups() {
    const grid = byId('followupsGrid');
    if (!grid) return;
    grid.innerHTML = '';

    const followups = store.getFollowups();
    const filter = byId('followupFilterStatus')?.value || 'all';

    const filtered = followups.filter(f => filter === 'all' || f.status === filter);

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; color: var(--slate-400); padding: 48px; background: var(--white); border-radius: var(--radius-lg); border: 1px solid var(--slate-200);">
                No scheduled follow-ups. Click "+ Schedule Follow-up" to create reminder tasks.
            </div>
        `;
        return;
    }

    filtered.forEach(f => {
        const card = document.createElement('div');
        card.className = 'card';
        card.style.padding = '20px';
        const isPending = f.status === 'Pending';

        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; items-center; margin-bottom: 12px;">
                <span class="badge ${isPending ? 'badge-credit' : 'badge-paid'}">${escapeHtml(f.status)}</span>
                <span style="font-size: 12px; color: var(--slate-500); font-weight: 600;">Date: ${escapeHtml(f.date)}</span>
            </div>
            <h3 style="font-size: 16px; font-weight: 700; color: var(--slate-900); margin-bottom: 4px;">${escapeHtml(f.customerName)}</h3>
            <p style="font-size: 12px; color: var(--slate-500); margin-bottom: 12px;">Reason: <strong>${escapeHtml(f.reason)}</strong></p>
            <p style="font-size: 13px; color: var(--slate-700); background: var(--slate-50); padding: 10px; border-radius: var(--radius-sm); margin-bottom: 16px;">${escapeHtml(f.notes || 'No extra details.')}</p>
            <div style="display: flex; gap: 8px; justify-content: flex-end;">
                ${isPending ? `<button class="btn btn-sm btn-primary" onclick="store.markFollowupComplete('${f.id}')">✓ Mark Done</button>` : ''}
                <button class="btn btn-sm btn-danger-outline" onclick="store.deleteFollowup('${f.id}')">Delete</button>
            </div>
        `;
        grid.appendChild(card);
    });
}

// 6. REPORTS
function renderReports() {
    const sales = store.getSales();
    const customers = store.getCustomers();

    const totalBoxes = sales.reduce((sum, s) => sum + (parseInt(s.quantity) || 0), 0);
    const totalRev = sales.filter(s => s.paymentStatus === 'Paid').reduce((sum, s) => sum + (parseFloat(s.total) || 0), 0);
    const credit = sales.filter(s => s.paymentStatus === 'Credit').reduce((sum, s) => sum + (parseFloat(s.total) || 0), 0);

    const newCust = customers.filter(c => c.status === 'Lead' || c.status === 'Active').length;
    const repeatCust = customers.filter(c => c.status === 'Repeat').length;

    if (byId('repTotalBoxes')) byId('repTotalBoxes').textContent = totalBoxes;
    if (byId('repTotalRevenue')) byId('repTotalRevenue').textContent = moneyZA(totalRev);
    if (byId('repOutstandingCredit')) byId('repOutstandingCredit').textContent = moneyZA(credit);
    if (byId('repNewCustomers')) byId('repNewCustomers').textContent = newCust;
    if (byId('repRepeatCustomers')) byId('repRepeatCustomers').textContent = repeatCust;

    // Top Selling Products
    const topBody = byId('repTopProductsBody');
    if (topBody) {
        topBody.innerHTML = '';
        const prodStats = {};

        sales.forEach(s => {
            const name = s.productName || 'Unknown';
            if (!prodStats[name]) prodStats[name] = { boxes: 0, revenue: 0 };
            prodStats[name].boxes += parseInt(s.quantity) || 0;
            if (s.paymentStatus === 'Paid') {
                prodStats[name].revenue += parseFloat(s.total) || 0;
            }
        });

        const sortedProds = Object.keys(prodStats)
            .map(name => ({ name, ...prodStats[name] }))
            .sort((a, b) => b.boxes - a.boxes);

        if (sortedProds.length === 0) {
            topBody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--slate-400); padding: 24px;">No product sales recorded yet.</td></tr>`;
            return;
        }

        sortedProds.forEach(p => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${escapeHtml(p.name)}</strong></td>
                <td>${p.boxes} boxes</td>
                <td><strong>${moneyZA(p.revenue)}</strong></td>
            `;
            topBody.appendChild(tr);
        });
    }
}

// --- MODAL CONTROLLERS & FORM HANDLERS ---

function openModal(id) {
    const modal = byId(id);
    if (modal) modal.classList.add('active');
}

function closeModal(id) {
    const modal = byId(id);
    if (modal) modal.classList.remove('active');
}

// Product Modal
function openProductModal(isEdit = false, id = null) {
    const form = byId('productForm');
    if (form) form.reset();

    const title = byId('productModalTitle');
    const idInput = byId('prodEditId');

    if (isEdit && id) {
        const prod = store.getProducts().find(p => p.id === id);
        if (prod) {
            if (title) title.textContent = "Edit Product Item";
            if (idInput) idInput.value = prod.id;
            if (byId('pName')) byId('pName').value = prod.name;
            if (byId('pCategory')) byId('pCategory').value = prod.category;
            if (byId('pPrice')) byId('pPrice').value = prod.price;
            if (byId('pImageUrl')) byId('pImageUrl').value = prod.image || prod.imageUrl || '';
            if (byId('pOpeningStock')) byId('pOpeningStock').value = prod.openingStock;
            if (byId('pMinStock')) byId('pMinStock').value = prod.minStock;
        }
    } else {
        if (title) title.textContent = "Add New Product to Inventory";
        if (idInput) idInput.value = "";
    }
    openModal('productModal');
}

function openStockInModal(id, name) {
    if (byId('stockInProductId')) byId('stockInProductId').value = id;
    if (byId('stockInProductName')) byId('stockInProductName').textContent = name;
    if (byId('stockInQuantity')) byId('stockInQuantity').value = 10;
    openModal('stockInModal');
}

// Customer Modal
function openCustomerModal(isEdit = false, id = null) {
    const form = byId('customerForm');
    if (form) form.reset();

    const title = byId('customerModalTitle');
    const idInput = byId('customerEditId');

    if (isEdit && id) {
        const cust = store.getCustomers().find(c => c.id === id);
        if (cust) {
            if (title) title.textContent = "Edit Customer Details";
            if (idInput) idInput.value = cust.id;
            if (byId('custName')) byId('custName').value = cust.name;
            if (byId('custPhone')) byId('custPhone').value = cust.phone;
            if (byId('custArea')) byId('custArea').value = cust.area;
            if (byId('custStatus')) byId('custStatus').value = cust.status;
            if (byId('custNotes')) byId('custNotes').value = cust.notes || '';
        }
    } else {
        if (title) title.textContent = "Add New Customer";
        if (idInput) idInput.value = "";
    }
    openModal('customerModal');
}

// Sale Modal
function openSaleModalForCustomer(customerId = "") {
    const form = byId('saleForm');
    if (form) form.reset();

    if (byId('saleDateInput')) byId('saleDateInput').value = getTodayISOString();

    const custSelect = byId('saleCustomerSelect');
    if (custSelect) {
        custSelect.innerHTML = '<option value="">Select Customer...</option>';
        store.getCustomers().forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = `${c.name} (${c.area})`;
            if (c.id === customerId) opt.selected = true;
            custSelect.appendChild(opt);
        });
    }

    const prodSelect = byId('saleProductSelect');
    if (prodSelect) {
        prodSelect.innerHTML = '<option value="">Select Product...</option>';
        store.getProducts().forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = `${p.name} (${moneyZA(p.price)}) - ${p.currentStock} in stock`;
            prodSelect.appendChild(opt);
        });
    }

    openModal('saleModal');
}

// Auto-fill price when product selected in sale modal
if (byId('saleProductSelect')) {
    byId('saleProductSelect').addEventListener('change', (e) => {
        const prodId = e.target.value;
        const prod = store.getProducts().find(p => p.id === prodId);
        if (prod && byId('saleUnitPriceInput')) {
            byId('saleUnitPriceInput').value = prod.price;
        }
    });
}

// Follow-up Modal
function openFollowupModalForCustomer(customerId = "") {
    const form = byId('followupForm');
    if (form) form.reset();

    if (byId('followupDateInput')) byId('followupDateInput').value = getTodayISOString();

    const custSelect = byId('followupCustomerSelect');
    if (custSelect) {
        custSelect.innerHTML = '<option value="">Select Customer...</option>';
        store.getCustomers().forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = `${c.name} (${c.phone})`;
            if (c.id === customerId) opt.selected = true;
            custSelect.appendChild(opt);
        });
    }

    openModal('followupModal');
}

// FORM SUBMISSIONS
function initForms() {
    // Product Form
    const productForm = byId('productForm');
    if (productForm) {
        productForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = {
                id: byId('prodEditId').value,
                name: byId('pName').value,
                category: byId('pCategory').value,
                price: byId('pPrice').value,
                imageUrl: byId('pImageUrl').value,
                openingStock: byId('pOpeningStock').value,
                minStock: byId('pMinStock').value
            };
            await store.saveProduct(data);
            closeModal('productModal');
        });
    }

    // Stock In Form
    const stockInForm = byId('stockInForm');
    if (stockInForm) {
        stockInForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = byId('stockInProductId').value;
            const qty = byId('stockInQuantity').value;
            await store.addStockIn(id, qty);
            closeModal('stockInModal');
        });
    }

    // Customer Form
    const customerForm = byId('customerForm');
    if (customerForm) {
        customerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = {
                id: byId('customerEditId').value,
                name: byId('custName').value,
                phone: byId('custPhone').value,
                area: byId('custArea').value,
                status: byId('custStatus').value,
                notes: byId('custNotes').value
            };
            await store.saveCustomer(data);
            closeModal('customerModal');
        });
    }

    // Sale Form
    const saleForm = byId('saleForm');
    if (saleForm) {
        saleForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(saleForm);
            const data = Object.fromEntries(formData.entries());
            await store.addSale(data);
            closeModal('saleModal');
        });
    }

    // Followup Form
    const followupForm = byId('followupForm');
    if (followupForm) {
        followupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(followupForm);
            const data = Object.fromEntries(formData.entries());
            await store.saveFollowup(data);
            closeModal('followupModal');
        });
    }
}

// CSV EXPORT UTILITIES
function exportSalesCSV() {
    const sales = store.getSales();
    if (sales.length === 0) {
        showToast("No sales data available to export.", "warning");
        return;
    }

    let csv = 'Sale ID,Date,Customer,Product,Quantity,Unit Price,Total,Payment Status,Delivery Status\n';
    sales.forEach(s => {
        csv += `"${s.id}","${s.date}","${s.customerName}","${s.productName}",${s.quantity},${s.unitPrice},${s.total},"${s.paymentStatus}","${s.deliveryStatus}"\n`;
    });

    downloadCSV(csv, `Everyday_Supply_Sales_Report_${getTodayISOString()}.csv`);
}

function exportCustomersCSV() {
    const customers = store.getCustomers();
    if (customers.length === 0) {
        showToast("No customer data available to export.", "warning");
        return;
    }

    let csv = 'ID,Name,Phone,Area,Status,Date Added,Last Purchase,Notes\n';
    customers.forEach(c => {
        csv += `"${c.id}","${c.name}","${c.phone}","${c.area}","${c.status}","${c.dateAdded || ''}","${c.lastPurchase || ''}","${(c.notes || '').replace(/"/g, '""')}"\n`;
    });

    downloadCSV(csv, `Everyday_Supply_Customers_${getTodayISOString()}.csv`);
}

function downloadCSV(csvContent, filename) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("CSV file exported successfully.", "success");
}

// --- NAVIGATION & ROUTING ---

function switchToSection(sectionId) {
    document.querySelectorAll('.page-section').forEach(sec => {
        sec.classList.remove('active');
    });

    const targetSec = byId(sectionId);
    if (targetSec) targetSec.classList.add('active');

    // Sidebar active item
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
        if (item.dataset.section === sectionId) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    // Bottom nav active item
    document.querySelectorAll('.bottom-nav-item').forEach(item => {
        if (item.dataset.section === sectionId) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    // Close mobile drawer if open
    const sidebar = byId('sidebar');
    const overlay = byId('mobileOverlay');
    if (sidebar) sidebar.classList.remove('active');
    if (overlay) overlay.classList.remove('active');

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function initNavigation() {
    // Sidebar & Bottom Nav Clicks
    document.querySelectorAll('[data-section]').forEach(item => {
        item.addEventListener('click', () => {
            const sec = item.dataset.section;
            if (sec) switchToSection(sec);
        });
    });

    // Mobile Hamburger Toggle
    const menuToggle = byId('menuToggle');
    const sidebar = byId('sidebar');
    const overlay = byId('mobileOverlay');

    if (menuToggle && sidebar && overlay) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
        });
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        });
    }
}

// INITIALIZATION ENTRY POINT
document.addEventListener('DOMContentLoaded', () => {
    store.loadLocalCache();
    initAuthGateway();
    initNavigation();
    initForms();
});
