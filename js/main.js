/* 
 *  DSP.js - a comprehensive digital signal processing  library for javascript
 * 
 *  Created by Corban Brook <corbanbrook@gmail.com> on 2010-01-01.
 *  Copyright 2010 Corban Brook. All rights reserved.
 *
 */

////////////////////////////////////////////////////////////////////////////////
//                                  CONSTANTS                                 //
////////////////////////////////////////////////////////////////////////////////

/**
 * DSP is an object which contains general purpose utility functions and constants
 */
var DSP = {
	// Channels
	LEFT: 0,
	RIGHT: 1,
	MIX: 2,

	// Waveforms
	SINE: 1,
	TRIANGLE: 2,
	SAW: 3,
	SQUARE: 4,

	// Filters
	LOWPASS: 0,
	HIGHPASS: 1,
	BANDPASS: 2,
	NOTCH: 3,

	// Window functions
	BARTLETT: 1,
	BARTLETTHANN: 2,
	BLACKMAN: 3,
	COSINE: 4,
	GAUSS: 5,
	HAMMING: 6,
	HANN: 7,
	LANCZOS: 8,
	RECTANGULAR: 9,
	TRIANGULAR: 10,

	// Loop modes
	OFF: 0,
	FW: 1,
	BW: 2,
	FWBW: 3,

	// Math
	TWO_PI: 2 * Math.PI
};

// Setup arrays for platforms which do not support byte arrays
function setupTypedArray(name, fallback) {
	// check if TypedArray exists
	// typeof on Minefield and Chrome return function, typeof on Webkit returns object.
	if (typeof this[name] !== "function" && typeof this[name] !== "object") {
		// nope.. check if WebGLArray exists
		if (typeof this[fallback] === "function" && typeof this[fallback] !== "object") {
			this[name] = this[fallback];
		} else {
			// nope.. set as Native JS array
			this[name] = function(obj) {
				if (obj instanceof Array) {
					return obj;
				} else if (typeof obj === "number") {
					return new Array(obj);
				}
			};
		}
	}
}

setupTypedArray("Float64Array", "WebGLFloatArray");
setupTypedArray("Int32Array", "WebGLIntArray");
setupTypedArray("Uint16Array", "WebGLUnsignedShortArray");
setupTypedArray("Uint8Array", "WebGLUnsignedByteArray");


////////////////////////////////////////////////////////////////////////////////
//                            DSP UTILITY FUNCTIONS                           //
////////////////////////////////////////////////////////////////////////////////

/**
 * Inverts the phase of a signal
 *
 * @param {Array} buffer A sample buffer
 *
 * @returns The inverted sample buffer
 */
DSP.invert = function(buffer) {
	for (var i = 0, len = buffer.length; i < len; i++) {
		buffer[i] *= -1;
	}

	return buffer;
};

/**
 * Converts split-stereo (dual mono) sample buffers into a stereo interleaved sample buffer
 *
 * @param {Array} left  A sample buffer
 * @param {Array} right A sample buffer
 *
 * @returns The stereo interleaved buffer
 */
DSP.interleave = function(left, right) {
	if (left.length !== right.length) {
		throw "Can not interleave. Channel lengths differ.";
	}

	var stereoInterleaved = new Float64Array(left.length * 2);

	for (var i = 0, len = left.length; i < len; i++) {
		stereoInterleaved[2 * i] = left[i];
		stereoInterleaved[2 * i + 1] = right[i];
	}

	return stereoInterleaved;
};

/**
 * Converts a stereo-interleaved sample buffer into split-stereo (dual mono) sample buffers
 *
 * @param {Array} buffer A stereo-interleaved sample buffer
 *
 * @returns an Array containing left and right channels
 */
