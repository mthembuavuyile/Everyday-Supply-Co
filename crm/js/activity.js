// Everyday Supply Co. - Team & Activity Logging Module with Real-Time Presence

const TEAM_MEMBERS = {
    'mthembuavuyile@gmail.com': { name: 'Avuyile', role: 'Administrator', color: '#0f766e' },
    'asandamanelisi1998@gmail.com': { name: 'Asanda', role: 'Administrator', color: '#7c3aed' },
    'ayandalucasn@gmail.com': { name: 'Ayanda', role: 'Administrator', color: '#2563eb' }
};

const CATEGORY_META = {
    'sale': { label: 'Sale Order', badgeClass: 'badge-sale', color: '#059669', icon: 'shopping-bag' },
    'product': { label: 'Inventory', badgeClass: 'badge-product', color: '#d97706', icon: 'package' },
    'customer': { label: 'Customer', badgeClass: 'badge-customer', color: '#2563eb', icon: 'user' },
    'followup': { label: 'Follow-up', badgeClass: 'badge-followup', color: '#db2777', icon: 'calendar' },
    'auth': { label: 'Security / Auth', badgeClass: 'badge-auth', color: '#7c3aed', icon: 'shield' },
    'security': { label: 'Security / Audit', badgeClass: 'badge-security', color: '#dc2626', icon: 'shield' },
    'settings': { label: 'System', badgeClass: 'badge-settings', color: '#475569', icon: 'settings' }
};

// Color generator for dynamic members
const AVATAR_COLORS = ['#0f766e', '#7c3aed', '#2563eb', '#d97706', '#dc2626', '#0891b2', '#4f46e5'];

function getTeamMember(email) {
    const cleanEmail = (email || '').toLowerCase().trim();
    if (TEAM_MEMBERS[cleanEmail]) {
        return TEAM_MEMBERS[cleanEmail];
    }
    // Dynamic member fallback
    const rawName = cleanEmail.split('@')[0] || 'Admin';
    const formattedName = rawName.charAt(0).toUpperCase() + rawName.slice(1).replace(/[._-]/g, ' ');
    let colorHash = 0;
    for (let i = 0; i < cleanEmail.length; i++) {
        colorHash = (colorHash + cleanEmail.charCodeAt(i)) % AVATAR_COLORS.length;
    }
    return {
        name: formattedName,
        role: 'Administrator',
        color: AVATAR_COLORS[colorHash]
    };
}

function getTeamMemberName(email) {
    return getTeamMember(email).name;
}

// Relative time formatter
function formatTimeAgo(timestamp) {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return 'Recently';

    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSec < 45) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' });
}

// --- REAL-TIME PRESENCE & HEARTBEAT SYSTEM ---
let presenceHeartbeatTimer = null;
let presenceUiRefreshTimer = null;
let lastPresenceTouch = 0;

function getPresenceDocId(email) {
    return (email || '').toLowerCase().trim().replace(/[@.]/g, '_');
}

function updatePresence(status = 'online', action = 'Active in Dashboard') {
    let email = '';
    if (window.fbManager && fbManager.auth && fbManager.auth.currentUser && fbManager.auth.currentUser.email) {
        email = fbManager.auth.currentUser.email;
    } else {
        email = localStorage.getItem('lastUserEmail');
    }
    if (!email) return;
    email = email.toLowerCase().trim();

    const now = Date.now();
    const docId = getPresenceDocId(email);
    const member = getTeamMember(email);

    const presenceData = {
        email: email,
        name: member.name,
        role: member.role,
        status: status,
        lastSeen: now,
        lastSeenISO: new Date().toISOString(),
        lastAction: action
    };

    // Update local cache immediately
    if (window.store && store.data) {
        if (!store.data.teamPresence) store.data.teamPresence = {};
        store.data.teamPresence[email] = presenceData;
        store.saveLocalCache();
    }

    // Persist to Firestore if authenticated
    if (window.fbManager && fbManager.db && fbManager.auth && fbManager.auth.currentUser) {
        fbManager.db.collection('team_presence').doc(docId).set(presenceData, { merge: true }).catch(err => {
            console.warn("Presence sync note:", err.message);
        });
    }
}

