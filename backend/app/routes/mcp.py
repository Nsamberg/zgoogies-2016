"""
ZGoogies MCP Server — MCP Streamable HTTP Transport (2025-03-26)

Exposes 6 tools for AI assistants (Claude.ai, Google AI Studio) to interact
with ZGoogies data on behalf of authenticated users.

Each tool accepts a personal API token (obtained from Account → AI Assistant
in the ZGoogies app) and enforces a configurable daily rate limit per user.
"""
from flask import Blueprint, request, jsonify, current_app, Response, stream_with_context
from app import db
from app.models.user import User
from app.models.ai_usage import AiUsage
from app.models.app_setting import AppSetting
from app.models.game import Game
from app.models.prediction import Prediction
from app.models.prediction_history import PredictionHistory
from app.models.ranking import Ranking
from app.utils.datetime_utils import get_current_utc
from datetime import timedelta, date
import threading
import queue
import uuid
import json

# In-memory session store for SSE transport (HTTP+SSE, used by Claude.ai).
# Works correctly only when gunicorn runs with a single process (gthread worker).
_sessions: dict = {}
_sessions_lock = threading.Lock()

bp = Blueprint('mcp', __name__, url_prefix='/api/mcp')

DEFAULT_DAILY_LIMIT = 200
MCP_VERSION = '2025-03-26'
SUPPORTED_VERSIONS = {'2025-03-26', '2024-11-05', '2025-06-18'}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _ok(req_id, result):
    return {'jsonrpc': '2.0', 'id': req_id, 'result': result}


def _err(req_id, code, message):
    return {'jsonrpc': '2.0', 'id': req_id, 'error': {'code': code, 'message': message}}


def _get_user(token):
    if not token:
        return None
    return User.query.filter_by(api_token=str(token)).first()


def _check_rate_limit(user_id):
    """Increment the daily call counter. Raises ValueError if the limit is hit."""
    limit = int(AppSetting.get('ai_daily_limit') or DEFAULT_DAILY_LIMIT)
    today = date.today()
    row = AiUsage.query.filter_by(user_id=user_id, date=today).first()
    if row is None:
        row = AiUsage(user_id=user_id, date=today, call_count=0)
        db.session.add(row)
    if row.call_count >= limit:
        raise ValueError(f'Daily AI call limit of {limit} reached. Resets at midnight UTC.')
    row.call_count += 1
    db.session.commit()


# ---------------------------------------------------------------------------
# Tool definitions (MCP schema)
# ---------------------------------------------------------------------------

TOOL_DEFINITIONS = [
    {
        'name': 'get_my_predictions',
        'description': (
            "Get the authenticated user's predictions for all games, including "
            "game details, their predicted scores, actual results, and points earned."
        ),
        'inputSchema': {
            'type': 'object',
            'properties': {
                'token': {
                    'type': 'string',
                    'description': 'Your personal ZGoogies API token (found in Account → AI Assistant on zgoogies.online)'
                }
            },
            'required': ['token']
        }
    },
    {
        'name': 'get_upcoming_games',
        'description': (
            "Get all upcoming games that are still open for predictions, with team names, "
            "kick-off times, deadlines, and whether you've already predicted each game."
        ),
        'inputSchema': {
            'type': 'object',
            'properties': {
                'token': {'type': 'string', 'description': 'Your personal ZGoogies API token'}
            },
            'required': ['token']
        }
    },
    {
        'name': 'get_my_ranking',
        'description': 'Get your current overall ranking, total points, and ranking per competition round.',
        'inputSchema': {
            'type': 'object',
            'properties': {
                'token': {'type': 'string', 'description': 'Your personal ZGoogies API token'}
            },
            'required': ['token']
        }
    },
    {
        'name': 'get_all_rankings',
        'description': 'Get the full leaderboard showing all players ranked by total points.',
        'inputSchema': {
            'type': 'object',
            'properties': {
                'token': {'type': 'string', 'description': 'Your personal ZGoogies API token'}
            },
            'required': ['token']
        }
    },
    {
        'name': 'submit_prediction',
        'description': (
            'Submit or update your score prediction for a specific game. '
            'Use get_upcoming_games first to find the game_id. '
            'Only works before the prediction deadline. Always confirm with the user before calling this.'
        ),
        'inputSchema': {
            'type': 'object',
            'properties': {
                'token': {'type': 'string', 'description': 'Your personal ZGoogies API token'},
                'game_id': {'type': 'integer', 'description': 'The numeric game ID (from get_upcoming_games)'},
                'score_a': {'type': 'integer', 'description': 'Predicted score for Team A (home), 0–50', 'minimum': 0, 'maximum': 50},
                'score_b': {'type': 'integer', 'description': 'Predicted score for Team B (away), 0–50', 'minimum': 0, 'maximum': 50}
            },
            'required': ['token', 'game_id', 'score_a', 'score_b']
        }
    },
    {
        'name': 'get_game_list',
        'description': (
            'Get a list of all available games (upcoming and 5 most recent closed) '
            'with game IDs, teams, dates, and round info. Use this to find game_id values.'
        ),
        'inputSchema': {
            'type': 'object',
            'properties': {
                'token': {'type': 'string', 'description': 'Your personal ZGoogies API token'}
            },
            'required': ['token']
        }
    },
]


