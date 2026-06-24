// src/demo/demoTickets.ts
// Feature: helppilot

export const DEMO_TICKETS = [
  {
    subject: 'Forgot my password - cannot log in',
    body: 'Hi, I forgot my Windows password and the self-service portal says my account is locked. Can you help me reset it? I need access urgently for a client meeting.',
    submitter_email: 'alice@example.com',
    description: 'Ticket 1: password-reset → should auto-resolve (high confidence KB match)',
  },
  {
    subject: 'CRITICAL: Entire office network is down',
    body: 'All workstations in Building B have lost network connectivity as of 9:00 AM. VPN, shared drives, and internet are all unreachable. This is affecting 50+ employees and blocking all work.',
    submitter_email: 'bob@example.com',
    description: 'Ticket 2: network-issue critical → should go to pending-approval',
  },
  {
    subject: 'Impossible d\'installer Microsoft Teams',
    body: 'Bonjour, j\'essaie d\'installer Microsoft Teams sur mon ordinateur portable Windows 11 mais l\'installation échoue avec le code d\'erreur 0x80070005. Pouvez-vous m\'aider?',
    submitter_email: 'claude@example.fr',
    description: 'Ticket 3: French software-install → multilingual flow',
  },
  {
    subject: 'Something broken?',
    body: 'It stopped working. Please fix.',
    submitter_email: 'dave@example.com',
    description: 'Ticket 4: vague low-confidence → should escalate',
  },
  {
    subject: 'Question about software license billing',
    body: 'I received an invoice for Adobe Creative Cloud renewal but I thought this was covered under our enterprise license. Can you clarify the billing and whether I should pay this or if IT handles it?',
    submitter_email: 'eve@example.com',
    description: 'Ticket 5: billing → KB fallback to Brave search',
  },
  {
    subject: 'I AM ABSOLUTELY FURIOUS - THIS IS UNACCEPTABLE!!!',
    body: 'MY LAPTOP HAS BEEN BROKEN FOR 3 WEEKS AND NOBODY IS HELPING ME. I HAVE CALLED 5 TIMES. IF THIS IS NOT FIXED TODAY I WILL CANCEL MY CONTRACT AND TALK TO MY MANAGER. THIS IS THE WORST SUPPORT I HAVE EVER EXPERIENCED.',
    submitter_email: 'frank@example.com',
    description: 'Ticket 6: angry ALL-CAPS → EmotionAnalyzer escalation + trigger words',
  },
  {
    subject: 'VPN issue - Spanish user with screenshot',
    body: 'No puedo conectarme a la VPN de la empresa. Adjunto captura de pantalla del error.',
    submitter_email: 'garcia@example.es',
    description: 'Ticket 7: Spanish + VPN → MultiModal + multilingual flow',
  },
  {
    subject: 'Fw: Fwd: Re: Printer not working',
    body: `Thanks for the update.

> On Mon, Jan 1, 2024 at 9:00 AM Support <support@company.com> wrote:
> We are looking into the printer issue.
>
>> From: User <user@example.com>
>> Sent: Sunday, December 31
>> To: Support
>> Subject: Printer not working
>>
>> The office printer on Floor 3 is showing "Offline" in the print queue.`,
    submitter_email: 'henry@example.com',
    description: 'Ticket 8: forwarded email thread → email thread parser demo',
  },
  {
    subject: 'Another laptop issue - please help',
    body: 'My laptop keeps crashing. This is the 4th time this month. Blue screen every morning.',
    submitter_email: 'vip-user@example.com',
    description: 'Ticket 9: VIP problem account (3+ tickets in 7 days)',
  },
  {
    subject: 'I want to cancel my account - this is ridiculous',
    body: 'Please cancel my software subscription. I want to talk to a manager. I am considering a lawsuit over data loss. I quit using your service.',
    submitter_email: 'iris@example.com',
    description: 'Ticket 10: trigger words (cancel, manager, lawsuit, quit) → lead notification',
  },
];
