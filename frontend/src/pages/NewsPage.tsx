import { useState, useEffect } from 'react'
import { newsAPI } from '../services/api'
import { News, NewsComment } from '../types'
import { useAuthStore } from '../stores/authStore'

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatDateTime(isoDate: string): string {
  const date = new Date(isoDate)
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function NewsPage() {
  const [news, setNews] = useState<News[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedNewsId, setExpandedNewsId] = useState<number | null>(null)
  const [comments, setComments] = useState<Record<number, NewsComment[]>>({})
  const [newComment, setNewComment] = useState<Record<number, string>>({})
  const [commentLoading, setCommentLoading] = useState<Record<number, boolean>>({})

  const user = useAuthStore((state) => state.user)

  useEffect(() => {
    setLoading(true)
    setError('')
    newsAPI.getAll()
      .then((res) => setNews(res.data))
      .catch(() => setError('Failed to load news. Please refresh.'))
      .finally(() => setLoading(false))
  }, [])

  const handleReaction = async (newsId: number, reactionType: 'like' | 'dislike') => {
    if (!user) return

    try {
      await newsAPI.react(newsId, reactionType)

      // Update the news item locally
      setNews((prevNews) =>
        prevNews.map((item) => {
          if (item.id !== newsId) return item

          const isTogglingOff = item.user_reaction === reactionType
          const isSwitching = item.user_reaction && item.user_reaction !== reactionType

          let newLikesCount = item.likes_count
          let newDislikesCount = item.dislikes_count
          let newUserReaction: 'like' | 'dislike' | null = null

          if (isTogglingOff) {
            // Remove reaction
            if (reactionType === 'like') newLikesCount--
            else newDislikesCount--
            newUserReaction = null
          } else if (isSwitching) {
            // Switch reaction
            if (reactionType === 'like') {
              newLikesCount++
              newDislikesCount--
            } else {
              newDislikesCount++
              newLikesCount--
            }
            newUserReaction = reactionType
          } else {
            // Add new reaction
            if (reactionType === 'like') newLikesCount++
            else newDislikesCount++
            newUserReaction = reactionType
          }

          return {
            ...item,
            likes_count: newLikesCount,
            dislikes_count: newDislikesCount,
            user_reaction: newUserReaction,
          }
        })
      )
    } catch (err: any) {
      console.error('Failed to react:', err)
    }
  }

  const toggleComments = async (newsId: number) => {
    if (expandedNewsId === newsId) {
      setExpandedNewsId(null)
    } else {
      setExpandedNewsId(newsId)
      // Load comments if not already loaded
      if (!comments[newsId]) {
        try {
          const response = await newsAPI.getComments(newsId)
          setComments((prev) => ({ ...prev, [newsId]: response.data }))
        } catch (err) {
          console.error('Failed to load comments:', err)
        }
      }
    }
  }

  const handleAddComment = async (newsId: number) => {
    const content = newComment[newsId]?.trim()
    if (!content || !user) return

    setCommentLoading((prev) => ({ ...prev, [newsId]: true }))

    try {
      const response = await newsAPI.addComment(newsId, content)
      const newCommentData = response.data.comment

      // Add comment to local state
      setComments((prev) => ({
        ...prev,
        [newsId]: [...(prev[newsId] || []), newCommentData],
      }))

      // Update comment count
      setNews((prevNews) =>
        prevNews.map((item) =>
          item.id === newsId ? { ...item, comments_count: item.comments_count + 1 } : item
        )
      )

      // Clear input
      setNewComment((prev) => ({ ...prev, [newsId]: '' }))
    } catch (err: any) {
      console.error('Failed to add comment:', err)
      alert(err.response?.data?.error || 'Failed to add comment')
    } finally {
      setCommentLoading((prev) => ({ ...prev, [newsId]: false }))
    }
  }

  const handleDeleteComment = async (newsId: number, commentId: number) => {
    if (!confirm('Delete this comment?')) return

    try {
      await newsAPI.deleteComment(commentId)

      // Remove comment from local state
      setComments((prev) => ({
        ...prev,
        [newsId]: prev[newsId].filter((c) => c.id !== commentId),
      }))

      // Update comment count
      setNews((prevNews) =>
        prevNews.map((item) =>
          item.id === newsId ? { ...item, comments_count: item.comments_count - 1 } : item
        )
      )
    } catch (err: any) {
      console.error('Failed to delete comment:', err)
      alert(err.response?.data?.error || 'Failed to delete comment')
    }
  }

  return (
    <div className="news-page">
      <h2 className="page-title">News &amp; Announcements</h2>

      {loading && <p className="loading-text">Loading news...</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && news.length === 0 && (
        <p className="empty-state">No announcements yet. Check back soon.</p>
      )}

      <div className="news-list">
        {news.map((item) => (
          <article key={item.id} className="news-card">
            {item.image_url && (
              <img src={item.image_url} alt={item.title} className="news-image" />
            )}
            <div className="news-body">
              <h3 className="news-title">{item.title}</h3>
              <div className="news-meta">
                <span>{item.author.first_name} {item.author.surname}</span>
                <span className="separator">·</span>
                <span>{formatDate(item.created_at)}</span>
              </div>
              <p className="news-content">{item.content}</p>

              {/* Reactions */}
              <div className="news-reactions">
                <button
                  className={`reaction-btn ${item.user_reaction === 'like' ? 'active' : ''} ${!user ? 'disabled' : ''}`}
                  onClick={() => user && handleReaction(item.id, 'like')}
                  disabled={!user}
                  title={!user ? 'Login to react' : ''}
                >
                  👍 {item.likes_count}
                </button>
                <button
                  className={`reaction-btn ${item.user_reaction === 'dislike' ? 'active' : ''} ${!user ? 'disabled' : ''}`}
                  onClick={() => user && handleReaction(item.id, 'dislike')}
                  disabled={!user}
                  title={!user ? 'Login to react' : ''}
                >
                  👎 {item.dislikes_count}
                </button>
                <button
                  className="reaction-btn comment-toggle"
                  onClick={() => toggleComments(item.id)}
                >
                  💬 {item.comments_count}
                </button>
              </div>

              {/* Comments Section */}
              {expandedNewsId === item.id && (
                <div className="comments-section">
                  <h4>Comments</h4>

                  {/* Add Comment Form */}
                  {user ? (
                    <div className="comment-form">
                      <textarea
                        value={newComment[item.id] || ''}
                        onChange={(e) => setNewComment((prev) => ({ ...prev, [item.id]: e.target.value }))}
                        placeholder="Write a comment..."
                        maxLength={1000}
                        rows={3}
                      />
                      <button
                        onClick={() => handleAddComment(item.id)}
                        disabled={!newComment[item.id]?.trim() || commentLoading[item.id]}
                        className="btn-primary"
                      >
                        {commentLoading[item.id] ? 'Posting...' : 'Post Comment'}
                      </button>
                    </div>
                  ) : (
                    <p className="login-prompt">Login to comment</p>
                  )}

                  {/* Comments List */}
                  <div className="comments-list">
                    {comments[item.id]?.length === 0 && (
                      <p className="no-comments">No comments yet. Be the first to comment!</p>
                    )}
                    {comments[item.id]?.map((comment) => (
                      <div key={comment.id} className="comment">
                        <div className="comment-header">
                          <strong>{comment.user.first_name} {comment.user.surname}</strong>
                          <span className="comment-date">{formatDateTime(comment.created_at)}</span>
                        </div>
                        <p className="comment-content">{comment.content}</p>
                        {user && (user.id === comment.user.id || user.is_admin) && (
                          <button
                            className="delete-comment-btn"
                            onClick={() => handleDeleteComment(item.id, comment.id)}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
