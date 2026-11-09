/* =========================================
   ССЫЛКИ НА ЭЛЕМЕНТЫ
   ========================================= */
const envelopeScreen = document.getElementById('envelopeScreen');
const envelope       = document.getElementById('envelope');
const whiteFlash     = document.getElementById('whiteFlash');
const intro          = document.getElementById('videoIntro');
const placeholder    = document.getElementById('introPlaceholder');
const introVideo     = document.getElementById('introVideo');
const site           = document.getElementById('site');
const bgMusic        = document.getElementById('bgMusic');
const soundToggle    = document.getElementById('soundToggle');
const fireworksCanvas = document.getElementById('fireworksCanvas');
const miniFireworksCanvas = document.getElementById('miniFireworks');
const miniThumbsdownCanvas = document.getElementById('miniThumbsdown');
const quizToast       = document.getElementById('quizToast');
const quizToastText   = document.getElementById('quizToastText');
const quizToastActions = document.getElementById('quizToastActions');


/* =========================================
   0. СБРОС СКРОЛЛА ПРИ ЗАГРУЗКЕ
   ========================================= */
if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
}
window.scrollTo(0, 0);


/* =========================================
   0.1. ПРЕДЗАГРУЗКА
   ========================================= */
introVideo.preload = 'auto';
introVideo.load();
bgMusic.preload = 'auto';
bgMusic.load();


/* =========================================
   0.2. АВТОПЛЕЙ ВИДЕО В КАРУСЕЛИ
   ========================================= */
(function () {
    const carouselVideos = document.querySelectorAll('.carousel__video');
    if (!carouselVideos.length) return;

    function forcePlay(video) {
        video.muted = true;
        video.loop = true;
        video.playsInline = true;
        video.setAttribute('muted', '');
        video.setAttribute('playsinline', '');

        const tryPlay = () => {
            const p = video.play();
            if (p !== undefined) {
                p.catch(() => {
                    setTimeout(tryPlay, 400);
                });
            }
        };
        tryPlay();
    }

    carouselVideos.forEach(video => {
        forcePlay(video);
        video.addEventListener('pause', () => {
            setTimeout(() => {
                if (video.paused) forcePlay(video);
            }, 100);
        });
        video.addEventListener('stalled', () => forcePlay(video));

        if (video.readyState >= 2) {
            forcePlay(video);
        } else {
            video.addEventListener('canplay', () => forcePlay(video), { once: true });
            video.addEventListener('loadeddata', () => forcePlay(video), { once: true });
        }

        if ('IntersectionObserver' in window) {
            const io = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        forcePlay(video);
                    }
                });
            }, { threshold: 0.05 });
            io.observe(video);
        }
    });

    setInterval(() => {
        carouselVideos.forEach(video => {
            if (video.paused && video.readyState >= 2) {
                forcePlay(video);
            }
        });
    }, 2000);
})();


/* =========================================
   ПРОВЕРКА ДЛЯ САЛЮТА
   ========================================= */
const FIREWORKS_ENABLED = (() => {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return false;
    }
    const testCanvas = document.createElement('canvas');
    if (!testCanvas.getContext || !testCanvas.getContext('2d')) {
        return false;
    }
    if (typeof navigator.hardwareConcurrency === 'number' && navigator.hardwareConcurrency <= 4) {
        return false;
    }
    if (typeof navigator.deviceMemory === 'number' && navigator.deviceMemory <= 4) {
        return false;
    }
    return true;
})();


/* =========================================
   МОДУЛЬ САЛЮТА (на видео)
   ========================================= */
