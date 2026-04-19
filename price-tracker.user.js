// ==UserScript==
// @name         Price Tracker
// @namespace    http://tampermonkey.net/
// @version      3.1.2
// @description  Theo dõi lịch sử giá TMĐT (Taobao, Tmall, JD, 1688). Installer & UI.
// @author       Hoàng Tùng
// @icon         https://raw.githubusercontent.com/hoangtung-lux/Price-Tracker/main/assets/logo.png
// @match        *://*.taobao.com/*
// @match        *://*.tmall.com/*
// @match        *://*.jd.com/*
// @match        *://*.jd.hk/*
// @match        *://*.1688.com/*
// @match        *://item.taobao.com/*
// @match        *://item.jd.com/*
// @match        *://detail.tmall.com/*
// @require      https://cdn.jsdelivr.net/npm/echarts@5.5.0/dist/echarts.min.js
// @grant        GM_xmlhttpRequest
// @updateURL    https://raw.githubusercontent.com/hoangtung-lux/Price-Tracker/main/price-tracker.user.js
// @downloadURL  https://raw.githubusercontent.com/hoangtung-lux/Price-Tracker/main/price-tracker.user.js
// @connect      tool.manmanbuy.com
// @connect      api.gwdang.com
// @connect      www.gwdang.com
// @run-at       document-end
// ==/UserScript==

