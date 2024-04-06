// import {sleep} from './sleep.js';
import MyPitchShifter from './MyPitchShifter.js';
import MyPitchShifterWorkletNode from './MyPitchShifterWorkletNode.js';

export default class PlayOnline {
  constructor(ctx, inputAudioBuffer, useWorklet, onUpdate){

    this.ctx = ctx;
    this.input = inputAudioBuffer; 
    this.useWorklet = useWorklet;
    this._onUpdate = onUpdate; // callback

    this._gain = -6;
    this._bypass = false;
    this._tempo = 1.0;
    this._pitch = 0.0;

//    this._updateInterval = 1.0;

    this.source = undefined;
    this.gainNode = undefined;
    this.shifter = undefined;
    this.timeA = undefined;
    this.playing = false;
 
    this.init = this.init.bind(this);
    this.playAB = this.playAB.bind(this);
    this.pause = this.pause.bind(this);
    this.resume = this.resume.bind(this);
    this.stop = this.stop.bind(this);
  }

  set updateInterval(value) {this._updateInterval = value;}

  set tempo(value) {
    this._tempo = value;
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
        bypass: this._bypass,
        recording: false,
        nInputFrames: this.input.length,
        updateInterval: this._updateInterval,
        sampleRate: this.input.sampleRate
      }
    };

    this.gainNode = new GainNode(this.ctx);
    // console.log('this.gain dB', this._gain);
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

//      this.shifter.updateInterval = this._updateInterval;
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

    if (timeB < timeA || this.playing) return false;

    this.ctx.resume();
    await this.init();

    if (!this.source) return false;

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

    this.playing = true;
    this.timeA = timeA;

    const now = this.ctx.currentTime;
    // console.log('now', now);
    this.source.start(0, timeA, timeB-timeA);

    const updateForBypass = async () => {
/*
      while (true) {
        let playingAt = timeA + (this.ctx.currentTime - now);
        if (playingAt > timeB || !this.playing) break;
        // console.log('bypassPlayingAt', playingAt);
        this._onUpdate(playingAt);
        await sleep(1000*this._updateInterval);
      };
*/
      let anim = undefined;
        const loop = () => {
        let playingAt = timeA + (this.ctx.currentTime - now);
        if (playingAt > timeB || !this.playing) {
          if (anim) cancelAnimationFrame(anim);
        } else {
          this._onUpdate(playingAt);
          anim = requestAnimationFrame(loop);
        }
      }; // end loop definition
      anim = requestAnimationFrame(loop);
      // console.log ('timeUpdateLoop end');
      this._onUpdate(timeA);
    }; // end updateForBypass

    if (!this._bypass) {
      this.shifter.onUpdate = (val) => {
        this._onUpdate(timeA + val);
      }
    } else updateForBypass();

    return new Promise((resolve) => {
      if (!this._bypass) {
        this.shifter.onEnd = () => {
          this.stop();
          resolve(true);
        };
      } else {
        this.source.onended = () => {
          this.stop();
          resolve(true);
        }
      }
    });

  }

  pause(){this.ctx.suspend();}

  resume(){this.ctx.resume();}

  stop(){
    console.log('PlayOnlline.stop');
    if (this.playing === true) this.playing = false;
    else return;

    if (this.source) {
      this.source.stop();
      this.source.buffer = null;
    }
    if (this.shifter) {
      this.shifter.stop();
      this.shifter = null;
    }
    this._onUpdate(this.timeA);
  }

};
