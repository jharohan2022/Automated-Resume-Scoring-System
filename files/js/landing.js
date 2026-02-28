/* ============================================================
   RecruitIQ — Landing Page JS (01-landing)
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* ── Scroll Nav ── */
  initScrollNav('.nav');

  /* ── Typing Hero ── */
  const typer = document.getElementById('hero-typer');
  if (typer) {
    typewriter(typer, [
      'Analyze 100+ resumes in seconds.',
      'Find your best candidate instantly.',
      'Rank talent with AI precision.',
      'Shortlist faster than ever before.',
    ], 60, 2400);
  }

  /* ── Animate stat counters on scroll ── */
  const statNums = document.querySelectorAll('.stat-num[data-count]');
  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el  = entry.target;
        const val = parseInt(el.dataset.count);
        animateCounter(el, val, 1800);
        counterObserver.unobserve(el);
      }
    });
  }, { threshold: 0.5 });
  statNums.forEach(el => counterObserver.observe(el));

  /* ── Animate feature cards on scroll ── */
  observeElements('.feat-card', 'fade-in');

  /* ── CTA Email form ── */
  const ctaForm = document.getElementById('ctaForm');
  if (ctaForm) {
    ctaForm.addEventListener('submit', e => {
      e.preventDefault();
      const email = ctaForm.querySelector('input[type="email"]').value.trim();
      if (!email || !email.includes('@')) {
        Toast.error('Please enter a valid email address.');
        return;
      }
      Toast.success('🎉 You\'re on the list! Check your inbox soon.');
      ctaForm.reset();
    });
  }

  /* ── Smooth scroll for anchor links ── */
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      const target = document.querySelector(a.getAttribute('href'));
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  /* ── Mobile nav toggle ── */
  const mobileToggle = document.getElementById('mobileNavToggle');
  const navLinks     = document.getElementById('navLinks');
  if (mobileToggle && navLinks) {
    mobileToggle.addEventListener('click', () => navLinks.classList.toggle('open'));
  }

  /* ── Pricing toggle (Monthly / Annual) ── */
  const billingToggle = document.getElementById('billingToggle');
  if (billingToggle) {
    const prices = {
      monthly:  ['$0', '$49', '$199'],
      annually: ['$0', '$39', '$159'],
    };
    billingToggle.addEventListener('change', () => {
      const mode = billingToggle.checked ? 'annually' : 'monthly';
      document.querySelectorAll('.price-amount[data-plan]').forEach((el, i) => {
        el.innerHTML = prices[mode][i] + '<sub>/mo</sub>';
      });
      const badge = document.getElementById('billingBadge');
      if (badge) badge.textContent = billingToggle.checked ? 'Save 20%' : '';
    });
  }

  /* ── Demo video modal ── */
  const demoBtn = document.getElementById('demoBtn');
  if (demoBtn) {
    demoBtn.addEventListener('click', () => Modal.open('demoModal'));
    Modal.closeOnOverlay('demoModal');
  }

});
