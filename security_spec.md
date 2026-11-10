# Charaiva Firestore Security Specification

## 1. Data Invariants
1. User PII (`email`, `name`) is strictly isolated inside `/users/{userId}/private/profile` and is never readable or listable by any user other than the verified owner (`request.auth.uid == userId && request.auth.token.email_verified == true`).
2. User guide preferences and onboarding progress reside inside `/users/{userId}/preferences/guide`, strictly accessible only to the verified owner.
3. All writes enforce strict field allowlisting (`keys().hasAll(...) && keys().hasOnly(...)`) on creation and `affectedKeys().hasOnly(...)` on update, plus server timestamp enforcement (`request.time`), preventing shadow fields, spoofed `uid` ownership, or backdated timestamps.
4. No collection-wide `list` permissions exist anywhere in the ruleset; default-deny catch-all (`/{document=**}`) blocks all unlisted paths.

## 2. Adversarial "Dirty Dozen" Payloads (All Must Return PERMISSION_DENIED)
1. Unauthenticated read of `/users/userA/private/profile` (`request.auth == null`).
2. Cross-user read of `/users/userA/private/profile` while authenticated as `userB`.
3. Cross-user write to `/users/userA/preferences/guide` while authenticated as `userB`.
4. Spoofed `uid` inside `/users/userA/private/profile` payload (`uid: "userB"`).
5. Unverified email write (`request.auth.token.email_verified == false`) attempting to create `/users/userA/private/profile`.
6. Shadow field injection on profile create (`extraAdminFlag: true` or `role: "admin"`).
7. Shadow field injection on preferences update (`isPremium: true`).
8. Oversized string resource-exhaustion write (`name` > 80 chars or `manualCityName` > 100 chars).
9. Invalid `userId` path variable (`userA$bad!` failing `^[a-zA-Z0-9_\-]+$`).
10. Client-forged timestamp on create/update (`updatedAt: Timestamp.fromDate(new Date(0))` instead of `request.time`).
11. Mutating immutable `createdAt` or `uid` during profile update.
12. Invalid `topics` map missing keys or injecting non-boolean values into `topics`.