DSP.deinterleave = (function() {
	var left, right, mix, deinterleaveChannel = [];

	deinterleaveChannel[DSP.MIX] = function(buffer) {
		for (var i = 0, len = buffer.length / 2; i < len; i++) {
			mix[i] = (buffer[2 * i] + buffer[2 * i + 1]) / 2;
		}
		return mix;
	};

	deinterleaveChannel[DSP.LEFT] = function(buffer) {
		for (var i = 0, len = buffer.length / 2; i < len; i++) {
			left[i] = buffer[2 * i];
		}
		return left;
	};

	deinterleaveChannel[DSP.RIGHT] = function(buffer) {
		for (var i = 0, len = buffer.length / 2; i < len; i++) {
			right[i] = buffer[2 * i + 1];
		}
		return right;
	};

	return function(channel, buffer) {
		left = left || new Float64Array(buffer.length / 2);
		right = right || new Float64Array(buffer.length / 2);
		mix = mix || new Float64Array(buffer.length / 2);

		if (buffer.length / 2 !== left.length) {
			left = new Float64Array(buffer.length / 2);
			right = new Float64Array(buffer.length / 2);
			mix = new Float64Array(buffer.length / 2);
		}

		return deinterleaveChannel[channel](buffer);
	};
}());

/**
 * Separates a channel from a stereo-interleaved sample buffer
 *
 * @param {Array}  buffer A stereo-interleaved sample buffer
 * @param {Number} channel A channel constant (LEFT, RIGHT, MIX)
 *
 * @returns an Array containing a signal mono sample buffer
 */
DSP.getChannel = DSP.deinterleave;

/**
 * Helper method (for Reverb) to mix two (interleaved) samplebuffers. It's possible
 * to negate the second buffer while mixing and to perform a volume correction
 * on the final signal.
 *
 * @param {Array} sampleBuffer1 Array containing Float values or a Float64Array
 * @param {Array} sampleBuffer2 Array containing Float values or a Float64Array
 * @param {Boolean} negate When true inverts/flips the audio signal
 * @param {Number} volumeCorrection When you add multiple sample buffers, use this to tame your signal ;)
 *
 * @returns A new Float64Array interleaved buffer.
 */
DSP.mixSampleBuffers = function(sampleBuffer1, sampleBuffer2, negate, volumeCorrection) {
	var outputSamples = new Float64Array(sampleBuffer1);

	for (var i = 0; i < sampleBuffer1.length; i++) {
		outputSamples[i] += (negate ? -sampleBuffer2[i] : sampleBuffer2[i]) / volumeCorrection;
	}

	return outputSamples;
};

// Find RMS of signal
DSP.RMS = function(buffer) {
	var total = 0;

	for (var i = 0, n = buffer.length; i < n; i++) {
		total += buffer[i] * buffer[i];
	}

	return Math.sqrt(total / n);
};

// Find Peak of signal
DSP.Peak = function(buffer) {
	var peak = 0;

	for (var i = 0, n = buffer.length; i < n; i++) {
		peak = (Math.abs(buffer[i]) > peak) ? Math.abs(buffer[i]) : peak;
	}

	return peak;
};

// Fourier Transform Module used by DFT, FFT, RFFT
function FourierTransform(bufferSize, sampleRate) {
	this.bufferSize = bufferSize;
	this.sampleRate = sampleRate;
	this.bandwidth = 2 / bufferSize * sampleRate / 2;

	this.spectrum = new Float64Array(bufferSize / 2);
	this.real = new Float64Array(bufferSize);
	this.imag = new Float64Array(bufferSize);

	this.peakBand = 0;
	this.peak = 0;

	/**
	 * Calculates the *middle* frequency of an FFT band.
	 *
	 * @param {Number} index The index of the FFT band.
	 *
	 * @returns The middle frequency in Hz.
	 */
	this.getBandFrequency = function(index) {
		return this.bandwidth * index + this.bandwidth / 2;
	};

	this.calculateSpectrum = function() {
		var spectrum = this.spectrum,
			real = this.real,
			imag = this.imag,
			bSi = 2 / this.bufferSize,
			sqrt = Math.sqrt,
			rval,
			ival,
			mag;

		for (var i = 0, N = bufferSize / 2; i < N; i++) {
			rval = real[i];
			ival = imag[i];
			mag = bSi * sqrt(rval * rval + ival * ival);

			if (mag > this.peak) {
				this.peakBand = i;
				this.peak = mag;
			}

			spectrum[i] = mag;
		}
	};
}


/**
 * FFT is a class for calculating the Discrete Fourier Transform of a signal
 * with the Fast Fourier Transform algorithm.
 *
 * @param {Number} bufferSize The size of the sample buffer to be computed. Must be power of 2
 * @param {Number} sampleRate The sampleRate of the buffer (eg. 44100)
 *
 * @constructor
 */
