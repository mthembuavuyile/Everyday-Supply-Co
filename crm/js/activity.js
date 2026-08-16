// Everyday Supply Co. - Team & Activity Logging Module

const TEAM_MEMBERS = {
    'mthembuavuyile@gmail.com': { name: 'Avuyile', role: 'Owner / Lead Admin', color: '#0f766e' },
    'asandamanelisi1998@gmail.com': { name: 'Asanda', role: 'Team Member', color: '#7c3aed' },
    'ayandalucasn@gmail.com': { name: 'Ayanda', role: 'Team Member', color: '#2563eb' }
};

const CATEGORY_META = {
    'sale': { label: 'Sale Order', badgeClass: 'badge-sale', color: '#059669', icon: 'shopping-bag' },
    'product': { label: 'Inventory', badgeClass: 'badge-product', color: '#d97706', icon: 'package' },
    'customer': { label: 'Customer', badgeClass: 'badge-customer', color: '#2563eb', icon: 'user' },
    'followup': { label: 'Follow-up', badgeClass: 'badge-followup', color: '#db2777', icon: 'calendar' },
    'auth': { label: 'Security / Auth', badgeClass: 'badge-auth', color: '#7c3aed', icon: 'shield' },
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
    const rawName = cleanEmail.split('@')[0] || 'User';
    const formattedName = rawName.charAt(0).toUpperCase() + rawName.slice(1).replace(/[._-]/g, ' ');
    let colorHash = 0;
    for (let i = 0; i < cleanEmail.length; i++) {
        colorHash = (colorHash + cleanEmail.charCodeAt(i)) % AVATAR_COLORS.length;
    }
    return {
        name: formattedName,
        role: 'Team Member',
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
    const currentAuthEmail = (window.fbManager && fbManager.auth && fbManager.auth.currentUser)
        ? (fbManager.auth.currentUser.email || '').toLowerCase().trim()
        : '';

    // 1. Gather all known members (predefined + any seen in activity logs)
    const allMembersMap = { ...TEAM_MEMBERS };
    logs.forEach(log => {
        if (log.user && !allMembersMap[log.user.toLowerCase()]) {
            allMembersMap[log.user.toLowerCase()] = getTeamMember(log.user);
        }
    });

    // 2. Render Team Members Presence Grid
    const teamGrid = byId('teamMembersGrid');
    if (teamGrid) {
        teamGrid.innerHTML = '';
        let onlineCount = 0;
        const now = Date.now();

        Object.entries(allMembersMap).forEach(([email, data]) => {
            // Find most recent activity for this member
            const memberLogs = logs.filter(l => (l.user || '').toLowerCase() === email);
            const latestLog = memberLogs.length > 0 ? memberLogs[0] : null;
            const lastActiveTime = latestLog ? new Date(latestLog.timestamp).getTime() : 0;
            const isCurrentUser = currentAuthEmail && currentAuthEmail === email;
            
            // Mark online if logged in right now or active within last 15 minutes
            const isRecentlyActive = lastActiveTime > 0 && (now - lastActiveTime < 15 * 60 * 1000);
            const isOnline = isCurrentUser || isRecentlyActive;

            if (isOnline) onlineCount++;

            let statusText = 'Offline';
            let statusDotClass = 'status-dot-offline';
            if (isCurrentUser) {
                statusText = 'Online Now (You)';
                statusDotClass = 'status-dot-online';
            } else if (isRecentlyActive) {
                statusText = 'Active recently';
                statusDotClass = 'status-dot-online';
            } else if (latestLog) {
                statusText = `Active ${formatTimeAgo(latestLog.timestamp)}`;
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
                    <div class="team-member-role">${escapeHtml(data.role || 'Team Member')}</div>
                    <div class="team-member-status-line">
                        <span class="team-presence-label ${isOnline ? 'text-online' : 'text-offline'}">${statusText}</span>
                    </div>
                    ${latestLog ? `<div class="team-member-latest-action" title="${escapeHtml(latestLog.action + ': ' + latestLog.details)}">
                        <strong>Last action:</strong> ${escapeHtml(latestLog.action)}
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
        filteredLogs = filteredLogs.filter(log => log.type === filterType);
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
                const meta = CATEGORY_META[log.type] || { label: log.type || 'Action', badgeClass: 'badge-inactive', color: '#64748b' };

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
                        <div style="font-weight: 600; color: var(--slate-900); font-size: 13px; margin-bottom: 2px;">
                            ${escapeHtml(log.action || 'Activity')}
                        </div>
                        <div style="font-size: 12px; color: var(--slate-600); line-height: 1.4;">
                            ${escapeHtml(log.details || '')}
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
                const meta = CATEGORY_META[log.type] || { label: log.type || 'Action', badgeClass: 'badge-inactive', color: '#64748b' };

                const card = document.createElement('div');
                card.className = `activity-timeline-card type-${log.type || 'generic'}`;
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
                        <div class="activity-card-action-title">${escapeHtml(log.action || 'Activity')}</div>
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
            renderTeamActivity();
            showToast("Team activity updated", "info");
        });
    }
});