function touchPresence(action = 'Active in Dashboard') {
    const now = Date.now();
    // Throttle user interaction touches to once every 20 seconds
    if (now - lastPresenceTouch > 20000) {
        lastPresenceTouch = now;
        updatePresence('online', action);
    }
}

function startPresenceTracking(email) {
    if (presenceHeartbeatTimer) clearInterval(presenceHeartbeatTimer);
    if (presenceUiRefreshTimer) clearInterval(presenceUiRefreshTimer);

    // Immediate initial presence heartbeat
    updatePresence('online', 'Dashboard Access');

    // Heartbeat every 30 seconds while window is active
    presenceHeartbeatTimer = setInterval(() => {
        if (document.visibilityState === 'visible') {
            updatePresence('online', 'Active in Dashboard');
        }
    }, 30000);

    // Auto-refresh team activity UI every 25 seconds to update relative times & online statuses
    presenceUiRefreshTimer = setInterval(() => {
        const teamSec = byId('team-activity');
        if (teamSec && teamSec.classList.contains('active')) {
            renderTeamActivity();
        }
    }, 25000);

    // Listen to user interactions to touch presence
    ['click', 'keydown', 'scroll', 'touchstart'].forEach(evtType => {
        window.addEventListener(evtType, () => touchPresence('Active in Dashboard'), { passive: true });
    });

    // Handle visibility changes (e.g. switching tabs / minimizing)
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            updatePresence('online', 'Active in Dashboard');
            renderTeamActivity();
        } else {
            updatePresence('idle', 'Away');
        }
    });

    // Handle window beforeunload
    window.addEventListener('beforeunload', () => {
        updatePresence('offline', 'Closed session');
    });
}

function stopPresenceTracking() {
    if (presenceHeartbeatTimer) clearInterval(presenceHeartbeatTimer);
    if (presenceUiRefreshTimer) clearInterval(presenceUiRefreshTimer);
    presenceHeartbeatTimer = null;
    presenceUiRefreshTimer = null;
    updatePresence('offline', 'Signed out');
}

// --- CORE ACTIVITY LOGGING ---

function logActivity(type, action, details, userEmail = null) {
    let email = userEmail;
    if (!email && window.fbManager && fbManager.auth && fbManager.auth.currentUser) {
        email = fbManager.auth.currentUser.email;
    }
    if (!email) {
        email = localStorage.getItem('lastUserEmail') || 'admin@everydaysupply.co.za';
    }
    email = email.toLowerCase().trim();

    const timestamp = new Date().toISOString();
    const logId = 'LOG-' + Date.now() + '-' + Math.floor(Math.random() * 1000);

    const payload = {
        id: logId,
        type: type || 'system',
        action: action || 'Action',
        details: details || '',
        user: email,
        timestamp: timestamp
    };

    // Touch presence with this action
    updatePresence('online', `${action}: ${details || ''}`);

    // Optimistically update local store immediately
    if (window.store && store.data) {
        if (!Array.isArray(store.data.activityLogs)) {
            store.data.activityLogs = [];
        }
        store.data.activityLogs.unshift(payload);
        // Limit local array to latest 400 entries
        if (store.data.activityLogs.length > 400) {
            store.data.activityLogs = store.data.activityLogs.slice(0, 400);
        }
        store.saveLocalCache();

        // Update badge and UI if currently visible
        const badge = byId('activityBadge');
        if (badge) {
            const count = store.data.activityLogs.length;
            badge.style.display = count > 0 ? 'inline-flex' : 'none';
            badge.textContent = count > 99 ? '99+' : count;
        }

        const teamSec = byId('team-activity');
        if (teamSec && teamSec.classList.contains('active')) {
            renderTeamActivity();
        }
    }

    // Persist to Cloud Firestore if connected and authenticated
    if (window.fbManager && fbManager.db && fbManager.auth && fbManager.auth.currentUser) {
        fbManager.db.collection('activity_logs').doc(logId).set(payload).catch(err => {
            console.warn("Firestore activity log sync note:", err.message);
        });
    }
}

function initActivityLogListener() {
    // Handled by store.initFirestoreListeners()
}

// --- ACTIVITY STATE & RENDERING ---

let currentActivityLogLimit = 20;

