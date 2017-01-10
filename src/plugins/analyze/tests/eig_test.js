var numeric = require('numeric');

var A = [[1,2,9],[1/2,1,2],[1/9,1/2,1]];

var B = numeric.eig(A);

console.log(numeric.prettyPrint(A));
console.log(numeric.prettyPrint(B.E));
console.log(A[1][2]);
