// ~All game core object and assets~

(function(exports) {

	exports.Item = class {

		static get stack() { return 64; }

		constructor(name, accessible, maxAmount=1) {
			this.name = name;
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

		static get numberOfSlots() { return 2; }

		constructor(position, radius, health, speed, color, inventory = []) {
			super(position, radius);
			this.health = health;
			this.speed = speed;
			this.setColor(color);
			this.inventory = inventory;
			this.slotIndex = 0;
			this.axis = {
				x : 0,
				y : 0
			}

			this.angle = 0;
			this.fist = {
				ready : true,
				range : this.radius*1.2,
				delay : 400,
				dist : this.radius*.65,
				radius : this.radius*.28,
				hitBox : false,
				side : 0
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

		punch(side=Math.round(Math.random())) {
			this.fist.ready = false;
			this.fist.side = side;
			setTimeout(() => {
				this.fist.hitBox = true;
			}, this.fist.delay / 3);

			setTimeout(() => {
				this.fist.ready = true;
				this.fist.hitBox = false;
			}, this.fist.delay);
			return this.fist.side;
		}

		getHitBox() {
			let x = Math.cos(this.angle);
			let y = Math.sin(this.angle);

			return new exports.Body({
			x : this.position.x + ((this.fist.dist + this.fist.range)*x),
			y : this.position.y + ((this.fist.dist + this.fist.range)*y)
			}, this.fist.radius);
		}

		changeSlot(index) {
			this.slotIndex = index;
		}

		getCurrentSlot() {
			return this.inventory[this.slotIndex];
		}
	}


	exports.Ammo = class extends exports.Item {
		constructor(name)  {
			super(name, false, assets.Item.stack);
		}
	}


	exports.Weapon = class extends exports.Item {
		constructor(name, fireRate, maxAmmo, ammoType) {
			super(name, true, 1);
			this.fireRate = 0;
			this.maxAmmo = maxAmmo;
			this.ammoType = ammoType instanceof assets.Ammo ?  ammoType : null;
		}
	}

	exports.M4 = class extends exports.Weapon {
		constructor() {
			super("M4", 100, 30, 2);
		}
	}
	

})(typeof exports === 'undefined'? this['assets']={}: exports);
