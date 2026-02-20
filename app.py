from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os
import requests
import sqlite3
from datetime import datetime
from config import Config
import json
import hashlib
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Serve static files from the current directory
app = Flask(__name__, static_folder='.', static_url_path='')
app.config.from_object(Config)

# ── CORS: allow every origin so the static HTML frontend can reach the API ──
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Create directories
os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)
os.makedirs(Config.REPORT_FOLDER, exist_ok=True)


# ─────────────────────────────────────────────
# DATABASE
# ─────────────────────────────────────────────
def get_db():
    conn = sqlite3.connect(Config.DATABASE)
    conn.row_factory = sqlite3.Row          # dict-like rows
    return conn


def init_db():
    conn = get_db()
    conn.execute('''
        CREATE TABLE IF NOT EXISTS history (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            filename    TEXT,
            file_type   TEXT,
            ai_score    REAL,
            human_score REAL,
            verdict     TEXT,
            confidence  REAL,
            timestamp   DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()


init_db()


def init_newsletter_db():
    conn = get_db()
    conn.execute('''
        CREATE TABLE IF NOT EXISTS newsletter_subscribers (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            email       TEXT UNIQUE NOT NULL,
            subscribed_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()


init_newsletter_db()


# ─────────────────────────────────────────────
# SERVE STATIC FILES
# ─────────────────────────────────────────────
@app.route('/')
def serve_index():
    return send_file('index.html')


@app.route('/css/<path:filename>')
def serve_css(filename):
    return send_file(f'css/{filename}')


@app.route('/js/<path:filename>')
def serve_js(filename):
    return send_file(f'js/{filename}')


# ─────────────────────────────────────────────
# HEALTH
# ─────────────────────────────────────────────
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "healthy",
        "message": "OmniDetect AI Backend",
        "timestamp": datetime.now().isoformat()
    })


# ─────────────────────────────────────────────
# IMAGE ANALYSIS
# ─────────────────────────────────────────────
@app.route('/api/analyze/image', methods=['POST'])
def analyze_image():
    try:
        if 'image' not in request.files:
            return jsonify({"success": False, "error": "No image provided"}), 400

        image = request.files['image']
        if image.filename == '':
            return jsonify({"success": False, "error": "No selected file"}), 400

        filename = image.filename
        filepath = os.path.join(Config.UPLOAD_FOLDER, filename)
        image.save(filepath)

        # 1️⃣ Try Sightengine
        result = analyze_with_sightengine(filepath)

        # 2️⃣ Fallback → HuggingFace
        if "error" in result:
            print(f"[WARN] Sightengine failed: {result['error']} — trying HuggingFace")
            result = analyze_with_huggingface(filepath)

        if "error" in result:
            return jsonify({"success": False, "error": result["error"]}), 502

        ai_score    = float(result.get("ai_generated", 0.5))
        human_score = round(1 - ai_score, 4)
        ai_score    = round(ai_score, 4)

        if ai_score > 0.75:
            verdict = "AI Generated"
        elif ai_score < 0.25:
            verdict = "Human Created"
        else:
            verdict = "Uncertain"

        confidence = round(1 - abs(ai_score - 0.5) * 2, 4)   # how far from 50/50

        _save_history(filename, 'image', ai_score, human_score, verdict, confidence)

        return jsonify({
            "success": True,
            "data": {
                "filename":    filename,
                "ai_score":    ai_score,
                "human_score": human_score,
                "verdict":     verdict,
                "confidence":  confidence,
                "model_used":  result.get("model", "Multiple")
            }
        })

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


def analyze_with_sightengine(filepath):
    try:
        with open(filepath, 'rb') as f:
            response = requests.post(
                "https://api.sightengine.com/1.0/check.json",
                files={"media": f},
                data={
                    "models":     "genai",
                    "api_user":   Config.SIGHTENGINE_API_USER,
                    "api_secret": Config.SIGHTENGINE_API_SECRET
                },
                timeout=15
            )

        if response.status_code == 200:
            data = response.json()
            # Response shape: {"type": {"ai_generated": 0.98, ...}, ...}
            ai_val = data.get("type", {}).get("ai_generated")
            if ai_val is not None:
                return {"ai_generated": float(ai_val), "model": "Sightengine"}

        return {"error": f"Sightengine HTTP {response.status_code}"}

    except Exception as e:
        return {"error": f"Sightengine: {e}"}


