function makeBar(python, native, system) {
    return {
	"$schema": "https://vega.github.io/schema/vega-lite/v5.json",
	"config": {
	    "view": {
		"stroke" : "transparent"
	    }
	},
	"width": 75,
	"height" : "container",
	"padding": 0,
	"data": {
	    "values": [{"x" : 0, "y" : python.toFixed(1), "c": "Python " + python.toFixed(1) + "%" },
		       {"x" : 0, "y" : native.toFixed(1), "c": "native " + native.toFixed(1) + "%" },
		       {"x" : 0, "y" : system.toFixed(1), "c": "system " + system.toFixed(1) + "%" }]
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


function makePlot(samples) {
//    const maxHeight = 20; // TESTME
    const values = samples.map((v, i) => {
	return {"x": i, "y": v};
    });
    return {
	"$schema": "https://vega.github.io/schema/vega/v5.json",
	"description": "Memory consumption over time.",
	"width": 75,
	"height": 10,
	"padding": 0,
  "signals": [
    {
      "name": "interpolate",
      "value": "monotone"
    }
  ],

  "data": [
    {
      "name": "table",
      "values": values
    }
  ],
  "scales": [
    {
      "name": "x",
      "type": "point",
      "range": "width",
	"domain": {"data": "table", "field": "x"}
    },
    {
      "name": "y",
      "type": "linear",
      "range": "height",
      "nice": true,
      "zero": true,
	// "domain": [0, maxHeight] // {"data": "table", "field": "y"}
	"domain": {"data": "table", "field": "y"}
    },
    {
      "name": "color",
      "type": "ordinal",
      "range": "category",
      "domain": {"data": "table", "field": "c"}
    }
  ],

  "marks": [
    {
      "type": "group",
      "from": {
        "facet": {
          "name": "series",
          "data": "table",
          "groupby": "c"
        }
      },
      "marks": [
        {
          "type": "line",
          "from": {"data": "series"},
          "encode": {
            "enter": {
              "x": {"scale": "x", "field": "x"},
              "y": {"scale": "y", "field": "y"},
              "stroke": {"scale": "color", "field": "c"},
              "strokeWidth": {"value": 2}
            },
            "update": {
              "interpolate": {"signal": "interpolate"},
              "strokeOpacity": {"value": 1}
            },
            "hover": {
              "strokeOpacity": {"value": 0.5}
            }
          }
        }
      ]
    }
  ]
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

async function display(prof) {
    console.log(prof);
    const CPUColor = "blue";
    const MemoryColor = "green";
    const CopyColor = "deep lemon";
    const columns = [
	{ title : ["time", ""], color: CPUColor },
//	{ title: ["", "native"], color: CPUColor },
//	{ title: ["", "system"], color: CPUColor },
	{ title: ["memory", "Python"], color: MemoryColor },
	{ title: ["", "peak"], color: MemoryColor },
	{ title: ["", "timeline/%"], color: MemoryColor },
	{ title: ["copy", "(MB/s)"], color: CopyColor },
	{ title: ["", ""], color: "black" },
    ];
    let plots = [];
    let bars = [];
    let s = "";
    s += `<p class="text-center">Memory usage: <span id="plot0"></span> (max: ${prof.max_footprint_mb.toFixed(2)}MB, growth rate: ${prof.growth_rate.toFixed(2)}%)</p>`;
    plots.push(makePlot(prof.samples));
    s += '<div class="container-fluid">';
    for (const f in prof.files) {
	s += `<p class="text-center"><code>${f}</code>: % of time = ${prof.files[f].percent_cpu_time.toFixed(2)}% out of ${prof.elapsed_time_sec.toFixed(2)}s.</p>`
	s += '<div>';
	s += '<table class="profile table table-hover table-condensed">';
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
	s += `<th><code>${f}</code></th></tr>`;
	s += '</thead>';
	s += '<tbody>';
	let prevLineno = -1;
	for (const l in prof.files[f].lines) {
	    const line = prof.files[f].lines[l];
	    if (line.lineno > prevLineno + 1) {
		s += '<tr><td style="line-height: 1px" colspan="${columns.length+1}">&nbsp;</td></tr>';
	    }
	    prevLineno = line.lineno;
	    s += '<tr>';
	    s += '<td style="height: 10; vertical-align: middle" align="left">';
	    s += `<span style="height: 10; vertical-align: middle" id="bars${bars.length}"></span>`;
	    bars.push(makeBar(line.n_cpu_percent_python, line.n_cpu_percent_c, line.n_sys_percent));
	    // bars.push(null);
	    if (false) {
		if (line.n_cpu_percent_python >= 1.0) {
		    s += `<font color="${CPUColor}">${line.n_cpu_percent_python.toFixed(0)}%</font>`;
		}
		s += '</td>';
		if (line.n_cpu_percent_c < 1.0) {
		    s += '<td></td>';
		} else {
		    s += `<td align="right"><font color="${CPUColor}">${line.n_cpu_percent_c.toFixed(0)}%</font></td>`;
		}
		if (line.n_sys_percent < 1.0) {
		    s += '<td></td>';
		} else {
		    s += `<td align="right"><font color="${CPUColor}">${(line.n_sys_percent).toFixed(0)}%</font></td>`;
		}
	    }
	    if (line.n_python_fraction < 0.01) {
		s += '<td></td>';
	    } else {
		s += `<td align="right"><font color="${MemoryColor}">${(100 * line.n_python_fraction).toFixed(0)}%&nbsp;</font></td>`;
	    }
	    if (line.n_peak_mb < 1.0) {
		s += '<td></td>';
	    } else {
		s += `<td align="right"><font color="${MemoryColor}">${line.n_peak_mb.toFixed(0)}&nbsp;</font></td>`;
	    }
	    s += `<td><span style="height:10" id="plot${plots.length}"></span>`;	    
	    if (line.n_usage_fraction >= 0.01) {
		s += `${(100 * line.n_usage_fraction).toFixed(0)}%`;
	    }
	    s += '</td>';
	    if (line.memory_samples.length > 0) {
		plots.push(makePlot(line.memory_samples));
		// plots.push(null);
	    } else {
		plots.push(null);
	    }
	    if (line.n_copy_mb_s < 1.0) {
		s += '<td></td>';
	    } else {
		s += `<td align="right"><font color="${CopyColor}">${line.n_copy_mb_s.toFixed(0)}</font></td>`;
	    }
	    s += `<td align="right"><font color="gray" style="font-size: 70%" >${line.lineno}&nbsp;</font></td>`;
	    const codeLine = Prism.highlight(line.line, Prism.languages.python, 'python');
	    s += `<td style="height:10" align="left" bgcolor="whitesmoke"><pre style="height: 10; display: inline; white-space: pre-wrap; overflow-x: auto; border: 0px;"><code class="language-python">${codeLine}</code></pre></td>`;
	    // s += `<td align="left" bgcolor="whitesmoke"><pre data-start="${line.lineno}" class="line-numbers"><code class="language-python">${codeLine}</code></pre></div></td>`;
	    s += '</tr>';
	}
	s += '</tbody>';
	s += '</table>';
	s += '</div>';
    }
    s += '</div>';
    const p = document.getElementById('profile');
    p.innerHTML = s;
    plots.forEach((p, index) => {
	if (p) {
	    (async () => {
		await vegaEmbed(`#plot${index}`, p, {"actions" : false });
	    })();
	}
    });
    bars.forEach((p, index) => {
	if (p) {
	    (async () => {
		await vegaEmbed(`#bars${index}`, p, {"actions" : false });
	    })();
	}
    });
}

function load(jsonFile) {
    (async () => {
	let resp = await fetch(jsonFile);
	let prof = await resp.json();
	await display(prof);
    })();
}

function doIt() {
    // Disabled for now:
    // addListeners();
    // Read in the example JSON file.
    load("example.json");
}

						 
