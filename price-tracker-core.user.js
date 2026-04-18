// ==UserScript==
// @name         Price Tracker Engine (CORE)
// @namespace    http://tampermonkey.net/
// @version      3.0.0
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
// @connect      tool.manmanbuy.com
// @connect      api.gwdang.com
// @connect      www.gwdang.com
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    /**
     * CORE ENGINE OBJECT
     * Exposes API methods to the global window object for the GUI script to consume.
     */
    window.VHPriceTrackerCore = {
        currentData: { mmb: [], gwd: [] },
        onDataReceived: null, // Callback function (source, data)

        /**
         * Lấy ID phân loại hàng (SKU) cho Taobao/Tmall
         */
        getIdentity: function() {
            let url = window.location.href;
            try {
                if (window.Hub && window.Hub.config && window.Hub.config.get('sku')) {
                    const skuId = window.Hub.config.get('sku').skuId;
                    const itemId = new URLSearchParams(window.location.search).get('id');
                    if (skuId && itemId) url = `https://sku-taobao.com/item.htm?id=${itemId}-${skuId}`;
                }
            } catch (e) {}
            return url;
        },

        /**
         * Gọi đồng thời cả 2 nguồn
         */
        fetchAll: function(callback) {
            this.onDataReceived = callback;
            const targetUrl = this.getIdentity();
            this.fetchGwd(targetUrl);
            this.fetchMmb(targetUrl);
        },

        fetchGwd: function(url) {
            GM_xmlhttpRequest({
                method: "GET",
                url: `https://api.gwdang.com/extension/price_towards?url=${encodeURIComponent(url)}&ver=1`,
                headers: { "Referer": "https://www.gwdang.com/" },
                onload: (res) => {
                    try {
                        const data = JSON.parse(res.responseText);
                        const history = data.store[0].all_line.map(i => [new Date(i[0]).getTime(), parseFloat(i[1])]);
                        this.currentData.gwd = history;
                        if (this.onDataReceived) this.onDataReceived('gwd', history);
                    } catch (e) {}
                }
            });
        },

        fetchMmb: function(url) {
            GM_xmlhttpRequest({
                method: "GET",
                url: `https://tool.manmanbuy.com/history.aspx?DA=1&action=gethistory&url=${encodeURIComponent(url)}`,
                headers: { "Referer": "https://tool.manmanbuy.com/" },
                onload: (res) => {
                    const match = res.responseText.match(/strDate\s*=\s*"(.*?)";/);
                    if (match) {
                        const history = match[1].split('#').filter(x => x).map(point => {
                            const [time, price] = point.split('|');
                            return [parseInt(time), parseFloat(price)];
                        });
                        this.currentData.mmb = history;
                        if (this.onDataReceived) this.onDataReceived('mmb', history);
                    }
                }
            });
        }
    };

    console.log("[PriceTrackerCore] Engine v3.0 loaded and ready.");

})();
