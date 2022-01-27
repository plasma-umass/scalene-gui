function makeBar(python, native, system) {
    return {
	"$schema": "https://vega.github.io/schema/vega-lite/v5.json",
	"config": {
	    "view": {
		"stroke" : "transparent"
	    }
	},
	"width": "container",
	"height" : "container",
	"padding": 0,
	"data": {
	    "values": [{"x" : 0, "y" : python.toFixed(1), "c": "(Python) " + python.toFixed(1) + "%" },
		       {"x" : 0, "y" : native.toFixed(1), "c": "(native) " + native.toFixed(1) + "%" },
		       {"x" : 0, "y" : system.toFixed(1), "c": "(system) " + system.toFixed(1) + "%" }]
	},
	"mark": { "type" : "bar" },
	"encoding": {
	    "x": {"aggregate": "sum", "field": "y", "axis": false,
		  "scale" : { "domain" : [0, 100] } },
	    "color": {"field": "c", "type": "nominal", "legend" : false,
		      "scale": { "range": ["darkblue", "lightblue", "blue"] } },
	    "tooltip" : [
		{ "field" : "c", "type" : "nominal", "title" : "time" }
	    ]
	},
    };
}


function makeMemoryBar(memory, title, python_percent, total, color) {
    return {
	"$schema": "https://vega.github.io/schema/vega-lite/v5.json",
	"config": {
	    "view": {
		"stroke" : "transparent"
	    }
	},
	"width": "container",
	"height" : "container",
	"padding": 0,
	"data": {
	    "values": [{"x" : 0, "y" : python_percent * memory, "c": "(Python) " + (python_percent * memory).toFixed(1) + "MB" },
		       {"x" : 0, "y" : (1.0 - python_percent) * memory, "c": "(native) " + ((1.0 - python_percent) * memory).toFixed(1) + "MB" }]
	},
	"mark": { "type" : "bar" },
	"encoding": {
	    "x": {"aggregate": "sum", "field": "y", "axis": false,
		  "scale" : { "domain" : [0, total] } },
	    "color": {"field": "c", "type": "nominal", "legend" : false,
		      "scale": { "range": [color, "lightgreen", "green"] } },
	    "tooltip" : [
		{ "field" : "c", "type" : "nominal", "title" : title }
	    ]
	},
    };
}


function makeSparkline(samples, maximum) {
    const values = samples.map((v, i) => {
	return {"x": i, "y": v, "c": 0};
    });
    const strokeWidth = 1; // 0.25;
    return {
	"$schema": "https://vega.github.io/schema/vega-lite/v5.json",
	// "description": "Memory consumption over time.",
	//"config": {
	//    "view": {
//		"stroke" : "transparent"
//	    }
//	},
	"width": 75,
	"height": 10,
	"padding": 0,
	"data": {
	    "values": values
	},
	"mark" : { "type" : "line", "strokeWidth": strokeWidth },
	"encoding" : {
	    "x" : {"field": "x",
		   "type" : "temporal",
		   "axis" : false},
	    "y" : {"field": "y",
		   "type" : "quantitative",
		   "axis" : false,
		   "scale" : { "domain" : [0, maximum] }},
	    "color" : {
		"field" : "c",
		"type" : "nominal",
		"legend" : false,
		"scale" : {
		    "range": ["darkgreen"]
		}
	    },
	},
    }
}

function addListeners() {
    const fileSelector = document.getElementById('select_file');
    const fileElement = document.getElementById('input');
    
    fileSelector.addEventListener(
	'click',
	(e) => {
	    if (fileElement) {
		fileElement.click();
	    }
	}, false);
}

const CPUColor = "blue";
const MemoryColor = "green";
const CopyColor = "goldenrod";
const columns = [
    { title : ["time", ""], color: CPUColor },
    { title: ["memory", "average"], color: MemoryColor },
    { title: ["", "peak"], color: MemoryColor },
    { title: ["", "timeline/%"], color: MemoryColor },
    { title: ["copy", "(MB/s)"], color: CopyColor },
    { title: ["gpu", ""], color: CopyColor },
    { title: ["", ""], color: "black" },
];
let memory_sparklines = [];
let cpu_bars = [];
let memory_bars = [];

function makeTableHeader(fname) {
    let s = '';
    s += '<thead class="thead-light">';
    s += '<tr>';
    for (const col of columns) {
	s += `<th><font style="font-variant: small-caps" color=${col.color}>${col.title[0]}</font></th>`;
    }
    s += '</tr>';
    s += '<tr>';
    for (const col of columns) {
	s += `<th><em><font style="font-size: small" color=${col.color}>${col.title[1]}</font></em></th>`;
    }
    s += `<th><code>${fname}</code></th></tr>`;
    s += '</thead>';
    return s;
}

