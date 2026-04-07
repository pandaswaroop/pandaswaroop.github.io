// ─── State ───
let apiKey = localStorage.getItem('chartdetector_api_key') || '';
let imageBase64 = null;
let imageMediaType = null;
let isAnalyzing = false;

// ─── DOM refs ───
const settingsBtn    = document.getElementById('settingsBtn');
const apiStatusDot   = document.getElementById('apiStatus');
const sidebar        = document.getElementById('sidebar');
const apiKeyInput    = document.getElementById('apiKeyInput');
const saveKeyBtn     = document.getElementById('saveKeyBtn');
const keySavedMsg    = document.getElementById('keySavedMsg');
const dropZone       = document.getElementById('dropZone');
const fileInput      = document.getElementById('fileInput');
const imagePreview   = document.getElementById('imagePreview');
const imgFileName    = document.getElementById('imgFileName');
const imgFileMeta    = document.getElementById('imgFileMeta');
const removeBtn      = document.getElementById('removeBtn');
const previewImg     = document.getElementById('previewImg');
const analyzeBtn     = document.getElementById('analyzeBtn');
const verdictBadge   = document.getElementById('verdictBadge');
const issueCount     = document.getElementById('issueCount');
const resultsArea    = document.getElementById('resultsArea');
const resultsPlaceholder = document.getElementById('resultsPlaceholder');
const errorToast     = document.getElementById('errorToast');

// ─── Init ───
if (apiKey) {
  apiKeyInput.value = maskKey(apiKey);
  apiStatusDot.classList.add('connected');
}

// ─── Sidebar toggle ───
settingsBtn.addEventListener('click', () => sidebar.classList.toggle('open'));

// ─── API key management ───
apiKeyInput.addEventListener('focus', () => {
  if (apiKey && apiKeyInput.value.includes('•')) apiKeyInput.value = '';
});

apiKeyInput.addEventListener('blur', () => {
  if (!apiKeyInput.value && apiKey) apiKeyInput.value = maskKey(apiKey);
});

saveKeyBtn.addEventListener('click', () => {
  const val = apiKeyInput.value.trim();
  if (!val || val.includes('•')) return;

  apiKey = val;
  localStorage.setItem('chartdetector_api_key', apiKey);
  apiKeyInput.value = maskKey(apiKey);
  apiStatusDot.classList.add('connected');

  keySavedMsg.classList.add('visible');
  setTimeout(() => keySavedMsg.classList.remove('visible'), 3000);
});

function maskKey(key) {
  if (key.length <= 12) return key;
  return key.slice(0, 8) + '••••••••' + key.slice(-4);
}

// ─── Drag & Drop ───
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
});
fileInput.addEventListener('change', e => {
  if (e.target.files[0]) handleFile(e.target.files[0]);
});
removeBtn.addEventListener('click', resetAll);
analyzeBtn.addEventListener('click', runAnalysis);

// ─── File handling ───
function handleFile(file) {
  const validTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    showError('Please upload an image file (PNG, JPG, GIF, or WebP).');
    return;
  }

  imgFileName.textContent = file.name;
  imgFileMeta.textContent = formatSize(file.size);
  imagePreview.classList.add('visible');

  // Read as base64
  const reader = new FileReader();
  reader.onload = (e) => {
    const dataUrl = e.target.result;
    previewImg.src = dataUrl;
    // Extract base64 and media type
    imageBase64 = dataUrl.split(',')[1];
    imageMediaType = file.type;
    analyzeBtn.disabled = false;
  };
  reader.readAsDataURL(file);

  // Clear old results
  clearResults();
}

// ─── Analysis ───
async function runAnalysis() {
  if (!apiKey) {
    showError('Please add your Anthropic API key in the settings panel (gear icon).');
    sidebar.classList.add('open');
    return;
  }

  if (!imageBase64) {
    showError('Please upload a chart image first.');
    return;
  }

  if (isAnalyzing) return;
  isAnalyzing = true;
  analyzeBtn.classList.add('loading');
  analyzeBtn.disabled = true;
  clearResults();

  try {
    const result = await callClaude(imageBase64, imageMediaType);
    renderResults(result);
  } catch (err) {
    showError('Analysis failed: ' + err.message);
  } finally {
    isAnalyzing = false;
    analyzeBtn.classList.remove('loading');
    analyzeBtn.disabled = false;
  }
}

async function callClaude(base64, mediaType) {
  const prompt = buildAnalysisPrompt();

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: base64 }
          },
          {
            type: 'text',
            text: prompt
          }
        ]
      }]
    })
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    const msg = errBody?.error?.message || `HTTP ${response.status}`;
    throw new Error(msg);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text || '';
  return parseAnalysisResponse(text);
}

