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

// Stock Correction Modal
function openStockCorrectionModal(productId) {
    const prod = store.getProducts().find(p => p.id === productId);
    if (!prod) return;

    if (byId('stockCorrProductId')) byId('stockCorrProductId').value = prod.id;
    if (byId('stockCorrProductName')) byId('stockCorrProductName').textContent = prod.name;
    if (byId('stockCorrOpening')) byId('stockCorrOpening').value = prod.openingStock;
    if (byId('stockCorrIn')) byId('stockCorrIn').value = prod.stockIn;
    if (byId('stockCorrOut')) byId('stockCorrOut').value = prod.stockOut;

    updateStockCorrectionPreview();
    openModal('stockCorrectionModal');
}

function updateStockCorrectionPreview() {
    const opening = parseInt(byId('stockCorrOpening')?.value) || 0;
    const stockIn = parseInt(byId('stockCorrIn')?.value) || 0;
    const stockOut = parseInt(byId('stockCorrOut')?.value) || 0;
    const result = opening + stockIn - stockOut;
    const preview = byId('stockCorrPreview');
    if (preview) {
        preview.textContent = result + ' boxes';
        preview.style.color = result < 0 ? 'var(--danger)' : 'var(--primary)';
    }
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

// Edit Sale Status Modal
function openEditSaleStatusModal(saleId) {
    const sales = store.getSales();
    const sale = sales.find(s => s.id === saleId);
    if (!sale) return;

    if (byId('editSaleId')) byId('editSaleId').value = sale.id;
    if (byId('editSalePaymentStatus')) byId('editSalePaymentStatus').value = sale.paymentStatus || 'Pending';
    if (byId('editSaleDeliveryStatus')) byId('editSaleDeliveryStatus').value = sale.deliveryStatus || 'Pending WhatsApp';

    openModal('editSaleStatusModal');
}

// FORM SUBMISSIONS
function initForms() {
    // Edit Sale Status Form
    const editSaleStatusForm = byId('editSaleStatusForm');
    if (editSaleStatusForm) {
        editSaleStatusForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const saleId = byId('editSaleId').value;
            const paymentStatus = byId('editSalePaymentStatus').value;
            const deliveryStatus = byId('editSaleDeliveryStatus').value;
            await store.updateSaleStatus(saleId, paymentStatus, deliveryStatus);
            closeModal('editSaleStatusModal');
        });
    }
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

    // Stock Correction Form
    const stockCorrForm = byId('stockCorrectionForm');
    if (stockCorrForm) {
        stockCorrForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = byId('stockCorrProductId').value;
            const opening = byId('stockCorrOpening').value;
            const stockIn = byId('stockCorrIn').value;
            const stockOut = byId('stockCorrOut').value;
            await store.correctStock(id, opening, stockIn, stockOut);
            closeModal('stockCorrectionModal');
        });

        // Live preview listeners
        ['stockCorrOpening', 'stockCorrIn', 'stockCorrOut'].forEach(fieldId => {
            const el = byId(fieldId);
            if (el) el.addEventListener('input', updateStockCorrectionPreview);
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

    const companySlug = (fbManager.branding?.companyName || 'Export').replace(/\s+/g, '_');
    downloadCSV(csv, `${companySlug}_Sales_Report_${getTodayISOString()}.csv`);
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

    const companySlug = (fbManager.branding?.companyName || 'Export').replace(/\s+/g, '_');
    downloadCSV(csv, `${companySlug}_Customers_${getTodayISOString()}.csv`);
}

function exportProductsCSV() {
    const products = store.getProducts();
    if (products.length === 0) {
        showToast("No product data available to export.", "warning");
        return;
    }

    let csv = 'Name,Category,Price,Opening Stock,Stock In,Stock Out,Current Stock,Min Stock,Image URL\n';
    products.forEach(p => {
        csv += `"${p.name}","${p.category}",${p.price},${p.openingStock},${p.stockIn},${p.stockOut},${p.currentStock},${p.minStock},"${p.image || ''}"\n`;
    });

    const companySlug = (fbManager.branding?.companyName || 'Export').replace(/\s+/g, '_');
    downloadCSV(csv, `${companySlug}_Products_${getTodayISOString()}.csv`);
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

    // Trigger section-specific re-renders
    if (sectionId === 'team-activity' && typeof renderTeamActivity === 'function') {
        renderTeamActivity();
    }

    // Touch presence
    if (typeof touchPresence === 'function') {
        touchPresence('Viewing ' + sectionId);
    }

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
document.addEventListener('DOMContentLoaded', async () => {
    // Load external config before initializing Firebase
    await fbManager.loadConfig();
    store.loadLocalCache();
    initAuthGateway();
    initNavigation();
    initForms();

    // CSV file input listener
    const csvFileInput = byId('csvFileInput');
    if (csvFileInput) {
        csvFileInput.addEventListener('change', handleCSVFileSelect);
    }
});

