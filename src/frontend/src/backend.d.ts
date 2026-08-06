import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface AdminDashboardStats {
    topActiveUsers: Array<{
        principal: Principal;
        name: string;
        recipeCount: bigint;
    }>;
    storageUsage: {
        totalAssets: bigint;
        totalImages: bigint;
    };
    perBookStats: Array<{
        title: string;
        memberCount: bigint;
        bookId: string;
        roleBreakdown: {
            editors: bigint;
            owners: bigint;
            viewers: bigint;
        };
        recipeCount: bigint;
    }>;
    pendingInvitations: bigint;
    weeklyGrowth: {
        recipes: bigint;
        users: bigint;
        cookbooks: bigint;
    };
    acceptedInvitations: bigint;
    totalUsers: bigint;
    totalCookbooks: bigint;
    dailyGrowth: {
        recipes: bigint;
        users: bigint;
        cookbooks: bigint;
    };
    totalRecipes: bigint;
}
export type Time = bigint;
export interface BookMeta {
    id: string;
    title: string;
    owner: Principal;
    useDefaultTags: boolean;
    created_at: Time;
    customTags: Array<string>;
}
export interface PredefinedTag {
    en: string;
    id: string;
    sl: string;
}
export type Result__1 = {
    __kind__: "ok";
    ok: null;
} | {
    __kind__: "err";
    err: Error_;
};
export interface PurgeResult {
    totalImageFieldsRemoved: bigint;
    errors: Array<string>;
    totalRecipesCleaned: bigint;
}
export interface Invitation {
    role: UserRole;
    invitedAt: Time;
    invitedBy: Principal;
    cookbookId: string;
}
export type Error_ = {
    __kind__: "FrontendOriginsNotConfigured";
    FrontendOriginsNotConfigured: null;
} | {
    __kind__: "MixedSsoSources";
    MixedSsoSources: {
        otherKeys: Array<string>;
        ssoKeys: Array<string>;
    };
} | {
    __kind__: "Stale";
    Stale: {
        ageNs: bigint;
    };
} | {
    __kind__: "MalformedCandid";
    MalformedCandid: null;
} | {
    __kind__: "AmbiguousAttribute";
    AmbiguousAttribute: {
        field: string;
        sources: Array<string>;
    };
} | {
    __kind__: "NoAttributes";
    NoAttributes: null;
} | {
    __kind__: "UnknownNonce";
    UnknownNonce: null;
} | {
    __kind__: "UntrustedSsoSource";
    UntrustedSsoSource: {
        domain: string;
    };
} | {
    __kind__: "MissingField";
    MissingField: string;
} | {
    __kind__: "FrontendOriginMismatch";
    FrontendOriginMismatch: {
        got: string;
        expected: Array<string>;
    };
};
export interface CookbookSafetyLog {
    result: string;
    userPrincipal: Principal;
    operation: string;
    timestamp: Time;
    details: string;
}
export interface InviteCode {
    created: Time;
    code: string;
    used: boolean;
}
export interface RSVP {
    name: string;
    inviteCode: string;
    timestamp: Time;
    attending: boolean;
}
export interface RecipeSaveLog {
    recipesArrayStatus: string;
    errors?: string;
    cookbookId: string;
    dataSent: string;
    userPrincipal: Principal;
    timestamp: Time;
    fieldDifferences: string;
    afterSnapshot: string;
    beforeSnapshot: string;
}
export interface UserApprovalInfo {
    status: ApprovalStatus;
    principal: Principal;
}
export interface DebugLogs {
    last20Operations: Array<OperationSummary>;
    cookbookSafetyLogs: Array<CookbookSafetyLog>;
    imageUploadLogs: Array<ImageUploadLog>;
    recipeSaveLogs: Array<RecipeSaveLog>;
}
export interface Result {
    hasMore: boolean;
    rows: Array<Array<Cell>>;
}
export interface OperationSummary {
    result: string;
    detailsLink: string;
    operationType: string;
    timestamp: Time;
}
export interface Ingredient {
    text: string;
    ingredientType: Variant_ingredient_section;
}
export interface ImageUploadLog {
    result: {
        __kind__: "failure";
        failure: string;
    } | {
        __kind__: "success";
        success: string;
    };
    duration: bigint;
    isMobile: boolean;
    mimeType: string;
    fileName: string;
    fileSize: bigint;
    platform: string;
    userPrincipal: Principal;
    timestamp: Time;
    userAgent: string;
}
export interface Cell {
    value: Value;
    name: string;
}
export interface Recipe {
    id: string;
    title: string;
    updated_at: Time;
    tags: Array<string>;
    created_at: Time;
    instructions: string;
    author: string;
    imageUrl?: string;
    ingredients: Array<Ingredient>;
    authorPrincipal: Principal;
}
export type Value = {
    __kind__: "int";
    int: bigint;
} | {
    __kind__: "nat";
    nat: bigint;
} | {
    __kind__: "float";
    float: number;
} | {
    __kind__: "bool";
    bool: boolean;
} | {
    __kind__: "null";
    null: null;
} | {
    __kind__: "text";
    text: string;
};
export interface UserProfile {
    name: string;
    requireApprovalBeforeJoining: boolean;
    language: string;
    favoriteCookbooks: Array<string>;
    invitations: Array<Invitation>;
}
export enum ApprovalStatus {
    pending = "pending",
    approved = "approved",
    rejected = "rejected"
}
export enum UserRole {
    owner = "owner",
    editor = "editor",
    viewer = "viewer"
}
export enum UserRole__1 {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export enum Variant_ingredient_section {
    ingredient = "ingredient",
    section = "section"
}
export interface backendInterface {
    acceptInvitation(cookbookId: string): Promise<void>;
    addRecipe(bookId: string, title: string, ingredients: Array<Ingredient>, instructions: string, tags: Array<string>, imageUrl: string | null): Promise<string>;
    assignCallerUserRole(user: Principal, role: UserRole__1): Promise<void>;
    changeUserRole(bookId: string, user: Principal, newRole: UserRole): Promise<void>;
    clearDebugLogs(): Promise<void>;
    copyRecipe(sourceBookId: string, recipeId: string, targetBookId: string): Promise<string>;
    createBook(title: string, useDefaultTags: boolean, customTags: Array<string>): Promise<string>;
    declineInvitation(cookbookId: string): Promise<void>;
    deleteBook(bookId: string): Promise<void>;
    deleteRecipe(bookId: string, recipeId: string): Promise<void>;
    editRecipe(bookId: string, recipeId: string, title: string, ingredients: Array<Ingredient>, instructions: string, tags: Array<string>, imageUrl: string | null): Promise<void>;
    execute(qJson: string): Promise<Result>;
    favoriteCookbook(cookbookId: string): Promise<void>;
    generateInviteCode(): Promise<string>;
    getAdminDashboardStats(): Promise<AdminDashboardStats>;
    getAllRSVPs(): Promise<Array<RSVP>>;
    getAllTags(bookId: string): Promise<Array<string>>;
    getAppVersion(): Promise<string>;
    getBookMeta(bookId: string): Promise<BookMeta | null>;
    getBookTags(bookId: string): Promise<{
        useDefaultTags: boolean;
        customTags: Array<string>;
    }>;
    getBooksForUser(): Promise<Array<{
        id: string;
        title: string;
        owner: Principal;
        useDefaultTags: boolean;
        created_at: Time;
        is_favorite: boolean;
        customTags: Array<string>;
    }>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole__1>;
    getDebugLogs(): Promise<DebugLogs>;
    getInviteCodes(): Promise<Array<InviteCode>>;
    getPendingInvitations(): Promise<Array<Invitation>>;
    getPredefinedTags(): Promise<Array<PredefinedTag>>;
    getRecipe(bookId: string, recipeId: string): Promise<Recipe | null>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getUserRole(bookId: string): Promise<UserRole | null>;
    initializeAccessControl(): Promise<void>;
    inviteUser(bookId: string, user: Principal, role: UserRole): Promise<string>;
    isCallerAdmin(): Promise<boolean>;
    isCallerApproved(): Promise<boolean>;
    isPredefinedTag(tag: string): Promise<boolean>;
    leaveCookbook(bookId: string): Promise<void>;
    listApprovals(): Promise<Array<UserApprovalInfo>>;
    listBookMembers(bookId: string): Promise<Array<{
        principal: Principal;
        name: string;
        role: UserRole;
    }>>;
    listRecipes(bookId: string): Promise<Array<Recipe>>;
    moveRecipe(sourceBookId: string, recipeId: string, targetBookId: string): Promise<void>;
    purgeRecipeImages(): Promise<PurgeResult>;
    removeUser(bookId: string, user: Principal): Promise<void>;
    renameBook(bookId: string, newTitle: string): Promise<void>;
    requestApproval(): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    schema(): Promise<string>;
    setAppVersion(version: string): Promise<void>;
    setApproval(user: Principal, status: ApprovalStatus): Promise<void>;
    submitRSVP(name: string, attending: boolean, inviteCode: string): Promise<void>;
    unfavoriteCookbook(cookbookId: string): Promise<void>;
    updateBookTags(bookId: string, useDefaultTags: boolean, customTags: Array<string>): Promise<void>;
}
