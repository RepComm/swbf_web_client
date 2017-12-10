
var net = require('net');

//A client to join games and pass control over a player object to the interface (in our case, browser host)
function Client () {
    this.m_Player = undefined;
    alert("Created client");
}

Client.prototype.onConnect = function () {
    alert("Connected");
    this.tryDisconnect();
}

Client.prototype.onData = function (data) {
    alert(data);
}

//Call this method even if we're not disconnected, no guilt required
Client.prototype.tryConnect = function (ipAddress, port) {
    alert("Attempting to connect");
    this.m_TcpClient = new net.Socket();
    this.m_TcpClient.connect(port, ipAddress, this.onConnect);
}

//Call this method even if we're not connected, no guilt required
Client.prototype.tryDisconnect = function () {
    this.m_TcpClient.destroy();
}