/* by goto at kmgoto.jp (Mar. 2021) */

export default function checkAudioWorklet() {

  let isAudioContext = false;
  let isOfflineAudioContext = false;
  let isAudioWorkletNode = false;
  let isAudioWorklet = false;
  let isOfflineAudioWorklet = false;
  let isAddModule = false;
  let isOfflineAddModule = false;

  if (typeof AudioContext === 'function') isAudioContext = true;
  if (typeof OfflineAudioContext === 'function') isOfflineAudioContext = true;
  if (typeof AudioWorkletNode === 'function') isAudioWorkletNode = true;

  let isAudioWorkletAvailable = false;
  let isOfflineAudioWorkletAvailable = false;

  if (isAudioContext) {
    const context = new AudioContext();
    try {
      if (typeof context.audioWorklet !== 'undefined') {
        isAudioWorklet = true;
        if (typeof context.audioWorklet.addModule === 'function') 
        isAddModule = true;
      }
    } catch(e) {console.log(e);}
    context.close();
  }

  if (isOfflineAudioContext){
    const context = new OfflineAudioContext(1,1,44100);
    try {
      if (typeof context.audioWorklet !== 'undefined'){ 
        isOfflineAudioWorklet = true;
        if (typeof context.audioWorklet.addModule === 'function') 
          isOfflineAddModule = true;
        }
    } catch(e) {console.log(e);}
  }

  if (isAudioContext & isAudioWorkletNode & isAudioWorklet & isAddModule)
     isAudioWorkletAvailable = true;
  if (isOfflineAudioContext 
      & isAudioWorkletNode & isOfflineAudioWorklet & isOfflineAddModule)
  isOfflineAudioWorkletAvailable = true;

  return {
    isAudioWorkletAvailable: isAudioWorkletAvailable,
    isOfflineAudioWorkletAvailable: isOfflineAudioWorkletAvailable
  };

} // end function
