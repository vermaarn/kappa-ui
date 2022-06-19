import React, { useEffect, useRef } from 'react'
import * as d3 from 'd3';


function MotionView() {
  const plotRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const plotEl = plotRef.current
    const containerEl = containerRef.current
    if (!plotEl || !containerEl) return

    const main = async () => {
      console.log(containerEl.clientHeight, containerEl.offsetWidth)
      console.log(plotEl.clientHeight, plotEl.offsetWidth)

      const margin = { top: 10, right: 30, bottom: 30, left: 60 },
        width = containerEl.offsetWidth - margin.left - margin.right,
        height = containerEl.offsetHeight - margin.top - margin.bottom;

      // append the svg object to the body of the page
      const svg = d3.select(plotEl)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      const dataCsv = await d3.csv("https://raw.githubusercontent.com/holtzy/data_to_viz/master/Example_dataset/3_TwoNumOrdered_comma.csv")

      const data = dataCsv.map(function (d) {
        return { date: d3.timeParse("%Y-%m-%d")(d.date), value: d.value }
      });

      // Add X axis --> it is a date format
      const x = d3.scaleTime()
        .domain(d3.extent(data, function (d) { return d.date; }))
        .range([0, width]);
      const xAxis: any = svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x));

      // Add Y axis
      const y = d3.scaleLinear()
        .domain([0, d3.max(data, function (d) { return +d.value; })])
        .range([height, 0]);

      svg.append("g")
        .call(d3.axisLeft(y));

      // Add a clipPath: everything out of this area won't be drawn.
      const clip = svg.append("defs").append("svg:clipPath")
        .attr("id", "clip")
        .append("svg:rect")
        .attr("width", width)
        .attr("height", height)
        .attr("x", 0)
        .attr("y", 0);

      // Add brushing
      const brush = d3.brushX()                   // Add the brush feature using the d3.brush function
        .extent([[0, 0], [width, height]])  // initialise the brush area: start at 0,0 and finishes at width,height: it means I select the whole graph area
        .on("end", updateChart)               // Each time the brush selection changes, trigger the 'updateChart' function

      // Create the line variable: where both the line and the brush take place
      const line = svg.append('g')
        .attr("clip-path", "url(#clip)")

      // Add the line
      line.append("path")
        .datum(data)
        .attr("class", "line")
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", 1.5)
        .attr("d", d3.line(function (d, index, data) { return x(d.date) }, function (d, index, data) { return y(parseFloat(d.value)) }))

      // Add the brushing
      line
        .append("g")
        .attr("class", "brush")
        .call(brush);

      // A function that set idleTimeOut to null
      let idleTimeout: NodeJS.Timeout | null

      function idled() { idleTimeout = null; }

      // A function that update the chart for given boundaries
      function updateChart(this: SVGGElement, event: any, d: unknown) {

        // What are the selected boundaries?
        let extent = event.selection

        // If no selection, back to initial coordinate. Otherwise, update X axis domain
        if (!extent) {
          if (!idleTimeout) return idleTimeout = setTimeout(idled, 350); // This allows to wait a little bit
          x.domain([4, 8])
        } else {
          x.domain([x.invert(extent[0]), x.invert(extent[1])])
          line.select(".brush").call(brush.move, null) // This remove the grey brush area as soon as the selection has been done
        }

        // Update axis and line position
        xAxis.transition().duration(1000).call(d3.axisBottom(x))
        (line as any)
          .select('.line')
          .transition()
          .duration(1000)
          .attr("d", d3.line(function (d: any) { return x(d.date) }, function (d) { return y(d.value) })
          )
      }

      // If user double click, reinitialize the chart
      svg.on("dblclick", function () {
        x.domain(d3.extent(data, function (d) { return d.date; }))
        xAxis.transition().call(d3.axisBottom(x))
        (line as any)
          .select('.line')
          .transition()
          .attr("d", d3.line(function (d: any) { return x(d.date) }, function (d) { return y(d.value) })
          )
      });
    }

    setTimeout(() => {
      main()
    }, 300)

  }, [plotRef, containerRef])

  return (
    <div ref={containerRef} className="w-full h-full">
      <div
        className="w-full h-full"
        ref={plotRef}
      />
    </div>
  )
}

export default MotionView