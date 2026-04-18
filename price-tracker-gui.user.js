// ==UserScript==
// @name         Price Tracker (GUI)
// @namespace    http://tampermonkey.net/
// @version      3.1.0
// @description  Giao diện Premium cho Price Tracker. Kết nối với Price Tracker Engine.
// @author       Antigravity
// @match        *://*.taobao.com/*
// @match        *://*.tmall.com/*
// @match        *://*.jd.com/*
// @match        *://*.1688.com/*
// @match        *://item.taobao.com/*
// @match        *://item.jd.com/*
// @match        *://detail.tmall.com/*
// @require      https://cdn.jsdelivr.net/npm/echarts@5.5.0/dist/echarts.min.js
// @updateURL    https://raw.githubusercontent.com/hoangtung-lux/Price-Tracker/main/dist/price-tracker-gui.user.js
// @downloadURL  https://raw.githubusercontent.com/hoangtung-lux/Price-Tracker/main/dist/price-tracker-gui.user.js
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    const UI_CONFIG = {
        theme: {
            bg: 'rgba(18, 18, 20, 0.9)',
            blur: 'blur(20px)',
            mmb_color: '#00d2ff',
            gwd_color: '#ff4b2b',
            text: '#ffffff',
            mute: '#b0b0b0'
        },
        id: {
            root: 'vh-gui-root',
            chart: 'vh-chart-canvas'
        }
    };

    let chartInstance = null;
    let activeSource = 'gwd';

    const STYLES = `
        #${UI_CONFIG.id.root} { position: fixed; bottom: 30px; right: 30px; z-index: 1000000; font-family: 'Segoe UI', Roboto, sans-serif; }
        .vh-launcher { width: 56px; height: 56px; background: linear-gradient(135deg, ${UI_CONFIG.theme.gwd_color}, ${UI_CONFIG.theme.mmb_color}); border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 12px 30px rgba(0,0,0,0.4); transition: 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); font-size: 24px; border: 1px solid rgba(255,255,255,0.1); }
        .vh-launcher:hover { transform: scale(1.1) rotate(5deg); }
        .vh-main-panel { position: absolute; bottom: 75px; right: 0; width: 480px; background: ${UI_CONFIG.theme.bg}; backdrop-filter: ${UI_CONFIG.theme.blur}; -webkit-backdrop-filter: ${UI_CONFIG.theme.blur}; border-radius: 20px; border: 1px solid rgba(255,255,255,0.1); padding: 20px; display: none; flex-direction: column; color: ${UI_CONFIG.theme.text}; box-shadow: 0 20px 50px rgba(0,0,0,0.5); }
        .vh-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .vh-tabs { display: flex; gap: 8px; background: rgba(255,255,255,0.05); padding: 4px; border-radius: 12px; }
        .vh-tab-item { padding: 6px 14px; border-radius: 8px; font-size: 11px; cursor: pointer; color: ${UI_CONFIG.theme.mute}; font-weight: 700; transition: 0.2s; }
        .vh-tab-item.active-gwd { background: ${UI_CONFIG.theme.gwd_color}; color: #fff; }
        .vh-tab-item.active-mmb { background: ${UI_CONFIG.theme.mmb_color}; color: #000; }
        #${UI_CONFIG.id.chart} { width: 100%; height: 280px; }
    `;

    const getChartOption = (data, color, name) => ({
        backgroundColor: 'transparent',
        grid: { top: 30, bottom: 30, left: 40, right: 10 },
        tooltip: { trigger: 'axis', backgroundColor: '#111', borderColor: color, textStyle: { color: '#fff' } },
        xAxis: { type: 'time', axisLabel: { color: UI_CONFIG.theme.mute, fontSize: 10 }, axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } } },
        yAxis: { type: 'value', axisLabel: { color: UI_CONFIG.theme.mute }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.03)' } } },
        series: [{
            name, type: 'line', smooth: true, data, symbol: 'none',
            lineStyle: { color, width: 3 },
            areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: color + '44' }, { offset: 1, color: color + '00' }]) }
        }]
    });

    const Controller = {
        init() {
            this.injectStyles();
            this.renderLayout();
            this.setupEventListeners();
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
                <div class="vh-launcher">📊</div>
                <div class="vh-main-panel">
                    <div class="vh-header">
                        <span style="font-weight: 800; opacity: 0.9;">BIỂU ĐỒ GIÁ</span>
                        <div class="vh-tabs">
                            <div class="vh-tab-item active-gwd" data-src="gwd">Gouwudang</div>
                            <div class="vh-tab-item" data-src="mmb">Manmanbuy</div>
                        </div>
                    </div>
                    <div id="${UI_CONFIG.id.chart}"></div>
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
                if (isOpening) this.syncData();
            };

            tabs.forEach(tab => {
                tab.onclick = () => {
                    tabs.forEach(t => t.classList.remove('active-gwd', 'active-mmb'));
                    activeSource = tab.dataset.src;
                    tab.classList.add(activeSource === 'gwd' ? 'active-gwd' : 'active-mmb');
                    this.syncData();
                };
            });
        },

        syncData() {
            const core = window.VHPriceTrackerCore;
            if (!core) return;

            core.startTracking((source, history) => {
                if (source === activeSource) this.renderChart(history);
            });

            // Nếu đã có data sẵn thì render luôn
            if (core.dataStore[activeSource]?.length > 0) {
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
        }
    };

    // Bootstrap: Wait for Core Engine
    const bootstrap = setInterval(() => {
        if (window.VHPriceTrackerCore) {
            clearInterval(bootstrap);
            Controller.init();
        }
    }, 500);

})();
