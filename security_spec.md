# Security Specifications & Hardening Plan

This document outlines the security invariants, vulnerable payloads ("Dirty Dozen"), and validation criteria to safeguard the Corporate Prode Web application database.

## 1. Data Invariants

- **Forecast Lockout Invariant**: No user can create or update a Forecast document within 1 hour of the kickoff time (`matchDate`) of the target match.
- **Points Immortality Invariant**: Standard employees cannot modify their own accumulated `points` or escalate their `isAdmin` status in their profile.
- **Relational Integrity Invariant**: A Forecast document can only be created if the referenced `matchId` exists in the `/matches` collection.
- **Identity Invariant**: A user can only submit forecasts where the `userId` matches their authenticated `request.auth.uid`.

## 2. The "Dirty Dozen" Poison Payloads (PERMISSION_DENIED Targets)

1. **Self-Escalation**: User attempts to update `/users/{userId}` to set `"isAdmin": true`.
2. **Self-Awarding Points**: User attempts to update `/users/{userId}` to set `"points": 999`.
3. **Late Forecast Submission**: User attempts to create a `/forecasts` document for a match whose kickoff is 30 minutes in the future (violating the 1-hour buffer).
4. **Late Forecast Modification**: User attempts to update an existing forecast for a match that starts in 45 minutes.
5. **Score Value Poisoning**: User submits a forecast with ridiculous integer sizes (e.g. `homeScore: 999999999999`).
6. **Negative Score Input**: User submits a forecast with negative goals (e.g. `homeScore: -3`).
7. **Identity Spoofing**: User 'A' (`uid: alice`) attempts to change or create a forecast for User 'B' (`uid: bob`).
8. **Match Creation by Employee**: Standard user attempts to write a new Match document into `/matches`.
9. **Unauthenticated Query Scrape**: An unauthenticated request attempts to list all forecasts.
10. **Ghost Field Injection**: User attempts to add a custom field `"isWinner": true` to a forecast document.
11. **Spoofed Admin Request**: User with email `darigles1@gmail.com` but `email_verified: false` attempts to create/edit a Match.
12. **Orphaned Forecast**: User submits a forecast pointing to a non-existent `matchId`.

## 3. Production Rules Verification

These rules are enforced in `firestore.rules` and tested via simulation to confirm all unauthorized writes meet immediate `PERMISSION_DENIED` errors.
