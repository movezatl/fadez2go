// In-app legal text. Source: the "Fadez2Go Legal and Compliance Pack" drafted for
// Mo on Oct 19 2026. These are AI-drafted and must be reviewed by a licensed
// attorney before launch; LEGAL_DRAFT shows a notice on every legal screen
// until that review is done. Bump a version whenever its text changes: users
// are asked to accept again (consents table).

export const LEGAL_DRAFT = true;

export const COMPANY = 'Fadez2Go';
export const SUPPORT_EMAIL = 'support@fadez2go.app';
export const SAFETY_EMAIL = 'safety@fadez2go.app';
export const PRIVACY_EMAIL = 'privacy@fadez2go.app';

export const VERSIONS = { terms: '2026-10-19', privacy: '2026-10-19', waiver: '2026-10-19' } as const;

export type LegalSection = { heading?: string; body: string };
export type LegalDoc = { title: string; sections: LegalSection[] };

export const FIGHTER_CODE = [
  { title: 'Both say yes', body: 'Nothing happens unless both fighters accept. Either of you can call it off at any time.' },
  { title: 'No money, ever', body: 'No bets, purses, prizes, tips or paid sessions. Fadez2Go is for training.' },
  { title: 'Gyms only', body: 'Spar at a gym or training space, with gear, ideally with a coach or third person there.' },
  { title: 'Respect the tap', body: 'Agree on intensity first. Stop the moment your partner taps, says stop or signals.' },
];

export const SAFETY_TIPS = [
  'Meet at a gym or training facility you know. Never at a home, park or parking lot.',
  'Tell a friend where you are going and who you are training with.',
  'Agree on rules, intensity and a stop signal before the first round.',
  'Wear the gear you agreed on: gloves, mouthguard, headgear, shin guards.',
  'Have a coach or third person present.',
  'Either fighter can stop at any time. Stopping is never a loss.',
  'If anyone offers money or a bet, decline and report it.',
  'In an emergency, call 911 first. Then report it in the app.',
];

