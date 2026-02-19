/* =====================================================
   OMNIDETECT AI — APP.JS  (API-connected build)
   ===================================================== */

const API_BASE = 'http://localhost:5000/api';

// ─────────────────────────────────────────────
// LOADER + BOOT SEQUENCE
// ─────────────────────────────────────────────
window.addEventListener('load', () => {
  setTimeout(() => {
    document.getElementById('loader').classList.add('hidden');
    initParticles();
    animateHeroStats();
    initScrollAnimations();
    initDragDrop();
    checkBackendHealth();
    loadHistory();
  }, 2400);
});

// ─────────────────────────────────────────────
// BACKEND HEALTH CHECK
// ─────────────────────────────────────────────
async function checkBackendHealth() {
  try {
    const res  = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(4000) });
    const data = await res.json();
    setNavStatus(data.status === 'healthy');
  } catch {
    setNavStatus(false);
    showToast('Backend offline — start app.py to enable live detection', 'warn');
  }
}

function setNavStatus(online) {
  const dot  = document.querySelector('.status-dot');
  const text = document.querySelector('.status-text');
  const col  = online ? '#10b981' : '#f59e0b';
  dot.style.background  = col;
  dot.style.boxShadow   = `0 0 8px ${col}`;
  text.textContent      = online ? 'SYSTEM ONLINE' : 'BACKEND OFFLINE';
  text.style.color      = col;
}

// ─────────────────────────────────────────────
// TOAST NOTIFICATIONS
// ─────────────────────────────────────────────
const toastStyle = document.createElement('style');
toastStyle.textContent = `
  @keyframes toastIn  { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
  @keyframes spinBtn  { to   { transform: rotate(360deg); } }
`;
document.head.appendChild(toastStyle);

function showToast(message, type = 'info') {
  document.querySelectorAll('.omni-toast').forEach(t => t.remove());
  const colors = {
    info:    ['rgba(0,245,255,0.08)',    '#00f5ff'],
    success: ['rgba(16,185,129,0.08)',   '#10b981'],
    error:   ['rgba(255,77,109,0.08)',   '#ff4d6d'],
    warn:    ['rgba(245,158,11,0.08)',   '#f59e0b'],
  };
  const [bg, border] = colors[type] || colors.info;
  const t = document.createElement('div');
  t.className = 'omni-toast';
  t.style.cssText = `
    position:fixed;bottom:30px;right:30px;z-index:9998;
    background:${bg};border:1px solid ${border};color:${border};
    padding:14px 22px;font-family:'Share Tech Mono',monospace;
    font-size:.75rem;letter-spacing:2px;backdrop-filter:blur(12px);
    max-width:400px;line-height:1.5;animation:toastIn .3s ease forwards;
    box-shadow:0 0 20px ${border}44;
  `;
  t.textContent = message.toUpperCase();
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity='0'; t.style.transition='.3s'; setTimeout(()=>t.remove(),300); }, 4500);
}

// ─────────────────────────────────────────────
// CUSTOM CURSOR
// ─────────────────────────────────────────────
const cursor    = document.getElementById('cursor');
const cursorDot = document.getElementById('cursorDot');
let mouseX=0, mouseY=0, cursorX=0, cursorY=0;

document.addEventListener('mousemove', e => {
  mouseX=e.clientX; mouseY=e.clientY;
  cursorDot.style.left=mouseX+'px'; cursorDot.style.top=mouseY+'px';
});
(function animateCursor(){
  cursorX+=(mouseX-cursorX)*.12; cursorY+=(mouseY-cursorY)*.12;
  cursor.style.left=cursorX+'px'; cursor.style.top=cursorY+'px';
  requestAnimationFrame(animateCursor);
})();
document.querySelectorAll('a,button').forEach(el=>{
  el.addEventListener('mouseenter',()=>{ cursor.style.width='48px'; cursor.style.height='48px'; cursor.style.background='rgba(0,245,255,0.1)'; });
  el.addEventListener('mouseleave',()=>{ cursor.style.width='32px'; cursor.style.height='32px'; cursor.style.background='transparent'; });
});

// ─────────────────────────────────────────────
// NAVBAR SCROLL
// ─────────────────────────────────────────────
window.addEventListener('scroll', () => {
  document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 50);
});

