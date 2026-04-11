// ─────────────────────────────────────────────
//  AutoUsability — three-agent usability pipeline
// ─────────────────────────────────────────────

const MODEL = 'claude-sonnet-4-20250514';
const STORAGE_KEY = 'autousability_api_key';
const MAX_IMAGES = 5;

// ─── State ───
let apiKey = localStorage.getItem(STORAGE_KEY) || '';
let images = []; // [{ name, mediaType, base64, dataUrl }]
let isRunning = false;

// ─── DOM ───
const apiKeyInput  = document.getElementById('apiKey');
const apiDot       = document.getElementById('apiDot');
const saveKeyBtn   = document.getElementById('saveKeyBtn');
const dropZone     = document.getElementById('dropZone');
const fileInput    = document.getElementById('fileInput');
const thumbnails   = document.getElementById('thumbnails');
const focusSelect  = document.getElementById('focus');
const runBtn       = document.getElementById('runBtn');
const outputArea   = document.getElementById('outputArea');
const placeholder  = document.getElementById('placeholder');
const toast        = document.getElementById('toast');

const steps = {
  interviewer: document.getElementById('stepInterviewer'),
  respondent:  document.getElementById('stepRespondent'),
  analyzer:    document.getElementById('stepAnalyzer'),
};

// ─── Init ───
if (apiKey) {
  apiKeyInput.value = maskKey(apiKey);
  apiDot.classList.add('connected');
}
updateRunButton();

// ─── API key handling ───
apiKeyInput.addEventListener('focus', () => {
  if (apiKey && apiKeyInput.value.includes('•')) apiKeyInput.value = '';
});

apiKeyInput.addEventListener('blur', () => {
  if (!apiKeyInput.value && apiKey) apiKeyInput.value = maskKey(apiKey);
});

saveKeyBtn.addEventListener('click', saveKey);
apiKeyInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveKey();
});

function saveKey() {
  const val = apiKeyInput.value.trim();
  if (!val || val.includes('•')) return;
  apiKey = val;
  localStorage.setItem(STORAGE_KEY, apiKey);
  apiKeyInput.value = maskKey(apiKey);
  apiDot.classList.add('connected');
  showToast('API key saved.');
  updateRunButton();
}

function maskKey(key) {
  if (key.length <= 12) return key;
  return key.slice(0, 8) + '••••••••' + key.slice(-4);
}

// ─── File handling ───
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('dragover');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  handleFiles(e.dataTransfer.files);
});
fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

function handleFiles(fileList) {
  const valid = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
  const files = Array.from(fileList).filter((f) => valid.includes(f.type));

  if (!files.length) {
    showToast('Only PNG, JPG, GIF, or WebP images are supported.', true);
    return;
  }

  const remaining = MAX_IMAGES - images.length;
  if (remaining <= 0) {
    showToast(`Maximum ${MAX_IMAGES} screens. Remove one to add more.`, true);
    return;
  }

  files.slice(0, remaining).forEach((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      images.push({
        name: file.name,
        mediaType: file.type,
        base64: dataUrl.split(',')[1],
        dataUrl,
      });
      renderThumbnails();
      updateRunButton();
    };
    reader.readAsDataURL(file);
  });

  fileInput.value = '';
}

function renderThumbnails() {
  thumbnails.innerHTML = '';
  images.forEach((img, i) => {
    const thumb = document.createElement('div');
    thumb.className = 'thumb';
    thumb.innerHTML = `
      <img src="${img.dataUrl}" alt="Screen ${i + 1}" title="${escapeHtml(img.name)}">
      <button class="thumb-remove" title="Remove">&times;</button>
    `;
    thumb.querySelector('.thumb-remove').addEventListener('click', () => {
      images.splice(i, 1);
      renderThumbnails();
      updateRunButton();
    });
    thumbnails.appendChild(thumb);
  });
}

// ─── Run button state ───
function updateRunButton() {
  const ready =
    !!apiKey &&
    images.length > 0 &&
    !isRunning;
  runBtn.disabled = !ready;
}

// ─── Run study ───
runBtn.addEventListener('click', runStudy);

