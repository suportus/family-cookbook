import Time "mo:base/Time";
import Principal "mo:base/Principal";

module {
  public type ImageUploadLog = {
    timestamp : Time.Time;
    userAgent : Text;
    fileName : Text;
    fileSize : Nat;
    mimeType : Text;
    duration : Nat;
    result : {
      #success : Text;
      #failure : Text;
    };
    platform : Text;
    isMobile : Bool;
    userPrincipal : Principal;
  };

  public type RecipeSaveLog = {
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

  public type CookbookSafetyLog = {
    timestamp : Time.Time;
    operation : Text;
    details : Text;
    result : Text;
    userPrincipal : Principal;
  };

  public type OperationSummary = {
    timestamp : Time.Time;
    operationType : Text;
    result : Text;
    detailsLink : Text;
  };

  public type DebugLogs = {
    imageUploadLogs : [ImageUploadLog];
    recipeSaveLogs : [RecipeSaveLog];
    cookbookSafetyLogs : [CookbookSafetyLog];
    last20Operations : [OperationSummary];
  };
};
