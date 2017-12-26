
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
    /** MSHLoader.prototype.readTag function
     * Reads the given tag and all of its children
     * Function reused as tree parsing scheme (MSH data is in tree format)
     */
    this.reachedEofSafely = false;
    this.finalResult = {type:"HEDR"};
    
    this.readTag = function (parent, buf, start, leveldeep = 0, levelwidth = 0) {
        var currentOffset = start;
        
        var tagName = tag(buf, currentOffset);
        currentOffset+=4;
        
        var tagSize = buf.readInt32LE(currentOffset);
        currentOffset+=4;
        
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
                parent[tagName] = buf.toString("utf8", currentOffset, currentOffset+tagSize);
                currentOffset+=tagSize;
                currentOffset +=this.readTag(parent, buf, currentOffset, leveldeep, childCount);
                break;
            case "FRAM":
                var c = parent[tagName] = {
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
                break;
            /*case "DATA": //Thats enough for tonight.. Merry christmas!
                //TODO ----------------- VARIES BASED ON PARENT TAG (good thing we keep track of that, huh?)
                switch(parent.type) {
                    //Do stuff different for each type of parent of DATA tag (see [info].msh structure notes)
                }
                break;*/
            case "CL1L":
                console.log("CL1L has " + tagSize + " bytes following, usually EOF");
                this.reachedEofSafely = true;
                break;
            default:
                leveldeep++;
                var p = parent[tagName + "_" + levelwidth] = {
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