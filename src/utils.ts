import { createHash } from 'node:crypto';

export const generateUrlStoreKey = (requestKey: string): string => {
    const hash = createHash('sha256').update(requestKey).digest('hex').slice(0, 32);
    return `screenshot-${hash}`;
};

export const calculateRequestHandlerTimeoutSecs = (
    scrollToBottom: boolean,
    waitUntilNetworkIdleAfterScroll: boolean,
    waitUntilNetworkIdleAfterScrollTimeout: number,
    delayAfterScrolling: number,
    delay: number,
): number => {
    const REQUEST_HANDLER_TIMEOUT_SECS_BASE = 60;

    const delaySeconds = delay / 1000;

    if (!scrollToBottom) {
        return REQUEST_HANDLER_TIMEOUT_SECS_BASE + delaySeconds;
    }

    if (waitUntilNetworkIdleAfterScroll) {
        return REQUEST_HANDLER_TIMEOUT_SECS_BASE + (waitUntilNetworkIdleAfterScrollTimeout / 1000) + delaySeconds;
    }

    return REQUEST_HANDLER_TIMEOUT_SECS_BASE + (delayAfterScrolling / 1000) + delaySeconds;
};
