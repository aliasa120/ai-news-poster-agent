import requests
import time

BASE_URL = "http://localhost:3000"
API_RUN = "/api/agent/run"
API_STATUS = "/api/agent/status"
TIMEOUT = 30
HEADERS = {"Content-Type": "application/json"}

def test_agent_processing_with_tiered_tool_usage():
    """
    Test the AI agent processing API to ensure it correctly applies the 4-tiered logic for generating social media posts
    using zero, one, or multiple tools (Jina AI, Serper API, Pinecone vector DB) and properly falls back on failures.
    """

    # A helper method to run agent processing and verify response
    def run_agent_processing(payload):
        try:
            resp = requests.post(f"{BASE_URL}{API_RUN}", headers=HEADERS, json=payload, timeout=TIMEOUT)
            assert resp.status_code == 200
            data = resp.json()
            # Validate response structure:
            assert "post" in data and isinstance(data["post"], dict)
            # Check required keys in post
            post = data["post"]
            assert "content" in post and isinstance(post["content"], str)
            assert "used_tools" in post and isinstance(post["used_tools"], list)
            # used_tools can be empty (zero tools) or list of strings (tools used)
            return post
        except (requests.RequestException, AssertionError) as e:
            raise AssertionError(f"/api/agent/run failed or returned invalid data for payload {payload}: {e}")

    # Tier 0: zero tools
    payload_zero_tools = {
        "text": "Generate a social media post without external tools.",
        "tools": []
    }

    # Tier 1: single tool (Jina AI)
    payload_single_tool = {
        "text": "Generate a social media post using Jina AI tool only.",
        "tools": ["jina_ai"]
    }

    # Tier 2: multiple tools (Jina AI + Serper API)
    payload_multiple_tools = {
        "text": "Generate a social media post using Jina AI and Serper API tools.",
        "tools": ["jina_ai", "serper_api"]
    }

    # Tier 3: all tools including Pinecone vector DB
    payload_all_tools = {
        "text": "Generate a social media post using Jina AI, Serper API and Pinecone DB tools.",
        "tools": ["jina_ai", "serper_api", "pinecone_db"]
    }

    # Run the agent processing for each payload and verify responses include correct tools usage
    post_zero = run_agent_processing(payload_zero_tools)
    assert post_zero["used_tools"] == []

    post_single = run_agent_processing(payload_single_tool)
    assert "jina_ai" in post_single["used_tools"] or post_single["used_tools"] == []

    post_multi = run_agent_processing(payload_multiple_tools)
    assert any(tool in post_multi["used_tools"] for tool in ["jina_ai", "serper_api"])

    post_all = run_agent_processing(payload_all_tools)
    assert any(tool in post_all["used_tools"] for tool in ["jina_ai", "serper_api", "pinecone_db"])

    # Verify /api/agent/status endpoint reports consistent status after runs
    try:
        status_resp = requests.get(f"{BASE_URL}{API_STATUS}", headers=HEADERS, timeout=TIMEOUT)
        assert status_resp.status_code == 200
        status_data = status_resp.json()
        assert "running" in status_data and isinstance(status_data["running"], bool)
        assert "last_run" in status_data
        if "error" in status_data:
            assert status_data["error"] is None or isinstance(status_data["error"], str)
    except (requests.RequestException, AssertionError) as e:
        raise AssertionError(f"/api/agent/status endpoint failed or returned invalid data: {e}")

    # Negative test: Provide invalid tool name to validate fallback on failure
    payload_invalid_tool = {
        "text": "Test invalid tool fallback.",
        "tools": ["invalid_tool_xyz"]
    }
    try:
        resp_invalid = requests.post(f"{BASE_URL}{API_RUN}", headers=HEADERS, json=payload_invalid_tool, timeout=TIMEOUT)
        if resp_invalid.status_code == 200:
            data_invalid = resp_invalid.json()
            assert "post" in data_invalid
            assert "invalid_tool_xyz" not in data_invalid["post"].get("used_tools", [])
        else:
            assert resp_invalid.status_code in (400, 422)
    except requests.RequestException as e:
        raise AssertionError(f"/api/agent/run failed on invalid tool test: {e}")

test_agent_processing_with_tiered_tool_usage()
