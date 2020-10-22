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
    signal private input x;
    signal private input y;
    signal private input salt;

    signal output pub;

    /* check 0 <= x, y < 16 */
    component n2bx = Num2Bits(4);
    n2bx.in <== x;
    component n2by = Num2Bits(4);
    n2by.in <== y;

    /* check that 0 <= x, y < 7 (given x, y are at most 4 bits) */
    component compX = LessThan(4);
    compX.in[0] <== x;
    compX.in[1] <== 7;
    compX.out === 1;

    component compY = LessThan(4);
    compY.in[0] <== y;
    compY.in[1] <== 7;
    compY.out === 1;

    /* check MiMCSponge(x, y, salt) = pub */
    /*
        220 = 2 * ceil(log_5 p), as specified by mimc paper, where
        p = 21888242871839275222246405745257275088548364400416034343698204186575808495617
    */
    component mimc = MiMCSponge(3, 220, 1);

    mimc.ins[0] <== x;
    mimc.ins[1] <== y;
    mimc.ins[2] <== salt;
    mimc.k <== 0;

    pub <== mimc.outs[0];
}

component main = Main();