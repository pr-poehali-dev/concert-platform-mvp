const Form = {
  field: (label, input, hint = '') => `
    <div style="margin-bottom:14px;">
      <label style="display:block;font-size:12px;color:var(--muted);margin-bottom:4px;">${label}</label>
      ${input}
      ${hint ? `<div style="font-size:11px;color:var(--muted);margin-top:3px;">${hint}</div>` : ''}
    </div>
  `,

  text: (name, value = '', placeholder = '', required = false) =>
    `<input class="input" type="text" name="${name}" value="${value}" placeholder="${placeholder}" ${required ? 'required' : ''}>`,

  number: (name, value = '', placeholder = '') =>
    `<input class="input" type="number" name="${name}" value="${value}" placeholder="${placeholder}">`,

  date: (name, value = '') =>
    `<input class="input" type="date" name="${name}" value="${value}">`,

  textarea: (name, value = '', placeholder = '', rows = 3) =>
    `<textarea class="input" name="${name}" placeholder="${placeholder}" rows="${rows}" style="resize:vertical;">${value}</textarea>`,

  select: (name, options, value = '') => `
    <select class="input" name="${name}">
      ${options.map(o => `<option value="${o.value}" ${o.value == value ? 'selected' : ''}>${o.label}</option>`).join('')}
    </select>
  `,

  collect: (formEl) => {
    const data = {};
    formEl.querySelectorAll('[name]').forEach(el => {
      data[el.name] = el.type === 'number' ? (parseFloat(el.value) || 0) : el.value;
    });
    return data;
  },

  validate: (data, rules) => {
    for (const [field, rule] of Object.entries(rules)) {
      if (rule.required && !data[field]) return `Поле "${rule.label}" обязательно`;
      if (rule.min && data[field] < rule.min) return `"${rule.label}" должно быть ≥ ${rule.min}`;
    }
    return null;
  },
};
