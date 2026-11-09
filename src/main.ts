import { Actor, log } from 'apify';
import { sleep, PuppeteerCrawler } from 'crawlee';

import { parseInput } from './parseInput.js';

import type { Input } from './types.js';
import { calculateRequestHandlerTimeoutSecs, generateUrlStoreKey } from './utils.js';

const {
    APIFY_API_BASE_URL,
    APIFY_API_PUBLIC_BASE_URL,
    APIFY_DEFAULT_KEY_VALUE_STORE_ID,
    SCREENSHOT_PUBLIC_API_BASE_URL,
} = process.env;
const apiBase = (SCREENSHOT_PUBLIC_API_BASE_URL || APIFY_API_PUBLIC_BASE_URL || APIFY_API_BASE_URL || 'https://api.apify.com')
    .replace(/\/+$/, '').replace(/\/v2$/, '');
// Bytewells accepts PNG bytes through its generic binary record parser.
const screenshotContentType = new URL(apiBase).hostname === 'bytewells.com' ? 'application/octet-stream' : 'image/png';

const NAVIGATION_TIMEOUT_SECS = 3600;
const TIMEOUT_MS = 3600000;

await Actor.init();
const input = await Actor.getInput() as Input | null;

const {
    urls,
    waitUntil,
    delay,
    width,
    height,
    scrollToBottom,
    delayAfterScrolling,
    waitUntilNetworkIdleAfterScroll,
    waitUntilNetworkIdleAfterScrollTimeout,
    proxy,
    selectorsToHide,
    fullPage,
} = await parseInput(input);

const requestHandlerTimeoutSecs = calculateRequestHandlerTimeoutSecs(
    scrollToBottom,
    waitUntilNetworkIdleAfterScroll,
    waitUntilNetworkIdleAfterScrollTimeout,
    delayAfterScrolling,
    delay,
);

const puppeteerCrawler = new PuppeteerCrawler({
    launchContext: {
        useChrome: true,
    },
    proxyConfiguration: await Actor.createProxyConfiguration(proxy),
    navigationTimeoutSecs: NAVIGATION_TIMEOUT_SECS,
    requestHandlerTimeoutSecs,
    headless: true,
    preNavigationHooks: [
        async ({ page }, goToOptions) => {
            goToOptions!.waitUntil = waitUntil;
            goToOptions!.timeout = TIMEOUT_MS;

            await page.setViewport({ width, height });
        },
    ],
    requestHandler: async ({ page, request }) => {
        if (delay > 0) {
            log.info(`Waiting ${delay}ms as specified in input`);
            await sleep(delay);
        }

        if (scrollToBottom) {
            log.info('Scrolling to bottom of the page');
            try {
                await page.evaluate(async () => {
                    let i = 0;
                    let stagnantIterations = 0;
                    let previousScrollHeight = 0;

                    while (stagnantIterations < 3) {
                        const { scrollHeight } = document.body;
                        if (i >= scrollHeight && scrollHeight === previousScrollHeight) {
                            stagnantIterations += 1;
                        } else {
                            stagnantIterations = 0;
                            previousScrollHeight = scrollHeight;
                        }

                        i = Math.min(i + 250, scrollHeight);
                        window.scrollTo(0, i);

                        await new Promise<void>((resolve) => {
                            setTimeout(resolve, 50);
                        });
                    }
                });
                if (waitUntilNetworkIdleAfterScroll) {
                    log.info('Waiting until network is idle');
                    await page.waitForNetworkIdle({ timeout: waitUntilNetworkIdleAfterScrollTimeout }).catch(() => {
                        log.warning('Waiting until network is idle after scroll failed!');
                    });
                } else if (delayAfterScrolling > 0) {
                    log.info(`Waiting ${delayAfterScrolling}ms after scroll as specified in input`);
                    await sleep(delayAfterScrolling);
                }
            } catch (error) {
                log.warning('Scrolling to bottom of the page failed!', { error: String(error) });
            }
        }

        if (selectorsToHide?.length) {
            await page.$$eval(selectorsToHide, (elements: any[]) => {
                for (const element of elements) {
                    (element as HTMLElement).style.display = 'none';
                }
            });
        }

        if (!fullPage) {
            await page.evaluate(() => {
                window.scrollTo(0, 0);
            }).catch(() => {
                log.warning('Failed to reset scroll position before capturing the screenshot.');
            });
        }

        log.info('Saving screenshot...');
        const screenshotKey = input?.url && !input.urls?.length
            ? 'screenshot'
            : generateUrlStoreKey(request.uniqueKey);
        const screenshotBuffer = await page.screenshot({ fullPage });
        await Actor.setValue(screenshotKey, screenshotBuffer, { contentType: screenshotContentType });
        const screenshotUrl = APIFY_DEFAULT_KEY_VALUE_STORE_ID
            ? `${apiBase}/v2/key-value-stores/${APIFY_DEFAULT_KEY_VALUE_STORE_ID}`
                + `/records/${screenshotKey}?disableRedirect=true`
            : null;
        log.info('Screenshot saved', { screenshotKey, screenshotUrl });

        await Actor.pushData({
            url: page.url(),
            screenshotUrl,
            screenshotKey,
        });
    },
});

const result = await puppeteerCrawler.run(urls);
if (!result.requestsFinished) {
    await Actor.fail('No screenshots were saved. Check the run log for request failures.');
}

await Actor.exit();
