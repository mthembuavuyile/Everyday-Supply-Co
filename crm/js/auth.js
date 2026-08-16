// --- SINGLE AUTHENTICATION GATEWAY ---
function initAuthGateway() {
    const authOverlay = byId('auth-overlay');
    const mainApp = byId('main-app');
    const authForm = byId('authLoginForm');
    const authErrorMsg = byId('authErrorMsg');
    const googleBtn = byId('googleSignInBtn');

    if (!fbManager.init()) return;

    const ALLOWED_EMAILS = [
        'mthembuavuyile@gmail.com',
        'asandamanelisi1998@gmail.com',
        'ayandalucasn@gmail.com'
    ];

    fbManager.auth.onAuthStateChanged(user => {
        if (user) {
            const userEmail = (user.email || '').toLowerCase();
            
            if (ALLOWED_EMAILS.includes(userEmail)) {
                if (authOverlay) authOverlay.style.display = 'none';
                if (mainApp) mainApp.style.display = 'flex';

                const email = user.email || 'Admin User';
                localStorage.setItem('lastUserEmail', email);
                if (byId('userEmailDisplay')) byId('userEmailDisplay').textContent = email;
                if (byId('settingsEmailDisplay')) byId('settingsEmailDisplay').textContent = email;
                if (byId('settingsAvatar')) byId('settingsAvatar').textContent = email.charAt(0).toUpperCase();

                // Log sign-in activity
                logActivity('auth', 'Sign In', `${getTeamMemberName(email)} signed in`, email);

                // Connect real-time Firestore listeners for production data
                store.initFirestoreListeners();

                // Initialize activity log listener
                initActivityLogListener();
            } else {
                // Unauthorized user
                fbManager.auth.signOut().then(() => {
                    if (authErrorMsg) {
                        authErrorMsg.textContent = "Access Denied: You are not an authorized team member.";
                        authErrorMsg.style.display = 'block';
                    }
                });
            }
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
                const currentEmail = fbManager.auth.currentUser ? fbManager.auth.currentUser.email : 'Unknown';
                logActivity('auth', 'Sign Out', `${getTeamMemberName(currentEmail)} signed out`, currentEmail);
                fbManager.auth.signOut();
            });
        }
    });

    // Low Stock Threshold setting
    const savedThreshold = localStorage.getItem('lowStockThreshold');
    const thresholdInput = byId('lowStockThresholdInput');
    if (thresholdInput && savedThreshold) {
        thresholdInput.value = savedThreshold;
    }

    const saveThresholdBtn = byId('saveLowStockThresholdBtn');
    if (saveThresholdBtn) {
        saveThresholdBtn.addEventListener('click', () => {
            const val = parseInt(thresholdInput.value) || 5;
            localStorage.setItem('lowStockThreshold', val);
            const status = byId('lowStockThresholdStatus');
            if (status) {
                status.style.display = 'block';
                setTimeout(() => { status.style.display = 'none'; }, 3000);
            }
            renderAllSections();
            showToast(`Low stock alert threshold updated to ${val} units.`, 'success');
            logActivity('settings', 'Update Settings', `Changed low stock threshold to ${val}`);
        });
    }
}

