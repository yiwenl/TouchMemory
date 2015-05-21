// app.js
require("./libs/bongiovi-min.js");

navigator.getMedia = ( navigator.mozGetUserMedia ||
					   navigator.getUserMedia ||
					   navigator.webkitGetUserMedia ||
					   navigator.msGetUserMedia);

(function() {
	var SceneApp = require("./SceneApp");

	App = function() {
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
		this.numSlides = Math.floor(this.canvas.width / 2);
		this.ctx = this.canvas.getContext("2d");
		document.body.appendChild(this.canvas);

		if (navigator.getMedia) {
			navigator.getMedia({video:true}, this._onStream.bind(this), function(e) {
				console.log( "Error Getting media" );
			});
		} else {
			console.log("getUserMedia not supported");
		}

		bongiovi.Scheduler.addEF(this, this._loop);

		window.addEventListener("mousedown", this._onDown.bind(this));
		window.addEventListener("mouseup", this._onUp.bind(this));
		window.addEventListener("mousemove", this._onMove.bind(this));
	};

	p._onStream = function(stream) {
		this.video = document.body.querySelector("video");
		this.video.src = window.URL.createObjectURL(stream);
		this.video.play();
		this.video.style.opacity = 0;
	};

	p._loop = function() {

		if(!this.video || this.video.videoWidth == 0) return;

		this.getFrame();

		if(this.captures.length < this.numSlides) {
			document.querySelector('p').innerHTML = Math.floor(this.captures.length / this.numSlides * 100) + "%";
			return;
		}

		var wCanvas = this.canvas.width / this.numSlides;
		for(var i=0; i<this.numSlides; i++){
			var v = this.captures[i];
			var wVideo = v.width / this.numSlides;

			this.ctx.drawImage(v, i*wVideo, 0, wVideo, v.height, i*wCanvas, 0, wCanvas, this.canvas.height);
		}
	};

	p.getFrame = function() {
		var canvas;
		if(this.captures.length < this.numSlides) {
			canvas = document.createElement("canvas");
			canvas.width = this.video.videoWidth;
			canvas.height = this.video.videoHeight;
		} else {
			canvas = this.captures.shift();
		}

		var ctx = canvas.getContext("2d");
		ctx.drawImage(this.video, 0, 0);
		this.captures.push(canvas);
	};

	p._onDown = function(e) {
		
	};

	p._onUp = function(e) {
		
	};

	p._onMove = function(e) {
		
	};

})();


new App();