class FiatInvaders {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = 600;
        this.height = 800;
        
        this.state = 'LOADING';
        this.score = 0;
        this.level = 1;
        this.lives = 3;
        this.highScore = localStorage.getItem('fiatHighScore') || 0;
        
        this.player = null;
        this.bullets = [];
        this.enemies = [];
        this.particles = [];
        this.powerUps = [];
        this.boss = null;
        
        this.keys = {};
        this.touch = { left: false, right: false, shoot: false, shield: false };
        
        this.init();
    }
    
    init() {
        // Setup canvas
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        
        // Setup input
        this.setupInput();
        
        // Setup UI
        document.getElementById('highScore').textContent = this.highScore;
        
        // Start loading
        this.loadGame();
    }
    
    loadGame() {
        let progress = 0;
        const interval = setInterval(() => {
            progress += 10;
            document.getElementById('loadingProgress').style.width = `${progress}%`;
            document.getElementById('loadingText').textContent = 
                `Loading... ${progress}%`;
            
            if (progress >= 100) {
                clearInterval(interval);
                setTimeout(() => {
                    this.showMenu();
                }, 500);
            }
        }, 100);
    }
    
    showMenu() {
        document.getElementById('loadingScreen').classList.remove('active');
        document.getElementById('mainMenu').classList.add('active');
        this.state = 'MENU';
    }
    
    startGame() {
        document.getElementById('mainMenu').classList.remove('active');
        document.getElementById('gameHUD').classList.add('active');
        
        this.state = 'PLAYING';
        this.score = 0;
        this.level = 1;
        this.lives = 3;
        
        this.player = {
            x: this.width / 2,
            y: this.height - 100,
            width: 30,
            height: 30,
            speed: 5,
            health: 100,
            shield: 0,
            weapon: 'NORMAL',
            weaponTimer: 0,
            hodl: false,
            hodlTimer: 0
        };
        
        this.bullets = [];
        this.enemies = [];
        this.particles = [];
        this.powerUps = [];
        this.boss = null;
        
        this.spawnWave();
        this.updateUI();
        this.gameLoop();
    }
    
    spawnWave() {
        this.enemies = [];
        const enemyTypes = ['$', '€', '£', '¥'];
        const colors = ['#2ecc71', '#3498db', '#9b59b6', '#bdc3c7'];
        
        // Create grid of enemies
        const rows = 4;
        const cols = 8;
        const spacing = 70;
        const startX = (this.width - (cols * spacing)) / 2 + spacing/2;
        
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const type = enemyTypes[Math.min(r, enemyTypes.length-1)];
                this.enemies.push({
                    x: startX + c * spacing,
                    y: 100 + r * spacing,
                    type: type,
                    color: colors[Math.min(r, colors.length-1)],
                    health: 10,
                    value: (4 - r) * 25,
                    speed: 1 + (r * 0.5),
                    moveDir: 1
                });
            }
        }
    }
    
    gameLoop() {
        if (this.state !== 'PLAYING') return;
        
        // Clear
        this.ctx.fillStyle = '#020202';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Update
        this.updatePlayer();
        this.updateBullets();
        this.updateEnemies();
        this.updateParticles();
        this.updatePowerUps();
        this.checkCollisions();
        
        // Draw
        this.drawBackground();
        this.drawPlayer();
        this.drawBullets();
        this.drawEnemies();
        this.drawParticles();
        this.drawPowerUps();
        this.drawHUD();
        
        // Continue loop
        requestAnimationFrame(() => this.gameLoop());
    }
    
    updatePlayer() {
        // Movement
        let moveX = 0;
        if (this.keys['ArrowLeft'] || this.keys['KeyA'] || this.touch.left) {
            moveX -= this.player.speed;
        }
        if (this.keys['ArrowRight'] || this.keys['KeyD'] || this.touch.right) {
            moveX += this.player.speed;
        }
        
        this.player.x += moveX;
        this.player.x = Math.max(15, Math.min(this.width - 15, this.player.x));
        
        // HODL mechanic
        if (Math.abs(moveX) < 0.1) {
            this.player.hodlTimer += 0.016; // ~60fps
            if (this.player.hodlTimer >= 0.5 && !this.player.hodl) {
                this.player.hodl = true;
                this.createParticles(this.player.x, this.player.y, '#00ff00', 10);
            }
        } else {
            this.player.hodlTimer = 0;
            this.player.hodl = false;
        }
        
        // Shooting
        if (this.keys['Space'] || this.keys['ArrowUp'] || this.touch.shoot) {
            this.shoot();
        }
        
        // Shield
        if ((this.keys['ArrowDown'] || this.keys['KeyS'] || this.touch.shield) && this.player.shield <= 0) {
            this.player.shield = 100;
        }
        
        // Regenerate shield
        if (this.player.shield > 0) {
            this.player.shield -= 0.5;
        }
        
        // Update weapon timer
        if (this.player.weapon !== 'NORMAL') {
            this.player.weaponTimer -= 0.016;
            if (this.player.weaponTimer <= 0) {
                this.player.weapon = 'NORMAL';
                this.updateWeaponUI();
            }
        }
    }
    
    shoot() {
        const now = Date.now();
        const fireRate = this.player.weapon === 'RAPID' ? 100 : 200;
        
        if (!this.lastShot || now - this.lastShot > fireRate) {
            this.lastShot = now;
            
            const bullet = {
                x: this.player.x,
                y: this.player.y - 20,
                width: this.player.hodl ? 10 : 5,
                height: 20,
                speed: -12,
                damage: this.player.hodl ? 20 : 10,
                color: this.player.hodl ? '#00ff00' : '#F7931A',
                type: this.player.weapon
            };
            
            this.bullets.push(bullet);
            
            // Create muzzle flash
            this.createParticles(this.player.x, this.player.y - 10, '#ffffff', 3);
            
            // Play shoot sound (would be WebAudio in full version)
            this.playSound('shoot');
        }
    }
    
    updateBullets() {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            bullet.y += bullet.speed;
            
            // Remove if off screen
            if (bullet.y < -50) {
                this.bullets.splice(i, 1);
            }
        }
    }
    
    updateEnemies() {
        let hitEdge = false;
        
        for (const enemy of this.enemies) {
            enemy.x += enemy.speed * enemy.moveDir;
            
            // Check screen edges
            if (enemy.x <= 40 || enemy.x >= this.width - 40) {
                hitEdge = true;
            }
            
            // Random shooting
            if (Math.random() < 0.002) {
                this.enemiesShoot(enemy);
            }
        }
        
        // Reverse direction if any enemy hit edge
        if (hitEdge) {
            for (const enemy of this.enemies) {
                enemy.moveDir *= -1;
                enemy.y += 30; // Move down
            }
        }
    }
    
    enemiesShoot(enemy) {
        this.bullets.push({
            x: enemy.x,
            y: enemy.y + 30,
            width: 6,
            height: 15,
            speed: 5,
            damage: 10,
            color: '#ff5555',
            type: 'ENEMY'
        });
    }
    
    checkCollisions() {
        // Player bullets vs enemies
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            if (bullet.type === 'ENEMY') continue;
            
            for (let j = this.enemies.length - 1; j >= 0; j--) {
                const enemy = this.enemies[j];
                
                if (this.collision(bullet, enemy)) {
                    // Hit enemy
                    enemy.health -= bullet.damage;
                    
                    // Create hit particles
                    this.createParticles(enemy.x, enemy.y, enemy.color, 5);
                    
                    // Remove bullet
                    this.bullets.splice(i, 1);
                    
                    // Check if enemy destroyed
                    if (enemy.health <= 0) {
                        // Add score
                        this.score += enemy.value * (this.player.hodl ? 2 : 1);
                        this.updateUI();
                        
                        // Create explosion
                        this.createParticles(enemy.x, enemy.y, '#FFD700', 15);
                        
                        // Chance to drop power-up
                        if (Math.random() < 0.1) {
                            this.spawnPowerUp(enemy.x, enemy.y);
                        }
                        
                        // Remove enemy
                        this.enemies.splice(j, 1);
                        
                        // Play explosion sound
                        this.playSound('explosion');
                        
                        // Screen shake
                        this.screenShake(5);
                    } else {
                        // Play hit sound
                        this.playSound('hit');
                    }
                    
                    break;
                }
            }
        }
        
        // Enemy bullets vs player
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            if (bullet.type !== 'ENEMY') continue;
            
            if (this.collision(bullet, this.player)) {
                // Check shield
                if (this.player.shield > 0) {
                    this.player.shield = Math.max(0, this.player.shield - 25);
                    this.createParticles(this.player.x, this.player.y, '#00ffff', 10);
                } else {
                    // Take damage
                    this.player.health -= bullet.damage;
                    this.screenShake(15);
                    this.createParticles(this.player.x, this.player.y, '#ff0000', 20);
                    
                    if (this.player.health <= 0) {
                        this.gameOver();
                        return;
                    }
                }
                
                // Remove bullet
                this.bullets.splice(i, 1);
                this.updateUI();
                this.playSound('hit');
            }
        }
        
        // Player vs enemies (crash)
        for (const enemy of this.enemies) {
            if (this.collision(this.player, enemy)) {
                this.player.health = 0;
                this.gameOver();
                return;
            }
        }
        
        // Power-ups vs player
        for (let i = this.powerUps.length - 1; i >= 0; i--) {
            const powerUp = this.powerUps[i];
            
            if (this.collision(this.player, powerUp)) {
                this.collectPowerUp(powerUp);
                this.powerUps.splice(i, 1);
            }
        }
        
        // Check wave clear
        if (this.enemies.length === 0 && !this.boss) {
            this.level++;
            this.updateUI();
            this.spawnWave();
            
            // Increase difficulty
            for (const enemy of this.enemies) {
                enemy.speed *= 1.1;
            }
        }
    }
    
    collision(a, b) {
        return Math.abs(a.x - b.x) < (a.width || 20) + (b.width || 20) / 2 &&
               Math.abs(a.y - b.y) < (a.height || 20) + (b.height || 20) / 2;
    }
    
    spawnPowerUp(x, y) {
        const types = ['RAPID', 'SPREAD', 'SHIELD'];
        const type = types[Math.floor(Math.random() * types.length)];
        
        this.powerUps.push({
            x: x,
            y: y,
            type: type,
            color: type === 'RAPID' ? '#3498db' : 
                   type === 'SPREAD' ? '#9b59b6' : '#00ffff',
            icon: type === 'RAPID' ? '⚡' : 
                  type === 'SPREAD' ? '🔱' : '🛡️',
            size: 20
        });
    }
    
    collectPowerUp(powerUp) {
        this.player.weapon = powerUp.type;
        this.player.weaponTimer = 10; // 10 seconds
        
        // Visual feedback
        this.createParticles(this.player.x, this.player.y, powerUp.color, 20);
        this.screenShake(3);
        
        // Update UI
        this.updateWeaponUI();
        
        // Play sound
        this.playSound('powerup');
    }
    
    updateWeaponUI() {
        const icons = {
            'NORMAL': '○',
            'RAPID': '⚡',
            'SPREAD': '🔱',
            'SHIELD': '🛡️'
        };
        
        document.getElementById('weaponIcon').textContent = icons[this.player.weapon];
        document.getElementById('weaponName').textContent = this.player.weapon;
    }
    
    createParticles(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                life: 1,
                color: color,
                size: Math.random() * 3 + 2
            });
        }
    }
    
    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.05;
            p.vx *= 0.95;
            p.vy *= 0.95;
            
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }
    
    updatePowerUps() {
        for (const powerUp of this.powerUps) {
            powerUp.y += 2; // Fall down
        }
    }
    
    drawBackground() {
        // Draw stars
        this.ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 50; i++) {
            const x = (i * 12345) % this.width;
            const y = (i * 6789) % this.height;
            const size = (i % 3) + 1;
            this.ctx.globalAlpha = 0.5 + Math.sin(Date.now() / 1000 + i) * 0.3;
            this.ctx.fillRect(x, y, size, size);
        }
        this.ctx.globalAlpha = 1;
    }
    
    drawPlayer() {
        this.ctx.save();
        
        // Draw ship
        this.ctx.fillStyle = this.player.hodl ? '#00ff00' : '#F7931A';
        this.ctx.beginPath();
        this.ctx.moveTo(this.player.x, this.player.y - 15);
        this.ctx.lineTo(this.player.x - 12, this.player.y + 10);
        this.ctx.lineTo(this.player.x + 12, this.player.y + 10);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Draw HODL indicator
        if (this.player.hodl) {
            this.ctx.fillStyle = '#00ff00';
            this.ctx.font = '10px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('HODL!', this.player.x, this.player.y + 25);
        }
        
        // Draw shield
        if (this.player.shield > 0) {
            this.ctx.strokeStyle = `rgba(0, 255, 255, ${this.player.shield / 100})`;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(this.player.x, this.player.y, 25, 0, Math.PI * 2);
            this.ctx.stroke();
        }
        
        this.ctx.restore();
    }
    
    drawBullets() {
        for (const bullet of this.bullets) {
            this.ctx.fillStyle = bullet.color;
            
            if (bullet.type === 'ENEMY') {
                // Enemy bullet (triangle)
                this.ctx.beginPath();
                this.ctx.moveTo(bullet.x, bullet.y + 10);
                this.ctx.lineTo(bullet.x - 4, bullet.y - 4);
                this.ctx.lineTo(bullet.x + 4, bullet.y - 4);
                this.ctx.fill();
            } else {
                // Player bullet (rectangle with glow)
                this.ctx.fillRect(
                    bullet.x - bullet.width / 2,
                    bullet.y,
                    bullet.width,
                    bullet.height
                );
                
                // Glow effect
                this.ctx.shadowColor = bullet.color;
                this.ctx.shadowBlur = 10;
                this.ctx.fillRect(
                    bullet.x - bullet.width / 2,
                    bullet.y,
                    bullet.width,
                    bullet.height
                );
                this.ctx.shadowBlur = 0;
            }
        }
    }
    
    drawEnemies() {
        for (const enemy of this.enemies) {
            this.ctx.save();
            
            // Draw enemy body
            this.ctx.fillStyle = enemy.color;
            this.ctx.fillRect(enemy.x - 20, enemy.y - 20, 40, 40);
            
            // Draw enemy symbol
            this.ctx.fillStyle = '#000000';
            this.ctx.font = 'bold 24px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(enemy.type, enemy.x, enemy.y);
            
            // Draw health bar
            this.ctx.fillStyle = '#ff0000';
            this.ctx.fillRect(enemy.x - 20, enemy.y - 30, 40, 4);
            this.ctx.fillStyle = '#00ff00';
            this.ctx.fillRect(enemy.x - 20, enemy.y - 30, 40 * (enemy.health / 10), 4);
            
            this.ctx.restore();
        }
    }
    
    drawParticles() {
        for (const p of this.particles) {
            this.ctx.globalAlpha = p.life;
            this.ctx.fillStyle = p.color;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();
        }
        this.ctx.globalAlpha = 1;
    }
    
    drawPowerUps() {
        for (const powerUp of this.powerUps) {
            this.ctx.save();
            
            // Draw background
            this.ctx.fillStyle = powerUp.color;
            this.ctx.beginPath();
            this.ctx.arc(powerUp.x, powerUp.y, powerUp.size, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Draw icon
            this.ctx.fillStyle = '#000000';
            this.ctx.font = 'bold 16px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(powerUp.icon, powerUp.x, powerUp.y);
            
            // Pulsing effect
            this.ctx.strokeStyle = powerUp.color;
            this.ctx.lineWidth = 2;
            this.ctx.globalAlpha = 0.5 + Math.sin(Date.now() / 200) * 0.3;
            this.ctx.beginPath();
            this.ctx.arc(powerUp.x, powerUp.y, powerUp.size + 3, 0, Math.PI * 2);
            this.ctx.stroke();
            
            this.ctx.restore();
        }
    }
    
    drawHUD() {
        // Already handled by CSS/HTML elements
    }
    
    updateUI() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('level').textContent = this.level;
        
        // Update health bar
        const healthPercent = Math.max(0, this.player.health);
        document.getElementById('healthBar').style.width = `${healthPercent}%`;
        
        // Update weapon display
        this.updateWeaponUI();
    }
    
    screenShake(intensity) {
        // This would be implemented with CSS transforms in full version
        this.canvas.style.transform = `translate(${(Math.random()-0.5)*int