def analyze_with_huggingface(filepath):
    try:
        API_URL = "https://api-inference.huggingface.co/models/therealvish/ai-image-detector"
        headers = {"Authorization": f"Bearer {Config.HUGGINGFACE_API_KEY}"}

        with open(filepath, "rb") as f:
            response = requests.post(API_URL, headers=headers, data=f.read(), timeout=20)

        if response.status_code == 200:
            data = response.json()
            # data is a list of lists or list of dicts
            scores = data[0] if isinstance(data, list) and data else []
            if isinstance(scores, list):
                for item in scores:
                    label = str(item.get("label", "")).upper()
                    score = float(item.get("score", 0))
                    if "AI" in label or "FAKE" in label or "GENERATED" in label:
                        return {"ai_generated": score, "model": "HuggingFace"}

        return {"error": f"HuggingFace HTTP {response.status_code}"}

    except Exception as e:
        return {"error": f"HuggingFace: {e}"}


# ─────────────────────────────────────────────
# TEXT ANALYSIS
# ─────────────────────────────────────────────
@app.route('/api/analyze/text', methods=['POST'])
def analyze_text():
    try:
        body = request.get_json(silent=True) or {}
        text = body.get('text', '').strip()

        if len(text) < 10:
            return jsonify({"success": False, "error": "Text too short (min 10 chars)"}), 400

        model_used = "OpenRouter GPT-3.5"
        ai_score   = None

        # ── OpenRouter ──────────────────────────────────────────────────────
        headers = {
            "Authorization": f"Bearer {Config.OPENROUTER_API_KEY}",
            "Content-Type":  "application/json",
            "HTTP-Referer":  "http://localhost:5000",   # required by OpenRouter
            "X-Title":       "OmniDetect AI"
        }

        prompt = (
            "Analyze whether the following text was written by an AI or a human. "
            "Reply ONLY with a valid JSON object, no markdown, no extra text:\n"
            '{"ai_probability": <float 0.0-1.0>, "confidence": <float 0.0-1.0>, "reason": "<brief reason>"}\n\n'
            f"Text:\n\"\"\"\n{text[:800]}\n\"\"\""
        )

        payload = {
            "model": "openai/gpt-3.5-turbo",
            "messages": [
                {"role": "system", "content": "You are an expert AI-content detection system. Always respond with pure JSON only."},
                {"role": "user",   "content": prompt}
            ],
            "temperature": 0.1,
            "max_tokens":  120
        }

        try:
            r = requests.post(Config.OPENROUTER_API_URL, headers=headers, json=payload, timeout=15)
            if r.status_code == 200:
                content = r.json()['choices'][0]['message']['content'].strip()
                # Strip possible markdown fences
                content = content.replace("```json", "").replace("```", "").strip()
                parsed  = json.loads(content)
                ai_score   = float(parsed.get("ai_probability", 0.5))
                confidence = float(parsed.get("confidence", 0.6))
            else:
                print(f"[WARN] OpenRouter HTTP {r.status_code}: {r.text[:200]}")
        except Exception as ex:
            print(f"[WARN] OpenRouter failed: {ex}")

        # ── Heuristic fallback ──────────────────────────────────────────────
        if ai_score is None:
            ai_score   = analyze_text_heuristic(text)
            confidence = 0.45
            model_used = "Heuristic"

        ai_score    = round(max(0.0, min(1.0, ai_score)), 4)
        human_score = round(1 - ai_score, 4)
        confidence  = round(max(0.0, min(1.0, confidence)), 4)

        if ai_score > 0.75:
            verdict = "AI Generated"
        elif ai_score < 0.25:
            verdict = "Human Written"
        else:
            verdict = "Uncertain"

        _save_history("text_analysis", "text", ai_score, human_score, verdict, confidence)

        return jsonify({
            "success": True,
            "data": {
                "ai_score":    ai_score,
                "human_score": human_score,
                "verdict":     verdict,
                "confidence":  confidence,
                "model_used":  model_used
            }
        })

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