function buildAnalysisPrompt() {
  return `You are a data visualization expert and chart auditor. Analyze this chart image for misleading, deceptive, or poorly designed elements.

Use the following taxonomy of visualization flaws (from the FlawViz research framework) to guide your analysis:

## MISINFORMATION
**Inaccuracy:** Data-visual disproportion, 3D distortion effects, truncated/manipulated axes, mathematical errors, dual encoding, pop-out effects on data marks, conflating area with radius, wrong label placement, inverted axis, legend-visual inconsistency, misleading annotations, reasoning errors, visualization-text disjunction, typos/grammatical errors.
**Ambiguity:** Visualization as mere embellishment, invasion of figurative semantics, mixed use of channels, unclear symbols, unclear proxy for comparison, illusion of inclusion/intersection/union, ghost elements, highlighting that resembles data.
**Incompatibility:** Misuse of part-to-whole relationship, failure to display uncertainty, continuous encoding for categorical data, misuse of periodicity, failure to display infinite/null values, categorical encoding for continuous data, misuse of cumulative/logical/hierarchical relationships, failure to display ordinal data, misuse of sequence.
**Unfairness:** Multiple scales, misaligned comparison, uneven data grouping, uneven axis intervals, comparing apples with oranges.

## UNINFORMATIVENESS
**Low Readability:** Overlapping data marks, text rotation, small size, cluttered labels, stylized effects on data marks, indistinguishable colors/textures, low contrast, obscuring data with embellishment, colorblind unfriendliness, exceeding canvas, rendering glitches.
**Low Coherence:** Irregular segmentation, inconsistent visual encodings, rainbow colormap, dual axes, unstructured layout, violating gestalt laws, redundant encoding channels.
**Overcomplexity:** Overuse of categories/colors, meaningless/confounding encoding, overuse of visual channels, high information density, single-value over-visualization, large number of unaggregate units.
**Oversimplification:** Lack of labels, lack of scales, lack of legends, lack of explanation for metrics, labels lacking callouts.

## UNSOCIABILITY
**Abnormality:** Semantic mismatch, stretched imagery, breaking convention, cut-off imagery, unconventional scale analogies.
**Aggressiveness:** Disturbing patterns/imagery, strong rhetoric, arrogant wording.

---

Respond in STRICT JSON format (no markdown code fences, just raw JSON). Use this exact structure:

{
  "integrity_score": <number 0-100, where 100 = perfectly honest chart>,
  "verdict": "<clean|minor|major>",
  "summary": "<2-3 sentence overall assessment>",
  "flaws": [
    {
      "name": "<specific flaw name from taxonomy>",
      "category": "<top-level: Misinformation | Uninformativeness | Unsociability>",
      "subcategory": "<e.g. Inaccuracy, Ambiguity, Low Readability, etc.>",
      "severity": "<high|medium|low|info>",
      "explanation": "<detailed explanation of how this flaw manifests in this specific chart>",
      "suggestion": "<actionable fix recommendation>"
    }
  ],
  "positive_aspects": ["<list of things the chart does well>"]
}

Rules:
- Only report flaws you can actually observe in the image. Do not speculate.
- Be specific - reference actual elements, colors, labels, axes you see.
- severity: high = actively misleading/deceptive, medium = meaningfully confusing, low = minor issue, info = nitpick/suggestion.
- verdict: clean = score >= 80 with no high-severity flaws, minor = score 50-79 or has medium flaws, major = score < 50 or has high-severity flaws.
- Always include positive_aspects - even bad charts usually do something right.
- If the image is not a chart/visualization at all, return: {"integrity_score": null, "verdict": "not_a_chart", "summary": "The uploaded image does not appear to be a data visualization or chart.", "flaws": [], "positive_aspects": []}`;
}

function parseAnalysisResponse(text) {
  // Try to extract JSON from the response
  let cleaned = text.trim();

  // Remove markdown code fences if present
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // Try to find JSON object in the text
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error('Could not parse analysis response. The model returned an unexpected format.');
  }
}

