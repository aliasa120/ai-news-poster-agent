import asyncio
from playwright import async_api
from playwright.async_api import expect

async def run_test():
    pw = None
    browser = None
    context = None
    
    try:
        # Start a Playwright session in asynchronous mode
        pw = await async_api.async_playwright().start()
        
        # Launch a Chromium browser in headless mode with custom arguments
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",         # Set the browser window size
                "--disable-dev-shm-usage",        # Avoid using /dev/shm which can cause issues in containers
                "--ipc=host",                     # Use host-level IPC for better stability
                "--single-process"                # Run the browser in a single process mode
            ],
        )
        
        # Create a new browser context (like an incognito window)
        context = await browser.new_context()
        context.set_default_timeout(5000)
        
        # Open a new page in the browser context
        page = await context.new_page()
        
        # Navigate to your target URL and wait until the network request is committed
        await page.goto("http://localhost:3000/agent", wait_until="commit", timeout=10000)
        
        # Wait for the main page to reach DOMContentLoaded state (optional for stability)
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=3000)
        except async_api.Error:
            pass
        
        # Iterate through all iframes and wait for them to load as well
        for frame in page.frames:
            try:
                await frame.wait_for_load_state("domcontentloaded", timeout=3000)
            except async_api.Error:
                pass
        
        # Interact with the page elements to simulate user flow
        # -> Click the Start Agent button to trigger agent run and news refresh simultaneously.
        frame = context.pages[-1]
        # Click the Start Agent button to trigger agent run and news refresh simultaneously
        elem = frame.locator('xpath=html/body/div[2]/main/div/div/div/div[2]/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Stop the agent run to complete the test and finalize the task.
        frame = context.pages[-1]
        # Click the Start Agent button to stop the agent run and complete the test
        elem = frame.locator('xpath=html/body/div[2]/main/div/div/div/div[2]/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # --> Assertions to verify final state
        frame = context.pages[-1]
        await expect(frame.locator('text=AI News Agent').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=0/10 articles').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Toggle theme').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Control').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Stop').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=0').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=PROCESSED').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=GENERATED').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Settings').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Model').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=GPT-OSS 120B (Powerful)').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Batch').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=10').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Order').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Newest').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Preview Queue').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Automation').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Auto-Run').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Interval').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=1 hour').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Live Processing').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Live').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=1/10').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=processing').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=6 killed, over 20 injured in shopping mall fire in southern Pakistan - ujyaalonepal.com').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Processing Steps').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=📝 Generating posts for X, Instagram, Facebook...').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Recent Activity').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=✍️ Step 4: Making decision...').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=🧠 Step 1: Analyzing snippet...').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=📋 Processing 1/10').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=📰 Found 10 articles to process').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=🚀 Started with model: openai/gpt-oss-120b').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=🛑 Stopped: 2 processed, 2 generated [T1:2 T2:0 T3:0 T4:0]').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=🛑 Cancelled').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=🛑 Stopped by user').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=✅ Generated (Tier 1, 0 tools)').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Field Marshal Asim Munir, others attend Junaid Safdar’s walima in Lahore - Daily Pakistan').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Run History').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=running').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=0 processed').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=0 generated').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=completed').first).to_be_visible(timeout=30000)
        await asyncio.sleep(5)
    
    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()
            
asyncio.run(run_test())
    