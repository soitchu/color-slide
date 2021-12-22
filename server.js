const express = require('express');
const fs = require('fs');
const app = express();
const http = require('http');
const https = require('https');
var config;


try{
    config = JSON.parse(fs.readFileSync('config.json'));
}catch(err){
    config = JSON.parse(fs.readFileSync('config.json'));
}

console.log(config);

class gameClass {
    constructor(gameDiv, config) {

        this.tileCountTotal = 5;
        this.game = [];
        this.colors = ["#000000", "#ffffff", "#b83030", "#0b1470", "#b5c229", "#b04272"];
        this.canMove = false;

        /// Setting up the initial game-array
        for (var i = 0; i < this.tileCountTotal; i++) {
            this.game.push([]);
            for (var j = 0; j < this.tileCountTotal; j++) {
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

        if (dir == 3) {
            yOffset = -1;
        } else if (dir == 1) {
            yOffset = 1;
        } else if (dir == 4) {
            xOffset = -1;
        } else if (dir == 2) {
            xOffset = 1;
        }


        if ((this.currentHole[0] + yOffset) >= (this.tileCountTotal) || (this.currentHole[1] + xOffset) >= (this.tileCountTotal) || (this.currentHole[1] + xOffset) < 0 || (this.currentHole[0] + yOffset) < 0) {
            return -1;
        }

        /// Getting the coordinates of the hole adjacent, which is determined by the variable 'dir'
        let holeAbove = [this.currentHole[0] + yOffset, this.currentHole[1] + xOffset];





        /// Swapping the numbers in the main game array
        let tempNum = this.game[holeAbove[0]][holeAbove[1]];
        this.game[holeAbove[0]][holeAbove[1]] = this.game[this.currentHole[0]][this.currentHole[1]];
        this.game[this.currentHole[0]][this.currentHole[1]] = tempNum;

        /// Changing the hole's position to its current location
        if (yOffset != 0) {
            this.currentHole[0] += yOffset;
        } else if (xOffset != 0) {
            this.currentHole[1] += xOffset;
        }


       



    }

    randomise() {
        /// The initial state of the game is determined by moving the tiles from the 
        /// original configuration; this will ensure that it is always possible for the user
        /// to use legal moves to go back to the original configuration to win the game
        var times = Math.floor(Math.random() * 20) + 200;
        var last = 0;

        /// As the hole is initially at the bottom left, the first moves should be top or left
        var random = [1, 2, 3, 4];
        for (var i = 0; i < times; i++) {
            /// Choosing a random move to make
            var last = (Math.floor(Math.random() * 100)) % (random.length);
            let moved = random[last];

            /// If the move made does not affect the configration of the game, then try again 
            /// so hopefully we don't get the same move again. 
            if (this.move(moved, false) == -1) {
                i--;
                continue;
            }

            /// The next random array should not undo what the last move did,
            /// so eliminating that possibility
            if (moved == 3 || moved == 1) {
                random = [4, 2, moved];
            } else if (moved == 2 || moved == 4) {
                random = [1, 3, moved];
            }

            /// If the hole is on the corner, don't make moves that would not change the conifguration at all
            if (this.currentHole[0] == 0 && this.currentHole[1] == 0) {
                random = [1, 2];
            } else if (this.currentHole[0] == 0 && this.currentHole[1] == (this.tileCountTotal - 1)) {
                random = [1, 4];
            } else if (this.currentHole[1] == 0 && this.currentHole[0] == (this.tileCountTotal - 1)) {
                random = [3, 2];
            } else if (this.currentHole[1] == (this.tileCountTotal - 1) && this.currentHole[0] == (this.tileCountTotal - 1)) {
                random = [3, 4];
            }

        }

        for (var i = 0; i < 5; i++) {
            this.move(2, false);
            this.move(1, false);

        }

    }
    storeConfig(){
        let temp = [];

        for(var i = 1; i <= 3; i++){
            temp.push([]);
            for(var j = 1; j <= 3; j++){
                if(this.game[i][j] == 0){
                    temp[i-1].push(-1);
                }else{
                    temp[i-1].push(this.game[i][j]%6);
                }
            }
        }
        return temp;
    }

    compare(arr1, arr2) {
        for (var i = 0; i < 3; i++) {
            for (var j = 0; j < 3; j++) {
                if (arr1[i][j] != arr2[i][j]) {
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




var server;

if(config.protocol == "https"){
    server = https.createServer({
          key: fs.readFileSync(config.key, 'utf8'),
          cert: fs.readFileSync(config.cert, 'utf8'),
          ca: fs.readFileSync(config.ca, 'utf8')
    }, app);
}else{
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

var data_m = {};

/*
    Getting an empty room number when trying to host the game
    This is an extremely unoptimised way to do it; I plan to changing it later
*/
function getRandomRoomName() {
    let rn = 100000 + Math.floor(Math.random() * 899999);
    let s = io.sockets.adapter.rooms.get(rn);
    if (typeof s == "undefined") {
        return rn;
    } else if (s.size == 0) {
        return rn;
    } else {
        return getRandomRoomName();
    }
}

function onConnection(socket) {
    var room_name;
    var x;

    // Making the user leave the rooms its already in
    let roomsAll = Array.from(socket.rooms);    
    for (var i = 0; i < roomsAll.length; i++) {
        if (roomsAll[i] == socket.id) { continue; }
        socket.leave(roomsAll[i]);
    }


    function joinRoom(data){
        try{
            if(io.sockets.adapter.rooms.get(data).size>=2){
                socket.emit("message","There are already more than 2 people in this room.");
                return;
            }
        }catch(err){

        }

        try{
            if (typeof data_m[data] !== "undefined" && data_m[data].inProgress==true) {
                socket.emit("message","A game is already in progress in this room");
                return;
            }
        }catch(err){

        }


        if (data.length == 6) {
            let roomsAll = Array.from(socket.rooms);
            for (var i = 0; i < roomsAll.length; i++) {
                if (roomsAll[i] == socket.id) { continue; }
                socket.leave(roomsAll[i]);
            }

            socket.join(data);
            socket.emit("room", data);
            if(io.sockets.adapter.rooms.get(data).size == 1){
                socket.emit("messageLog", "Waiting for other player to join this room.");                
            }else{
                io.in(data).emit("messageLog", "Waiting for both players to get ready.");                

            }


            room_name = data;
            if (typeof data_m[room_name] === "undefined") {
                data_m[room_name] = {};
                data_m[room_name].history = {};
                 data_m[room_name].count = 0;


                 data_m[room_name].game = new gameClass(5);
                 data_m[room_name].game.initialise();
                 data_m[room_name].preview = data_m[room_name].game.storeConfig();
                 data_m[room_name].inProgress = false;
                 data_m[room_name].ready = [];
                 data_m[room_name].playAgain = [];
                 data_m[room_name].playAgainBool = false;
                 data_m[room_name].readyOnce = false;
                 
            }

            data_m[room_name][socket.id] = {};
            data_m[room_name][socket.id].game = new gameClass(5);
            data_m[room_name][socket.id].ready = false;


            data_m[room_name][socket.id].game.game = JSON.parse(JSON.stringify(data_m[room_name].game.game));
            data_m[room_name][socket.id].game.currentHole = JSON.parse(JSON.stringify(data_m[room_name].game.currentHole));

            x = data_m[room_name];
            
            
        }
    }
    socket.on('createroom', function (data) {
        data = getRandomRoomName().toString();        
        joinRoom(data);
        
    });


    socket.on('ping', function (data) {
        let roomsAll1 = Array.from(socket.rooms);
        if (roomsAll1.length > 1) {
            socket.emit('ping', roomsAll1[1]);
        } else {
            socket.emit('ping', -1);

        }
    });

    
    socket.on('move', function (data) {
        try{
            data = JSON.parse(data);
            let roomsAll1 = Array.from(socket.rooms);

            if ((x.inProgress == false || x == null || x == undefined || typeof x === "undefined" || roomsAll1.length != 2 || isNaN(parseInt(data)))) {
                return;
            }
            x[socket.id].game.move(data[0]);
            

            socket.to(room_name).emit('move', JSON.stringify({"data":data[0],"length": x.count, "type" : 0}));

            if(x[socket.id].game.compare(x.game.currentConfig, x[socket.id].game.storeConfig()) == 1 ){
                x.inProgress = false;
                socket.emit("again",1);
                socket.to(room_name).emit('again',0);

            }

            let otherId;
            let members = Array.from(io.sockets.adapter.rooms.get(room_name));

            if(members[0] == socket.id){
                otherId = members[1];
            }else{
                otherId = members[0];

            }

            if(JSON.stringify(data[2]) != JSON.stringify(x[socket.id].game.game)){
                console.log("type1" );
                socket.emit('reset', JSON.stringify({
                    type : 1,
                    game : x[socket.id].game.game,
                    gameCurrentHole : x[socket.id].game.currentHole,
                }));
            } else if(JSON.stringify(data[3]) != JSON.stringify(x[otherId].game.game)){
                console.log("type2" );

                socket.emit('reset', JSON.stringify({
                    type : 2,
                    game : x[otherId].game.game,
                    gameCurrentHole : x[otherId].game.currentHole,


                }));
            }  



        }catch(err){
            console.log(err);
        }
        
    });

    socket.on('ready',function(data){
        let members = Array.from(io.sockets.adapter.rooms.get(room_name));
        if(x.ready.indexOf(socket.id) == -1 && members.length == 2 && !x.playAgainBool && x.inProgress == false){
            x.ready.push(socket.id);

            if(x.ready.indexOf(members[0]) > -1 && x.ready.indexOf(members[1]) > -1){
                 data_m[room_name].playAgainBool = true;      

                io.in(room_name).emit("start",1);
                data_m[room_name].readyOnce = true;

                setTimeout(function(){
                    x.inProgress = true;

                    io.in(room_name).emit("changeConfig",JSON.stringify({currentHole:data_m[room_name].game.currentHole,game:data_m[room_name].game.game,preview:data_m[room_name].game.currentConfig}));
                },3000);
            }else{
                socket.to(room_name).emit('messageLog','Waiting for you to get ready');
                socket.emit('messageLog','Waiting for the other player to get ready');
            }
        }
    });

    socket.on('again',function(data){
        let members = Array.from(io.sockets.adapter.rooms.get(room_name));
        data_m[room_name].inProgress = false;

        if(x.playAgain.indexOf(socket.id) == -1 && members.length == 2){
            x.playAgain.push(socket.id);
            if(x.playAgain.indexOf(members[0]) > -1 && x.playAgain.indexOf(members[1]) > -1){
                io.in(room_name).emit("start",1);
                
                data_m[room_name].game = new gameClass(5);
                data_m[room_name].game.initialise();
                data_m[room_name].preview = data_m[room_name].game.storeConfig();
                data_m[room_name].inProgress = false;
                data_m[room_name].ready = [members[0],members[1]];
                data_m[room_name].playAgain = [];      

                data_m[room_name][members[0]] = {};
                data_m[room_name][members[0]].game = new gameClass(5);
                data_m[room_name][members[0]].ready = false;


                data_m[room_name][members[0]].game.game = JSON.parse(JSON.stringify(data_m[room_name].game.game));
                data_m[room_name][members[0]].game.currentHole = JSON.parse(JSON.stringify(data_m[room_name].game.currentHole));

                data_m[room_name][members[1]] = {};
                data_m[room_name][members[1]].game = new gameClass(5);
                data_m[room_name][members[1]].ready = false;


                data_m[room_name][members[1]].game.game = JSON.parse(JSON.stringify(data_m[room_name].game.game));
                data_m[room_name][members[1]].game.currentHole = JSON.parse(JSON.stringify(data_m[room_name].game.currentHole));
                setTimeout(function(){
                    x.inProgress = true;
                    io.in(room_name).emit("changeConfig",JSON.stringify({currentHole:data_m[room_name].game.currentHole,game:data_m[room_name].game.game,preview:data_m[room_name].game.currentConfig}));
                },3000);



            }else{
                socket.to(room_name).emit('messageLog','The other player wants to play again. Press play again to do it.');
                socket.emit('messageLog','Waiting for the other to press play again.');
            }
        }
    });

    socket.on('changeroom', function (data) {
        var data = parseInt(data).toString();
        joinRoom(data);
    });

}
io.on('connection', onConnection);

function delete_hist(room) {
    if (typeof data_m[room] !== "undefined") {
        delete data_m[room];
    }
}


io.of("/").adapter.on("leave-room", (room, id) => {
    if (room.toString().length == "6") {
        let s = io.sockets.adapter.rooms.get(room);
        if ((typeof s == "undefined" || s.size == 0)) {
            delete_hist(room);
        }else{
            if(room in data_m && data_m[room].readyOnce){
                io.in(room).emit('messageLog','The other player has left the room.');
                
            }else{
                io.in(room).emit('messageLog','The other player has left the room.');

            }
        }
    }
});


setInterval(function () {
    var keys = Object.keys(data_m);
    for (var i = 0; i < keys.length; i++) {
        let s = io.sockets.adapter.rooms.get(data_m[i]);
        if (typeof s == "undefined" || s.size == 0) {
            delete_hist(data_m[i]);
        }

    }

}, 6000);


server.listen(port, () => console.log('listening on port ' + port));




