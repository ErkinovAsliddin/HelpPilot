// src/db/kbSeed.ts
// Feature: helppilot

export interface KBEntry {
  id: string;
  document: string;
  metadata: {
    title: string;
    summary: string;
    type: 'kb_article';
    category: string;
    source: 'static';
    createdAt: string;
    success_count: number;
    failure_count: number;
  };
}

const NOW = new Date().toISOString();

export const KB_SEED_ARTICLES: KBEntry[] = [
  {
    id: 'kb-pwd-reset-001',
    document: 'How to reset your Windows Active Directory password using the self-service portal at password.company.com',
    metadata: { title: 'Password Reset via Self-Service Portal', summary: 'Visit password.company.com, enter your username, verify via email or SMS, set new password meeting complexity requirements.', type: 'kb_article', category: 'password-reset', source: 'static', createdAt: NOW, success_count: 0, failure_count: 0 },
  },
  {
    id: 'kb-pwd-reset-002',
    document: 'Locked out of account after too many failed login attempts',
    metadata: { title: 'Account Lockout Recovery', summary: 'Contact IT helpdesk with your employee ID. Admin can unlock via AD console. Lockout policy: 5 failed attempts = 30-minute lockout.', type: 'kb_article', category: 'password-reset', source: 'static', createdAt: NOW, success_count: 0, failure_count: 0 },
  },
  {
    id: 'kb-pwd-reset-003',
    document: 'Forgot email password cannot login to Outlook or webmail',
    metadata: { title: 'Email Password Reset', summary: 'Use the IT portal to reset your email password. Changes sync within 5 minutes. Clear browser cache after reset.', type: 'kb_article', category: 'password-reset', source: 'static', createdAt: NOW, success_count: 0, failure_count: 0 },
  },
  {
    id: 'kb-pwd-reset-004',
    document: 'VPN password expired cannot connect to company network remotely',
    metadata: { title: 'VPN Password Expiration', summary: 'VPN uses your AD credentials. Reset via self-service portal or contact IT. After reset, reconnect VPN client and authenticate.', type: 'kb_article', category: 'password-reset', source: 'static', createdAt: NOW, success_count: 0, failure_count: 0 },
  },
  {
    id: 'kb-pwd-reset-005',
    document: 'Multi-factor authentication MFA not working cannot receive code',
    metadata: { title: 'MFA Troubleshooting', summary: 'Try backup codes, check authenticator app time sync, or request IT to disable MFA temporarily. Re-enroll after resolving.', type: 'kb_article', category: 'password-reset', source: 'static', createdAt: NOW, success_count: 0, failure_count: 0 },
  },
  {
    id: 'kb-net-001',
    document: 'Cannot connect to WiFi network at office shows authentication error',
    metadata: { title: 'WiFi Authentication Failure', summary: 'Forget the network and reconnect. Use your domain credentials (username@company.com). If persists, flush DNS: ipconfig /flushdns and restart network adapter.', type: 'kb_article', category: 'network-issue', source: 'static', createdAt: NOW, success_count: 0, failure_count: 0 },
  },
  {
    id: 'kb-net-002',
    document: 'VPN connection drops frequently unstable remote access',
    metadata: { title: 'VPN Stability Issues', summary: 'Update VPN client to latest version. Check split tunneling settings. If on WiFi, switch to ethernet. Contact IT if issue persists on multiple networks.', type: 'kb_article', category: 'network-issue', source: 'static', createdAt: NOW, success_count: 0, failure_count: 0 },
  },
  {
    id: 'kb-net-003',
    document: 'Slow internet connection poor network performance',
    metadata: { title: 'Network Performance Issues', summary: 'Run speed test at fast.com. Check for bandwidth-heavy apps. Restart router/switch. If office-wide, report to facilities for infrastructure check.', type: 'kb_article', category: 'network-issue', source: 'static', createdAt: NOW, success_count: 0, failure_count: 0 },
  },
  {
    id: 'kb-net-004',
    document: 'Cannot access shared network drive mapped drive shows disconnected',
    metadata: { title: 'Network Drive Access Issue', summary: 'Reconnect via \\\\server\\share. Verify your account has permissions. Check if VPN is connected for remote access. Re-map drive if needed.', type: 'kb_article', category: 'network-issue', source: 'static', createdAt: NOW, success_count: 0, failure_count: 0 },
  },
  {
    id: 'kb-net-005',
    document: 'DNS resolution failing cannot reach internal websites by hostname',
    metadata: { title: 'DNS Resolution Failure', summary: 'Set DNS to company DNS servers (10.0.0.1, 10.0.0.2). Flush DNS cache. Verify network adapter DNS settings. Test with nslookup.', type: 'kb_article', category: 'network-issue', source: 'static', createdAt: NOW, success_count: 0, failure_count: 0 },
  },
];

