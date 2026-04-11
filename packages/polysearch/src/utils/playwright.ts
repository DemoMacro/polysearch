import { type Browser, type Page } from "playwright";

// ── Constants ──────────────────────────────────────────

const MAX_PAGES_PER_BROWSER = 50;
const IDLE_CLOSE_TIMEOUT_MS = 60_000;

const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36";

const STEALTH_HEADERS: Record<string, string> = {
  "Sec-Ch-Ua": '"Google Chrome";v="143", "Not:A-Brand";v="8", "Chromium";v="143"',
  "Sec-Ch-Ua-Mobile": "?0",
  "Sec-Ch-Ua-Platform": '"Windows"',
};

// ── Browser Lifecycle ──────────────────────────────────

let browser: Browser | null = null;
let browserInitializing: Promise<Browser> | null = null;
let pageCount = 0;
let idleTimer: ReturnType<typeof setTimeout> | null = null;

async function launchBrowser(): Promise<Browser> {
  const { chromium } = await import("playwright");
  return chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-blink-features=AutomationControlled",
    ],
  });
}

async function getBrowser(): Promise<Browser> {
  if (browser) return browser;
  if (browserInitializing) return browserInitializing;

  browserInitializing = launchBrowser()
    .then((b) => {
      browser = b;
      return b;
    })
    .catch((err) => {
      browserInitializing = null;
      throw err;
    });

  return browserInitializing;
}

async function retireBrowser(): Promise<void> {
  if (!browser) return;
  const b = browser;
  browser = null;
  pageCount = 0;
  await b.close().catch(() => {});
}

function resetIdleTimer(): void {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    void retireBrowser();
  }, IDLE_CLOSE_TIMEOUT_MS);
}

function checkRetirement(): void {
  if (++pageCount >= MAX_PAGES_PER_BROWSER) {
    void retireBrowser();
  }
}

// ── Page Helpers ───────────────────────────────────────

/**
 * Block unnecessary resource types and strip animations.
 */
async function optimizePage(page: Page): Promise<void> {
  await page.route("**/*", (route) => {
    const resourceType = route.request().resourceType();
    if (["font", "media", "websocket", "other", "manifest", "texttrack"].includes(resourceType)) {
      void route.abort();
    } else {
      void route.continue();
    }
  });

  page.setDefaultTimeout(15000);
  page.setDefaultNavigationTimeout(15000);

  await page.evaluate(() => {
    const style = document.createElement("style");
    style.textContent = "*,::after,::before{transition:none!important;animation:none!important}";
    document.head.appendChild(style);
  });
}

/**
 * Execute a function with a page from the default browser context.
 * Page is automatically closed after the callback completes.
 */
export async function withPage<T>(fn: (page: Page) => Promise<T>): Promise<T> {
  const b = await getBrowser();
  resetIdleTimer();

  const context = await b.newContext({ userAgent: DEFAULT_USER_AGENT });
  const page = await context.newPage();
  await page.setExtraHTTPHeaders(STEALTH_HEADERS);
  await optimizePage(page);

  try {
    return await fn(page);
  } finally {
    await page.close().catch(() => {});
    await context.close().catch(() => {});
    checkRetirement();
  }
}
