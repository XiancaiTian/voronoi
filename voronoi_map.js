var boundary = [[150,469],[156,468],[162,464],[170,460],[175,451],[182,444],[188,438],[194,433],[201,432],[208,430],[224,424],[235,421],[242,418],[256,416],[264,416],[272,414],[287,414],[297,414],[313,414],[322,415],[325,415],[332,417],[338,417],[346,421],[350,423],[353,429],[358,434],[359,437],[370,442],[374,447],[383,451],[392,456],[404,460],[410,465],[417,469],[423,473],[428,482],[433,486],[438,492],[448,496],[456,500],[465,499],[472,491],[474,485],[475,476],[490,467],[499,465],[508,457],[514,449],[525,442],[533,433],[539,427],[556,421],[565,419],[574,415],[583,413],[590,411],[603,406],[613,403],[620,400],[638,396],[644,395],[659,392],[673,391],[679,391],[689,395],[696,397],[706,395],[719,390],[725,380],[731,367],[736,353],[743,344],[743,337],[733,324],[726,320],[710,312],[706,298],[692,290],[684,288],[670,288],[662,293],[647,296],[639,301],[629,300],[619,294],[609,285],[604,280],[596,268],[589,259],[579,254],[573,248],[562,242],[554,243],[544,238],[534,234],[523,228],[515,228],[508,228],[501,219],[495,208],[490,202],[485,197],[477,189],[468,181],[453,177],[441,175],[426,167],[415,170],[400,174],[391,184],[382,190],[372,197],[366,204],[358,207],[350,210],[339,207],[328,208],[317,207],[311,203],[302,199],[293,197],[286,198],[274,202],[267,206],[261,209],[254,216],[247,221],[241,222],[236,227],[232,227],[227,235],[221,240],[216,250],[214,252],[208,261],[200,268],[199,276],[195,283],[189,297],[188,304],[185,312],[183,316],[175,327],[169,341],[166,351],[165,355],[165,367],[165,377],[163,383],[153,398],[153,406],[151,412],[150,420],[149,426],[149,437],[143,448],[137,454],[139,463],[144,470]];

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
        for(c=0;c<boundary.length;c++){
          temp_c = boundary[c];
          if(inside(temp_c, cells)){
            d = (temp_center_x-temp_c[0])**2 + (temp_center_y-temp_c[1])**2;
            if(d > maxDistance){
              center_longitude = temp_center_longitude;
              center_latitude = temp_center_latitude;
              polygon_x = temp_c[0];
              polygon_y = temp_c[1];
              maxDistance = d;
              max_index = a;
            }
          }
        }
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
      var polygon_latlng = map.layerPointToLatLng(polygon_point);
      r = calDistance(polygon_latlng.lat, polygon_latlng.lng, center_latitude, center_longitude, 'K');
      d3.select('#selected h2')
        .html('')
        .text('maximum nearest-MRT distance: ' + r + 'km');
      //console.log('r', r);

      d3.selectAll('path.point-cell')
      .data(filteredPoints)
      .each(function(d,i){
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
