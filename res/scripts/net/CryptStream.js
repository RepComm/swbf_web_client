
const GOA_CHALLENGE_LEN = 8;

const ROTOR = 0, RATCHET = 1, AVALANCHE = 2, LC = 3, LP = 4;

class CryptStream {

    constructor(gameKey) {
        this.challenge = Buffer.alloc(GOA_CHALLENGE_LEN);

        //generate a new (random) challenge key
        for (var i = 0; i < this.challenge.length; i++) {
            this.challenge.writeUInt8(Math.random() * 0xff, i);
        }
        Logger.log(LOGLEVEL_DEBUG, "[CryptStream] Generated new challenge key: %s", this.challenge.toString("hex"));

        this.gameKey = gameKey;

        //two arrays containing the current cryptostream state
        this.cards = null;
        this.state = new Uint8Array(5);
        this.headerOk = false;
    }

    getChallenge() {
        return this.challenge;
    }

    decryptWrapper(buf) {
        //when we first connect, the MS will send a crypt header which we have to process before we can start decrypting
        //[... padding ...] [key] [data]
        if (!this.headerOk) buf = this.initHeader(buf);

        //decrypt the rest of the data
        this.decrypt(buf);
        return buf;
    }

    initHeader(buf) {
        //the crypt header contains a key and some random padding
        var keyOffset = (buf.readUInt8(0) ^ 0xec) + 1;  //get key position 
        var keyLen = buf.readUInt8(keyOffset++) ^ 0xEA; //get key length
        var keyEnd = keyOffset + keyLen; //data starts at this offset

        //with the new key, we can now fully initialize our stream
        var key = buf.slice(keyOffset, keyEnd); 
        this.initChallenge(key); 
        this.initStream();

        Logger.log(LOGLEVEL_DEBUG, "[CryptStream] Computed %d header bytes, remaining payload size: %d ", keyEnd, buf.length - keyEnd);
        
        //remove the header
        return buf.slice(keyEnd);
    }

    initChallenge(key) {
        //XORing our challenge with a bit of "randomness"
        for (var i = 0; i < key.length; i++) {
            this.challenge[(i * this.gameKey.charCodeAt(i % this.gameKey.length)) % this.challenge.length] ^=
                (this.challenge[i % this.challenge.length] ^ key[i]) & 0xFF;
        }
    }

    initStream() {

        //we start with ascending cards, generate them:
        this.cards = Buffer.alloc(256);
        for (var i = 0; i < this.cards.length; i++) {
            this.cards[i] = i;
        }

        //using typed arrays so we don't have modulo by hand if the vars overflow
        var keyIdx = new Uint32Array(1);
        var mask = new Uint32Array(1)
        var rsum = new Uint8Array(1);

        var swapIdx, swapTemp;

        mask[0] = 0xff;

        //pseudo-randomize our cards
        for (var j = 0xff; j > 0; j--) {
            swapIdx = this.nextSwapIdx(j, mask, rsum, keyIdx);
            swapTemp = this.cards[j];
            this.cards[j] = this.cards[swapIdx];
            this.cards[swapIdx] = swapTemp;
            if ((j & (j - 1)) == 0) {
                mask[0] >>= 1;
            }
        }

        //set the rest of our stream state using the "randomness" we just generated
        this.state[ROTOR] = this.cards[1];
        this.state[RATCHET] = this.cards[3];
        this.state[AVALANCHE] = this.cards[5];
        this.state[LP] = this.cards[7];
        this.state[LC] = this.cards[rsum[0]];

        Logger.log(LOGLEVEL_DEBUG, "[CryptStream] Initialized with state { rotor: %d, ratchet: %d, avalance: %d, lp: %d, lc: %d }",
            this.state[ROTOR],
            this.state[RATCHET],
            this.state[AVALANCHE],
            this.state[LP],
            this.state[LC]
        );
    }

    nextSwapIdx(limit, mask, rsum, keyIdx) {
        var i = 0, retry_lim = 0;
        do {
            rsum[0] = this.cards[rsum[0]] + this.challenge[keyIdx[0]++];

            if (keyIdx[0] >= this.challenge.length) {
                keyIdx[0] = 0
                rsum[0] += this.challenge.length;
            }

            i = mask[0] & rsum[0];
            if (++retry_lim > 11) i %= limit;

        } while (i > limit)

        return i & 0xFF;
    }

    decrypt(buf) {
        var swapTemp;

        //Use some pseudo-randomness to decrypt our buffer
        for (var i = 0; i < buf.length; i++) {
            this.state[RATCHET] += this.cards[this.state[ROTOR]++];

            swapTemp = this.cards[this.state[LC]];
            this.cards[this.state[LC]] = this.cards[this.state[RATCHET]];
            this.cards[this.state[RATCHET]] = this.cards[this.state[LP]];

            this.cards[this.state[LP]] = this.cards[this.state[ROTOR]];
            this.cards[this.state[ROTOR]] = swapTemp;
            this.state[AVALANCHE] += this.cards[swapTemp];

            this.state[LP] = buf[i] ^
                this.cards[(this.cards[this.state[AVALANCHE]] + this.cards[this.state[ROTOR]]) & 0xff] ^
                this.cards[this.cards[(this.cards[this.state[LP]] + this.cards[this.state[LC]] + this.cards[this.state[RATCHET]]) & 0xff]];

            this.state[LC] = buf[i];
            buf[i] = this.state[LP];
        }

        Logger.log(LOGLEVEL_DEBUG, "[CryptStream] Decrypted %d bytes", buf.length);
    }
}