# ---------------------------------------------------------------------------
# Tool implementations
# ---------------------------------------------------------------------------

def _tool_get_my_predictions(args):
    user = _get_user(args.get('token'))
    if not user:
        return 'Error: Invalid or missing token. Get yours from Account → AI Assistant on zgoogies.online.'
    _check_rate_limit(user.id)

    predictions = Prediction.query.filter_by(user_id=user.id).all()
    if not predictions:
        return f'You have no predictions yet, {user.first_name}.'

    total_points = sum(p.points or 0 for p in predictions if p.points is not None)
    scored_count = sum(1 for p in predictions if p.points is not None)

    lines = [f'Predictions for {user.first_name} ({user.username}):\n']
    for pred in sorted(predictions, key=lambda p: p.game_id):
        game = Game.query.get(pred.game_id)
        if not game:
            continue
        if game.is_scored and game.team_a_score is not None:
            result = f'{game.team_a_score}–{game.team_b_score}'
        else:
            result = 'Not yet played'
        pts = f'{pred.points} pts' if pred.points is not None else '(awaiting result)'
        double = ' [2x points]' if game.is_double_points() else ''
        lines.append(f'  Game {game.id}: {game.team_a.name} vs {game.team_b.name}{double}')
        lines.append(f'    Your bet: {pred.team_a_score}–{pred.team_b_score} | Result: {result} | Points: {pts}')

    lines.append(f'\nTotal: {total_points} pts from {scored_count} scored game(s), {len(predictions)} predictions total.')
    return '\n'.join(lines)


def _tool_get_upcoming_games(args):
    user = _get_user(args.get('token'))
    if not user:
        return 'Error: Invalid or missing token.'
    _check_rate_limit(user.id)

    deadline = get_current_utc() + timedelta(hours=2)
    games = Game.query.filter(Game.game_date >= deadline).order_by(Game.game_date).all()

    if not games:
        return 'No games currently open for predictions.'

    pred_map = {p.game_id: p for p in Prediction.query.filter_by(user_id=user.id).all()}

    lines = [f'Upcoming games open for predictions ({len(games)} total):\n']
    for g in games:
        if g.id in pred_map:
            p = pred_map[g.id]
            pred_str = f'Your prediction: {p.team_a_score}–{p.team_b_score}'
        else:
            pred_str = 'No prediction yet'
        double = ' [2x POINTS]' if g.is_double_points() else ''
        round_name = g.competition_round.name if g.competition_round else ''
        stage = f' {g.stage}' if g.stage else ''
        group = f' Group {g.group}' if g.group else ''
        kick_off = g.game_date.strftime('%d %b %H:%M UTC')
        deadline_str = g.get_prediction_deadline().strftime('%d %b %H:%M UTC')
        lines.append(f'  Game ID {g.id}: {g.team_a.name} vs {g.team_b.name}{double}')
        lines.append(f'    {round_name}{stage}{group} | {g.location.city} | Kick-off: {kick_off}')
        lines.append(f'    Deadline: {deadline_str} | {pred_str}')
        lines.append('')

    return '\n'.join(lines)


def _tool_get_my_ranking(args):
    user = _get_user(args.get('token'))
    if not user:
        return 'Error: Invalid or missing token.'
    _check_rate_limit(user.id)

    overall = Ranking.query.filter_by(user_id=user.id, competition_round_id=None).first()
    if not overall:
        return f'No ranking data yet for {user.first_name}. Rankings appear after the first games are scored.'

    total_players = Ranking.query.filter_by(competition_round_id=None).count()
    move = ''
    if overall.previous_rank:
        diff = overall.previous_rank - overall.rank
        if diff > 0:
            move = f' (up {diff} place{"s" if diff != 1 else ""})'
        elif diff < 0:
            move = f' (down {abs(diff)} place{"s" if abs(diff) != 1 else ""})'
        else:
            move = ' (no change)'

    lines = [f'Rankings for {user.first_name} ({user.username}):']
    lines.append(f'  Overall: Rank {overall.rank} of {total_players}{move} — {overall.total_points} points')

    from app.models.competition_round import CompetitionRound
    round_rankings = Ranking.query.filter(
        Ranking.user_id == user.id,
        Ranking.competition_round_id.isnot(None)
    ).all()

    if round_rankings:
        lines.append('  Per round:')
        for rr in round_rankings:
            round_obj = CompetitionRound.query.get(rr.competition_round_id)
            round_name = round_obj.name if round_obj else f'Round {rr.competition_round_id}'
            lines.append(f'    {round_name}: Rank {rr.rank} — {rr.total_points} pts')

    return '\n'.join(lines)


