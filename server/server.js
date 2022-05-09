const express = require('express');
const fs = require('fs');
const app = express();
const http = require('http');
const https = require('https');
const LinkedList = require('./linkedList.js');
const config = require('./config.json');



console.log(config);

const queue = new LinkedList();

class gameClass {
    constructor(gameDiv, config) {

        this.tileCountTotal = 5;
        this.game = [];
        this.colors = ["#000000", "#ffffff", "#b83030", "#0b1470", "#b5c229", "#b04272"];
        this.canMove = false;

        /// Setting up the initial game-array
        for (let i = 0; i < this.tileCountTotal; i++) {
            this.game.push([]);
            for (let j = 0; j < this.tileCountTotal; j++) {
                this.game[this.game.length - 1][j] = i * this.tileCountTotal + j + 1;
            }
        }

        /// The hole's position is represented by a '0' and it's location is on the bottom-right
        this.game[this.tileCountTotal - 1][this.tileCountTotal - 1] = 0;
        this.currentHole = [this.tileCountTotal - 1, this.tileCountTotal - 1];
    }




    move(dir, wonAlert = true) {
        let xOffset = 0, yOffset = 0;

        /// dir 3 : top
        /// dir 1 : bottom
        /// dir 4 : left
        /// dir 2 : right

        if (dir === 3) {
            yOffset = -1;
        } else if (dir === 1) {
            yOffset = 1;
        } else if (dir === 4) {
            xOffset = -1;
        } else if (dir === 2) {
            xOffset = 1;
        }


        if ((this.currentHole[0] + yOffset) >= (this.tileCountTotal) || (this.currentHole[1] + xOffset) >= (this.tileCountTotal) || (this.currentHole[1] + xOffset) < 0 || (this.currentHole[0] + yOffset) < 0) {
            return -1;
        }

        /// Getting the coordinates of the hole adjacent, which is determined by the variable 'dir'
        const holeAbove = [this.currentHole[0] + yOffset, this.currentHole[1] + xOffset];





        /// Swapping the numbers in the main game array
        const tempNum = this.game[holeAbove[0]][holeAbove[1]];
        this.game[holeAbove[0]][holeAbove[1]] = this.game[this.currentHole[0]][this.currentHole[1]];
        this.game[this.currentHole[0]][this.currentHole[1]] = tempNum;

        /// Changing the hole's position to its current location
        if (yOffset !== 0) {
            this.currentHole[0] += yOffset;
        } else if (xOffset !== 0) {
            this.currentHole[1] += xOffset;
        }






    }

    randomise() {
        /// The initial state of the game is determined by moving the tiles from the
        /// original configuration; this will ensure that it is always possible for the user
        /// to use legal moves to go back to the original configuration to win the game
        const times = Math.floor(Math.random() * 20) + 200;

        /// As the hole is initially at the bottom left, the first moves should be top or left
        let random = [1, 2, 3, 4];
        for (let i = 0; i < times; i++) {
            /// Choosing a random move to make
            const last = (Math.floor(Math.random() * 100)) % (random.length);
            const moved = random[last];

            /// If the move made does not affect the configration of the game, then try again
            /// so hopefully we don't get the same move again.
            if (this.move(moved, false) === -1) {
                i--;
                continue;
            }

            /// The next random array should not undo what the last move did,
            /// so eliminating that possibility
            if (moved === 3 || moved === 1) {
                random = [4, 2, moved];
            } else if (moved === 2 || moved === 4) {
                random = [1, 3, moved];
            }

            /// If the hole is on the corner, don't make moves that would not change the conifguration at all
            if (this.currentHole[0] === 0 && this.currentHole[1] === 0) {
                random = [1, 2];
            } else if (this.currentHole[0] === 0 && this.currentHole[1] === (this.tileCountTotal - 1)) {
                random = [1, 4];
            } else if (this.currentHole[1] === 0 && this.currentHole[0] === (this.tileCountTotal - 1)) {
                random = [3, 2];
            } else if (this.currentHole[1] === (this.tileCountTotal - 1) && this.currentHole[0] === (this.tileCountTotal - 1)) {
                random = [3, 4];
            }

        }

        for (let i = 0; i < 5; i++) {
            this.move(2, false);
            this.move(1, false);

        }

    }
    storeConfig() {
        const temp = [];

        for (let i = 1; i <= 3; i++) {
            temp.push([]);
            for (let j = 1; j <= 3; j++) {
                if (this.game[i][j] === 0) {
                    temp[i - 1].push(-1);
                } else {
                    temp[i - 1].push(this.game[i][j] % 6);
                }
            }
        }
        return temp;
    }

