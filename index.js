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
const TIMER_LENGTH = 5000;

var allRooms = {};
var socketIDRooms = {};

const roomByID = (id) => {
    if (allRooms[socketIDRooms[id]]) {
        return allRooms[socketIDRooms[id]].roomName;
    }
    return null;
}

const userByID = (id) => {
    if (roomByID(id)) {
        for (let user of allRooms[roomByID(id)].users) {
            if (user.id === id) {
                return user;
            }
        }
    }

    return null;
}

const addNewRoom = (roomName) => {
    allRooms[roomName] = {
        roomName: roomName,
        users: [],
        curWords: [],
        wordStates: [],
        incorrectLetters: [],
        activeTimer: false,
        chartData: {},
        totalVotes: 0,
        openVoting: true,
    };
}

const newUser = (playerName, id, room) => {
    socketIDRooms[id] = room;
    return {
        playerName: playerName,
        id: id,
        roomName: room,
        vote: '',
        points: 0
    }
} 

const resetUserPoints = (roomName) => {
    for (user of allRooms[roomName].users) {
        user.points = 0;
    }
};


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
    let roomName = req.body.roomName;

    if (!(req.body.roomName in allRooms)) {
        // Add new room
        addNewRoom(req.body.roomName);

        // Reset as new game
        resetGame(roomName);
    }
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

const checkMajorityTimer = (roomName) => {
    let totalVotes = allRooms[roomName].totalVotes;

    console.log(`Open voting: Checking timer on [${totalVotes}] votes`);

    // set timer if a majority exists
    if (totalVotes >= 3) {
        console.log('Countdown timer now!');
        allRooms[roomName].activeTimer = true;

        // Start vote timer 
        io.to(roomName).emit('start-vote-timer', {
            timerDuration: TIMER_LENGTH,
            timerStart: Date.now()
        });

        // End vote timer and select vote
        setTimeout(() => {
            io.to(roomName).emit('end-vote-timer');
            allRooms[roomName].openVoting = false;
            selectVote(roomName);
        }, TIMER_LENGTH + 3000);
        
    }
};

const emitToRoom = (socket, event, hasObject = false, toSend = null) => {
    if (hasObject) {
        io.to(roomByID(socket.id)).emit(event, generateUpdateObject(roomByID(socket.id)));
    } else if (toSend) {
        io.to(roomByID(socket.id)).emit(event, toSend);
    } else {
        io.to(roomByID(socket.id)).emit(event);
    }
    
}; 

const generateUpdateObject = (roomName) => {
    let room = allRooms[roomName];
    return {
        voteOptions: room.voteOptions,
        totalVotes: room.totalVotes,
        wordStates: room.wordStates,
        users: room.users,
        incorrectLetters: room.incorrectLetters
    }
};