const Fireworks = (() => {
    const canvas = fireworksCanvas;
    if (!canvas) return { start: () => {}, stop: () => {} };
    const ctx = canvas.getContext('2d', { alpha: true });

    let particles = [];
    let rockets = [];
    let animationId = null;
    let running = false;
    let dpr = 1;

    const MAX_PARTICLES = 350;
    const PARTICLES_PER_BURST = 28;
    const ROCKETS_INTERVAL = 650;
    const TARGET_FPS = 45;
    const FRAME_INTERVAL = 1000 / TARGET_FPS;
    let lastFrameTime = 0;

    const COLORS = ['#c96f4a', '#d9a05b', '#e8b88a', '#f5d6a8', '#a4542f'];

    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        const rect = canvas.getBoundingClientRect();
        canvas.width  = rect.width  * dpr;
        canvas.height = rect.height * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function spawnRocket() {
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        rockets.push({
            x: w * (0.15 + Math.random() * 0.7),
            y: h + 10,
            vx: (Math.random() - 0.5) * 1.2,
            vy: -(h * 0.012 + Math.random() * 2),
            targetY: h * (0.15 + Math.random() * 0.35),
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
        });
    }

    function explode(x, y, baseColor) {
        const available = MAX_PARTICLES - particles.length;
        if (available <= 0) return;
        const count = Math.min(PARTICLES_PER_BURST, available);
        const speedBase = 1.8 + Math.random() * 1.5;

        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
            const speed = speedBase * (0.6 + Math.random() * 0.6);
            const color = Math.random() < 0.7 ? baseColor : COLORS[Math.floor(Math.random() * COLORS.length)];
            particles.push({
                x, y, prevX: x, prevY: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1,
                decay: 0.015 + Math.random() * 0.015,
                color,
                size: 1.4 + Math.random() * 1.4,
            });
        }
    }

    function tick(now) {
        if (now - lastFrameTime < FRAME_INTERVAL) {
            animationId = requestAnimationFrame(tick);
            return;
        }
        lastFrameTime = now;

        const w = canvas.clientWidth;
        const h = canvas.clientHeight;

        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        ctx.clearRect(0, 0, w, h);
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineCap = 'round';

        for (let i = rockets.length - 1; i >= 0; i--) {
            const r = rockets[i];
            const px = r.x, py = r.y;
            r.x += r.vx;
            r.y += r.vy;
            r.vy += 0.05;

            ctx.strokeStyle = r.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(r.x, r.y);
            ctx.stroke();

            if (r.y <= r.targetY || r.vy >= 0) {
                explode(r.x, r.y, r.color);
                rockets.splice(i, 1);
            }
        }

        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.prevX = p.x;
            p.prevY = p.y;
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.03;
            p.vx *= 0.99;
            p.vy *= 0.99;
            p.life -= p.decay;

            if (p.life <= 0) {
                particles.splice(i, 1);
                continue;
            }

            ctx.globalAlpha = p.life;
            ctx.strokeStyle = p.color;
            const trail = 1 + p.life * 2.5;
            ctx.lineWidth = p.size;
            ctx.beginPath();
            ctx.moveTo(p.prevX - p.vx * trail, p.prevY - p.vy * trail);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
        }

        ctx.globalAlpha = 1;
        animationId = requestAnimationFrame(tick);
    }

    let rocketInterval = null;

    return {
        start() {
            if (!FIREWORKS_ENABLED) return;
            if (running) return;
            running = true;
            resize();
            window.addEventListener('resize', resize);
            for (let i = 0; i < 2; i++) setTimeout(() => spawnRocket(), i * 200);
            rocketInterval = setInterval(spawnRocket, ROCKETS_INTERVAL);
            lastFrameTime = performance.now();
            animationId = requestAnimationFrame(tick);
        },
        stop() {
            if (!running) return;
            running = false;
            clearInterval(rocketInterval);
            cancelAnimationFrame(animationId);
            window.removeEventListener('resize', resize);
            canvas.classList.add('hidden');
            setTimeout(() => {
                particles = [];
                rockets = [];
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }, 700);
        }
    };
})();


/* =========================================
   МИНИ-САЛЮТ ДЛЯ ПРАВИЛЬНОГО ОТВЕТА
   ========================================= */
