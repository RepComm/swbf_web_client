class ServerListPacket {

    //TODO create packet base class 
    constructor(callback, filter, params, flags) {
        this.filter = filter;
        this.flags = flags;
        this.sendParams = params;
        this.receiveParams = [];
        this.uniqueValues = 0;
        this.id = SERVERBROWSING_ID_LIST_REQUEST;
        this.sent = false;
        this.servers = [];
        this.callback = callback;
        this.defaultPort = 0;
    }

    compile() {
        var paramStr = "\\" + this.sendParams.join("\\");
        var buf = Buffer.alloc(this.filter.length + 1 + paramStr.length + 1 + 4)
        var idx = 0;

        //SQL filter statement (ignored by GM)
        buf.write(this.filter);
        idx += this.filter.length;
        buf.writeUInt8(0, idx++);

        //tells the MS which params we want
        buf.write(paramStr, idx);
        idx += paramStr.length;
        buf.writeUInt8(0, idx++);

        //flags (p.e. we could use flags to tell the server that we want a detailed list)
        buf.writeInt32BE(this.flags, idx);

        return buf;
    }

    receive(buf) {
        var l = { idx: 0 };

        this.defaultPort = buf.readUInt16BE(l.idx);
        l.idx += 2;

        var paramCount = buf.readUInt8(l.idx++);

        for (var i = 0; i < paramCount; i++) {
            this.receiveParams.push({ type: buf.readUInt8(l.idx++), value: ServerBrowsingClient.readCString(buf, l) });
        }

        this.uniqueValues = buf.readUInt8(l.idx++); //not used for swbf, GM doesn't implement this
        Logger.log(LOGLEVEL_DEBUG, "[ServerBrowsing] List has %d parameters and %d unique values", this.receiveParams.length, this.uniqueValues);

        var server;
        while (!(server = this.readServer(buf, l)).isLast()) {
            this.servers.push(server);
        }

        Logger.log(LOGLEVEL_DEBUG, "[ServerBrowsing] Received a list containing %d servers.", this.servers.length);

        this.callback();
        return l.idx;
    }

    readServer(buf, l) {
        var flags = buf.readUInt8(l.idx++);

        var ipa = ServerBrowsingClient.readIPAddress(buf, l.idx);
        l.idx += 4;

        var port = this.defaultPort;
        if ((flags & SERVERBROWSING_FLAG_PRIVATE_IP) > 0) {
            port = buf.readUInt16BE(l.idx);
            l.idx += 2;
        }

        var server = new GameServer(flags, ipa, port);

        if ((flags & SERVERBROWSING_FLAG_PRIVATE_IP) > 0) {
            server.lanAddresses.push(ServerBrowsingClient.readIPAddress(buf, l.idx));
            l.idx += 4;
        }

        if ((flags & SERVERBROWSING_FLAG_NONSTANDARD_PRIVATE_PORT) > 0) {
            server.lanPort = buf.readUInt16BE(l.idx);
            l.idx += 2;
        } else {
            server.lanPort = this.defaultPort;
        }

        if ((flags & SERVERBROWSING_FLAG_ICMP_IP) > 0) {
            server.icmpAddress = ServerBrowsingClient.readIPAddress(buf, l.idx);
            l.idx += 4;
        }

        if ((flags & SERVERBROWSING_FLAG_HAS_KEYS) > 0) {
            for (var i = 0; i < this.receiveParams.length; i++) {
                server[this.receiveParams[i].value] = {
                    type: buf.readUInt8(l.idx++),
                    value: ServerBrowsingClient.readCString(buf, l)
                };
            }
        }
        return server;
    }

}