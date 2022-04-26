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
      svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x));

      // Add Y axis
      const y = d3.scaleLinear()
        .domain([0, d3.max(data, function (d) { return +d.value; })])
        .range([height, 0]);
      svg.append("g")
        .call(d3.axisLeft(y));

      // Add the line
      svg.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", 1.5)
        .attr("d", d3.line(function (d, index, data) { return x(d.date) }, function (d, index, data) { return y(parseFloat(d.value)) }))
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