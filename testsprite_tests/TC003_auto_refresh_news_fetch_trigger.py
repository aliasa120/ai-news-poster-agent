import requests
import time

BASE_URL = "http://localhost:3000/api/agent"
HEADERS = {"Content-Type": "application/json"}
TIMEOUT = 30

def test_auto_refresh_news_fetch_trigger():
    """
    Verify that the auto-refresh timer triggers the news fetching API via /api/agent/run endpoint.
    Due to unavailability of /status endpoint, the test checks only that the run endpoint responds correctly.
    """

    # Helper to start the agent run (simulate auto-refresh trigger)
    def start_auto_refresh():
        try:
            resp = requests.post(f"{BASE_URL}/run", headers=HEADERS, timeout=TIMEOUT)
            resp.raise_for_status()
            return resp.json()
        except requests.RequestException as e:
            assert False, f"Failed to start auto-refresh run: {e}"

    # Step 1: Activate auto-refresh via run API
    start_resp = start_auto_refresh()
    assert isinstance(start_resp, dict), "Response from run API should be a JSON object"

    print("Test TC003: auto_refresh_news_fetch_trigger passed.")


test_auto_refresh_news_fetch_trigger()
