let defualt_color = "rgb(49,116,144)";

let blob_fill_color;
let blob_stroke_color;
let dot1_color;

let count = 0;

let time = 0;

var applyForce =
  (distance = 10, strength = 1.0) =>
  (particle, particles) => {
    particles.forEach((p) => {
      if (p != particle) {
        let dx = p.x - particle.x;
        let dy = p.y - particle.y;
        let d = dx * dx + dy * dy;
        dx /= d + 0.1;
        dy /= d + 0.1;
        if (d < distance * distance) {
          particle.vx -= dx * strength;
          particle.vy -= dy * strength;
        }
      }
    });
  };

var applyAlignment =
  (distance = 10, strength = 1.0) =>
  (particle, particles) => {
    let AvgVx = 0;
    let AvgVy = 0;
    let count = 0;
    particles.forEach((p) => {
      if (p != particle) {
        let dx = p.x - particle.x;
        let dy = p.y - particle.y;
        let d = dx * dx + dy * dy;
        if (d < distance * distance) {
          AvgVx += p.vx;
          AvgVy += p.vy;
          count++;
        }
      }
    });
    if (count == 0) {
      return;
    }
    AvgVx /= count;
    AvgVy /= count;
    const DVx = AvgVx - particle.vx;
    const DVy = AvgVy - particle.vy;
    particle.vx += DVx * strength;
    particle.vy += DVy * strength;
  };

var applyCohesion =
  (distance = 10, strength = 1.0) =>
  (particle, particles) => {
    let AvgX = 0;
    let AvgY = 0;
    let count = 0;
    particles.forEach((p) => {
      if (p != particle) {
        let dx = p.x - particle.x;
        let dy = p.y - particle.y;
        let d = dx * dx + dy * dy;
        if (d < distance * distance) {
          AvgX += p.x;
          AvgY += p.y;
          count++;
        }
      }
    });
    if (count == 0) {
      return;
    }
    let DX = AvgX / count;
    let DY = AvgY / count;
    DX -= particle.x;
    DY -= particle.y;
    particle.vx += DX * strength;
    particle.vy += DY * strength;
  };

var applySeparation =
  (distance = 10, strength = 1.0) =>
  (particle, particles) => {
    let close_dx = 0;
    let close_dy = 0;
    particles.forEach((p) => {
      let dx = p.x - particle.x;
      let dy = p.y - particle.y;
      let d = dx * dx + dy * dy;
      if (d < distance * distance) {
        close_dx += particle.x - p.x;
        close_dy += particle.y - p.y;
      }
    });
    particle.vx += close_dx * strength;
    particle.vy += close_dy * strength;
  };

var applyMinVelocity =
  (minVel = 1.0) =>
  (particle) => {
    let d = particle.vx * particle.vx + particle.vy * particle.vy;
    d = Math.sqrt(d);
    particle.vx = (particle.vx / d) * minVel;
    particle.vy = (particle.vy / d) * minVel;
  };

var applyScreenBounds = (width, height, padding, turnFactor) => (particle) => {
  const leftMargin = padding;
  const rightMargin = width - padding;
  const topMargin = padding;
  const bottomMargin = height - padding;
  if (particle.x < leftMargin) {
    //particle.x = leftMargin;
    particle.vx += turnFactor;
  }
  if (particle.x > rightMargin) {
    //particle.x = rightMargin;
    particle.vx -= turnFactor;
  }
  if (particle.y < topMargin) {
    //particle.y = topMargin;
    particle.vy += turnFactor;
  }
  if (particle.y > bottomMargin) {
    //particle.y = bottomMargin;
    particle.vy -= turnFactor;
  }
};

var applyVineForce =
  (distance = 10, strength = 1.0) =>
  (particle, particles) => {
    let Dx = 0;
    let Dy = 0;
    let count = 0;
    particles.forEach((p) => {
      if (p == particle) {
        return;
      }
      let dx = p.x - particle.x;
      let dy = p.y - particle.y;
      let d = dx * dx + dy * dy;
      dx /= d + 0.1;
      dy /= d + 0.1;
      if (d < distance * distance) {
        Dx -= dx * strength;
        Dy -= dy * strength;
        count++;
      }
    });
    if (count == 0) {
      return;
    }
    particle.vx += Dx / count;
    particle.vy += Dy / count;
  };

