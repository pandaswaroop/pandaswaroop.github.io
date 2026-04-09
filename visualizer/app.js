// ─── State ───
let currentData = null;
let currentView = null;

// ─── DOM refs ───
const dropZone      = document.getElementById('dropZone');
const fileInput      = document.getElementById('fileInput');
const fileInfo       = document.getElementById('fileInfo');
const fileName       = document.getElementById('fileName');
const fileMeta       = document.getElementById('fileMeta');
const removeBtn      = document.getElementById('removeBtn');
const dataPreview    = document.getElementById('dataPreview');
const previewFooter  = document.getElementById('previewFooter');
const chartPlaceholder = document.getElementById('chartPlaceholder');
const spinner        = document.getElementById('spinner');
const vegaChart      = document.getElementById('vega-chart');
const chartBadge     = document.getElementById('chartBadge');
const chartRationale = document.getElementById('chartRationale');
const errorToast     = document.getElementById('errorToast');

// ─── Drag & Drop ───
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file) handleFile(file);
});
fileInput.addEventListener('change', e => {
  if (e.target.files[0]) handleFile(e.target.files[0]);
});
removeBtn.addEventListener('click', resetAll);

// ─── File handling ───
function handleFile(file) {
  if (!file.name.toLowerCase().endsWith('.csv')) {
    showError('Please provide a .csv file.');
    return;
  }

  fileName.textContent = file.name;
  fileMeta.textContent = formatSize(file.size);
  fileInfo.classList.add('visible');

  showSpinner(true);

  Papa.parse(file, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
    complete(results) {
      if (results.errors.length && !results.data.length) {
        showError('Failed to parse CSV: ' + results.errors[0].message);
        showSpinner(false);
        return;
      }
      currentData = results.data;
      const cols = results.meta.fields;
      fileMeta.textContent = `${formatSize(file.size)}  \u00b7  ${currentData.length} rows  \u00b7  ${cols.length} cols`;
      renderPreview(currentData, cols);
      generateChart(currentData, cols);
    },
    error(err) {
      showError('Failed to read file: ' + err.message);
      showSpinner(false);
    }
  });
}

// ─── Preview table ───
function renderPreview(data, cols) {
  const analysis = analyzeColumns(data, cols);
  const previewRows = data.slice(0, 50);

  let html = '<table><thead><tr>';
  cols.forEach(c => {
    const type = analysis.types[c];
    const badge = `<span class="col-badge ${type}">${type.slice(0,3)}</span>`;
    html += `<th>${escapeHtml(c)}${badge}</th>`;
  });
  html += '</tr></thead><tbody>';

  previewRows.forEach(row => {
    html += '<tr>';
    cols.forEach(c => {
      const v = row[c];
      html += `<td title="${escapeHtml(String(v ?? ''))}">${escapeHtml(String(v ?? ''))}</td>`;
    });
    html += '</tr>';
  });
  html += '</tbody></table>';

  dataPreview.innerHTML = html;
  dataPreview.classList.add('visible');

  if (data.length > 50) {
    previewFooter.textContent = `Showing 50 of ${data.length} rows`;
    previewFooter.classList.add('visible');
  } else {
    previewFooter.classList.remove('visible');
  }
}

// ─── Column analysis ───
function analyzeColumns(data, cols) {
  const types = {};
  const uniqueCounts = {};
  const sample = data.slice(0, 200);

  cols.forEach(col => {
    const values = sample.map(r => r[col]).filter(v => v != null && v !== '');
    uniqueCounts[col] = new Set(values.map(String)).size;

    if (isTemporalColumn(col, values)) {
      types[col] = 'temporal';
    } else if (isNumericColumn(values)) {
      types[col] = 'numeric';
    } else {
      types[col] = 'categorical';
    }
  });

  return { types, uniqueCounts };
}

function isNumericColumn(values) {
  if (values.length === 0) return false;
  let numCount = 0;
  for (const v of values) {
    if (typeof v === 'number' && !isNaN(v)) numCount++;
    else if (typeof v === 'string' && v.trim() !== '' && !isNaN(Number(v))) numCount++;
  }
  return numCount / values.length > 0.8;
}