const terms: LegalDoc = {
  title: 'Terms of Service',
  sections: [
    { body: `These Terms are an agreement between you and ${COMPANY}. By creating an account or using the app, you agree to these Terms, our Privacy Policy and the Participant Waiver and Release. If you do not agree, do not use ${COMPANY}.` },
    { heading: '1. What Fadez2Go is', body: `${COMPANY} helps adult combat-sports athletes find training and sparring partners. We provide profiles, search and messaging. We do not organize, host, supervise, referee, promote or sanction any sparring session, match or event. We are not a gym, coach, promoter or athletic commission.` },
    { heading: '2. Eligibility', body: 'You must be at least 18 years old and able to enter a binding contract. You must not have been banned from Fadez2Go before. You confirm you are physically fit to train and have no medical condition that makes sparring unsafe for you.' },
    { heading: '3. Training only, no fights', body: 'Fadez2Go is for consensual training and sparring at a gym or training facility. You may not use it to arrange street fights, unsanctioned bouts, fights in public places, or any event with spectators, tickets, promotion or prizes. Any professional or amateur bout must go through a licensed promoter and the athletic commission where it takes place.' },
    { heading: '4. Consent', body: 'Every sparring session requires the clear, voluntary agreement of both participants. Either participant may decline, stop or cancel at any time, for any reason, without penalty. Pressure, threats or harassment to get someone to spar are prohibited. Stopping when a partner says stop, taps or signals is required.' },
    { heading: '5. No money', body: 'No money or anything of value may be exchanged in connection with a sparring session. This includes bets, wagers, purses, prizes, entry fees, side deals and payment for a session. Fadez2Go has no payment features. Violations lead to removal.' },
    { heading: '6. Your safety responsibilities', body: 'You are responsible for your own safety decisions. We strongly recommend that you train at a gym, with appropriate protective gear, with a qualified coach or third person present, and at an intensity both partners agreed to in advance. Tell someone where you are going.' },
    { heading: '7. Gym confirmation is limited', body: 'A "Gym confirmed" badge means we reviewed proof that the user has a stated connection to a gym. We do not run background checks, verify identity beyond what we state, or confirm anyone\'s skill, health, record or character. Do not rely on any profile as a guarantee.' },
    { heading: '8. Your content', body: 'You own the content you post. You give us a worldwide, non-exclusive, royalty-free license to host, display and process it to run Fadez2Go. You confirm you have the right to post it.' },
    { heading: '9. Prohibited conduct', body: 'You may not: threaten, harass or intimidate anyone; post violent threats, hate speech or sexual content; post intimate images of anyone without consent; impersonate anyone or lie about your age; arrange fights outside a training setting; exchange money as described in section 5; promote illegal activity; spam or scrape the service; or try to access other accounts or our systems.' },
    { heading: '10. Reporting and enforcement', body: 'You can report users and content in the app. We may remove content, suspend or ban accounts, and preserve information and share it with law enforcement when we believe it is needed for safety or required by law.' },
    { heading: '11. Assumption of risk', body: 'Combat sports and sparring carry inherent risks of serious injury, including concussion, broken bones, permanent disability and death. You voluntarily assume all such risks for any session you arrange through Fadez2Go, as described in the Participant Waiver and Release.' },
    { heading: '12. Disclaimers', body: 'Fadez2Go is provided "as is" and "as available." To the fullest extent allowed by law, we disclaim all warranties. We do not warrant that any user is safe, honest or qualified.' },
    { heading: '13. Limitation of liability', body: 'To the fullest extent allowed by law, Fadez2Go and its owners, employees and agents are not liable for any indirect, incidental, special, consequential or punitive damages, or for any personal injury or property damage arising from your interactions with other users or any sparring session. Our total liability for any claim relating to the service is limited to $100. Some states do not allow these limits, so they may not fully apply to you.' },
    { heading: '14. Indemnity', body: 'You will defend and hold harmless Fadez2Go from claims arising out of your use of the service, your content, your sparring sessions or your violation of these Terms.' },
    { heading: '15. Disputes', body: 'These Terms are governed by the laws of the State of Georgia. [Dispute terms to be set by our attorney.]' },
    { heading: '16. Account deletion and termination', body: 'You can delete your account at any time in Settings. We may suspend or end your access if you break these Terms or to protect users.' },
    { heading: '17. Changes', body: 'We may update these Terms. We will notify you in the app and ask you to accept material changes before you continue.' },
    { heading: '18. Contact', body: `${SUPPORT_EMAIL}` },
  ],
};

