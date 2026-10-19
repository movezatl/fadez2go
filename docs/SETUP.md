# Setting up Fadez2Go

What it takes to go from this repo to the app running on your iPhone. Steps marked **Mo** need your accounts.

## 1. Supabase project (Mo, about 10 minutes)

1. Create a project at https://supabase.com/dashboard (name it `fadez2go`). Use a separate project later for production (SEC-S2).
2. **SQL editor**: paste and run `supabase/migrations/0001_core.sql`.
3. **Authentication › Providers**: turn on **Email** (one-time code, no password) and **Apple**. For Apple, add the bundle ids `com.fadez2go.app` and `host.exp.Exponent` (Expo Go) as client ids.
4. **Authentication › Email templates › Magic link**: make sure it shows `{{ .Token }}` so users get a 6-digit code.
5. **Authentication › Rate limits**: keep the defaults on, and turn on CAPTCHA protection (SEC-AU3).
6. **Settings › API**: copy the project URL and the anon (publishable) key into `.env` (copy `.env.example`). Never put the service role key in the app.
7. Add yourself as an admin (SQL editor): `insert into admin_users (user_id) select id from auth.users where email = 'YOUR EMAIL';` and turn on MFA for that account.
8. Add a few gyms so fades can be sent: `insert into venues (name, address, city, approved) values ('Gym name', 'Street, City, State', 'City', true);`

## 2. Push notifications

1. Deploy the function: `npx supabase functions deploy push --project-ref <ref>`.
2. Set its secret: `npx supabase secrets set PUSH_WEBHOOK_SECRET=<long random string> --project-ref <ref>`.
3. **Database › Webhooks › Create**: table `notifications`, event `Insert`, type `Supabase Edge Function` → `push`, add header `x-webhook-secret` with the same string.
4. Push needs an EAS project id: `npx eas-cli init` once (Expo account `movezatl`).

## 3. Run it on your iPhone

1. Install **Expo Go** from the App Store.
2. On the Mac: `npm install`, then `npx expo start`.
3. Scan the QR code with the iPhone camera.

## 4. TestFlight and the App Store (Mo)

Needs an Apple Developer account ($99/year) in your name or your company's. Then `npx eas-cli build --platform ios --profile production` and `npx eas-cli submit --platform ios`. Before submitting: a licensed attorney has reviewed the Terms, Privacy Policy and Waiver (set `LEGAL_DRAFT = false` in `src/lib/legal.ts`), the App Privacy label matches the Privacy Policy, age rating 18+, US only.

## Tests

- `npm test`: unit tests.
- `npm run test:db`: migrations plus the row-level security tests on a local Postgres (`PGHOST`, `PGUSER` set). CI runs both on every push.
