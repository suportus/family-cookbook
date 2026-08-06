import OrderedMap "mo:base/OrderedMap";
import CoreMap "mo:core/Map";
import Principal "mo:core/Principal";
import Text "mo:core/Text";
import Time "mo:core/Time";

module {
  // This migration upgrades a previously-deployed canister whose stable
  // signature included a `storage` field (from the now-removed blob-storage
  // dependency). The new actor drops `storage` entirely; every other stable
  // field is carried forward unchanged (same types — this migration only
  // restructures initialization, it does not change field types).
  //
  // OldActor mirrors the PREVIOUS canister's stable signature (all 17 fields,
  // including `storage`). NewActor mirrors the CURRENT actor body (16 fields,
  // no `storage`). The migration function carries each field forward by
  // identity and simply omits `storage` — that omission is the explicit
  // discard the M0169 compatibility check requires.

  // Inlined stable types — must stay self-contained (no project imports).
  //
  // Two different Map implementations are in play here, and the migration
  // must produce values whose types EXACTLY match the actor body in main.mo:
  //
  //   - main.mo's OWN fields (userProfiles, books, bookPermissions, recipes)
  //     use mo:base/OrderedMap (Node-based). The migration must produce
  //     OrderedMap.Map values for these.
  //
  //   - The package state fields (accessControlState, approvalState,
  //     inviteState) come from mops packages whose state types use
  //     mo:core/Map (Tree-based) internally. The migration must produce
  //     CoreMap.Map values for these so the NewActor field types match the
  //     `let accessControlState : AccessControl.AccessControlState` (etc.)
  //     declarations in main.mo.
  //
  // mo:core/Map and mo:base/OrderedMap have different internal representations
  // (Tree vs Node) and are NOT interchangeable — using the wrong one causes
  // M0170 compatibility errors.

  type UserRole = {
    #owner;
    #editor;
    #viewer;
  };

  type Invitation = {
    cookbookId : Text;
    invitedBy : Principal;
    invitedAt : Time.Time;
    role : UserRole;
  };

  type UserProfile = {
    name : Text;
    language : Text;
    requireApprovalBeforeJoining : Bool;
    invitations : [Invitation];
    favoriteCookbooks : [Text];
  };

  type BookMeta = {
    id : Text;
    title : Text;
    owner : Principal;
    created_at : Time.Time;
    useDefaultTags : Bool;
    customTags : [Text];
  };

  type Ingredient = {
    text : Text;
    ingredientType : { #ingredient; #section };
  };

  type Recipe = {
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

  type PredefinedTag = {
    id : Text;
    en : Text;
    sl : Text;
  };

  // Inlined state types from mops packages. These mirror the EXACT state
  // type definitions in the package sources, which use mo:core/Map
  // (Tree-based) — NOT mo:base/OrderedMap.
  //
  //   caffeineai-authorization:  AccessControlState.userRoles : Map.Map<Principal, UserRole>
  //   caffeineai-user-approval:  UserApprovalState.approvalStatus : Map.Map<Principal, ApprovalStatus>
  //   caffeineai-invite-links:   InviteLinksSystemState.rsvps/inviteCodes : Map.Map<Text, ...>

  type AccessControlUserRole = {
    #admin;
    #user;
    #guest;
  };

  // OldAccessControlState mirrors the PREVIOUS canister's stable field shape.
  // The OLD canister used VENDORED local copies of caffeineai-authorization
  // that imported mo:base/OrderedMap (red-black tree, Node-based), so
  // `userRoles` was an OrderedMap.Map. The new package type
  // (AccessControlState below) uses mo:core/Map (B-tree) and declares
  // `userRoles` as an immutable field. The two Map representations are
  // structurally incompatible, so the migration must CONVERT the old
  // OrderedMap into a new CoreMap (iterate + rebuild) — identity carry-
  // forward triggers M0170.
  type OldAccessControlState = {
    var adminAssigned : Bool;
    var userRoles : OrderedMap.Map<Principal, AccessControlUserRole>;
  };

  // AccessControlState mirrors the CURRENT package type from
  // caffeineai-authorization: `userRoles` is an immutable (non-var) field
  // backed by mo:core/Map (B-tree). The migration body converts the old
  // OrderedMap into a CoreMap and rebuilds the record with an immutable
  // `userRoles` field.
  type AccessControlState = {
    var adminAssigned : Bool;
    userRoles : CoreMap.Map<Principal, AccessControlUserRole>;
  };

  type ApprovalStatus = {
    #approved;
    #rejected;
    #pending;
  };

  // OldUserApprovalState mirrors the PREVIOUS canister: the old vendored
  // caffeineai-user-approval used mo:base/OrderedMap for `approvalStatus`.
  // The new package type (UserApprovalState below) uses mo:core/Map.
  type OldUserApprovalState = {
    var approvalStatus : OrderedMap.Map<Principal, ApprovalStatus>;
  };

  type UserApprovalState = {
    var approvalStatus : CoreMap.Map<Principal, ApprovalStatus>;
  };

  type RSVP = {
    name : Text;
    attending : Bool;
    timestamp : Time.Time;
    inviteCode : Text;
  };

  type InviteCode = {
    code : Text;
    created : Time.Time;
    used : Bool;
  };

  // OldInviteLinksSystemState mirrors the PREVIOUS canister: the old vendored
  // caffeineai-invite-links used mo:base/OrderedMap for `rsvps` and
  // `inviteCodes`. The new package type (InviteLinksSystemState below) uses
  // mo:core/Map.
  type OldInviteLinksSystemState = {
    var rsvps : OrderedMap.Map<Text, RSVP>;
    var inviteCodes : OrderedMap.Map<Text, InviteCode>;
  };

  type InviteLinksSystemState = {
    var rsvps : CoreMap.Map<Text, RSVP>;
    var inviteCodes : CoreMap.Map<Text, InviteCode>;
  };

  // Inlined debug-logging types (from src/backend/debug-logging.mo).
  type ImageUploadLog = {
    timestamp : Time.Time;
    userAgent : Text;
    fileName : Text;
    fileSize : Nat;
    mimeType : Text;
    duration : Nat;
    result : { #success : Text; #failure : Text };
    platform : Text;
    isMobile : Bool;
    userPrincipal : Principal;
  };

  type RecipeSaveLog = {
    timestamp : Time.Time;
    cookbookId : Text;
    dataSent : Text;
    recipesArrayStatus : Text;
    fieldDifferences : Text;
    beforeSnapshot : Text;
    afterSnapshot : Text;
    errors : ?Text;
    userPrincipal : Principal;
  };

  type CookbookSafetyLog = {
    timestamp : Time.Time;
    operation : Text;
    details : Text;
    result : Text;
    userPrincipal : Principal;
  };

  type OperationSummary = {
    timestamp : Time.Time;
    operationType : Text;
    result : Text;
    detailsLink : Text;
  };

  // OldActor mirrors the PREVIOUS canister's stable signature. It includes
  // every stable field the deployed canister exposed — including `storage`,
  // which the new actor drops. The `storage` field used the blob-storage
  // Storage type from a now-removed dependency; we type it as its concrete
  // old shape (`{ var authorizedPrincipals : [Principal]; var blobTodeletete : [Blob] }`)
  // rather than `Any` so the M0216 stable-compatibility check accepts it.
  //
  // The three package state fields (accessControlState, approvalState,
  // inviteState) use the Old* variants whose inner maps are typed as
  // mo:base/OrderedMap (Node-based) — matching the OLD canister, which used
  // vendored local copies of these packages that imported mo:base/OrderedMap.
  // The migration body CONVERTS each OrderedMap into a mo:core/Map (B-tree)
  // to match the new package state types in NewActor.
  //
  // main.mo's OWN map fields (userProfiles, books, bookPermissions, recipes)
  // use mo:base/OrderedMap in BOTH OldActor and NewActor — they do not change
  // representation, so they are carried forward by identity.
  type OldActor = {
    accessControlState : OldAccessControlState;
    approvalState : OldUserApprovalState;
    inviteState : OldInviteLinksSystemState;
    ADMIN_PRINCIPAL_IDS : [Text];
    ANONYMOUS_PRINCIPAL : Principal;
    MAX_IMAGE_URL_SIZE : Nat;
    var appVersion : Text;
    var stableImageUploadLogs : [ImageUploadLog];
    var stableRecipeSaveLogs : [RecipeSaveLog];
    var stableCookbookSafetyLogs : [CookbookSafetyLog];
    var stableLast20Operations : [OperationSummary];
    var userProfiles : OrderedMap.Map<Principal, UserProfile>;
    predefinedTags : [PredefinedTag];
    var books : OrderedMap.Map<Text, BookMeta>;
    var bookPermissions : OrderedMap.Map<Text, OrderedMap.Map<Principal, UserRole>>;
    var recipes : OrderedMap.Map<Text, OrderedMap.Map<Text, Recipe>>;
    storage : { var authorizedPrincipals : [Principal]; var blobTodeletete : [Blob] };
  };

  // NewActor enumerates every stable field declared in the CURRENT main.mo,
  // with a value for each. Field names and mutability (let vs var) must match
  // the actor body. `storage` is intentionally absent — it is the explicit
  // discard this migration performs.
  //
  // The package state fields use mo:core/Map (Tree-based) to match the
  // package state types; main.mo's own map fields use mo:base/OrderedMap
  // (Node-based) to match main.mo's stable declarations.
  type NewActor = {
    accessControlState : AccessControlState;
    approvalState : UserApprovalState;
    inviteState : InviteLinksSystemState;
    ADMIN_PRINCIPAL_IDS : [Text];
    ANONYMOUS_PRINCIPAL : Principal;
    MAX_IMAGE_URL_SIZE : Nat;
    var appVersion : Text;
    var stableImageUploadLogs : [ImageUploadLog];
    var stableRecipeSaveLogs : [RecipeSaveLog];
    var stableCookbookSafetyLogs : [CookbookSafetyLog];
    var stableLast20Operations : [OperationSummary];
    var userProfiles : OrderedMap.Map<Principal, UserProfile>;
    predefinedTags : [PredefinedTag];
    var books : OrderedMap.Map<Text, BookMeta>;
    var bookPermissions : OrderedMap.Map<Text, OrderedMap.Map<Principal, UserRole>>;
    var recipes : OrderedMap.Map<Text, OrderedMap.Map<Text, Recipe>>;
  };

  public func migration(old : OldActor) : NewActor {
    // Carry every stable field forward from the previous canister.
    //
    // The three package state fields (accessControlState, approvalState,
    // inviteState) require CONVERSION, not identity carry-forward:
    //   - The OLD canister used vendored local copies of caffeineai-
    //     authorization / caffeineai-user-approval / caffeineai-invite-links
    //     that imported mo:base/OrderedMap (red-black tree, Node-based).
    //   - The NEW canister uses the mops packages whose state types use
    //     mo:core/Map (B-tree, structurally different from OrderedMap).
    // The two Map representations are NOT interchangeable, so each old
    // OrderedMap is iterated (via an OrderedMap.Operations instance built
    // with the key's compare function) and rebuilt into a CoreMap via a
    // manual loop (CoreMap.empty + CoreMap.add). We avoid CoreMap.fromIter
    // because the deploy's biome auto-formatter (M0237) strips the compare
    // argument from multi-line fromIter calls, leaving a dangling comma
    // that causes M0001 syntax errors. No variant conversion is needed —
    // the old canister already used the package's variant types
    // (#admin/#user/#guest for userRoles, #approved/#rejected/#pending
    // for approvalStatus).
    //
    // main.mo's OWN map fields (userProfiles, books, bookPermissions, recipes)
    // use mo:base/OrderedMap in both the old and new actor, so they are
    // carried forward by identity with no conversion.
    //
    // `old.storage` is intentionally NOT referenced in the output record;
    // that omission is the explicit discard of the removed blob-storage
    // field (the M0169 check requires the migration to acknowledge it
    // rather than silently drop it).

    // OrderedMap.Operations instances — one per key type — needed to
    // iterate the old OrderedMap.Map values. mo:base/OrderedMap exposes
    // iteration only through the Operations class (Map.Make(compare)).
    let principalOrdered = OrderedMap.Make(Principal.compare);
    let textOrdered = OrderedMap.Make(Text.compare);

    // Convert accessControlState.userRoles: OrderedMap -> CoreMap.
    // Manual loop instead of CoreMap.fromIter to survive biome auto-formatting
    // (biome M0237 strips the compare arg from multi-line fromIter calls).
    let newUserRoles = CoreMap.empty<Principal, AccessControlUserRole>();
    for ((key, value) in principalOrdered.entries(old.accessControlState.userRoles)) {
      newUserRoles.add(key, value);
    };

    // Convert approvalState.approvalStatus: OrderedMap -> CoreMap.
    let newApprovalStatus = CoreMap.empty<Principal, ApprovalStatus>();
    for ((key, value) in principalOrdered.entries(old.approvalState.approvalStatus)) {
      newApprovalStatus.add(key, value);
    };

    // Convert inviteState.rsvps and inviteState.inviteCodes:
    // OrderedMap -> CoreMap (both keyed by Text).
    let newRsvps = CoreMap.empty<Text, RSVP>();
    for ((key, value) in textOrdered.entries(old.inviteState.rsvps)) {
      newRsvps.add(key, value);
    };
    let newInviteCodes = CoreMap.empty<Text, InviteCode>();
    for ((key, value) in textOrdered.entries(old.inviteState.inviteCodes)) {
      newInviteCodes.add(key, value);
    };

    {
      accessControlState = {
        var adminAssigned = old.accessControlState.adminAssigned;
        userRoles = newUserRoles;
      };
      approvalState = {
        var approvalStatus = newApprovalStatus;
      };
      inviteState = {
        var rsvps = newRsvps;
        var inviteCodes = newInviteCodes;
      };
      ADMIN_PRINCIPAL_IDS = old.ADMIN_PRINCIPAL_IDS;
      ANONYMOUS_PRINCIPAL = old.ANONYMOUS_PRINCIPAL;
      MAX_IMAGE_URL_SIZE = old.MAX_IMAGE_URL_SIZE;
      var appVersion = old.appVersion;
      var stableImageUploadLogs = old.stableImageUploadLogs;
      var stableRecipeSaveLogs = old.stableRecipeSaveLogs;
      var stableCookbookSafetyLogs = old.stableCookbookSafetyLogs;
      var stableLast20Operations = old.stableLast20Operations;
      var userProfiles = old.userProfiles;
      predefinedTags = old.predefinedTags;
      var books = old.books;
      var bookPermissions = old.bookPermissions;
      var recipes = old.recipes;
    };
  };
};
