// ~All game core objects~

class Item {

    static get DEFAULT_STACK() { return 10; }

    static get BLOB_RADIUS() { return 38; }

    static valid(object) { return object instanceof Item; }

    constructor(name, accessible, maxAmount = 1) {
        this.name = name;
        this.accessible = accessible;
        this.maxAmount = maxAmount;
        this.amount = null;
    }

    get type() { return this.constructor.name; }

    get value() { return this.amount; }
    
    set value(amount) { this.amount = amount; }

    get stringify() {
        return {
            id : this.id,
            value : this.value
        };
    }

    get clone() {
        return Object.assign( Object.create( Object.getPrototypeOf(this)), this);
    }

    createBlob(position) {
        const blob = new Body(position, Item.BLOB_RADIUS);
        return blob;
    }
}


class Storage {

    static get MODES() {
        return {
            all : 0,
            half : 1,
            one : 2
        };
    }

    constructor(maxStorage) {
        this.maxStorage = maxStorage;
        this.storage = [];
        //this.storage = [], get value() { null  -> no amount or value only standalone item}
    }

    get maxCapacity() { return this.maxStorage; }

    get full() {
        for (let i = 0; i < this.maxCapacity; i++) {
            if (!Item.valid(this.storage[i])) {
                return false;
            } else if (this.storage[i].amount < this.storage[i].maxAmount) {
                return false;
            }
        }
        return true;
    }

    setStorage(inventory) {
        this.storage = inventory;
    }

    insert(item) {
        const slots = [];
        if (!Item.valid(item)) {
            return slots;
        }

        if (item.amount !== null) {
            for (let i = 0; i < this.maxCapacity; i++) {
                if (this.storage[i]) {
                    if (this.storage[i].id === item.id && this.storage[i].amount < this.storage[i].maxAmount) {
                        const fetched = Math.min((this.storage[i].maxAmount - this.storage[i].amount), item.amount);
                        this.storage[i].amount += fetched;
                        item.amount -= fetched;
                        slots.push(i);
                        if (item.amount <= 0) {
                            return slots;
                        }
                    }
                }
            }
        }
        for (let i = 0; i < this.maxCapacity; i++) {
            if (!this.storage[i]) {
                this.storage[i] = item;
                slots.push(i);
                return slots;
            }
        }

        return slots;
    }

    _swap(source, target = null) {
        // Returns item only if it was dropped
        let item = this.storage[source];
        this.storage[source] = this.storage[target];
        if (target >= 0 && target < this.maxCapacity && target !== null) {
            this.storage[target] = item;
            return null;
        }
        return item;
    }

    _combine(source, target) {
        const item1 = this.storage[source];
        const item2 = this.storage[target];
        const fetched = Math.min((item2.maxAmount - item2.amount), item1.amount);
        item2.amount += fetched;
        item1.amount -= fetched;
        if (item1.amount <= 0) {
            this.removeItemByIndex(source);
        }
        
    }

    change(source, target, mode = Storage.MODES.all) {
        // gets two items in inventory by their given index (input).
        // combines if they are the same items else tries to swap or drop.
        const item1 = this.storage[source];
        const item2 = this.storage[target];
        if (!item1) {
            return null;
        }

        if (mode === Storage.MODES.all) {
            if (item1 && item2) {
                if (item1.id === item2.id && item1.amount !== null) {
                    this._combine(source, target);
                    return null;
                }
            }
        } else {
            let modelable = false;
            if (item1.amount > 0) {
                if (item2) {
                    if (item2.id === item1.id) {
                        modelable = true
                    }
                } else {
                    modelable = true;
                }
            }

            if (modelable) {
                const clone = item1.clone;
                if (mode === Storage.MODES.half) {
                    const amount = item1.amount / 2.0;
                    item1.amount = Math.round(amount);
                    clone.amount = Math.floor(amount);
                } else if (mode === Storage.MODES.one) {
                    item1.amount--;
                    clone.amount = 1;
                } else {
                    return null;
                }

                let dropped = false;

                if (!item2) {        
                    if (clone.amount <= 0) {
                        clone.amount = item1.amount;
                        this.removeItemByIndex(source);
                    }
                    if (target >= 0) {
                        this.storage[target] = clone;
                    } else {
                        dropped = true;
                    }
                } else {
                    this.storage[source] = clone;
                    this._combine(source, target);
                    this.storage[source] = item1;
                    item1.amount += clone.amount; // Leftovers
                }
                
                if (item1.amount <= 0) {
                    this.removeItemByIndex(source);
                }

                if (dropped) {
                    return clone;
                }
                return null;
            }
        }
        return this._swap(source, target);
    }

    getIndexByInstance(item) {
        if (!item) {
            return -1;
        }
        for (let i = 0; i < this.storage.length; i++) {
            if (this.storage[i]) {
                if (this.storage[i].id === item.id) {
                    return i;
                }
            }
        }
        return -1;
    }

