

var numeric = require('./numericjs/numeric.js');


var a = [1, 2, 3, 4];
var b = 0;

a.map(function(e){
     b += e;
});

console.log(b);
console.log(a);
console.log(a.length);
console.log(3 != 4-1);
console.log(a[1]);
var c = [];
var d = c.filter(function(i){
    return true;
});
console.log(c);
console.log(d);



