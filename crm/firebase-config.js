/**
 * Everyday Supply Co. CRM - Firebase Configuration & Initialization
 * Seamless integration with Firebase Auth, Cloud Firestore, and Offline Persistence.
 */

// Live Firebase Configuration for Everyday Supply Co.
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
        this.configKey = 'everyday_supply_firebase_config';
        this.config = this.loadConfig();
        this.app = null;
        this.db = null;
        this.auth = null;
        this.isInitialized = false;
        this.currentUser = null;
    }

    loadConfig() {
        const stored = localStorage.getItem(this.configKey);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (parsed && parsed.apiKey && !parsed.apiKey.includes('DemoConfigKey')) {
                    return parsed;
                }
            } catch (e) {
                console.error("Error reading saved Firebase config:", e);
            }
        }
        return DEFAULT_FIREBASE_CONFIG;
    }

    saveConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        localStorage.setItem(this.configKey, JSON.stringify(this.config));
        location.reload(); // Reload to initialize with new keys
    }

    resetConfig() {
        localStorage.removeItem(this.configKey);
        this.config = DEFAULT_FIREBASE_CONFIG;
        location.reload();
    }

    init() {
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

            // Enable offline persistence without deprecation warnings
            if (typeof this.db.enableIndexedDbPersistence === 'function') {
                this.db.enableIndexedDbPersistence({ synchronizeTabs: true }).catch(err => {
                    if (err.code === 'failed-precondition') {
                        console.warn('Multiple tabs open, offline persistence enabled in primary tab only.');
                    } else if (err.code === 'unimplemented') {
                        console.warn('Browser does not support offline persistence.');
                    }
                });
            } else if (typeof this.db.enablePersistence === 'function') {
                this.db.enablePersistence().catch(() => {});
            }

            this.isInitialized = true;
            console.log("Firebase initialized successfully for Everyday Supply Co.");
            return true;
        } catch (e) {
            console.error("Failed to initialize Firebase:", e);
            return false;
        }
    }
}

// Global Firebase Manager instance
const fbManager = new FirebaseManager();
