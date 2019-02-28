

class GraphicPlayer extends assets.Player {

	static fistProperties(radius) {
		return {
			gap : radius*.7,
			launch : 0,
			angle : .6,
			speed : 0,
			side : 0
		};
	}

	constructor(position, radius, health, speed, color, inventory = []) {
		super(position, radius, health, speed, color, inventory);
		this.stroke = 0;
		this.handStroke = 2;

		this.damaged = {
			on : false,
			delay : 300,
			color : [255, 0, 0],
			interval: null

		}

		Object.assign(this.fist, GraphicPlayer.fistProperties(this.radius));
	}


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
		strokeWeight(this.handStroke);
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


	punch() {
		super.punch();

		this.fist.side = round(random(1));
		this.fist.launch = 0;
		this.fist.speed = this.fist.range / 4;
		setTimeout(() => {
			this.fist.launch = this.fist.range;
			this.fist.speed *= -.5;
		}, this.fist.delay / 3);
		setTimeout(() => {
			this.fist.launch = 0;
		}, this.fist.delay);
	}

	update(deltaTime) {
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
}
