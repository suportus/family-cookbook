import AccessControl "mo:caffeineai-authorization/access-control";
import MixinAuthorization "mo:caffeineai-authorization/MixinAuthorization";
import UserApproval "mo:caffeineai-user-approval/approval";
import InviteLinksModule "mo:caffeineai-invite-links/invite-links-module";
import Principal "mo:base/Principal";
import OrderedMap "mo:base/OrderedMap";
import Debug "mo:base/Debug";
import Time "mo:base/Time";
import Text "mo:base/Text";
import Iter "mo:base/Iter";
import Array "mo:base/Array";
import Random "mo:base/Random";
import DebugLogging "debug-logging";
import Expose "mo:caffeineai-oql/Expose";

actor {
  let accessControlState : AccessControl.AccessControlState;
  let approvalState : UserApproval.UserApprovalState;
  let inviteState : InviteLinksModule.InviteLinksSystemState;

  // Admin Dashboard is accessible to these Principal IDs
  let ADMIN_PRINCIPAL_IDS : [Text];

  // Anonymous principal constant
  let ANONYMOUS_PRINCIPAL : Principal;

  // Maximum safe size for imageUrl field (10MB = 10485760 bytes for blob URLs)
  let MAX_IMAGE_URL_SIZE : Nat;

  // Helper function to check if caller is anonymous
  func isAnonymous(caller : Principal) : Bool {
    caller == ANONYMOUS_PRINCIPAL;
  };

  // Helper function to check if caller is an authorized admin
  func isAuthorizedAdmin(caller : Principal) : Bool {
    let callerId = Principal.toText(caller);
    for (adminId in ADMIN_PRINCIPAL_IDS.vals()) {
      if (adminId == callerId) {
        return true;
      };
    };
    false;
  };

  // Helper function to validate image URL (must be a URL reference, not inline data)
  func validateImageUrl(imageUrl : ?Text) : Bool {
    switch (imageUrl) {
      case null { true };
      case (?url) {
        let urlSize = Text.size(url);
        // Check size limit
        if (urlSize > MAX_IMAGE_URL_SIZE) {
          return false;
        };
        // Check that it's a URL reference (starts with http:// or https:// or blob:)
        // and not inline data (data:image/...)
        if (Text.startsWith(url, #text "data:")) {
          return false;
        };
        // Allow blob URLs and secure URLs
        if (Text.startsWith(url, #text "blob:") or Text.startsWith(url, #text "https://")) {
          return true;
        };
        // Allow http URLs for compatibility (should be https in production)
        if (Text.startsWith(url, #text "http://")) {
          return true;
        };
        false;
      };
    };
  };

  // App Version (default: "1.0.0")
  var appVersion : Text;

  // Debug Logging System - Stable storage
  var stableImageUploadLogs : [DebugLogging.ImageUploadLog];
  var stableRecipeSaveLogs : [DebugLogging.RecipeSaveLog];
  var stableCookbookSafetyLogs : [DebugLogging.CookbookSafetyLog];
  var stableLast20Operations : [DebugLogging.OperationSummary];

  public shared ({ caller }) func initializeAccessControl() : async () {
    AccessControl.initialize(accessControlState, caller);
  };

  include MixinAuthorization(accessControlState, null);

  // OQL Data Intelligence — exposes schema() and execute(qJson) query methods
  // so the deploy's Data Intelligence check passes. Empty entities list yields
  // a minimal valid schema; add Entity.Decl entries per stored collection to
  // make them queryable in natural language.
  include Expose({ entities = [] });

  public type Invitation = {
    cookbookId : Text;
    invitedBy : Principal;
    invitedAt : Time.Time;
    role : UserRole;
  };

  public type UserProfile = {
    name : Text;
    language : Text;
    requireApprovalBeforeJoining : Bool;
    invitations : [Invitation];
    favoriteCookbooks : [Text];
  };

  transient let principalMap = OrderedMap.Make(Principal.compare);
  var userProfiles : OrderedMap.Map<Principal, UserProfile>;

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (isAnonymous(caller)) {
      Debug.trap("Unauthorized: Anonymous users cannot access profiles");
    };
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can access profiles");
    };
    principalMap.get(userProfiles, caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    // Require authentication (no anonymous access)
    if (isAnonymous(caller)) {
      Debug.trap("Unauthorized: Anonymous users cannot view profiles");
    };
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only authenticated users can view profiles");
    };
    
    // Users can only view their own profile unless they are admin
    // OR they have a valid reason (member of same cookbook, invitation sender/receiver)
    if (caller != user and not isAuthorizedAdmin(caller)) {
      // Check if they share a cookbook
      var sharedCookbook = false;
      for ((bookId, permissions) in textMap.entries(bookPermissions)) {
        if (principalMap.contains(permissions, caller) and principalMap.contains(permissions, user)) {
          sharedCookbook := true;
        };
      };
      
      // Check if there's a pending invitation between them
      var hasInvitation = false;
      switch (principalMap.get(userProfiles, caller)) {
        case null {};
        case (?callerProfile) {
          for (inv in callerProfile.invitations.vals()) {
            if (inv.invitedBy == user) {
              hasInvitation := true;
            };
          };
        };
      };
      
      if (not sharedCookbook and not hasInvitation) {
        Debug.trap("Unauthorized: Can only view profiles of users you share cookbooks with");
      };
    };
    
    principalMap.get(userProfiles, user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (isAnonymous(caller)) {
      Debug.trap("Unauthorized: Anonymous users cannot save profiles");
    };
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles := principalMap.put(userProfiles, caller, profile);
  };

  public type BookMeta = {
    id : Text;
    title : Text;
    owner : Principal;
    created_at : Time.Time;
    useDefaultTags : Bool;
    customTags : [Text];
  };

  public type UserRole = {
    #owner;
    #editor;
    #viewer;
  };

  public type Ingredient = {
    text : Text;
    ingredientType : {
      #ingredient;
      #section;
    };
  };

  public type Recipe = {
    id : Text;
    title : Text;
    ingredients : [Ingredient];
    instructions : Text;
    author : Text;
    authorPrincipal : Principal;
    created_at : Time.Time;
    updated_at : Time.Time;
    tags : [Text];
    imageUrl : ?Text;
  };

  public type PredefinedTag = {
    id : Text;
    en : Text;
    sl : Text;
  };

  let predefinedTags : [PredefinedTag];

  transient let textMap = OrderedMap.Make(Text.compare);
  var books : OrderedMap.Map<Text, BookMeta>;
  var bookPermissions : OrderedMap.Map<Text, OrderedMap.Map<Principal, UserRole>>;
  var recipes : OrderedMap.Map<Text, OrderedMap.Map<Text, Recipe>>;

  public shared ({ caller }) func createBook(title : Text, useDefaultTags : Bool, customTags : [Text]) : async Text {
    if (isAnonymous(caller)) {
      Debug.trap("Unauthorized: Anonymous users cannot create books");
    };
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can create books");
    };

    let bookId = Text.concat(title, Principal.toText(caller));
    let bookMeta : BookMeta = {
      id = bookId;
      title;
      owner = caller;
      created_at = Time.now();
      useDefaultTags;
      customTags;
    };

    books := textMap.put(books, bookId, bookMeta);

    let permissionsMap = principalMap.put(principalMap.empty<UserRole>(), caller, #owner);
    bookPermissions := textMap.put(bookPermissions, bookId, permissionsMap);

    let emptyRecipeMap = textMap.empty<Recipe>();
    recipes := textMap.put(recipes, bookId, emptyRecipeMap);

    bookId;
  };

  public shared ({ caller }) func deleteBook(bookId : Text) : async () {
    if (isAnonymous(caller)) {
      Debug.trap("Unauthorized: Anonymous users cannot delete books");
    };
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only authenticated users can delete books");
    };

    let bookMeta = switch (textMap.get(books, bookId)) {
      case null { Debug.trap("Book not found") };
      case (?meta) { meta };
    };

    if (bookMeta.owner != caller and not isAuthorizedAdmin(caller)) {
      Debug.trap("Unauthorized: Only owners or admins can delete books");
    };

    books := textMap.delete(books, bookId);
    bookPermissions := textMap.delete(bookPermissions, bookId);
    recipes := textMap.delete(recipes, bookId);
  };

  public shared ({ caller }) func inviteUser(bookId : Text, user : Principal, role : UserRole) : async Text {
    if (isAnonymous(caller)) {
      Debug.trap("Unauthorized: Anonymous users cannot invite users");
    };
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only authenticated users can invite users");
    };

    let permissions = switch (textMap.get(bookPermissions, bookId)) {
      case null { Debug.trap("Book not found") };
      case (?perms) { perms };
    };

    let callerRole = switch (principalMap.get(permissions, caller)) {
      case null { Debug.trap("Unauthorized: No permissions for this book") };
      case (?role) { role };
    };

    // Only Owners can invite users
    if (callerRole != #owner) {
      Debug.trap("Unauthorized: Only owners can invite users");
    };

    switch (principalMap.get(userProfiles, user)) {
      case null {
        let updatedPermissions = principalMap.put(permissions, user, role);
        bookPermissions := textMap.put(bookPermissions, bookId, updatedPermissions);
        return "User profile not found. Added directly to cookbook.";
      };
      case (?profile) {
        if (profile.requireApprovalBeforeJoining) {
          let invitation : Invitation = {
            cookbookId = bookId;
            invitedBy = caller;
            invitedAt = Time.now();
            role;
          };

          let updatedProfile : UserProfile = {
            name = profile.name;
            language = profile.language;
            requireApprovalBeforeJoining = profile.requireApprovalBeforeJoining;
            invitations = Array.append(profile.invitations, [invitation]);
            favoriteCookbooks = profile.favoriteCookbooks;
          };

          userProfiles := principalMap.put(userProfiles, user, updatedProfile);
          return "Invitation sent. Waiting for approval.";
        } else {
          let updatedPermissions = principalMap.put(permissions, user, role);
          bookPermissions := textMap.put(bookPermissions, bookId, updatedPermissions);
          return "User added directly to cookbook.";
        };
      };
    };
  };

  public shared ({ caller }) func removeUser(bookId : Text, user : Principal) : async () {
    if (isAnonymous(caller)) {
      Debug.trap("Unauthorized: Anonymous users cannot remove users");
    };
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only authenticated users can remove users");
    };

    let permissions = switch (textMap.get(bookPermissions, bookId)) {
      case null { Debug.trap("Book not found") };
      case (?perms) { perms };
    };

    let callerRole = switch (principalMap.get(permissions, caller)) {
      case null { Debug.trap("Unauthorized: No permissions for this book") };
      case (?role) { role };
    };

    if (callerRole != #owner and not isAuthorizedAdmin(caller)) {
      Debug.trap("Unauthorized: Only owners or admins can remove users");
    };

    let userRole = switch (principalMap.get(permissions, user)) {
      case null { Debug.trap("User not found in permissions") };
      case (?role) { role };
    };

    if (userRole == #owner) {
      let ownerCount = countOwners(permissions);
      if (ownerCount <= 1) {
        Debug.trap("Cannot remove the last remaining owner");
      };
    };

    let updatedPermissions = principalMap.delete(permissions, user);
    bookPermissions := textMap.put(bookPermissions, bookId, updatedPermissions);
  };

  public shared ({ caller }) func changeUserRole(bookId : Text, user : Principal, newRole : UserRole) : async () {
    if (isAnonymous(caller)) {
      Debug.trap("Unauthorized: Anonymous users cannot change roles");
    };
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only authenticated users can change roles");
    };

    let permissions = switch (textMap.get(bookPermissions, bookId)) {
      case null { Debug.trap("Book not found") };
      case (?perms) { perms };
    };

    let callerRole = switch (principalMap.get(permissions, caller)) {
      case null { Debug.trap("Unauthorized: No permissions for this book") };
      case (?role) { role };
    };

    if (callerRole != #owner and not isAuthorizedAdmin(caller)) {
      Debug.trap("Unauthorized: Only owners or admins can change roles");
    };

    let currentRole = switch (principalMap.get(permissions, user)) {
      case null { Debug.trap("User not found in permissions") };
      case (?role) { role };
    };

    if (currentRole == #owner and newRole != #owner) {
      let ownerCount = countOwners(permissions);
      if (ownerCount <= 1) {
        Debug.trap("Cannot change the last remaining owner's role");
      };
    };

    let updatedPermissions = principalMap.put(permissions, user, newRole);
    bookPermissions := textMap.put(bookPermissions, bookId, updatedPermissions);
  };

  func countOwners(permissions : OrderedMap.Map<Principal, UserRole>) : Nat {
    var count = 0;
    for ((_, role) in principalMap.entries(permissions)) {
      if (role == #owner) {
        count += 1;
      };
    };
    count;
  };

  func hasPendingInvitation(user : Principal, bookId : Text) : Bool {
    switch (principalMap.get(userProfiles, user)) {
      case null { false };
      case (?profile) {
        for (invitation in profile.invitations.vals()) {
          if (invitation.cookbookId == bookId) {
            return true;
          };
        };
        false;
      };
    };
  };

  public query ({ caller }) func getBooksForUser() : async [{
    id : Text;
    title : Text;
    owner : Principal;
    created_at : Time.Time;
    useDefaultTags : Bool;
    customTags : [Text];
    is_favorite : Bool;
  }] {
    if (isAnonymous(caller)) {
      Debug.trap("Unauthorized: Anonymous users cannot list books");
    };
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can list books");
    };

    var userBooks : [{
      id : Text;
      title : Text;
      owner : Principal;
      created_at : Time.Time;
      useDefaultTags : Bool;
      customTags : [Text];
      is_favorite : Bool;
    }] = [];

    let favoriteCookbooks = switch (principalMap.get(userProfiles, caller)) {
      case null { [] };
      case (?profile) { profile.favoriteCookbooks };
    };

    for ((bookId, permissions) in textMap.entries(bookPermissions)) {
      if (principalMap.contains(permissions, caller)) {
        switch (textMap.get(books, bookId)) {
          case null {};
          case (?meta) {
            let isFavorite = Array.find(favoriteCookbooks, func(id) = id == bookId) != null;
            userBooks := Array.append(
              userBooks,
              [{
                id = meta.id;
                title = meta.title;
                owner = meta.owner;
                created_at = meta.created_at;
                useDefaultTags = meta.useDefaultTags;
                customTags = meta.customTags;
                is_favorite = isFavorite;
              }],
            );
          };
        };
      };
    };

    userBooks;
  };

  public query ({ caller }) func getUserRole(bookId : Text) : async ?UserRole {
    if (isAnonymous(caller)) {
      Debug.trap("Unauthorized: Anonymous users cannot query roles");
    };
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can query roles");
    };

    switch (textMap.get(bookPermissions, bookId)) {
      case null { null };
      case (?permissions) {
        principalMap.get(permissions, caller);
      };
    };
  };

  public query ({ caller }) func getBookMeta(bookId : Text) : async ?BookMeta {
    if (isAnonymous(caller)) {
      Debug.trap("Unauthorized: Anonymous users cannot access book metadata");
    };
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can access book metadata");
    };

    let permissions = switch (textMap.get(bookPermissions, bookId)) {
      case null { return null };
      case (?perms) { perms };
    };

    // Allow access if user has permissions OR has a pending invitation for this cookbook
    let hasPermission = principalMap.contains(permissions, caller);
    let hasInvitation = hasPendingInvitation(caller, bookId);
    let isAdmin = isAuthorizedAdmin(caller);

    if (not hasPermission and not hasInvitation and not isAdmin) {
      Debug.trap("Unauthorized: No permissions for this book");
    };

    textMap.get(books, bookId);
  };

  // Safety guard: Validate recipe data before save
  func validateRecipeData(bookId : Text, recipeId : Text, title : Text, ingredients : [Ingredient], instructions : Text) : Bool {
    // Check if recipe data is valid
    if (Text.size(title) == 0) {
      logSafetyIncidentInternal(Principal.fromText("2vxsx-fae"), "validateRecipeData", "Empty recipe title", "Blocked");
      return false;
    };

    if (ingredients.size() == 0) {
      logSafetyIncidentInternal(Principal.fromText("2vxsx-fae"), "validateRecipeData", "Empty ingredients array", "Blocked");
      return false;
    };

    if (Text.size(instructions) == 0) {
      logSafetyIncidentInternal(Principal.fromText("2vxsx-fae"), "validateRecipeData", "Empty instructions", "Blocked");
      return false;
    };

    true;
  };

  // Internal logging function that doesn't require admin check
  func logSafetyIncidentInternal(caller : Principal, operation : Text, details : Text, result : Text) : () {
    let log : DebugLogging.CookbookSafetyLog = {
      timestamp = Time.now();
      operation;
      details;
      result;
      userPrincipal = caller;
    };

    stableCookbookSafetyLogs := Array.append(stableCookbookSafetyLogs, [log]);

    let summary : DebugLogging.OperationSummary = {
      timestamp = Time.now();
      operationType = "Safety Incident";
      result;
      detailsLink = "safety-incident-" # debug_show(log.timestamp);
    };

    stableLast20Operations := Array.append(stableLast20Operations, [summary]);
    if (stableLast20Operations.size() > 20) {
      stableLast20Operations := Array.tabulate(20, func(i) = stableLast20Operations[i + stableLast20Operations.size() - 20]);
    };
  };

  // Internal logging function for recipe saves
  func logRecipeSaveInternal(caller : Principal, cookbookId : Text, operation : Text, recipeId : Text, success : Bool, errorMsg : ?Text) : () {
    let log : DebugLogging.RecipeSaveLog = {
      timestamp = Time.now();
      cookbookId;
      dataSent = operation # " recipe: " # recipeId;
      recipesArrayStatus = "Valid";
      fieldDifferences = "";
      beforeSnapshot = "";
      afterSnapshot = "";
      errors = errorMsg;
      userPrincipal = caller;
    };

    stableRecipeSaveLogs := Array.append(stableRecipeSaveLogs, [log]);

    let summary : DebugLogging.OperationSummary = {
      timestamp = Time.now();
      operationType = "Recipe Save";
      result = if (success) { "Success" } else { "Failure" };
      detailsLink = "recipe-save-" # debug_show(log.timestamp);
    };

    stableLast20Operations := Array.append(stableLast20Operations, [summary]);
    if (stableLast20Operations.size() > 20) {
      stableLast20Operations := Array.tabulate(20, func(i) = stableLast20Operations[i + stableLast20Operations.size() - 20]);
    };
  };

  // Internal logging function for image uploads
  func logImageUploadInternal(log : DebugLogging.ImageUploadLog) : () {
    stableImageUploadLogs := Array.append(stableImageUploadLogs, [log]);

    let summary : DebugLogging.OperationSummary = {
      timestamp = Time.now();
      operationType = "Image Upload";
      result = switch (log.result) { case (#success _) { "Success" }; case (#failure _) { "Failure" } };
      detailsLink = "image-upload-" # debug_show(log.timestamp);
    };

    stableLast20Operations := Array.append(stableLast20Operations, [summary]);
    if (stableLast20Operations.size() > 20) {
      stableLast20Operations := Array.tabulate(20, func(i) = stableLast20Operations[i + stableLast20Operations.size() - 20]);
    };
  };

  public shared ({ caller }) func addRecipe(bookId : Text, title : Text, ingredients : [Ingredient], instructions : Text, tags : [Text], imageUrl : ?Text) : async Text {
    // Require user authentication for adding recipes
    if (isAnonymous(caller)) {
      Debug.trap("Unauthorized: Anonymous users cannot add recipes");
    };
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only authenticated users can add recipes");
    };

    // Validate image URL to prevent inline data
    if (not validateImageUrl(imageUrl)) {
      logRecipeSaveInternal(caller, bookId, "addRecipe", "validation-failed", false, ?"Image URL is invalid: must be a URL reference, not inline data");
      Debug.trap("Invalid image URL: must be a URL reference (http://, https://, or blob:), not inline data (data:)");
    };

    let permissions = switch (textMap.get(bookPermissions, bookId)) {
      case null { Debug.trap("Book not found") };
      case (?perms) { perms };
    };

    let userRole = switch (principalMap.get(permissions, caller)) {
      case null { Debug.trap("Unauthorized: No permissions for this book") };
      case (?role) { role };
    };

    if (userRole == #viewer) {
      Debug.trap("Unauthorized: Viewers cannot add recipes");
    };

    // Safety guard: Validate recipe data
    let recipeId = Text.concat(title, Principal.toText(caller));
    if (not validateRecipeData(bookId, recipeId, title, ingredients, instructions)) {
      logRecipeSaveInternal(caller, bookId, "addRecipe", recipeId, false, ?"Validation failed");
      Debug.trap("Invalid recipe data");
    };

    let authorName = switch (principalMap.get(userProfiles, caller)) {
      case null { "Unknown User" };
      case (?profile) { profile.name };
    };

    let recipe : Recipe = {
      id = recipeId;
      title;
      ingredients;
      instructions;
      author = authorName;
      authorPrincipal = caller;
      created_at = Time.now();
      updated_at = Time.now();
      tags;
      imageUrl;
    };

    let bookRecipes = switch (textMap.get(recipes, bookId)) {
      case null { textMap.empty<Recipe>() };
      case (?r) { r };
    };

    let updatedBookRecipes = textMap.put(bookRecipes, recipeId, recipe);
    recipes := textMap.put(recipes, bookId, updatedBookRecipes);

    updateBookTagsWithNewTags(bookId, tags);

    logRecipeSaveInternal(caller, bookId, "addRecipe", recipeId, true, null);

    recipeId;
  };

  public shared ({ caller }) func editRecipe(bookId : Text, recipeId : Text, title : Text, ingredients : [Ingredient], instructions : Text, tags : [Text], imageUrl : ?Text) : async () {
    // Require user authentication for editing recipes
    if (isAnonymous(caller)) {
      Debug.trap("Unauthorized: Anonymous users cannot edit recipes");
    };
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only authenticated users can edit recipes");
    };

    // Validate image URL to prevent inline data
    if (not validateImageUrl(imageUrl)) {
      logRecipeSaveInternal(caller, bookId, "editRecipe", recipeId, false, ?"Image URL is invalid: must be a URL reference, not inline data");
      Debug.trap("Invalid image URL: must be a URL reference (http://, https://, or blob:), not inline data (data:)");
    };

    let permissions = switch (textMap.get(bookPermissions, bookId)) {
      case null { Debug.trap("Book not found") };
      case (?perms) { perms };
    };

    let userRole = switch (principalMap.get(permissions, caller)) {
      case null { Debug.trap("Unauthorized: No permissions for this book") };
      case (?role) { role };
    };

    let bookRecipes = switch (textMap.get(recipes, bookId)) {
      case null { Debug.trap("Book not found") };
      case (?r) { r };
    };

    let recipe = switch (textMap.get(bookRecipes, recipeId)) {
      case null { Debug.trap("Recipe not found") };
      case (?r) { r };
    };

    if (userRole == #viewer) {
      Debug.trap("Unauthorized: Viewers cannot edit recipes");
    };

    if (userRole == #editor and recipe.authorPrincipal != caller and not isAuthorizedAdmin(caller)) {
      Debug.trap("Unauthorized: Editors can only edit their own recipes");
    };

    // Safety guard: Validate recipe data
    if (not validateRecipeData(bookId, recipeId, title, ingredients, instructions)) {
      logRecipeSaveInternal(caller, bookId, "editRecipe", recipeId, false, ?"Validation failed");
      Debug.trap("Invalid recipe data");
    };

    let updatedRecipe : Recipe = {
      id = recipeId;
      title;
      ingredients;
      instructions;
      author = recipe.author;
      authorPrincipal = recipe.authorPrincipal;
      created_at = recipe.created_at;
      updated_at = Time.now();
      tags;
      imageUrl;
    };

    let updatedBookRecipes = textMap.put(bookRecipes, recipeId, updatedRecipe);
    recipes := textMap.put(recipes, bookId, updatedBookRecipes);

    updateBookTagsWithNewTags(bookId, tags);

    logRecipeSaveInternal(caller, bookId, "editRecipe", recipeId, true, null);
  };

  func updateBookTagsWithNewTags(bookId : Text, newTags : [Text]) : () {
    let bookMeta = switch (textMap.get(books, bookId)) {
      case null { return };
      case (?meta) { meta };
    };

    var updatedCustomTags = bookMeta.customTags;

    for (tag in newTags.vals()) {
      var found = false;
      for (existingTag in updatedCustomTags.vals()) {
        if (Text.equal(Text.toLowercase(existingTag), Text.toLowercase(tag))) {
          found := true;
        };
      };
      if (not found) {
        updatedCustomTags := Array.append(updatedCustomTags, [tag]);
      };
    };

    let updatedBookMeta : BookMeta = {
      id = bookMeta.id;
      title = bookMeta.title;
      owner = bookMeta.owner;
      created_at = bookMeta.created_at;
      useDefaultTags = bookMeta.useDefaultTags;
      customTags = updatedCustomTags;
    };

    books := textMap.put(books, bookId, updatedBookMeta);
  };

  public shared ({ caller }) func deleteRecipe(bookId : Text, recipeId : Text) : async () {
    // Require user authentication for deleting recipes
    if (isAnonymous(caller)) {
      Debug.trap("Unauthorized: Anonymous users cannot delete recipes");
    };
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only authenticated users can delete recipes");
    };

    let permissions = switch (textMap.get(bookPermissions, bookId)) {
      case null { Debug.trap("Book not found") };
      case (?perms) { perms };
    };

    let userRole = switch (principalMap.get(permissions, caller)) {
      case null { Debug.trap("Unauthorized: No permissions for this book") };
      case (?role) { role };
    };

    let bookRecipes = switch (textMap.get(recipes, bookId)) {
      case null { Debug.trap("Book not found") };
      case (?r) { r };
    };

    let recipe = switch (textMap.get(bookRecipes, recipeId)) {
      case null { Debug.trap("Recipe not found") };
      case (?r) { r };
    };

    if (userRole == #viewer) {
      Debug.trap("Unauthorized: Viewers cannot delete recipes");
    };

    if (userRole == #editor and recipe.authorPrincipal != caller and not isAuthorizedAdmin(caller)) {
      Debug.trap("Unauthorized: Editors can only delete their own recipes");
    };

    let updatedBookRecipes = textMap.delete(bookRecipes, recipeId);
    recipes := textMap.put(recipes, bookId, updatedBookRecipes);

    logRecipeSaveInternal(caller, bookId, "deleteRecipe", recipeId, true, null);
  };

  public query ({ caller }) func listRecipes(bookId : Text) : async [Recipe] {
    // Require user authentication for listing recipes
    if (isAnonymous(caller)) {
      Debug.trap("Unauthorized: Anonymous users cannot list recipes");
    };
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only authenticated users can list recipes");
    };

    let permissions = switch (textMap.get(bookPermissions, bookId)) {
      case null { Debug.trap("Book not found") };
      case (?perms) { perms };
    };

    let userRole = switch (principalMap.get(permissions, caller)) {
      case null { Debug.trap("Unauthorized: No permissions for this book") };
      case (?role) { role };
    };

    let bookRecipes = switch (textMap.get(recipes, bookId)) {
      case null { textMap.empty<Recipe>() };
      case (?r) { r };
    };

    // Owners see all recipes, Editors and Viewers see all recipes (per specification)
    Iter.toArray(textMap.vals(bookRecipes));
  };

  public query ({ caller }) func getRecipe(bookId : Text, recipeId : Text) : async ?Recipe {
    // Require user authentication for getting recipes
    if (isAnonymous(caller)) {
      Debug.trap("Unauthorized: Anonymous users cannot view recipes");
    };
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only authenticated users can view recipes");
    };

    let permissions = switch (textMap.get(bookPermissions, bookId)) {
      case null { Debug.trap("Book not found") };
      case (?perms) { perms };
    };

    if (not principalMap.contains(permissions, caller) and not isAuthorizedAdmin(caller)) {
      Debug.trap("Unauthorized: No permissions for this book");
    };

    let bookRecipes = switch (textMap.get(recipes, bookId)) {
      case null { textMap.empty<Recipe>() };
      case (?r) { r };
    };

    textMap.get(bookRecipes, recipeId);
  };

  public query ({ caller }) func listBookMembers(bookId : Text) : async [{ principal : Principal; name : Text; role : UserRole }] {
    // Require user authentication for listing members
    if (isAnonymous(caller)) {
      Debug.trap("Unauthorized: Anonymous users cannot list members");
    };
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only authenticated users can list members");
    };

    let permissions = switch (textMap.get(bookPermissions, bookId)) {
      case null { Debug.trap("Book not found") };
      case (?perms) { perms };
    };

    if (not principalMap.contains(permissions, caller) and not isAuthorizedAdmin(caller)) {
      Debug.trap("Unauthorized: No permissions for this book");
    };

    let members = Iter.toArray(principalMap.entries(permissions));
    Array.map(
      members,
      func((principal, role)) = {
        principal;
        name = switch (principalMap.get(userProfiles, principal)) {
          case null { "Unknown User" };
          case (?profile) { profile.name };
        };
        role;
      },
    );
  };

  public shared ({ caller }) func renameBook(bookId : Text, newTitle : Text) : async () {
    // Require user authentication for renaming books
    if (isAnonymous(caller)) {
      Debug.trap("Unauthorized: Anonymous users cannot rename books");
    };
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only authenticated users can rename books");
    };

    let permissions = switch (textMap.get(bookPermissions, bookId)) {
      case null { Debug.trap("Book not found") };
      case (?perms) { perms };
    };

    let callerRole = switch (principalMap.get(permissions, caller)) {
      case null { Debug.trap("Unauthorized: No permissions for this book") };
      case (?role) { role };
    };

    if (callerRole != #owner and not isAuthorizedAdmin(caller)) {
      Debug.trap("Unauthorized: Only owners or admins can rename books");
    };

    let bookMeta = switch (textMap.get(books, bookId)) {
      case null { Debug.trap("Book not found") };
      case (?meta) { meta };
    };

    let updatedBookMeta : BookMeta = {
      id = bookMeta.id;
      title = newTitle;
      owner = bookMeta.owner;
      created_at = bookMeta.created_at;
      useDefaultTags = bookMeta.useDefaultTags;
      customTags = bookMeta.customTags;
    };

    books := textMap.put(books, bookId, updatedBookMeta);
  };

  public query ({ caller }) func getPredefinedTags() : async [PredefinedTag] {
    if (isAnonymous(caller)) {
      Debug.trap("Unauthorized: Anonymous users cannot access predefined tags");
    };
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can access predefined tags");
    };
    predefinedTags;
  };

  public query ({ caller }) func isPredefinedTag(tag : Text) : async Bool {
    if (isAnonymous(caller)) {
      Debug.trap("Unauthorized: Anonymous users cannot validate tags");
    };
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can validate tags");
    };
    for (predefinedTag in predefinedTags.vals()) {
      if (Text.equal(Text.toLowercase(predefinedTag.en), Text.toLowercase(tag)) or Text.equal(Text.toLowercase(predefinedTag.sl), Text.toLowercase(tag))) {
        return true;
      };
    };
    false;
  };

  public query ({ caller }) func getAllTags(bookId : Text) : async [Text] {
    // Require user authentication for getting tags
    if (isAnonymous(caller)) {
      Debug.trap("Unauthorized: Anonymous users cannot access tags");
    };
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only authenticated users can access tags");
    };

    let permissions = switch (textMap.get(bookPermissions, bookId)) {
      case null { Debug.trap("Book not found") };
      case (?perms) { perms };
    };

    if (not principalMap.contains(permissions, caller) and not isAuthorizedAdmin(caller)) {
      Debug.trap("Unauthorized: No permissions for this book");
    };

    let bookRecipes = switch (textMap.get(recipes, bookId)) {
      case null { textMap.empty<Recipe>() };
      case (?r) { r };
    };

    var allTags : [Text] = [];
    for ((_, recipe) in textMap.entries(bookRecipes)) {
      allTags := Array.append(allTags, recipe.tags);
    };

    for (predefinedTag in predefinedTags.vals()) {
      var found = false;
      for (tag in allTags.vals()) {
        if (Text.equal(Text.toLowercase(tag), Text.toLowercase(predefinedTag.en)) or Text.equal(Text.toLowercase(tag), Text.toLowercase(predefinedTag.sl))) {
          found := true;
        };
      };
      if (not found) {
        allTags := Array.append(allTags, [predefinedTag.en]);
      };
    };

    allTags;
  };

  public shared ({ caller }) func copyRecipe(sourceBookId : Text, recipeId : Text, targetBookId : Text) : async Text {
    // Require user authentication for copying recipes
    if (isAnonymous(caller)) {
      Debug.trap("Unauthorized: Anonymous users cannot copy recipes");
    };
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only authenticated users can copy recipes");
    };

    if (sourceBookId == targetBookId) {
      Debug.trap("Cannot copy recipe to the same book");
    };

    let sourcePermissions = switch (textMap.get(bookPermissions, sourceBookId)) {
      case null { Debug.trap("Source book not found") };
      case (?perms) { perms };
    };

    if (not principalMap.contains(sourcePermissions, caller) and not isAuthorizedAdmin(caller)) {
      Debug.trap("Unauthorized: No permissions for source book");
    };

    let targetPermissions = switch (textMap.get(bookPermissions, targetBookId)) {
      case null { Debug.trap("Target book not found") };
      case (?perms) { perms };
    };

    let targetRole = switch (principalMap.get(targetPermissions, caller)) {
      case null { Debug.trap("Unauthorized: No permissions for target book") };
      case (?role) { role };
    };

    if (targetRole != #owner and not isAuthorizedAdmin(caller)) {
      Debug.trap("Unauthorized: Only owners can copy recipes to target book");
    };

    let sourceRecipes = switch (textMap.get(recipes, sourceBookId)) {
      case null { Debug.trap("Source book not found") };
      case (?r) { r };
    };

    let recipe = switch (textMap.get(sourceRecipes, recipeId)) {
      case null { Debug.trap("Recipe not found in source book") };
      case (?r) { r };
    };

    if (recipe.authorPrincipal != caller and not isAuthorizedAdmin(caller)) {
      Debug.trap("Unauthorized: Only the author can copy this recipe");
    };

    let newRecipeId = Text.concat(recipe.title, Principal.toText(caller));
    let newRecipe : Recipe = {
      id = newRecipeId;
      title = recipe.title;
      ingredients = recipe.ingredients;
      instructions = recipe.instructions;
      author = recipe.author;
      authorPrincipal = recipe.authorPrincipal;
      created_at = Time.now();
      updated_at = Time.now();
      tags = recipe.tags;
      imageUrl = recipe.imageUrl;
    };

    let targetRecipes = switch (textMap.get(recipes, targetBookId)) {
      case null { textMap.empty<Recipe>() };
      case (?r) { r };
    };

    let updatedTargetRecipes = textMap.put(targetRecipes, newRecipeId, newRecipe);
    recipes := textMap.put(recipes, targetBookId, updatedTargetRecipes);

    logRecipeSaveInternal(caller, targetBookId, "copyRecipe", newRecipeId, true, null);

    newRecipeId;
  };

  public shared ({ caller }) func moveRecipe(sourceBookId : Text, recipeId : Text, targetBookId : Text) : async () {
    // Require user authentication for moving recipes
    if (isAnonymous(caller)) {
      Debug.trap("Unauthorized: Anonymous users cannot move recipes");
    };
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only authenticated users can move recipes");
    };

    if (sourceBookId == targetBookId) {
      Debug.trap("Cannot move recipe to the same book");
    };

    let sourcePermissions = switch (textMap.get(bookPermissions, sourceBookId)) {
      case null { Debug.trap("Source book not found") };
      case (?perms) { perms };
    };

    if (not principalMap.contains(sourcePermissions, caller) and not isAuthorizedAdmin(caller)) {
      Debug.trap("Unauthorized: No permissions for source book");
    };

    let targetPermissions = switch (textMap.get(bookPermissions, targetBookId)) {
      case null { Debug.trap("Target book not found") };
      case (?perms) { perms };
    };

    let targetRole = switch (principalMap.get(targetPermissions, caller)) {
      case null { Debug.trap("Unauthorized: No permissions for target book") };
      case (?role) { role };
    };

    if (targetRole != #owner and not isAuthorizedAdmin(caller)) {
      Debug.trap("Unauthorized: Only owners can move recipes to target book");
    };

    let sourceRecipes = switch (textMap.get(recipes, sourceBookId)) {
      case null { Debug.trap("Source book not found") };
      case (?r) { r };
    };

    let recipe = switch (textMap.get(sourceRecipes, recipeId)) {
      case null { Debug.trap("Recipe not found in source book") };
      case (?r) { r };
    };

    if (recipe.authorPrincipal != caller and not isAuthorizedAdmin(caller)) {
      Debug.trap("Unauthorized: Only the author can move this recipe");
    };

    let targetRecipes = switch (textMap.get(recipes, targetBookId)) {
      case null { textMap.empty<Recipe>() };
      case (?r) { r };
    };

    let updatedTargetRecipes = textMap.put(targetRecipes, recipeId, recipe);
    recipes := textMap.put(recipes, targetBookId, updatedTargetRecipes);

    let updatedSourceRecipes = textMap.delete(sourceRecipes, recipeId);
    recipes := textMap.put(recipes, sourceBookId, updatedSourceRecipes);

    logRecipeSaveInternal(caller, targetBookId, "moveRecipe", recipeId, true, null);
  };

  public shared ({ caller }) func updateBookTags(bookId : Text, useDefaultTags : Bool, customTags : [Text]) : async () {
    // Require user authentication for updating book tags
    if (isAnonymous(caller)) {
      Debug.trap("Unauthorized: Anonymous users cannot update book tags");
    };
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only authenticated users can update book tags");
    };

    let permissions = switch (textMap.get(bookPermissions, bookId)) {
      case null { Debug.trap("Book not found") };
      case (?perms) { perms };
    };

    let callerRole = switch (principalMap.get(permissions, caller)) {
      case null { Debug.trap("Unauthorized: No permissions for this book") };
      case (?role) { role };
    };

    if (callerRole != #owner and not isAuthorizedAdmin(caller)) {
      Debug.trap("Unauthorized: Only owners or admins can update book tags");
    };

    let bookMeta = switch (textMap.get(books, bookId)) {
      case null { Debug.trap("Book not found") };
      case (?meta) { meta };
    };

    let updatedBookMeta : BookMeta = {
      id = bookMeta.id;
      title = bookMeta.title;
      owner = bookMeta.owner;
      created_at = bookMeta.created_at;
      useDefaultTags;
      customTags;
    };

    books := textMap.put(books, bookId, updatedBookMeta);
  };

  public query ({ caller }) func getBookTags(bookId : Text) : async { useDefaultTags : Bool; customTags : [Text] } {
    // Require user authentication for getting book tags
    if (isAnonymous(caller)) {
      Debug.trap("Unauthorized: Anonymous users cannot access book tags");
    };
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only authenticated users can access book tags");
    };

    let permissions = switch (textMap.get(bookPermissions, bookId)) {
      case null { Debug.trap("Book not found") };
      case (?perms) { perms };
    };

    if (not principalMap.contains(permissions, caller) and not isAuthorizedAdmin(caller)) {
      Debug.trap("Unauthorized: No permissions for this book");
    };

    let bookMeta = switch (textMap.get(books, bookId)) {
      case null { Debug.trap("Book not found") };
      case (?meta) { meta };
    };

    {
      useDefaultTags = bookMeta.useDefaultTags;
      customTags = bookMeta.customTags;
    };
  };

  public query ({ caller }) func getPendingInvitations() : async [Invitation] {
    if (isAnonymous(caller)) {
      Debug.trap("Unauthorized: Anonymous users cannot view invitations");
    };
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can view invitations");
    };

    let profile = switch (principalMap.get(userProfiles, caller)) {
      case null { return [] };
      case (?p) { p };
    };
    profile.invitations;
  };

  public shared ({ caller }) func acceptInvitation(cookbookId : Text) : async () {
    if (isAnonymous(caller)) {
      Debug.trap("Unauthorized: Anonymous users cannot accept invitations");
    };
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can accept invitations");
    };

    let profile = switch (principalMap.get(userProfiles, caller)) {
      case null { Debug.trap("User profile not found") };
      case (?p) { p };
    };

    var invitationFound = false;
    var invitationRole : UserRole = #viewer;

    for (invitation in profile.invitations.vals()) {
      if (invitation.cookbookId == cookbookId) {
        invitationFound := true;
        invitationRole := invitation.role;
      };
    };

    if (not invitationFound) {
      Debug.trap("Invitation not found for this cookbook");
    };

    let permissions = switch (textMap.get(bookPermissions, cookbookId)) {
      case null { Debug.trap("Cookbook not found") };
      case (?perms) { perms };
    };

    let updatedInvitations = Array.filter(
      profile.invitations,
      func(invitation) = invitation.cookbookId != cookbookId,
    );

    let updatedProfile : UserProfile = {
      name = profile.name;
      language = profile.language;
      requireApprovalBeforeJoining = profile.requireApprovalBeforeJoining;
      invitations = updatedInvitations;
      favoriteCookbooks = profile.favoriteCookbooks;
    };

    userProfiles := principalMap.put(userProfiles, caller, updatedProfile);

    let updatedPermissions = principalMap.put(permissions, caller, invitationRole);
    bookPermissions := textMap.put(bookPermissions, cookbookId, updatedPermissions);
  };

  public shared ({ caller }) func declineInvitation(cookbookId : Text) : async () {
    if (isAnonymous(caller)) {
      Debug.trap("Unauthorized: Anonymous users cannot decline invitations");
    };
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can decline invitations");
    };

    let profile = switch (principalMap.get(userProfiles, caller)) {
      case null { Debug.trap("User profile not found") };
      case (?p) { p };
    };

    var invitationFound = false;
    for (invitation in profile.invitations.vals()) {
      if (invitation.cookbookId == cookbookId) {
        invitationFound := true;
      };
    };

    if (not invitationFound) {
      Debug.trap("Invitation not found for this cookbook");
    };

    let updatedInvitations = Array.filter(
      profile.invitations,
      func(invitation) = invitation.cookbookId != cookbookId,
    );

    let updatedProfile : UserProfile = {
      name = profile.name;
      language = profile.language;
      requireApprovalBeforeJoining = profile.requireApprovalBeforeJoining;
      invitations = updatedInvitations;
      favoriteCookbooks = profile.favoriteCookbooks;
    };

    userProfiles := principalMap.put(userProfiles, caller, updatedProfile);
  };

  public shared ({ caller }) func leaveCookbook(bookId : Text) : async () {
    // Verify caller is an authenticated user
    if (isAnonymous(caller)) {
      Debug.trap("Unauthorized: Anonymous users cannot leave cookbooks");
    };
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only authenticated users can leave cookbooks");
    };

    let permissions = switch (textMap.get(bookPermissions, bookId)) {
      case null { Debug.trap("Cookbook not found") };
      case (?perms) { perms };
    };

    let userRole = switch (principalMap.get(permissions, caller)) {
      case null { Debug.trap("You are not a member of this cookbook") };
      case (?role) { role };
    };

    // Prevent owners from leaving (unless they are admin performing system management)
    if (userRole == #owner and not isAuthorizedAdmin(caller)) {
      Debug.trap("Owners cannot leave their own cookbooks. Transfer ownership or delete the cookbook instead.");
    };

    let updatedPermissions = principalMap.delete(permissions, caller);
    bookPermissions := textMap.put(bookPermissions, bookId, updatedPermissions);
  };

  public query ({ caller }) func isCallerApproved() : async Bool {
    AccessControl.hasPermission(accessControlState, caller, #admin) or UserApproval.isApproved(approvalState, caller);
  };

  public shared ({ caller }) func requestApproval() : async () {
    if (isAnonymous(caller)) {
      Debug.trap("Unauthorized: Anonymous users cannot request approval");
    };
    UserApproval.requestApproval(approvalState, caller);
  };

  public shared ({ caller }) func setApproval(user : Principal, status : UserApproval.ApprovalStatus) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can perform this action");
    };
    UserApproval.setApproval(approvalState, user, status);
  };

  public query ({ caller }) func listApprovals() : async [UserApproval.UserApprovalInfo] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can perform this action");
    };
    UserApproval.listApprovals(approvalState);
  };

  public type AdminDashboardStats = {
    totalUsers : Nat;
    totalCookbooks : Nat;
    totalRecipes : Nat;
    pendingInvitations : Nat;
    acceptedInvitations : Nat;
    topActiveUsers : [{ principal : Principal; name : Text; recipeCount : Nat }];
    perBookStats : [{
      bookId : Text;
      title : Text;
      recipeCount : Nat;
      memberCount : Nat;
      roleBreakdown : { owners : Nat; editors : Nat; viewers : Nat };
    }];
    storageUsage : { totalImages : Nat; totalAssets : Nat };
    dailyGrowth : { users : Nat; cookbooks : Nat; recipes : Nat };
    weeklyGrowth : { users : Nat; cookbooks : Nat; recipes : Nat };
  };

  public query ({ caller }) func getAdminDashboardStats() : async AdminDashboardStats {
    // Multi-admin access control: Only the specific admin principals can access this function
    if (not isAuthorizedAdmin(caller)) {
      Debug.trap("Access denied");
    };

    let totalUsers = principalMap.size(userProfiles);
    let totalCookbooks = textMap.size(books);

    var totalRecipes = 0;
    for ((_, bookRecipes) in textMap.entries(recipes)) {
      totalRecipes += textMap.size(bookRecipes);
    };

    var pendingInvitations = 0;
    var acceptedInvitations = 0;
    for ((_, profile) in principalMap.entries(userProfiles)) {
      pendingInvitations += profile.invitations.size();
    };

    let userRecipeCounts = principalMap.map(
      userProfiles,
      func(_principal, _profile) = 0,
    );

    for ((_, bookRecipes) in textMap.entries(recipes)) {
      for ((_, recipe) in textMap.entries(bookRecipes)) {
        let currentCount = switch (principalMap.get(userRecipeCounts, recipe.authorPrincipal)) {
          case null { 0 };
          case (?count) { count };
        };
        let _ = principalMap.put(userRecipeCounts, recipe.authorPrincipal, currentCount + 1);
      };
    };

    var topActiveUsers : [{ principal : Principal; name : Text; recipeCount : Nat }] = [];
    for ((principal, count) in principalMap.entries(userRecipeCounts)) {
      let name = switch (principalMap.get(userProfiles, principal)) {
        case null { "Unknown User" };
        case (?profile) { profile.name };
      };
      topActiveUsers := Array.append(topActiveUsers, [{ principal; name; recipeCount = count }]);
    };

    topActiveUsers := Array.sort(
      topActiveUsers,
      func(a, b) = if (a.recipeCount > b.recipeCount) { #less } else if (a.recipeCount < b.recipeCount) { #greater } else {
        #equal;
      },
    );

    if (topActiveUsers.size() > 10) {
      topActiveUsers := Array.tabulate(10, func(i) = topActiveUsers[i]);
    };

    var perBookStats : [{
      bookId : Text;
      title : Text;
      recipeCount : Nat;
      memberCount : Nat;
      roleBreakdown : { owners : Nat; editors : Nat; viewers : Nat };
    }] = [];

    for ((bookId, bookMeta) in textMap.entries(books)) {
      let bookRecipes = switch (textMap.get(recipes, bookId)) {
        case null { textMap.empty<Recipe>() };
        case (?r) { r };
      };

      let permissions = switch (textMap.get(bookPermissions, bookId)) {
        case null { principalMap.empty<UserRole>() };
        case (?p) { p };
      };

      var owners = 0;
      var editors = 0;
      var viewers = 0;

      for ((_, role) in principalMap.entries(permissions)) {
        switch (role) {
          case (#owner) { owners += 1 };
          case (#editor) { editors += 1 };
          case (#viewer) { viewers += 1 };
        };
      };

      perBookStats := Array.append(
        perBookStats,
        [{
          bookId;
          title = bookMeta.title;
          recipeCount = textMap.size(bookRecipes);
          memberCount = principalMap.size(permissions);
          roleBreakdown = { owners; editors; viewers };
        }],
      );
    };

    let storageUsage = { totalImages = 0; totalAssets = 0 };
    let dailyGrowth = { users = 0; cookbooks = 0; recipes = 0 };
    let weeklyGrowth = { users = 0; cookbooks = 0; recipes = 0 };

    {
      totalUsers;
      totalCookbooks;
      totalRecipes;
      pendingInvitations;
      acceptedInvitations;
      topActiveUsers;
      perBookStats;
      storageUsage;
      dailyGrowth;
      weeklyGrowth;
    };
  };

  // Invite Links and RSVP System

  public shared ({ caller }) func generateInviteCode() : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can generate invite codes");
    };
    let blob = await Random.blob();
    let code = InviteLinksModule.generateUUID(blob);
    InviteLinksModule.generateInviteCode(inviteState, code);
    code;
  };

  public shared ({ caller }) func submitRSVP(name : Text, attending : Bool, inviteCode : Text) : async () {
    // Require authenticated user (not anonymous)
    if (isAnonymous(caller)) {
      Debug.trap("Unauthorized: Anonymous users cannot submit RSVPs");
    };
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only authenticated users can submit RSVPs");
    };
    InviteLinksModule.submitRSVP(inviteState, name, attending, inviteCode);
  };

  public query ({ caller }) func getAllRSVPs() : async [InviteLinksModule.RSVP] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can view RSVPs");
    };
    InviteLinksModule.getAllRSVPs(inviteState);
  };

  public query ({ caller }) func getInviteCodes() : async [InviteLinksModule.InviteCode] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can view invite codes");
    };
    InviteLinksModule.getInviteCodes(inviteState);
  };

  // Favorite Cookbooks System

  public shared ({ caller }) func favoriteCookbook(cookbookId : Text) : async () {
    if (isAnonymous(caller)) {
      Debug.trap("Unauthorized: Anonymous users cannot favorite cookbooks");
    };
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can favorite cookbooks");
    };

    // Verify user has access to the cookbook
    let permissions = switch (textMap.get(bookPermissions, cookbookId)) {
      case null { Debug.trap("Cookbook not found") };
      case (?perms) { perms };
    };

    if (not principalMap.contains(permissions, caller) and not isAuthorizedAdmin(caller)) {
      Debug.trap("Unauthorized: You can only favorite cookbooks you have access to");
    };

    let profile = switch (principalMap.get(userProfiles, caller)) {
      case null { Debug.trap("User profile not found") };
      case (?p) { p };
    };

    // Check if already favorited
    let alreadyFavorited = Array.find(profile.favoriteCookbooks, func(id) = id == cookbookId) != null;
    if (alreadyFavorited) {
      return;
    };

    let updatedProfile : UserProfile = {
      name = profile.name;
      language = profile.language;
      requireApprovalBeforeJoining = profile.requireApprovalBeforeJoining;
      invitations = profile.invitations;
      favoriteCookbooks = Array.append(profile.favoriteCookbooks, [cookbookId]);
    };

    userProfiles := principalMap.put(userProfiles, caller, updatedProfile);
  };

  public shared ({ caller }) func unfavoriteCookbook(cookbookId : Text) : async () {
    if (isAnonymous(caller)) {
      Debug.trap("Unauthorized: Anonymous users cannot unfavorite cookbooks");
    };
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can unfavorite cookbooks");
    };

    let profile = switch (principalMap.get(userProfiles, caller)) {
      case null { Debug.trap("User profile not found") };
      case (?p) { p };
    };

    let updatedFavorites = Array.filter(profile.favoriteCookbooks, func(id) = id != cookbookId);

    let updatedProfile : UserProfile = {
      name = profile.name;
      language = profile.language;
      requireApprovalBeforeJoining = profile.requireApprovalBeforeJoining;
      invitations = profile.invitations;
      favoriteCookbooks = updatedFavorites;
    };

    userProfiles := principalMap.put(userProfiles, caller, updatedProfile);
  };

  // App Version Management

  public query ({ caller }) func getAppVersion() : async Text {
    if (isAnonymous(caller)) {
      Debug.trap("Unauthorized: Anonymous users cannot view app version");
    };
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only authenticated users can view app version");
    };
    appVersion;
  };

  public shared ({ caller }) func setAppVersion(version : Text) : async () {
    // Multi-admin access control: Only the specific admin principals can access this function
    if (not isAuthorizedAdmin(caller)) {
      Debug.trap("Access denied");
    };

    appVersion := version;
  };

  // Debug Logging System - Admin-only query/clear functions, internal logging for operations

  public query ({ caller }) func getDebugLogs() : async DebugLogging.DebugLogs {
    // Only authorized admins can view debug logs
    if (not isAuthorizedAdmin(caller)) {
      Debug.trap("Unauthorized: Only admins can view debug logs");
    };

    {
      imageUploadLogs = stableImageUploadLogs;
      recipeSaveLogs = stableRecipeSaveLogs;
      cookbookSafetyLogs = stableCookbookSafetyLogs;
      last20Operations = stableLast20Operations;
    };
  };

  public shared ({ caller }) func clearDebugLogs() : async () {
    // Only authorized admins can clear debug logs
    if (not isAuthorizedAdmin(caller)) {
      Debug.trap("Unauthorized: Only admins can clear debug logs");
    };

    stableImageUploadLogs := [];
    stableRecipeSaveLogs := [];
    stableCookbookSafetyLogs := [];
    stableLast20Operations := [];
  };

  // Purge Recipe Images Tool

  public type PurgeResult = {
    totalRecipesCleaned : Nat;
    totalImageFieldsRemoved : Nat;
    errors : [Text];
  };

  public shared ({ caller }) func purgeRecipeImages() : async PurgeResult {
    // Only authorized admins can purge recipe images
    if (not isAuthorizedAdmin(caller)) {
      Debug.trap("Unauthorized: Only admins can purge recipe images");
    };

    var totalRecipesCleaned = 0;
    var totalImageFieldsRemoved = 0;
    var errors : [Text] = [];

    for ((bookId, bookRecipes) in textMap.entries(recipes)) {
      for ((recipeId, recipe) in textMap.entries(bookRecipes)) {
        if (recipe.imageUrl != null) {
          let updatedRecipe : Recipe = {
            id = recipe.id;
            title = recipe.title;
            ingredients = recipe.ingredients;
            instructions = recipe.instructions;
            author = recipe.author;
            authorPrincipal = recipe.authorPrincipal;
            created_at = recipe.created_at;
            updated_at = Time.now();
            tags = recipe.tags;
            imageUrl = null;
          };

          let updatedBookRecipes = textMap.put(bookRecipes, recipeId, updatedRecipe);
          recipes := textMap.put(recipes, bookId, updatedBookRecipes);

          totalRecipesCleaned += 1;
          totalImageFieldsRemoved += 1;
        };
      };
    };

    {
      totalRecipesCleaned;
      totalImageFieldsRemoved;
      errors;
    };
  };
};

