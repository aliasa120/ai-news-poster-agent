I will implement the "Layer 6" image extraction feature using Next.js App Router patterns. This feature will extract images sequentially (article-by-article) to ensure reliability and performance.

### 1. Install Dependencies
I will install the required Node.js packages for the extraction logic:
- `axios`: For making HTTP requests to article pages.
- `cheerio`: For parsing HTML and extracting `og:image` tags.

### 2. Next.js Backend Implementation (App Router)
**A. Update `lib/feed-store.ts`**
- Add `updateNewsItemImage(id, imageUrl)` to handle database updates securely.

**B. Create Next.js API Route (`app/api/feeder/extract-image/route.ts`)**
- Create a server-side route handler (`POST`) compatible with Next.js App Router.
- This handler will:
  1.  Receive `articleId` and `url`.
  2.  Fetch the URL using `axios`.
  3.  Parse HTML with `cheerio` to find the best image (`og:image` > `twitter:image` > `img` tag).
  4.  Update the database.
  5.  Return the result as JSON.

### 3. Next.js Frontend Implementation (`app/feeder/page.tsx`)
**A. State & Logic**
- I will use React `useState` and `useEffect` hooks to manage the "Layer 6" process.
- **Sequential Processing:** I will implement a queue system that processes one article at a time by calling the API route, waiting for the response, and then moving to the next.

**B. "Layer 6" Triggers**
- **Auto-Trigger:** In the `fetchFromRSS` function, after a successful feed refresh, I will set a timer (based on user preference, e.g., 2 minutes) to automatically start the sequential image extraction.
- **Manual Trigger:** I will add a control in the UI to manually start this process.

### 4. UI Components (`app/feeder/components/FeedSettings.tsx`)
- Update the settings component to include:
  - "Auto Extract Images" toggle.
  - "Extraction Delay" input (minutes).
  - "Start Extraction Now" button.

### 5. Verification
- I will verify the implementation by running the Next.js development server.
- I will confirm that images are extracted one by one and displayed correctly in the feed.
