
let fs = require("fs");

class TerrainBuilder {
    constructor () {
        
    }
    
    fromTERFile (filepath) {
        if (!filepath) return;
        let buf = undefined;
        try {
            buf = fs.readFileSync(filepath);
        } catch (exception) {
            console.error("Error while trying to read", filepath, "to parse as TER terrain file");
            return;
        }
        if (buf.toString("utf8", 0, 4) !== "TERR") {
            console.log(filepath + " may not be a terrain file, it doesn't even have a good header!");
            return;
        }
        let terrainData = {};
        let offset = 4;
        
        terrainData.unknown01 = buf.readInt32LE(offset); //Riley said this is usually 21
        offset+=4;
        
        terrainData.gridDisplayRect = {
            minX:buf.readInt16LE(offset),
            minY:buf.readInt16LE(offset+2),
            maxX:buf.readInt16LE(offset+4),
            maxY:buf.readInt16LE(offset+6)
        };
        offset+=8;
        
        let unknown02 = buf.readInt32LE(offset); //Usually 164
        offset+=4;
        
        //BEGIN TERRAIN TEXTURE DATA
        
        terrainData.textureData = new Array(16);
        for (let i=0; i<terrainData.textureData.length; i++) {
            terrainData.textureData[i] = {};
            
            terrainData.textureData[i].stretchFactor = buf.readFloatLE(offset);
            offset +=4;
        }
        
        for (let i=0; i<terrainData.textureData.length; i++) {
            terrainData.textureData[i].mappingRule = buf.readUInt8(offset);
            offset+=1;
        }
        
        for (let i=0; i<terrainData.textureData.length; i++) {
            terrainData.textureData[i].rotation = buf.readFloatLE(offset);
            offset+=4;
        }
        
        terrainData.heightMapScale = buf.readFloatLE(offset);
        offset+=4;
        
        terrainData.mapScaleXY = buf.readFloatLE(offset);
        offset+=4;
        
        terrainData.unknown03 = buf.readInt32LE(offset);
        offset+=4;
        
        terrainData.gridTotalSize = buf.readInt32LE(offset);
        offset+=4;
        
        terrainData.unknown04 = buf.readInt32LE(offset);
        offset+=4;
        
        let currentTextureName = undefined;
        
        //16 sets of texture & detail texture entries (32 byte 0x0 terminated strings)
        for (let i=0; i<terrainData.textureData.length; i++) {
            //Get texture file
            currentTextureName = "";
            for (let j=0; j<32; j++) {
                if (buf[offset] !== 0) {
                    currentTextureName += String.fromCharCode(buf[offset]);
                }
                offset++;
            }
            
            if (currentTextureName.length < 1 || currentTextureName[0] == 0) {
                //No texture in this slot
            } else {
                terrainData.textureData[i].texture = currentTextureName;
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
                terrainData.textureData[i].detailTexture = currentTextureName;
            }
        }
        
        offset+=68; //Unknown purpose and structure, skip
        
        
        terrainData.waterTileData = new Array(15);
        let currentWaterTile = undefined;
        console.log(terrainData.waterTileData.length);
        
        for (let i=0; i<terrainData.waterTileData.length; i++) {
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
                terrainData.waterTileData[i] = undefined;
            } else {
                currentWaterTile.textureFile = currentTextureName;
                terrainData.waterTileData[i] = currentWaterTile;
            }
        }
        
        offset += 524; //Unknown purpose, end of header
        
        //BEGIN TERRAIN DATA
        
        terrainData.heightData = new Array(terrainData.gridTotalSize * terrainData.gridTotalSize);
        
        //Record all height values as is
        for (let i=0; i<terrainData.heightData.length; i++) {
            terrainData.heightData[i] = buf.readInt16LE(offset);
            offset+=2; //Each short is 2 bytes
        }
        
        return terrainData;
        
    }
}

function test () {
    let builder = new TerrainBuilder();
    let terrainData = builder.fromTERFile("bespin2.ter");
    
    fs.writeFile("bespin2.ter.json", JSON.stringify( terrainData, null, "  " ), function () {
        console.log("Converted bespin2.ter to bespin2.ter.json");
    });
}

test();