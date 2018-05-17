class HexAPI{

  constructor(){
    /*
      Do Stuff
    */
    this.LAYOUT = {
      POINTY : this.orientation(Math.sqrt(3.0), Math.sqrt(3.0) / 2.0, 0.0, 3.0 / 2.0, Math.sqrt(3.0) / 3.0, -1.0 / 3.0, 0.0, 2.0 / 3.0, 0.5),
      FLAT : this.orientation(3.0 / 2.0, 0.0, Math.sqrt(3.0) / 2.0, Math.sqrt(3.0), 2.0 / 3.0, 0.0, -1.0 / 3.0, Math.sqrt(3.0) / 3.0, 0.0)
    };
  /*
    These are the directions when it is pointy
     5/ \0
    4|  |1
     3\/2
  */
    this.DIRECTIONS =  [this.hex(1, 0, -1), this.hex(1, -1, 0), this.hex(0, -1, 1), this.hex(-1, 0, 1), this.hex(-1, 1, 0), this.hex(0, 1, -1)];
    this.DIAGONALS = [this.hex(2, -1, -1), this.hex(1, -2, 1), this.hex(-1, -1, 2), this.hex(-2, 1, 1), this.hex(-1, 2, -1), this.hex(1, 1, -2)];

  }


  hex(q,r,s){
    //if there is no r then it means it is a single string and needs to be parsed
    if(!r && r !== 0){
      var arr = String(q).split(".");
      q = Number(arr[0]);
      r = Number(arr[1]);
      s = Number(arr[2]);
    };

    return {q: q, r: r, s: s};
  };

  point(x,y){
    return {x:x, y:y};
  };

  hexAdd(a,b){
    return this.hex(Number(a.q) + Number(b.q), Number(a.r) + Number(b.r), Number(a.s) + Number(b.s));
  };

  hexSubtract(a,b){
    return this.hex(a.q - b.q, a.r - b.r, a.s - b.s);
  };

  hexScale(a,k){
    return this.hex(a.q * k, a.r * k, a.s * k);
  };

  direction(d){
    return this.DIRECTIONS[d];
  };

  diagonal(d){
    return this.DIAGONALS[d];
  };

  orientation(f0, f1, f2, f3, b0, b1, b2, b3, start_angle) {
    return {f0: f0, f1: f1, f2: f2, f3: f3, b0: b0, b1: b1, b2: b2, b3: b3, start_angle: start_angle};
  };

  //expects a hex
  roundToHex(hex){
    var q = Math.trunc(Math.round(hex.q));
    var r = Math.trunc(Math.round(hex.r));
    var s = Math.trunc(Math.round(hex.s));
    var q_diff = Math.abs(q - hex.q);
    var r_diff = Math.abs(r - hex.r);
    var s_diff = Math.abs(s - hex.s);
    if (q_diff > r_diff && q_diff > s_diff)
    {
        q = -r - s;
    }
    else
        if (r_diff > s_diff)
        {
            r = -q - s;
        }
        else
        {
            s = -q - r;
        }
    return this.hex(q, r, s);
  };

  hexLerp(a, b, t){
    return this.hex(a.q+(b.q-a.q)*t, a.r+(b.r-a.r)*t, a.s+(b.s-a.s)*t);
  };

  getLineBetweenHexes(a, b){
    var N = this.getDistanceBetweenHexes(a, b);
    var results = [];
    var step = 1.0 / Math.max(N, 1);
    for (var i = 0; i <= N; i++) {
      var l = this.hexLerp(a, b, step*i);
      results.push(this.roundToHex(l));
    }
    return results;
  };


  /*
    Hex Items
  */

  getDistanceBetweenHexes(hexA,hexB){
    return (
      Math.abs(hexA.q - hexB.q) +
      Math.abs(hexA.q+hexA.r-hexB.q-hexB.r) +
      Math.abs(hexA.r-hexB.r)
    )/2;
  };

  getNeighborAtDirection(hex, direction){
    return this.hexAdd(hex,this.direction(direction));
  };

  getDirectionFromHex(start,end){
    console.log(end);
    var endString = end.q+'.'+end.r+'.'+end.s;
    var dist = this.getDistanceBetweenHexes(start,end);
    var dir = null;
    var i = 0;
    while(i < 6){
      var line = this.getStraightLineOfHexes(start,i,dist);
      for(var l = 0; l < line.length; l++){
        if(endString === line[l].q+'.'+line[l].r+'.'+line[l].s){
          dir = i;
        }
      }
      /*
      if(line.indexOf(end) >= 0){
        dir = i;
      }*/
      i++;
    }
    return dir;
  }

  getStraightLineOfHexes(hex,direction,distance){
    var results= [];
    var i =0;
    while(i < distance){
      hex = this.getNeighborAtDirection(hex,direction);
      results.push(hex);
      i++;
    }
    return results;
  };

  getNeighborsAtDiagonal(hex, direction){
    var n = this.diagonal(direction);
    return this.hexAdd(hex, n);
  };

  getHexesWithinDistance(hex,dist){
    var results = [{q:hex.q,r:hex.r,s:hex.s}];
    for(var i = 1; i <= dist; i++){
      var n = this.getHexesAtDistance(hex,i);
      for(var l = 0; l < n.length; l++){
        results.push(n[l]);
      }
    }
    return results;
  };

  getHexesAtDistance(hex,dis){
    var results = [];
    var pHex = this.hexAdd(hex,this.hexScale(this.direction(4), dis));
    for(var i = 0; i < 6; i++){
      for(var j = 0; j < dis; j++){
        results.push(pHex);
        pHex = this.getNeighborAtDirection(pHex,i);
      }
    }
    return results;
  };

  getNeighbors(hex){
    var neighbors = [];
    for(var i = 0; i < 6; i++){
      //var n = this.getNeighborAtDirection(hex,i);
      //neighbors.push(n.q+'.'+n.r+'.'+n.s);
      neighbors.push(this.getNeighborAtDirection(hex,i));
    }
    return neighbors;
  };

  getDiagonalNeighbors(hex){
    var diagonalNeighbors = [];
    for(var i = 0; i < 6; i++){
      //var n = this.getNeighborsAtDiagonal(hex,i);
      //diagonalNeighbors.push(n.q+'.'+n.r+'.'+n.s);
      neighbors.push(this.getNeighborsAtDiagonal(hex,i));
    }
    return diagonalNeighbors;
  };

  getHexesReachableWithObstacles(hex, dist, obstacles){
    var visited = [hex];
    var fringes = [[hex]];
    var k = 1;
    while(k <= dist+1){
      fringes.push([]);
      //for(var i = 0; i < k-1; i++){
      fringes[k-1].forEach(function(nHex){
        var dir = 0;
        while(dir < 6){
          var n = this.getNeighborAtDirection(nHex,dir);
          if(visited.indexOf(n) < 0 && obstacles.indexOf(n.q+'.'+n.r+'.'+n.s) < 0){
            visited.push(n);
            fringes[k].push(n);
          }
          dir++;
        }
      }.bind(this));
      k++;
    }
    return visited;
  }

/*
Not needed as Im not saving this data
  createLayout(hexSize, origin, orientation) {

    if(orientation == 'pointy'){
      orientation = this.LAYOUT.POINTY;
    } else {
      orientation = this.LAYOUT.FLAT;
    }

    return {orientation: orientation, hexSize: hexSize, origin: origin};
  };
*/

/*These Below are only needed for visulization. They can be ignored if you only need calculations */
/*THey have not been tested */
  cornerOffset(orientation, hexSize, corner){
    var M = this.LAYOUT[orientation];
    var angle = 2.0 * Math.PI * (corner + M.start_angle) / 6;
    return this.point(hexSize.x * Math.cos(angle), hexSize.y * Math.sin(angle));
  };

  getCenterOfHex(orientation,hexSize,origin,hex){
    var M = this.LAYOUT[orientation];
    var x = (M.f0 * hex.q + M.f1 * hex.r) * hexSize.x;
    var y = (M.f2 * hex.q + M.f3 * hex.r) * hexSize.y;
    return this.point(x + origin.x, y + origin.y);
  };

  getCornersOfHex(orientation,hexSize,origin,h){
    var corners = [];
    var center = this.getCenterOfHex(orientation, hexSize,origin, h);
    for (var i = 1; i <= 6; i++){
        var l = i;
        if(l === 6){
          l = 0;
        }
        var offset = this.cornerOffset(orientation,hexSize, i);
        corners.push(this.point(center.x + offset.x, center.y + offset.y));
    }
    return corners;
  };

  getEdgesOfHex(orientation,hexSize,origin,hex){
    var edges = [];
    var corners = this.getCornersOfHex(orientation,hexSize,origin,hex);
    edges.push([corners[5], corners[0]]);
    for(var i = 4; i >= 0; i--){
      var l = i+1;
      edges.push([corners[l], corners[i]]);
    }
    return edges;
  };

  getHexAtPoint(orientation,hexSize,origin, p){
    var M = this.LAYOUT[orientation];
    var pt = this.point((p.x - origin.x) / hexSize.x, (p.y - origin.y) / hexSize.y);//this did have a new in front of point?
    var q = M.b0 * pt.x + M.b1 * pt.y;
    var r = M.b2 * pt.x + M.b3 * pt.y;
    var frHex = this.hex(q, r, -q - r);//results in a fractional hex thus rounding
    return this.roundToHex(frHex);
  };

  checkIfLinesIntersect(l1,l2){
    var line1StartX, line1StartY, line1EndX, line1EndY, line2StartX,
		line2StartY, line2EndX, line2EndY, denominator, a, b, numerator1,
		numerator2, result = false;

    line1StartX = l1[0].x;
    line1StartY = l1[0].y;
    line1EndX = l1[1].x;
    line1EndY = l1[1].y;

    line2StartX = l2[0].x;
    line2StartY = l2[0].y;
    line2EndX = l2[1].x;
    line2EndY = l2[1].y;

    denominator = ((line2EndY - line2StartY) * (line1EndX - line1StartX)) -
      ((line2EndX - line2StartX) * (line1EndY - line1StartY));

    if (denominator === 0) {
      return result;
    }

    a = line1StartY - line2StartY;
    b = line1StartX - line2StartX;
    numerator1 = ((line2EndX - line2StartX) * a) - ((line2EndY - line2StartY) * b);
    numerator2 = ((line1EndX - line1StartX) * a) - ((line1EndY - line1StartY) * b);
    a = numerator1 / denominator;
    b = numerator2 / denominator;

    // if line1 is a segment and line2 is infinite, they intersect if:
    if (a > 0 && a < 1 && b > 0 && b < 1) {
        result = true;
    }
    return result;
  };
}

module.exports = new HexAPI();