var stayInBounds = (width, height, padding, force) => (particle) => {
  if (particle.x < padding) {
    particle.vx += force;
  }
  if (particle.x > width - padding) {
    particle.vx -= force;
  }
  if (particle.y < padding) {
    particle.vy += force;
  }
  if (particle.y > height - padding) {
    particle.vy -= force;
  }
};

class PhysicsWorld {
  constructor(cellSize) {
    this.cellSize = cellSize;
    this.gridWidth = Math.ceil(width / this.cellSize);
    this.gridHeight = Math.ceil(height / this.cellSize);
    this.cellIndex = new Array(this.gridWidth * this.gridHeight);
    this.cellIndex.fill(-1);
    this.particles = [];
    this.springs = [];
    this.interactions = {};
    this.blobs = [];
  }

  addParticle(particle) {
    this.particles.push(particle);
  }

  addSpring(spring) {
    this.springs.push(spring);
  }

  getParticleIndex(particle) {
    let x = Math.floor(particle.x / this.cellSize);
    let y = Math.floor(particle.y / this.cellSize);
    let index = x + y * this.gridWidth;
    return index;
  }

  compare = function (a, b) {
    a.index = this.getParticleIndex(a);
    b.index = this.getParticleIndex(b);

    if (a.index < b.index) {
      return -1;
    }
    if (a.index > b.index) {
      return 1;
    }
    return 0;
  };

  solveGrid() {
    this.cellIndex.fill(-1);
    this.particles.sort(this.compare.bind(this));
    for (let i = 0; i < this.particles.length; i++) {
      let index = this.particles[i].index;
      if (this.cellIndex[index] == -1) {
        this.cellIndex[index] = i;
      }
    }
  }

  getParticlesInCell(index, filters) {
    let particle = [];

    let i = this.cellIndex[index];
    while (i < this.particles.length && this.particles[i].index == index) {
      if (filters.includes(this.particles[i].type)) {
        particle.push(this.particles[i]);
      }
      i++;
    }

    return particle;
  }

  getParticlesInRadius(particle, filters) {
    let particles = [];
    let index = particle.index;
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        let tempIndex = index + i + j * this.gridWidth;
        if (tempIndex >= 0 && tempIndex < this.cellIndex.length) {
          if (this.cellIndex[tempIndex] != -1) {
            let h = this.getParticlesInCell(tempIndex, filters);
            particles = [...particles, ...h];
            count++;
          }
        }
      }
    }
    return particles;
  }

  addInteraction(interaction, to, from) {
    // this.interactions.push({
    //   interaction: interaction,
    //   from: from,
    //   to: to
    // });
    to.forEach((t) => {
      (this.interactions[t] = this.interactions[t] || []).push({
        interaction: interaction,
        from: from,
      });
    });
  }

  drawBlobs() {
    for (let i = 0; i < this.blobs.length; i++) {
      if (this.blobs[i].fill) {
        fill(this.blobs[i].fill);
      }
      stroke(this.blobs[i].stroke);
      strokeWeight(5);
      beginShape();
      for (let j = 0; j < this.blobs[i].p.length; j++) {
        let p = this.blobs[i].p[j];
        curveVertex(p.x, p.y);
      }
      endShape(CLOSE);
    }
  }

  update() {
    for (let i = 0; i < this.particles.length; i++) {
      let inter = this.interactions[this.particles[i].type];
      if (inter != undefined) {
        for (let j = 0; j < inter.length; j++) {
          inter[j].interaction(
            this.particles[i],
            this.getParticlesInRadius(this.particles[i], inter[j].from)
          );
        }
      }

      this.particles[i].run();
      if (i < this.springs.length) {
        this.springs[i].run();
      }
    }

    this.drawBlobs();
  }
}

class Particle {
  constructor(x, y, type, physicsWorld, show) {
    this.type = type;
    this.x = x;
    this.y = y;
    this.physicsWorld = physicsWorld;
    this.vx = 0;
    this.vy = 0;
    this.show = show;
    this.index;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= 0.7;
    this.vy *= 0.7;
  }
  draw() {
    strokeWeight(6);
    stroke(dot1_color);
    //circle(this.x, this.y, 6);
    point(this.x, this.y);
  }
  run() {
    this.update();
    if (this.show) {
      this.draw();
    }
  }
}
class Spring {
  constructor(
    particle1,
    particle2,
    length,
    strength,
    show = false,
    color = defualt_color
  ) {
    this.particle1 = particle1;
    this.particle2 = particle2;
    this.length = length;
    this.strength = strength;
    this.show = show;
    this.color = color;
  }

