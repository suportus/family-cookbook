# Družinska kuharica

A personal recipe book on the Internet Computer (Slovenian UI, phone first,
dark/light theme), with air fryer settings for each recipe.

- Backend: Motoko canister (`src/backend/main.mo`), access limited to an allow-list.
- Frontend: React + Vite (`src/frontend`), sign-in with Internet Identity.

Live app: https://vniz5-yaaaa-aaaae-ahdxq-cai.icp.net/

Always open it from this exact address (also on the phone home screen):
Internet Identity gives a different principal on each domain, so another
address (e.g. `…icp0.io`) would show "Dostop zavrnjen".

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

Deploying, users, backups and cycles: see [UPDATING.md](UPDATING.md).
