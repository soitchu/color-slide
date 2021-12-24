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

If the protocal used it 'https', then you have to also configure the following fields:
`key`, `cert` and `ca`



