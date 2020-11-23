/*
    Inputs:
    - a
    - b
    - c
    - w
    - x
    - y
    - salt1
    - salt2
    - z (pub)

    Outputs:
    - h0: old commit
    - h1: new commit

    Prove:
    - h0 = mimc(a, b, c, salt1)
    - h1 = mimc(w, x, y, salt2)
    - {a,b,c,0} is a permutation of {w,x,y,z}
*/

include "../node_modules/circomlib/circuits/mimcsponge.circom"
include "../node_modules/circomlib/circuits/comparators.circom"
include "../node_modules/circomlib/circuits/bitify.circom"
include "../utils/permutation.circom"

template Main() {
    signal private input a;
    signal private input b;
    signal private input c;
    signal private input w;
    signal private input x;
    signal private input y;
    signal private input salt1;
    signal private input salt2;

    signal input z;

    signal output oldCommit;
    signal output newCommit;

    /* prove commits are correct */
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

    /* permutation */
    component permutation = Permutation(4);
    permutation.a[0] <== a;
    permutation.a[1] <== b;
    permutation.a[2] <== c;
    permutation.a[3] <== 0;
    permutation.b[0] <== w;
    permutation.b[1] <== x;
    permutation.b[2] <== y;
    permutation.b[3] <== z;
    permutation.x <== oldCommit; // janky and probably theoretically insecure fiat-shamir-like thing
}

component main = Main();