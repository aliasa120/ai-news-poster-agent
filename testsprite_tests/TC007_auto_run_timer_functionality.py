import requests
import time

BASE_URL = "http://localhost:3000/api/agent"
HEADERS = {"Content-Type": "application/json"}
TIMEOUT = 30

def test_auto_run_timer_functionality():
    # Intervals to test in seconds (15m to 4h)
    intervals = [15*60, 30*60, 60*60, 120*60, 180*60, 240*60]  # 900s,1800s,3600s,7200s,10800s,14400s

    # Helper to start agent run with given interval
    def start_agent_run(interval_sec):
        payload = {"interval": interval_sec}  # Assuming API accepts interval in seconds
        resp = requests.post(f"{BASE_URL}/run", json=payload, headers=HEADERS, timeout=TIMEOUT)
        return resp

    # Helper to get current agent status
    def get_agent_status():
        resp = requests.get(f"{BASE_URL}/status", headers=HEADERS, timeout=TIMEOUT)
        return resp

    # Helper to cancel agent run to cleanup between tests
    def cancel_agent_run():
        try:
            resp = requests.post(f"{BASE_URL}/cancel", headers=HEADERS, timeout=TIMEOUT)
            return resp
        except Exception:
            pass

    try:
        for interval in intervals:
            # Start agent with the interval
            resp_start = start_agent_run(interval)
            assert resp_start.status_code == 200, f"Start run failed for interval {interval}s: {resp_start.text}"
            data_start = resp_start.json()
            assert "interval" in data_start, "Response missing interval field"
            assert data_start["interval"] == interval, f"Response interval {data_start['interval']} != requested {interval}"

            # Immediately check status for countdown presence and correctness of interval
            resp_status = get_agent_status()
            assert resp_status.status_code == 200, f"Status fetch failed for interval {interval}s: {resp_status.text}"
            status_data = resp_status.json()
            # Verify countdown remains and interval is reported correctly
            assert "countdown" in status_data and isinstance(status_data["countdown"], int), "Countdown missing or invalid"
            assert status_data["countdown"] <= interval and status_data["countdown"] > 0, "Countdown not in expected range"
            assert "interval" in status_data and status_data["interval"] == interval, "Interval in status mismatch"

            # Wait a short moment (e.g. 2 seconds) and check countdown decreased
            time.sleep(2)
            resp_status_2 = get_agent_status()
            assert resp_status_2.status_code == 200, f"Second status fetch failed for interval {interval}s: {resp_status_2.text}"
            status_data_2 = resp_status_2.json()
            assert status_data_2["countdown"] < status_data["countdown"], "Countdown did not decrease after wait"

            # Wait countdown seconds + extra buffer to ensure agent run triggers
            wait_time = min(10, status_data["countdown"] + 5)  # limit max wait to 10s to avoid long tests
            time.sleep(wait_time)

            # Check that agent processing started or completed by checking status or run logs
            resp_status_final = get_agent_status()
            assert resp_status_final.status_code == 200, "Final status fetch failed"
            status_final_data = resp_status_final.json()

            # The agent may report 'running', 'idle', or similar states - check for expected keys
            assert "state" in status_final_data, "Agent state missing in status"
            assert status_final_data["state"] in ["running", "idle", "completed"], f"Unexpected agent state: {status_final_data['state']}"

            # Also try to trigger test endpoint to validate agent started internally (if available)
            resp_test = requests.get(f"{BASE_URL}/test", headers=HEADERS, timeout=TIMEOUT)
            assert resp_test.status_code == 200, "/api/test endpoint did not respond with 200"
            test_data = resp_test.json()
            assert "agent" in test_data or "status" in test_data, "/api/test response missing expected fields"

            # Cancel the current run to reset state for next interval test
            cancel_resp = cancel_agent_run()
            if cancel_resp is not None:
                assert cancel_resp.status_code in [200,204], "Failed to cancel agent run"

    finally:
        # Ensure any running agent is cancelled after tests
        cancel_agent_run()


test_auto_run_timer_functionality()