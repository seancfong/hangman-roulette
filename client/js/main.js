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
        }
    ]
};

const chart = new Chart(ctx, {
    type: 'pie',
    data: chartData,
    options: {
        plugins: {
            tooltip: false,
            legend: {
                display: true
            }
        },
        responsive: true,
        animation: { duration: 0 }
        
    }
});

// Connect to the server
const socket = io();

// Whenever a vote updates the chart
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
                if (wordBox.children[index].tagName === 'BR') {
                    index += 2;
                    continue;
                }

                if (wordStates[i][j] == ' '){ 
                    p.innerHTML = '_';
                } else {
                    p.innerHTML = wordStates[i][j];
                }
                index++;
            }
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
    let dTheta = 101;

    setTimeout(() => {}, 3000);

    let rotationInterval = window.setInterval(() => {
        chart.options.rotation = chart.options.rotation + dTheta;
        chart.update();
        // reset degree if over 360
        if (chart.options.rotation >= 360) {
            if (dTheta > 1) {
                dTheta -= 5;
            }

            chart.options.rotation = 0;
        } else if (dTheta == 1 && chart.options.rotation == (randomDegree + 90) % 360) {
            clearInterval(rotationInterval);
            console.log('done spinning');
            setTimeout(revealLetter, 3000, letter);
        }
    }, 10);
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

    console.log('all data', chart.data);

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