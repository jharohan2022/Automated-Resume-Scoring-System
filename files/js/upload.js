/* ============================================================
   RecruitIQ — Upload Page JS (05-upload)
   ============================================================ */

/* ── State ── */
let uploadedFiles = [];
const MAX_FILES = 50;
const MAX_MB    = 25;
const ALLOWED   = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const ALLOWED_EXT = ['.pdf', '.docx'];

/* ── Drag & Drop ── */
function onDragOver(e) {
  e.preventDefault();
  document.getElementById('dropZone')?.classList.add('dragover');
}
function onDragLeave(e) {
  document.getElementById('dropZone')?.classList.remove('dragover');
}
function onDrop(e) {
  e.preventDefault();
  document.getElementById('dropZone')?.classList.remove('dragover');
  handleFiles(Array.from(e.dataTransfer.files));
}

/* ── File Input ── */
function triggerFilePicker() {
  document.getElementById('fileInput')?.click();
}
function onFileInputChange(e) {
  handleFiles(Array.from(e.target.files));
  e.target.value = ''; // Reset so same file can be re-added after removal
}

/* ── Handle Files ── */
function handleFiles(files) {
  const errors = [];

  files.forEach(file => {
    // Check count
    if (uploadedFiles.length >= MAX_FILES) {
      errors.push(`Max ${MAX_FILES} files allowed.`);
      return;
    }
    // Check type
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) {
      errors.push(`"${file.name}" — only PDF and DOCX files are accepted.`);
      return;
    }
    // Check size
    if (file.size > MAX_MB * 1024 * 1024) {
      errors.push(`"${file.name}" exceeds the ${MAX_MB}MB limit.`);
      return;
    }
    // Check duplicate
    if (uploadedFiles.find(f => f.name === file.name && f.size === file.size)) {
      errors.push(`"${file.name}" is already added.`);
      return;
    }

    uploadedFiles.push({
      id:       Date.now() + Math.random(),
      file:     file,
      name:     file.name,
      size:     Format.fileSize(file.size),
      type:     ext === '.pdf' ? 'pdf' : 'doc',
      progress: 0,
      done:     false,
    });
  });

  if (errors.length) Toast.warning(errors[0]); // Show first error

  renderFileList();
  simulateUploadProgress();
}

/* ── Render File List ── */
function renderFileList() {
  const section = document.getElementById('fileSection');
  const panel   = document.getElementById('analyzePanel');
  const list    = document.getElementById('fileList');
  const count   = document.getElementById('fileCount');
  const aCount  = document.getElementById('analyzeCount');

  if (uploadedFiles.length === 0) {
    section?.setAttribute('style', 'display:none');
    panel?.setAttribute('style', 'display:none');
    return;
  }

  section?.removeAttribute('style');
  panel?.setAttribute('style', 'display:flex');
  if (count)  count.textContent = ` — ${uploadedFiles.length} file${uploadedFiles.length !== 1 ? 's' : ''}`;
  if (aCount) aCount.textContent = `${uploadedFiles.length} files ready`;

  if (!list) return;
  list.innerHTML = uploadedFiles.map(f => `
    <div class="file-item ${f.done ? 'done' : ''}" id="fi-${f.id}">
      <div class="file-type ${f.type === 'pdf' ? 'type-pdf' : 'type-doc'}">${f.type === 'pdf' ? '📄' : '📝'}</div>
      <div style="flex:1">
        <div class="file-name">${f.name}</div>
        <div class="file-size">${f.size}</div>
      </div>
      <div class="file-progress-wrap" style="width:180px;flex-shrink:0">
        <div class="progress-wrap" style="margin-bottom:3px">
          <div class="progress-fill" style="width:${f.progress}%;background:${f.done ? 'var(--accent)' : 'var(--accent2)'}"></div>
        </div>
        <div class="file-pct">${f.progress}%</div>
      </div>
      <div style="flex-shrink:0;font-size:18px">${f.done ? '<span style="color:var(--accent)">✓</span>' : '<span style="color:var(--muted);font-size:12px">Queued</span>'}</div>
      <button class="file-remove" onclick="removeFile('${f.id}')">✕</button>
    </div>
  `).join('');
}

