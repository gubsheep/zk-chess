/*
    Inputs:
    - a
    - b
    - c
    - d
    - w
    - x
    - y
    - z
    - seed
    - salt1
    - salt2
    - drawSalt (pub)

    Outputs:
    - seedCommit
    - h0: old commit
    - h1: new commit

    Prove:
    - h0 = mimc(a, b, c, salt1)
    - h1 = mimc(w, x, y, salt2)
    - d = (mimc(seed, statehash) % 32) % 6 + 1
    - seedcommit = mimc(seed)
    - {a,b,c,d} is a permutation of {w,x,y,z}
*/

include "../node_modules/circomlib/circuits/mimcsponge.circom"
include "../node_modules/circomlib/circuits/comparators.circom"
include "../node_modules/circomlib/circuits/bitify.circom"
include "../utils/permutation.circom"

template Main() {
    signal private input a;
    signal private input b;
    signal private input c;
    signal private input d;
    signal private input w;
    signal private input x;
    signal private input y;
    signal private input z;
    signal private input seed;
    signal private input salt1;
    signal private input salt2;

    signal input drawSalt;

    signal output seedCommit;
    signal output oldCommit;
    signal output newCommit;

    /* prove commits are correct */
    component mimcSeed = MiMCSponge(1, 220, 1);
    mimcSeed.ins[0] <== seed;
    mimcSeed.k <== 0;
    seedCommit <== mimcSeed.outs[0];

    component mimcOld = MiMCSponge(4, 220, 1);
    mimcOld.ins[0] <== a;
    mimcOld.ins[1] <== b;
    mimcOld.ins[2] <== c;
    mimcOld.ins[3] <== salt1;
    mimcOld.k <== 0;
    oldCommit <== mimcOld.outs[0];

    component mimcNew = MiMCSponge(4, 220, 1);
    mimcNew.ins[0] <== w;
    mimcNew.ins[1] <== x;
    mimcNew.ins[2] <== y;
    mimcNew.ins[3] <== salt2;
    mimcNew.k <== 0;
    newCommit <== mimcNew.outs[0];

    /* prove drawn card is correct */
    component mimcDraw = MiMCSponge(2, 220, 1);
    mimcDraw.ins[0] <== seed;
    mimcDraw.ins[1] <== drawSalt;
    mimcDraw.k <== 0;
    component drawHashBits = Num2Bits(254);
    drawHashBits.in <== mimcDraw.outs[0];
    signal drawHash;
    drawHash <== drawHashBits.out[4] * 16 + drawHashBits.out[3] * 8 + drawHashBits.out[2] * 4 + drawHashBits.out[1] * 2 + drawHashBits.out[0];

    signal drawRemainder;
    signal drawQuotient;
    drawRemainder <-- drawHash % 6;
    drawQuotient <-- (drawHash - drawRemainder) / 6;
    drawHash === 6 * drawQuotient + drawRemainder;
    component quotientBound = LessThan(4);
    quotientBound.in[0] <== drawQuotient;
    // quotient < floor(32 / 6) + 1
    quotientBound.in[1] <== 6;
    quotientBound.out === 1;
    d === drawRemainder + 1;

    /* permutation */
    component permutation = Permutation(4);
    permutation.a[0] <== a;
    permutation.a[1] <== b;
    permutation.a[2] <== c;
    permutation.a[3] <== d;
    permutation.b[0] <== w;
    permutation.b[1] <== x;
    permutation.b[2] <== y;
    permutation.b[3] <== z;
    permutation.x <== oldCommit; // janky and probably theoretically insecure fiat-shamir-like thing
}

component main = Main();