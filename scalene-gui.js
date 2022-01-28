function memorySummary(mallocs, title, topN, topThresholdMb) {
    let s = "";
    let i = 0;
    let output = [];
    let mallocList = Object.entries(mallocs);
    mallocList.sort((x, y) => {
	const xf = parseFloat(x[0]);
	const yf = parseFloat(y[0]);
	return yf - xf;
    });
    for (const [memStr, lines] of mallocList) {
	const mem = parseFloat(memStr);
	if (mem >= topThresholdMb) {
	    output.push([mem, lines]);
	    i++;
	}
	if (i > topN) {
	    break;
	}
    }
    if (output) {
	s += `<tr><td colspan=2>Top <em>${title}</em> memory consumption:</td></tr>`;
	for (const [mem, lines] of output) {
	    for (const l of lines) {
		s += `<tr><td><font style="font-size: small; font-color: ${MemoryColor}">${l}:</td><td><font style="font-size: small; font-color: ${MemoryColor}">${mem.toFixed(2)} MB</td></tr>`;
	    }
	}
    }
    return s;
}


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
let columns = [];
let memory_sparklines = [];
let cpu_bars = [];
let memory_bars = [];

function makeTableHeader(fname, gpu, functions = false) {
    let tableTitle;
    if (functions) {
	tableTitle = "function profile";
    } else {
	tableTitle = "line profile";
    }
    columns = [{ title : ["time", ""], color: CPUColor, width: 100 },
	       { title: ["memory", "average"], color: MemoryColor, width: 100 },
	       { title: ["memory", "peak"], color: MemoryColor, width: 100 },
	       { title: ["memory", "timeline/%"], color: MemoryColor, width: 150 },
	       { title: ["copy", "(MB/s)"], color: CopyColor, width: 40 }];
    if (gpu) {
	columns.push({ title: ["gpu", ""], color: CopyColor, width: 40 });
    }
    columns.push({ title: ["", ""], color: "black", width: 100000 });
    let s = '';
    s += '<thead class="thead-light">';
    s += '<tr data-sort-method="thead">';
    for (const col of columns) {
	s += `<th><font style="font-variant: small-caps; width:${col.width}" color=${col.color}>${col.title[0]}</font></th>`;
    }
    s += `<th><font style="font-variant: small-caps">${tableTitle}</font></th>`;
    s += '</tr>';
    s += '<tr data-sort-method="thead">';
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
    const total_time = (line.n_cpu_percent_python + line.n_cpu_percent_c + line.n_sys_percent);
    const total_time_str = String(total_time.toFixed(2)).padStart(10, ' ');
    s += `<td style="height: 10; width: 100; vertical-align: middle" align="left" data-sort='${total_time_str}'>`;
    s += `<span style="height: 10; width: 100; vertical-align: middle" id="cpu_bar${cpu_bars.length}"></span>`;
    cpu_bars.push(makeBar(line.n_cpu_percent_python, line.n_cpu_percent_c, line.n_sys_percent));
    if (line.n_avg_mb < 1.0) {
	s += '<td style="width: 100"></td>';
    } else {
	s += `<td style="height: 10; width: 100; vertical-align: middle" align="left" data-sort='${String(line.n_avg_mb.toFixed(0)).padStart(10, '0')}'>`;
	s += `<span style="height: 10; width: 100; vertical-align: middle" id="memory_bar${memory_bars.length}"></span>`;
	s += '</td>';
	memory_bars.push(makeMemoryBar(line.n_avg_mb.toFixed(0), "average memory", parseFloat(line.n_python_fraction), prof.max_footprint_mb.toFixed(2), "darkgreen"));
    }
    if (line.n_peak_mb < 1.0) {
	s += '<td style="width: 100"></td>';
	memory_bars.push(null);
    } else {
	s += `<td style="height: 10; width: 100; vertical-align: middle" align="left" data-sort='${String(line.n_peak_mb.toFixed(0)).padStart(10, '0')}'>`;
	s += `<span style="height: 10; width: 100; vertical-align: middle" id="memory_bar${memory_bars.length}"></span>`;
	memory_bars.push(makeMemoryBar(line.n_peak_mb.toFixed(0), "peak memory", parseFloat(line.n_python_fraction), prof.max_footprint_mb.toFixed(2), "darkgreen"));
	s += '</td>';
    }
    s += `<td style='vertical-align: middle; width: 150'><span style="height:10; vertical-align: middle" id="memory_sparkline${memory_sparklines.length}"></span>`;	    
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
	s += '<td style="width: 100"></td>';
    } else {
	s += `<td style="width: 100" align="right"><font style="font-size: small" color="${CopyColor}">${line.n_copy_mb_s.toFixed(0)}</font></td>`;
    }
    if (prof.gpu) {
	if (line.n_gpu_percent < 1.0) {
	    s += '<td style="width: 100"></td>';
	} else {
	    s += `<td style="width: 100" align="right"><font color="${CopyColor}">${line.n_gpu_percent.toFixed(0)}</font></td>`;
	}
    }
    s += `<td align="right" style="vertical-align: top; width: 50"><font color="gray" style="font-size: 70%; vertical-align: middle" >${line.lineno}&nbsp;</font></td>`;
    const codeLine = Prism.highlight(line.line, Prism.languages.python, 'python');
    s += `<td style="height:10" align="left" bgcolor="whitesmoke" style="vertical-align: middle" data-sort="${line.lineno}"><pre style="height: 10; display: inline; white-space: pre-wrap; overflow-x: auto; border: 0px; vertical-align: middle"><code class="language-python">${codeLine}</code></pre></td>`;
    s += '</tr>';
    return s;
}

