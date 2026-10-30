# Updating and running Družinska kuharica

All commands run in a terminal in the project folder, with the icp identity
that controls the canisters (`clockup-admin`). Check it with:

```bash
icp identity default        # should print clockup-admin
```

## Test locally

```bash
icp network start -d        # start a local test network (in the background)
icp deploy                  # build and deploy backend + frontend locally
```

Open the frontend URL that `icp deploy` prints (e.g.
`http://frontend.local.localhost:8000`). The local network has its own
Internet Identity, so your local principal differs from the mainnet one. Add
it with `addUser` and `-e local` (see below).

Stop the network when done:

```bash
icp network stop
```

## Change the backend

After changing `src/backend/main.mo`:

```bash
mops check --fix            # type check (and, once deployed, upgrade-safety check)
mops build
pnpm bindgen                # regenerate the frontend bindings
```

## Deploy an update to mainnet

```bash
icp deploy -e ic
mops deployed backend       # save the deployed backend's stable types (upgrade-safety baseline)
```

After the very first mainnet deploy, also make the backend a controller of the
frontend, so the app can show the frontend's cycle balance (see Cycles below).

Commit the changed `deployed/backend.most` together with the code.
`mops check` compares the code against this file, so an update that would lose
data fails before it is deployed. Never use `--mode reinstall` on mainnet: it
deletes all data.

`icp deploy` also compares the backend's interface with the deployed one. If
it reports a "BREAKING change", read which method it names: if only the
terminal uses that method (like `listUsers` when roles were added), repeat
with `--yes`; if the app uses it, fix the code instead.

Mainnet canister IDs are stored in `.icp/data/mappings/ic.ids.json`. Keep this
file in git.

## Users (allow-list)

Only principals on the allow-list can use the app. Each one is an owner or a
contributor (see "Authors and roles" in the README). Use `-e ic` for mainnet,
or `-e local` for the local test network. These calls only work for a
controller of the backend canister (`clockup-admin`); they can't be done from
the app.

### What a new person sees

1. They open https://vniz5-yaaaa-aaaae-ahdxq-cai.icp.net/ (exactly this
   address) and sign in with Internet Identity.
2. They see **"Dostop zavrnjen"** with their principal and a copy button, and
   send you the principal.
3. After you add them (below) they reload the page and see all recipes. They
   can add their own, and edit, delete and share only those.

### Commands

```bash
# Add a person (as a contributor). Adding someone already on the list keeps their role.
icp canister call backend addUser '(principal "PRINCIPAL")' -e ic

# Set the name shown on their recipes (an empty name "" removes it)
icp canister call backend setUserName '(principal "PRINCIPAL", "Teta Mojca")' -e ic

# Make someone an owner (true) or a contributor again (false)
icp canister call backend setOwner '(principal "PRINCIPAL", true)' -e ic

# List users with names and roles
icp canister call backend listUsers '()' -e ic

# Remove a person (their recipes stay; owners can still edit them)
icp canister call backend removeUser '(principal "PRINCIPAL")' -e ic
```

`setUserName` and `setOwner` need the person to be on the list already
(`addUser` first).

### Recipes without an author

Recipes from before authors existed (version with share links) have no
author until a controller assigns them; until then only owners can change
them. Check and assign (running it again changes nothing):

```bash
icp canister call backend countUnassignedRecipes '()' -e ic
icp canister call backend assignUnassignedRecipes '(principal "OWNER_PRINCIPAL")' -e ic
```

## Share links

Read-only links are managed in the app (recipe → "Deli", profile menu →
"Skupne povezave"). Owners manage every link, contributors only the links of
their own recipes. From the terminal (any allow-listed identity):

```bash
icp canister call backend listShares '()' -e ic         # active links
icp canister call backend revokeShare '(5)' -e ic       # stop the link of recipe 5
icp canister call backend revokeAllShares '()' -e ic    # stop every link
```

A link opens as `https://vniz5-yaaaa-aaaae-ahdxq-cai.icp.net/#/s/TOKEN`.
Check what a visitor sees, without signing in:

```bash
icp canister call backend getSharedRecipe '("TOKEN")' --identity anonymous -e ic
```

`(null)` means the link doesn't work (unknown, revoked or recipe deleted).

## Backups

Profile menu → **Varnostna kopija**:

- **Prenesi varnostno kopijo** downloads the recipes as one JSON file
  (`kuharica-YYYY-MM-DD.json`). An owner's file has every recipe with its
  author (`author` principal and `authorName`); a contributor's file has only
  their own recipes, without authors.
- The file format is 2 since step headings (steps are `{kind, text}` rows).
  Older files (format 1) still import; their steps become normal steps.
- **Izberi datoteko** imports such a file. Import only adds recipes (with new
  IDs); it never deletes or overwrites. For a title that already exists you
  choose "Preskoči" or "Dodaj kot kopijo".
- Authors on import: an owner restoring an owner's file keeps the authors. A
  contributor's import, and any file without authors (older backups), makes
  the importer the author.

Make a backup before a bigger backend change.

## Cycles

The app's profile menu → **Cycles** shows the Backend and Frontend balances
(with a warning below 1 T), both canister IDs, and how to top up from OISY.

The frontend balance is read by the backend, which only works when the backend
is a controller of the frontend. Otherwise the app shows "Ni na voljo". Set it
once after the first deploy, and again if the frontend canister is ever
recreated (use the backend's canister ID; `-e local` for the local network):

```bash
icp canister settings update frontend --add-controller BACKEND_CANISTER_ID -e ic
```

To check the balances from the terminal:

```bash
icp canister status frontend -e ic     # balance of the frontend
icp canister status backend -e ic      # balance of the backend
```

To top up:

- **From OISY** (https://oisy.com/): open the TCYCLES token, choose **Top up**
  (not Send), paste the canister ID and confirm.
- **From the terminal:**

  ```bash
  icp cycles balance -n ic               # cycles held by your identity
  icp canister top-up backend --amount 1t -e ic
  icp canister top-up frontend --amount 1t -e ic
  ```

Don't use `icp cycles transfer` (or Send in OISY) to fund a canister: those
cycles don't reach the canister's balance.
