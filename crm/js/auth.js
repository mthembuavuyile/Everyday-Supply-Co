// Everyday Supply Co. CRM - Administrator Authentication Gateway & Dual-Provider Security
// Authorized administrator access control

const ALLOWED_ADMIN_EMAILS = [
    'mthembuavuyile@gmail.com',
    'asandamanelisi1998@gmail.com',
    'ayandalucasn@gmail.com'
];

function isAllowedAdminEmail(email) {
    if (!email) return false;
    return ALLOWED_ADMIN_EMAILS.includes(email.toLowerCase().trim());
}

// --- SINGLE AUTHENTICATION GATEWAY ---
function initAuthGateway() {
    const authOverlay = byId('auth-overlay');
    const mainApp = byId('main-app');
    const authForm = byId('authLoginForm');
    const authResetForm = byId('authResetForm');
    const authErrorMsg = byId('authErrorMsg');
    const authSuccessMsg = byId('authSuccessMsg');
    const resetErrorMsg = byId('resetErrorMsg');
    const resetSuccessMsg = byId('resetSuccessMsg');
    const googleBtn = byId('googleSignInBtn');
    const loginSubmitBtn = byId('loginSubmitBtn');
    const resetSubmitBtn = byId('resetSubmitBtn');

    if (!fbManager.init()) return;

    // --- 1. FIREBASE AUTH STATE LISTENER ---
    fbManager.auth.onAuthStateChanged(async user => {
        if (user) {
            const userEmail = (user.email || '').toLowerCase().trim();
            
            if (isAllowedAdminEmail(userEmail)) {
                // Authorized Administrator
                if (authOverlay) authOverlay.style.display = 'none';
                if (mainApp) mainApp.style.display = 'flex';

                const email = user.email || 'Admin User';
                localStorage.setItem('lastUserEmail', email);

                // Update UI Display Elements
                if (byId('userEmailDisplay')) byId('userEmailDisplay').textContent = email;
                if (byId('settingsEmailDisplay')) byId('settingsEmailDisplay').textContent = email;
                if (byId('settingsAvatar')) byId('settingsAvatar').textContent = email.charAt(0).toUpperCase();

                // Highlight active quick pill on login card if opened
                highlightActiveAdminPill(email);

                // Start real-time presence heartbeat tracking
                if (typeof startPresenceTracking === 'function') {
                    startPresenceTracking(email);
                }

                // Log sign-in activity (deduplicated by session)
                const lastSessionLogged = sessionStorage.getItem('lastAuthSessionEmail');
                if (lastSessionLogged !== email) {
                    logActivity('auth', 'Sign In', `${getTeamMemberName(email)} signed into CRM`, email);
                    sessionStorage.setItem('lastAuthSessionEmail', email);
                }

                // Connect real-time Firestore listeners for production data
                store.initFirestoreListeners();

                // Initialize activity log listener
                initActivityLogListener();

                // Refresh Admin Settings Security Provider Status
                updateProviderStatusUI(user);

                // Re-render team activity and dashboard
                if (typeof renderAllSections === 'function') {
                    renderAllSections();
                }
            } else {
                // Unauthorized user attempting access
                console.warn(`Unauthorized CRM access attempt blocked for: ${userEmail}`);
                if (typeof stopPresenceTracking === 'function') stopPresenceTracking();
                await fbManager.auth.signOut();
                
                if (authOverlay) authOverlay.style.display = 'flex';
                if (mainApp) mainApp.style.display = 'none';
                
                if (authErrorMsg) {
                    authErrorMsg.innerHTML = `<strong>Access Denied:</strong> The account <code>${userEmail}</code> is not an authorized administrator. Access is restricted to authorized administrators only.`;
                    authErrorMsg.style.display = 'block';
                }
            }
        } else {
            // Signed out state
            if (typeof stopPresenceTracking === 'function') stopPresenceTracking();
            if (authOverlay) authOverlay.style.display = 'flex';
            if (mainApp) mainApp.style.display = 'none';

            // Pre-fill last used email if available
            const savedEmail = localStorage.getItem('lastUserEmail');
            if (savedEmail && isAllowedAdminEmail(savedEmail)) {
                if (byId('loginEmail')) byId('loginEmail').value = savedEmail;
                if (byId('resetEmail')) byId('resetEmail').value = savedEmail;
                highlightActiveAdminPill(savedEmail);
            }
        }
    });

    // --- 2. QUICK ADMIN SELECTOR PILLS ---
    const adminPills = document.querySelectorAll('.admin-pill');
    adminPills.forEach(pill => {
        pill.addEventListener('click', () => {
            const email = pill.dataset.email;
            if (email) {
                if (byId('loginEmail')) byId('loginEmail').value = email;
                if (byId('resetEmail')) byId('resetEmail').value = email;
                highlightActiveAdminPill(email);
                
                if (authErrorMsg) authErrorMsg.style.display = 'none';
                if (resetErrorMsg) resetErrorMsg.style.display = 'none';

                const passInput = byId('loginPassword');
                if (passInput && authForm && authForm.style.display !== 'none') {
                    passInput.focus();
                }
            }
        });
    });

    function highlightActiveAdminPill(email) {
        adminPills.forEach(pill => {
            if (pill.dataset.email.toLowerCase() === (email || '').toLowerCase()) {
                pill.classList.add('active');
            } else {
                pill.classList.remove('active');
            }
        });
    }

    // --- 3. PASSWORD VISIBILITY TOGGLE ---
    setupPasswordToggle('toggleLoginPasswordBtn', 'loginPassword');
    setupPasswordToggle('toggleSettingsNewPassBtn', 'settingsNewPassword');
    setupPasswordToggle('toggleSettingsConfirmPassBtn', 'settingsConfirmPassword');

    // --- 4. VIEW TOGGLING (LOGIN VS FORGOT/SETUP PASSWORD) ---
    const switchToForgotBtn = byId('switchToForgotBtn');
    const backToLoginBtn = byId('backToLoginBtn');

    if (switchToForgotBtn) {
        switchToForgotBtn.addEventListener('click', () => {
            if (authForm) authForm.style.display = 'none';
            if (authResetForm) authResetForm.style.display = 'flex';
            if (authErrorMsg) authErrorMsg.style.display = 'none';
            if (resetErrorMsg) resetErrorMsg.style.display = 'none';
            if (resetSuccessMsg) resetSuccessMsg.style.display = 'none';

            const currentLoginEmail = byId('loginEmail')?.value;
            if (currentLoginEmail && byId('resetEmail')) {
                byId('resetEmail').value = currentLoginEmail;
            }
        });
    }

    if (backToLoginBtn) {
        backToLoginBtn.addEventListener('click', () => {
            if (authResetForm) authResetForm.style.display = 'none';
            if (authForm) authForm.style.display = 'flex';
            if (authErrorMsg) authErrorMsg.style.display = 'none';
            if (resetErrorMsg) resetErrorMsg.style.display = 'none';
        });
    }

    // --- 5. EMAIL & PASSWORD SIGN-IN HANDLER ---
    if (authForm) {
        authForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = (byId('loginEmail')?.value || '').trim();
            const password = byId('loginPassword')?.value || '';

            if (authErrorMsg) authErrorMsg.style.display = 'none';
            if (authSuccessMsg) authSuccessMsg.style.display = 'none';

            // Client-side whitelist guard
            if (!isAllowedAdminEmail(email)) {
                if (authErrorMsg) {
                    authErrorMsg.innerHTML = `<strong>Access Restricted:</strong> <code>${email || 'This address'}</code> is not an authorized administrator.`;
                    authErrorMsg.style.display = 'block';
                }
                return;
            }

            setButtonLoading(loginSubmitBtn, true, 'Verifying...');

            try {
                await fbManager.auth.signInWithEmailAndPassword(email, password);
                // onAuthStateChanged will handle redirection and setup
            } catch (err) {
                console.error("Auth error:", err);
                let message = "Invalid login credentials. Please check your password.";

                if (err.code === 'auth/user-not-found') {
                    message = `No password login found for this account. If you originally signed in with Google, click <strong>"Forgot / Set Password?"</strong> above or use <strong>"Sign in with Google"</strong>.`;
                } else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential' || err.code === 'auth/invalid-login-credentials') {
                    message = `Incorrect password. If you need to reset or create a password, click <strong>"Forgot / Set Password?"</strong>.`;
                } else if (err.code === 'auth/too-many-requests') {
                    message = "Access temporarily locked due to multiple failed attempts. Please reset your password or wait a few minutes.";
                } else if (err.code === 'auth/network-request-failed') {
                    message = "Network error. Please check your internet connection.";
                }

                if (authErrorMsg) {
                    authErrorMsg.innerHTML = message;
                    authErrorMsg.style.display = 'block';
                }
            } finally {
                setButtonLoading(loginSubmitBtn, false, 'Unlock Dashboard');
            }
        });
    }

    // --- 6. GOOGLE SIGN-IN HANDLER (WITH AUTO MERGE) ---
    if (googleBtn) {
        googleBtn.addEventListener('click', async () => {
            if (authErrorMsg) authErrorMsg.style.display = 'none';
            if (authSuccessMsg) authSuccessMsg.style.display = 'none';

            const provider = new firebase.auth.GoogleAuthProvider();
            provider.setCustomParameters({ prompt: 'select_account' });

            try {
                const result = await fbManager.auth.signInWithPopup(provider);
                const signedEmail = (result.user.email || '').toLowerCase().trim();

                if (!isAllowedAdminEmail(signedEmail)) {
                    await fbManager.auth.signOut();
                    if (authErrorMsg) {
                        authErrorMsg.innerHTML = `<strong>Access Denied:</strong> Google account <code>${signedEmail}</code> is not authorized for Everyday Supply CRM.`;
                        authErrorMsg.style.display = 'block';
                    }
                }
            } catch (err) {
                console.error("Google sign-in error:", err);
                if (err.code === 'auth/popup-closed-by-user') {
                    return; // User cancelled popup
                }

                let message = "Google Sign-in failed: " + err.message;
                if (err.code === 'auth/account-exists-with-different-credential') {
                    message = "An account already exists with this email address. Please sign in with your email & password.";
                }

                if (authErrorMsg) {
                    authErrorMsg.innerHTML = message;
                    authErrorMsg.style.display = 'block';
                }
            }
        });
    }

    // --- 7. FORGOT / SETUP PASSWORD HANDLER ---
    if (authResetForm) {
        authResetForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = (byId('resetEmail')?.value || '').trim();

            if (resetErrorMsg) resetErrorMsg.style.display = 'none';
            if (resetSuccessMsg) resetSuccessMsg.style.display = 'none';

            // Whitelist guard
            if (!isAllowedAdminEmail(email)) {
                if (resetErrorMsg) {
                    resetErrorMsg.innerHTML = `<strong>Access Restricted:</strong> <code>${email || 'This address'}</code> is not an authorized administrator.`;
                    resetErrorMsg.style.display = 'block';
                }
                return;
            }

            setButtonLoading(resetSubmitBtn, true, 'Sending link...');

            try {
                await fbManager.auth.sendPasswordResetEmail(email);
                
                if (resetSuccessMsg) {
                    resetSuccessMsg.innerHTML = `✓ A secure password link has been sent to <strong>${email}</strong>.<br><br>Open your email inbox (or spam/junk folder) and click the link to define your password. Once set, you can sign in directly using email & password!`;
                    resetSuccessMsg.style.display = 'block';
                }

                logActivity('auth', 'Password Reset Request', `Requested password setup link for ${email}`, email);
            } catch (err) {
                console.error("Password reset error:", err);
                if (resetErrorMsg) {
                    resetErrorMsg.textContent = "Failed to send reset email: " + (err.message || 'Please try again.');
                    resetErrorMsg.style.display = 'block';
                }
            } finally {
                setButtonLoading(resetSubmitBtn, false, 'Send Password Setup / Reset Link');
            }
        });
    }

    // --- 8. IN-APP SETTINGS PASSWORD SETUP & ACCOUNT LINKING ---
    initSettingsSecurityControls();

    // --- 9. LOGOUT HANDLERS ---
    const logoutBtns = [byId('headerLogoutBtn'), byId('settingsLogoutBtn')];
    logoutBtns.forEach(btn => {
        if (btn) {
            btn.addEventListener('click', () => {
                const currentEmail = fbManager.auth.currentUser ? fbManager.auth.currentUser.email : 'Unknown';
                if (typeof stopPresenceTracking === 'function') {
                    stopPresenceTracking();
                }
                logActivity('auth', 'Sign Out', `${getTeamMemberName(currentEmail)} signed out`, currentEmail);
                fbManager.auth.signOut();
            });
        }
    });

    // --- 10. LOW STOCK THRESHOLD SETTING ---
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

