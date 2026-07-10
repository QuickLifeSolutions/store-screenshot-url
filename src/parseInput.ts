import { Actor, ProxyConfigurationOptions, log } from 'apify';

import type { PuppeteerLifeCycleEvent } from 'puppeteer';
import { RequestList, Request } from 'crawlee';

import type { Input } from './types';

const crash = async (errorMessage: string): Promise<never> => {
    log.error(errorMessage);
    await Actor.fail(errorMessage);
    throw new Error(errorMessage);
};

export async function parseInput(input: Input | null): Promise<{
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
        await crash('Did not receive input. Please make sure that INPUT is stored in Key-Value store');
    }

    const inputValue = input as Input;

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
        waitUntil: inputValue.waitUntil as PuppeteerLifeCycleEvent,
        width: typeof inputValue.viewportWidth === 'number' ? inputValue.viewportWidth : 1280,
        height: typeof inputValue.viewportHeight === 'number' ? inputValue.viewportHeight : 1080,
        delay: typeof inputValue.delay === 'number' ? inputValue.delay : 0,
        scrollToBottom: inputValue.scrollToBottom || false,
        delayAfterScrolling: inputValue.delayAfterScrolling ?? 2500,
        waitUntilNetworkIdleAfterScroll: inputValue.waitUntilNetworkIdleAfterScroll || false,
        waitUntilNetworkIdleAfterScrollTimeout: inputValue.waitUntilNetworkIdleAfterScrollTimeout ?? 30000,
        proxy: inputValue.proxy || { useApifyProxy: true },
        selectorsToHide: inputValue.selectorsToHide?.trim() || '',
        fullPage: inputValue.fullPage ?? true,
    };

    // Process url
    if (!inputValue.url && !inputValue.urls?.length) await crash('Input is missing url field');

    const startUrls = [];
    if (inputValue.url) startUrls.push(inputValue.url);
    if (inputValue.urls?.length) startUrls.push(...inputValue.urls);

    const requestList = await RequestList.open('START_URLS', startUrls || []);

    let req: Request | null = await requestList.fetchNextRequest();

    while (req !== null) {
        parsedInput.urls.push(req.url);

        req = await requestList.fetchNextRequest();
    }

    parsedInput.urls = parsedInput.urls.flatMap((u) => {
        let url = u.trim();

        if (!url.startsWith('http')) {
            url = `http://${url}`;
        }

        try {
            const parsedUrl = new URL(url);
            return [parsedUrl.toString()];
        } catch (error) {
            log.error(`Skipping url "${url}" because it is not valid.`);
            return [];
        }
    });

    // Process waitUntil
    const waitUntilOptions: PuppeteerLifeCycleEvent[] = ['load', 'domcontentloaded', 'networkidle2', 'networkidle0'];

    function isWaitUntilOption(option: string): option is PuppeteerLifeCycleEvent {
        return waitUntilOptions.indexOf(option as PuppeteerLifeCycleEvent) !== -1;
    }

    if (!isWaitUntilOption(inputValue.waitUntil)) {
        await crash(
            `Value in parameter waitUntil - "${inputValue.waitUntil
            }" - is not one of the allowed values: "${waitUntilOptions.join('", "')}"`,
        );
    }

    parsedInput.waitUntil = inputValue.waitUntil as PuppeteerLifeCycleEvent;

    // Process viewportWidth
    if (typeof inputValue.viewportWidth !== 'number' || Number.isNaN(inputValue.viewportWidth)) {
        await crash(`Viewport width "${inputValue.viewportWidth}" is not a number.`);
    }
    if (inputValue.viewportWidth < 100) {
        await crash(`Viewport width "${inputValue.viewportWidth}" is too small, it must be at least 100px.`);
    }
    if (inputValue.viewportWidth > 3840) {
        await crash(`Viewport width "${inputValue.viewportWidth}" is too large, maximum is 3840px.`);
    }

    parsedInput.width = inputValue.viewportWidth;

    // Process viewportHeight
    const viewportHeight = typeof inputValue.viewportHeight === 'number'
        ? inputValue.viewportHeight
        : 1080;

    if (Number.isNaN(viewportHeight)) {
        await crash(`Viewport height "${inputValue.viewportHeight}" is not a number.`);
    }
    if (viewportHeight < 100) {
        await crash(`Viewport height "${viewportHeight}" is too small, it must be at least 100px.`);
    }
    if (viewportHeight > 4320) {
        await crash(`Viewport height "${viewportHeight}" is too large, maximum is 4320px.`);
    }

    parsedInput.height = viewportHeight;

    // Process delay
    if (!inputValue.delay && typeof inputValue.delay !== 'number') {
        await crash(`Delay "${inputValue.delay}" is not a number.`);
    }
    if (inputValue.delay < 0) {
        await crash(`Delay "${inputValue.delay}" is negative.`);
    }
    if (inputValue.delay > 3600000) {
        await crash(`Delay "${inputValue.delay}" is too large, maximum is 3600000ms.`);
    }

    parsedInput.delay = inputValue.delay;
    parsedInput.scrollToBottom = inputValue.scrollToBottom || false;
    parsedInput.waitUntilNetworkIdleAfterScroll = inputValue.waitUntilNetworkIdleAfterScroll || false;

    if (typeof inputValue.delayAfterScrolling !== 'undefined') {
        if (typeof inputValue.delayAfterScrolling !== 'number' || Number.isNaN(inputValue.delayAfterScrolling)) {
            await crash(`Delay after scrolling "${inputValue.delayAfterScrolling}" is not a number.`);
        }
        if (inputValue.delayAfterScrolling < 0 || inputValue.delayAfterScrolling > 3600000) {
            await crash(`Delay after scrolling "${inputValue.delayAfterScrolling}" must be between 0 and 3600000ms.`);
        }
    }
    parsedInput.delayAfterScrolling = inputValue.delayAfterScrolling ?? 2500;

    if (typeof inputValue.waitUntilNetworkIdleAfterScrollTimeout !== 'undefined') {
        if (
            typeof inputValue.waitUntilNetworkIdleAfterScrollTimeout !== 'number'
            || Number.isNaN(inputValue.waitUntilNetworkIdleAfterScrollTimeout)
        ) {
            await crash(`Network idle timeout "${inputValue.waitUntilNetworkIdleAfterScrollTimeout}" is not a number.`);
        }
        if (
            inputValue.waitUntilNetworkIdleAfterScrollTimeout < 1000
            || inputValue.waitUntilNetworkIdleAfterScrollTimeout > 3600000
        ) {
            await crash(`Network idle timeout "${inputValue.waitUntilNetworkIdleAfterScrollTimeout}" must be between 1000 and 3600000ms.`);
        }
    }
    parsedInput.waitUntilNetworkIdleAfterScrollTimeout = inputValue.waitUntilNetworkIdleAfterScrollTimeout ?? 30000;

    if (typeof inputValue.fullPage !== 'undefined' && typeof inputValue.fullPage !== 'boolean') {
        await crash(`Full page option "${inputValue.fullPage}" must be a boolean.`);
    }
    parsedInput.fullPage = inputValue.fullPage ?? true;

    if (!parsedInput.urls.length) {
        await crash('No valid urls found.');
    }

    return parsedInput;
}
