# Fadez2Go progress log

Newest on top.

## Oct 19 2026: v1 app built (PR #11, draft)

- Database: full schema with RLS, consent-checked fade functions, rounded location and mile bands, chat only between friends or matched fighters, block, report, ban, gym confirmation, admin queue, account deletion. Security tests run in CI on plain Postgres.
- App: welcome with Fighter Code and 18+ gate, Apple and email sign-in, 3-step setup, Discover with filters, fighter profiles, friends, chat, fade request create, details, accept, counter, decline, confirm and feedback, notifications with push, settings, blocked list, gym confirmation, report, admin.
- Push: Supabase edge function sends "New fade request" style alerts without message content.
- Added fadez-ux agent and docs/DESIGN.md. Setup steps for Mo in docs/SETUP.md.
- Still open: the formal attorney, grc and security pre-check lines on the inbox items, fadez-reviewer pass, and attorney sign-off on the legal drafts (LEGAL_DRAFT is still true).

## Oct 19 2026: project set up

- Expo app skeleton created (Expo SDK 58, expo-router, TypeScript), bundle id `com.fadez2go.app`.
- v1 spec drafted in `docs/SPEC.md`, including friends, messaging, fade requests, notifications and the request details screen (Mo's ask).
- Agent team added in `.claude/agents/`: pm, engineer, db, reviewer, security, grc, attorney. Change gate and product rules in `CLAUDE.md`, carried over from the MOVEZ setup.
- CI runs typecheck and lint on every push. Nightly encrypted database backup workflow is in place and stays idle until its secrets are added.
- Next: security and compliance reviews of the spec, then the database (inbox item 1).
