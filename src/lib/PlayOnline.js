import {sleep} from './sleep.js';
import MyPitchShifter from './MyPitchShifter.js';
import MyPitchShifterWorkletNode from './MyPitchShifterWorkletNode.js';

export default class PlayOnline {
  constructor(ctx, inputAudioBuffer, useWorklet, setPlayingAt){

    this.ctx = ctx;
    this.input = inputAudioBuffer; 
    this.useWorklet = useWorklet;
    this._setPlayingAt = setPlayingAt; // callback

    this._gain = -6;
    this._bypass = false;
    this._tempo = 1.0;
    this._pitch = 0.0;

    this._updateInterval = 1;

    this.source = undefined;
    this.gainNode = undefined;
    this.shifter = undefined;
 
    this.init = this.init.bind(this);
    this.playAB = this.playAB.bind(this);
    this.pause = this.pause.bind(this);
    this.resume = this.resume.bind(this);
    this.stop = this.stop.bind(this);
  }

  set tempo(value){
    this._tempo = value;
    // if (this.shifter) this.shifter.tempo = value;
    if (this.shifter) {
      if (this._tempo <= 1.0) {
        this.source.playbackRate.value = 1.0;
        this.shifter.tempo = value;
        this.shifter.pitch = Math.pow(2,this._pitch/12);
      } else {
        this.source.playbackRate.value = this._tempo;
        this.shifter.tempo = 1.0;
        this.shifter.pitch = Math.pow(2,this._pitch/12)/this._tempo;
      }
    }
  }

  set pitch(value){
    this._pitch = value;
    if (this.shifter) {
      if (this._tempo <= 1.0) {
        this.source.playbackRate.value = 1.0;
        this.shifter.tempo = this._tempo;
        this.shifter.pitch = Math.pow(2,this._pitch/12);
      } else {
        this.source.playbackRate.value = this._tempo;
        this.shifter.tempo = 1.0;
        this.shifter.pitch = Math.pow(2,this._pitch/12)/this._tempo;
      }
    }
  }

  set gain(value){
    this._gain = value;
    if (this.gainNode) 
      this.gainNode.gain.value = Math.pow(10,this._gain/20);
  }

  set bypass(value){ this._bypass = value; }

  async init(){
    const recording = false;
    const nInputFrames = this.input.length;

    const options = {
      processorOptions: {
        bypass: this.bypass,
        recording: false,
        nInputFrames: this.input.length,
        updateInterval: this._updateInterval,
        sampleRate: this.input.sampleRate
      }
    };

    this.gainNode = new GainNode(this.ctx);
    console.log('this.gain dB', this._gain);
    this.gainNode.gain.value = Math.pow(10,this._gain/20);

    if (!this._bypass) {

      if (this.useWorklet && await this.loadModule()){
        this.shifter = new MyPitchShifterWorkletNode(this.ctx,
          'my-soundtouch-processor', options); 
        console.log('using AudioWorklet');
      } else {
        this.shifter 
          = new MyPitchShifter (this.ctx,nInputFrames, 512, 
              recording, this._bypass); // bufferlength 512 or 2^power
        console.log('using ScriptProcessorNode');
      }

      this.shifter.tempo = this._tempo; // initial
      this.shifter.pitch = Math.pow(2.0, this._pitch/12);
      this.shifter.updateInterval = this._updateInterval;
    }

  
    return new Promise((resolve) => {
      // console.log('this.input', this.input);
      this.source = this.ctx.createBufferSource(); 
      this.source.buffer = this.input;

      if (!this._bypass){
        this.source.connect(this.gainNode);
        this.gainNode.connect(this.shifter.node);
        this.shifter.node.connect(this.ctx.destination);
        console.log('using shifter');
      } else {
        this.source.connect(this.gainNode);
        this.gainNode.connect(this.ctx.destination);
        console.log('bypass shifter');
      }
      resolve(true);
    });

  }

  async loadModule () {
    try {
      await this.ctx.audioWorklet.addModule('worklet/bundle.js'); // public dir
      return true;
    } catch (err) {console.error(err); 
      return false;
    }
  }

  async playAB(timeA, timeB){
    console.log('playAB', timeA, timeB); 

    this.ctx.resume();
    await this.init();

    if (!this.source || timeB < timeA) return false;

    this.source.start(0, timeA, timeB-timeA);

    // this.shifter.updateInterval = 10.0;
    this.shifter.onUpdate = (val) => {
      // requestAnimationFrame(() => console.log('time', timeA + val));
      requestAnimationFrame(() => this._setPlayingAt(timeA + val));
    };

    return new Promise((resolve) => {
      this.source.onended = () => {
        this.stop();
        resolve(true);
      }
    });

  }

  pause(){this.ctx.suspend();}

  resume(){this.ctx.resume();}

  async stop(){
    if (this.source) {
      this.source.stop();
      this.source.buffer = null;
    }
    if (this.shifter) {
      this.shifter.stop();
      this.shifter = null;
    }
  }

};
