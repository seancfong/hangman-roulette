console.log('Oh snap, who told you to look at the console?');
console.log('Nothing useful is going to be here anyways, but feel free to just stay here if you insist.');

// DOM objects
const votingCountHeader = document.getElementById('voting-count-header');
const wordBox = document.getElementById('hangman-word-content');
const playerBox = document.getElementById('player-list-ul');
const voteButton = document.getElementById('vote-button');
const incorrectContainer = document.getElementById('incorrect-container')

// Create chart
const ctx = document.getElementById('vote-chart').getContext('2d');

const getRandomColor = () => {
    var letters = '0123456789ABCDEF';
    var color = '#';
    for (var i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

// Rotation interval for wheel animation
let rotationInterval;

// Timer interval for timer animation
let timerInterval;

var chartData = {
    labels: ['1', '2'],
    datasets: [
        {
            label: 'Vote Data',
            data: [0, 0],
            backgroundColor: [],
            cutout: '70%'
        },
        {
            label: 'Timer',
            data: [0, 100],
            backgroundColor: ['#000000', '#ffffff'],
            radius: '90%',
            cutout: '90%',
        }
    ],
    
};

const alphabet = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

for (let i = 0; i < 26; i++) {
    chartData.datasets[0].backgroundColor.push(getRandomColor());
}

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
            duration: 800,
            animateRotate: true
        }
        
    }, 
    plugins: [emptyPlugin, counterPlugin]
});

// Connect to the server
const socket = io();

const roomName = window.location.pathname.split("/").at(-2);
console.log( roomName );

var playerName;

const resetCharts = () => {
    let ds = chart.data.datasets[0];

    ds.data = [0, 0];
    
    chart.data.labels = ['1', '2'];
    chart.data.datasets[1].data[0] = 0;
    chart.data.datasets[1].data[1] = 100;

    // edit chart display options
    chart.options.rotation = 0;

    chart.update();
};

// Sweet alert to prompt the user
const greetUser = async () => {
    const { value: playerName } = await Swal.fire({
        title: 'Enter your name',
        input: 'text',
        showCancelButton: false,
        allowOutsideClick: false,
        allowEscapeKey: false,
        inputValidator: (value) => {
          if (!value) {
            return "Please enter in a name"
          }
        }
    })

    if (playerName) {
        const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 4000,
            timerProgressBar: true,
            didOpen: (toast) => {
              toast.addEventListener('mouseenter', Swal.stopTimer)
              toast.addEventListener('mouseleave', Swal.resumeTimer)
            }
          })
          
          Toast.fire({
            icon: 'success',
            title: `Joined room ${roomName}`
          })

        socket.emit('joinRoom', {playerName, roomName});

        resetCharts();
        clearInterval(timerInterval);
        clearInterval(rotationInterval);

        chart.options.animation.duration = 800;

        socket.emit('request-update');
    }
};


const updateWordStatus = (wordStates) => {
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
                d.classList.add('hangman-letter-box');
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
};

const updateIncorrectLetters = (incorrectLetters) => {
    removeAllChildNodes(incorrectContainer);

    for (let letter of incorrectLetters) {
        var d = document.createElement('div');  
        var incLetter = document.createElement('p');

        incLetter.innerHTML = letter;

        d.appendChild(incLetter);
        d.classList.add('incorrect-letter-container');
        incorrectContainer.appendChild(d);
    }

};

const removeAllChildNodes = (parent) => {
    while (parent.firstChild) {
        parent.removeChild(parent.firstChild);
    }
}

socket.on('require-reconnect', () => {
    Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: 'You have been logged out due to inactivity. You may have to restart your game.',
        showCancelButton: false,
        footer: 'Sorry for the inconvenience!',
        confirmButtonText: 'Back to home',
        allowOutsideClick: false,
        allowEscapeKey: false,
    }).then((result) => {
        window.location.replace('/');
    });
})

// Whenever the playerlist needs to update
socket.on('update-playerlist', (users) => {
    console.log('updating player list', playerBox.children, users);
    removeAllChildNodes(playerBox);

    // sort by descending score
    users.sort((p1, p2) => {
        if (p1.points > p2.points) {
            return -1;
        } else if (p1.points < p2.points) {
            return 1;
        }
        return 0;
    });

    for (let userInfo of users) {
        var li = document.createElement('li');
        var d = document.createElement('div');  
        var playerName = document.createElement('p');

        playerName.innerHTML = `${userInfo.playerName} [${userInfo.points}]`;
        
        // bold the client-sided player
        if (userInfo.id === socket.id) {
            playerName.classList.add('bold');
        }

        // display vote icon if voted
        if (userInfo.vote) {
            playerName.classList.add('voted');
        }

        d.appendChild(playerName);
        d.classList.add('player-container');
        li.appendChild(d);
        playerBox.appendChild(li);
    }
});

