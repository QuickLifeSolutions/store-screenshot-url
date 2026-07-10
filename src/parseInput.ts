import { Actor, ProxyConfigurationOptions, log } from "apify";

import type { PuppeteerLifeCycleEvent } from "puppeteer";
import { RequestList, Request } from "crawlee";

import type { Input } from "./types.js";

const crash = async (errorMessage: string) => {
    log.error(errorMessage);
    await Actor.fail(errorMessage);
};

export async function parseInput(input: Input): Promise<{
    urls: string[];
    waitUntil: PuppeteerLifeCycleEvent;
    width: number;
    height: number;
    delay: number;
    scrollToBottom: boolean;
    delayAfterScrolling: number;
    waitUntilNetworkIdleAfterScroll: boolean;
    waitUntilNetworkIdleAfterScrollTimeout: number;
    proxy: (ProxyConfigurationOptions & {
        useApifyProxy?: boolean | undefined;
    }) | undefined;
    selectorsToHide: string;
    fullPage: boolean;
}> {
    if (!input) {
        await crash("Did not receive input. Please make sure that INPUT is stored in Key-Value store");
    }

    const parsedInput: {
        urls: string[];
        waitUntil: PuppeteerLifeCycleEvent;
        width: number;
        height: number;
        delay: number;
        scrollToBottom: boolean;
        delayAfterScrolling: number;
        waitUntilNetworkIdleAfterScroll: boolean;
        waitUntilNetworkIdleAfterScrollTimeout: number;
        proxy: (ProxyConfigurationOptions & {
            useApifyProxy?: boolean | undefined;
        }) | undefined;
        selectorsToHide: string;
        fullPage: boolean;
    } = {
        urls: [],
        waitUntil: "load",
        width: 0,
        height: 0,
        delay: 0,
        scrollToBottom: false,
        delayAfterScrolling: 0,
        waitUntilNetworkIdleAfterScroll: false,
        waitUntilNetworkIdleAfterScrollTimeout: 30,
        proxy: input.proxy || { useApifyProxy: true },
        selectorsToHide: input.selectorsToHide?.trim() || "",
        fullPage: true,
    };

    // Process url
    if (!input.url && !input.urls?.length) crash("Input is missing url field");

    const startUrls = [];
    if (input.url) startUrls.push(input.url);
    if (input.urls?.length) startUrls.push(...input.urls);

    const requestList = await RequestList.open('START_URLS', startUrls || []);

    let req: Request | null = await requestList.fetchNextRequest();

    while (req !== null) {
        parsedInput.urls.push(req.url);

        req = await requestList.fetchNextRequest();
    }

    parsedInput.urls = parsedInput.urls.flatMap((u) => {
        let url = u.trim();

        if (!url.startsWith("http")) {
            url = `http://${url}`;
        }

        try {
            new URL(url);
        } catch (error) {
            crash(`Skipping url "${url}" because it is not valid.`);
            return [];
        }

        return [url];
    });

    // Process waitUntil
    const waitUntilOptions: PuppeteerLifeCycleEvent[] = ["load", "domcontentloaded", "networkidle2", "networkidle0"];

    function isWaitUntilOption(option: string): option is PuppeteerLifeCycleEvent {
        return waitUntilOptions.includes(option as PuppeteerLifeCycleEvent);
    }

    if (!isWaitUntilOption(input.waitUntil)) {
        await crash(
            `Value in parameter waitUntil - "${input.waitUntil
            }" - is not one of the allowed values: "${waitUntilOptions.join('", "')}"`
        );
    }

    parsedInput.waitUntil = input.waitUntil as PuppeteerLifeCycleEvent;

    // Process viewportWidth
    if (typeof input.viewportWidth !== "number" || Number.isNaN(input.viewportWidth)) {
        await crash(`Viewport width "${input.viewportWidth}" is not a number.`);
    }
    if (input.viewportWidth < 100) {
        await crash(`Viewport width "${input.viewportWidth}" is too small, it must be at least 100px.`);
    }
    if (input.viewportWidth > 3840) {
        await crash(`Viewport width "${input.viewportWidth}" is too large, maximum is 3840px.`);
    }

    parsedInput.width = input.viewportWidth;

    // Process viewportHeight
    const viewportHeight = typeof input.viewportHeight === "number"
        ? input.viewportHeight
        : 1080;

    if (Number.isNaN(viewportHeight)) {
        await crash(`Viewport height "${input.viewportHeight}" is not a number.`);
    }
    if (viewportHeight < 100) {
        await crash(`Viewport height "${viewportHeight}" is too small, it must be at least 100px.`);
    }
    if (viewportHeight > 4320) {
        await crash(`Viewport height "${viewportHeight}" is too large, maximum is 4320px.`);
    }

    parsedInput.height = viewportHeight;

    // Process delay
    if (!input.delay && typeof input.delay !== "number") {
        await crash(`Delay "${input.delay}" is not a number.`);
    }
    if (input.delay < 0) {
        await crash(`Delay "${input.delay}" is negative.`);
    }
    if (input.delay > 3600000) {
        await crash(`Delay "${input.delay}" is too large, maximum is 3600000ms.`);
    }

    parsedInput.delay = input.delay;
    parsedInput.scrollToBottom = input.scrollToBottom || false;
    parsedInput.waitUntilNetworkIdleAfterScroll = input.waitUntilNetworkIdleAfterScroll || false;
    parsedInput.delayAfterScrolling = input.delayAfterScrolling || 0;
    parsedInput.waitUntilNetworkIdleAfterScrollTimeout = input.waitUntilNetworkIdleAfterScrollTimeout || 30;

    if (typeof input.fullPage !== "undefined" && typeof input.fullPage !== "boolean") {
        await crash(`Full page option "${input.fullPage}" must be a boolean.`);
    }
    parsedInput.fullPage = input.fullPage ?? true;

    if (!parsedInput.urls.length) {
        await crash("No valid urls found.");
    }

    return parsedInput;
}