function FFT(bufferSize, sampleRate) {
	FourierTransform.call(this, bufferSize, sampleRate);

	this.reverseTable = new Uint32Array(bufferSize);

	var limit = 1;
	var bit = bufferSize >> 1;

	var i;

	while (limit < bufferSize) {
		for (i = 0; i < limit; i++) {
			this.reverseTable[i + limit] = this.reverseTable[i] + bit;
		}

		limit = limit << 1;
		bit = bit >> 1;
	}

	this.sinTable = new Float64Array(bufferSize);
	this.cosTable = new Float64Array(bufferSize);

	for (i = 0; i < bufferSize; i++) {
		this.sinTable[i] = Math.sin(-Math.PI / i);
		this.cosTable[i] = Math.cos(-Math.PI / i);
	}
}

/**
 * Performs a forward transform on the sample buffer.
 * Converts a time domain signal to frequency domain spectra.
 *
 * @param {Array} buffer The sample buffer. Buffer Length must be power of 2
 *
 * @returns The frequency spectrum array
 */
FFT.prototype.forward = function(buffer) {
	// Locally scope variables for speed up
	var bufferSize = this.bufferSize,
		cosTable = this.cosTable,
		sinTable = this.sinTable,
		reverseTable = this.reverseTable,
		real = this.real,
		imag = this.imag,
		spectrum = this.spectrum;

	var k = Math.floor(Math.log(bufferSize) / Math.LN2);

	if (Math.pow(2, k) !== bufferSize) {
		throw "Invalid buffer size, must be a power of 2.";
	}
	if (bufferSize !== buffer.length) {
		throw "Supplied buffer is not the same size as defined FFT. FFT Size: " + bufferSize + " Buffer Size: " + buffer.length;
	}

	var halfSize = 1,
		phaseShiftStepReal,
		phaseShiftStepImag,
		currentPhaseShiftReal,
		currentPhaseShiftImag,
		off,
		tr,
		ti,
		tmpReal,
		i;

	for (i = 0; i < bufferSize; i++) {
		real[i] = buffer[reverseTable[i]];
		imag[i] = 0;
	}

	while (halfSize < bufferSize) {
		//phaseShiftStepReal = Math.cos(-Math.PI/halfSize);
		//phaseShiftStepImag = Math.sin(-Math.PI/halfSize);
		phaseShiftStepReal = cosTable[halfSize];
		phaseShiftStepImag = sinTable[halfSize];

		currentPhaseShiftReal = 1;
		currentPhaseShiftImag = 0;

		for (var fftStep = 0; fftStep < halfSize; fftStep++) {
			i = fftStep;

			while (i < bufferSize) {
				off = i + halfSize;
				tr = (currentPhaseShiftReal * real[off]) - (currentPhaseShiftImag * imag[off]);
				ti = (currentPhaseShiftReal * imag[off]) + (currentPhaseShiftImag * real[off]);

				real[off] = real[i] - tr;
				imag[off] = imag[i] - ti;
				real[i] += tr;
				imag[i] += ti;

				i += halfSize << 1;
			}

			tmpReal = currentPhaseShiftReal;
			currentPhaseShiftReal = (tmpReal * phaseShiftStepReal) - (currentPhaseShiftImag * phaseShiftStepImag);
			currentPhaseShiftImag = (tmpReal * phaseShiftStepImag) + (currentPhaseShiftImag * phaseShiftStepReal);
		}

		halfSize = halfSize << 1;
	}

	return this.calculateSpectrum();
};

