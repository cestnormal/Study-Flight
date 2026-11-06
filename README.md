# ✈️ Study Flight

A focus timer disguised as a trip. Pick a destination, and the travel time becomes your study time. Stay focused until you land to earn a passport stamp.

It works fully in the browser with no account. An optional account backs up and syncs your passport.

## How it works

1. **Check-in:** choose a transport mode and route, say what you're studying, and press **Board now**.
2. **Journey:** a countdown runs while a globe and map track your progress.
3. **Land:** when the timer ends, a chime plays and you earn a stamp for that country. A friend you added there is "waiting at arrivals".
4. **Passport:** see your countries, trip count and total study time.

## Features

- **Five trip types:** Flight, Train, Bus, Short hop and Custom. Preset routes run from a 25 minute bike ride to a 21 hour flight to Sydney. Custom lets you enter your own minutes and any country.
- **Live journey view:** countdown, ETA, map, draggable globe and time left in the tab title.
- **Pause with a penalty:** pausing adds the paused time plus 5 minutes to your trip and marks it "Delayed". Cancelling earns no stamp.
- **Friends abroad:** one friend per country to greet you.
- **Crew announcements** that tease you about delays.
- **Light and dark mode**.

## Files

- `index.html`: page structure
- `style.css`: styling and theme colors
- `script.js`: routes, timer, globe, passport and storage
- `api/`: optional backend (Vercel functions + Supabase)

## Running it

Keep the files in one folder and open `index.html`. Accounts only work once deployed. The font loads from Google Fonts; offline, a system font is used.

## Your data

Everything is saved in your browser's `localStorage` (`sj1` for the passport, `sj_trip` for the trip in progress). With an optional account it is also backed up and synced, and stamps only ever grow. Backend setup needs `schema.sql` plus `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` and `JWT_SECRET` in Vercel.

## Customizing

- **Routes:** edit the `R` array at the top of `script.js`.
- **Pause penalty:** change `PEN` in `script.js` (default 5 minutes).
- **Colors:** edit the CSS variables at the top of `style.css`.