const MiniFireworks = (() => {
    const canvas = miniFireworksCanvas;
    if (!canvas) return { playAt: () => {} };
    const ctx = canvas.getContext('2d');
    let particles = [];
    let animationId = null;
    let dpr = 1;
    let startTime = 0;
    const DURATION = 1600;

    const COLORS = ['#c96f4a', '#d9a05b', '#e8b88a', '#f5d6a8', '#a4542f'];

    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        const rect = canvas.getBoundingClientRect();
        canvas.width  = rect.width  * dpr;
        canvas.height = rect.height * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function burstAt(x, y) {
        const count = 28;
        const color = COLORS[Math.floor(Math.random() * COLORS.length)];
        const speedBase = 2 + Math.random() * 2;

        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
            const speed = speedBase * (0.5 + Math.random() * 0.8);
            particles.push({
                x, y, prevX: x, prevY: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1,
                decay: 0.025 + Math.random() * 0.02,
                color,
                size: 1.5 + Math.random() * 1.5,
            });
        }
    }

    function tick(now) {
        if (now - startTime > DURATION) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            canvas.classList.remove('active');
            cancelAnimationFrame(animationId);
            particles = [];
            return;
        }

        const w = canvas.clientWidth;
        const h = canvas.clientHeight;

        ctx.globalCompositeOperation = 'source-over';
        ctx.clearRect(0, 0, w, h);
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineCap = 'round';

        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.prevX = p.x;
            p.prevY = p.y;
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.04;
            p.vx *= 0.98;
            p.vy *= 0.98;
            p.life -= p.decay;

            if (p.life <= 0) {
                particles.splice(i, 1);
                continue;
            }

            ctx.globalAlpha = p.life;
            ctx.strokeStyle = p.color;
            const trail = 1 + p.life * 2;
            ctx.lineWidth = p.size;
            ctx.beginPath();
            ctx.moveTo(p.prevX - p.vx * trail, p.prevY - p.vy * trail);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
        }

        ctx.globalAlpha = 1;
        animationId = requestAnimationFrame(tick);
    }

    return {
        playAt(screenX, screenY) {
            resize();
            canvas.classList.add('active');
            particles = [];
            startTime = performance.now();

            burstAt(screenX, screenY);
            setTimeout(() => burstAt(screenX - 60, screenY - 40), 120);
            setTimeout(() => burstAt(screenX + 60, screenY - 40), 240);

            cancelAnimationFrame(animationId);
            animationId = requestAnimationFrame(tick);
        }
    };
})();


/* =========================================
   МИНИ-ДИЗЛАЙК (👎) ДЛЯ НЕПРАВИЛЬНОГО ОТВЕТА
   ========================================= */
