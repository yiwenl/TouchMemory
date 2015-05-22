// app.js

navigator.getMedia = ( navigator.mozGetUserMedia ||
					   navigator.getUserMedia ||
					   navigator.webkitGetUserMedia ||
					   navigator.msGetUserMedia);

require("./libs/bongiovi-min.js");

var TL = [-289.578, 417.978, -123.786];
var BR = [275.272, 194.074, -52.8049];

(function() {

	var map = function(value, sx, sy, tx, ty) {
		var p = (value - sx) / (sy - sx);
		if(p < 0) {
			p = 0;
		} else if(p > 1) {
			p = 1;	
		} 
		return p * (ty - tx) + tx;
	}

	var SceneApp = require("./SceneApp");
	var numSlices = Math.floor(window.innerWidth/10);

	App = function() {
		console.log('Num slices : ', numSlices);
		if(document.body) this._init();
		else {
			window.addEventListener("load", this._init.bind(this));
		}
	}

	var p = App.prototype;

	p._init = function() {

		this.captures = [];

		this.canvas = document.createElement("canvas");
		this.canvas.width = window.innerWidth;
		this.canvas.height = window.innerHeight;
		document.body.appendChild(this.canvas);

		this.ctx = this.canvas.getContext("2d");

		if (navigator.getMedia) {
			navigator.getMedia({video:true}, this._onStream.bind(this), function(e) {
				console.log( "Error Getting media" );
			});
		} else {
			console.log("getUserMedia not supported");
		}

		this.handX = -1;
		this.handY = -1;

		var that = this;

		Leap.loop({
			frame: function(frame) {
				var fingers = frame.fingers;
				if(fingers.length == 0) {
					that.handX = -1;
				} else {
					var finger = that._getFinger(fingers);
					that.handX = map(finger.stabilizedTipPosition[0], TL[0], BR[0], 0, 1);
					that.handY = map(finger.stabilizedTipPosition[1], TL[1], BR[1], 0, 1);
				}
			}

		});


		bongiovi.Scheduler.addEF(this, this._loop);
	};

	p._getFinger = function(fingers) {
		var finger;
		var minZ = 9999;
		for(var i=0; i<fingers.length; i++) {
			// console.log(i, fingers[i]);
			if(fingers[i].stabilizedTipPosition[2] < minZ) {
				finger = fingers[i];
				minZ = fingers[i].stabilizedTipPosition[2];
			}
		}

		return finger;
	};


	p._onStream = function(stream) {
		this.video = document.body.querySelector("video");
		this.video.src = window.URL.createObjectURL(stream);
		this.video.play();

		this.video.style.opacity = 0.01;
	};

	p._loop = function() {
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
		// this.ctx.fillStyle = "#333";
		// this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

		var wWindow = window.innerWidth / numSlices;

		if(!this.video || this.video.videoWidth == 0) return;
		if(this.captures.length<numSlices) {
			this._getFrame();
			document.body.querySelector('p').innerHTML = Math.floor(this.captures.length / numSlices * 100) + "%";
			return;
		}

		if(this.handX > -1) {
			var maxDist = 20;
			var handSlice = this.handX * numSlices;
			for(var i=0; i<numSlices; i++) {
				var dist = Math.abs(i - handSlice);
				var offset = 1.0;
				if(dist < maxDist) {
					offset = dist/maxDist;
				}

				var frame = Math.floor(offset * numSlices);
				if(frame == numSlices) frame = numSlices-1;

				var v = this.captures[frame];
				var wCanvas = v.width / numSlices;
				this.ctx.drawImage(v, wCanvas*i, 0, wCanvas, v.height, wWindow * i, 0, wWindow, this.canvas.height);
			}
			
			// this.ctx.fillStyle = "#f99";
			// var x = this.handX * this.canvas.width;
			// var y = this.handY * this.canvas.height;
			// var size = 20;
			// this.ctx.fillRect(x-size, y-size, size*2, size*2);

			return;
		}

		this._getFrame();
		for(var i=0; i<numSlices; i++) {
			var v = this.captures[i];
			var wCanvas = v.width / numSlices;
			this.ctx.drawImage(v, wCanvas*i, 0, wCanvas, v.height, wWindow * i, 0, wWindow, this.canvas.height);
		}
	};


	p._getFrame = function() {
		if(this.captures.length < numSlices) {
			var canvas = document.createElement("canvas");
			canvas.width = this.video.videoWidth;
			canvas.height = this.video.videoHeight;
		} else {
			var canvas = this.captures.shift();
		}

		var ctx = canvas.getContext("2d");
		ctx.drawImage(this.video, 0, 0);
		this.captures.push(canvas);

		
	};

})();


new App();