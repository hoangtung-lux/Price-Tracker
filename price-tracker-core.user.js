// ==UserScript==
// @name         Price Tracker (CORE)
// @namespace    http://tampermonkey.net/
// @version      3.1.0
// @description  Lõi API (Manmanbuy + Gouwudang). Không có giao diện.
// @author       Antigravity
// @match        *://*.taobao.com/*
// @match        *://*.tmall.com/*
// @match        *://*.jd.com/*
// @match        *://*.1688.com/*
// @match        *://item.taobao.com/*
// @match        *://item.jd.com/*
// @match        *://detail.tmall.com/*
// @grant        GM_xmlhttpRequest
// @updateURL    https://raw.githubusercontent.com/hoangtung-lux/Price-Tracker/main/dist/price-tracker-core.user.js
// @downloadURL  https://raw.githubusercontent.com/hoangtung-lux/Price-Tracker/main/dist/price-tracker-core.user.js
// @connect      tool.manmanbuy.com
// @connect      api.gwdang.com
// @connect      www.gwdang.com
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    /**
     * CONFIGURATION
     */
    const CONFIG = {
        GWD_API: "https://api.gwdang.com/extension/price_towards",
        MMB_API: "https://tool.manmanbuy.com/history.aspx",
        REFERERS: {
            GWD: "https://www.gwdang.com/",
            MMB: "https://tool.manmanbuy.com/"
        }
    };

    /**
     * PRICE TRACKER ENGINE
     * Decoupled headless logic for fetching price history from multiple sources.
     */
    window.VHPriceTrackerCore = {
        dataStore: { mmb: [], gwd: [] },
        onData: null,

        /**
         * Resolves the canonical product URL, including SKU mapping for Taobao/Tmall.
         */
        resolveProductUrl() {
            let url = window.location.href;
            try {
                const hub = window.Hub;
                if (hub?.config && hub.config.get('sku')) {
                    const skuId = hub.config.get('sku').skuId;
                    const itemId = new URLSearchParams(window.location.search).get('id');
                    if (skuId && itemId) {
                        url = `https://sku-taobao.com/item.htm?id=${itemId}-${skuId}`;
                    }
                }
            } catch (e) {
                console.warn("[Core] Identity resolution failed:", e);
            }
            return url;
        },

        /**
         * Triggers data fetching for all enabled engines.
         * @param {Function} callback - Function(source, historyData)
         */
        startTracking(callback) {
            this.onData = callback;
            const targetUrl = this.resolveProductUrl();
            
            this.fetchSource('gwd', targetUrl);
            this.fetchSource('mmb', targetUrl);
        },

        /**
         * Internal fetcher with source-specific normalization.
         */
        fetchSource(source, targetUrl) {
            const isGwd = (source === 'gwd');
            const apiUrl = isGwd 
                ? `${CONFIG.GWD_API}?url=${encodeURIComponent(targetUrl)}&ver=1`
                : `${CONFIG.MMB_API}?DA=1&action=gethistory&url=${encodeURIComponent(targetUrl)}`;

            GM_xmlhttpRequest({
                method: "GET",
                url: apiUrl,
                headers: { "Referer": isGwd ? CONFIG.REFERERS.GWD : CONFIG.REFERERS.MMB },
                onload: (res) => {
                    if (res.status !== 200) return;
                    
                    const history = isGwd 
                        ? this.parseGwd(res.responseText) 
                        : this.parseMmb(res.responseText);

                    if (history && history.length > 0) {
                        this.dataStore[source] = history;
                        this.onData?.(source, history);
                    }
                }
            });
        },

        parseGwd(jsonStr) {
            try {
                const data = JSON.parse(jsonStr);
                return data.store?.[0]?.all_line?.map(i => [
                    new Date(i[0]).getTime(), 
                    parseFloat(i[1])
                ]) || [];
            } catch { return []; }
        },

        parseMmb(html) {
            const match = html.match(/strDate\s*=\s*"(.*?)";/);
            if (!match) return [];
            return match[1].split('#').filter(Boolean).map(point => {
                const [time, price] = point.split('|');
                return [parseInt(time), parseFloat(price)];
            });
        }
    };

    console.info("[PriceTracker] Core Engine initialized.");
})();