FFT.prototype.inverse = function(real, imag) {
	// Locally scope variables for speed up
	var bufferSize = this.bufferSize,
		cosTable = this.cosTable,
		sinTable = this.sinTable,
		reverseTable = this.reverseTable,
		spectrum = this.spectrum;

	real = real || this.real;
	imag = imag || this.imag;

	var halfSize = 1,
		phaseShiftStepReal,
		phaseShiftStepImag,
		currentPhaseShiftReal,
		currentPhaseShiftImag,
		off,
		tr,
		ti,
		tmpReal,
		i;

	for (i = 0; i < bufferSize; i++) {
		imag[i] *= -1;
	}

	var revReal = new Float64Array(bufferSize);
	var revImag = new Float64Array(bufferSize);

	for (i = 0; i < real.length; i++) {
		revReal[i] = real[reverseTable[i]];
		revImag[i] = imag[reverseTable[i]];
	}

	real = revReal;
	imag = revImag;

	while (halfSize < bufferSize) {
		phaseShiftStepReal = cosTable[halfSize];
		phaseShiftStepImag = sinTable[halfSize];
		currentPhaseShiftReal = 1;
		currentPhaseShiftImag = 0;

		for (var fftStep = 0; fftStep < halfSize; fftStep++) {
			i = fftStep;

			while (i < bufferSize) {
				off = i + halfSize;
				tr = (currentPhaseShiftReal * real[off]) - (currentPhaseShiftImag * imag[off]);
				ti = (currentPhaseShiftReal * imag[off]) + (currentPhaseShiftImag * real[off]);

				real[off] = real[i] - tr;
				imag[off] = imag[i] - ti;
				real[i] += tr;
				imag[i] += ti;

				i += halfSize << 1;
			}

			tmpReal = currentPhaseShiftReal;
			currentPhaseShiftReal = (tmpReal * phaseShiftStepReal) - (currentPhaseShiftImag * phaseShiftStepImag);
			currentPhaseShiftImag = (tmpReal * phaseShiftStepImag) + (currentPhaseShiftImag * phaseShiftStepReal);
		}

		halfSize = halfSize << 1;
	}

	var buffer = new Float64Array(bufferSize); // this should be reused instead
	for (i = 0; i < bufferSize; i++) {
		buffer[i] = real[i] / bufferSize;
	}

	return buffer;
};



dBA = [];
navigator.mediaDevices.getUserMedia({
		audio: true
	})
	.then(function(mediaStream) {
		var audioContext = new(window.AudioContext || window.webkitAudioContext)({
			sampleRate: 40960
		});

		// Create a source from our MediaStream
		var source = audioContext.createMediaStreamSource(mediaStream);
		// Now create a Javascript processing node with the following parameters:
		// 4096 = bufferSize (See notes below)
		// 2 = numberOfInputChannels (i.e. Stereo input)
		// 2 = numberOfOutputChannels (i.e. Stereo output)
		var node = audioContext.createScriptProcessor(4096, 1, 1);
		var fft = new FFT(4096, 40960);
		var cnt = 0;
		var firstTime = Date.now();
		node.onaudioprocess = function(data) {
			var array = new Float32Array(analyser.frequencyBinCount);
			// console.log(analyser.frequencyBinCount);
			analyser.getFloatFrequencyData(array);
			var values = 0;
			var fvalues = 0;
			var length = array.length;
			var farray = data.inputBuffer.getChannelData(0);


			fft.forward(farray);
			var spectrum = fft.spectrum;

			for (var i = 10; i < spectrum.length; i++) {
				// values += Math.pow(10, array[i] / 10 / 255);
				// values += Math.pow((array[i]-128) / 127, 2);
				// values += array[i]/255;
				values += spectrum[i] * spectrum[i];
				// if(i === spectrum.length-1) console.log(555555);
			}
			dBA.push(10 * Math.log10(values * 2500000000.0));
			// console.log(dBA);
			if(dBA.length == 100){
				node.disconnect(audioContext.destination);
				console.log("finish");
				console.log(dBA);
				document.getElementById("myDiv").innerText = "finish";
				document.getElementById("t2").innerText = Math.floor((Date.now()-firstTime)/1000);
				document.getElementById("data").innerText = dBA;
			}
			// values /= spectrum.length;
			// var average = Math.sqrt(values / length);
			// values = Math.pow(values, 2);
			// values = 20 * Math.log10(values) +94;
			// console.log('FFT  ' + String(10 * Math.log10(values * 2500000000.0)));

			// for (var i = 0; i < 4096; i++) {
			// 	var value = Math.sqrt(fft.real[i] * fft.real[i] + fft.imag[i] * fft.imag[i]);
			// 	values += Math.pow(value/2048, 2);
			// }
			// values /= (2048 * 16);
			// console.log('FFT  ' + String(10 * Math.log10(values * 2500000000.0)));
			// console.log(fft.imag);
			// console.log(fft.real);
			// console.log(values);
			// console.log(spectrum);
			// console.log(array);
			// console.log(farray);

			// console.log(4096 >> 1);



			// for (var i = 0; i < farray.length; i++) {
			// 	fvalues += (farray[i]) * (farray[i]);
			// }
			// var faverage = Math.sqrt(fvalues / farray.length);
			// console.log(20 * Math.log10(faverage * 50000.0));
			// console.log(farray);

			// console.log(10 * Math.log10(values* 10)- 10 * Math.log10(faverage * 2500000000.0));
			// console.log(faverage);
			// console.log(data.inputBuffer.sampleRate);
			// node.disconnect(audioContext.destination);
			// var interval = setInterval(function() {
			
			// 	Plotly.extendTraces('myDiv', {
			// 		y: [
			// 			[10 * Math.log10(values * 2500000000.0)],
			// 			[20 * Math.log10(faverage * 50000.0)]
			// 		]
			// 	}, [0, 1])
			
			// 	if (++cnt == 1024) clearInterval(interval);
			// }, 1);
		}
		/////
		// console.log(data.inputBuffer.getChannelData(0).buffer);
		// Connect the microphone to the script processor
		// source.connect(node);

		var analyser = audioContext.createAnalyser();
		source.connect(analyser);
		analyser.connect(node);
		node.connect(audioContext.destination);
		// var buffer = new Uint8Array(an.fftSize);
		analyser.fftSize = 4096;
		analyser.smoothingTimeConstant = 0;
		// analyser.maxDecibels = 120;
		// analyser.minDecibels = 0;

		// function f() {
		// 	/* note that getFloatTimeDomainData will be available in the near future,
		// 	 * if needed. */
		// 	an.getByteTimeDomainData(buffer);
		// 	/* RMS stands for Root Mean Square, basically the root square of the
		// 	 * average of the square of each value. */
		// 	var rms = 0;
		// 	for (var i = 0; i < buffer.length; i++) {
		// 		rms += buffer[i] * buffer[i];
		// 	}
		// 	rms /= buffer.length;
		// 	rms = Math.sqrt(rms);
		// 	console.log(rms);
		// 	/* rms now has the value we want. */
		// 	requestAnimationFrame(f);
		// }

		// requestAnimationFrame(f);

		// node.onaudioprocess = function(data) {
		//     var leftChannel = data.inputBuffer.getChannelData(0).buffer;
		//     var rightChannel = data.inputBuffer.getChannelData(1).buffer;
		// }

		// var reverseTable = new Uint32Array(4096);

		// var limit = 1;
		// var bit = 4096 >> 1;

		// var i;

		// while (limit < 4096) {
		// 	for (i = 0; i < limit; i++) {
		// 		reverseTable[i + limit] = reverseTable[i] + bit;
		// 	}

		// 	limit = limit << 1;
		// 	bit = bit >> 1;
		// }
		// console.log(reverseTable);

	});
