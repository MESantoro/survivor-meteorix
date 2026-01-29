// --- CONFIGURACIÓN SUPABASE ---
const SB_URL = "https://biewptbpcxvblcwslzlh.supabase.co";
const SB_KEY = "sb_publishable_lHI2Tii8tbiWAWcLI4gUrQ_awH5lPsf";

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- ASSETS ---
const imgMeteoro = new Image(); imgMeteoro.src = 'assets/meteorito.png';
const imgExplosion = new Image(); imgExplosion.src = 'assets/explosion.png';
const imgBg = new Image(); imgBg.src = 'assets/suvivor_meteorix.png';
const sndGolpe = new Audio('assets/golpe.mp3');

const bossSkins = ['assets/alien.png', 'assets/alien1.png', 'assets/alien2.png'];
const imgAlien = new Image(); 

const playerSkins = { 'J': 'assets/jugador.png', 'J1': 'assets/jugador1.png', 'JF': 'assets/jugadorF.png', 'JF1': 'assets/jugadorF1.png' };
let imgActual = new Image();

// --- ESTADO ---
let score = 0, level = 1, gameActive = false, isPaused = false;
let obstacles = [], bossProjectiles = [], playerProjectiles = [], powerUps = [];
let bossActive = false, bossDefeated = false, defeatTimer = 0;
let lives = 3, invulnerable = 0, weaponLevel = 0, weaponTimer = 0;
const keys = {};

let player = { x: 50, y: 340, w: 50, h: 60, dy: 0, speed: 6, jumpPower: 12, gravity: 0.6, grounded: true, jumpCount: 0 };
let boss = { x: 850, y: 200, w: 140, h: 140, health: 5, maxHealth: 5, angle: 0 };

// --- INTERFAZ ---
function abrirManual() {
    const modal = document.getElementById('manualModal');
    modal.innerHTML = `<div style="background: rgba(0,0,0,0.95); border: 3px solid #ff00ff; padding: 25px; color: white; font-family: 'Courier New'; max-width: 400px; margin: 20px auto; border-radius: 15px; box-shadow: 0 0 20px #ff00ff; font-size:14px;">
        <h2 style="color:#ff00ff; text-align:center">🛸 MANUAL</h2>
        <p>• <b>PAUSA:</b> ESC o botón ||.</p>
        <p>• <b>DISPARO:</b> A o botón A.</p>
        <p>• <b>SALTO:</b> Espacio o flecha ↑.</p>
        <button onclick="cerrarManual()" style="width:100%; background:#ff00ff; color:white; border:none; padding:10px; cursor:pointer; font-weight:bold;">¡OK!</button>
    </div>`;
    modal.style.display = 'block';
}
function cerrarManual() { document.getElementById('manualModal').style.display = 'none'; }

function seleccionarPersonaje(id) {
    imgActual.src = playerSkins[id];
    imgActual.onload = () => { 
        document.getElementById('menu').style.display = 'none'; 
        canvas.style.display = 'block'; 
        iniciarJuego(); 
    };
}

function iniciarJuego() {
    gameActive = true; isPaused = false; score = 0; level = 1; lives = 3; 
    weaponLevel = 0; weaponTimer = 0; obstacles = []; bossProjectiles = []; 
    playerProjectiles = []; powerUps = []; bossActive = false; bossDefeated = false;
    loop();
}

function disparar() {
    if (!gameActive || isPaused || weaponLevel === 0) return;
    let color = weaponLevel === 1 ? "#ff00ff" : (weaponLevel === 2 ? "#00ffff" : "#ffaa00");
    playerProjectiles.push({ x: player.x + player.w, y: player.y + player.h / 2, w: 18, h: 6, color: color });
}

