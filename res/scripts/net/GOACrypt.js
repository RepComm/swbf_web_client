const GOA_CHALLENGE_LEN = 8;

class CryptStream {

    constructor(gameKey) {
        this.challenge = Buffer.alloc(GOA_CHALLENGE_LEN);
        for (var i = 0; i < buf.length; i++) {
            this.challenge.writeUInt8(i, Math.random() * 0xff);
        }

        this.gameKey = gameKey;
        this.cards = null;
        this.rotor = 0;
        this.ratchet = 0;
        this.avalanche = 0;
        this.last_cipher = 0;
        this.last_plain = 0;
        this.headerOk = false;
    }

    decryptWrapper(buf) {
        if (!this.headerOk) this.initHeader(buf);
    }

    initHeader(buf) {
        var keyOffset = buf.readUInt8(0) ^ 0xEC + 1;
        var keyLen = buf.readUInt8(keyOffset++) ^ 0xEA;
        var key = buf.slice(keyOffset, keyOffset + keyLen);
        this.initChallenge(key);
    }

    initChallenge(key) {
        for (var i = 0; i < key.length; i++) {
            this.challenge[this.gameKey[i % this.gameKey.length] % this.challenge.length] ^=
                (this.challenge[i % this.challenge.length] ^ key[i]) & 0xFF;
        }
    }

    initStream() {
        this.cards = Buffer.alloc(0xFF);
        for (var i = 0; i < this.cards.length; i++) {
            this.cards[i] = i;
        }

        var keyIdx = new Uint32Array(1);
        var mask = new Uint32Array(1)
        var rsum = new Uint8Array(1);

        var swapIdx;
        var swapTemp;

        mask[0] = 0xff;

        for (var j = 0xff; j >= 0; j--) {
            swapIdx = nextSwapIdx(j, mask, rsum, keyIdx);
            swapTemp = this.cards[i];
            this.card[i] = this.cards[swapIdx];
            this.cards[swapIdx] = swapTemp;
            if ((i & (i - 1)) == 0) mask >>= 1;
        }

        this.rotor = this.cards[1];
        this.ratchet = this.cards[3];
        this.avalanche = this.cards[5];
        this.last_plain = this.cards[7];
        this.last_cipher = this.cards[rsum[0]];
    }

    nextSwapIdx(limit, mask, rsum, keyIdx) {
        var i = 0;
        var retry_lim = 0;

        do {
            rsum[0] = this.cards[rsum[0]] + this.challenge[keyIdx[0]++];

            if (keyIdx[0] >= this.challenge.length) {
                keyIdx[0] = 0
                rsum[0] += this.challenge.length;
            }

            i =  mask[0] & rsum[0];
            retry_lim++;
            if(retry_lim > 11) i = i % limit;

        } while (i < limit)
    
        return i & 0xFF;
    }

    decrypt(pt) {


    }
}