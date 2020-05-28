
ReviewerChart = function(_parentElement, _dimensions) {
	this.parentElement = _parentElement;
    this.dimensions = _dimensions;

    this.initVis();
}

ReviewerChart.prototype.initVis = function() {
	var vis = this;

	// set the dimensions and margins of the chart
    vis.margin = {top: 150, right: 75, bottom: 40, left: 75};
    vis.width = vis.dimensions[0] - vis.margin.left - vis.margin.right;
    vis.height = vis.dimensions[1] - vis.margin.top - vis.margin.bottom;


    vis.svg = d3.select(vis.parentElement)
        .append("svg")
            .attr("width", vis.width + vis.margin.left + vis.margin.right)
            .attr("height", vis.height + vis.margin.top + vis.margin.bottom)

    vis.g = vis.svg.append("g")
        .attr("class", vis.parentGroupClass)
        .attr("transform",
              "translate(" + vis.margin.left + "," + vis.margin.top + ")");

    vis.colorScale = d3.scaleLinear()
  		.domain([4, 0, -4])
  		.range(["green", "#ddd", "red"]);

   	vis.x = d3.scaleBand()
   		.range([0, vis.width])
   		.paddingInner(0.2);

   	vis.y = d3.scaleLinear()
   		.domain([-6, 6])
   		.range([vis.height, 0]);

   	vis.letterGrade = d3.scaleLinear()
   		.domain([9])
   		.range([-vis.height/4]);
   	
   	vis.letterGradeAxisCall = d3.axisLeft()
    	.scale(vis.letterGrade)
    	.tickValues([]);
    vis.letterGradeAxis = vis.g.append("g")
    	.attr("class", "letter-grade-tick axis")
    	.call(vis.letterGradeAxisCall);

   	// Add Axes
    vis.yAxisCall = d3.axisLeft()
    	.scale(vis.y)
    	.tickFormat(function(d) {
    		if (d > 0) {
    			return d3.format("+")(d);
    		}
    		else {
    			return d;
    		}
    	})
    vis.yAxis = vis.g.append("g")
        .attr("class", "y axis")
        .attr("transform", "translate(" + 0 + ",0)")
        .call(vis.yAxisCall);

    vis.xAxisCall = d3.axisBottom()
        .scale(vis.x);
        // .tickValues([0]);
    vis.xAxis = vis.g.append("g")
        .attr("transform", "translate(0," + vis.height/2 + ")")
            .call(vis.xAxisCall);

    vis.tip = d3.tip().attr('class', 'd3-tip')
        .html(function(d) {
            var text = "<span style='color:white'><strong>Reviewer</strong>: " + d.reviewer_name + "</span></br>";

            // text += "<span style='color:white'><strong>Avg. AV Club Review</strong>: " + d3.format('.1f')(d.average_av_score) + "/100 (" + ")</span></br>";
            // text += "<span style='color:white'><strong>Avg. IMDB Score</strong>: " + d3.format('.1f')(d.average_imdb_score) + "/100</span></br></br>";
            // text += "<span style='color:white'><strong>Net Score</strong>: " + d3.format('+.1f')(d.average_av_score - d.average_imdb_score) + "</span></br>";

            return text;
    })

    vis.g.append('circle').attr('id', 'tipfollowscursor')
    vis.svg.call(vis.tip);

	vis.wrangleData();
}

ReviewerChart.prototype.wrangleData = function() {
	var vis = this;

	vis.chartData = reviewerBias;


	vis.updateVis();
}

ReviewerChart.prototype.updateVis = function() {
	var vis = this;

	vis.x.domain(vis.chartData.map(function(d) { return d.reviewer_name }))

	vis.g.selectAll("rect")
		.data(vis.chartData)
		.enter()
		.append("rect")
			.attr("class", "content-bar")
			.attr("x", function(d) {
				return vis.x(d.reviewer_name);
			})
			.attr("height", function(d) {
				return Math.abs(vis.height/2 - vis.y(d.mean_bias));
			})
			.attr("width", vis.x.bandwidth())
			.attr("y", function(d) {
				return vis.y(Math.max(0,d.mean_bias));
			})
			.attr("fill", function(d) {
				return vis.colorScale(d.mean_bias);
			})
			.attr("opacity", 0.7)
			.on("mouseover", function(d) {
                	vis.tip.show(d);
                })
            .on("mouseout", function() {
            	vis.tip.hide();
            })

    // Overlay Bars
    vis.g.selectAll("rect.overlay")
		.data(vis.chartData)
		.enter()
		.append("rect")
			.attr("class", "overlay")
			.attr("x", function(d) {
				return vis.x(d.reviewer_name);
			})
			.attr("height", vis.height)
			.attr("width", vis.x.bandwidth())
			.attr("y", 0)
			.attr("fill", function(d) {
				return "white";
			})
			.attr("opacity", 0)
            .on("mouseover", function(d) {
            	console.log(d3.event.offsetY);
            	var target = d3.select('#tipfollowscursor')
                    .attr('cx', d3.event.pageX - 495)
                    .attr('cy', d3.event.pageY - 253)
                    .attr("r", 0)
                    .node();

    			vis.tip.show(d, target);
            })
            .on("mouseout", function() {
            	vis.tip.hide();
            })
            .on("mousemove", function(d) {
            	var target = d3.select('#tipfollowscursor')
                    .attr('cx', d3.event.pageX - 495)
                    .attr('cy', d3.event.pageY - 253)
		            .node();

		        vis.tip.show(d, target);
            })


}