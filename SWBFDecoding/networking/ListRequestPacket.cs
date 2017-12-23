//Main Listrequest & Cryptheader-initialisation packet
//JW "LeKeks" 05/2014
using System.Reflection;
using System.Net;

public class ListRequestPacket : GamespyTcpPacket {

    public string ParameterArray;
    public string Filter;
    public byte Options;

    public ListRequestPacket(GamespyClient client, byte[] data) {
        base(client, data);
        this.UseCipher = true; //turn on encryption
        //https://github.com/derkalle4/gamespy-masterserver/blob/68b075cd4b667df42aecb2e079b73c013f5979c2/GamespyMasterserver/linkbase/packets/PacketBase.vb
        //SEE FetchString function
        this.Filter = FetchString(this.data);//Fetch the filter-string
        this.ParameterArray = Split(FetchString(this.data), "\\"); //Get the requested params
        //TODO: might be casted to int32, however doesn't match std.C - style int32 - format(LE ?)
        this.Options = this.data(bytesParsed + 3); //BitConverter.ToInt32(Me.data, Me.bytesParsed)
    }

    override
    public void ManageData() {
        this.client.send(this);
    }

    private byte[] BuildServerArray() {
        //TODO: Implement Serverside filtering
        byte[] buffer = { };

        //Header
        ConcatArray(this.client.RemoteIPEP.Address.GetAddressBytes(), buffer);
        //ConcatArray({25, 100}, buffer) 'TODO: fetch port from db
        ConcatArray(BuildInvertedUInt16Array(6500), buffer);

        if (this.Options != GS_FLAG_NO_SERVER_LIST) { //Me.ParameterArray.Count > 1 Then
            ConcatArray(new byte[] { this.ParameterArray.Length - 1, 0 }, buffer);
            ConcatArray(this.BuildParameterArray(), buffer);

            if (this.Options = GS_FLAG_SEND_GROUPS) {
                List<GamespyServerGroup> groups = this.client.server.MySQL.GetServerGroups(Me.client.GameName);
                Console.WriteLine("Fetched active groups from database.");
                foreach (GamespyServerGroup group in groups) {
                    this.AttachGroup(group, buffer);
                }
            } else {
                List<GamespyServer> servers = this.client.server.MySQL.GetServers(this.client.GameName, this.client.server.Config.GameserverTimeout);
                Logger.Log("Fetched active servers from database.");
                foreach (GamespyGameserver server in servers) {
                    if (server.ChallengeOK == false) continue; //don't list unauthenticated servers
                    this.AttachServer(server, buffer);
                }
            }

            ConcatArray(new byte[] { 0x0, 0xFF, 0xFF, 0xFF, 0xFF }, buffer); //set last bytes, \xFF\xFF\xFF\xFF indicates last server
        } else {
            Console.WriteLine("Sending header to ");
        }

        return buffer;
    }

    private void AttachGroup(GamespyServerGroup group, byte[] buffer) {
        ConcatArray(new byte[] { GS_FLAG_HAS_KEYS }, buffer);

        byte[] gid = BitConverter.GetBytes(group.Id);
        Array.Reverse(gid); //ntohl
        ConcatArray(gid, buffer);

        ConcatArray(new byte[] { 255 }, buffer); //Attach a delimeter indicating that there's new data here
        for (int i = 1; i < this.ParameterArray.Length - 1; i++) { //Try to attach every desired param
            string val = group.GetValue(this.ParameterArray(i));
            this.PushString(buffer, val, (i = this.ParameterArray.Length - 1));
        }
    }

