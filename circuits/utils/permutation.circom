template Permutation(n) {
    // only secure if m^n <<< p (m is # of valid cards, n is hand size), and x ~ p
    // right now this is janky and pretty insecure
    signal input a[n];
    signal input b[n];
    signal input x;

    signal polyA[n];
    polyA[0] <== x - a[0];
    for (var i=1; i < n; i++) {
        polyA[i] <== polyA[i-1] * (x - a[i]);
    }

    signal polyB[n];
    polyB[0] <== x - b[0];
    for (var i=1; i < n; i++) {
        polyB[i] <== polyB[i-1] * (x - b[i]);
    }

    polyA[n-1] === polyB[n-1];
}