const path = require('path');
const express= require('express');
const socketio = require('socket.io');
const http = require('http');
const randomWords = require('random-words');
const bodyParser = require('body-parser');

// Iniitalize backend server
const app = express();
const server = http.createServer(app);
const io = socketio(server);

const DEBUG = true;
const TIMER_LENGTH = 3000;

var curWords;
var voteOptions;
var totalVotes;
var openVoting;
var activeTimer;
var wordStates;

var chartData;

var allRooms = {};

const addNewRoom = (roomName) => {
    allRooms[roomName] = {
        users: [],
        curWords: [],
        wordStates: [],
        activeTimer: false,
        chartData: {},
        totalVotes: 0,
        openVoting: true,
    };
}

const newUser = (playerName, id, room) => {
    return {
        playerName: playerName,
        id: id,
        roomName: room
    }
} 

if (DEBUG) {
    addNewRoom('dev_test');
}


// Have app serve front-end static files
app.use(express.static(path.join(__dirname, '/client')));

// Mount bodyParser to collect post data from index.html
app.use(bodyParser.urlencoded({extended: true}));

// Route for home page
app.get('/', (req, res) => {
    res.sendFile(__dirname +'/client/index.html');
});




// Route for joining games
app.post('/joingame', (req, res) => {
    if (!(req.body.roomName in allRooms)) {
        addNewRoom(req.body.roomName);
    }
    console.log(allRooms);
    res.redirect(`/join/${req.body.roomName}/`);
});

app.get('/join/:roomName', function(req, res){
    // Check if attempt to join room not already exists
    if (!(req.params.roomName in allRooms)) {
        res.send('Doesn\'t exist!');
    } else {
        res.sendFile(__dirname + '/client/game.html');
    }
    
});

// Serve static files per room
app.get('/join/:roomName/*', (req, res) => {
    var roomName = req.params.roomName;
    var path = req.params[0] ? req.params[0] : 'index.html';
    res.sendFile(path, {root: './client'});
});

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

    console.log(chartData)

    // Select a random letter
    for (let pos = 0; pos < chartData.labels.length; pos++) {
        console.log(chartData.labels[pos], chartData.data[pos]);
        for (let j = 0; j < chartData.data[pos]; j++){
            allVotes.push(chartData.labels[pos]);
            console.log(chartData.labels[pos]);
        }   
    }
    console.log(allVotes);

    let randomDegree = Math.floor(Math.random() * (358) + 1);  // between 1 and 359

    let realDegree = (-1 * randomDegree) + 360;  // between 359 and 1
    let degreeIndex = Math.floor((realDegree / 360) * allVotes.length);

    letter = allVotes[degreeIndex];

    io.emit('spinWheel', {
        randomDegree: randomDegree,
        letter: letter,
        allVotes: allVotes
    });

    console.log('selected: ', letter);

    for (let i = 0; i < curWords.length; i++) {
        for (let j = 0; j < curWords[i].length; j++) {
            if (letter == curWords[i][j]) {
                wordStates[i][j] = letter;
            }
        }
    }

    console.log(wordStates);
    console.log(curWords);
    
}

// Will run when client connects to server
io.on('connection', socket => {
    if (DEBUG) {
        console.log('Client connected to server');
    }

    socket.on('joinRoom', (clientData) => {
        console.log(`${clientData.playerName} joined room ${clientData.roomName}`);
        const user = newUser(clientData.playerName, socket.id, clientData.roomName);
        allRooms[user.roomName].users.push(user);

        socket.join(clientData.roomName);
        console.log(allRooms);
    });

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

    socket.on('updateData', (data) => {
        chartData = data;
    });

    socket.on('request-update', (data) => {
        console.log('request update');
        io.emit('update', generateUpdateObject());
    });

    socket.on('new-round', (data) => {
        console.log('new round');
        resetGameLoop();
        io.emit('update', generateUpdateObject());
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

    // reset data
    chartData = {};

    // reset all votes
    totalVotes = 0;
    resetVoteOptions();
    openVoting = true;

    if (DEBUG) {
        console.log(voteOptions);
        console.log(curWords);
        console.log(wordStates);
    }
};

const resetGame = () => {
    

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