    private void AttachServer(GamespyGameserver server, byte[] buffer) {
        if (server.PortClosed && this.ParameterArray.Length < 2) return;
        byte serverFlags = (byte)0;
        IPAddress ip0 = null;

        bool hasLocalIP = IPAddress.TryParse(server.GetValue("localip0"), ip0);

        ToggleFlag(serverFlags, GS_FLAG_CONNECT_NEGOTIATE_FLAG);
        ToggleFlag(serverFlags, GS_FLAG_NONSTANDARD_PORT);

        if (this.Options == GS_FLAG_SEND_FIELDS_FOR_ALL) {
            ToggleFlag(serverFlags, GS_FLAG_PRIVATE_IP);
            ToggleFlag(serverFlags, GS_FLAG_NONSTANDARD_PRIVATE_PORT);
            ToggleFlag(serverFlags, GS_FLAG_HAS_KEYS);
            ToggleFlag(serverFlags, GS_FLAG_ICMP_IP);
        } else {
            //TODO: fix
            //GS_FLAG_NONSTANDARD_PRIVATE_PORT needed for PeerchatRoomMangle!
            if (server.IsNatted && !server.PortCosed && this.Options != 4) { //85
                ToggleFlag(serverFlags, GS_FLAG_PRIVATE_IP);
                ToggleFlag(serverFlags, GS_FLAG_HAS_KEYS);
                ToggleFlag(serverFlags, GS_FLAG_UNSOLICITED_UDP);

            } else if (server.PortClosed) { //126
                ToggleFlag(serverFlags, GS_FLAG_PRIVATE_IP);
                ToggleFlag(serverFlags, GS_FLAG_NONSTANDARD_PRIVATE_PORT);
                ToggleFlag(serverFlags, GS_FLAG_HAS_KEYS);
                ToggleFlag(serverFlags, GS_FLAG_ICMP_IP);

            } else { //21
                ToggleFlag(serverFlags, GS_FLAG_UNSOLICITED_UDP);
            }

        }

        //Don't accept direct Querys for homeservers, they'll only slow down the SBQEngine 
        ConcatArray(new byte[] { serverFlags }, buffer);

        //TODO: add compatibility for peerchat-lobbys
        //This implementation is critical: changing to the localip will cause wrong hash-calculations
        //for the peerchat lobby-system -> maybe detect peerchat games
        if (server.PublicIP == this.client.RemoteIPEP.Address.ToString() && server.IsNatted && !server.PortClosed && this.hasLocalIP) {
            ConcatArray(ip0.GetAddressBytes(), buffer);

            //it seems to depend on the game which port is used
            if (server.HasKey("localport")) {
                ConcatArray(ArrayFunctions.BuildInvertedUInt16Array(UInt16.Parse(server.GetValue("localport"))), buffer);
            } else {
                ConcatArray(ArrayFunctions.BuildInvertedUInt16Array(UInt16.Parse(server.HostPort)), buffer);
            }

        } else {
            ConcatArray(IPAddress.Parse(server.PublicIP).GetAddressBytes, buffer); //IP-Address
            ConcatArray(ArrayFunctions.BuildInvertedUInt16Array(UInt16.Parse(server.PublicPort)), buffer); //Port
        }

        if (serverFlags != null && GS_FLAG_PRIVATE_IP) {//Attach natneg-params
            if (!hasLocalIP) return;
            ushort lport = server.PublicPort;
            //UInt16.TryParse(server.GetValue("localport"), lport)
            ConcatArray(ip0.GetAddressBytes(), buffer);
            ConcatArray(ArrayFunctions.BuildInvertedUInt16Array(lport), buffer);
        }

        if (serverFlags != null && GS_FLAG_ICMP_IP) {
            ConcatArray(Net.IPAddress.Parse(server.PublicIP).GetAddressBytes, buffer);
        }

        //Attaching server details (for servers which aren't queried directly)
        if (serverFlags != null && GS_FLAG_HAS_KEYS) {
            ConcatArray(new byte[] { 255 }, buffer); //Attach a delimeter indicating that there's new data here
            for (int i = 1; i < this.ParameterArray.Length - 1; i++) { //Try to attach every desired param
                string val = server.GetValue(this.ParameterArray(i));
                this.PushString(buffer, val, (i = this.ParameterArray.Length - 1));
            }
        }

    }

    private void ToggleFlag(byte dest, byte flag) {
        dest = (dest | flag);
    }

    private PushString(byte[] data, string str, bool isLast = false) {
        ConcatArray(GetBytes(str), data);
        if (isLast) {
            ConcatArray(new byte[] { 0 }, data); //don't attach 0xFF on the last one
        } else {
            ConcatArray(new byte[] { 0, 0xFF }, data); //0xFF: delimeter
        }
    }

    override
    public byte[] CompileResponse() {
        Console.WriteLine("Sending Serverlist");
        byte[] buffer = BuildServerArray(); //Write serverlist into a buffer
        return buffer;
    }

    private byte[] BuildParameterArray() {
        byte[] buffer = { };
        foreach (string Str in ParameterArray) {
            if (Str == null || Str.Equals("")) { //Don't attach empty params
                ConcatArray(GetBytes(Str), buffer);
                ConcatArray(new byte[] { 0, 0 }, buffer); //Delimeter is \x0\x0 for this one
            }
        }
        return buffer;
    }
}