class PlayerUI {

	static get PROPERTIES() {
		return {
			border : {
				size : 5,
				color : [160, 169, 220, 180]
			},

			block : {
				size : 70,
				color : [100, 100, 100, 200],
				stroke : [255, 255, 255, 100],
				strokeWeight : 1,
				highlightColor : [255, 0, 0, 100],
				heightlightStroke : [255, 255, 255],
				heightlightStrokeWeight : 4

			},
			spacing : 4,
			radius : 12
		};
	}

	constructor(player) {
		this.player = player;
		this.border = PlayerUI.PROPERTIES.border;
		this.block = PlayerUI.PROPERTIES.block;
		this.spacing = PlayerUI.PROPERTIES.spacing;
		this.radius = PlayerUI.PROPERTIES.radius;
		this.focus = false;
	}

	toggle() {
		this.focus = !this.focus;
	}

	__drawBorder(x, y, w, h, radius = this.radius) {
		push();
		rectMode(CENTER);
		imageMode(CENTER);
		noStroke();
		fill(this.border.color);
		rect(
			x,
			y,
			((this.block.size + this.spacing) * w) + this.border.size - this.spacing,
			((this.block.size + this.spacing) * h) + this.border.size - this.spacing,
			radius
		);
		pop();
	}

	_drawBlock(x, y, slot, highlight=false) { //hightlight mode 0-NONE -1 Onselect -2 On mouse
		push();
		if (highlight) {
			stroke(this.block.heightlightStroke);
			fill(this.block.highlightColor);
			strokeWeight(this.block.heightlightStrokeWeight);
		} else {
			stroke(this.block.stroke);
			fill(this.block.color);
			strokeWeight(this.block.strokeWeight);
		}
		rect(x, y, this.block.size, this.block.size, this.radius);
		pop();
		if (!Item.valid(slot)) {
			return null;
		}
		if (ICONS[slot.name]) {
			image(ICONS[slot.name], x, y, this.block.size, this.block.size);
		}
		let value = "";
		if (slot.amount > 1) {
			value = "x" + slot.value.toString();
		} else {
			if (slot.type === "Weapon") {
				value = slot.value.toString();
			}
		}

		push();
		fill(255);
		noStroke();
		textAlign(CENTER);
		textSize(this.block.size / 5)
		text(value, x, y + this.block.size * .45);
		pop();
	}

	draw() {
		let length = this.player.inventory.maxBar;
		push();
		rectMode(CENTER);
		imageMode(CENTER);
		translate(
			(width / 2) + (this.block.size / 2),
			height - this.block.size
		);
		this.__drawBorder(-this.block.size / 2, 0, length, 1);

		for (let x = -length / 2; x < length / 2; x++) {
			this._drawBlock(
				this.spacing / 2 + (this.block.size + this.spacing) * x,
				0,
				this.player.inventory.bar[(length / 2) + x],
				(length / 2) + x === this.player.inventory.barIndex
			);
		}
		pop();

		if (!this.focus) {
			return null;
		}

		length = Math.ceil(Math.sqrt(this.player.inventory.maxStorage));
		let value = Math.sqrt(this.player.inventory.maxStorage) % 1;
		value = value % 1 >= .5 || value % 1 === 0 ? 0 : 1;
		push();
		rectMode(CENTER);
		imageMode(CENTER);
		translate(
			(width / 2) + (this.block.size / 2),
			(this.block.size * length / 2) + this.block.size
		);

		this.__drawBorder(-this.block.size / 2, -this.block.size / 2 * value, length, length - value);
		translate(0, this.block.size / 2);
		let index = 0;
		for (let y = -length / 2; y < length / 2; y++) {
			for (let x = -length / 2; x < length / 2 && index < this.player.inventory.maxStorage; x++) {
				this._drawBlock(
					this.spacing / 2 + (this.block.size + this.spacing) * x,
					this.spacing / 2 + (this.block.size + this.spacing) * y,
					this.player.inventory.storage[index++],
					false
				);
			}
		}

		pop();
	}
}



function drawBackground() {
	background(GROUND_COLOR);
	//draw grid
	let deltaX = CAMERA.x % GRID_GAP;
	let deltaY = CAMERA.y % GRID_GAP;
	let lengthX = Math.ceil(width / GRID_GAP);
	let lengthY = Math.ceil(height / GRID_GAP);

	push();
	translate(0, 0);
	strokeWeight(2);
	stroke([0, 0, 0, 120]);
	for (let x = 0; x <= lengthX; x++) {
		line(GRID_GAP*x - deltaX, 0, GRID_GAP*x - deltaX, height);
	}
	for (let y = 0; y <= lengthY; y++) {
		line(0, GRID_GAP*y  - deltaY, width, GRID_GAP*y - deltaY);
	}
	pop();
}


function drawStats() {
	return;
	const gap = width/3;
	const length = width - gap*2;
	const barHeight = 30;
	const radius = 0;
	const hp = Math.max(map(player.health, 0, 100, 0, length), 0);
	const color = map(player.health, 0, 100, 0, 255);

	push();
	noStroke();
	fill(255, color, color);
	rect(gap, height-(barHeight*1.6), hp, barHeight, radius);
	noFill();
	stroke(0);
	strokeWeight(2);
	rect(gap, height-(barHeight*1.6), length, barHeight, radius);
	pop();
}
