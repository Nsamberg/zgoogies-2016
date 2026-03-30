"""
One-time script to recompute all stored rankings from scratch.

Run this after deploying the ranking tie-fix to correct the stale rank
values already in the database.

Usage (from backend/ directory):
    venv/Scripts/python.exe scripts/recompute_rankings.py        # Windows
    venv/bin/python scripts/recompute_rankings.py                # Linux/Mac
"""
import sys
import os

# Allow running from any working directory
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db
from app.models.ranking import Ranking
from app.models.competition_round import CompetitionRound
from app.services.ranking_service import (
    recalculate_overall_rankings,
    recalculate_rankings_for_round,
)

app = create_app()

with app.app_context():
    # Overall rankings
    print('Recalculating overall rankings...')
    recalculate_overall_rankings()
    overall = Ranking.query.filter_by(competition_round_id=None).order_by(Ranking.rank).all()
    for r in overall:
        print(f'  Rank {r.rank}: {r.user.username} — {r.total_points} pts')

    # Per-round rankings
    rounds = CompetitionRound.query.order_by(CompetitionRound.round_number).all()
    for rnd in rounds:
        print(f'Recalculating {rnd.name}...')
        recalculate_rankings_for_round(rnd.id)
        round_ranks = Ranking.query.filter_by(
            competition_round_id=rnd.id
        ).order_by(Ranking.rank).all()
        for r in round_ranks:
            print(f'  Rank {r.rank}: {r.user.username} — {r.total_points} pts')

    print('Done. All rankings recomputed.')
