// ~All game core objects~

class Item {

    static get stack() { return 64; }

    constructor(name, accessible, maxAmount = 1) {
        this.name = name;
        this.accessible = accessible;
        this.maxAmount = maxAmount;
    }

    get id() {
        return Object.keys(exports).indexOf(this.name);
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

class Body {
    constructor(position, radius) {
        this.position = position;
        this.radius = radius;
    }
    collide(body) {
        return Math.pow(body.position.x - this.position.x, 2) + Math.pow(body.position.y - this.position.y, 2) <= Math.pow(this.radius + body.radius, 2);
    }
}

class Ammo extends Item {
    constructor(name) {
        super(name, false, Item.stack);
    }
};

class Bullet extends Body {
    constructor(position, radius, velocity, range) {
        super(position, radius);
        this.velocity = velocity;
        this.range = range;
    }

    outOfRange() {
        return this.range <= 0;
    }

    update(deltaTime=1) {
        this.position.x += this.velocity.x * deltaTime;
        this.position.y += this.velocity.y * deltaTime;
        this.range = Math.max(this.range - deltaTime, 0);
    }
}

// ~All game assets~



(function(exports) {

    exports.Player = class extends Body {

        static get numberOfSlots() { return 2; }

        constructor(position, radius, health, speed, color, inventory = []) {
            super(position, radius);
            this.health = health;
            this.speed = speed;
            this.setColor(color);
            this.inventory = inventory;
            this.slotIndex = -1;
            this.axis = {
                x: 0,
                y: 0
            };

            this.angle = 0;
            this.fist = {
                ready: true,
                range: this.radius * 1.2,
                delay: 400,
                dist: this.radius * .65,
                radius: this.radius * .28,
                hitBox: false,
                side: 0
            };
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
            return { x: this.axis.x, y: this.axis.y };
        }

        setAxis(axis) {
            Object.assign(this.axis, axis);
        }


        update(deltaTime=1) {
            this.position.x += (this.speed * this.axis.x) * deltaTime;
            this.position.y += (this.speed * this.axis.y) * deltaTime;
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

        getSlotIndex() {
            return this.slotIndex;
        }

        changeSlot(index) {
            this.slotIndex = index;
        }

        getCurrentSlot() {
            return this.inventory[this.slotIndex];
        }
    };

    
    exports.Weapon = class extends Item {
        constructor(name, fireRate, maxAmmo, velocity, recoil, range, isAuto, bullet) {
            super(name, true, 1);
            this.fireRate = fireRate;
            this.maxAmmo = maxAmmo;
            this.velocity = velocity;
            this.recoil = recoil;
            this.range = range;
            this.isAuto = isAuto;
            this.bullet = bullet;
            this.ready = true;
        }

        isReady() {
            return this.ready;
        }

        use(position, angle) {
            let velocity = {
                x : Math.cos(angle) * this.velocity,
                y : Math.sin(angle) * this.velocity
            };
            
            this.ready = false;
            setTimeout(() => {
                this.ready = true;
            }, this.fireRate);

            return new Bullet(position, this.bullet.radius, velocity, this.range);
        }
    };


    exports.M4 = class extends exports.Weapon {
        constructor() {
            super("M4", 80, 30, 2.2, 0.6, 50, true, exports.A556);
        }
    };

    exports.A556 = class extends Ammo {
        static get radius() { return 10; }
        constructor() {
            super("A556");
        }
    }
	

})(typeof exports === 'undefined'? this['assets']={}: exports);