  update() {
    let dx = this.particle2.x - this.particle1.x;
    let dy = this.particle2.y - this.particle1.y;
    let d = dist(
      this.particle1.x,
      this.particle1.y,
      this.particle2.x,
      this.particle2.y
    );
    dx /= d + 0.1;
    dy /= d + 0.1;
    let diff = d - this.length;
    dx *= diff * this.strength;
    dy *= diff * this.strength;
    this.particle1.vx += dx;
    this.particle1.vy += dy;
    this.particle2.vx -= dx;
    this.particle2.vy -= dy;
  }

  draw() {
    strokeWeight(5);
    stroke(this.color);
    line(
      this.particle1.x,
      this.particle1.y,
      this.particle2.x,
      this.particle2.y
    );
  }

  run() {
    this.update();
    if (this.show) {
      this.draw();
    }
  }
}

const CreateBlob = (x, y, n, r, physicsWorld) => {
  let particles = [];
  let addCilia = random(0, 1) > 0.7;

  for (let i = 0; i < n; i++) {
    let angle = (i * TWO_PI) / n;
    let particle = new Particle(
      x + r * cos(angle),
      y + r * sin(angle),
      "blob",
      physicsWorld,
      false
    );
    physicsWorld.addParticle(particle);

    particles.push(particle);
    if (addCilia) {
      let cilia = new Particle(
        x + r * 1.3 * cos(angle),
        y + r * 1.3 * sin(angle),
        "blob",
        physicsWorld,
        false
      );
      physicsWorld.addParticle(cilia);
      physicsWorld.addSpring(
        new Spring(particle, cilia, 10, 0.4, true, blob_stroke_color)
      );
    }

    physicsWorld.blobs.push({
      p: particles,
      n: n,
      stroke: blob_stroke_color,
      //fill: blob_fill_color,
    });
  }
  //   if (random(0, 1) > 0.7) {
  //     //CreateBlob(x, y, n - 5, r / 2, physicsWorld);
  //   }
  for (let i = 0; i < n; i++) {
    physicsWorld.addSpring(
      new Spring(particles[i], particles[(i + 1) % n], r / 4, 0.2)
    );
  }
};

const CreateNestedBlob = (x, y, n, r, physicsWorld) => {
  if (r < 30) {
    r += 30;
  }
  CreateBlob(x, y, n, r, physicsWorld);
  for (let i = 0; i < random(1, 3); i++) {
    CreateBlob(x, y, int(n / 2), r / 2, physicsWorld);
  }
};

const CreateCoral = (x, y, n, r, physicsWorld) => {
  let particles = [];

  for (let i = 0; i < n; i++) {
    let angle = (i * TWO_PI) / n;
    let rnd = random(0.7, 1.3);
    let particle = new Particle(
      x + r * rnd * cos(angle),
      y + r * rnd * sin(angle),
      "vine",
      physicsWorld,
      false
    );
    physicsWorld.addParticle(particle);

    //physicsWorld.blobs.push({ p: particle, n: n });

    particles.push(particle);
  }
  for (let i = 0; i < n; i++) {
    physicsWorld.addSpring(
      new Spring(particles[i], particles[(i + 1) % n], 10, 0.1, true)
    );
  }
};

let physicsWorld;

let focusedIndex;

const spawnFish = (x, y, physicsWorld) => {
  let fish = new Particle(x, y, "fish", physicsWorld, true);
  physicsWorld.addParticle(fish);
};

const spawnFishSchool = (n, physicsWorld) => {
  for (let i = 0; i < n; i++) {
    let x = random(width);
    let y = random(height);
    spawnFish(x, y, physicsWorld);
  }
};

