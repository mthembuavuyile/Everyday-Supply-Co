/**
 * Everyday Supply Co. CRM - Security Telemetry & Access Audit Module
 * Encapsulated, non-blocking, lightweight security logging for unauthorized attempts,
 * IP & Geolocation tracking, device intelligence, and forensic inspection.
 *
 * Principles: SRP, DRY, KISS, Separation of Concerns, Loose Coupling, Fail-Safe.
 */

class SecurityManager {
    constructor() {
        this.STORAGE_KEY = 'sec_client_telemetry_cache';
        this.cachedTelemetry = null;
        this.isFetchingTelemetry = false;
    }

    /**
     * Parse browser User Agent into readable client platform details
     */
    parseUserAgent(ua = navigator.userAgent) {
        let browser = 'Unknown Browser';
        let os = 'Unknown OS';
        let device = 'Desktop';

        // OS Detection
        if (/windows nt 10.0/i.test(ua)) os = 'Windows 10/11';
        else if (/windows nt 6.3/i.test(ua)) os = 'Windows 8.1';
        else if (/windows/i.test(ua)) os = 'Windows';
        else if (/android/i.test(ua)) { os = 'Android'; device = 'Mobile'; }
        else if (/iphone|ipad|ipod/i.test(ua)) { os = 'iOS'; device = /ipad/i.test(ua) ? 'Tablet' : 'Mobile'; }
        else if (/macintosh|mac os x/i.test(ua)) os = 'macOS';
        else if (/linux/i.test(ua)) os = 'Linux';

        // Browser Detection
        if (/edg/i.test(ua)) browser = 'Microsoft Edge';
        else if (/opr|opera/i.test(ua)) browser = 'Opera';
        else if (/chrome|crios/i.test(ua)) browser = 'Google Chrome';
        else if (/firefox|fxios/i.test(ua)) browser = 'Mozilla Firefox';
        else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Apple Safari';

        return {
            browser,
            os,
            device,
            screen: `${window.screen?.width || 0}x${window.screen?.height || 0}`,
            language: navigator.language || 'en-ZA',
            platform: navigator.platform || 'Unknown',
            userAgent: ua
        };
    }

    /**
     * Asynchronously fetch client IP and Geo information (non-blocking with strict timeout)
     */
    async getClientTelemetry() {
        // Return memory cached if available
        if (this.cachedTelemetry) return this.cachedTelemetry;

        // Return session cached if available
        try {
            const stored = sessionStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                this.cachedTelemetry = JSON.parse(stored);
                return this.cachedTelemetry;
            }
        } catch (e) {
            // Ignore session storage errors
        }

        const clientSpecs = this.parseUserAgent();
        let geoData = {
            ip: 'Unavailable (Local)',
            city: 'Unknown City',
            region: 'Unknown Region',
            country: 'South Africa',
            countryCode: 'ZA',
            org: 'ISP Unknown',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Africa/Johannesburg'
        };

