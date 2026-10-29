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

Mainnet canister IDs are stored in `.icp/data/mappings/ic.ids.json`. Keep this
file in git.

## Users (allow-list)

Only principals on the allow-list can use the app. A new user signs in and
sees "Dostop zavrnjen" with their principal. Use `-e ic` for mainnet, or `-e local` for the local test
network.

```bash
# Add a user
icp canister call backend addUser '(principal "PRINCIPAL")' -e ic

# Remove a user
icp canister call backend removeUser '(principal "PRINCIPAL")' -e ic

# List users
icp canister call backend listUsers '()' -e ic
```

These calls only work for a controller of the backend canister.

## Backups

Profile menu → **Varnostna kopija**:

- **Prenesi varnostno kopijo** downloads every recipe as one JSON file
  (`kuharica-YYYY-MM-DD.json`).
- **Izberi datoteko** imports such a file. Import only adds recipes (with new
  IDs); it never deletes or overwrites. For a title that already exists you
  choose "Preskoči" or "Dodaj kot kopijo".

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
