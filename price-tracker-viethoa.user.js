// ==UserScript==
// @name         VietHoa Price Tracker (MMB + GWD)
// @namespace    http://tampermonkey.net/
// @version      3.0.0
// @description  Bản Việt Hóa theo dõi lịch sử giá từ 慢慢买 và 购物党. Giao diện Premium Glassmorphism.
// @author       Antigravity
// @match        *://*.taobao.com/*
// @match        *://*.tmall.com/*
// @match        *://*.jd.com/*
// @match        *://*.1688.com/*
// @match        *://item.taobao.com/*
// @match        *://item.jd.com/*
// @match        *://detail.tmall.com/*
// @require      https://cdn.jsdelivr.net/npm/echarts@5.5.0/dist/echarts.min.js
// @grant        GM_xmlhttpRequest
// @connect      tool.manmanbuy.com
// @connect      api.gwdang.com
// @connect      www.gwdang.com
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // --- CONFIG & CONSTANTS ---
    const THEME = {
        background: 'rgba(18, 18, 20, 0.85)',
        glass: 'blur(12px)',
        mmb: '#00d2ff',
        gwd: '#ff4b2b',
        text: '#ffffff',
        subtext: '#b0b0b0'
    };

    let chartInstance = null;
    let currentData = { mmb: [], gwd: [] };
    let activeSource = 'gwd'; // Mặc định Gouwudang vì data JSON sạch hơn

    // --- CSS INJECTION ---
    const injectStyles = () => {
        const css = `
            #vh-price-root {
                position: fixed;
                bottom: 30px;
                right: 30px;
                z-index: 999999;
                font-family: 'Inter', sans-serif;
            }

            .vh-bubble {
                width: 60px;
                height: 60px;
                background: linear-gradient(135deg, ${THEME.gwd}, ${THEME.mmb});
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                border: 2px solid rgba(255, 255, 255, 0.1);
            }

            .vh-bubble:hover {
                transform: scale(1.1) rotate(5deg);
                box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
            }

            .vh-panel {
                position: absolute;
                bottom: 80px;
                right: 0;
                width: 500px;
                background: ${THEME.background};
                backdrop-filter: ${THEME.glass};
                -webkit-backdrop-filter: ${THEME.glass};
                border-radius: 20px;
                border: 1px solid rgba(255, 255, 255, 0.1);
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
                padding: 24px;
                display: none;
                flex-direction: column;
                overflow: hidden;
                animation: vh-fade 0.3s ease-out;
            }

            @keyframes vh-fade {
                from { opacity: 0; transform: translateY(20px) scale(0.95); }
                to { opacity: 1; transform: translateY(0) scale(1); }
            }

            .vh-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
            }

            .vh-title {
                font-size: 18px;
                font-weight: 700;
                color: ${THEME.text};
                letter-spacing: -0.5px;
            }

            .vh-source-tabs {
                display: flex;
                background: rgba(255, 255, 255, 0.05);
                padding: 4px;
                border-radius: 12px;
            }

            .vh-tab {
                padding: 6px 12px;
                border-radius: 8px;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.2s;
                color: ${THEME.subtext};
                font-weight: 600;
            }

            .vh-tab.active-mmb { background: ${THEME.mmb}; color: #000; }
            .vh-tab.active-gwd { background: ${THEME.gwd}; color: #fff; }

            #vh-chart {
                width: 100%;
                height: 300px;
                margin-top: 10px;
            }

            .vh-footer {
                margin-top: 20px;
                font-size: 11px;
                color: ${THEME.subtext};
                display: flex;
                justify-content: space-between;
                border-top: 1px solid rgba(255, 255, 255, 0.05);
                padding-top: 12px;
            }

            .vh-close-btn {
                cursor: pointer;
                opacity: 0.5;
                transition: 0.2s;
            }
            .vh-close-btn:hover { opacity: 1; }
        `;
        const style = document.createElement('style');
        style.innerHTML = css;
        document.head.appendChild(style);
    };

    // --- CORE LOGIC & PARSING ---
    const normalizeGwdData = (rawData) => {
        try {
            if (!rawData || !rawData.store || !rawData.store[0]) return [];
            return rawData.store[0].all_line.map(item => [new Date(item[0]).getTime(), parseFloat(item[1])]);
        } catch (e) { return []; }
    };

    const normalizeMmbData = (html) => {
        // Regex tìm strDate trong cục HTML khổng lồ của MMB
        const match = html.match(/strDate\s*=\s*"(.*?)";/);
        if (!match) return [];
        try {
            // strDate có dạng: 1713427200000|99.5|Metadata#...
            return match[1].split('#').filter(x => x).map(point => {
                const [time, price] = point.split('|');
                return [parseInt(time), parseFloat(price)];
            });
        } catch (e) { return []; }
    };

    // --- API ENGINES ---
    const fetchGwd = (url) => {
        GM_xmlhttpRequest({
            method: "GET",
            url: `https://api.gwdang.com/extension/price_towards?url=${encodeURIComponent(url)}&ver=1`,
            headers: { "Referer": "https://www.gwdang.com/" },
            onload: (res) => {
                const data = JSON.parse(res.responseText);
                currentData.gwd = normalizeGwdData(data);
                if (activeSource === 'gwd') updateChart();
            }
        });
    };

    const fetchMmb = (url) => {
        GM_xmlhttpRequest({
            method: "GET",
            url: `https://tool.manmanbuy.com/history.aspx?DA=1&action=gethistory&url=${encodeURIComponent(url)}`,
            headers: { "Referer": "https://tool.manmanbuy.com/" },
            onload: (res) => {
                currentData.mmb = normalizeMmbData(res.responseText);
                if (activeSource === 'mmb') updateChart();
            }
        });
    };

    // --- CHART ENGINE (ECharts) ---
    const updateChart = () => {
        const data = activeSource === 'mmb' ? currentData.mmb : currentData.gwd;
        const color = activeSource === 'mmb' ? THEME.mmb : THEME.gwd;
        const sourceName = activeSource === 'mmb' ? '慢慢买' : '购物党';

        if (!chartInstance) {
            chartInstance = echarts.init(document.getElementById('vh-chart'));
        }

        const option = {
            backgroundColor: 'transparent',
            tooltip: { trigger: 'axis', backgroundColor: 'rgba(0,0,0,0.8)', borderColor: color, textStyle: { color: '#fff' } },
            xAxis: { type: 'time', axisLabel: { color: THEME.subtext }, lineStyle: { color: 'rgba(255,255,255,0.1)' } },
            yAxis: { type: 'value', axisLabel: { color: THEME.subtext }, splitLine: { lineStyle: { type: 'dashed', color: 'rgba(255,255,255,0.05)' } } },
            series: [{
                name: sourceName,
                type: 'line',
                data: data,
                smooth: true,
                symbol: 'none',
                lineStyle: { width: 3, color: color },
                areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: color + '44' }, { offset: 1, color: color + '00' }]) }
            }]
        };
        chartInstance.setOption(option);
    };

    // --- UI BUILDER ---
    const initUI = () => {
        injectStyles();
        const root = document.createElement('div');
        root.id = 'vh-price-root';
        root.innerHTML = `
            <div class="vh-bubble" title="Click để xem biểu đồ giá">📈</div>
            <div class="vh-panel">
                <div class="vh-header">
                    <div class="vh-title">Lịch Sử Giá ViệtHóa</div>
                    <div class="vh-source-tabs">
                        <div class="vh-tab active-gwd" data-src="gwd">Gouwudang</div>
                        <div class="vh-tab" data-src="mmb">Manmanbuy</div>
                    </div>
                </div>
                <div id="vh-chart"></div>
                <div class="vh-footer">
                    <span>Nguồn: ${activeSource === 'mmb' ? 'Manmanbuy.com' : 'Gwdang.com'}</span>
                    <span class="vh-close-btn">Đóng [x]</span>
                </div>
            </div>
        `;
        document.body.appendChild(root);

        const bubble = root.querySelector('.vh-bubble');
        const panel = root.querySelector('.vh-panel');
        const tabs = root.querySelectorAll('.vh-tab');

        bubble.addEventListener('click', () => {
            panel.style.display = panel.style.display === 'flex' ? 'none' : 'flex';
            if (panel.style.display === 'flex') {
                setTimeout(() => { chartInstance && chartInstance.resize(); updateChart(); }, 100);
            }
        });

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => { t.classList.remove('active-mmb', 'active-gwd'); });
                activeSource = tab.dataset.src;
                tab.classList.add(activeSource === 'mmb' ? 'active-mmb' : 'active-gwd');
                updateChart();
            });
        });

        root.querySelector('.vh-close-btn').addEventListener('click', () => { panel.style.display = 'none'; });
    };

    // --- MAIN ---
    const main = () => {
        initUI();
        let url = window.location.href;

        // Xử lý SKU Taobao (Hỗ trợ variant)
        try {
            if (window.Hub && window.Hub.config && window.Hub.config.get('sku')) {
                const skuId = window.Hub.config.get('sku').skuId;
                const itemId = new URLSearchParams(window.location.search).get('id');
                if (skuId && itemId) url = `https://sku-taobao.com/item.htm?id=${itemId}-${skuId}`;
            }
        } catch (e) {}

        fetchGwd(url);
        fetchMmb(url);
    };

    // Đợi 2s để đảm bảo các script của trang (như Hub config) đã load
    setTimeout(main, 2000);

})();
