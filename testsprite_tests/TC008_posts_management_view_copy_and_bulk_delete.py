import requests
import time

BASE_URL = "http://localhost:3000"
HEADERS = {"Content-Type": "application/json"}
TIMEOUT = 30


def test_posts_management_view_copy_and_bulk_delete():
    posts = []
    try:
        # Step 1: Trigger agent run to generate posts
        run_resp = requests.post(f"{BASE_URL}/api/agent/run", headers=HEADERS, timeout=TIMEOUT)
        assert run_resp.status_code == 200, f"Agent run failed: {run_resp.text}"
        run_data = run_resp.json()
        assert "runId" in run_data or "status" in run_data, "Unexpected response from /api/agent/run"

        run_id = run_data.get("runId")
        # Step 2: Poll /api/agent/status until run completes or timeout after ~90 seconds
        max_polls = 9
        poll_interval = 10
        status = None
        for _ in range(max_polls):
            status_resp = requests.get(f"{BASE_URL}/api/agent/status", headers=HEADERS, timeout=TIMEOUT)
            assert status_resp.status_code == 200, f"Failed to get agent status: {status_resp.text}"
            status_data = status_resp.json()
            status = status_data.get("status")
            if status in ("completed", "failed", "cancelled"):
                break
            time.sleep(poll_interval)
        assert status == "completed", f"Agent run did not complete successfully. Status: {status}"

        # Step 3: View generated posts
        posts_resp = requests.get(f"{BASE_URL}/api/posts", headers=HEADERS, timeout=TIMEOUT)
        assert posts_resp.status_code == 200, f"Failed to fetch posts: {posts_resp.text}"
        posts_data = posts_resp.json()
        posts = posts_data.get("posts") or posts_data.get("generatedPosts") or posts_data.get("data") or []
        assert isinstance(posts, list), "Posts data should be a list"
        assert len(posts) > 0, "No posts generated for management test"

        # Step 4: Test one-click copy simulation by verifying content fields exist per post
        platforms = {"X", "Instagram", "Facebook"}
        found_preview_card = False
        for post in posts:
            platform = post.get("platform")
            content = post.get("content")
            preview_card = post.get("previewCard") or post.get("preview_card")
            if platform in platforms and content and preview_card:
                found_preview_card = True
                assert isinstance(content, str) and len(content.strip()) > 0
                assert platform in platforms
        assert found_preview_card, "No valid post with platform-specific preview card found"

        # Step 5: Bulk delete posts with confirmation modal simulation
        post_ids = [p.get("id") for p in posts if p.get("id")]
        assert len(post_ids) > 0, "No valid post IDs for bulk delete"

        delete_payload = {"ids": post_ids, "confirm": True}
        delete_resp = requests.post(f"{BASE_URL}/api/posts/delete", json=delete_payload, headers=HEADERS, timeout=TIMEOUT)
        assert delete_resp.status_code == 200, f"Bulk delete failed: {delete_resp.text}"
        delete_data = delete_resp.json()
        assert delete_data.get("deletedCount") == len(post_ids) or delete_data.get("success") is True, "Bulk delete response unexpected"

        # Step 6: Confirm posts are deleted by fetching posts again
        posts_after_delete_resp = requests.get(f"{BASE_URL}/api/posts", headers=HEADERS, timeout=TIMEOUT)
        assert posts_after_delete_resp.status_code == 200, f"Failed to fetch posts after delete: {posts_after_delete_resp.text}"
        posts_after_delete = posts_after_delete_resp.json().get("posts") or []
        remaining_ids = {p.get("id") for p in posts_after_delete if p.get("id")}
        for deleted_id in post_ids:
            assert deleted_id not in remaining_ids, f"Post ID {deleted_id} was not deleted"

    except (requests.RequestException, AssertionError) as e:
        raise AssertionError(f"Test failed: {e}")


test_posts_management_view_copy_and_bulk_delete()
