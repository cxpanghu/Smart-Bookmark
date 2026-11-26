export {};

const MENU_IDS = {
  SEARCH_BOOKMARKS: "sb-search-bookmarks",
  COPY_URL: "sb-copy-url",
  COPY_LINK: "sb-copy-link",
  QR_PAGE: "sb-qr-page",
  QR_LINK: "sb-qr-link",
  OPEN_CLEANER: "sb-open-cleaner",
  OPEN_SIDEPANEL: "sb-open-sidepanel",
} as const;

chrome.runtime.onInstalled.addListener(() => {
  setupContextMenus();
  try {
    chrome.sidePanel?.setPanelBehavior?.({ openPanelOnActionClick: false });
  } catch (err) {
    console.warn("[smart-bookmark] sidePanel.setPanelBehavior failed", err);
  }
});

chrome.runtime.onStartup?.addListener(() => setupContextMenus());

function setupContextMenus() {
  const message = (key: string, fallback: string) =>
    chrome.i18n.getMessage(key) || fallback;
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_IDS.SEARCH_BOOKMARKS,
      title: message("menuSearchBookmarks", 'Search Smart Bookmark for "%s"'),
      contexts: ["selection"],
    });
    chrome.contextMenus.create({
      id: MENU_IDS.COPY_URL,
      title: message("menuCopyPageUrl", "Copy page URL"),
      contexts: ["page"],
    });
    chrome.contextMenus.create({
      id: MENU_IDS.COPY_LINK,
      title: message("menuCopyLinkUrl", "Copy link URL"),
      contexts: ["link"],
    });
    chrome.contextMenus.create({
      id: MENU_IDS.QR_PAGE,
      title: message("menuQrPage", "Create QR code for this page"),
      contexts: ["page"],
    });
    chrome.contextMenus.create({
      id: MENU_IDS.QR_LINK,
      title: message("menuQrLink", "Create QR code for this link"),
      contexts: ["link"],
    });
    chrome.contextMenus.create({
      id: MENU_IDS.OPEN_CLEANER,
      title: message("menuOpenCleaner", "Open bookmark cleaner"),
      contexts: ["action"],
    });
    chrome.contextMenus.create({
      id: MENU_IDS.OPEN_SIDEPANEL,
      title: message("menuOpenSidePanel", "Open Smart Bookmark side panel"),
      contexts: ["action"],
    });
  });
}

async function copyViaTab(tabId: number, text: string) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: async (t: string) => {
        try {
          await navigator.clipboard.writeText(t);
          return;
        } catch {
          const ta = document.createElement("textarea");
          ta.value = t;
          ta.style.position = "fixed";
          ta.style.opacity = "0";
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          ta.remove();
        }
      },
      args: [text],
    });
  } catch (err) {
    console.warn("[smart-bookmark] copy failed", err);
  }
}

async function openQrTab(url: string) {
  const target = chrome.runtime.getURL(
    `newtab.html#tab=dashboard&qr=${encodeURIComponent(url)}`,
  );
  await chrome.tabs.create({ url: target });
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  switch (info.menuItemId) {
    case MENU_IDS.SEARCH_BOOKMARKS: {
      const q = encodeURIComponent(info.selectionText ?? "");
      await chrome.tabs.create({
        url: chrome.runtime.getURL(`newtab.html#q=${q}`),
      });
      break;
    }
    case MENU_IDS.COPY_URL: {
      const url = tab?.url;
      if (!url || !tab?.id) return;
      await copyViaTab(tab.id, url);
      break;
    }
    case MENU_IDS.COPY_LINK: {
      const link = info.linkUrl;
      if (!link || !tab?.id) return;
      await copyViaTab(tab.id, link);
      break;
    }
    case MENU_IDS.QR_PAGE: {
      if (tab?.url) await openQrTab(tab.url);
      break;
    }
    case MENU_IDS.QR_LINK: {
      if (info.linkUrl) await openQrTab(info.linkUrl);
      break;
    }
    case MENU_IDS.OPEN_CLEANER: {
      await chrome.tabs.create({
        url: chrome.runtime.getURL("newtab.html#tab=cleaner"),
      });
      break;
    }
    case MENU_IDS.OPEN_SIDEPANEL: {
      if (tab?.windowId) {
        await chrome.sidePanel
          ?.open?.({ windowId: tab.windowId })
          .catch(() => {});
      }
      break;
    }
  }
});

chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command === "open-side-panel") {
    if (tab?.windowId) {
      await chrome.sidePanel
        ?.open?.({ windowId: tab.windowId })
        .catch(() => {});
    }
  } else if (command === "open-cleaner") {
    await chrome.tabs.create({
      url: chrome.runtime.getURL("newtab.html#tab=cleaner"),
    });
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    try {
      if (msg?.type === "open-newtab") {
        await chrome.tabs.create({ url: chrome.runtime.getURL("newtab.html") });
        sendResponse({ ok: true });
        return;
      }
      if (msg?.type === "open-sidepanel") {
        if (sender.tab?.windowId) {
          await chrome.sidePanel
            ?.open?.({ windowId: sender.tab.windowId })
            .catch(() => {});
        }
        sendResponse({ ok: true });
        return;
      }
      if (msg?.type === "open-cleaner") {
        await chrome.tabs.create({
          url: chrome.runtime.getURL("newtab.html#tab=cleaner"),
        });
        sendResponse({ ok: true });
        return;
      }
      if (msg?.type === "open-settings") {
        await chrome.tabs.create({
          url: chrome.runtime.getURL("newtab.html#tab=settings"),
        });
        sendResponse({ ok: true });
        return;
      }
      if (msg?.type === "open-qr" && typeof msg.url === "string") {
        await openQrTab(msg.url);
        sendResponse({ ok: true });
        return;
      }
      if (msg?.type === "search-bookmarks" && typeof msg.query === "string") {
        await chrome.tabs.create({
          url: chrome.runtime.getURL(
            `newtab.html#q=${encodeURIComponent(msg.query)}`,
          ),
        });
        sendResponse({ ok: true });
        return;
      }
      if (msg?.type === "bookmarks-search" && typeof msg.query === "string") {
        chrome.bookmarks.search(msg.query, (items) => {
          sendResponse({
            ok: true,
            items: (items || [])
              .filter((x) => !!x.url)
              .slice(0, 20)
              .map((x) => ({
                id: x.id,
                title: x.title || x.url!,
                url: x.url!,
              })),
          });
        });
        return;
      }
      sendResponse({ ok: false });
    } catch (err) {
      sendResponse({ ok: false, error: String(err) });
    }
  })();
  return true;
});
