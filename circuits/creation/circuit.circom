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

    signal output pub1;

    /* RANGE CHECKS */
    /* check 0 <= x1, y1 < 16 */
    component n2bx1 = Num2Bits(4);
    n2bx1.in <== x1;
    component n2by1 = Num2Bits(4);
    n2by1.in <== y1;

    /* check that 0 <= x1, y1, < 7 (given x, y are at most 4 bits) */
    component compX1 = LessThan(4);
    compX1.in[0] <== x1;
    compX1.in[1] <== 7;
    compX1.out === 1;

    component compY1 = LessThan(4);
    compY1.in[0] <== y1;
    compY1.in[1] <== 7;
    compY1.out === 1;
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
}

component main = Main();