function makeProfileLine(line, prof) {
    let s = '';
    s += '<tr>';
    s += '<td style="height: 10; vertical-align: middle" align="left">';
    s += `<span style="height: 10; width: 100; vertical-align: middle" id="cpu_bar${cpu_bars.length}"></span>`;
    cpu_bars.push(makeBar(line.n_cpu_percent_python, line.n_cpu_percent_c, line.n_sys_percent));
    if (line.n_avg_mb < 1.0) {
	s += '<td></td>';
    } else {
	s += `<td style="height: 10; vertical-align: middle" align="left">`;
	s += `<span style="height: 10; width: 100; vertical-align: middle" id="memory_bar${memory_bars.length}"></span>`;
	s += '</td>';
	memory_bars.push(makeMemoryBar(line.n_avg_mb.toFixed(0), "average memory", parseFloat(line.n_python_fraction), prof.max_footprint_mb.toFixed(2), "darkgreen"));
    }
    if (line.n_peak_mb < 1.0) {
	s += '<td></td>';
	memory_bars.push(null);
    } else {
	s += `<td style="height: 10; vertical-align: middle" align="left">`;
	s += `<span style="height: 10; width: 100; vertical-align: middle" id="memory_bar${memory_bars.length}"></span>`;
	memory_bars.push(makeMemoryBar(line.n_peak_mb.toFixed(0), "peak memory", parseFloat(line.n_python_fraction), prof.max_footprint_mb.toFixed(2), "darkgreen"));
	s += '</td>';
    }
    s += `<td style='vertical-align: middle'><span style="height:10; vertical-align: middle" id="memory_sparkline${memory_sparklines.length}"></span>`;	    
    if (line.n_usage_fraction >= 0.01) {
	s += `<font style="font-size: small">${(100 * line.n_usage_fraction).toFixed(0)}%</font>`;
    }
    s += '</td>';
    if (line.memory_samples.length > 0) {
	memory_sparklines.push(makeSparkline(line.memory_samples, prof.max_footprint_mb));
    } else {
	memory_sparklines.push(null);
    }
    if (line.n_copy_mb_s < 1.0) {
	s += '<td></td>';
    } else {
	s += `<td align="right"><font color="${CopyColor}">${line.n_copy_mb_s.toFixed(0)}</font></td>`;
    }
    if (line.n_gpu_percent < 1.0) {
	s += '<td></td>';
    } else {
	s += `<td align="right"><font color="${CopyColor}">${line.n_gpu_percent.toFixed(0)}</font></td>`;
    }
    s += `<td align="right" style="vertical-align: top"><font color="gray" style="font-size: 70%; vertical-align: middle" >${line.lineno}&nbsp;</font></td>`;
    const codeLine = Prism.highlight(line.line, Prism.languages.python, 'python');
    s += `<td style="height:10" align="left" bgcolor="whitesmoke" style="vertical-align: middle"><pre style="height: 10; display: inline; white-space: pre-wrap; overflow-x: auto; border: 0px; vertical-align: middle"><code class="language-python">${codeLine}</code></pre></td>`;
    s += '</tr>';
    return s;
}

async function display(prof) {
    console.log(prof);
    let s = "";
    s += `<p class="text-center" style="vertical-align: middle">Memory usage: <span style="height: 10; vertical-align: middle" id="memory_sparkline0"></span> (max: ${prof.max_footprint_mb.toFixed(2)}MB, growth rate: ${prof.growth_rate.toFixed(2)}%)</p>`;
    memory_sparklines.push(makeSparkline(prof.samples, prof.max_footprint_mb));
    s += '<div class="container-fluid">';
    // Print profile for each file
    for (const f in prof.files) {
	s += `<p class="text-center"><code>${f}</code>: % of time = ${prof.files[f].percent_cpu_time.toFixed(2)}% out of ${prof.elapsed_time_sec.toFixed(2)}s.</p>`
	s += '<div>';
	s += '<table class="profile table table-hover table-condensed">';
	s += makeTableHeader(f);
	s += '<tbody>';
	// Print per-line profiles.
	let prevLineno = -1;
	for (const l in prof.files[f].lines) {
	    const line = prof.files[f].lines[l];
	    // Add a space whenever we skip a line.
	    if (line.lineno > prevLineno + 1) {
		s += '<tr><td style="line-height: 1px" colspan="${columns.length+1}">&nbsp;</td></tr>';
	    }
	    prevLineno = line.lineno;
	    s += makeProfileLine(line, prof);
	}
	// Print out function summaries
	s += `<tr><td colspan=${columns.length + 1}><hr></td></tr>`;
	s += `<tr><td colspan=${columns.length}></td><td><font style="font-size: small; font-style: italic">functions:</font></td></tr>`;
	for (const l in prof.files[f].functions) {
	    const line = prof.files[f].functions[l];
	    // Act as if this was a line of source code.
	    line.line = line.fn_name;
	    line.lineno = ''; // We need to put the line number into the JSON!
	    s += makeProfileLine(line, prof);
	}
	s += '</tbody>';
	s += '</table>';
	s += '</div>';
    }
    s += '</div>';
    const p = document.getElementById('profile');
    p.innerHTML = s;
    memory_sparklines.forEach((p, index) => {
	if (p) {
	    (async () => {
		await vegaEmbed(`#memory_sparkline${index}`, p, {"actions" : false });
	    })();
	}
    });
    cpu_bars.forEach((p, index) => {
	if (p) {
	    (async () => {
		await vegaEmbed(`#cpu_bar${index}`, p, {"actions" : false });
	    })();
	}
    });
    memory_bars.forEach((p, index) => {
	if (p) {
	    (async () => {
		await vegaEmbed(`#memory_bar${index}`, p, {"actions" : false });
	    })();
	}
    });
}

function load(profile) {
    (async () => {
	// let resp = await fetch(jsonFile);
	// let prof = await resp.json();
	await display(profile);
    })();
}

function loadFile() {
    const input = document.getElementById('fileinput');
    const file = input.files[0];
    const fr = new FileReader();
    fr.onload = doSomething;
    fr.readAsText(file);
}

function doSomething(e) {
    let lines = e.target.result;
    const profile = JSON.parse(lines);
    load(profile);
//    console.log("GOT'EM");
//    console.log(lines);
}

function doIt() {
    // Disabled for now:
    // addListeners();
    // Read in the example JSON file.
//    load(); // example.json");
}

						 
