import requests

BASE_URL = "http://localhost:3000"
TIMEOUT = 30
HEADERS = {"Content-Type": "application/json"}


def test_api_response_success_and_error_handling():
    # Test /api/agent/run endpoint
    run_url = f"{BASE_URL}/api/agent/run"
    # Success case: try POST without body if allowed or with empty json
    try:
        response = requests.post(run_url, headers=HEADERS, timeout=TIMEOUT)
    except requests.RequestException as e:
        assert False, f"/api/agent/run request failed: {e}"

    assert response.status_code in (200, 201, 202), f"/api/agent/run unexpected status code: {response.status_code}"
    try:
        json_data = response.json()
    except Exception:
        json_data = None
    if response.status_code >= 400:
        # Error should contain meaningful message
        assert json_data and ("error" in json_data or "message" in json_data), "/api/agent/run error response missing error message"
    else:
        # Success response typical keys check (optional)
        assert json_data is None or isinstance(json_data, dict)

    # Test /api/agent/status endpoint
    status_url = f"{BASE_URL}/api/agent/status"
    try:
        response = requests.get(status_url, headers=HEADERS, timeout=TIMEOUT)
    except requests.RequestException as e:
        assert False, f"/api/agent/status request failed: {e}"

    assert response.status_code == 200, f"/api/agent/status unexpected status code: {response.status_code}"
    try:
        json_data = response.json()
    except Exception:
        assert False, "/api/agent/status response is not valid JSON"
    # Expecting a dictionary with status info; check keys exist if known?
    assert isinstance(json_data, dict), "/api/agent/status response not a JSON object"

    # Error case: forced wrong method (POST) on status endpoint
    try:
        response = requests.post(status_url, headers=HEADERS, timeout=TIMEOUT)
    except requests.RequestException as e:
        assert False, f"/api/agent/status error case request failed: {e}"
    assert response.status_code in (405, 410), f"/api/agent/status error case unexpected status code: {response.status_code}"
    try:
        error_json = response.json()
    except Exception:
        error_json = None
    if response.status_code >= 400:
        assert error_json and ("error" in error_json or "message" in error_json), "/api/agent/status error response missing error message"

    # Test /api/test endpoint
    test_url = f"{BASE_URL}/api/test"
    # Success case: GET method expected
    try:
        response = requests.get(test_url, headers=HEADERS, timeout=TIMEOUT)
    except requests.RequestException as e:
        assert False, f"/api/test request failed: {e}"

    assert response.status_code == 200, f"/api/test unexpected status code: {response.status_code}"
    try:
        json_data = response.json()
    except Exception:
        assert False, "/api/test response is not valid JSON"
    assert isinstance(json_data, dict), "/api/test response not a JSON object"

    # Error case: PUT method not allowed?
    try:
        response = requests.put(test_url, headers=HEADERS, json={"invalid": "data"}, timeout=TIMEOUT)
    except requests.RequestException as e:
        assert False, f"/api/test PUT error case request failed: {e}"

    assert response.status_code in (400, 405, 404), f"/api/test PUT error case unexpected status code: {response.status_code}"
    try:
        error_json = response.json()
    except Exception:
        error_json = None
    if response.status_code >= 400:
        assert error_json and ("error" in error_json or "message" in error_json), "/api/test PUT error response missing error message"


test_api_response_success_and_error_handling()