function update() {
    if (!gameActive || isPaused) return;
    if (invulnerable > 0) invulnerable--;
    if (weaponTimer > 0 && --weaponTimer <= 0) weaponLevel = 0;

    if (keys['ArrowLeft'] && player.x > 0) player.x -= player.speed;
    if (keys['ArrowRight'] && player.x < canvas.width - player.w) player.x += player.speed;
    player.dy += player.gravity; player.y += player.dy;
    if (player.y >= 340) { player.y = 340; player.dy = 0; player.grounded = true; player.jumpCount = 0; }

    if (score >= level * 100 && !bossActive && !bossDefeated) {
        bossActive = true; obstacles = [];
        boss.x = 800; boss.health = 5 + (level * 2); boss.maxHealth = boss.health;
        imgAlien.src = bossSkins[Math.floor((level - 1) / 5) % bossSkins.length];
    }

    if (bossActive) {
        boss.x -= (1 + level * 0.3); if (boss.x < -150) boss.x = 850;
        boss.angle += 0.04; boss.y = 150 + Math.sin(boss.angle) * 130;
        if (Math.random() < 0.02 + (level * 0.005)) bossProjectiles.push({ x: boss.x + boss.w/2, y: boss.y + boss.h, r: 8, vy: 4 + level });

        for (let j = playerProjectiles.length - 1; j >= 0; j--) {
            let b = playerProjectiles[j];
            if (checkCollision(b, boss)) {
                boss.health -= (weaponLevel === 1 ? 0.3 : 0.6); playerProjectiles.splice(j, 1);
                if (boss.health <= 0) matarBoss();
            }
        }
        if (checkCollision(player, boss)) {
            if (player.dy > 0 && player.y + player.h < boss.y + (boss.h * 0.6)) {
                boss.health -= 2; player.dy = -14; sndGolpe.play();
                if (boss.health <= 0) matarBoss();
            } else { recibirDanio(); }
        }
    }

    function matarBoss() {
        bossActive = false; bossDefeated = true; defeatTimer = 120;
        powerUps.push({ x: boss.x + 30, y: boss.y, w: 40, h: 40, vy: 3 });
        bossProjectiles = [];
    }

    if (!bossActive && !bossDefeated) {
        if (Math.random() < 0.02) obstacles.push({ x: 800, y: 350, w: 45, h: 45, hp: 3, angle: Math.random() * 6 });
    }

    for (let i = obstacles.length - 1; i >= 0; i--) {
        let o = obstacles[i]; o.x -= (5 + level);
        if (level >= 5) { o.angle += 0.1; o.y = 300 + Math.sin(o.angle) * 60; }
        for (let j = playerProjectiles.length - 1; j >= 0; j--) {
            let b = playerProjectiles[j];
            if (checkCollision(b, o)) {
                playerProjectiles.splice(j, 1);
                o.hp -= (weaponLevel === 1 ? 1 : 3);
                if (o.hp <= 0) { obstacles.splice(i, 1); score += 5; break; }
            }
        }
        if (obstacles[i] && checkCollision(player, obstacles[i])) { recibirDanio(); obstacles.splice(i, 1); }
        else if (obstacles[i] && o.x < -50) { obstacles.splice(i, 1); score += 10; }
    }

    bossProjectiles.forEach((b, i) => { b.y += b.vy; if (checkCollision(b, player)) { recibirDanio(); bossProjectiles.splice(i, 1); } });
    powerUps.forEach((p, i) => { p.y += p.vy; if (checkCollision(player, p)) { lives = Math.min(lives + 1, 5); weaponLevel = Math.min(level, 3); weaponTimer = 1800; powerUps.splice(i, 1); } });
    playerProjectiles.forEach((b, i) => { b.x += 12; if (b.x > canvas.width) playerProjectiles.splice(i, 1); });
    if (bossDefeated && --defeatTimer <= 0) { bossDefeated = false; level++; player.x = 50; }
}

function recibirDanio() { if (invulnerable <= 0) { lives--; sndGolpe.play(); invulnerable = 100; if (lives <= 0) finalizarJuego(); } }