async function runStudy() {
  if (!apiKey) return showToast('Please save your Anthropic API key first.', true);
  if (!images.length) return showToast('Upload at least one prototype screen.', true);

  isRunning = true;
  runBtn.classList.add('loading');
  runBtn.disabled = true;
  runBtn.querySelector('.btn-label').textContent = 'Running study…';

  resetOutput();
  resetSteps();

  const config = {
    focus: focusSelect.value,
  };

  try {
    // Step 1 — Interviewer
    setStepState('interviewer', 'running');
    const interviewResult = await runInterviewer(config);
    renderInterviewer(interviewResult);
    setStepState('interviewer', 'done');

    // Step 2 — Respondent
    setStepState('respondent', 'running');
    const respondentResult = await runRespondent(config, interviewResult);
    renderRespondent(respondentResult);
    setStepState('respondent', 'done');

    // Step 3 — Analyzer
    setStepState('analyzer', 'running');
    const analysis = await runAnalyzer(config, interviewResult, respondentResult);
    renderAnalyzer(analysis);
    setStepState('analyzer', 'done');
  } catch (err) {
    const active = document.querySelector('.pipeline-step.active');
    if (active) setStepState(active.dataset.agent, 'error');
    showToast('Study failed: ' + err.message, true);
    console.error(err);
  } finally {
    isRunning = false;
    runBtn.classList.remove('loading');
    runBtn.querySelector('.btn-label').textContent = 'Run Usability Study';
    updateRunButton();
  }
}

// ─── Step state helpers ───
function resetSteps() {
  Object.values(steps).forEach((el) => {
    el.classList.remove('active', 'done');
    const state = el.querySelector('.step-state');
    state.dataset.state = 'idle';
    state.textContent = 'Idle';
  });
}

function setStepState(agent, state) {
  const el = steps[agent];
  if (!el) return;
  el.classList.remove('active', 'done');
  const stateEl = el.querySelector('.step-state');
  stateEl.dataset.state = state;

  if (state === 'running') {
    el.classList.add('active');
    stateEl.textContent = 'Running';
  } else if (state === 'done') {
    el.classList.add('done');
    stateEl.textContent = 'Done';
  } else if (state === 'error') {
    stateEl.textContent = 'Error';
  } else {
    stateEl.textContent = 'Idle';
  }
}

// ─── Output helpers ───
function resetOutput() {
  placeholder.style.display = 'none';
  outputArea.innerHTML = '';
}

