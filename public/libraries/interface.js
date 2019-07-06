class PlayerUI {
	
	static get PROPERTIES() {
		return {
			border : {
				size : 10,
				color : [160, 160, 160, 180]
			},

			block : {
				size : 70,
				color : [80, 80, 80, 120],
				stroke : [0, 0, 0, 80],
				strokeWeight : 0,
				highlight : {
					color : [30, 100, 200, 120],
					stroke : [255, 255, 255, 150],
					strokeWeight : 0
				},
				select : {
					color : [255, 255, 255, 100],
					stroke : [255, 255, 255],
					strokeWeight : 0
				}
			},
			spacing : 6,
			radius : 4
		};
	}

	static get INFO() {
		return {
			pickUp : "Press [E] to pick up"
		};
	}


	constructor(player) {
		this.player = player;
		this.border = PlayerUI.PROPERTIES.border;
		this.block = PlayerUI.PROPERTIES.block;
		this.spacing = PlayerUI.PROPERTIES.spacing;
		this.radius = PlayerUI.PROPERTIES.radius;
		this.focus = false;
		this.select = null;
		this.hold = null;

		this.blob = null;
	}


	toggle() {
		this.focus = !this.focus;
		this.hold = null;
	}


	_mouseOnBlock(x, y) {
		return mouseX > x - this.block.size / 2 &&
			mouseX < x + this.block.size / 2 &&
			mouseY > y - this.block.size / 2 &&
			mouseY < y + this.block.size / 2;
	}


	_drawBorder(x, y, w, h, radius = this.radius) {
		push();
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


	_block(x, y, index, highlight = false, hold = false) { // hightlight mode 0-NONE -1 Onselect -2 On mouse
		push();
		let slot = this.player.inventory.storage[index];
		let select = false;

		if (this.focus && this.select === null && (slot || this.hold !== null) && !hold) {
			let isHoldedSelected = false;
			if (!isHoldedSelected) {
				if (this._mouseOnBlock(x, y)) {
					this.select = index;
					select = true;
				}
			}
		}

		if (select && slot !== this.hold) { // not selcets the holded item and not selecting empty blocks
			stroke(this.block.select.stroke);
			fill(this.block.select.color);
			strokeWeight(this.block.select.strokeWeight);
		}
		else if (highlight) {
			stroke(this.block.highlight.stroke);
			fill(this.block.highlight.color);
			strokeWeight(this.block.highlight.strokeWeight);
		} else {
			stroke(this.block.stroke);
			fill(this.block.color);
			strokeWeight(this.block.strokeWeight);
		}
		rect(x, y, this.block.size, this.block.size, this.radius);
		pop();
		if (!Item.valid(slot)) {
			return false;
		}
		const icon = ICONS[slot.name] ? ICONS[slot.name] : ICONS['none'];
		image(icon, x, y, this.block.size, this.block.size);

		const textValue = itemToValueFormat(slot);

		push();
		fill(255);
		noStroke();
		textAlign(RIGHT, CENTER);
		textSize(this.block.size / 5)
		text(textValue, x + this.block.size / 2 - 4, y + this.block.size / 2 - 8);
		pop();
	}


	draw(grabbableItem = null) {


		if (grabbableItem && !this.focus) {
			push();
			translate(width / 2, height / 1.5);
			textAlign(CENTER, CENTER);
			textSize(20);
			fill(255);
			noStroke();
			text(`${PlayerUI.INFO.pickUp} ${grabbableItem.name}`, 0, 0);
			pop();	
		}

		if (this.blob) {
			if (this.blob.current < this.blob.final + this.blob.delay) {
				this._delayBlob();
			} else {
				this.clearDelayBlob();
			}
		}

		let length = this.player.inventory.maxBar;
		let X, Y, index;
		this.select = null;

		push();
		rectMode(CENTER);
		imageMode(CENTER);
		X = (width / 2) + (this.block.size / 2);
		Y = height - this.block.size;
		this._drawBorder(X - this.block.size / 2, Y, length, 1);
		index = 0;
		for (let x = -length / 2; x < length / 2; x++) {
			this._block(
				X + this.spacing / 2 + (this.block.size + this.spacing) * x,
				Y,
				index,
				index++ === this.player.inventory.barIndex
			);
		}

		if (!this.focus) {
			pop();
			return null;
		}

		length = Math.ceil(Math.sqrt(this.player.inventory.maxStorage));
		let value = Math.sqrt(this.player.inventory.maxStorage) % 1;
		value = value % 1 >= .5 || value % 1 === 0 ? 0 : 1;
		let gap = this.block.size / 2;
		X = (width / 2) + (this.block.size / 2);
		Y -= gap + this.border.size + ((this.spacing +  this.block.size) * ((length / 2.0) - 0.5 * value)) - this.spacing / 2;
		this._drawBorder(
			X - this.block.size / 2,
			Y - this.block.size / 2,
			length,
			length - value
		);
		
		Y += (this.block.size / 2) * value;
		for (let y = -length / 2; y < length / 2; y++) {
			for (let x = -length / 2; x < length / 2 && (index-this.player.inventory.maxBar) < this.player.inventory.maxStorage; x++) {
				this._block(
					X + this.spacing / 2 + (this.block.size + this.spacing) * x,
					Y + this.spacing / 2 + (this.block.size + this.spacing) * y,
					index++,
					false
				);
			}
		}
		if (this.hold !== null) {
			const item = this.player.inventory.storage[this.hold.index];
			this.player.inventory.storage[this.hold.index] = this.hold.item;
			this._block(
				mouseX,
				mouseY,
				this.hold.index,
				false,
				true
			);
			this.player.inventory.storage[this.hold.index] = item;
		}
		pop();
	}


	mousePressed(mode = 0) {
		if (this.select === null) {
			return;
		}
		this.hold = {
			index : this.select,
			item : this.player.inventory.storage[this.select].clone
		}

		if (mode === Storage.MODES.half) {
			this.hold.item.amount = Math.floor(this.hold.item.amount / 2.0);
		} else if (mode === Storage.MODES.one) {
			this.hold.item.amount = 1;
		}

	}
	
	
	mouseReleased() {
		if (this.hold === null) {
			return null;
		}
		const value = {
			source : this.hold.index
		};

		if (this.select !== null) {
			Object.assign(value, { target : this.select })
		}

		this.hold = null;

		return value;
	}


	drawStatus() {
		const spacing = 0;
		const borderWidth = 220;
		const borderHeight = 120;
		const innerSpacing = 8;
		const iconsGap = 24;
		push();
		translate(width - borderWidth - spacing, height - borderHeight - spacing);
		fill(100, 100, 100, 140);
		noStroke();
		rect(0, 0, borderWidth, borderHeight);
		imageMode(CENTER);
		textAlign(CENTER, CENTER);
		textSize(20);

		const STATUS = [
			{
				name : "health",
				color : [137, 210, 50]
			},
			{
				name : "thirst",
				color : [68, 151, 211]
			},
			{
				name : "hunger",
				color : [220, 111, 50]
			}
		];
		const gap = (borderHeight - (innerSpacing * (STATUS.length + 1))) / STATUS.length;
		for (let i = 0; i < STATUS.length; i++) {
			noStroke();
			image(
				ICONS[STATUS[i].name],
				(iconsGap + innerSpacing) / 2,
				innerSpacing + (innerSpacing + gap) * i + (gap / 2),
				gap,
				gap
			);

			const $x = innerSpacing + iconsGap,
			$y = innerSpacing + (innerSpacing + gap) * i,
			$width = borderWidth - (innerSpacing * 2) - iconsGap;

			fill(0, 0, 0, 120);
			rect(
				$x,
				$y,
				$width,
				gap
			);
			const maximum = assets.Player.STATUS.maximum[STATUS[i].name]
			const value = Math.min(Math.max(this.player.status[STATUS[i].name], 0), maximum);
			fill(
				...STATUS[i].color,
				255
			);
			const length = map(value, 0, maximum, 0, $width);
			//fill(255, 255, 255, 220);
			rect(
				$x,
				$y,
				length,
				gap
			);
			
			fill(255);
			text(
				value.toFixed(0),
				$x + ($width / 2),
				innerSpacing / 4 + $y + (gap) / 2
			);			
		}

		pop();

	}


	get BLOB_PROPERTIES() {
		return {
			radius : 80
		}
	}

	setDelayBlob(delay) {
		this.blob = {
			final : Date.now(),
			current : Date.now(),
			delay : delay
		};
	}

	_delayBlob() {
		this.blob.current = Date.now();
		const value = Math.max(this.blob.final + this.blob.delay - this.blob.current, 0);
		push();
		translate(width / 2, (height / 2) - 150);
		noStroke(0);
		fill(100, 100, 100, 100);
		ellipse(0, 0, this.BLOB_PROPERTIES.radius);
		noFill();
		stroke(255);
		const arcValue = map(value, 0, this.blob.delay, 0, TWO_PI);
		push();
		strokeWeight(5);
		strokeCap(SQUARE);
		scale(1, -1);
		arc(0, 0, this.BLOB_PROPERTIES.radius, this.BLOB_PROPERTIES.radius, arcValue + HALF_PI, HALF_PI);
		pop();

		fill(255);
		noStroke();
		textAlign(CENTER, CENTER);
		const seconds = value / 1000.0;
		textSize(this.BLOB_PROPERTIES.radius / 4);
		text(seconds.toFixed(1), 0, 0);

		pop();
	}

	clearDelayBlob() {
		this.blob = null;
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





function drawInfo() {
	const borderSize = 80;
	const spacing = 10;

	// Players counter
	push();
	translate(spacing, height - borderSize - spacing);
	noStroke();
	fill(60, 60, 60, 150)
	rect(0, 0, borderSize, borderSize, 30);
	textAlign(CENTER, CENTER);
	textSize(borderSize / 3);
	fill(255);
	text((players.length + 1).toString(), borderSize / 2, borderSize / 2);
	pop();

	// Timer
	push();
	translate(width / 2, 0);
	noStroke();
	fill(90, 90, 90, 150)
	rect(-borderSize, 0, borderSize * 2, borderSize / 2, 30);
	textAlign(CENTER, CENTER);
	textSize(borderSize / 3);
	fill(255);
	text(msToTime(game.timer), 0, borderSize / 4);
	pop();

	// Player's position and current frame rate
	push();
	translate(width - 20, 30);
	textAlign(RIGHT, CENTER);
	textSize(20);
	fill(255);
	text(`X: ${player.position.x.toFixed(0)} Y: ${player.position.y.toFixed(0)}`, 0, 0);
	fill(255);
	translate(-width + 30, 0);
	textAlign(LEFT, CENTER);
	text(`Fps : ${floor(game.fps)}`, 0, 0);
	pop();
}


function drawStatus() {
	push();
	background(STATUS.background);
	translate(width / 2, height / 2);
	fill(255);
	noStroke();
	textSize(20);
	textAlign(CENTER, CENTER);
	if (typeof game.status === "string") {
		let textValue = game.status;
		if (game.mode === MODES.battleRoyale) {

			if (game.status === STATUS.queue) {
				textValue += `\nQueue: ${game.currentPlayers}/${game.maxPlayers}`;
			}
			else if (game.status === STATUS.dead) {
				textValue += `\nYour rank is #${(players.length + 1).toString()}`;
			}
			else if (game.status === STATUS.won) {

			}

		}

		text(textValue, 0, 0);


		//button("asd", 0, 0);
	}
	pop();
}