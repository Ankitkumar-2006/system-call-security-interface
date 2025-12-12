document.addEventListener('DOMContentLoaded', () => {
    // --- Dashboard Elements ---
    const syscallFeed = document.getElementById('syscall-feed').getElementsByTagName('tbody')[0];
    const totalEventsElement = document.getElementById('total-events');
    const blockedCountElement = document.getElementById('blocked-count');
    const authFailCountElement = document.getElementById('auth-fail-count');
    const topSyscallElement = document.getElementById('top-syscall');
    
    // --- Global State ---
    let totalEvents = 0;
    let blockedCount = 0;
    let authFailCount = 0;
    let syscallCounts = {};

    // --- Tab Switching Logic ---
    const navLinks = document.querySelectorAll('nav a');
    const sections = document.querySelectorAll('.section-card');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Update active link class
            navLinks.forEach(l => l.classList.remove('active-link'));
            e.target.classList.add('active-link');

            // Show/Hide sections
            const targetId = e.target.getAttribute('href').substring(1);
            sections.forEach(section => {
                if (section.id === targetId) {
                    section.classList.remove('hidden-section');
                    section.classList.add('active-section');
                } else {
                    section.classList.add('hidden-section');
                    section.classList.remove('active-section');
                }
            });
        });
    });

    // --- Syscall Data Generation and Update (Live Monitor) ---
    function generateSyscallEvent() {
        const syscalls = ["read", "write", "openat", "close", "execve", "connect", "ptrace", "clone", "socket"];
        const processes = ["web_server", "api_gateway", "backup_script", "untrusted_app", "ssh_daemon"];
        const users = ["www-data", "root", "admin", "guest", "backup-user"];
        
        const syscall = syscalls[Math.floor(Math.random() * syscalls.length)];
        const process = processes[Math.floor(Math.random() * processes.length)];
        const user = users[Math.floor(Math.random() * users.length)];
        
        let action = 'ALLOW';
        let authStatus = 'OK (Verified Hash)';
        
        // Simulate Policy Violation (DENY)
        if (syscall === 'ptrace' && process === 'untrusted_app') {
            action = 'DENY';
        } 
        
        // Simulate Authentication Failure
        if (Math.random() < 0.1) {
            authStatus = 'FAIL (Unknown Token)';
            if (action === 'ALLOW') action = 'DENY'; // Auth failure always leads to deny
        } else if (process === 'untrusted_app' && Math.random() < 0.3) {
            authStatus = 'FAIL (Signature Mismatch)';
        }

        return {
            time: new Date().toLocaleTimeString('en-US', { hour12: false }),
            action: action,
            syscall: syscall,
            process: `${Math.floor(Math.random() * 10000)}/${process}`,
            user: user,
            authStatus: authStatus
        };
    }

    function updateDashboard() {
        const event = generateSyscallEvent();
        totalEvents++;

        // Update Syscall Counts for Top Syscall Metric
        syscallCounts[event.syscall] = (syscallCounts[event.syscall] || 0) + 1;
        
        // Find top syscall
        let maxCount = 0;
        let topSyscall = 'N/A';
        for (const [key, value] of Object.entries(syscallCounts)) {
            if (value > maxCount) {
                maxCount = value;
                topSyscall = key;
            }
        }

        // Update Metrics
        totalEventsElement.textContent = totalEvents;
        topSyscallElement.textContent = topSyscall;
        if (event.action === 'DENY') {
            blockedCount++;
            blockedCountElement.textContent = blockedCount;
        }
        if (event.authStatus.startsWith('FAIL')) {
            authFailCount++;
            authFailCountElement.textContent = authFailCount;
        }


        // Create table row
        const newRow = syscallFeed.insertRow(0); // Insert at the top
        newRow.insertCell(0).textContent = event.time;
        newRow.insertCell(1).textContent = event.action;
        newRow.insertCell(2).textContent = event.syscall;
        newRow.insertCell(3).textContent = event.process;
        newRow.insertCell(4).textContent = event.user;
        newRow.insertCell(5).textContent = event.authStatus;

        // Apply dynamic styling
        if (event.action === 'DENY') {
            newRow.classList.add('row-deny');
        } else if (event.authStatus.startsWith('FAIL')) {
             newRow.classList.add('row-auth-fail');
        } else if (event.action === 'ALLOW') {
            newRow.classList.add('row-allow');
        }

        // Limit feed size to 10 rows
        while (syscallFeed.rows.length > 10) {
            syscallFeed.deleteRow(10);
        }
    }

    // Initial load and continuous update
    for (let i = 0; i < 10; i++) {
        updateDashboard();
    }
    setInterval(updateDashboard, 1000); // Update every 1 second

    // --- Policy Editor Functions ---
    window.savePolicy = function() {
        const name = document.getElementById('policy-name').value;
        const syscall = document.getElementById('syscall-target').value;
        const action = document.getElementById('action').value;
        
        if (name && syscall && action) {
            alert(`New Policy Saved & Deployed:\nName: ${name}\nTarget: ${syscall}\nAction: ${action}`);
            
            // Add to active policy list (dummy update)
            const policyList = document.getElementById('active-policy-list');
            const newPolicyItem = document.createElement('li');
            newPolicyItem.innerHTML = `[🆕 NEW] Policy: **${name}** (Target: ${syscall}, Action: ${action})`;
            policyList.prepend(newPolicyItem);
        }
    };
    
    // --- Audit Log Functions ---
    window.searchLogs = function() {
        const query = document.getElementById('log-search-query').value.toLowerCase();
        const resultsBody = document.getElementById('audit-log-results').getElementsByTagName('tbody')[0];
        resultsBody.innerHTML = ''; // Clear old results

        // Dummy log generation for search results
        const dummyLogs = [
            { time: "10:30:15", outcome: "DENY", hash: "a8f3d...", syscall: "openat /etc/shadow", integrity: "1a2b3c" },
            { time: "10:30:10", outcome: "ALLOW", hash: "b2e9c...", syscall: "read /var/log/app", integrity: "4d5e6f" },
            { time: "10:29:55", outcome: "FAIL_AUTH", hash: "unknown...", syscall: "execve /tmp/script", integrity: "7g8h9i" },
            { time: "10:29:40", outcome: "ALLOW", hash: "a8f3d...", syscall: "write /tmp/cache", integrity: "j0k1l2" },
        ];

        let foundCount = 0;
        dummyLogs.forEach(log => {
            if (log.syscall.toLowerCase().includes(query) || log.hash.includes(query) || query === '') {
                const row = resultsBody.insertRow();
                row.insertCell(0).textContent = log.time;
                row.insertCell(1).textContent = log.outcome;
                row.insertCell(2).textContent = log.hash.substring(0, 7) + '...';
                row.insertCell(3).textContent = log.syscall;
                row.insertCell(4).textContent = log.integrity;

                if (log.outcome === 'DENY' || log.outcome === 'FAIL_AUTH') {
                    row.classList.add('row-deny');
                }
                foundCount++;
            }
        });
        
        if (foundCount === 0) {
             const row = resultsBody.insertRow();
             row.insertCell(0).colSpan = 5;
             row.insertCell(0).textContent = 'No logs found matching the query.';
        }
    };
    
    window.exportLogs = function() {
        alert('Audit Logs (Cryptographically Signed) Export Initiated. Check backend storage for the JSON/CSV file.');
    };
});