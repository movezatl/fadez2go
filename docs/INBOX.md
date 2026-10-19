# Inbox

Newest and most important on top. An item is built only after it has a `Review: OK` line (see the change gate in `CLAUDE.md`).

## 1. Database: profiles, sports, friends, chat, fade requests, notifications
Tables and RLS for everything in `docs/SPEC.md` "Core flows" 1 to 12. Fade state changes through SQL functions that check both sides' consent. Rounded location only.
Review: pending (attorney, grc, security)
Built Oct 19 2026 in PR #11; security tests in supabase/tests/rls_test.sql pass.

## 2. App: sign-up with 18+ gate, profile and sports setup
Review: pending
Built Oct 19 2026 in PR #11.

## 3. App: Find, profiles, friends and messaging
Review: pending
Built Oct 19 2026 in PR #11.

## 4. App: send, receive, respond to and confirm fade requests, with push notifications and the details screen
Review: pending
Built Oct 19 2026 in PR #11.

## 5. App: block, report, safety tips, account deletion, admin screen
Review: pending
Built Oct 19 2026 in PR #11.