def analyze_text_heuristic(text):
    """Lightweight rule-based fallback."""
    ai_score = 0.30
    words    = text.split()

    ai_phrases = [
        "as an ai", "language model", "i cannot", "i'm unable",
        "based on my training", "as an artificial intelligence",
        "i don't have the ability", "i must clarify", "certainly",
        "absolutely", "of course", "i understand your", "it's worth noting"
    ]
    for phrase in ai_phrases:
        if phrase in text.lower():
            ai_score = min(ai_score + 0.18, 0.95)

    sentences = max(1, text.count('.') + text.count('!') + text.count('?'))
    avg_len   = len(words) / sentences
    if 13 <= avg_len <= 22:
        ai_score = min(ai_score + 0.08, 0.95)

    # Unusual punctuation uniformity typical of LLMs
    if text.count(',') > len(words) * 0.07:
        ai_score = min(ai_score + 0.05, 0.95)

    return round(ai_score, 4)


# ─────────────────────────────────────────────
# HISTORY & STATS
# ─────────────────────────────────────────────
def _save_history(filename, file_type, ai_score, human_score, verdict, confidence):
    conn = get_db()
    conn.execute(
        "INSERT INTO history (filename, file_type, ai_score, human_score, verdict, confidence) VALUES (?,?,?,?,?,?)",
        (filename, file_type, ai_score, human_score, verdict, confidence)
    )
    conn.commit()
    conn.close()


@app.route('/api/history', methods=['GET'])
def get_history():
    conn    = get_db()
    rows    = conn.execute('SELECT * FROM history ORDER BY timestamp DESC LIMIT 50').fetchall()
    conn.close()
    return jsonify({
        "success": True,
        "history": [dict(r) for r in rows]
    })


@app.route('/api/stats', methods=['GET'])
def get_stats():
    conn  = get_db()
    total  = conn.execute('SELECT COUNT(*) FROM history').fetchone()[0]
    images = conn.execute('SELECT COUNT(*) FROM history WHERE file_type="image"').fetchone()[0]
    texts  = conn.execute('SELECT COUNT(*) FROM history WHERE file_type="text"').fetchone()[0]
    ai_det = conn.execute('SELECT COUNT(*) FROM history WHERE verdict="AI Generated"').fetchone()[0]
    conn.close()
    return jsonify({
        "success": True,
        "stats": {
            "total_analyses": total,
            "image_analyses": images,
            "text_analyses":  texts,
            "ai_detected":    ai_det,
            "human_detected": total - ai_det
        }
    })


@app.route('/api/history/<int:record_id>', methods=['DELETE'])
def delete_history(record_id):
    try:
        conn = get_db()
        conn.execute('DELETE FROM history WHERE id = ?', (record_id,))
        conn.commit()
        conn.close()
        return jsonify({"success": True, "message": "Record deleted"})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400


