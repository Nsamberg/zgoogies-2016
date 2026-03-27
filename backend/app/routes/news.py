from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from app import db
from app.models.news import News
from app.models.news_reaction import NewsReaction
from app.models.news_comment import NewsComment

bp = Blueprint('news', __name__, url_prefix='/api/news')


@bp.route('/', methods=['GET'])
def get_news():
    """Get all news articles (public)"""
    news_items = News.query.order_by(News.created_at.desc()).all()

    # Get current user's reactions if authenticated
    user_reactions = {}
    if current_user.is_authenticated:
        reactions = NewsReaction.query.filter_by(user_id=current_user.id).all()
        user_reactions = {r.news_id: r.reaction_type for r in reactions}

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
        'created_at': n.created_at.isoformat(),
        'likes_count': n.reactions.filter_by(reaction_type='like').count(),
        'dislikes_count': n.reactions.filter_by(reaction_type='dislike').count(),
        'comments_count': n.comments.count(),
        'user_reaction': user_reactions.get(n.id)
    } for n in news_items]), 200


@bp.route('/<int:news_id>', methods=['GET'])
def get_news_item(news_id):
    """Get a specific news article"""
    news_item = News.query.get_or_404(news_id)

    # Get current user's reaction if authenticated
    user_reaction = None
    if current_user.is_authenticated:
        reaction = NewsReaction.query.filter_by(news_id=news_id, user_id=current_user.id).first()
        user_reaction = reaction.reaction_type if reaction else None

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
        'updated_at': news_item.updated_at.isoformat(),
        'likes_count': news_item.reactions.filter_by(reaction_type='like').count(),
        'dislikes_count': news_item.reactions.filter_by(reaction_type='dislike').count(),
        'comments_count': news_item.comments.count(),
        'user_reaction': user_reaction
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


@bp.route('/<int:news_id>/react', methods=['POST'])
@login_required
def react_to_news(news_id):
    """Toggle like/dislike on a news article"""
    news_item = News.query.get_or_404(news_id)
    data = request.get_json()
    reaction_type = data.get('reaction_type')  # 'like' or 'dislike'

    if reaction_type not in ['like', 'dislike']:
        return jsonify({'error': 'Invalid reaction type. Use "like" or "dislike"'}), 400

    # Check if user already has a reaction
    existing_reaction = NewsReaction.query.filter_by(
        news_id=news_id,
        user_id=current_user.id
    ).first()

    if existing_reaction:
        if existing_reaction.reaction_type == reaction_type:
            # Remove reaction if clicking same button
            db.session.delete(existing_reaction)
            db.session.commit()
            return jsonify({'message': 'Reaction removed'}), 200
        else:
            # Change reaction type
            existing_reaction.reaction_type = reaction_type
            db.session.commit()
            return jsonify({'message': 'Reaction updated'}), 200
    else:
        # Add new reaction
        new_reaction = NewsReaction(
            news_id=news_id,
            user_id=current_user.id,
            reaction_type=reaction_type
        )
        db.session.add(new_reaction)
        db.session.commit()
        return jsonify({'message': 'Reaction added'}), 201


@bp.route('/<int:news_id>/comments', methods=['GET'])
def get_comments(news_id):
    """Get all comments for a news article"""
    news_item = News.query.get_or_404(news_id)
    comments = news_item.comments.order_by(NewsComment.created_at.asc()).all()

    return jsonify([{
        'id': c.id,
        'content': c.content,
        'user': {
            'id': c.user.id,
            'username': c.user.username,
            'first_name': c.user.first_name,
            'surname': c.user.surname
        },
        'created_at': c.created_at.isoformat(),
        'updated_at': c.updated_at.isoformat()
    } for c in comments]), 200


@bp.route('/<int:news_id>/comments', methods=['POST'])
@login_required
def add_comment(news_id):
    """Add a comment to a news article"""
    news_item = News.query.get_or_404(news_id)
    data = request.get_json()

    content = data.get('content', '').strip()
    if not content:
        return jsonify({'error': 'Comment content is required'}), 400

    if len(content) > 1000:
        return jsonify({'error': 'Comment is too long (max 1000 characters)'}), 400

    comment = NewsComment(
        news_id=news_id,
        user_id=current_user.id,
        content=content
    )

    db.session.add(comment)
    db.session.commit()

    return jsonify({
        'message': 'Comment added',
        'comment': {
            'id': comment.id,
            'content': comment.content,
            'user': {
                'id': current_user.id,
                'username': current_user.username,
                'first_name': current_user.first_name,
                'surname': current_user.surname
            },
            'created_at': comment.created_at.isoformat(),
            'updated_at': comment.updated_at.isoformat()
        }
    }), 201


@bp.route('/comments/<int:comment_id>', methods=['DELETE'])
@login_required
def delete_comment(comment_id):
    """Delete a comment (own comment or admin)"""
    comment = NewsComment.query.get_or_404(comment_id)

    # Only allow user to delete their own comment or admin to delete any
    if comment.user_id != current_user.id and not current_user.is_admin:
        return jsonify({'error': 'You can only delete your own comments'}), 403

    db.session.delete(comment)
    db.session.commit()

    return jsonify({'message': 'Comment deleted'}), 200
