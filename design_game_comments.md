# Design Proposal: Game Comments

**Backlog item #8** | Status: Design phase | Date: 2026-05-05

---

## Problem Statement

Discussion naturally happens after a match closes — who predicted what, why the result was surprising, tactical post-mortems. Currently there is nowhere in the app to do this. The News comment system is close but requires admin/cashier authorship to start a thread. There is no per-game discussion space owned by the players themselves.

---

## Goals

- Let any authenticated player comment on a game once its prediction deadline has passed
- Surface comment counts on closed-game cards so users know a discussion exists
- Reuse patterns already established in `NewsComment` to minimize new code
- Keep moderation simple: users delete their own, admins delete any

## Non-Goals

- Replies/threads (flat list only, simpler and sufficient)
- Rich text or emoji reactions on comments (out of scope)
- Comments before prediction deadline (would leak information)
- Anonymous or guest comments

---

## Access Rules

| Action | Who | When |
|--------|-----|------|
| Read comments | Any authenticated user | After prediction deadline (game not yet scored is fine) |
| Post comment | Any authenticated, paid user | After prediction deadline |
- Admin/cachier can post after deadline, same as players
- Admin can delete any comment; users can delete their own

**Rationale for "paid only" restriction:** Unpaid users can't submit predictions, so they have less stake in the result and a lower bar for bad-faith posts.

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

Returns all comments for a game. Requires authentication. Returns `403` if prediction deadline has not passed yet.

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
    "is_own": true
  }
]
```

`is_own` flag lets the frontend show a delete button without a separate ownership check.

**Error cases:**
- `401` — not authenticated
- `404` — game not found
- `403` — prediction deadline not yet passed (`{"error": "Comments are not available until predictions close"}`)

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
- Game prediction deadline has passed (else `403`)

**Response 201:**
```json
{
  "message": "Comment added",
  "comment": { ... }   // same shape as list item
}
```

---

### `DELETE /api/games/comments/<comment_id>`

Deletes a comment. User can delete their own; admin can delete any.

**Response 200:** `{"message": "Comment deleted"}`
**Response 403:** if neither owner nor admin

---

### Changes to existing `GET /api/games/closed`

Add `comments_count` to each game object in the response. This lets the frontend show a comment badge on closed-game cards without an extra request.

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

### PredictionsPage — Closed Games Tab

- Add a speech-bubble icon with comment count next to each closed game card
- Clicking the game card (or a "Discuss" button) expands/opens the comment panel

### New component: `GameCommentSection`

Displayed below the predictions table when a closed game is expanded. Behaviour mirrors `NewsPage` comments:

```
┌─────────────────────────────────────────────────────┐
│  💬 Discussion (5 comments)                         │
├─────────────────────────────────────────────────────┤
│  [Avatar] John Smith  21:15                         │
│  Knew Brazil would win, that defence is unreal  [x] │
│                                                     │
│  [Avatar] Maria G.   21:22                          │
│  Should have been 3–0 honestly                      │
│─────────────────────────────────────────────────────│
│  [Text area: Write a comment...]           [Post]   │
└─────────────────────────────────────────────────────┘
```

- `[x]` delete button shown only on own comments (or for admin, on all)
- Text area disabled with tooltip "Pay to participate" if user has not paid
- Text area disabled with tooltip "Comments open after predictions close" before deadline (defensive — server also guards this)
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

- Edit own comment (add `PUT /api/games/comments/<id>`)
- Report/flag a comment
- Emoji reactions on comments
- @mention notifications
- Comment threading / replies

---

## Implementation Order

1. `GameComment` model + migration
2. Backend routes (GET list, POST, DELETE)
3. Update `GET /api/games/closed` to include `comments_count`
4. `api.ts` typed wrappers
5. `GameCommentSection` component
6. Wire into PredictionsPage closed-games tab
7. Tests: backend unit tests mirroring `test_news.py` comment tests

---

## Effort Estimate

| Layer | Estimate |
|-------|----------|
| Backend model + migration | 1h |
| Backend routes + tests | 2h |
| Frontend component + wiring | 3h |
| **Total** | **~6h** |