function buildAllocationMaps(prof, f) {
    let averageMallocs = {};
    let peakMallocs = {};
    for (const line of prof.files[f].lines) {
	const avg = parseFloat(line.n_avg_mb);
	if (!averageMallocs[avg]) {
	    averageMallocs[avg] = [];
	}
	averageMallocs[avg].push(line.lineno);
	const peak = parseFloat(line.n_peak_mb);
	if (!peakMallocs[peak]) {
	    peakMallocs[peak] = [];
	}
	peakMallocs[peak].push(line.lineno);
    }
    return [averageMallocs, peakMallocs];
}

async function display(prof) {
    console.log(prof);
    let tableID = 0;
    let s = "";
    s += `<p class="text-center" style="vertical-align: middle">Memory usage: <span style="height: 10; vertical-align: middle" id="memory_sparkline0"></span> (max: ${prof.max_footprint_mb.toFixed(2)}MB, growth rate: ${prof.growth_rate.toFixed(2)}%)</p>`;
    memory_sparklines.push(makeSparkline(prof.samples, prof.max_footprint_mb));
    s += '<div class="container-fluid">';
    // Print profile for each file
    for (const f in prof.files) {
	s += `<p class="text-center"><code>${f}</code>: % of time = ${prof.files[f].percent_cpu_time.toFixed(2)}% out of ${prof.elapsed_time_sec.toFixed(2)}s.</p>`
	s += '<div>';
	s += `<table class="profile table table-hover table-condensed" id="table-${tableID}">`;
	tableID++;
	s += makeTableHeader(f, prof.gpu);
	s += '<tbody>';
	// Print per-line profiles.
	let prevLineno = -1;
	for (const l in prof.files[f].lines) {
	    const line = prof.files[f].lines[l];
	    // Add a space whenever we skip a line.
	    if (line.lineno > prevLineno + 1) {
		s += '<tr>';
		for (let i = 0; i < columns.length; i++) {
		    s += '<td></td>';
		}
		s += `<td style="line-height: 1px" data-sort="${line.lineno}">&nbsp;</td>`;
		s += '</tr>';
	    }
	    prevLineno = line.lineno;
	    s += makeProfileLine(line, prof);
	}
	s += '</tbody>';
	s += '</table>';
	// Print out function summaries.
	s += `<table class="profile table table-hover table-condensed" id="table-${tableID}">`;
	s += makeTableHeader(f, prof.gpu, true);
	s += '<tbody>';
	tableID++;
	if (prof.files[f].functions) {
	    for (const l in prof.files[f].functions) {
		const line = prof.files[f].functions[l];
		s += makeProfileLine(line, prof);
	    }
	}
	s += '</table>';
	s += '</div>';
	if (false) {
	    //// Print out memory consumption top N.
	    const topN = 5; // up to this many
	    const topThresholdMb = 1; // at least this many MB to be reported
	    // Build maps of average and peak allocations.
	    let averageMallocs, peakMallocs;
	    [averageMallocs, peakMallocs] = buildAllocationMaps(prof, f);
	    s += '<table class="profile table table-hover table-condensed">';
	    s += memorySummary(averageMallocs, "average", topN, topThresholdMb);
	    s += '<tr><td></td></tr>';
	    s += memorySummary(peakMallocs, "peak", topN, topThresholdMb);
	}
    }
    s += '</div>';
    const p = document.getElementById('profile');
    p.innerHTML = s;
    for (let i = 0; i < tableID; i++) {
	new Tablesort(document.getElementById(`table-${i}`), { "descending" : true });
    }
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
}

