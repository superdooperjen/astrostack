interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  alpha: number;
  twinkleSpeed: number;
  color: string;
}

interface ShootingStar {
  x: number;
  y: number;
  vx: number;
  vy: number;
  length: number;
  alpha: number;
  life: number;
  maxLife: number;
}

export class Starfield {
  private stars: Star[] = [];
  private shootingStars: ShootingStar[] = [];
  private width: number = 0;
  private height: number = 0;

  constructor(count: number = 80) {
    this.initStars(count);
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    // Reposition any stars out of bounds
    this.stars.forEach(star => {
      star.x = Math.random() * width;
      star.y = Math.random() * height;
    });
  }

  private initStars(count: number) {
    const starColors = ['#ffffff', '#a5f3fc', '#cbd5e1', '#fecdd3', '#e0f2fe'];
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random() * 800, // placeholder, will resize
        y: Math.random() * 800,
        size: Math.random() * 1.8 + 0.5,
        speed: Math.random() * 0.2 + 0.05, // slow drift
        alpha: Math.random(),
        twinkleSpeed: 0.005 + Math.random() * 0.015,
        color: starColors[Math.floor(Math.random() * starColors.length)]
      });
    }
  }

  update(speedMultiplier: number = 1) {
    // Update drift stars
    this.stars.forEach(star => {
      // Drift downwards
      star.y += star.speed * speedMultiplier;
      if (star.y > this.height) {
        star.y = 0;
        star.x = Math.random() * this.width;
      }

      // Twinkle alpha
      star.alpha += star.twinkleSpeed;
      if (star.alpha > 1 || star.alpha < 0.2) {
        star.twinkleSpeed = -star.twinkleSpeed;
      }
    });

    // Randomly spawn shooting stars
    if (Math.random() < 0.003 && this.shootingStars.length < 2) {
      const maxLife = 30 + Math.random() * 30;
      this.shootingStars.push({
        x: Math.random() * this.width,
        y: Math.random() * (this.height * 0.6),
        vx: (Math.random() * 4 + 4) * (Math.random() > 0.5 ? 1 : -1), // diagonal left or right
        vy: Math.random() * 3 + 3,
        length: 20 + Math.random() * 40,
        alpha: 1,
        life: 0,
        maxLife
      });
    }

    // Update shooting stars
    for (let i = this.shootingStars.length - 1; i >= 0; i--) {
      const ss = this.shootingStars[i];
      ss.x += ss.vx;
      ss.y += ss.vy;
      ss.life++;
      ss.alpha = 1 - ss.life / ss.maxLife;

      if (ss.life >= ss.maxLife) {
        this.shootingStars.splice(i, 1);
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, theme: string) {
    ctx.save();
    
    // Starfield colors depending on theme
    let starOpacityMultiplier = 1;
    if (theme === 'light') {
      starOpacityMultiplier = 0.25; // fade stars in light theme
    } else if (theme === 'galaxy') {
      starOpacityMultiplier = 1.2; // boost stars in galaxy mode
    }

    // Render drift stars
    this.stars.forEach(star => {
      ctx.globalAlpha = star.alpha * starOpacityMultiplier;
      ctx.fillStyle = star.color;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    });

    // Render shooting stars
    this.shootingStars.forEach(ss => {
      ctx.globalAlpha = ss.alpha * starOpacityMultiplier;
      
      const grad = ctx.createLinearGradient(ss.x, ss.y, ss.x - ss.vx * 2, ss.y - ss.vy * 2);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.3, 'rgba(0, 240, 255, 0.4)');
      grad.addColorStop(1, 'rgba(211, 0, 255, 0)');

      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(ss.x, ss.y);
      ctx.lineTo(ss.x - ss.vx * 1.5, ss.y - ss.vy * 1.5);
      ctx.stroke();
    });

    ctx.restore();
  }
}
