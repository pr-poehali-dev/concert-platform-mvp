const Table = {
  render: (container, { columns, rows, onRow, emptyText = 'Нет данных' }) => {
    if (!rows.length) {
      container.innerHTML = `<div class="empty-state"><div class="icon">📋</div><div>${emptyText}</div></div>`;
      return;
    }
    container.innerHTML = `
      <div style="overflow-x:auto;border-radius:var(--radius);border:1px solid var(--border);">
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="border-bottom:1px solid var(--border);">
              ${columns.map(c => `<th style="padding:10px 14px;text-align:left;font-size:11px;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:0.5px;white-space:nowrap;">${c.label}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${rows.map((row, i) => `
              <tr data-idx="${i}" style="border-bottom:1px solid var(--border);cursor:${onRow ? 'pointer' : 'default'};transition:background 0.15s;" 
                onmouseenter="this.style.background='var(--card2)'" 
                onmouseleave="this.style.background=''"
                ${onRow ? `onclick="__tableRowClick(${i})"` : ''}>
                ${columns.map(c => `<td style="padding:10px 14px;font-size:13px;white-space:nowrap;">${c.render ? c.render(row) : (row[c.key] ?? '—')}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
    if (onRow) {
      window.__tableRowClick = (i) => onRow(rows[i]);
    }
  },

  sort: (rows, key, dir = 'asc') => {
    return [...rows].sort((a, b) => {
      const av = a[key], bv = b[key];
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = typeof av === 'string' ? av.localeCompare(bv, 'ru') : av - bv;
      return dir === 'asc' ? cmp : -cmp;
    });
  },

  filter: (rows, search, keys) => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(r => keys.some(k => String(r[k] ?? '').toLowerCase().includes(q)));
  },
};
