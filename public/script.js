// nav dropdown ("Verwaltung" menu)
document.querySelectorAll('.nav-dropdown-trigger').forEach(trigger => {
  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const dropdown = trigger.closest('.nav-dropdown');
    const wasOpen = dropdown.classList.contains('open');
    document.querySelectorAll('.nav-dropdown.open').forEach(d => d.classList.remove('open'));
    if (!wasOpen) dropdown.classList.add('open');
  });
});
document.addEventListener('click', () => {
  document.querySelectorAll('.nav-dropdown.open').forEach(d => d.classList.remove('open'));
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.nav-dropdown.open').forEach(d => d.classList.remove('open'));
  }
});

// mobile nav toggle
const menuToggle = document.querySelector('.menu-toggle');
const navLinks = document.querySelector('nav.links');
menuToggle?.addEventListener('click', () => {
  const open = navLinks.style.display === 'flex';
  navLinks.style.display = open ? 'none' : 'flex';
  navLinks.style.flexDirection = 'column';
  navLinks.style.position = 'absolute';
  navLinks.style.top = '66px';
  navLinks.style.left = '0';
  navLinks.style.right = '0';
  navLinks.style.background = 'rgba(8,9,13,.98)';
  navLinks.style.padding = '16px 28px';
  navLinks.style.borderBottom = '1px solid var(--line)';
  navLinks.style.gap = '16px';
});

// count-up animation, reused on any page with .num[data-target]
function animateCount(el, target){
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(prefersReduced){ el.textContent = target.toLocaleString('de-DE'); return; }
  const duration = 1200;
  const startTime = performance.now();
  function tick(now){
    const p = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(eased * target).toLocaleString('de-DE');
    if(p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

const statEls = document.querySelectorAll('.stat .num[data-target]');
if(statEls.length){
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(entry.isIntersecting){
        animateCount(entry.target, Number(entry.target.dataset.target));
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });
  statEls.forEach(el => io.observe(el));
}

// live discord stats via invite endpoint (no bot / widget needed)
const HESSEN_RP_INVITE_CODE = 'v8stHccwZs';
async function loadDiscordStats(){
  const liveEls = document.querySelectorAll('[data-live-text]');
  const memberEl = document.getElementById('stat-members');
  const onlineEl = document.getElementById('stat-online');
  try{
    const res = await fetch(`https://discord.com/api/v9/invites/${HESSEN_RP_INVITE_CODE}?with_counts=true&with_expiration=true`);
    if(!res.ok) throw new Error('discord api error');
    const data = await res.json();
    const members = data.approximate_member_count;
    const online = data.approximate_presence_count;

    if(memberEl && typeof members === 'number'){ memberEl.dataset.target = members; }
    if(onlineEl && typeof online === 'number'){ onlineEl.dataset.target = online; }

    const text = `${online?.toLocaleString('de-DE') ?? '–'} online · ${members?.toLocaleString('de-DE') ?? '–'} Mitglieder`;
    liveEls.forEach(el => { el.innerHTML = text.replace(/(\d[\d.,]*)/g, '<b>$1</b>'); });

    [memberEl, onlineEl].forEach(el => {
      if(el && el.getBoundingClientRect().top < window.innerHeight){
        animateCount(el, Number(el.dataset.target));
      }
    });
  }catch(err){
    const fallback = 'Live-Daten aktuell nicht abrufbar — tritt bei und sieh selbst nach.';
    liveEls.forEach(el => { el.textContent = fallback; });
  }
}
loadDiscordStats();

// public Notruf form (only present on index.html) — no admin auth needed,
// this is citizens calling for an admin, not the other way around.
const notrufSendBtn = document.getElementById('notruf-send');
if (notrufSendBtn) {
  notrufSendBtn.addEventListener('click', async () => {
    const status = document.getElementById('notruf-status');
    const absender = document.getElementById('notruf-absender').value.trim();
    const ort = document.getElementById('notruf-ort').value.trim();
    const grund = document.getElementById('notruf-grund').value.trim();

    if (!grund) {
      status.textContent = 'Bitte kurz beschreiben, was los ist.';
      status.className = 'notruf-status err';
      return;
    }

    notrufSendBtn.disabled = true;
    status.textContent = 'Wird gesendet …';
    status.className = 'notruf-status';
    try {
      const res = await fetch('/api/notruf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ absender, ort, grund }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        status.textContent = '✅ Notruf gesendet — das Team wurde benachrichtigt.';
        status.className = 'notruf-status ok';
        document.getElementById('notruf-grund').value = '';
        // simple cooldown to avoid accidental double-sends / spam
        let seconds = 30;
        notrufSendBtn.textContent = `Erneut in ${seconds}s`;
        const interval = setInterval(() => {
          seconds -= 1;
          if (seconds <= 0) {
            clearInterval(interval);
            notrufSendBtn.textContent = '🚨 Notruf senden';
            notrufSendBtn.disabled = false;
          } else {
            notrufSendBtn.textContent = `Erneut in ${seconds}s`;
          }
        }, 1000);
        return; // keep disabled during cooldown
      } else {
        status.textContent = '❌ ' + (data.error || 'Senden fehlgeschlagen.');
        status.className = 'notruf-status err';
      }
    } catch (err) {
      status.textContent = '❌ Konnte den Server nicht erreichen.';
      status.className = 'notruf-status err';
    }
    notrufSendBtn.disabled = false;
  });
}
