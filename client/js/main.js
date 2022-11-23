console.log('Oh snap, who told you to look at the console?');
console.log('Nothing useful is going to be here anyways, but feel free to just stay here if you insist.');

// DOM objects
const votingCountHeader = document.getElementById('voting-count-header');
const wordBox = document.getElementById('hangman-word-content');

// Create chart
const ctx = document.getElementById('vote-chart').getContext('2d');
const drawingCanvas = document.getElementById('hangman-display');
const ctxDraw = drawingCanvas.getContext('2d');

var chartData = {
    labels: [],
    datasets: [
        {
            label: 'Dataset 1',
            data: [],
            backgroundColor: [],
            cutout: '80%'
        }
    ],
    
};

const emptyPlugin = {
    id: 'emptyDoughnut',
    afterDraw(chart, args, options) {
        const {datasets} = chart.data;
        const {color, width, radiusDecrease} = options;
        let hasData = false;
    
        for (let i = 0; i < datasets.length; i += 1) {
            const dataset = datasets[i];
            hasData |= dataset.data.length > 0;
        }
    
        if (!hasData) {
            const {chartArea: {left, top, right, bottom}, ctx} = chart;
            const centerX = (left + right) / 2;
            const centerY = (top + bottom) / 2;
            const r = Math.min(right - left, bottom - top) / 2;
    
            ctx.beginPath();
            ctx.lineWidth = width || 2;
            ctx.strokeStyle = color || 'rgba(255, 128, 0, 0.5)';
            ctx.arc(centerX, centerY, (r - radiusDecrease || 0), 0, 2 * Math.PI);
            ctx.stroke();
        } 
    }
};

const counterPlugin = {
    id: 'counter',
    beforeDraw(chart, args, options) {
        const {ctx, chartArea: {
            top, right, bottom, left, width, height
        }} = chart;
    
        ctx.save();
        
        ctx.font = options.fontSize + 'px ' + options.fontFamily;
        ctx.textAlign = 'center';
        ctx.fillStyle = options.fontColor;
        ctx.fillText(options.chartText, width / 2, top + (height / 2) + (options.fontSize * 0.34));
    }
}

const chart = new Chart(ctx, {
    type: 'doughnut',
    data: chartData,
    options: {
        plugins: {
            emptyDoughnut: { 
                color: 'rgba(0, 90, 255, 0.1)',
                width: 25,
                radiusDecrease: 15
            },
            counter: {
                fontColor: '#777',
                fontSize: 60,
                fontFamily: 'sans-serif',
                chartText: '?'
            },
            tooltip: false,
            legend: {
                display: false
            }
        },
        responsive: true,
        animation: {
            duration: 800
        }
        
    }, 
    plugins: [emptyPlugin, counterPlugin]
});

// Connect to the server
const socket = io();

const roomName = window.location.pathname.split("/").at(-2);
console.log( roomName );

var playerName;

// Sweet alert to prompt the user
swal("Enter your name:", {
    closeOnEsc: false,
    closeOnClickOutside: false,
    content: "input",
    button: {
        text: "Join Game",
        closeModal: true,
    },
})
.then((value) => {
    playerName = value;
    if (!playerName) {
        playerName = 'Player';
    }
    swal(`Welcome, ${playerName}!`, {
        icon: "success"
    });
    socket.emit('joinRoom', {playerName, roomName});
});

// Whenever a vote udates the chart
socket.on('update', (gameData) => {
    var alphaKeys = Object.entries(gameData.voteOptions);
    var totalVotes = gameData.totalVotes;
    var wordStates = gameData.wordStates;

    console.log(wordStates);
    console.log(totalVotes);

    // Update current word statuses
    // console.log(wordBox.children);

    if (wordBox.children.length == 0) {
        for (let wordArray of wordStates) {
            for (let letter of wordArray) {
                // display current letter data
                var d = document.createElement('div');
                var l = document.createElement('p');
                if (letter == ' '){ 
                    l.innerHTML = '_';
                } else {
                    l.innerHTML = letter;
                }
                
                d.appendChild(l);
                wordBox.appendChild(d);
            }
            // insert line break
            var br = document.createElement('br');
            wordBox.appendChild(br);
        }
    } else {
        let index = 0;
        for (let i = 0; i < wordStates.length; i++) {
            for (let j = 0; j < wordStates[i].length; j++) {
                let d = wordBox.children[index];
                let p = d.children[0];
                // console.log(p, wordStates[i][j], index, i, j);
                if (p) {
                    if (wordStates[i][j] == ' '){ 
                        p.innerHTML = '_';
                    } else {
                        p.innerHTML = wordStates[i][j];
                    }
                }
                index++;
            }
            index++;
        }
        
    }
    

    // Update votes
    votingCountHeader.innerHTML = `Open Voting Total: ${totalVotes}`;

    // Update chart
    const data = chart.data;

    // Iterate through alphabet keys
    let ds = data.datasets[0];

    for (const [key, letterData] of alphaKeys) {
        let ind = data.labels.indexOf(key);

        if (letterData.votes > 0) {
            if (data.labels.includes(key)) {
                // Update label
                
                if (letterData.votes > ds.data[ind]) {
                    ds.data[ind] = letterData.votes;
                }
            } else {
                // Add new label
                data.labels.push(key);
                ds.backgroundColor.push(letterData.bgColor);
                ds.data.push(letterData.votes);
            }   
        }   
    }

    chart.update();
    console.log(data.labels);
    console.log(ds.data);

    socket.emit('updateData', {
        labels: data.labels,
        data: ds.data
    });
});

socket.on('spinWheel', (data) => {
    let randomDegree = data.randomDegree;
    let letter = data.letter;
    let allVotes = data.allVotes;
    let dTheta = 30;

    let degreeIndex;
    let realDegree;

    chart.options.animation.duration = 0;

    let rotationInterval = window.setInterval(() => {
        chart.options.rotation = chart.options.rotation + dTheta;
        chart.update();


        realDegree = (-1 * chart.options.rotation) + 360;
        degreeIndex = Math.floor((((realDegree + 90) % 360) / 360) * allVotes.length);
        chart.options.plugins.counter.chartText = allVotes[degreeIndex];

        // reset degree if over 360
        if (chart.options.rotation >= 360) {
            if (dTheta > 1) {
                dTheta -= 1;
            }
            chart.options.rotation = 0;
        } else if (dTheta == 1 && chart.options.rotation == (randomDegree + 90) % 360) {
            clearInterval(rotationInterval);
            console.log('done spinning');
            chart.options.animation.duration = 800;
            setTimeout(revealLetter, 2000, letter);
        }
    }, 20);
});


// Hangman Canvas
const revealLetter = (letter) => {
    console.log(letter);

    socket.emit('new-round');

    // reset client chart data
    let ds = chart.data.datasets[0];

    console.log('ds data', ds.data);
    console.log('data labels', chart.data.labels);

    ds.data = [];
    chart.data.labels = [];


    chart.update();
    socket.emit('request-update');

    

    
}

// Input forms
const form = document.getElementById('vote-form');
form.addEventListener('submit', (e) => {
    // Prevent from reloading
    e.preventDefault();

    // Get the value
    const voteInput = document.getElementById('vote-text-input');
    const userLetter = voteInput.value;

    // Submit valid letter vote
    if (/^[a-zA-Z]$/.test(voteInput.value)) {
        voteInput.value = "";
        console.log(userLetter);
        socket.emit('vote', userLetter.toUpperCase());

        // lock the input box
    } else {
        console.log('Invalid Input');
    }
    
});