function setup() {
  createCanvas(windowWidth, windowHeight);
  background(100);
  frameRate(244);

  blob_fill_color = color(26, 24, 37);
  blob_stroke_color = color(172, 148, 147);
  dot1_color = color("#625d7f");

  physicsWorld = new PhysicsWorld(50);

  physicsWorld.addInteraction(
    stayInBounds(width, height, 100, 0.1),
    ["blob", "dot", "vine"],
    []
  );

  physicsWorld.addInteraction(
    stayInBounds(width, height, 100, 0.1),
    ["dot"],
    ["dot"]
  );

  physicsWorld.addInteraction(
    stayInBounds(width, height, 100, 0.1),
    ["vine"],
    ["dot"]
  );

  for (let i = 0; i < 20; i++) {
    let blob_n = int(random(7, 19));
    let blob_radius = blob_n * 5;
    CreateBlob(
      random(width),
      random(height),
      blob_n,
      blob_radius,
      physicsWorld
    );
  }

  CreateBlob(width / 2, height / 2, 15, 150, physicsWorld);
  CreateBlob(width / 2, height / 2, 13, 50, physicsWorld);
  CreateBlob(width / 2 + 30, height / 2 + 30, 13, 50, physicsWorld);

  CreateBlob(width / 2 - 400, height / 2 - 400, 15, 150, physicsWorld);
  CreateBlob(width / 2 - 400, height / 2 - 400, 13, 50, physicsWorld);
  CreateBlob(width / 2 + 50 - 400, height / 2 + 50 - 400, 13, 50, physicsWorld);

  CreateBlob(width / 2, height / 2, 10, 30, physicsWorld);
  CreateBlob(width / 2 + 0, height / 2 + 50, 8, 20, physicsWorld);

  // for (let i = 0; i < 300; i++) {
  //   let particle = new Particle(
  //     random(width),
  //     random(height),
  //     "dot",
  //     physicsWorld,
  //     true
  //   );
  //   physicsWorld.addParticle(particle);
  // }
  physicsWorld.addInteraction(applyForce(70, 0.5), ["blob"], ["blob"]);
  physicsWorld.addInteraction(applyForce(30, 1.0), ["blob"], ["blob"]);
  physicsWorld.addInteraction(applyForce(300, -0.3), ["blob"], ["blob"]);

  physicsWorld.addInteraction(applyForce(100, -0.2), ["dot"], ["dot", "blob"]);
  physicsWorld.addInteraction(applyForce(30, 0.7), ["dot"], ["dot"]);

  physicsWorld.addInteraction(applyForce(100, -0.2), ["dot"], ["dot"]);
  physicsWorld.addInteraction(applyForce(200, -0.01), ["dot"], ["blob"]);

  for (let i = 0; i < 30; i++) {
    CreateCoral(
      random(width),
      random(height),
      int(random(10, 50)),
      30,
      physicsWorld
    );
  }

  CreateCoral(random(width), random(height), 100, 30, physicsWorld);

  CreateCoral(width / 2 + 300, height / 2 + 300, 300, 120, physicsWorld);

  physicsWorld.addInteraction(applyVineForce(23, 5), ["vine"], ["vine"]);

  physicsWorld.addInteraction(applyVineForce(500, -2.5), ["vine"], ["vine"]);

  physicsWorld.addInteraction(applyForce(50, 0.1), ["vine"], ["blob"]);

  physicsWorld.addInteraction(applyForce(50, 0.2), ["blob"], ["vine"]);

  physicsWorld.addInteraction(applyForce(80, 0.3), ["dot"], ["vine"]);

  spawnFishSchool(100, physicsWorld);

  physicsWorld.addInteraction(
    applyForce(20, 0.6),
    ["fish"],
    ["vine", "blob", "dot"]
  );
  physicsWorld.addInteraction(
    applyForce(50, 0.4),
    ["vine", "blob", "dot"],
    ["fish"]
  );
  physicsWorld.addInteraction(applyForce(200, -0.5), ["fish"], ["vine"]);

  physicsWorld.addInteraction(
    applyScreenBounds(width, height, 200, 0.05),
    ["fish"],
    []
  );
  //physicsWorld.addInteraction(applyForce(20, 10.3), ["fish"], ["fish"]);
  physicsWorld.addInteraction(applySeparation(30, 0.01), ["fish"], ["fish"]);
  physicsWorld.addInteraction(applyAlignment(100, 0.05), ["fish"], ["fish"]);
  physicsWorld.addInteraction(applyCohesion(100, 0.0005), ["fish"], ["fish"]);
  physicsWorld.addInteraction(applyMinVelocity(1.0), ["fish"], ["fish"]);

  console.log(physicsWorld.interactions);

  physicsWorld.solveGrid();
}

function draw() {
  background("#222030");
  noFill();
  strokeWeight(3);

  time++;

  physicsWorld.solveGrid();
  physicsWorld.update();
  //   for(let i = 0; i < physicsWorld.particles.length; i++){
  //       physicsWorld.particles[i].run();
  //   }
  let fps = Math.floor(frameRate());
  textSize(32);
  fill(255);
  text(fps.toString(), 32, 32);
}
