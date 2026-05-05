# Design Proposal: Game Comments

**Backlog item #8** | Status: Design phase | Date: 2026-05-05

---

## Problem Statement

Discussion naturally happens after a match closes — who predicted what, why the result was surprising, tactical post-mortems. Currently there is nowhere in the app to do this. The News comment system is close but requires admin/cashier authorship to start a thread. There is no per-game discussion space owned by the players themselves.

---

## Goals

- Let any authenticated player comment on any game at any time
- Allow users to edit and delete their own comments
- Surface comment counts on game cards so users know a discussion exists
- Reuse patterns already established in `NewsComment` to minimize new code
- Keep moderation simple: users edit/delete their own, admins delete any

## Non-Goals

- Replies/threads (flat list only, simpler and sufficient)
- Rich text or emoji reactions on comments (out of scope)
- Anonymous or guest comments

---

## Access Rules

| Action | Who | When |
|--------|-----|------|
| Read comments | Any authenticated user | Any time |
| Post comment | Any authenticated, paid user | Any time |
| Edit comment | Comment owner | Any time after posting |
| Delete comment | Comment owner or admin | Any time |

- Admin/cachier can post at any time, same as players
- Admin can delete any comment; users can only delete their own

**Rationale for "paid only" restriction:** Unpaid users can't submit predictions, so they have less stake in games and a lower bar for bad-faith posts.

---

## Data Model

### New table: `game_comments`

Mirrors `news_comments` almost exactly:

```python
class GameComment(db.Model):
    __tablename__ = 'game_comments'

    id           = db.Column(db.Integer, primary_key=True)
    game_id      = db.Column(db.Integer, db.ForeignKey('games.id', ondelete='CASCADE'), nullable=False)
    user_id      = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    content      = db.Column(db.Text, nullable=False)
    created_at   = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at   = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    game = db.relationship('Game', backref=db.backref('comments', lazy='dynamic',
                           cascade='all, delete-orphan', order_by='GameComment.created_at'))
    user = db.relationship('User', backref='game_comments')
```

**Constraints:**
- `content` max 1000 characters (same as news comments)
- No unique constraint — multiple comments per user per game are allowed
- Cascade delete when game or user is deleted

**Migration:** One `flask db migrate` to add the table; no changes to existing tables.

---

## API Endpoints

New blueprint at `/api/games/<game_id>/comments`, added to the existing `games` blueprint.

### `GET /api/games/<game_id>/comments`

Returns all comments for a game. Requires authentication.

**Response 200:**
```json
[
  {
    "id": 42,
    "content": "Knew Brazil would win, that defence is unreal",
    "user": {
      "id": 7,
      "username": "jsmith",
      "first_name": "John",
      "surname": "Smith"
    },
    "created_at": "2026-07-10T21:15:00",
    "updated_at": "2026-07-10T21:15:00",
    "is_own": true,
    "is_edited": false
  }
]
```

`is_own` flag lets the frontend show edit/delete buttons without a separate ownership check. `is_edited` is `true` when `updated_at` differs from `created_at`, used to show an "(edited)" label.

**Error cases:**
- `401` — not authenticated
- `404` — game not found

---

### `POST /api/games/<game_id>/comments`

Creates a comment. Requires authentication + `has_paid`.

**Request body:**
```json
{ "content": "Great result!" }
```

**Validations:**
- `content` present and non-empty after strip
- `content` ≤ 1000 characters
- User `has_paid` (else `403`)

**Response 201:**
```json
{
  "message": "Comment added",
  "comment": { ... }   // same shape as list item
}
```

---

### `PUT /api/games/comments/<comment_id>`

Edits a comment. Only the comment owner may edit; admins may not edit others' comments.

**Request body:**
```json
{ "content": "Updated thought on that match" }
```

**Validations:**
- `content` present and non-empty after strip
- `content` ≤ 1000 characters
- Requestor is the comment owner (else `403`)

**Response 200:**
```json
{
  "message": "Comment updated",
  "comment": { ... }   // same shape as list item, is_edited will now be true
}
```

---

### `DELETE /api/games/comments/<comment_id>`

Deletes a comment. User can delete their own; admin can delete any.

**Response 200:** `{"message": "Comment deleted"}`
**Response 403:** if neither owner nor admin

---

### Changes to existing `GET /api/games/upcoming` and `GET /api/games/closed`

Add `comments_count` to each game object in both responses. This lets the frontend show a comment badge on all game cards without an extra request.

```json
{
  "id": 12,
  "team_a": { ... },
  "team_b": { ... },
  "comments_count": 5,
  ...
}
```

---

## Frontend Changes

### PredictionsPage — Both Upcoming and Closed Tabs

- Add a speech-bubble icon with comment count next to every game card
- Clicking the icon (or a "Discuss" button) expands/opens the comment panel

### New component: `GameCommentSection`

Displayed below the game card when expanded. Behaviour mirrors `NewsPage` comments:

```
┌─────────────────────────────────────────────────────┐
│  💬 Discussion (5 comments)                         │
├─────────────────────────────────────────────────────┤
│  [Avatar] John Smith  21:15                         │
│  Knew Brazil would win, that defence is unreal      │
│                                              [✏] [x] │
│                                                     │
│  [Avatar] Maria G.   21:22                          │
│  Should have been 3–0 honestly (edited)             │
│─────────────────────────────────────────────────────│
│  [Text area: Write a comment...]           [Post]   │
└─────────────────────────────────────────────────────┘
```

- `[✏]` edit and `[x]` delete buttons shown only on own comments; admin sees `[x]` on all comments
- Clicking `[✏]` replaces the comment text with an inline editable text area with a "Save" / "Cancel" pair
- `(edited)` label shown when `is_edited` is true
- Text area disabled with tooltip "Pay to participate" if user has not paid
- Character counter shown at 800+ characters remaining

### PlayersPage — Player Profile

- Add a "Comments" count stat under the player's profile card (optional, low priority)

---

## State Management

No new Zustand store needed. Use local component state + direct API calls via `api.ts`:

```typescript
// New entries in src/services/api.ts
getGameComments(gameId: number): Promise<GameComment[]>
addGameComment(gameId: number, content: string): Promise<GameComment>
updateGameComment(commentId: number, content: string): Promise<GameComment>
deleteGameComment(commentId: number): Promise<void>
```

---

## Moderation Considerations

- No profanity filter in scope (admin can delete manually)
- Admin can see all comments in the existing Closed Games view (same page, no new admin tab needed)
- If a user is deleted, their comments cascade-delete (already handled by FK)
- No rate limiting in v1; if abuse occurs, add per-user per-game comment cap (e.g., 10) as a follow-up

---

## Out of Scope (Future)

- Report/flag a comment
- Emoji reactions on comments
- @mention notifications
- Comment threading / replies

---

## Implementation Order

1. `GameComment` model + migration
2. Backend routes (GET list, POST, PUT, DELETE)
3. Update `GET /api/games/upcoming` and `GET /api/games/closed` to include `comments_count`
4. `api.ts` typed wrappers
5. `GameCommentSection` component (with inline edit state)
6. Wire into PredictionsPage for both upcoming and closed tabs
7. Tests: backend unit tests mirroring `test_news.py` comment tests

---

## Effort Estimate

| Layer | Estimate |
|-------|----------|
| Backend model + migration | 1h |
| Backend routes + tests | 2.5h |
| Frontend component + wiring | 3.5h |
| **Total** | **~7h** |
