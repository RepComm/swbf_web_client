class StdInt {
    //for some reason multiplying typed arrays is not working properly
    //using this mul function instead
    static uint32_mul(a, b) {
        var ah = (a >> 16) & 0xffff, al = a & 0xffff;
        var bh = (b >> 16) & 0xffff, bl = b & 0xffff;
        var high = ((ah * bl) + (al * bh)) & 0xffff;
        return ((high << 16)>>>0) + (al * bl);
    }  
}