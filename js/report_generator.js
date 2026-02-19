/* =====================================================
   OMNIDETECT AI — REPORT GENERATOR  v2
   Fixed: removed doc.setGlobalAlpha (not in jsPDF 2.x)
   ===================================================== */

window._lastReport = null;

function cacheReportData(data, type, fileName) {
  window._lastReport = {
    verdict:     data.verdict     || 'Unknown',
    ai_score:    data.ai_score    ?? 0,
    human_score: data.human_score ?? 0,
    confidence:  data.confidence  ?? 0,
    model_used:  data.model_used  || '—',
    type:        type             || 'unknown',
    fileName:    fileName         || null,
    inputText:   data.input_text  || null,
    timestamp:   new Date(),
    imageSrc:    type === 'image'
      ? document.getElementById('imagePreview')?.src || null
      : null,
  };
  const btn = document.getElementById('downloadReportBtn');
  if (btn) btn.style.display = 'flex';
}

/* ── Colour palette ── */
const C = {
  bg:       [3,   7,  18],
  bg2:      [10,  15,  30],
  bg3:      [15,  23,  42],
  bg4:      [20,  30,  55],
  cyan:     [0,  245, 255],
  cyanDim:  [0,  80,  95],
  cyanMid:  [0,  140, 160],
  violet:   [124, 58, 237],
  violetBr: [168, 85, 247],
  red:      [255,  77, 109],
  redDim:   [80,  20,  35],
  green:    [16,  185, 129],
  greenDim: [5,   55,  40],
  amber:    [245, 158,  11],
  white:    [226, 232, 240],
  dim:      [100, 116, 139],
  dimDark:  [40,  52,  70],
};

function sf(doc, a) { doc.setFillColor(...a); }
function sd(doc, a) { doc.setDrawColor(...a); }
function st(doc, a) { doc.setTextColor(...a); }

function roundRect(doc, x, y, w, h, r, fillArr, strokeArr) {
  if (fillArr)   sf(doc, fillArr);
  if (strokeArr) { sd(doc, strokeArr); doc.setLineWidth(0.3); }
  doc.roundedRect(x, y, w, h, r, r,
    fillArr && strokeArr ? 'FD' : fillArr ? 'F' : 'D');
}

function solidLine(doc, x1, y, x2, color, w) {
  sd(doc, color); doc.setLineWidth(w || 0.4); doc.line(x1, y, x2, y);
}

function dashedLine(doc, x1, y, x2, color) {
  sd(doc, color); doc.setLineWidth(0.2);
  doc.setLineDashPattern([1, 2], 0);
  doc.line(x1, y, x2, y);
  doc.setLineDashPattern([], 0);
}

/* Faint grid — dark colour, no alpha needed */
function drawGrid(doc, x, y, w, h, spacing) {
  spacing = spacing || 10;
  sd(doc, C.bg4); doc.setLineWidth(0.08);
  for (let lx = x; lx <= x + w; lx += spacing) doc.line(lx, y, lx, y + h);
  for (let ly = y; ly <= y + h; ly += spacing) doc.line(x, ly, x + w, ly);
}

function progressBar(doc, x, y, w, h, pct, fillColor, bgColor) {
  roundRect(doc, x, y, w, h, h / 2, bgColor);
  if (pct > 0) {
    const filled = Math.max((pct / 100) * w, h);
    roundRect(doc, x, y, filled, h, h / 2, fillColor);
    sf(doc, fillColor);
    doc.circle(x + filled, y + h / 2, h / 2 + 0.5, 'F');
  }
}

function cornerBracket(doc, x, y, size, color, flip) {
  sd(doc, color); doc.setLineWidth(0.5);
  const sx = flip ? -1 : 1;
  doc.line(x, y, x + sx * size, y);
  doc.line(x, y, x, y + size);
}

function verdictColor(verdict) {
  const v = (verdict || '').toUpperCase();
  if (v.includes('AI'))    return C.red;
  if (v.includes('HUMAN')) return C.green;
  return C.amber;
}