    compare(arr1, arr2) {
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (arr1[i][j] !== arr2[i][j]) {
                    return -1;
                }
            }
        }
        return 1;
    }
    initialise() {


        this.randomise();
        this.currentConfig = this.storeConfig();
        this.randomise();


    }


};


if(config.heroku){
    app.use('/', express.static('client'));
}
let server;

if (config.protocol === "https") {
    server = https.createServer({
        key: fs.readFileSync(config.key, 'utf8'),
        cert: fs.readFileSync(config.cert, 'utf8'),
        ca: fs.readFileSync(config.ca, 'utf8')
    }, app);
} else {
    server = http.createServer(app);
}

const io = require("socket.io")(server, {
    cors: {
        origin: config.cors,
        methods: ["GET"],
        credentials: true,
    }
});
const port = config.webSocketPort;

const data_m = {};
let currentRoom = 0;

function randomRange(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
}
/*
    Changed the previous function to get random room numbers
    But this still does not seem that efficient/secure, so I plan on
    changing it later on
*/
function getRandomRoomName() {
    const rn = (100 + randomRange(0, 899)) * 1000 + currentRoom;
    currentRoom++;
    if (currentRoom > 999) {
        currentRoom = 0;
    }

    const s = io.sockets.adapter.rooms.get(rn);
    if (typeof s === "undefined") {
        return rn;
    } else if (s.size === 0) {
        return rn;
    } else {
        console.log(s.size)
        return getRandomRoomName();
    }

}

function isActive(socketId) {
    const socket = io.sockets.sockets.get(socketId);
    return (socket !== undefined && Array.from(socket.rooms).length === 1);
}


function findNextActiveSocket() {
    const couple = [];
    while (queue.length > 1 && couple.length < 2) {
        const temp = queue.value(couple.length);
        if (!isActive(temp)) {
            queue.removeElementAtIndex(couple.length);
        } else {
            if (couple.length === 1 && couple[0] === temp) {
                queue.removeElementAtIndex(couple.length);
            } else {
                couple.push(temp);
            }
        }
    }
    if (couple.length === 2) {
        queue.deleteHead();
        queue.deleteHead();
        return couple;
    } else {
        return false;
    }


}


function leaveAllRoom(socket){
    const roomsAll = Array.from(socket.rooms);
    for (let i = 0; i < roomsAll.length; i++) {
        if (roomsAll[i] === socket.id) { continue; }
        socket.leave(roomsAll[i]);
    }
}
function findMatch() {
    while (true) {
        const couple = findNextActiveSocket();
        const first = io.sockets.sockets.get(couple[0]);
        const second = io.sockets.sockets.get(couple[1]);
        if (couple === false) {
            break;
        } else {
            const room = getRandomRoomName();
            first.emit("joinThis", room);
            second.emit("joinThis", room);
            setTimeout(function () {
                try{
                    const members = Array.from(io.sockets.adapter.rooms.get(room.toString()));
                    const mem1 = members.indexOf(couple[0]);
                    const mem2 = members.indexOf(couple[1]);
                    console.log(mem1, members, couple);
                    if (mem1 === -1 && mem2 === -1) {
                    } else if (mem1 === -1) {
                        leaveAllRoom(second);
                        queue.shift(couple[1]);
                        second.emit("queue", "yes");
                    } else if (mem2 === -1) {
                        leaveAllRoom(first);
                        queue.shift(couple[0]);
                        first.emit("queue", "yes");
                    }else{
                        first.emit("show", 1);
                        second.emit("show", 1);
                    }
                }catch(err){
                    console.log(err);
                }
            }, 1000);
        }
    }
}

function cloneArray(array, dimensions) {
    const clonedArray = [];
    if (dimensions === 1) {
        for (let i = 0; i < array.length; i++) {
            clonedArray.push(array[i]);
        }
    } else if (dimensions === 2) {
        for (let i = 0; i < array.length; i++) {
            const temp = [];
            for (let j = 0; j < array[i].length; j++) {
                temp.push(array[i][j]);
            }
            clonedArray.push(temp);
        }
    }

    return clonedArray;
}

