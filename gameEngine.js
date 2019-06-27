const fs = require('fs');
exports.assets = require('./public/libraries/assets.js');
exports.io = null;

const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));


const getInstanceById = id => {
	return Object.values(exports.assets)[id];
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
	const {id, position, velocity, range, damage, drag} = bullet;
	return {
		id : id,
		position : position,
		velocity : velocity,
		range : range,
		damage : damage,
		drag : drag
	};
};


const stringifyPlayer = (player, showHealth = Core.DEFAULT_ROOM.config.showHealth) => {
	let p = {
		position: player.position,
		radius: player.radius,
		angle : player.angle,
		axis : player.getAxis(),
		speed: player.speed,
		color: player.color,
		id: player.id
	};

	if (player.currentSlot) {
		if (player.currentSlot.accessible) {
			p.currentSlot = player.currentSlot.id;
		}
	}
	
	if (showHealth) {
		p.health = player.status.health;
	}

	return p;
};


class Core {

	static get DEFAULT_ROOM() {
		return {
			config: {
				status: exports.assets.Player.STATUS.default,
				radius: 30,
				speed: 3.6,
				startInventory: [],
				maxPlayers: 10,
				defaultPlayerColor: config.defaultPlayerColor,
				playerFistDamage: 20,
				showHealth: false
			},
			map: {
				size: 500
			},
		};
	}

	constructor(name, mode, config, map)  {
		this.name = name;
		this.mode = mode;
		this.config = Object.assign({}, Core.DEFAULT_ROOM.config, config);
		this.map = Object.assign({}, Core.DEFAULT_ROOM.map, map);
	}

	get stringify() { return `${this.mode}:${this.name}`; }

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
	
	_updatePlayer(player) {
		player.update(this.deltaTime);
		player.updateStatus(this.deltaTime);
		if (!player.alive) {
			return;
		}
		player.steps += player.axis.x || player.axis.y ? player.speed * this.deltaTime : 0;
		if (player.steps > player.speed * 25) { // 25 = PLAYERSTEPS -> CONFIG<config>
			player.steps -= player.speed * 25;
			this.broadcast.emit("walk", player.id);
		}

		if (player.currentSlot && player.hold) {
			this.playerAction(player);
		} else if (player.fist.hitBox) {
			let hitBox = player.getHitBox();
			for (let p = 0; p < this.players.length && player.fist.hitBox; p++) {
				if (this.players[p] !== player) {
					if (hitBox.collide(this.players[p])) {
						this.damagePlayer(this.players[p], this.config.playerFistDamage);
						player.fist.hitBox = false;
					}
				}
			}
		}
	}
}


