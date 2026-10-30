import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Char "mo:core/Char";
import Principal "mo:core/Principal";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Runtime "mo:core/Runtime";
import Cycles "mo:core/Cycles";
import Random "mo:core/Random";
import IC "ic:aaaaa-aa";

actor Kuharica {
  // Only principals in this list may read or write data.
  // The list is managed by a canister controller (your icp identity).
  // The value says whether the user is an owner (true) or a contributor
  // (false). Before roles existed every value was true, so everyone who was
  // allowed then is an owner. Don't rename this field: its data would be lost.
  let allowedUsers = Map.empty<Principal, Bool>();

  // Display names, set by a controller. Kept when a user is removed, so their
  // recipes still show the name.
  let userNames = Map.empty<Principal, Text>();

  // Limits for contributors (owners have only the general limits below).
  // Transient: not stored, so a new value here applies after the next upgrade.
  transient let MAX_CONTRIBUTOR_BODY_CHARS = 20_000;
  transient let MAX_CONTRIBUTOR_RECIPES = 300;
  transient let MAX_CONTRIBUTOR_SHARES = 50;
  transient let MAX_NAME_CHARS = 50;
  // Shown for an author without a name; never the principal.
  transient let FALLBACK_NAME = "Član družine";

  // ---------- Access control ----------

  func requireUser(caller : Principal) {
    if (caller.isAnonymous()) {
      Runtime.trap("Anonymous access is not allowed");
    };
    if (not allowedUsers.containsKey(caller)) {
      Runtime.trap("Access denied");
    };
  };

  func requireController(caller : Principal) {
    if (not caller.isController()) {
      Runtime.trap("Only a canister controller can do this");
    };
  };

  func isOwner(user : Principal) : Bool {
    allowedUsers.get(user) == ?true;
  };

  func requireListed(user : Principal) {
    if (not allowedUsers.containsKey(user)) {
      Runtime.trap("This principal is not on the allow-list. Add it with addUser first.");
    };
  };

  // Adds a contributor. A user who is already on the list keeps their role.
  public shared ({ caller }) func addUser(user : Principal) : async () {
    requireController(caller);
    if (not allowedUsers.containsKey(user)) {
      allowedUsers.add(user, false);
    };
  };

  // The user's recipes stay (owners can still edit them), and so does the name.
  public shared ({ caller }) func removeUser(user : Principal) : async () {
    requireController(caller);
    allowedUsers.remove(user);
  };

  public shared ({ caller }) func setOwner(user : Principal, owner : Bool) : async () {
    requireController(caller);
    requireListed(user);
    allowedUsers.add(user, owner);
  };

  // An empty name removes the name.
  public shared ({ caller }) func setUserName(user : Principal, name : Text) : async () {
    requireController(caller);
    requireListed(user);
    let trimmed = name.trim(#predicate(func c = c.isWhitespace()));
    if (trimmed.size() > MAX_NAME_CHARS) {
      Runtime.trap("The name is too long.");
    };
    if (trimmed.size() == 0) {
      userNames.remove(user);
    } else {
      userNames.add(user, trimmed);
    };
  };

  public type Role = { #owner; #contributor };

  public type UserInfo = {
    user : Principal;
    name : ?Text;
    role : Role;
  };

  public shared ({ caller }) func listUsers() : async [UserInfo] {
    requireController(caller);
    allowedUsers.entries().map(
      func((user, owner) : (Principal, Bool)) : UserInfo = {
        user;
        name = userNames.get(user);
        role = if owner #owner else #contributor;
      }
    ).toArray();
  };

  // The signed-in user's own role and name, for the app.
  public shared query ({ caller }) func getMe() : async { isOwner : Bool; name : ?Text } {
    requireUser(caller);
    { isOwner = isOwner(caller); name = userNames.get(caller) };
  };

  // Cycle balance of this (backend) canister, shown in the Cycles dialog.
  public shared query ({ caller }) func getCycleBalance() : async Nat {
    requireUser(caller);
    Cycles.balance();
  };

  // Cycle balance of the frontend canister. Only a controller may read a
  // canister's status, so this works once the backend is a controller of the
  // frontend; otherwise it returns null.
  public shared ({ caller }) func getFrontendCycleBalance() : async ?Nat {
    requireUser(caller);
    switch (Runtime.envVar<system>("PUBLIC_CANISTER_ID:frontend")) {
      case (?id) {
        try {
          let status = await IC.canister_status({
            canister_id = Principal.fromText(id);
          });
          ?status.cycles;
        } catch (_) { null };
      };
      case (null) { null };
    };
  };

  // ---------- Recipes ----------

  // Only the title is a typed field. Everything else (ingredients, steps,
  // tags, air fryer settings, ...) lives in `body`, a JSON text written and
  // read by the frontend. `bodyVersion` says which JSON format the body uses.
  // New recipe fields therefore never change this stored type, so they need
  // no data migration.
  public type Recipe = {
    id : Nat;
    title : Text;
    body : Text;
    bodyVersion : Nat;
    createdAt : Int;
    updatedAt : Int;
  };

  public type RecipeInput = {
    title : Text;
    body : Text;
    bodyVersion : Nat;
  };

  // A recipe as the app gets it. `author` is only sent to owners (for their
  // backups); contributors get just the name.
  public type RecipeView = {
    id : Nat;
    title : Text;
    body : Text;
    bodyVersion : Nat;
    createdAt : Int;
    updatedAt : Int;
    authorName : Text;
    isMine : Bool;
    canEdit : Bool;
    author : ?Principal;
  };

  // A recipe from a backup file. The original dates are kept when given.
  // `author` is used only when an owner imports; otherwise the importer is
  // the author.
  public type ImportItem = {
    title : Text;
    body : Text;
    bodyVersion : Nat;
    createdAt : ?Int;
    updatedAt : ?Int;
    author : ?Principal;
  };

  let MAX_TITLE_CHARS = 200;
  let MAX_BODY_CHARS = 100_000;
  let MAX_RECIPES = 10_000;

  // IDs come from this counter and are never reused, so two recipes with the
  // same title can never overwrite each other.
  var nextId = 1;
  let recipes = Map.empty<Nat, Recipe>();
  // Recipe ID -> author. Kept apart from `recipes` so the stored recipes did
  // not change shape. Recipes from before authors existed have no entry until
  // a controller runs assignUnassignedRecipes; until then only owners may
  // change them.
  let recipeAuthors = Map.empty<Nat, Principal>();

  func canEdit(caller : Principal, id : Nat) : Bool {
    isOwner(caller) or recipeAuthors.get(id) == ?caller;
  };

  func requireCanEdit(caller : Principal, id : Nat) {
    if (not canEdit(caller, id)) {
      Runtime.trap("Tega recepta ne morete spreminjati.");
    };
  };

  func countRecipesOf(user : Principal) : Nat {
    recipeAuthors.values().filter(func a = a == user).size();
  };

  func toView(caller : Principal, recipe : Recipe) : RecipeView {
    let author = recipeAuthors.get(recipe.id);
    let owner = isOwner(caller);
    let isMine = author == ?caller;
    {
      recipe with
      authorName = switch (author) {
        case (?a) { userNames.get(a) ?? FALLBACK_NAME };
        case (null) { FALLBACK_NAME };
      };
      isMine;
      canEdit = owner or isMine;
      author = if owner author else null;
    };
  };

  func cleanTitle(title : Text) : Text {
    let trimmed = title.trim(#predicate(func c = c.isWhitespace()));
    if (trimmed.size() == 0) {
      Runtime.trap("Naslov je obvezen.");
    };
    if (trimmed.size() > MAX_TITLE_CHARS) {
      Runtime.trap("Naslov je predolg.");
    };
    trimmed;
  };

  func checkBody(caller : Principal, body : Text) {
    let max = if (isOwner(caller)) MAX_BODY_CHARS else MAX_CONTRIBUTOR_BODY_CHARS;
    if (body.size() > max) {
      Runtime.trap("Recept je prevelik.");
    };
  };

  // Contributors may add at most MAX_CONTRIBUTOR_RECIPES recipes of their own.
  func checkRecipeQuota(caller : Principal, adding : Nat) {
    if (not isOwner(caller) and countRecipesOf(caller) + adding > MAX_CONTRIBUTOR_RECIPES) {
      Runtime.trap("Doseženo je največje število vaših receptov.");
    };
  };

  func insert(caller : Principal, author : Principal, title : Text, body : Text, bodyVersion : Nat, createdAt : Int, updatedAt : Int) : Recipe {
    if (recipes.size() >= MAX_RECIPES) {
      Runtime.trap("Doseženo je največje število receptov.");
    };
    let recipe : Recipe = {
      id = nextId;
      title = cleanTitle(title);
      body;
      bodyVersion;
      createdAt;
      updatedAt;
    };
    checkBody(caller, body);
    recipes.add(nextId, recipe);
    recipeAuthors.add(nextId, author);
    nextId += 1;
    recipe;
  };

  // The caller becomes the author.
  public shared ({ caller }) func addRecipe(input : RecipeInput) : async RecipeView {
    requireUser(caller);
    checkRecipeQuota(caller, 1);
    let now = Time.now();
    toView(caller, insert(caller, caller, input.title, input.body, input.bodyVersion, now, now));
  };

  // `expectedUpdatedAt` is the `updatedAt` the editor started from. If the
  // recipe was saved in the meantime (e.g. on another device), the update is
  // rejected instead of silently overwriting that change.
  // Only the author or an owner may update; the author stays the same.
  public shared ({ caller }) func updateRecipe(id : Nat, input : RecipeInput, expectedUpdatedAt : Int) : async RecipeView {
    requireUser(caller);
    let existing = recipes.get(id) ?? Runtime.trap("Recept ne obstaja.");
    requireCanEdit(caller, id);
    if (existing.updatedAt != expectedUpdatedAt) {
      Runtime.trap("Recept je bil medtem spremenjen. Osvežite in poskusite znova.");
    };
    checkBody(caller, input.body);
    let updated : Recipe = {
      id;
      title = cleanTitle(input.title);
      body = input.body;
      bodyVersion = input.bodyVersion;
      createdAt = existing.createdAt;
      updatedAt = Time.now();
    };
    recipes.add(id, updated);
    toView(caller, updated);
  };

  public shared ({ caller }) func deleteRecipe(id : Nat) : async () {
    requireUser(caller);
    if (not recipes.containsKey(id)) {
      Runtime.trap("Recept ne obstaja.");
    };
    requireCanEdit(caller, id);
    recipes.remove(id);
    recipeAuthors.remove(id);
    removeShare(id);
  };

  // Everyone allowed can read every recipe.
  public shared query ({ caller }) func getRecipe(id : Nat) : async ?RecipeView {
    requireUser(caller);
    switch (recipes.get(id)) {
      case (?recipe) { ?toView(caller, recipe) };
      case (null) { null };
    };
  };

  // All recipes, oldest first.
  public shared query ({ caller }) func getAllRecipes() : async [RecipeView] {
    requireUser(caller);
    recipes.values().map(func r = toView(caller, r)).toArray();
  };

  // One-time step after the upgrade that added authors: makes `author` the
  // author of every recipe that has none yet. Running it again changes
  // nothing. Returns how many recipes were assigned.
  public shared ({ caller }) func assignUnassignedRecipes(author : Principal) : async Nat {
    requireController(caller);
    requireListed(author);
    var count = 0;
    for (id in recipes.keys()) {
      if (not recipeAuthors.containsKey(id)) {
        recipeAuthors.add(id, author);
        count += 1;
      };
    };
    count;
  };

  // How many recipes have no author yet (should be 0 after
  // assignUnassignedRecipes).
  public shared ({ caller }) func countUnassignedRecipes() : async Nat {
    requireController(caller);
    recipes.keys().filter(func id = not recipeAuthors.containsKey(id)).size();
  };

  // Adds recipes from a backup or a pasted text. Only adds, with new IDs:
  // never deletes or overwrites anything. An empty list changes nothing.
  // The frontend decides beforehand what to do with duplicate titles.
  // An owner's import keeps the authors from the file (a restore); a
  // contributor's import, and items without an author, get the importer.
  public shared ({ caller }) func importRecipes(items : [ImportItem]) : async [RecipeView] {
    requireUser(caller);
    if (recipes.size() + items.size() > MAX_RECIPES) {
      Runtime.trap("Doseženo je največje število receptov.");
    };
    checkRecipeQuota(caller, items.size());
    let owner = isOwner(caller);
    let now = Time.now();
    items.map(
      func(item) {
        let createdAt = item.createdAt ?? now;
        let updatedAt = Int.max(item.updatedAt ?? createdAt, createdAt);
        let author = if owner (item.author ?? caller) else caller;
        toView(caller, insert(caller, author, item.title, item.body, item.bodyVersion, createdAt, updatedAt));
      }
    );
  };

  // ---------- Read-only share links ----------

  // A share link gives anyone who has its token read-only access to one
  // target. Only #recipe exists now; other targets (a tag, a collection) can
  // be added as new variant cases later without a data migration.
  public type ShareTarget = { #recipe : Nat };

  public type Share = {
    target : ShareTarget;
    createdAt : Int;
  };

  public type ShareInfo = {
    token : Text;
    recipeId : Nat;
    title : Text;
    createdAt : Int;
  };

  // What a visitor of a share link gets: no IDs, dates or principals. `body`
  // is the same JSON the app stores (tags, ingredients, steps, air fryer).
  // If a private field is ever added to the body, filter it out here.
  public type SharedRecipe = {
    title : Text;
    body : Text;
    bodyVersion : Nat;
  };

  let MAX_SHARES = 200;
  // 16 random bytes = 128 bits, written as 32 hex characters.
  let TOKEN_BYTES = 16;

  // Token -> share, and recipe ID -> its token (at most one link per recipe).
  let shares = Map.empty<Text, Share>();
  let recipeShares = Map.empty<Nat, Text>();

  func toHex(bytes : Blob, count : Nat) : Text {
    let digits = "0123456789abcdef".chars().toArray();
    var out = "";
    var n = 0;
    for (b in bytes.vals()) {
      if (n < count) {
        let v = b.toNat();
        out #= Text.fromChar(digits[v / 16]) # Text.fromChar(digits[v % 16]);
      };
      n += 1;
    };
    if (n < count) {
      Runtime.trap("Not enough random bytes");
    };
    out;
  };

  func removeShare(recipeId : Nat) {
    switch (recipeShares.get(recipeId)) {
      case (?token) {
        shares.remove(token);
        recipeShares.remove(recipeId);
      };
      case (null) {};
    };
  };

  func checkShareLimits(caller : Principal) {
    if (shares.size() >= MAX_SHARES) {
      Runtime.trap("Doseženo je največje število povezav.");
    };
    if (not isOwner(caller) and recipeShares.keys().filter(func id = recipeAuthors.get(id) == ?caller).size() >= MAX_CONTRIBUTOR_SHARES) {
      Runtime.trap("Doseženo je največje število vaših povezav.");
    };
  };

  // Returns the recipe's link token, creating one if it has none yet, so
  // tapping "share" again gives the same link. A link belongs to its recipe's
  // author: only they and the owners may create, see and revoke it.
  public shared ({ caller }) func createShare(recipeId : Nat) : async Text {
    requireUser(caller);
    if (not recipes.containsKey(recipeId)) {
      Runtime.trap("Recept ne obstaja.");
    };
    requireCanEdit(caller, recipeId);
    switch (recipeShares.get(recipeId)) {
      case (?token) { return token };
      case (null) {};
    };
    checkShareLimits(caller);
    // Cryptographically secure randomness from the management canister.
    let token = toHex(await Random.blob(), TOKEN_BYTES);
    // Other calls may have run during the await: check everything again.
    requireUser(caller);
    if (not recipes.containsKey(recipeId)) {
      Runtime.trap("Recept ne obstaja.");
    };
    requireCanEdit(caller, recipeId);
    switch (recipeShares.get(recipeId)) {
      case (?existing) { return existing };
      case (null) {};
    };
    checkShareLimits(caller);
    if (shares.containsKey(token)) {
      Runtime.trap("Povezave ni bilo mogoče ustvariti. Poskusite znova.");
    };
    shares.add(token, { target = #recipe recipeId; createdAt = Time.now() });
    recipeShares.add(recipeId, token);
    token;
  };

  // Revoking a recipe without a link changes nothing.
  public shared ({ caller }) func revokeShare(recipeId : Nat) : async () {
    requireUser(caller);
    if (not recipeShares.containsKey(recipeId)) {
      return;
    };
    requireCanEdit(caller, recipeId);
    removeShare(recipeId);
  };

  // An owner revokes every link; a contributor only the links of their own
  // recipes.
  public shared ({ caller }) func revokeAllShares() : async () {
    requireUser(caller);
    if (isOwner(caller)) {
      shares.clear();
      recipeShares.clear();
    } else {
      let mine = recipeShares.keys().filter(func id = recipeAuthors.get(id) == ?caller).toArray();
      for (id in mine.values()) {
        removeShare(id);
      };
    };
  };

  // An owner sees every link; a contributor only the links of their own
  // recipes.
  public shared query ({ caller }) func listShares() : async [ShareInfo] {
    requireUser(caller);
    shares.entries().filterMap(
      func((token, share) : (Text, Share)) : ?ShareInfo {
        switch (share.target) {
          case (#recipe id) {
            if (not canEdit(caller, id)) {
              return null;
            };
            switch (recipes.get(id)) {
              case (?recipe) {
                ?{
                  token;
                  recipeId = id;
                  title = recipe.title;
                  createdAt = share.createdAt;
                };
              };
              case (null) { null };
            };
          };
        };
      }
    ).toArray();
  };

  // The only function anonymous callers may use. An unknown or revoked token
  // and a deleted recipe all give the same null.
  public query func getSharedRecipe(token : Text) : async ?SharedRecipe {
    switch (shares.get(token)) {
      case (?{ target = #recipe id }) {
        switch (recipes.get(id)) {
          case (?recipe) {
            ?{ title = recipe.title; body = recipe.body; bodyVersion = recipe.bodyVersion };
          };
          case (null) { null };
        };
      };
      case (null) { null };
    };
  };
};
