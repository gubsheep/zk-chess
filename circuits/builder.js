require('dotenv').config();

const { execSync } = require('child_process');
const snarkjs = require('snarkjs');
const fs = require('fs');
const path = require('path');

const circuitsList = process.argv[2];
const wasmOutPath = process.argv[3];
const zkeyOutPath = process.argv[4];
const verifierOutPath = process.argv[5];

if (process.argv.length != 6) {
  console.log('usage');
  console.log(
    'builder comma,seperated,list,of,circuits wasm_out_path zkey_out_path verifier_out_path'
  );
  process.exit(1);
}

let finalsol = fs.readFileSync('Verifier.sol.template').toString();

const cwd = process.cwd();

for (name of circuitsList.split(',')) {
  process.chdir(cwd + '/' + name);

  // doesnt catch yet
  // https://github.com/iden3/snarkjs/pull/75
  try {
    execSync('circom circuit.circom --r1cs --wasm --sym', {
      stdio: 'inherit',
    });
    execSync('snarkjs r1cs info circuit.r1cs', { stdio: 'inherit' });
    execSync(
      'snarkjs zkey new circuit.r1cs pot15_final.ptau circuit_' +
        name +
        '.zkey',
      { stdio: 'inherit' }
    );
    execSync(
      'snarkjs zkey beacon circuit_' +
        name +
        '.zkey circuit.zkey ' +
        process.env[name + '_beacon'] +
        ' 10',
      { stdio: 'inherit' }
    );
    execSync(
      'snarkjs zkey export verificationkey circuit.zkey verification_key.json',
      { stdio: 'inherit' }
    );
    execSync('snarkjs wtns calculate circuit.wasm input.json witness.wtns', {
      stdio: 'inherit',
    });
    execSync(
      'snarkjs groth16 prove circuit.zkey witness.wtns proof.json public.json',
      { stdio: 'inherit' }
    );
    execSync(
      'snarkjs groth16 verify verification_key.json public.json proof.json',
      { stdio: 'inherit' }
    );
    execSync('snarkjs zkey export solidityverifier circuit.zkey verifier.sol', {
      stdio: 'inherit',
    });
    fs.copyFileSync(
      'circuit.wasm',
      cwd + '/' + wasmOutPath + '/' + name + '/circuit.wasm'
    );
    fs.copyFileSync(
      'circuit.zkey',
      cwd + '/' + zkeyOutPath + '/' + name + '.zkey'
    );
  } catch (error) {
    console.log(error);
    process.exit(1);
  }

  finalsol = finalsol.replace(
    '{{' + name + 'VerifyingKey}}',
    getVerifier('verifier.sol')
  );
}

fs.writeFile(cwd + '/' + verifierOutPath, finalsol, function (err) {
  if (err) throw err;
});

function getVerifier(path) {
  var verifier = [];

  // keeping the fn defintion I dont want, but simpler to implement
  for (const line of fs.readFileSync(path).toString().split('\n')) {
    if (line.includes('function verifyingKey()') || verifier.length > 0) {
      verifier.push(line);
      if (line.includes('}')) {
        break;
      }
    }
  }

  if (verifier.length === 0) {
    throw "Couldn't find verifyingKey";
  }

  // get rid of fn wrapper
  verifier.pop();
  verifier.shift();
  return verifier.join('\n');
}