// ─────────────────────────────────────────────
// PARTICLES
// ─────────────────────────────────────────────
function initParticles() {
  const canvas = document.getElementById('particles-canvas');
  const ctx    = canvas.getContext('2d');
  function resize(){ canvas.width=canvas.offsetWidth; canvas.height=canvas.offsetHeight; }
  resize(); window.addEventListener('resize', resize);

  const pts = Array.from({length:80}, ()=>({
    x:Math.random()*canvas.width, y:Math.random()*canvas.height,
    vx:(Math.random()-.5)*.4, vy:(Math.random()-.5)*.4,
    size:Math.random()*1.4+.3, opacity:Math.random()*.45+.1
  }));

  (function draw(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    pts.forEach((p,i)=>{
      p.x=(p.x+p.vx+canvas.width)%canvas.width;
      p.y=(p.y+p.vy+canvas.height)%canvas.height;
      ctx.beginPath(); ctx.arc(p.x,p.y,p.size,0,Math.PI*2);
      ctx.fillStyle=`rgba(0,245,255,${p.opacity})`; ctx.fill();
      for(let j=i+1;j<pts.length;j++){
        const dx=pts[j].x-p.x, dy=pts[j].y-p.y, d=Math.hypot(dx,dy);
        if(d<120){ ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(pts[j].x,pts[j].y);
          ctx.strokeStyle=`rgba(0,245,255,${.07*(1-d/120)})`; ctx.lineWidth=.5; ctx.stroke(); }
      }
    }); requestAnimationFrame(draw);
  })();
}

// ─────────────────────────────────────────────
// HERO STAT COUNTERS
// ─────────────────────────────────────────────
function animateHeroStats() {
  document.querySelectorAll('.stat-num').forEach(el=>{
    const t=parseInt(el.dataset.target); let c=0;
    const step=t/(2000/16);
    const iv=setInterval(()=>{ c=Math.min(c+step,t); el.textContent=Math.floor(c); if(c>=t)clearInterval(iv); },16);
  });
}

// ─────────────────────────────────────────────
// SCROLL REVEAL
// ─────────────────────────────────────────────
function initScrollAnimations() {
  const obs=new IntersectionObserver(entries=>{
    entries.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('visible'); obs.unobserve(e.target); } });
  },{threshold:.12});
  document.querySelectorAll('.process-step').forEach((el,i)=>{ el.style.transitionDelay=`${i*.1}s`; obs.observe(el); });

  const cardObs=new IntersectionObserver(entries=>{
    entries.forEach((e,i)=>{ if(e.isIntersecting){ setTimeout(()=>{ e.target.style.opacity='1'; e.target.style.transform='translateY(0)'; },i*80); cardObs.unobserve(e.target); } });
  },{threshold:.1});
  document.querySelectorAll('.feat-card,.proj-card,.stat-card').forEach(el=>{
    el.style.opacity='0'; el.style.transform='translateY(30px)';
    el.style.transition='opacity .6s ease,transform .6s ease';
    cardObs.observe(el);
  });
}

// ─────────────────────────────────────────────
// TAB SWITCH
// ─────────────────────────────────────────────
function switchTab(type) {
  const img = type==='image';
  document.getElementById('imagePanel').style.display = img ? 'block' : 'none';
  document.getElementById('textPanel').style.display  = img ? 'none'  : 'block';
  document.getElementById('imgTab').classList.toggle('active', img);
  document.getElementById('txtTab').classList.toggle('active', !img);
  document.getElementById('resultPanel').style.display='none';
}

// ─────────────────────────────────────────────
// IMAGE UPLOAD
// ─────────────────────────────────────────────
let selectedImageFile = null;

function handleImageUpload(e) {
  const file=e.target.files[0];
  if(file){ selectedImageFile=file; previewImage(file); }
}

function previewImage(file) {
  const reader=new FileReader();
  reader.onload=ev=>{
    document.getElementById('imagePreview').src=ev.target.result;
    document.getElementById('previewContainer').style.display='block';
    document.querySelector('.upload-inner').style.display='none';
    document.getElementById('imageScanBtn').disabled=false;
  };
  reader.readAsDataURL(file);
}

function initDragDrop() {
  const zone=document.getElementById('uploadZone');
  zone.addEventListener('dragover',e=>{ e.preventDefault(); zone.classList.add('dragover'); });
  zone.addEventListener('dragleave',()=>zone.classList.remove('dragover'));
  zone.addEventListener('drop',e=>{
    e.preventDefault(); zone.classList.remove('dragover');
    const file=e.dataTransfer.files[0];
    if(file?.type.startsWith('image/')){ selectedImageFile=file; previewImage(file); }
    else showToast('Please drop a valid image file','error');
  });
}

