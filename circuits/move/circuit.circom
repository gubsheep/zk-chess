/*
    Prove: I know (x,y) such that:
    - x^2 + y^2 <= r^2
    - perlin(x, y) = p
    - MiMCSponge(x,y) = pub
*/

include "../node_modules/circomlib/circuits/mimcsponge.circom"
include "../node_modules/circomlib/circuits/comparators.circom"
include "../node_modules/circomlib/circuits/bitify.circom"

template Main() {
    signal private input x1;
    signal private input y1;
    signal private input salt1;

    signal private input x2;
    signal private input y2;
    signal private input salt2;

    signal output pub1;
    signal output pub2;

    /* RANGE CHECKS */
    /* check 0 <= x1, y1, x2, y2 < 16 */
    component n2bx1 = Num2Bits(4);
    n2bx1.in <== x1;
    component n2by1 = Num2Bits(4);
    n2by1.in <== y1;
    component n2bx2 = Num2Bits(4);
    n2bx2.in <== x2;
    component n2by2 = Num2Bits(4);
    n2by2.in <== y2;

    /* check that 0 <= x1, y1, x2, y2 < 7 (given x, y are at most 4 bits) */
    component compX1 = LessThan(4);
    compX1.in[0] <== x1;
    compX1.in[1] <== 7;
    compX1.out === 1;

    component compY1 = LessThan(4);
    compY1.in[0] <== y1;
    compY1.in[1] <== 7;
    compY1.out === 1;

    component compX2 = LessThan(4);
    compX2.in[0] <== x2;
    compX2.in[1] <== 7;
    compX2.out === 1;

    component compY2 = LessThan(4);
    compY2.in[0] <== y2;
    compY2.in[1] <== 7;
    compY2.out === 1;

    /* check that (x2, y2) is a king's move from (x1, y1) */
    signal xDiff;
    signal yDiff;
    signal xDiffSq;
    signal yDiffSq;
    signal distSq;

    xDiff <== x2 - x1;
    yDiff <== y2 - y1;
    xDiffSq <== xDiff * xDiff;
    yDiffSq <== yDiff * yDiff;
    distSq <== xDiffSq + yDiffSq;
    (distSq - 1) * (distSq - 2) === 0; // norm is either 1 or 2

    /* check MiMCSponge(x, y, salt) = pub */
    /*
        220 = 2 * ceil(log_5 p), as specified by mimc paper, where
        p = 21888242871839275222246405745257275088548364400416034343698204186575808495617
    */
    component mimc1 = MiMCSponge(3, 220, 1);
    mimc1.ins[0] <== x1;
    mimc1.ins[1] <== y1;
    mimc1.ins[2] <== salt1;
    mimc1.k <== 0;
    pub1 <== mimc1.outs[0];

    component mimc2 = MiMCSponge(3, 220, 1);
    mimc2.ins[0] <== x2;
    mimc2.ins[1] <== y2;
    mimc2.ins[2] <== salt2;
    mimc2.k <== 0;
    pub2 <== mimc2.outs[0];
}

component main = Main();