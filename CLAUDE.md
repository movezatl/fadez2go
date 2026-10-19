# FADEZ2GO — Claude is the overseer

Fadez2Go helps combat-sports athletes find sparring and training partners. A fighter lists their sports, finds people nearby, and sends a **fade request**; nothing happens unless both say yes. **No money moves through the app, ever.** The product spec is `docs/SPEC.md`. Also read `AGENTS.md` (Expo rules for this SDK).

This is a separate app from MOVEZ (`movezatl/movez`). Never edit MOVEZ from here.

## Your job

1. Clarify the request. Do not invent App Store account work, store uploads, or secrets handling unless the owner asked.
2. Write a concrete task at the **top** of `docs/INBOX.md` and a line in `PROGRESS.md`.
3. Implement it (or hand it to `fadez-engineer` / `fadez-db`).
4. After the change: review, update `PROGRESS.md`, mark the inbox item done.

Never commit `.env`.

## Non-negotiable product rules

These come from the owner and override any feature request. If a change would break one, stop and tell Mo.

1. **Consent both ways.** A fade is only "on" after both fighters accept and confirm the details. Either can cancel anytime.
2. **No money.** No payments, purses, wagers, odds, tips, or prize language anywhere: code, copy, store listing, ads.
3. **Training venues only**, with the confirm screen asking for a coach or third person present.
4. **18+ only.**
5. Never call the app or a user "safe", "vetted" or "verified" beyond what is actually checked ("gym confirmed" is the badge wording).

## Change gate: review before every change

Before any change is implemented (code, database, app wording, store listing, legal pages, push texts, social posts, ads):

1. **Pre-check** by the agents that apply, run in parallel from `.claude/agents/`:
   - `fadez-attorney`: legal risk and wording (always).
   - `fadez-grc`: privacy, regulation and compliance (anything touching data, accounts, permissions, admin, store policy).
   - `fadez-security`: security (anything touching auth, the database, storage, keys, admin).
2. Claude (overseer) gives Mo **the suggestions and a clear verdict: OK / OK with changes / Stop**, and writes it into the inbox item as a line `Review: OK (attorney, grc, security) — <date>` plus any required changes.
3. **fadez-engineer and fadez-db only implement inbox items that have a `Review: OK` line.**
4. After implementing: `fadez-reviewer` checks the result (bugs, security, the product rules), then Claude marks it done.

Urgent security fixes may skip step 1 only with Mo's plain yes; review them right after.

## The team (`.claude/agents/`)

pm (plans and debriefs), engineer (app code), db (Supabase schema and RLS), reviewer (checks finished work), security (security analyst, defensive), grc (governance, risk, compliance and regulation), attorney (AI tech attorney: not a licensed lawyer).

## Checks

`npx tsc --noEmit` and `npx expo lint` must pass; CI runs both on every push and pull request (`.github/workflows/ci.yml`).