        // Non-blocking fetch with 2.5 second timeout
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2500);

            const res = await fetch('https://ipapi.co/json/', {
                signal: controller.signal,
                headers: { 'Accept': 'application/json' }
            });
            clearTimeout(timeoutId);

            if (res.ok) {
                const data = await res.json();
                if (data && (data.ip || data.city)) {
                    geoData = {
                        ip: data.ip || 'Unknown',
                        city: data.city || 'Johannesburg',
                        region: data.region || 'Gauteng',
                        country: data.country_name || 'South Africa',
                        countryCode: data.country_code || 'ZA',
                        org: data.org || data.asn || 'Network Provider',
                        postal: data.postal || '',
                        latitude: data.latitude || null,
                        longitude: data.longitude || null,
                        timezone: data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
                    };
                }
            }
        } catch (err) {
            // Graceful fallback to basic IP resolver if ipapi fails
            try {
                const controller2 = new AbortController();
                const timeoutId2 = setTimeout(() => controller2.abort(), 1500);
                const res2 = await fetch('https://api.ipify.org?format=json', { signal: controller2.signal });
                clearTimeout(timeoutId2);
                if (res2.ok) {
                    const data2 = await res2.json();
                    if (data2.ip) geoData.ip = data2.ip;
                }
            } catch (e2) {
                // Keep default geo fallback
            }
        }

        const fullTelemetry = {
            ...geoData,
            ...clientSpecs,
            capturedAt: new Date().toISOString()
        };

        this.cachedTelemetry = fullTelemetry;
        try {
            sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(fullTelemetry));
        } catch (e) {}

        return fullTelemetry;
    }

    /**
     * Map category to human-readable action title
     */
    getActionTitle(category) {
        switch (category) {
            case 'auth-blocked':
                return 'Unauthorized Access Blocked';
            case 'failed-password':
                return 'Failed Password Attempt';
            case 'failed-login':
                return 'Invalid Account Credentials';
            case 'password-reset':
                return 'Password Reset / Setup Request';
            case 'auth-success':
                return 'Administrator Sign-In';
            case 'google-blocked':
                return 'Unauthorized Google Account Blocked';
            case 'suspicious':
                return 'Suspicious System Manipulation';
            default:
                return 'Security Audit Event';
        }
    }

    /**
     * Record a security audit event and persist to Firestore + Local Cache
     */
    async logSecurityEvent(category, email, details, severity = 'info', extraData = {}) {
        const cleanEmail = (email || 'anonymous').toLowerCase().trim();
        const actionTitle = this.getActionTitle(category);
        const timestamp = new Date().toISOString();
        const logId = 'SEC-' + Date.now() + '-' + Math.floor(Math.random() * 1000);

        // Fetch telemetry non-blockingly
        const telemetry = await this.getClientTelemetry();

        const payload = {
            id: logId,
            type: 'security',
            category: category || 'general',
            action: actionTitle,
            severity: severity || 'info', // 'danger' | 'warning' | 'info'
            email: cleanEmail,
            user: cleanEmail,
            details: details || '',
            telemetry: telemetry,
            extra: extraData,
            timestamp: timestamp
        };

        // 1. Optimistically store in local cache
        if (window.store && store.data) {
            if (!Array.isArray(store.data.securityLogs)) {
                store.data.securityLogs = [];
            }
            store.data.securityLogs.unshift(payload);
            if (store.data.securityLogs.length > 300) {
                store.data.securityLogs = store.data.securityLogs.slice(0, 300);
            }

            // Also mirror into activityLogs so it displays in standard timeline
            if (!Array.isArray(store.data.activityLogs)) {
                store.data.activityLogs = [];
            }
            const exists = store.data.activityLogs.some(l => l.id === logId);
            if (!exists) {
                store.data.activityLogs.unshift({
                    id: logId,
                    type: 'auth',
                    action: actionTitle,
                    details: `${details || ''} [IP: ${telemetry.ip || 'N/A'}, ${telemetry.city || ''}]`,
                    user: cleanEmail,
                    timestamp: timestamp,
                    severity: severity,
                    isSecurityEvent: true,
                    securityId: logId
                });
                if (store.data.activityLogs.length > 400) {
                    store.data.activityLogs = store.data.activityLogs.slice(0, 400);
                }
            }

            store.saveLocalCache();

            // Refresh UI if visible
            const teamSec = byId('team-activity');
            if (teamSec && teamSec.classList.contains('active')) {
                renderTeamActivity();
            }
            this.updateSecurityStatsUI();
        }

        // 2. Persist to Firestore security_logs collection
        if (window.fbManager && fbManager.db) {
            try {
                fbManager.db.collection('security_logs').doc(logId).set(payload).catch(err => {
                    console.warn("Security log cloud sync note:", err.message);
                });
                // Also mirror to activity_logs
                fbManager.db.collection('activity_logs').doc(logId).set({
                    id: logId,
                    type: 'auth',
                    action: actionTitle,
                    details: `${details || ''} [IP: ${telemetry.ip || 'N/A'}, ${telemetry.city || ''}]`,
                    user: cleanEmail,
                    timestamp: timestamp,
                    severity: severity,
                    isSecurityEvent: true
                }).catch(() => {});
            } catch (e) {
                console.warn("Security log persistence note:", e);
            }
        }

        return payload;
    }

    /**
     * Find log entry by ID across securityLogs and activityLogs
     */
    findSecurityLog(logId) {
        if (!window.store || !store.data) return null;
        if (store.data.securityLogs) {
            const found = store.data.securityLogs.find(l => l.id === logId || l.securityId === logId);
            if (found) return found;
        }
        if (store.data.activityLogs) {
            const found = store.data.activityLogs.find(l => l.id === logId);
            if (found) return found;
        }
        return null;
    }

    /**
     * Open Security Telemetry Forensic Inspector Modal
     */
    openSecurityInspector(logId) {
        const log = this.findSecurityLog(logId);
        if (!log) {
            showToast("Security record details not found.", "warning");
            return;
        }

        const tel = log.telemetry || {};
        const severity = log.severity || 'info';

        // Severity badge
        const sevBadge = byId('secInspectSeverityBadge');
        if (sevBadge) {
            sevBadge.className = `badge badge-sec-${severity}`;
            sevBadge.textContent = severity.toUpperCase();
        }

        // Header info
        if (byId('secInspectTitle')) byId('secInspectTitle').textContent = log.action || 'Security Audit Event';
        if (byId('secInspectEmail')) byId('secInspectEmail').textContent = log.email || log.user || 'Unknown';
        if (byId('secInspectDetails')) byId('secInspectDetails').textContent = log.details || 'No additional details recorded.';
        
        // Timestamps
        const dateObj = new Date(log.timestamp);
        const isValidDate = !isNaN(dateObj.getTime());
        if (byId('secInspectTime')) {
            byId('secInspectTime').textContent = isValidDate ? dateObj.toLocaleString('en-ZA', { dateStyle: 'full', timeStyle: 'medium' }) : log.timestamp;
        }
        if (byId('secInspectRelativeTime')) {
            byId('secInspectRelativeTime').textContent = isValidDate ? formatTimeAgo(log.timestamp) : 'Recently';
        }

        // Telemetry Grid
        if (byId('secInspectIp')) byId('secInspectIp').textContent = tel.ip || 'Unknown IP';
        if (byId('secInspectLocation')) {
            const locParts = [tel.city, tel.region, tel.country].filter(Boolean);
            byId('secInspectLocation').textContent = locParts.length > 0 ? locParts.join(', ') : 'South Africa (Estimated)';
        }
        if (byId('secInspectOrg')) byId('secInspectOrg').textContent = tel.org || 'Standard Network Provider';
        if (byId('secInspectOs')) byId('secInspectOs').textContent = `${tel.os || 'Unknown OS'} (${tel.device || 'Desktop'})`;
        if (byId('secInspectBrowser')) byId('secInspectBrowser').textContent = tel.browser || 'Web Browser';
        if (byId('secInspectScreen')) byId('secInspectScreen').textContent = `${tel.screen || 'Unknown'} · ${tel.language || 'en'}`;
        if (byId('secInspectUserAgent')) byId('secInspectUserAgent').textContent = tel.userAgent || 'Not captured';

        // Raw JSON container
        const rawJsonEl = byId('secInspectRawJson');
        if (rawJsonEl) {
            rawJsonEl.textContent = JSON.stringify(log, null, 2);
        }

        // Store active log ID on modal for copy function
        const modal = byId('securityInspectModal');
        if (modal) {
            modal.dataset.currentLogId = log.id;
        }

        openModal('securityInspectModal');
    }

    /**
     * Copy raw JSON telemetry to clipboard
     */
    copyTelemetryJSON() {
        const modal = byId('securityInspectModal');
        const logId = modal ? modal.dataset.currentLogId : null;
        if (!logId) return;

        const log = this.findSecurityLog(logId);
        if (!log) return;

        const jsonStr = JSON.stringify(log, null, 2);
        navigator.clipboard.writeText(jsonStr).then(() => {
            showToast("Security telemetry copied to clipboard.", "success");
        }).catch(() => {
            showToast("Failed to copy to clipboard.", "danger");
        });
    }

    /**
     * Update security statistics badge in settings / audit cards
     */
    updateSecurityStatsUI() {
        const secLogs = (window.store && store.data && store.data.securityLogs) ? store.data.securityLogs : [];
        const blockedCount = secLogs.filter(l => l.severity === 'danger' || l.category === 'auth-blocked' || l.category === 'google-blocked').length;
        const totalCount = secLogs.length;

        const statTotal = byId('secStatTotalAudits');
        const statBlocked = byId('secStatBlocked');
        if (statTotal) statTotal.textContent = totalCount;
        if (statBlocked) statBlocked.textContent = blockedCount;
    }

    /**
     * Heuristic check for suspicious tampering / injection payloads
     */
    detectTampering(inputStr) {
        if (!inputStr || typeof inputStr !== 'string') return false;
        const suspiciousPatterns = [
            /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
            /javascript:/gi,
            /union\s+select/gi,
            /(\.\.\/|\.\.\\)/g,
            /<iframe/gi,
            /onload\s*=/gi,
            /onerror\s*=/gi
        ];
        for (const pattern of suspiciousPatterns) {
            if (pattern.test(inputStr)) {
                this.logSecurityEvent('suspicious', 'Unknown/Client', `Potential payload injection detected: ${inputStr.slice(0, 80)}`, 'danger');
                return true;
            }
        }
        return false;
    }
}

// Global Security Tracker instance
const SecurityTracker = new SecurityManager();

// Attach global click handler for inspect buttons
document.addEventListener('click', (e) => {
    const inspectBtn = e.target.closest('[data-inspect-sec]');
    if (inspectBtn) {
        const logId = inspectBtn.dataset.inspectSec;
        if (logId) {
            SecurityTracker.openSecurityInspector(logId);
        }
    }
});