/* ════════════════════════════════════════
   MAIN PDF BUILDER
════════════════════════════════════════ */
async function generateReport() {
  const report = window._lastReport;
  if (!report) { alert('No analysis data found. Run a scan first.'); return; }

  const btn = document.getElementById('downloadReportBtn');
  const origHTML = btn ? btn.innerHTML : '';
  if (btn) {
    btn.innerHTML = '<div class="report-btn-spinner"></div><span>GENERATING PDF...</span>';
    btn.disabled = true;
  }

  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const PW = 210, PH = 297, M = 14, CW = PW - M * 2;

    /* Full-page dark background */
    sf(doc, C.bg); doc.rect(0, 0, PW, PH, 'F');
    drawGrid(doc, 0, 0, PW, PH, 10);

    /* Top accent band — pre-blended colours, no alpha */
    const gradCols = [
      [48, 18, 95], [38, 15, 80], [28, 12, 65],
      [18, 10, 50], [10,  8, 36], [5,   7, 24],
    ];
    gradCols.forEach((col, i) => {
      sf(doc, col); doc.rect(0, i * 3.5, PW, 4, 'F');
    });

    /* Header bar */
    sf(doc, C.bg2); doc.rect(0, 0, PW, 22, 'F');
    solidLine(doc, 0, 22, PW, C.cyan, 0.6);

    /* Eye logo */
    const ex = M + 8, ey = 11;
    sd(doc, C.cyan); doc.setLineWidth(0.6);
    doc.ellipse(ex, ey, 6, 3.5, 'D');
    sf(doc, [0, 60, 100]); doc.circle(ex, ey, 2.5, 'F');
    sd(doc, C.cyan);        doc.circle(ex, ey, 2.5, 'D');
    sf(doc, C.bg);          doc.circle(ex, ey, 1.2, 'F');
    sf(doc, C.white);       doc.circle(ex - 0.7, ey - 0.6, 0.5, 'F');
    sd(doc, C.cyan); doc.setLineWidth(0.2);
    doc.line(ex - 6, ey, ex + 6, ey);

    st(doc, C.white); doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
    doc.text('OMNI', ex + 9, ey + 1.5);
    st(doc, C.cyan);
    doc.text('DETECT', ex + 9 + doc.getTextWidth('OMNI'), ey + 1.5);
    st(doc, C.dim); doc.setFont('helvetica', 'normal'); doc.setFontSize(6);
    doc.text('AI DETECTION SYSTEM', ex + 9, ey + 5.5);

    st(doc, C.cyanMid); doc.setFontSize(6);
    doc.text('[ ANALYSIS REPORT ]', PW - M, 8, { align: 'right' });
    st(doc, C.dim); doc.setFontSize(5.5);
    doc.text('GENERATED: ' + report.timestamp.toLocaleString().toUpperCase(), PW - M, 13, { align: 'right' });
    const reportId = 'RPT-' + report.timestamp.getTime().toString(36).toUpperCase();
    doc.text('ID: ' + reportId, PW - M, 17.5, { align: 'right' });

    /* ══ VERDICT CARD ══ */
    let cy = 30;
    const vColor  = verdictColor(report.verdict);
    const confPct = Math.round((report.confidence  ?? 0) * 100);
    const aiPct   = Math.round((report.ai_score    ?? 0) * 100);
    const hPct    = Math.round((report.human_score ?? 0) * 100);

    roundRect(doc, M, cy, CW, 32, 3, C.bg3, vColor);
    cornerBracket(doc, M + 2,     cy + 2, 4, C.cyan);
    cornerBracket(doc, M + CW - 2, cy + 2, 4, C.cyan, true);

    st(doc, C.dim); doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5);
    doc.text('FINAL VERDICT', M + CW / 2, cy + 8, { align: 'center' });
    st(doc, vColor); doc.setFont('helvetica', 'bold'); doc.setFontSize(20);
    doc.text(report.verdict.toUpperCase(), M + CW / 2, cy + 20, { align: 'center' });
    st(doc, C.white); doc.setFontSize(7); doc.setFont('helvetica', 'normal');
    doc.text('CONFIDENCE: ' + confPct + '%', M + CW / 2, cy + 28, { align: 'center' });
    cy += 38;

    /* ══ SCAN TYPE BADGE ══ */
    dashedLine(doc, M, cy, M + CW, C.cyanDim); cy += 6;
    const isImg = report.type === 'image';
    roundRect(doc, M, cy, 28, 7, 2,
      isImg ? [0, 30, 50] : [30, 0, 70],
      isImg ? C.cyan : C.violetBr);
    st(doc, isImg ? C.cyan : C.violetBr);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5);
    doc.text(isImg ? 'IMAGE SCAN' : 'TEXT SCAN', M + 14, cy + 4.5, { align: 'center' });
    if (report.fileName) {
      st(doc, C.dim); doc.setFont('helvetica', 'normal'); doc.setFontSize(6);
      doc.text('FILE: ' + report.fileName, M + 32, cy + 4.5);
    }
    cy += 12;

    /* ══ SCORE BARS ══ */
    roundRect(doc, M, cy, CW, 46, 3, C.bg2, C.bg3);
    st(doc, C.cyan); doc.setFont('helvetica', 'bold'); doc.setFontSize(7);
    doc.text('[ DETECTION SCORES ]', M + 6, cy + 7);
    solidLine(doc, M + 6, cy + 9, M + CW - 6, C.bg4, 0.3);

    const barX = M + 6, barW = CW - 60, barH = 5;
    const barY1 = cy + 16, barY2 = cy + 30;

    st(doc, C.red); doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5);
    doc.text('AI GENERATED', barX, barY1 - 1.5);
    st(doc, C.white); doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
    doc.text(aiPct + '%', M + CW - 8, barY1 + 3, { align: 'right' });
    progressBar(doc, barX, barY1, barW, barH, aiPct, C.red, C.redDim);

    st(doc, C.green); doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5);
    doc.text('HUMAN CREATED', barX, barY2 - 1.5);
    st(doc, C.white); doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
    doc.text(hPct + '%', M + CW - 8, barY2 + 3, { align: 'right' });
    progressBar(doc, barX, barY2, barW, barH, hPct, C.green, C.greenDim);

    /* Confidence gauge arc */
    const gx = M + CW - 22, gy = cy + 28;
    sd(doc, C.dimDark); doc.setLineWidth(2.5); doc.circle(gx, gy, 9, 'D');
    const sa = -Math.PI / 2;
    const ea = sa + 2 * Math.PI * confPct / 100;
    doc.setLineWidth(2);
    for (let a = sa; a < ea - 0.05; a += 0.08) {
      sd(doc, vColor);
      doc.line(
        gx + 9 * Math.cos(a), gy + 9 * Math.sin(a),
        gx + 9 * Math.cos(a + 0.08), gy + 9 * Math.sin(a + 0.08)
      );
    }
    st(doc, vColor); doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
    doc.text(confPct + '%', gx, gy + 2, { align: 'center' });
    st(doc, C.dim); doc.setFontSize(4.5);
    doc.text('CONF.', gx, gy + 6, { align: 'center' });
    cy += 52;

    /* ══ META GRID ══ */
    const metaItems = [
      { label: 'MODEL USED', value: report.model_used },
      { label: 'SCAN TYPE',  value: report.type.toUpperCase() },
      { label: 'TIMESTAMP',  value: report.timestamp.toLocaleTimeString() },
      { label: 'REPORT ID',  value: reportId },
    ];
    const colW = CW / 4;
    metaItems.forEach(function(item, i) {
      const mx = M + i * colW;
      roundRect(doc, mx + 1, cy, colW - 2, 18, 2, C.bg2, C.bg3);
      st(doc, C.dim); doc.setFont('helvetica', 'normal'); doc.setFontSize(5.5);
      doc.text(item.label, mx + colW / 2, cy + 6, { align: 'center' });
      st(doc, C.cyan); doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5);
      const vl = doc.splitTextToSize(item.value, colW - 6);
      doc.text(vl[0], mx + colW / 2, cy + 12, { align: 'center' });
    });
    cy += 24;

    /* ══ PREVIEW IMAGE ══ */
    if (report.imageSrc && isImg) {
      try {
        const iw = 80, ih = 55;
        const ix = M + CW / 2 - iw / 2;
        roundRect(doc, ix - 2, cy, iw + 4, ih + 4, 3, C.bg2, C.cyan);
        cornerBracket(doc, ix - 2, cy, 5, C.cyan);
        cornerBracket(doc, ix + iw + 2, cy, 5, C.cyan, true);
        doc.addImage(report.imageSrc, 'JPEG', ix, cy + 2, iw, ih, undefined, 'FAST');
        /* Thin scan lines over image using dark-dim colour — no alpha */
        sd(doc, C.cyanDim); doc.setLineWidth(0.08);
        for (let sy = cy + 2; sy < cy + ih; sy += 4) doc.line(ix, sy, ix + iw, sy);
        st(doc, C.dim); doc.setFont('helvetica', 'normal'); doc.setFontSize(5.5);
        doc.text('[ SCANNED IMAGE ]', M + CW / 2, cy + ih + 9, { align: 'center' });
        cy += ih + 14;
      } catch (e) { console.warn('[PDF] Image embed skipped:', e); }
    }

    /* ══ TEXT EXCERPT ══ */
    if (!isImg && report.inputText) {
      roundRect(doc, M, cy, CW, 36, 3, C.bg2, C.bg3);
      st(doc, C.cyan); doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5);
      doc.text('[ ANALYZED TEXT EXCERPT ]', M + 6, cy + 7);
      solidLine(doc, M + 6, cy + 9, M + CW - 6, C.bg3, 0.3);
      st(doc, C.dim); doc.setFont('helvetica', 'normal'); doc.setFontSize(6);
      const excerpt = report.inputText.slice(0, 400) +
        (report.inputText.length > 400 ? '...' : '');
      doc.text(doc.splitTextToSize(excerpt, CW - 12).slice(0, 8), M + 6, cy + 15);
      cy += 42;
    }

    /* ══ INTERPRETATION ══ */
    cy += 4;
    roundRect(doc, M, cy, CW, 40, 3, C.bg2, C.bg3);
    st(doc, C.cyan); doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5);
    doc.text('[ ANALYSIS INTERPRETATION ]', M + 6, cy + 7);
    solidLine(doc, M + 6, cy + 9, M + CW - 6, C.bg3, 0.3);
    st(doc, C.white); doc.setFont('helvetica', 'normal'); doc.setFontSize(6.2);
    doc.text(
      doc.splitTextToSize(getInterpretation(report), CW - 14).slice(0, 6),
      M + 6, cy + 16
    );
    st(doc, vColor); doc.setFont('helvetica', 'bold'); doc.setFontSize(6);
    doc.text('> RECOMMENDATION:', M + 6, cy + 33);
    st(doc, C.white); doc.setFont('helvetica', 'normal');
    doc.text(getRecommendation(report), M + 38, cy + 33);

    /* ══ FOOTER ══ */
    solidLine(doc, M, PH - 18, PW - M, C.cyanDim, 0.3);
    st(doc, C.dim); doc.setFont('helvetica', 'normal'); doc.setFontSize(5.5);
    doc.text('OMNIDETECT AI  •  POWERED BY SIGHTENGINE + HUGGINGFACE + GPT-3.5', M, PH - 12);
    doc.text('PAGE 1 OF 1  •  ' + reportId, PW - M, PH - 12, { align: 'right' });

    /* Watermark — bg4 colour directly, no alpha required */
    st(doc, C.bg4); doc.setFont('helvetica', 'bold'); doc.setFontSize(52);
    doc.text('OMNIDETECT', PW / 2, PH / 2 + 16, { align: 'center', angle: 45 });

    /* ══ SAVE ══ */
    const safeName = (report.fileName || ('scan_' + report.type))
      .replace(/[^a-z0-9_\-.]/gi, '_').replace(/\.[^.]+$/, '');
    doc.save('OmniDetect_Report_' + safeName + '_' + report.timestamp.toISOString().slice(0, 10) + '.pdf');

    if (btn) { btn.innerHTML = origHTML; btn.disabled = false; }
    if (typeof showToast === 'function') showToast('Report downloaded!', 'success');

  } catch (err) {
    console.error('[generateReport]', err);
    if (btn) { btn.innerHTML = origHTML; btn.disabled = false; }
    alert('Failed to generate PDF: ' + err.message);
  }
}