function appendSection(html) {
  const wrap = document.createElement('div');
  wrap.innerHTML = html;
  const section = wrap.firstElementChild;
  outputArea.appendChild(section);
  section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ─────────────────────────────────────────────
//  Agent 1 — Interviewer
// ─────────────────────────────────────────────

const INTERVIEWER_SYSTEM = `You are the Interviewer Agent in an automated usability study pipeline. Your job is to examine an uploaded product prototype (screenshots or Figma exports) and do three things:

1. Briefly summarise what the prototype appears to be.
2. Invent a realistic participant persona who would plausibly use this product — tailored to the study focus. Give them a name, background, goals, tech-savviness, and a temperament. Make them feel like a real person, not a composite.
3. Formulate insightful, specific interview questions this researcher would ask that participant.

Guidelines for questions:
- Ground every question in what is actually visible in the prototype. Reference specific elements, screens, buttons, labels, or flows you can see.
- Ask open-ended questions that elicit think-aloud responses, not yes/no answers.
- Cover a range of concerns appropriate to the study focus: first impressions, navigation clarity, expectations vs. reality, emotional response, friction points, task-completion confidence, mental models.
- Do NOT ask generic questions that could apply to any app ("is it easy to use?"). Each question must be specific enough that it could only have been written after actually seeing this prototype.
- Choose the number of questions yourself — typically between 4 and 8 — based on the depth and breadth the study focus requires. A shallow first-impression study may need only 4; a task-completion study across multiple screens may need 8.

Guidelines for the persona:
- The persona must be plausible for the actual product shown. A children's learning app and an enterprise dashboard need very different participants.
- Include age, occupation/role, relevant experience level, a concrete goal they'd have with this product, and one or two personal quirks that will show up in their responses (impatient, meticulous, nervous around tech, etc.).

Output STRICT JSON (no markdown code fences, no prose around it). Use this exact structure:

{
  "prototype_summary": "<1-2 sentence description of what the prototype appears to be>",
  "participant_persona": "<a rich single-paragraph description of the invented participant — name, age, role, background, goals, temperament, and anything distinctive about how they approach new software>",
  "questions": [
    {
      "id": 1,
      "question": "<the interview question text — phrased as the researcher would speak it to the participant>",
      "goal": "<what insight this question is designed to elicit>",
      "targets": "<which specific screen, element, or flow the question is about>"
    }
  ]
}`;

async function runInterviewer(config) {
  const userText = `Study focus: ${config.focus.replace(/-/g, ' ')}

I am attaching ${images.length} prototype screen${images.length > 1 ? 's' : ''}. Examine ${images.length > 1 ? 'them' : 'it'} carefully, then produce the prototype summary, invented participant persona, and interview questions in the specified JSON format. You decide how many questions are appropriate.`;

  const content = [
    ...imagesAsContent(),
    { type: 'text', text: userText },
  ];

  const text = await callClaude(INTERVIEWER_SYSTEM, content);
  return parseJsonLoose(text);
}

// ─────────────────────────────────────────────
//  Agent 2 — Respondent
// ─────────────────────────────────────────────

const RESPONDENT_SYSTEM = `You are the Respondent Agent in an automated usability study. You simulate a participant experiencing a product prototype for the first time.

You are given:
1. The prototype screens (as images)
2. A participant persona — you must embody this person
3. A set of interview questions from the researcher

Your job is to answer each question as that participant would — with honest, think-aloud commentary based on what you actually see in the prototype. Stay in character throughout.

Guidelines:
- Embody the persona's background, goals, and likely frustrations. Do not break character or speak as an AI.
- Reference specific visual details you actually see in the prototype — colours, icons, layout, wording, button labels. Be concrete.
- Be honest about confusion, delight, hesitation, and irritation. Don't just say positive things, and don't be gratuitously negative either. Real users have opinions.
- Think aloud — share your expectations before checking reality, your hesitations, your emotional reactions.
- Keep each answer to 2–5 sentences. Natural spoken tone, not a polished review.

Output STRICT JSON (no markdown code fences, no prose around it). Use this exact structure:

{
  "participant_intro": "<1-2 sentences the participant says before starting, in character. E.g. 'Okay, so... I've never seen this before. Let me take a look.'>",
  "answers": [
    {
      "id": 1,
      "question": "<the original question text>",
      "response": "<the participant's think-aloud answer in first person, 2-5 sentences>",
      "sentiment": "<one of: positive, neutral, confused, frustrated, delighted>"
    }
  ]
}

Answer every question in the order given.`;

async function runRespondent(config, interviewResult) {
  const questions = interviewResult.questions || [];
  const questionList = questions
    .map((q, i) => `${i + 1}. ${q.question}`)
    .join('\n');

  const userText = `PARTICIPANT PERSONA (you must embody this person):
${interviewResult.participant_persona}

STUDY FOCUS: ${config.focus.replace(/-/g, ' ')}

INTERVIEW QUESTIONS (${questions.length}):
${questionList}

You are attached the prototype screens the participant is looking at. Respond to every question as this participant, in the specified JSON format.`;

  const content = [
    ...imagesAsContent(),
    { type: 'text', text: userText },
  ];

  const text = await callClaude(RESPONDENT_SYSTEM, content);
  return parseJsonLoose(text);
}

// ─────────────────────────────────────────────
//  Agent 3 — Analyzer
// ─────────────────────────────────────────────

const ANALYZER_SYSTEM = `You are the Analyzer Agent — a senior UX researcher — in an automated usability study pipeline. You are given:
1. The prototype (as images)
2. The set of interview questions that were asked
3. The participant's responses
4. The participant's persona

Your job is to synthesize all of this into a concrete, actionable usability report.

Guidelines:
- Identify recurring themes and pain points across the participant's answers.
- Cross-reference what the participant said with what you can see in the prototype. Sometimes the designer's intent is clear but the participant missed it — that's itself a finding.
- Highlight both positive aspects (what works) and issues (what doesn't).
- Provide specific, actionable recommendations. No vague advice.
- Be balanced. A single participant is one data point, so frame findings with appropriate confidence.
- Separate observation (evidence) from interpretation.

Output STRICT JSON (no markdown code fences, no prose around it). Use this exact structure:

{
  "executive_summary": "<3-4 sentence overview of the study's main findings>",
  "overall_score": <number 0-100 representing overall usability health — 80+ is strong, 50-79 has notable issues, under 50 is problematic>,
  "key_findings": [
    {
      "title": "<short finding title>",
      "severity": "<one of: critical, major, minor, positive>",
      "description": "<detailed finding, 1-3 sentences>",
      "evidence": "<direct quote from participant or specific prototype observation>",
      "recommendation": "<actionable fix>"
    }
  ],
  "themes": ["<recurring theme 1>", "<recurring theme 2>"],
  "next_steps": ["<concrete next research or design step>", "<another next step>"]
}

Aim for 4–7 key findings. Themes and next_steps can each have 2–5 items.`;

async function runAnalyzer(config, interviewResult, respondentResult) {
  const qa = respondentResult.answers
    .map((a, i) => `Q${i + 1}: ${a.question}\nA${i + 1} (${a.sentiment}): ${a.response}`)
    .join('\n\n');

  const userText = `PARTICIPANT PERSONA:
${interviewResult.participant_persona}

STUDY FOCUS: ${config.focus.replace(/-/g, ' ')}

PROTOTYPE SUMMARY (from interviewer agent):
${interviewResult.prototype_summary}

PARTICIPANT INTRO:
${respondentResult.participant_intro}

INTERVIEW TRANSCRIPT:
${qa}

You are attached the prototype screens. Synthesize this into a usability report in the specified JSON format.`;

  const content = [
    ...imagesAsContent(),
    { type: 'text', text: userText },
  ];

  const text = await callClaude(ANALYZER_SYSTEM, content);
  return parseJsonLoose(text);
}

// ─────────────────────────────────────────────
//  Claude API call
// ─────────────────────────────────────────────

async function callClaude(system, content) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4096,
      system,
      messages: [{ role: 'user', content }],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `HTTP ${response.status}`);
  }

  const data = await response.json();
  return data.content?.[0]?.text || '';
}

