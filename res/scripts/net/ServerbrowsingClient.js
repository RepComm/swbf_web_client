const SERVERBROWSING_PORT = 28910;
const SERVERBROWSING_HOST_FORMAT = "%s.ms%d.swbfspy.com";//"%s.ms%d.dev.local";
const SERVERBROWSING_HASH_MULTIPLIER = -1664117991;
const SERVERBROWSING_MASTER_SERVERS = 20;
const SERVERBROWSING_PROTOCOL_VERSION = 1;
const SERVERBROWSING_CRYPT_VERSION = 3;

const SERVERBROWSING_ID_LIST_REQUEST = 0;

const SERVERBROWSING_FLAG_SEND_FIELDS_FOR_ALL = 1 << 0;
const SERVERBROWSING_FLAG_NO_SERVER_LIST = 1 << 1;
const SERVERBROWSING_FLAG_PUSH_UPDATES = 1 << 2;
const SERVERBROWSING_FLAG_SEND_GROUPS = 1 << 5;
const SERVERBROWSING_FLAG_NO_LIST_CACHE = 1 << 6;
const SERVERBROWSING_FLAG_LIMIT_RESULT_COUNT = 1 << 7;

const SERVERBROWSING_FLAG_UNSOLICITED_UDP = 1 << 0;
const SERVERBROWSING_FLAG_PRIVATE_IP = 1 << 1;
const SERVERBROWSING_FLAG_CONNECT_NEGOTIATE_FLAG = 1 << 2;
const SERVERBROWSING_FLAG_ICMP_IP = 1 << 3;
const SERVERBROWSING_FLAG_NONSTANDARD_PORT = 1 << 4;
const SERVERBROWSING_FLAG_NONSTANDARD_PRIVATE_PORT = 1 << 5;
const SERVERBROWSING_FLAG_HAS_KEYS = 1 << 6;
const SERVERBROWSING_FLAG_HAS_FULL_RULES = 1 << 7;

class ServerBrowsingClient {
    constructor(queryName, gameName, gameKey) {
        this.queryName = queryName;
        this.gameName = gameName;
        this.gameKey = gameKey;
        this.connectionFlags = 0;
        this.connected = false;
        this.client = null;
        this.cryptStream = null;
        this.headerSent = false;
        this.wanAddress = null;
        this.defaultPort = 0;
        this.packetQueue = [];
    }

    getServerBrowsingHost(gameName) {
        //generate master server id by hashing our gameName
        var hashCode = new Uint32Array(1);

        for (var i = 0; i < gameName.length; i++) {
            hashCode[0] = StdInt.uint32_mul(hashCode[0], SERVERBROWSING_HASH_MULTIPLIER) + gameName.charCodeAt(i);
        }

        hashCode[0] %= SERVERBROWSING_MASTER_SERVERS;

        return util.format(SERVERBROWSING_HOST_FORMAT, gameName, hashCode[0]);
    }

    close() {
        if (this.connected) {
            this.client.destroy();
            this.connected = false;
        }
    }

    connect(callback) {
        if (this.connected) {
            Logger.log(LOGLEVEL_ERROR, "Client already connected - aborting");
            return;
        }

        var host = this.getServerBrowsingHost(this.gameName);

        this.client = new net.Socket();
        this.cryptStream = new CryptStream(this.gameKey);
        var base = this;

        this.client.on("error", function (e) {
            Logger.log(LOGLEVEL_ERROR, "[ServerBrowsing] Client error: %s", e);
            base.close();
        });

        this.client.on("close", function () {
            Logger.log(LOGLEVEL_DEBUG, "[ServerBrowsing] Connection closed.");
            base.connected = false;
        });

        this.client.on("data", function (buf) {
            base.handleData(buf);
        });

        Logger.log(LOGLEVEL_DEBUG, "[ServerBrowsing] Connecting to %s", host);
        this.client.connect(SERVERBROWSING_PORT, host, function () {
            Logger.log(LOGLEVEL_DEBUG, "[ServerBrowsing] Connecting established");
            base.connected = true;
            callback();
        });
    }

    handleData(buf) {
        Logger.log(LOGLEVEL_DEBUG, "[ServerBrowsing] Received %d bytes", buf.length);
        buf = this.cryptStream.decryptWrapper(buf);

        while (buf.length > 0) {
            if (this.packetQueue.length < 1) throw "Unexpected input.";
            //dequeue a packet and let it handle the data
            //as it's TCP we don't have to worry about ordering anything
            var l = this.packetQueue.shift().receive(buf);
            Logger.log(LOGLEVEL_DEBUG, "[ServerBrowsing] Packet processed %d bytes.", l);
            buf = buf.slice(l);
        }
    }

    sendPacket(packet) {
        //check if we already sent a header
        if (!this.headerSent) {
            this.packetQueue.push(new HeaderPacket(this.gameName, this.queryName, this.cryptStream.getChallenge()));
            
            //a new connection always starts with a serverlist request
            //if we want to send a serverlist request - good - if not: send a serverlist request before we send our packet
            //we set SERVERBROWSING_FLAG_NO_SERVER_LIST so we won't receive any servers
            if (packet.id != SERVERBROWSING_ID_LIST_REQUEST) {
                this.packetQueue.push(new ServerListPacket(";", SERVERBROWSING_FLAG_NO_SERVER_LIST, ""));
            }
            this.headerSent = true;
        }

        this.packetQueue.push(packet);

        var toSend = [];
        var len = 0;

        //build data buffers for our packets
        for (var i = 0; i < this.packetQueue.length; i++) {
            if (!this.packetQueue[i].sent) {
                var buf = this.packetQueue[i].compile();
                console.log(buf);
                toSend.push(buf);
                len += buf.length;
                this.packetQueue[i].sent = true;
            }
        }

        //and send everything
        var sz = Buffer.alloc(2);
        sz.writeUInt16BE(len + 2);
        this.client.write(sz);

        for (var j = 0; j < toSend.length; j++) {
            this.client.write(toSend[j]);
        }

        //make sure we PSH right away
        this.client.end();
    }

    getServers(callback) {
        this.sendPacket(new ServerListPacket(function () {
            callback(this.servers);
        },
            ";",
            ["hostname", "gamemode", "mapname", "gamever", "numplayers", "maxplayers", "gametype", "session", "prevsession", "swbregion", "servertype", "password"],
            SERVERBROWSING_FLAG_SEND_FIELDS_FOR_ALL));
        //TODO using SERVERBROWSING_FLAG_SEND_FIELDS_FOR_ALL to get some nice debug output
        //we shouldn't use SERVERBROWSING_FLAG_SEND_FIELDS_FOR_ALL as it overwrties serverflags so we no longer no the servers net config
    }

    static readIPAddress(buf, idx) {
        return buf.readUInt8(idx++) + "." +
            buf.readUInt8(idx++) + "." +
            buf.readUInt8(idx++) + "." +
            buf.readUInt8(idx++);
    }

    static readCString(buf, l) {
        var s = buf.indexOf(0, l.idx);
        if (s < 0) throw "C-Style string is missing terminator";
        var cs = buf.toString('ascii', l.idx, s++);
        l.idx = s;
        return cs;
    }
}