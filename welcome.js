'use strict';

// ── i18n ──────────────────────────────────────────────────────────────────────
var isRu = false // (navigator.language || '').toLowerCase().startsWith('ru');

var strings = {
    newChat:        isRu ? 'Новый чат'          : 'New chat',
    search:         isRu ? 'Искать чаты'        : 'Search chats',
    exportBtn:      isRu ? 'Экспорт'            : 'Export',
    share:          isRu ? 'Поделиться'         : 'Share',
    placeholder:    isRu ? 'Спросите ChatGPT'   : 'Ask ChatGPT',
    congratsTitle:  isRu ? 'Поздравляем!'       : 'Congratulations!',
    aiMsg: isRu
        ? 'Теперь вы можете экспортировать любой чат в PDF — ' +
          'прямо из ChatGPT, в один клик.<br><br>' +
          'Нажмите кнопку в правом верхнем углу: ' +
          '<span class="hl" id="arrow-anchor">Экспорт</span>'
        : 'You can now export any conversation to PDF — ' +
          'right from ChatGPT, in one click.<br><br>' +
          'Click the button in the top-right corner: ' +
          '<span class="hl" id="arrow-anchor">Export</span>',
};

// ── Fill text content ─────────────────────────────────────────────────────────
[
    ['txt-new-chat',    strings.newChat],
    ['txt-search',      strings.search],
    ['txt-export',      strings.exportBtn],
    ['txt-share',       strings.share],
    ['txt-placeholder', strings.placeholder],
    ['congrats-title',  strings.congratsTitle],
].forEach(function(pair) {
    var el = document.getElementById(pair[0]);
    if (el) el.textContent = pair[1];
});

document.getElementById('ai-text').innerHTML = strings.aiMsg;

// ── Navigation ────────────────────────────────────────────────────────────────
var EXTENSION_ID = 'aighdeikamhkemngfanhnamdlpoceimo';

function goToChatGPT() {
    // Try to communicate with the extension for smart tab navigation
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        try {
            chrome.runtime.sendMessage(EXTENSION_ID, {action: 'openChatGPT'}, function(response) {
                if (chrome.runtime.lastError || !response) {
                    // Extension not installed or can't communicate — fallback
                    window.open('https://chatgpt.com', '_blank');
                }
                // If successful, extension handles the navigation
            });
            return;
        } catch(e) {}
    }
    // Fallback for non-Chrome or extension not installed
    window.open('https://chatgpt.com', '_blank');
}

document.getElementById('export-btn').addEventListener('click', goToChatGPT);

// ── Confetti ──────────────────────────────────────────────────────────────────
(function() {
    var canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    canvas.width  = window.innerWidth * 0.5;
    canvas.height = window.innerHeight;

    var colors = ['#ff6030','#ff9a3d','#ffcc80','#ff4d1f','#ffb347','#fff0e0','#e85d04'];
    var pieces = [];
    var COUNT = 120;
    for (var i = 0; i < COUNT; i++) {
        pieces.push({
            x:       Math.random() * canvas.width * 0.7,
            y:      -20 - Math.random() * 300,
            w:       8  + Math.random() * 8,
            h:       4  + Math.random() * 5,
            color:   colors[Math.floor(Math.random() * colors.length)],
            angle:   Math.random() * Math.PI * 2,
            spin:   (Math.random() - 0.5) * 0.18,
            vx:     (Math.random() - 0.3) * 3,
            vy:      2.5 + Math.random() * 3.5,
            opacity: 1,
            delay:   Math.random() * 60
        });
    }

    var frame = 0;
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        var alive = 0;
        pieces.forEach(function(p) {
            if (frame < p.delay) return;
            p.x  += p.vx;
            p.y  += p.vy;
            p.vy += 0.07;
            p.angle += p.spin;
            if (p.y > canvas.height * 0.85) p.opacity -= 0.035;
            if (p.opacity <= 0) return;
            alive++;
            ctx.save();
            ctx.globalAlpha = Math.max(0, p.opacity);
            ctx.translate(p.x, p.y);
            ctx.rotate(p.angle);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
            ctx.restore();
        });
        frame++;
        if (alive > 0 || frame < 80) {
            requestAnimationFrame(draw);
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }
    draw();
})();

// ── Arrow ─────────────────────────────────────────────────────────────────────
// Starts from BELOW the "Export" word in the message so the line
// doesn't pass through the text itself.
function drawArrow() {
    var anchor  = document.getElementById('arrow-anchor');
    var btn     = document.getElementById('export-btn');
    var overlay = document.getElementById('arrow-overlay');
    var path    = document.getElementById('arrow-path');
    if (!anchor || !btn || !overlay || !path) return;

    var a = anchor.getBoundingClientRect();
    var b = btn.getBoundingClientRect();

    // Start: below the center of the highlighted word
    var sx = a.left + a.width / 2;
    var sy = a.bottom + 10;

    // End: just below the Export button center (arrowhead points upward into button)
    var ex = b.left + b.width / 2;
    var ey = b.bottom + 5;

    // Cubic bezier: first ctrl goes right at start height,
    // second comes from well below end so tangent arrives pointing straight up
    var c1x = sx + (ex - sx) * 0.5;
    var c1y = sy + 20;
    var c2x = ex;
    var c2y = ey + 80;

    path.setAttribute('d',
        'M ' + sx + ' ' + sy +
        ' C ' + c1x + ' ' + c1y +
        ' '   + c2x + ' ' + c2y +
        ' '   + ex  + ' ' + ey
    );
    overlay.classList.add('visible');
}

window.addEventListener('load', function() {
    setTimeout(drawArrow, 650);
    window.addEventListener('resize', function() {
        setTimeout(drawArrow, 80);
    });
});
