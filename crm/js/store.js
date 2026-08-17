class ProductionHubStore {
    constructor() {
        this.STORAGE_KEY = 'everyday_supply_prod_hub_v2';
        this.data = {
            products: [],
            customers: [],
            sales: [],
            followups: [],
            activityLogs: [],
            teamPresence: {},
            securityLogs: []
        };
        this.isCloudConnected = false;
        this.unsubscribers = [];
    }

    loadLocalCache() {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                this.data = {
                    products: parsed.products || [],
                    customers: parsed.customers || [],
                    sales: parsed.sales || [],
                    followups: parsed.followups || [],
                    activityLogs: parsed.activityLogs || [],
                    teamPresence: parsed.teamPresence || {},
                    securityLogs: parsed.securityLogs || []
                };
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
        const collections = ['products', 'customers', 'sales', 'followups', 'activity_logs', 'team_presence', 'security_logs'];

        // Clear existing listeners
        this.unsubscribers.forEach(unsub => typeof unsub === 'function' && unsub());
        this.unsubscribers = [];

        collections.forEach(col => {
            try {
                const unsub = db.collection(col).onSnapshot(snapshot => {
                    const isFromCache = snapshot.metadata && snapshot.metadata.fromCache;
                    const isOnline = navigator.onLine;

                    if (!isFromCache && isOnline) {
                        this.isCloudConnected = true;
                        this.updateConnBadge(true, "Cloud Syncing");
                    } else if (isOnline && fbManager.auth && fbManager.auth.currentUser) {
                        this.isCloudConnected = true;
                        this.updateConnBadge(true, "Cloud Connected");
                    } else if (isFromCache && isOnline) {
                        this.updateConnBadge(true, "Cloud Syncing");
                    } else {
                        this.isCloudConnected = false;
                        this.updateConnBadge(false, "Local Offline");
                    }

                    if (col === 'team_presence') {
                        const presenceMap = {};
                        snapshot.forEach(doc => {
                            const d = doc.data();
                            if (d && d.email) {
                                presenceMap[d.email.toLowerCase().trim()] = { id: doc.id, ...d };
                            }
                        });
                        this.data.teamPresence = { ...this.data.teamPresence, ...presenceMap };
                    } else if (col === 'security_logs') {
                        const items = [];
                        snapshot.forEach(doc => {
                            items.push({ id: doc.id, ...doc.data() });
                        });
                        this.data.securityLogs = items.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                        if (window.SecurityTracker) {
                            SecurityTracker.updateSecurityStatsUI();
                        }
                    } else if (col === 'activity_logs') {
                        const items = [];
                        snapshot.forEach(doc => {
                            items.push({ id: doc.id, ...doc.data() });
                        });
                        this.data.activityLogs = items.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                    } else {
                        const items = [];
                        snapshot.forEach(doc => {
                            items.push({ id: doc.id, ...doc.data() });
                        });
                        this.data[col] = items;
                    }
                    this.saveLocalCache();
                    renderAllSections();
                }, err => {
                    console.warn(`Firestore sync note for ${col}:`, err.message);
                    const isOnline = navigator.onLine;
                    if (isOnline && fbManager.auth && fbManager.auth.currentUser) {
                        this.updateConnBadge(true, "Cloud Connected");
                    } else {
                        this.updateConnBadge(false, "Local Offline");
                    }
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
            const globalThreshold = parseInt(localStorage.getItem('lowStockThreshold')) || 5;
            const minStock = parseInt(p.minStock) || globalThreshold;
            const needsRestock = currentStock <= minStock;
            let image = p.imageUrl || p.image || '';
            if (!image || image.includes('aceonlinesa.co.za')) {
                image = FALLBACK_IMAGE;
            }
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
        logActivity('product', isEdit ? 'Update Product' : 'Add Product', (isEdit ? 'Updated ' : 'Added ') + payload.name);

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
        showConfirmDialog(
            "Delete Product",
            `Permanently delete product "${prod ? prod.name : id}"?`,
            "Delete Product",
            async () => {
                this.data.products = this.data.products.filter(p => p.id !== id);
                this.saveLocalCache();
                renderAllSections();
                showToast("Product deleted.", "warning");
                logActivity('product', 'Delete Product', 'Deleted product ' + (prod ? prod.name : id));

                const db = fbManager.db;
                if (db) {
                    try {
                        await db.collection('products').doc(id).delete();
                    } catch (err) {
                        console.error("Firestore delete error:", err);
                    }
                }
            }
        );
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
        logActivity('product', 'Add Stock', `Added ${additionalQty} units to ${prod.name}`);

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

    async correctStock(productId, newOpening, newStockIn, newStockOut) {
        const prod = this.data.products.find(p => p.id === productId);
        if (!prod) return;

        const opening = parseInt(newOpening) || 0;
        const stockIn = parseInt(newStockIn) || 0;
        const stockOut = parseInt(newStockOut) || 0;

        // Optimistically update locally
        prod.openingStock = opening;
        prod.stockIn = stockIn;
        prod.stockOut = stockOut;
        prod.updatedAt = new Date().toISOString();

        this.saveLocalCache();
        renderAllSections();

        const newCurrent = opening + stockIn - stockOut;
        showToast(`Stock corrected for ${prod.name}. Current stock is now ${newCurrent} boxes.`, "success");
        logActivity('product', 'Correct Stock', `Corrected stock for ${prod.name} to ${newCurrent} units`);

        const db = fbManager.db;
        if (db) {
            try {
                await db.collection('products').doc(productId).update({
                    openingStock: opening,
                    stockIn: stockIn,
                    stockOut: stockOut,
                    updatedAt: prod.updatedAt
                });
            } catch (err) {
                console.error("Firestore stock correction error:", err);
                showToast("Cloud sync warning: " + err.message, "warning");
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

        // Duplicate detection: Check if phone number already exists (for new customers)
        if (!isEdit && customerData.phone) {
            const cleanPhone = customerData.phone.replace(/\D/g, '');
            const existingByPhone = this.data.customers.find(c => {
                const existingClean = (c.phone || '').replace(/\D/g, '');
                return existingClean === cleanPhone && existingClean.length > 0;
            });
            if (existingByPhone) {
                showToast(`Duplicate detected: A customer with phone ${customerData.phone} already exists (${existingByPhone.name}). Please edit the existing record instead.`, "warning");
                return;
            }
        }

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
        logActivity('customer', isEdit ? 'Update Customer' : 'Add Customer', (isEdit ? 'Updated ' : 'Added ') + payload.name);

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
        showConfirmDialog(
            "Delete Customer",
            `Delete customer record "${cust ? cust.name : id}"?`,
            "Delete Record",
            async () => {
                this.data.customers = this.data.customers.filter(c => c.id !== id);
                this.saveLocalCache();
                renderAllSections();
                showToast("Customer record deleted.", "warning");
                logActivity('customer', 'Delete Customer', 'Deleted customer ' + (cust ? cust.name : id));

                const db = fbManager.db;
                if (db) {
                    try {
                        await db.collection('customers').doc(id).delete();
                    } catch (err) {
                        console.error("Firestore delete customer error:", err);
                    }
                }
            }
        );
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

        // Stock validation: prevent selling more than available stock
        if (product) {
            const opening = parseInt(product.openingStock) || 0;
            const stockIn = parseInt(product.stockIn) || 0;
            const stockOut = parseInt(product.stockOut) || 0;
            const currentStock = opening + stockIn - stockOut;

            if (currentStock <= 0) {
                showToast(`Cannot record sale: ${product.name || 'This product'} is out of stock (${currentStock} available).`, "warning");
                return;
            }
            if (quantity > currentStock) {
                showToast(`Cannot sell ${quantity} units of ${product.name || 'this product'}. Only ${currentStock} in stock.`, "warning");
                return;
            }
        }

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
        logActivity('sale', 'Record Sale', `Recorded sale of ${quantity}x ${product ? product.name : 'items'} to ${customer ? customer.name : 'customer'}`);

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

    async updateSaleStatus(saleId, paymentStatus, deliveryStatus) {
        const sale = this.data.sales.find(s => s.id === saleId);
        if (!sale) return;

        const oldPaymentStatus = sale.paymentStatus;
        const oldDeliveryStatus = sale.deliveryStatus;

        sale.paymentStatus = paymentStatus;
        sale.deliveryStatus = deliveryStatus;

        // Stock adjustment logic when status changes to/from Cancelled
        const product = sale.productId ? this.data.products.find(p => p.id === sale.productId) : null;
        const qty = parseInt(sale.quantity) || 0;

        let stockDelta = 0;
        if (oldPaymentStatus !== 'Cancelled' && paymentStatus === 'Cancelled') {
            // Restore stock if order cancelled
            stockDelta = -qty;
            if (product) {
                product.stockOut = Math.max(0, (parseInt(product.stockOut) || 0) - qty);
            }
        } else if (oldPaymentStatus === 'Cancelled' && paymentStatus !== 'Cancelled') {
            // Re-deduct stock if order un-cancelled
            stockDelta = qty;
            if (product) {
                product.stockOut = (parseInt(product.stockOut) || 0) + qty;
            }
        }

        // Update customer status based on payment status change
        const customer = sale.customerId ? this.data.customers.find(c => c.id === sale.customerId) : null;
        if (paymentStatus === 'Paid' && customer) {
            customer.lastPurchase = getTodayISOString();
            if (customer.status === 'Lead' || customer.status === 'Inactive') {
                customer.status = 'Active';
            }
        } else if (paymentStatus === 'Cancelled' && customer) {
            // Check if customer has any other non-cancelled sales
            const otherActiveSales = this.data.sales.filter(
                s => s.customerId === customer.id && s.id !== saleId && s.paymentStatus !== 'Cancelled'
            );
            if (otherActiveSales.length === 0) {
                // No other active sales — revert customer to Lead
                customer.status = 'Lead';
                customer.lastPurchase = '';
            } else {
                // Update lastPurchase to the most recent non-cancelled sale
                const sortedSales = otherActiveSales.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
                customer.lastPurchase = sortedSales[0].date || '';
            }
        }

        this.saveLocalCache();
        renderAllSections();
        showToast(`Order status updated to ${paymentStatus} (${deliveryStatus}).`, "success");
        logActivity('sale', 'Update Sale', `Updated order ${saleId} to ${paymentStatus} / ${deliveryStatus}`);

        const db = fbManager.db;
        if (db) {
            try {
                await db.collection('sales').doc(saleId).update({
                    paymentStatus: paymentStatus,
                    deliveryStatus: deliveryStatus,
                    updatedAt: new Date().toISOString()
                });

                if (product && stockDelta !== 0) {
                    const inc = firebase.firestore.FieldValue.increment(stockDelta);
                    await db.collection('products').doc(product.id).update({ stockOut: inc }).catch(() => {});
                }

                if (customer && (paymentStatus === 'Paid' || paymentStatus === 'Cancelled')) {
                    await db.collection('customers').doc(customer.id).update({
                        lastPurchase: customer.lastPurchase,
                        status: customer.status
                    }).catch(() => {});
                }
            } catch (err) {
                console.error("Firestore updateSaleStatus error:", err);
            }
        }
    }

    async deleteSale(id) {
        showConfirmDialog(
            "Delete Sale Record",
            "Delete this sales order record? The deducted inventory stock will be restored.",
            "Delete & Restore Stock",
            async () => {
                const sale = this.data.sales.find(s => s.id === id);

                // Restore product stockOut locally
                if (sale && sale.productId) {
                    const product = this.data.products.find(p => p.id === sale.productId);
                    if (product) {
                        const restoredQty = parseInt(sale.quantity) || 0;
                        product.stockOut = Math.max(0, (parseInt(product.stockOut) || 0) - restoredQty);
                    }
                }

                // Delete sale locally
                this.data.sales = this.data.sales.filter(s => s.id !== id);
                this.saveLocalCache();
                renderAllSections();
                showToast("Sales order deleted and inventory stock restored.", "warning");
                logActivity('sale', 'Delete Sale', 'Deleted order ' + id);

                const db = fbManager.db;
                if (db) {
                    try {
                        await db.collection('sales').doc(id).delete();
                        if (sale && sale.productId) {
                            const dec = firebase.firestore.FieldValue.increment(-(parseInt(sale.quantity) || 0));
                            await db.collection('products').doc(sale.productId).update({ stockOut: dec }).catch(() => {});
                        }
                    } catch (err) {
                        console.error("Firestore delete sale error:", err);
                    }
                }
            }
        );
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
        logActivity('followup', 'Add Follow-up', `Scheduled follow-up for ${payload.customerName}`);

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
            logActivity('followup', 'Complete Follow-up', `Marked follow-up as completed for ${followup.customerName}`);
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
        showConfirmDialog(
            "Delete Follow-up",
            "Delete this follow-up reminder?",
            "Delete Follow-up",
            async () => {
                this.data.followups = this.data.followups.filter(f => f.id !== id);
                this.saveLocalCache();
                renderAllSections();
                showToast("Follow-up deleted.", "warning");
                logActivity('followup', 'Delete Follow-up', 'Deleted follow-up reminder');

                const db = fbManager.db;
                if (db) {
                    try {
                        await db.collection('followups').doc(id).delete();
                    } catch (err) {
                        console.error("Firestore delete followup error:", err);
                    }
                }
            }
        );
    }
}

// Global Store Instance
const store = new ProductionHubStore();