// --- HELPER: PASSWORD VISIBILITY TOGGLE ---
function setupPasswordToggle(btnId, inputId) {
    const btn = byId(btnId);
    const input = byId(inputId);
    if (!btn || !input) return;

    btn.addEventListener('click', () => {
        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';

        // Update icon visually
        btn.innerHTML = isPassword
            ? `<svg class="icon icon-sm eye-icon" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`
            : `<svg class="icon icon-sm eye-icon" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
    });
}

function setButtonLoading(btn, isLoading, defaultText) {
    if (!btn) return;
    btn.disabled = isLoading;
    if (isLoading) {
        btn.innerHTML = `<span class="spinner-sm"></span> <span>${defaultText}</span>`;
    } else {
        btn.innerHTML = `<span>${defaultText}</span>`;
    }
}

// --- IN-APP SETTINGS SECURITY CONTROLS ---
function initSettingsSecurityControls() {
    const passwordForm = byId('settingsPasswordForm');
    const sendResetEmailBtn = byId('sendResetEmailSelfBtn');
    const linkGoogleBtn = byId('linkGoogleBtn');
    const settingsPassMsg = byId('settingsPassMsg');
    const settingsPassSuccessMsg = byId('settingsPassSuccessMsg');

    // 1. Password Form Submission (Set or Update Password)
    if (passwordForm) {
        passwordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newPass = byId('settingsNewPassword')?.value || '';
            const confirmPass = byId('settingsConfirmPassword')?.value || '';
            const saveBtn = byId('saveSettingsPasswordBtn');

            if (settingsPassMsg) settingsPassMsg.style.display = 'none';
            if (settingsPassSuccessMsg) settingsPassSuccessMsg.style.display = 'none';

            if (newPass.length < 6) {
                if (settingsPassMsg) {
                    settingsPassMsg.textContent = "Password must be at least 6 characters long.";
                    settingsPassMsg.style.display = 'block';
                }
                return;
            }

            if (newPass !== confirmPass) {
                if (settingsPassMsg) {
                    settingsPassMsg.textContent = "Passwords do not match. Please verify.";
                    settingsPassMsg.style.display = 'block';
                }
                return;
            }

            const user = fbManager.auth.currentUser;
            if (!user) {
                showToast("Please sign in again to update security settings.", "danger");
                return;
            }

            setButtonLoading(saveBtn, true, 'Saving...');

            try {
                // Check if user already has a password provider
                const hasPasswordProvider = user.providerData.some(p => p.providerId === 'password');

                if (hasPasswordProvider) {
                    // Update existing password
                    await user.updatePassword(newPass);
                } else {
                    // Link Email/Password credential to Google account
                    const credential = firebase.auth.EmailAuthProvider.credential(user.email, newPass);
                    await user.linkWithCredential(credential);
                }

                if (settingsPassSuccessMsg) {
                    settingsPassSuccessMsg.innerHTML = `✓ Account password updated successfully! You can now log in using either Google or Email & Password.`;
                    settingsPassSuccessMsg.style.display = 'block';
                }

                showToast("Account password saved successfully.", "success");
                logActivity('auth', 'Password Update', `${getTeamMemberName(user.email)} updated account password credentials`, user.email);

                // Clear input fields
                if (byId('settingsNewPassword')) byId('settingsNewPassword').value = '';
                if (byId('settingsConfirmPassword')) byId('settingsConfirmPassword').value = '';

                // Refresh provider badges
                updateProviderStatusUI(user);
            } catch (err) {
                console.error("Password update error:", err);
                let message = "Failed to update password: " + err.message;
                
                if (err.code === 'auth/requires-recent-login') {
                    message = "Security check: Recent sign-in required. Please log out and sign back in, or click 'Send Reset Email' below to set your password.";
                } else if (err.code === 'auth/provider-already-linked') {
                    // If already linked, fallback to updatePassword
                    try {
                        await user.updatePassword(newPass);
                        message = "";
                        if (settingsPassSuccessMsg) {
                            settingsPassSuccessMsg.innerHTML = `✓ Password updated successfully!`;
                            settingsPassSuccessMsg.style.display = 'block';
                        }
                    } catch (e2) {
                        message = e2.message;
                    }
                }

                if (message && settingsPassMsg) {
                    settingsPassMsg.textContent = message;
                    settingsPassMsg.style.display = 'block';
                }
            } finally {
                setButtonLoading(saveBtn, false, 'Save Password');
            }
        });
    }

    // 2. Send Reset Email to Currently Logged-in Admin
    if (sendResetEmailBtn) {
        sendResetEmailBtn.addEventListener('click', async () => {
            const user = fbManager.auth.currentUser;
            if (!user || !user.email) return;

            try {
                await fbManager.auth.sendPasswordResetEmail(user.email);
                showToast(`Password setup/reset link sent to ${user.email}`, 'success');
                if (settingsPassSuccessMsg) {
                    settingsPassSuccessMsg.innerHTML = `✓ A password reset link has been dispatched to <strong>${user.email}</strong>. Check your inbox.`;
                    settingsPassSuccessMsg.style.display = 'block';
                }
                logActivity('auth', 'Password Reset Request', `${getTeamMemberName(user.email)} requested password setup email from settings`, user.email);
            } catch (err) {
                console.error("Self reset error:", err);
                showToast("Failed to send reset email: " + err.message, 'danger');
            }
        });
    }

    // 3. Link Google Account
    if (linkGoogleBtn) {
        linkGoogleBtn.addEventListener('click', async () => {
            const user = fbManager.auth.currentUser;
            if (!user) return;

            const provider = new firebase.auth.GoogleAuthProvider();
            provider.setCustomParameters({ prompt: 'select_account' });

            try {
                await user.linkWithPopup(provider);
                showToast("Google account linked successfully!", "success");
                logActivity('auth', 'Account Linked', `${getTeamMemberName(user.email)} linked Google provider to account`, user.email);
                updateProviderStatusUI(user);
            } catch (err) {
                console.error("Google linking error:", err);
                if (err.code !== 'auth/popup-closed-by-user') {
                    showToast("Failed to link Google: " + err.message, "danger");
                }
            }
        });
    }
}

// --- UPDATE SETTINGS PROVIDER UI ---
function updateProviderStatusUI(user) {
    if (!user) return;

    const providers = (user.providerData || []).map(p => p.providerId);
    const hasGoogle = providers.includes('google.com');
    const hasPassword = providers.includes('password');

    // Google status
    const googleStatus = byId('googleProviderStatus');
    const googleLinkedBadge = byId('googleLinkedBadge');
    const linkGoogleBtn = byId('linkGoogleBtn');

    if (googleStatus) {
        googleStatus.textContent = hasGoogle ? `Connected (${user.email})` : 'Not linked to this login';
    }
    if (googleLinkedBadge) {
        googleLinkedBadge.style.display = hasGoogle ? 'inline-flex' : 'none';
    }
    if (linkGoogleBtn) {
        linkGoogleBtn.style.display = hasGoogle ? 'none' : 'inline-flex';
    }

    // Password status
    const passStatus = byId('passwordProviderStatus');
    const passLinkedBadge = byId('passwordLinkedBadge');

    if (passStatus) {
        passStatus.textContent = hasPassword 
            ? 'Active (Email & Password login enabled)' 
            : 'No password defined yet (Sign in with Google)';
    }
    if (passLinkedBadge) {
        passLinkedBadge.className = hasPassword ? 'badge badge-active' : 'badge badge-inactive';
        passLinkedBadge.textContent = hasPassword ? 'Active' : 'Not Set';
    }
}


