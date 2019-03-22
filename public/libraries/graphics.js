(function(audio) {
	
	audio.fistwave = new Howl({
		src : ["audio/fistwave.mp3"]
	});

	audio.m4 = {
		fire : new Howl({
			src : ["audio/m4.mp3"]
		})
	};

	audio.ak47 = {
		fire : new Howl({
			src : ["audio/ak47.mp3"]
		})
	};


	audio.stereo = function(position, audio, range) {

		let pan = map(position.x - player.getPosition().x, -range, range, -1.0, 1.0);
		if (pan < -1 || pan > 1) {
			pan = pan > 1 ? 1 : -1;
		}
		let d = dist(position.x, position.y, player.getPosition().x, player.getPosition().y);
		d = Math.max(map(d, 0, range*2, 1.0, 0.0), 0);
		let id = audio.play();
		audio.stereo(pan, id);
		audio.volume(d, id);
	}


})(typeof audio === 'undefined'? this['audio']={}: audio);





class GraphicsWeapon {
	static assultDraw(radius, fist, color) {
		let w = radius + radius*this.size.width;
		let h = radius*this.size.height;
		let f1 = radius*1.05;
		let f2 = radius + (w-radius) * 0.65;
		let gripSize = w/8;

		let currentPulse = this.currentPulse * (radius * this.pulse);
		push();
		translate((w / 2) - currentPulse, 0);
		fill(this.color.body);
		rectMode(CENTER);
		strokeWeight(1);
		stroke(this.color.body);
		rect(0, 0, w, h, 0, 10, 10, 0);
		fill(this.color.grip);
		rect((w/2) - gripSize*2, 0, gripSize*2, h);
		stroke(0, 0, 0, 100);
		noFill();
		rect(0, 0, w, h, 0, 10, 10, 0);
		pop();
		push();
		ellipse(0, 0, radius*2);
		strokeWeight(fist.handStroke);
		fill(color.fist);
		ellipse(f1 - currentPulse, fist.gap*.2, fist.radius*2);
		ellipse(f2 - currentPulse, fist.gap*.3, fist.radius*2);
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
				delay : 200,
				color : [255, 0, 0],
				interval: null

			}

			this.audioRange = 500;
			
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
					object.draw(this.radius, this.fist, this.color);
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

			audio.stereo(this.getPosition(), audio.fistwave, this.audioRange);
			
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
		constructor(position, radius, velocity, range, damage, drag, color) {
			super(position, radius, velocity, range, damage, drag);
			this.color = color;
			this.trail = 0;
			this.maxTrail = Math.floor((Math.abs(this.velocity.x) + Math.abs(this.velocity.y)) / 2.2);
		}

		draw() {
			let e = fixedCamera(this.position);
			push();
			translate(e.x, e.y);
			noFill();
			strokeWeight(this.radius*2);
			let color = Object.assign([], this.color);
			color[3] = 255;
			let dec = color[3] / this.trail;
			strokeCap(SQUARE);
			for (let i = 0; i <= this.trail; i++) {
				stroke(color);
				let x = this.velocity.x*i;
				let y = this.velocity.y*i;
				line(-x, -y, this.velocity.x, this.velocity.y);
				color[3] -= dec;
			}
			pop();
		}
		update() {
			super.update();
			if (this.trail < this.maxTrail) {
				this.trail++;
			}
		}
	};


	// ~All game ammo~
	
	graphics.A556 = class extends assets.A556 {
		static get color() { return [40, 255, 150]; }
		constructor() {
			super();
		}
	};

	graphics.A762 = class extends assets.A762 {
		static get color() { return [0, 255, 255]; }
		constructor() {
			super();
		}
	};

	// ~All game weapons~

	graphics.M4 = class extends assets.M4 {
		constructor() {
	        super();
			this.color = {
				body : [0, 0, 0],
				grip : [60, 60, 60]
			};
			this.draw = GraphicsWeapon.assultDraw;
			this.audioRange = 1000;
		}
		
		use(position, angle, radius) {
			//super.use(position, angle, radius);
			this.currentPulse = this.pulse;
			audio.stereo(position, audio.m4.fire, this.audioRange);
		}
	};


	graphics.AK47 = class extends assets.AK47 {
		constructor() {
	        super();
			this.color = {
				body : [130, 130, 100],
				grip : [220, 120, 0]
			};
			this.draw = GraphicsWeapon.assultDraw;
			this.audioRange = 1000;
		}

		use(position, angle, radius) {
			//super.use(position, angle, radius);
			this.currentPulse = this.pulse;
			audio.stereo(position, audio.ak47.fire, this.audioRange);
		}
	};

})(typeof graphics === 'undefined'? this['graphics']={}: graphics);