// Whenever a vote udates the chart
socket.on('update', (gameData) => {
    var alphaKeys = Object.entries(gameData.voteOptions);
    var totalVotes = gameData.totalVotes;
    var wordStates = gameData.wordStates;
    var incorrectLetters = gameData.incorrectLetters;

    console.log(wordStates);
    console.log(totalVotes);

    // Update current word statuses
    updateWordStatus(wordStates);

    // Update incorrect letters
    updateIncorrectLetters(incorrectLetters);

    // Update votes
    votingCountHeader.innerHTML = `Total Votes: ${totalVotes}`;

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

socket.on('start-vote-timer', timerData => {
    let timerDuration = timerData.timerDuration;
    let timerStart = timerData.timerStart;

    let timerDS = chart.data.datasets[1].data;

    chart.options.animation.duration = 800;

    console.log('timerDS', timerDS);

    timerInterval = setInterval(() => {
        let elapsedTime = Date.now() - timerStart;

        // console.log(elapsedTime);

        // 0th index is the timer value
        timerDS[0] = elapsedTime;

        // 1st index is the timer background
        timerDS[1] = timerDuration - elapsedTime;

        if (elapsedTime >= timerDuration) {
            // Lock the button and votes
            voteButton.disabled = true;
            clearInterval(timerInterval);
        }

        chart.update();
        
    }, 100);
});

socket.on('end-vote-timer', () => {
    clearInterval(timerInterval);
    chart.options.animation.duration = 800;

})

const updateThetaCheckpoint = (elapsedTime, dTheta) => {
    if (elapsedTime > 9500) {
        return 1;
    } else if (elapsedTime > 7700) {
        return 2;
    } else if (elapsedTime > 6500) {
        return 3;
    } else if (elapsedTime > 5000) {
        return 4;
    }
    return dTheta;
};

socket.on('spinWheel', (data) => {
    let randomDegree = data.randomDegree;
    let allVotes = data.allVotes;
    let dTheta = 21;
    let aTheta = -1;

    let wheelStart = Date.now();

    let degreeIndex;
    let realDegree;

    chart.options.animation.duration = 0;

    rotationInterval = setInterval(() => {

        chart.options.rotation = chart.options.rotation + dTheta;
        chart.update();

        realDegree = (-1 * chart.options.rotation) + 360;
        degreeIndex = Math.floor((((realDegree + 90) % 360) / 360) * allVotes.length);
        chart.options.plugins.counter.chartText = allVotes[degreeIndex];

        // reset degree if over 360
        if (chart.options.rotation >= 360) {
            let elapsedTime = Date.now() - wheelStart;
            // console.log(elapsedTime, dTheta, chart.options.rotation);
            
            dTheta = updateThetaCheckpoint(elapsedTime, dTheta);

            if (dTheta > 1) {
                dTheta += aTheta;
            } 
            chart.options.rotation = 0;
        } else if (dTheta == 1 && chart.options.rotation == (randomDegree + 90) % 360) {
            clearInterval(rotationInterval);
            console.log('done spinning');
        }
    }, 10);
});


// Hangman Canvas
socket.on('reveal-letter', (letter) => {
    // clear spinning interval
    clearInterval(rotationInterval);

    // reset animation
    chart.options.animation.duration = 1500;

    // reset client chart data
    let ds = chart.data.datasets[0];

    ds.data = [0, 0];
    
    chart.data.labels = ['1', '2'];
    chart.data.datasets[1].data[0] = 0;
    chart.data.datasets[1].data[1] = 100;

    // edit chart display options
    chart.options.rotation = 0;
    chart.options.plugins.counter.chartText = letter;

    chart.update();
    socket.emit('request-update');

    voteButton.disabled = false;
    chart.options.animation.duration = 800;
});

const notifyEarned = (playersEarned) => {
    console.log(playersEarned);
    let title;
    let icon = 'info';
    let pointsEarned;
    let bulletList = '<br/>The following players earned points:<br/><ul>';

    if (playersEarned.reason == 'inWord') {
        let found = false;
        for (let user of playersEarned.users) {
            bulletList += `<li>${user.playerName}`
            if (user.id === socket.id) { 
                console.log('in word');
                // Client earned points
                icon = 'success';
                title = 'Your letter was correct!';
                pointsEarned = '+3 points';
                found = true;
            }
        }
        if (!found) {
            icon = 'info';
            title = 'Your letter was not chosen.';
            pointsEarned = '+0 points';
        }
    } else if (playersEarned.reason == 'notInWord') {
        let found = false;
        for (let user of playersEarned.users) {
            bulletList += `<li>${user.playerName}`
            if (user.id === socket.id) { 
                console.log('in word');
                // Client earned points
                icon = 'info';
                title = 'An incorrect letter was selected. At least it\'s not yours!';
                pointsEarned = '+1 point';
                found = true;
            }
        }
        if (!found) {
            icon = 'error';
            title = 'Your letter was incorrect!';
            pointsEarned = '+0 points';
            
        }
    } else if (playersEarned.reason == 'duplicate') {
        title = 'The letter is already correct. Nice try!';
        pointsEarned = '+0 points';
        bulletList = '';
    } else {
        title = 'Nobody earned any points.';
        pointsEarned = '+0 points';
        bulletList = '';
    }

    bulletList += '</ul>'; 

    // Overwrite text if user abstained from voting
    if (playersEarned.abstained.find((usr) => usr.id === socket.id)) {
        icon = 'error';
        title = 'You did not vote for the previous round';
        pointsEarned = '+0 points';
    }

    const Toast = Swal.mixin({
        toast: true,
        padding: '2em 3em 0.5em 3em',
        position: 'top',
        showConfirmButton: false,
        timer: 5000,
        timerProgressBar: true,
    })
    
    Toast.fire({
        icon: icon,
        title: title,
        html: pointsEarned + bulletList
    })
}

socket.on('points-notify', notifyEarned);

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

        // Lock the button
        voteButton.disabled = true;

        socket.emit('vote', userLetter.toUpperCase());

        // lock the input box
    } else {
        console.log('Invalid Input');
    }
    
});

greetUser();