function isTemporalColumn(colName, values) {
  // Check column name hints
  const temporalNames = /date|time|year|month|day|week|hour|minute|second|timestamp|created|updated|period/i;
  if (temporalNames.test(colName)) {
    // Verify at least some values parse as dates
    const parsed = values.slice(0, 20).filter(v => {
      if (typeof v === 'number' && v > 1900 && v < 2200 && Number.isInteger(v)) return true;
      const d = new Date(v);
      return !isNaN(d.getTime());
    });
    return parsed.length / Math.min(values.length, 20) > 0.5;
  }

  // Check if values look like dates
  const datePatterns = [
    /^\d{4}[-/]\d{1,2}[-/]\d{1,2}/,  // 2024-01-15
    /^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/, // 01/15/2024
    /^\w{3,9}\s+\d{1,2},?\s+\d{4}/,   // January 15, 2024
  ];

  const sample = values.slice(0, 20).filter(v => typeof v === 'string');
  if (sample.length < 5) return false;
  const matchCount = sample.filter(v => datePatterns.some(p => p.test(v.trim()))).length;
  return matchCount / sample.length > 0.6;
}

// ─── Chart selection engine ───
function selectChart(data, cols) {
  const analysis = analyzeColumns(data, cols);
  const { types, uniqueCounts } = analysis;

  const numericCols = cols.filter(c => types[c] === 'numeric');
  const temporalCols = cols.filter(c => types[c] === 'temporal');
  const categoricalCols = cols.filter(c => types[c] === 'categorical');

  // Sort categoricals by unique count (prefer lower cardinality for axes)
  categoricalCols.sort((a, b) => uniqueCounts[a] - uniqueCounts[b]);

  const n = data.length;

  // --- Single column datasets ---
  if (cols.length === 1) {
    if (numericCols.length === 1) {
      return { type: 'histogram', fields: { x: numericCols[0] },
        rationale: 'Single numeric column \u2192 showing distribution as histogram' };
    }
    if (categoricalCols.length === 1) {
      return { type: 'bar-count', fields: { x: categoricalCols[0] },
        rationale: 'Single categorical column \u2192 showing value counts' };
    }
    if (temporalCols.length === 1) {
      return { type: 'temporal-count', fields: { x: temporalCols[0] },
        rationale: 'Single date column \u2192 showing event frequency over time' };
    }
  }

  // --- Temporal + numeric → line chart ---
  if (temporalCols.length >= 1 && numericCols.length >= 1) {
    if (numericCols.length === 1) {
      return { type: 'line', fields: { x: temporalCols[0], y: numericCols[0] },
        rationale: `Time series detected \u2192 line chart of ${numericCols[0]} over ${temporalCols[0]}` };
    }
    // Multiple numeric + temporal → multi-line (fold)
    if (numericCols.length <= 6) {
      return { type: 'multi-line', fields: { x: temporalCols[0], y: numericCols },
        rationale: `Multiple measures over time \u2192 multi-series line chart` };
    }
  }

  // --- 1 categorical + 1 numeric → bar chart ---
  if (categoricalCols.length === 1 && numericCols.length === 1 && temporalCols.length === 0) {
    const cat = categoricalCols[0];
    if (uniqueCounts[cat] <= 30) {
      return { type: 'bar', fields: { x: cat, y: numericCols[0] },
        rationale: `Categorical + numeric \u2192 bar chart of ${numericCols[0]} by ${cat}` };
    }
    // Too many categories, flip to horizontal
    return { type: 'bar-horizontal', fields: { x: cat, y: numericCols[0] },
      rationale: `Many categories \u2192 horizontal bar chart` };
  }

  // --- 1 categorical + multiple numeric → grouped bar ---
  if (categoricalCols.length >= 1 && numericCols.length > 1 && numericCols.length <= 5 && temporalCols.length === 0) {
    const cat = categoricalCols[0];
    if (uniqueCounts[cat] <= 20) {
      return { type: 'grouped-bar', fields: { x: cat, y: numericCols },
        rationale: `Categorical + multiple measures \u2192 grouped bar chart` };
    }
  }

  // --- 2 numeric → scatter ---
  if (numericCols.length === 2 && categoricalCols.length === 0 && temporalCols.length === 0) {
    return { type: 'scatter', fields: { x: numericCols[0], y: numericCols[1] },
      rationale: `Two numeric columns \u2192 scatter plot` };
  }

  // --- 2 numeric + 1 categorical → colored scatter ---
  if (numericCols.length === 2 && categoricalCols.length >= 1) {
    const cat = categoricalCols[0];
    if (uniqueCounts[cat] <= 12) {
      return { type: 'scatter-color', fields: { x: numericCols[0], y: numericCols[1], color: cat },
        rationale: `Two numeric + grouping \u2192 color-coded scatter plot` };
    }
    return { type: 'scatter', fields: { x: numericCols[0], y: numericCols[1] },
      rationale: `Two numeric columns \u2192 scatter plot` };
  }

  // --- 2 categorical → heatmap count ---
  if (categoricalCols.length === 2 && numericCols.length === 0) {
    if (uniqueCounts[categoricalCols[0]] <= 20 && uniqueCounts[categoricalCols[1]] <= 20) {
      return { type: 'heatmap-count', fields: { x: categoricalCols[0], y: categoricalCols[1] },
        rationale: `Two categoricals \u2192 co-occurrence heatmap` };
    }
  }

  // --- Many numeric → correlation heatmap / scatter matrix ---
  if (numericCols.length >= 3 && categoricalCols.length === 0) {
    if (numericCols.length <= 6) {
      return { type: 'scatter-matrix', fields: { cols: numericCols },
        rationale: `${numericCols.length} numeric columns \u2192 scatter matrix` };
    }
    return { type: 'heatmap-corr', fields: { cols: numericCols },
      rationale: `Many numeric columns \u2192 correlation heatmap` };
  }

  // --- Fallback: pick first categorical + first numeric for bar, or first two numeric for scatter ---
  if (numericCols.length >= 1 && categoricalCols.length >= 1) {
    return { type: 'bar', fields: { x: categoricalCols[0], y: numericCols[0] },
      rationale: `Showing ${numericCols[0]} by ${categoricalCols[0]}` };
  }
  if (numericCols.length >= 2) {
    return { type: 'scatter', fields: { x: numericCols[0], y: numericCols[1] },
      rationale: `Scatter plot of first two numeric columns` };
  }

  // Absolute fallback
  return { type: 'bar-count', fields: { x: cols[0] },
    rationale: `Showing value counts for ${cols[0]}` };
}

