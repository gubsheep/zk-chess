const verifier_dist1_path = process.argv[2];
const verifier_dist2_path = process.argv[3];
const verifier_out_path = process.argv[4];

if (typeof verifier_out_path !== 'string') {
    console.log("usage");
    console.log("templater verifier_dist1_path verifier_dist2_path verifier_out_path")
    process.exit(1)
}

let verifier_dist1 = getVerifier(verifier_dist1_path);
let verifier_dist2 = getVerifier(verifier_dist2_path);

var fs = require('fs');
const { exit } = require('process');
var finalsol = fs.readFileSync("Verifier.sol.template").toString();

//worst perf possible?
finalsol = finalsol.replace("{{dist1VerifyingKey}}", verifier_dist1)
finalsol = finalsol.replace("{{dist2VerifyingKey}}", verifier_dist2)

console.log(verifier_out_path);
fs.writeFile(verifier_out_path, finalsol, function (err) {
    if (err) throw err;
});




function getVerifier(path) {
    var fs = require('fs');

    //pulling all in memory right? ah well its small
    const dist1 = fs.readFileSync(path).toString().split("\n");
    let verifier = [];

    //accumulator would be nicer
    for (line of dist1) {
        if (line.includes("function verifyingKey()") || verifier.length > 0) {
            verifier.push(line);
            if (line.includes("}")) {
                break;
            }
        }
    }

    //check for not empty...

    //dumb but well just ignore the first and last and add newlines back in
    verifier.pop()
    verifier.shift();
    return verifier.join('\n');
}

