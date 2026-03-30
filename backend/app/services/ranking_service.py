from app import db
from app.models.ranking import Ranking
from app.models.ranking_history import RankingHistory
from app.models.prediction import Prediction
from app.models.user import User
from app.models.game import Game
from sqlalchemy import func
from flask import current_app


def calculate_user_points(user_id, competition_round_id=None):
    """Calculate total points for a user in a round or overall"""
    query = db.session.query(func.sum(Prediction.points)).filter(
        Prediction.user_id == user_id,
        Prediction.is_calculated == True
    )

    if competition_round_id:
        # Points for specific round
        query = query.join(Prediction.game).filter(
            Game.competition_round_id == competition_round_id
        )

    result = query.scalar()
    return result if result else 0


def update_rankings_after_game(game):
    """Update all rankings after a game is scored"""
    # Update round-specific ranking
    update_round_ranking(game.competition_round_id, game)

    # Update overall ranking
    update_overall_ranking(game)


def update_round_ranking(competition_round_id, game):
    """Update ranking for a specific competition round"""
    users = User.query.all()

    # Calculate points for each user in this round
    user_points = []
    for user in users:
        points = calculate_user_points(user.id, competition_round_id)
        user_points.append((user.id, points))

    # Sort by points descending
    user_points.sort(key=lambda x: x[1], reverse=True)

    # Assign ranks with correct tie handling (competition ranking: 1,1,1,4,5,5)
    prev_rank = 1
    prev_points = None
    for i, (user_id, points) in enumerate(user_points):
        if points != prev_points:
            prev_rank = i + 1  # position in sorted list (1-indexed)
        prev_points = points
        rank = prev_rank

        # Update or create ranking
        ranking = Ranking.query.filter_by(
            user_id=user_id,
            competition_round_id=competition_round_id
        ).first()

        if ranking:
            ranking.previous_rank = ranking.rank
            ranking.rank = rank
            ranking.total_points = points
            ranking.last_game_id = game.id
        else:
            ranking = Ranking(
                user_id=user_id,
                competition_round_id=competition_round_id,
                rank=rank,
                total_points=points,
                last_game_id=game.id
            )
            db.session.add(ranking)

        # Save history
        history = RankingHistory(
            user_id=user_id,
            competition_round_id=competition_round_id,
            rank=rank,
            total_points=points,
            game_id=game.id
        )
        db.session.add(history)

    db.session.commit()


def update_overall_ranking(game):
    """Update overall ranking"""
    users = User.query.all()

    # Calculate overall points for each user
    user_points = []
    for user in users:
        points = calculate_user_points(user.id)
        user_points.append((user.id, points))

    # Sort by points descending
    user_points.sort(key=lambda x: x[1], reverse=True)

    # Assign ranks with correct tie handling (competition ranking: 1,1,1,4,5,5)
    prev_rank = 1
    prev_points = None
    for i, (user_id, points) in enumerate(user_points):
        if points != prev_points:
            prev_rank = i + 1  # position in sorted list (1-indexed)
        prev_points = points
        rank = prev_rank

        # Update or create ranking
        ranking = Ranking.query.filter_by(
            user_id=user_id,
            competition_round_id=None
        ).first()

        if ranking:
            ranking.previous_rank = ranking.rank
            ranking.rank = rank
            ranking.total_points = points
            ranking.last_game_id = game.id
        else:
            ranking = Ranking(
                user_id=user_id,
                competition_round_id=None,
                rank=rank,
                total_points=points,
                last_game_id=game.id
            )
            db.session.add(ranking)

        # Save history
        history = RankingHistory(
            user_id=user_id,
            competition_round_id=None,
            rank=rank,
            total_points=points,
            game_id=game.id
        )
        db.session.add(history)

    db.session.commit()


def recalculate_rankings_for_round(competition_round_id):
    """Recalculate round ranking from scratch (used after score rollback)"""
    users = User.query.all()
    user_points = []
    for user in users:
        points = calculate_user_points(user.id, competition_round_id)
        user_points.append((user.id, points))

    user_points.sort(key=lambda x: x[1], reverse=True)

    prev_rank = 1
    prev_points = None
    for i, (user_id, points) in enumerate(user_points):
        if points != prev_points:
            prev_rank = i + 1
        prev_points = points
        rank = prev_rank

        ranking = Ranking.query.filter_by(
            user_id=user_id,
            competition_round_id=competition_round_id
        ).first()

        if ranking:
            ranking.previous_rank = ranking.rank
            ranking.rank = rank
            ranking.total_points = points
        else:
            ranking = Ranking(
                user_id=user_id,
                competition_round_id=competition_round_id,
                rank=rank,
                total_points=points
            )
            db.session.add(ranking)

    db.session.commit()


def recalculate_overall_rankings():
    """Recalculate overall ranking from scratch (used after score rollback)"""
    users = User.query.all()
    user_points = []
    for user in users:
        points = calculate_user_points(user.id)
        user_points.append((user.id, points))

    user_points.sort(key=lambda x: x[1], reverse=True)

    prev_rank = 1
    prev_points = None
    for i, (user_id, points) in enumerate(user_points):
        if points != prev_points:
            prev_rank = i + 1
        prev_points = points
        rank = prev_rank

        ranking = Ranking.query.filter_by(
            user_id=user_id,
            competition_round_id=None
        ).first()

        if ranking:
            ranking.previous_rank = ranking.rank
            ranking.rank = rank
            ranking.total_points = points
        else:
            ranking = Ranking(
                user_id=user_id,
                competition_round_id=None,
                rank=rank,
                total_points=points
            )
            db.session.add(ranking)

    db.session.commit()


def award_tournament_winner_bonus(winner_team_id):
    """Award bonus points to users who predicted the tournament winner correctly"""
    from app.models.game import Game
    from config import Config

    # Find users who predicted correctly
    correct_users = User.query.filter_by(tournament_winner_id=winner_team_id).all()

    bonus_points = Config.TOURNAMENT_WINNER_POINTS

    # Get the last game (final)
    last_game = Game.query.filter_by(is_scored=True).order_by(Game.game_date.desc()).first()

    for user in correct_users:
        # Update overall ranking
        ranking = Ranking.query.filter_by(
            user_id=user.id,
            competition_round_id=None
        ).first()

        if ranking:
            ranking.total_points += bonus_points

            # Save history
            history = RankingHistory(
                user_id=user.id,
                competition_round_id=None,
                rank=ranking.rank,
                total_points=ranking.total_points,
                game_id=last_game.id if last_game else None
            )
            db.session.add(history)

    db.session.commit()

    # Recalculate ranks after bonus points
    if last_game:
        update_overall_ranking(last_game)
