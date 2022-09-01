//Simon game clone.
//NOTE: I'm abusing Promises/async/await to mimic a linear style of execution
//like you would find while programming a microcontroller.

var BTN_GREEN = 0;
var BTN_RED = 1;
var BTN_YELLOW = 2;
var BTN_BLUE = 3;
var GAME_OVER_TONE = 4;
var START_TONE_DELAY = 600;

var currentLevel = 0; //Max number of tones in current sequence.
var currentUserInput = 0; //Current tone level of user input. 
var playingSequence = false; //Computer is currently playing a sequence for the user.
var waitingUserInput = false; //It is currently the users turn.
var toneDelay = START_TONE_DELAY;

var randomSeed = 4;
var randomShifter = randomSeed; //State storage for xor shifter random number generator.

var htmlBtnGreen = document.getElementById("btn_green");
var htmlBtnRed = document.getElementById("btn_red");
var htmlBtnYellow = document.getElementById("btn_yellow");
var htmlBtnBlue = document.getElementById("btn_blue");
var htmlBtnStart = document.getElementById("btn_start");

var buttonMap = [htmlBtnGreen, htmlBtnRed, htmlBtnYellow, htmlBtnBlue];


//Audio is created using the WebAudio API
var audioContext = new window.AudioContext({sampleRate:16000});

//WebAudio expects we keep track of sound nodes.
var currentTone = null;
//Frequencies to play for each button and also a game over frequency.
//From Wikipedia - G-note (blue, lower right). C-note (yellow, lower left). E-note (red, upper right). G-note (green, upper left, an octave higher than blue)
var toneList = [392, 329, 262, 196, 800];

//Play a triangle wave sound at 'value' frequency.
function playTone(value){
  //If there isn't already a tone playing. If there is then we don't have to do
  //anything
  if(currentTone == null){
    //current Web Audio API time
    var now = audioContext.currentTime; 
    //oscillatorNode-->gainNode-->destination
    var gainNode = audioContext.createGain();
    var oscillatorNode = audioContext.createOscillator();
    //I though a triangle wave sounded the best.
    oscillatorNode.type = 'triangle';
    //note: As of writing this, firefox doesn't set with .value as it seems it should. Using setValueAtTime works.
    oscillatorNode.frequency.setValueAtTime(toneList[value], now);
    
    oscillatorNode.connect(gainNode);
    //Lower the volume.
    gainNode.gain.setValueAtTime(0.3, now);
    
    gainNode.connect(audioContext.destination);

    oscillatorNode.start(now);
    //Save the oscilatorNode so that we can stop the sound later.
    currentTone = oscillatorNode;
  }
}

//Stop any playing sound.
function stopTone(){
  if(currentTone != null){
    currentTone.stop(audioContext.currentTime);
    currentTone = null;
  }
}

//Delay execution for the given amount of 'time' in milliseconds.
//Returns a promise and we await for execution completion to delay.
function delay(time){
  var delayPromise = new Promise(
    function(resolve) {
      setTimeout(function() {resolve();}, time);
    }
  );
  return delayPromise;
}

//Reset game state variables for a new game.
function newGame(){
  currentLevel = 0;
  currentUserInput = 0;
  toneDelay = START_TONE_DELAY;
  waitingUserInput = false;
  //Randomize the seed.
  newSeedRandomButton();
  resetRandomButton();
  playSequence();
}

//Make the given 'button' play a tone for the given 'time'.
async function playButton(button, time){
  //Light up the button.
  buttonMap[button].classList.toggle(buttonMap[button].classList[0] + "_light");
  //Play the buttons audio.
  playTone(button);

  await delay(time);
  //Turn off the buttons light.
  buttonMap[button].classList.toggle(buttonMap[button].classList[0] + "_light");
  
  stopTone();
}

//Set the seed of the random number generator to a random number.
function newSeedRandomButton(){
  randomSeed = Math.floor(Math.random() * 256);
}

//Resets the random number generator back to its starting value.
function resetRandomButton(){
  randomShifter = randomSeed;
}

//Use xorshift to generate a random button to flash in the sequence.
function randomButton(){
  randomShifter ^= randomShifter << 13;
  randomShifter ^= randomShifter >> 17;
  randomShifter ^= randomShifter << 5;
  //Only use the first 2 bits to get a value between 0 and 3.
  return randomShifter & 0b11;
}

//Have the computer play the current tone sequence upto the current level.
async function playSequence(){
  htmlBtnStart.innerText = "WAIT";
  playingSequence = true;

  //Start at the begining of the sequence.
  resetRandomButton();
  
  //Every level the delay for tones is shortened.
  toneDelay = toneDelay * 0.9; 
  //Make sure the delay isn't too short.
  if(toneDelay < 200){
    toneDelay = 200;
  }

  //Play all tones up to the current level.
  for(var currentSequence = 0; currentSequence <= currentLevel; currentSequence++){
    await playButton(randomButton(), toneDelay);
    await delay(toneDelay / 2);
  }
  //Reset the random number generator to prepare for user input.
  resetRandomButton();
  currentUserInput = 0;
  htmlBtnStart.innerText = "NEW GAME";
  playingSequence = false;
  waitingUserInput = true;
}

//Game over state. Play some tones to signal to the user that they
//made an error and wait for a new game.
async function gameOver(){
  var delayOn = 600;
  var delayOff = 200;
  playingSequence = true;
  await delay(delayOn);
  //Override the normal tone for the button with a shrill error tone.
  //The regular button tone wont play as we will already have a audio source playing.
  playTone(GAME_OVER_TONE);
  await playButton(BTN_RED, delayOn);
  await delay(delayOff);

  playTone(GAME_OVER_TONE);
  await playButton(BTN_RED, delayOn);
  await delay(delayOff);

  playTone(GAME_OVER_TONE);
  await playButton(BTN_RED, delayOn);

  playingSequence = false;
  htmlBtnStart.innerText = "START";
}

async function onColorButtonClick(value){
  //Value is passed as a string. Convert to an integer.
  var integerValue = parseInt(value, 10);
  //Only accept user input during their turn.
  if(waitingUserInput == true){
    //Check input value
    var currentLevelValue = randomButton();
    if(value == currentLevelValue){ //Correct user input
      if(currentUserInput == currentLevel){ //user passed the level.
        waitingUserInput = false;
        //Delay a short bit for aesthetics.
        await delay(500);
        //Move to next level.
        currentLevel++;
        playSequence();
      }
      //User entered correct value for level but has not completed the level.
      //Wait for more user input.
      currentUserInput++;
    } else { //Wrong user input.
      //Go to game over state.
      waitingUserInput = false;
      gameOver();
    }
  }
}

//End the tone on any mouse up or touch up event. This prevents the sound from
//getting stuck on if the user drags the pointer out of the button while holding
//the pointer down.
function inputEndHandler(){
  if(playingSequence == false){
    stopTone();
  }
}

window.addEventListener('mouseup', inputEndHandler);
window.addEventListener('touchend', inputEndHandler);

//User Clicked the HTML Start/New Game button
function onStartClick(){
  if(playingSequence == false){
    newGame();
  }
}