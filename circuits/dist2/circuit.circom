/*
    Inputs:
    - r1
    - c1
    - salt1
    - r2
    - c2
    - salt2
    - dist (pub)
    - nrows (pub)
    - ncols (pub)

    Outputs:
    - h1
    - h2

    Prove:
    - 0 <= r1, r2 < nrows
    - 0 <= c1, c2 < ncols
    - |r1 - r2| + |c1 - c2| <= dist
    - mimc(r1, c1, salt1) = h1 and mimc(r2, c2, salt2) = h2
*/

include "../node_modules/circomlib/circuits/mimcsponge.circom"
include "../node_modules/circomlib/circuits/comparators.circom"
include "../node_modules/circomlib/circuits/bitify.circom"

template AbsoluteDifference(num_bits) {
    signal input in[2];
    signal output out;

    component lt = LessThan(num_bits);
    lt.in[0] <== in[0];
    lt.in[1] <== in[1];
    var bit = 2*lt.out - 1;

    var diff = in[1] - in[0];
    out <== bit * diff;
}

template Main() {
    signal private input r1;
    signal private input c1;
    signal private input salt1;
    signal private input r2;
    signal private input c2;
    signal private input salt2;

    signal input dist;
    signal input nrows;
    signal input ncols;

    signal output h1;
    signal output h2;

    /* RANGE CHECKS */
    /* check that r1, c1, r2, c2 are expressible in 8 bits  */
    component n2br1 = Num2Bits(8);
    n2br1.in <== r1;
    component n2bc1 = Num2Bits(8);
    n2bc1.in <== c1;

    component n2br2 = Num2Bits(8);
    n2br2.in <== r2;
    component n2bc2 = Num2Bits(8);
    n2bc2.in <== c2;

    /* check that 0 <= r1, r2 < nrows and 0 <= c1, c2 < ncols */
    component compR1 = LessThan(8);
    compR1.in[0] <== r1;
    compR1.in[1] <== nrows;
    compR1.out === 1;

    component compC1 = LessThan(8);
    compC1.in[0] <== c1;
    compC1.in[1] <== ncols;
    compC1.out === 1;

    component compR2 = LessThan(8);
    compR2.in[0] <== r2;
    compR2.in[1] <== nrows;
    compR2.out === 1;

    component compC2 = LessThan(8);
    compC2.in[0] <== c2;
    compC2.in[1] <== ncols;
    compC2.out === 1;

    /* check that |r1 - r2| + |c1 - c2| <= dist */
    /* we do this by proving LHS is not greater than RHS */
    component absR = AbsoluteDifference(8);
    component absC = AbsoluteDifference(8);

    absR.in[0] <== r1;
    absR.in[1] <== r2;
    absC.in[0] <== c1;
    absC.in[1] <== c2;

    component gtDist = GreaterThan(9);
    gtDist.in[0] <== absR.out + absC.out;
    gtDist.in[1] <== dist
    gtDist.out === 0;

    /* compute and prove MiMCSponge(ri, ci, salt1) = hi */
    component mimc1 = MiMCSponge(3, 220, 1);
    mimc1.ins[0] <== r1;
    mimc1.ins[1] <== c1;
    mimc1.ins[2] <== salt1;
    mimc1.k <== 0;
    h1 <== mimc1.outs[0];

    component mimc2 = MiMCSponge(3, 220, 1);
    mimc2.ins[0] <== r2;
    mimc2.ins[1] <== c2;
    mimc2.ins[2] <== salt2;
    mimc2.k <== 0;
    h2 <== mimc2.outs[0];
}

component main = Main();