// --- CSV IMPORT ENGINE ---

/**
 * Parse a CSV string into an array of objects using the first row as headers.
 * Handles quoted fields with commas and newlines inside them.
 */
function parseCSV(text) {
    const rows = [];
    let current = '';
    let inQuotes = false;
    const lines = [];

    // Split into lines respecting quoted newlines
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (ch === '"') {
            inQuotes = !inQuotes;
            current += ch;
        } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
            if (current.trim()) lines.push(current);
            current = '';
            if (ch === '\r' && text[i + 1] === '\n') i++; // skip \r\n
        } else {
            current += ch;
        }
    }
    if (current.trim()) lines.push(current);

    if (lines.length < 2) return { headers: [], data: [] };

    // Parse individual line into fields
    function parseLine(line) {
        const fields = [];
        let field = '';
        let quoted = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') {
                if (quoted && line[i + 1] === '"') {
                    field += '"';
                    i++;
                } else {
                    quoted = !quoted;
                }
            } else if (ch === ',' && !quoted) {
                fields.push(field.trim());
                field = '';
            } else {
                field += ch;
            }
        }
        fields.push(field.trim());
        return fields;
    }

    const headers = parseLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));

    for (let i = 1; i < lines.length; i++) {
        const values = parseLine(lines[i]);
        const obj = {};
        headers.forEach((h, idx) => {
            obj[h] = values[idx] || '';
        });
        rows.push(obj);
    }

    return { headers, data: rows };
}

// CSV Import state
let csvImportMode = ''; // 'products' or 'customers'
let csvImportData = [];

function openImportModal(mode) {
    csvImportMode = mode;
    csvImportData = [];
    const modal = byId('importModal');
    const title = byId('importModalTitle');
    const previewArea = byId('importPreviewArea');
    const fileInput = byId('csvFileInput');
    const confirmBtn = byId('importConfirmBtn');

    if (title) title.textContent = mode === 'products' ? 'Import Products from CSV' : 'Import Customers from CSV';
    if (previewArea) previewArea.innerHTML = getImportInstructions(mode);
    if (fileInput) fileInput.value = '';
    if (confirmBtn) confirmBtn.disabled = true;

    openModal('importModal');
}

function getImportInstructions(mode) {
    if (mode === 'products') {
        return `
            <div class="import-instructions">
                <h4>CSV Format Required</h4>
                <p>Your CSV file must have the following column headers (first row):</p>
                <div class="import-columns-preview">
                    <code>Name, Category, Price, Opening Stock, Min Stock, Image URL</code>
                </div>
                <p style="font-size: 12px; color: var(--slate-500); margin-top: 8px;">Columns are matched by name (case-insensitive). Extra columns are ignored.</p>
            </div>
        `;
    } else {
        return `
            <div class="import-instructions">
                <h4>CSV Format Required</h4>
                <p>Your CSV file must have the following column headers (first row):</p>
                <div class="import-columns-preview">
                    <code>Name, Phone, Area, Status, Notes</code>
                </div>
                <p style="font-size: 12px; color: var(--slate-500); margin-top: 8px;">Status can be: Lead, Active, Repeat, or Inactive. Defaults to Active if omitted.</p>
            </div>
        `;
    }
}

function handleCSVFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
        showToast('Please select a .csv file.', 'warning');
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        const text = e.target.result;
        const parsed = parseCSV(text);

        if (parsed.data.length === 0) {
            showToast('CSV file is empty or has no data rows.', 'warning');
            return;
        }

        csvImportData = parsed.data;
        renderImportPreview(parsed);

        const confirmBtn = byId('importConfirmBtn');
        if (confirmBtn) confirmBtn.disabled = false;
    };
    reader.readAsText(file);
}

function renderImportPreview(parsed) {
    const previewArea = byId('importPreviewArea');
    if (!previewArea) return;

    const previewRows = parsed.data.slice(0, 10); // Show first 10 rows
    const totalRows = parsed.data.length;

    let html = `
        <div class="import-preview-header">
            <strong>${totalRows} row${totalRows !== 1 ? 's' : ''} found</strong>
            ${totalRows > 10 ? `<span style="color: var(--slate-500); font-size: 12px;">Showing first 10</span>` : ''}
        </div>
        <div class="table-responsive" style="max-height: 300px; overflow-y: auto;">
            <table class="data-table">
                <thead><tr>${parsed.headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>
                <tbody>
    `;

    previewRows.forEach(row => {
        html += '<tr>';
        parsed.headers.forEach(h => {
            html += `<td>${escapeHtml(row[h] || '')}</td>`;
        });
        html += '</tr>';
    });

    html += '</tbody></table></div>';
    previewArea.innerHTML = html;
}

async function confirmCSVImport() {
    if (csvImportData.length === 0) {
        showToast('No data to import.', 'warning');
        return;
    }

    const confirmBtn = byId('importConfirmBtn');
    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Importing...';
    }

    try {
        if (csvImportMode === 'products') {
            await importProductsFromData(csvImportData);
        } else if (csvImportMode === 'customers') {
            await importCustomersFromData(csvImportData);
        }
        closeModal('importModal');
    } catch (err) {
        console.error('Import error:', err);
        showToast('Import failed: ' + err.message, 'warning');
    }

    if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Import All';
    }
}

async function importProductsFromData(data) {
    let imported = 0;
    let skipped = 0;

    for (const row of data) {
        // Map flexible column names
        const name = row.name || row.productname || row.item || '';
        if (!name) { skipped++; continue; }

        const productData = {
            name: name,
            category: row.category || row.cat || 'General',
            price: row.price || row.sellingprice || row.unitprice || '0',
            imageUrl: row.imageurl || row.image || row.img || '',
            openingStock: row.openingstock || row.opening || row.stock || row.quantity || '0',
            minStock: row.minstock || row.min || row.minalert || '5'
        };

        await store.saveProduct(productData);
        imported++;
    }

    showToast(`Imported ${imported} product${imported !== 1 ? 's' : ''}${skipped > 0 ? `, ${skipped} skipped (no name)` : ''}.`, 'success');
}

async function importCustomersFromData(data) {
    let imported = 0;
    let skipped = 0;

    for (const row of data) {
        const name = row.name || row.fullname || row.customername || '';
        if (!name) { skipped++; continue; }

        const customerData = {
            name: name,
            phone: row.phone || row.whatsapp || row.mobile || row.cellphone || row.tel || '',
            area: row.area || row.residence || row.location || row.address || '',
            status: row.status || 'Active',
            notes: row.notes || row.note || row.deliverypreferences || ''
        };

        await store.saveCustomer(customerData);
        imported++;
    }

    showToast(`Imported ${imported} customer${imported !== 1 ? 's' : ''}${skipped > 0 ? `, ${skipped} skipped (no name)` : ''}.`, 'success');
}

