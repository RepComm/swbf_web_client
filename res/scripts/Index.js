/* @author RepComm/Jonathan Crowder ( info@jonathancrowder.com )
 * @started 12/8/2017
 * Build with NotePad++
 * Uses THREE.js ( threejs.org )
*/

var net = require('net');
var dns = require('dns');

var m_Game = {
    //Lets take some variables for our game!
    m_Scene: undefined,
    m_Camera: undefined,
    m_FieldOfView: 75,
    m_NearClip: 0.1,
    m_FarClip: 500,

    //Dealing with the DOM
    m_Renderer: undefined,
    m_Container: undefined,
    m_Rectangle: undefined,

    //Game looping (one for render, one for logic)
    m_LastRenderTick: 0,
    m_LastUpdateTick: 0,
    m_RendersPerSecond: 20,
    m_UpdatesPerSecond: 30,
    m_EnlapsedRenderWait: 0,
    m_EnlapsedUpdateWait: 0,
    m_UpdateDelta       : 0,
    m_TimeBetweenRenders: undefined,
    m_TimeBetweenUpdates: undefined,

    //USES Client.js
    m_Client: undefined,

    //Input management
    inputManager: undefined,

    //Physics
    physicsWorld: undefined,

    //Event fired for every render, called m_RendersPerSecond times a second
    onRenderTick: function () {
        this.m_Renderer.render(this.m_Scene, this.m_Camera);
    },
    //Event fired for every update, called m_UpdatesPerSecond times a second
    onUpdateTick: function () {
        //Physics update
        //var dt = (time - lastTime) / 1000;
        //this.physicsWorld.step(this.m_TimeBetweenUpdates, this.m_EnlapsedUpdateWait, 3);
        //this.m_ClientPlayer.updatePhysics();

        if (this.m_ClientPlayer) {
            if (this.inputManager.keys.a) {
                this.m_ClientPlayer.position.x -= this.m_ClientPlayer.walkSpeed / this.m_UpdateDelta;
            } else if (this.inputManager.keys.d) {
                this.m_ClientPlayer.position.x += this.m_ClientPlayer.walkSpeed / this.m_UpdateDelta;
            }
            if (this.inputManager.keys.w) {
                this.m_ClientPlayer.position.y += this.m_ClientPlayer.walkSpeed / this.m_UpdateDelta;
            } else if (this.inputManager.keys.s) {
                m_Game.m_ClientPlayer.position.y -= this.m_ClientPlayer.walkSpeed / this.m_UpdateDelta;
            }
        }
    },
    onAnimationFrame: function () {
        requestAnimationFrame(() => this.onAnimationFrame());

        this.m_EnlapsedUpdateWait = Date.now() - this.m_LastUpdateTick;
        this.m_UpdateDelta = this.m_EnlapsedUpdateWait / (1000/this.m_UpdatesPerSecond);
        if (this.m_EnlapsedUpdateWait > this.m_TimeBetweenUpdates) {
            this.onUpdateTick();

            this.m_LastUpdateTick = Date.now();
            this.m_EnlapsedUpdateWait = 0;
        }

        this.m_EnlapsedRenderWait = Date.now() - this.m_LastRenderTick;
        if (this.m_EnlapsedRenderWait > this.m_TimeBetweenRenders) {
            this.onRenderTick();

            this.m_LastRenderTick = Date.now();
            this.m_EnlapsedRenderWait = 0;
        }
    },
    onResize: function (evt) {
        this.m_Rectangle = this.m_Container.getBoundingClientRect();
        this.m_Renderer.setSize(this.m_Rectangle.width, this.m_Rectangle.height);
        this.m_Camera.aspect = this.m_Rectangle.width / this.m_Rectangle.height;
        this.m_Camera.updateProjectionMatrix();
    },
    initialize: function (m_ContainerId) {
        //Get <div> container by id or default by default id
        this.m_Container = document.getElementById((m_ContainerId || "render_container_element"));

        if (!this.m_Container) return false;

        this.m_Rectangle = this.m_Container.getBoundingClientRect();
        this.m_Scene = new THREE.Scene();

        this.m_Camera = new THREE.PerspectiveCamera(
            this.m_FieldOfView,
            this.m_Rectangle.width / this.m_Rectangle.height,
            this.m_NearClip,
            this.m_FarClip
        );
        this.m_Camera.position.z = 2;
        this.m_Camera.position.y = -5;
        this.m_Renderer = new THREE.WebGLRenderer();
        this.m_Renderer.setSize(this.m_Rectangle.width, this.m_Rectangle.height);
        this.m_Container.appendChild(this.m_Renderer.domElement);

        this.m_TimeBetweenRenders = 1000 / this.m_RendersPerSecond;
        this.m_TimeBetweenUpdates = 1000 / this.m_UpdatesPerSecond;

        window.addEventListener("resize", (evt) => this.onResize());

        //Initialize input manager
        this.inputManager = new InputManager();
        this.inputManager.init(document.body);

        var directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        this.dlight = directionalLight;
        this.m_Scene.add(directionalLight);
        directionalLight.position.setZ(5);

        //TEST LOADING SWBF TERRAIN FILES
        let builder = new TerrainBuilder();
        console.log(builder);
        let terrainData = builder.fromTERFile("C:/Users/Jonathan/Desktop/Projects/Node/swbf_web_client/res/scripts/io/hoth.ter");
        this.terrainData = terrainData;

        var geometry = new THREE.PlaneGeometry(terrainData.gridDisplayRect.maxX * 2 * terrainData.mapScaleXY,
            terrainData.gridDisplayRect.maxY * 2 * terrainData.mapScaleXY,
            terrainData.gridTotalSize,
            terrainData.gridTotalSize);

        for (var i = 0, l = geometry.vertices.length; i < l; i++) {
            geometry.vertices[i].z = terrainData.heightData[i] * terrainData.heightMapScale;
        }
        geometry.computeVertexNormals();

        let saveGeometryToObj = function (geometry) {
            let s = "";
            for (let i=0; i<geometry.vertices.length; i++) {
                s+= "v " + (geometry.vertices[i].x) + " " +
                geometry.vertices[i].y + " " +
                geometry.vertices[i].z + "\n";
            }
        
            for (let i=0; i<geometry.faces.length; i++) {
        
                s+= "f " + (geometry.faces[i].a+1) + " " +
                (geometry.faces[i].b+1) + " " +
                (geometry.faces[i].c+1);
        
                if (geometry.faces[i].d !== undefined) {
                    s+= " " + (geometry.faces[i].d+1);
                }
                s+= "\n";
            }
        
            return s;
        }
        fs.writeFile("terrain.obj", saveGeometryToObj(geometry), function () {
            console.log("Saved terrain");
        });

        var material = new THREE.MeshPhongMaterial();

        var plane = new THREE.Mesh(geometry, material);
        this.plane = plane;
        this.m_Scene.add(plane);

        //BEGIN PHYSICS STUFF
        /*this.physicsWorld = new CANNON.World({
            gravity: new CANNON.Vec3(0, 0, -9.82)
        });
        this.physicsWorld.broadphase = new CANNON.NaiveBroadphase();*/


        requestAnimationFrame(() => this.onAnimationFrame());

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
m_Game.m_ClientPlayer.spawn(0, 0, 25);
m_Game.m_ClientPlayer.add(m_Game.m_Camera);
m_Game.m_Camera.rotateX(THREE.Math.degToRad(90.0));
/*
var sphereBody = new CANNON.Body({
    mass: 5, // kg 
    position: new CANNON.Vec3(0, 0, 25),
    shape: new CANNON.Sphere(1)
});
m_Game.physicsWorld.addBody(sphereBody);
m_Game.m_ClientPlayer.physicsComponent = sphereBody;
*/
/* 
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
 */