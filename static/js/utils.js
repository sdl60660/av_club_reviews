
function translateGrade(grade) {
    
    var gradeTranslationDict = {
        'A+': 11,
        'A': 11,
        'A-': 10,
        'B+': 9,
        'B': 8,
        'B-': 7,
        'C+': 6,
        'C': 5,
        'C-': 4,
        'D+': 3,
        'D': 2,
        'D-': 1,
        'F': 0
    }

    return gradeTranslationDict[grade];
}

function onlyUnique(value, index, self) { 
    return self.indexOf(value) === index;
};

function Quartile(data, q) {
  data=Array_Sort_Numbers(data);
  var pos = ((data.length) - 1) * q;
  var base = Math.floor(pos);
  var rest = pos - base;
  if( (data[base+1]!==undefined) ) {
    return data[base] + rest * (data[base+1] - data[base]);
  } else {
    return data[base];
  }
}

function Array_Sort_Numbers(inputarray){
  return inputarray.sort(function(a, b) {
    return a - b;
  });
}