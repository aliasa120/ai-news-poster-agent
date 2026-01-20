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
        # -> Change feeder refresh interval, freshness hours, and retention limit via settings UI.
        frame = context.pages[-1]
        # Open Model dropdown to change feeder settings
        elem = frame.locator('xpath=html/body/div[2]/main/div/div/div[2]/div[2]/div/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Select a different feeder model option to test change and then try to find Batch and Order settings again.
        frame = context.pages[-1]
        # Select Kimi K2 (Fast) from Model options to test change
        elem = frame.locator('xpath=html/body/div[3]/div/div/div').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        await page.mouse.wheel(0, await page.evaluate('() => window.innerHeight'))
        

        # -> Change Batch setting via Batch dropdown.
        frame = context.pages[-1]
        # Open Batch dropdown to change batch size
        elem = frame.locator('xpath=html/body/div[2]/main/div/div/div[2]/div[2]/div[2]/div/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Select '15' minutes interval from the dropdown to change automation interval.
        frame = context.pages[-1]
        # Select '15' minutes interval from dropdown
        elem = frame.locator('xpath=html/body/div[3]/div/div/div[3]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Reload the page to verify that all feeder and automation settings persist and are displayed correctly.
        await page.goto('http://localhost:3000/agent', timeout=10000)
        await asyncio.sleep(3)
        

        # -> Toggle Auto-Run off and verify the change persists and affects agent behavior accordingly.
        frame = context.pages[-1]
        # Toggle Auto-Run off
        elem = frame.locator('xpath=html/body/div[2]/main/div/div/div[3]/div[2]/div/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Test the 'Start Agent' button to ensure it triggers agent behavior as expected.
        frame = context.pages[-1]
        # Click 'Start Agent' button to start the agent and observe behavior
        elem = frame.locator('xpath=html/body/div[2]/main/div/div/div/div[2]/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Click 'Stop' button to stop the agent, then verify agent stops and UI updates accordingly.
        frame = context.pages[-1]
        # Click 'Stop' button to stop the running agent
        elem = frame.locator('xpath=html/body/div[2]/main/div/div/div/div[2]/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Test the 'Preview Queue' button to verify it opens the preview queue correctly.
        frame = context.pages[-1]
        # Click 'Preview Queue' button to open the preview queue
        elem = frame.locator('xpath=html/body/div[2]/main/div/div/div[2]/div[2]/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # --> Assertions to verify final state
        frame = context.pages[-1]
        await expect(frame.locator('text=AI News Agent').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=15').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Auto-run paused while processing').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=GPT-OSS 120B (Powerful)').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=15').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Newest').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=1 hour').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=paused').first).to_be_visible(timeout=30000)
        await asyncio.sleep(5)
    
    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()
            
asyncio.run(run_test())
    