const selectVote = (roomName) => {
    console.log(`[${roomName}] Locking votes and evaluating`);

    let allVotes = [];

    let chartData = allRooms[roomName].chartData;

    // Select a random letter
    for (let pos = 0; pos < chartData.labels.length; pos++) {
        // console.log(chartData.labels[pos], chartData.data[pos]);
        for (let j = 0; j < chartData.data[pos]; j++){
            allVotes.push(chartData.labels[pos]);
            console.log(chartData.labels[pos]);
        }   
    }
    console.log(`[${roomName}] allVotes `, allVotes);

    let randomDegree = Math.floor(Math.random() * (358) + 1);  // between 1 and 359

    let realDegree = (-1 * randomDegree) + 360;  // between 359 and 1
    let degreeIndex = Math.floor((realDegree / 360) * allVotes.length);

    let letter = allVotes[degreeIndex];

    io.to(roomName).emit('spinWheel', {
        randomDegree: randomDegree,
        letter: letter,
        allVotes: allVotes
    });

    console.log('selected: ', letter);

    let curWords = allRooms[roomName].curWords;

    // create delay for wheel spin, in case clients reconnect
    setTimeout(() => {
        let inWords = false;

        let letterDiffs = 0;

        // update the word states on server side
        for (let i = 0; i < curWords.length; i++) {
            for (let j = 0; j < curWords[i].length; j++) {
                if (letter == curWords[i][j]) {
                    // is a letter in the words
                    allRooms[roomName].wordStates[i][j] = letter;
                    inWords = true;
                }
                if (curWords[i][j] != allRooms[roomName].wordStates[i][j]) {
                    letterDiffs++;
                }
            }
        }

        // if not in words and incorrect list, then add to incorrect letters list
        if (!inWords && (!allRooms[roomName].incorrectLetters.find((l) => l == letter))) {
            allRooms[roomName].incorrectLetters.push(letter);
        }

        // update the player scores
        for (let user of allRooms[roomName].users) {
            // console.log(allRooms[roomName].users, user);

            // reward the players who guess right letter and spun by wheel
            if (inWords) {
                // points if guess correct letter and was selected
                if (user.vote == letter) {
                    user.points += 3;
                }
            } else {
                // points to everyone else who voted but didn't guess wrong
                if ((user.vote) && user.vote != letter) {
                    user.points += 1;
                }
            }

            // reset user vote
            user.vote = '';
        }

        if (letterDiffs == 0) {
            console.log(`[${roomName}] Game completed`);
            // No more letters to guess

            // Determine winner

            // Reset game
            resetGame(roomName);
        } else {
            // re-enable open voting and continue game loop
            allRooms[roomName].openVoting = true;

            resetGameLoop(roomName);
        }

        // emit update events for client
        io.to(roomName).emit('update', generateUpdateObject(roomName));
        io.to(roomName).emit('reveal-letter', letter);
        io.to(roomName).emit('update-playerlist', allRooms[roomName].users);

        
    }, 15000);
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

        console.log(`Updating room ${roomByID(socket.id)}`);
        emitToRoom(socket, 'update', true);

        console.log(allRooms[user.roomName].users);
        emitToRoom(socket, 'update-playerlist', false, allRooms[user.roomName].users);
    });

    socket.on('vote', (letter) => {
        if (!roomByID(socket.id)) {
            console.log('require client reconnect');
            socket.emit('require-reconnect');
            return;
        } 

        var voteOptions = allRooms[roomByID(socket.id)].voteOptions;
        var openVoting = allRooms[roomByID(socket.id)].openVoting;
        var activeTimer = allRooms[roomByID(socket.id)].activeTimer;

        if (openVoting && !voteOptions[letter]) {
            voteOptions[letter] = {
                votes: 0,
                label: letter
            }
        }

        if (openVoting) {
            voteOptions[letter].votes += 1;

            // store the vote in user object
            let user = userByID(socket.id);
            user.vote = letter;

            allRooms[roomByID(socket.id)].totalVotes++;
            if (!activeTimer) {
                checkMajorityTimer(roomByID(socket.id));
            }

            let userArray = [];

            if (socketIDRooms[socket.id]) {
                userArray = allRooms[roomByID(socket.id)].users;
            }
            
            // Update the voteOptions on other devices
            emitToRoom(socket, 'update', true);
            emitToRoom(socket, 'update-playerlist', false, userArray);
        }

        console.log(voteOptions);
    });

    socket.on('updateData', (data) => {
        allRooms[roomByID(socket.id)].chartData = data;
    });

    socket.on('request-update', () => {
        console.log('request update');
        emitToRoom(socket, 'update', true);
    });

    socket.on('disconnect', (reason) => {
        console.log('disconnect', socket.id);
        let userArray = [];

        if (socketIDRooms[socket.id]) {
            userArray = allRooms[roomByID(socket.id)].users;
        }

        // Remove user from user list
        for(let i = 0; i < userArray.length; i++){ 
            if (userArray[i].id === socket.id) { 
                userArray.splice(i, 1); 
                break;
            }
        }

        console.log('updated player list: ', userArray);
        if (allRooms[roomByID(socket.id)]) {
            emitToRoom(socket, 'update-playerlist', false, userArray);
        }
    })

});



// Game-handling functions
const generateWords = (roomName) => {
    let genWords = randomWords({exactly:2, wordsPerString:1, maxLength:8, formatter: (word) => word.toUpperCase()});
    // genWords = ['X'];
    for (let word of genWords) {
        let wordArray = [];
        let wordStateArray = [];
        for (let letter of word) {
            wordArray.push(letter);
            wordStateArray.push(' ');
        }
        allRooms[roomName].curWords.push(wordArray);
        allRooms[roomName].wordStates.push(wordStateArray);
    }
}

const resetGameLoop = (roomName) => {
    console.log(`Reset game loop for ${roomName}`);

    // reset timer
    allRooms[roomName].activeTimer = false;

    // reset data
    allRooms[roomName].chartData = {};

    // reset all votes
    allRooms[roomName].totalVotes = 0;
    allRooms[roomName].voteOptions = {};
    allRooms[roomName].openVoting = true;

    if (DEBUG) {
        console.log(allRooms[roomName].voteOptions);
        console.log(allRooms[roomName].curWords, allRooms[roomName].wordStates);
    }
};

const resetGame = (roomName) => {
    // Reset game data
    allRooms[roomName].curWords = [];
    allRooms[roomName].wordStates = [];
    allRooms[roomName].incorrectLetters = [];

    // Reset user points
    resetUserPoints(roomName);

    // Generate new words
    generateWords(roomName);
    resetGameLoop(roomName);

};

if (DEBUG) {
    addNewRoom('dev_test');
    resetGame('dev_test');
}

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});