
//In future, maybe use https://github.com/component/emitter for events?
//Will have to remove module references though
//We're using some ES6 functionality

class Player extends THREE.Group {
    constructor (game) {
        super();
        this.m_Name = "PLAYER 1";
        this.m_Alive = false;
        this.m_Health = 0.0;
        this.m_TextDrawSize = 60;
        this.m_TextDrawScale = 0.25;
        this.m_Geometry = new THREE.CylinderGeometry(1, 1, 2, 8);
        this.m_Material = new THREE.MeshBasicMaterial( { color: 0x7777ff } );
        this.m_Mesh = new THREE.Mesh( this.m_Geometry, this.m_Material );
        game.m_Scene.add( this );

        this.add(this.m_Mesh);

        var textCanvas = document.createElement('canvas');
        textCanvas.width = this.m_Name.length * 60;
        textCanvas.height = 60;
        var ctx = textCanvas.getContext("2d");
        ctx.font = this.m_TextDrawSize + "px Arial";
        ctx.fillStyle = "rgba(255, 255, 255, 1.0)";
        ctx.fillText(this.m_Name, 0, 63, 256);

        var textMap = new THREE.Texture(textCanvas);
        textMap.needsUpdate = true;
        let textMat = new THREE.SpriteMaterial( { map: textMap, color: 0xffffff, depthTest: false} );
        this.m_NameTextSprite = new THREE.Sprite(textMat);
        this.m_NameTextSprite.scale.set( this.m_Name.length * this.m_TextDrawScale, this.m_TextDrawScale, 1 );
        this.add(this.m_NameTextSprite);
    }
    
    spawn (m_X, m_Y, m_Z) {
        this.position.setX(m_X);
        this.position.setY(m_Y);
        this.position.setZ(m_Z);
        
        this.m_Alive = true;
        this.visible = true;
    }
    
    setName (m_Name) {
        this.m_Name = m_Name;
    }
    
    getName (m_Name) {
        return this.m_Name;
    }
    
    die () {
        this.m_Alive = false;
        this.visible = false;
    }
    
    isAlive () {
        return this.m_Alive;
    }
    
    setHealth () {
        this.m_Health = m_Health;
    }
    
    addHealth (m_ToAdd) {
        this.m_Health += m_ToAdd;
    }
}
