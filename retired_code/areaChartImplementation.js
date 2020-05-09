

function translateGrade(grade) {
  var grade_translation_dict = {
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
  return grade_translation_dict[grade];
}

function mouseover() {
    d3.selectAll(".season-charts")
        .attr("opacity", 0.4)
    d3.select(this)
        .attr("opacity", 0.9);

    d3.selectAll(".season-label")
        .attr("opacity", 0.0);
    d3.select("#season-" + this.getAttribute("season") + "-label")
        .attr("opacity", 1.0);
}

function mouseout() {
    d3.selectAll(".season-label")
        .attr("opacity", 1.0);

    d3.selectAll(".season-charts")
        .attr("opacity",defaultFillOpacity);
}

// We can probably replace this with a built-in d3 color scale paired with a scalar to map seasons to colors (maybe scaleSequential)
// function random_color(seed) {
//   // console.log(seed);
//   var color =  Math.floor((Math.abs(Math.sin(seed) * 16777215)) % 16777215).toString(16);
//   return '#'.concat(color);
// }

var seasonColor = d3.scaleOrdinal()
  .domain([0,100])
  .range(d3.schemePaired)


// set the dimensions and margins of the graph
var margin = {top: 10, right: 30, bottom: 30, left: 50},
    width = 1000 - margin.left - margin.right,
    height = 600 - margin.top - margin.bottom;

// append the svg object to the body of the page
var svg = d3.select("#my_dataviz")
  .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)

var g = svg.append("g")
    .attr("transform",
          "translate(" + margin.left + "," + margin.top + ")");

var defaultFillOpacity = 0.7;

var gradeData = ['F', 'D-', 'D', 'D+', 'C-', 'C', 'C+', 'B-', 'B', 'B+', 'A-', 'A+/A'];

//Read the data
d3.json("static/data/full_data.json").then( function(data) {

  var sampleShow = 'Breaking Bad';
  data = data[sampleShow];

  var showData = data['omdb_data']
  var episodes = data['episodes'];

  var sorted_episodes = episodes.sort((a, b) => (a.season > b.season) ? 1 : (a.season === b.season) ? ((a.episode > b.episode) ? 1 : -1) : -1 );
  sorted_episodes =  sorted_episodes.filter(x => x.grade != null && x.grade.length <= 2);
  for(i=0; i<sorted_episodes.length; i++) {
    sorted_episodes[i].chart_index = i;
  }
  // console.log(sorted_episodes);

  // Add X axis
  var x = d3.scaleLinear()
    .domain([0, sorted_episodes.length])
    .range([0, width]);
  
  var xAxis = d3.axisBottom()
    .scale(x)
    .tickValues([]);
  g.append("g")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis);


  // Add Y axis
  var y = d3.scaleLinear()
    .domain([0, 11])
    .range([ height, 0 ]);

  var axis = d3.axisLeft()
    .scale(y)
    // .orient("left")
    .ticks(12)
    .tickFormat(function (d) {
      return gradeData[d];
    });


  g.append("g")
    .attr("class", "x axis")
    .call(axis);


  var area = d3.area()
    // .interpolate("linear")
    .x(function(d, i) { return x(d.chart_index - chartSeasonIndex); })
    .y0(y(0))
    .y1(function(d) { return y(translateGrade(d.grade)); })
    .curve(d3.curveCardinal);


  var lastSeason = sorted_episodes[sorted_episodes.length - 1].season;
  var groupedData = [];
  var cumulativeCount = 0;
  var chartSeasonIndex = -1;

  // Add the area chart sections for each season
  for(j=1; j<=lastSeason; j++) {

    var group = sorted_episodes.filter(x => x.season == j);

    cumulativeCount += group.length;

    groupedData.push({
      "key": i,
      "values": group.length,
      "cumsum": cumulativeCount
    })

    if (group.length == 0) {
      continue;
    }
    else {
        chartSeasonIndex += 1;
    }

    const average = group.reduce((total, next) => total + translateGrade(next.grade), 0) / group.length;
    var fill = seasonColor(j);

    var areaFill = g.append("path")
      .datum(group)
      .attr("fill", fill)
      .attr("stroke", fill)
      .attr("opacity", defaultFillOpacity)
      .attr("stroke-width", 1.5)
      .attr("id", "season-" + group[0].season + "-chart")
      .attr("season", group[0].season)
      .attr("d", area)
      .attr("class", "season-charts")
      .on("mouseover", mouseover)
      .on("mouseout", mouseout)

    var seasonLine = g.append("line")
      .attr("x1", x(group[0].chart_index - chartSeasonIndex))
      .attr("x2", x(group[group.length - 1].chart_index - chartSeasonIndex))
      .attr("y1", y(average))
      .attr("y2", y(average))
      .attr("class", "line")
      .attr("stroke", "black")
      .style("stroke-dasharray", ("3, 3"));

    g.append("text")
      .text("Season " + group[0].season)
      .attr("id", "season-" + group[0].season + "-label")
      .attr("class", "season-label")
      .attr("text-anchor", "middle")
      .attr("color", "black")
      .attr("x", x((group[group.length - 1].chart_index + group[0].chart_index)/2 - chartSeasonIndex))
      .attr("y", y(0) + 20);

  }



})
