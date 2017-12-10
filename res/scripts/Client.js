
//A client to join games and pass control over a player object to the interface (in our case, browser host)
function Client () {
    this.m_Player = undefined;
    this.m_ServerIp = "localhost";
    this.m_ServerPort = "10209";
    
    //TODO - Node.js socket.io code here
}

//Call this method even if we're not disconnected, no guilt required
Client.prototype.tryConnect = function (ipAddress, port) {
    //TODO - Node.js socket.io code here
}

//Call this method even if we're not connected, no guilt required
Client.prototype.tryDisconnect = function () {
    //TODO - Node.js socket.io code here
}