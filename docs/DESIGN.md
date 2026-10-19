# Fadez2Go UX spec v1

Mockups (clickable, 10 screens + design system): https://claude.ai/artifact/GBkQJrVkfLpW2F3UNNMnix
Tokens: [theme.ts](theme.ts). Copy it to `src/theme.ts` and use only these values.

## Look in one line
Fight-night poster: near-black ground, bone-white text, one hot orange ("Fade") for actions, blue ring for gym-verified fighters. Display type is Anton in uppercase; everything else is Archivo. Cards are flat surfaces with a 1 px border and no shadows. Dark mode only in v1.

## Principles that shape the UI
1. **Consent is the product.** Nothing is scheduled until the receiver taps Accept. Either side can call it off at any time.
2. **No money, ever.** No price, purse, bet or tip field anywhere. Notes are free text, but the Fighter Code forbids money and report reasons include "money or betting".
3. **Safe by default.** Show distance rounded to 0.1 mi, never an address or map pin of a person. Meeting places are gyms.
4. **Declines stay quiet.** The sender sees "Not this time", never "Declined". No notification is sent for a decline.

## Navigation
Bottom tabs (expo-router `(tabs)` group): **Discover**, **Fadez** (inbox, badge = pending received), **Chats**, **Me** (own profile, settings, gym verification).
Modal/stack routes: `fighter/[id]`, `fade/new?to=[id]` (sheet), `fade/[id]`, `fade/[id]/matched`, `chat/[id]`, `verify-gym`, onboarding stack `welcome` → `setup` (3 steps).

## Flows

**A. Onboarding** (screens 1–2)
Welcome → Fighter Code (4 rules) → 18+ and Code checkbox (CTA disabled until checked) → sign up (Apple / email via Supabase Auth) → Setup step 1 name, photo, pronouns optional → step 2 sports trained, skill, weight class, looking for → step 3 location permission (explain: "only approximate distance is shown") → Discover. Prompt gym verification as a dismissible card on Discover, not a blocker.

**B. Find and fade** (3 → 4 → 5)
Discover list sorted by distance, filtered by sport chip and ±1 weight class by default (filter sheet: distance 5/15/30/50 mi, skill, weight range, verified only). Tap card → Fighter profile → Send fade (sheet):
- Sport: only the sports the receiver is "open to fade in" (required)
- Session: Technical / Hard sparring / Drilling / Hobby rounds (required)
- Intensity: Light / Medium / Hard (required)
- When: date + time, must be in the future (required)
- Where: gym picker, default receiver's gym, else sender's (required)
- Note: optional, 280 chars
Send → toast "Fade sent to Dani" → back to profile with button now "Fade pending". One pending fade per pair at a time; the button is disabled with that label if one exists.

**C. Receive and answer** (6 → 7 → 8 → 9)
Push notification "Marcus Reyes faded you · Boxing, Sun 9 AM" → deep link to Fade details. Also listed in Fadez › Received with a NEW pill and orange border until opened.
Fade details shows sender card (taps to profile), the 5 session fields, the note, a pending pill with time left (fades expire 48 h after sending, or at the session start, whichever comes first).
Actions: **Accept fade** (primary), **Decline** (secondary, confirm sheet "Decline this fade? Marcus will see 'Not this time'."), **Message Marcus first** (opens chat; allowed between any two users unless blocked).
Accept → Matched screen ("Locked in", both avatars, session summary, safety checklist, Open chat, Add to calendar via expo-calendar). Sender gets push "Dani locked in your fade".

**D. Friends**
Add friend icon on profile → request; receiver sees it in Fadez › Received with Accept. Friends appear first in Chats and get a "Friends" filter on Discover. Not required to fade.

**E. Chat** (9)
1:1 threads, Supabase Realtime. Header shows the fade status line when a fade exists. System message pill when a fade is accepted. Overflow menu: View profile, Block, Report.

**F. Gym verification** (10)
Pick gym (search Supabase `gyms` table; "Add my gym" if missing) → choose proof: membership card photo, coach confirms by email link, or photo at the gym → Submit → status "In review" on Me. Admin approves manually. On approval: blue avatar ring + "Verified at {gym}" badge everywhere.

**G. Safety**
Block and report available from profile and chat overflow. Report reasons: harassment, unsafe behavior, money or betting, fake profile, underage, other. Blocking hides both users from each other everywhere and cancels pending fades.

## Fade state machine
`pending` → `accepted` (receiver) | `declined` (receiver) | `cancelled` (sender, before accept) | `expired` (system)
`accepted` → `cancelled` (either side, shows "Called off") | `completed` (system, after session time)
Labels and colors are in `fadeStatus` in theme.ts.

## Components to build (src/components)
- `Button` variants: primary (accent bg, onAccent bold text), secondary (surfaceRaised + border), ghost (underlined text), danger (danger outline). Height 52, radius 12, full width by default. Pressed: accentPressed / opacity 0.8.
- `Chip` selectable pill, height 36–40. Selected: accentSoft bg + accent border + text. Unselected: surfaceRaised + border + textSecondary.
- `Segmented` track surface + border, radius 12, padding 4; selected segment inverted (segmentSelectedBg).
- `Badge` (Verified: verifiedSoft/verified with check icon; Skill and Weight: surfaceRaised + border) radius 6, height 24.
- `StatusPill` from `fadeStatus`, radius pill, height 24.
- `Avatar` with initials fallback in Anton; ring = verified color when verified, else border.
- `FighterCard` avatar 56, name headline, sports line, meta line (skill · weight · gym), distance right aligned.
- `FadeCard` for inbox rows; NEW state uses accent border.
- `DetailList` rows of label (textSecondary) / value (semibold) separated by border lines inside a surface card.
- `TextField` height 48, bg `bg`, border, radius 12, label as overline above.
- `Sheet` (bottom sheet with grabber, radius 20 top) for Send fade, filters, confirms.
- `TabBar` icons: compass, bolt, chat bubble, person. Active = accent, inactive = textMuted. Use lucide-react-native (`Compass`, `Zap`, `MessageSquare`, `User`, `BadgeCheck`, `MapPin`, `Bell`, `ShieldCheck`).
- `StickyActions` bottom bar on profile and fade details: bg + top border, padding 14/20/34.

## Copy rules
Short and direct, gym voice. Use "fade" as noun and verb ("Send fade", "Marcus faded you"). Never "fight for money", "bet", "challenge accepted for $". Empty states: Discover "No fighters in range yet. Widen your distance or invite your gym." Fadez "No fadez yet. Find someone on Discover."