function getInterpretation(r) {
  const ai   = Math.round((r.ai_score    ?? 0) * 100);
  const h    = Math.round((r.human_score ?? 0) * 100);
  const conf = Math.round((r.confidence  ?? 0) * 100);
  const v    = (r.verdict || '').toUpperCase();
  const img  = r.type === 'image';
  if (v.includes('AI'))
    return 'OmniDetect determined with ' + conf + '% confidence that this ' +
      (img ? 'image' : 'text') + ' was AI-generated. AI score: ' + ai + '%, Human score: ' + h + '%. ' +
      (img ? 'Irregular pixel patterns, unnatural textures and statistical artifacts were detected.'
           : 'Uniform structure, low perplexity, and lack of stylistic variation are consistent with LLM output.');
  if (v.includes('HUMAN'))
    return 'OmniDetect determined with ' + conf + '% confidence that this ' +
      (img ? 'image' : 'text') + ' was human-created. Human score: ' + h + '%, AI score: ' + ai + '%. ' +
      (img ? 'Organic noise distribution and authentic compression artifacts confirm human origin.'
           : 'Idiomatic expressions, natural rhythm, and stylistic variation confirm human authorship.');
  return 'Inconclusive verdict (confidence: ' + conf + '%). AI score ' + ai + '% vs. human score ' + h +
    '% are too close for a definitive call. May indicate hybrid creation or boundary-region content.';
}

function getRecommendation(r) {
  const v = (r.verdict || '').toUpperCase();
  if (v.includes('AI'))    return 'Treat as AI-generated. Verify with additional sources before publishing.';
  if (v.includes('HUMAN')) return 'Content appears authentic. Proceed with normal review process.';
  return 'Manual review recommended. Consider additional verification tools.';
}