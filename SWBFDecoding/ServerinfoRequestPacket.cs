using System;
using System.Net;

public class ServerinfoRequestPacket : GamespyTcpPacket {

    public ServerinfoRequestPacket(GamespyClient client, byte[] data) {
        base(client, data);
        //Turn on encryption
        this.UseCipher = true;
    }

    GamespyGameserver gServer = null; //used to store the gameserver
    IPEndPoint queryIPEP = null; //the gameserver's IPEP0
    /* CONVERTED FROM ArrayFunctions.vb
     * Appends SOURCE array to DEST array
    */
    public static void ConcatArray(byte[] source, byte[] dest) {
        int newSize = dest.Length + source.Length;
        int oldSize = dest.Length;
        Array.Resize(dest, newSize);
        Array.Copy(source, 0, dest, oldSize, source.Length);
    }

    /* CONVERTED FROM ArrayFunctions.vb
     * Appends SOURCE array to DEST array
     * Appends a separator byte to the end of all that
    */
    public static void ConcatArray(byte[] source, byte[] dest, byte separator) {
        int newSize = dest.Length + source.Length + 1;
        int oldSize = dest.Length;
        Array.Resize(dest, newSize);
        Array.Copy(source, 0, dest, oldSize, source.Length);
        dest[dest.Length - 1] = separator;
    }

    //CONVERTED FROM ArrayFunctions.vb
    //Unsigned (always positive) 'short's value in bytes
    public static byte[] BuildInvertedUInt16Array(UInt16 value) {
        byte[] buffer = BitConverter.GetBytes(value);
        Array.Reverse(buffer);
        return buffer;
    }

    public UInt16 GetInvertedUInt16(byte[] buffer, int offset) {
        byte[] buf = { buffer[offset + 1], buffer[offset] };
        return BitConverter.ToUInt16(buf, 0);
    }

    public IPEndPoint GetIPEndPointFromByteArray(byte[] buffer, int offset)
    {
        byte[] queryIP = new byte[4];
        Array.Copy(buffer, offset, queryIP, 0, 4);
        return new IPEndPoint(new IPAddress(queryIP), GetInvertedUInt16(buffer, offset + 4));
    }

    override
    public void ManageData() {
        //Verify there's enough data to fetch the IPEP
        if (this.data.Length - this.bytesParsed < 6) { return; }

        //Get the server's public IPEP
        queryIPEP = GetIPEndPointFromByteArray(data, this.bytesParsed);
        this.bytesParsed += 6;
        Console.WriteLine("Requested Information about " + queryIPEP.ToString());

        //Fetch the gameserver from the database
        this.gServer = this.client.server.MySQL.FetchServerByIPEP(queryIPEP);
        if (this.gServer == null) {
            return; //TODO: throw some fancy error message
        }
        //Send response
        this.client.send(this);
    }

    override
    public byte[] CompileResponse() {
        //https://github.com/derkalle4/gamespy-masterserver/blob/master/GamespyMasterserver/constants.vb
        byte[] buf = { 0, 0, GS_MS_SERVER_CMD_PUSHSERVER, 0 }; //2 bytes for the len, cmd, 1 for the flags

        //Setting up the bitwise-flags:
        byte flags = (byte)0;

        if (gServer.PortClosed) {
            //restrictive NAT/FW -> use natneg
            this.ToggleFlag(flags, GS_FLAG_CONNECT_NEGOTIATE_FLAG);

            //check if there's indeed some NAT or just a FW:
            if (gServer.IsNatted) {
                this.ToggleFlag(flags, GS_FLAG_PRIVATE_IP);
                this.ToggleFlag(flags, GS_FLAG_NONSTANDARD_PRIVATE_PORT);
            }
        }

        this.ToggleFlag(flags, GS_FLAG_ICMP_IP); //Allow ICMP-Ping
        this.ToggleFlag(flags, GS_FLAG_NONSTANDARD_PORT); //Just send the port every time
        this.ToggleFlag(flags, GS_FLAG_HAS_FULL_RULES); //We're sending everything we know

        //WITH gServer
        //Attach requested IPEP

        ConcatArray(queryIPEP.Address.GetAddressBytes(), buf);
        ConcatArray(BuildInvertedUInt16Array(queryIPEP.Port), buf);

        if (gServer.PortClosed) {
            IPAddress ip0 = null;

            //Attaching the public ip for "natneg w/o NAT" (firewall bypass)
            if (!IPAddress.TryParse(gServer.GetValue("localip0"), ip0)) {
                ip0 = IPAddress.Parse(gServer.PublicIP);
            }

            //Attach local IPEP
            ConcatArray(ip0.GetAddressBytes, buf);
            ConcatArray(BuildInvertedUInt16Array(UInt16.Parse(gServer.HostPort)), buf);
        }

        //Attach ICMP IP
        ConcatArray(queryIPEP.Address.GetAddressBytes(), buf);
        //END WITH

        buf[3] = flags; //Assign the flags at the offset we've already allocated earlier

        this.AttachFullRuleSet(buf); //NEED TO DIG INTO PARENT CLASS FOR THIS

        //Attach the packet lenght
        Array.Copy(BuildInvertedUInt16Array(buf.Length), buf, 2);

        //Dim s As String = BuildNiceString(buf)
        return buf;
    }

    private byte AttachFullRuleSet(byte[] buf) {
        //Get the players on that server
        ElementTable pt = this.client.server.MySQL.FetchPlayers(gServer.InternalId, this.client.server.Config.PlayerTimeout);
        //Push the playertable onto the serverparams
        if (pt != null) { gServer.DynamicStorage.AttachDataTable(pt); }
        
        //Attach every server-property
        foreach (DataPair field in gServer.DynamicStorage.FieldList) {
            ConcatArray(ArrayFunctions.GetBytes(field.varName), buf, 0);
            ConcatArray(ArrayFunctions.GetBytes(field.value), buf, 0);
        }
    }

    private void ToggleFlag(byte d, byte f)
    {
        //Just a bitwise or to toggle bits
        d = (d | f);
    }

}