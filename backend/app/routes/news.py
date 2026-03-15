from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from app import db
from app.models.news import News

bp = Blueprint('news', __name__, url_prefix='/api/news')


@bp.route('/', methods=['GET'])
def get_news():
    """Get all news articles (public)"""
    news_items = News.query.order_by(News.created_at.desc()).all()

    return jsonify([{
        'id': n.id,
        'title': n.title,
        'content': n.content,
        'image_url': n.image_url,
        'author': {
            'username': n.author.username,
            'first_name': n.author.first_name,
            'surname': n.author.surname
        },
        'created_at': n.created_at.isoformat()
    } for n in news_items]), 200


@bp.route('/<int:news_id>', methods=['GET'])
def get_news_item(news_id):
    """Get a specific news article"""
    news_item = News.query.get_or_404(news_id)

    return jsonify({
        'id': news_item.id,
        'title': news_item.title,
        'content': news_item.content,
        'image_url': news_item.image_url,
        'author': {
            'username': news_item.author.username,
            'first_name': news_item.author.first_name,
            'surname': news_item.author.surname
        },
        'created_at': news_item.created_at.isoformat(),
        'updated_at': news_item.updated_at.isoformat()
    }), 200


@bp.route('/', methods=['POST'])
@login_required
def create_news():
    """Create a news article (cachier and admin only)"""
    if not current_user.is_cachier_or_admin():
        return jsonify({'error': 'Cachier or admin access required'}), 403

    data = request.get_json()

    news_item = News(
        title=data['title'],
        content=data['content'],
        image_url=data.get('image_url'),
        author_id=current_user.id
    )

    db.session.add(news_item)
    db.session.commit()

    return jsonify({'message': 'News created', 'id': news_item.id}), 201


@bp.route('/<int:news_id>', methods=['PUT'])
@login_required
def update_news(news_id):
    """Update a news article (cachier and admin only)"""
    if not current_user.is_cachier_or_admin():
        return jsonify({'error': 'Cachier or admin access required'}), 403

    news_item = News.query.get_or_404(news_id)
    data = request.get_json()

    news_item.title = data.get('title', news_item.title)
    news_item.content = data.get('content', news_item.content)
    news_item.image_url = data.get('image_url', news_item.image_url)

    db.session.commit()

    return jsonify({'message': 'News updated'}), 200


@bp.route('/<int:news_id>', methods=['DELETE'])
@login_required
def delete_news(news_id):
    """Delete a news article (admin only)"""
    if not current_user.is_admin:
        return jsonify({'error': 'Admin access required'}), 403

    news_item = News.query.get_or_404(news_id)
    db.session.delete(news_item)
    db.session.commit()

    return jsonify({'message': 'News deleted'}), 200
