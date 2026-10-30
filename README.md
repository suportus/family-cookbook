# Družinska kuharica

A personal recipe book on the Internet Computer (Slovenian UI, phone first,
dark/light theme), with air fryer settings for each recipe.

- Backend: Motoko canister (`src/backend/main.mo`), access limited to an allow-list.
- Frontend: React + Vite (`src/frontend`), sign-in with Internet Identity.

Live app: https://vniz5-yaaaa-aaaae-ahdxq-cai.icp.net/

Always open it from this exact address (also on the phone home screen):
Internet Identity gives a different principal on each domain, so another
address (e.g. `…icp0.io`) would show "Dostop zavrnjen".

Share links work on every address (see below): visitors don't sign in, so
the domain doesn't matter for them.

## How recipes are stored

Each recipe has a few fixed fields: `id` (a counter, never reused), `title`,
`createdAt`, `updatedAt` and `bodyVersion`. Everything else (tags,
ingredients, steps, air fryer settings) is a JSON text in `body`, written and
read by the frontend (`src/frontend/src/lib/recipe.ts`).

New recipe fields (servings, source, notes, ...) therefore go into the JSON
body and need no backend data migration. Bump `BODY_VERSION` only if an
existing field changes meaning, and teach `bodyFromObject` to read the old
form. The backend only checks the title and the size.

The backend has only targeted operations (add, update one, delete one, import
that only adds). Nothing replaces the whole list.

Body version 2 (steps with headings): `steps` is a list of rows
`{ "kind": "step" | "section", "text": "..." }`, like `ingredients`. Version 1
bodies stored steps as plain texts; they are still read, as normal steps.
Numbering starts again at 1 after each heading.

When steps are pasted (the "Prilepi seznam" box or "Uvozi recepte"), a line
becomes a heading if it starts with `##` or ends with `:`, unless it is
numbered (`1.`, `2)`) or bulleted (`-`, `•`). The paste box shows a preview
first; each step row in the form has a "Naslov" toggle to fix a row.

## Read-only share links

"Deli" on a recipe → "Deli povezavo (samo branje)" creates a link that anyone
can open without signing in. Links are managed under profile menu →
"Skupne povezave".

- Link format: `<address the app is open on>/#/s/<token>`. The token is 128
  bits of secure randomness from the management canister. It sits after `#`,
  so browsers never send it to a server or in a Referer header.
- The link always shows the current version of the recipe. Revoking it, or
  deleting the recipe, makes it stop working at once ("Ta povezava ne
  deluje."). At most 200 active links.
- Visitors see only that recipe: title, tags, ingredients, steps and air
  fryer settings. No dates, IDs, principals or other recipes.
- Backend: `createShare`, `revokeShare`, `listShares`, `revokeAllShares`
  (allow-list only) and `getSharedRecipe(token)`, the only function anonymous
  callers may use. It returns the recipe's JSON body as stored, so **if a
  private field is ever added to the body, filter it out in
  `getSharedRecipe`**.
- Share records are `token → { target = #recipe id; createdAt }`. More
  target kinds (a tag, a collection) can be added later as new variant cases
  without a data migration.
- Link previews in WhatsApp/Telegram are generic ("Družinska kuharica" and a
  short description), not the recipe's name: the app is a single page that
  fills in the recipe after it opens, and preview bots don't run it.
- Pages are marked `noindex, nofollow` (no search engines) and
  `no-referrer`.

Deploying, users, backups and cycles: see [UPDATING.md](UPDATING.md).
