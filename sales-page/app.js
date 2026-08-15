// D:\Trading07\sales-page\app.js

document.addEventListener('DOMContentLoaded', () => {
  console.log('Quantum Terminal Sales Landing Page initialized.');

  // 1. SCREENSHOT GALLERY INTERACTION
  const screenshots = [
    { id: '01', title: '01. Workstation Dashboard', file: 'assets/screenshots/01-dashboard.png', desc: 'Unified multi-window workstation with dockable pane layout.' },
    { id: '02', title: '02. Watchlist & Market Explorer', file: 'assets/screenshots/02-markets.png', desc: 'Multi-asset watchlist monitoring Crypto, Forex, Indices, and Metals in real-time.' },
    { id: '03', title: '03. Financial Charting Engine', file: 'assets/screenshots/03-charting.png', desc: 'Multi-timeframe charting engine powered by TradingView Lightweight Charts with 10+ indicators.' },
    { id: '04', title: '04. Paper Execution Panel', file: 'assets/screenshots/04-paper-trading.png', desc: 'Simulated order execution with Market, Limit, and SL/TP risk parameters.' },
    { id: '05', title: '05. Portfolio & Risk Desk', file: 'assets/screenshots/05-risk-portfolio.png', desc: 'Account balance, equity curves, margin monitoring (817.42%), and drawdown analytics.' },
    { id: '06', title: '06. Market Replay Studio', file: 'assets/screenshots/06-replay-studio.png', desc: 'Historical tick replay studio for manual strategy backtesting and simulation.' },
    { id: '07', title: '07. Options Desk & Greeks', file: 'assets/screenshots/07-options-desk.png', desc: 'Call/Put option chain matrix displaying Strikes, IV, Open Interest, and Black-Scholes Greeks.' },
    { id: '08', title: '08. Quantitative Script Studio', file: 'assets/screenshots/08-script-studio.png', desc: 'Pine-style QScript editor window with syntax highlighting and compiler sandbox.' },
    { id: '09', title: '09. Market Data & Microstructure', file: 'assets/screenshots/09-market-data.png', desc: 'Orderflow microstructure, volume footprints, and WebSocket stream architecture.' },
    { id: '10', title: '10. Smart Order Router (SOR) & DOM', file: 'assets/screenshots/10-smart-order-router.png', desc: 'Level-2 orderbook depth ladder and venue route matching.' },
    { id: '11', title: '11. Quantum Mobile Pro', file: 'assets/screenshots/11-mobile-terminal.png', desc: 'Dedicated touch-optimized mobile workstation viewport (390x844).' },
    { id: '12', title: '12. System Health Diagnostics', file: 'assets/screenshots/12-system-health.png', desc: 'REST API, WebSockets, DB, and order matcher service diagnostics.' }
  ];

  const mainImg = document.getElementById('gallery-main-img');
  const mainTitle = document.getElementById('gallery-title');
  const mainDesc = document.getElementById('gallery-desc');
  const thumbsContainer = document.getElementById('gallery-thumbs');

  if (thumbsContainer && mainImg) {
    thumbsContainer.innerHTML = '';
    screenshots.forEach((sc, idx) => {
      const thumb = document.createElement('div');
      thumb.className = `thumb-item ${idx === 0 ? 'active' : ''}`;
      thumb.innerHTML = `<img src="${sc.file}" alt="${sc.title}" loading="lazy" />`;

      thumb.addEventListener('click', () => {
        document.querySelectorAll('.thumb-item').forEach(t => t.classList.remove('active'));
        thumb.classList.add('active');
        
        mainImg.style.opacity = '0.3';
        setTimeout(() => {
          mainImg.src = sc.file;
          mainTitle.textContent = sc.title;
          mainDesc.textContent = sc.desc;
          mainImg.style.opacity = '1';
        }, 150);
      });

      thumbsContainer.appendChild(thumb);
    });
  }

  // 2. FAQ ACCORDION TOGGLE
  const faqQuestions = document.querySelectorAll('.faq-question');
  faqQuestions.forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.parentElement;
      const isActive = item.classList.contains('active');
      
      // Close all FAQs
      document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('active'));
      
      if (!isActive) {
        item.classList.add('active');
      }
    });
  });

  // 3. CONTACT FORM LOCAL SUBMISSION
  const contactForm = document.getElementById('buyer-contact-form');
  const successMsg = document.getElementById('form-success-msg');

  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const name = document.getElementById('contact-name').value;
      const email = document.getElementById('contact-email').value;
      
      if (name && email) {
        contactForm.style.display = 'none';
        if (successMsg) {
          successMsg.style.display = 'block';
          successMsg.innerHTML = `
            <h4 style="color: #10b981; margin-bottom: 8px; font-size: 1.2rem;">BUYER INQUIRY RECEIVED</h4>
            <p>Thank you, <strong>${name}</strong> (${email}). Your buyer acquisition request has been logged locally in demo mode.</p>
            <p style="margin-top: 10px; font-size: 0.88rem; color: #94a3b8;">The buyer release package (Quantum-Terminal-Buyer-Release-v1.0.zip) is verified and ready for transfer.</p>
          `;
        }
      }
    });
  }
});
