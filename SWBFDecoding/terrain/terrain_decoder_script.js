/* Built using Matthew Sachin's documentation as reference
 * https://github.com/MathewSachin/NIco/wiki/Ico,-Cur-and-PE-Formats
 */

let fs = require("fs");
let PNG = require("pngjs").PNG;

let inputTerrainFile = undefined, outputFile = undefined;

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
    let buf = fs.readFileSync(inputTerrainFile);
    
    if (buf.toString("utf8", 0, 4) !== "TERR") {
        console.log(inputTerrainFile + " may not be a terrain file, it doesn't even have a good header!");
        return;
    }
    let offset = 4;
    
    let unknown01 = buf.readInt32LE(offset); //Riley said this is usually 21
    offset+=4;
    
    let gridDisplayRect = {
        minX:buf.readInt16LE(offset),
        minY:buf.readInt16LE(offset+2),
        maxX:buf.readInt16LE(offset+4),
        maxY:buf.readInt16LE(offset+6)
    };
    offset+=8;
    
    console.log("Display Rect", JSON.stringify(gridDisplayRect, null, "  "));
    
    let unknown02 = buf.readInt32LE(offset); //Usually 164
    offset+=4;
    
    let texStretchRecipArray = [];
    
    for (let i=0; i<16; i++) {
        texStretchRecipArray.push(buf.readFloatLE(offset));
        offset +=4;
    }
    
    console.log("Texture Stretch", JSON.stringify(texStretchRecipArray, null, "  "));
    
    let texMappingRuleArray = [];
    
    for (let i=0; i<16; i++) {
        texMappingRuleArray.push(buf.readUInt8(offset));
        offset+=1;
    }
    
    console.log("Texture Mapping Rules", JSON.stringify(texMappingRuleArray, null, "  "));
    
    let texRotationArray = [];
    
    for (let i=0; i<16; i++) {
        texRotationArray.push(buf.readFloatLE(offset));
        offset+=4;
    }
    
    console.log("Texture Rotations?", JSON.stringify(texRotationArray, null, "  "));
    
    let heightMapScale = buf.readFloatLE(offset); //ZeroEditor uses 0.01 by default
    console.log("Height Map Scale Vertical", heightMapScale);
    offset+=4;
    
    let terrainScaleXY = buf.readFloatLE(offset); //ZeroEditor uses 8.0 by default (no wonder swbf terrain looks like crap!)
    offset+=4;
    console.log("Terrain Scale Width|Height", terrainScaleXY);
    
    let unknown03 = buf.readInt32LE(offset);
    offset+=4;
    
    let gridTotalSize = buf.readInt32LE(offset);
    offset+=4;
    
    console.log("Total Grid Size", gridTotalSize);
    
    let unknown04 = buf.readInt32LE(offset);
    offset+=4;
    
    console.log(offset, unknown04);
    
    //Textures refs have the potential to skip indices
    let textureRefs = [];
    
    let currentTextureName = undefined;
    
    //16 sets of texture & detail texture entries (32 byte 0x0 terminated strings)
    for (let i=0; i<16; i++) {
        //Get texture file
        currentTextureName = "";
        for (let j=0; j<32; j++) {
            if (buf[offset] !== 0) {
                currentTextureName += String.fromCharCode(buf[offset]);
            }
            offset++;
        }
        
        if (!textureRefs[i]) {
            textureRefs[i] = undefined;
        }
        
        if (currentTextureName.length < 1 || currentTextureName[0] == 0) {
            console.log("No texture in slot", i);
        } else {
            if (!textureRefs[i]) {
                textureRefs[i] = {};
            }
            textureRefs[i].tex = currentTextureName;
        }
        //Get normal file
        currentTextureName = "";
        for (let j=0; j<32; j++) {
            if (buf[offset] !== 0) {
                currentTextureName += String.fromCharCode(buf[offset]);
            }
            offset++;
        }
        
        if (currentTextureName.length < 1 || currentTextureName[0] == 0) {
        } else {
            textureRefs[i].bump = currentTextureName;
        }
    }
    
    console.log("Texture References", JSON.stringify(textureRefs, null, "  "));
    
    offset+=68; //Unknown purpose and structure, skip
    
    let waterRefs = [];
    let currentWaterTile = undefined;
    
    for (let i=0; i<15; i++) {
        currentWaterTile = {};
        currentWaterTile.height = buf.readFloatLE(offset);
        offset+=8; //4 bytes for float, 4 skipped because of duplicate?
        offset+=8; //8 bytes always zero
        currentWaterTile.animU = buf.readFloatLE(offset);
        offset+=4;
        currentWaterTile.animV = buf.readFloatLE(offset);
        offset+=4;
        currentWaterTile.repeatU = buf.readFloatLE(offset);
        offset+=4;
        currentWaterTile.repeatV = buf.readFloatLE(offset);
        offset+=4;
        currentWaterTile.argbColorInteger = buf.readInt32LE(offset);
        offset+=4;
        
        currentTextureName = "";
        for (let j=0; j<32; j++) {
            if (buf[offset] !== 0) {
                currentTextureName += String.fromCharCode(buf[offset]);
            }
            offset++;
        }
        
        if (currentTextureName.length < 1 || currentTextureName[0] == 0) {
            waterRefs.push(undefined);
        } else {
            currentWaterTile.textureFile = currentTextureName;
            waterRefs.push(currentWaterTile);
        }
    }
    
    console.log("Water Data", JSON.stringify(waterRefs, null, "  "));
    
    offset += 524; //Unknown purpose, end of header
    
    let terrainHeightDataSize = gridTotalSize * gridTotalSize;
    let terrainHeightData = new Array(terrainHeightDataSize);
    let terrainPng = new PNG({width:gridTotalSize, height:gridTotalSize, colorType:6});
    let idx = 0;
    
    //Not writing PNG correct yet
    for (let i=0; i<terrainHeightDataSize; i++) {
        terrainHeightData[i] = buf.readInt16LE(offset);
        offset+=2; //Each short is 2 bytes
    }
    
    let ind = 0;
    
    for (let i=0; i<terrainHeightDataSize*4; i+=4) {
        ind = Math.floor(terrainHeightData[i/4]); //YES, IT WORKS!
        terrainPng.data[i] = ind; //Red
        terrainPng.data[i+1] = ind; //Green?
        terrainPng.data[i+2] = ind;
        terrainPng.data[i+3] = 255; //Alpha
    }
    console.log(ind);
    terrainPng.pack().pipe(fs.createWriteStream('out.png'));
}

init();