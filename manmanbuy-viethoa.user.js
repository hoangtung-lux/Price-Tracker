// ==UserScript==
// @name         Manmanbuy Viethoa (慢慢买)
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  Automatically translate Manmanbuy (慢慢买) from Chinese to Vietnamese using DOM Observer and Regex.
// @author       Antigravity
// @match        *://*.manmanbuy.com/*
// @match        *://*.taobao.com/*
// @match        *://*.tmall.com/*
// @match        *://*.jd.com/*
// @match        *://*.1688.com/*
// @match        *://item.taobao.com/*
// @match        *://item.jd.com/*
// @match        *://detail.tmall.com/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // Core Dictionary (Exact Matches)
    const exactDict = {
        "慢慢买": "Manmanbuy",
        "搜索": "Tìm kiếm",
        "历史价格": "Lịch sử giá",
        "全网比价": "So sánh giá",
        "国内折扣": "Khuyến mãi VN",
        "白菜价": "Giá rẻ bèo",
        "历史最低价": "Giá thấp nhất LS",
        "降价": "Giảm giá",
        "走势": "Biểu đồ",
        "近期最低": "Thấp nhất gần đây",
        "当前价格": "Giá hiện tại",
        "同款比价": "So sánh cùng loại",
        "到手价": "Giá tới tay",
        "正品保证": "Bảo đảm chính hãng",
        "相关商品": "Sản phẩm liên quan",
        "价格走势": "Biểu đồ giá",
        "比价平台": "Nền tảng so sánh giá",
        "评论": "Bình luận",
        "详情": "Chi tiết",
        "商品详情": "Chi tiết sản phẩm",
        "买家评价": "Đánh giá của người mua",
        "首页": "Trang chủ",
        "分类": "Danh mục",
        "购物车": "Giỏ hàng",
        "我的": "Tài khoản",
        "登录": "Đăng nhập",
        "注册": "Đăng ký"
    };

    // Regex Rules for Dynamic Text
    const regexRules = [
        // Match numbers + months/days (e.g. 12个月最低 -> Thấp nhất trong 12 tháng)
        { pattern: /(\d+)个月最低/g, replacement: "Thấp nhất $1 tháng" },
        // Match "最低价 XXX元" (e.g. 最低价 10.5元 -> Giá thấp nhất 10.5 RMB)
        { pattern: /最低价\s*([\d\.]+)\s*元/g, replacement: "Giá thấp nhất $1 tệ" },
        { pattern: /降价\s*([\d\.]+)\s*元/g, replacement: "Giảm $1 tệ" },
        // Dates (e.g. 2023-10-01) -> usually fine, but if specific chinese format: 2023年10月1日
        { pattern: /(\d{4})年(\d{1,2})月(\d{1,2})日/g, replacement: "$3/$2/$1" }
    ];

    function translateText(text) {
        if (!text) return text;
        let translated = text.trim();
        if (translated === "") return text;

        // Exact match
        if (exactDict[translated]) {
            return text.replace(translated, exactDict[translated]);
        }

        // Apply regex rules if no exact match or partial match desired
        let modified = text;
        for (const rule of regexRules) {
            modified = modified.replace(rule.pattern, rule.replacement);
        }

        // Substring / Phrasal match as fallback (be careful with this to avoid translating partial words)
        for (const [cn, zh] of Object.entries(exactDict)) {
            if (modified.includes(cn)) {
                modified = modified.split(cn).join(zh);
            }
        }

        return modified;
    }

    // Process Text Nodes recursively
    function processNode(node) {
        if (node.nodeType === 3) { // TEXT_NODE
            if (node.parentElement && ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(node.parentElement.tagName)) return;
            const originalText = node.nodeValue;
            const newText = translateText(originalText);
            if (newText !== originalText) {
                node.nodeValue = newText;
            }
        } else if (node.nodeType === 1) { // ELEMENT_NODE
            // Translate placeholders or tooltips if needed
            if (['INPUT', 'TEXTAREA'].includes(node.tagName) && node.placeholder) {
                const newPlaceholder = translateText(node.placeholder);
                if (newPlaceholder !== node.placeholder) {
                    node.placeholder = newPlaceholder;
                }
            }
            if (node.title) {
                const newTitle = translateText(node.title);
                if (newTitle !== node.title) {
                    node.title = newTitle;
                }
            }
            
            for (let child of node.childNodes) {
                processNode(child);
            }
        }
    }

    // Initial translation
    processNode(document.body);

    // MutationObserver to handle dynamic rendering (React/Vue/AJAX)
    const observer = new MutationObserver((mutations) => {
        let shouldProcess = false;
        const nodesToProcess = [];

        for (let mutation of mutations) {
            if (mutation.type === 'childList') {
                for (let node of mutation.addedNodes) {
                    nodesToProcess.push(node);
                }
            } else if (mutation.type === 'characterData') {
                nodesToProcess.push(mutation.target);
            }
        }

        if (nodesToProcess.length > 0) {
            // Disconnect temporarily to avoid infinite loops
            observer.disconnect();
            for (let node of nodesToProcess) {
                processNode(node);
            }
            observer.observe(document.body, { childList: true, subtree: true, characterData: true });
        }
    });

    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

})();
