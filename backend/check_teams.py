#!/usr/bin/env python3
"""Quick script to check teams in database"""
from app import create_app, db
from app.models.team import Team

app = create_app('development')
with app.app_context():
    all_teams = Team.query.all()
    placeholder_teams = [t for t in all_teams if any(char.isdigit() for char in t.code)]
    country_teams = [t for t in all_teams if not any(char.isdigit() for char in t.code)]

    print(f'\n=== TEAM DATABASE SUMMARY ===')
    print(f'Total teams: {len(all_teams)}')
    print(f'Country teams: {len(country_teams)}')
    print(f'Placeholder teams (for knockout rounds): {len(placeholder_teams)}')

    print(f'\n=== SAMPLE COUNTRY TEAMS ===')
    for t in sorted(country_teams, key=lambda x: x.name)[:20]:
        print(f'  {t.name:30} ({t.code})')