    getByItemIndex(index) {
        const item = this.storage[index];
        return item ? item : null;
    }

    removeItemByIndex(index) {
        if (index >= 0 && index < this.maxCapacity) {
            return delete this.storage[index];
        }
        return false;
    }

};


class Inventory extends Storage {

    constructor(maxStorage, maxBar) {
        super(maxStorage);
        this.maxBar = maxBar;
        this.barIndex = -1;
    }

    get currentSlot() { return this.storage[this.barIndex]; }
    
    get maxCapacity() { return super.maxCapacity + this.maxBar; }

    changeSlot(index=-1) {
        if (!(typeof(index) === 'number')) {
            return null;
        }
        if (this.barIndex !== index) {
            this.barIndex = index;
        }
    }

}


class Body {
    // ~rigid body~
    constructor(position, radius) {
        this.position = position;
        this.radius = radius;
    }
    collide(body) {
        return Math.pow(body.position.x - this.position.x, 2) + Math.pow(body.position.y - this.position.y, 2) <= Math.pow(this.radius + body.radius, 2);
    }
}


class Ammo extends Item {
    constructor(name, maxAmount, amount) {
        super(name, false, maxAmount);
        this.amount = amount;
    }
}


class Bullet extends Body {

    constructor(position, radius, velocity, range, damage, drag) {
        super(position, radius);
        this.velocity = velocity;
        this.range = range;
        this.damage = damage;
        this.drag = drag;
    }

    outOfRange() {
        return this.range <= 0;
    }

    update(deltaTime=1) {
        
		let ratio = 1.0 / (1 + (this.drag * deltaTime));
		this.velocity.x *= ratio;
        this.velocity.y *= ratio;
        
        this.position.x += this.velocity.x * deltaTime;
        this.position.y += this.velocity.y * deltaTime;
        this.range = Math.max(this.range - deltaTime, 0);
    }
}

class Weapon extends Item {
    constructor(weapon) {
        const {name, fireRate, velocity, damage, recoil, range, pulse, isAuto, size, ammoType, bulletDrag, capacity, reloadTime, ammo = 0} = weapon;
        super(name, true, 1);
        this.fireRate = fireRate;
        this.velocity = velocity;
        this.damage = damage;
        this.recoil = recoil;
        this.range = range;
        this.pulse = pulse;
        this.isAuto = isAuto;
        this.size = size;
        this.ammoType = ammoType;
        this.bulletDrag = bulletDrag;
        this.capacity = capacity;
        this.reloadTime = reloadTime;
        this.ammo = ammo;
        
        this.ready = true;
        this.currentPulse = 0;
    }

    get value() {return this.ammo; }

    set value(ammo) { this.ammo = ammo; }

    isReady() {
        return this.ready;
    }

    use(position, angle, radius) {
        this.ready = false;
        setTimeout(() => {
            this.ready = true;
        }, this.fireRate);
        
        let velocity = {
            x : Math.cos(angle) * this.velocity,
            y : Math.sin(angle) * this.velocity
        };

        let delta = (radius + (this.size.width * radius)) / this.velocity;
        position.x += velocity.x * delta;
        position.y += velocity.y * delta;

        let pulse = this.recoil * this.currentPulse / this.pulse;
        pulse *= (Math.random() * 2) - 1;
        this.currentPulse = this.pulse;
        
        velocity = {
            x : Math.cos(angle + pulse) * this.velocity,
            y : Math.sin(angle + pulse) * this.velocity
        };

        this.ammo--;
        return new Bullet(position, this.ammoType.RADIUS, velocity, this.range, this.damage, this.bulletDrag);
    }


    update(deltaTime=1) {
        this.currentPulse = Math.min(Math.max(this.currentPulse - ((this.pulse / 0.18)*deltaTime), 0), this.pulse);
    }
};




// ~All game assets~


