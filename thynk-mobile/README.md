# Thynk Success — Mobile App (Android first)

Same login and same data as the Thynk CMS website.

| Who signs in | What they can do |
|---|---|
| **Admin** | Pick a client → create/edit/delete periods, campaign entries (email/WhatsApp/calls), leads (incl. Institute Name), revenue & licences; change lead status; add notes |
| **Client user** | See **only their own client's** leads and periods; change a lead's status; add notes. Cannot change revenue/volume/etc. |

Client isolation is enforced by the database (Supabase row-level rules) and the website API — not just by the app screens.

## One-time setup (no coding tools needed on your computer)

1. **Website changes first** (needed for status/notes from the app)
   - In the GitHub repo, add `thynk-cms/src/lib/supabase/route-auth.ts` and replace the two files under
     `thynk-cms/src/app/api/portal/leads/[id]/` (`status/route.ts`, `notes/route.ts`) with the versions supplied.
   - Also run `schema_v5.sql` in Supabase (Institute Name column) and replace the data-panel page.
   - Vercel redeploys automatically.
2. **Put the app in your GitHub repo** as a folder `thynk-mobile/` (upload this folder's contents via GitHub "Add file → Upload files").
3. **Fill in `src/config.ts`** (edit on GitHub): Supabase Project URL, Supabase **anon** key (the same two values used on Vercel as `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`), and your live website address. Never use the service-role key here.
4. **Build the Android app from the browser**
   - Create a free account at expo.dev → *Create project* → connect your GitHub repo, set the **Base directory** to `thynk-mobile`.
   - Open the project → *Builds* → *Create build* → Platform **Android**, profile **preview** (this produces an `.apk`).
   - When it finishes (~15 min) open the build page on your phone and install the APK (allow "install from unknown sources").
5. For Play Store later: use profile **production** (an `.aab`) and a Google Play developer account (one-time US$25).

## Run locally (for a developer)
```
npm install
npx expo start
```
