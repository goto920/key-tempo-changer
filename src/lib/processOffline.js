import MyPitchShifter from './MyPitchShifter.js'; // soundtouchJS
import MyPitchShifterNode from './MyPitchShifterWorkletNode.js';

export default async function processOffline (
  inputAudioBuffer, pitch, tempo, useWorklet, bypass){
 
  const input = inputAudioBuffer;

  const loadModule = async () => {
    try {
      await ctx.audioWorklet.addModule('worklet/bundle.js'); // public dir
      return true;
    } catch (err) {console.error(err); 
      return false;
    }
  };

  const ctx = new OfflineAudioContext(
    input.numberOfChannels,
    Math.ceil(input.length/tempo),
    input.sampleRate);

  const updateInterval = 1.0;
  const recording = false;
  const nInputFrames = input.length;
  const sampleRate = input.sampleRate

  const options = {
    processorOptions: {
      bypass: bypass,
      recording: recording,
      nInputFrames: nInputFrames,
      updateInterval: updateInterval,
      sampleRate: sampleRate
    }
  };

  let shifter = undefined;
  if (useWorklet && await loadModule()){
/*
    const module = await import('./MyPitchShifterWorkletNode.js');
    shifter = new module.default(ctx,'my-soundtouch-processor', options); 
*/
    shifter = new MyPitchShifterNode(ctx,'my-soundtouch-processor', options); 
  } else {
    const buflen = 4096;
    shifter = new MyPitchShifter (ctx,nInputFrames, buflen,true,bypass);
    // recording true
  }


  const source = ctx.createBufferSource(); 
  source.buffer = input;
  source.connect(shifter.node);
  shifter.node.connect(ctx.destination);

  if (tempo > 1.0) {
    shifter.tempo = 1.0;
    source.playbackRate.value = tempo;
    shifter.pitch = Math.pow(2.0, pitch/12.0)/tempo;
  } else {
    shifter.tempo = tempo;
    shifter.pitch = Math.pow(2.0, pitch/12.0);
  }

  shifter.updateInterval = updateInterval; 


  source.start();

  ctx.startRendering(); 
  
  return new Promise ((resolve) => {
    ctx.oncomplete = (e) => {
      console.log('offline complete', e.renderedBuffer); 
      console.log('offline complete', shifter.recordedBuffer); 
      if (useWorklet) resolve(e.renderedBuffer); 
      else resolve(shifter.recordedBuffer);
    };
  });

}
