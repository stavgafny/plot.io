
class GraphicsWeapon {
	static assultDraw(radius, fist) {
		let w = radius + radius*this.size.width;
		let h = radius*this.size.height;
		let f1 = radius*1.05;
		let f2 = radius + (w-radius) * 0.65;

		let launch = this.launch * (radius * this.pulse);
		translate(0, 0);
		push();
		fill(this.color);
		strokeWeight(1);
		rectMode(CENTER);
		rect((w / 2) - launch, 0, w, h, 0, 10, 10, 0);
		pop();
		push();
		ellipse(0, 0, radius*2);
		strokeWeight(fist.handStroke);
		ellipse(f1 - launch, fist.gap*.2, fist.radius*2);
		ellipse(f2 - launch, fist.gap*.3, fist.radius*2);
		pop();
	}
}


(function(graphics) {

		// ~All game grahpical object~
		
		graphics.Player = class extends assets.Player {

		static fistProperties(radius) {
			return {
				gap : radius*.7,
				launch : 0,
				angle : .6,
				speed : 0,
				handStroke : 2
			};
		};

		constructor(position, radius, health, speed, color, inventory = []) {
			super(position, radius, health, speed, color, inventory);
			this.stroke = 0;

			this.damaged = {
				on : false,
				delay : 300,
				color : [255, 0, 0],
				interval: null

			}

			Object.assign(this.fist, graphics.Player.fistProperties(this.radius));
		};


		draw(showHealth) {
			let e = fixedCamera(this.position);
			push();
			translate(e.x, e.y);
			rotate(this.angle);
			stroke(this.color.stroke);
			this.damaged.on ? fill(this.damaged.color) : fill(this.color.body);
			strokeWeight(this.stroke);

			ellipse(0, 0, this.radius*2);
			if (this.inventory[this.slotIndex] instanceof Item) {
				let object = this.inventory[this.slotIndex];
				if (object.isAccessible()) {
					object.draw(this.radius, this.fist);
				}
			} else {
				strokeWeight(this.fist.handStroke);
				fill(this.color.fist);
				if (this.fist.ready) {
					ellipse(this.fist.dist, this.fist.gap, this.fist.radius*2);
					ellipse(this.fist.dist, -this.fist.gap, this.fist.radius*2);
				} else {
					let fist1 = this.fist.side ? 1 : 0;
					let fist2 = this.fist.side ? 0 : 1;
					ellipse(this.fist.dist + this.fist.launch * fist1, this.fist.gap - (this.fist.launch * this.fist.angle * fist1), this.fist.radius*2);
					ellipse(this.fist.dist + this.fist.launch * fist2, -this.fist.gap + (this.fist.launch * this.fist.angle * fist2), this.fist.radius*2);
				}
			}

			pop();
			
			if (showHealth && this.health > 0) {
				push();
				translate(e.x, e.y);
				noStroke();
				let health = {
					value : Math.max(map(this.health, 0, 100, 0, this.radius*2), 0),
					color : Math.max(map(this.health, 0, 100, 0, 255), 0)
				};
				fill(Math.min(350-health.color, 255), Math.min(health.color*1.5, 255), 0);
				rect(-this.radius, -this.radius-20, health.value, 6, 10);
				pop();
			}
		}


		punch(side=Math.round(Math.random())) {
			this.fist.launch = 0;
			this.fist.speed = this.fist.range / 4;
			setTimeout(() => {
				this.fist.launch = this.fist.range;
				this.fist.speed *= -.5;
			}, this.fist.delay / 3);
			setTimeout(() => {
				this.fist.launch = 0;
			}, this.fist.delay);
			return super.punch(side);
		}

		update(deltaTime=1) {
			super.update(deltaTime);
			if (!this.fist.ready) {
				this.fist.launch = Math.min(Math.max(this.fist.launch + (this.fist.speed * deltaTime), 0), this.fist.range);
			}
		}

		setDamaged() {
			if (this.damaged.on) {
				clearTimeout(this.damaged.interval);
			}
			this.damaged.on = true;
			this.damaged.interval = setTimeout(() => { this.damaged.on = false; }, this.damaged.delay);
		}

		changeSlot(index) {
			let object = super.changeSlot(index);
			if (object) {
				if (object.launch) {
					object.launch = 0;
				}
			}
		}

	};

	graphics.Bullet = class extends Bullet {
		constructor(position, radius, velocity, range, damage, color) {
			super(position, radius, velocity, range, damage);
			this.color = color;
		}

		draw() {
			let e = fixedCamera(this.position);
			push();
			translate(...Object.values(e));
			fill(this.color);
			ellipse(0, 0, this.radius*2);
			pop();
		}
	};


	// ~All game ammo~
	
	graphics.A556 = class extends assets.A556 {
		static get color() { return [100, 255, 100]; }
		constructor() {
			super();
		}
	};

	graphics.A762 = class extends assets.A762 {
		static get color() { return [100, 100, 255]; }
		constructor() {
			super();
		}
	};

	// ~All game weapons~

	graphics.M4 = class extends assets.M4 {
		constructor() {
	        super();
			this.pulse = 0.5;
			this.launch = 0;
			this.color = [255, 0, 0];
			this.graphics = GraphicsWeapon.assultDraw;
		}

		draw(radius, fist) {
			this.graphics(radius, fist);
			this.launch = Math.min(Math.max(this.launch - ((this.pulse / 10)*game.deltaTime), 0), this.pulse);
		}
		
		use(position, angle, radius) {
			//super.use(position, angle, radius);
			this.launch = this.pulse;
		}
	};


	graphics.Semi = class extends assets.Semi {
		constructor() {
	        super();
			this.pulse = 0.6;
			this.launch = 0;
			this.color = [0, 0, 255];
			this.graphics = GraphicsWeapon.assultDraw;
		}

		draw(radius, fist) {
			this.graphics(radius, fist);
			this.launch = Math.min(Math.max(this.launch - ((this.pulse / 10)*game.deltaTime), 0), this.pulse);
		}
		
		use() {
			//super.use(position, angle, radius);
			this.launch = this.pulse;
		}
	};

})(typeof graphics === 'undefined'? this['graphics']={}: graphics);