// Plotly.newPlot('myDiv', [{
// 	y: [0],
// 	mode: 'lines',
// 	name: 'mobile phone',
// 	line: {
// 		color: '#80CAF6',
// 		width: 1
// 	}
// }, {
// 	y: [0],
// 	mode: 'lines',
// 	name: 'SLM',
// 	line: {
// 		color: '#DF56F1',
// 		width: 1
// 	}
// }], {
// 	template: {
// 		layout: {
// 			title: 'Sound Level (Calibration)',
// 			showlegend: true,
// 			plot_bgcolor: "#343a40",
// 			paper_bgcolor: "#FFF3",
// 			font: {
// 				family: 'Verdana, Geneva, Tahoma, sans-serif',
// 				size: 18,
// 				color: '#FFFFFF'
// 			},
// 			xaxis: {
// 				title: {
// 					text: 'Time(second)',
// 					font: {
// 						family: 'Verdana, Geneva, Tahoma, sans-serif',
// 						size: 18,
// 						color: '#FFFFFF'
// 					},
// 				}
// 			},
// 			yaxis: {
// 				title: {
// 					text: 'dBA',
// 					font: {
// 						family: 'Verdana, Geneva, Tahoma, sans-serif',
// 						size: 18,
// 						color: '#FFFFFF'
// 					}
// 				}
// 			},
// 			legend: {
// 				x: 1,
// 				xanchor: 'right',
// 				y: 0,
// 				font: {
// 					family: 'sans-serif',
// 					size: 12,
// 					color: '#000'
// 				},
// 				bgcolor: '#E2E2E2',
// 				bordercolor: '#FFFFFF',
// 				borderwidth: 2
// 			}
// 		}

// 	}
// });
