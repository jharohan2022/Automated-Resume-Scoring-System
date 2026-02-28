/* ============================================================
   RecruitIQ — Analysis Results JS (06-results)
   ============================================================ */

/* ── Demo candidate data ── */
const candidates = [
  { id: 1,  name: 'Sarah Chen',       initials: 'SC', title: 'Senior Frontend Dev',  exp: 5, match: 94, ats: 91, skills: ['React','TypeScript','Node.js','GraphQL','CSS'], missing: ['Jest','Kubernetes'], questions: [ 'Describe a large-scale React app you architected. What patterns did you apply?', 'Walk us through a challenging GraphQL schema design you solved.', 'How do you approach test coverage? (We noticed limited Jest experience on your CV)', 'How would you mentor juniors on TypeScript best practices?' ] },
  { id: 2,  name: 'James Park',       initials: 'JP', title: 'Full Stack Engineer',   exp: 6, match: 87, ats: 84, skills: ['Vue.js','Python','SQL','Docker','REST API'],    missing: ['TypeScript','GraphQL'], questions: [ 'How does Vue\'s reactivity differ from React? When would you choose Vue?', 'Describe a complex SQL query or schema you designed.', 'How comfortable are you switching to TypeScript? Any experience?', 'Tell us about a Docker deployment that went wrong and how you fixed it.' ] },
  { id: 3,  name: 'Maria Lopez',      initials: 'ML', title: 'Frontend Engineer',     exp: 4, match: 79, ats: 76, skills: ['Angular','Java','AWS','CSS','HTML'],             missing: ['React','TypeScript','Node.js'], questions: [ 'You\'ve worked with Angular — how quickly could you onboard onto React?', 'Tell us about a frontend performance problem you diagnosed and fixed.', 'How do you handle state management in large Angular applications?', 'What\'s your experience with cloud deployments on AWS?' ] },
  { id: 4,  name: 'David Kim',        initials: 'DK', title: 'React Developer',        exp: 3, match: 71, ats: 68, skills: ['React','CSS','HTML','JavaScript'],              missing: ['TypeScript','Node.js','GraphQL','Jest'], questions: [ 'You have React experience but limited TypeScript — tell us how you\'d ramp up.', 'Describe your process for making a React component reusable.', 'Have you worked with any backend or API integration? Walk us through an example.', ] },
  { id: 5,  name: 'Lisa Wang',        initials: 'LW', title: 'UI Engineer',            exp: 2, match: 63, ats: 61, skills: ['HTML','CSS','JavaScript','Figma'],              missing: ['React','TypeScript','Node.js','GraphQL','Jest'], questions: [ 'You have strong design skills — how did you transition into engineering?', 'What JavaScript frameworks have you explored outside of work?', 'Tell us about a UI you built from scratch that you\'re proud of.' ] },
  { id: 6,  name: 'Alex Rodriguez',   initials: 'AR', title: 'Software Engineer',      exp: 4, match: 58, ats: 55, skills: ['Java','Spring Boot','SQL'],                    missing: ['React','TypeScript','Node.js','GraphQL','CSS'], questions: [ 'You have strong backend experience — what frontend work have you done?', 'Why are you interested in a frontend-focused role?', 'How would you approach learning React and TypeScript in your first 30 days?' ] },
];

/* ── Render ranked table ── */
function renderTable(data = candidates) {
  const tbody = document.getElementById('resultsTableBody');
  if (!tbody) return;

  tbody.innerHTML = data.map((c, i) => `
    <div class="rt-row ${i < 3 ? 'top-row' : ''}" onclick="openDrawer(${c.id})">
      <div class="r-rank ${i === 0 ? 'gold' : ''}">#${i+1}</div>
      <div>
        <div class="r-name">${c.name}</div>
        <div class="r-sub">${c.title}</div>
      </div>
      <div class="r-exp">${c.exp} yrs</div>
      <div class="r-score">
        <div class="r-pct" style="color:${scoreColor(c.match)}">${c.match}%</div>
        <div class="r-bar"><div class="r-fill" style="width:${c.match}%;background:${scoreColor(c.match)}"></div></div>
      </div>
      <div class="r-ats" style="color:${scoreColor(c.ats)}">${c.ats}</div>
      <div class="r-skills">${c.skills.slice(0,2).map(s => `<span class="r-skill">${s}</span>`).join('')}${c.skills.length > 2 ? `<span class="r-skill">+${c.skills.length-2}</span>` : ''}</div>
      <div><button class="r-btn p" onclick="event.stopPropagation();openDrawer(${c.id})">View</button></div>
    </div>
  `).join('');
}

/* ── Render top 3 podium ── */
function renderTop3() {
  const rankClasses = ['rank1','rank2','rank3'];
  const badgeClasses = ['rb1','rb2','rb3'];
  candidates.slice(0,3).forEach((c, i) => {
    const card = document.getElementById('topCard' + (i+1));
    if (!card) return;
    card.className = `top-card ${rankClasses[i]}`;
    card.onclick = () => openDrawer(c.id);
    card.innerHTML = `
      <div class="rank-badge ${badgeClasses[i]}">${i+1}</div>
      <div class="c-avatar">${c.initials}</div>
      <div class="c-name">${c.name}</div>
      <div class="c-title">${c.title} · ${c.exp} yrs</div>
      <div class="score-big" style="color:${scoreColor(c.match)}">${c.match}%</div>
      <div class="score-lbl">Match Score</div>
      <div class="mini-stats">
        <div class="mini-stat"><strong>${c.exp} yrs</strong><span>Experience</span></div>
        <div class="mini-stat"><strong>${c.ats}</strong><span>ATS Score</span></div>
        <div class="mini-stat"><strong>${c.skills.length}/${c.skills.length + c.missing.length}</strong><span>Skills</span></div>
      </div>
      <div class="skill-tags">${c.skills.slice(0,4).map(s => `<span class="skill-tag">${s}</span>`).join('')}</div>
      <div class="top-card-actions">
        <button class="tc-btn" onclick="event.stopPropagation()">❓ Questions</button>
        <button class="tc-btn primary" onclick="event.stopPropagation()">★ Shortlist</button>
      </div>
    `;
  });
}

