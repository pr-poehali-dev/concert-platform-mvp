const Kanban = {
  render: (container, { stages, items, getStage, onDrop, renderCard }) => {
    container.innerHTML = `
      <div class="kanban-board" style="display:flex;gap:12px;overflow-x:auto;padding-bottom:16px;min-height:400px;">
        ${stages.map(stage => `
          <div class="kanban-col" data-stage="${stage.id}" style="min-width:260px;flex-shrink:0;background:var(--card2);border-radius:var(--radius);border:1px solid var(--border);display:flex;flex-direction:column;">
            <div style="padding:12px 14px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;background:var(--card2);border-radius:var(--radius) var(--radius) 0 0;">
              <div style="display:flex;align-items:center;gap:8px;">
                <div style="width:8px;height:8px;border-radius:50%;background:${stage.color};"></div>
                <span style="font-size:13px;font-weight:600;">${stage.label}</span>
              </div>
              <span style="font-size:11px;color:var(--muted);background:var(--border);padding:2px 8px;border-radius:20px;">${items.filter(i => getStage(i) === stage.id).length}</span>
            </div>
            <div class="kanban-cards" data-stage="${stage.id}" 
              style="padding:8px;display:flex;flex-direction:column;gap:8px;flex:1;min-height:60px;"
              ondragover="event.preventDefault();event.currentTarget.style.background='rgba(168,85,247,0.1)'"
              ondragleave="event.currentTarget.style.background=''"
              ondrop="Kanban._drop(event,'${stage.id}')">
              ${items.filter(i => getStage(i) === stage.id).map(item => `
                <div class="kanban-card" draggable="true" data-id="${item.id}"
                  style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius-sm);padding:12px;cursor:grab;transition:all 0.2s;position:relative;"
                  ondragstart="Kanban._dragStart(event,'${item.id}')"
                  ondragend="event.currentTarget.style.opacity='1'"
                  onmouseenter="this.style.borderColor='var(--primary)'"
                  onmouseleave="this.style.borderColor='var(--border)'">
                  <div style="position:absolute;top:0;left:0;bottom:0;width:3px;background:${stage.color};border-radius:var(--radius-sm) 0 0 var(--radius-sm);"></div>
                  <div style="padding-left:8px;">${renderCard(item)}</div>
                </div>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    `;
    Kanban._onDrop = onDrop;
  },

  _dragStart: (e, id) => {
    e.dataTransfer.setData('id', id);
    e.currentTarget.style.opacity = '0.5';
    tg.HapticFeedback?.impactOccurred('light');
  },

  _drop: (e, stageId) => {
    e.preventDefault();
    e.currentTarget.style.background = '';
    const id = e.dataTransfer.getData('id');
    if (id && Kanban._onDrop) Kanban._onDrop(id, stageId);
    tg.HapticFeedback?.impactOccurred('medium');
  },

  _onDrop: null,
};
