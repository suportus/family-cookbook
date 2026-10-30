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
  let allowedUsers = Map.empty<Principal, Bool>();

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

  public shared ({ caller }) func addUser(user : Principal) : async () {
    requireController(caller);
    allowedUsers.add(user, true);
  };

  public shared ({ caller }) func removeUser(user : Principal) : async () {
    requireController(caller);
    allowedUsers.remove(user);
  };

  public shared ({ caller }) func listUsers() : async [Principal] {
    requireController(caller);
    allowedUsers.keys().toArray();
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

  // A recipe from a backup file. The original dates are kept when given.
  public type ImportItem = {
    title : Text;
    body : Text;
    bodyVersion : Nat;
    createdAt : ?Int;
    updatedAt : ?Int;
  };

  let MAX_TITLE_CHARS = 200;
  let MAX_BODY_CHARS = 100_000;
  let MAX_RECIPES = 10_000;

  // IDs come from this counter and are never reused, so two recipes with the
  // same title can never overwrite each other.
  var nextId = 1;
  let recipes = Map.empty<Nat, Recipe>();

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

  func checkBody(body : Text) {
    if (body.size() > MAX_BODY_CHARS) {
      Runtime.trap("Recept je prevelik.");
    };
  };

  func insert(title : Text, body : Text, bodyVersion : Nat, createdAt : Int, updatedAt : Int) : Recipe {
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
    checkBody(body);
    recipes.add(nextId, recipe);
    nextId += 1;
    recipe;
  };

  public shared ({ caller }) func addRecipe(input : RecipeInput) : async Recipe {
    requireUser(caller);
    let now = Time.now();
    insert(input.title, input.body, input.bodyVersion, now, now);
  };

  // `expectedUpdatedAt` is the `updatedAt` the editor started from. If the
  // recipe was saved in the meantime (e.g. on another device), the update is
  // rejected instead of silently overwriting that change.
  public shared ({ caller }) func updateRecipe(id : Nat, input : RecipeInput, expectedUpdatedAt : Int) : async Recipe {
    requireUser(caller);
    let existing = recipes.get(id) ?? Runtime.trap("Recept ne obstaja.");
    if (existing.updatedAt != expectedUpdatedAt) {
      Runtime.trap("Recept je bil medtem spremenjen. Osvežite in poskusite znova.");
    };
    checkBody(input.body);
    let updated : Recipe = {
      id;
      title = cleanTitle(input.title);
      body = input.body;
      bodyVersion = input.bodyVersion;
      createdAt = existing.createdAt;
      updatedAt = Time.now();
    };
    recipes.add(id, updated);
    updated;
  };

  public shared ({ caller }) func deleteRecipe(id : Nat) : async () {
    requireUser(caller);
    if (not recipes.containsKey(id)) {
      Runtime.trap("Recept ne obstaja.");
    };
    recipes.remove(id);
    removeShare(id);
  };

  public shared query ({ caller }) func getRecipe(id : Nat) : async ?Recipe {
    requireUser(caller);
    recipes.get(id);
  };

  // All recipes, oldest first.
  public shared query ({ caller }) func getAllRecipes() : async [Recipe] {
    requireUser(caller);
    recipes.values().toArray();
  };

  // Adds recipes from a backup or a pasted text. Only adds, with new IDs:
  // never deletes or overwrites anything. An empty list changes nothing.
  // The frontend decides beforehand what to do with duplicate titles.
  public shared ({ caller }) func importRecipes(items : [ImportItem]) : async [Recipe] {
    requireUser(caller);
    if (recipes.size() + items.size() > MAX_RECIPES) {
      Runtime.trap("Doseženo je največje število receptov.");
    };
    let now = Time.now();
    items.map(
      func(item) {
        let createdAt = item.createdAt ?? now;
        let updatedAt = Int.max(item.updatedAt ?? createdAt, createdAt);
        insert(item.title, item.body, item.bodyVersion, createdAt, updatedAt);
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

  // Returns the recipe's link token, creating one if it has none yet, so
  // tapping "share" again gives the same link.
  public shared ({ caller }) func createShare(recipeId : Nat) : async Text {
    requireUser(caller);
    if (not recipes.containsKey(recipeId)) {
      Runtime.trap("Recept ne obstaja.");
    };
    switch (recipeShares.get(recipeId)) {
      case (?token) { return token };
      case (null) {};
    };
    if (shares.size() >= MAX_SHARES) {
      Runtime.trap("Doseženo je največje število povezav.");
    };
    // Cryptographically secure randomness from the management canister.
    let token = toHex(await Random.blob(), TOKEN_BYTES);
    // Other calls may have run during the await: check everything again.
    if (not recipes.containsKey(recipeId)) {
      Runtime.trap("Recept ne obstaja.");
    };
    switch (recipeShares.get(recipeId)) {
      case (?existing) { return existing };
      case (null) {};
    };
    if (shares.size() >= MAX_SHARES) {
      Runtime.trap("Doseženo je največje število povezav.");
    };
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
    removeShare(recipeId);
  };

  public shared ({ caller }) func revokeAllShares() : async () {
    requireUser(caller);
    shares.clear();
    recipeShares.clear();
  };

  public shared query ({ caller }) func listShares() : async [ShareInfo] {
    requireUser(caller);
    shares.entries().filterMap(
      func((token, share) : (Text, Share)) : ?ShareInfo {
        switch (share.target) {
          case (#recipe id) {
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
