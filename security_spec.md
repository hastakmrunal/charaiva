# Charaiva Firestore Security Specification

## 1. Data Invariants
1. User PII (`email`, `name`) is strictly isolated inside `/users/{userId}/private/profile` and is never readable or listable by any user other than the verified owner (`request.auth.uid == userId && request.auth.token.email_verified == true`).
2. User guide preferences and onboarding progress reside inside `/users/{userId}/preferences/guide`, strictly accessible only to the verified owner.
3. All writes enforce strict field allowlisting (`keys().hasAll(...) && keys().hasOnly(...)`) on creation and `affectedKeys().hasOnly(...)` on update, plus server timestamp enforcement (`request.time`), preventing shadow fields, spoofed `uid` ownership, or backdated timestamps.
4. User travel journal logs reside exclusively at `/users/{userId}/journalEntries/{journalId}`, strictly scoped to `request.auth.uid == userId && request.auth.token.email_verified == true` and `resource.data.userId == request.auth.uid` for both `get` and `list` queries.
5. No cross-user collection `list` permissions exist anywhere in the ruleset; default-deny catch-all (`/{document=**}`) blocks all unlisted paths.

## 2. Adversarial "Dirty Dozen" Payloads (All Must Return PERMISSION_DENIED)
1. Unauthenticated read/list of `/users/userA/private/profile` or `/users/userA/journalEntries` (`request.auth == null`).
2. Cross-user read/list of `/users/userA/journalEntries` while authenticated as `userB`.
3. Cross-user write/delete to `/users/userA/journalEntries/j1` while authenticated as `userB`.
4. Spoofed `uid` or `userId` inside create payload (`userId: "userB"` under `/users/userA/journalEntries/j1`).
5. Unverified email write (`request.auth.token.email_verified == false`) attempting to create profile or journal entry.
6. Shadow field injection on profile/journal create (`extraAdminFlag: true` or `role: "admin"`).
7. Shadow field injection on preferences or journal update (`isPremium: true` or mutating `userId`/`journalId`).
8. Oversized string resource-exhaustion write (`placeName` > 160 chars, `notes` > 2000 chars, or base64 image in `imageUrl` > 600 chars).
9. Invalid `userId` or `journalId` path variable (`userA$bad!` failing `^[a-zA-Z0-9_\-]+$`).
10. Client-forged timestamp on create/update (`updatedAt: Timestamp.fromDate(new Date(0))` instead of `request.time`).
11. Mutating immutable `createdAt`, `journalId`, or `userId` during journal update.
12. Invalid `topics` map or unbounded/non-string `tags` / `keyFacts` arrays (> 12 items or non-string first element).
