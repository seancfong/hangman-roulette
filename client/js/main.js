console.log('Oh snap, who told you to look at the console?');
console.log('Nothing useful is going to be here anyways, but feel free to just stay here if you insist.');

// DOM objects
const votingCountHeader = document.getElementById('voting-count-header');
const wordBox = document.getElementById('hangman-word-content');

// Create chart
const ctx = document.getElementById('vote-chart').getContext('2d');

const chartData = {
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
                display: false
            }
        },
        responsive: true,
        
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
    console.log(wordBox.children);

    if (wordBox.children.length == 0) {
        for (let wordArray of wordStates) {
            for (let letter of wordArray) {
                // display current letter data
                let d = document.createElement('div');
                let l = document.createElement('p');
                if (letter == ' '){ 
                    l.innerHTML = '_';
                } else {
                    l.innerHTML = letter;
                }
                
                d.appendChild(l);
                wordBox.appendChild(d);
            }
            // insert line break
            let br = document.createElement('br');
            wordBox.appendChild(br);
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
});


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