# Fivefold — ranked edition

Static website (no server code) on **Vercel** + **Supabase** for accounts, ranks, the leaderboard and live online tables.

```
public/              ← the website Vercel serves
  index.html
  css/styles.css
  js/config.js       ← Supabase URL, anon key, rank thresholds
  js/engine.js       ← game rules (sequence detection lives here)
  js/app.js          ← screens, accounts, online play
  js/supabase.js     ← supabase-js 2.117.2
  icons/, manifest.webmanifest   ← "Add to Home Screen" on iPhone/Android
supabase-setup.sql   ← run once in Supabase (not served to players)
vercel.json          ← tells Vercel to serve /public, cache settings
```

## 1. Set up Supabase (once, ~2 minutes)

1. Supabase → your **Sequence** project → **SQL Editor** → New query → paste all of `supabase-setup.sql` → **Run**.
   It's safe to run again later.
2. **Authentication → Sign In / Providers → Email**: turn **off "Confirm email"** and save.
   Players sign in with a username; there is no real inbox behind it, so a confirmation email could never arrive.
3. Make sure **"Allow new users to sign up"** is on (it is by default).

That's it. The URL and anon (public) key are already in `public/js/config.js`.

## 2. Deploy to Vercel

Upload this folder as a new project (or replace the files in your existing repo). Framework preset: **Other**, no build command. `vercel.json` already points Vercel at `public/`.

## How ranking works

- Ranked = **online games between accounts** that reach at least 10 moves. Computer and same-device games are not ranked.
- Every player's browser reports the result when a game ends; the database counts each game exactly once.
- Players can edit their name, motto, crest and colour, but **cannot** change their own wins (enforced in the database).
- Ranks by ranked wins (edit `ranks` in `js/config.js` to change thresholds; no database change needed):

| Rank | Wins |
|---|---|
| Bastard | 0 |
| Civilian | 3 |
| Knight | 10 |
| Hand of the King | 25 |
| King | 50 |

## Sequence rules (the fix)

After every chip, the whole board is re-read for that team:
- Sequences that **cross** (different directions) may share any chips.
- Two sequences on the **same line** may share one chip, so 9–10 in a row counts as **two**, whatever order you filled it in. Earlier sequences on that line are re-packed if needed; locked chips stay locked.
- Games already in progress pick up any missed sequences on the team's next chip.

## Admin notes

- **Forgot password:** in SQL Editor run
  `update auth.users set encrypted_password = crypt('NEW_PASSWORD', gen_salt('bf')) where email = 'USERNAME@players.fivefold.app';`
- **Delete a player:** Authentication → Users → delete (their profile is removed with them).
- **Reset all ranks:** `update public.profiles set wins = 0, games = 0; truncate public.game_results;`
- Never put the **service_role** key in the website. It isn't used anywhere in this project.
- Results are trusted from players' browsers. That's fine for a friends group; someone tampering with dev tools could fake a win.
