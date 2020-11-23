//
// Copyright 2017 Christian Reitwiessner
// Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
// The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//
// 2019 OKIMS
//      ported to solidity 0.5
//      fixed linter warnings
//      added requiere error messages
//
pragma solidity ^0.6.7;

library Pairing {
    struct G1Point {
        uint256 X;
        uint256 Y;
    }
    // Encoding of field elements is: X[0] * z + X[1]
    struct G2Point {
        uint256[2] X;
        uint256[2] Y;
    }

    /// @return the generator of G1
    function P1() internal pure returns (G1Point memory) {
        return G1Point(1, 2);
    }

    /// @return the generator of G2
    function P2() internal pure returns (G2Point memory) {
        // Original code point
        return
            G2Point(
                [
                    11559732032986387107991004021392285783925812861821192530917403151452391805634,
                    10857046999023057135944570762232829481370756359578518086990519993285655852781
                ],
                [
                    4082367875863433681332203403145435568316851327593401208105741076214120093531,
                    8495653923123431417604973247489272438418190587263600148770280649306958101930
                ]
            );

        /*
        // Changed by Jordi point
        return G2Point(
            [10857046999023057135944570762232829481370756359578518086990519993285655852781,
             11559732032986387107991004021392285783925812861821192530917403151452391805634],
            [8495653923123431417604973247489272438418190587263600148770280649306958101930,
             4082367875863433681332203403145435568316851327593401208105741076214120093531]
        );
*/
    }

    /// @return r the negation of p, i.e. p.addition(p.negate()) should be zero.
    function negate(G1Point memory p) internal pure returns (G1Point memory r) {
        // The prime q in the base field F_q for G1


            uint256 q
         = 21888242871839275222246405745257275088696311157297823662689037894645226208583;
        if (p.X == 0 && p.Y == 0) return G1Point(0, 0);
        return G1Point(p.X, q - (p.Y % q));
    }

    /// @return r the sum of two points of G1
    function addition(G1Point memory p1, G1Point memory p2)
        internal
        view
        returns (G1Point memory r)
    {
        uint256[4] memory input;
        input[0] = p1.X;
        input[1] = p1.Y;
        input[2] = p2.X;
        input[3] = p2.Y;
        bool success;
        // solium-disable-next-line security/no-inline-assembly
        assembly {
            success := staticcall(sub(gas(), 2000), 6, input, 0xc0, r, 0x60)
            // Use "invalid" to make gas estimation work
            switch success
                case 0 {
                    invalid()
                }
        }
        require(success, "pairing-add-failed");
    }

    /// @return r the product of a point on G1 and a scalar, i.e.
    /// p == p.scalar_mul(1) and p.addition(p) == p.scalar_mul(2) for all points p.
    function scalar_mul(G1Point memory p, uint256 s)
        internal
        view
        returns (G1Point memory r)
    {
        uint256[3] memory input;
        input[0] = p.X;
        input[1] = p.Y;
        input[2] = s;
        bool success;
        // solium-disable-next-line security/no-inline-assembly
        assembly {
            success := staticcall(sub(gas(), 2000), 7, input, 0x80, r, 0x60)
            // Use "invalid" to make gas estimation work
            switch success
                case 0 {
                    invalid()
                }
        }
        require(success, "pairing-mul-failed");
    }

    /// @return the result of computing the pairing check
    /// e(p1[0], p2[0]) *  .... * e(p1[n], p2[n]) == 1
    /// For example pairing([P1(), P1().negate()], [P2(), P2()]) should
    /// return true.
    function pairing(G1Point[] memory p1, G2Point[] memory p2)
        internal
        view
        returns (bool)
    {
        require(p1.length == p2.length, "pairing-lengths-failed");
        uint256 elements = p1.length;
        uint256 inputSize = elements * 6;
        uint256[] memory input = new uint256[](inputSize);
        for (uint256 i = 0; i < elements; i++) {
            input[i * 6 + 0] = p1[i].X;
            input[i * 6 + 1] = p1[i].Y;
            input[i * 6 + 2] = p2[i].X[0];
            input[i * 6 + 3] = p2[i].X[1];
            input[i * 6 + 4] = p2[i].Y[0];
            input[i * 6 + 5] = p2[i].Y[1];
        }
        uint256[1] memory out;
        bool success;
        // solium-disable-next-line security/no-inline-assembly
        assembly {
            success := staticcall(
                sub(gas(), 2000),
                8,
                add(input, 0x20),
                mul(inputSize, 0x20),
                out,
                0x20
            )
            // Use "invalid" to make gas estimation work
            switch success
                case 0 {
                    invalid()
                }
        }
        require(success, "pairing-opcode-failed");
        return out[0] != 0;
    }

    /// Convenience method for a pairing check for two pairs.
    function pairingProd2(
        G1Point memory a1,
        G2Point memory a2,
        G1Point memory b1,
        G2Point memory b2
    ) internal view returns (bool) {
        G1Point[] memory p1 = new G1Point[](2);
        G2Point[] memory p2 = new G2Point[](2);
        p1[0] = a1;
        p1[1] = b1;
        p2[0] = a2;
        p2[1] = b2;
        return pairing(p1, p2);
    }

    /// Convenience method for a pairing check for three pairs.
    function pairingProd3(
        G1Point memory a1,
        G2Point memory a2,
        G1Point memory b1,
        G2Point memory b2,
        G1Point memory c1,
        G2Point memory c2
    ) internal view returns (bool) {
        G1Point[] memory p1 = new G1Point[](3);
        G2Point[] memory p2 = new G2Point[](3);
        p1[0] = a1;
        p1[1] = b1;
        p1[2] = c1;
        p2[0] = a2;
        p2[1] = b2;
        p2[2] = c2;
        return pairing(p1, p2);
    }

    /// Convenience method for a pairing check for four pairs.
    function pairingProd4(
        G1Point memory a1,
        G2Point memory a2,
        G1Point memory b1,
        G2Point memory b2,
        G1Point memory c1,
        G2Point memory c2,
        G1Point memory d1,
        G2Point memory d2
    ) internal view returns (bool) {
        G1Point[] memory p1 = new G1Point[](4);
        G2Point[] memory p2 = new G2Point[](4);
        p1[0] = a1;
        p1[1] = b1;
        p1[2] = c1;
        p1[3] = d1;
        p2[0] = a2;
        p2[1] = b2;
        p2[2] = c2;
        p2[3] = d2;
        return pairing(p1, p2);
    }
}

