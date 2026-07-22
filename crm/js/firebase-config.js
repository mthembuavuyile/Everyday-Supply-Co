/**
 * Everyday Supply Co. CRM - Firebase Configuration & Initialization
 * Seamless integration with Firebase Auth, Cloud Firestore, and Offline Persistence.
 * Supports dynamic config loading from config.json for white-label deployments.
 */

// Live Firebase Configuration for Everyday Supply Co. (Fallback)
const DEFAULT_FIREBASE_CONFIG = {
    apiKey: "AIzaSyDHklaBKNn0_FZ2Gqk32-QAjxhjGq3clAY",
    authDomain: "everyday-supply-co.firebaseapp.com",
    projectId: "everyday-supply-co",
    storageBucket: "everyday-supply-co.firebasestorage.app",
    messagingSenderId: "694326382277",
    appId: "1:694326382277:web:94c510004ba1010268aaac"
};

class FirebaseManager {
    constructor() {
        this.config = DEFAULT_FIREBASE_CONFIG;
        this.app = null;
        this.db = null;
        this.auth = null;
        this.isInitialized = false;
        this.persistenceAttempted = false;
        this.currentUser = null;
        this.branding = {
            companyName: 'Everyday Supply',
            tagline: 'Business CRM & Inventory Hub',
            accentColor: '#0f766e',
            accentColorHover: '#0d9488',
            accentColorLight: '#ccfbf1',
            accentColorDark: '#115e59'
        };
    }

    /**
     * Load configuration from external config.json for white-label support.
     * Falls back gracefully to hardcoded defaults if config.json is unavailable.
     */
    async loadConfig() {
        try {
            const response = await fetch('config.json');
            if (!response.ok) throw new Error(`Config fetch failed: ${response.status}`);
            const config = await response.json();

            // Apply Firebase credentials
            if (config.firebase) {
                this.config = config.firebase;
                console.log(`Config loaded for project: ${this.config.projectId}`);
            }

            // Apply branding overrides
            if (config.branding) {
                this.branding = { ...this.branding, ...config.branding };
                this.applyBranding();
            }
        } catch (err) {
            console.warn('config.json not found or invalid, using default config:', err.message);
        }
    }

    /**
     * Apply branding from config to the DOM and CSS custom properties.
     */
    applyBranding() {
        const b = this.branding;
        const root = document.documentElement;

        // Update CSS accent color variables
        if (b.accentColor) root.style.setProperty('--primary', b.accentColor);
        if (b.accentColorHover) root.style.setProperty('--primary-hover', b.accentColorHover);
        if (b.accentColorLight) root.style.setProperty('--primary-light', b.accentColorLight);
        if (b.accentColorDark) root.style.setProperty('--primary-dark', b.accentColorDark);

        // Update brand name in sidebar and mobile header
        const brandElements = document.querySelectorAll('.brand-title span, .mobile-brand span:first-of-type');
        brandElements.forEach(el => {
            el.textContent = b.companyName;
        });

        // Update tagline in sidebar
        const subtitleEl = document.querySelector('.brand-subtitle');
        if (subtitleEl && b.tagline) {
            subtitleEl.textContent = b.tagline;
        }

        // Update page title
        document.title = `${b.companyName} - ${b.tagline}`;

        // Update auth overlay header
        const authHeader = document.querySelector('.auth-header h2');
        if (authHeader) authHeader.textContent = `${b.companyName} Hub`;
        const authSubtitle = document.querySelector('.auth-header p');
        if (authSubtitle) authSubtitle.textContent = `Sign in to access CRM, Inventory & Admin Operations`;
    }

    init() {
        if (this.isInitialized && this.app && this.db) {
            return true;
        }

        if (typeof firebase === 'undefined') {
            console.warn("Firebase SDK not loaded. Falling back to local offline storage.");
            return false;
        }

        try {
            if (!firebase.apps.length) {
                this.app = firebase.initializeApp(this.config);
            } else {
                this.app = firebase.app();
            }

            this.db = firebase.firestore();
            this.auth = firebase.auth();

            // Enable offline persistence only once during initial setup
            if (!this.persistenceAttempted) {
                this.persistenceAttempted = true;
                if (typeof this.db.enableIndexedDbPersistence === 'function') {
                    this.db.enableIndexedDbPersistence({ synchronizeTabs: true }).catch(err => {
                        if (err.code === 'failed-precondition') {
                            console.warn('Multiple tabs open, offline persistence enabled in primary tab only.');
                        } else if (err.code === 'unimplemented') {
                            console.warn('Browser does not support offline persistence.');
                        } else {
                            console.warn('Firestore persistence note:', err.message);
                        }
                    });
                } else if (typeof this.db.enablePersistence === 'function') {
                    this.db.enablePersistence().catch(() => {});
                }
            }

            this.isInitialized = true;
            console.log(`Firebase initialized successfully for ${this.branding.companyName}.`);
            return true;
        } catch (e) {
            console.error("Failed to initialize Firebase:", e);
            return false;
        }
    }
}

// Global Firebase Manager instance
const fbManager = new FirebaseManager();
