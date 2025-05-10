/**
 * Extract all <a> elements from a given root (Document or DocumentFragment)
 */
function extractHyperLinks(root) {
  const anchors = Array.from(root.querySelectorAll('a')).filter(a => {
    // Filter out links without href or with fragment-only hrefs
    if (!a.href || a.href === '#' || a.href.endsWith('/#')) return false;
    
    try {
      const url = new URL(a.href);
      // Check if it's just a fragment link to the same page
      if (url.hash && url.pathname === window.location.pathname && 
          url.origin === window.location.origin) {
        return false;
      }
      return true;
    } catch (e) {
      return false;
    }
  });

  return anchors.map(a => ({
    href: a.href,
    text: (a.innerText || a.textContent || '').trim(),
  }));
}
/**
 * Build the standard pageData object from a list of links
 */
function buildPageData(links, html) {
  const data = {
    title: document.title,
    url: window.location.href,
    timestamp: new Date().toISOString(),
    links,
    linkCount: links.length,
    selected: true
  };
  if (html !== undefined) {
    data.html = html;
  }
  return data;
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
 * Extract only from the user’s selection, copy to clipboard, then send.
 */
async function handleExtractSelection(userPrompt = '') {
  const sel = window.getSelection();
  if (!sel.rangeCount) return;

  const range = sel.getRangeAt(0);
  const frag = range.cloneContents();
  const links = extractHyperLinks(frag);

  const container = document.createElement('div');
  container.appendChild(range.cloneContents());
  const rawHtml = container.innerHTML;

  // Read copy mode
  let copyMode = 'urls';
  try {
    const storage = await new Promise(resolve => {
      chrome.storage && chrome.storage.local
        ? chrome.storage.local.get({ copyMode: 'urls' }, resolve)
        : resolve({ copyMode: 'urls' });
    });
    copyMode = storage.copyMode || 'urls';
  } catch (e) {
    copyMode = 'urls';
  }

  // Build clipboard text based on mode
  let text = '';
  if (copyMode === 'urls') {
    text = links.map(l => l.href).join('\n');
  } else if (copyMode === 'labels') {
    text = links.map(l => `[${l.text || ''}] ${l.href}`).join('\n');
  } else if (copyMode === 'full') {
    function serializeWithLinks(node) {
      let out = '';
      node.childNodes.forEach(child => {
        if (child.nodeType === Node.TEXT_NODE) {
          out += child.textContent;
        } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName.toLowerCase() === 'a') {
          const text = child.textContent.trim();
          const href = child.getAttribute('href');
          if (text && href) {
            out += `[${text}](${href})`;
          } else {
            out += text;
          }
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          out += serializeWithLinks(child);
        }
      });
      return out;
    }
    text = serializeWithLinks(container).replace(/\s+/g, ' ').trim();
  }

  // Combine with prompt
  const finalText = userPrompt ? `${userPrompt}\n\n${text}` : text;

  // Check autoCopy setting
  let autoCopy = true;
  try {
    const storage = await new Promise(resolve => {
      chrome.storage && chrome.storage.local
        ? chrome.storage.local.get({ autoCopy: true }, resolve)
        : resolve({ autoCopy: true });
    });
    autoCopy = storage.autoCopy;
  } catch (e) {
    console.warn('⚠ Failed to read autoCopy setting, defaulting to true');
    autoCopy = true;
  }

  // Conditionally copy to clipboard and show notification
  if (autoCopy) {
    try {
      await navigator.clipboard.writeText(finalText);
      console.log('✅ Links copied to clipboard');
      showCopyNotificationOnPage();
    } catch (e) {
      console.warn('❌ Clipboard write failed:', e);
    }
  } else {
    console.log('🚫 Auto-copy disabled: skipping clipboard write and notification');
  }

  // Send data (with rawHtml if you want full text)
  sendLinkData('extractLinksFromSelection', buildPageData(links, rawHtml));
}

function showCopyNotificationOnPage() {
  let notif = document.getElementById('copyNotificationMainPage');
  if (!notif) {
      notif = document.createElement('div');
      notif.id = 'copyNotificationMainPage';
      notif.textContent = 'Links copied to clipboard';
      notif.style.position = 'fixed';
      notif.style.top = '32px';
      notif.style.left = '50%';
      notif.style.transform = 'translateX(-50%)';
      notif.style.background = '#323232';
      notif.style.color = '#fff';
      notif.style.padding = '12px 28px';
      notif.style.borderRadius = '8px';
      notif.style.boxShadow = '0 2px 10px rgba(0,0,0,0.18)';
      notif.style.fontSize = '1em';
      notif.style.opacity = '0';
      notif.style.pointerEvents = 'none';
      notif.style.zIndex = '2147483647';
      notif.style.transition = 'opacity 0.4s';
      notif.style.display = 'block';
      notif.style.maxWidth = '90vw';
      notif.style.textAlign = 'center';
      notif.style.fontFamily = 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif';
      document.body.appendChild(notif);
      // Add fadeOut keyframes as a <style> tag if not present
      if (!document.getElementById('copyNotifAnimStyle')) {
          const style = document.createElement('style');
          style.id = 'copyNotifAnimStyle';
          style.textContent = `@keyframes fadeOutCopyNotif { 0%{opacity:0;} 10%{opacity:1;} 85%{opacity:1;} 100%{opacity:0;} }`;
          document.head.appendChild(style);
      }
  }
  notif.style.opacity = '1';
  notif.style.display = 'block';
  notif.style.animation = 'fadeOutCopyNotif 2.2s forwards';
  setTimeout(() => {
      notif.style.opacity = '0';
      notif.style.display = 'none';
      notif.style.animation = '';
  }, 2200);
}

// --- message listener ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'ping') {
    sendResponse({ success: true });
    return;
  }

  if (message.action === 'extractLinksFromSelection') {
    handleExtractSelection(message.prompt || '');    
    sendResponse({ success: true });
    return;
  }
});

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    extractHyperLinks,
    buildPageData,
    sendLinkData,
    handleExtractSelection
  };
}