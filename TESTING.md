# TESTING.md

## Testing Approach

We used a mix of **automated testing** (using Jest) and **manual walkthroughs** to make sure our Chrome extension works the way we want it to. The goal was to catch bugs early, confirm expected behavior, and make sure the experience feels smooth for users. We focused on two main areas: interface testing (the code and logic) and prompt testing (how our data performs with a language model like GPT-4).

---

## 1. Interface Testing

### Automated Tests (Jest)

We wrote unit tests for two main files: `content.js` and `db.js`.

#### `content.test.js`

This file checks the core logic that extracts and sends links from a webpage.

- **should extract valid links and filter out invalid ones**  
  Makes sure we only pull real URLs and skip stuff like `#anchors` or broken links.

- **should build page data correctly**  
  Confirms that we format everything properly — the URL, link text, and metadata.

- **should send data to background script**  
  Tests that our message-sending setup works and the background script gets the data.

- **should log error when sending fails**  
  Checks that nothing crashes if the message fails — we just log it and move on.

#### `db.test.js`

This file tests our IndexedDB setup, where we save clipped pages.

- **should add a page to the database**  
  Mocks the IndexedDB API and confirms that when we add a page, it goes into the right store with the correct structure (title, URL, links, and a timestamp). It also verifies that the function returns the expected record ID.

We mocked out the database functions (`transaction`, `objectStore`, `add`) so we could test the logic without needing a real browser.

---

### Manual Testing (UI Walkthrough)

We also manually tested the Chrome extension UI by using it like a normal user:

- Clicked the extension icon to trigger the popup
- Verified that links load properly in the popup and sidebar
- Made sure the “Show More” / “Show Less” buttons work
- Checked the history view to confirm saved links show up
- Tested layout and styling to avoid any overflow or UI bugs

We ran this on Chrome (v123) on macOS Ventura.

---

## 2. Prompt Testing

While our extension doesn’t directly communicate with an LLM, it prepares structured link data and a suggested prompt that users can easily copy and paste into a language model like GPT-4. We tested how well this format works in practice.

### Prompt Test 1: Link Summarizer

- **Input**: A webpage with many related links (e.g., climate news articles)
- **Expected**: When a user copies the generated text and pastes it into an LLM, the model should be able to summarize or categorize the links effectively.
- **What happened**: The formatting was clear and easy to copy, and when pasted into GPT-4, the model was able to produce useful summaries of the pages. This confirmed that our structure works well for downstream use.

### Prompt Test 2: Filtering Repetitive or Useless Links

- **Input**: A Wikipedia page with lots of internal anchor links, footnotes, or repeated same-page URLs
- **Expected**: The copied links should only include meaningful, external URLs that would be useful to include in an LLM prompt.
- **What happened**: Most internal or repeated links were filtered out successfully by our extraction logic. There were still a few edge cases, but overall the result was clean and usable.

---

## Final Thoughts

Testing gave us a lot of confidence that the extension behaves as expected — both in the code and when used by a real person. We kept things simple and focused on what matters most: extracting useful links, saving them reliably, and giving users a clean way to copy and use them in LLM prompts or other research tools.