(function(exports) {

    exports.Player = class extends Body {

        static get DEFAULT_INVENTORY() { return new Inventory(4, 2); }
        
        static get STATUS() {
            return {
                default : {
                    health : 50,
                    thirst : 120,
                    hunger : 250
                },
                maximum : {
                    health : 100,
                    thirst : 1000,
                    hunger : 1000
                },
                decrement : {
					health : 1.5,
                    thirst : 0.72,
                    hunger : 1.422
                }
            };
        }

        constructor(position, radius, status, speed, color, inventory = []) {
            super(position, radius);
            this.status = status;
            this.speed = speed;
            this.setColor(color);

            this.inventory = exports.Player.DEFAULT_INVENTORY;
            this.inventory.storage = inventory;
            

            this.axis = {
                x: 0,
                y: 0
            };

            this.angle = 0;
            this.fist = {
                ready: true,
                range: this.radius * 1.2,
                delay: 350,
                dist: this.radius * .65,
                radius: this.radius * .295,
                hitBox: false,
                side: 0
            };
            
            this.currentSlot = null;
        }

        get alive() { return this.status.health > 0; }

		updateStatus(deltaTime) {
			const values = ["thirst", "hunger"];
			let penalty = 0;
			for (let value of values) {
				const decrement = exports.Player.STATUS.decrement[value];
				if (decrement && this.status.hasOwnProperty(value)) {
					this.status[value] -= decrement * deltaTime;
					if (this.status[value] < 0) {
						penalty += this.status[value];
						this.status[value] = 0;
					}
				}
			}
			const decrement = exports.Player.STATUS.decrement.health;
			this.status.health = this.status.health + (penalty * decrement);
		}

        getPosition() {
            return {x : this.position.x, y : this.position.y};
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

        setColor(color) {
            this.color = color;
            if (!this.color.fist) {
                this.color.fist = this.color.body;
            }
        }

        getAxis() {
            return { x: this.axis.x, y: this.axis.y };
        }

        setAxis(axis) {
            Object.assign(this.axis, axis);
        }


        update(deltaTime=1) {
            this.position.x += (this.speed * this.axis.x) * deltaTime;
            this.position.y += (this.speed * this.axis.y) * deltaTime;
            if (this.currentSlot) {
                if (this.currentSlot.accessible) {
					this.currentSlot.update(deltaTime);
				}
            }
        }

        punch(side = Math.round(Math.random())) {
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

            return new Body({
                x: this.position.x + (this.fist.dist + this.fist.range) * x,
                y: this.position.y + (this.fist.dist + this.fist.range) * y
            }, this.fist.radius);
        }

        changeSlot(slot) {
            this.inventory.changeSlot(slot);
            this.currentSlot = this.inventory.currentSlot;
            if (this.currentSlot) {
                if (this.currentSlot.accessible) {
                    this.currentSlot.ready = true;
                }
            }
            return this.currentSlot;
        }

    };
    

    exports.Wood = class extends Item {
        constructor(amount = 1) {
            super("Wood", false, Item.DEFAULT_STACK);
            this.amount = amount;
        }
    }


    exports.Stone = class extends Item {
        constructor(amount = 1) {
            super("Stone", false, Item.DEFAULT_STACK);
            this.amount = amount;
        }
    }


    exports.A9MM = class extends Ammo {

        static get RADIUS() { return 4; }
        
        constructor(amount = 1) {
            super("9mm", 32, amount);
        }
    };


    exports.A556 = class extends Ammo {
        
        static get RADIUS() { return 5; }
        
        constructor(amount = 1) {
            super("5.56", 32, amount);
        }
    };


    exports.A762 = class extends Ammo {
        
        static get RADIUS() { return 5; }
        
        constructor(amount = 1) {
            super("7.62", 32, amount);
        }
    };


    exports.M9 = class extends Weapon {

        static get PROPERTIES() {
            return {
                name : "M9",
                fireRate : 94,
                velocity : 1278,
                damage : 14,
                recoil : 0.4,
                range : 1.08,
                pulse : 0.45,
                isAuto : false,
                size : {
                    width : 1,
                    height : .35
                },
                ammoType : exports.A9MM,
                bulletDrag : 0.015,
                capacity : 15,
                reloadTime : 2100
            };
        }

        constructor(ammo) {
            super(Object.assign(exports.M9.PROPERTIES, {ammo : ammo}));
        }
    };
    

    exports.M4 = class extends Weapon {

        static get PROPERTIES() {
            return {
                name : "M4",
                fireRate : 70,
                velocity : 1288,
                damage : 14,
                recoil : 0.4,
                range : 1.25,
                pulse : 0.5,
                isAuto : true,
                size : {
                    width : 2.4,
                    height : .35
                },
                ammoType : exports.A556,
                bulletDrag : 0.015,
                capacity : 30,
                reloadTime : 3100
            };
        }

        constructor(ammo) {
            super(Object.assign(exports.M4.PROPERTIES, {ammo : ammo}));
        }
    };


    exports.AK47 = class extends Weapon {

        static get PROPERTIES() {
            return {
                name : "AK-47",
                fireRate : 100,
                velocity : 1332,
                damage : 20,
                recoil : 0.195,
                range : 2.05,
                pulse : 0.55,
                isAuto : true,
                size : {
                    width : 2.2,
                    height : .38
                },
                ammoType : exports.A762,
                bulletDrag : 0.01,
                capacity : 30,
                reloadTime : 2500
            };
        }

        constructor(ammo) {
            super(Object.assign(exports.AK47.PROPERTIES, {ammo : ammo}));
        }
    };
    
    
    for(let i = 0; i < Object.keys(exports).length; i++) {
        let object = exports[Object.keys(exports)[i]];
        object.id = i;
        object.prototype.id = i;
    };

})(typeof exports === 'undefined' ? this['assets'] = {} : exports);
