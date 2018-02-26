class GameServer {
    constructor(flags, wanAddress, port) {
        this.flags = flags;
        this.wanAddress = wanAddress;
        this.port = port;
        this.lanAddresses = [];
    }

    isLast() {
        //GS came up with this way to detect the last server, it wasn't me :P
        return this.wanAddress == "255.255.255.255";
    }
}