/* @author RepComm/Jonathan Crowder ( info@jonathancrowder.com )
 * @started 12/8/2017
 * Build with NotePad++
 * Uses THREE.js ( threejs.org )
*/

var net = require('net');
var dns = require('dns');

var m_Input = {
    keys:{},
    mouse_left:false,
    mouse_right:false,
    onKeyDown : function (evt) {
        if (evt.key == 'w' || evt.key == 'a' || evt.key == 's' || evt.key == 'd') {
            m_Input.keys[evt.key] = true;
        }
    },
    onKeyUp : function (evt) {
        if (evt.key == 'w' || evt.key == 'a' || evt.key == 's' || evt.key == 'd') {
            m_Input.keys[evt.key] = false;
        }
    }
};

var m_Game = {
    //Lets take some variables for our game!
    m_Scene                 : undefined,
    m_Camera                : undefined,
    m_FieldOfView           : 75,
    m_NearClip              : 0.1,
    m_FarClip               : 500,
    
    //Dealing with the DOM
    m_Renderer              : undefined,
    m_Container             : undefined,
    m_Rectangle             : undefined,
    
    //Game looping (one for render, one for logic)
    m_LastRenderTick        : 0,
    m_LastUpdateTick        : 0,
    m_RendersPerSecond      : 20,
    m_UpdatesPerSecond      : 15,
    m_EnlapsedRenderWait    : 0,
    m_EnlapsedUpdateWait    : 0,
    m_TimeBetweenRenders    : undefined,
    m_TimeBetweenUpdates    : undefined,
    
    //USES Client.js
    m_Client                : undefined,
    
    //Event fired for every render, called m_RendersPerSecond times a second
    onRenderTick     : function () {
        m_Game.m_Renderer.render(m_Game.m_Scene, m_Game.m_Camera);
    },
    //Event fired for every update, called m_UpdatesPerSecond times a second
    onUpdateTick  : function () {
        if (m_Game.m_ClientPlayer) {
            m_Game.m_ClientPlayer.m_Rotation.y += 0.1;
            m_Game.m_ClientPlayer.m_Material.color.r = Math.random();
        }
    },
    onAnimationFrame : function () {
        requestAnimationFrame(m_Game.onAnimationFrame);
        
        m_Game.m_EnlapsedUpdateWait = Date.now() - m_Game.m_LastUpdateTick;
        if (m_Game.m_EnlapsedUpdateWait > m_Game.m_TimeBetweenUpdates) {
            m_Game.onUpdateTick();
            
            m_Game.m_LastUpdateTick = Date.now();
            m_Game.m_EnlapsedUpdateWait = 0;
        }
        
        m_Game.m_EnlapsedRenderWait = Date.now() - m_Game.m_LastRenderTick;
        if (m_Game.m_EnlapsedRenderWait > m_Game.m_TimeBetweenRenders) {
            m_Game.onRenderTick();
            
            m_Game.m_LastRenderTick = Date.now();
            m_Game.m_EnlapsedRenderWait = 0;
        }
    },
    onResize         : function (evt) {
        m_Game.m_Rectangle = m_Game.m_Container.getBoundingClientRect();
        m_Game.m_Renderer.setSize( m_Game.m_Rectangle.width, m_Game.m_Rectangle.height );
        m_Game.m_Camera.aspect = m_Game.m_Rectangle.width/m_Game.m_Rectangle.height;
        m_Game.m_Camera.updateProjectionMatrix();
    },
    initialize       : function (m_ContainerId) {
        //Get <div> container by id or default by default id
        this.m_Container    = document.getElementById( (m_ContainerId || "render_container_element") );
        
        if (!this.m_Container) return false;
        
        this.m_Rectangle    = this.m_Container.getBoundingClientRect();
        this.m_Scene        = new THREE.Scene();
        
        this.m_Camera       = new THREE.PerspectiveCamera(
            this.m_FieldOfView,
            this.m_Rectangle.width / this.m_Rectangle.height,
            this.m_NearClip,
            this.m_FarClip
        );
        this.m_Camera.position.z = 5;
        this.m_Renderer     = new THREE.WebGLRenderer();
        this.m_Renderer.setSize( this.m_Rectangle.width, this.m_Rectangle.height );
        this.m_Container.appendChild( this.m_Renderer.domElement );
        
        this.m_TimeBetweenRenders = 1000 / this.m_RendersPerSecond;
        this.m_TimeBetweenUpdates = 1000 / this.m_UpdatesPerSecond;
        
        this.m_Container.addEventListener("keydown", m_Input.onKeyDown);
        
        window.addEventListener("resize", this.onResize);
        
        requestAnimationFrame (this.onAnimationFrame);
        
        return true;
    }
};

var m_ContainerId = "render_container_element";

if (m_Game.initialize(m_ContainerId)) {
    console.log("Game initialized just fine in element " + m_ContainerId + " !");
} else {
    console.log("Game could not initialize, " + m_ContainerId + " isn't an element?");
}

m_Game.m_ClientPlayer = new Player(m_Game);

console.log("Lets retrieve the swbfspy serverlist!");
console.log("Contacting DNS for ip of swbfspy.com");

dns.lookup('swbfspy.com', function(err, result) {
    console.log("DNS says swbfspy.com is " + result);
    console.log("Lets try to connect to " + result + ":" + 28910);
    var tcpClient = new net.Socket();

    tcpClient.on("data", function (data) {
        console.log("Got response. Lets close the connection, and decode it the data");
        tcpClient.destroy();
        //I'm not 100%, but I think packets for swbf are little endian, for 32bit compat
        //Read unsigned integer (little endian) at beginning, should be packet length..
        //Need to decode ListRequestPacket.vb first, which is what I'm doing now!
        //This is the current place where we're at in deving this!
        console.log("Message length " + data.readUInt16LE(0));
        console.log("Compared to raw data length " + data.byteLength);
    });

    tcpClient.connect(28910, result, function () {
        console.log("Connected, now lets send them the serverlist request");
        tcpClient.write(Buffer.from(client_constants.GS_CL_REQUEST_SERVERLIST));
    });
});
