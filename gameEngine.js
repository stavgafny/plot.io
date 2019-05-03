const fs = require('fs');
exports.assets = require('./public/libraries/assets.js');
exports.io = null;

const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));


const stringifyInventory = inventory => {
	let stringified = [];
	inventory = inventory.storage;
	inventory.forEach(item => {
		if (item) {
			stringified.push(
				{
					id : item.id,
					value : item.value
				}
			);
		} else {
			stringified.push(undefined);
		}
	});
	return stringified;
};


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

const stripPlayer = (player, showHealth = Core.DEFAULT_ROOM.config.showHealth) => {
	let p = {
		position: player.position,
		radius: player.radius,
		health: 0,
		angle : player.angle,
		axis : player.getAxis(),
		speed: player.speed,
		color: player.color,
		inventory : stringifyInventory(player.inventory),
		index: player.inventory.barIndex,
		id: player.id
	};
	
	if (showHealth) {
		p.health = player.health;
	}
	return p;
};


class Core {

	static get DEFAULT_ROOM() {
		return {
			config: {
				startHealth: 100.0,
				radius: 30,
				speed: 3.6,
				startInventory : [],
				maxPlayers: 10,
				defaultPlayerColor: config.defaultPlayerColor,
				playerFistDamage: 20,
				showHealth: false
			},
			map: {
				size: 1000
			},
		
		};
	}

	constructor(name, type, config, map)  {
		this.name = name;
		this.type = type;
		this.config = Object.assign({}, Core.DEFAULT_ROOM.config, config);
		this.map = Object.assign({}, Core.DEFAULT_ROOM.map, map);
	}

	get stringify() { return `${this.type}:${this.name}`; }

	get broadcast() { return exports.io.sockets.in(this.stringify); }

	get newPlayerInventory() {
		let inventory = [];
		try {
			for (let template of this.config.startInventory) {
				inventory.push(
					new template[0](...template.slice(1, template.length))
				);
			}
		}
		finally {
			return inventory;
		}
	}
}





exports.Room = class extends Core {

	static get FIXED_DELTATIME() { return 60; }

	static get TICK() { return 30; }

	constructor(name, type, config = {}, map = {}) {
		super(name, type, config, map);
		this.players = [];
		this.bullets = [];
		this.worker = null;
		this.deltaTime = 1;
		this.counter = 0;
	}

	get running() { return this.worker !== null; }

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

		socket.on("reload", () => {

		});

		socket.on("switch", data => {
			if (data.index2 >= 0) {
				player.inventory.switch(data.index1, data.index2);
			} else {
				player.inventory.value[data.index1] = undefined;
			}
			socket.emit("inventory", stringifyInventory(player.inventory));
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

		let data = stripPlayer(player, this.config.showHealth);

		this.broadcast.emit("new", data);

		Object.assign(data, {
			room : this.stringify,
			health : player.health
		});

		socket.emit("join", data);
		
		this.players.forEach(p => {
			socket.emit("new", stripPlayer(p, this.config.showHealth));
		});
		this.bullets.forEach(b => {
			socket.emit("bullet", stripBullet(b));
		});

		this.players.push(player);
		socket.join(this.stringify);

		this.handlePlayerRequests(player);
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

			this.deltaTime = exports.Room.FIXED_DELTATIME / (1000 / (thisLoop - lastLoop));
			lastLoop = thisLoop;
		}, 1000 / exports.Room.TICK);
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
				if (object.isReady() && object.value > 0) {
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