// ─────────────────────────────────────────────
// ANALYZE IMAGE  →  POST /api/analyze/image
// ─────────────────────────────────────────────
async function analyzeImage() {
  if(!selectedImageFile) return;
  const overlay=document.getElementById('scanOverlay');
  const btn=document.getElementById('imageScanBtn');
  overlay.classList.add('active');
  btn.disabled=true;

  try {
    const form=new FormData();
    form.append('image', selectedImageFile);

    const res  = await fetch(`${API_BASE}/analyze/image`, { method:'POST', body:form });
    const data = await res.json();

    overlay.classList.remove('active');

    if(!res.ok || !data.success){
      showToast(data.error || `Server error ${res.status}`,'error');
      btn.disabled=false;
      return;
    }
    showResult(data.data);
    showToast('Image analysis complete!','success');
    loadHistory();

  } catch(err) {
    overlay.classList.remove('active');
    btn.disabled=false;
    showToast('Cannot reach backend — is app.py running on port 5000?','error');
    console.error('[analyzeImage]', err);
  }
}

// ─────────────────────────────────────────────
// ANALYZE TEXT  →  POST /api/analyze/text
// ─────────────────────────────────────────────
async function analyzeText() {
  const text=document.getElementById('textInput').value.trim();
  if(text.length<10){ showToast('Enter at least 10 characters','warn'); return; }

  const btn=document.getElementById('textScanBtn');
  const origHTML=btn.innerHTML;
  btn.innerHTML=`<div class="btn-scan-inner">
    <div style="width:20px;height:20px;border:2px solid rgba(0,0,0,.3);border-top-color:#030712;border-radius:50%;animation:spinBtn .8s linear infinite"></div>
    <span>ANALYZING...</span></div>`;
  btn.disabled=true;

  try {
    const res  = await fetch(`${API_BASE}/analyze/text`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ text })
    });
    const data = await res.json();

    btn.innerHTML=origHTML; btn.disabled=false;

    if(!res.ok || !data.success){
      showToast(data.error || `Server error ${res.status}`,'error');
      return;
    }
    showResult(data.data);
    showToast('Text analysis complete!','success');
    loadHistory();

  } catch(err){
    btn.innerHTML=origHTML; btn.disabled=false;
    showToast('Cannot reach backend — is app.py running on port 5000?','error');
    console.error('[analyzeText]', err);
  }
}

// ─────────────────────────────────────────────
// RENDER RESULT PANEL
// ─────────────────────────────────────────────
function showResult(data) {
  const panel=document.getElementById('resultPanel');
  panel.style.display='block';
  panel.scrollIntoView({behavior:'smooth',block:'nearest'});

  const aiPct    = Math.round((data.ai_score    ?? 0) * 100);
  const humanPct = Math.round((data.human_score ?? 0) * 100);
  const confPct  = Math.round((data.confidence  ?? 0) * 100);

  document.getElementById('resultVerdict').textContent = (data.verdict||'').toUpperCase();
  document.getElementById('aiPct').textContent         = `${aiPct}%`;
  document.getElementById('humanPct').textContent      = `${humanPct}%`;
  document.getElementById('confValue').textContent     = `${confPct}%`;
  document.getElementById('modelValue').textContent    = data.model_used || '—';
  document.getElementById('timeValue').textContent     = new Date().toLocaleTimeString();

  const icon    = document.getElementById('resultIcon');
  const verdEl  = document.getElementById('resultVerdict');
  const isAI    = (data.verdict||'').includes('AI');
  const isHuman = (data.verdict||'').includes('Human');

  icon.className  = isAI ? 'result-icon ai-icon' : 'result-icon';
  verdEl.style.color = isAI ? '#ff4d6d' : isHuman ? '#22d3ee' : '#f59e0b';

  icon.innerHTML = isAI
    ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="28"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`
    : isHuman
    ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="28"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`
    : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="28"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;

  // Reset then animate bars
  document.getElementById('aiBar').style.width    = '0';
  document.getElementById('humanBar').style.width = '0';
  setTimeout(() => {
    document.getElementById('aiBar').style.width    = `${aiPct}%`;
    document.getElementById('humanBar').style.width = `${humanPct}%`;
  }, 80);
}

// ─────────────────────────────────────────────
// RESET SCANNER
// ─────────────────────────────────────────────
function resetScanner() {
  document.getElementById('resultPanel').style.display      = 'none';
  document.getElementById('previewContainer').style.display = 'none';
  document.querySelector('.upload-inner').style.display     = 'flex';
  document.getElementById('imageScanBtn').disabled          = true;
  document.getElementById('imageInput').value               = '';
  document.getElementById('aiBar').style.width              = '0';
  document.getElementById('humanBar').style.width           = '0';
  selectedImageFile = null;
}