def _tool_get_all_rankings(args):
    user = _get_user(args.get('token'))
    if not user:
        return 'Error: Invalid or missing token.'
    _check_rate_limit(user.id)

    rankings = Ranking.query.filter_by(competition_round_id=None).order_by(Ranking.rank).all()
    if not rankings:
        return 'No rankings available yet. Rankings appear after games are scored.'

    ordinals = {1: '1st', 2: '2nd', 3: '3rd'}
    lines = ['ZGoogies Leaderboard:\n']
    for r in rankings:
        pos = ordinals.get(r.rank, f'{r.rank}th')
        is_you = ' <- you' if r.user_id == user.id else ''
        move = ''
        if r.previous_rank:
            diff = r.previous_rank - r.rank
            if diff > 0:
                move = f' (+{diff})'
            elif diff < 0:
                move = f' ({diff})'
        lines.append(f'  {pos}: {r.user.username} — {r.total_points} pts{move}{is_you}')

    return '\n'.join(lines)


def _tool_submit_prediction(args):
    user = _get_user(args.get('token'))
    if not user:
        return 'Error: Invalid or missing token.'
    if not user.has_paid:
        return 'Error: Your registration fee has not been confirmed yet. Predictions require payment confirmation.'
    _check_rate_limit(user.id)

    try:
        game_id = int(args['game_id'])
        score_a = int(args['score_a'])
        score_b = int(args['score_b'])
    except (KeyError, ValueError, TypeError):
        return 'Error: game_id, score_a, and score_b must all be provided as integers.'

    if score_a < 0 or score_b < 0:
        return 'Error: Scores cannot be negative.'
    if score_a > 50 or score_b > 50:
        return 'Error: Score value is unreasonably large (max 50).'

    game = Game.query.get(game_id)
    if not game:
        return f'Error: Game {game_id} not found. Use get_upcoming_games to find valid game IDs.'
    if game.is_prediction_closed():
        return f'Error: Predictions are closed for {game.team_a.name} vs {game.team_b.name}. The deadline has passed.'

    prediction = Prediction.query.filter_by(user_id=user.id, game_id=game_id).first()
    action = 'E' if prediction else 'N'

    if prediction:
        prediction.team_a_score = score_a
        prediction.team_b_score = score_b
        action_word = 'Updated'
    else:
        prediction = Prediction(
            user_id=user.id, game_id=game_id,
            team_a_score=score_a, team_b_score=score_b
        )
        db.session.add(prediction)
        action_word = 'Saved'

    db.session.add(PredictionHistory(
        user_id=user.id, game_id=game_id,
        team_a_score=score_a, team_b_score=score_b, action=action
    ))
    db.session.commit()

    double = ' (double points game!)' if game.is_double_points() else ''
    deadline_str = game.get_prediction_deadline().strftime('%d %b %H:%M UTC')
    return (
        f'{action_word}! Prediction for {game.team_a.name} vs {game.team_b.name}: '
        f'{score_a}–{score_b}{double}\n'
        f'Deadline was: {deadline_str}'
    )


def _tool_get_game_list(args):
    user = _get_user(args.get('token'))
    if not user:
        return 'Error: Invalid or missing token.'
    _check_rate_limit(user.id)

    deadline = get_current_utc() + timedelta(hours=2)
    upcoming = Game.query.filter(Game.game_date >= deadline).order_by(Game.game_date).all()
    closed = Game.query.filter(Game.game_date < deadline).order_by(Game.game_date.desc()).limit(5).all()

    lines = ['ZGoogies Game List\n']

    if upcoming:
        lines.append(f'=== OPEN FOR PREDICTIONS ({len(upcoming)} games) ===')
        for g in upcoming:
            double = ' [2x]' if g.is_double_points() else ''
            round_name = g.competition_round.name if g.competition_round else ''
            lines.append(
                f'  ID {g.id}: {g.team_a.name} vs {g.team_b.name}{double} — '
                f'{g.game_date.strftime("%d %b %H:%M UTC")} — {round_name}'
            )
    else:
        lines.append('No games currently open for predictions.')

    if closed:
        lines.append('\n=== RECENT CLOSED GAMES ===')
        for g in closed:
            if g.is_scored and g.team_a_score is not None:
                result = f'{g.team_a_score}–{g.team_b_score}'
            else:
                result = 'Not yet scored'
            lines.append(f'  ID {g.id}: {g.team_a.name} vs {g.team_b.name} — Result: {result}')

    return '\n'.join(lines)