# ─────────────────────────────────────────────
# EMAIL / CONTACT FORM
# ─────────────────────────────────────────────
@app.route('/api/send-email', methods=['POST'])
def send_email():
    try:
        body = request.get_json(silent=True) or {}
        user_name = body.get('name', '').strip()
        user_email = body.get('email', '').strip()
        user_message = body.get('message', '').strip()
        user_phone = body.get('phone', '').strip()

        # Validation
        if not user_name or len(user_name) < 2:
            return jsonify({"success": False, "error": "Please provide a valid name"}), 400
        if not user_email or '@' not in user_email:
            return jsonify({"success": False, "error": "Please provide a valid email"}), 400
        if not user_message or len(user_message) < 5:
            return jsonify({"success": False, "error": "Message must be at least 5 characters"}), 400

        # Send email via Gmail SMTP
        sender_email = Config.GMAIL_SENDER
        sender_password = Config.GMAIL_PASSWORD
        recipient_email = Config.GMAIL_SENDER  # Send to yourself

        # Create message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = f"New Contact Message from {user_name}"
        msg['From'] = sender_email
        msg['To'] = recipient_email

        # Plain text version
        text = f"""
        New Message from OmniDetect AI Contact Form
        =============================================
        Name: {user_name}
        Email: {user_email}
        Phone: {user_phone if user_phone else 'Not provided'}
        
        Message:
        {user_message}
        
        Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
        """

        # HTML version
        html = f"""
        <html>
          <head>
            <style>
              body {{ font-family: Arial, sans-serif; background-color: #f5f5f5; }}
              .container {{ max-width: 600px; margin: 20px auto; background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }}
              h1 {{ color: #00d4ff; border-bottom: 2px solid #00d4ff; padding-bottom: 10px; }}
              .field {{ margin: 15px 0; }}
              .label {{ font-weight: bold; color: #333; }}
              .value {{ color: #666; margin-top: 5px; padding: 10px; background-color: #f9f9f9; border-left: 3px solid #00d4ff; }}
              .message-content {{ background-color: #f0fbff; padding: 15px; border-radius: 5px; margin-top: 10px; white-space: pre-wrap; word-wrap: break-word; }}
              .footer {{ text-align: center; margin-top: 20px; font-size: 12px; color: #999; border-top: 1px solid #ddd; padding-top: 10px; }}
            </style>
          </head>
          <body>
            <div class="container">
              <h1>📨 New Contact Message</h1>
              <div class="field">
                <div class="label">👤 Name:</div>
                <div class="value">{user_name}</div>
              </div>
              <div class="field">
                <div class="label">📧 Email:</div>
                <div class="value">{user_email}</div>
              </div>
              <div class="field">
                <div class="label">📱 Phone:</div>
                <div class="value">{user_phone if user_phone else 'Not provided'}</div>
              </div>
              <div class="field">
                <div class="label">💬 Message:</div>
                <div class="message-content">{user_message}</div>
              </div>
              <div class="footer">
                <p>Sent via OmniDetect AI • {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
              </div>
            </div>
          </body>
        </html>
        """

        part1 = MIMEText(text, 'plain')
        part2 = MIMEText(html, 'html')
        msg.attach(part1)
        msg.attach(part2)

        # Send via Gmail SMTP
        with smtplib.SMTP('smtp.gmail.com', 587, timeout=10) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(sender_email, sender_password)
            server.sendmail(sender_email, recipient_email, msg.as_string())

        return jsonify({
            "success": True,
            "message": f"Message sent successfully! We'll get back to you at {user_email}"
        }), 200

    except smtplib.SMTPAuthenticationError:
        return jsonify({"success": False, "error": "Email authentication failed. Please check credentials."}), 500
    except smtplib.SMTPException as e:
        return jsonify({"success": False, "error": f"Failed to send email: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ─────────────────────────────────────────────
# NEWSLETTER
# ─────────────────────────────────────────────
@app.route('/api/newsletter/subscribe', methods=['POST'])
def subscribe_newsletter():
    try:
        body = request.get_json(silent=True) or {}
        email = body.get('email', '').strip().lower()
        
        # Validation
        if not email or '@' not in email:
            return jsonify({"success": False, "error": "Please provide a valid email"}), 400
        
        conn = get_db()
        cursor = conn.cursor()
        
        try:
            cursor.execute(
                "INSERT INTO newsletter_subscribers (email) VALUES (?)",
                (email,)
            )
            conn.commit()
            conn.close()
            
            return jsonify({
                "success": True,
                "message": f"✓ Successfully subscribed! Check your email at {email}"
            }), 200
            
        except sqlite3.IntegrityError:
            conn.close()
            return jsonify({
                "success": False,
                "error": "This email is already subscribed"
            }), 400
            
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ─────────────────────────────────────────────
# ADMIN
# ─────────────────────────────────────────────
@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    body     = request.get_json(silent=True) or {}
    username = body.get('username')
    password = body.get('password')

    if username == Config.ADMIN_USERNAME and password == Config.ADMIN_PASSWORD:
        token = hashlib.sha256(f"{username}{datetime.now().isoformat()}".encode()).hexdigest()
        return jsonify({"success": True, "token": token, "user": {"username": username, "role": "admin"}})

    return jsonify({"success": False, "error": "Invalid credentials"}), 401


# ─────────────────────────────────────────────
if __name__ == '__main__':
    print("=" * 55)
    print("  OmniDetect AI — Backend Starting")
    print(f"  Sightengine : {bool(Config.SIGHTENGINE_API_USER)}")
    print(f"  OpenRouter  : {bool(Config.OPENROUTER_API_KEY)}")
    print(f"  HuggingFace : {bool(Config.HUGGINGFACE_API_KEY)}")
    print("=" * 55)
    app.run(debug=True, port=5000, host='0.0.0.0')
