# ZGoogies — Enhancement Backlog Proposals

Generated: 2026-05-05

## Priority Summary

| # | Enhancement | Priority | Effort | Impact |
|---|------------|----------|--------|--------|
| 1 | Live Game Tracking & Notifications | High | Medium | High |
| 2 | Head-to-Head Player Comparison | High | Low | Medium |
| 3 | Prediction Analytics Dashboard | High | Medium | High |
| 4 | Group / Mini-League System | Lower | High | High |
| 5 | Prediction Streaks & Achievements / Badges | Medium | Medium | Medium |
| 6 | Admin: Bulk Score Import | Lower | Low | Low |
| 7 | Prediction Confidence / Joker Round | Medium | Low | Medium |
| 8 | Comments & Discussion on Games | Medium | Medium | Medium |
| 9 | Smarter Email Notifications | Medium | Medium | Medium |
| 10 | Admin Audit Log | High | Low | High |

---

## 1. Live Game Tracking & Notifications

**Problem:** Users have no way to know when a game is being scored or when rankings shift.

**Recommendation:** Add push notifications (via Web Push API or email) when game scores are entered. A "live feed" widget on the Predictions page could show recently scored games and point gains in real-time using Server-Sent Events. This is the highest-impact UX change since it converts a passive check-back app into an engaging one.

---

## 2. Head-to-Head Player Comparison

**Problem:** Rankings show rank/points but users can't easily compare themselves to a specific rival.

**Recommendation:** Add a `/players/:id/compare/:id2` view (or a compare modal on PlayersPage) showing side-by-side: points per game, prediction accuracy, best/worst rounds, and a shared game-by-game breakdown. Data is already in the DB; this is mostly frontend work.

---

## 3. Prediction Analytics Dashboard (per user)

**Problem:** Users see their total points but not any insight into their prediction style or weaknesses.

**Recommendation:** Add a personal stats section in AccountPage or a dedicated `/stats` page showing:
- Accuracy rate by match type (group vs knockout)
- Average prediction deviation from actual score
- Best/worst rounds
- Comparison to group average

This makes the app more sticky — users return to review their patterns, not just check rank.

---

## 4. Group / Mini-League System

**Problem:** Friends may want a private competition within the larger pool.

**Recommendation:** Allow users to create named groups (with an invite code) and view a subset leaderboard for just those members. This is a significant backend addition (`Group`, `GroupMembership` models) but transforms the social dynamic — especially for friend groups all playing together.

---

## 5. Prediction Streaks & Achievements / Badges

**Problem:** There's no gamification beyond raw points.

**Recommendation:** Track streaks (e.g., "5 correct results in a row") and award visible badges (shown on player profile) for milestones: first exact score, top 3 in a round, most improved, etc. Badges stored in a `UserAchievement` table. Low implementation cost, high engagement return.

---

## 6. Admin: Bulk Score Import

**Problem:** Entering scores one-by-one in the Admin panel during a busy tournament day is tedious.

**Recommendation:** Add a CSV/JSON import or a multi-game scoring form that lets the admin enter multiple final scores in one submission. Also useful for seeding historical data.

---

## 7. Prediction Confidence / Joker Round

**Problem:** Every prediction is weighted equally (except the final round multiplier).

**Recommendation:** Allow each user to designate one "joker" game per round (or per tournament) where their points are doubled. This adds strategic depth without breaking the core scoring system. Requires adding an `is_joker` flag to `Prediction` and a small scoring logic change.

---

## 8. Comments & Discussion on Games

**Problem:** Community discussion happens only in News articles; there's no place to discuss specific matches.

**Recommendation:** Add a `GameComment` model (reusing the NewsComment pattern) and a comment section visible after a game's prediction deadline passes. This creates natural post-game discussion without admin authorship requirements.

**Status:** Design proposal written — see `design_game_comments.md`.

---

## 9. Smarter Email Notifications

**Problem:** Email is currently used only for password reset and payment confirmation.

**Recommendation:** Add opt-in email digests:
- Daily summary of upcoming games with prediction deadlines (24h before)
- Weekly round recap (rank change, points earned, top scorer)

Store preferences as `AppSetting` or a `UserPreference` model. The email infrastructure (`email_service`) is already in place.

---

## 10. Admin Audit Log

**Problem:** There's no visibility into admin actions (who scored what game, when, who changed a role).

**Recommendation:** Extend `AccessLog` (or add an `AdminAuditLog` model) to record admin actions: score entries/rollbacks, payment changes, role changes, winner resets. Critical for transparency in a money-involved competition.
