
/** MSHLoader - For managing Zero Engine 3d model file format (SWBFI and II 2004/2005 game engines)
 * @usage let loader = new MSHLoader();
 * @authors Jonathan Crowder, <contributors append here>
 * @note Uses Node js file system and buffers (which are better than browser implementations of byte reading)
 */

const fs = require("fs");

function tag(buffer, offset) {
    return buffer.toString("utf8", offset, offset+4);
}

function MSHLoader () {
    this.reachedEofSafely = false;
    this.finalResult = {type:"HEDR"};
    
    /** MSHLoader.prototype.readTag function
     * Reads the given tag and all of its children
     * Function reused as tree parsing scheme (MSH data is in tree format)
     */
    this.readTag = function (parent, buf, start, leveldeep = 0, levelwidth = 0) {
        var currentOffset = start;
        
        var tagName = tag(buf, currentOffset);
        currentOffset+=4;
        
        var tagSize = buf.readInt32LE(currentOffset);
        currentOffset+=4;
        
        /*//DEBUG
        if (parent) {
            console.log(currentOffset + " " + parent.type + " -> " + tagName + " with " + tagSize + " more bytes following");
        } else {
            console.log(currentOffset + " Top level -> " + tagName);
        }
        //END DEBUG*/
        
        switch (tagName) {
            case "HEDR":
                parent = this.finalResult;
                parent.contentSize = tagSize;
                var childCount = 0;
                leveldeep++;
                for (var i=0; i<tagSize;) {
                    currentOffset += this.readTag(parent, buf, currentOffset, leveldeep, childCount);
                    childCount++;
                }
                break;
            case "MSH2":
                var childCount = 0;
                leveldeep++;
                var p = parent[tagName + "_" + levelwidth] = {
                    type:tagName,
                    contentSize:tagSize
                };
                for (var i=currentOffset-start; i<tagSize;i=currentOffset) {
                    currentOffset += this.readTag(p, buf, currentOffset, leveldeep, childCount);
                    childCount++;
                }
                break;
            case "SINF":
                var childCount = 0;
                leveldeep++;
                var p = parent[tagName] = {
                    type:tagName,
                    contentSize:tagSize
                };
                for (var i=currentOffset-start; i<tagSize;i=currentOffset) {
                    currentOffset += this.readTag(p, buf, currentOffset, leveldeep, childCount);
                    childCount++;
                }
                break;
            case "NAME":
                //var str = buf.toString("utf8", currentOffset, currentOffset+tagSize);
                var str = "";
                var trim = buf.slice(currentOffset, currentOffset+tagSize);
                for (let i=0; i<trim.length; i++) {
                    if (trim[i] == 0x0) { //Forget about padded 0x0 (null) bytes
                        break;
                    }
                    str+=String.fromCharCode(trim[i]);
                }
                
                parent[tagName] = str;
                currentOffset+=tagSize;
                currentOffset +=this.readTag(parent, buf, currentOffset, leveldeep, childCount);
                break;
            case "FRAM":
                var c = parent[tagName] = {
                    type:tagName,
                    begin:0,
                    end:0,
                    fps:1.0
                };
                
                c.begin = buf.readInt32LE(currentOffset);
                currentOffset+=4;
                c.end = buf.readInt32LE(currentOffset);
                currentOffset+=4;
                c.fps = buf.readFloatLE(currentOffset);
                currentOffset+=4;
                
                currentOffset +=this.readTag(parent, buf, currentOffset, leveldeep, childCount);
                break;
            case "BBOX":
                var c = parent[tagName] = {
                    type:tagName,
                    rotation:{x:0.0, y:0.0, z:0.0, w:1.0},
                    center:{x:0.0, y:0.0, z:0.0},
                    dimension:{w:0.0, h:0.0, d:0.0},
                    boundingSphereRadius:0.0
                };
                
                c.rotation.x = buf.readFloatLE(currentOffset);
                currentOffset+=4;
                c.rotation.y = buf.readFloatLE(currentOffset);
                currentOffset+=4;
                c.rotation.z = buf.readFloatLE(currentOffset);
                currentOffset+=4;
                c.rotation.w = buf.readFloatLE(currentOffset);
                currentOffset+=4;
                
                c.center.x = buf.readFloatLE(currentOffset);
                currentOffset+=4;
                c.center.y = buf.readFloatLE(currentOffset);
                currentOffset+=4;
                c.center.z = buf.readFloatLE(currentOffset);
                currentOffset+=4;
                
                c.dimension.w = buf.readFloatLE(currentOffset);
                currentOffset+=4;
                c.dimension.h = buf.readFloatLE(currentOffset);
                currentOffset+=4;
                c.dimension.d = buf.readFloatLE(currentOffset);
                currentOffset+=4;
                
                c.boundingSphereRadius.w = buf.readFloatLE(currentOffset);
                currentOffset+=4;
                
                currentOffset +=this.readTag(parent, buf, currentOffset, leveldeep, childCount);
                break;
            case "CAMR":
                var childCount = 0;
                leveldeep++;
                var p = parent[tagName] = {
                    type:tagName,
                    contentSize:tagSize
                };
                for (var i=currentOffset-start; i<tagSize;i=currentOffset) {
                    currentOffset += this.readTag(p, buf, currentOffset, leveldeep, childCount);
                    childCount++;
                }
                break;
            case "DATA":
                console.log(leveldeep + " " + parent.type + " > " + tagName);
                switch(parent.type) {
                    case "CAMR":
                        var c = parent[tagName] = {
                            type:tagName,
                            floats:[]
                        };
                        //UNDOCUMENTED VALUES, we'll have to use XSI to mess with them until we get it later
                        c.floats[0] = buf.readFloatLE(currentOffset); currentOffset+=4;
                        c.floats[1] = buf.readFloatLE(currentOffset); currentOffset+=4;
                        c.floats[2] = buf.readFloatLE(currentOffset); currentOffset+=4;
                        
                        c.floats[3] = buf.readFloatLE(currentOffset); currentOffset+=4;
                        c.floats[4] = buf.readFloatLE(currentOffset); currentOffset+=4;
                        c.floats[5] = buf.readFloatLE(currentOffset); currentOffset+=4;
                        
                        c.floats[6] = buf.readFloatLE(currentOffset); currentOffset+=4;
                        c.floats[7] = buf.readFloatLE(currentOffset); currentOffset+=4;
                        c.near = buf.readFloatLE(currentOffset); currentOffset+=4;
                        c.far = buf.readFloatLE(currentOffset); currentOffset+=4;
                        currentOffset +=this.readTag(parent, buf, currentOffset, leveldeep, childCount);
                        break;
                    case "LGTI": //NOT TESTED
                        var c = parent[tagName] = {
                            type:tagName,
                            floats:[]
                        };
                        //UNDOCUMENTED VALUES, we'll have to use XSI to mess with them until we get it later
                        c.floats[0] = buf.readFloatLE(currentOffset); currentOffset+=4;
                        c.floats[1] = buf.readFloatLE(currentOffset); currentOffset+=4;
                        c.floats[2] = buf.readFloatLE(currentOffset); currentOffset+=4;
                        
                        c.floats[3] = buf.readFloatLE(currentOffset); currentOffset+=4;
                        c.floats[4] = buf.readFloatLE(currentOffset); currentOffset+=4;
                        c.floats[5] = buf.readFloatLE(currentOffset); currentOffset+=4;
                        
                        c.floats[6] = buf.readFloatLE(currentOffset); currentOffset+=4;
                        c.floats[7] = buf.readFloatLE(currentOffset); currentOffset+=4;
                        c.floats[8] = buf.readFloatLE(currentOffset); currentOffset+=4;
                        currentOffset +=this.readTag(parent, buf, currentOffset, leveldeep, childCount);
                        break;
                    case "MATD": //NOT TESTED
                        var c = parent[tagName] = {
                            type:tagName,
                            diffuseColor:[],
                            ambientColor:[],
                            specularColor:[],
                            specularIntensity:0
                        };
                        //UNDOCUMENTED VALUES, we'll have to use XSI to mess with them until we get it later
                        c.diffuseColor[0] = buf.readFloatLE(currentOffset); currentOffset+=4;
                        c.diffuseColor[1] = buf.readFloatLE(currentOffset); currentOffset+=4;
                        c.diffuseColor[2] = buf.readFloatLE(currentOffset); currentOffset+=4;
                        c.diffuseColor[3] = buf.readFloatLE(currentOffset); currentOffset+=4;
                        
                        c.ambientColor[0] = buf.readFloatLE(currentOffset); currentOffset+=4;
                        c.ambientColor[1] = buf.readFloatLE(currentOffset); currentOffset+=4;
                        c.ambientColor[2] = buf.readFloatLE(currentOffset); currentOffset+=4;
                        c.ambientColor[3] = buf.readFloatLE(currentOffset); currentOffset+=4;
                        
                        c.specularColor[0] = buf.readFloatLE(currentOffset); currentOffset+=4;
                        c.specularColor[1] = buf.readFloatLE(currentOffset); currentOffset+=4;
                        c.specularColor[2] = buf.readFloatLE(currentOffset); currentOffset+=4;
                        c.specularColor[3] = buf.readFloatLE(currentOffset); currentOffset+=4;
                        
                        c.specularIntensity = buf.readFloatLE(currentOffset); currentOffset+=4;
                        
                        currentOffset +=this.readTag(parent, buf, currentOffset, leveldeep, childCount);
                        break;
                    default:
                        leveldeep++;
                        parent[tagName + "_" + levelwidth] = {
                            type:tagName,
                            contentSize:tagSize,
                            unhandled: true
                        };
                        
                        currentOffset += tagSize;
                        currentOffset +=this.readTag(parent, buf, currentOffset, leveldeep, childCount);
                        break;
                }
                break;
            /*case "ANIM": //Can't test this yet
                
                break;*/
            case "LGTI": //NOT TESTED
                var childCount = 0;
                leveldeep++;
                var p = parent[tagName] = {
                    type:tagName,
                    contentSize:tagSize
                };
                for (var i=currentOffset-start; i<tagSize;i=currentOffset) {
                    currentOffset += this.readTag(p, buf, currentOffset, leveldeep, childCount);
                    childCount++;
                }
                break;
            case "MATL":
                var childCount = 0;
                leveldeep++;
                var p = parent[tagName] = {
                    type:tagName,
                    contentSize:tagSize,
                    materialCount:0
                };
                p.materialCount = buf.readInt32LE(currentOffset); currentOffset+=4;
                
                for (var i=currentOffset-start; i<tagSize;i=currentOffset) {
                    currentOffset += this.readTag(p, buf, currentOffset, leveldeep, childCount);
                    childCount++;
                }
                break;
            case "MATD":
                var childCount = 0;
                leveldeep++;
                var p = parent[tagName + "_" + levelwidth] = {
                    type:tagName,
                    contentSize:tagSize
                };
                
                for (var i=currentOffset-start; i<tagSize;i=currentOffset) {
                    currentOffset += this.readTag(p, buf, currentOffset, leveldeep, childCount);
                    childCount++;
                }
                break;
            case "CL1L":
                console.log("CL1L has " + tagSize + " bytes following, usually EOF");
                this.reachedEofSafely = true;
                break;
            default:
                leveldeep++;
                parent[tagName + "_" + levelwidth] = {
                    type:tagName,
                    contentSize:tagSize,
                    unhandled: true
                };
                
                currentOffset += tagSize;
                currentOffset +=this.readTag(parent, buf, currentOffset, leveldeep, childCount);
                break;
        }
        
        return currentOffset;
    }
    
    this.fromFile = function (fname) {
        var buf = fs.readFileSync(fname);
        try {
            this.readTag(null, buf, 0);
        } catch (ex) {
            if (this.reachedEofSafely) {
                //I'm not sure why this happens, but it does.. We seem to be doing everything right though. We can parse stuff!
            } else {
                console.log(ex);
            }
        }
        return this.finalResult;
    }
}

//Standalone test debug code
var loader = new MSHLoader();
var fname = "imp_inf_scout.msh";
var res = loader.fromFile(fname);

var stringified = JSON.stringify(res, null, 4);

fs.writeFile(fname + ".json", stringified, function () {
    console.log("Wrote json output to " + fname + ".json");
});

console.log(JSON.stringify(res, null, 4));
//End standalone test debug code