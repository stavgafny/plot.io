const fixedCamera = pos => {
 	return {x : width/2 - CAMERA.x + pos.x, y : height/2 - CAMERA.y + pos.y};
}

const inRange = pos => {
	return !(pos.x < 0 || pos.x > width ||
		pos.y < 0 || pos.y > height);
}

const toAngle = (target, position) => {
	let v1 = width/position.x;
	let v2 = height/position.y;
	let a = atan2(target.y - height / v2, target.x - width / v1);
	return a;
}

const msToTime = duration => {
    let seconds = parseInt((duration / 1000) % 60),
		minutes = parseInt((duration / (1000 * 60)) % 60),
		hours = parseInt((duration/(1000 * 60 * 60)) % 24);

    hours = (hours < 10) ? "0" + hours : hours;
    minutes = (minutes < 10) ? "0" + minutes : minutes;
    seconds = (seconds < 10) ? "0" + seconds : seconds;

    return hours + ":" + minutes + ":" + seconds;
}