library Verifier {
    using Pairing for *;
    struct VerifyingKey {
        Pairing.G1Point alfa1;
        Pairing.G2Point beta2;
        Pairing.G2Point gamma2;
        Pairing.G2Point delta2;
        Pairing.G1Point[] IC;
    }
    struct Proof {
        Pairing.G1Point A;
        Pairing.G2Point B;
        Pairing.G1Point C;
    }

    function dist1VerifyingKey()
        internal
        pure
        returns (VerifyingKey memory vk)
    {
        vk.alfa1 = Pairing.G1Point(
            19642524115522290447760970021746675789341356000653265441069630957431566301675,
            15809037446102219312954435152879098683824559980020626143453387822004586242317
        );
        vk.beta2 = Pairing.G2Point(
            [
                6402738102853475583969787773506197858266321704623454181848954418090577674938,
                3306678135584565297353192801602995509515651571902196852074598261262327790404
            ],
            [
                15158588411628049902562758796812667714664232742372443470614751812018801551665,
                4983765881427969364617654516554524254158908221590807345159959200407712579883
            ]
        );
        vk.gamma2 = Pairing.G2Point(
            [
                11559732032986387107991004021392285783925812861821192530917403151452391805634,
                10857046999023057135944570762232829481370756359578518086990519993285655852781
            ],
            [
                4082367875863433681332203403145435568316851327593401208105741076214120093531,
                8495653923123431417604973247489272438418190587263600148770280649306958101930
            ]
        );
        vk.delta2 = Pairing.G2Point(
            [
                8089439792511120152809504357179420103671028630847568125311845260568215513069,
                14521945447872670082363795525288670412616960870224479134887595658438340376290
            ],
            [
                16675054539725595410781705303155339565976000638175500429067506552173811594062,
                10935434560867119933948538936192938072255036309120322998513716569830356791364
            ]
        );
        vk.IC = new Pairing.G1Point[](7);
        vk.IC[0] = Pairing.G1Point(
            21054247584625618342444386034566913465400040445100928147200869627608479067369,
            19345517485319002617737188170548794249957805316402984620872056140113469653856
        );
        vk.IC[1] = Pairing.G1Point(
            6553788499087347263840127424174079868253535870474158219258275478395811728068,
            21712695739794940979478767151866001099800818757964365180474025500394922510875
        );
        vk.IC[2] = Pairing.G1Point(
            3027629824018054652109931632193483516741693334921969322826300748889094165152,
            21548748947591047836804846594413005788945921770803605220980667575482152219004
        );
        vk.IC[3] = Pairing.G1Point(
            17777697873791301072238976666677420434909659938474617385071418820314390078715,
            3425517562188108586655739760947600292575729085252046522371425365679300157801
        );
        vk.IC[4] = Pairing.G1Point(
            5395845460162478205985648484712525392329272333291436407960985809172235079162,
            20184041349469182904545784579076516341172833217469957463303292790968034897593
        );
        vk.IC[5] = Pairing.G1Point(
            19706154075344778652224241782090757053346144722512818364909493392736616698140,
            10946577771239094712883830184345962230791042970920132495325580376455064838179
        );
        vk.IC[6] = Pairing.G1Point(
            3879562606964151214390705694026197880725081206036454858509595267248493669438,
            14817270524696757499752931045805307914960199571750348882891211774795158114184
        );
    }

    function dist2VerifyingKey()
        internal
        pure
        returns (VerifyingKey memory vk)
    {
        vk.alfa1 = Pairing.G1Point(
            19642524115522290447760970021746675789341356000653265441069630957431566301675,
            15809037446102219312954435152879098683824559980020626143453387822004586242317
        );
        vk.beta2 = Pairing.G2Point(
            [
                6402738102853475583969787773506197858266321704623454181848954418090577674938,
                3306678135584565297353192801602995509515651571902196852074598261262327790404
            ],
            [
                15158588411628049902562758796812667714664232742372443470614751812018801551665,
                4983765881427969364617654516554524254158908221590807345159959200407712579883
            ]
        );
        vk.gamma2 = Pairing.G2Point(
            [
                11559732032986387107991004021392285783925812861821192530917403151452391805634,
                10857046999023057135944570762232829481370756359578518086990519993285655852781
            ],
            [
                4082367875863433681332203403145435568316851327593401208105741076214120093531,
                8495653923123431417604973247489272438418190587263600148770280649306958101930
            ]
        );
        vk.delta2 = Pairing.G2Point(
            [
                15744306584281028187083865911993633440880013216198442257279708997903595222071,
                12477388346609042579468337742424131718679891184359532840364999921176093246478
            ],
            [
                7018458495355987897682259074472340362334714041685021168115904519445551426961,
                14412578697966654002344596507699505151330966115033745926611795500043823092484
            ]
        );
        vk.IC = new Pairing.G1Point[](6);
        vk.IC[0] = Pairing.G1Point(
            18775253103644028938004652566151686938708417688552052460696356894933760859583,
            19699392699419841032753688981317513629882181963820736367618163459313583603787
        );
        vk.IC[1] = Pairing.G1Point(
            7672784422550698513054549590282720674542901189549464850608500746205995067337,
            789656325508344561416772293231934075318392003235464944101775331788216184187
        );
        vk.IC[2] = Pairing.G1Point(
            17925559212291549402989976668934583841642411583072225437073595432218951493917,
            21124961735545451886629924537657675210802231283424021573164787129493635035959
        );
        vk.IC[3] = Pairing.G1Point(
            12357746867300537138447627168877630117040829849507697165368743314717277799435,
            2192667521361474580382057961408906697390282147984355373596205681709624788049
        );
        vk.IC[4] = Pairing.G1Point(
            6671288173447221497729165307685611450321083347405430781894683595702578042977,
            21148322646839707421335990176305032797942555871411109321570274114172663824049
        );
        vk.IC[5] = Pairing.G1Point(
            14978778073266970798575230969793288686909745926976711100128663871490240063986,
            6228199777215239600516790891017233905656364698722321610128039540211584964753
        );
    }

    function drawCardVerifyingKey()
        internal
        pure
        returns (VerifyingKey memory vk)
    {
        vk.alfa1 = Pairing.G1Point(
            19642524115522290447760970021746675789341356000653265441069630957431566301675,
            15809037446102219312954435152879098683824559980020626143453387822004586242317
        );
        vk.beta2 = Pairing.G2Point(
            [
                6402738102853475583969787773506197858266321704623454181848954418090577674938,
                3306678135584565297353192801602995509515651571902196852074598261262327790404
            ],
            [
                15158588411628049902562758796812667714664232742372443470614751812018801551665,
                4983765881427969364617654516554524254158908221590807345159959200407712579883
            ]
        );
        vk.gamma2 = Pairing.G2Point(
            [
                11559732032986387107991004021392285783925812861821192530917403151452391805634,
                10857046999023057135944570762232829481370756359578518086990519993285655852781
            ],
            [
                4082367875863433681332203403145435568316851327593401208105741076214120093531,
                8495653923123431417604973247489272438418190587263600148770280649306958101930
            ]
        );
        vk.delta2 = Pairing.G2Point(
            [
                12015459509603046664622848573068872137522601580761755298379500093704727126286,
                17631469351267737716854736058926479330509969508379587304279732229470086813429
            ],
            [
                2702057066575386749866316412178687804283861340242294721172500656589741385470,
                16331479155074392938508181609878130695696510568574478304821971899785207760027
            ]
        );
        vk.IC = new Pairing.G1Point[](5);
        vk.IC[0] = Pairing.G1Point(
            20182981438920621835661708529649323473890683255206552488279087630820612116115,
            19077541086335035917806184763327290568869405618897034631563291876167312057529
        );
        vk.IC[1] = Pairing.G1Point(
            20322063958345945009256565105134683037926670281257205583975996432436899942055,
            18523802621894409508679908352881023314336347494558369607699466864276863480442
        );
        vk.IC[2] = Pairing.G1Point(
            4443743895184581538093212500048712945177128992734313765296291053181004745487,
            1968732641010680308334089867120251694601949253530022500848031804141010672087
        );
        vk.IC[3] = Pairing.G1Point(
            7772978182914481212872996555494661251234238182914768967462663536851185295490,
            247226618048173807039027435409116807218397478681126264652946979983491106209
        );
        vk.IC[4] = Pairing.G1Point(
            12225544625454173977074648459005470758709175578793951597192531969799010237782,
            21741379065120834942693006221474615326197523560960842561101963988330928750834
        );
    }

    function playCardVerifyingKey()
        internal
        pure
        returns (VerifyingKey memory vk)
    {
        vk.alfa1 = Pairing.G1Point(
            19642524115522290447760970021746675789341356000653265441069630957431566301675,
            15809037446102219312954435152879098683824559980020626143453387822004586242317
        );
        vk.beta2 = Pairing.G2Point(
            [
                6402738102853475583969787773506197858266321704623454181848954418090577674938,
                3306678135584565297353192801602995509515651571902196852074598261262327790404
            ],
            [
                15158588411628049902562758796812667714664232742372443470614751812018801551665,
                4983765881427969364617654516554524254158908221590807345159959200407712579883
            ]
        );
        vk.gamma2 = Pairing.G2Point(
            [
                11559732032986387107991004021392285783925812861821192530917403151452391805634,
                10857046999023057135944570762232829481370756359578518086990519993285655852781
            ],
            [
                4082367875863433681332203403145435568316851327593401208105741076214120093531,
                8495653923123431417604973247489272438418190587263600148770280649306958101930
            ]
        );
        vk.delta2 = Pairing.G2Point(
            [
                3459653624050952075342954663290551334195957902125067151161852842048258254348,
                1214790574437298933833300672411014517251910496161815014691936343298787549664
            ],
            [
                238569974363515124012964488497970889163410588196894411865316728429287301045,
                12625489612750237269810148697998507918414465154287916740062817769996194379087
            ]
        );
        vk.IC = new Pairing.G1Point[](4);
        vk.IC[0] = Pairing.G1Point(
            12970082406724634872234764345683020524851284329827720643115985409437699951165,
            18389494190923306979801534525784922439939917023350859152737238425068543375302
        );
        vk.IC[1] = Pairing.G1Point(
            4966378046450957615644090638716092027582573958604523324403014507442362110826,
            1637710114269250465599920677646533585646185706092078124496961467913060732681
        );
        vk.IC[2] = Pairing.G1Point(
            21583324831097855382498873256847429477601278496226307165843792451860531799187,
            2256767138065830016654950334372656615787959707437831195799098628731758496626
        );
        vk.IC[3] = Pairing.G1Point(
            1813098125255786197119858251593339626835160903582534812243403011311996574753,
            3213774595107276233783690161584027604037134619524902598309889282328235541430
        );
    }

    function verify(
        uint256[] memory input,
        Proof memory proof,
        VerifyingKey memory vk
    ) internal view returns (uint256) {

            uint256 snark_scalar_field
         = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
        require(input.length + 1 == vk.IC.length, "verifier-bad-input");
        // Compute the linear combination vk_x
        Pairing.G1Point memory vk_x = Pairing.G1Point(0, 0);
        for (uint256 i = 0; i < input.length; i++) {
            require(
                input[i] < snark_scalar_field,
                "verifier-gte-snark-scalar-field"
            );
            vk_x = Pairing.addition(
                vk_x,
                Pairing.scalar_mul(vk.IC[i + 1], input[i])
            );
        }
        vk_x = Pairing.addition(vk_x, vk.IC[0]);
        if (
            !Pairing.pairingProd4(
                Pairing.negate(proof.A),
                proof.B,
                vk.alfa1,
                vk.beta2,
                vk_x,
                vk.gamma2,
                proof.C,
                vk.delta2
            )
        ) return 1;
        return 0;
    }

    function verifyProof(
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[] memory input,
        VerifyingKey memory vk
    ) internal view returns (bool) {
        Proof memory proof;
        proof.A = Pairing.G1Point(a[0], a[1]);
        proof.B = Pairing.G2Point([b[0][0], b[0][1]], [b[1][0], b[1][1]]);
        proof.C = Pairing.G1Point(c[0], c[1]);
        if (verify(input, proof, vk) == 0) {
            return true;
        } else {
            return false;
        }
    }

    function verifyDist1Proof(
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[6] memory input
    ) public view returns (bool) {
        uint256[] memory inputValues = new uint256[](input.length);
        for (uint256 i = 0; i < input.length; i++) {
            inputValues[i] = input[i];
        }
        return verifyProof(a, b, c, inputValues, dist1VerifyingKey());
    }

    function verifyDist2Proof(
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[5] memory input
    ) public view returns (bool) {
        uint256[] memory inputValues = new uint256[](input.length);
        for (uint256 i = 0; i < input.length; i++) {
            inputValues[i] = input[i];
        }
        return verifyProof(a, b, c, inputValues, dist2VerifyingKey());
    }

    function verifyCardDrawProof(
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[4] memory input
    ) public view returns (bool) {
        uint256[] memory inputValues = new uint256[](input.length);
        for (uint256 i = 0; i < input.length; i++) {
            inputValues[i] = input[i];
        }
        return verifyProof(a, b, c, inputValues, drawCardVerifyingKey());
    }

    function verifyCardDrawProof(
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[3] memory input
    ) public view returns (bool) {
        uint256[] memory inputValues = new uint256[](input.length);
        for (uint256 i = 0; i < input.length; i++) {
            inputValues[i] = input[i];
        }
        return verifyProof(a, b, c, inputValues, playCardVerifyingKey());
    }
}
