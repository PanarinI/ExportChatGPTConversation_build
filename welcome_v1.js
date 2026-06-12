// ── NAVIGATION LOGIC ─────────────────────────────────────────────────────────
// True when running as an installed extension (chrome-extension:// protocol).
// On GitHub Pages or any regular website these APIs are unavailable.
const isExtension = typeof chrome !== 'undefined' &&
    !!chrome.tabs &&
    !!chrome.storage;

function goToChatGPT() {
    if (!isExtension) {
        // Fallback for GitHub Pages / standalone viewing:
        // just open ChatGPT in a new tab
        window.open('https://chatgpt.com', '_blank');
        return;
    }

    // Set flag so the content script shows the ripple hint on arrival
    chrome.storage.local.set({pdfcrowdHighlightBtn: true});

    chrome.tabs.query(
        {url: ['*://chatgpt.com/*', '*://chat.com/*']},
        function(tabs) {
            if (!tabs || tabs.length === 0) {
                chrome.tabs.create({url: 'https://chatgpt.com'});
                return;
            }

            // Prefer a tab that's already in a conversation
            const conversationTab = tabs.find(function(t) {
                return t.url && /chatgpt\.com\/c\//.test(t.url);
            });
            const target = conversationTab || tabs[0];

            // Activate the tab, then reload so the content script injects
            chrome.tabs.update(target.id, {active: true}, function() {
                chrome.tabs.reload(target.id);
            });
        }
    );
}

document.getElementById('export-btn').addEventListener('click', goToChatGPT);
document.getElementById('bottom-link').addEventListener('click', goToChatGPT);

// ── CONFETTI ──────────────────────────────────────────────────────────────────
(function(){
    const canvas = document.getElementById('confetti-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth * 0.5;
    canvas.height = window.innerHeight;
    const colors = ['#ff6030','#ff9a3d','#ffcc80','#ff4d1f','#ffb347','#fff0e0','#e85d04'];
    const pieces = [];
    const COUNT = 120;
    for(let i = 0; i < COUNT; i++){
        pieces.push({
            x: Math.random() * canvas.width * 0.7,
            y: -20 - Math.random() * 300,
            w: 8 + Math.random() * 8,
            h: 4 + Math.random() * 5,
            color: colors[Math.floor(Math.random() * colors.length)],
            angle: Math.random() * Math.PI * 2,
            spin: (Math.random() - .5) * .18,
            vx: (Math.random() - .3) * 3,
            vy: 2.5 + Math.random() * 3.5,
            opacity: 1,
            delay: Math.random() * 60
        });
    }
    let frame = 0;
    function draw(){
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let alive = 0;
        pieces.forEach(function(p){
            if(frame < p.delay) return;
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.07;
            p.angle += p.spin;
            if(p.y > canvas.height * 0.85) p.opacity -= 0.035;
            if(p.opacity <= 0) return;
            alive++;
            ctx.save();
            ctx.globalAlpha = Math.max(0, p.opacity);
            ctx.translate(p.x, p.y);
            ctx.rotate(p.angle);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h);
            ctx.restore();
        });
        frame++;
        if(alive > 0 || frame < 80) requestAnimationFrame(draw);
        else ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    draw();
})();

// ── ARROW ─────────────────────────────────────────────────────────────────────
window.addEventListener('load', function(){
    function placeArrow(){
        const title = document.getElementById('congrats-title');
        const btn   = document.getElementById('export-btn');
        const svg   = document.getElementById('arrow-svg');
        if(!title || !btn || !svg) return;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const tRect = title.getBoundingClientRect();
        const bRect = btn.getBoundingClientRect();
        const scaleX = 1920 / vw;
        const scaleY = 1080 / vh;
        const sx = (tRect.left + tRect.width * 0.65) * scaleX;
        const sy = (tRect.top + 10) * scaleY;
        const ex = (bRect.left + 30) * scaleX;
        const ey = (bRect.bottom + 18) * scaleY;
        const cx = (sx + ex) / 2 + 40;
        const cy = sy - (sy - ey) * 0.3;
        document.getElementById('arrow-path')
            .setAttribute('d', `M${sx},${sy} Q${cx},${cy} ${ex},${ey}`);
    }
    setTimeout(placeArrow, 400);
    window.addEventListener('resize', placeArrow);
});