/* --- CORE ENGINE (BUNDLED) --- */
(function() {
    'use strict';

    const CONFIG = {
        GWD_API: "https://api.gwdang.com/extension/price_towards",
        MMB_API: "https://tool.manmanbuy.com/history.aspx",
        MMB_COUPON_API: "https://tool.manmanbuy.com/history.aspx?DA=1&action=getcoupon",
        REFERERS: {
            GWD: "https://www.gwdang.com/",
            MMB: "https://tool.manmanbuy.com/"
        }
    };

    window['VHPriceTrackerCore'] = {
        dataStore: { 
            mmb: [], gwd: [],
            coupons: { mmb: null, gwd: null }
        },
        onData: null,
        onCoupon: null,

        resolveProductUrl() {
            let url = window.location.href;
            const hostname = window.location.hostname;

            try {
                // Taobao / Tmall Identity Resolution
                if (hostname.includes('taobao.com') || hostname.includes('tmall.com')) {
                    const hub = window['Hub'];
                    if (hub && hub.config && hub.config.get('sku')) {
                        const skuId = hub.config.get('sku').skuId;
                        const itemId = new URLSearchParams(window.location.search).get('id') || (window['g_config'] && window['g_config'].itemId);
                        if (skuId && itemId) {
                            url = `https://item.taobao.com/item.htm?id=${itemId}-${skuId}`;
                        }
                    }
                } 
                // JD.com Identity Resolution
                else if (hostname.includes('jd.com')) {
                    const skuId = window['pageConfig'] && window['pageConfig'].product && window['pageConfig'].product.skuid;
                    if (skuId) {
                        url = `https://item.jd.com/${skuId}.html`;
                    }
                }
                // 1688.com Identity Resolution
                else if (hostname.includes('1688.com')) {
                    const offerId = (window['offerConfig'] && window['offerConfig'].offerId) || new URLSearchParams(window.location.search).get('id');
                    if (offerId) {
                        url = `https://detail.1688.com/offer/${offerId}.html`;
                    }
                }
            } catch (e) {
                console.warn("[PriceTracker Core] Identity resolution error:", e);
            }
            return url;
        },

        startTracking(callback, couponCallback) {
            this.onData = callback;
            this.onCoupon = couponCallback;
            const targetUrl = this.resolveProductUrl();
            console.log("[PriceTracker Core] Tracking target:", targetUrl);
            this.fetchSource('gwd', targetUrl);
            this.fetchSource('mmb', targetUrl);
        },

        fetchSource(source, targetUrl) {
            const isGwd = (source === 'gwd');
            const apiUrl = isGwd 
                ? `${CONFIG.GWD_API}?url=${encodeURIComponent(targetUrl)}&ver=1`
                : `${CONFIG.MMB_API}?DA=1&action=gethistory&url=${encodeURIComponent(targetUrl)}`;

            GM_xmlhttpRequest({
                method: "GET",
                url: apiUrl,
                headers: { 
                    "Referer": isGwd ? CONFIG.REFERERS.GWD : CONFIG.REFERERS.MMB,
                    "Cache-Control": "no-cache"
                },
                onload: (res) => {
                    if (res.status !== 200) return;
                    const history = isGwd ? this.parseGwd(res.responseText) : this.parseMmb(res.responseText);
                    if (history && history.length > 0) {
                        this.dataStore[source] = history;
                        if (this.onData) this.onData(source, history);
                    }
                    // Fetch coupons
                    this.fetchCoupons(source, targetUrl);
                },
                onerror: (err) => console.error(`[PriceTracker Core] Fetch ${source} failed:`, err)
            });
        },

        fetchCoupons(source, targetUrl) {
            const isGwd = (source === 'gwd');
            if (isGwd) return; // Extend GWD coupon logic if needed

            GM_xmlhttpRequest({
                method: "GET",
                url: `${CONFIG.MMB_COUPON_API}&url=${encodeURIComponent(targetUrl)}`,
                headers: { "Referer": CONFIG.REFERERS.MMB },
                onload: (res) => {
                    const coupon = this.parseMmbCoupon(res.responseText);
                    if (coupon) {
                        this.dataStore.coupons.mmb = coupon;
                        if (this.onCoupon) this.onCoupon('mmb', coupon);
                    }
                }
            });
        },

        parseMmbCoupon(html) {
            try {
                // Extract youhui, quanurl from string or simple HTML
                const youhuiMatch = html.match(/youhui\s*=\s*"(.*?)"/);
                const youhui = youhuiMatch ? youhuiMatch[1] : null;
                
                const quanUrlMatch = html.match(/quanurl\s*=\s*"(.*?)"/);
                const hrefMatch = html.match(/href="(.*?s\.click\.taobao\.com.*?)"/);
                const quanUrl = (quanUrlMatch ? quanUrlMatch[1] : null) || (hrefMatch ? hrefMatch[1] : null);

                if (youhui && youhui !== "暂无优惠") {
                    return { text: youhui, url: quanUrl };
                }
            } catch (e) { return null; }
            return null;
        },

        parseGwd(jsonStr) {
            try {
                const data = JSON.parse(jsonStr);
                const store = (data && data.store) ? data.store[0] : null;
                return (store && store.all_line) ? store.all_line.map(i => [new Date(i[0]).getTime(), parseFloat(i[1])]) : [];
            } catch (e) { return []; }
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
})();

/* --- GUI CONTROLLER --- */
(function() {
    'use strict';

    const UI_CONFIG = {
        theme: {
            bg: 'rgba(15, 23, 42, 0.75)', // Slate 900 Glass
            text: '#f8fafc', // Slate 50
            gwd_color: '#6366f1', // Indigo 500
            mmb_color: '#10b981', // Emerald 500
            coupon: '#f59e0b', // Amber 500
            blur: 'blur(20px) saturate(180%)',
            mute: '#94a3b8', // Slate 400
            border: 'rgba(255, 255, 255, 0.12)'
        },
        id: {
            root: 'vh-gui-root',
            chart: 'vh-chart-canvas'
        },
        logo: 'https://raw.githubusercontent.com/hoangtung-lux/Price-Tracker/main/assets/logo.png'
    };

    let chartInstance = null;
    let activeSource = 'gwd';

    const STYLES = `
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800&display=swap');
        
        #${UI_CONFIG.id.root} { 
            position: fixed; bottom: 30px; right: 30px; z-index: 2147483647; 
            font-family: 'Outfit', 'Segoe UI', system-ui, sans-serif; 
            -webkit-font-smoothing: antialiased;
        }

        .vh-launcher { 
            width: 64px; height: 64px; 
            background: #fff url('${UI_CONFIG.logo}') no-repeat center; 
            background-size: 70%; 
            border-radius: 20px; 
            cursor: pointer; 
            box-shadow: 0 20px 40px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(255,255,255,0.2); 
            transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275); 
            border: 1px solid rgba(255,255,255,0.1);
        }
        .vh-launcher:hover { transform: scale(1.1) rotate(5deg); box-shadow: 0 25px 50px rgba(0,0,0,0.5); }
        .vh-launcher:active { transform: scale(0.9); }

        .vh-main-panel { 
            position: absolute; bottom: 85px; right: 0; 
            width: 520px; 
            background: ${UI_CONFIG.theme.bg}; 
            backdrop-filter: ${UI_CONFIG.theme.blur}; -webkit-backdrop-filter: ${UI_CONFIG.theme.blur}; 
            border-radius: 28px; 
            border: 1px solid ${UI_CONFIG.theme.border}; 
            padding: 28px; 
            display: none; flex-direction: column; 
            color: ${UI_CONFIG.theme.text}; 
            box-shadow: 0 40px 80px rgba(0,0,0,0.7), inset 0 0 0 1px rgba(255,255,255,0.05); 
            transform-origin: bottom right;
            animation: vh-appear 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        @keyframes vh-appear {
            from { opacity: 0; transform: scale(0.8) translateY(40px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
        }

        .vh-header { 
            display: flex; justify-content: space-between; align-items: center; 
            margin-bottom: 28px; padding-bottom: 16px; 
            border-bottom: 1px solid rgba(255,255,255,0.08); 
        }

        .vh-title { font-weight: 800; font-size: 16px; letter-spacing: -0.5px; color: #fff; }

        .vh-tabs { 
            display: flex; gap: 4px; background: rgba(0,0,0,0.2); 
            padding: 4px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.05);
        }
        .vh-tab-item { 
            padding: 8px 18px; border-radius: 12px; font-size: 13px; cursor: pointer; 
            color: ${UI_CONFIG.theme.mute}; font-weight: 600; transition: all 0.3s; 
        }
        .vh-tab-item:hover { color: #fff; background: rgba(255,255,255,0.05); }
        .vh-tab-item.active-gwd { background: ${UI_CONFIG.theme.gwd_color}; color: #fff; box-shadow: 0 10px 20px ${UI_CONFIG.theme.gwd_color}44; }
        .vh-tab-item.active-mmb { background: ${UI_CONFIG.theme.mmb_color}; color: #fff; box-shadow: 0 10px 20px ${UI_CONFIG.theme.mmb_color}44; }
        
        #${UI_CONFIG.id.chart} { width: 100%; height: 320px; }

        .vh-footer { 
            font-size: 11px; color: ${UI_CONFIG.theme.mute}; text-align: center; 
            margin-top: 20px; opacity: 0.5; font-weight: 400; 
        }

        /* Promotion UI */
        .vh-promo-section {
            margin-top: 24px; padding-top: 16px;
            border-top: 1px solid rgba(255,255,255,0.08);
            display: none;
        }
        .vh-promo-card {
            background: rgba(245, 158, 11, 0.1);
            border: 1px solid rgba(245, 158, 11, 0.2);
            border-radius: 16px; padding: 12px 16px;
            display: flex; align-items: center; gap: 12px;
            animation: vh-slide-up 0.4s ease-out;
        }
        @keyframes vh-slide-up { from { opacity:0; transform: translateY(10px); } to { opacity:1; transform: translateY(0); } }
        
        .vh-promo-icon { font-size: 20px; }
        .vh-promo-info { flex: 1; }
        .vh-promo-label { font-size: 10px; color: ${UI_CONFIG.theme.coupon}; font-weight: 800; text-transform: uppercase; margin-bottom: 2px; }
        .vh-promo-text { font-size: 14px; font-weight: 600; color: #fff; }
        .vh-promo-btn {
            background: ${UI_CONFIG.theme.coupon}; color: #000;
            padding: 8px 16px; border-radius: 10px; font-size: 12px; font-weight: 700;
            text-decoration: none; transition: all 0.3s;
        }
        .vh-promo-btn:hover { transform: scale(1.05); filter: brightness(1.1); box-shadow: 0 5px 15px ${UI_CONFIG.theme.coupon}44; }
    `;

    const getChartOption = (data, color, name) => ({
        backgroundColor: 'transparent',
        grid: { top: 40, bottom: 30, left: 45, right: 15 },
        tooltip: { 
            trigger: 'axis', 
            backgroundColor: 'rgba(15, 23, 42, 0.95)', 
            borderColor: 'rgba(255,255,255,0.1)', 
            borderWidth: 1,
            borderRadius: 12,
            padding: [12, 16],
            textStyle: { color: '#fff', fontFamily: 'Outfit', fontSize: 13 },
            formatter: (params) => {
                const date = new Date(params[0].value[0]);
                const price = params[0].value[1];
                return `<div style="margin-bottom:6px;opacity:0.6;font-size:11px">${date.toLocaleDateString()}</div>
                        <div style="display:flex;align-items:center;gap:10px">
                            <span style="width:10px;height:10px;border-radius:50%;background:${color};box-shadow:0 0 10px ${color}"></span>
                            <span style="font-weight:600">${name}:</span>
                            <b style="font-size:16px;margin-left:auto"> ${price} ¥</b>
                        </div>`;
            }
        },
        xAxis: { 
            type: 'time', 
            axisLabel: { color: UI_CONFIG.theme.mute, fontSize: 11, fontFamily: 'Outfit' }, 
            axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
            splitLine: { show: false }
        },
        yAxis: { 
            type: 'value', 
            axisLabel: { color: UI_CONFIG.theme.mute, fontSize: 11, fontFamily: 'Outfit' }, 
            splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)', type: 'dashed' } } 
        },
        series: [{
            name, type: 'line', smooth: 0.45, data, 
            symbol: 'circle', symbolSize: 8,
            showSymbol: false,
            lineStyle: { 
                color, width: 4, cap: 'round',
                shadowColor: color + '33', shadowBlur: 10, shadowOffsetY: 5
            },
            itemStyle: { color, borderWidth: 3, borderColor: '#fff' },
            areaStyle: { 
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: color + '44' }, 
                    { offset: 1, color: color + '00' }
                ]) 
            },
            emphasis: { scale: true }
        }]
    });

    const Controller = {
        init() {
            this.injectStyles();
            this.renderLayout();
            this.setupEventListeners();
            this.bootstrapCore();
        },

        injectStyles() {
            const style = document.createElement('style');
            style.textContent = STYLES;
            document.head.appendChild(style);
        },

        renderLayout() {
            const root = document.createElement('div');
            root.id = UI_CONFIG.id.root;
            root.innerHTML = `
                <div class="vh-launcher" title="Bản đồ lịch sử giá"></div>
                <div class="vh-main-panel">
                    <div class="vh-header">
                        <span class="vh-title">LỊCH SỬ GIÁ SẢN PHẨM</span>
                        <div class="vh-tabs">
                            <div class="vh-tab-item active-gwd" data-src="gwd">Gouwudang</div>
                            <div class="vh-tab-item" data-src="mmb">Manmanbuy</div>
                        </div>
                    </div>
                    <div id="${UI_CONFIG.id.chart}"></div>
                    <div class="vh-promo-section"></div>
                    <div class="vh-footer">© 2026 Hoàng Tùng • Price Tracker Pro v3.1.2</div>
                </div>
            `;
            document.body.appendChild(root);
        },

        setupEventListeners() {
            const root = document.getElementById(UI_CONFIG.id.root);
            const launcher = root.querySelector('.vh-launcher');
            const panel = root.querySelector('.vh-main-panel');
            const tabs = root.querySelectorAll('.vh-tab-item');

            launcher.onclick = () => {
                const isOpening = panel.style.display !== 'flex';
                panel.style.display = isOpening ? 'flex' : 'none';
                if (isOpening) this.renderCurrentData();
            };

            tabs.forEach(tab => {
                tab.onclick = () => {
                    tabs.forEach(t => t.classList.remove('active-gwd', 'active-mmb'));
                    activeSource = tab.dataset.src;
                    tab.classList.add(activeSource === 'gwd' ? 'active-gwd' : 'active-mmb');
                    this.renderCurrentData();
                };
            });
            
            // Close on escape
            window.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') panel.style.display = 'none';
            });
        },

        bootstrapCore() {
            let retryCount = 0;
            const maxRetries = 20; // 10 seconds total

            const checkCore = setInterval(() => {
                const core = window['VHPriceTrackerCore'];
                if (core) {
                    clearInterval(checkCore);
                    core.startTracking((source, history) => {
                        if (source === activeSource) this.renderChart(history);
                    }, (source, coupon) => {
                        if (source === activeSource) this.renderPromo(coupon);
                    });
                } else if (++retryCount > maxRetries) {
                    clearInterval(checkCore);
                    console.error("[PriceTracker GUI] Failed to load Core dependency after 10s.");
                }
            }, 500);
        },

        renderCurrentData() {
            const core = window['VHPriceTrackerCore'];
            if (core && core.dataStore && core.dataStore[activeSource] && core.dataStore[activeSource].length > 0) {
                this.renderChart(core.dataStore[activeSource]);
            }
        },

        renderChart(data) {
            const canvas = document.getElementById(UI_CONFIG.id.chart);
            if (!chartInstance) chartInstance = echarts.init(canvas);
            const color = activeSource === 'mmb' ? UI_CONFIG.theme.mmb_color : UI_CONFIG.theme.gwd_color;
            const name = activeSource === 'mmb' ? 'Manmanbuy' : 'Gouwudang';
            chartInstance.setOption(getChartOption(data, color, name));
            chartInstance.resize();
        },

        renderPromo(coupon) {
            const promoSection = document.querySelector('.vh-promo-section');
            if (!coupon) {
                promoSection.style.display = 'none';
                return;
            }
            promoSection.innerHTML = `
                <div class="vh-promo-card">
                    <div class="vh-promo-icon">🎁</div>
                    <div class="vh-promo-info">
                        <div class="vh-promo-label">Ưu đãi kích hoạt</div>
                        <div class="vh-promo-text">${coupon.text}</div>
                    </div>
                    ${coupon.url ? `<a href="${coupon.url}" target="_blank" class="vh-promo-btn">LẤY MÃ</a>` : ''}
                </div>
            `;
            promoSection.style.display = 'block';
        }
    };

    Controller.init();
})();