/* ── Remove File ── */
function removeFile(id) {
  uploadedFiles = uploadedFiles.filter(f => String(f.id) !== String(id));
  renderFileList();
}

/* ── Clear All ── */
function clearFiles() {
  uploadedFiles = [];
  renderFileList();
}

/* ── Simulate Upload Progress ── */
function simulateUploadProgress() {
  uploadedFiles.forEach(f => {
    if (f.done) return;
    const interval = setInterval(() => {
      f.progress = Math.min(f.progress + Math.floor(Math.random() * 20 + 10), 100);
      if (f.progress >= 100) { f.progress = 100; f.done = true; clearInterval(interval); }
      // Update just this file's progress bar
      const el = document.getElementById('fi-' + f.id);
      if (el) {
        const fill  = el.querySelector('.progress-fill');
        const pct   = el.querySelector('.file-pct');
        const stat  = el.querySelectorAll('div')[3];
        if (fill) fill.style.width = f.progress + '%';
        if (pct)  pct.textContent  = f.progress + '%';
        if (stat && f.done) stat.innerHTML = '<span style="color:var(--accent)">✓</span>';
        if (f.done) el.classList.add('done');
      }
    }, 150 + Math.random() * 200);
  });
}

/* ── Start Analysis ── */
async function startAnalysis() {
  const ready = uploadedFiles.filter(f => f.done);
  if (ready.length === 0) {
    Toast.warning('Please wait for files to finish uploading.');
    return;
  }

  const overlay = document.getElementById('analyzingOverlay');
  overlay?.classList.add('show');

  const steps = [
    { id: 'as1', label: 'Parsing resume content...', pct: 20 },
    { id: 'as2', label: 'Running BERT semantic matching...', pct: 45 },
    { id: 'as3', label: 'Calculating ATS scores...', pct: 65 },
    { id: 'as4', label: 'Generating skill gap analysis...', pct: 84 },
    { id: 'as5', label: 'Ranking candidates...', pct: 96 },
  ];

  const bar    = document.getElementById('analyzingBar');
  const status = document.getElementById('analyzingStatus');
  let idx = 0;

  /* In real app: POST /analysis with job_id + file IDs */
  // const result = await API.post('/analysis', { job_id: selectedJobId, resume_ids: ready.map(f => f.serverFileId) });

  function runStep() {
    if (idx >= steps.length) {
      if (bar)    bar.style.width = '100%';
      if (status) status.textContent = 'Analysis complete!';
      setTimeout(() => window.location.href = '06-results.html', 700);
      return;
    }
    const s = steps[idx];
    if (bar)    bar.style.width = s.pct + '%';
    if (status) status.textContent = s.label;

    // Mark previous done
    if (idx > 0) {
      const prev = document.getElementById(steps[idx-1].id);
      if (prev) { prev.classList.remove('active'); prev.classList.add('done'); }
    }
    const cur = document.getElementById(s.id);
    if (cur) cur.classList.add('active');

    idx++;
    setTimeout(runStep, 900 + Math.random() * 300);
  }

  setTimeout(runStep, 400);
}

/* ── Init ── */
document.addEventListener('DOMContentLoaded', () => {

  // Load demo files after a short delay (simulates auto-detection)
  setTimeout(() => {
    const demo = [
      { id: 1, name: 'sarah_chen_resume.pdf',     size: '124 KB', type: 'pdf', progress: 100, done: true },
      { id: 2, name: 'james_park_cv.pdf',          size: '98 KB',  type: 'pdf', progress: 100, done: true },
      { id: 3, name: 'maria_lopez_resume.docx',    size: '87 KB',  type: 'doc', progress: 100, done: true },
      { id: 4, name: 'david_kim_portfolio.pdf',    size: '2.1 MB', type: 'pdf', progress: 65,  done: false },
      { id: 5, name: 'lisa_wang_cv.docx',          size: '112 KB', type: 'doc', progress: 40,  done: false },
      { id: 6, name: 'alex_rodriguez_resume.pdf',  size: '156 KB', type: 'pdf', progress: 0,   done: false },
    ];
    uploadedFiles = demo;
    renderFileList();
    setTimeout(simulateUploadProgress, 300);
  }, 600);

});