// ─── Render results ───
function renderResults(result) {
  resultsPlaceholder.style.display = 'none';
  resultsArea.innerHTML = '';

  // Handle non-chart
  if (result.verdict === 'not_a_chart') {
    resultsArea.innerHTML = `
      <div class="summary-card">
        <h3>Not a Chart</h3>
        <p class="summary-text">${escapeHtml(result.summary)}</p>
      </div>`;
    return;
  }

  // Verdict badge
  const verdictMap = {
    clean: 'Looks Clean',
    minor: 'Minor Issues',
    major: 'Major Issues'
  };
  verdictBadge.textContent = verdictMap[result.verdict] || result.verdict;
  verdictBadge.className = `verdict-badge visible ${result.verdict}`;

  // Issue count
  if (result.flaws && result.flaws.length > 0) {
    const high = result.flaws.filter(f => f.severity === 'high').length;
    const med = result.flaws.filter(f => f.severity === 'medium').length;
    const low = result.flaws.filter(f => f.severity === 'low' || f.severity === 'info').length;
    const parts = [];
    if (high) parts.push(`${high} high`);
    if (med) parts.push(`${med} medium`);
    if (low) parts.push(`${low} low`);
    issueCount.textContent = `${result.flaws.length} issues found (${parts.join(', ')})`;
    issueCount.classList.add('visible');
  }

  // Score + summary card
  const score = result.integrity_score;
  const scoreClass = score >= 75 ? 'good' : score >= 45 ? 'okay' : 'bad';
  const circumference = 2 * Math.PI * 30;
  const offset = circumference - (score / 100) * circumference;

  const summaryHtml = `
    <div class="summary-card">
      <h3>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        Integrity Assessment
      </h3>
      <div class="score-ring-wrap">
        <div class="score-ring">
          <svg width="72" height="72" viewBox="0 0 72 72">
            <circle class="ring-bg" cx="36" cy="36" r="30"/>
            <circle class="ring-fg ${scoreClass}" cx="36" cy="36" r="30"
              stroke-dasharray="${circumference}"
              stroke-dashoffset="${offset}"/>
          </svg>
          <div class="score-label ${scoreClass}">${score}</div>
        </div>
        <div class="score-breakdown">
          Score: <span class="${scoreClass === 'good' ? '' : scoreClass === 'okay' ? '' : ''}">${score}/100</span><br>
          ${result.flaws ? result.flaws.length : 0} flaw${result.flaws?.length !== 1 ? 's' : ''} detected<br>
          Verdict: <span>${verdictMap[result.verdict] || result.verdict}</span>
        </div>
      </div>
      <p class="summary-text">${escapeHtml(result.summary)}</p>
    </div>`;

  resultsArea.innerHTML = summaryHtml;

  // Flaw cards
  if (result.flaws && result.flaws.length > 0) {
    // Sort by severity
    const severityOrder = { high: 0, medium: 1, low: 2, info: 3 };
    result.flaws.sort((a, b) => (severityOrder[a.severity] ?? 4) - (severityOrder[b.severity] ?? 4));

    result.flaws.forEach((flaw, i) => {
      const card = document.createElement('div');
      card.className = 'flaw-card' + (i === 0 ? ' open' : '');
      card.innerHTML = `
        <div class="flaw-card-header">
          <div class="severity-dot ${flaw.severity}"></div>
          <div class="flaw-card-title">
            <h4>${escapeHtml(flaw.name)}</h4>
            <div class="flaw-category">${escapeHtml(flaw.category)} &rsaquo; ${escapeHtml(flaw.subcategory)}</div>
          </div>
          <span class="severity-label ${flaw.severity}">${flaw.severity}</span>
          <svg class="chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="flaw-card-body">
          <div class="explanation">${escapeHtml(flaw.explanation)}</div>
          <div class="suggestion">
            <strong>How to fix</strong><br>
            ${escapeHtml(flaw.suggestion)}
          </div>
        </div>`;

      card.querySelector('.flaw-card-header').addEventListener('click', () => {
        card.classList.toggle('open');
      });

      resultsArea.appendChild(card);
    });
  }

  // Positive aspects
  if (result.positive_aspects && result.positive_aspects.length > 0) {
    const positiveCard = document.createElement('div');
    positiveCard.className = 'summary-card';
    positiveCard.innerHTML = `
      <h3>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--avocado)" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        What This Chart Does Well
      </h3>
      <ul style="list-style: none; padding: 0; margin: 8px 0 0;">
        ${result.positive_aspects.map(p => `
          <li style="padding: 4px 0; font-size: 0.84rem; color: var(--text-secondary); display: flex; align-items: baseline; gap: 8px;">
            <span style="color: var(--avocado); flex-shrink: 0;">+</span>
            ${escapeHtml(p)}
          </li>`).join('')}
      </ul>`;
    resultsArea.appendChild(positiveCard);
  }
}

// ─── Utilities ───
function resetAll() {
  imageBase64 = null;
  imageMediaType = null;
  fileInput.value = '';
  imagePreview.classList.remove('visible');
  previewImg.src = '';
  analyzeBtn.disabled = true;
  clearResults();
}

function clearResults() {
  verdictBadge.className = 'verdict-badge';
  issueCount.className = 'issue-count';
  resultsArea.innerHTML = '';
  resultsPlaceholder.style.display = '';
}

function showError(msg) {
  errorToast.textContent = msg;
  errorToast.classList.add('visible');
  setTimeout(() => errorToast.classList.remove('visible'), 6000);
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