// ─── Vega-Lite spec builders ───
function buildSpec(chartDef, data) {
  const { type, fields } = chartDef;
  const base = {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    background: '#0f1117',
    config: {
      axis: { labelColor: '#8b8fa3', titleColor: '#b0b4c4', gridColor: '#1e2130', domainColor: '#2a2d3a', tickColor: '#2a2d3a' },
      legend: { labelColor: '#8b8fa3', titleColor: '#b0b4c4' },
      view: { stroke: null },
      title: { color: '#e1e4e8' },
      range: { category: ['#7c5cfc', '#38bdf8', '#34d399', '#fbbf24', '#f87171', '#c084fc', '#fb923c', '#22d3ee', '#a3e635', '#f472b6'] }
    },
    data: { values: data },
    autosize: { type: 'fit', contains: 'padding' },
    width: 'container',
    height: 'container',
    padding: 20
  };

  switch (type) {
    case 'histogram':
      return { ...base, mark: { type: 'bar', color: '#7c5cfc', cornerRadiusTopLeft: 3, cornerRadiusTopRight: 3 },
        encoding: {
          x: { bin: { maxbins: 30 }, field: fields.x, type: 'quantitative' },
          y: { aggregate: 'count', type: 'quantitative', title: 'Count' },
          tooltip: [{ bin: { maxbins: 30 }, field: fields.x, type: 'quantitative' }, { aggregate: 'count', type: 'quantitative', title: 'Count' }]
        }};

    case 'bar-count':
      return { ...base, mark: { type: 'bar', color: '#7c5cfc', cornerRadiusTopLeft: 3, cornerRadiusTopRight: 3 },
        encoding: {
          x: { field: fields.x, type: 'nominal', sort: '-y', axis: { labelAngle: -45 } },
          y: { aggregate: 'count', type: 'quantitative', title: 'Count' },
          tooltip: [{ field: fields.x, type: 'nominal' }, { aggregate: 'count', type: 'quantitative', title: 'Count' }]
        }};

    case 'temporal-count':
      return { ...base, mark: { type: 'bar', color: '#7c5cfc', cornerRadiusTopLeft: 3, cornerRadiusTopRight: 3 },
        encoding: {
          x: { field: fields.x, type: 'temporal', timeUnit: 'yearmonth' },
          y: { aggregate: 'count', type: 'quantitative', title: 'Count' },
          tooltip: [{ field: fields.x, type: 'temporal', timeUnit: 'yearmonth' }, { aggregate: 'count', type: 'quantitative', title: 'Count' }]
        }};

    case 'line':
      return { ...base, mark: { type: 'line', color: '#7c5cfc', strokeWidth: 2, point: data.length <= 100 },
        encoding: {
          x: { field: fields.x, type: 'temporal' },
          y: { field: fields.y, type: 'quantitative' },
          tooltip: [{ field: fields.x, type: 'temporal' }, { field: fields.y, type: 'quantitative' }]
        }};

    case 'multi-line':
      return { ...base,
        transform: [{ fold: fields.y, as: ['Measure', 'Value'] }],
        mark: { type: 'line', strokeWidth: 2 },
        encoding: {
          x: { field: fields.x, type: 'temporal' },
          y: { field: 'Value', type: 'quantitative' },
          color: { field: 'Measure', type: 'nominal' },
          tooltip: [{ field: fields.x, type: 'temporal' }, { field: 'Measure', type: 'nominal' }, { field: 'Value', type: 'quantitative' }]
        }};

    case 'bar':
      return { ...base, mark: { type: 'bar', color: '#7c5cfc', cornerRadiusTopLeft: 3, cornerRadiusTopRight: 3 },
        encoding: {
          x: { field: fields.x, type: 'nominal', sort: '-y', axis: { labelAngle: -45 } },
          y: { field: fields.y, type: 'quantitative', aggregate: 'mean' },
          tooltip: [{ field: fields.x, type: 'nominal' }, { field: fields.y, type: 'quantitative', aggregate: 'mean' }]
        }};

    case 'bar-horizontal':
      return { ...base, mark: { type: 'bar', color: '#7c5cfc', cornerRadiusEnd: 3 },
        encoding: {
          y: { field: fields.x, type: 'nominal', sort: '-x', axis: { labelLimit: 120 } },
          x: { field: fields.y, type: 'quantitative', aggregate: 'mean' },
          tooltip: [{ field: fields.x, type: 'nominal' }, { field: fields.y, type: 'quantitative', aggregate: 'mean' }]
        }};

    case 'grouped-bar':
      return { ...base,
        transform: [{ fold: fields.y, as: ['Measure', 'Value'] }],
        mark: { type: 'bar', cornerRadiusTopLeft: 2, cornerRadiusTopRight: 2 },
        encoding: {
          x: { field: fields.x, type: 'nominal', axis: { labelAngle: -45 } },
          y: { field: 'Value', type: 'quantitative', aggregate: 'mean' },
          color: { field: 'Measure', type: 'nominal' },
          xOffset: { field: 'Measure', type: 'nominal' },
          tooltip: [{ field: fields.x, type: 'nominal' }, { field: 'Measure', type: 'nominal' }, { field: 'Value', type: 'quantitative', aggregate: 'mean' }]
        }};

    case 'scatter':
      return { ...base, mark: { type: 'circle', color: '#7c5cfc', opacity: 0.7, size: data.length > 500 ? 20 : 60 },
        encoding: {
          x: { field: fields.x, type: 'quantitative' },
          y: { field: fields.y, type: 'quantitative' },
          tooltip: [{ field: fields.x, type: 'quantitative' }, { field: fields.y, type: 'quantitative' }]
        }};

    case 'scatter-color':
      return { ...base, mark: { type: 'circle', opacity: 0.7, size: data.length > 500 ? 20 : 60 },
        encoding: {
          x: { field: fields.x, type: 'quantitative' },
          y: { field: fields.y, type: 'quantitative' },
          color: { field: fields.color, type: 'nominal' },
          tooltip: [{ field: fields.x, type: 'quantitative' }, { field: fields.y, type: 'quantitative' }, { field: fields.color, type: 'nominal' }]
        }};

    case 'heatmap-count':
      return { ...base, mark: 'rect',
        encoding: {
          x: { field: fields.x, type: 'nominal' },
          y: { field: fields.y, type: 'nominal' },
          color: { aggregate: 'count', type: 'quantitative', scale: { scheme: 'purples' }, title: 'Count' },
          tooltip: [{ field: fields.x, type: 'nominal' }, { field: fields.y, type: 'nominal' }, { aggregate: 'count', type: 'quantitative', title: 'Count' }]
        }};

    case 'scatter-matrix':
      return { ...base,
        repeat: { row: fields.cols.slice().reverse(), column: fields.cols },
        spec: {
          mark: { type: 'circle', opacity: 0.5, size: data.length > 200 ? 10 : 30, color: '#7c5cfc' },
          encoding: {
            x: { field: { repeat: 'column' }, type: 'quantitative' },
            y: { field: { repeat: 'row' }, type: 'quantitative' }
          },
          width: 140,
          height: 140
        },
        autosize: undefined, width: undefined, height: undefined
      };

    case 'heatmap-corr': {
      const corrData = computeCorrelation(data, fields.cols);
      return { ...base,
        data: { values: corrData },
        mark: 'rect',
        encoding: {
          x: { field: 'var1', type: 'nominal', title: null },
          y: { field: 'var2', type: 'nominal', title: null },
          color: { field: 'corr', type: 'quantitative', scale: { domain: [-1, 1], scheme: 'purpleorange' }, title: 'Correlation' },
          tooltip: [{ field: 'var1', type: 'nominal' }, { field: 'var2', type: 'nominal' }, { field: 'corr', type: 'quantitative', format: '.2f' }]
        }};
    }

    default:
      return base;
  }
}

