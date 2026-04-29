// Chart helpers (Chart.js wrapper)
const CrmChart = {
  bar: (ctx, labels, datasets, opts = {}) => new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: datasets.map(d => ({ borderRadius: 6, borderSkipped: false, ...d })) },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: datasets.length > 1, labels: { color: '#8b949e', font: { size: 12 } } } },
      scales: {
        x: { grid: { color: '#21262d' }, ticks: { color: '#8b949e' } },
        y: { grid: { color: '#21262d' }, ticks: { color: '#8b949e', ...opts.yTicks } },
      },
      ...opts,
    },
  }),

  line: (ctx, labels, datasets, opts = {}) => new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: datasets.map(d => ({ fill: true, tension: 0.4, pointRadius: 4, pointHoverRadius: 6, ...d })),
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: datasets.length > 1, labels: { color: '#8b949e', font: { size: 12 } } } },
      scales: {
        x: { grid: { color: '#21262d' }, ticks: { color: '#8b949e' } },
        y: { grid: { color: '#21262d' }, ticks: { color: '#8b949e', ...opts.yTicks } },
      },
      ...opts,
    },
  }),

  doughnut: (ctx, labels, data, colors, opts = {}) => new Chart(ctx, {
    type: 'doughnut',
    data: { labels, datasets: [{ data, backgroundColor: colors, borderColor: '#161b22', borderWidth: 2, hoverOffset: 8 }] },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '70%',
      plugins: { legend: { position: 'bottom', labels: { color: '#8b949e', font: { size: 12 }, padding: 16 } } },
      ...opts,
    },
  }),

  funnel: (container, stages) => {
    const max = stages[0]?.value || 1;
    container.innerHTML = stages.map((s, i) => {
      const pct = Math.round((s.value / max) * 100);
      const conv = i > 0 ? Math.round((s.value / stages[i-1].value) * 100) : 100;
      return `
        <div style="margin-bottom:8px;">
          <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;">
            <span style="color:var(--text);">${s.label}</span>
            <span style="color:var(--muted);">${s.value} ${i > 0 ? `<span style="color:${conv > 50 ? 'var(--success)' : 'var(--warning)'};">(${conv}%)</span>` : ''}</span>
          </div>
          <div style="height:28px;background:var(--border);border-radius:4px;overflow:hidden;position:relative;">
            <div style="height:100%;width:${pct}%;background:${s.color};border-radius:4px;transition:width 0.8s ease;display:flex;align-items:center;padding:0 8px;">
              <span style="font-size:11px;color:#fff;font-weight:600;white-space:nowrap;">${pct}%</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  destroy: (instance) => { try { instance?.destroy(); } catch {} },
};
