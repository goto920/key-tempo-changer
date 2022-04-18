import React, { useState, useRef, useCallback, useEffect } from  'react';
import './App.css';
import packageJSON from '../package.json';
import messages from './messages.json';
import checkAudioWorklet from './lib/checkAudioWorklet.js';
import loadAndDecodeAudio from './lib/loadAndDecodeAudio.js';
import processOffline from './lib/processOffline.js';
import exportAsWav from './lib/exportAsWav.js';
import PlayButton from './lib/PlayButton.js';
import PlayOnline from './lib/PlayOnline.js';
import {sleep} from './lib/sleep.js';

// material-ui Icons, (Tooltip)
import { IconButton } from '@material-ui/core';
import StopOutlinedIcon from '@material-ui/icons/StopOutlined';
import LoopOutlinedIcon from '@material-ui/icons/LoopOutlined';
import GetAppIcon from '@material-ui/icons/GetApp';
import PlayCircleFilledWhiteIcon 
   from '@material-ui/icons/PlayCircleFilledWhite';
import AddIcon from '@material-ui/icons/Add';
import RemoveIcon from '@material-ui/icons/Remove';
// others
// import {PassiveListener} from 'react-event-injector';

/*
import NotInterestedIcon from '@material-ui/icons/NotInterested';
import MoodIcon from '@material-ui/icons/Mood';
*/
import MicIcon from '@material-ui/icons/Mic';


const AudioContext = window.AudioContext || window.webkitAudioContext;
const OfflineAudioContext 
    = window.OfflineAudioContext || window.webkitOfflineAudioContext;

const defaultLanguage 
    = window.navigator.language.slice(0,2) === 'ja' ? 'ja' :  'en';

