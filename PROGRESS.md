# Fadez2Go progress log

Newest on top.

## Oct 19 2026: project set up

- Expo app skeleton created (Expo SDK 58, expo-router, TypeScript), bundle id `com.fadez2go.app`.
- v1 spec drafted in `docs/SPEC.md`, including friends, messaging, fade requests, notifications and the request details screen (Mo's ask).
- Agent team added in `.claude/agents/`: pm, engineer, db, reviewer, security, grc, attorney. Change gate and product rules in `CLAUDE.md`, carried over from the MOVEZ setup.
- CI runs typecheck and lint on every push. Nightly encrypted database backup workflow is in place and stays idle until its secrets are added.
- Next: security and compliance reviews of the spec, then the database (inbox item 1).
