
//In future, maybe use https://github.com/component/emitter for events?
//Will have to remove module references though

function Player (m_Game) {
    this.m_Name = "PLAYER 1";
    this.m_Alive = false;
    this.m_Health = 0.0;
    
    this.m_Geometry = new THREE.CylinderGeometry(1, 1, 2, 8);
    this.m_Material = new THREE.MeshBasicMaterial( { color: 0x7777ff } );
    this.m_Mesh = new THREE.Mesh( this.m_Geometry, this.m_Material );
    m_Game.m_Scene.add( this.m_Mesh );
    
    this.m_Position = this.m_Mesh.position;
    this.m_Rotation = this.m_Mesh.rotation;
}

Player.prototype.spawn = function (m_X, m_Y, m_Z) {
    this.m_Alive = true;
    this.m_Mesh.visible = true;
}

Player.prototype.setName = function (m_Name) {
    this.m_Name = m_Name;
}

Player.prototype.getName = function () {
    return this.m_Name;
}

Player.prototype.die = function () {
    this.m_Alive = false;
    this.m_Mesh.visible = false;
}

Player.prototype.isAlive = function () {
    return this.m_Alive;
}

Player.prototype.setHealth = function (m_Health) {
    this.m_Health = m_Health;
}

Player.prototype.addHealth = function (m_ToAdd) {
    this.m_Health += m_ToAdd;
}