TOOL_HANDLERS = {
    'get_my_predictions': _tool_get_my_predictions,
    'get_upcoming_games': _tool_get_upcoming_games,
    'get_my_ranking': _tool_get_my_ranking,
    'get_all_rankings': _tool_get_all_rankings,
    'submit_prediction': _tool_submit_prediction,
    'get_game_list': _tool_get_game_list,
}


# ---------------------------------------------------------------------------
# JSON-RPC request handler
# ---------------------------------------------------------------------------

def _handle_one(req):
    req_id = req.get('id')
    method = req.get('method', '')
    params = req.get('params', {})

    if method == 'initialize':
        client_version = params.get('protocolVersion', MCP_VERSION)
        negotiated = client_version if client_version in SUPPORTED_VERSIONS else MCP_VERSION
        return _ok(req_id, {
            'protocolVersion': negotiated,
            'capabilities': {'tools': {}},
            'serverInfo': {'name': 'ZGoogies', 'version': '1.0.0'}
        })

    if method in ('notifications/initialized', 'notifications/cancelled'):
        return None  # Notifications get no response

    if method == 'ping':
        return _ok(req_id, {})

    if method == 'tools/list':
        return _ok(req_id, {'tools': TOOL_DEFINITIONS})

    if method == 'tools/call':
        tool_name = params.get('name')
        tool_args = params.get('arguments', {})

        if tool_name not in TOOL_HANDLERS:
            return _err(req_id, -32601, f'Unknown tool: {tool_name}')

        try:
            result_text = TOOL_HANDLERS[tool_name](tool_args)
        except ValueError as e:
            result_text = f'Error: {e}'
        except Exception:
            current_app.logger.exception(f'MCP tool error in {tool_name}')
            result_text = 'An internal error occurred. Please try again.'

        return _ok(req_id, {'content': [{'type': 'text', 'text': result_text}]})

    return _err(req_id, -32601, f'Method not found: {method}')


# ---------------------------------------------------------------------------
# HTTP endpoint
# ---------------------------------------------------------------------------

@bp.route('', methods=['OPTIONS'])
def mcp_options():
    return '', 204


@bp.route('', methods=['GET'])
def mcp_sse():
    """HTTP+SSE transport endpoint — required by Claude.ai custom connectors.

    Claude.ai opens this as a long-lived SSE stream. We immediately send
    an 'endpoint' event pointing to /api/mcp/messages, then stream tool
    responses back as 'message' events.
    """
    if 'text/event-stream' not in request.headers.get('Accept', ''):
        return '', 405

    session_id = uuid.uuid4().hex
    response_queue: queue.Queue = queue.Queue()
    with _sessions_lock:
        _sessions[session_id] = response_queue

    base = request.url_root.rstrip('/')
    messages_url = f'{base}/api/mcp/messages?sessionId={session_id}'

    def generate():
        try:
            yield f'event: endpoint\ndata: {messages_url}\n\n'
            while True:
                try:
                    item = response_queue.get(timeout=25)
                    if item is None:  # sentinel: close the stream
                        break
                    yield f'event: message\ndata: {json.dumps(item)}\n\n'
                except queue.Empty:
                    yield ': keepalive\n\n'  # prevent proxy/browser timeout
        finally:
            with _sessions_lock:
                _sessions.pop(session_id, None)

    return Response(
        stream_with_context(generate()),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no',   # disable nginx buffering for SSE
            'Connection': 'keep-alive',
        }
    )


@bp.route('/messages', methods=['POST'])
def mcp_messages():
    """Receive MCP messages from Claude.ai (SSE transport).

    Claude.ai POSTs here after establishing the SSE stream via GET.
    We process the request and push the response onto the session queue,
    which the SSE generator streams back to the client.
    """
    session_id = request.args.get('sessionId', '')
    with _sessions_lock:
        response_queue = _sessions.get(session_id)
    if not response_queue:
        return jsonify({'error': 'Invalid or expired session'}), 400

    data = request.get_json(silent=True)
    if data is None:
        response_queue.put(_err(None, -32700, 'Parse error'))
        return '', 202

    for req in (data if isinstance(data, list) else [data]):
        resp = _handle_one(req)
        if resp is not None:
            response_queue.put(resp)

    return '', 202


@bp.route('', methods=['POST'])
def mcp_endpoint():
    data = request.get_json(silent=True)
    if data is None:
        return jsonify(_err(None, -32700, 'Parse error: invalid JSON')), 200

    batch = isinstance(data, list)
    requests_list = data if batch else [data]

    responses = [r for req in requests_list if (r := _handle_one(req)) is not None]

    if batch:
        return jsonify(responses), 200
    if responses:
        return jsonify(responses[0]), 200
    return '', 202


@bp.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Accept, Mcp-Protocol-Version'
    response.headers['MCP-Protocol-Version'] = MCP_VERSION
    return response