exports.Room = class extends Core {

	static get FIXED_DELTATIME() { return 60; }

	static get TICK() { return 30; }

	constructor(name, mode, config = {}, map = {}) {
		super(name, mode, config, map);
		this.players = [];
		this.bullets = [];
		this.worker = null;
		this.deltaTime = 1;
		this.counter = 0;
	}

	get running() { return this.worker !== null; }

	stop() {
		clearInterval(this.worker);
	}

	killPlayer(player) {
		let i = this.players.indexOf(player);
		if (i !== -1) {
			this.players.splice(i, 1);
			this.broadcast.emit('kill', player.id);
		}
	}

	removePlayer(player) {
		player.socket.disconnect();
		this.killPlayer(player);
	}

	setPlayerAxis(player, axis) {
		player.setAxis(axis);
		this.broadcast.emit('axis', { id: player.id, axis: player.axis });
		this.broadcast.emit('pos', { id: player.id, position: player.position });

	}

	damagePlayer(player, damage) {
		if (!player) {
			return;
		}
		player.status.health -= damage;
		if (player.alive) {
			let data = { id: player.id, health: player.status.health };
			player.socket.emit('hp:d', data);
			if (!this.config.showHealth) {
				delete data.health;
			}
			player.socket.broadcast.emit('hp:d', data);
		} else {
			this.killPlayer(player);
		}
	}


	changePlayerSlot(player, slot=-1) {
		if (slot < player.inventory.maxBar) {
			player.changeSlot(slot);
			clearTimeout(player.action);
			player.action = null;
			
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
		if (player.action) {
			player.hold = false;
			return;
		}
		let object = player.currentSlot;
		if (object) {
			if (object.accessible) {
				if (object.isReady() && object.value > 0) {
					let bullet = object.use(player.getPosition(), player.angle, player.radius);
					if (bullet) {
						bullet.id = object.ammoType.id;
						this.bullets.push(bullet);
						
						const data = {
							id : player.id,
							currentSlot : player.inventory.barIndex
						};
						player.socket.emit("action", data);
						data.currentSlot = object.id;
						player.socket.broadcast.emit("action", data);
						this.broadcast.emit("bullet", stringifyBullet(bullet));
					}
				}
				player.hold = object.isAuto;
				return;
			}
		}
		if (player.fist.ready) {
			this.broadcast.emit("punch", { id : player.id, side : player.punch() });
			player.hold = false;
		}
	}


	handlePlayerRequests(player) {
		let socket = player.socket;
		if (!socket) {
			return;
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
			if (player.action || player.hold) {
				return;
			}
			
			const currentSlot = player.currentSlot;
			if (!currentSlot) {
				return;
			}
			if (!currentSlot.type === "Weapon") {
				return;
			}
			let ammoIndex = player.inventory.getIndexByInstance(currentSlot.ammoType);
			if (ammoIndex === -1 || !(currentSlot.value < currentSlot.capacity)) {
				return;
			}


			player.socket.broadcast.emit("reload", {
				id : player.id,
				currentSlot : currentSlot.id
			});

			player.action = setTimeout(() => {
				const ammunition = [];
				let ammoIndex = player.inventory.getIndexByInstance(currentSlot.ammoType);
				while (ammoIndex !== -1 && currentSlot.value < currentSlot.capacity) {
					const ammo = player.inventory.getByItemIndex(ammoIndex);
					let fetched = Math.min((currentSlot.capacity - currentSlot.value), ammo.amount);
					currentSlot.value += fetched;
					ammo.value -= fetched;
					if (ammo.value <= 0) {
						player.inventory.removeItemByIndex(ammoIndex);
					}
					ammunition.push(stringifyItem(player.inventory.storage, ammoIndex));
					ammoIndex = player.inventory.getIndexByInstance(currentSlot.ammoType);
				}
				player.action = null;
	
				for (let ammoSlot of ammunition) {
					player.socket.emit("slot", ammoSlot);
				}
				if (ammunition.length > 0) {
					player.socket.emit("slotValue", {index : player.inventory.barIndex, value : currentSlot.value});
				}
			}, currentSlot.reloadTime);
			
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
				return;
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
						return;
					}
				}
			} else {
				if (!currentSlot.accessible) {
					return;
				}
			}
			
			socket.broadcast.emit("changeSlot", data);

		});
	
		socket.on("disconnect", () => {
			this.removePlayer(player);
			return;
		});
	}

	addPlayer(socket = null) {
		if (socket === null) {
			return;
		}
		const position = {
			x : Math.floor(Math.random() * this.map.size),
			y : Math.floor(Math.random() * this.map.size)
		};
		const player = new exports.assets.Player(
			position,
			this.config.radius,
			Object.assign({}, this.config.status),
			this.config.speed,
			this.config.defaultPlayerColor,
			this.newPlayerInventory
		);

		player.id = this.counter++;
		player.socket = socket;
		player.hold = false;
		player.action = null;
		player.steps = 0;

		let data = stringifyPlayer(player, this.config.showHealth);

		this.broadcast.emit("new", data);
		socket.emit("info", {roomName : this.stringify});
		delete data.health;
		Object.assign(data, {
			status : player.status,
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
		let lastLoop = Date.now();
		this.worker = setInterval(() => {
			let thisLoop = Date.now();
			for (let i = 0; i < this.players.length; i++) {
				let player = this.players[i];
				if (player) {
					this._updatePlayer(player);
					if (!player.alive) {
						this.killPlayer(player);
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
							this.damagePlayer(this.players[p], damage);
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
}


exports.BATTLE_ROYALE = class extends exports.Room {
	
	static get MODE_NAME() { return "BATTLE_ROYALE"; }
	
	static get DEFAULT_MODE() {
		return {
			maxPlayers : 3,
			timer : 35000
		}
	}

	constructor(name, config = {}, map = {}) {
		config = Object.assign(exports.BATTLE_ROYALE.DEFAULT_MODE, config);
		super(name, exports.BATTLE_ROYALE.MODE_NAME, config, map);

		this.started = null;
		this.timer = null;
	}

	get running() { return super.running || (this.started !== null)}

	_startTimer() {
		// Ticks every second (1000 miliseconds)
		this.timer = setInterval(() => {
			this.config.timer -= 1000;
			if (this.config.timer <= 0) {
				clearInterval(this.worker);
				this.broadcast.emit("info", {
					timer : 0
				});
			} else if (this.config.timer <= 3000) {
				this.broadcast.emit("info", {
					timer : this.config.timer
				});
			}
		}, 1000);
		this.worker = null;
	}
	
	addPlayer(socket) {
		if (this.started || this.started === null) { // If room didnt start at all or is already running (only if there are players to wait for)
			return;
		}
		this.players.push(socket);
		socket.join(this.stringify);
		socket.on("disconnect", () => {
			const index = this.players.indexOf(socket);
			if (index !== -1) {
				this.players.splice(index, 1);
			}
			this.broadcast.emit("info", {
				currentPlayers : this.players.length
			});
		});
		
		const info = {
			roomName : this.stringify,
			maxPlayers : this.config.maxPlayers,
			status : "queue"
		};


		if (this.players.length >= this.config.maxPlayers) {
			this.run();
			if (this.forceStart) {
				clearInterval(this.forceStart);
				this.forceStart = null;
			}
		} else {
			socket.emit("info", info);
		}
		this.broadcast.emit("info", {
			currentPlayers : this.players.length
		});
	}

	killPlayer(player) {
		if (this.started === false || this.config.timer <= 0) {
			return;
		}
		super.killPlayer(player);
		// Last player
		if (this.players.length === 1) {
			this.players[0].socket.emit("info", {
				status : "won"
			});
		}
	}

	run() {
		if (this.started === null) {
			this.started = false;
		} else if (this.started === false) {

			// Making a new array of players instead of sockets
			const sockets = this.players;
			this.players = [];
			for (let socket of sockets) {
				socket.removeAllListeners(["disconnect"])
				super.addPlayer(socket);
			}

			this.started = true;
			super.run();
			this._startTimer();
			this.broadcast.emit("info", {
				timer : this.config.timer
			});
		}
	}
}
