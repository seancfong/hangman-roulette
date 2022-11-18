const path = require('path');
const express= require('express');
const socketio = require('socket.io');
const http = require('http');
const randomWords = require('random-words');

// Iniitalize backend server
const app = express();
const server = http.createServer(app);
const io = socketio(server);

const DEBUG = true;
const TIMER_LENGTH = 5000;

var curWords;
var voteOptions;
var totalVotes;
var openVoting;
var activeTimer;
var wordStates;

// Have app serve front-end static files
app.use(express.static(path.join(__dirname, 'client')));

// Alphabet array 
const alphabet = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

const getRandomColor = () => {
    var letters = '0123456789ABCDEF';
    var color = '#';
    for (var i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

// Voting options
const resetVoteOptions = () => {
    voteOptions = {};
    for (var i = 0; i < 26; i++) {
        let alphaString = `${alphabet[i]}`;
        voteOptions[alphaString] = {
            votes: 0,
            label: alphaString,
            bgColor: getRandomColor()
        }
    }
};

const checkMajorityTimer = () => {
    console.log(`Open voting: Checking timer on [${totalVotes}] votes`);
    
    // set timer if a majority exists
    if (totalVotes >= 3) {
        console.log('Countdown timer now!');
        activeTimer = true;

        setTimeout(selectVote, TIMER_LENGTH);
    }
};

const generateUpdateObject = () => {
    return {
        voteOptions: voteOptions,
        totalVotes: totalVotes,
        wordStates: wordStates
    }
};

const selectVote = () => {
    console.log('Locking votes and evaluating');

    let allVotes = [];

    // Select a random letter
    for (let [key, option] of Object.entries(voteOptions)) {
        if (option.votes > 0) {
            for (let i = 0; i < option.votes; i++){
                allVotes.push(option.label);
                console.log(option.label);
            }   
        }
    }

    
    
}

// Will run when client connects to server
io.on('connection', socket => {
    if (DEBUG) {
        console.log('Client connected to server');
    }

    io.emit('update', generateUpdateObject());

    socket.on('vote', (letter) => {
        console.log(letter);
        if (voteOptions[letter] && openVoting) {
            voteOptions[letter].votes += 1;
            totalVotes++;
            if (!activeTimer) {
                checkMajorityTimer();
            }
            

            // Update the voteOptions on other devices
            io.emit('update', generateUpdateObject());
        }
    });
});


// Game-handling functions
const generateWords = () => {
    let genWords = randomWords({exactly:3, wordsPerString:1, formatter: (word) => word.toUpperCase()});
    for (let word of genWords) {
        let wordArray = [];
        let wordStateArray = [];
        for (let letter of word) {
            wordArray.push(letter);
            wordStateArray.push(' ');
        }
        curWords.push(wordArray);
        wordStates.push(wordStateArray);
    }
}

const resetGameLoop = () => {
    console.log('New game loop');

    // reset timer
    activeTimer = false;

    if (DEBUG) {
        console.log(voteOptions);
        console.log(curWords);
        console.log(wordStates);
    }
    
    
    
};

const resetGame = () => {
    // reset all votes
    totalVotes = 0;
    resetVoteOptions();
    openVoting = true;

    // generate new words
    curWords = [];
    wordStates = [];
    generateWords();

    resetGameLoop();

};

resetGame();

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});