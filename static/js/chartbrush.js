
ChartBrush = function(_parentElement, _dimensions){
    this.parentElement = _parentElement;
    this.dimensions = _dimensions;

    this.initVis();
};

ChartBrush.prototype.initVis = function() {
    var vis = this;

    vis.margin = {top: 5, right: 20, bottom: 5, left: 20};
    vis.width = vis.dimensions[0] - vis.margin.left - vis.margin.right;
    vis.height = vis.dimensions[1] - vis.margin.top - vis.margin.bottom;

    vis.svg = d3.select(vis.parentElement).append("svg")
        .attr("id", "chartbrush-box")
        .attr("width", vis.width + vis.margin.left + vis.margin.right)
        .attr("height", vis.height + vis.margin.top + vis.margin.bottom);

    vis.t = () => { return d3.transition().duration(1000); };

    vis.g = vis.svg.append("g")
        // .attr("id", "chartbrush-innerbox")
        .attr("transform", "translate(" + vis.margin.left + "," + vis.margin.top + ")");

    vis.x = d3.scalePoint()
   		.range([0, vis.width]);

   	vis.y = d3.scalePow()
   		.domain([-30, 30])
   		.range([vis.height, 0])
        .exponent(0.5);

    vis.xAxisCall = d3.axisBottom();

    vis.xAxis = vis.g.append("g")
        .attr("class", "x-axis x axis")
        .attr("z-index", "2");

    vis.areaPath = vis.g.append("path")
        .attr("fill", "#ccc")
        .attr("opacity", 0.9);

    // Initialize brush component
    vis.brush = d3.brushX()
        .handleSize(10)
        .extent([[0, 0], [vis.width, vis.height]])
        .on("start brush end", vis.brushed);

    // Append brush component
    vis.brushComponent = vis.g.append("g")
        .attr("class", "brush")
        .call(vis.brush);

    vis.arc = d3.arc()
        .innerRadius(0)
        .outerRadius((vis.height - vis.margin.top - vis.margin.bottom) / 5)
        .startAngle(0)
        .endAngle((d, i) => i ? Math.PI : -Math.PI);

    vis.brushHandle = (g, selection) => g
        .selectAll(".handle--custom")
        .data([{type: "w"}, {type: "e"}])
        .join(
            enter => enter.append("path")
            .attr("class", "handle--custom")
            .attr("fill", "#666")
            .attr("fill-opacity", 0.8)
            .attr("stroke", "#000")
            .attr("stroke-width", 1.5)
            .attr("cursor", "ew-resize")
            .attr("d", vis.arc)
        )
        .attr("display", selection === null ? "none" : null)
        .attr("transform", selection === null ? null : (d, i) => `translate(${selection[i]},${(vis.height + vis.margin.top - vis.margin.bottom) / 2})`)

    vis.wrangleData();
};

ChartBrush.prototype.wrangleData = function(){
    const vis = this;

	vis.chartData = genreShowData.sort(function(a,b) {
        return b[showBarVar] - a[showBarVar];
    });

	vis.x.domain(vis.chartData.map(function(d) { return d.show_name }));

	if (showBarVar === 'average_av_rating') {
	    vis.y = d3.scalePow()
            .domain([0, 100])
            .range([vis.height, 0])
            .exponent(2);
    }
    else {
        vis.y = d3.scalePow()
            .domain([-30, 30])
            .range([vis.height, 0])
            .exponent(0.5);
    }

	vis.updateVis();
};

ChartBrush.prototype.updateVis = function() {
    const vis = this;

    vis.xAxisCall
        .scale(vis.x)
        .tickValues([]);

    vis.area = d3.area()
        .x((d) => { return vis.x(d.show_name); })
        .y0(vis.y(0))
        .y1((d) => { return vis.y(d[showBarVar]); });

    vis.areaChart = vis.areaPath
        .datum(vis.chartData)
        .attr("z-index", 1)
        .transition()
            .duration(800)
            .attr("d", vis.area);

    vis.xAxis
        .transition()
        .attr("transform", "translate(0," + vis.y(0) +")");

    vis.xAxis
        .call(vis.xAxisCall);

};


ChartBrush.prototype.setBrush = function(brushRange) {
    const vis = this;

    const brushSteps = [vis.x(vis.x.domain()[brushRange[0]]), vis.x(vis.x.domain()[brushRange[1]])];

    vis.brushComponent
        .call(vis.brush.move, [brushSteps[0], brushSteps[1]]);
};


ChartBrush.prototype.brushed = function() {
    const eachStep = chartBrush.x.step();
	const selection = d3.event.selection || chartBrush.x.range();

	domainIndices = [Math.round(selection[0] / eachStep), Math.ceil(0.01 + (selection[1] / eachStep))];

	d3.select(this).call(chartBrush.brushHandle, selection);
	rankedShows.wrangleData();

}