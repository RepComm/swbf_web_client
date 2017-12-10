
var net = require('net');

//A client to join games and pass control over a player object to the interface (in our case, browser host)
function Client () {
    this.m_Player = undefined;
    console.log("Created client");
};

//Call this method even if we're not disconnected, no guilt required
Client.prototype.tryConnect = function (ipAddress, port) {
    console.log("Attempting to connect");
    this.m_TcpClient = new net.Socket();
    var thiz = this;
    this.m_TcpClient.connect(port, ipAddress, function () {
        thiz.onConnect.call(thiz); //So we can keep using THIS keyword in onConnect
    });
    this.m_TcpClient.on("data", function (data) {
        thiz.onData.call(thiz, data);
    });
    
};

//Call this method even if we're not connected, no guilt required
Client.prototype.tryDisconnect = function () {
    this.m_TcpClient.destroy();
};

Client.prototype.onConnect = function () {
    console.log("Connected");
    this.tryDisconnect();
};

Client.prototype.onData = function (data) {
    console.log(data);
};