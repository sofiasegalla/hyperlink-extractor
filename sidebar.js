/**
 * Sidebar script for the Webpage Clipper extension
 * Handles displaying and managing clipped pages using IndexedDB
 */

// Elements
const clipContainer = document.getElementById('clipContainer');
const clearAllBtn   = document.getElementById('clearAllBtn');

// Format ISO timestamp → human date/time
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

// Main render function
async function renderClippedPages() {
  try {
    // 1) Fetch everything
    const pages = await WebpageClipperDB.getAllPages();
    clipContainer.innerHTML = '';

    if (!pages.length) {
      clipContainer.innerHTML = `
        <div class="no-clips">
          <p>No pages clipped yet</p>
          <p>Click "Clip Current Page" in the popup to save a webpage</p>
        </div>
      `;
      return;
    }

    // 2) Group by URL
    const groups = pages.reduce((acc, page) => {
      const key = page.url;
      (acc[key] = acc[key] || []).push(page);
      return acc;
    }, {});

    // 3) Build an array of groups sorted by each group’s latest extraction (newest first)
    const sortedGroups = Object.values(groups)
    .map(group => {
      // sort each group newest→oldest
      group.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      return group;
    })
    .sort((g1, g2) => {
      // compare the first (newest) timestamp in each
      return new Date(g2[0].timestamp) - new Date(g1[0].timestamp);
    });

    // 4) Now render in that order
    sortedGroups.forEach(groupPages => {
      // sort newest→oldest
      groupPages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      // group container
      const groupDiv = document.createElement('div');
      groupDiv.className = 'page-group';

      // big title (once per URL)
      const titleDiv = document.createElement('div');
      titleDiv.className = 'group-title';
      titleDiv.textContent = groupPages[0].title;
      groupDiv.appendChild(titleDiv);

      // one entry per extraction
      groupPages.forEach(page => {
        const entry = document.createElement('div');
        entry.className = 'extraction-item';

        // delete button
        const delBtn = document.createElement('button');
        delBtn.className = 'delete-btn';
        delBtn.dataset.id = page.id;
        delBtn.textContent = '×';
        entry.appendChild(delBtn);

        // timestamp
        const dateDiv = document.createElement('div');
        dateDiv.className = 'clip-date';
        dateDiv.textContent = formatDate(page.timestamp);
        entry.appendChild(dateDiv);

        // snippet: first 2 + last 2 link texts
        const texts = (page.links || []).map(l => l.text || l.href);
        const preview = texts.length <= 4
          ? texts.join(' • ')
          : texts.slice(0,2).join(' • ') + ' … ' + texts.slice(-2).join(' • ');
        const snipDiv = document.createElement('div');
        snipDiv.className = 'clip-snippet';
        snipDiv.textContent = preview;
        entry.appendChild(snipDiv);

        // link list + toggle
        const contentDiv = document.createElement('div');
        contentDiv.className = 'clip-content';
        contentDiv.id = `clip-content-${page.id}`;

        if (page.links.length > 10) {
          const btn = document.createElement('button');
          btn.className = 'toggle-btn';
          btn.dataset.id = page.id;
          btn.textContent = 'Show more';
          contentDiv.appendChild(btn);
        }

        const ul = document.createElement('ul');
        ul.className = 'link-list';
        ul.style.cssText = 'padding-left:16px; margin-top:0; list-style:disc';
        (page.links || []).slice(0,10).forEach(link => {
          const li = document.createElement('li');
          li.innerHTML = `<a href="${link.href}" target="_blank">${link.text || link.href}</a>`;
          ul.appendChild(li);
        });
        contentDiv.appendChild(ul);
        entry.appendChild(contentDiv);

        // divider
        const hr = document.createElement('hr');
        hr.className = 'extraction-divider';
        entry.appendChild(hr);

        groupDiv.appendChild(entry);
      });

      clipContainer.appendChild(groupDiv);
    });

    // 4) Re-bind delete handlers
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async e => {
        const id = parseInt(e.currentTarget.dataset.id, 10);
        try {
          await WebpageClipperDB.deletePage(id);
          await renderClippedPages();
        } catch (err) {
          console.error('Error deleting page:', err);
        }
      });
    });

    // 5) Re-bind toggle handlers (closure over `pages`)
    document.querySelectorAll('.toggle-btn').forEach(button => {
      button.addEventListener('click', () => {
        const id = button.dataset.id;
        const contentDiv = document.getElementById(`clip-content-${id}`);
        const listElement = contentDiv.querySelector('.link-list');
        const fullPage = pages.find(p => p.id == id);
        const fullList = fullPage?.links || [];

        const isCollapsed = button.textContent === 'Show more';
        if (isCollapsed) {
          listElement.innerHTML = fullList.map(l => `
            <li><a href="${l.href}" target="_blank">${l.text || l.href}</a></li>
          `).join('');
          button.textContent = 'Show less';
          contentDiv.insertBefore(button, listElement);
        } else {
          listElement.innerHTML = fullList.slice(0,10).map(l => `
            <li><a href="${l.href}" target="_blank">${l.text || l.href}</a></li>
          `).join('');
          button.textContent = 'Show more';
          contentDiv.appendChild(button);
        }
      });
    });

  } catch (error) {
    console.error('Error rendering clipped pages:', error);
    clipContainer.innerHTML = `
      <div class="no-clips">
        <p>Error loading clipped pages</p>
        <p>${error.message}</p>
      </div>
    `;
  }
}

// Initialize DB + render on load
async function initialize() {
  try {
    await WebpageClipperDB.init();
    await renderClippedPages();
  } catch (error) {
    console.error('Error initializing database:', error);
    clipContainer.innerHTML = `
      <div class="no-clips">
        <p>Error initializing database</p>
        <p>${error.message}</p>
      </div>
    `;
  }
}

// Clear all pages
clearAllBtn.addEventListener('click', async () => {
  if (confirm('Are you sure you want to delete all clipped pages?')) {
    try {
      await WebpageClipperDB.clearAllPages();
      await renderClippedPages();
    } catch (error) {
      console.error('Error clearing pages:', error);
    }
  }
});

// Listen for new clips from the background
chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.action === 'newClip' && message.data) {
    (async () => {
      try {
        await WebpageClipperDB.addPage(message.data);
        await renderClippedPages();
      } catch (error) {
        console.error('Error adding new clip:', error);
      }
    })();
  }
});

// Kick things off
document.addEventListener('DOMContentLoaded', initialize);