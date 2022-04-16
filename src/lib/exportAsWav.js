import * as toWav from 'audiobuffer-to-wav';
import {saveAs} from 'file-saver';

export default async function exportAsWav (
          audioBuffer, fileName, pitch, tempo) { 

  let name = fileName.split(/\./)[0] 
   + '_p' + pitch.toFixed(2)
   + '_t' + tempo.toFixed(2)
   + '.wav';
  
  console.log(name);

  const blob = await new Blob([toWav(audioBuffer)], {type: 'audio/vnd.wav'});
  await saveAs(blob, name);

}