// ─── Correlation helper ───
function computeCorrelation(data, cols) {
  const means = {}, stds = {};
  const n = data.length;

  cols.forEach(c => {
    const vals = data.map(r => +r[c] || 0);
    const mean = vals.reduce((a, b) => a + b, 0) / n;
    means[c] = mean;
    stds[c] = Math.sqrt(vals.reduce((a, v) => a + (v - mean) ** 2, 0) / n);
  });

  const result = [];
  cols.forEach(c1 => {
    cols.forEach(c2 => {
      let sum = 0;
      for (let i = 0; i < n; i++) {
        sum += ((+data[i][c1] || 0) - means[c1]) * ((+data[i][c2] || 0) - means[c2]);
      }
      const denom = n * stds[c1] * stds[c2];
      const corr = denom === 0 ? 0 : sum / denom;
      result.push({ var1: c1, var2: c2, corr: Math.round(corr * 100) / 100 });
    });
  });
  return result;
}

// ─── Generate chart ───
function generateChart(data, cols) {
  try {
    const chartDef = selectChart(data, cols);
    const spec = buildSpec(chartDef, data);

    // Show badge & rationale
    const typeLabels = {
      'histogram': 'Histogram', 'bar-count': 'Bar Chart', 'temporal-count': 'Timeline',
      'line': 'Line Chart', 'multi-line': 'Multi-Line Chart', 'bar': 'Bar Chart',
      'bar-horizontal': 'Horizontal Bar', 'grouped-bar': 'Grouped Bar',
      'scatter': 'Scatter Plot', 'scatter-color': 'Scatter Plot',
      'heatmap-count': 'Heatmap', 'scatter-matrix': 'Scatter Matrix',
      'heatmap-corr': 'Correlation Heatmap'
    };

    chartBadge.textContent = typeLabels[chartDef.type] || chartDef.type;
    chartBadge.classList.add('visible');
    chartRationale.textContent = chartDef.rationale;
    chartRationale.classList.add('visible');

    // Render
    chartPlaceholder.style.display = 'none';
    vegaChart.classList.add('visible');

    vegaEmbed('#vega-chart', spec, {
      actions: { export: true, source: false, compiled: false, editor: false },
      renderer: 'svg',
      theme: 'dark'
    }).then(result => {
      if (currentView) currentView.finalize();
      currentView = result.view;
      showSpinner(false);
    }).catch(err => {
      showError('Chart rendering failed: ' + err.message);
      showSpinner(false);
    });

  } catch (err) {
    showError('Chart generation failed: ' + err.message);
    showSpinner(false);
  }
}

// ─── Utilities ───
function resetAll() {
  currentData = null;
  if (currentView) { currentView.finalize(); currentView = null; }
  fileInput.value = '';
  fileInfo.classList.remove('visible');
  dataPreview.classList.remove('visible');
  dataPreview.innerHTML = '';
  previewFooter.classList.remove('visible');
  chartPlaceholder.style.display = '';
  vegaChart.classList.remove('visible');
  vegaChart.innerHTML = '';
  chartBadge.classList.remove('visible');
  chartRationale.classList.remove('visible');
}

function showSpinner(show) {
  spinner.classList.toggle('visible', show);
}

function showError(msg) {
  errorToast.textContent = msg;
  errorToast.classList.add('visible');
  setTimeout(() => errorToast.classList.remove('visible'), 5000);
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