function renderTeamActivity() {
    const logs = (window.store && store.data && store.data.activityLogs) ? store.data.activityLogs : [];
    const teamPresence = (window.store && store.data && store.data.teamPresence) ? store.data.teamPresence : {};
    
    // Resolve current authenticated email
    let currentAuthEmail = '';
    if (window.fbManager && fbManager.auth && fbManager.auth.currentUser && fbManager.auth.currentUser.email) {
        currentAuthEmail = fbManager.auth.currentUser.email.toLowerCase().trim();
    } else {
        currentAuthEmail = (localStorage.getItem('lastUserEmail') || '').toLowerCase().trim();
    }

    // 1. Gather all known members (predefined + presence + logs)
    const allMembersMap = { ...TEAM_MEMBERS };
    
    Object.keys(teamPresence).forEach(email => {
        const cleanEmail = email.toLowerCase().trim();
        if (!allMembersMap[cleanEmail]) {
            allMembersMap[cleanEmail] = getTeamMember(cleanEmail);
        }
    });

    logs.forEach(log => {
        if (log.user) {
            const cleanUser = log.user.toLowerCase().trim();
            if (!allMembersMap[cleanUser]) {
                allMembersMap[cleanUser] = getTeamMember(cleanUser);
            }
        }
    });

    // 2. Render Team Members Presence Grid
    const teamGrid = byId('teamMembersGrid');
    if (teamGrid) {
        teamGrid.innerHTML = '';
        let onlineCount = 0;
        const now = Date.now();

        Object.entries(allMembersMap).forEach(([email, data]) => {
            const cleanEmail = email.toLowerCase().trim();
            const isCurrentUser = Boolean(currentAuthEmail && currentAuthEmail === cleanEmail);
            
            // Presence data
            const presence = teamPresence[cleanEmail] || {};
            const presenceLastSeen = presence.lastSeen ? Number(presence.lastSeen) : 0;
            const presenceStatus = presence.status || 'offline';

            // Logs data
            const memberLogs = logs.filter(l => (l.user || '').toLowerCase().trim() === cleanEmail);
            const latestLog = memberLogs.length > 0 ? memberLogs[0] : null;
            const logLastActiveTime = latestLog ? new Date(latestLog.timestamp).getTime() : 0;

            const lastActiveTime = Math.max(presenceLastSeen, logLastActiveTime);

            // Online threshold:
            // - Current user in active dashboard: Always Online
            // - Other member with heartbeat or activity in last 5 minutes: Online
            // - Other member active in last 20 minutes: Active recently
            const isWithin5Min = lastActiveTime > 0 && (now - lastActiveTime < 5 * 60 * 1000);
            const isWithin20Min = lastActiveTime > 0 && (now - lastActiveTime < 20 * 60 * 1000);
            
            const isOnline = isCurrentUser || (isWithin5Min && presenceStatus !== 'offline');
            const isRecent = !isOnline && (isWithin20Min || (isWithin5Min && presenceStatus === 'idle'));

            if (isOnline) onlineCount++;

            let statusText = 'Offline';
            let statusDotClass = 'status-dot-offline';
            let lastActionText = presence.lastAction || (latestLog ? `${latestLog.action}: ${latestLog.details}` : '');

            if (isCurrentUser) {
                statusText = 'Online Now (You)';
                statusDotClass = 'status-dot-online';
                if (!lastActionText) lastActionText = 'Active in Dashboard';
            } else if (isOnline) {
                statusText = 'Online Now';
                statusDotClass = 'status-dot-online';
            } else if (isRecent) {
                statusText = 'Active recently';
                statusDotClass = 'status-dot-online';
            } else if (lastActiveTime > 0) {
                statusText = `Active ${formatTimeAgo(lastActiveTime)}`;
                statusDotClass = 'status-dot-offline';
            }

            const card = document.createElement('div');
            card.className = 'team-member-card';
            card.innerHTML = `
                <div class="team-member-avatar" style="background: ${data.color}15; color: ${data.color}; border-color: ${data.color}30;">
                    ${data.name.charAt(0).toUpperCase()}
                    <span class="team-presence-dot ${statusDotClass}"></span>
                </div>
                <div class="team-member-info">
                    <div class="team-member-name-row">
                        <span class="team-member-name">${escapeHtml(data.name)}</span>
                        ${isCurrentUser ? '<span class="badge badge-you">You</span>' : ''}
                    </div>
                    <div class="team-member-role">${escapeHtml(data.role || 'Administrator')}</div>
                    <div class="team-member-status-line">
                        <span class="team-presence-label ${isOnline ? 'text-online' : 'text-offline'}">${statusText}</span>
                    </div>
                    ${lastActionText ? `<div class="team-member-latest-action" title="${escapeHtml(lastActionText)}">
                        <strong>Last action:</strong> ${escapeHtml(lastActionText)}
                    </div>` : ''}
                </div>
            `;
            teamGrid.appendChild(card);
        });

        const countBadge = byId('teamOnlineCount');
        if (countBadge) {
            countBadge.textContent = `${onlineCount} Online`;
            countBadge.className = onlineCount > 0 ? 'badge badge-active' : 'badge badge-inactive';
        }
    }

    // 3. Update User Filter Dropdown dynamically
    const filterUserSelect = byId('activityFilterUser');
    if (filterUserSelect) {
        const currentVal = filterUserSelect.value;
        const existingUsers = Object.keys(allMembersMap);
        
        let optionsHtml = '<option value="all">All Members</option>';
        existingUsers.forEach(email => {
            const member = allMembersMap[email];
            optionsHtml += `<option value="${escapeHtml(email)}">${escapeHtml(member.name)} (${escapeHtml(email.split('@')[0])})</option>`;
        });
        filterUserSelect.innerHTML = optionsHtml;
        if (currentVal) filterUserSelect.value = currentVal;
    }

    // 4. Filter & Search Activity Logs
    const filterType = byId('activityFilterType') ? byId('activityFilterType').value : 'all';
    const filterUser = byId('activityFilterUser') ? byId('activityFilterUser').value : 'all';
    const searchQuery = byId('activitySearchInput') ? (byId('activitySearchInput').value || '').toLowerCase().trim() : '';

    let filteredLogs = [...logs];

    if (filterType !== 'all') {
        if (filterType === 'security' || filterType === 'auth') {
            filteredLogs = filteredLogs.filter(log => log.type === 'security' || log.type === 'auth' || log.isSecurityEvent || (log.id && log.id.startsWith('SEC-')));
        } else {
            filteredLogs = filteredLogs.filter(log => log.type === filterType);
        }
    }
    if (filterUser !== 'all') {
        filteredLogs = filteredLogs.filter(log => (log.user || '').toLowerCase() === filterUser.toLowerCase());
    }
    if (searchQuery) {
        filteredLogs = filteredLogs.filter(log => {
            const detailsStr = (log.details || '').toLowerCase();
            const actionStr = (log.action || '').toLowerCase();
            const userStr = (log.user || '').toLowerCase();
            const memberName = getTeamMemberName(log.user).toLowerCase();
            return detailsStr.includes(searchQuery) || 
                   actionStr.includes(searchQuery) || 
                   userStr.includes(searchQuery) ||
                   memberName.includes(searchQuery);
        });
    }

    // Update total count pill
    const totalCountBadge = byId('activityTotalCount');
    if (totalCountBadge) {
        totalCountBadge.textContent = `${filteredLogs.length} action${filteredLogs.length === 1 ? '' : 's'}`;
    }

    // 5. Render Desktop Table & Mobile Feed
    const tbody = byId('activityLogBody');
    const mobileFeed = byId('activityMobileFeed');
    const toShow = filteredLogs.slice(0, currentActivityLogLimit);

    if (filteredLogs.length === 0) {
        const emptyHtml = `
            <div class="activity-empty-state">
                <svg class="icon icon-lg" viewBox="0 0 24 24" style="color: var(--slate-300); margin-bottom: 8px;">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <div style="font-weight: 600; color: var(--slate-700); font-size: 14px;">No activities found</div>
                <div style="font-size: 12px; color: var(--slate-400); margin-top: 4px;">Try changing or clearing your search filters.</div>
            </div>
        `;
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="4" style="padding: 0;">${emptyHtml}</td></tr>`;
        }
        if (mobileFeed) {
            mobileFeed.innerHTML = emptyHtml;
        }
    } else {
        // Desktop Table Rows
        if (tbody) {
            tbody.innerHTML = '';
            toShow.forEach(log => {
                const tr = document.createElement('tr');
                const date = new Date(log.timestamp);
                const isValidDate = !isNaN(date.getTime());
                const dateFormatted = isValidDate ? date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent';
                const timeFormatted = isValidDate ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                const relativeTime = isValidDate ? formatTimeAgo(log.timestamp) : '';
                const memberData = getTeamMember(log.user);
                const isSec = Boolean(log.isSecurityEvent || log.type === 'security' || log.telemetry || (log.id && log.id.startsWith('SEC-')) || log.type === 'auth');
                const effectiveType = (isSec && log.severity === 'danger') ? 'security' : (log.type || 'generic');
                const meta = CATEGORY_META[effectiveType] || { label: log.type || 'Action', badgeClass: 'badge-inactive', color: '#64748b' };

                tr.innerHTML = `
                    <td style="white-space: nowrap;">
                        <div style="font-weight: 600; color: var(--slate-800); font-size: 13px;">${dateFormatted}</div>
                        <div style="font-size: 11px; color: var(--slate-400); display: flex; gap: 4px; align-items: center; margin-top: 2px;">
                            <span>${timeFormatted}</span>
                            <span>•</span>
                            <span style="color: var(--primary); font-weight: 500;">${relativeTime}</span>
                        </div>
                    </td>
                    <td>
                        <div class="activity-member-cell">
                            <div class="activity-member-avatar" style="background: ${memberData.color}20; color: ${memberData.color};">
                                ${memberData.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <div style="font-size: 13px; font-weight: 600; color: var(--slate-800);">${escapeHtml(memberData.name)}</div>
                                <div style="font-size: 10px; color: var(--slate-400); max-width: 130px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(log.user || '')}</div>
                            </div>
                        </div>
                    </td>
                    <td>
                        <span class="activity-type-badge ${meta.badgeClass}">
                            ${escapeHtml(meta.label)}
                        </span>
                    </td>
                    <td>
                        <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px;">
                            <div>
                                <div style="font-weight: 600; color: var(--slate-900); font-size: 13px; margin-bottom: 2px;">
                                    ${escapeHtml(log.action || 'Activity')}
                                </div>
                                <div style="font-size: 12px; color: var(--slate-600); line-height: 1.4;">
                                    ${escapeHtml(log.details || '')}
                                </div>
                            </div>
                            ${isSec ? `
                                <button type="button" class="btn btn-sm btn-secondary sec-inspect-pill" data-inspect-sec="${log.securityId || log.id}" title="Inspect Security & Telemetry Details">
                                    <svg class="icon icon-sm" viewBox="0 0 24 24" style="color: var(--primary);"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                                    <span>Telemetry</span>
                                </button>
                            ` : ''}
                        </div>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }

        // Mobile Timeline Cards Feed
        if (mobileFeed) {
            mobileFeed.innerHTML = '';
            toShow.forEach(log => {
                const date = new Date(log.timestamp);
                const isValidDate = !isNaN(date.getTime());
                const relativeTime = isValidDate ? formatTimeAgo(log.timestamp) : 'Recently';
                const timeFormatted = isValidDate ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                const memberData = getTeamMember(log.user);
                const isSec = Boolean(log.isSecurityEvent || log.type === 'security' || log.telemetry || (log.id && log.id.startsWith('SEC-')) || log.type === 'auth');
                const effectiveType = (isSec && log.severity === 'danger') ? 'security' : (log.type || 'generic');
                const meta = CATEGORY_META[effectiveType] || { label: log.type || 'Action', badgeClass: 'badge-inactive', color: '#64748b' };

                const card = document.createElement('div');
                card.className = `activity-timeline-card type-${effectiveType}`;
                card.innerHTML = `
                    <div class="activity-card-header-mobile">
                        <div class="activity-card-member">
                            <div class="activity-member-avatar-sm" style="background: ${memberData.color}20; color: ${memberData.color};">
                                ${memberData.name.charAt(0).toUpperCase()}
                            </div>
                            <span class="activity-card-name">${escapeHtml(memberData.name)}</span>
                        </div>
                        <div class="activity-card-meta">
                            <span class="activity-type-badge ${meta.badgeClass}">${escapeHtml(meta.label)}</span>
                            <span class="activity-card-time">${relativeTime}</span>
                        </div>
                    </div>
                    <div class="activity-card-body">
                        <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px;">
                            <div class="activity-card-action-title">${escapeHtml(log.action || 'Activity')}</div>
                            ${isSec ? `
                                <button type="button" class="btn btn-sm btn-secondary sec-inspect-pill" data-inspect-sec="${log.securityId || log.id}" title="Inspect Security & Telemetry">
                                    <svg class="icon icon-sm" viewBox="0 0 24 24" style="color: var(--primary);"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                                    <span>Inspect</span>
                                </button>
                            ` : ''}
                        </div>
                        <div class="activity-card-details">${escapeHtml(log.details || '')}</div>
                    </div>
                `;
                mobileFeed.appendChild(card);
            });
        }
    }

    // 6. Pagination & Load More Controls
    const loadMoreBtn = byId('loadMoreActivityBtn');
    const paginationInfo = byId('activityPaginationInfo');

    if (paginationInfo) {
        paginationInfo.textContent = `Showing ${toShow.length} of ${filteredLogs.length} events`;
    }

    if (loadMoreBtn) {
        if (filteredLogs.length > currentActivityLogLimit) {
            loadMoreBtn.style.display = 'inline-block';
            loadMoreBtn.textContent = `Load More (${filteredLogs.length - toShow.length} remaining)`;
        } else {
            loadMoreBtn.style.display = 'none';
        }
    }
}

