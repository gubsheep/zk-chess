const fs = require('fs')

const verifierDist1Path = process.argv[2]
const verifierDist2Path = process.argv[3]
const verifierOutPath = process.argv[4]

if (typeof verifierOutPath !== 'string') {
    console.log('usage')
    console.log('templater verifierDist1Path verifierDist2Path verifier_out_path')
    process.exit(1)
}

let finalsol = fs.readFileSync('Verifier.sol.template').toString()
finalsol = finalsol.replace('{{dist1VerifyingKey}}', getVerifier(verifierDist1Path))
finalsol = finalsol.replace('{{dist2VerifyingKey}}', getVerifier(verifierDist2Path))

fs.writeFile(verifierOutPath, finalsol, function (err) {
    if (err) throw err
})

function getVerifier(path) {

    var verifier = []

    // keeping the fn defintion I dont want, but simpler to implement
    for (const line of fs.readFileSync(path).toString().split('\n')) {
        if (line.includes('function verifyingKey()') || verifier.length > 0) {
            verifier.push(line)
            if (line.includes('}')) {
                break
            }
        }
    }

    if (verifier.length === 0) {
        process.exit(1)
    }

    // get rid of fn wrapper
    verifier.pop()
    verifier.shift()
    return verifier.join('\n')
}
