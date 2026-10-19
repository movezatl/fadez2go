# Fadez2Go v1 spec

Status: draft for Mo's review, Oct 19 2026. Security and legal/compliance reviews are running in parallel; their requirements get folded in here before any code ships.

## What it is

Fadez2Go helps combat-sports athletes find training partners. A fighter lists the sports they train or want to spar in, finds people nearby at a similar level and weight, and sends a **fade request** (an invite to spar). Nothing happens unless both people say yes.

It is for sparring, training rounds, practice for a bigger fight, or hobby rolling. It is **not** a fight-booking, betting or street-fight app.

## Ground rules (built into the product, not just the Terms)

1. **Consent both ways, every time.** A fade needs an explicit accept from the other fighter, and both must confirm the details (sport, rules, intensity, place, time) before it is "on". Either one can cancel at any time without a reason, with no penalty.
2. **No money, ever.** No payments, purses, tips, wagers, odds, or prize talk. Nothing in the app takes or moves money. Chat filters flag words like "bet", "$", "cash app", "purse" and the report menu has a "money or betting" reason. This also keeps the app clear of gambling law and of state athletic-commission rules for paid or unsanctioned bouts.
3. **Training venues only.** A fade's place must be a gym, academy or training facility from the venue list (fighters can suggest new ones; Mo approves). No parks, parking lots or homes. Default rule: sparring needs a coach, ref or third person present; the confirm screen asks both fighters to agree to that.
4. **18+ only.** Birthday gate at sign-up, same as MOVEZ.
5. **Protective gear and rules agreed up front.** Every fade states rule set and intensity (technical / medium / hard) and required gear (gloves size, headgear, mouthguard, shin guards).
6. **Assumption of risk.** Both fighters accept a short safety and risk acknowledgment on each fade. Wording comes from the legal review and a real attorney.

## Users and profiles

- Display name, photo, age range (not birthday), city/area (approximate).
- **Sports:** pick from a list (Boxing, Muay Thai, Kickboxing, BJJ gi, BJJ no-gi, Wrestling, MMA, Judo, Karate, Taekwondo, Sambo, Kung Fu/Sanda, other). For each: experience level (new, 1-3 yrs, 3+ yrs, amateur competitor, pro), and whether "I train this" or "I want to try this".
- **Weight class:** self-reported weight range; matching shows people within a set range.
- **Home gym** (optional), stance, goals (technique, conditioning, fight prep, hobby).
- **Open to fades** toggle: off hides you from search.
- **Gym verified badge:** manual for v1. Fighter uploads proof (membership card or a coach's note); Mo approves in an admin screen. Badge wording says "gym confirmed", never "safe" or "vetted".

## Core flows (v1)

1. **Sign up:** email + password, 18+ gate, accept Terms, Privacy, Community Rules. Pick sports, level, weight, area.
2. **Find:** list of fighters near you (approximate distance, never exact location), filter by sport, level, weight range, gym-confirmed, goal. Tap a fighter to open their profile.
3. **Friends:** "Add friend" on any profile sends a friend request; the other fighter gets a notification and can accept or decline. Friends show in a Friends list and get a shortcut to message or send a fade. Either can unfriend anytime, silently.
4. **Messaging:** 1:1 chat with any fighter you are friends with, or who is part of a fade request with you. A fighter can turn on "friends only" so strangers can't message them first. Photos allowed; links and money words flagged. Read receipts and a typing indicator, as in MOVEZ.
5. **Send a fade request:** from a profile, a friend, or a chat, tap "Send fade". Fill in: sport, rule set, intensity (technical / medium / hard), rounds and round length, required gear, proposed gym, two or three time options, and a short note. Limit open requests per day to stop spam.
6. **Receive it:** the other fighter gets a push notification ("Jay sent you a fade request: Muay Thai, technical, Sat") and an item in a Notifications tab with an unread badge. Tapping it opens the **fade request details screen**: sender's profile summary (sports, level, weight, gym-confirmed badge), everything in step 5, and the buttons Accept, Decline, Suggest changes, and Message.
7. **Respond:** Accept, Decline, or Suggest changes (edit time, place, intensity; it goes back to the sender as a counter-offer). Declines are private (sender just sees "not available"). Every response notifies the other side.
8. **Confirm:** both see the final card (who, what, where, when, gear, rules, third person present) and tap confirm plus the risk acknowledgment. Fade becomes "on" and both get a reminder notification before it starts. The gym address is shown only once it is on.
9. **After:** both are asked "did it happen?" and can leave a private respect rating (good partner / no-show / unsafe). "Unsafe" opens a report. Ratings are not public scores in v1.
10. **Safety everywhere:** block (hides both people from each other everywhere, ends friendship, chats and open fades), report (reasons include harassment, money or betting, unsafe behavior, underage, fake profile), and a safety tips page linked from the confirm screen.
11. **Notifications:** friend requests, new messages, fade requests, responses, confirmations and reminders. Each type can be muted in Settings.
12. **Account deletion** in Settings (Apple requires it).

## Main tabs

Find, Fades (incoming, sent, upcoming, past), Messages, Notifications, Profile (with Settings and Friends).

## Admin (Mo)

Approve gym-verified badges and new venues, review reports, ban users. Same pattern as MOVEZ admin.

## Out of v1

Payments of any kind (permanently out), public leaderboards or win/loss records, video, events/tournaments, Android build (code works on Android, but the store launch is iPhone first).

## Tech

- Expo (React Native, TypeScript, expo-router), the same stack as MOVEZ, so tooling and lessons carry over.
- Supabase: Postgres with row-level security on every table, Auth, Storage (photos, verification proof in a private bucket), approximate location (rounded coordinates).
- iPhone builds through EAS; TestFlight first, then App Store.

## Open questions for Mo

1. Launch city: Atlanta first (like MOVEZ), or open everywhere?
2. Third person present at every fade: required (current default) or just recommended?
3. Name check: "fade" is slang for a fight. Apple reviews apps that could encourage violence closely, so the store listing will say "sparring partners". OK?
