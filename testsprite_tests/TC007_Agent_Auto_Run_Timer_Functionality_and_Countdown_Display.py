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
        # -> Set auto-run timer to 15 minutes and enable it.
        frame = context.pages[-1]
        # Toggle Auto-Run to enable automation timer
        elem = frame.locator('xpath=html/body/div[2]/main/div/div/div[3]/div[2]/div/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        frame = context.pages[-1]
        # Open Interval dropdown to select 15 minutes
        elem = frame.locator('xpath=html/body/div[2]/main/div/div/div[3]/div[2]/div[2]/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Change interval to 4 hours and verify countdown updates accordingly.
        frame = context.pages[-1]
        # Select 4 hours interval from dropdown
        elem = frame.locator('xpath=html/body/div[3]/div/div/div[5]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Click 'Start Agent' button to start the agent and verify it runs, then click 'Stop Agent' to verify it stops and timer halts or resets.
        frame = context.pages[-1]
        # Click 'Start Agent' button to start the agent
        elem = frame.locator('xpath=html/body/div[2]/main/div/div/div/div[2]/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # --> Assertions to verify final state
        frame = context.pages[-1]
        await expect(frame.locator('text=Auto-run paused while processing...').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Interval').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=4 hours').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Agent is running...').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=🛑 Stopped: 2 processed, 2 generated [T1:2 T2:0 T3:0 T4:0]').first).to_be_visible(timeout=30000)
        await asyncio.sleep(5)
    
    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()
            
asyncio.run(run_test())
    