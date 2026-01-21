import requests
import time

BASE_URL = "http://localhost:3000/api/agent"
HEADERS = {"Content-Type": "application/json"}
TIMEOUT = 30

def test_database_updates_reflect_ui_state():
    run_id = None
    try:
        # 1) Start an agent run via POST /api/agent - this triggers database updates
        run_resp = requests.post(f"{BASE_URL}", headers=HEADERS, timeout=TIMEOUT)
        assert run_resp.status_code == 200, f"Agent run start failed: {run_resp.text}"
        run_data = run_resp.json()
        assert "id" in run_data, "Run response missing run ID"
        run_id = run_data["id"]
        assert run_id, "Run ID is empty"

        # 2) Wait briefly
        time.sleep(3)

        # 3) Check agent run status via GET /api/agent/status
        status_resp = requests.get(f"{BASE_URL}/status", headers=HEADERS, timeout=TIMEOUT)
        assert status_resp.status_code == 200, f"Agent status check failed: {status_resp.text}"
        status_data = status_resp.json()
        assert isinstance(status_data, dict), "Status response is not a dict"
        current_run_id = status_data.get("currentRunId") or status_data.get("runId") or status_data.get("id")
        assert current_run_id == run_id, "Agent status current run ID does not match started run ID"
        assert "queueLength" in status_data, "Agent status missing queue length"
        assert isinstance(status_data["queueLength"], int), "Queue length is not integer"
        assert "lastRunStatus" in status_data, "Agent status missing lastRunStatus"
        assert status_data["lastRunStatus"] in ["success", "running", "failed"], "Invalid lastRunStatus value"

        # 4) Test /api/agent/test endpoint GET
        test_resp = requests.get(f"{BASE_URL}/test", headers=HEADERS, timeout=TIMEOUT)
        assert test_resp.status_code == 200, f"Test endpoint check failed: {test_resp.text}"
        test_data = test_resp.json()
        assert isinstance(test_data, dict), "Test endpoint response is not a dict"
        for key in ["news_items_count", "agent_queue_count", "agent_runs_count", "feeder_settings_version"]:
            assert key in test_data, f"Test endpoint missing expected key: {key}"
            assert isinstance(test_data[key], (int, str)), f"{key} has invalid type"

        # 5) Validate counts
        assert test_data["news_items_count"] > 0, "No news_items found after agent run"
        assert test_data["agent_queue_count"] >= 0, "agent_queue_count invalid after agent run"
        assert test_data["agent_runs_count"] > 0, "No agent_runs recorded after agent run"
        assert isinstance(test_data["feeder_settings_version"], (str, int)), "Invalid feeder_settings_version type"

        # 6) Check error handling: call POST with invalid Content-Type
        invalid_resp = requests.post(f"{BASE_URL}", headers={"Content-Type": "text/plain"}, timeout=TIMEOUT)
        assert invalid_resp.status_code in [400, 415, 422, 500], f"Invalid request not properly handled: {invalid_resp.status_code}"

    finally:
        if run_id:
            try:
                del_resp = requests.delete(f"{BASE_URL}/run/{run_id}", headers=HEADERS, timeout=TIMEOUT)
                assert del_resp.status_code in [200, 204, 404], f"Run deletion failed: {del_resp.status_code}"
            except Exception:
                pass


test_database_updates_reflect_ui_state()
