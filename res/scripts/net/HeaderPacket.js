class HeaderPacket {

    //TODO create packet base class 
    constructor(gameName, queryName, challenge) {
        this.id = -1;
        this.gameName = gameName;
        this.queryName = queryName;
        this.challenge = challenge;
        this.sent = false;
        this.wanAddress = "0.0.0.0";
        this.defaultPort = 0;
    }

    compile() {
        var idx = 0;
        var buf = Buffer.alloc(1 + 1 + 1 + 4 + this.gameName.length + 1 + this.queryName.length + 1 + this.challenge.length);

        //version numbers, not sure if these are accurate but GM will just ignore them anyways
        buf.writeUInt8(SERVERBROWSING_ID_LIST_REQUEST, idx++);
        buf.writeUInt8(SERVERBROWSING_PROTOCOL_VERSION, idx++);
        buf.writeUInt8(SERVERBROWSING_CRYPT_VERSION, idx++);

        //connection flags, not used by GM
        buf.writeUInt32LE(this.connectionFlags, idx);
        idx += 4;

        //gamename (used for crypto) and queryname (used to find matching servers)
        //add 0s to terminate C-Style strings
        buf.write(this.gameName, idx);
        idx += this.gameName.length;
        buf.writeUInt8(0, idx++);

        buf.write(this.queryName, idx);
        idx += this.queryName.length;
        buf.writeUInt8(0, idx++);

        //crypto challenge
        this.challenge.copy(buf, idx, 0, this.challenge.length);
        return buf;
    }
    
    receive(buf) {
        var idx = 0;
        this.wanAddress = ServerBrowsingClient.readIPAddress(buf, idx);
        idx += 4;
        Logger.log(LOGLEVEL_DEBUG, "[ServerBrowsing] Received init header { WAN-IP: %s, DefaultGamePort: %s }", this.wanAddress, this.defaultPort);
        return idx;
    }
}