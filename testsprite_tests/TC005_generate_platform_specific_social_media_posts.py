import requests
import time

BASE_URL = "http://localhost:3000/api/agent"
TIMEOUT = 30
HEADERS = {
    "Content-Type": "application/json"
}

def test_generate_platform_specific_social_media_posts():
    # Prepare payload to trigger agent run to generate posts
    run_payload = {
        "action": "generate_posts"
    }

    post_id = None
    try:
        # 1. Trigger a run to generate social media posts
        run_resp = requests.post(f"{BASE_URL}/run", json=run_payload, headers=HEADERS, timeout=TIMEOUT)
        assert run_resp.status_code == 200, f"Expected 200 from /run but got {run_resp.status_code}"
        run_data = run_resp.json()
        assert "run_id" in run_data, "run_id not present in run response"

        run_id = run_data["run_id"]

        # 2. Poll the status endpoint until run is complete or timeout (~30s max)
        status_url = f"{BASE_URL}/status?run_id={run_id}"
        for _ in range(15):
            status_resp = requests.get(status_url, headers=HEADERS, timeout=TIMEOUT)
            assert status_resp.status_code == 200, f"Expected 200 from /status but got {status_resp.status_code}"
            status_data = status_resp.json()
            if status_data.get("status") == "completed":
                post_id = status_data.get("post_id")
                break
            elif status_data.get("status") == "error":
                raise AssertionError(f"Agent run failed with error: {status_data.get('error_message')}")
            time.sleep(2)
        else:
            raise TimeoutError("Agent run did not complete within expected time")

        assert post_id is not None, "No post_id returned after agent run completion"

        # 3. Get generated post details via post endpoint if supported
        # Assuming /posts/{post_id} can fetch post by post_id for verification
        post_resp = requests.get(f"http://localhost:3000/api/posts/{post_id}", headers=HEADERS, timeout=TIMEOUT)
        assert post_resp.status_code == 200, f"Expected 200 from /posts/{{post_id}} but got {post_resp.status_code}"
        post_data = post_resp.json()
        assert isinstance(post_data, dict), "Post data response is not a dictionary"

        platforms = ["X", "Instagram", "Facebook"]
        # Character limits according to typical platform restrictions
        char_limits = {
            "X": 280,
            "Instagram": 2200,
            "Facebook": 63206
        }

        for platform in platforms:
            assert platform in post_data, f"{platform} post missing in generated data"
            content = post_data[platform].get("content")
            assert isinstance(content, str), f"{platform} content is not a string"
            length = len(content)
            limit = char_limits[platform]

            # Check character limits
            assert length <= limit, f"{platform} post exceeds character limit ({length} > {limit})"

            # Check presence of hashtags - assume at least one hashtag per post
            hashtags = post_data[platform].get("hashtags", [])
            assert isinstance(hashtags, list), f"{platform} hashtags is not a list"
            assert len(hashtags) > 0, f"{platform} post should contain at least one hashtag"

            # Check presence of emojis - check content contains at least one emoji unicode
            emojis_found = any(
                (0x1F600 <= ord(char) <= 0x1F64F) or  # Emoticons
                (0x1F300 <= ord(char) <= 0x1F5FF) or  # Misc Symbols and Pictographs
                (0x1F680 <= ord(char) <= 0x1F6FF) or  # Transport and Map
                (0x2600 <= ord(char) <= 0x26FF) or    # Misc symbols
                (0x2700 <= ord(char) <= 0x27BF)       # Dingbats
                for char in content
            )
            assert emojis_found, f"{platform} post should contain at least one emoji"

            # Check presence of engagement questions - assume a question mark in content
            assert "?" in content, f"{platform} post should include engagement question"

    finally:
        # Cleanup: delete generated post if endpoint supports deletion
        if post_id:
            try:
                del_resp = requests.delete(f"http://localhost:3000/api/posts/{post_id}", headers=HEADERS, timeout=TIMEOUT)
                assert del_resp.status_code in (200, 204), f"Failed to delete post {post_id}, status {del_resp.status_code}"
            except Exception:
                pass

test_generate_platform_specific_social_media_posts()
