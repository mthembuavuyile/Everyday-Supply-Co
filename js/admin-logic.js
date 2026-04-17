// js/admin-logic.js
import { db, auth } from "./firebase.js";
import { 
    collection, addDoc, getDocs, query, orderBy, 
    doc, deleteDoc, updateDoc 
} from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";
import { 
    signInWithEmailAndPassword, onAuthStateChanged, signOut 
} from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { moneyZA, byId } from "./utils.js";
import { FALLBACK_IMAGE } from "./data.js";

// DOM Elements - Shell
const loginOverlay = byId('login-overlay');
const dashboard = byId('dashboard');
const loginForm = byId('login-form');
const authError = byId('auth-error');
const logoutBtn = byId('logout-btn');
const adminEmailDisplay = byId('admin-email-display');
const settingsEmail = byId('settings-email');
const toastContainer = byId('toast-container');

// Toast Notification System
function showToast(message, type = 'success') {
    if (!toastContainer) return;
    
    const toast = document.createElement('div');
    const isError = type === 'error';
    const bgClass = isError ? 'bg-red-600' : 'bg-gray-900';
    const icon = isError ? 'alert-circle' : 'check-circle-2';
    
    toast.className = `${bgClass} text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 font-bold text-sm transform transition-all duration-300 translate-y-[-100%] opacity-0`;
    
    toast.innerHTML = `
        <i data-lucide="${icon}" class="w-5 h-5 text-white/90"></i>
        <span>${message}</span>
    `;
    
    toastContainer.appendChild(toast);
    if (typeof lucide !== 'undefined') lucide.createIcons();
    
    // Animate in
    requestAnimationFrame(() => {
        toast.classList.remove('translate-y-[-100%]', 'opacity-0');
        toast.classList.add('translate-y-0', 'opacity-100');
    });
    
    // Animate out
    setTimeout(() => {
        toast.classList.remove('translate-y-0', 'opacity-100');
        toast.classList.add('translate-y-[-100%]', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// View Containers
const inventoryView = byId('inventory-view');
const settingsView = byId('settings-view');
const viewTitle = byId('view-title');

// Navigation
const navInventory = byId('nav-inventory');
const navSettings = byId('nav-settings');
const searchToggle = byId('search-toggle');
const searchContainer = byId('search-container');
const inventorySearch = byId('inventory-search');

// Modal Elements
const productModal = byId('product-modal');
const productModalContent = byId('product-modal-content');
const openAddModalBtn = byId('open-add-modal');
const closeModalBtn = byId('close-modal');
const modalTitle = byId('modal-title');

// Form Elements
const form = byId('product-form');
const status = byId('status');
const inventoryList = byId('inventory-list');
const submitBtn = byId('submit-btn');
const idInput = byId('p-id');
const btnText = byId('btn-text');

let allProducts = [];
let currentSearch = "";

// --- AUTHENTICATION LOGIC ---

onAuthStateChanged(auth, (user) => {
    if (user) {
        if (loginOverlay) loginOverlay.classList.add('hidden');
        if (dashboard) dashboard.classList.remove('hidden');
        const emailText = user.email;
        if (adminEmailDisplay) adminEmailDisplay.textContent = emailText;
        if (settingsEmail) settingsEmail.textContent = emailText;
        renderInventory();
    } else {
        if (loginOverlay) loginOverlay.classList.remove('hidden');
        if (dashboard) dashboard.classList.add('hidden');
        if (inventoryList) inventoryList.innerHTML = '';
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
});

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = byId('email').value;
        const password = byId('password').value;
        
        if (authError) authError.classList.add('hidden');
        
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            console.error(error);
            if (authError) {
                authError.textContent = "Invalid Credentials. Access Denied.";
                authError.classList.remove('hidden');
            }
        }
    });
}

if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        signOut(auth);
    });
}

// --- NAVIGATION & VIEW LOGIC ---

