const fs = require('fs');
exports.assets = require('./public/libraries/assets.js');
exports.io = null;

const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));


const getInstanceById = id => {
	return exports.assets[Object.keys(exports.assets)[id]]
}


const stringifyItem = (inventory, index = null) => {
	if (index === null) {
		return;
	}
	const item = {index : index};
	if (inventory[index]) {
		Object.assign(item, inventory[index].stringify);
	}
	return item;
}


const stringifyInventory = inventory => {
	const stringifiedInventory = [];
	for (let i = 0; i < inventory.length; i++) {
		let stringifiedItem = stringifyItem(inventory, i);
		if (stringifiedItem) {
			stringifiedInventory.push(stringifiedItem);
		}
	}
	return stringifiedInventory;
}


const stringifyBullet = bullet => {
	return {
		id : bullet.id,
		position : bullet.position,
		velocity : bullet.velocity,
		range : bullet.range,
		damage : bullet.damage,
		drag : bullet.drag
	};
};


const stringifyPlayer = (player, showHealth = Core.DEFAULT_ROOM.config.showHealth) => {
	let p = {
		position: player.position,
		radius: player.radius,
		health: 0,
		angle : player.angle,
		axis : player.getAxis(),
		speed: player.speed,
		color: player.color,
		id: player.id
	};
	if (showHealth) {
		p.health = player.health;
	}
	if (player.currentSlot) {
		if (player.currentSlot.accessible) {
			p.currentSlot = player.currentSlot.id;
		}
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
			for (let item of this.config.startInventory) {
				if (item) {
					let instance = getInstanceById(item.id);
					if (instance) {
						inventory.push(new instance(item.value));
					}
				} else {
					inventory.push(undefined);
				}
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
			const currentSlot = player.currentSlot;
			if (!currentSlot) {
				return;
			}
			if (!currentSlot.type === "Weapon") {
				return;
			}

			const ammunition = [];
			let ammoIndex = player.inventory.getIndexByInstance(currentSlot.bullet);
			while (ammoIndex !== -1 && currentSlot.value < currentSlot.maxAmmo) {
				const ammo = player.inventory.getByItemIndex(ammoIndex);
				let fetched = Math.min((currentSlot.maxAmmo - currentSlot.value), ammo.amount);
				currentSlot.value += fetched;
				ammo.value -= fetched;
				if (ammo.value <= 0) {
					player.inventory.removeItemByIndex(ammoIndex);
				}
				ammunition.push(stringifyItem(player.inventory.storage, ammoIndex));
				ammoIndex = player.inventory.getIndexByInstance(currentSlot.bullet);
			}

			for (let ammoSlot of ammunition) {
				player.socket.emit("slot", ammoSlot);
			}
			if (ammunition.length > 0) {
				player.socket.emit("slotValue", {index : player.inventory.barIndex, value : currentSlot.value});
			}
		});

		socket.on("changeInventory", data => {
			let currentSlot = player.inventory.currentSlot;
			player.inventory.change(data.source, data.target);
			player.currentSlot = player.inventory.currentSlot;
			const slots = [data.source, data.target];
			
			for (let index of slots) {

				const slot = stringifyItem(player.inventory.storage, index);
				if (slot) {
					socket.emit("slot", slot);
				}
			}
			
			if (currentSlot == player.inventory.currentSlot) {
				return null;
			}
			data = { id : player.id };
			if (!currentSlot) {
				currentSlot = { accessible : false };
			}

			if (player.inventory.currentSlot) {
				if (player.inventory.currentSlot.accessible) {
					data.currentSlot = player.inventory.currentSlot.id;
				} else {
					if (!currentSlot.accessible) {
						return null;
					}
				}
			} else {
				if (!currentSlot.accessible) {
					return null;
				}
			}
			
			socket.broadcast.emit("changeSlot", data);

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

		let data = stringifyPlayer(player, this.config.showHealth);

		this.broadcast.emit("new", data);

		Object.assign(data, {
			room : this.stringify,
			health : player.health,
			inventory : stringifyInventory(player.inventory.storage)
		});

		socket.emit("join", data);
		
		this.players.forEach(p => {
			socket.emit("new", stringifyPlayer(p, this.config.showHealth));
		});
		this.bullets.forEach(b => {
			socket.emit("bullet", stringifyBullet(b));
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


	changePlayerSlot(player, slot=-1) {
		if (slot < player.inventory.maxBar) {
			player.changeSlot(slot);
			const data = {
				id : player.id
			};
			if (player.inventory.barIndex !== -1) {
				data.currentSlot = player.inventory.barIndex;
			}
			player.socket.emit("changeSlot", data);

			const currentSlot = player.inventory.currentSlot;
			delete data.currentSlot;
			if (currentSlot) {
				if (currentSlot.accessible) {
					data.currentSlot = currentSlot.id;
				}
			}
			player.socket.broadcast.emit("changeSlot", data);
		}
	}

	playerAction(player) {
		let object = player.currentSlot;
		if (object) {
			if (object.accessible) {
				if (object.isReady() && object.value > 0) {
					let bullet = object.use(player.getPosition(), player.angle, player.radius);
					if (bullet) {
						Object.assign(bullet, {id : object.bullet.id});
						bullet.id = object.bullet.id;
						this.bullets.push(bullet);
						
						const data = {
							id : player.id,
							currentSlot : player.inventory.barIndex
						};
						player.socket.emit("action", data);
						data.currentSlot = object.id;
						player.socket.broadcast.emit("action", data);
						this.broadcast.emit("bullet", stringifyBullet(bullet));
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