## Demo
https://rubiks-race.herokuapp.com/

## Installation (server)

Run the following command in the server folder:

```
npm install
```

Then configure config.json, as per your needs. 

`webSocketDomain` : The name of the domain  
`webSocketPort` : The port where the websocket will be running  
`protocol` : The protocal used; it can be either 'https' or http  
`cors` : The CORS settings for the websocket server  

If the protocal used is 'https,' then you have to also configure the following fields:  
`key`, `cert` and `ca`  


## Installation (client)

You just need to serve the files in the 'client' folder. To make things easier (or harder for some people), config.js  
is the place where the URL of the websocket server is stored.

## How to play

The rules of this game can be found [here](https://www.hasbro.com/common/documents/dad2884a1c4311ddbd0b0800200c9a66/D597E72E5056900B10F8D850BDEA6516.pdf).
