var testDict = {};
testDict['one'] = 1;
testDict['two'] = 2;
testDict['three'] = 3;

Object.keys(testDict).map(function(key){
    var val = testDict[key];
    return val;
}).map(function(val){
    console.log(val);
});
