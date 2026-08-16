// --- RENDER SECTIONS ---

function renderAllSections() {
    renderDashboard();
    renderStock();
    renderCustomers();
    renderSales();
    renderFollowups();
    renderReports();
    renderTeamActivity();
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function getPaymentBadgeClass(status) {
    if (status === 'Paid') return 'badge-paid';
    if (status === 'Pending') return 'badge-pending';
    if (status === 'Credit') return 'badge-credit';
    if (status === 'Cancelled') return 'badge-cancelled';
    return 'badge-pending';
}

function getDeliveryBadgeClass(status) {
    if (status === 'Delivered') return 'badge-delivered';
    if (status === 'Processing') return 'badge-active';
    if (status === 'Cancelled') return 'badge-cancelled';
    return 'badge-pending';
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
    const boxesSold = sales
        .filter(s => s.paymentStatus === 'Paid')
        .reduce((sum, s) => sum + (parseInt(s.quantity) || 0), 0);
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
            const payBadgeClass = getPaymentBadgeClass(s.paymentStatus);
            tr.innerHTML = `
                <td><strong>${escapeHtml(s.id)}</strong></td>
                <td>${escapeHtml(s.date)}</td>
                <td>${escapeHtml(s.customerName)}</td>
                <td>${escapeHtml(s.productName)}</td>
                <td>${s.quantity}</td>
                <td><strong>${moneyZA(s.total)}</strong></td>
                <td><span class="badge ${payBadgeClass}">${escapeHtml(s.paymentStatus)}</span></td>
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
                <div style="display: flex; gap: 4px; justify-content: flex-end; flex-wrap: wrap;">
                    <button class="btn btn-sm btn-secondary" data-action="stock-in" data-id="${escapeHtml(p.id)}">+ Stock In</button>
                    <button class="btn btn-sm btn-secondary" data-action="correct-stock" data-id="${escapeHtml(p.id)}" title="Edit stock numbers directly">✏️ Correct</button>
                    <button class="btn btn-sm btn-secondary" data-action="edit-product" data-id="${escapeHtml(p.id)}">Edit</button>
                    <button class="btn btn-sm btn-danger-outline" data-action="delete-product" data-id="${escapeHtml(p.id)}">Delete</button>
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
        const waLink = buildWhatsAppUrl(c.phone, c.name, 'greeting');

        tr.innerHTML = `
            <td><strong>${escapeHtml(c.id)}</strong></td>
            <td><strong>${escapeHtml(c.name)}</strong></td>
            <td>
                <a href="${waLink}" target="_blank" class="wa-link">
                    <svg class="icon icon-sm" viewBox="0 0 24 24" style="color: #25D366;"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"></path></svg>
                    ${escapeHtml(c.phone)}
                </a>
            </td>
            <td>${escapeHtml(c.area)}</td>
            <td><span class="badge ${c.status === 'Active' || c.status === 'Repeat' ? 'badge-paid' : 'badge-credit'}">${escapeHtml(c.status)}</span></td>
            <td>${escapeHtml(c.dateAdded || '-')}</td>
            <td>${escapeHtml(c.lastPurchase || 'None')}</td>
            <td style="text-align: right;">
                <div style="display: flex; gap: 4px; justify-content: flex-end;">
                    <button class="btn btn-sm btn-primary" data-action="add-sale-cust" data-id="${escapeHtml(c.id)}">+ Sale</button>
                    <button class="btn btn-sm btn-secondary" data-action="edit-customer" data-id="${escapeHtml(c.id)}">Edit</button>
                    <button class="btn btn-sm btn-danger-outline" data-action="delete-customer" data-id="${escapeHtml(c.id)}">Delete</button>
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
                <td colspan="10" style="text-align: center; color: var(--slate-400); padding: 32px;">
                    No sales records found.
                </td>
            </tr>
        `;
        return;
    }

    filtered.forEach(s => {
        const tr = document.createElement('tr');
        const payBadgeClass = getPaymentBadgeClass(s.paymentStatus);
        const delBadgeClass = getDeliveryBadgeClass(s.deliveryStatus);
        const isPaid = s.paymentStatus === 'Paid';

        tr.innerHTML = `
            <td><strong>${escapeHtml(s.id)}</strong></td>
            <td>${escapeHtml(s.date)}</td>
            <td><strong>${escapeHtml(s.customerName)}</strong></td>
            <td>${escapeHtml(s.productName)}</td>
            <td><strong>${s.quantity}</strong></td>
            <td>${moneyZA(s.unitPrice)}</td>
            <td><strong>${moneyZA(s.total)}</strong></td>
            <td><span class="badge ${payBadgeClass}">${escapeHtml(s.paymentStatus)}</span></td>
            <td><span class="badge ${delBadgeClass}">${escapeHtml(s.deliveryStatus)}</span></td>
            <td style="text-align: right;">
                <div style="display: flex; gap: 4px; justify-content: flex-end; flex-wrap: wrap;">
                    ${!isPaid ? `<button class="btn btn-sm btn-primary" data-action="mark-sale-paid" data-id="${escapeHtml(s.id)}" title="Confirm payment received">✓ Mark Paid</button>` : ''}
                    <button class="btn btn-sm btn-secondary" data-action="edit-sale-status" data-id="${escapeHtml(s.id)}">✏️ Status</button>
                    <button class="btn btn-sm btn-danger-outline" data-action="delete-sale" data-id="${escapeHtml(s.id)}">Delete</button>
                </div>
            </td>
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

        // Determine WhatsApp context based on follow-up reason
        let waContext = 'general';
        if (f.reason === 'New lead') waContext = 'followup-new-lead';
        else if (f.reason === 'Repeat order') waContext = 'followup-repeat';
        else if (f.reason === 'Credit') waContext = 'followup-credit';
        const waFollowupLink = buildWhatsAppUrl(f.phone, f.customerName, waContext);

        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; items-center; margin-bottom: 12px;">
                <span class="badge ${isPending ? 'badge-credit' : 'badge-paid'}">${escapeHtml(f.status)}</span>
                <span style="font-size: 12px; color: var(--slate-500); font-weight: 600;">Date: ${escapeHtml(f.date)}</span>
            </div>
            <h3 style="font-size: 16px; font-weight: 700; color: var(--slate-900); margin-bottom: 4px;">${escapeHtml(f.customerName)}</h3>
            <p style="font-size: 12px; color: var(--slate-500); margin-bottom: 12px;">Reason: <strong>${escapeHtml(f.reason)}</strong></p>
            <p style="font-size: 13px; color: var(--slate-700); background: var(--slate-50); padding: 10px; border-radius: var(--radius-sm); margin-bottom: 16px;">${escapeHtml(f.notes || 'No extra details.')}</p>
            <div style="display: flex; gap: 8px; justify-content: flex-end; flex-wrap: wrap;">
                ${f.phone ? `<a href="${waFollowupLink}" target="_blank" class="btn btn-sm btn-wa"><svg class="icon icon-sm" viewBox="0 0 24 24" style="fill: #fff; stroke: none;"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"></path></svg> WhatsApp</a>` : ''}
                ${isPending ? `<button class="btn btn-sm btn-primary" data-action="complete-followup" data-id="${escapeHtml(f.id)}">✓ Mark Done</button>` : ''}
                <button class="btn btn-sm btn-danger-outline" data-action="delete-followup" data-id="${escapeHtml(f.id)}">Delete</button>
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