function compareArray(array1, array2, dimen1, dimen2) {
    for (let i = 0; i < dimen1; i++) {
        for (let j = 0; j < dimen2; j++) {
            if (array1[i][j] !== array2[i][j]) {
                return -1;
            }
        }
    }

    return 1;
}



function onConnection(socket) {
    let room_name;
    let thisRoom;
    let queueCheck = 0;
    let queueNode = null;
    let lastRoom;
    // Making the user leave the rooms its already in
    const roomsAll = Array.from(socket.rooms);
    for (let i = 0; i < roomsAll.length; i++) {
        if (roomsAll[i] === socket.id) { continue; }
        socket.leave(roomsAll[i]);
    }
    function joinRoom(data, socket, isQueue = 0) {
        if(Date.now() - lastRoom  < 1000){
            return;
        }
        lastRoom = Date.now();
        queueCheck = 0;
        if (queueNode !== null) {
            queue.removeElement(queueNode);
        }
        try {
            const roomSize = io.sockets.adapter.rooms.get(data);
            if (roomSize !== undefined && roomSize !== null && roomSize.size >= 2) {
                socket.emit("message", "There are already more than 2 people in this room.");
                return;
            }


            if (typeof thisRoom !== "undefined" && thisRoom.inProgress === true) {
                socket.emit("message", "A game is already in progress in this room");
                return;
            }



            if (data.length === 6) {
                let roomsAll = Array.from(socket.rooms);
                for (let i = 0; i < roomsAll.length; i++) {
                    if (roomsAll[i] === socket.id) { continue; }
                    socket.leave(roomsAll[i]);
                }

                socket.join(data);

                socket.emit("room", JSON.stringify([isQueue, data]));
                if (io.sockets.adapter.rooms.get(data).size === 1) {
                    socket.emit("messageLog", "Waiting for other player to join this room.");
                } else {
                    io.in(data).emit("messageLog", "Waiting for both players to get ready.");
                }


                room_name = data;
                thisRoom = data_m[room_name];
                if (typeof thisRoom === "undefined") {
                    data_m[room_name] = {};
                    thisRoom = data_m[room_name];
                    thisRoom.history = {};
                    thisRoom.count = 0;
                    thisRoom.game = new gameClass(5);
                    thisRoom.game.initialise();
                    thisRoom.preview = thisRoom.game.storeConfig();
                    thisRoom.inProgress = false;
                    thisRoom.ready = [];
                    thisRoom.readyOnce = false;
                }

            }
        } catch (err) {
            console.log(err);
        }
    }


    function checkIfCanRun() {
        if (thisRoom === null || thisRoom === undefined) {
            return true;
        }
        return false;
    }



    socket.on('createroom', function (data) {

        try {
            data = getRandomRoomName().toString();
            joinRoom(data, socket);
        } catch (err) {
            console.log(err);
        }
    });


    socket.on('ping', function (data) {
        const roomsAll1 = Array.from(socket.rooms);
        if (roomsAll1.length > 1) {
            socket.emit('ping', roomsAll1[1]);
        } else {
            socket.emit('ping', -1);
        }
    });


    socket.on('move', function (data) {

        try {

            if (checkIfCanRun()) {
                return;
            }
            data = JSON.parse(data);
            const members = Array.from(io.sockets.adapter.rooms.get(room_name));

            if ((thisRoom.inProgress === false || isNaN(parseInt(data[0])) || members.length !== 2)) {
                return;
            }
            thisRoom[socket.id].game.move(data[0]);

            socket.to(room_name).emit('move', JSON.stringify({ "data": data[0], "type": 0 }));

            if (thisRoom[socket.id].game.compare(thisRoom.game.currentConfig, thisRoom[socket.id].game.storeConfig()) === 1) {
                thisRoom.inProgress = false;
                socket.emit("again", 1);
                socket.to(room_name).emit('again', 0);

            }

            const otherId = (members[0] === socket.id) ? members[1] : members[0];

            if (compareArray(data[2], thisRoom[socket.id].game.game, 5, 5) === -1) {
                socket.emit('reset', JSON.stringify({
                    type: 1,
                    game: thisRoom[socket.id].game.game,
                    gameCurrentHole: thisRoom[socket.id].game.currentHole,
                }));
            } else if (compareArray(data[3], thisRoom[otherId].game.game, 5, 5) === -1) {
                socket.emit('reset', JSON.stringify({
                    type: 2,
                    game: thisRoom[otherId].game.game,
                    gameCurrentHole: thisRoom[otherId].game.currentHole,
                }));
            }



        } catch (err) {
            console.log(err);
        }

    });

    socket.on('ready', function (data) {

        if (checkIfCanRun()) {
            return;
        }

        try {
            const members = Array.from(io.sockets.adapter.rooms.get(room_name));
            if (thisRoom.ready.indexOf(socket.id) === -1 && members.length === 2 && thisRoom.inProgress === false) {
                thisRoom.ready.push(socket.id);

                if (thisRoom.ready.indexOf(members[0]) > -1 && thisRoom.ready.indexOf(members[1]) > -1) {

                    io.in(room_name).emit("start", 1);
                    thisRoom.readyOnce = true;

                    thisRoom.game = new gameClass(5);
                    thisRoom.game.initialise();
                    thisRoom.preview = thisRoom.game.storeConfig();
                    thisRoom.inProgress = false;

                    thisRoom[members[0]] = {};
                    thisPlayer = thisRoom[members[0]];
                    thisPlayer.game = new gameClass(5);
                    thisPlayer.game.game = cloneArray(data_m[room_name].game.game, 2);
                    thisPlayer.game.currentHole = cloneArray(data_m[room_name].game.currentHole, 1);


                    thisRoom[members[1]] = {};
                    otherPlayer = thisRoom[members[1]];
                    otherPlayer.game = new gameClass(5);
                    otherPlayer.game.game = cloneArray(data_m[room_name].game.game, 2);
                    otherPlayer.game.currentHole = cloneArray(data_m[room_name].game.currentHole, 1);

                    setTimeout(function () {
                        thisRoom.ready = [];

                        thisRoom.inProgress = true;
                        io.in(room_name).emit("changeConfig", JSON.stringify({ currentHole: data_m[room_name].game.currentHole, game: data_m[room_name].game.game, preview: data_m[room_name].game.currentConfig }));
                    }, 3000);

                } else {
                    if (thisRoom.readyOnce) {
                        socket.to(room_name).emit('messageLog', 'The other person wants to play again. Press ready to play again.');
                        socket.emit('messageLog', 'Waiting for the other player to get ready.');
                        console.log(thisRoom.ready);
                    } else {
                        socket.to(room_name).emit('messageLog', 'Waiting for you to get ready.');
                        socket.emit('messageLog', 'Waiting for the other player to get ready.');
                    }
                }
            }
        } catch (err) {
            console.log(err);
        }
    });



    socket.on('changeroom', function (data) {
        try {
            data = JSON.parse(data);
            console.log(data);
            const roomNum = data[1].toString();
            joinRoom(roomNum, socket, data[0]);
        } catch (err) {
            console.log(err);
        }
    });

    socket.on('queue', function (data) {
        try {
            if (queueCheck === 0) {
                queueCheck = 1;
                socket.emit("queue", "yes");
                queueNode = queue.push(socket.id);
            }
        } catch (err) {
            console.log(err);
        }
    });

    socket.on('disconnect', function () {
        if (queueNode !== null) {
            queue.removeElement(queueNode);
        }

    });

}
io.on('connection', onConnection);

function delete_hist(room) {
    if (typeof data_m[room] !== "undefined") {
        delete data_m[room];
    }
}


io.of("/").adapter.on("leave-room", (room, id) => {
    try {

        if (room.toString().length === "6") {
            const s = io.sockets.adapter.rooms.get(room);
            if ((typeof s === "undefined" || s.size === 0)) {
                delete_hist(room);
            } else {
                io.in(room).emit('messageLog', 'The other player has left the room.');
            }
        }
    } catch (err) {
        console.log(err);
    }
});



setInterval(function () {
    findMatch();
}, 1000);

server.listen((process.env.PORT || port), () => console.log('listening on port ' + port));
