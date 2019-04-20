const fs = require('fs');
exports.assets = require('./public/libraries/assets.js');
exports.io = null;

const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
const FIXED_DELTATIME = 60;
const TICK = 30;
const DEFAULT_ROOM = {
	config: {
		startHealth: 100.0,
		radius: 30,
		speed: 3.6,
		startInventory : exports.assets.Player.DEFAULT_INVENTORY.constructor.FORMAT,
		maxPlayers: 10,
		defaultPlayerColor: config.defaultPlayerColor,
		playerFistDamage: 20,
		showHealth: false
	},
	map: {
		size: 1000
	},

};



const stripPlayer = player => {
	return {
		position: player.position,
		radius: player.radius,
		health: 0,
		angle : player.angle,
		axis : player.getAxis(),
		speed: player.speed,
		color: player.color,
		inventory : exports.Room.stringifyInventory(player.inventory),
		index: player.inventory.barIndex,
		id: player.id
	};
}


const stripBullet = bullet => {
	return {
		id : bullet.id,
		position : bullet.position,
		velocity : bullet.velocity,
		range : bullet.range,
		damage : bullet.damage,
		drag : bullet.drag
	};
};


exports.Room = class {

	static stringifyInventory(inventory) {
		inventory = inventory.getStorage();
		inventory = {
			storage : inventory.storage.map(item => item.id, inventory.storage),
			bar : inventory.bar.map(item => item.id, inventory.bar)
		}

		return inventory;
	}

	constructor(name, type, config = {}, map = {}) {
		this.name = name;
		this.type = type;
		this.config = Object.assign({}, DEFAULT_ROOM.config, config);
		this.config.startInventory = Object.assign({}, DEFAULT_ROOM.config.startInventory, config.startInventory);
		this.map = Object.assign({}, DEFAULT_ROOM.map, map);
		this.players = [];
		this.bullets = [];
		this.queue = [];

		this.worker = null;
		this.deltaTime = 0;
		this.counter = 0;
	}

	get stringify() { return `${this.type}:${this.name}`; }

	get broadcast() { return exports.io.sockets.in(this.stringify); }

	get newPlayerInventory() {
		let inventory = this.config.startInventory;
		return {
			storage : inventory.storage.map(object => new object()),
			bar : inventory.bar.map(object => new object())
		};
	}

	stripPlayer(player) {
		let p = stripPlayer(player);
		if (this.config.showHealth) {
			p.health = player.health;
		}
		return p;
	}

	handlePlayerRequests(player) {
		let socket = player.socket;
		if (!socket) {
			return null;
		}

		socket.on("a", angle => {
			player.setAngle(angle);
			this.broadcast.emit('a', { id: player.id, angle: angle });
		});
	
		socket.on("axis", axis => {
			this.setPlayerAxis(player, axis);
		});
	
		socket.on("changeSlot", slotNumber => {
			this.changePlayerSlot(player, slotNumber);
		});
	
		socket.on("action+", () => {
			player.hold = true;
			this.playerAction(player);
		});
	
		socket.on("action-", () => {
			player.hold = false;
		});
	
		socket.on("disconnect", () => {
			this.broadcast.emit('closed', player.id);
			this.removePlayer(player);
			return null;
		});
	}




	addPlayer(socket = null) {
		let position = {x : 2000, y : 2000};
		let player = new exports.assets.Player(
			position,
			this.config.radius,
			this.config.startHealth,
			this.config.speed,
			this.config.defaultPlayerColor,
			this.newPlayerInventory
		);

		player.id = this.counter++;
		player.socket = socket;
		player.hold = false;

		let data = this.stripPlayer(player);

		this.broadcast.emit("new", data);

		Object.assign(data, {
			name : this.stringify,
			health : player.health
		});

		socket.emit("join", data);
		
		this.players.forEach(p => {
			socket.emit("new", this.stripPlayer(p));
		});
		this.bullets.forEach(b => {
			socket.emit("bullet", stripBullet(b));
		});

		this.players.push(player);
		socket.join(this.stringify);

		this.handlePlayerRequests(player);
	}

	isRunning() {
		return this.worker !== null;
	}

	run() {
		let lastLoop = 0;
		this.worker = setInterval(() => {
			let thisLoop = Date.now();
			for (let i = 0; i < this.players.length; i++) {
				let player = this.players[i];
				if (player) {
					player.update(this.deltaTime);
					if (player.currentSlot && player.hold) {
						this.playerAction(player);
					} else if (player.fist.hitBox) {
						let hitBox = player.getHitBox();
						for (let p = 0; p < this.players.length && player.fist.hitBox; p++) {
							if (this.players[p] !== player) {
								if (hitBox.collide(this.players[p])) {
									setTimeout(() => this.damagePlayer(this.players[p], this.config.playerFistDamage), 0);
									player.fist.hitBox = false;
								}
							}
						}
					}
				}
			}

			for (let i = 0; i < this.bullets.length; i++) {
				if (this.bullets[i].outOfRange()) {
					this.bullets.splice(i, 1);
				} else {
					let hit = false;
					for (let p = 0; p < this.players.length && !hit; p++) {
						if (this.players[p].collide(this.bullets[i])) {
							hit = true;
							let damage = this.bullets[i].damage;
							setTimeout(() => this.damagePlayer(this.players[p], damage), 0);
							this.bullets.splice(i, 1);
						}
					}
					if (!hit) {
						this.bullets[i].update(this.deltaTime);
					}
				}
			}

			this.deltaTime = FIXED_DELTATIME / (1000 / (thisLoop - lastLoop));
			lastLoop = thisLoop;
			
		}, 1000 / TICK);
	}
	stop() {
		clearInterval(this.worker);
	}

	removePlayer(player) {
		let i = this.players.indexOf(player);
		this.players.splice(i, 1);
	}

	setPlayerAxis(player, axis) {
		player.setAxis(axis);
		this.broadcast.emit('axis', { id: player.id, axis: player.axis });
		this.broadcast.emit('pos', { id: player.id, position: player.position });

	}

	damagePlayer(player, damage) {
		if (!player) {
			return null;
		}
		player.setHealth(player.getHealth() - damage);
		if (player.alive) {
			let data = { id: player.id, health: player.getHealth() };
			if (!this.config.showHealth) {
				player.socket.emit('hp:d', data);
				delete data.health;
			}
			this.broadcast.emit('hp:d', data);
		} else {
			player.socket.disconnect();
		}
	}


	changePlayerSlot(player, slot) {
		player.changeSlot(slot);
		this.broadcast.emit("changeSlot", { slot : player.inventory.barIndex, id : player.id });

	}

	playerAction(player) {
		let object = player.currentSlot;
		if (object) {
			if (object.accessible) {
				if (object.isReady()) {
					let bullet = object.use(player.getPosition(), player.angle, player.radius);
					if (bullet) {
						bullet.id = object.bullet.id;
						this.bullets.push(bullet);
						this.broadcast.emit("action", { id : player.id, index : player.inventory.barIndex });
						this.broadcast.emit("bullet", stripBullet(bullet));
						if (!object.isAuto) {
							player.hold = false;
						}
					}
				}
				return null;
			}
		}
		if (player.fist.ready) {
			this.broadcast.emit("punch", { id : player.id, side : player.punch() });
			player.hold = false;
		}
	}
}