/**
 * OCR Controller — OCR.space (FREE) + Sharp preprocessing
 *
 * OCR.space free tier: 25,000 images/month — no billing needed
 * Get free API key: https://ocr.space/ocrapi/freekey
 *
 * Pipeline:
 *   1. Receive image via multer (in-memory buffer)
 *   2. Preprocess with sharp: grayscale → normalize → sharpen
 *   3. Send to OCR.space TWICE:
 *        a) Engine 2, English — accurate word bounding boxes, used to place numbers
 *           into the right row/column (brand identification by row POSITION).
 *        b) Engine 3, Hindi/auto — reads the actual Hindi text (no usable bounding
 *           boxes for a table this dense, so it's returned as a plain-text transcript
 *           for the shop owner to read/verify against, not for auto-matching).
 *   4. Parse word-level bounding boxes from TextOverlay (from call a)
 *   5. Return { words, hindiText, imageWidth, imageHeight }
 *
 * ENV required:
 *   OCR_SPACE_API_KEY=your_key_here
 *   (Free key: register at https://ocr.space/ocrapi/freekey)
 */

const sharp = require('sharp');
const axios = require('axios');
const FormData = require('form-data');

const OCR_URL = 'https://api.ocr.space/parse/image';

async function ocrScan(req, res) {
  try {
    // ── 1. Validate ────────────────────────────────────────────────────────
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Image file required (field: image)' });
    }
    const apiKey = process.env.OCR_SPACE_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: 'OCR_SPACE_API_KEY .env mein set nahi hai. https://ocr.space/ocrapi/freekey se free key lo.',
      });
    }

    // ── 2. Preprocess with Sharp (OpenCV-equivalent) ───────────────────────
    const MAX_W = 2800; // OCR.space max recommended width
    const meta = await sharp(req.file.buffer).metadata();

    const pipeline = sharp(req.file.buffer)
      .rotate()                                   // EXIF auto-rotate
      .grayscale()                                // single channel — better OCR
      .normalize()                                // auto contrast stretch (cv2.normalize)
      .sharpen({ sigma: 1.2, m1: 0.5, m2: 2 }); // unsharp mask

    if (meta.width > MAX_W) {
      pipeline.resize({ width: MAX_W, withoutEnlargement: true });
    }

    const { data: buf, info } = await pipeline
      .jpeg({ quality: 92 })
      .toBuffer({ resolveWithObject: true });

    // ── 3. Call OCR.space API ──────────────────────────────────────────────
    // Send as multipart form with the processed image buffer
    const form = new FormData();
    form.append('apikey', apiKey);
    // Engine 3 supports Hindi but returns EMPTY/unreliable TextOverlay (word bounding boxes)
    // for dense tabular sheets — it optimizes for Markdown text output, not word positions.
    // This app needs precise bounding boxes (to bucket numbers into row/column), and it
    // already identifies brands by row POSITION (see PAPER_BRAND_ORDER), not by reading the
    // Hindi brand text itself — so we don't actually need Hindi OCR, just accurate boxes.
    form.append('language', 'eng');           // 'eng' is valid on Engine 1 & 2 (avoids E201)
    form.append('isOverlayRequired', 'true'); // word-level bounding boxes — reliable on Engine 2
    form.append('OCREngine', '2');            // Engine 2 = accurate boxes for printed/handwritten digits
    form.append('scale', 'true');             // auto-scale for small text
    form.append('detectOrientation', 'true');
    form.append('file', buf, {
      filename: 'image.jpg',
      contentType: 'image/jpeg',
    });

    let ocrResp;
    try {
      ocrResp = await axios.post(OCR_URL, form, {
        headers: form.getHeaders(),
        timeout: 60000, // 60s — OCR.space can be slow on free tier
        maxContentLength: 20 * 1024 * 1024,
      });
    } catch (axiosErr) {
      const msg = axiosErr.response?.data?.ErrorMessage || axiosErr.message;
      return res.status(502).json({ success: false, message: 'OCR.space API error: ' + msg });
    }

    // ── 3b. SECOND call — Engine 3, Hindi/auto-detect — for a human-readable transcript ──────
    // Engine 2 (above) gives reliable word POSITIONS but can't read Devanagari text at all — it
    // just produces garbled nonsense for Hindi brand names. Engine 3 reads Hindi properly but
    // doesn't give usable word positions for a table this dense, so it can't drive auto-fill.
    // Instead we return its plain text as a readable reference: the shop owner can read Hindi,
    // so showing the actual OCR'd Hindi text next to the auto-filled numbers lets THEM verify/
    // match brands reliably — far more trustworthy than auto-matching Hindi text in code.
    let hindiText = '';
    try {
      const hindiForm = new FormData();
      hindiForm.append('apikey', apiKey);
      hindiForm.append('language', 'auto');
      hindiForm.append('isOverlayRequired', 'false');
      hindiForm.append('OCREngine', '3');
      hindiForm.append('scale', 'true');
      hindiForm.append('detectOrientation', 'true');
      hindiForm.append('file', buf, { filename: 'image.jpg', contentType: 'image/jpeg' });
      const hindiResp = await axios.post(OCR_URL, hindiForm, {
        headers: hindiForm.getHeaders(),
        timeout: 60000,
        maxContentLength: 20 * 1024 * 1024,
      });
      if (!hindiResp.data.IsErroredOnProcessing) {
        hindiText = (hindiResp.data.ParsedResults?.[0]?.ParsedText || '').trim();
      }
    } catch (e) {
      console.warn('[OCR] Hindi transcript call failed (non-fatal):', e.message);
    }

    // ── 4. Parse response ──────────────────────────────────────────────────
    const result = ocrResp.data;
    if (result.IsErroredOnProcessing) {
      const errMsg = (result.ErrorMessage || []).join('; ');
      return res.status(502).json({ success: false, message: 'OCR.space error: ' + errMsg });
    }

    const parsedResult = result.ParsedResults?.[0];
    if (!parsedResult) {
      return res.json({ success: true, words: [], hindiText, imageWidth: info.width, imageHeight: info.height });
    }

    // Extract word bounding boxes from TextOverlay
    const words = [];
    const lines = parsedResult.TextOverlay?.Lines || [];
    for (const line of lines) {
      for (const word of line.Words || []) {
        const text = (word.WordText || '').trim();
        if (!text) continue;
        const x0 = Math.round(word.Left || 0);
        const y0 = Math.round(word.Top  || 0);
        const x1 = Math.round(x0 + (word.Width  || 0));
        const y1 = Math.round(y0 + (word.Height || 0));
        words.push({
          text,
          confidence: 90, // OCR.space doesn't give per-word confidence; use 90 as default
          bbox: { x0, y0, x1, y1 },
        });
      }
    }

    console.log(`[OCR] OCR.space returned ${words.length} words (${info.width}×${info.height}), hindiText ${hindiText.length} chars`);

    return res.json({
      success: true,
      words,
      hindiText,
      imageWidth:  info.width,
      imageHeight: info.height,
    });

  } catch (err) {
    console.error('[OCR] Unexpected error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = { ocrScan };