// --- EXPORT TO CSV ---

function exportActivityLogCSV() {
    const logs = (window.store && store.data && store.data.activityLogs) ? store.data.activityLogs : [];
    if (logs.length === 0) {
        showToast("No activity log data to export.", "info");
        return;
    }

    let csv = 'Timestamp,Date,Time,Member Name,Email,Category,Action,Details\n';
    logs.forEach(log => {
        const d = new Date(log.timestamp);
        const dateStr = !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : '';
        const timeStr = !isNaN(d.getTime()) ? d.toLocaleTimeString() : '';
        const member = getTeamMember(log.user);

        const row = [
            `"${log.timestamp || ''}"`,
            `"${dateStr}"`,
            `"${timeStr}"`,
            `"${(member.name || '').replace(/"/g, '""')}"`,
            `"${(log.user || '').replace(/"/g, '""')}"`,
            `"${(log.type || '').replace(/"/g, '""')}"`,
            `"${(log.action || '').replace(/"/g, '""')}"`,
            `"${(log.details || '').replace(/"/g, '""')}"`
        ];
        csv += row.join(',') + '\n';
    });

    const companySlug = (window.fbManager && fbManager.branding?.companyName || 'EverydaySupply').replace(/\s+/g, '_');
    downloadCSV(csv, `${companySlug}_ActivityLog_${getTodayISOString()}.csv`);
}

// --- EVENT LISTENERS INITIALIZATION ---

document.addEventListener('DOMContentLoaded', () => {
    const filterType = byId('activityFilterType');
    const filterUser = byId('activityFilterUser');
    const searchInput = byId('activitySearchInput');
    const loadMoreBtn = byId('loadMoreActivityBtn');
    const exportBtn = byId('exportActivityBtn');
    const refreshBtn = byId('refreshTeamBtn');

    if (filterType) {
        filterType.addEventListener('change', () => {
            currentActivityLogLimit = 20;
            renderTeamActivity();
        });
    }

    if (filterUser) {
        filterUser.addEventListener('change', () => {
            currentActivityLogLimit = 20;
            renderTeamActivity();
        });
    }

    if (searchInput) {
        let debounceTimer;
        searchInput.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                currentActivityLogLimit = 20;
                renderTeamActivity();
            }, 200);
        });
    }

    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => {
            currentActivityLogLimit += 25;
            renderTeamActivity();
        });
    }

    if (exportBtn) {
        exportBtn.addEventListener('click', exportActivityLogCSV);
    }

    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            updatePresence('online', 'Manual Refresh');
            renderTeamActivity();
            showToast("Team activity updated", "info");
        });
    }
});