function imagesAsContent() {
  return images.map((img) => ({
    type: 'image',
    source: {
      type: 'base64',
      media_type: img.mediaType,
      data: img.base64,
    },
  }));
}

function parseJsonLoose(text) {
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('Could not parse agent response as JSON.');
  }
}

// ─────────────────────────────────────────────
//  Rendering
// ─────────────────────────────────────────────

function renderInterviewer(result) {
  const questionsHtml = (result.questions || [])
    .map(
      (q, i) => `
    <div class="q-card">
      <div class="q-head">
        <div class="q-num">Q${q.id || i + 1}</div>
        <div class="q-text">${escapeHtml(q.question)}</div>
      </div>
      <div class="q-meta">
        <div><strong>Goal</strong>${escapeHtml(q.goal || '')}</div>
        <div><strong>Target</strong>${escapeHtml(q.targets || '')}</div>
      </div>
    </div>`
    )
    .join('');

  const html = `
    <section class="result-section" data-agent="interviewer">
      <div class="result-head">
        <span class="result-eyebrow">Agent 01 · Interviewer</span>
        <h2>Interview questions</h2>
        <div class="result-meta">${(result.questions || []).length} question${(result.questions || []).length === 1 ? '' : 's'}</div>
      </div>
      ${result.prototype_summary ? `
        <div class="proto-summary">
          <span class="proto-label">Prototype</span>
          <span>${escapeHtml(result.prototype_summary)}</span>
        </div>` : ''}
      ${result.participant_persona ? `
        <div class="proto-summary">
          <span class="proto-label">Persona</span>
          <span>${escapeHtml(result.participant_persona)}</span>
        </div>` : ''}
      ${questionsHtml}
    </section>`;
  appendSection(html);
}

