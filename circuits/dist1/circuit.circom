/*
    Inputs:
    - x1
    - y1
    - salt1
    - x2 (pub)
    - y2 (pub)
    - dist (pub)
    - boardSize (pub)

    Outputs:
    - h1

    Prove:
    - x1, y1, x2, y2 are 8 bits
    - 0 <= x1, y1 < boardSize
    - |x1 - x2| + |y1 - y2| <= dist
    - mimc(x1, y1, salt1) = h1
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
    signal private input x1;
    signal private input y1;
    signal private input salt1;

    signal input x2;
    signal input y2;
    signal input dist;
    signal input boardSize;

    signal output h1;

    /* RANGE CHECKS */
    /* check that x1, y1, x2, y2 are expressible in 8 bits  */
    component n2bx1 = Num2Bits(8);
    n2bx1.in <== x1;
    component n2by1 = Num2Bits(8);
    n2by1.in <== y1;

    component n2bx2 = Num2Bits(8);
    n2bx2.in <== x2;
    component n2by2 = Num2Bits(8);
    n2by2.in <== y2;

    /* check that 0 <= x1, y1, x2, y2 < boardSize (given x1, y1 are at most 8 bits) */
    component compX1 = LessThan(8);
    compX1.in[0] <== x1;
    compX1.in[1] <== boardSize;
    compX1.out === 1;

    component compY1 = LessThan(8);
    compY1.in[0] <== y1;
    compY1.in[1] <== boardSize;
    compY1.out === 1;

    /* check that |x1 - x2| + |y1 - y2| <= dist */
    /* we do this by proving LHS is not greater than RHS */
    component absX = AbsoluteDifference(8);
    component absY = AbsoluteDifference(8);

    absX.in[0] <== x1;
    absX.in[1] <== x2;
    absY.in[0] <== y1;
    absY.in[1] <== y2;

    component gtDist = GreaterThan(9); // 1 extra bit since adding two 8-bit numbers
    gtDist.in[0] <== absX.out + absY.out;
    gtDist.in[1] <== dist
    gtDist.out === 0;

    /* compute and prove MiMCSponge(x1, y1, salt1) = h1 */
    component mimc1 = MiMCSponge(3, 220, 1);
    mimc1.ins[0] <== x1;
    mimc1.ins[1] <== y1;
    mimc1.ins[2] <== salt1;
    mimc1.k <== 0;
    h1 <== mimc1.outs[0];
}

component main = Main();