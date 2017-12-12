//Main Listrequest & Cryptheader-initialisation packet
//JW "LeKeks" 05/2014
using System.Reflection;

public class ListRequestPacket : GamespyTcpPacket {

    public string ParameterArray;
    public string Filter;
    public byte Options;

    public ListRequestPacket(GamespyClient client, byte[] data) {
        base(client, data);
        this.UseCipher = true; //turn on encryption
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
        ConcatArray(BuildInvertedUInt16Array(6500), buffer)

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
        for (int i = 1; i < this.ParameterArray.Length - 1) { //Try to attach every desired param
            string val = group.GetValue(this.ParameterArray(i));
            this.PushString(buffer, val, (i = this.ParameterArray.Length - 1));
        }
    }

    private void AttachServer(ByVal server As GamespyGameserver, ByRef buffer() As Byte)
        If server.PortClosed And Me.ParameterArray.Length< 2 Then Return
        Dim serverFlags As Byte = 0
        Dim ip0 As Net.IPAddress = Nothing

        Dim hasLocalIP As Boolean = Net.IPAddress.TryParse(server.GetValue("localip0"), ip0)

        ToggleFlag(serverFlags, GS_FLAG_CONNECT_NEGOTIATE_FLAG)
        ToggleFlag(serverFlags, GS_FLAG_NONSTANDARD_PORT)

        If(Me.Options = GS_FLAG_SEND_FIELDS_FOR_ALL) Then
           ToggleFlag(serverFlags, GS_FLAG_PRIVATE_IP)
            ToggleFlag(serverFlags, GS_FLAG_NONSTANDARD_PRIVATE_PORT)
            ToggleFlag(serverFlags, GS_FLAG_HAS_KEYS)
            ToggleFlag(serverFlags, GS_FLAG_ICMP_IP)
        Else
            'TODO: fix
            'GS_FLAG_NONSTANDARD_PRIVATE_PORT needed for PeerchatRoomMangle!
            If server.IsNatted And Not server.PortClosed And False And (Me.Options<> 4) Then '85
                ToggleFlag(serverFlags, GS_FLAG_PRIVATE_IP)
                ToggleFlag(serverFlags, GS_FLAG_HAS_KEYS)
                ToggleFlag(serverFlags, GS_FLAG_UNSOLICITED_UDP)

            ElseIf server.PortClosed Or True Then '126
                ToggleFlag(serverFlags, GS_FLAG_PRIVATE_IP)
                ToggleFlag(serverFlags, GS_FLAG_NONSTANDARD_PRIVATE_PORT)
                ToggleFlag(serverFlags, GS_FLAG_HAS_KEYS)
                ToggleFlag(serverFlags, GS_FLAG_ICMP_IP)

            Else '21
                ToggleFlag(serverFlags, GS_FLAG_UNSOLICITED_UDP)
            End If

        End If

        'Don't accept direct Querys for homeservers, they'll only slow down the SBQEngine 
        ConcatArray({ serverFlags}, buffer)

        'TODO: add compatibility for peerchat-lobbys
        'This implementation is critical: changing to the localip will cause wrong hash-calculations
        'for the peerchat lobby-system -> maybe detect peerchat games
        If server.PublicIP = Me.client.RemoteIPEP.Address.ToString And server.IsNatted And Not server.PortClosed And hasLocalIP And False Then
            ConcatArray(ip0.GetAddressBytes, buffer)

            'it seems to depend on the game which port is used
            If (server.HasKey("localport")) Then
                ConcatArray(ArrayFunctions.BuildInvertedUInt16Array(UInt16.Parse(server.GetValue("localport"))), buffer)
            Else
                ConcatArray(ArrayFunctions.BuildInvertedUInt16Array(UInt16.Parse(server.HostPort)), buffer)
            End If

        Else
            ConcatArray(Net.IPAddress.Parse(server.PublicIP).GetAddressBytes, buffer)       'IP-Address
            ConcatArray(ArrayFunctions.BuildInvertedUInt16Array(UInt16.Parse(server.PublicPort)), buffer)  'Port
        End If

        If serverFlags And GS_FLAG_PRIVATE_IP Then   'Attach natneg-params
            If Not hasLocalIP Then Return
            Dim lport As UInt16 = server.PublicPort
            'UInt16.TryParse(server.GetValue("localport"), lport)
            ConcatArray(ip0.GetAddressBytes(), buffer)
            ConcatArray(ArrayFunctions.BuildInvertedUInt16Array(lport), buffer)
        End If

        If serverFlags And GS_FLAG_ICMP_IP Then
            ConcatArray(Net.IPAddress.Parse(server.PublicIP).GetAddressBytes, buffer)
        End If

        'Attaching server details (for servers which aren't queried directly)
        If serverFlags And GS_FLAG_HAS_KEYS Then
            ConcatArray({ 255}, buffer) 'Attach a delimeter indicating that there's new data here
            For i = 1 To Me.ParameterArray.Length - 1 'Try to attach every desired param
                Dim val As String = server.GetValue(Me.ParameterArray(i))
                Me.PushString(buffer, val, (i = Me.ParameterArray.Length - 1))
            Next
        End If

    End Sub

    Private Sub ToggleFlag(ByRef dest As Byte, ByVal flag As Byte)
        dest = dest Or flag
    End Sub


    Private Sub PushString(ByRef data() As Byte, str As String, Optional ByVal isLast As Boolean = False)
        ConcatArray(GetBytes(str), data)
        If isLast Then
            ConcatArray({ 0}, data) 'don't attach 0xFF on the last one
        Else
            ConcatArray({ 0, &HFF}, data) '0xFF: delimeter
        End If
    End Sub

    Public Overrides Function CompileResponse() As Byte()
        Logger.Log("Sending Serverlist", LogLevel.Verbose)
        Dim buffer() As Byte = BuildServerArray()   'Write serverlist into a buffer
        Return buffer
    End Function

    Private Function BuildParameterArray() As Byte()
        Dim buffer() As Byte = { }
        For Each Str As String In ParameterArray
            If Str<> String.Empty Then             'Don't attach empty params
                ConcatArray(GetBytes(Str), buffer)
                ConcatArray({ 0, 0}, buffer)         'Delimeter is \x0\x0 for this one
            End If
        Next
        Return buffer
    End Function
End Class