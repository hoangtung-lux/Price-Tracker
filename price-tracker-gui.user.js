// ==UserScript==
// @name         Price Tracker (GUI)
// @namespace    http://tampermonkey.net/
// @version      3.0.0
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

    // --- BẠN CÓ THỂ TÙY CHỈNH THEME TẠI ĐÂY ---
    const THEME = {
        background: 'rgba(18, 18, 20, 0.88)',
        glass: 'blur(15px)',
        mmb: '#00d2ff', // Màu của Manmanbuy
        gwd: '#ff4b2b', // Màu của Gouwudang
        text: '#ffffff',
        subtext: '#b0b0b0'
    };

    let chart = null;
    let activeSource = 'gwd';

    const injectStyles = () => {
        const css = `
            #vh-gui-root { position: fixed; bottom: 30px; right: 30px; z-index: 9999999; font-family: system-ui, -apple-system, sans-serif; }
            .vh-bubble { width: 56px; height: 56px; background: linear-gradient(135deg, ${THEME.gwd}, ${THEME.mmb}); border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 10px 30px rgba(0,0,0,0.3); transition: 0.3s; font-size: 24px; }
            .vh-bubble:hover { transform: scale(1.1); }
            .vh-panel { position: absolute; bottom: 70px; right: 0; width: 480px; background: ${THEME.background}; backdrop-filter: ${THEME.glass}; border-radius: 20px; border: 1px solid rgba(255,255,255,0.1); padding: 20px; display: none; flex-direction: column; color: ${THEME.text}; }
            .vh-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
            .vh-tabs { display: flex; gap: 10px; background: rgba(255,255,255,0.05); padding: 4px; border-radius: 10px; }
            .vh-tab { padding: 4px 10px; border-radius: 6px; font-size: 11px; cursor: pointer; color: ${THEME.subtext}; font-weight: bold; }
            .vh-tab.active-gwd { background: ${THEME.gwd}; color: #fff; }
            .vh-tab.active-mmb { background: ${THEME.mmb}; color: #000; }
            #vh-chart-main { width: 100%; height: 280px; }
        `;
        const style = document.createElement('style');
        style.innerHTML = css;
        document.head.appendChild(style);
    };

    const updateChart = (data) => {
        if (!data || data.length === 0) return;
        if (!chart) chart = echarts.init(document.getElementById('vh-chart-main'));
        
        const color = activeSource === 'mmb' ? THEME.mmb : THEME.gwd;
        chart.setOption({
            backgroundColor: 'transparent',
            tooltip: { trigger: 'axis', backgroundColor: '#000', borderColor: color, textStyle: {color: '#fff'} },
            xAxis: { type: 'time', axisLabel: {color: THEME.subtext} },
            yAxis: { type: 'value', axisLabel: {color: THEME.subtext}, splitLine: {lineStyle:{color:'rgba(255,255,255,0.05)'}} },
            series: [{
                type: 'line', smooth: true, data: data, symbol: 'none',
                lineStyle: { color: color, width: 3 },
                areaStyle: { color: new echarts.graphic.LinearGradient(0,0,0,1, [{offset: 0, color: color+'55'}, {offset: 1, color: color+'00'}]) }
            }]
        });
    };

    const init = () => {
        injectStyles();
        const root = document.createElement('div');
        root.id = 'vh-gui-root';
        root.innerHTML = `
            <div class="vh-bubble">📉</div>
            <div class="vh-panel">
                <div class="vh-header">
                    <b style="font-size: 16px;">Biểu Đồ Giá</b>
                    <div class="vh-tabs">
                        <div class="vh-tab active-gwd" data-src="gwd">Gouwudang</div>
                        <div class="vh-tab" data-src="mmb">Manmanbuy</div>
                    </div>
                </div>
                <div id="vh-chart-main"></div>
                <div style="font-size: 10px; color: ${THEME.subtext}; margin-top: 10px; text-align: right;">Core Engine v3.0 Connected</div>
            </div>
        `;
        document.body.appendChild(root);

        const bubble = root.querySelector('.vh-bubble');
        const panel = root.querySelector('.vh-panel');
        const tabs = root.querySelectorAll('.vh-tab');

        bubble.onclick = () => {
            const isVisible = panel.style.display === 'flex';
            panel.style.display = isVisible ? 'none' : 'flex';
            
            if (!isVisible && window.VHPriceTrackerCore) {
                // Khi mở panel, yêu cầu Core cào dữ liệu mới nhất
                window.VHPriceTrackerCore.fetchAll((source, history) => {
                    if (source === activeSource) updateChart(history);
                });
            }
        };

        tabs.forEach(tab => {
            tab.onclick = () => {
                tabs.forEach(t => t.classList.remove('active-gwd', 'active-mmb'));
                activeSource = tab.dataset.src;
                tab.classList.add(activeSource === 'gwd' ? 'active-gwd' : 'active-mmb');
                if (window.VHPriceTrackerCore) updateChart(window.VHPriceTrackerCore.currentData[activeSource]);
            };
        });
    };

    // Đợi Core Engine sẵn sàng
    const checkCore = setInterval(() => {
        if (window.VHPriceTrackerCore) {
            clearInterval(checkCore);
            init();
        }
    }, 500);

})();