// ─────────────────────────────────────────────
// CHAR COUNT
// ─────────────────────────────────────────────
function updateCharCount() {
  const len = document.getElementById('textInput').value.length;
  const el  = document.getElementById('charCount');
  el.textContent = `${len} / 2000`;
  el.style.color = len > 1800 ? '#f59e0b' : '#64748b';
}

// ─────────────────────────────────────────────
// HISTORY  →  GET /api/history
// ─────────────────────────────────────────────
let allHistory    = [];
let currentFilter = 'all';

async function loadHistory() {
  try {
    const res  = await fetch(`${API_BASE}/history`, { signal: AbortSignal.timeout(5000) });
    const data = await res.json();
    if (data.success) {
      allHistory = data.history;
      renderHistory();
      loadStats();
      return;
    }
  } catch { /* backend offline */ }
  renderEmptyHistory();
}

function renderHistory() {
  const tbody    = document.getElementById('historyBody');
  const filtered = currentFilter === 'all'
    ? allHistory
    : allHistory.filter(r => r.file_type === currentFilter);

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><span>${
      allHistory.length === 0
        ? 'No scans yet — run your first scan above!'
        : 'No records for this filter'
    }</span></div></td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(row => {
    const vc = row.verdict?.includes('AI')
      ? 'verdict-ai'
      : row.verdict?.includes('Human')
      ? 'verdict-human'
      : 'verdict-uncertain';
    const ts = new Date(row.timestamp).toLocaleString();
    return `
      <tr>
        <td style="color:#64748b;font-family:'Share Tech Mono',monospace;font-size:.72rem">#${row.id}</td>
        <td>
          <div style="font-weight:600;color:#e2e8f0;font-size:.85rem">${row.filename}</div>
          <div style="font-size:.68rem;color:#64748b;font-family:'Share Tech Mono',monospace">${(row.file_type||'').toUpperCase()}</div>
        </td>
        <td style="color:#ff4d6d;font-family:'Orbitron',monospace;font-size:.8rem">${Math.round((row.ai_score??0)*100)}%</td>
        <td style="color:#22d3ee;font-family:'Orbitron',monospace;font-size:.8rem">${Math.round((row.human_score??0)*100)}%</td>
        <td><span class="verdict-badge ${vc}">${row.verdict||'—'}</span></td>
        <td style="font-family:'Orbitron',monospace;font-size:.74rem;color:#94a3b8">${Math.round((row.confidence??0)*100)}%</td>
        <td style="font-size:.72rem;color:#64748b;font-family:'Share Tech Mono',monospace">${ts}</td>
        <td><button class="btn-delete" onclick="deleteHistoryRecord(${row.id})" title="Delete record">✕</button></td>
      </tr>`;
  }).join('');
}

function renderEmptyHistory() {
  document.getElementById('historyBody').innerHTML =
    `<tr><td colspan="8"><div class="empty-state"><span>Backend offline — scan history unavailable</span></div></td></tr>`;
}

function filterHistory(type, btn) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentFilter = type;
  renderHistory();
}

async function deleteHistoryRecord(id) {
  if (!confirm('Delete this record?')) return;
  try {
    const res = await fetch(`${API_BASE}/history/${id}`, {
      method: 'DELETE',
      signal: AbortSignal.timeout(5000)
    });
    const data = await res.json();
    if (data.success) {
      showToast('Record deleted successfully', 'success');
      loadHistory();
    } else {
      showToast('Failed to delete record', 'error');
    }
  } catch (err) {
    showToast('Error deleting record', 'error');
  }
}

// ─────────────────────────────────────────────
// STATS  →  GET /api/stats
// ─────────────────────────────────────────────
async function loadStats() {
  try {
    const res  = await fetch(`${API_BASE}/stats`, { signal: AbortSignal.timeout(5000) });
    const data = await res.json();
    if (data.success) {
      const s = data.stats;
      animateStat('statTotal',  s.total_analyses);
      animateStat('statImages', s.image_analyses);
      animateStat('statTexts',  s.text_analyses);
      animateStat('statAI',     s.ai_detected);
      return;
    }
  } catch { /* offline, derive from history */ }
  animateStat('statTotal',  allHistory.length);
  animateStat('statImages', allHistory.filter(r=>r.file_type==='image').length);
  animateStat('statTexts',  allHistory.filter(r=>r.file_type==='text').length);
  animateStat('statAI',     allHistory.filter(r=>(r.verdict||'').includes('AI')).length);
}

