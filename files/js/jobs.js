/* ============================================================
   RecruitIQ — Jobs Page JS (04-jobs)
   ============================================================ */

/* ── Skill Pills ── */
const skillsStore = new Set(['React', 'TypeScript', 'Node.js']);

function addSkill() {
  const input = document.getElementById('skillInput');
  const val   = input?.value.trim();
  if (!val) return;
  if (skillsStore.has(val)) { Toast.warning(`"${val}" is already added.`); return; }
  skillsStore.add(val);
  renderSkills();
  input.value = '';
  input.focus();
}

function removeSkill(skill) {
  skillsStore.delete(skill);
  renderSkills();
}

function renderSkills() {
  const list = document.getElementById('skillsList');
  if (!list) return;
  list.innerHTML = [...skillsStore].map(s => `
    <span class="skill-pill">
      ${s}
      <span class="remove" onclick="removeSkill('${s}')">×</span>
    </span>
  `).join('');
}

/* ── Filter Chips ── */
let activeFilter = 'all';

function setFilter(filter, el) {
  activeFilter = filter;
  document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  el?.classList.add('active');
  filterJobs();
}

function filterJobs() {
  document.querySelectorAll('.job-card[data-status]').forEach(card => {
    const status = card.dataset.status;
    const matches = activeFilter === 'all' || status === activeFilter;
    card.style.display = matches ? '' : 'none';
  });
}

/* ── Search ── */
function searchJobs(query) {
  const q = query.toLowerCase();
  document.querySelectorAll('.job-card[data-status]').forEach(card => {
    const title = card.querySelector('.job-title')?.textContent.toLowerCase() || '';
    const dept  = card.querySelector('.job-dept-tag')?.textContent.toLowerCase() || '';
    card.style.display = (title.includes(q) || dept.includes(q)) ? '' : 'none';
  });
}

/* ── Modal ── */
function openModal()  { Modal.open('createJobModal'); }
function closeModal() { Modal.close('createJobModal'); }

/* ── Form Submit ── */
async function saveJob() {
  const title    = document.getElementById('jobTitle')?.value.trim();
  const dept     = document.getElementById('jobDept')?.value;
  const type     = document.getElementById('jobType')?.value;
  const location = document.getElementById('jobLocation')?.value;
  const desc     = document.getElementById('jobDesc')?.value.trim();

  if (!title)    { Toast.error('Job title is required.');      return; }
  if (!dept)     { Toast.error('Please select a department.'); return; }
  if (!desc)     { Toast.error('Job description is required.'); return; }
  if (skillsStore.size === 0) { Toast.warning('Add at least one required skill.'); return; }

  const payload = {
    title, department: dept, employment_type: type,
    location_type: location,
    description: desc,
    required_skills: [...skillsStore],
    min_experience: parseInt(document.getElementById('minExp')?.value || 0),
    salary_range: document.getElementById('salaryRange')?.value,
  };

  // Show loading state
  const saveBtn = document.getElementById('saveJobBtn');
  if (saveBtn) { saveBtn.textContent = 'Saving...'; saveBtn.disabled = true; }

  try {
    // const data = await API.post('/jobs', payload);
    // Simulate API call
    await new Promise(r => setTimeout(r, 900));

    Toast.success('Job created! Redirecting to upload resumes...');
    closeModal();
    setTimeout(() => window.location.href = '05-upload.html', 1200);
  } catch (err) {
    Toast.error(err.message || 'Failed to create job.');
  } finally {
    if (saveBtn) { saveBtn.textContent = 'Save & Upload Resumes →'; saveBtn.disabled = false; }
  }
}

/* ── Delete Job ── */
async function deleteJob(jobId, el) {
  if (!confirm('Delete this job? This action cannot be undone.')) return;
  try {
    // await API.delete('/jobs/' + jobId);
    el.closest('.job-card')?.remove();
    Toast.success('Job deleted.');
  } catch (err) {
    Toast.error('Failed to delete job.');
  }
}

/* ── Init ── */
document.addEventListener('DOMContentLoaded', () => {

  /* Close modal on overlay click */
  Modal.closeOnOverlay('createJobModal');

  /* Skill input — Enter key */
  document.getElementById('skillInput')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); addSkill(); }
  });

  /* Search input */
  document.getElementById('jobSearch')?.addEventListener('input', e => searchJobs(e.target.value));

  /* Filter chips */
  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', function() {
      setFilter(this.dataset.filter || 'all', this);
    });
  });

  /* Render initial skills */
  renderSkills();

});
