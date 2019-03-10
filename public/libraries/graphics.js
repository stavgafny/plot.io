
(function(exports) {

		// ~All game grahpical object~
		
		exports.Player = class extends assets.Player {

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

			Object.assign(this.fist, exports.Player.fistProperties(this.radius));
		};


		draw(showHealth) {
			let e = fixedCamera(this.position);
			push();
			stroke(this.color.stroke);
			if (this.damaged.on) {
				fill(this.damaged.color);
			} else {
				fill(this.color.body);
			}
			strokeWeight(this.stroke);
			translate(e.x, e.y);
			rotate(this.angle);
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
	};


	// ~All game weapons~

	exports.M4 = class extends assets.M4 {
		constructor() {
	        super();
			this.size = {
				width : 2.2,
				height : .4
			}
			this.pulse = 0.65;
			this.launch = 0;
		}

		draw(radius, fist) {
			let w = radius + radius*this.size.width;
			let h = radius*this.size.height;
			let f1 = radius*1.05;
			let f2 = radius + (w-radius) * 0.65;

			let launch = this.launch * (radius * this.pulse);

			translate(0, 0);
			push();
			fill(255, 255, 255);
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

			this.launch = Math.min(Math.max(this.launch - ((this.pulse / 10)*game.deltaTime), 0), this.pulse);
		}
		
		use(position, angle) {
			//super.use(position, angle);
			this.launch = this.pulse;
		}
	};

	exports.A556 = class extends assets.A556 {
		constructor() {
			super();
			console.log("Graphic!");
		}
	}

})(typeof exports === 'undefined'? this['graphics']={}: exports);