function App() {

  const {isAudioWorkletAvailable, isOfflineAudioWorkletAvailable}
        = checkAudioWorklet();
  const [useWorklet,setUseWorklet] = useState(true);
  const ctx = new AudioContext();
  const [inputBuffer, setInputBuffer] = useState();
  const [pitch, setPitch] = useState(0.0);
  const [tempo, setTempo] = useState(1.0);
  const [isRepeat, setIsRepeat] = useState(false);
  const [playingAt, setPlayingAt] = useState(0.0);
  const [timeA, setTimeA] = useState(0.0);
  const [timeB, setTimeB] = useState(0.0);
  const [loop, setLoop] = useState(false);
  const [volume, setVolume] = useState(-6); // in dB
  const [playButtonNextAction, setPlayButtonNextAction] 
           = useState('NotReady'); /* Play, Resume, Pause */ 
  const [language,setLanguage] = useState(defaultLanguage);
  const [m, setM] = useState(
   defaultLanguage === 'ja' ? messages.ja : messages.en);
  const [bypass,setBypass] = useState(true);
  const params = useRef({ 
     inputFileName: undefined,
     inputAudioBuffer: undefined 
  });

  const onlinePlayer = useRef(undefined);
  const timeAB 
     = useRef({timeA: timeA, timeB: timeB, pitch: pitch, tempo: tempo});
  const isLoop = useRef(loop);
  const isBypass = useRef(bypass);

  useEffect( () => {
    timeAB.current 
      = {timeA: timeA, timeB: timeB, pitch: pitch, tempo: tempo};
  },[timeA,timeB,pitch,tempo]);

  const loadFile = async (e) => {
    const file = e.target.files[0];
    params.current.inputFileName = file.name;
    params.current.inputAudioBuffer 
      = await loadAndDecodeAudio(ctx,e.target.files[0]);

    if (params.current.inputAudioBuffer) {
      setTimeB(params.current.inputAudioBuffer.duration);
      setPlayButtonNextAction('Play'); 

      if (onlinePlayer.current) onlinePlayer.current = null;

      const onUpdate = (val) => {
        // console.log('playingAt', val);
        setPlayingAt(val);
        // handleTimeSlider({target: {value: val}});
      }

      onlinePlayer.current 
        = new PlayOnline(ctx, params.current.inputAudioBuffer, 
          useWorklet && isAudioWorkletAvailable, onUpdate); 
    }

  } // loadFile

  const processOfflineAndExport = async (e) => {

    if (!params.current.inputAudioBuffer) {
      // console.log(params.current);
      // console.error('no inputAudioBuffer');
      alert('Select input file first!');
      return;
    } 

    if (playButtonNextAction !== 'Play') {
      return;
    }

    const outputAudioBuffer 
       = await processOffline(params.current.inputAudioBuffer, 
         pitch, tempo, useWorklet && isOfflineAudioWorkletAvailable, bypass);
    console.log('outputAudioBuffer', outputAudioBuffer);
    exportAsWav(outputAudioBuffer, params.current.inputFileName, pitch, tempo);
  };

  const changePitch = (e) => {
    console.log(e.target.name);
    let newPitch = pitch;
    switch (e.target.name) {
      case 'pitchM': newPitch -= 1.0; break;
      case 'pitchP': newPitch += 1.0; break;
      case 'pitchCM': newPitch -= 0.1; break;
      case 'pitchCP': newPitch += 0.1; break;
      default: // do nothing
    }
    setPitch(newPitch);
    if (onlinePlayer.current) onlinePlayer.current.pitch = newPitch;
  };

  const changeTempo = (e) => {

    console.log(e.target.name);
    let newTempo = tempo;
    switch (e.target.name) {
      case 'tempo10M': newTempo -= 0.1; break;
      case 'tempo10P': newTempo += 0.1; break;
      case 'tempo1M': newTempo -= 0.01; break;
      case 'tempo1P': newTempo += 0.01; break;
      default: // do nothing
    }
    setTempo(newTempo);
    if (onlinePlayer.current) onlinePlayer.current.tempo = newTempo;
  };

  const changeVolume = (e) => {
    e.preventDefault();
    const newGain = parseInt(e.target.value);
    setVolume(newGain);
    if (onlinePlayer.current) onlinePlayer.current.gain = newGain;
  };

  // const handlePlay = (e) => {
   const handlePlay = async (e) => {
    //e.preventDefault();

    console.log('nextAction:', playButtonNextAction);
    const player = onlinePlayer.current;

    const t = timeAB.current;

    if (e.target.name === 'startPause'){ // PlayButton
      if (!player) return;

      switch(playButtonNextAction) {
        case 'Play': 
          setPlayButtonNextAction('Pause');
          player.pitch = t.pitch;
          player.tempo = t.tempo;
          player.bypass = isBypass.current;
          player.updateInterval = 1.0; 

          await player.playAB(t.timeA,t.timeB);
          while(isLoop.current){
            await sleep(2000);
            await player.playAB(t.timeA,t.timeB);
          }
          setPlayButtonNextAction('Play');
        break;
        case 'Pause': 
          if (player) player.pause();
          setPlayButtonNextAction('Resume');
        break;
        case 'Resume': 
          if (player) player.resume();
          setPlayButtonNextAction('Pause');
        break;
        default:
          console.error('no correct case', playButtonNextAction);
      }
    }
  
    if (e.target.name === 'stop'){ // StopButton
      if (player) {
        console.log('player stopped');
        player.stop(); setPlayingAt(t.timeA);
        isLoop.current = false;
      }
      setPlayButtonNextAction('Play');
    } 

  }

  const switchLanguage = (e) => {
    e.preventDefault();
    if (language === 'ja') {
      setLanguage('en'); setM(messages.en);
    } else { 
      setLanguage('ja'); setM(messages.ja);
    }
  };

  const handleTimeSlider = (e) => {
    // console.log('time onChange');
    // const currentTime = parseFloat(e.target.value);
    setPlayingAt(parseFloat(e.target.value));
  }

  return (
    <div className="App">

    <h3>Key Tempo Changer by KG &emsp;
{/*
     <button onClick={switchLanguage}>
     {language === 'ja' ? 'Lang. toEN' : 'Lang. toJP'} </button>
*/}
    </h3>
    <div className='text-divider'>Select File</div>
      <div>
       <input type="file" accept="audio/*,video/*" 
       onChange={loadFile}/>
      </div>
    <div className='text-divider'>Playing (
       {('00000' + playingAt.toFixed(1)).slice(-5)}
    )
    </div>
      <div>
       A: {('00000' + timeA.toFixed(2)).slice(-6)}&emsp;
       B: {('00000' + timeB.toFixed(2)).slice(-6)}&emsp;
       length:&nbsp; 
        {params.current.inputAudioBuffer ? 
        ('00000' 
           + params.current.inputAudioBuffer.duration.toFixed(2)).slice(-6) 
         : 'undefined' }
      </div>
    <div>
    <input type="range" value={playingAt} min={0.0} step={0.01}
       max={params.current.inputAudioBuffer ? 
             params.current.inputAudioBuffer.duration : 0.0} 
             onChange={handleTimeSlider}
       style={{width: '90%'}}/>
    </div>
    <div>
    <center>
    <button id="setTimeA" onClick={()=>setTimeA(playingAt)}>
       setA</button>&emsp;&emsp;
    <button id="setTimeB" onClick={()=>setTimeB(playingAt)}>
       setB</button>
    &emsp; &emsp; &emsp; &emsp;
    <button id="resetAB" onClick={()=>{
             setTimeA(0); 
             setTimeB(params.current.inputAudioBuffer.duration);
        }
      }>resetAB</button>
    </center>
    </div>
    <div className='text-divider'>Player Controls&nbsp;|&nbsp;
   {/* Export */}
    Export:<IconButton onClick = {processOfflineAndExport}>
      <GetAppIcon 
       color={playButtonNextAction === 'NotReady' ? 'disabled': 'primary'} 
       fontSize='large' />
    </IconButton>
    </div>
    <div>
    <center>
   {/* Play/Pause/Resume */}
   {/* handlePlay is callback function */}
    PlayAB:
    <PlayButton
       nextAction={playButtonNextAction}
       handler={handlePlay}
       messages={m}
    />&nbsp;
   {/* Stop button */}
     Stop:
     <IconButton onClick={() => handlePlay({target: {name: 'stop'}})} >
       <StopOutlinedIcon fontSize='large' 
       color={playButtonNextAction === 'NotReady' ? 'disabled': 'primary'} />
     </IconButton>
     &nbsp;
   {/* Loop/repeat */ }
     Loop on/off:
     <IconButton onClick={() => 
        {isLoop.current=!loop; setLoop(!loop);}}>
       <LoopOutlinedIcon fontSize='large'
         color={playButtonNextAction === 'NotReady' ?
            'disabled' : (loop ? 'secondary' : 'primary')}/>
     </IconButton>
    </center>
    </div>
    <div className='text-divider'>Volume ({volume}dB)</div>
    <center>
    <input type="range" value={volume} onChange={changeVolume} 
       min={-36} max={12} step={1} style={{width: '90%'}}/>
    </center>
    <div className='text-divider'>Key/Tempo Controls:&emsp;
      <button onClick={(e) => {
        isBypass.current = !isBypass.current;
        setBypass(!bypass);
     }}>
      {bypass ? 'Enable' : 'Disable'}</button>
    </div>

    {!bypass &&
      <div>
      <div className='text-divider'>Pitch (Key {pitch.toFixed(2)})</div>
      <center>
       b/#&emsp;
       <IconButton
          onClick={() => changePitch({target: {name: 'pitchM'}})}>
       <RemoveIcon/></IconButton>
       <IconButton
          onClick={() => changePitch({target: {name: 'pitchP'}})}>
       <AddIcon/></IconButton>
       10cents&emsp;
       <IconButton
          onClick={() => changePitch({target: {name: 'pitchCM'}})}>
        <RemoveIcon color='primary'/></IconButton>
       <IconButton
          onClick={() => changePitch({target: {name: 'pitchCP'}})}>
       <AddIcon/></IconButton>
      </center>
      </div>
    }
    {!bypass &&
      <div>
      <div className='text-divider'> Tempo ({parseInt(tempo*100)}%)</div>
      <center>
       &plusmn; 10% 
       <IconButton 
          onClick={() => changeTempo({target: {name: 'tempo10M'}})}>
        <RemoveIcon/></IconButton>
       <IconButton 
          onClick={() => changeTempo({target: {name: 'tempo10P'}})}>
        <AddIcon/></IconButton>
       &plusmn; 1% 
       <IconButton
          onClick={() => changeTempo({target: {name: 'tempo1M'}})}>
        <RemoveIcon/></IconButton>
       <IconButton
          onClick={() => changeTempo({target: {name: 'tempo1P'}})}>
        <AddIcon/></IconButton>
      </center>
      </div>
    }
    <hr/>
    <div>
    Version: {packageJSON.version}<br/>
    <a href="https://goto920.github.io/demos/key-tempo-changer/" 
     target="_blank" rel="noreferrer">Manual/Update</a>
     &nbsp;on goto920.github.io<br/>
    Based on cutterbl/SoundTouchJS<br/>
    </div>
    <div>
      <div className='text-divider'>For developer</div>
      AudioWorklet:&emsp;
     <button onClick={() => setUseWorklet(!useWorklet)}>
     {useWorklet ? 'Disable' : 'Enable'}
     </button>&emsp;
      Avail? {isAudioWorkletAvailable ? 'Y' : 'N'}&nbsp;
       (Offline: {isOfflineAudioWorkletAvailable ? 'Y' : 'N'})
    </div>
  </div>
  );
}

export default App;