const MiniThumbsdown = (() => {
    const canvas = miniThumbsdownCanvas;
    if (!canvas) return { playAt: () => {} };
    const ctx = canvas.getContext('2d');
    let thumbs = [];
    let animationId = null;
    let dpr = 1;
    let startTime = 0;
    let active = false;
    const DURATION = 1300;

    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        const rect = canvas.getBoundingClientRect();
        canvas.width  = rect.width  * dpr;
        canvas.height = rect.height * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function spawnThumb(x, y) {
        thumbs.push({
            x,
            y,
            vx: (Math.random() - 0.5) * 2,
            vy: -(2.5 + Math.random() * 1.5),
            gravity: 0.08,
            life: 1,
            decay: 0.012,
            size: 28 + Math.random() * 14,
            rotate: (Math.random() - 0.5) * 0.4,
            rotation: 0,
        });
    }

    function tick(now) {
        if (now - startTime > DURATION && thumbs.length === 0) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            canvas.classList.remove('active');
            cancelAnimationFrame(animationId);
            active = false;
            return;
        }

        const w = canvas.clientWidth;
        const h = canvas.clientHeight;

        ctx.globalCompositeOperation = 'source-over';
        ctx.clearRect(0, 0, w, h);

        for (let i = thumbs.length - 1; i >= 0; i--) {
            const t = thumbs[i];
            t.x += t.vx;
            t.y += t.vy;
            t.vy += t.gravity;
            t.rotation += t.rotate;
            t.life -= t.decay;

            if (t.life <= 0) {
                thumbs.splice(i, 1);
                continue;
            }

            ctx.save();
            ctx.globalAlpha = Math.min(1, t.life * 1.5);
            ctx.translate(t.x, t.y);
            ctx.rotate(t.rotation);
            ctx.font = `${t.size}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('👎', 0, 0);
            ctx.restore();
        }

        animationId = requestAnimationFrame(tick);
    }

    return {
        playAt(screenX, screenY) {
            resize();
            canvas.classList.add('active');

            const count = 6;
            for (let i = 0; i < count; i++) {
                const offsetX = (Math.random() - 0.5) * 40;
                const offsetY = (Math.random() - 0.5) * 20;
                spawnThumb(screenX + offsetX, screenY + offsetY);
            }

            if (!active) {
                active = true;
                startTime = performance.now();
                cancelAnimationFrame(animationId);
                animationId = requestAnimationFrame(tick);
            }
        }
    };
})();


/* =========================================
   1. КОНВЕРТ → ПИСЬМО → БЕЛЫЙ ЭКРАН → ВИДЕО
   ========================================= */
(function () {
    let started = false;
    let fireworksStarted = false;

    bgMusic.volume = 0.35;
    introVideo.muted = true;
    introVideo.playsInline = true;

    function startVideoAndMusic() {
        bgMusic.play().catch(() => {
            soundToggle.classList.add('muted');
            soundToggle.setAttribute('aria-label', 'Включить звук');
            soundToggle.setAttribute('title', 'Включить звук');
        });

        intro.classList.remove('hidden');
        placeholder.classList.add('hidden');
        fireworksStarted = false;

        if (FIREWORKS_ENABLED) {
            fireworksCanvas.classList.remove('hidden');
        } else {
            fireworksCanvas.classList.add('hidden');
        }

        const FIREWORKS_TIME = 11;

        function onTimeUpdate() {
            if (fireworksStarted) return;
            if (!FIREWORKS_ENABLED) return;
            if (introVideo.currentTime >= FIREWORKS_TIME) {
                fireworksStarted = true;
                Fireworks.start();
            }
        }
        introVideo.addEventListener('timeupdate', onTimeUpdate);

        const p = introVideo.play();
        if (p !== undefined) {
            p.then(() => {
                introVideo.classList.add('visible');
            }).catch(() => {
                closeIntro();
            });
        } else {
            introVideo.classList.add('visible');
        }
    }

    function closeIntro() {
        Fireworks.stop();
        intro.classList.add('hidden');
        site.classList.add('visible');
        window.scrollTo(0, 0);
        setTimeout(() => { intro.style.display = 'none'; }, 900);
    }

    introVideo.addEventListener('ended', closeIntro);
    introVideo.addEventListener('error', closeIntro);

    envelope.addEventListener('click', () => {
        if (started) return;
        started = true;

        envelope.classList.add('open');

        setTimeout(() => {
            envelope.classList.add('zooming');
        }, 1100);

        setTimeout(() => {
            whiteFlash.classList.add('active');
            startVideoAndMusic();
        }, 2400);

        setTimeout(() => {
            whiteFlash.classList.remove('active');
            envelopeScreen.classList.add('hidden');
            setTimeout(() => {
                envelopeScreen.style.display = 'none';
            }, 600);
        }, 2800);
    });
})();


/* =========================================
   2. КНОПКА MUTE
   ========================================= */
soundToggle.addEventListener('click', () => {
    const isMuted = soundToggle.classList.toggle('muted');

    if (isMuted) {
        bgMusic.pause();
        soundToggle.setAttribute('aria-label', 'Включить звук');
        soundToggle.setAttribute('title', 'Включить звук');
    } else {
        bgMusic.play().catch(() => {});
        soundToggle.setAttribute('aria-label', 'Выключить звук');
        soundToggle.setAttribute('title', 'Выключить звук');
    }
});


/* =========================================
   3. КАРУСЕЛЬ (КАК РАНЬШЕ)
   ========================================= */
(function () {
    const scene = document.getElementById('carouselScene');
    const carousel = document.getElementById('carousel');
    if (!scene || !carousel) return;
    const items = Array.from(carousel.querySelectorAll('.carousel__item'));
    if (items.length === 0) return;

    const itemCount = items.length;

    function computeRadius() {
        const itemWidth = items[0].offsetWidth || 260;
        return (itemWidth / 2) / Math.tan(Math.PI / itemCount) * 1.1;
    }

    let radius = computeRadius();

    function layout() {
        radius = computeRadius();
        items.forEach((item, i) => {
            const angle = (360 / itemCount) * i;
            item.style.transform = `rotateY(${angle}deg) translateZ(${radius}px)`;
        });
    }
    layout();
    window.addEventListener('resize', layout);

    let rotation = 0;
    const autoSpeed = -0.15;
    let velocity = 0;
    let isDragging = false;
    let lastX = 0;
    let lastDragVelocity = 0;
    let lastMoveTime = 0;
    const friction = 0.96;

    function applyRotation() {
        carousel.style.transform = `translate(-50%, -50%) rotateY(${rotation}deg)`;
    }

    function animate() {
        if (!isDragging) {
            if (Math.abs(velocity) > 0.01) {
                rotation += velocity;
                velocity *= friction;
            } else {
                rotation += autoSpeed;
            }
        }
        applyRotation();
        requestAnimationFrame(animate);
    }
    applyRotation();
    requestAnimationFrame(animate);

    function pointerDown(e) {
        isDragging = true;
        scene.classList.add('dragging');
        lastX = getClientX(e);
        velocity = 0;
        lastDragVelocity = 0;
        lastMoveTime = performance.now();
    }

    function pointerMove(e) {
        if (!isDragging) return;
        const x = getClientX(e);
        const dx = x - lastX;
        lastX = x;
        const deltaRot = dx * 0.3;
        rotation += deltaRot;
        const now = performance.now();
        const dt = Math.max(now - lastMoveTime, 1);
        lastDragVelocity = (deltaRot * 16) / dt;
        lastMoveTime = now;
        applyRotation();
    }

    function pointerUp() {
        if (!isDragging) return;
        isDragging = false;
        scene.classList.remove('dragging');
        velocity = lastDragVelocity;
    }

    function getClientX(e) {
        return e.touches && e.touches.length ? e.touches[0].clientX : e.clientX;
    }

    scene.addEventListener('mousedown', pointerDown);
    window.addEventListener('mousemove', pointerMove);
    window.addEventListener('mouseup', pointerUp);
    scene.addEventListener('touchstart', pointerDown, { passive: true });
    window.addEventListener('touchmove', pointerMove, { passive: true });
    window.addEventListener('touchend', pointerUp);
    scene.addEventListener('dragstart', (e) => e.preventDefault());
})();


/* =========================================
   4. ТАЙМЕР — 10 ноября 2024, 00:00
   ========================================= */
const startDate = new Date(2024, 10, 10, 0, 0, 0);

function updateTimer() {
    const now  = new Date();
    const diff = now - startDate;

    if (diff < 0) {
        document.getElementById('days').textContent    = '0';
        document.getElementById('hours').textContent   = '00';
        document.getElementById('minutes').textContent = '00';
        document.getElementById('seconds').textContent = '00';
        return;
    }

    const days    = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours   = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    document.getElementById('days').textContent    = days;
    document.getElementById('hours').textContent   = String(hours).padStart(2, '0');
    document.getElementById('minutes').textContent = String(minutes).padStart(2, '0');
    document.getElementById('seconds').textContent = String(seconds).padStart(2, '0');
}

updateTimer();
setInterval(updateTimer, 1000);


/* =========================================
   5. ВИКТОРИНА
   ========================================= */
(function () {
    const QUIZ_DATA = [
        { question: 'Как мы назвали собаку, с которой тусили на детской площадке?', options: ['Эверес', 'Соня', 'Шарик', 'Рэй'], correctIndex: 0 },
        { question: 'Сколько по времени мы сидели на кухне на нашу вторую бухаловку?', options: ['13 часов', '14 часов', '15 часов', '16 часов'], correctIndex: 3 },
        { question: 'Как называлась песня, которую я тебе посвятил на прошлую годовщину?', options: ['Ты', 'Ты мой мир', 'Люблю', 'Для Лины'], correctIndex: 1 },
        { question: 'Что я тебе подарил на прошлую годовщину?', options: ['Сумку', 'Кольцо', 'Столик', 'Сапоги'], correctIndex: 2 },
        { question: 'Моя любимая книга (по ней есть экранизация)?', options: ['Кладбище домашних животных', 'Мстители', 'Не ной', 'Герой'], correctIndex: 0 }
    ];

    const CORRECT_PHRASES = [
        'Я называл её Эверест',
        'Почти как смена в охране',
        'Кринж, согласен. Зато с душой!',
        ':0',
        'Стивен Кинг ван лав'
    ];

    const WRONG_PHRASES = [
        'давай ещё раз',
        'че ахирела?',
        'да уж...',
        'не ожидал',
        'ты точно моя девушка?'
    ];

    const quizBody       = document.getElementById('quizBody');
    const quizResult     = document.getElementById('quizResult');
    const quizResultText = document.getElementById('quizResultText');
    const quizRestart    = document.getElementById('quizRestart');
    const quizOpenInput  = document.getElementById('quizOpenInput');
    const quizSend       = document.getElementById('quizSend');
    const quizSendStatus = document.getElementById('quizSendStatus');

    let userAnswers = [];

    function showToast(text, isCorrect, retryCallback) {
        quizToast.className = 'quiz-toast ' + (isCorrect ? 'correct' : 'wrong');
        quizToastText.textContent = text;
        quizToastActions.innerHTML = '';

        if (!isCorrect && retryCallback) {
            const retryBtn = document.createElement('button');
            retryBtn.className = 'quiz-toast__btn';
            retryBtn.textContent = 'Попробовать снова';
            retryBtn.addEventListener('click', () => {
                hideToast();
                retryCallback();
            });
            quizToastActions.appendChild(retryBtn);
        }

        const closeBtn = document.createElement('button');
        closeBtn.className = 'quiz-toast__btn secondary';
        closeBtn.textContent = 'Дальше';
        closeBtn.addEventListener('click', hideToast);
        quizToastActions.appendChild(closeBtn);

        quizToast.classList.add('show');

        if (isCorrect) {
            setTimeout(() => {
                if (quizToast.classList.contains('show')) hideToast();
            }, 2500);
        }
    }

    function hideToast() {
        quizToast.classList.remove('show');
    }

    function renderQuiz() {
        userAnswers = new Array(QUIZ_DATA.length).fill(-1);
        quizBody.innerHTML = '';
        quizResult.classList.add('hidden');
        quizOpenInput.value = '';
        quizSendStatus.textContent = '';
        quizSendStatus.className = 'quiz-send-status';
        quizSend.disabled = false;
        quizSend.textContent = 'Отправить ответ';
        quizOpenInput.disabled = false;

        QUIZ_DATA.forEach((q, qIndex) => {
            const questionEl = document.createElement('div');
            questionEl.className = 'quiz-question';
            questionEl.dataset.q = qIndex;

            const textEl = document.createElement('div');
            textEl.className = 'quiz-question-text';
            textEl.innerHTML = `<span class="quiz-question-num">${qIndex + 1}.</span>${q.question}`;
            questionEl.appendChild(textEl);

            const optionsEl = document.createElement('div');
            optionsEl.className = 'quiz-options';

            q.options.forEach((option, oIndex) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'quiz-option';
                btn.dataset.q = qIndex;
                btn.dataset.o = oIndex;
                btn.innerHTML = `<span class="quiz-option__dot"></span><span>${option}</span>`;
                btn.addEventListener('click', () => selectAnswer(qIndex, oIndex, optionsEl, btn));
                optionsEl.appendChild(btn);
            });

            questionEl.appendChild(optionsEl);
            quizBody.appendChild(questionEl);
        });
    }

    function selectAnswer(qIndex, oIndex, optionsEl, clickedBtn) {
        if (userAnswers[qIndex] !== -1) return;

        const q = QUIZ_DATA[qIndex];
        const buttons = optionsEl.querySelectorAll('.quiz-option');
        const isCorrect = oIndex === q.correctIndex;

        const rect = clickedBtn.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;

        if (isCorrect) {
            userAnswers[qIndex] = oIndex;
            buttons.forEach((btn, i) => {
                btn.classList.add('disabled');
                if (i === q.correctIndex) btn.classList.add('correct');
            });
            MiniFireworks.playAt(x, y);
            showToast(CORRECT_PHRASES[qIndex], true);

            if (!userAnswers.includes(-1)) {
                setTimeout(showResult, 2600);
            }
        } else {
            MiniThumbsdown.playAt(x, y);
            const phrase = WRONG_PHRASES[Math.floor(Math.random() * WRONG_PHRASES.length)];

            clickedBtn.classList.add('wrong');

            showToast(phrase, false, () => {
                clickedBtn.classList.remove('wrong');
            });
        }
    }

    function showResult() {
        let correctCount = 0;
        userAnswers.forEach((ans, i) => {
            if (ans === QUIZ_DATA[i].correctIndex) correctCount++;
        });

        const total = QUIZ_DATA.length;
        let message = '';

        if (correctCount === total) message = `Идеально! ${correctCount} из ${total}. Ты помнишь всё.`;
        else if (correctCount >= total * 0.7) message = `Отлично! ${correctCount} из ${total}. Память тебя не подводит.`;
        else if (correctCount >= total * 0.4) message = `Неплохо! ${correctCount} из ${total}. Но кое-что стоит вспомнить.`;
        else message = `Хм... ${correctCount} из ${total}. Придётся пересмотреть наши фото.`;

        quizResultText.textContent = message;
        quizResult.classList.remove('hidden');
        quizResult.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    const TELEGRAM_TOKEN = '9013283409:AAG3QYE6o2Ngp4nqnKw-QSOqOhz5FafNYb0';
    const TELEGRAM_CHAT_ID = '1064726614';

    quizSend.addEventListener('click', async () => {
        const answer = quizOpenInput.value.trim();
        if (!answer) {
            quizSendStatus.textContent = 'Сначала напиши ответ :)';
            quizSendStatus.className = 'quiz-send-status err';
            return;
        }

        quizSend.disabled = true;
        quizSend.textContent = 'Отправляю...';
        quizSendStatus.textContent = '';
        quizSendStatus.className = 'quiz-send-status';

        const text = `Ответ на 6-й вопрос (годовщина):\n\n${answer}`;

        try {
            const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: text })
            });

            const data = await response.json();

            if (data.ok) {
                quizSendStatus.textContent = 'Отправлено! Спасибо ❤';
                quizSendStatus.className = 'quiz-send-status ok';
                quizSend.textContent = 'Отправлено';
                quizOpenInput.disabled = true;
                showToast('Верно!', true);
            } else {
                throw new Error('Telegram error');
            }
        } catch (err) {
            quizSendStatus.textContent = 'Не удалось отправить. Попробуй ещё раз.';
            quizSendStatus.className = 'quiz-send-status err';
            quizSend.disabled = false;
            quizSend.textContent = 'Отправить ответ';
        }
    });

    quizRestart.addEventListener('click', renderQuiz);
    renderQuiz();
})();


/* =========================================
   6. КНОПКА В ФИНАЛЕ
   ========================================= */
const heartBtn  = document.getElementById('heartBtn');
const finalNote = document.getElementById('finalNote');
const messages = [
    'И не спал всю ночь!'
];
let clickCount = 0;

heartBtn.addEventListener('click', () => {
    finalNote.textContent = messages[clickCount % messages.length];
    finalNote.classList.remove('show');
    void finalNote.offsetWidth;
    finalNote.classList.add('show');
    clickCount++;
});


/* =========================================
   7. ПОЯВЛЕНИЕ СЕКЦИЙ ПРИ СКРОЛЛЕ
   ========================================= */
const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, { threshold: 0.15 });

document.querySelectorAll('.carousel-section, .timer-section, .feelings, .quiz, .final').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'opacity 0.9s ease, transform 0.9s ease';
    observer.observe(el);
});