// Additional KB entries
const MORE_ARTICLES: KBEntry[] = [
  {
    id: 'kb-net-006',
    document: 'Printer not found on network cannot print to office printer',
    metadata: { title: 'Network Printer Not Found', summary: 'Add printer via Settings > Printers. Use IP address if hostname fails. Install latest print drivers from IT portal. Check printer is online.', type: 'kb_article', category: 'network-issue', source: 'static', createdAt: NOW, success_count: 0, failure_count: 0 },
  },
  {
    id: 'kb-sw-001',
    document: 'How to install Microsoft Office 365 on new computer',
    metadata: { title: 'Office 365 Installation', summary: 'Download from portal.office.com using your company account. Run setup.exe, sign in when prompted. Activation is automatic with valid license.', type: 'kb_article', category: 'software-install', source: 'static', createdAt: NOW, success_count: 0, failure_count: 0 },
  },
  {
    id: 'kb-sw-002',
    document: 'Adobe Acrobat installation license error cannot activate',
    metadata: { title: 'Adobe Acrobat License Activation', summary: 'Use Adobe Admin Console credentials. Sign out of existing activations if at limit. Contact IT for additional licenses. Use serial key from IT portal.', type: 'kb_article', category: 'software-install', source: 'static', createdAt: NOW, success_count: 0, failure_count: 0 },
  },
  {
    id: 'kb-sw-003',
    document: 'Software installation blocked by IT policy requires admin approval',
    metadata: { title: 'Software Installation Approval', summary: 'Submit software request via IT portal. Include business justification. Approval takes 1-3 business days. IT will push approved software via SCCM.', type: 'kb_article', category: 'software-install', source: 'static', createdAt: NOW, success_count: 0, failure_count: 0 },
  },
  {
    id: 'kb-sw-004',
    document: 'Python or development environment setup for new developer',
    metadata: { title: 'Developer Environment Setup', summary: 'Install via Software Center or follow dev onboarding guide. Install VS Code, Git, Node.js from IT-approved sources. Request elevated permissions if needed.', type: 'kb_article', category: 'software-install', source: 'static', createdAt: NOW, success_count: 0, failure_count: 0 },
  },
  {
    id: 'kb-sw-005',
    document: 'Antivirus software update failing or showing errors',
    metadata: { title: 'Antivirus Update Issues', summary: 'Restart antivirus service. Check internet connectivity. Manually trigger definition update. If corporate AV, IT manages via central console — raise ticket.', type: 'kb_article', category: 'software-install', source: 'static', createdAt: NOW, success_count: 0, failure_count: 0 },
  },
  {
    id: 'kb-sw-006',
    document: 'Teams or Zoom video conferencing not working microphone camera issue',
    metadata: { title: 'Video Conferencing Audio/Video Fix', summary: 'Check device permissions for microphone/camera. Update app to latest version. Test in settings. Use web version as fallback. Restart audio service.', type: 'kb_article', category: 'software-install', source: 'static', createdAt: NOW, success_count: 0, failure_count: 0 },
  },
  {
    id: 'kb-sw-007',
    document: 'Outlook not syncing emails stuck on loading or not receiving',
    metadata: { title: 'Outlook Sync Issues', summary: 'Restart Outlook. Check account settings. Run Repair via Control Panel. Recreate Outlook profile if needed. Check mailbox quota in OWA.', type: 'kb_article', category: 'software-install', source: 'static', createdAt: NOW, success_count: 0, failure_count: 0 },
  },
  {
    id: 'kb-hw-001',
    document: 'Laptop battery not charging shows plugged in not charging',
    metadata: { title: 'Battery Not Charging', summary: 'Update battery driver. Recalibrate by fully discharging then charging. If under warranty, request replacement. Check charger and port for damage.', type: 'kb_article', category: 'hardware-failure', source: 'static', createdAt: NOW, success_count: 0, failure_count: 0 },
  },
  {
    id: 'kb-hw-002',
    document: 'Computer running slow high CPU memory usage',
    metadata: { title: 'Computer Performance Issues', summary: 'Check Task Manager for resource-heavy processes. Run disk cleanup. Increase virtual memory. Consider RAM upgrade request via IT. Scan for malware.', type: 'kb_article', category: 'hardware-failure', source: 'static', createdAt: NOW, success_count: 0, failure_count: 0 },
  },
  {
    id: 'kb-hw-003',
    document: 'Monitor not displaying image black screen or no signal',
    metadata: { title: 'Monitor Display Issues', summary: 'Check cable connections (HDMI/DP). Test with different cable. Update display drivers. Verify monitor power. Try different display port on laptop.', type: 'kb_article', category: 'hardware-failure', source: 'static', createdAt: NOW, success_count: 0, failure_count: 0 },
  },
  {
    id: 'kb-hw-004',
    document: 'Keyboard or mouse not working unresponsive',
    metadata: { title: 'Keyboard/Mouse Not Working', summary: 'Check USB connections or Bluetooth pairing. Replace batteries for wireless devices. Try different USB port. Test on another computer to isolate issue.', type: 'kb_article', category: 'hardware-failure', source: 'static', createdAt: NOW, success_count: 0, failure_count: 0 },
  },
  {
    id: 'kb-hw-005',
    document: 'Computer crashes blue screen BSOD stop error',
    metadata: { title: 'Blue Screen / System Crash', summary: 'Note the error code. Run Windows Memory Diagnostic. Update drivers (especially GPU and storage). Check Event Viewer for crash logs. May need OS repair.', type: 'kb_article', category: 'hardware-failure', source: 'static', createdAt: NOW, success_count: 0, failure_count: 0 },
  },
  {
    id: 'kb-hw-006',
    document: 'Hard drive failing disk errors bad sectors',
    metadata: { title: 'Hard Drive Failure', summary: 'Back up data immediately. Run SMART test (CrystalDiskInfo). Schedule hardware replacement. IT can assist with data migration to new drive.', type: 'kb_article', category: 'hardware-failure', source: 'static', createdAt: NOW, success_count: 0, failure_count: 0 },
  },
  {
    id: 'kb-billing-001',
    document: 'Software subscription renewal billing invoice question',
    metadata: { title: 'Software Subscription Billing', summary: 'Contact Finance department for invoice queries. IT can provide license details and renewal dates. Subscription management via vendor portal.', type: 'kb_article', category: 'billing', source: 'static', createdAt: NOW, success_count: 0, failure_count: 0 },
  },
  {
    id: 'kb-billing-002',
    document: 'Cloud service AWS Azure bill unexpectedly high overage charges',
    metadata: { title: 'Cloud Billing Overages', summary: 'Review usage in cloud console. Set billing alerts. Contact FinOps team to analyze and optimize. Request budget increase via IT procurement.', type: 'kb_article', category: 'billing', source: 'static', createdAt: NOW, success_count: 0, failure_count: 0 },
  },
  {
    id: 'kb-billing-003',
    document: 'License expired software showing evaluation mode or deactivated',
    metadata: { title: 'License Expiration', summary: 'Contact IT for license renewal. Check IT portal for available licenses. Temporary extension may be available. Submit procurement request if new license needed.', type: 'kb_article', category: 'billing', source: 'static', createdAt: NOW, success_count: 0, failure_count: 0 },
  },
  {
    id: 'kb-other-001',
    document: 'New employee onboarding IT setup checklist first day',
    metadata: { title: 'New Employee IT Onboarding', summary: 'Complete IT onboarding form before start date. Laptop will be ready on Day 1. Account creation takes 24h. Badge access in week 1. IT will schedule orientation.', type: 'kb_article', category: 'other', source: 'static', createdAt: NOW, success_count: 0, failure_count: 0 },
  },
  {
    id: 'kb-other-002',
    document: 'How to request a new software tool or IT resource',
    metadata: { title: 'IT Resource Request Process', summary: 'Submit request via IT portal with business justification. Requests reviewed weekly. Budget approval needed for purchases over $500. Timeline: 2-3 weeks typical.', type: 'kb_article', category: 'other', source: 'static', createdAt: NOW, success_count: 0, failure_count: 0 },
  },
  {
    id: 'kb-other-003',
    document: 'Data backup restore recovery lost files',
    metadata: { title: 'Data Backup and Recovery', summary: 'Files on network drives are backed up daily. Request restore via IT portal. Personal device backups via company Backup solution. Recovery within 24h.', type: 'kb_article', category: 'other', source: 'static', createdAt: NOW, success_count: 0, failure_count: 0 },
  },
  {
    id: 'kb-other-004',
    document: 'Security incident phishing email suspicious link clicked',
    metadata: { title: 'Security Incident Response', summary: 'Disconnect from network immediately. Do not click further. Forward email to security@company.com. Change all passwords. IT Security will investigate.', type: 'kb_article', category: 'other', source: 'static', createdAt: NOW, success_count: 0, failure_count: 0 },
  },
  {
    id: 'kb-other-005',
    document: 'Remote work VPN two factor setup work from home configuration',
    metadata: { title: 'Remote Work Setup Guide', summary: 'Install VPN client from IT portal. Set up MFA via authenticator app. Test connection before first remote day. IT can provide video walkthrough.', type: 'kb_article', category: 'other', source: 'static', createdAt: NOW, success_count: 0, failure_count: 0 },
  },
  {
    id: 'kb-other-006',
    document: 'Shared mailbox calendar access permissions delegate setup',
    metadata: { title: 'Shared Mailbox and Calendar Access', summary: 'Request access via IT portal. Manager approval required. Setup takes up to 1 business day. Access via Outlook: File > Open > Other Users Folder.', type: 'kb_article', category: 'other', source: 'static', createdAt: NOW, success_count: 0, failure_count: 0 },
  },
  {
    id: 'kb-other-007',
    document: 'Software crash application not responding freezing',
    metadata: { title: 'Application Crash/Freeze', summary: 'Force close with Task Manager. Clear application cache. Reinstall if recurring. Check for updates. Review Windows Event Viewer for error codes.', type: 'kb_article', category: 'other', source: 'static', createdAt: NOW, success_count: 0, failure_count: 0 },
  },
  {
    id: 'kb-other-008',
    document: 'USB device not recognized not detected when plugged in',
    metadata: { title: 'USB Device Not Recognized', summary: 'Try different USB port. Update USB drivers. Check Device Manager for errors. Test device on another machine. Disable USB selective suspend.', type: 'kb_article', category: 'other', source: 'static', createdAt: NOW, success_count: 0, failure_count: 0 },
  },
  {
    id: 'kb-other-009',
    document: 'Email not sending delivery failure error message bounced',
    metadata: { title: 'Email Delivery Failure', summary: 'Check recipient address for typos. Verify no attachment size limit exceeded (25MB). Check spam/junk folder. Contact IT if server-side issue.', type: 'kb_article', category: 'other', source: 'static', createdAt: NOW, success_count: 0, failure_count: 0 },
  },
  {
    id: 'kb-other-010',
    document: 'Printer paper jam or print queue stuck jobs not printing',
    metadata: { title: 'Printer Issues - Paper Jam / Queue', summary: 'Clear paper jam per printer guide. Clear print queue: Services > Print Spooler > Stop > delete files in spool folder > Start. Restart printer.', type: 'kb_article', category: 'other', source: 'static', createdAt: NOW, success_count: 0, failure_count: 0 },
  },
];

export const ALL_KB_ARTICLES: KBEntry[] = [...KB_SEED_ARTICLES, ...MORE_ARTICLES];