function renderRespondent(result) {
  const answersHtml = (result.answers || [])
    .map(
      (a, i) => `
    <div class="a-card">
      <div class="a-question">
        <span class="q-label">Q${a.id || i + 1}</span>${escapeHtml(a.question)}
      </div>
      <div class="a-response">${escapeHtml(a.response)}</div>
      ${a.sentiment ? `<span class="sentiment-tag ${a.sentiment}">${a.sentiment}</span>` : ''}
    </div>`
    )
    .join('');

  const html = `
    <section class="result-section" data-agent="respondent">
      <div class="result-head">
        <span class="result-eyebrow">Agent 02 · Respondent</span>
        <h2>Participant responses</h2>
        <div class="result-meta">${(result.answers || []).length} answer${(result.answers || []).length === 1 ? '' : 's'}</div>
      </div>
      ${result.participant_intro ? `
        <div class="participant-intro">
          <div class="intro-content">${escapeHtml(result.participant_intro)}</div>
        </div>` : ''}
      ${answersHtml}
    </section>`;
  appendSection(html);
}

function renderAnalyzer(result) {
  const score = Number.isFinite(result.overall_score) ? result.overall_score : 0;
  const circumference = 2 * Math.PI * 48;
  const offset = circumference - (Math.max(0, Math.min(100, score)) / 100) * circumference;

  // Sort findings by severity
  const sevOrder = { critical: 0, major: 1, minor: 2, positive: 3 };
  const findings = [...(result.key_findings || [])].sort(
    (a, b) => (sevOrder[a.severity] ?? 4) - (sevOrder[b.severity] ?? 4)
  );

  const findingsHtml = findings
    .map(
      (f) => `
    <div class="finding-card ${f.severity || 'minor'}">
      <div class="finding-head">
        <h4>${escapeHtml(f.title || '')}</h4>
        <span class="severity-pill ${f.severity || 'minor'}">${f.severity || 'minor'}</span>
      </div>
      <p>${escapeHtml(f.description || '')}</p>
      ${f.evidence ? `<div class="evidence">"${escapeHtml(f.evidence)}"</div>` : ''}
      ${f.recommendation ? `
        <div class="recommendation">
          <strong>Recommendation</strong>
          ${escapeHtml(f.recommendation)}
        </div>` : ''}
    </div>`
    )
    .join('');

  const themesHtml = (result.themes || [])
    .map((t) => `<li>${escapeHtml(t)}</li>`)
    .join('');

  const nextStepsHtml = (result.next_steps || [])
    .map((s) => `<li>${escapeHtml(s)}</li>`)
    .join('');

  const html = `
    <section class="result-section" data-agent="analyzer">
      <div class="result-head">
        <span class="result-eyebrow">Agent 03 · Analyzer</span>
        <h2>Usability report</h2>
        <div class="result-meta">${findings.length} finding${findings.length === 1 ? '' : 's'}</div>
      </div>

      <div class="exec-summary">
        <div class="score-dial">
          <svg viewBox="0 0 110 110">
            <circle class="dial-bg" cx="55" cy="55" r="48"/>
            <circle class="dial-fg" cx="55" cy="55" r="48"
              stroke-dasharray="${circumference}"
              stroke-dashoffset="${offset}"/>
          </svg>
          <div class="score-value">
            <div class="num">${score}</div>
            <div class="label">usability score</div>
          </div>
        </div>
        <div class="exec-text">
          <h3>Executive summary</h3>
          <p>${escapeHtml(result.executive_summary || '')}</p>
        </div>
      </div>

      <div class="findings-grid">
        ${findingsHtml}
      </div>

      <div class="analysis-lists">
        ${themesHtml ? `
          <div class="list-card">
            <h4>Recurring themes</h4>
            <ul>${themesHtml}</ul>
          </div>` : ''}
        ${nextStepsHtml ? `
          <div class="list-card">
            <h4>Next steps</h4>
            <ul>${nextStepsHtml}</ul>
          </div>` : ''}
      </div>
    </section>`;
  appendSection(html);
}

// ─── Utilities ───
function showToast(msg, isError = false) {
  toast.textContent = msg;
  toast.classList.toggle('error', isError);
  toast.classList.add('visible');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove('visible'), 4000);
}

function escapeHtml(str) {
  if (str == null) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}