/* ── Open Drawer ── */
function openDrawer(candidateId) {
  const c = candidates.find(x => x.id === candidateId);
  if (!c) return;

  document.getElementById('dAvatar').textContent = c.initials;
  document.getElementById('dName').textContent   = c.name;
  document.getElementById('dMeta').textContent   = `${c.title} · ${c.exp} yrs exp`;
  document.getElementById('dMatch').textContent  = c.match + '%';
  document.getElementById('dMatch').style.color  = scoreColor(c.match);
  document.getElementById('dAts').textContent    = c.ats;

  // Skills grid
  const grid = document.getElementById('dSkillGrid');
  if (grid) {
    grid.innerHTML = [
      ...c.skills.map(s => `<span class="d-skill present">${s}</span>`),
      ...c.missing.map(s => `<span class="d-skill missing">${s}</span>`),
    ].join('');
  }

  // Interview questions
  const qlist = document.getElementById('dQuestions');
  if (qlist) {
    qlist.innerHTML = c.questions.map(q => `<div class="q-item">${q}</div>`).join('');
  }

  Drawer.open('drawer');
}

function closeDrawer() { Drawer.close('drawer'); }

/* ── Filter Candidates ── */
function filterCandidates(type) {
  let filtered = [...candidates];
  if (type === '80plus')  filtered = candidates.filter(c => c.match >= 80);
  if (type === '5years')  filtered = candidates.filter(c => c.exp >= 5);
  if (type === 'highats') filtered = candidates.filter(c => c.ats >= 80);
  renderTable(filtered);
}

/* ── Sort Candidates ── */
function sortCandidates(by) {
  const sorted = [...candidates].sort((a,b) => {
    if (by === 'match') return b.match - a.match;
    if (by === 'exp')   return b.exp - a.exp;
    if (by === 'ats')   return b.ats - a.ats;
    return 0;
  });
  renderTable(sorted);
}

/* ── Search Candidates ── */
function searchCandidates(query) {
  const q = query.toLowerCase();
  const filtered = candidates.filter(c =>
    c.name.toLowerCase().includes(q) ||
    c.title.toLowerCase().includes(q) ||
    c.skills.some(s => s.toLowerCase().includes(q))
  );
  renderTable(filtered);
}

/* ── Radar Chart ── */
function initRadarChart() {
  const ctx = document.getElementById('radarChart');
  if (!ctx) return;
  new Chart(ctx, {
    type: 'radar',
    data: {
      labels: ['React/Vue','TypeScript','Node.js','GraphQL','Testing','CSS/UI'],
      datasets: [
        {
          label: 'Required',
          data: [100, 100, 80, 70, 90, 80],
          borderColor: 'rgba(110,231,183,0.7)',
          backgroundColor: 'rgba(110,231,183,0.09)',
          pointBackgroundColor: '#6ee7b7', pointRadius: 4,
        },
        {
          label: 'Avg. Candidate',
          data: [88, 74, 61, 28, 42, 84],
          borderColor: 'rgba(129,140,248,0.7)',
          backgroundColor: 'rgba(129,140,248,0.08)',
          pointBackgroundColor: '#818cf8', pointRadius: 4,
        },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: {
        r: {
          grid:        { color: 'rgba(255,255,255,0.06)' },
          angleLines:  { color: 'rgba(255,255,255,0.05)' },
          pointLabels: { color: '#94a3b8', font: { family: 'DM Sans', size: 11 } },
          ticks:       { display: false },
          suggestedMin: 0, suggestedMax: 100,
        },
      },
      plugins: {
        legend: { labels: { color: '#64748b', font: { family: 'DM Sans', size: 11 }, boxWidth: 9 } },
      },
    },
  });
}

/* ── Export ── */
function exportCSV() {
  const rows = [
    ['Rank','Name','Title','Experience','Match %','ATS Score','Skills'],
    ...candidates.map((c,i) => [i+1, c.name, c.title, c.exp + ' yrs', c.match + '%', c.ats, c.skills.join(' | ')]),
  ];
  const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = 'recruitiq-results.csv';
  a.click();
  Toast.success('CSV exported successfully!');
}

/* ── Init ── */
document.addEventListener('DOMContentLoaded', () => {
  renderTop3();
  renderTable();
  initRadarChart();

  // Filter chip clicks
  document.querySelectorAll('.f-chip').forEach(chip => {
    chip.addEventListener('click', function() {
      document.querySelectorAll('.f-chip').forEach(c => c.classList.remove('active'));
      this.classList.add('active');
      filterCandidates(this.dataset.filter || 'all');
    });
  });

  // Candidate search
  document.getElementById('candidateSearch')?.addEventListener('input', e => searchCandidates(e.target.value));

  // Close drawer on overlay click
  document.getElementById('drawer-overlay')?.addEventListener('click', closeDrawer);
});
