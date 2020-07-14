
ChartBrush = function(_parentElement, _dimensions){
    this.parentElement = _parentElement;
    this.dimensions = _dimensions;

    this.initVis();
};

ChartBrush.prototype.initVis = function() {
    var vis = this;

    vis.margin = {top: 0, right: 75, bottom: 20, left: 85};
    vis.width = vis.dimensions[0] - vis.margin.left - vis.margin.right;
    vis.height = vis.dimensions[1] - vis.margin.top - vis.margin.bottom;

    vis.svg = d3.select(vis.parentElement).append("svg")
        .attr("width", vis.width + vis.margin.left + vis.margin.right)
        .attr("height", vis.height + vis.margin.top + vis.margin.bottom);

    vis.t = () => { return d3.transition().duration(1000); };

    vis.g = vis.svg.append("g")
        .attr("transform", "translate(" + vis.margin.left + "," + vis.margin.top + ")");

    vis.x = d3.scaleBand()
   		.range([0, vis.width])
   		.paddingInner(0.0);

   	vis.y = d3.scalePow()
   		.domain([-30, 30])
   		.range([vis.height, 0])
        .exponent(0.5);

    vis.xAxisCall = d3.axisBottom()
        .scale(vis.x);

    vis.xAxis = vis.g.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + vis.y(0) +")")
        .call(vis.xAxisCall);

    vis.areaPath = vis.g.append("path")
        .attr("fill", "#ccc")
        .attr("opacity", 0.9);

    // Initialize brush component
    vis.brush = d3.brushX()
        .handleSize(10)
        .extent([[0, 0], [vis.width, vis.height]])
        .on("brush end", brushed);

    // Append brush component
    vis.brushComponent = vis.g.append("g")
        .attr("class", "brush")
        .call(vis.brush);

    vis.wrangleData();
};

ChartBrush.prototype.wrangleData = function(){
    const vis = this;

	vis.chartData = genreShowData.sort(function(a,b) {
        return b.rating_difference - a.rating_difference;
    });

	vis.x.domain(vis.chartData.map(function(d) { return d.show_name }));

	vis.updateVis();
};

ChartBrush.prototype.updateVis = function(){
    const vis = this;

    vis.area = d3.area()
        .x((d) => { return vis.x(d.show_name); })
        .y0(vis.y(0))
        .y1((d) => { return vis.y(d.rating_difference); });

    vis.areaPath
        .datum(vis.chartData)
        .attr("d", vis.area);
};


ChartBrush.prototype.setBrush = function(brushRange) {
    const vis = this;

    const brushSteps = [vis.x(vis.x.domain()[brushRange[0]]), vis.x(vis.x.domain()[brushRange[1]])];

    vis.brushComponent
        .call(vis.brush.move, [brushSteps[0], brushSteps[1]]);
}


function brushed() {

    const eachStep = chartBrush.x.step();
	const selection = d3.event.selection || chartBrush.x.range();

	domainIndices = [Math.round(selection[0] / eachStep), Math.round(selection[1] / eachStep)];

	rankedShows.wrangleData();

}