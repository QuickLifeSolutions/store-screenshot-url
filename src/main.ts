import { Actor, log } from 'apify';
import { sleep, PuppeteerCrawler } from 'crawlee';

import { parseInput } from './parseInput.js';

import type { Input } from './types.js';
import { calculateRequestHandlerTimeoutSecs, generateUrlStoreKey } from './utils.js';

const { APIFY_DEFAULT_KEY_VALUE_STORE_ID } = process.env;

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
    headless: Actor.isAtHome(),
    preNavigationHooks: [
        async ({ page }, goToOptions) => {
            goToOptions!.waitUntil = waitUntil;
            goToOptions!.timeout = TIMEOUT_MS;

            await page.setViewport({ width, height });
        },
    ],
    requestHandler: async ({ page }) => {
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
                        if (scrollHeight === previousScrollHeight) {
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
                }
                if (delayAfterScrolling > 0) {
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
        const screenshotKey = input && input.url && !input.urls?.length ? 'screenshot' : generateUrlStoreKey(page.url());
        const screenshotBuffer = await page.screenshot({ fullPage });
        await Actor.setValue(screenshotKey, screenshotBuffer, { contentType: 'image/png' });
        const screenshotUrl = `https://api.apify.com/v2/key-value-stores/${APIFY_DEFAULT_KEY_VALUE_STORE_ID}`
            + `/records/${screenshotKey}?disableRedirect=true`;
        log.info(`Screenshot saved, you can view it here:
${screenshotUrl}`);

        await Actor.pushData({
            url: page.url(),
            screenshotUrl,
            screenshotKey,
        });
    },
});

await puppeteerCrawler.run(urls);

await Actor.exit();