function draw() {
    ctx.drawImage(imgBg, 0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.fillRect(0,0,canvas.width,canvas.height);
    if (bossActive || weaponLevel > 0) { ctx.shadowBlur = 20; ctx.shadowColor = bossActive ? "#00ffcc" : (weaponLevel === 1 ? "#ff00ff" : "#00ffff"); }
    if (!(invulnerable > 0 && Math.floor(Date.now() / 100) % 2 === 0)) ctx.drawImage(imgActual, player.x, player.y, player.w, player.h);
    obstacles.forEach(o => ctx.drawImage(imgMeteoro, o.x, o.y, o.w, o.h));
    playerProjectiles.forEach(p => { ctx.shadowBlur = 15; ctx.shadowColor = p.color; ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, p.w, p.h); });
    if (bossActive) {
        ctx.drawImage(imgAlien, boss.x, boss.y, boss.w, boss.h);
        ctx.fillStyle = "black"; ctx.fillRect(boss.x, boss.y-25, boss.w, 10);
        ctx.fillStyle = "#00ffcc"; ctx.fillRect(boss.x, boss.y-25, (boss.health/boss.maxHealth)*boss.w, 10);
    }
    bossProjectiles.forEach(b => { ctx.shadowBlur = 10; ctx.shadowColor = "#32CD32"; ctx.fillStyle = "#32CD32"; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.fill(); });
    ctx.shadowBlur = 0; 
    powerUps.forEach(p => { ctx.fillStyle = "#ff00ff"; ctx.fillRect(p.x, p.y, p.w, p.h); ctx.fillStyle = "white"; ctx.font = "bold 12px Courier"; ctx.fillText("O2", p.x+10, p.y+25); });
    if (bossDefeated) ctx.drawImage(imgExplosion, boss.x, boss.y, boss.w, boss.h);

    ctx.fillStyle = "white"; ctx.font = "bold 18px Courier";
    ctx.fillText(`PTS: ${score} | LVL: ${level}`, 20, 30);
    for(let i=0; i<lives; i++) { ctx.fillStyle = "#00ffcc"; ctx.fillRect(20 + (i*25), 45, 15, 22); }
    if (weaponLevel > 0) {
        let c = ["", "#ff00ff", "#00ffff", "#ffaa00"][weaponLevel];
        ctx.fillStyle = c; ctx.fillText(["", "PLASMA", "LASER", "FUEGO"][weaponLevel], 160, 62);
        ctx.fillRect(260, 48, (weaponTimer/1800)*120, 12);
        ctx.strokeStyle = "white"; ctx.strokeRect(260, 48, 120, 12);
    }
    if (isPaused) {
        ctx.fillStyle = "rgba(0,0,0,0.8)"; ctx.fillRect(0,0,canvas.width,canvas.height);
        ctx.fillStyle = "#ff00ff"; ctx.textAlign = "center"; ctx.font = "bold 40px Courier";
        ctx.fillText("SISTEMA PAUSADO", 400, 200); ctx.textAlign = "start";
    }
}

function checkCollision(a, b) {
    let aw = a.w || a.r*2 || 10, ah = a.h || a.r*2 || 10;
    let bw = b.w || b.r*2 || 10, bh = b.h || b.r*2 || 10;
    return a.x < b.x + bw && a.x + aw > b.x && a.y < b.y + bh && a.y + ah > b.y;
}

function loop() { update(); draw(); if (gameActive) requestAnimationFrame(loop); }

// EVENTOS TECLADO
window.addEventListener('keydown', e => {
    if (e.code === 'Escape' && gameActive) { isPaused = !isPaused; return; }
    if (isPaused) { isPaused = false; return; }
    if (e.code === 'KeyA' && gameActive) disparar();
    keys[e.code] = true;
    if (e.code === 'Space' && gameActive && (player.grounded || player.jumpCount < 2)) { 
        player.dy = -player.jumpPower; player.grounded = false; player.jumpCount++; 
    }
});
window.addEventListener('keyup', e => keys[e.code] = false);

// EVENTOS TÁCTILES INTEGRADOS
function setupMobileControls() {
    const bindTouch = (id, key) => {
        const btn = document.getElementById(id);
        if (!btn) return;
        btn.addEventListener('touchstart', e => {
            e.preventDefault();
            if (isPaused) { isPaused = false; return; }
            if (key === 'Space') {
                if (gameActive && (player.grounded || player.jumpCount < 2)) {
                    player.dy = -player.jumpPower; player.grounded = false; player.jumpCount++;
                }
            } else if (key === 'KeyA') {
                disparar();
            }
            keys[key] = true;
        });
        btn.addEventListener('touchend', e => {
            e.preventDefault();
            keys[key] = false;
        });
    };

    bindTouch('btnLeft', 'ArrowLeft');
    bindTouch('btnRight', 'ArrowRight');
    bindTouch('btnJump', 'Space');
    bindTouch('btnShoot', 'KeyA');

    document.getElementById('btnPauseMobile').addEventListener('touchstart', e => {
        e.preventDefault();
        if (gameActive) isPaused = !isPaused;
    });
}
setupMobileControls();

setInterval(() => { if (keys['KeyA'] && weaponLevel === 3 && gameActive && !isPaused) disparar(); }, 100);

async function finalizarJuego() {
    gameActive = false;
    document.getElementById('mobileControls').style.display = 'none';
    document.getElementById('btnPauseMobile').style.display = 'none';

    let nombreUsuario = prompt("Misión Fallida. Puntos: " + score + "\nRanking:");
    if (nombreUsuario) {
        try {
            await fetch(`${SB_URL}/rest/v1/ranking`, {
                method: 'POST',
                headers: {
                    'apikey': SB_KEY,
                    'Authorization': `Bearer ${SB_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify({ nombre: nombreUsuario, puntaje: score, nivel: level })
            });
        } catch (error) { console.error("Error:", error); }
    }
    location.reload();
}