const privacy: LegalDoc = {
  title: 'Privacy Policy',
  sections: [
    { body: `This policy explains what ${COMPANY} collects, why, and the choices you have. Fadez2Go is for adults 18 and older in the United States.` },
    { heading: 'What we collect', body: 'Account: your email or Sign in with Apple ID, and your date of birth (to confirm you are 18+; never shown to anyone).\nProfile: display name, photo, sports, skill level, weight class, gym.\nApproximate location: rounded to roughly a mile, only while you use the app and only if you allow it.\nMessages and fades: chats, fade requests and the terms you both accepted.\nConsents: which versions of the Terms, Privacy Policy and Waiver you accepted, and when.\nSafety reports and moderation actions.\nGym confirmation: gym name and address, and a coach contact or proof photo. Proof files are deleted after review.\nDevice: app version and push notification token.' },
    { heading: 'What we never collect', body: 'Exact body weight, medical or injury history, or precise GPS for display. We use no advertising or cross-app tracking.' },
    { heading: 'What other fighters see', body: 'Your profile, a rough distance band (for example "3 to 10 mi"), and messages you send them. Nobody sees your exact location or birthday.' },
    { heading: 'How we use it', body: 'To run Fadez2Go, match training partners, deliver messages and notifications, confirm gyms, enforce our Terms, prevent abuse, and respond to legal requests.' },
    { heading: 'Who we share with', body: 'Service providers that run the app for us, such as Supabase (database and sign-in), Apple (sign-in, notifications and distribution) and Expo (notifications), under contracts that limit their use. Law enforcement when required by law or needed to protect someone. We do not sell your personal information or share it for targeted advertising.' },
    { heading: 'Messages', body: 'Messages are encrypted in transit and at rest, but not end-to-end: when a conversation is reported, our moderators can read the reported messages to keep people safe.' },
    { heading: 'Sensitive information', body: 'Location is sensitive data under several state laws. We collect it only with your permission and only to show nearby partners. You can turn it off in your phone settings or clear it in the app at any time.' },
    { heading: 'How long we keep it', body: 'While your account is active. When you delete your account, we delete your profile, location and messages within 30 days, except records we must keep for safety or legal reasons (such as ban records and safety reports), kept for up to 1 year.' },
    { heading: 'Your rights', body: `You can view and edit your profile, turn off location, block users and delete your account in the app. Depending on your state, you may have rights to access, correct, delete or get a copy of your data. Contact ${PRIVACY_EMAIL}.` },
    { heading: 'Children', body: 'Fadez2Go is not for anyone under 18. If we learn a minor has an account, we delete it.' },
    { heading: 'Changes and contact', body: `We will notify you in the app before material changes. Questions: ${PRIVACY_EMAIL}.` },
  ],
};

const waiver: LegalDoc = {
  title: 'Participant Waiver and Release',
  sections: [
    { body: 'PLEASE READ CAREFULLY. BY CHECKING THE BOX YOU GIVE UP CERTAIN LEGAL RIGHTS, INCLUDING THE RIGHT TO SUE.' },
    { heading: '1. Activity', body: '"Sparring Session" means any training, sparring, drilling or other combat-sports activity I take part in with someone I connected with through Fadez2Go.' },
    { heading: '2. Age and fitness', body: 'I confirm I am at least 18 years old, in good physical health, and have no condition that makes combat sports unsafe for me.' },
    { heading: '3. Known risks', body: 'Combat sports and sparring are dangerous. Risks include bruises, cuts, sprains, broken bones, dislocations, eye and dental injury, concussion and other brain injury, spinal injury, cardiac events, infection, paralysis and death. Injuries can happen even with gear, supervision and agreed intensity.' },
    { heading: '4. Assumption of risk', body: 'I voluntarily choose to take part in each Sparring Session and assume all risks, known and unknown.' },
    { heading: '5. My responsibilities', body: 'I will agree on intensity, rules and a stop signal before each session; use protective gear; train at a gym or training facility; stop immediately when my partner taps, says stop or signals; and never take part while impaired.' },
    { heading: '6. Fadez2Go\'s role', body: 'Fadez2Go does not organize, supervise, referee or inspect any Sparring Session, location or equipment, and does not screen users\' skill, health, record or background beyond what it states in the app.' },
    { heading: '7. Release', body: `To the fullest extent allowed by law, I release, waive and agree not to sue ${COMPANY}, its owners, officers, employees and agents for any injury, illness, death, property damage or loss arising from any Sparring Session, including claims based on their ordinary negligence. This release does not apply to gross negligence, willful misconduct or anything that cannot be waived by law.` },
    { heading: '8. Indemnity', body: 'I agree to indemnify the released parties against claims arising from my conduct in a Sparring Session.' },
    { heading: '9. Medical care', body: 'I authorize emergency medical treatment for myself if needed and accept responsibility for its cost.' },
    { heading: '10. Severability and binding effect', body: 'If any part of this release is unenforceable, the rest remains in effect. It binds me, my heirs, executors and assigns, and is governed by the laws of Georgia.' },
  ],
};

export const LEGAL_DOCS: Record<'terms' | 'privacy' | 'waiver', LegalDoc> = { terms, privacy, waiver };
