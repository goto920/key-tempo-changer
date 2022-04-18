import { Component } from 'react';

// material-ui Icons, (Tooltip)
import { IconButton } from '@material-ui/core';
import PlayCircleOutlineIcon from '@material-ui/icons/PlayCircleOutline';
import PauseCircleOutlineOutlinedIcon
        from '@material-ui/icons/PauseCircleOutlineOutlined';

export default class PlayButton extends Component {

/*
  constructor(props){
    super(props);
//    this.wrapper = createRef();
  }
*/

// No setState() in shouldComponentUpdate
  shouldComponentUpdate(nextProps, nextState){
    if (nextProps.nextAction !== this.props.nextAction
     || nextProps.messages !== this.props.messages)
    return true;

    return false;
  }

  render(){ // no state change

    const {nextAction,messages,handler} = this.props;

    let icon = null;
    switch(nextAction){
         case 'NotReady':
           icon = 
             <span><IconButton
             onClick={() => handler({target: {name: 'startPause'}})} >
             <PlayCircleOutlineIcon color='disabled' 
              fontSize='large'/>
             </IconButton></span>
         break;
         case 'Play': 
           icon = <IconButton  
             onClick={() => handler({target: {name: 'startPause'}})} >
             <PlayCircleOutlineIcon color='primary'
              fontSize='large'/>
             </IconButton>
         break;
         case 'Resume':
           icon = <IconButton  
             onClick={() => handler({target: {name: 'startPause'}})} >
             <PlayCircleOutlineIcon style={{color: '#00aa00' }}
              fontSize='large'/>
             </IconButton>;
         break;
         case 'Pause': 
           icon = <IconButton  
             onClick={() => handler({target: {name: 'startPause'}})} >
             <PauseCircleOutlineOutlinedIcon color='primary'
              fontSize='large'/>
             </IconButton>;
         break;
         default:
           icon = 'undefined';
       }

       return(<span>{icon}</span>);

     } // end render

};