function switchView(view) {
    if (!inventoryView || !settingsView || !viewTitle || !navInventory || !navSettings) return;

    if (view === 'inventory') {
        inventoryView.classList.remove('hidden');
        settingsView.classList.add('hidden');
        viewTitle.textContent = "Inventory";
        navInventory.classList.add('text-emerald-600', 'scale-110');
        navInventory.classList.remove('text-gray-400');
        navSettings.classList.remove('text-emerald-600', 'scale-110');
        navSettings.classList.add('text-gray-400');
    } else {
        inventoryView.classList.add('hidden');
        settingsView.classList.remove('hidden');
        viewTitle.textContent = "Admin";
        navSettings.classList.add('text-emerald-600', 'scale-110');
        navSettings.classList.remove('text-gray-400');
        navInventory.classList.remove('text-emerald-600', 'scale-110');
        navInventory.classList.add('text-gray-400');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

if (navInventory) navInventory.addEventListener('click', () => switchView('inventory'));
if (navSettings) navSettings.addEventListener('click', () => switchView('settings'));

if (searchToggle) {
    searchToggle.addEventListener('click', () => {
        if (searchContainer) {
            searchContainer.classList.toggle('hidden');
            if (!searchContainer.classList.contains('hidden') && inventorySearch) {
                inventorySearch.focus();
            }
        }
    });
}

if (inventorySearch) {
    inventorySearch.addEventListener('input', (e) => {
        currentSearch = e.target.value.toLowerCase();
        displayProducts();
    });
}

// --- MODAL LOGIC ---

function openModal(isEdit = false, product = null) {
    if (!productModal || !productModalContent) return;

    productModal.classList.remove('hidden', 'opacity-0');
    productModal.classList.add('modal-fixed', 'opacity-100');
    
    // Force a tiny delay to ensure classes are applied before sliding up
    requestAnimationFrame(() => {
        productModalContent.classList.remove('translate-y-full');
        productModalContent.classList.add('translate-y-0');
    });
    
    if (isEdit && product) {
        if (modalTitle) modalTitle.textContent = "Edit Product";
        if (btnText) btnText.textContent = "Update Product";
        if (idInput) idInput.value = product.id;
        byId('p-name').value = product.name;
        byId('p-price').value = product.price;
        byId('p-category').value = product.category;
        byId('p-image-url').value = product.imageUrl || product.image || "";
    } else {
        if (modalTitle) modalTitle.textContent = "Add Product";
        if (btnText) btnText.textContent = "Save Product";
        resetForm();
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function closeModal() {
    if (!productModal || !productModalContent) return;

    productModalContent.classList.add('translate-y-full');
    productModalContent.classList.remove('translate-y-0');
    productModal.classList.remove('opacity-100');
    productModal.classList.add('opacity-0');
    
    setTimeout(() => {
        productModal.classList.add('hidden');
        productModal.classList.remove('modal-fixed');
    }, 300);
}

if (openAddModalBtn) openAddModalBtn.addEventListener('click', () => openModal(false));
if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
if (productModal) {
    productModal.addEventListener('click', (e) => {
        if (e.target === productModal) closeModal();
    });
}

// --- INVENTORY LOGIC ---

async function renderInventory() {
    if (!inventoryList) return;
    
    try {
        const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        
        allProducts = snap.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            image: doc.data().imageUrl || doc.data().image || FALLBACK_IMAGE
        }));
        
        displayProducts();
    } catch (e) {
        console.error("Error loading DB:", e);
        if (status) status.textContent = "Access Denied.";
    }
}

function displayProducts() {
    if (!inventoryList) return;
    inventoryList.innerHTML = "";
    
    const filtered = allProducts.filter(p => 
        (p.name && p.name.toLowerCase().includes(currentSearch)) || 
        (p.category && p.category.toLowerCase().includes(currentSearch))
    );

    if (filtered.length === 0) {
        inventoryList.innerHTML = `
            <div class="col-span-full py-12 text-center text-gray-400">
                <i data-lucide="package-search" class="w-12 h-12 mx-auto mb-2 opacity-20"></i>
                <p>No products found</p>
            </div>
        `;
        if (typeof lucide !== 'undefined') lucide.createIcons();
        return;
    }

    filtered.forEach(p => {
        const div = document.createElement('div');
        div.className = "bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex gap-4 items-center group active:scale-[0.98] transition-all";
        
        div.innerHTML = `
            <div class="w-20 h-20 bg-gray-50 rounded-2xl flex-shrink-0 overflow-hidden border border-gray-100/60 p-1 flex items-center justify-center">
                <img src="${p.image}" class="w-full h-full object-contain" onerror="this.src='${FALLBACK_IMAGE}'">
            </div>
            <div class="flex-1 min-w-0">
                <p class="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-0.5">${p.category}</p>
                <h4 class="font-bold text-gray-900 truncate">${p.name}</h4>
                <p class="font-bold text-gray-500 mt-1">${moneyZA(p.price)}</p>
            </div>
            <div class="flex flex-col gap-2">
                <button class="edit-btn p-3 text-blue-600 bg-blue-50 rounded-2xl hover:bg-blue-100 transition" data-id="${p.id}">
                    <i data-lucide="edit-3" class="w-5 h-5"></i>
                </button>
                <button class="delete-btn p-3 text-red-600 bg-red-50 rounded-2xl hover:bg-red-100 transition" data-id="${p.id}">
                    <i data-lucide="trash-2" class="w-5 h-5"></i>
                </button>
            </div>
        `;
        inventoryList.appendChild(div);
    });

    attachItemListeners();
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function attachItemListeners() {
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if(confirm("Permanently delete this product?")) {
                try {
                    await deleteDoc(doc(db, "products", btn.dataset.id));
                    showToast("Product deleted successfully");
                    await renderInventory();
                } catch (err) {
                    showToast("Permission denied.", "error");
                }
            }
        });
    });

    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const product = allProducts.find(p => p.id === btn.dataset.id);
            if(product) {
                openModal(true, product);
            }
        });
    });
}

function resetForm() {
    if (form) form.reset();
    if (idInput) idInput.value = "";
    if (status) status.textContent = "";
}

if (form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (submitBtn) submitBtn.disabled = true;
        if (status) {
            status.textContent = "Processing...";
            status.className = "mt-4 text-center text-sm font-bold h-6 text-gray-500";
        }
        
        const id = idInput ? idInput.value : "";
        const isUpdate = !!id;

        const data = {
            name: byId('p-name').value,
            price: parseFloat(byId('p-price').value),
            category: byId('p-category').value,
            imageUrl: byId('p-image-url').value,
            updatedAt: new Date()
        };

        if (!isUpdate) {
            data.createdAt = new Date();
        }

        try {
            if (isUpdate) {
                await updateDoc(doc(db, "products", id), data);
                showToast("Product updated successfully");
            } else {
                await addDoc(collection(db, "products"), data);
                showToast("Product added successfully");
            }
            
            closeModal();
            await renderInventory();
            
        } catch (err) {
            console.error(err);
            showToast("Error: Permission Denied.", "error");
        }
        
        if (submitBtn) submitBtn.disabled = false;
        if (status) {
            status.textContent = "";
            status.className = "";
        }
    });
}