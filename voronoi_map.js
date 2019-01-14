var boundary = [[144,474],[175,457],[187,440],[211,431],[256,411],[289,415],[318,421],[352,427],
    [370,452],[393,465],[429,479],[477,469],[502,466],[529,444],[538,426],[599,406],[654,394],[686,398],
    [705,400],[721,394],[745,329],[688,281],[708,316],[661,288],[632,298],[601,276],[570,244],[520,226],
    [496,200],[445,172],[416,170],[382,190],[359,205],[331,214],[304,197],[273,201],[232,226],[210,260],
    [193,304],[180,336],[163,371],[148,414],[142,447]];

var inside = function(point, vs=boundary) {
        // ray-casting algorithm based on
        // http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html

        var x = point[0], y = point[1];

        var inside = false;
        for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
            var xi = vs[i][0], yi = vs[i][1];
            var xj = vs[j][0], yj = vs[j][1];

            var intersect = ((yi > y) != (yj > y))
                && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }

        return inside;
    };

showHide = function(selector) {
  d3.select(selector).select('.hide').on('click', function(){
    d3.select(selector)
      .classed('visible', false)
      .classed('hidden', true);
  });

  d3.select(selector).select('.show').on('click', function(){
    d3.select(selector)
      .classed('visible', true)
      .classed('hidden', false);
  });
}

voronoiMap = function(map, initialSelections) {
  var pointTypes = d3.map(),
      lastSelectedPoint;

  points.forEach(function(point) {
    pointTypes.set(point.type, {type: point.type, color: point.color});
  })

  var voronoi = d3.geom.voronoi()
      .x(function(d) { return d.x; })
      .y(function(d) { return d.y; });

  var selectPoint = function() {
    d3.selectAll('.selected').classed('selected', false);

    var cell = d3.select(this),
        point = cell.datum();

    lastSelectedPoint = point;
    cell.classed('selected', true);

    d3.select('#selected h1')
      .html('')
      .append('a')
        .text(point.name)
        .attr('href', point.url)
        .attr('target', '_blank')
  }

  var drawPointTypeSelection = function() {
    showHide('#selections')
    labels = d3.select('#toggles').selectAll('input')
      .data(pointTypes.values())
      .enter().append("label");

    labels.append("input")
      .attr('type', 'checkbox')
      .property('checked', function(d) { return true; })
      .attr("value", function(d) { return d.type; })
      .on("change", drawWithLoading);

    labels.append("span")
      .attr('class', 'key')
      .style('background-color', function(d) { return '#' + d.color; });

    labels.append("span")
      .text(function(d) { return d.type});
  }

  var selectedTypes = function() {
    return d3.selectAll('#toggles input[type=checkbox]')[0].filter(function(elem) {
      return elem.checked;
    }).map(function(elem) {
      return elem.value;
    })
  }

  var pointsFilteredToSelectedTypes = function() {
    var currentSelectedTypes = d3.set(selectedTypes());

    return points.filter(function(item){
      return currentSelectedTypes.has(item.type);
    });
  }

  var drawWithLoading = function(e){
    d3.select('#loading').classed('visible', true);
    if (e && e.type == 'viewreset') {
      d3.select('#overlay').remove();
    }
    setTimeout(function(){
      draw();
      d3.select('#loading').classed('visible', false);
    }, 0);
  }

  var draw = function() {
    d3.select('#overlay').remove();

    var bounds = map.getBounds(),
        topLeft = map.latLngToLayerPoint(bounds.getNorthWest()),
        bottomRight = map.latLngToLayerPoint(bounds.getSouthEast()),
        existing = d3.set(),
        drawLimit = bounds.pad(0.4);

    filteredPoints = pointsFilteredToSelectedTypes().filter(function(d) {
      var latlng = new L.LatLng(d.latitude, d.longitude);

      if (!drawLimit.contains(latlng)) { return false };

      var point = map.latLngToLayerPoint(latlng); // x,y coordiantes

      key = point.toString();
      if (existing.has(key)) { return false };
      existing.add(key);

      d.x = point.x;
      d.y = point.y;
      return true;
    });

    voronoi(filteredPoints).forEach(function(d) { d.point.cell = d; })

    var getMaxDistance = function(filteredPoints){

      var center_x = null,
          center_y = null,
          polygon_x = null,
          polygon_y = null,
          maxDistance = 0;

      for(a=0;a<filteredPoints.length;a++){
        p = filteredPoints[a];
        temp_center_x = p.x;
        temp_center_y = p.y;
        temp_center_longitude = p.longitude;
        temp_center_latitude = p.latitude;
        cells = p.cell;
        for(b=0;b<cells.length;b++){
          cell = cells[b];
          temp_polygon_x = cell[0];
          temp_polygon_y = cell[1];
          if(inside(cell, boundary)){
            d = (temp_center_x-temp_polygon_x)**2 + (temp_center_y-temp_polygon_y)**2
            if(d > maxDistance){
              center_longitude = temp_center_longitude;
              center_latitude = temp_center_latitude;
              polygon_x = temp_polygon_x;
              polygon_y = temp_polygon_y;
              maxDistance = d;
              max_index = a;
            }
          }
        }
      }
      var polygon_point = L.point(polygon_x, polygon_y);
      //console.log('polygon_point', polygon_point);
      var polygon_latlng = map.layerPointToLatLng(polygon_point);
      //console.log('polygon_latlng', polygon_latlng);
      r = calDistance(polygon_latlng.lat, polygon_latlng.lng, center_latitude, center_longitude, 'K');
      d3.select('#selected h2')
        .html('')
        .text('maximum nearest-MRT distance: ' + r + 'km');
      // console.log('l',filteredPoints.length);
      console.log('r', r);
      // console.log('center_latitude', center_latitude);
      // console.log('center_longitude', center_longitude);

      d3.selectAll('path.point-cell')
      .data(filteredPoints)
      .each(function(d,i){
        //console.log('d',d);
        if(d.latitude==center_latitude && d.longitude==center_longitude ){
          d3.select(this).style({'fill':'red','opacity':0.5});
        }
      });
    }

    var svg = d3.select(map.getPanes().overlayPane).append("svg")
      .attr('id', 'overlay')
      .attr("class", "leaflet-zoom-hide")
      .style("width", map.getSize().x + 'px')
      .style("height", map.getSize().y + 'px')
      .style("margin-left", topLeft.x + "px")
      .style("margin-top", topLeft.y + "px");

    var g = svg.append("g")
      .attr("transform", "translate(" + (-topLeft.x) + "," + (-topLeft.y) + ")");

    var svgPoints = g.attr("class", "points")
      .selectAll("g")
        .data(filteredPoints)
      .enter().append("g")
        .attr("class", "point");

    var buildPathFromPoint = function(point) {
      return "M" + point.cell.join("L") + "Z";
    }

    svgPoints.append("path")
      .attr("class", "point-cell")
      .attr("d", buildPathFromPoint)
      .on('click', selectPoint)
      .classed("selected", function(d) { return lastSelectedPoint == d} );

    svgPoints.append("circle")
      .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })
      .style('fill', function(d) { return '#' + d.color } )
      .attr("r", 5);

    getMaxDistance(filteredPoints);
  }

  var mapLayer = {
    onAdd: function(map) {
      map.on('viewreset moveend', drawWithLoading);
      drawWithLoading();
    }
  };

  drawPointTypeSelection();
  map.addLayer(mapLayer);
}
