import requests
import time
import threading

BASE_URL = "http://localhost:3000/api/agent"
TIMEOUT = 30
HEADERS = {
    "Accept": "application/json",
    "Content-Type": "application/json"
}

def test_stream_real_time_activity_logs():
    run_id = None
    stop_stream = False

    def stream_logs():
        nonlocal stop_stream, run_id
        url = f"{BASE_URL}/status"
        params = {}
        headers = HEADERS.copy()
        try:
            # Stream the activity logs as a long-poll or repeatedly fetch status
            # Assuming the API supports Server-Sent Events or similar for streaming
            # If not, fallback to polling every 1 second for updates
            while not stop_stream:
                if run_id is not None:
                    params = {"runId": run_id}
                response = requests.get(url, headers=headers, params=params, timeout=TIMEOUT)
                assert response.status_code == 200, f"Status endpoint returned {response.status_code}"
                data = response.json()
                assert isinstance(data, dict), "Status response is not a JSON object"
                # Expect keys related to live activity logs and processing states
                assert "runId" in data or run_id is not None, "Missing runId in activity logs"
                # Validate presence of activity logs and states keys
                assert "activityLogs" in data or "logs" in data or "activities" in data, "Activity logs key missing"
                # Basic checks on content type and structure
                logs = data.get("activityLogs") or data.get("logs") or data.get("activities")
                assert isinstance(logs, list), "Logs should be a list"
                # Attempt to confirm some entries have timestamps and tool call info
                if logs:
                    for log in logs:
                        assert "timestamp" in log, "Log entry missing timestamp"
                        assert "message" in log or "state" in log, "Log entry missing expected keys"
                time.sleep(1)
        except requests.RequestException as e:
            assert False, f"Request exception during streaming status logs: {e}"

    try:
        # Start agent run to generate real-time logs
        run_url = BASE_URL
        run_response = requests.post(run_url, headers=HEADERS, timeout=TIMEOUT)
        assert run_response.status_code in {200, 201}, f"Agent run start failed with {run_response.status_code}"
        run_json = run_response.json()
        run_id = run_json.get("runId") or run_json.get("id")
        assert run_id is not None, "Run ID not returned on agent run start"

        # Start thread to stream logs in parallel
        stream_thread = threading.Thread(target=stream_logs)
        stream_thread.start()

        # Let the streaming run for a period to collect logs
        time.sleep(10)

        # After streaming period, stop the stream
        stop_stream = True
        stream_thread.join()

        # Final check on run status to ensure run completed or is in expected state
        status_url = f"{BASE_URL}/status"
        status_params = {"runId": run_id}
        status_response = requests.get(status_url, headers=HEADERS, params=status_params, timeout=TIMEOUT)
        assert status_response.status_code == 200, f"Status check failed with {status_response.status_code}"
        status_data = status_response.json()
        assert "state" in status_data or "status" in status_data, "Run status missing in final status call"
        state_val = status_data.get("state") or status_data.get("status")
        assert isinstance(state_val, str), "Run status value should be a string"
        # Optionally check if state is one of expected states e.g. running, completed, failed
        assert state_val.lower() in {"running", "completed", "failed", "cancelled"} , f"Unexpected run state: {state_val}"

    finally:
        # Attempt to cancel or cleanup run if API supports cancellation
        if run_id:
            cancel_url = BASE_URL
            try:
                # Attempt DELETE with JSON payload
                cancel_response = requests.delete(cancel_url, headers=HEADERS, json={"runId": run_id}, timeout=TIMEOUT)
                if cancel_response.status_code not in {200, 204}:
                    # Try POST to cancel endpoint if exists
                    cancel_response = requests.post(f"{BASE_URL}/cancel", headers=HEADERS, json={"runId": run_id}, timeout=TIMEOUT)
                # No assertion on cancel as not all APIs support it
            except Exception:
                pass

test_stream_real_time_activity_logs()
