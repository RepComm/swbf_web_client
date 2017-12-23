/* Built using Matthew Sachin's documentation as reference
 * https://github.com/MathewSachin/NIco/wiki/Ico,-Cur-and-PE-Formats
 */

var fs = require("fs");

var inputTerrainFile = undefined, outputFile = undefined;

function handleArgs () {
    for (var i=0; i<process.argv.length; i++) {
        if (process.argv[i].startsWith("-")) {
            if (process.argv[i].startsWith("-in=")) {
                inputTerrainFile = process.argv[i].substring(4);
            } else if (process.argv[i].startsWith("-out=")) {
                outputFile = process.argv[i].substring(5);
            }
        }
    }
}

function init () {
    handleArgs();
    
    if (!inputTerrainFile) {
        console.log("No TER file specified for input! Use -in=terrain.ter for example!");
        return;
    }
    var buf = fs.readFileSync(inputTerrainFile);
    
    if (buf.toString("utf8", 0, 4) !== "TERR") {
        console.log(inputTerrainFile + " may not be a terrain file, it doesn't even have a good header!");
        return;
    }
    var offset = 4;
    
    var unknown01 = buf.readInt32LE(offset); //Riley said this is usually 21
    offset+=4;
    
    var gridDisplayRect = {
        minX:buf.readInt16LE(offset),
        minY:buf.readInt16LE(offset+2),
        maxX:buf.readInt16LE(offset+4),
        maxY:buf.readInt16LE(offset+6)
    };
    offset+=8;
    
    console.log("Display Rect = " + JSON.stringify(gridDisplayRect));
    
    var unknown02 = buf.readInt32LE(offset); //Usually 164
    offset+=4;
    
    var texStretchRecipArray = [];
    
    for (var i=0; i<16; i++) {
        texStretchRecipArray.push(buf.readFloatLE(offset));
        offset +4;
    }
    
    var texMappingRuleArray = [];
    
    for (var i=0; i<16; i++) {
        texMappingRuleArray.push(buf.readUInt8(offset));
        offset+=1;
    }
    
    var texRotationArray = [];
    
    for (var i=0; i<16; i++) {
        texRotationArray.push(buf.readFloatLE(offset));
        offset+=4;
    }
    
    //Doing something wrong right before this
    
    var heightMapScale = buf.readFloatLE(offset); //ZeroEditor uses 0.01 by default
    console.log("Height Map Scale " + heightMapScale);
    offset+=4;
    
    var terrainScaleXY = buf.readFloatLE(offset); //ZeroEditor uses 8.0 by default (no wonder swbf terrain looks like crap!)
    offset+=4;
    
    var unknown03 = buf.readInt32LE(offset);
    offset+=4;
    
    var gridTotalSize = buf.readInt32LE(offset);
    offset+=4;
    
    var unknown04 = buf.readInt32LE(offset);
    offset+=4;
    
    var texNames = [];
    var texNrmlNames = [];
    
    //16 sets of texture & detail texture entries (32 byte 0x0 terminated strings)
    for (var i=0; i<16; i+=2) {
        var tn = buf.toString('utf8', offset, 32);
        texNames.push(tn);//.substring(0, tn.lastIndexOf(0)));
        offset+=32;
        
        var tdn = buf.toString('utf8', offset, 32);
        texNrmlNames.push(tdn);//.substring(0, tdn.lastIndexOf(0)));
        offset+=32;
        
        console.log("Texture " + texNames[i] + " with Detail Texture " + texNrmlNames[i]);
    }
    
    
    
    
}

init();