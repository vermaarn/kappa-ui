import React, { useEffect, useRef } from 'react'
import Plotly from "plotly.js-dist-min"
import Plot from 'react-plotly.js';

function MotionView() {

	const plotRef = useRef<HTMLDivElement>(null)

	// useEffect(() => {
	// 	const plotEl = plotRef.current
	// 	if (!plotEl) return;

	// 	const trace1 = {
	// 		x: [1, 2, 3, 4],
	// 		y: [10, 15, 13, 17],
	// 		type: 'scatter'
	// 	};

	// 	const trace2 = {
	// 		x: [1, 2, 3, 4],
	// 		y: [16, 5, 11, 9],
	// 		type: 'scatter'
	// 	};

	// 	const data: any = [trace1, trace2];

	// 	Plotly.newPlot(plotEl, data);

	// }, [plotRef])

	return (
		<div className="w-full h-full">

			<Plot
				data={[
					{
						x: [1, 2, 3],
						y: [2, 6, 3],
						type: 'scatter',
						mode: 'lines+markers',
						marker: { color: 'red' },
					},
					{ type: 'bar', x: [1, 2, 3], y: [2, 5, 3] },
				]}
				layout={{ width: 320, height: 240, title: 'A Fancy Plot' }}
			/>
		</div>
	)
}

export default MotionView