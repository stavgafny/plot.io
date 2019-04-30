const SOUND_EFFECTS = {};
const ICONS = {};

function preload() {
	Object.assign(SOUND_EFFECTS, {
		'Player' : new Howl({
			src : ['audio/player.wav'],
			sprite : {
				'fist' : [0, 97.8]
			}
		}),
	
		'M4' : new Howl({
			src : ['audio/m4.wav'],
			sprite : {
				'fire' : [0, 362.8]
			}
		}),
		
		'AK-47' : new Howl({
			src : ['audio/ak47.wav'],
			sprite : {
				'fire' : [0, 575]
			}
		})
	});

	Object.assign(ICONS, {
		'AK-47' : loadImage('assets/ak47.png'),
		'M4' : loadImage('assets/m4.png'),
		'9mm' : loadImage('assets/9mm.png'),
		'5.56' : loadImage('assets/5.56.png')
	});
}

(function(audio) {

	audio.stereo = function(position, audioObject, audioSprite, range) {
		if (!audioObject) {
			return null;
		}
		let pan = map(position.x - player.getPosition().x, -range, range, -1.0, 1.0);
		if (pan < -1 || pan > 1) {
			pan = pan > 1 ? 1 : -1;
		}
		let d = dist(position.x, position.y, player.getPosition().x, player.getPosition().y);
		d = Math.max(map(d, 0, range*2, 1.0, 0.0), 0);
		let id = audioObject.play(audioSprite);
		audioObject.stereo(pan, id);
		audioObject.volume(d, id);
	}
})(typeof audio === 'undefined'? this['audio']={}: audio);



(function(graphics) {

	graphics.context = null;
	graphics.rgba = color => {
		return 'rgba(' + color + ')';
	}

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
			if (this.currentSlot && this.currentSlot.accessible) {
				this.currentSlot.draw(this.radius, this.fist, this.color);
				
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

			push();
			imageMode(CENTER);
			//image(ICONS['5.56'], mouseX, mouseY, 64, 64);
			pop();
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

			audio.stereo(this.getPosition(), SOUND_EFFECTS['Player'], 'fist', this.audioRange);
			
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
			if (this.currentSlot) {
				if (this.currentSlot.currentPulse) {
					this.currentSlot.currentPulse = 0;
				}
			}
			super.changeSlot(index);
		}

	};


	graphics.Weapon = class {
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
	
		static assultUse(position, angle, radius) {
			this.currentPulse = this.pulse;
			audio.stereo(position, SOUND_EFFECTS[this.name], "fire", this.audioRange);
			this.currentAmmo--;
			
		}
	}


	graphics.Bullet = class extends Bullet {

		static get MAX_COLOR() { return 1; }
		static get MIN_COLOR() { return 0; }

		static getMaxRay(speed) {
			return speed / 2;
		}

		constructor(position, radius, velocity, range, damage, drag, color) {
			super(position, radius, velocity, range, damage, drag);
			this.color = color;
			this.ray = 0;
			this.fixedRange = range;
			this.maxRay = graphics.Bullet.getMaxRay(this.speed);
			this.angle = Math.atan2(-this.velocity.y, -this.velocity.x);
		}

		get speed() { return dist(0, 0, this.velocity.x, this.velocity.y); }


		draw() {
			let e = fixedCamera(this.position);
			let et = {
				x : e.x + this.velocity.x*-this.ray,
				y : e.y + this.velocity.y*-this.ray
			};
			if (true) {//(inRange(e) || inRange(et)) {
				let length = this.speed * this.ray;
				push();
				translate(e.x, e.y);

				let v = map(this.range, 0, this.fixedRange, graphics.Bullet.MIN_COLOR, graphics.Bullet.MAX_COLOR);
				let grd = graphics.context.createLinearGradient(0, 0, length, 0);
				grd.addColorStop(0, graphics.rgba(Object.assign([, , , v], this.color)));
				grd.addColorStop(1, graphics.rgba(Object.assign([, , , 0], this.color)));
				graphics.context.fillStyle = grd;
				noStroke();
				rotate(this.angle);
				rect(0, -this.radius / 2, length, this.radius, this.radius);
				pop();
			}
		}


		update(deltaTime) {
			super.update(deltaTime);
			if (this.ray < this.maxRay) {
				this.ray = Math.min(this.ray + (1 * deltaTime), this.maxRay);
			}
		}
	};


	// ~All game ammo~
	
	graphics.A556 = class extends assets.A556 {
		static get COLOR() { return [40, 255, 150]; }
		//AK [0, 255, 255];
		constructor(amount) {
			super(amount);
		}
	};

	// ~All game weapons~

	graphics.M4 = class extends assets.M4 {
		constructor(currentAmmo) {
	        super(currentAmmo);
			this.color = {
				body : [0, 0, 0],
				grip : [60, 60, 60]
			};
			this.draw = graphics.Weapon.assultDraw;
			this.use = graphics.Weapon.assultUse;
			this.audioRange = 1000;
		}
	};


	graphics.AK47 = class extends assets.AK47 {
		constructor(currentAmmo) {
	        super(currentAmmo);
			this.color = {
				body : [130, 130, 100],
				grip : [220, 120, 0]
			};
			this.draw = graphics.Weapon.assultDraw;
			this.use = graphics.Weapon.assultUse;
			this.audioRange = 1000;
		}
	};

})(typeof graphics === 'undefined'? this['graphics']={}: graphics);