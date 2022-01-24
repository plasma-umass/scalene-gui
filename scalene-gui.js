function makePlot(samples) {
//    const maxHeight = 20; // TESTME
    const values = samples.map((v, i) => {
	return {"x": i, "y": v};
    });
    return {
	"$schema": "https://vega.github.io/schema/vega/v5.json",
  "description": "Memory consumption over time.",
  "width": 100,
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
	{ title: ["", ""], color: "black" },
	{ title : ["time", "Python"], color: CPUColor },
	{ title: ["", "native"], color: CPUColor },
	{ title: ["", "system"], color: CPUColor },
	{ title: ["memory", "Python"], color: MemoryColor },
	{ title: ["", "peak"], color: MemoryColor },
	{ title: ["", "timeline/%"], color: MemoryColor },
	{ title: ["copy", "(MB/s)"], color: CopyColor }
    ];
    let plots = [];
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
	    s += `<td align="right"><font color="gray">${line.lineno}</font></td>`;
	    if (line.n_cpu_percent_python < 1.0) {
		s += '<td></td>';
	    } else {
		s += `<td align="right"><font color="${CPUColor}">${line.n_cpu_percent_python.toFixed(0)}%</font></td>`;
	    }
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
	    if (line.n_python_fraction < 0.01) {
		s += '<td></td>';
	    } else {
		s += `<td align="right"><font color="${MemoryColor}">${(100 * line.n_python_fraction).toFixed(0)}%</font></td>`;
	    }
	    if (line.n_peak_mb < 1.0) {
		s += '<td></td>';
	    } else {
		s += `<td align="right"><font color="${MemoryColor}">${line.n_peak_mb.toFixed(0)}M</font></td>`;
	    }
	    s += `<td><span id="plot${plots.length}"></span>`;	    
	    if (line.n_usage_fraction >= 0.01) {
		s += `${(100 * line.n_usage_fraction).toFixed(0)}%`;
	    }
	    s += '</td>';
	    if (line.memory_samples.length > 0) {
		plots.push(makePlot(line.memory_samples));
	    } else {
		plots.push(null);
	    }
	    if (line.n_copy_mb_s < 1.0) {
		s += '<td></td>';
	    } else {
		s += `<td align="right"><font color="${CopyColor}">${line.n_copy_mb_s.toFixed(0)}</font></td>`;
	    }
	    const codeLine = Prism.highlight(line.line, Prism.languages.python, 'python');
	    s += `<td align="left" bgcolor="whitesmoke"><pre style="display: inline; white-space: pre-wrap; overflow-x: auto; border: 0px;"><code class="language-python">${codeLine}</code></pre></td>`;
	    s += '</tr>';
	}
	s += '</tbody>';
	s += '</table>';
	s += '</div>';
    }
    s += '</div>';
    const p = document.getElementById('profile');
    p.innerHTML = s;
    let i = 0;
    for (const p of plots) {
	if (p) {
	    await vegaEmbed(`#plot${i}`, p, {"actions" : false});
	}
	i++;
    }
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

						 
