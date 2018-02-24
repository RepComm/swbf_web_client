var net = require('net');
var dns = require('dns');

const SERVERBROWSING_PORT = 28910;
const SERVERBROWSING_HOST_FORMAT = "%s.ms%d.swbfspy.com";
const SERVERBROWSING_HASH_MULTIPLIER = -1664117991;
const SERVERBROWSING_MASTER_SERVERS = 20;
const SERVERBROWSING_PROTOCOL_VERSION = 1;
const SERVERBROWSING_CRYPT_VERSION = 1;

class ServerBrowsingClient {

    getServerBrowsingHost(gameName) {
        var hashCode = new Uint32Array(1);

        for (var i = 0; i < gameName.length; i++) {
            hashCode[0] = StdInt.uint32_mul(hashCode[0], SERVERBROWSING_HASH_MULTIPLIER) + gameName.charCodeAt(i);
        }

        hashCode[0] %= SERVERBROWSING_MASTER_SERVERS;

        return require('util').format(SERVERBROWSING_HOST_FORMAT, gameName, hashCode[0]);
    }

    constructor(queryName, gameName, gameKey) {
        this.queryName = queryName;
        this.gameName = gameName;
        this.gameKey = gameKey;
        this.connectionFlags = 0;
        this.connected = false;
        this.client = null;
        this.cryptStream = null;
    }

    close() {
        this.connected = false;    
        this.client.close();    
    }

    connect() {
        if (this.connected) {
            console.log("Client already connected - aborting");
            return;
        }

        var host = this.getServerBrowsingHost(this.gameName);

        this.client = new net.Socket();
        this.cryptStream = new CryptStream(this.gameKey);

        this.client.on("error", function(e) {
            console.log("Client error: " + e);
            this.close();
        });

        this.client.on("close", function() {
            console.log("Connection closed.");
            this.connected = false;
        });

        this.client.on("data", handleData());

        /*client.connect(SERVERBROWSING_PORT, host, function () {
            console.log("Connected to "+ host);
            this.connected = true;
        });*/   
    }

    send(buf) {
        var sz = Buffer.alloc(2);
        sz.writeUInt16LE(buf.length);
        client.write(sz);
        client.write(buf);
    }

    handleData(buf) {
        
    }

    sendInitialize() {
        var buf = Buffer.alloc(1 + 1 + 4 + this.gameName.length + 1 + this.queryName.length + 1 + this.cryptoState.getChallenge().length);
        var idx = 0;

        //version numbers, not sure if these are accurate but GM will just ignore them anyways
        buf.writeUInt8(SERVERBROWSING_PROTOCOL_VERSION, idx++);
        buf.writeUInt8(SERVERBROWSING_CRYPT_VERSION, idx++);
        
        //connection flags, not used by GM
        buf.writeUInt32LE(this.connectionFlags, idx+=4);

        //gamename (used for crypto) and queryname (used to find matching servers)
        //add 0s to terminate C-Style strings
        buf.write(this.gameName, idx+=this.gameName.length);
        buf.writeUInt8(0, idx++);
        buf.write(this.queryName, idx+=this.queryName.length);
        buf.writeUInt8(0, idx++); 

        //crypto challenge
        buf.write(this.cryptoState.getChallenge(), idx);   
        this.send(buf);
    }
}