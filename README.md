# OmniDetect AI 🔍
**AI-powered detection platform for images and text**  
*Built by Raunak Gupta — Data Scientist Intern*

---

## ⚡ Quick Start

### 1. Install Python dependencies
```bash
pip install flask flask-cors requests python-dotenv
```

### 2. Start the Flask backend
```bash
python app.py
```
You should see:
```
=======================================================
  OmniDetect AI — Backend Starting
  Sightengine : True
  OpenRouter  : True
  HuggingFace : True
=======================================================
 * Running on http://0.0.0.0:5000
```

### 3. Open the frontend
Open `index.html` directly in your browser — no build step needed.  
The nav bar will show **🟢 SYSTEM ONLINE** when connected.

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET  | `/api/health` | Health check |
| POST | `/api/analyze/image` | Upload image → AI detection |
| POST | `/api/analyze/text`  | JSON `{text}` → AI detection |
| GET  | `/api/history` | Last 50 scan records |
| GET  | `/api/stats`   | Aggregate stats |
| POST | `/api/send-email` | Contact form email submission |
| POST | `/api/newsletter/subscribe` | Newsletter email subscription |

### POST /api/analyze/image
```
Content-Type: multipart/form-data
Field: image (file)
```

### POST /api/analyze/text
```json
{ "text": "Your text here..." }
```

### POST /api/send-email
```json
{
  "name": "John Doe",
  "email": "user@example.com",
  "phone": "+1 (555) 123-4567",  // optional
  "message": "Your message here..."
}
```

### POST /api/newsletter/subscribe
```json
{
  "email": "user@example.com"
}
```

---

## 📧 Contact & Newsletter Features

### Contact Form
Interactive contact form in the **Contact** section with:
- **Name, Email, Phone, Message** fields
- Real-time client-side validation
- Backend email delivery via Gmail SMTP
- Emails sent to: `rggupta01rg@gmail.com`
- Success/error notifications with toast alerts

### Interactive Contact Cards
**Call Us Card** — Direct click-to-call functionality  
**Connect With Us** — Social media links (GitHub, LinkedIn, Twitter, Instagram)  
**Stay Updated** — Email newsletter subscription

### Newsletter Subscription
- Email collection for updates and tips
- Database storage with duplicate prevention
- Real-time subscription feedback
- Unique email constraint prevents duplicates

---

## 🤖 AI Model Pipeline

**Image Detection:**
1. **Sightengine** (primary) — genai model
2. **HuggingFace** (fallback) — therealvish/ai-image-detector

**Text Detection:**
1. **OpenRouter GPT-3.5** — LLM linguistic analysis
2. **Heuristic fallback** — rule-based scoring

**Verdict thresholds:** >0.75 = AI Generated · <0.25 = Human · else Uncertain

---

## 📁 Files
```
omnidetect/
├── index.html              — Frontend (open in browser)
├── app.py                  — Flask backend with email & newsletter
├── config.py               — API keys & Gmail credentials
├── css/
│   ├── style.css           — Main stylesheet
│   └── style_extra.css     — Contact form & animations
├── js/
│   ├── app.js              — Frontend logic & form handlers
│   └── report_generator.js — PDF report export
├── uploads/                — User uploaded files
├── reports/                — Generated reports
├── database.db             — SQLite (history, subscribers)
├── test_email.py           — Email functionality test script
├── CONTACT_FORM_GUIDE.md   — Email feature documentation
└── README.md
```

### Database Tables
- `history` — Scan records (images & text)
- `newsletter_subscribers` — Email subscriptions

---

## 🚀 Features

### AI Detection
✅ **Image Analysis** — Detect AI-generated images using Sightengine & HuggingFace  
✅ **Text Analysis** — Identify AI-written text using OpenRouter GPT-3.5  
✅ **Confidence Scoring** — 0-100% accuracy metrics for each detection  
✅ **Verdict Classification** — AI Generated / Human / Uncertain

### User Interface
✅ **Responsive Design** — Works on desktop, tablet, mobile  
✅ **Dark Theme** — Cyberpunk aesthetic with cyan/purple gradients  
✅ **4D Eye Loader** — Animated loading screen with visual effects  
✅ **Real-time Status** — Backend connection indicator in navbar  
✅ **Toast Notifications** — Non-intrusive success/error alerts

### Data Management
✅ **Scan History** — View last 50 analyses with timestamps  
✅ **Statistics Dashboard** — Total scans, images, texts, AI detected  
✅ **Filtering** — Filter history by type (all/image/text)  
✅ **Delete Records** — Remove individual scan records  
✅ **PDF Reports** — Export scan results as PDF documents

### Contact & Community
✅ **Contact Form** — Send messages via Gmail SMTP  
✅ **Call Button** — Direct phone contact  
✅ **Social Links** — GitHub, LinkedIn, Twitter, Instagram  
✅ **Newsletter** — Email subscription for updates

---

## 🛠️ Technology Stack

**Frontend:**
- HTML5 — Semantic markup
- CSS3 — Animations, gradients, flexbox
- JavaScript (Vanilla) — No React/Vue dependency
- jsPDF — Client-side PDF generation

**Backend:**
- Flask — Lightweight Python web framework
- Flask-CORS — Cross-origin requests
- SQLite — Local database
- SMTP — Gmail email service

**AI Services:**
- Sightengine API — Image AI detection
- HuggingFace — Fallback image model
- OpenRouter — GPT-3.5 text analysis

---

## 🔐 Configuration

### Gmail Setup
The app uses Gmail **App Password** for secure email:
1. Enable 2-Factor Authentication on Gmail
2. Generate App Password at [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. Update in `config.py`:
   ```python
   GMAIL_SENDER = "your-email@gmail.com"
   GMAIL_PASSWORD = "your-app-password"
   ```

### Environment Variables (Optional)
Create `.env` file for sensitive data:
```bash
SIGHTENGINE_API_USER=your_user
SIGHTENGINE_API_SECRET=your_secret
OPENROUTER_API_KEY=your_key
HUGGINGFACE_API_KEY=your_key
GMAIL_SENDER=your_email@gmail.com
GMAIL_PASSWORD=your_app_password
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
```

---

## 📊 Performance

- **Image Analysis:** 3-8 seconds (API latency)
- **Text Analysis:** 2-5 seconds (API latency)
- **Database Queries:** <100ms
- **Page Load:** <2 seconds
- **Loader Animation:** 2.4 seconds

---

## 🐛 Troubleshooting

### Backend Offline
- Ensure `python app.py` is running
- Check port 5000 is not blocked
- Verify Python dependencies: `pip list`

### Email Not Sending
- Verify 2FA is enabled on Gmail
- Check App Password is correct
- Ensure firewall allows SMTP (port 465)
- Review Flask console for error details

### API Errors
- Sightengine: Check API credentials in `config.py`
- HuggingFace: Verify API key and rate limits
- OpenRouter: Ensure sufficient credits

### Database Issues
- Delete `database.db` to reset
- Restart Flask after changes
- Check write permissions in folder

---

## 📝 Testing

Test email functionality:
```bash
python test_email.py
```

This will send a test message using the configured credentials.

---

## 👤 About

**Developer:** Raunak Gupta — Data Scientist Intern  
**Email:** rggupta01rg@gmail.com  
**GitHub:** [RaunakGupta01](https://github.com/RaunakGupta01)  
**LinkedIn:** [raunakg1](https://linkedin.com/in/raunakg1)

---

## 📄 License

This project is proprietary. All rights reserved to Raunak Gupta.

---

*OmniDetect AI — Detect the Truth*
