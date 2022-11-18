const path = require('path');
const express= require('express');
const socketio = require('socket.io');
const http = require('http');

// Iniitalize backend server
const app = express();
const server = http.createServer(app);
const io = socketio(server);

// Have app serve front-end static files
app.use(express.static(path.join(__dirname, 'client')));

// Will run when client connects to server
io.on('connection', socket => {
    console.log('Client connected to server');
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});