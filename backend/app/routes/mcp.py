"""
ZGoogies MCP Server — Admin-only endpoint (MCP Streamable HTTP Transport 2025-03-26)

Exposes 2 admin-only tools for querying registered player data.
Requires an admin API token (obtained from Account → AI Assistant).
Non-admin tokens are rejected at the tool-call level.
"""
from flask import Blueprint, request, jsonify, current_app, Response, stream_with_context
from app import db
from app.models.user import User
from app.models.ai_usage import AiUsage
from app.models.app_setting import AppSetting
from app.models.prediction import Prediction
from app.models.ranking import Ranking
from app.utils.datetime_utils import get_current_utc
from datetime import date
import threading
import queue
import uuid
import json

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


def _require_admin(token):
    """Returns (user, error_string). error_string is None when user is a valid admin."""
    if not token:
        return None, 'Error: Invalid or missing token. Get yours from Account → AI Assistant on zgoogies.online.'
    user = User.query.filter_by(api_token=str(token)).first()
    if not user:
        return None, 'Error: Invalid or missing token. Get yours from Account → AI Assistant on zgoogies.online.'
    if not user.is_admin:
        return None, 'Error: This endpoint is restricted to admins.'
    return user, None


def _check_rate_limit(user_id):
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
        'name': 'list_players',
        'description': (
            'List all registered players with their details: username, full name, email, '
            'role (player/cashier/admin), payment status, who collected the payment, and '
            'registration date. Admin token required.'
        ),
        'inputSchema': {
            'type': 'object',
            'properties': {
                'token': {
                    'type': 'string',
                    'description': 'Your admin ZGoogies API token (Account → AI Assistant on zgoogies.online)'
                }
            },
            'required': ['token']
        }
    },
    {
        'name': 'get_player_details',
        'description': (
            'Get the full profile for a specific player by username: personal info, payment '
            'status, current overall ranking and points, per-round breakdown, and total '
            'number of predictions submitted. Admin token required.'
        ),
        'inputSchema': {
            'type': 'object',
            'properties': {
                'token': {
                    'type': 'string',
                    'description': 'Your admin ZGoogies API token'
                },
                'username': {
                    'type': 'string',
                    'description': 'The username of the player to look up'
                }
            },
            'required': ['token', 'username']
        }
    },
]


# ---------------------------------------------------------------------------
# Tool implementations
# ---------------------------------------------------------------------------

def _tool_list_players(args):
    user, err = _require_admin(args.get('token'))
    if err:
        return err
    _check_rate_limit(user.id)

    users = User.query.order_by(User.created_at.desc()).all()
    paid_count = sum(1 for u in users if u.has_paid)
    lines = [f'Registered players — {len(users)} total, {paid_count} paid, {len(users) - paid_count} unpaid\n']

    for u in users:
        role = 'admin' if u.is_admin else 'cashier' if u.is_cachier else 'player'
        if u.has_paid:
            date_str = u.payment_date.strftime('%d %b %Y') if u.payment_date else 'date unknown'
            payment = f'PAID (to {u.payment_received_by or "?"}, {date_str})'
        else:
            payment = 'UNPAID'
        reg_date = u.created_at.strftime('%d %b %Y') if u.created_at else '?'
        lines.append(
            f'  {u.username} — {u.first_name} {u.surname} | {u.email} | '
            f'{role} | {payment} | Registered: {reg_date}'
        )

    return '\n'.join(lines)


def _tool_get_player_details(args):
    user, err = _require_admin(args.get('token'))
    if err:
        return err
    _check_rate_limit(user.id)

    username = (args.get('username') or '').strip()
    if not username:
        return 'Error: username is required.'

    target = User.query.filter_by(username=username).first()
    if not target:
        return f'Error: No player found with username "{username}".'

    role = 'admin' if target.is_admin else 'cashier' if target.is_cachier else 'player'
    if target.has_paid:
        date_str = target.payment_date.strftime('%d %b %Y') if target.payment_date else 'date unknown'
        payment_info = f'Paid — received by {target.payment_received_by or "?"} on {date_str}'
    else:
        payment_info = 'Not paid'

    reg_date = target.created_at.strftime('%d %b %Y') if target.created_at else '?'

    lines = [f'Player: {target.username} ({target.first_name} {target.surname})']
    lines.append(f'  Email:      {target.email}')
    lines.append(f'  Role:       {role}')
    lines.append(f'  Timezone:   {target.timezone}')
    lines.append(f'  Payment:    {payment_info}')
    lines.append(f'  Registered: {reg_date}')

    overall = Ranking.query.filter_by(user_id=target.id, competition_round_id=None).first()
    if overall:
        total_players = Ranking.query.filter_by(competition_round_id=None).count()
        move = ''
        if overall.previous_rank:
            diff = overall.previous_rank - overall.rank
            if diff > 0:
                move = f' (up {diff})'
            elif diff < 0:
                move = f' (down {abs(diff)})'
        lines.append(f'  Overall:    Rank {overall.rank} of {total_players}{move} — {overall.total_points} pts')

        from app.models.competition_round import CompetitionRound
        round_rankings = Ranking.query.filter(
            Ranking.user_id == target.id,
            Ranking.competition_round_id.isnot(None)
        ).all()
        if round_rankings:
            lines.append('  Per round:')
            for rr in round_rankings:
                round_obj = CompetitionRound.query.get(rr.competition_round_id)
                round_name = round_obj.name if round_obj else f'Round {rr.competition_round_id}'
                lines.append(f'    {round_name}: Rank {rr.rank} — {rr.total_points} pts')
    else:
        lines.append('  Ranking:    not yet ranked')

    pred_count = Prediction.query.filter_by(user_id=target.id).count()
    lines.append(f'  Predictions submitted: {pred_count}')

    return '\n'.join(lines)


TOOL_HANDLERS = {
    'list_players':      _tool_list_players,
    'get_player_details': _tool_get_player_details,
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
            'serverInfo': {'name': 'ZGoogies Admin', 'version': '2.0.0'}
        })

    if method in ('notifications/initialized', 'notifications/cancelled'):
        return None

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
                    if item is None:
                        break
                    yield f'event: message\ndata: {json.dumps(item)}\n\n'
                except queue.Empty:
                    yield ': keepalive\n\n'
        finally:
            with _sessions_lock:
                _sessions.pop(session_id, None)

    return Response(
        stream_with_context(generate()),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no',
            'Connection': 'keep-alive',
        }
    )


@bp.route('/messages', methods=['POST'])
def mcp_messages():
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
