(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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
},{"./SceneApp":2,"./libs/bongiovi-min.js":4}],2:[function(require,module,exports){
// SceneApp.js

var GL = bongiovi.GL, gl;

var ViewTest = require("./ViewTest");

function SceneApp() {
	gl = GL.gl;
	bongiovi.Scene.call(this);
}


var p = SceneApp.prototype = new bongiovi.Scene();

p._initTextures = function() {
	// console.log("init textures");
};

p._initViews = function() {
	// console.log('init views');
	this._vTest = new ViewTest();
};

p.render = function() {
	GL.clear(0, 0, 0, 0);

	GL.setMatrices(this.cameraOtho);
	GL.rotate(this.rotationFront);

	// this._vTest.render();
};

module.exports = SceneApp;
},{"./ViewTest":3}],3:[function(require,module,exports){
// ViewTest.js

var GL = bongiovi.GL;
var gl;



function ViewTest() {
	var frag = "#define GLSLIFY 1\n\nprecision mediump float;\n\nvoid main(void) {\n    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);\n}"
	bongiovi.View.call(this, null, frag);
}

var p = ViewTest.prototype = new bongiovi.View();
p.constructor = ViewTest;


p._init = function() {
	this.mesh = bongiovi.MeshUtils.createPlane(2, 2, 1);
};

p.render = function() {
	if(!this.shader.isReady() ) return;
	this.shader.bind();
	GL.draw(this.mesh);
};

module.exports = ViewTest;
},{}],4:[function(require,module,exports){
(function(d){var f;"undefined"==typeof exports?"function"==typeof define&&"object"==typeof define.amd&&define.amd?(f={},define(function(){return f})):f="undefined"!=typeof window?window:d:f=exports;(function(c){if(!h)var h=1E-6;if(!d)var d="undefined"!=typeof Float32Array?Float32Array:Array;if(!l)var l=Math.random;var f={setMatrixArrayType:function(a){d=a}};"undefined"!=typeof c&&(c.glMatrix=f);var s=Math.PI/180;f.toRadian=function(a){return a*s};var p={create:function(){var a=new d(2);return a[0]=
0,a[1]=0,a},clone:function(a){var b=new d(2);return b[0]=a[0],b[1]=a[1],b},fromValues:function(a,b){var e=new d(2);return e[0]=a,e[1]=b,e},copy:function(a,b){return a[0]=b[0],a[1]=b[1],a},set:function(a,b,e){return a[0]=b,a[1]=e,a},add:function(a,b,e){return a[0]=b[0]+e[0],a[1]=b[1]+e[1],a},subtract:function(a,b,e){return a[0]=b[0]-e[0],a[1]=b[1]-e[1],a}};p.sub=p.subtract;p.multiply=function(a,b,e){return a[0]=b[0]*e[0],a[1]=b[1]*e[1],a};p.mul=p.multiply;p.divide=function(a,b,e){return a[0]=b[0]/
e[0],a[1]=b[1]/e[1],a};p.div=p.divide;p.min=function(a,b,e){return a[0]=Math.min(b[0],e[0]),a[1]=Math.min(b[1],e[1]),a};p.max=function(a,b,e){return a[0]=Math.max(b[0],e[0]),a[1]=Math.max(b[1],e[1]),a};p.scale=function(a,b,e){return a[0]=b[0]*e,a[1]=b[1]*e,a};p.scaleAndAdd=function(a,b,e,k){return a[0]=b[0]+e[0]*k,a[1]=b[1]+e[1]*k,a};p.distance=function(a,b){var e=b[0]-a[0],k=b[1]-a[1];return Math.sqrt(e*e+k*k)};p.dist=p.distance;p.squaredDistance=function(a,b){var e=b[0]-a[0],k=b[1]-a[1];return e*
e+k*k};p.sqrDist=p.squaredDistance;p.length=function(a){var b=a[0];a=a[1];return Math.sqrt(b*b+a*a)};p.len=p.length;p.squaredLength=function(a){var b=a[0];a=a[1];return b*b+a*a};p.sqrLen=p.squaredLength;p.negate=function(a,b){return a[0]=-b[0],a[1]=-b[1],a};p.normalize=function(a,b){var e=b[0],k=b[1],e=e*e+k*k;return 0<e&&(e=1/Math.sqrt(e),a[0]=b[0]*e,a[1]=b[1]*e),a};p.dot=function(a,b){return a[0]*b[0]+a[1]*b[1]};p.cross=function(a,b,e){b=b[0]*e[1]-b[1]*e[0];return a[0]=a[1]=0,a[2]=b,a};p.lerp=function(a,
b,e,k){var v=b[0];b=b[1];return a[0]=v+k*(e[0]-v),a[1]=b+k*(e[1]-b),a};p.random=function(a,b){b=b||1;var e=2*l()*Math.PI;return a[0]=Math.cos(e)*b,a[1]=Math.sin(e)*b,a};p.transformMat2=function(a,b,e){var k=b[0];b=b[1];return a[0]=e[0]*k+e[2]*b,a[1]=e[1]*k+e[3]*b,a};p.transformMat2d=function(a,b,e){var k=b[0];b=b[1];return a[0]=e[0]*k+e[2]*b+e[4],a[1]=e[1]*k+e[3]*b+e[5],a};p.transformMat3=function(a,b,e){var k=b[0];b=b[1];return a[0]=e[0]*k+e[3]*b+e[6],a[1]=e[1]*k+e[4]*b+e[7],a};p.transformMat4=function(a,
b,e){var k=b[0];b=b[1];return a[0]=e[0]*k+e[4]*b+e[12],a[1]=e[1]*k+e[5]*b+e[13],a};p.forEach=function(){var a=p.create();return function(b,e,k,v,c,d){var h;e||(e=2);k||(k=0);for(v?h=Math.min(v*e+k,b.length):h=b.length;k<h;k+=e)a[0]=b[k],a[1]=b[k+1],c(a,a,d),b[k]=a[0],b[k+1]=a[1];return b}}();p.str=function(a){return"vec2("+a[0]+", "+a[1]+")"};"undefined"!=typeof c&&(c.vec2=p);var n={create:function(){var a=new d(3);return a[0]=0,a[1]=0,a[2]=0,a},clone:function(a){var b=new d(3);return b[0]=a[0],b[1]=
a[1],b[2]=a[2],b},fromValues:function(a,b,e){var k=new d(3);return k[0]=a,k[1]=b,k[2]=e,k},copy:function(a,b){return a[0]=b[0],a[1]=b[1],a[2]=b[2],a},set:function(a,b,e,k){return a[0]=b,a[1]=e,a[2]=k,a},add:function(a,b,e){return a[0]=b[0]+e[0],a[1]=b[1]+e[1],a[2]=b[2]+e[2],a},subtract:function(a,b,e){return a[0]=b[0]-e[0],a[1]=b[1]-e[1],a[2]=b[2]-e[2],a}};n.sub=n.subtract;n.multiply=function(a,b,e){return a[0]=b[0]*e[0],a[1]=b[1]*e[1],a[2]=b[2]*e[2],a};n.mul=n.multiply;n.divide=function(a,b,e){return a[0]=
b[0]/e[0],a[1]=b[1]/e[1],a[2]=b[2]/e[2],a};n.div=n.divide;n.min=function(a,b,e){return a[0]=Math.min(b[0],e[0]),a[1]=Math.min(b[1],e[1]),a[2]=Math.min(b[2],e[2]),a};n.max=function(a,b,e){return a[0]=Math.max(b[0],e[0]),a[1]=Math.max(b[1],e[1]),a[2]=Math.max(b[2],e[2]),a};n.scale=function(a,b,e){return a[0]=b[0]*e,a[1]=b[1]*e,a[2]=b[2]*e,a};n.scaleAndAdd=function(a,b,e,k){return a[0]=b[0]+e[0]*k,a[1]=b[1]+e[1]*k,a[2]=b[2]+e[2]*k,a};n.distance=function(a,b){var e=b[0]-a[0],k=b[1]-a[1],v=b[2]-a[2];return Math.sqrt(e*
e+k*k+v*v)};n.dist=n.distance;n.squaredDistance=function(a,b){var e=b[0]-a[0],k=b[1]-a[1],v=b[2]-a[2];return e*e+k*k+v*v};n.sqrDist=n.squaredDistance;n.length=function(a){var b=a[0],e=a[1];a=a[2];return Math.sqrt(b*b+e*e+a*a)};n.len=n.length;n.squaredLength=function(a){var b=a[0],e=a[1];a=a[2];return b*b+e*e+a*a};n.sqrLen=n.squaredLength;n.negate=function(a,b){return a[0]=-b[0],a[1]=-b[1],a[2]=-b[2],a};n.normalize=function(a,b){var e=b[0],k=b[1],v=b[2],e=e*e+k*k+v*v;return 0<e&&(e=1/Math.sqrt(e),
a[0]=b[0]*e,a[1]=b[1]*e,a[2]=b[2]*e),a};n.dot=function(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]};n.cross=function(a,b,e){var k=b[0],v=b[1];b=b[2];var c=e[0],d=e[1];e=e[2];return a[0]=v*e-b*d,a[1]=b*c-k*e,a[2]=k*d-v*c,a};n.lerp=function(a,b,e,k){var v=b[0],c=b[1];b=b[2];return a[0]=v+k*(e[0]-v),a[1]=c+k*(e[1]-c),a[2]=b+k*(e[2]-b),a};n.random=function(a,b){b=b||1;var e=2*l()*Math.PI,k=2*l()-1,v=Math.sqrt(1-k*k)*b;return a[0]=Math.cos(e)*v,a[1]=Math.sin(e)*v,a[2]=k*b,a};n.transformMat4=function(a,b,
e){var k=b[0],v=b[1];b=b[2];return a[0]=e[0]*k+e[4]*v+e[8]*b+e[12],a[1]=e[1]*k+e[5]*v+e[9]*b+e[13],a[2]=e[2]*k+e[6]*v+e[10]*b+e[14],a};n.transformMat3=function(a,b,e){var k=b[0],v=b[1];b=b[2];return a[0]=k*e[0]+v*e[3]+b*e[6],a[1]=k*e[1]+v*e[4]+b*e[7],a[2]=k*e[2]+v*e[5]+b*e[8],a};n.transformQuat=function(a,b,e){var k=b[0],v=b[1],c=b[2];b=e[0];var d=e[1],h=e[2];e=e[3];var g=e*k+d*c-h*v,f=e*v+h*k-b*c,l=e*c+b*v-d*k,k=-b*k-d*v-h*c;return a[0]=g*e+k*-b+f*-h-l*-d,a[1]=f*e+k*-d+l*-b-g*-h,a[2]=l*e+k*-h+g*
-d-f*-b,a};n.rotateX=function(a,b,e,k){var v=[],c=[];return v[0]=b[0]-e[0],v[1]=b[1]-e[1],v[2]=b[2]-e[2],c[0]=v[0],c[1]=v[1]*Math.cos(k)-v[2]*Math.sin(k),c[2]=v[1]*Math.sin(k)+v[2]*Math.cos(k),a[0]=c[0]+e[0],a[1]=c[1]+e[1],a[2]=c[2]+e[2],a};n.rotateY=function(a,b,e,k){var v=[],c=[];return v[0]=b[0]-e[0],v[1]=b[1]-e[1],v[2]=b[2]-e[2],c[0]=v[2]*Math.sin(k)+v[0]*Math.cos(k),c[1]=v[1],c[2]=v[2]*Math.cos(k)-v[0]*Math.sin(k),a[0]=c[0]+e[0],a[1]=c[1]+e[1],a[2]=c[2]+e[2],a};n.rotateZ=function(a,b,e,k){var c=
[],d=[];return c[0]=b[0]-e[0],c[1]=b[1]-e[1],c[2]=b[2]-e[2],d[0]=c[0]*Math.cos(k)-c[1]*Math.sin(k),d[1]=c[0]*Math.sin(k)+c[1]*Math.cos(k),d[2]=c[2],a[0]=d[0]+e[0],a[1]=d[1]+e[1],a[2]=d[2]+e[2],a};n.forEach=function(){var a=n.create();return function(b,e,k,c,d,h){var g;e||(e=3);k||(k=0);for(c?g=Math.min(c*e+k,b.length):g=b.length;k<g;k+=e)a[0]=b[k],a[1]=b[k+1],a[2]=b[k+2],d(a,a,h),b[k]=a[0],b[k+1]=a[1],b[k+2]=a[2];return b}}();n.str=function(a){return"vec3("+a[0]+", "+a[1]+", "+a[2]+")"};"undefined"!=
typeof c&&(c.vec3=n);var r={create:function(){var a=new d(4);return a[0]=0,a[1]=0,a[2]=0,a[3]=0,a},clone:function(a){var b=new d(4);return b[0]=a[0],b[1]=a[1],b[2]=a[2],b[3]=a[3],b},fromValues:function(a,b,e,k){var c=new d(4);return c[0]=a,c[1]=b,c[2]=e,c[3]=k,c},copy:function(a,b){return a[0]=b[0],a[1]=b[1],a[2]=b[2],a[3]=b[3],a},set:function(a,b,e,k,c){return a[0]=b,a[1]=e,a[2]=k,a[3]=c,a},add:function(a,b,e){return a[0]=b[0]+e[0],a[1]=b[1]+e[1],a[2]=b[2]+e[2],a[3]=b[3]+e[3],a},subtract:function(a,
b,e){return a[0]=b[0]-e[0],a[1]=b[1]-e[1],a[2]=b[2]-e[2],a[3]=b[3]-e[3],a}};r.sub=r.subtract;r.multiply=function(a,b,e){return a[0]=b[0]*e[0],a[1]=b[1]*e[1],a[2]=b[2]*e[2],a[3]=b[3]*e[3],a};r.mul=r.multiply;r.divide=function(a,b,e){return a[0]=b[0]/e[0],a[1]=b[1]/e[1],a[2]=b[2]/e[2],a[3]=b[3]/e[3],a};r.div=r.divide;r.min=function(a,b,e){return a[0]=Math.min(b[0],e[0]),a[1]=Math.min(b[1],e[1]),a[2]=Math.min(b[2],e[2]),a[3]=Math.min(b[3],e[3]),a};r.max=function(a,b,e){return a[0]=Math.max(b[0],e[0]),
a[1]=Math.max(b[1],e[1]),a[2]=Math.max(b[2],e[2]),a[3]=Math.max(b[3],e[3]),a};r.scale=function(a,b,e){return a[0]=b[0]*e,a[1]=b[1]*e,a[2]=b[2]*e,a[3]=b[3]*e,a};r.scaleAndAdd=function(a,b,e,k){return a[0]=b[0]+e[0]*k,a[1]=b[1]+e[1]*k,a[2]=b[2]+e[2]*k,a[3]=b[3]+e[3]*k,a};r.distance=function(a,b){var e=b[0]-a[0],k=b[1]-a[1],c=b[2]-a[2],d=b[3]-a[3];return Math.sqrt(e*e+k*k+c*c+d*d)};r.dist=r.distance;r.squaredDistance=function(a,b){var e=b[0]-a[0],k=b[1]-a[1],c=b[2]-a[2],d=b[3]-a[3];return e*e+k*k+c*
c+d*d};r.sqrDist=r.squaredDistance;r.length=function(a){var b=a[0],e=a[1],k=a[2];a=a[3];return Math.sqrt(b*b+e*e+k*k+a*a)};r.len=r.length;r.squaredLength=function(a){var b=a[0],e=a[1],k=a[2];a=a[3];return b*b+e*e+k*k+a*a};r.sqrLen=r.squaredLength;r.negate=function(a,b){return a[0]=-b[0],a[1]=-b[1],a[2]=-b[2],a[3]=-b[3],a};r.normalize=function(a,b){var e=b[0],k=b[1],c=b[2],d=b[3],e=e*e+k*k+c*c+d*d;return 0<e&&(e=1/Math.sqrt(e),a[0]=b[0]*e,a[1]=b[1]*e,a[2]=b[2]*e,a[3]=b[3]*e),a};r.dot=function(a,b){return a[0]*
b[0]+a[1]*b[1]+a[2]*b[2]+a[3]*b[3]};r.lerp=function(a,b,e,k){var c=b[0],d=b[1],h=b[2];b=b[3];return a[0]=c+k*(e[0]-c),a[1]=d+k*(e[1]-d),a[2]=h+k*(e[2]-h),a[3]=b+k*(e[3]-b),a};r.random=function(a,b){return b=b||1,a[0]=l(),a[1]=l(),a[2]=l(),a[3]=l(),r.normalize(a,a),r.scale(a,a,b),a};r.transformMat4=function(a,b,e){var k=b[0],c=b[1],d=b[2];b=b[3];return a[0]=e[0]*k+e[4]*c+e[8]*d+e[12]*b,a[1]=e[1]*k+e[5]*c+e[9]*d+e[13]*b,a[2]=e[2]*k+e[6]*c+e[10]*d+e[14]*b,a[3]=e[3]*k+e[7]*c+e[11]*d+e[15]*b,a};r.transformQuat=
function(a,b,e){var k=b[0],c=b[1],d=b[2];b=e[0];var h=e[1],g=e[2];e=e[3];var f=e*k+h*d-g*c,l=e*c+g*k-b*d,x=e*d+b*c-h*k,k=-b*k-h*c-g*d;return a[0]=f*e+k*-b+l*-g-x*-h,a[1]=l*e+k*-h+x*-b-f*-g,a[2]=x*e+k*-g+f*-h-l*-b,a};r.forEach=function(){var a=r.create();return function(b,e,k,c,d,h){var g;e||(e=4);k||(k=0);for(c?g=Math.min(c*e+k,b.length):g=b.length;k<g;k+=e)a[0]=b[k],a[1]=b[k+1],a[2]=b[k+2],a[3]=b[k+3],d(a,a,h),b[k]=a[0],b[k+1]=a[1],b[k+2]=a[2],b[k+3]=a[3];return b}}();r.str=function(a){return"vec4("+
a[0]+", "+a[1]+", "+a[2]+", "+a[3]+")"};"undefined"!=typeof c&&(c.vec4=r);f={create:function(){var a=new d(4);return a[0]=1,a[1]=0,a[2]=0,a[3]=1,a},clone:function(a){var b=new d(4);return b[0]=a[0],b[1]=a[1],b[2]=a[2],b[3]=a[3],b},copy:function(a,b){return a[0]=b[0],a[1]=b[1],a[2]=b[2],a[3]=b[3],a},identity:function(a){return a[0]=1,a[1]=0,a[2]=0,a[3]=1,a},transpose:function(a,b){if(a===b){var e=b[1];a[1]=b[2];a[2]=e}else a[0]=b[0],a[1]=b[2],a[2]=b[1],a[3]=b[3];return a},invert:function(a,b){var e=
b[0],k=b[1],c=b[2],d=b[3],h=e*d-c*k;return h?(h=1/h,a[0]=d*h,a[1]=-k*h,a[2]=-c*h,a[3]=e*h,a):null},adjoint:function(a,b){var e=b[0];return a[0]=b[3],a[1]=-b[1],a[2]=-b[2],a[3]=e,a},determinant:function(a){return a[0]*a[3]-a[2]*a[1]},multiply:function(a,b,e){var k=b[0],c=b[1],d=b[2];b=b[3];var h=e[0],g=e[1],f=e[2];e=e[3];return a[0]=k*h+d*g,a[1]=c*h+b*g,a[2]=k*f+d*e,a[3]=c*f+b*e,a}};f.mul=f.multiply;f.rotate=function(a,b,e){var k=b[0],c=b[1],d=b[2];b=b[3];var h=Math.sin(e);e=Math.cos(e);return a[0]=
k*e+d*h,a[1]=c*e+b*h,a[2]=k*-h+d*e,a[3]=c*-h+b*e,a};f.scale=function(a,b,e){var k=b[1],c=b[2],d=b[3],h=e[0];e=e[1];return a[0]=b[0]*h,a[1]=k*h,a[2]=c*e,a[3]=d*e,a};f.str=function(a){return"mat2("+a[0]+", "+a[1]+", "+a[2]+", "+a[3]+")"};f.frob=function(a){return Math.sqrt(Math.pow(a[0],2)+Math.pow(a[1],2)+Math.pow(a[2],2)+Math.pow(a[3],2))};f.LDU=function(a,b,e,k){return a[2]=k[2]/k[0],e[0]=k[0],e[1]=k[1],e[3]=k[3]-a[2]*e[1],[a,b,e]};"undefined"!=typeof c&&(c.mat2=f);f={create:function(){var a=new d(6);
return a[0]=1,a[1]=0,a[2]=0,a[3]=1,a[4]=0,a[5]=0,a},clone:function(a){var b=new d(6);return b[0]=a[0],b[1]=a[1],b[2]=a[2],b[3]=a[3],b[4]=a[4],b[5]=a[5],b},copy:function(a,b){return a[0]=b[0],a[1]=b[1],a[2]=b[2],a[3]=b[3],a[4]=b[4],a[5]=b[5],a},identity:function(a){return a[0]=1,a[1]=0,a[2]=0,a[3]=1,a[4]=0,a[5]=0,a},invert:function(a,b){var e=b[0],k=b[1],c=b[2],d=b[3],h=b[4],g=b[5],f=e*d-k*c;return f?(f=1/f,a[0]=d*f,a[1]=-k*f,a[2]=-c*f,a[3]=e*f,a[4]=(c*g-d*h)*f,a[5]=(k*h-e*g)*f,a):null},determinant:function(a){return a[0]*
a[3]-a[1]*a[2]},multiply:function(a,b,e){var k=b[0],c=b[1],d=b[2],h=b[3],g=b[4];b=b[5];var f=e[0],l=e[1],x=e[2],u=e[3],m=e[4];e=e[5];return a[0]=k*f+d*l,a[1]=c*f+h*l,a[2]=k*x+d*u,a[3]=c*x+h*u,a[4]=k*m+d*e+g,a[5]=c*m+h*e+b,a}};f.mul=f.multiply;f.rotate=function(a,b,e){var k=b[0],c=b[1],d=b[2],h=b[3],g=b[4];b=b[5];var f=Math.sin(e);e=Math.cos(e);return a[0]=k*e+d*f,a[1]=c*e+h*f,a[2]=k*-f+d*e,a[3]=c*-f+h*e,a[4]=g,a[5]=b,a};f.scale=function(a,b,e){var k=b[1],c=b[2],d=b[3],h=b[4],g=b[5],f=e[0];e=e[1];
return a[0]=b[0]*f,a[1]=k*f,a[2]=c*e,a[3]=d*e,a[4]=h,a[5]=g,a};f.translate=function(a,b,e){var k=b[0],c=b[1],d=b[2],h=b[3],g=b[4];b=b[5];var f=e[0];e=e[1];return a[0]=k,a[1]=c,a[2]=d,a[3]=h,a[4]=k*f+d*e+g,a[5]=c*f+h*e+b,a};f.str=function(a){return"mat2d("+a[0]+", "+a[1]+", "+a[2]+", "+a[3]+", "+a[4]+", "+a[5]+")"};f.frob=function(a){return Math.sqrt(Math.pow(a[0],2)+Math.pow(a[1],2)+Math.pow(a[2],2)+Math.pow(a[3],2)+Math.pow(a[4],2)+Math.pow(a[5],2)+1)};"undefined"!=typeof c&&(c.mat2d=f);var w={create:function(){var a=
new d(9);return a[0]=1,a[1]=0,a[2]=0,a[3]=0,a[4]=1,a[5]=0,a[6]=0,a[7]=0,a[8]=1,a},fromMat4:function(a,b){return a[0]=b[0],a[1]=b[1],a[2]=b[2],a[3]=b[4],a[4]=b[5],a[5]=b[6],a[6]=b[8],a[7]=b[9],a[8]=b[10],a},clone:function(a){var b=new d(9);return b[0]=a[0],b[1]=a[1],b[2]=a[2],b[3]=a[3],b[4]=a[4],b[5]=a[5],b[6]=a[6],b[7]=a[7],b[8]=a[8],b},copy:function(a,b){return a[0]=b[0],a[1]=b[1],a[2]=b[2],a[3]=b[3],a[4]=b[4],a[5]=b[5],a[6]=b[6],a[7]=b[7],a[8]=b[8],a},identity:function(a){return a[0]=1,a[1]=0,a[2]=
0,a[3]=0,a[4]=1,a[5]=0,a[6]=0,a[7]=0,a[8]=1,a},transpose:function(a,b){if(a===b){var e=b[1],k=b[2],c=b[5];a[1]=b[3];a[2]=b[6];a[3]=e;a[5]=b[7];a[6]=k;a[7]=c}else a[0]=b[0],a[1]=b[3],a[2]=b[6],a[3]=b[1],a[4]=b[4],a[5]=b[7],a[6]=b[2],a[7]=b[5],a[8]=b[8];return a},invert:function(a,b){var e=b[0],k=b[1],c=b[2],d=b[3],h=b[4],g=b[5],f=b[6],l=b[7],x=b[8],u=x*h-g*l,m=-x*d+g*f,y=l*d-h*f,n=e*u+k*m+c*y;return n?(n=1/n,a[0]=u*n,a[1]=(-x*k+c*l)*n,a[2]=(g*k-c*h)*n,a[3]=m*n,a[4]=(x*e-c*f)*n,a[5]=(-g*e+c*d)*n,a[6]=
y*n,a[7]=(-l*e+k*f)*n,a[8]=(h*e-k*d)*n,a):null},adjoint:function(a,b){var e=b[0],k=b[1],c=b[2],d=b[3],h=b[4],g=b[5],f=b[6],l=b[7],x=b[8];return a[0]=h*x-g*l,a[1]=c*l-k*x,a[2]=k*g-c*h,a[3]=g*f-d*x,a[4]=e*x-c*f,a[5]=c*d-e*g,a[6]=d*l-h*f,a[7]=k*f-e*l,a[8]=e*h-k*d,a},determinant:function(a){var b=a[3],e=a[4],k=a[5],c=a[6],d=a[7],h=a[8];return a[0]*(h*e-k*d)+a[1]*(-h*b+k*c)+a[2]*(d*b-e*c)},multiply:function(a,b,e){var k=b[0],c=b[1],d=b[2],h=b[3],g=b[4],f=b[5],l=b[6],x=b[7];b=b[8];var u=e[0],m=e[1],y=e[2],
n=e[3],p=e[4],r=e[5],s=e[6],q=e[7];e=e[8];return a[0]=u*k+m*h+y*l,a[1]=u*c+m*g+y*x,a[2]=u*d+m*f+y*b,a[3]=n*k+p*h+r*l,a[4]=n*c+p*g+r*x,a[5]=n*d+p*f+r*b,a[6]=s*k+q*h+e*l,a[7]=s*c+q*g+e*x,a[8]=s*d+q*f+e*b,a}};w.mul=w.multiply;w.translate=function(a,b,e){var k=b[0],c=b[1],d=b[2],h=b[3],g=b[4],f=b[5],l=b[6],x=b[7];b=b[8];var u=e[0];e=e[1];return a[0]=k,a[1]=c,a[2]=d,a[3]=h,a[4]=g,a[5]=f,a[6]=u*k+e*h+l,a[7]=u*c+e*g+x,a[8]=u*d+e*f+b,a};w.rotate=function(a,b,e){var k=b[0],c=b[1],d=b[2],h=b[3],g=b[4],f=b[5],
l=b[6],x=b[7];b=b[8];var u=Math.sin(e);e=Math.cos(e);return a[0]=e*k+u*h,a[1]=e*c+u*g,a[2]=e*d+u*f,a[3]=e*h-u*k,a[4]=e*g-u*c,a[5]=e*f-u*d,a[6]=l,a[7]=x,a[8]=b,a};w.scale=function(a,b,e){var k=e[0];e=e[1];return a[0]=k*b[0],a[1]=k*b[1],a[2]=k*b[2],a[3]=e*b[3],a[4]=e*b[4],a[5]=e*b[5],a[6]=b[6],a[7]=b[7],a[8]=b[8],a};w.fromMat2d=function(a,b){return a[0]=b[0],a[1]=b[1],a[2]=0,a[3]=b[2],a[4]=b[3],a[5]=0,a[6]=b[4],a[7]=b[5],a[8]=1,a};w.fromQuat=function(a,b){var e=b[0],k=b[1],c=b[2],d=b[3],h=e+e,g=k+k,
f=c+c,e=e*h,l=k*h,k=k*g,x=c*h,u=c*g,c=c*f,h=d*h,g=d*g,d=d*f;return a[0]=1-k-c,a[3]=l-d,a[6]=x+g,a[1]=l+d,a[4]=1-e-c,a[7]=u-h,a[2]=x-g,a[5]=u+h,a[8]=1-e-k,a};w.normalFromMat4=function(a,b){var e=b[0],k=b[1],c=b[2],d=b[3],h=b[4],g=b[5],f=b[6],l=b[7],x=b[8],u=b[9],m=b[10],y=b[11],n=b[12],p=b[13],r=b[14],s=b[15],q=e*g-k*h,z=e*f-c*h,A=e*l-d*h,B=k*f-c*g,t=k*l-d*g,w=c*l-d*f,E=x*p-u*n,F=x*r-m*n,x=x*s-y*n,G=u*r-m*p,u=u*s-y*p,m=m*s-y*r;return(y=q*m-z*u+A*G+B*x-t*F+w*E)?(y=1/y,a[0]=(g*m-f*u+l*G)*y,a[1]=(f*x-
h*m-l*F)*y,a[2]=(h*u-g*x+l*E)*y,a[3]=(c*u-k*m-d*G)*y,a[4]=(e*m-c*x+d*F)*y,a[5]=(k*x-e*u-d*E)*y,a[6]=(p*w-r*t+s*B)*y,a[7]=(r*A-n*w-s*z)*y,a[8]=(n*t-p*A+s*q)*y,a):null};w.str=function(a){return"mat3("+a[0]+", "+a[1]+", "+a[2]+", "+a[3]+", "+a[4]+", "+a[5]+", "+a[6]+", "+a[7]+", "+a[8]+")"};w.frob=function(a){return Math.sqrt(Math.pow(a[0],2)+Math.pow(a[1],2)+Math.pow(a[2],2)+Math.pow(a[3],2)+Math.pow(a[4],2)+Math.pow(a[5],2)+Math.pow(a[6],2)+Math.pow(a[7],2)+Math.pow(a[8],2))};"undefined"!=typeof c&&
(c.mat3=w);var t={create:function(){var a=new d(16);return a[0]=1,a[1]=0,a[2]=0,a[3]=0,a[4]=0,a[5]=1,a[6]=0,a[7]=0,a[8]=0,a[9]=0,a[10]=1,a[11]=0,a[12]=0,a[13]=0,a[14]=0,a[15]=1,a},clone:function(a){var b=new d(16);return b[0]=a[0],b[1]=a[1],b[2]=a[2],b[3]=a[3],b[4]=a[4],b[5]=a[5],b[6]=a[6],b[7]=a[7],b[8]=a[8],b[9]=a[9],b[10]=a[10],b[11]=a[11],b[12]=a[12],b[13]=a[13],b[14]=a[14],b[15]=a[15],b},copy:function(a,b){return a[0]=b[0],a[1]=b[1],a[2]=b[2],a[3]=b[3],a[4]=b[4],a[5]=b[5],a[6]=b[6],a[7]=b[7],
a[8]=b[8],a[9]=b[9],a[10]=b[10],a[11]=b[11],a[12]=b[12],a[13]=b[13],a[14]=b[14],a[15]=b[15],a},identity:function(a){return a[0]=1,a[1]=0,a[2]=0,a[3]=0,a[4]=0,a[5]=1,a[6]=0,a[7]=0,a[8]=0,a[9]=0,a[10]=1,a[11]=0,a[12]=0,a[13]=0,a[14]=0,a[15]=1,a},transpose:function(a,b){if(a===b){var e=b[1],k=b[2],c=b[3],d=b[6],h=b[7],g=b[11];a[1]=b[4];a[2]=b[8];a[3]=b[12];a[4]=e;a[6]=b[9];a[7]=b[13];a[8]=k;a[9]=d;a[11]=b[14];a[12]=c;a[13]=h;a[14]=g}else a[0]=b[0],a[1]=b[4],a[2]=b[8],a[3]=b[12],a[4]=b[1],a[5]=b[5],a[6]=
b[9],a[7]=b[13],a[8]=b[2],a[9]=b[6],a[10]=b[10],a[11]=b[14],a[12]=b[3],a[13]=b[7],a[14]=b[11],a[15]=b[15];return a},invert:function(a,b){var e=b[0],k=b[1],c=b[2],d=b[3],h=b[4],g=b[5],f=b[6],l=b[7],x=b[8],u=b[9],m=b[10],n=b[11],p=b[12],r=b[13],s=b[14],q=b[15],t=e*g-k*h,z=e*f-c*h,A=e*l-d*h,B=k*f-c*g,w=k*l-d*g,H=c*l-d*f,E=x*r-u*p,F=x*s-m*p,G=x*q-n*p,I=u*s-m*r,J=u*q-n*r,K=m*q-n*s,D=t*K-z*J+A*I+B*G-w*F+H*E;return D?(D=1/D,a[0]=(g*K-f*J+l*I)*D,a[1]=(c*J-k*K-d*I)*D,a[2]=(r*H-s*w+q*B)*D,a[3]=(m*w-u*H-n*B)*
D,a[4]=(f*G-h*K-l*F)*D,a[5]=(e*K-c*G+d*F)*D,a[6]=(s*A-p*H-q*z)*D,a[7]=(x*H-m*A+n*z)*D,a[8]=(h*J-g*G+l*E)*D,a[9]=(k*G-e*J-d*E)*D,a[10]=(p*w-r*A+q*t)*D,a[11]=(u*A-x*w-n*t)*D,a[12]=(g*F-h*I-f*E)*D,a[13]=(e*I-k*F+c*E)*D,a[14]=(r*z-p*B-s*t)*D,a[15]=(x*B-u*z+m*t)*D,a):null},adjoint:function(a,b){var e=b[0],c=b[1],d=b[2],h=b[3],g=b[4],f=b[5],l=b[6],m=b[7],n=b[8],u=b[9],p=b[10],y=b[11],r=b[12],s=b[13],q=b[14],t=b[15];return a[0]=f*(p*t-y*q)-u*(l*t-m*q)+s*(l*y-m*p),a[1]=-(c*(p*t-y*q)-u*(d*t-h*q)+s*(d*y-h*
p)),a[2]=c*(l*t-m*q)-f*(d*t-h*q)+s*(d*m-h*l),a[3]=-(c*(l*y-m*p)-f*(d*y-h*p)+u*(d*m-h*l)),a[4]=-(g*(p*t-y*q)-n*(l*t-m*q)+r*(l*y-m*p)),a[5]=e*(p*t-y*q)-n*(d*t-h*q)+r*(d*y-h*p),a[6]=-(e*(l*t-m*q)-g*(d*t-h*q)+r*(d*m-h*l)),a[7]=e*(l*y-m*p)-g*(d*y-h*p)+n*(d*m-h*l),a[8]=g*(u*t-y*s)-n*(f*t-m*s)+r*(f*y-m*u),a[9]=-(e*(u*t-y*s)-n*(c*t-h*s)+r*(c*y-h*u)),a[10]=e*(f*t-m*s)-g*(c*t-h*s)+r*(c*m-h*f),a[11]=-(e*(f*y-m*u)-g*(c*y-h*u)+n*(c*m-h*f)),a[12]=-(g*(u*q-p*s)-n*(f*q-l*s)+r*(f*p-l*u)),a[13]=e*(u*q-p*s)-n*(c*q-
d*s)+r*(c*p-d*u),a[14]=-(e*(f*q-l*s)-g*(c*q-d*s)+r*(c*l-d*f)),a[15]=e*(f*p-l*u)-g*(c*p-d*u)+n*(c*l-d*f),a},determinant:function(a){var b=a[0],e=a[1],c=a[2],d=a[3],h=a[4],g=a[5],f=a[6],l=a[7],m=a[8],n=a[9],u=a[10],p=a[11],s=a[12],r=a[13],q=a[14];a=a[15];return(b*g-e*h)*(u*a-p*q)-(b*f-c*h)*(n*a-p*r)+(b*l-d*h)*(n*q-u*r)+(e*f-c*g)*(m*a-p*s)-(e*l-d*g)*(m*q-u*s)+(c*l-d*f)*(m*r-n*s)},multiply:function(a,b,e){var c=b[0],d=b[1],h=b[2],g=b[3],f=b[4],l=b[5],m=b[6],n=b[7],u=b[8],p=b[9],s=b[10],r=b[11],q=b[12],
t=b[13],w=b[14];b=b[15];var C=e[0],z=e[1],A=e[2],B=e[3];return a[0]=C*c+z*f+A*u+B*q,a[1]=C*d+z*l+A*p+B*t,a[2]=C*h+z*m+A*s+B*w,a[3]=C*g+z*n+A*r+B*b,C=e[4],z=e[5],A=e[6],B=e[7],a[4]=C*c+z*f+A*u+B*q,a[5]=C*d+z*l+A*p+B*t,a[6]=C*h+z*m+A*s+B*w,a[7]=C*g+z*n+A*r+B*b,C=e[8],z=e[9],A=e[10],B=e[11],a[8]=C*c+z*f+A*u+B*q,a[9]=C*d+z*l+A*p+B*t,a[10]=C*h+z*m+A*s+B*w,a[11]=C*g+z*n+A*r+B*b,C=e[12],z=e[13],A=e[14],B=e[15],a[12]=C*c+z*f+A*u+B*q,a[13]=C*d+z*l+A*p+B*t,a[14]=C*h+z*m+A*s+B*w,a[15]=C*g+z*n+A*r+B*b,a}};t.mul=
t.multiply;t.translate=function(a,b,e){var c=e[0],d=e[1];e=e[2];var h,g,f,l,m,n,p,s,r,q,t,w;return b===a?(a[12]=b[0]*c+b[4]*d+b[8]*e+b[12],a[13]=b[1]*c+b[5]*d+b[9]*e+b[13],a[14]=b[2]*c+b[6]*d+b[10]*e+b[14],a[15]=b[3]*c+b[7]*d+b[11]*e+b[15]):(h=b[0],g=b[1],f=b[2],l=b[3],m=b[4],n=b[5],p=b[6],s=b[7],r=b[8],q=b[9],t=b[10],w=b[11],a[0]=h,a[1]=g,a[2]=f,a[3]=l,a[4]=m,a[5]=n,a[6]=p,a[7]=s,a[8]=r,a[9]=q,a[10]=t,a[11]=w,a[12]=h*c+m*d+r*e+b[12],a[13]=g*c+n*d+q*e+b[13],a[14]=f*c+p*d+t*e+b[14],a[15]=l*c+s*d+w*
e+b[15]),a};t.scale=function(a,b,e){var c=e[0],d=e[1];e=e[2];return a[0]=b[0]*c,a[1]=b[1]*c,a[2]=b[2]*c,a[3]=b[3]*c,a[4]=b[4]*d,a[5]=b[5]*d,a[6]=b[6]*d,a[7]=b[7]*d,a[8]=b[8]*e,a[9]=b[9]*e,a[10]=b[10]*e,a[11]=b[11]*e,a[12]=b[12],a[13]=b[13],a[14]=b[14],a[15]=b[15],a};t.rotate=function(a,b,e,c){var d=c[0],g=c[1];c=c[2];var f=Math.sqrt(d*d+g*g+c*c),l,m,n,p,u,s,r,q,t,w,L,C,z,A,B,N,H,E,F,G,I,J,K,D;return Math.abs(f)<h?null:(f=1/f,d*=f,g*=f,c*=f,l=Math.sin(e),m=Math.cos(e),n=1-m,p=b[0],u=b[1],s=b[2],r=
b[3],q=b[4],t=b[5],w=b[6],L=b[7],C=b[8],z=b[9],A=b[10],B=b[11],N=d*d*n+m,H=g*d*n+c*l,E=c*d*n-g*l,F=d*g*n-c*l,G=g*g*n+m,I=c*g*n+d*l,J=d*c*n+g*l,K=g*c*n-d*l,D=c*c*n+m,a[0]=p*N+q*H+C*E,a[1]=u*N+t*H+z*E,a[2]=s*N+w*H+A*E,a[3]=r*N+L*H+B*E,a[4]=p*F+q*G+C*I,a[5]=u*F+t*G+z*I,a[6]=s*F+w*G+A*I,a[7]=r*F+L*G+B*I,a[8]=p*J+q*K+C*D,a[9]=u*J+t*K+z*D,a[10]=s*J+w*K+A*D,a[11]=r*J+L*K+B*D,b!==a&&(a[12]=b[12],a[13]=b[13],a[14]=b[14],a[15]=b[15]),a)};t.rotateX=function(a,b,e){var c=Math.sin(e);e=Math.cos(e);var d=b[4],
h=b[5],g=b[6],f=b[7],l=b[8],m=b[9],n=b[10],p=b[11];return b!==a&&(a[0]=b[0],a[1]=b[1],a[2]=b[2],a[3]=b[3],a[12]=b[12],a[13]=b[13],a[14]=b[14],a[15]=b[15]),a[4]=d*e+l*c,a[5]=h*e+m*c,a[6]=g*e+n*c,a[7]=f*e+p*c,a[8]=l*e-d*c,a[9]=m*e-h*c,a[10]=n*e-g*c,a[11]=p*e-f*c,a};t.rotateY=function(a,b,e){var c=Math.sin(e);e=Math.cos(e);var d=b[0],h=b[1],g=b[2],f=b[3],l=b[8],m=b[9],n=b[10],p=b[11];return b!==a&&(a[4]=b[4],a[5]=b[5],a[6]=b[6],a[7]=b[7],a[12]=b[12],a[13]=b[13],a[14]=b[14],a[15]=b[15]),a[0]=d*e-l*c,
a[1]=h*e-m*c,a[2]=g*e-n*c,a[3]=f*e-p*c,a[8]=d*c+l*e,a[9]=h*c+m*e,a[10]=g*c+n*e,a[11]=f*c+p*e,a};t.rotateZ=function(a,b,e){var c=Math.sin(e);e=Math.cos(e);var d=b[0],h=b[1],g=b[2],f=b[3],l=b[4],m=b[5],n=b[6],p=b[7];return b!==a&&(a[8]=b[8],a[9]=b[9],a[10]=b[10],a[11]=b[11],a[12]=b[12],a[13]=b[13],a[14]=b[14],a[15]=b[15]),a[0]=d*e+l*c,a[1]=h*e+m*c,a[2]=g*e+n*c,a[3]=f*e+p*c,a[4]=l*e-d*c,a[5]=m*e-h*c,a[6]=n*e-g*c,a[7]=p*e-f*c,a};t.fromRotationTranslation=function(a,b,e){var c=b[0],d=b[1],h=b[2],g=b[3],
f=c+c,l=d+d,m=h+h;b=c*f;var n=c*l,c=c*m,p=d*l,d=d*m,h=h*m,f=g*f,l=g*l,g=g*m;return a[0]=1-(p+h),a[1]=n+g,a[2]=c-l,a[3]=0,a[4]=n-g,a[5]=1-(b+h),a[6]=d+f,a[7]=0,a[8]=c+l,a[9]=d-f,a[10]=1-(b+p),a[11]=0,a[12]=e[0],a[13]=e[1],a[14]=e[2],a[15]=1,a};t.fromQuat=function(a,b){var e=b[0],c=b[1],d=b[2],h=b[3],g=e+e,f=c+c,l=d+d,e=e*g,m=c*g,c=c*f,n=d*g,p=d*f,d=d*l,g=h*g,f=h*f,h=h*l;return a[0]=1-c-d,a[1]=m+h,a[2]=n-f,a[3]=0,a[4]=m-h,a[5]=1-e-d,a[6]=p+g,a[7]=0,a[8]=n+f,a[9]=p-g,a[10]=1-e-c,a[11]=0,a[12]=0,a[13]=
0,a[14]=0,a[15]=1,a};t.frustum=function(a,b,e,c,d,h,g){var f=1/(e-b),l=1/(d-c),m=1/(h-g);return a[0]=2*h*f,a[1]=0,a[2]=0,a[3]=0,a[4]=0,a[5]=2*h*l,a[6]=0,a[7]=0,a[8]=(e+b)*f,a[9]=(d+c)*l,a[10]=(g+h)*m,a[11]=-1,a[12]=0,a[13]=0,a[14]=g*h*2*m,a[15]=0,a};t.perspective=function(a,b,e,c,d){b=1/Math.tan(b/2);var h=1/(c-d);return a[0]=b/e,a[1]=0,a[2]=0,a[3]=0,a[4]=0,a[5]=b,a[6]=0,a[7]=0,a[8]=0,a[9]=0,a[10]=(d+c)*h,a[11]=-1,a[12]=0,a[13]=0,a[14]=2*d*c*h,a[15]=0,a};t.ortho=function(a,b,e,c,d,h,g){var f=1/(b-
e),l=1/(c-d),m=1/(h-g);return a[0]=-2*f,a[1]=0,a[2]=0,a[3]=0,a[4]=0,a[5]=-2*l,a[6]=0,a[7]=0,a[8]=0,a[9]=0,a[10]=2*m,a[11]=0,a[12]=(b+e)*f,a[13]=(d+c)*l,a[14]=(g+h)*m,a[15]=1,a};t.lookAt=function(a,b,e,c){var d,g,f,l,m,n,p,s,r,q,w=b[0],M=b[1];b=b[2];var O=c[0],L=c[1];c=c[2];var C=e[0],z=e[1];e=e[2];return Math.abs(w-C)<h&&Math.abs(M-z)<h&&Math.abs(b-e)<h?t.identity(a):(p=w-C,s=M-z,r=b-e,q=1/Math.sqrt(p*p+s*s+r*r),p*=q,s*=q,r*=q,d=L*r-c*s,g=c*p-O*r,f=O*s-L*p,q=Math.sqrt(d*d+g*g+f*f),q?(q=1/q,d*=q,g*=
q,f*=q):(d=0,g=0,f=0),l=s*f-r*g,m=r*d-p*f,n=p*g-s*d,q=Math.sqrt(l*l+m*m+n*n),q?(q=1/q,l*=q,m*=q,n*=q):(l=0,m=0,n=0),a[0]=d,a[1]=l,a[2]=p,a[3]=0,a[4]=g,a[5]=m,a[6]=s,a[7]=0,a[8]=f,a[9]=n,a[10]=r,a[11]=0,a[12]=-(d*w+g*M+f*b),a[13]=-(l*w+m*M+n*b),a[14]=-(p*w+s*M+r*b),a[15]=1,a)};t.str=function(a){return"mat4("+a[0]+", "+a[1]+", "+a[2]+", "+a[3]+", "+a[4]+", "+a[5]+", "+a[6]+", "+a[7]+", "+a[8]+", "+a[9]+", "+a[10]+", "+a[11]+", "+a[12]+", "+a[13]+", "+a[14]+", "+a[15]+")"};t.frob=function(a){return Math.sqrt(Math.pow(a[0],
2)+Math.pow(a[1],2)+Math.pow(a[2],2)+Math.pow(a[3],2)+Math.pow(a[4],2)+Math.pow(a[5],2)+Math.pow(a[6],2)+Math.pow(a[6],2)+Math.pow(a[7],2)+Math.pow(a[8],2)+Math.pow(a[9],2)+Math.pow(a[10],2)+Math.pow(a[11],2)+Math.pow(a[12],2)+Math.pow(a[13],2)+Math.pow(a[14],2)+Math.pow(a[15],2))};"undefined"!=typeof c&&(c.mat4=t);var q={create:function(){var a=new d(4);return a[0]=0,a[1]=0,a[2]=0,a[3]=1,a}};q.rotationTo=function(){var a=n.create(),b=n.fromValues(1,0,0),e=n.fromValues(0,1,0);return function(c,d,
h){var g=n.dot(d,h);return-0.999999>g?(n.cross(a,b,d),1E-6>n.length(a)&&n.cross(a,e,d),n.normalize(a,a),q.setAxisAngle(c,a,Math.PI),c):0.999999<g?(c[0]=0,c[1]=0,c[2]=0,c[3]=1,c):(n.cross(a,d,h),c[0]=a[0],c[1]=a[1],c[2]=a[2],c[3]=1+g,q.normalize(c,c))}}();q.setAxes=function(){var a=w.create();return function(b,e,c,d){return a[0]=c[0],a[3]=c[1],a[6]=c[2],a[1]=d[0],a[4]=d[1],a[7]=d[2],a[2]=-e[0],a[5]=-e[1],a[8]=-e[2],q.normalize(b,q.fromMat3(b,a))}}();q.clone=r.clone;q.fromValues=r.fromValues;q.copy=
r.copy;q.set=r.set;q.identity=function(a){return a[0]=0,a[1]=0,a[2]=0,a[3]=1,a};q.setAxisAngle=function(a,b,e){e*=0.5;var c=Math.sin(e);return a[0]=c*b[0],a[1]=c*b[1],a[2]=c*b[2],a[3]=Math.cos(e),a};q.add=r.add;q.multiply=function(a,b,e){var c=b[0],d=b[1],h=b[2];b=b[3];var g=e[0],f=e[1],l=e[2];e=e[3];return a[0]=c*e+b*g+d*l-h*f,a[1]=d*e+b*f+h*g-c*l,a[2]=h*e+b*l+c*f-d*g,a[3]=b*e-c*g-d*f-h*l,a};q.mul=q.multiply;q.scale=r.scale;q.rotateX=function(a,b,e){e*=0.5;var c=b[0],d=b[1],h=b[2];b=b[3];var g=Math.sin(e);
e=Math.cos(e);return a[0]=c*e+b*g,a[1]=d*e+h*g,a[2]=h*e-d*g,a[3]=b*e-c*g,a};q.rotateY=function(a,b,e){e*=0.5;var c=b[0],d=b[1],h=b[2];b=b[3];var g=Math.sin(e);e=Math.cos(e);return a[0]=c*e-h*g,a[1]=d*e+b*g,a[2]=h*e+c*g,a[3]=b*e-d*g,a};q.rotateZ=function(a,b,e){e*=0.5;var c=b[0],d=b[1],h=b[2];b=b[3];var g=Math.sin(e);e=Math.cos(e);return a[0]=c*e+d*g,a[1]=d*e-c*g,a[2]=h*e+b*g,a[3]=b*e-h*g,a};q.calculateW=function(a,b){var e=b[0],c=b[1],d=b[2];return a[0]=e,a[1]=c,a[2]=d,a[3]=-Math.sqrt(Math.abs(1-
e*e-c*c-d*d)),a};q.dot=r.dot;q.lerp=r.lerp;q.slerp=function(a,b,e,c){var d=b[0],h=b[1],g=b[2];b=b[3];var f=e[0],l=e[1],m=e[2];e=e[3];var n,p,s,q,r;return p=d*f+h*l+g*m+b*e,0>p&&(p=-p,f=-f,l=-l,m=-m,e=-e),1E-6<1-p?(n=Math.acos(p),s=Math.sin(n),q=Math.sin((1-c)*n)/s,r=Math.sin(c*n)/s):(q=1-c,r=c),a[0]=q*d+r*f,a[1]=q*h+r*l,a[2]=q*g+r*m,a[3]=q*b+r*e,a};q.invert=function(a,b){var e=b[0],c=b[1],d=b[2],h=b[3],g=e*e+c*c+d*d+h*h,g=g?1/g:0;return a[0]=-e*g,a[1]=-c*g,a[2]=-d*g,a[3]=h*g,a};q.conjugate=function(a,
b){return a[0]=-b[0],a[1]=-b[1],a[2]=-b[2],a[3]=b[3],a};q.length=r.length;q.len=q.length;q.squaredLength=r.squaredLength;q.sqrLen=q.squaredLength;q.normalize=r.normalize;q.fromMat3=function(a,b){var e=b[0]+b[4]+b[8];if(0<e)e=Math.sqrt(e+1),a[3]=0.5*e,e=0.5/e,a[0]=(b[7]-b[5])*e,a[1]=(b[2]-b[6])*e,a[2]=(b[3]-b[1])*e;else{var c=0;b[4]>b[0]&&(c=1);b[8]>b[3*c+c]&&(c=2);var d=(c+1)%3,h=(c+2)%3,e=Math.sqrt(b[3*c+c]-b[3*d+d]-b[3*h+h]+1);a[c]=0.5*e;e=0.5/e;a[3]=(b[3*h+d]-b[3*d+h])*e;a[d]=(b[3*d+c]+b[3*c+d])*
e;a[h]=(b[3*h+c]+b[3*c+h])*e}return a};q.str=function(a){return"quat("+a[0]+", "+a[1]+", "+a[2]+", "+a[3]+")"};"undefined"!=typeof c&&(c.quat=q)})(f)})(this);bongiovi=window.bongiovi||{};
(function(){SimpleImageLoader=function(){this._imgs={};this._toLoadCount=this._loadedCount=0;this._callbackProgress=this._callback=this._scope=void 0};var d=SimpleImageLoader.prototype;d.load=function(d,c,h,g){this._imgs={};this._loadedCount=0;this._toLoadCount=d.length;this._scope=c;this._callback=h;this._callbackProgress=g;var l=this;for(c=0;c<d.length;c++){h=new Image;h.onload=function(){l._onImageLoaded()};g=d[c];var m=g.split("/"),m=m[m.length-1].split(".")[0];this._imgs[m]=h;h.src=g}};d._onImageLoaded=
function(){this._loadedCount++;if(this._loadedCount==this._toLoadCount)this._callback.call(this._scope,this._imgs);else{var d=this._loadedCount/this._toLoadCount;this._callbackProgress&&this._callbackProgress.call(this._scope,d)}}})();bongiovi.SimpleImageLoader=new SimpleImageLoader;bongiovi.Utils={};
(function(){var d=function(c,d){this._easing=d||0.1;this._targetValue=this._value=c;bongiovi.Scheduler.addEF(this,this._update)},f=d.prototype;f._update=function(){this._checkLimit();this._value+=(this._targetValue-this._value)*this._easing};f.setTo=function(c){this._targetValue=this._value=c};f.add=function(c){this._targetValue+=c};f.limit=function(c,d){this._min=c;this._max=d;this._checkLimit()};f._checkLimit=function(){void 0!=this._min&&this._targetValue<this._min&&(this._targetValue=this._min);
void 0!=this._max&&this._targetValue>this._max&&(this._targetValue=this._max)};f.__defineGetter__("value",function(){return this._value});f.__defineGetter__("targetValue",function(){return this._targetValue});f.__defineSetter__("value",function(c){this._targetValue=c});bongiovi.EaseNumber=d})();bongiovi=window.bongiovi||{};void 0==window.requestAnimFrame&&(window.requestAnimFrame=function(){return window.requestAnimationFrame||window.webkitRequestAnimationFrame||window.mozRequestAnimationFrame||window.oRequestAnimationFrame||window.msRequestAnimationFrame||function(d){window.setTimeout(d,1E3/60)}}());
(function(){var d=function(){this.FRAMERATE=60;this._delayTasks=[];this._nextTasks=[];this._deferTasks=[];this._highTasks=[];this._usurpTask=[];this._enterframeTasks=[];this._idTable=0;requestAnimFrame(this._loop.bind(this))},f=d.prototype;f._loop=function(){requestAnimFrame(this._loop.bind(this));this._process()};f._process=function(){for(var c=0;c<this._enterframeTasks.length;c++){var d=this._enterframeTasks[c];null!=d&&void 0!=d&&d.func.apply(d.scope,d.params)}for(;0<this._highTasks.length;)d=
this._highTasks.pop(),d.func.apply(d.scope,d.params);for(var g=(new Date).getTime(),c=0;c<this._delayTasks.length;c++)d=this._delayTasks[c],g-d.time>d.delay&&(d.func.apply(d.scope,d.params),this._delayTasks.splice(c,1));g=(new Date).getTime();for(c=1E3/this.FRAMERATE;0<this._deferTasks.length;){var d=this._deferTasks.shift(),f=(new Date).getTime();if(f-g<c)d.func.apply(d.scope,d.params);else{this._deferTasks.unshift(d);break}}g=(new Date).getTime();for(c=1E3/this.FRAMERATE;0<this._usurpTask.length;)if(d=
this._usurpTask.shift(),f=(new Date).getTime(),f-g<c)d.func.apply(d.scope,d.params);else break;this._highTasks=this._highTasks.concat(this._nextTasks);this._nextTasks=[];this._usurpTask=[]};f.addEF=function(c,d,g){g=g||[];var f=this._idTable;this._enterframeTasks[f]={scope:c,func:d,params:g};this._idTable++;return f};f.removeEF=function(c){void 0!=this._enterframeTasks[c]&&(this._enterframeTasks[c]=null);return-1};f.delay=function(c,d,g,f){var m=(new Date).getTime();this._delayTasks.push({scope:c,
func:d,params:g,delay:f,time:m})};f.defer=function(c,d,g){this._deferTasks.push({scope:c,func:d,params:g})};f.next=function(c,d,g){this._nextTasks.push({scope:c,func:d,params:g})};f.usurp=function(c,d,g){this._usurpTask.push({scope:c,func:d,params:g})};bongiovi.Scheduler=new d})();bongiovi=window.bongiovi||{};
(function(){var d=null,f=function(){this.aspectRatio=1;this.fieldOfView=45;this.zNear=5;this.zFar=3E3;this.shaderProgram=this.shader=this.gl=this.canvas=null},c=f.prototype;c.init=function(c,d,f,m){this.canvas=c||document.createElement("canvas");c=m||{};c.antialias=!0;this.gl=this.canvas.getContext("experimental-webgl",c);void 0!==d&&void 0!==f?this.setSize(d,f):this.setSize(window.innerWidth,window.innerHeight);this.gl.getParameter(this.gl.SAMPLES);this.gl.getContextAttributes();this.gl.viewport(0,
0,this.gl.viewportWidth,this.gl.viewportHeight);this.gl.enable(this.gl.DEPTH_TEST);this.gl.enable(this.gl.CULL_FACE);this.gl.enable(this.gl.BLEND);this.gl.clearColor(0,0,0,1);this.gl.clearDepth(1);this.matrix=mat4.create();mat4.identity(this.matrix);this.normalMatrix=mat3.create();this.depthTextureExt=this.gl.getExtension("WEBKIT_WEBGL_depth_texture");this.floatTextureExt=this.gl.getExtension("OES_texture_float");this.floatTextureLinearExt=this.gl.getExtension("OES_texture_float_linear");this.enableAlphaBlending()};
c.getGL=function(){return this.gl};c.setShader=function(c){this.shader=c};c.setShaderProgram=function(c){this.shaderProgram=c};c.setViewport=function(c,d,f,m){this.gl.viewport(c,d,f,m)};c.setMatrices=function(c){this.camera=c};c.rotate=function(c){mat4.copy(this.matrix,c);mat4.multiply(this.matrix,this.camera.getMatrix(),this.matrix);mat3.fromMat4(this.normalMatrix,this.matrix);mat3.invert(this.normalMatrix,this.normalMatrix);mat3.transpose(this.normalMatrix,this.normalMatrix)};c.enableAlphaBlending=
function(){this.gl.blendFunc(this.gl.SRC_ALPHA,this.gl.ONE_MINUS_SRC_ALPHA)};c.enableAdditiveBlending=function(){this.gl.blendFunc(this.gl.ONE,this.gl.ONE)};c.clear=function(c,d,f,m){this.gl.clearColor(c,d,f,m);this.gl.clear(this.gl.COLOR_BUFFER_BIT|this.gl.DEPTH_BUFFER_BIT)};c.draw=function(c){function d(c,h,g){void 0==h.cacheAttribLoc&&(h.cacheAttribLoc={});void 0==h.cacheAttribLoc[g]&&(h.cacheAttribLoc[g]=c.getAttribLocation(h,g));return h.cacheAttribLoc[g]}if(this.shaderProgram){this.gl.uniformMatrix4fv(this.shaderProgram.pMatrixUniform,
!1,this.camera.projection||this.camera.getMatrix());this.gl.uniformMatrix4fv(this.shaderProgram.mvMatrixUniform,!1,this.matrix);this.gl.bindBuffer(this.gl.ARRAY_BUFFER,c.vBufferPos);var f=d(this.gl,this.shaderProgram,"aVertexPosition");this.gl.vertexAttribPointer(f,c.vBufferPos.itemSize,this.gl.FLOAT,!1,0,0);this.gl.enableVertexAttribArray(f);this.gl.bindBuffer(this.gl.ARRAY_BUFFER,c.vBufferUV);f=d(this.gl,this.shaderProgram,"aTextureCoord");this.gl.vertexAttribPointer(f,c.vBufferUV.itemSize,this.gl.FLOAT,
!1,0,0);this.gl.enableVertexAttribArray(f);this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER,c.iBuffer);for(f=0;f<c.extraAttributes.length;f++){this.gl.bindBuffer(this.gl.ARRAY_BUFFER,c.extraAttributes[f].buffer);var m=d(this.gl,this.shaderProgram,c.extraAttributes[f].name);this.gl.vertexAttribPointer(m,c.extraAttributes[f].itemSize,this.gl.FLOAT,!1,0,0);this.gl.enableVertexAttribArray(m)}c.drawType==this.gl.POINTS?this.gl.drawArrays(c.drawType,0,c.vertexSize):this.gl.drawElements(c.drawType,c.iBuffer.numItems,
this.gl.UNSIGNED_SHORT,0)}else console.warn("Shader program not ready yet")};c.setSize=function(c,d){this._width=c;this._height=d;this.canvas.width=this._width;this.canvas.height=this._height;this.gl.viewportWidth=this._width;this.gl.viewportHeight=this._height;this.gl.viewport(0,0,this._width,this._height);this.aspectRatio=this._width/this._height};c.__defineGetter__("width",function(){return this._width});c.__defineGetter__("height",function(){return this._height});f.getInstance=function(){null==
d&&(d=new f);return d};bongiovi.GL=f.getInstance();bongiovi.GLTool=f.getInstance()})();bongiovi=window.bongiovi||{};
(function(){var d=function(c){void 0==c&&(c=document);this._isRotateZ=0;this.matrix=mat4.create();this.m=mat4.create();this._vZaxis=vec3.clone([0,0,0]);this._zAxis=vec3.clone([0,0,-1]);this.preMouse={x:0,y:0};this.mouse={x:0,y:0};this._isMouseDown=!1;this._rotation=quat.clone([0,0,1,0]);this.tempRotation=quat.clone([0,0,0,0]);this._currDiffY=this._currDiffX=this.diffY=this.diffX=this._rotateZMargin=0;this._offset=0.0040;this._easing=0.1;this._slerp=-1;this._isLocked=!1;var d=this;c.addEventListener("mousedown",
function(c){d._onMouseDown(c)});c.addEventListener("touchstart",function(c){d._onMouseDown(c)});c.addEventListener("mouseup",function(c){d._onMouseUp(c)});c.addEventListener("touchend",function(c){d._onMouseUp(c)});c.addEventListener("mousemove",function(c){d._onMouseMove(c)});c.addEventListener("touchmove",function(c){d._onMouseMove(c)})},f=d.prototype;f.inverseControl=function(c){this._isInvert=void 0==c?!0:c};f.lock=function(c){this._isLocked=void 0==c?!0:c};f.getMousePos=function(c){var d;void 0!=
c.changedTouches?(d=c.changedTouches[0].pageX,c=c.changedTouches[0].pageY):(d=c.clientX,c=c.clientY);return{x:d,y:c}};f._onMouseDown=function(c){if(!this._isLocked&&!this._isMouseDown){c=this.getMousePos(c);var d=quat.clone(this._rotation);this._updateRotation(d);this._rotation=d;this._isMouseDown=!0;this._isRotateZ=0;this.preMouse={x:c.x,y:c.y};if(c.y<this._rotateZMargin||c.y>window.innerHeight-this._rotateZMargin)this._isRotateZ=1;else if(c.x<this._rotateZMargin||c.x>window.innerWidth-this._rotateZMargin)this._isRotateZ=
2;this._currDiffY=this.diffY=this._currDiffX=this.diffX=0}};f._onMouseMove=function(c){this._isLocked||(c.touches&&c.preventDefault(),this.mouse=this.getMousePos(c))};f._onMouseUp=function(c){!this._isLocked&&this._isMouseDown&&(this._isMouseDown=!1)};f.setCameraPos=function(c,d){this._easing=d=d||this._easing;if(!(0<this._slerp)){var g=quat.clone(this._rotation);this._updateRotation(g);this._rotation=quat.clone(g);this._currDiffY=this.diffY=this._currDiffX=this.diffX=0;this._isMouseDown=!1;this._isRotateZ=
0;this._targetQuat=quat.clone(c);this._slerp=1}};f.resetQuat=function(){this._rotation=quat.clone([0,0,1,0]);this.tempRotation=quat.clone([0,0,0,0]);this._targetQuat=void 0;this._slerp=-1};f.update=function(){mat4.identity(this.m);void 0==this._targetQuat?(quat.set(this.tempRotation,this._rotation[0],this._rotation[1],this._rotation[2],this._rotation[3]),this._updateRotation(this.tempRotation)):(this._slerp+=0.1*(0-this._slerp),0.0010>this._slerp?(quat.set(this._rotation,this._targetQuat[0],this._targetQuat[1],
this._targetQuat[2],this._targetQuat[3]),this._targetQuat=void 0,this._slerp=-1):(quat.set(this.tempRotation,0,0,0,0),quat.slerp(this.tempRotation,this._targetQuat,this._rotation,this._slerp)));vec3.transformQuat(this._vZaxis,this._vZaxis,this.tempRotation);mat4.fromQuat(this.matrix,this.tempRotation)};f._updateRotation=function(c){this._isMouseDown&&!this._isLocked&&(this.diffX=-(this.mouse.x-this.preMouse.x),this.diffY=this.mouse.y-this.preMouse.y,this._isInvert&&(this.diffX=-this.diffX),this._isInvert&&
(this.diffY=-this.diffY));this._currDiffX+=(this.diffX-this._currDiffX)*this._easing;this._currDiffY+=(this.diffY-this._currDiffY)*this._easing;if(0<this._isRotateZ){if(1==this._isRotateZ)var d=-this._currDiffX*this._offset,d=d*(this.preMouse.y<this._rotateZMargin?-1:1),g=quat.clone([0,0,Math.sin(d),Math.cos(d)]);else d=-this._currDiffY*this._offset,d*=this.preMouse.x<this._rotateZMargin?1:-1,g=quat.clone([0,0,Math.sin(d),Math.cos(d)]);quat.multiply(quat,c,g)}else d=vec3.clone([this._currDiffX,this._currDiffY,
0]),g=vec3.create(),vec3.cross(g,d,this._zAxis),vec3.normalize(g,g),d=vec3.length(d)*this._offset,g=quat.clone([Math.sin(d)*g[0],Math.sin(d)*g[1],Math.sin(d)*g[2],Math.cos(d)]),quat.multiply(c,g,c)};bongiovi.QuatRotation=d})();bongiovi=window.bongiovi||{};
(function(){var d=function(c){void 0==c&&(c=document);this._isRotateZ=0;this.matrix=mat4.create();this.m=mat4.create();this._vZaxis=vec3.clone([0,0,0]);this._zAxis=vec3.clone([0,0,-1]);this.preMouse={x:0,y:0};this.mouse={x:0,y:0};this._isMouseDown=!1;this._rotation=quat.clone([0,0,1,0]);this.tempRotation=quat.clone([0,0,0,0]);this._rotateZMargin=80;this._currDiffY=this._currDiffX=this.diffY=this.diffX=0;this._offset=0.0040;this._easing=0.1;this._slerp=-1;this._isLocked=!1;var d=this;c.addEventListener("mousedown",
function(c){d._onMouseDown(c)});c.addEventListener("touchstart",function(c){d._onMouseDown(c)});c.addEventListener("mouseup",function(c){d._onMouseUp(c)});c.addEventListener("touchend",function(c){d._onMouseUp(c)});c.addEventListener("mousemove",function(c){d._onMouseMove(c)});c.addEventListener("touchmove",function(c){d._onMouseMove(c)})},f=d.prototype;f.inverseControl=function(c){this._isInvert=void 0==c?!0:c};f.lock=function(c){this._isLocked=void 0==c?!0:c};f.getMousePos=function(c){var d;void 0!=
c.changedTouches?(d=c.changedTouches[0].pageX,c=c.changedTouches[0].pageY):(d=c.clientX,c=c.clientY);return{x:d,y:c}};f._onMouseDown=function(c){if(!this._isLocked&&!this._isMouseDown){c=this.getMousePos(c);var d=quat.clone(this._rotation);this._updateRotation(d);this._rotation=d;this._isMouseDown=!0;this._isRotateZ=0;this.preMouse={x:c.x,y:c.y};if(c.y<this._rotateZMargin||c.y>window.innerHeight-this._rotateZMargin)this._isRotateZ=1;else if(c.x<this._rotateZMargin||c.x>window.innerWidth-this._rotateZMargin)this._isRotateZ=
2;this._currDiffY=this.diffY=this._currDiffX=this.diffX=0}};f._onMouseMove=function(c){this._isLocked||(c.touches&&c.preventDefault(),this.mouse=this.getMousePos(c))};f._onMouseUp=function(c){!this._isLocked&&this._isMouseDown&&(this._isMouseDown=!1)};f.setCameraPos=function(c,d){this._easing=d=d||this._easing;0<this._slerp&&(quat.set(this._rotation,this._targetQuat[0],this._targetQuat[1],this._targetQuat[2],this._targetQuat[3]),this._targetQuat=void 0);var g=quat.clone(this._rotation);this._updateRotation(g);
this._rotation=quat.clone(g);this._currDiffY=this.diffY=this._currDiffX=this.diffX=0;this._isMouseDown=!1;this._isRotateZ=0;this._targetQuat=quat.clone(c);this._slerp=1};f.resetQuat=function(){this._rotation=quat.clone([0,0,1,0]);this.tempRotation=quat.clone([0,0,0,0]);this._targetQuat=void 0;this._slerp=-1};f.update=function(){mat4.identity(this.m);void 0==this._targetQuat?(quat.set(this.tempRotation,this._rotation[0],this._rotation[1],this._rotation[2],this._rotation[3]),this._updateRotation(this.tempRotation)):
(this._slerp+=0.1*(0-this._slerp),0.0010>this._slerp?(quat.set(this._rotation,this._targetQuat[0],this._targetQuat[1],this._targetQuat[2],this._targetQuat[3]),this._targetQuat=void 0,this._slerp=-1):(quat.set(this.tempRotation,0,0,0,0),quat.slerp(this.tempRotation,this._targetQuat,this._rotation,this._slerp)));vec3.transformQuat(this._vZaxis,this._vZaxis,this.tempRotation);mat4.fromQuat(this.matrix,this.tempRotation)};f._updateRotation=function(c){this._isMouseDown&&!this._isLocked&&(this.diffX=-(this.mouse.x-
this.preMouse.x),this.diffY=this.mouse.y-this.preMouse.y,this._isInvert&&(this.diffX=-this.diffX),this._isInvert&&(this.diffY=-this.diffY));this._currDiffX+=(this.diffX-this._currDiffX)*this._easing;this._currDiffY+=(this.diffY-this._currDiffY)*this._easing;if(0<this._isRotateZ)if(1==this._isRotateZ)var d=-this._currDiffX*this._offset,d=d*(this.preMouse.y<this._rotateZMargin?-1:1),g=quat.clone([0,0,Math.sin(d),Math.cos(d)]);else d=-this._currDiffY*this._offset,d*=this.preMouse.x<this._rotateZMargin?
1:-1,g=quat.clone([0,0,-Math.sin(d),Math.cos(d)]);else d=vec3.clone([this._currDiffX,this._currDiffY,0]),g=vec3.create(),vec3.cross(g,d,this._zAxis),vec3.normalize(g,g),d=vec3.length(d)*this._offset,g=quat.clone([Math.sin(d)*g[0],Math.sin(d)*g[1],Math.sin(d)*g[2],Math.cos(d)]);quat.multiply(c,g,c)};f.__defineGetter__("rotateMargin",function(){return this._rotateZMargin});f.__defineSetter__("rotateMargin",function(c){this._rotateZMargin=c});bongiovi.SceneRotation=d})();(function(){var d=bongiovi.GL,f=function(){this.gl=bongiovi.GLTool.gl;this._children=[];this._init()},c=f.prototype;c._init=function(){this.camera=new bongiovi.SimpleCamera(d.canvas);this.camera.setPerspective(45*Math.PI/180,d.aspectRatio,5,3E3);this.camera.lockRotation();var c=vec3.clone([0,0,500]),g=vec3.create(),f=vec3.clone([0,-1,0]);this.camera.lookAt(c,g,f);this.sceneRotation=new bongiovi.SceneRotation(d.canvas);this.rotationFront=mat4.create();mat4.identity(this.rotationFront);this.cameraOtho=
new bongiovi.Camera;this._initTextures();this._initViews();window.addEventListener("resize",this._onResize.bind(this))};c._initTextures=function(){};c._initViews=function(){};c.loop=function(){this.update();this.render()};c.update=function(){this.gl.clear(this.gl.COLOR_BUFFER_BIT|this.gl.DEPTH_BUFFER_BIT);this.sceneRotation.update();d.setViewport(0,0,d.width,d.height);d.setMatrices(this.camera);d.rotate(this.sceneRotation.matrix)};c.resize=function(){this.camera.resize&&this.camera.resize(d.aspectRatio)};
c.render=function(){};c._onResize=function(c){};bongiovi.Scene=f})();bongiovi=window.bongiovi||{};(function(){var d=function(){this.matrix=mat4.create();mat4.identity(this.matrix);this.position=vec3.create()},f=d.prototype;f.lookAt=function(c,d,f){vec3.copy(this.position,c);mat4.identity(this.matrix);mat4.lookAt(this.matrix,c,d,f)};f.getMatrix=function(){return this.matrix};bongiovi.Camera=d})();bongiovi=window.bongiovi||{};
(function(){var d=bongiovi.Camera,f=function(){d.call(this);this.projection=mat4.create();this.mtxFinal=mat4.create()},c=f.prototype=new d;c.setPerspective=function(c,d,f,m){this._fov=c;this._near=f;this._far=m;this._aspect=d;mat4.perspective(this.projection,c,d,f,m)};c.getMatrix=function(){return this.matrix};c.resize=function(c){this._aspect=c;mat4.perspective(this.projection,this._fov,c,this._near,this._far)};c.__defineGetter__("near",function(){return this._near});c.__defineGetter__("far",function(){return this._far});
bongiovi.CameraPerspective=f})();(function(){var d=function(c){this._listenerTarget=c||window;bongiovi.CameraPerspective.call(this);this._isLocked=!1;this._init()},f=d.prototype=new bongiovi.CameraPerspective,c=bongiovi.CameraPerspective.prototype,h=bongiovi.EaseNumber;f._init=function(){this.radius=new h(500);this.position[2]=this.radius.value;this.center=vec3.create();this.up=vec3.clone([0,-1,0]);this.lookAt(this.position,this.center,this.up);this._mouse={};this._preMouse={};this._isMouseDown=!1;this._rx=new h(0);this._rx.limit(-Math.PI/
2,Math.PI/2);this._ry=new h(0);this._preRY=this._preRX=0;this._isInvert=this._isLockRotation=this._isLocked=!1;this._listenerTarget.addEventListener("mousewheel",this._onWheel.bind(this));this._listenerTarget.addEventListener("DOMMouseScroll",this._onWheel.bind(this));this._listenerTarget.addEventListener("mousedown",this._onMouseDown.bind(this));this._listenerTarget.addEventListener("touchstart",this._onMouseDown.bind(this));this._listenerTarget.addEventListener("mousemove",this._onMouseMove.bind(this));
this._listenerTarget.addEventListener("touchmove",this._onMouseMove.bind(this));window.addEventListener("mouseup",this._onMouseUp.bind(this));window.addEventListener("touchend",this._onMouseUp.bind(this))};f.inverseControl=function(c){this._isInvert=void 0==c?!0:c};f.lock=function(c){this._isLocked=void 0==c?!0:c};f.lockRotation=function(c){this._isLockRotation=void 0==c?!0:c};f._onMouseDown=function(c){this._isLockRotation||this._isLocked||(this._isMouseDown=!0,g(c,this._mouse),g(c,this._preMouse),
this._preRX=this._rx.targetValue,this._preRY=this._ry.targetValue)};f._onMouseMove=function(c){this._isLockRotation||this._isLocked||(g(c,this._mouse),c.touches&&c.preventDefault(),this._isMouseDown&&(c=this._mouse.x-this._preMouse.x,this._isInvert&&(c*=-1),this._ry.value=this._preRY-0.01*c,c=this._mouse.y-this._preMouse.y,this._isInvert&&(c*=-1),this._rx.value=this._preRX-0.01*c,this._rx.targetValue>0.5*Math.PI&&(this._rx.targetValue=Math)))};f._onMouseUp=function(c){this._isLockRotation||this._isLocked||
(this._isMouseDown=!1)};f._onWheel=function(c){if(!this._isLocked){var d=c.wheelDelta;c=c.detail;this.radius.add(5*-(c?d?0<d/c/40*c?1:-1:-c/3:d/120))}};f.getMatrix=function(){this._updateCameraPosition();this.lookAt(this.position,this.center,this.up);return c.getMatrix.call(this)};f._updateCameraPosition=function(){this.position[2]=this.radius.value;this.position[1]=Math.sin(this._rx.value)*this.radius.value;var c=Math.cos(this._rx.value)*this.radius.value;this.position[0]=Math.cos(this._ry.value+
0.5*Math.PI)*c;this.position[2]=Math.sin(this._ry.value+0.5*Math.PI)*c};var g=function(c,d){var f=d||{};c.touches?(f.x=c.touches[0].pageX,f.y=c.touches[0].pageY):(f.x=c.clientX,f.y=c.clientY);return f};f.__defineGetter__("rx",function(){return this._rx.targetValue});f.__defineSetter__("rx",function(c){this._rx.value=c});f.__defineGetter__("ry",function(){return this._ry.targetValue});f.__defineSetter__("ry",function(c){this._ry.value=c});bongiovi.SimpleCamera=d})();(function(){var d=function(c,d,f){this._vertexA=c;this._vertexB=d;this._vertexC=f;this._init()},f=d.prototype;f._init=function(){var c=vec3.create(),d=vec3.create();vec3.sub(c,this._vertexB,this._vertexA);vec3.sub(d,this._vertexC,this._vertexA);this._faceNormal=vec3.create();vec3.cross(this._faceNormal,c,d);vec3.normalize(this._faceNormal,this._faceNormal)};f.contains=function(d){c(d,this._vertexA)||c(d,this._vertexB)||c(d,this._vertexC);return c(d,this._vertexA)||c(d,this._vertexB)||c(d,this._vertexC)};
f.__defineGetter__("faceNormal",function(){return this._faceNormal});var c=function(c,d){return c[0]===d[0]&&c[1]===d[1]&&c[2]===d[2]};bongiovi.Face=d})();(function(){var d=function(c,d,f){this.gl=bongiovi.GLTool.gl;this.vertexSize=c;this.indexSize=d;this.drawType=f;this.extraAttributes=[];this._floatArrayVertex=this.vBufferPos=void 0;this._init()},f=d.prototype;f._init=function(){};f.bufferVertex=function(c,d){var f=[],l=d?this.gl.DYNAMIC_DRAW:this.gl.STATIC_DRAW;this._vertices=[];for(var m=0;m<c.length;m++){for(var s=0;s<c[m].length;s++)f.push(c[m][s]);this._vertices.push(vec3.clone(c[m]))}void 0==this.vBufferPos&&(this.vBufferPos=this.gl.createBuffer());
this.gl.bindBuffer(this.gl.ARRAY_BUFFER,this.vBufferPos);if(void 0==this._floatArrayVertex)this._floatArrayVertex=new Float32Array(f);else if(c.length!=this._floatArrayVertex.length)this._floatArrayVertex=new Float32Array(f);else for(m=0;m<c.length;m++)this._floatArrayVertex[m]=c[m];this.gl.bufferData(this.gl.ARRAY_BUFFER,this._floatArrayVertex,l);this.vBufferPos.itemSize=3};f.bufferTexCoords=function(c){for(var d=[],f=0;f<c.length;f++)for(var l=0;l<c[f].length;l++)d.push(c[f][l]);this.vBufferUV=
this.gl.createBuffer();this.gl.bindBuffer(this.gl.ARRAY_BUFFER,this.vBufferUV);this.gl.bufferData(this.gl.ARRAY_BUFFER,new Float32Array(d),this.gl.STATIC_DRAW);this.vBufferUV.itemSize=2};f.bufferData=function(c,d,f,l){var m=-1;l=l?this.gl.DYNAMIC_DRAW:this.gl.STATIC_DRAW;for(var s=0;s<this.extraAttributes.length;s++)if(this.extraAttributes[s].name==d){this.extraAttributes[s].data=c;m=s;break}for(var p=[],s=0;s<c.length;s++)for(var n=0;n<c[s].length;n++)p.push(c[s][n]);if(-1==m)s=this.gl.createBuffer(),
this.gl.bindBuffer(this.gl.ARRAY_BUFFER,s),m=new Float32Array(p),this.gl.bufferData(this.gl.ARRAY_BUFFER,m,l),this.extraAttributes.push({name:d,data:c,itemSize:f,buffer:s,floatArray:m});else{s=this.extraAttributes[m].buffer;this.gl.bindBuffer(this.gl.ARRAY_BUFFER,s);m=this.extraAttributes[m].floatArray;for(s=0;s<p.length;s++)m[s]=p[s];this.gl.bufferData(this.gl.ARRAY_BUFFER,m,l)}};f.bufferIndices=function(c){this._indices=c;this.iBuffer=this.gl.createBuffer();this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER,
this.iBuffer);this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(c),this.gl.STATIC_DRAW);this.iBuffer.itemSize=1;this.iBuffer.numItems=c.length};f.computeNormals=function(){if(this.drawType==this.gl.TRIANGLES){void 0===this._faces&&this._generateFaces();console.log("Start computing");var c=(new Date).getTime();this._normals=[];for(var d=0;d<this._vertices.length;d++){var f=vec3.create(),l=0;for(j=0;j<this._faces.length;j++)this._faces[j].contains(this._vertices[d])&&(vec3.add(f,f,this._faces[j].faceNormal),
l++);vec3.normalize(f,f);this._normals.push(f)}this.bufferData(this._normals,"aNormal",3);c=(new Date).getTime()-c;console.log("Total Time : ",c)}};f.computeTangent=function(){};f._generateFaces=function(){this._faces=[];for(var c=0;c<this._indices.length;c+=3)this._faces.push(new bongiovi.Face(this._vertices[this._indices[c+0]],this._vertices[this._indices[c+1]],this._vertices[this._indices[c+2]]))};bongiovi.Mesh=d})();(function(){var d=function(){};d.shaders={};d.shaders.copyVert="precision highp float;attribute vec3 aVertexPosition;attribute vec2 aTextureCoord;uniform mat4 uMVMatrix;uniform mat4 uPMatrix;varying vec2 vTextureCoord;void main(void) {    gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);    vTextureCoord = aTextureCoord;}";d.shaders.generalVert="precision highp float;attribute vec3 aVertexPosition;attribute vec2 aTextureCoord;uniform mat4 uMVMatrix;uniform mat4 uPMatrix;uniform vec3 position;uniform vec3 scale;varying vec2 vTextureCoord;void main(void) {    vec3 pos = aVertexPosition;    pos *= scale;    pos += position;    gl_Position = uPMatrix * uMVMatrix * vec4(pos, 1.0);    vTextureCoord = aTextureCoord;}";
d.shaders.copyFrag="precision highp float;varying vec2 vTextureCoord;uniform sampler2D texture;void main(void) {    gl_FragColor = texture2D(texture, vTextureCoord);}";d.shaders.alphaFrag="precision highp float;varying vec2 vTextureCoord;uniform sampler2D texture;uniform float opacity;void main(void) {    gl_FragColor = texture2D(texture, vTextureCoord);    gl_FragColor.a *= opacity;}";d.shaders.simpleColorFrag="precision highp float;uniform vec3 color;uniform float opacity;void main(void) {    gl_FragColor = vec4(color, opacity);}";
d.shaders.depthFrag="precision highp float;varying vec2 vTextureCoord;uniform sampler2D texture;uniform float n;uniform float f;float getDepth(float z) {\treturn (6.0 * n) / (f + n - z*(f-n));}void main(void) {    float r = texture2D(texture, vTextureCoord).r;    float grey = getDepth(r);    gl_FragColor = vec4(grey, grey, grey, 1.0);}";d.getShader=function(d){return this.shaders[d]};d.get=d.getShader;bongiovi.ShaderLibs=d})();(function(){var d=function(c,d){this.gl=bongiovi.GL.gl;this.idVertex=c;this.idFragment=d;this.parameters=[];this.uniformTextures=[];this.fragmentShader=this.vertexShader=void 0;this._isReady=!1;this._loadedCount=0;void 0==c&&this.createVertexShaderProgram(bongiovi.ShaderLibs.getShader("copyVert"));void 0==d&&this.createFragmentShaderProgram(bongiovi.ShaderLibs.getShader("copyFrag"));this.init()},f=d.prototype;f.init=function(){this.idVertex&&-1<this.idVertex.indexOf("main(void)")?this.createVertexShaderProgram(this.idVertex):
this.getShader(this.idVertex,!0);this.idFragment&&-1<this.idFragment.indexOf("main(void)")?this.createFragmentShaderProgram(this.idFragment):this.getShader(this.idFragment,!1)};f.getShader=function(c,d){if(c){var f=new XMLHttpRequest;f.hasCompleted=!1;var l=this;f.onreadystatechange=function(c){4==c.target.readyState&&(d?l.createVertexShaderProgram(c.target.responseText):l.createFragmentShaderProgram(c.target.responseText))};f.open("GET",c,!0);f.send(null)}};f.createVertexShaderProgram=function(c){if(this.gl){var d=
this.gl.createShader(this.gl.VERTEX_SHADER);this.gl.shaderSource(d,c);this.gl.compileShader(d);if(!this.gl.getShaderParameter(d,this.gl.COMPILE_STATUS))return console.warn("Error in Vertex Shader : ",this.idVertex,":",this.gl.getShaderInfoLog(d)),console.log(c),null;this.vertexShader=d;void 0!=this.vertexShader&&void 0!=this.fragmentShader&&this.attachShaderProgram();this._loadedCount++}};f.createFragmentShaderProgram=function(c){if(this.gl){var d=this.gl.createShader(this.gl.FRAGMENT_SHADER);this.gl.shaderSource(d,
c);this.gl.compileShader(d);if(!this.gl.getShaderParameter(d,this.gl.COMPILE_STATUS))return console.warn("Error in Fragment Shader: ",this.idFragment,":",this.gl.getShaderInfoLog(d)),console.log(c),null;this.fragmentShader=d;void 0!=this.vertexShader&&void 0!=this.fragmentShader&&this.attachShaderProgram();this._loadedCount++}};f.attachShaderProgram=function(){this._isReady=!0;this.shaderProgram=this.gl.createProgram();this.gl.attachShader(this.shaderProgram,this.vertexShader);this.gl.attachShader(this.shaderProgram,
this.fragmentShader);this.gl.linkProgram(this.shaderProgram)};f.bind=function(){this._isReady&&(this.gl.useProgram(this.shaderProgram),void 0==this.shaderProgram.pMatrixUniform&&(this.shaderProgram.pMatrixUniform=this.gl.getUniformLocation(this.shaderProgram,"uPMatrix")),void 0==this.shaderProgram.mvMatrixUniform&&(this.shaderProgram.mvMatrixUniform=this.gl.getUniformLocation(this.shaderProgram,"uMVMatrix")),bongiovi.GLTool.setShader(this),bongiovi.GLTool.setShaderProgram(this.shaderProgram),this.uniformTextures=
[])};f.isReady=function(){return this._isReady};f.uniform=function(c,d,f){if(this._isReady){"texture"==d&&(d="uniform1i");for(var l=!1,m,s=0;s<this.parameters.length;s++)if(m=this.parameters[s],m.name==c){m.value=f;l=!0;break}l?this.shaderProgram[c]=m.uniformLoc:(this.shaderProgram[c]=this.gl.getUniformLocation(this.shaderProgram,c),this.parameters.push({name:c,type:d,value:f,uniformLoc:this.shaderProgram[c]}));if(-1==d.indexOf("Matrix"))this.gl[d](this.shaderProgram[c],f);else this.gl[d](this.shaderProgram[c],
!1,f);"uniform1i"==d&&(this.uniformTextures[f]=this.shaderProgram[c])}};f.unbind=function(){};bongiovi.GLShader=d})();(function(){var d,f,c=function(c,h,m){m=m||{};d=bongiovi.GL.gl;f=bongiovi.GL;if(h)this.texture=c;else{this._source=c;this.texture=d.createTexture();this._isVideo="VIDEO"==c.tagName;this.magFilter=m.magFilter||d.LINEAR;this.minFilter=m.minFilter||d.LINEAR_MIPMAP_NEAREST;this.wrapS=m.wrapS||d.MIRRORED_REPEAT;this.wrapT=m.wrapT||d.MIRRORED_REPEAT;if(c.width||c.videoWidth){if(h=c.width||c.videoWidth,m=c.height||c.videoHeight,!h||!m||0==h||h&h-1||0==m||m&m-1)this.wrapS=this.wrapT=d.CLAMP_TO_EDGE,this.minFilter==
d.LINEAR_MIPMAP_NEAREST&&(this.minFilter=d.LINEAR)}else this.wrapS=this.wrapT=d.CLAMP_TO_EDGE,this.minFilter==d.LINEAR_MIPMAP_NEAREST&&(this.minFilter=d.LINEAR);d.bindTexture(d.TEXTURE_2D,this.texture);d.pixelStorei(d.UNPACK_FLIP_Y_WEBGL,!0);d.texImage2D(d.TEXTURE_2D,0,d.RGBA,d.RGBA,d.UNSIGNED_BYTE,c);d.texParameteri(d.TEXTURE_2D,d.TEXTURE_MAG_FILTER,this.magFilter);d.texParameteri(d.TEXTURE_2D,d.TEXTURE_MIN_FILTER,this.minFilter);d.texParameteri(d.TEXTURE_2D,d.TEXTURE_WRAP_S,this.wrapS);d.texParameteri(d.TEXTURE_2D,
d.TEXTURE_WRAP_T,this.wrapT);this.minFilter==d.LINEAR_MIPMAP_NEAREST&&d.generateMipmap(d.TEXTURE_2D);d.bindTexture(d.TEXTURE_2D,null)}},h=c.prototype;h.updateTexture=function(c){c&&(this._source=c);d.bindTexture(d.TEXTURE_2D,this.texture);d.pixelStorei(d.UNPACK_FLIP_Y_WEBGL,!0);d.texImage2D(d.TEXTURE_2D,0,d.RGBA,d.RGBA,d.UNSIGNED_BYTE,this._source);d.texParameteri(d.TEXTURE_2D,d.TEXTURE_MAG_FILTER,this.magFilter);d.texParameteri(d.TEXTURE_2D,d.TEXTURE_MIN_FILTER,this.minFilter);this.minFilter==d.LINEAR_MIPMAP_NEAREST&&
d.generateMipmap(d.TEXTURE_2D);d.bindTexture(d.TEXTURE_2D,null)};h.bind=function(c,h){void 0==c&&(c=0);f.shader&&(d.activeTexture(d.TEXTURE0+c),d.bindTexture(d.TEXTURE_2D,this.texture),d.uniform1i(f.shader.uniformTextures[c],c),this._bindIndex=c)};h.unbind=function(){d.bindTexture(d.TEXTURE_2D,null)};bongiovi.GLTexture=c})();(function(){var d=function(c,d){this.shader=new bongiovi.GLShader(c,d);this._init()},f=d.prototype;f._init=function(){};f.render=function(){};bongiovi.View=d})();(function(){var d=bongiovi.View,f=function(c,f){d.call(this,c,f)},c=f.prototype=new d;c._init=function(){this.mesh=bongiovi.MeshUtils.createPlane(2,2,1)};c.render=function(c){this.shader.isReady()&&(this.shader.bind(),this.shader.uniform("texture","uniform1i",0),c.bind(0),bongiovi.GLTool.draw(this.mesh))};bongiovi.ViewCopy=f})();(function(){var d=bongiovi.GL,f=function(c,d){this._near=c||0;this._far=d||0;bongiovi.View.call(this,null,bongiovi.ShaderLibs.getShader("depthFrag"))},c=f.prototype=new bongiovi.View;c._init=function(){this.mesh=bongiovi.MeshUtils.createPlane(2,2,1)};c.render=function(c,f){f&&(this._near=f.near,this._far=f.far);this.shader.bind();this.shader.uniform("texture","uniform1i",0);this.shader.uniform("n","uniform1f",this._near);this.shader.uniform("f","uniform1f",this._far);c.bind(0);d.draw(this.mesh)};
bongiovi.ViewDepth=f})();(function(){var d,f,c=bongiovi.GLTexture,h=function(c,g,h){f=bongiovi.GL;d=f.gl;h=h||{};this.width=c;this.height=g;this.magFilter=h.magFilter||d.LINEAR;this.minFilter=h.minFilter||d.LINEAR;this.wrapS=h.wrapS||d.MIRRORED_REPEAT;this.wrapT=h.wrapT||d.MIRRORED_REPEAT;if(0==c||c&c-1||0==g||g&g-1)this.wrapS=this.wrapT=d.CLAMP_TO_EDGE,this.minFilter==d.LINEAR_MIPMAP_NEAREST&&(this.minFilter=d.LINEAR);this._init()},g=h.prototype;g._init=function(){this.texture=d.createTexture();this.glTexture=new c(this.texture,
!0);this.frameBuffer=d.createFramebuffer();d.bindFramebuffer(d.FRAMEBUFFER,this.frameBuffer);this.frameBuffer.width=this.width;this.frameBuffer.height=this.height;d.bindTexture(d.TEXTURE_2D,this.texture);d.texParameteri(d.TEXTURE_2D,d.TEXTURE_MAG_FILTER,this.magFilter);d.texParameteri(d.TEXTURE_2D,d.TEXTURE_MIN_FILTER,this.minFilter);d.texParameteri(d.TEXTURE_2D,d.TEXTURE_WRAP_S,d.CLAMP_TO_EDGE);d.texParameteri(d.TEXTURE_2D,d.TEXTURE_WRAP_T,d.CLAMP_TO_EDGE);f.depthTextureExt?d.texImage2D(d.TEXTURE_2D,
0,d.RGBA,this.frameBuffer.width,this.frameBuffer.height,0,d.RGBA,d.FLOAT,null):d.texImage2D(d.TEXTURE_2D,0,d.RGBA,this.frameBuffer.width,this.frameBuffer.height,0,d.RGBA,d.UNSIGNED_BYTE,null);this.minFilter==d.LINEAR_MIPMAP_NEAREST&&d.generateMipmap(d.TEXTURE_2D);d.framebufferTexture2D(d.FRAMEBUFFER,d.COLOR_ATTACHMENT0,d.TEXTURE_2D,this.texture,0);if(null==f.depthTextureExt){var g=d.createRenderbuffer();d.bindRenderbuffer(d.RENDERBUFFER,g);d.renderbufferStorage(d.RENDERBUFFER,d.RGBA4,this.frameBuffer.width,
this.frameBuffer.height)}else this.depthTexture=d.createTexture(),this.glDepthTexture=new c(this.depthTexture,!0),d.bindTexture(d.TEXTURE_2D,this.depthTexture),d.texParameteri(d.TEXTURE_2D,d.TEXTURE_MAG_FILTER,d.NEAREST),d.texParameteri(d.TEXTURE_2D,d.TEXTURE_MIN_FILTER,d.NEAREST),d.texParameteri(d.TEXTURE_2D,d.TEXTURE_WRAP_S,d.CLAMP_TO_EDGE),d.texParameteri(d.TEXTURE_2D,d.TEXTURE_WRAP_T,d.CLAMP_TO_EDGE),d.texImage2D(d.TEXTURE_2D,0,d.DEPTH_COMPONENT,this.width,this.height,0,d.DEPTH_COMPONENT,d.UNSIGNED_SHORT,
null),d.framebufferTexture2D(d.FRAMEBUFFER,d.DEPTH_ATTACHMENT,d.TEXTURE_2D,this.depthTexture,0);d.bindTexture(d.TEXTURE_2D,null);d.bindRenderbuffer(d.RENDERBUFFER,null);d.bindFramebuffer(d.FRAMEBUFFER,null)};g.bind=function(){d.bindFramebuffer(d.FRAMEBUFFER,this.frameBuffer)};g.unbind=function(){d.bindFramebuffer(d.FRAMEBUFFER,null)};g.getTexture=function(){return this.glTexture};g.getDepthTexture=function(){return this.glDepthTexture};bongiovi.FrameBuffer=h})();(function(){var d,f=function(c,f,l){d=bongiovi.GL;void 0!=c&&(this.view="string"==typeof c?new bongiovi.ViewCopy(null,c):c,this.width=void 0==f?512:f,this.height=void 0==l?512:l,this._init())},c=f.prototype;c._init=function(){this.fbo=new bongiovi.FrameBuffer(this.width,this.height);this.fbo.bind();d.setViewport(0,0,this.fbo.width,this.fbo.height);d.clear(0,0,0,0);this.fbo.unbind();d.setViewport(0,0,d.canvas.width,d.canvas.height)};c.render=function(c){this.fbo.bind();d.setViewport(0,0,this.fbo.width,
this.fbo.height);d.clear(0,0,0,0);this.view.render(c);this.fbo.unbind();d.setViewport(0,0,d.canvas.width,d.canvas.height);return this.fbo.getTexture()};c.getTexture=function(){return this.fbo.getTexture()};bongiovi.Pass=f})();(function(d){d=function(){this._passes=[]};var f=d.prototype=new bongiovi.Pass;f.addPass=function(c){this._passes.push(c)};f.render=function(c){this.texture=c;for(c=0;c<this._passes.length;c++)this.texture=this._passes[c].render(this.texture);return this.texture};f.getTexture=function(){return this.texture};bongiovi.EffectComposer=d})();(function(){bongiovi.MeshUtils={};bongiovi.MeshUtils.createPlane=function(d,f,c){var h=[],g=[],l=[],m=d/c,s=f/c,p=1/c,n=0;d=0.5*-d;f=0.5*-f;for(var r=0;r<c;r++)for(var w=0;w<c;w++){var t=m*r+d,q=s*w+f;h.push([t,q,0]);h.push([t+m,q,0]);h.push([t+m,q+s,0]);h.push([t,q+s,0]);t=r/c;q=w/c;g.push([t,q]);g.push([t+p,q]);g.push([t+p,q+p]);g.push([t,q+p]);l.push(4*n+0);l.push(4*n+1);l.push(4*n+2);l.push(4*n+0);l.push(4*n+2);l.push(4*n+3);n++}c=new bongiovi.Mesh(h.length,l.length,bongiovi.GLTool.gl.TRIANGLES);
c.bufferVertex(h);c.bufferTexCoords(g);c.bufferIndices(l);return c};bongiovi.MeshUtils.createSphere=function(d,f){for(var c=[],h=[],g=[],l=0,m=1/f,s=function(c,g){var a=c/f*Math.PI-0.5*Math.PI,b=g/f*Math.PI*2,e=[];e[1]=Math.sin(a)*d;a=Math.cos(a)*d;e[0]=Math.cos(b)*a;e[2]=Math.sin(b)*a;e[0]=Math.floor(1E4*e[0])/1E4;e[1]=Math.floor(1E4*e[1])/1E4;e[2]=Math.floor(1E4*e[2])/1E4;return e},p=0;p<f;p++)for(var n=0;n<f;n++){c.push(s(p,n));c.push(s(p+1,n));c.push(s(p+1,n+1));c.push(s(p,n+1));var r=n/f,w=p/
f;h.push([1-r,w]);h.push([1-r,w+m]);h.push([1-r-m,w+m]);h.push([1-r-m,w]);g.push(4*l+0);g.push(4*l+1);g.push(4*l+2);g.push(4*l+0);g.push(4*l+2);g.push(4*l+3);l++}l=new bongiovi.Mesh(c.length,g.length,bongiovi.GLTool.gl.TRIANGLES);l.bufferVertex(c);l.bufferTexCoords(h);l.bufferIndices(g);return l};bongiovi.MeshUtils.createCube=function(d,f){}})();

},{}]},{},[1]);