function animateStat(id, target) {
  const el=document.getElementById(id);
  if(!el) return;
  let cur=0; const step=Math.max(1,target/(900/16));
  const iv=setInterval(()=>{ cur=Math.min(cur+step,target); el.textContent=Math.floor(cur); if(cur>=target)clearInterval(iv); },16);
}

// ─────────────────────────────────────────────
// SMOOTH SCROLL
// ─────────────────────────────────────────────
function scrollTo(id) {
  document.getElementById(id)?.scrollIntoView({behavior:'smooth'});
}
// ─────────────────────────────────────────────
// CONTACT FORM HANDLER
// ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const submitBtn = document.getElementById('submitBtn');
      const btnText = submitBtn.querySelector('.btn-text');
      const btnLoading = submitBtn.querySelector('.btn-loading');
      const formStatus = document.getElementById('formStatus');
      
      // Get form data
      const formData = {
        name: document.getElementById('contactName').value.trim(),
        email: document.getElementById('contactEmail').value.trim(),
        phone: document.getElementById('contactPhone').value.trim(),
        message: document.getElementById('contactMessage').value.trim()
      };
      
      // Basic validation
      if (!formData.name || formData.name.length < 2) {
        showFormStatus('Please enter a valid name', 'error', formStatus);
        return;
      }
      
      if (!formData.email || !formData.email.includes('@')) {
        showFormStatus('Please enter a valid email address', 'error', formStatus);
        return;
      }
      
      if (!formData.message || formData.message.length < 5) {
        showFormStatus('Message must be at least 5 characters long', 'error', formStatus);
        return;
      }
      
      // Show loading state
      submitBtn.disabled = true;
      btnText.style.display = 'none';
      btnLoading.style.display = 'inline';
      showFormStatus('Sending your message...', 'loading', formStatus);
      
      try {
        const response = await fetch(`${API_BASE}/send-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
          // Success!
          showFormStatus('✓ Message sent successfully! Check your email for confirmation.', 'success', formStatus);
          
          // Reset form
          contactForm.reset();
          document.getElementById('contactName').focus();
          
          // Show toast notification
          showToast('Message sent to rggupta01rg@gmail.com!', 'success');
        } else {
          // Error from server
          const errorMsg = data.error || 'Failed to send message. Please try again.';
          showFormStatus('✗ ' + errorMsg, 'error', formStatus);
          showToast(errorMsg, 'error');
        }
      } catch (error) {
        console.error('Contact form error:', error);
        showFormStatus('✗ Connection error. Please try again later.', 'error', formStatus);
        showToast('Failed to send message. Please check your connection.', 'error');
      } finally {
        // Reset button state
        submitBtn.disabled = false;
        btnText.style.display = 'inline';
        btnLoading.style.display = 'none';
      }
    });
  }
});

function showFormStatus(message, type, element) {
  element.textContent = message;
  element.className = 'form-status ' + type;
  element.style.display = 'block';
  
  // Auto-hide success/error after 5 seconds
  if (type !== 'loading') {
    setTimeout(() => {
      element.style.display = 'none';
    }, 5000);
  }
}

// ─────────────────────────────────────────────
// NEWSLETTER FORM HANDLER
// ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  const newsletterForm = document.getElementById('newsletterForm');
  if (newsletterForm) {
    newsletterForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const button = newsletterForm.querySelector('.btn-newsletter');
      const input = newsletterForm.querySelector('input[type="email"]');
      const statusEl = document.getElementById('newsletterStatus');
      const originalText = button.textContent;
      
      const email = input.value.trim();
      
      if (!email) {
        showNewsletterStatus('Please enter your email', 'error', statusEl);
        return;
      }
      
      button.disabled = true;
      button.textContent = 'Subscribing...';
      
      try {
        const response = await fetch(`${API_BASE}/newsletter/subscribe`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
          showNewsletterStatus('✓ ' + data.message, 'success', statusEl);
          input.value = '';
          showToast('Newsletter subscription confirmed!', 'success');
        } else {
          const errorMsg = data.error || 'Failed to subscribe';
          showNewsletterStatus('✗ ' + errorMsg, 'error', statusEl);
          showToast(errorMsg, 'error');
        }
      } catch (error) {
        console.error('Newsletter subscription error:', error);
        showNewsletterStatus('✗ Connection error', 'error', statusEl);
        showToast('Failed to subscribe. Please try again.', 'error');
      } finally {
        button.disabled = false;
        button.textContent = originalText;
      }
    });
  }
});

function showNewsletterStatus(message, type, element) {
  element.textContent = message;
  element.className = type;
  element.style.display = 'block';
  
  if (type !== 'loading') {
    setTimeout(() => {
      element.style.display = 'none';
    }, 4000);
  }
}