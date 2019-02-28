// ~All game core object~

(function(exports){

	exports.Item = class {
		constructor(name, weight, accessible, maxAmount=1) {
			this.name = name;
			this.weight = weight;
			this.accessible = accessible
			this.maxAmount = maxAmount;
		}

		getName() {
			return this.name;
		}

		getWeight() {
			return this.weight;
		}

		isAccessible() {
			return this.accessible;
		}

		setAmount(value) {
			this.amount = value;
		}

		getMaxAmout() {
			return this.maxAmount;
		}

	}


	exports.Body = class {
		constructor(position, radius) {
			this.position = position;
			this.radius = radius;
		}
		collide(body) {
			return Math.pow(body.position.x-this.position.x, 2) + Math.pow(body.position.y-this.position.y, 2) <= Math.pow(this.radius + body.radius, 2);
		}
	}


	exports.Player = class extends exports.Body {
		constructor(position, radius, health, speed, color, inventory = []) {
			super(position, radius);
			this.health = health;
			this.speed = speed;
			this.setColor(color);
			this.inventory = inventory;
			this.axis = {
				x : 0,
				y : 0
			}

			this.angle = 0;

			this.fist = {
				ready : true,
				range : this.radius,
				delay : 400,
				dist : this.radius*.65,
				radius : this.radius*.26,
				hitBox : false
			};
		}

		setPosition(position) {
			this.position = position;
		}

		getAngle() {
			return this.angle;
		}

		setAngle(angle) {
			this.angle = angle;
		}

		getHealth() {
			return this.health;
		}

		setHealth(health) {
			this.health = health;
		}


		setColor(color) {
			this.color = color;
			if (this.color.fist === undefined) {
				this.color.fist = this.color.body;
			}
		}

		getAxis() {
			return {x : this.axis.x, y : this.axis.y};
		}

		setAxis(axis) {
			Object.assign(this.axis, axis);
		}


		update(deltaTime) {
			this.position.x += (this.speed * this.axis.x) * deltaTime;
			this.position.y += (this.speed * this.axis.y) * deltaTime;
		}

		punch() {
			this.fist.ready = false;
			setTimeout(() => {
				this.fist.hitBox = true;
			}, this.fist.delay / 3);

			setTimeout(() => {
				this.fist.ready = true;
				this.fist.hitBox = false;
			}, this.fist.delay);
		}

		getHitBox() {
			let x = Math.cos(this.angle);
			let y = Math.sin(this.angle);

			return new exports.Body({
			x : this.position.x + ((this.fist.dist + this.fist.range)*x),
			y : this.position.y + ((this.fist.dist + this.fist.range)*y)
			}, this.fist.radius);
		}
	}


	//exports.Weapon = class extends



})(typeof exports === 'undefined'? this['assets']={}: exports);
