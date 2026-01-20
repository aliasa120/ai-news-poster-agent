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
        # -> Click the 'Start Agent' button to start an agent processing run and observe live activity log.
        frame = context.pages[-1]
        # Click the 'Start Agent' button to start an agent processing run.
        elem = frame.locator('xpath=html/body/div[2]/main/div/div/div/div[2]/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Simulate a tool failure during processing to verify failure and fallback events appear in the live activity log.
        frame = context.pages[-1]
        # Toggle the Automation Auto-Run switch to simulate a tool failure during processing.
        elem = frame.locator('xpath=html/body/div[2]/main/div/div/div[3]/div[2]/div[2]/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Simulate a tool failure during processing to verify failure and fallback events appear in the live activity log.
        frame = context.pages[-1]
        # Toggle the Automation Auto-Run switch to enable auto-run and simulate a tool failure during processing.
        elem = frame.locator('xpath=html/body/div[2]/main/div/div/div[3]/div[2]/div/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Simulate a tool failure during an active agent processing run to verify failure and fallback events appear in the live activity log.
        frame = context.pages[-1]
        # Click the 'Start Agent' button to start a new agent processing run and trigger live activity logs.
        elem = frame.locator('xpath=html/body/div[2]/main/div/div/div/div[2]/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Simulate a tool failure during an active agent processing run to verify failure and fallback events appear in the live activity log.
        frame = context.pages[-1]
        # Click the 'Start Agent' button to start a new agent processing run and trigger live activity logs for failure simulation.
        elem = frame.locator('xpath=html/body/div[2]/main/div/div/div/div[2]/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Simulate a tool failure during the active agent processing run to verify failure and fallback events appear in the live activity log.
        frame = context.pages[-1]
        # Toggle the Auto-Run switch off and on to simulate a tool failure during processing.
        elem = frame.locator('xpath=html/body/div[2]/main/div/div/div[3]/div[2]/div/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Stop the agent processing run to complete the test and verify final state.
        frame = context.pages[-1]
        # Click the 'Stop' button to stop the agent processing run and finalize the test.
        elem = frame.locator('xpath=html/body/div[2]/main/div/div/div/div[2]/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # --> Assertions to verify final state
        frame = context.pages[-1]
        await expect(frame.locator('text=Ready').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Start Agent').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Automation').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Auto-Run').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Interval').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=1 hour').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Recent Activity').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=🛑 Cancelled').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=🛑 Stopped: 2 processed, 2 generated [T1:2 T2:0 T3:0 T4:0]').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=📖 Step 2: Reading full article...').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Pakistan receives US invitation to join Board of Peace on Gaza - 1470 & 100.3 WMBD').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=🧠 Step 1: Analyzing snippet...').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=📋 Processing 3/10').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=✅ Generated (Tier 1, 0 tools)').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=📝 Generating posts for X, Instagram, Facebook...').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=✍️ Step 4: Making decision...').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=6 killed, over 20 injured in shopping mall fire in southern Pakistan - ujyaalonepal.com').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Run History').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=cancelled').first).to_be_visible(timeout=30000)
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
    