/**
 * Extract all <a> elements from a given root (Document or DocumentFragment)
 */
function extractHyperLinks(root) {
  const anchors = Array.from(root.querySelectorAll('a')).filter(a => a.href);
  return anchors.map(a => ({ href: a.href, text: a.innerText.trim() }));
}

/**
 * Build the standard pageData object from a list of links
 */
function buildPageData(links) {
  return {
    title: document.title,
    url: window.location.href,
    timestamp: new Date().toISOString(),
    links,
    linkCount: links.length
  };
}

/**
 * Send the extracted data to background, under the given action
 */
function sendLinkData(action, data) {
  chrome.runtime.sendMessage({ action, data }, resp => {
    if (resp?.success) console.log(`${action} sent successfully`);
    else console.error(`${action} failed to send`);
  });
}

/**
 * Extract from the entire document
 */
function handleExtractAll() {
  const links = extractHyperLinks(document);
  sendLinkData('extractAllLinks', buildPageData(links));
}

/**
 * Extract only from the user’s selection
 */
function handleExtractSelection() {
  const sel = window.getSelection();
  if (!sel.rangeCount) return;
  const frag = sel.getRangeAt(0).cloneContents();
  const links = extractHyperLinks(frag);
  sendLinkData('extractLinksFromSelection', buildPageData(links));
}

// --- message listener ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'ping') {
    sendResponse({ success: true });
    return;
  }

  if (message.action === 'extractAllLinks') {
    handleExtractAll();
    sendResponse({ success: true });
    return;
  }

  if (message.action === 'extractLinksFromSelection') {
    handleExtractSelection();
    sendResponse({ success: true });
    return;
  }
});