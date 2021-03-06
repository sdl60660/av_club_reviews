
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