# Hyperlink Extractor (Chrome Extension)

A Chrome extension that lets you extract, analyze, and manage hyperlinks from any webpage with ease. Whether you're conducting academic research, writing reports, or curating content, this tool helps you collect and organize links more efficiently.

---

## Features

### Hyperlink Extraction
- **Extract All Links**: Right-click or highlight a section to extract all `<a>` tags.
- **Smart Filtering**: Ignores self-links and fragment-only URLs.
- **Contextual Snippets**: Captures nearby text to provide previews.

### Copy Options
- **Copy Format Presets**:
  - `URLs only`: Just raw links.
  - `Link Title + URL`: Outputs as `[Title] URL`.
  - `Full Text + Embedded URLs`: Markdown-style inline links.
- **Prompt Prepending**: Attach prompts to copied content (for use in LLMs or citation tools).
- **Auto-Copy Toggle**: Instantly copies extracted results when enabled.

### Prompt Templates
- Choose from smart pre-written prompts:
  - Convert links into APA citations
  - Generate summaries for each link
  - Evaluate sources for academic reliability
- Or write your own custom prompt

### Sidebar & History
- **Persistent History View**: Access previously extracted content.
- **Group by Page Title**: Links organized by site and timestamp.
- **Select, Copy, and Delete**: Batch actions on one or many clips.
- **Search**: Filter results by keywords, title, or domain.

### Snippets & Jump-to-Text
- **Hover Preview**: View snippet around a link before copying.
- **Jump-to-Context**: Clicking a snippet opens the original page and scrolls to the source text (highlighted).

---

## Installation

1. Clone or download this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable **Developer Mode** (top right)
4. Click **Load Unpacked** and select the extension directory

---

## Code Structure

| File/Folder         | Description                                     |
|---------------------|-------------------------------------------------|
| `manifest.json`     | Chrome extension metadata (Manifest V3)         |
| `popup.html/js`     | Extension popup UI                              |
| `sidebar.html/js`   | Sidebar for managing and copying clips          |
| `content.js`        | Extracts hyperlinks and context from the page   |
| `background.js`     | Routes messages between content, popup, sidebar |
| `utils/db.js`       | All IndexedDB logic (init, save, query, delete) |

---

## Architecture

### 1. **Data Layer (`utils/db.js`)**
Encapsulates all IndexedDB logic:
- Manages schema, database initialization, and upgrades
- Provides Promise-based CRUD functions via `window.HyperlinkExtractorDB`

```js
window.HyperlinkExtractorDB = {
  init,
  getAll,
  save,
  deleteById,
  clearAll
};
```

### 2. **UI Layer (`popup.js`, `sidebar.js`)**
- Handles user interactions
- Renders DOM
- Calls `HyperlinkExtractorDB` as needed

### 3. **Content Script (`content.js`)**
- Extracts links and contextual data
- Sends data to background or sidebar

### 4. **Background Script (`background.js`)**
- Handles communication between components

---

## IndexedDB Notes

- Uses async/await with Promises
- Each clip includes:
  - Title, URL, timestamp
  - Array of links
  - Optional raw HTML
- Efficient, persistent local storage




