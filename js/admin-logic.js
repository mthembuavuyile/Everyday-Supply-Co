import { db } from "./firebase.js";
import { 
    collection, addDoc, getDocs, query, orderBy, 
    doc, deleteDoc, updateDoc 
} from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";
import { moneyZA, byId } from "./utils.js";
import { manualProducts } from "./data.js";

// DOM Elements
const form = byId('product-form');
const status = byId('status');
const tbody = byId('admin-table-body');
const submitBtn = byId('submit-btn');
const cancelBtn = byId('cancel-btn');
const idInput = byId('p-id');

let allProducts = [];

// 1. Fetch and Merge Logic
async function renderAdminTable() {
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-gray-500">Loading inventory...</td></tr>`;
    
    let dbProducts = [];
    try {
        const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        
        dbProducts = snap.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                // Normalize Image field (DB might use imageUrl, JS uses image)
                image: data.imageUrl || data.image || 'https://via.placeholder.com/50'
            };
        });
    } catch (e) {
        console.error("Error loading DB:", e);
        status.textContent = "Error loading database items.";
    }

    // Combine: Manual products first or last? Let's put DB first (newest).
    allProducts = [...dbProducts, ...manualProducts];
    
    tbody.innerHTML = "";
    
    if (allProducts.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center">No products found.</td></tr>`;
        return;
    }

    allProducts.forEach(p => {
        // Check if manual using the flag we added in data.js
        const isManual = p.isManual === true;
        
        const tr = document.createElement('tr');
        tr.className = "hover:bg-gray-50 border-b border-gray-100 group transition-colors";
        
        // Conditional Action Buttons
        const actionButtons = !isManual 
            ? `<div class="flex gap-2">
                 <button class="edit-btn text-blue-600 hover:bg-blue-50 px-3 py-1 rounded text-sm font-medium transition" data-id="${p.id}">Edit</button>
                 <button class="delete-btn text-red-600 hover:bg-red-50 px-3 py-1 rounded text-sm font-medium transition" data-id="${p.id}">Delete</button>
               </div>`
            : `<span class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-500">
                 Read-only
               </span>`;

        tr.innerHTML = `
            <td class="p-4">
                <div class="flex items-center gap-3">
                    <img src="${p.image}" class="w-10 h-10 object-contain rounded border bg-white">
                    <div>
                        <div class="font-semibold text-gray-800">${p.name}</div>
                        ${isManual ? '<span class="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200">Hardcoded</span>' : '<span class="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200">Database</span>'}
                    </div>
                </div>
            </td>
            <td class="p-4 text-sm text-gray-600">${p.category}</td>
            <td class="p-4 font-mono text-sm font-medium text-gray-700">${moneyZA(p.price)}</td>
            <td class="p-4">
                ${actionButtons}
            </td>
        `;
        tbody.appendChild(tr);
    });

    attachListeners();
}

function attachListeners() {
    // Delete Logic
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            if(confirm("Are you sure you want to permanently delete this product?")) {
                try {
                    await deleteDoc(doc(db, "products", btn.dataset.id));
                    await renderAdminTable(); // Refresh table
                    status.textContent = "Product deleted.";
                    setTimeout(() => status.textContent = "", 3000);
                } catch (err) {
                    alert("Error deleting: " + err.message);
                }
            }
        });
    });

    // Edit Logic
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const product = allProducts.find(p => p.id === btn.dataset.id);
            if(product) {
                // Populate form
                idInput.value = product.id;
                byId('p-name').value = product.name;
                byId('p-price').value = product.price;
                byId('p-category').value = product.category;
                byId('p-image-url').value = product.image; // Maps 'image' back to input
                
                // Change UI state
                byId('btn-text').textContent = "Update Product";
                submitBtn.classList.replace('bg-emerald-600', 'bg-blue-600');
                submitBtn.classList.replace('hover:bg-emerald-700', 'hover:bg-blue-700');
                cancelBtn.classList.remove('hidden');
                
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    });
}

// Reset Form Logic
function resetForm() {
    form.reset();
    idInput.value = "";
    byId('btn-text').textContent = "Upload Product";
    submitBtn.classList.replace('bg-blue-600', 'bg-emerald-600');
    submitBtn.classList.replace('hover:bg-blue-700', 'hover:bg-emerald-700');
    cancelBtn.classList.add('hidden');
    status.textContent = "";
}

cancelBtn.addEventListener('click', resetForm);

// Create / Update Logic
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    submitBtn.disabled = true;
    status.textContent = "Processing...";
    
    const id = idInput.value;
    const isUpdate = !!id;

    // Standardize data structure for DB
    const data = {
        name: byId('p-name').value,
        price: parseFloat(byId('p-price').value),
        category: byId('p-category').value,
        imageUrl: byId('p-image-url').value, // DB expects imageUrl usually, or consistency
        updatedAt: new Date()
    };

    if (!isUpdate) {
        data.createdAt = new Date();
    }

    try {
        if (isUpdate) {
            await updateDoc(doc(db, "products", id), data);
            status.textContent = "Updated successfully!";
            status.className = "mt-4 text-center text-sm text-blue-600 font-bold";
        } else {
            await addDoc(collection(db, "products"), data);
            status.textContent = "Created successfully!";
            status.className = "mt-4 text-center text-sm text-emerald-600 font-bold";
        }
        
        resetForm();
        await renderAdminTable();
        
    } catch (err) {
        console.error(err);
        status.textContent = "Error: " + err.message;
        status.className = "mt-4 text-center text-sm text-red-600 font-bold";
    }
    
    submitBtn.disabled = false;
});

// Initial Load
renderAdminTable();