/*
    Inputs:
    - r1
    - c1
    - salt1
    - r2 (pub)
    - c2 (pub)
    - dist (pub)
    - nrows (pub)
    - ncols (pub)

    Outputs:
    - h1

    Prove:
    - r1, c1, r2, c2 are 8 bits
    - 0 <= r1 < nrows
    - 0 <= c1 < ncols
    - |r1 - r2| + |c1 - c2| <= dist
    - mimc(r1, c1, salt1) = h1
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

    signal input r2;
    signal input c2;
    signal input dist;
    signal input nrows;
    signal input ncols;

    signal output h1;

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

    /* check that 0 <= r1 < nrows, 0 <= c1 < ncols */
    component compR1 = LessThan(8);
    compR1.in[0] <== r1;
    compR1.in[1] <== nrows;
    compR1.out === 1;

    component compC1 = LessThan(8);
    compC1.in[0] <== c1;
    compC1.in[1] <== ncols;
    compC1.out === 1;

    /* check that |r1 - r2| + |c1 - c2| <= dist */
    /* we do this by proving LHS is not greater than RHS */
    component absR = AbsoluteDifference(8);
    component absC = AbsoluteDifference(8);

    absR.in[0] <== r1;
    absR.in[1] <== r2;
    absC.in[0] <== c1;
    absC.in[1] <== c2;

    component gtDist = GreaterThan(9); // 1 extra bit since adding two 8-bit numbers
    gtDist.in[0] <== absR.out + absC.out;
    gtDist.in[1] <== dist
    gtDist.out === 0;

    /* compute and prove MiMCSponge(r1, c1, salt1) = h1 */
    component mimc1 = MiMCSponge(3, 220, 1);
    mimc1.ins[0] <== r1;
    mimc1.ins[1] <== c1;
    mimc1.ins[2] <== salt1;
    mimc1.k <== 0;
    h1 <== mimc1.outs[0];
}

component main = Main();