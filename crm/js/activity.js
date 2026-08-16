const TEAM_MEMBERS = {
    'mthembuavuyile@gmail.com': { name: 'Avuyile', role: 'Owner / Lead Admin', color: '#0f766e' },
    'asandamanelisi1998@gmail.com': { name: 'Asanda', role: 'Team Member', color: '#7c3aed' },
    'ayandalucasn@gmail.com': { name: 'Ayanda', role: 'Team Member', color: '#2563eb' }
};

function getTeamMemberName(email) {
    const member = TEAM_MEMBERS[(email || '').toLowerCase()];
    return member ? member.name : (email || 'Unknown').split('@')[0];
}

// --- ACTIVITY LOGGING & TEAM FUNCTIONS ---

function logActivity(type, action, details, userEmail = null) {
    const db = fbManager.db;
    if (!db) return;
    const email = userEmail || (fbManager.auth.currentUser ? fbManager.auth.currentUser.email : 'system@everydaysupply.co.za');
    const timestamp = new Date().toISOString();
    const logId = 'LOG-' + Date.now() + '-' + Math.floor(Math.random() * 1000);

    const payload = {
        id: logId,
        type: type, // 'auth', 'product', 'customer', 'sale', 'followup', 'settings'
        action: action,
        details: details,
        user: email,
        timestamp: timestamp
    };

    db.collection('activity_logs').doc(logId).set(payload).catch(err => {
        console.error("Failed to log activity:", err);
    });
}

function initActivityLogListener() {
    // This is handled by the unified store.initFirestoreListeners() now
}

let currentActivityLogLimit = 20;

function renderTeamActivity() {
    // Render Team Members Grid
    const teamGrid = byId('teamMembersGrid');
    if (teamGrid) {
        teamGrid.innerHTML = '';
        let onlineCount = 0;
        
        Object.entries(TEAM_MEMBERS).forEach(([email, data]) => {
            // Check if user is currently online (for now, just check if it's the logged-in user)
            const isCurrentUser = fbManager.auth && fbManager.auth.currentUser && fbManager.auth.currentUser.email === email;
            if (isCurrentUser) onlineCount++;
            
            const card = document.createElement('div');
            card.className = 'team-member-card';
            card.style.cssText = `background: white; border: 1px solid var(--slate-200); border-radius: var(--radius-md); padding: 16px; display: flex; align-items: center; gap: 12px;`;
            
            card.innerHTML = `
                <div style="width: 40px; height: 40px; border-radius: 50%; background: ${data.color}20; color: ${data.color}; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 16px;">
                    ${data.name.charAt(0)}
                </div>
                <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: 700; color: var(--slate-800); font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        ${data.name} ${isCurrentUser ? '<span style="font-size: 10px; background: var(--success); color: white; padding: 2px 6px; border-radius: 10px; margin-left: 6px;">You</span>' : ''}
                    </div>
                    <div style="font-size: 12px; color: var(--slate-500); margin-top: 2px;">${data.role}</div>
                    <div style="font-size: 11px; color: var(--slate-400); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${email}</div>
                </div>
            `;
            teamGrid.appendChild(card);
        });
        
        const countBadge = byId('teamOnlineCount');
        if (countBadge) countBadge.textContent = `${onlineCount} Online`;
    }

    // Render Activity Log Table
    const tbody = byId('activityLogBody');
    if (tbody) {
        const filterType = byId('activityFilterType') ? byId('activityFilterType').value : 'all';
        const filterUser = byId('activityFilterUser') ? byId('activityFilterUser').value : 'all';
        
        let logs = store.data.activityLogs || [];
        
        if (filterType !== 'all') {
            logs = logs.filter(log => log.type === filterType);
        }
        if (filterUser !== 'all') {
            logs = logs.filter(log => log.user === filterUser);
        }
        
        // Update badge
        const badge = byId('activityBadge');
        if (badge) {
            badge.style.display = logs.length > 0 ? 'inline-flex' : 'none';
            badge.textContent = logs.length > 99 ? '99+' : logs.length;
        }

        const toShow = logs.slice(0, currentActivityLogLimit);
        
        if (toShow.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--slate-400); padding: 40px;">No activity found matching filters.</td></tr>';
        } else {
            tbody.innerHTML = '';
            toShow.forEach(log => {
                const tr = document.createElement('tr');
                const date = new Date(log.timestamp);
                const memberData = TEAM_MEMBERS[log.user] || { name: log.user.split('@')[0], color: '#64748b' };
                
                tr.innerHTML = `
                    <td style="font-size: 12px; color: var(--slate-500); white-space: nowrap;">
                        ${date.toLocaleDateString()} <br>
                        <span style="font-size: 11px;">${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </td>
                    <td>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <div style="width: 24px; height: 24px; border-radius: 50%; background: ${memberData.color}20; color: ${memberData.color}; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 10px;">
                                ${memberData.name.charAt(0)}
                            </div>
                            <span style="font-size: 13px; font-weight: 600;">${memberData.name}</span>
                        </div>
                    </td>
                    <td style="font-size: 13px;">
                        <span style="background: var(--slate-100); padding: 2px 6px; border-radius: 4px; border: 1px solid var(--slate-200);">${escapeHtml(log.action)}</span>
                    </td>
                    <td style="font-size: 13px; color: var(--slate-700);">
                        ${escapeHtml(log.details)}
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }
        
        const loadMoreBtn = byId('loadMoreActivityBtn');
        if (loadMoreBtn) {
            loadMoreBtn.style.display = logs.length > currentActivityLogLimit ? 'inline-block' : 'none';
        }
    }
}

// Activity filter listeners
document.addEventListener('DOMContentLoaded', () => {
    const filterType = byId('activityFilterType');
    const filterUser = byId('activityFilterUser');
    const loadMoreBtn = byId('loadMoreActivityBtn');
    
    if (filterType) filterType.addEventListener('change', () => { currentActivityLogLimit = 20; renderTeamActivity(); });
    if (filterUser) filterUser.addEventListener('change', () => { currentActivityLogLimit = 20; renderTeamActivity(); });
    if (loadMoreBtn) loadMoreBtn.addEventListener('click', () => { currentActivityLogLimit += 20; renderTeamActivity(); });
});


