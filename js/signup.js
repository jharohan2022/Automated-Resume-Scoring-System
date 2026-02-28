/* ============================================================
   RecruitIQ — Signup Page JS (02-signup)
   ============================================================ */

let currentStep = 1;
const TOTAL_STEPS = 4;

/* ── Step Navigation ── */
function goToStep(n) {
  // Hide old
  document.getElementById('step' + currentStep)?.classList.remove('active');

  // Update indicator circles
  for (let i = 1; i <= TOTAL_STEPS; i++) {
    const circle = document.getElementById('sc' + i);
    const label  = document.getElementById('sl' + i);
    if (!circle) continue;

    if (i < n) {
      circle.classList.add('done');
      circle.classList.remove('active');
      circle.textContent = '✓';
      label?.classList.remove('active');
    } else if (i === n) {
      circle.classList.remove('done');
      circle.classList.add('active');
      circle.textContent = i;
      label?.classList.add('active');
    } else {
      circle.classList.remove('done', 'active');
      circle.textContent = i;
      label?.classList.remove('active');
    }
  }

  currentStep = n;
  document.getElementById('step' + n)?.classList.add('active');

  // Scroll form into view
  document.querySelector('.form-wrap')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ── Step 1 Validation ── */
function validateStep1() {
  const first = document.getElementById('firstName')?.value.trim();
  const last  = document.getElementById('lastName')?.value.trim();
  const email = document.getElementById('email')?.value.trim();
  const pw    = document.getElementById('password')?.value;

  if (!first)             { Toast.error('Please enter your first name.');     return false; }
  if (!last)              { Toast.error('Please enter your last name.');      return false; }
  if (!email || !email.includes('@')) { Toast.error('Enter a valid email.'); return false; }
  if (!pw || pw.length < 8) { Toast.error('Password must be at least 8 characters.'); return false; }
  return true;
}

/* ── Step 2 Validation ── */
function validateStep2() {
  const company = document.getElementById('company')?.value.trim();
  const size    = document.getElementById('teamSize')?.value;
  if (!company) { Toast.error('Please enter your company name.'); return false; }
  if (!size)    { Toast.error('Please select your team size.');   return false; }
  return true;
}

/* ── Step 3 Validation ── */
function validateStep3() {
  const selected = document.querySelectorAll('.chip.selected');
  if (selected.length === 0) { Toast.error('Please select at least one industry.'); return false; }
  return true;
}

/* ── Next Step Buttons ── */
function nextStep(n) {
  // Validate current before advancing
  if (n > currentStep) {
    if (currentStep === 1 && !validateStep1()) return;
    if (currentStep === 2 && !validateStep2()) return;
    if (currentStep === 3 && !validateStep3()) return;
  }
  goToStep(n);
}

/* ── Password Strength ── */
function checkPassword(val) {
  const bars   = [1,2,3,4].map(i => document.getElementById('pb' + i));
  const label  = document.getElementById('pwLabel');
  if (!bars[0]) return;

  bars.forEach(b => { b.className = 'pw-bar'; });

  if (!val)          { label.textContent = 'Enter a password';           return; }
  if (val.length < 6){ bars[0].classList.add('pw-bar','weak'); label.textContent = 'Too weak — minimum 8 characters'; return; }
  if (val.length < 10){
    bars[0].classList.add('pw-bar','medium');
    bars[1].classList.add('pw-bar','medium');
    label.textContent = 'Medium — add numbers or symbols'; return;
  }
  const hasUpper  = /[A-Z]/.test(val);
  const hasNum    = /[0-9]/.test(val);
  const hasSymbol = /[^A-Za-z0-9]/.test(val);
  const strength  = [hasUpper, hasNum, hasSymbol].filter(Boolean).length;

  if (strength === 3) {
    bars.forEach(b => b.classList.add('pw-bar','filled'));
    label.textContent = '✓ Strong password';
  } else if (strength === 2) {
    bars.slice(0,3).forEach(b => b.classList.add('pw-bar','filled'));
    label.textContent = 'Good — add a symbol to strengthen';
  } else {
    bars.slice(0,2).forEach(b => b.classList.add('pw-bar','filled'));
    label.textContent = 'Fair — add uppercase & symbols';
  }
}

/* ── Industry Chip Toggle ── */
function toggleChip(el) {
  el.classList.toggle('selected');
}

/* ── OTP Input Auto-advance ── */
function otpMove(el, idx) {
  const inputs = document.querySelectorAll('.otp-input');
  if (el.value.length === 1 && idx < inputs.length) {
    inputs[idx].focus();
  }
  if (!el.value && idx > 1) {
    // Backspace: go back
    el.addEventListener('keydown', function handler(e) {
      if (e.key === 'Backspace' && !el.value) {
        inputs[idx - 2]?.focus();
        el.removeEventListener('keydown', handler);
      }
    });
  }
}

/* ── Resend OTP countdown ── */
function startResendCountdown() {
  const btn = document.getElementById('resendBtn');
  if (!btn) return;
  let sec = 45;
  btn.disabled = true;
  btn.textContent = `Resend in ${sec}s`;
  const timer = setInterval(() => {
    sec--;
    if (sec <= 0) {
      clearInterval(timer);
      btn.disabled = false;
      btn.textContent = 'Resend code';
    } else {
      btn.textContent = `Resend in ${sec}s`;
    }
  }, 1000);
}

/* ── Show Success ── */
function showSuccess() {
  // Mark all steps done
  for (let i = 1; i <= TOTAL_STEPS; i++) {
    const circle = document.getElementById('sc' + i);
    if (circle) { circle.classList.add('done'); circle.classList.remove('active'); circle.textContent = '✓'; }
    document.getElementById('sl' + i)?.classList.remove('active');
  }

  document.querySelectorAll('.step-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('stepSuccess')?.classList.add('active');

  // Confetti-like effect
  Toast.success('🎉 Account created successfully! Welcome to RecruitIQ.');
}

/* ── Submit OTP ── */
function verifyOTP() {
  const inputs  = document.querySelectorAll('.otp-input');
  const otp     = Array.from(inputs).map(i => i.value).join('');
  if (otp.length < 6) {
    Toast.error('Please enter the full 6-digit code.');
    return;
  }
  // Show loading
  const btn = document.querySelector('#step4 .btn-submit');
  if (btn) { btn.textContent = 'Verifying...'; btn.disabled = true; }

  // Simulate API call
  setTimeout(() => {
    showSuccess();
  }, 1200);
}

/* ── Form Submit ── */
async function submitSignup() {
  const payload = {
    first_name: document.getElementById('firstName')?.value.trim(),
    last_name:  document.getElementById('lastName')?.value.trim(),
    email:      document.getElementById('email')?.value.trim(),
    password:   document.getElementById('password')?.value,
    company:    document.getElementById('company')?.value.trim(),
    team_size:  document.getElementById('teamSize')?.value,
    industries: Array.from(document.querySelectorAll('.chip.selected')).map(c => c.dataset.value || c.textContent.trim()),
  };

  try {
    // const data = await API.post('/auth/register', payload);
    // Store.set('token', data.access_token);
    Toast.info('Sending verification code...');
    goToStep(4);
    startResendCountdown();
  } catch (err) {
    Toast.error(err.message || 'Signup failed. Please try again.');
  }
}

/* ── Init ── */
document.addEventListener('DOMContentLoaded', () => {
  // Password strength meter
  document.getElementById('password')?.addEventListener('input', e => checkPassword(e.target.value));

  // OTP paste support
  document.querySelector('.otp-input')?.addEventListener('paste', e => {
    e.preventDefault();
    const pasted = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g,'').slice(0,6);
    const inputs = document.querySelectorAll('.otp-input');
    [...pasted].forEach((char, i) => { if (inputs[i]) inputs[i].value = char; });
    inputs[Math.min(pasted.length, 5)]?.focus();
  });

  // Start resend countdown when step 4 is reached
  const step4NextBtn = document.querySelector('[onclick="nextStep(4)"]');
  step4NextBtn?.addEventListener('click', () => setTimeout(startResendCountdown, 500));
});
