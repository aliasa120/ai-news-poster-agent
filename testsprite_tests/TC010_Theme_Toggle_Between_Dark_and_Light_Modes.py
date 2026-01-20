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
        # -> Toggle theme switch to dark mode.
        frame = context.pages[-1]
        # Toggle theme switch to dark mode
        elem = frame.locator('xpath=html/body/div[2]/nav/div/div/div[2]/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Toggle theme switch back to light mode.
        frame = context.pages[-1]
        # Toggle theme switch to light mode
        elem = frame.locator('xpath=html/body/div[3]/div/div').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Toggle theme switch to dark mode and verify UI components adjust styling accordingly.
        frame = context.pages[-1]
        # Toggle theme switch to dark mode
        elem = frame.locator('xpath=html/body/div[2]/nav/div/div/div[2]/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Navigate to the Posts page to verify social media preview tabs and delete functionality, checking their styling in both light and dark modes.
        frame = context.pages[-1]
        # Click menu to open navigation options
        elem = frame.locator('xpath=html/body/div[3]/div').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Search for or scroll to find navigation or link to Posts page or open a new tab to access Posts page if possible.
        await page.mouse.wheel(0, await page.evaluate('() => window.innerHeight'))
        

        frame = context.pages[-1]
        # Click on the first link or navigation element to check if it leads to Posts page
        elem = frame.locator('xpath=html/body/div[2]/nav/div/div/div[2]/a').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Toggle theme switch to light mode on Posts page and verify UI components update styling accordingly.
        frame = context.pages[-1]
        # Toggle theme switch to light mode on Posts page
        elem = frame.locator('xpath=html/body/div[2]/nav/div/div/div[2]/button[3]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Click the 'Delete All' button to test delete functionality for posts on the Posts page.
        frame = context.pages[-1]
        # Click 'Delete All' button to test delete functionality
        elem = frame.locator('xpath=html/body/div[3]/div/div').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Click the 'Delete All' button (index 2) to test delete functionality on the Posts page.
        frame = context.pages[-1]
        # Click 'Delete All' button to test delete functionality
        elem = frame.locator('xpath=html/body/div[2]/nav/div/div/div[2]/button[2]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Click the 'Delete' button in the confirmation dialog to delete all posts.
        frame = context.pages[-1]
        # Click 'Delete' button in confirmation dialog to delete all posts
        elem = frame.locator('xpath=html/body/div[2]/div/div/div[2]/div/button[2]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # --> Assertions to verify final state
        frame = context.pages[-1]
        await expect(frame.locator('text=Generated Posts').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=0 posts ready for publishing').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Refresh').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Toggle theme').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=𝕏 Twitter').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=📸 Instagram').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=📘 Facebook').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=No Generated Posts Yet').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Run the AI Agent to generate posts from news articles.').first).to_be_visible(timeout=30000)
        await asyncio.sleep(5)
    
    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()
            
asyncio.run(run_test())
    