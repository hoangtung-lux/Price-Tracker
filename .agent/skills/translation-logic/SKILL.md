---
name: translation-logic
description: Translating dynamic web applications and software efficiently using Hybrid DOM Observer patterns.
---

# Web / Software Translation Logic (Dịch thuật)

## 📌 Context
When translating dynamic web interfaces (like React, Vue) or creating userscripts, simple static string replacement is often insufficient because modern apps mutate the DOM continuously. This skill outlines the **Regex & Dynamic DOM Observer (Hybrid Approach)** for robust translation.

## 🎯 Core Principles

### 1. Hybrid Dictionary Approach
Never rely on just one matching method. Use a three-tier system:
- **Level 1 (Exact Match):** Exact string matching `if (text.trim() === "Login")`. O(1) performance and prevents misfires.
- **Level 2 (Regex Match):** Pattern matching for dynamic variables like `Price $12.50` -> `Giá $12.50`. Use capture groups `(\d+)`.
- **Level 3 (Substring Fallback):** For compound sentences, fallback to `string.replace('original', 'translation')`. Use strictly on remaining un-matched texts.

### 2. Safeguard the DOM (No InnerHTML)
Never use `element.innerHTML = element.innerHTML.replace(...)` to translate!
- **Reason:** It destroys event listeners associated with elements and breaks Single Page Applications.
- **Solution:** ONLY mutate `node.nodeValue` for `TEXT_NODES` (`node.nodeType === 3`). Also target specific attributes like `placeholder` and `title`.

### 3. Skip Non-Visual Nodes
Ensure your crawler skips tags that contain code or invisible styles:
```javascript
const IGNORE_TAGS = ['SCRIPT', 'STYLE', 'NOSCRIPT', 'META', 'LINK'];
if (IGNORE_TAGS.includes(node.parentElement.tagName)) return;
```

### 4. Optimize MutationObserver (Prevent Infinite Loops)
A MutationObserver translating a text node emits a new mutation event. If not handled, this causes an infinite CPU lockup loop.
- **The Golden Rule:** Momentarily disconnect the observer before mutating text inside the callback, or verify if the text is already translated before assigning.
```javascript
observer.disconnect(); 
// ... do DOM replacement ...
observer.observe(document.body, config);
```

## 🛠️ Typical Implementation Structure (Userscript)
```javascript
// 1. Definition Phase
const MAP_EXACT = { "Home": "Trang chủ" };
const MAP_REGEX = [ { pattern: /(\d+) items/g, replacement: "$1 sản phẩm" } ];

// 2. Traversal Phase
function processNode(node) {
   // Only target Text Nodes (type 3)
   // Apply Exact Match -> Regex Match -> Substring Fallback
}

// 3. Observer Phase
const observer = new MutationObserver(mutations => {
   observer.disconnect(); // Disable listener
   mutations.forEach(m => processNode(m.target)); // Process
   observer.observe(...); // Re-enable listener
});
```