function loadDemo() {
    const profile =
{
    "elapsed_time_sec": 13.351837873458862,
    "files": {
        "./test/testme.py": {
            "functions": [
                {
                    "line": "doit1",
                    "lineno": 8,
                    "memory_samples": [
                        13.014904022216797,
                        14.525557518005371,
                        13.262816429138184,
                        16.176448822021484,
                        11.743648529052734,
                        4.485683441162109,
                        3.091160774230957,
                        1.613560676574707,
                        -0.02654552459716797
                    ],
                    "n_avg_mb": 0.0,
                    "n_copy_mb_s": 0.0,
                    "n_cpu_percent_c": 14.33054036777285,
                    "n_cpu_percent_python": 56.516330658699204,
                    "n_gpu_percent": 0,
                    "n_growth_mb": 13.412849426269531,
                    "n_malloc_mb": 2366.006996154785,
                    "n_mallocs": 243,
                    "n_peak_mb": 13.412849426269531,
                    "n_python_fraction": 0.3719217733258559,
                    "n_sys_percent": 2.6697258686575753,
                    "n_usage_fraction": 0.9809381559797007
                },
                {
                    "line": "doit2",
                    "lineno": 19,
                    "memory_samples": [],
                    "n_avg_mb": 0.0,
                    "n_copy_mb_s": 0.0,
                    "n_cpu_percent_c": 2.6938995773849297,
                    "n_cpu_percent_python": 11.548875266026032,
                    "n_gpu_percent": 0,
                    "n_growth_mb": 0.0,
                    "n_malloc_mb": 0.0,
                    "n_mallocs": 81,
                    "n_peak_mb": 0.0,
                    "n_python_fraction": 0,
                    "n_sys_percent": 0.5660264673943382,
                    "n_usage_fraction": 0.0
                },
                {
                    "line": "stuff",
                    "lineno": 45,
                    "memory_samples": [
                        46.0711030960083,
                        7.97879695892334,
                        0.0,
                        0.0,
                        0.0,
                        0.0,
                        0.0,
                        0.0,
                        0.0
                    ],
                    "n_avg_mb": 0.0,
                    "n_copy_mb_s": 0.0,
                    "n_cpu_percent_c": 0.0,
                    "n_cpu_percent_python": 0.0,
                    "n_gpu_percent": 0,
                    "n_growth_mb": 38.58018112182617,
                    "n_malloc_mb": 38.58018112182617,
                    "n_mallocs": 1,
                    "n_peak_mb": 38.58018112182617,
                    "n_python_fraction": 0.0004198901796234032,
                    "n_sys_percent": 0.0,
                    "n_usage_fraction": 0.015995207025385823
                }
            ],
            "lines": [
                {
                    "line": "import numpy as np\n",
                    "lineno": 1,
                    "memory_samples": [
                        1.4780073165893555,
                        3.049875259399414,
                        4.5293684005737305,
                        6.013333320617676,
                        7.490921974182129,
                        0.0,
                        0.0,
                        0.0,
                        0.0
                    ],
                    "n_avg_mb": 1.4780073165893555,
                    "n_copy_mb_s": 0.4095017385821747,
                    "n_cpu_percent_c": 10.66981604161429,
                    "n_cpu_percent_python": 0.9942248895600196,
                    "n_gpu_percent": 0,
                    "n_growth_mb": 5.918671607971191,
                    "n_malloc_mb": 7.396678924560547,
                    "n_mallocs": 1,
                    "n_peak_mb": 5.918671607971191,
                    "n_python_fraction": 0.001730946839196209,
                    "n_sys_percent": 0.010560862890262592,
                    "n_usage_fraction": 0.0030666369949134626
                },
                {
                    "line": "from numpy import linalg as LA\n",
                    "lineno": 4,
                    "memory_samples": [],
                    "n_avg_mb": 0.0,
                    "n_copy_mb_s": 0.0,
                    "n_cpu_percent_c": 0.0,
                    "n_cpu_percent_python": 0.0,
                    "n_gpu_percent": 0,
                    "n_growth_mb": 0.0,
                    "n_malloc_mb": 0.0,
                    "n_mallocs": 1,
                    "n_peak_mb": 0.0,
                    "n_python_fraction": 0,
                    "n_sys_percent": 0.0,
                    "n_usage_fraction": 0.0
                },
                {
                    "line": "    x = [i*i for i in range(0,100000)][99999]\n",
                    "lineno": 12,
                    "memory_samples": [
                        1.798074722290039,
                        1.6248598098754883,
                        1.624913215637207,
                        3.2757434844970703,
                        1.7981433868408203,
                        -0.05683708190917969,
                        0.0,
                        0.0,
                        0.0
                    ],
                    "n_avg_mb": 1.5563729368610146,
                    "n_copy_mb_s": 0.0,
                    "n_cpu_percent_c": 2.765133367696423,
                    "n_cpu_percent_python": 9.261952895032287,
                    "n_gpu_percent": 0,
                    "n_growth_mb": 1.5624465942382812,
                    "n_malloc_mb": 250.07018280029297,
                    "n_mallocs": 81,
                    "n_peak_mb": 1.5624465942382812,
                    "n_python_fraction": 0.07047404546184824,
                    "n_sys_percent": 0.29205141229556897,
                    "n_usage_fraction": 0.1036782158211244
                },
                {
                    "line": "    y1 = [i*i for i in range(0,200000)][199999]\n",
                    "lineno": 13,
                    "memory_samples": [
                        3.3059587478637695,
                        1.613560676574707,
                        3.3059587478637695,
                        7.523961067199707,
                        6.046360969543457,
                        4.568760871887207,
                        3.091160774230957,
                        1.613560676574707,
                        -0.02654552459716797
                    ],
                    "n_avg_mb": 7.33807071638696,
                    "n_copy_mb_s": 0.0,
                    "n_cpu_percent_c": 4.994650601886122,
                    "n_cpu_percent_python": 20.523290538434527,
                    "n_gpu_percent": 0,
                    "n_growth_mb": 7.430931091308594,
                    "n_malloc_mb": 601.8134460449219,
                    "n_mallocs": 81,
                    "n_peak_mb": 7.430931091308594,
                    "n_python_fraction": 0.11390362175979644,
                    "n_sys_percent": 0.8778710548972191,
                    "n_usage_fraction": 0.2495097322055739
                },
                {
                    "line": "    z1 = [i for i in range(0,300000)][299999]\n",
                    "lineno": 14,
                    "memory_samples": [
                        7.910870552062988,
                        11.287137031555176,
                        8.331944465637207,
                        5.376744270324707,
                        3.899144172668457,
                        -0.02624034881591797,
                        0.0,
                        0.0,
                        0.0
                    ],
                    "n_avg_mb": 13.24605522626712,
                    "n_copy_mb_s": 0.0,
                    "n_cpu_percent_c": 6.576863365710298,
                    "n_cpu_percent_python": 26.73108722523238,
                    "n_gpu_percent": 0,
                    "n_growth_mb": 13.412849426269531,
                    "n_malloc_mb": 1514.1233673095703,
                    "n_mallocs": 81,
                    "n_peak_mb": 13.412849426269531,
                    "n_python_fraction": 0.1875441061042112,
                    "n_sys_percent": 1.493696433944797,
                    "n_usage_fraction": 0.6277502079530024
                },
                {
                    "line": "def doit2(x):\n",
                    "lineno": 19,
                    "memory_samples": [],
                    "n_avg_mb": 0.0,
                    "n_copy_mb_s": 0.0,
                    "n_cpu_percent_c": 0.011606275496674904,
                    "n_cpu_percent_python": 0.06387603465424621,
                    "n_gpu_percent": 0,
                    "n_growth_mb": 0.0,
                    "n_malloc_mb": 0.0,
                    "n_mallocs": 81,
                    "n_peak_mb": 0.0,
                    "n_python_fraction": 0,
                    "n_sys_percent": 0.00291364375010683,
                    "n_usage_fraction": 0.0
                },
                {
                    "line": "    while i < 100000:\n",
                    "lineno": 24,
                    "memory_samples": [],
                    "n_avg_mb": 0.0,
                    "n_copy_mb_s": 0.0,
                    "n_cpu_percent_c": 0.014943230363474424,
                    "n_cpu_percent_python": 0.066091244420482,
                    "n_gpu_percent": 0,
                    "n_growth_mb": 0.0,
                    "n_malloc_mb": 0.0,
                    "n_mallocs": 0,
                    "n_peak_mb": 0.0,
                    "n_python_fraction": 0,
                    "n_sys_percent": 0.000307049357582489,
                    "n_usage_fraction": 0.0
                },
                {
                    "line": "        z = z * z\n",
                    "lineno": 29,
                    "memory_samples": [],
                    "n_avg_mb": 0.0,
                    "n_copy_mb_s": 0.0,
                    "n_cpu_percent_c": 0.7372790940280785,
                    "n_cpu_percent_python": 3.6148904012386804,
                    "n_gpu_percent": 0,
                    "n_growth_mb": 0.0,
                    "n_malloc_mb": 0.0,
                    "n_mallocs": 0,
                    "n_peak_mb": 0.0,
                    "n_python_fraction": 0,
                    "n_sys_percent": 0.20056092229701938,
                    "n_usage_fraction": 0.0
                },
                {
                    "line": "        z = x * x\n",
                    "lineno": 30,
                    "memory_samples": [],
                    "n_avg_mb": 0.0,
                    "n_copy_mb_s": 0.0,
                    "n_cpu_percent_c": 0.37652433084550296,
                    "n_cpu_percent_python": 1.7336261204326355,
                    "n_gpu_percent": 0,
                    "n_growth_mb": 0.0,
                    "n_malloc_mb": 0.0,
                    "n_mallocs": 0,
                    "n_peak_mb": 0.0,
                    "n_python_fraction": 0,
                    "n_sys_percent": 0.0701088942400211,
                    "n_usage_fraction": 0.0
                },
                {
                    "line": "        z = z * z\n",
                    "lineno": 31,
                    "memory_samples": [],
                    "n_avg_mb": 0.0,
                    "n_copy_mb_s": 0.0,
                    "n_cpu_percent_c": 0.36674417351914596,
                    "n_cpu_percent_python": 1.7244723507108752,
                    "n_gpu_percent": 0,
                    "n_growth_mb": 0.0,
                    "n_malloc_mb": 0.0,
                    "n_mallocs": 0,
                    "n_peak_mb": 0.0,
                    "n_python_fraction": 0,
                    "n_sys_percent": 0.08094913729397328,
                    "n_usage_fraction": 0.0
                },
                {
                    "line": "        z = z * z\n",
                    "lineno": 32,
                    "memory_samples": [],
                    "n_avg_mb": 0.0,
                    "n_copy_mb_s": 0.0,
                    "n_cpu_percent_c": 0.624562424982377,
                    "n_cpu_percent_python": 2.2978280326382676,
                    "n_gpu_percent": 0,
                    "n_growth_mb": 0.0,
                    "n_malloc_mb": 0.0,
                    "n_mallocs": 0,
                    "n_peak_mb": 0.0,
                    "n_python_fraction": 0,
                    "n_sys_percent": 0.11506299872076818,
                    "n_usage_fraction": 0.0
                },
                {
                    "line": "        i += 1\n",
                    "lineno": 33,
                    "memory_samples": [],
                    "n_avg_mb": 0.0,
                    "n_copy_mb_s": 0.0,
                    "n_cpu_percent_c": 0.5629498352918543,
                    "n_cpu_percent_python": 2.0480910819308447,
                    "n_gpu_percent": 0,
                    "n_growth_mb": 0.0,
                    "n_malloc_mb": 0.0,
                    "n_mallocs": 0,
                    "n_peak_mb": 0.0,
                    "n_python_fraction": 0,
                    "n_sys_percent": 0.09541403459268945,
                    "n_usage_fraction": 0.0
                },
                {
                    "line": "    y = np.random.randint(1, 100, size=5000000)[4999999]\n",
                    "lineno": 46,
                    "memory_samples": [
                        46.0711030960083,
                        7.97879695892334,
                        0.0,
                        0.0,
                        0.0,
                        0.0,
                        0.0,
                        0.0,
                        0.0
                    ],
                    "n_avg_mb": 38.58018112182617,
                    "n_copy_mb_s": 0.0,
                    "n_cpu_percent_c": 0.0,
                    "n_cpu_percent_python": 0.0,
                    "n_gpu_percent": 0,
                    "n_growth_mb": 38.58018112182617,
                    "n_malloc_mb": 38.58018112182617,
                    "n_mallocs": 1,
                    "n_peak_mb": 38.58018112182617,
                    "n_python_fraction": 0.0004198901796234032,
                    "n_sys_percent": 0.0,
                    "n_usage_fraction": 0.015995207025385823
                },
                {
                    "line": "    x = 1.01\n",
                    "lineno": 47,
                    "memory_samples": [],
                    "n_avg_mb": 0.0,
                    "n_copy_mb_s": 0.0,
                    "n_cpu_percent_c": 0.0,
                    "n_cpu_percent_python": 0.0,
                    "n_gpu_percent": 0,
                    "n_growth_mb": 0.0,
                    "n_malloc_mb": 0.0,
                    "n_mallocs": 1,
                    "n_peak_mb": 0.0,
                    "n_python_fraction": 0,
                    "n_sys_percent": 0.0,
                    "n_usage_fraction": 0.0
                }
            ],
            "percent_cpu_time": 100.0
        }
    },
    "gpu": false,
    "growth_rate": 0.003907283598904888,
    "max_footprint_mb": 46.259589195251465,
    "samples": [
        3.2985734939575195,
        10.025616645812988,
        0.09424304962158203,
        3.3059587478637695,
        6.046360969543457,
        1.613560676574707,
        1.6170778274536133,
        7.516636848449707,
        8.904202461242676,
        11.994366645812988,
        10.025616645812988,
        13.505887031555176,
        11.287137031555176,
        9.809544563293457,
        8.331944465637207,
        6.854344367980957,
        5.376744270324707,
        3.899144172668457,
        0,
        0.09424304962158203,
        0.0,
        0.0,
        0.0,
        0.0,
        0.0,
        0.0,
        0.0
    ]
}
    load(profile);
}

