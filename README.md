# Hangman Roulette
It's a classic spin on a game of hangman!

## Reinventing the wheel
I created a variation of hangman by introducing a system that encouraged both teamwork and competition, as well as a scoreboard to make things more interesting.

## The basic gameplay cycle:
1. Every player anonymously votes on a letter
2. Every player's letter vote gets added onto the wheel. If two people vote the same letter, the space gets shared.
3. After a fixed timer ends, the wheel spins and the game chooses the letter it lands on.
4. Players gain points if their letter was chosen and it is in the word.
5. If a letter is not in the word, then everyone who did not vote the letter gets a point.
6. Players who don't vote get no points.

![](https://raw.githubusercontent.com/seancfong/hangman-roulette/main/media/gameplay.gif)

## Prerequisites
Before you begin, you will need to have the following installed on your machine:

- Node.js
- npm (Node Package Manager)

## Installation

### Step 1: Clone the Repository
Navigate to a directory and paste the following command:

```bash
git clone https://github.com/seancfong/hangman-roulette.git
```

### Step 2: Install dependencies
Open a terminal and navigate to the root directory of the project.

Run the following command to install all required dependencies:

```bash
npm install
```

## Usage
Run the following command to start the development server:

```bash
npm start
```

Open a web browser and navigate to http://localhost:3000.

## Project Structure
The project is structured as follows:

- index.js: The entry point of the application.
- client/: All the static files that is served by the backend.
- client/js/main.js: The main JavaScript file for the client index.html to handle game events.

# From the [bulletin](https://bulletin.seancfong.com/posts/i-combined-two-ideas-into-a-game-and-it-s-my-new-favorite-thing)

## Implementation
- The game runs on an Express.JS backend server that handles client events with Socket.io. 
- The frontend was made with Bootstrap to create a simple responsive layout, using their built-in 12 column format.

## Other tools
- Sweet Alert, making it easy to create a customizable Toast notifications
- Chart.JS and their built-in doughnut chart
    - Here is a custom plugin I wrote in order to display the current letter when the wheel was spinning:
    ```javascript
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
    ```

