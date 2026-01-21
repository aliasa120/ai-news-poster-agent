import requests
from datetime import datetime, timedelta

BASE_URL = "http://localhost:3000"
HEADERS = {
    "Content-Type": "application/json"
}
TIMEOUT = 30

def test_fetch_news_with_freshness_filtering():
    """
    Test fetching news articles via /api/feeder API with freshness filtering (1h to 24h).
    Validate that only news articles fresh within the specified hours are returned.
    """

    # Define a helper to fetch news articles from feeder API
    def fetch_news():
        # GET /api/feeder/ assumed to return news articles
        resp = requests.get(
            f"{BASE_URL}/api/feeder/",
            headers=HEADERS,
            timeout=TIMEOUT,
        )
        assert resp.status_code == 200, f"feeder API failed with {resp.status_code}: {resp.text}"
        data = resp.json()
        news_articles = data.get("news_items") or data.get("news_articles")
        assert news_articles is not None, "No news_articles key returned in feeder response"
        return news_articles

    # Test across different freshness hour settings 1 to 24 hours (sample only 3 values for brevity)
    for freshness_hour in [1, 6, 24]:
        news = fetch_news()
        now = datetime.utcnow()

        assert isinstance(news, list), "news_articles should be a list"

        # Validate that each news article's published time is within freshness_hours
        for article in news:
            # Article must have published_at in ISO8601 format or epoch timestamp expected
            published_at_str = article.get("published_at")
            assert published_at_str, "Article missing published_at field"
            try:
                # Try parsing ISO 8601 date string
                published_dt = datetime.fromisoformat(published_at_str.replace("Z", "+00:00")).replace(tzinfo=None)
            except Exception:
                # If parsing fails, try epoch int
                try:
                    epoch = int(published_at_str)
                    published_dt = datetime.utcfromtimestamp(epoch)
                except Exception:
                    assert False, f"Invalid published_at format: {published_at_str}"

            age = now - published_dt
            allowed_delta = timedelta(hours=freshness_hour)
            # Articles might be older than freshness_hour, so filter out those older
            # and only check that returned articles are not older than freshness_hour
            assert age <= allowed_delta, (
                f"Article published_at {published_at_str} is older than freshness filter {freshness_hour}h"
            )

    print("test_fetch_news_with_freshness_filtering passed")


test_fetch_news_with_freshness_filtering()
