import { useState, useEffect } from 'react'
import { newsAPI } from '../services/api'
import { News } from '../types'

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default function NewsPage() {
  const [news, setNews] = useState<News[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    newsAPI.getAll()
      .then((res) => setNews(res.data))
      .catch(() => setError('Failed to load news. Please refresh.'))
      .finally(() => setLoading(false))
  }, [])

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
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
