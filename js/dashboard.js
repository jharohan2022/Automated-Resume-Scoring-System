/* ============================================================
   RecruitIQ — Dashboard Page JS (03-dashboard)
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* ── Load Dashboard Data ── */
  loadDashboardStats();
  initCharts();
  loadRecentJobs();
  loadTopCandidates();

  /* ── Quick Action Buttons ── */
  document.querySelectorAll('.quick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const href = btn.getAttribute('href');
      if (href) window.location.href = href;
    });
  });

});

/* ── Stats (real app: fetch from API) ── */
async function loadDashboardStats() {
  // Demo data — replace with: const data = await API.get('/dashboard/stats');
  const stats = {
    todayAnalyses: 47,
    activeJobs:    12,
    avgMatch:      72,
    hireRate:      8.3,
  };

  const map = {
    'stat-today':    stats.todayAnalyses,
    'stat-jobs':     stats.activeJobs,
    'stat-match':    stats.avgMatch,
    'stat-hire':     stats.hireRate,
  };

  Object.entries(map).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) animateCounter(el, val, 1200);
  });
}

/* ── Charts ── */
function initCharts() {
  initLineChart();
  initBarChart();
  initDoughnutChart();
}

function initLineChart() {
  const ctx = document.getElementById('lineChart');
  if (!ctx) return;
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      datasets: [{
        data: [23, 41, 18, 55, 32, 47, 38],
        borderColor: '#6ee7b7',
        backgroundColor: 'rgba(110,231,183,0.08)',
        tension: 0.4, fill: true,
        pointRadius: 3, pointBackgroundColor: '#6ee7b7',
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, ...ChartDefaults.plugins() },
      scales:  ChartDefaults.scales(),
    },
  });
}

function initBarChart() {
  const ctx = document.getElementById('barChart');
  if (!ctx) return;
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['0–20', '21–40', '41–60', '61–80', '81–100'],
      datasets: [{
        data: [5, 12, 28, 41, 24],
        backgroundColor: ['#f472b6','#f472b6','#818cf8','#818cf8','#6ee7b7'],
        borderRadius: 5,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales:  ChartDefaults.scales(),
    },
  });
}

function initDoughnutChart() {
  const ctx = document.getElementById('doughChart');
  if (!ctx) return;
  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Python', 'React', 'SQL', 'TypeScript', 'AWS', 'Other'],
      datasets: [{
        data: [28, 24, 19, 15, 10, 4],
        backgroundColor: ['#6ee7b7','#818cf8','#f472b6','#fbbf24','#34d399','#64748b'],
        borderWidth: 0,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: { labels: { color: '#64748b', font: { family: 'DM Sans', size: 10 }, padding: 7, boxWidth: 9 } },
      },
    },
  });
}

/* ── Recent Jobs ── */
async function loadRecentJobs() {
  // Demo — replace with: const jobs = await API.get('/jobs?limit=5');
  const jobs = [
    { title: 'Senior Frontend Engineer', dept: 'Engineering · Remote', status: 'open',     resumes: 34, top: 94 },
    { title: 'Product Manager',          dept: 'Product · Hybrid',     status: 'open',     resumes: 28, top: 88 },
    { title: 'Data Scientist',           dept: 'Data · On-site',       status: 'reviewing',resumes: 52, top: 91 },
    { title: 'UX Designer',              dept: 'Design · Remote',       status: 'open',     resumes: 19, top: 79 },
    { title: 'DevOps Engineer',          dept: 'Infrastructure · Remote',status:'closed',   resumes: 41, top: 85 },
  ];

  const tbody = document.getElementById('jobsTable');
  if (!tbody) return;

  tbody.innerHTML = jobs.map(j => `
    <div class="job-row" onclick="location.href='06-results.html'">
      <div>
        <div class="job-name">${j.title}</div>
        <div class="job-dept">${j.dept}</div>
      </div>
      <div><span class="badge badge-${j.status}">${j.status.charAt(0).toUpperCase() + j.status.slice(1)}</span></div>
      <div class="job-count">${j.resumes}</div>
      <div class="job-score">${j.top}%</div>
      <div>
        <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation()">
          ${j.status === 'closed' ? 'Archive' : 'Results'}
        </button>
      </div>
    </div>
  `).join('');
}

/* ── Top Candidates ── */
async function loadTopCandidates() {
  // Demo — replace with: const data = await API.get('/candidates/top?limit=3');
  const candidates = [
    { name: 'Sarah Chen',  initials: 'SC', score: 94, job: 'Senior Frontend Engineer', color: 'var(--accent)' },
    { name: 'James Park',  initials: 'JP', score: 88, job: 'Product Manager',          color: 'var(--accent2)' },
    { name: 'Maria Lopez', initials: 'ML', score: 85, job: 'Data Scientist',            color: 'var(--accent3)' },
  ];

  const list = document.getElementById('candidateList');
  if (!list) return;

  list.innerHTML = candidates.map(c => `
    <div class="analysis-item">
      <div class="user-avatar" style="background:${c.color}">${c.initials}</div>
      <div style="flex:1">
        <div style="font-size:14px;font-weight:600">${c.name}</div>
        <div style="font-size:12px;color:var(--muted)">${c.job}</div>
      </div>
      <div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:${c.color}">${c.score}%</div>
      <div class="progress-wrap" style="width:80px;margin-left:12px">
        <div class="progress-fill" style="width:${c.score}%;background:${c.color}"></div>
      </div>
    </div>
  `).join('');
}
