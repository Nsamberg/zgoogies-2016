"""Tests for the MCP server endpoint (/api/mcp)."""
import pytest
from app import db
from app.models.user import User
from app.models.ai_usage import AiUsage
from app.models.app_setting import AppSetting
from datetime import date


TEST_TOKEN = 'testtoken1234567890abcdef12345678'


def _mcp(client, method, params=None):
    """Helper: POST a JSON-RPC request to /api/mcp."""
    body = {'jsonrpc': '2.0', 'id': 1, 'method': method}
    if params is not None:
        body['params'] = params
    return client.post('/api/mcp', json=body)


@pytest.fixture(autouse=True)
def set_player_token(app):
    """Assign a known API token to player1 before each test and clean up after."""
    with app.app_context():
        user = User.query.filter_by(username='player1').first()
        original = user.api_token
        user.api_token = TEST_TOKEN
        db.session.commit()
    yield
    with app.app_context():
        user = User.query.filter_by(username='player1').first()
        user.api_token = original
        # Clean up rate limit rows created during tests
        AiUsage.query.filter_by(user_id=user.id, date=date.today()).delete()
        db.session.commit()


class TestMcpProtocol:
    def test_initialize_returns_capabilities(self, client):
        r = _mcp(client, 'initialize', {'protocolVersion': '2025-03-26', 'clientInfo': {}})
        assert r.status_code == 200
        data = r.get_json()
        assert data['result']['protocolVersion'] == '2025-03-26'
        assert 'tools' in data['result']['capabilities']
        assert data['result']['serverInfo']['name'] == 'ZGoogies'

    def test_tools_list_returns_six_tools(self, client):
        r = _mcp(client, 'tools/list')
        assert r.status_code == 200
        tools = r.get_json()['result']['tools']
        assert len(tools) == 6
        names = {t['name'] for t in tools}
        assert names == {
            'get_my_predictions', 'get_upcoming_games', 'get_my_ranking',
            'get_all_rankings', 'submit_prediction', 'get_game_list'
        }

    def test_tools_each_have_required_schema_fields(self, client):
        r = _mcp(client, 'tools/list')
        for tool in r.get_json()['result']['tools']:
            assert 'name' in tool
            assert 'description' in tool
            assert 'inputSchema' in tool

    def test_notification_returns_no_content(self, client):
        r = _mcp(client, 'notifications/initialized')
        assert r.status_code == 202

    def test_unknown_method_returns_error(self, client):
        r = _mcp(client, 'nonexistent/method')
        assert r.status_code == 200
        data = r.get_json()
        assert 'error' in data

    def test_invalid_json_returns_parse_error(self, client):
        r = client.post('/api/mcp', data='not json', content_type='application/json')
        assert r.status_code == 200
        data = r.get_json()
        assert data['error']['code'] == -32700

    def test_ping_returns_empty_result(self, client):
        r = _mcp(client, 'ping')
        assert r.status_code == 200
        assert r.get_json()['result'] == {}


class TestMcpTools:
    def _call(self, client, tool_name, extra_args=None):
        args = {'token': TEST_TOKEN}
        if extra_args:
            args.update(extra_args)
        return _mcp(client, 'tools/call', {'name': tool_name, 'arguments': args})

    def test_invalid_token_returns_error_text(self, client):
        r = _mcp(client, 'tools/call', {
            'name': 'get_my_predictions',
            'arguments': {'token': 'bad_token_xyz'}
        })
        assert r.status_code == 200
        text = r.get_json()['result']['content'][0]['text']
        assert 'Invalid' in text or 'Error' in text

    def test_get_my_predictions(self, client):
        r = self._call(client, 'get_my_predictions')
        assert r.status_code == 200
        result = r.get_json()['result']
        assert 'content' in result
        assert result['content'][0]['type'] == 'text'

    def test_get_upcoming_games(self, client):
        r = self._call(client, 'get_upcoming_games')
        assert r.status_code == 200
        text = r.get_json()['result']['content'][0]['text']
        # Should either list games or say none open
        assert len(text) > 0

    def test_get_my_ranking(self, client):
        r = self._call(client, 'get_my_ranking')
        assert r.status_code == 200
        assert r.get_json()['result']['content'][0]['type'] == 'text'

    def test_get_all_rankings(self, client):
        r = self._call(client, 'get_all_rankings')
        assert r.status_code == 200
        text = r.get_json()['result']['content'][0]['text']
        assert len(text) > 0

    def test_get_game_list(self, client):
        r = self._call(client, 'get_game_list')
        assert r.status_code == 200
        text = r.get_json()['result']['content'][0]['text']
        assert 'ZGoogies Game List' in text

    def test_submit_prediction_for_upcoming_game(self, client, app):
        from app.models.game import Game
        from app.models.prediction import Prediction
        with app.app_context():
            game = Game.query.filter(Game.is_scored == False).first()
            assert game is not None
            game_id = game.id
            # Ensure player1 has paid (other tests may have modified this)
            user = User.query.filter_by(username='player1').first()
            user.has_paid = True
            db.session.commit()
        r = self._call(client, 'submit_prediction', {
            'game_id': game_id, 'score_a': 2, 'score_b': 1
        })
        assert r.status_code == 200
        text = r.get_json()['result']['content'][0]['text']
        assert 'Saved' in text or 'Updated' in text
        # Clean up
        with app.app_context():
            user = User.query.filter_by(username='player1').first()
            Prediction.query.filter_by(user_id=user.id, game_id=game_id).delete()
            db.session.commit()

    def test_submit_prediction_for_closed_game_returns_error(self, client, app):
        from app.models.game import Game
        with app.app_context():
            game = Game.query.filter(Game.is_scored == True).first()
            game_id = game.id
        r = self._call(client, 'submit_prediction', {
            'game_id': game_id, 'score_a': 1, 'score_b': 0
        })
        text = r.get_json()['result']['content'][0]['text']
        assert 'Error' in text

    def test_submit_prediction_invalid_score_returns_error(self, client):
        r = self._call(client, 'submit_prediction', {
            'game_id': 1, 'score_a': -1, 'score_b': 0
        })
        text = r.get_json()['result']['content'][0]['text']
        assert 'Error' in text or 'negative' in text.lower()


class TestMcpRateLimit:
    def test_rate_limit_enforced(self, client, app):
        """Set a tiny limit of 2 and verify the third call is blocked."""
        with app.app_context():
            AppSetting.set('ai_daily_limit', '2')

        for _ in range(2):
            r = _mcp(client, 'tools/call', {
                'name': 'get_game_list',
                'arguments': {'token': TEST_TOKEN}
            })
            text = r.get_json()['result']['content'][0]['text']
            assert 'Error' not in text or 'limit' not in text.lower()

        r = _mcp(client, 'tools/call', {
            'name': 'get_game_list',
            'arguments': {'token': TEST_TOKEN}
        })
        text = r.get_json()['result']['content'][0]['text']
        assert 'limit' in text.lower()

        with app.app_context():
            AppSetting.delete('ai_daily_limit')
