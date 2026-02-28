/* ============================================================
   RecruitIQ — Analytics Page JS (07-analytics)
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  initAllCharts();
  animateSummaryStats();

  // Period filter buttons
  document.querySelectorAll('.period-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      loadAnalyticsData(this.dataset.period || '30d');
    });
  });
});

/* ── Summary Stats ── */
function animateSummaryStats() {
  const stats = {
    'sum-resumes': 1247,
    'sum-jobs':    38,
    'sum-match':   71.4,
    'sum-short':   94,
    'sum-time':    4.2,
  };
  Object.entries(stats).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) animateCounter(el, val, 1400);
  });
}

/* ── Load Analytics Data (simulated) ── */
function loadAnalyticsData(period) {
  Toast.info(`Loading ${period} analytics data...`);
  // In real app: const data = await API.get('/analytics?period=' + period);
  // Then re-render charts with new data
}

/* ── Init All Charts ── */
function initAllCharts() {
  initMainTrendChart();
  initDistributionChart();
}

/* ── Main Trend Chart (Dual axis) ── */
function initMainTrendChart() {
  const ctx = document.getElementById('mainChart');
  if (!ctx) return;

  const labels = generateDateLabels(30);
  const resumeData = labels.map(() => Math.floor(20 + Math.random() * 80));
  const matchData  = labels.map(() => parseFloat((65 + Math.random() * 15).toFixed(1)));

  new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Resumes Analyzed',
          data: resumeData,
          borderColor: '#6ee7b7',
          backgroundColor: 'rgba(110,231,183,0.07)',
          tension: 0.4, fill: true,
          pointRadius: 2, pointBackgroundColor: '#6ee7b7',
          yAxisID: 'y',
        },
        {
          label: 'Avg Match %',
          data: matchData,
          borderColor: '#818cf8',
          backgroundColor: 'transparent',
          tension: 0.4, fill: false,
          pointRadius: 2, pointBackgroundColor: '#818cf8',
          yAxisID: 'y1',
        },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      scales: {
        x:  { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b', font: { family: 'DM Sans', size: 10 }, maxTicksLimit: 10 } },
        y:  { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#6ee7b7', font: { family: 'DM Sans', size: 10 } }, position: 'left' },
        y1: { grid: { drawOnChartArea: false },           ticks: { color: '#818cf8', font: { family: 'DM Sans', size: 10 }, callback: v => v + '%' }, position: 'right' },
      },
      plugins: {
        legend: { labels: { color: '#64748b', font: { family: 'DM Sans', size: 11 }, boxWidth: 10 } },
        tooltip: { backgroundColor: '#16162a', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1, titleColor: '#e2e8f0', bodyColor: '#94a3b8' },
      },
    },
  });
}

/* ── Score Distribution Chart ── */
function initDistributionChart() {
  const ctx = document.getElementById('distChart');
  if (!ctx) return;

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['0–20%', '21–40%', '41–60%', '61–80%', '81–100%'],
      datasets: [{
        data: [38, 89, 312, 524, 284],
        backgroundColor: [
          'rgba(244,114,182,0.65)',
          'rgba(251,191,36,0.55)',
          'rgba(129,140,248,0.55)',
          'rgba(129,140,248,0.75)',
          'rgba(110,231,183,0.80)',
        ],
        borderRadius: 7,
        borderSkipped: false,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { backgroundColor: '#16162a', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1, titleColor: '#e2e8f0', bodyColor: '#94a3b8' },
      },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b', font: { family: 'DM Sans', size: 10 } } },
        y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b', font: { family: 'DM Sans', size: 10 } } },
      },
    },
  });
}

/* ── Export Report ── */
function exportReport() {
  Toast.info('Generating analytics report PDF...');
  setTimeout(() => Toast.success('Report downloaded!'), 2200);
}

/* ── Helper: Generate Date Labels ── */
function generateDateLabels(days) {
  const labels = [];
  for (let i = days; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    labels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
  }
  return labels;
}
