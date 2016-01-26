function getPoint(c1,c2,radius,angle){
    return [(c1+Math.cos(angle*Math.PI/180)*radius).toFixed(0),(c2+Math.sin(angle*Math.PI/180)*radius).toFixed(0)];
}



 function drawpie(ipdata,data) {
   
   
	var c = document.querySelector("#canvas"),
	ctx = c.getContext("2d");
	c.width = window.innerWidth;
	c.height = window.innerWidth;
	
	
    var canvas = oCanvas.create({
	  canvas: "#canvas",
	  background: "#ccc",
	  fps: 60
  });


  var prototype = canvas.display.arc({
	  x:-(canvas.width / 2),
	  y: -(canvas.height / 2),
	  radius: canvas.width / 3,
	  pieSection: true,
	  zIndex: "bottom"
  });
 
  var protoText = canvas.display.text({
     x: 0,
	y: 0,
	origin: { x: "center", y: "top" },
	font: "33px sans-serif",
	text: "Hello World!",
	fill: "#555",
	zIndex: "front",
	visibility: "hidden"
  });
  
var protoHeadline = canvas.display.text({
	x: (canvas.width / 2),
	y: 10,
	origin: { x: "center", y: "top" },
	font: "66px sans-serif",
	style: "bold",
	text: "Hello World",
	fill: "#333",
	zIndex: "front",
	visibility: "hidden"
  }); 

  function addPiecesText(label) {
    var drawRadius = ( i & 1 ?  (1.3*pieces[i].radius).toFixed(0) : (1.1*pieces[i].radius).toFixed(0))
    textstart = getPoint(-(canvas.height / 2),-(canvas.width / 2),drawRadius,-(end-(end-lastEnd)/2+90)); 
  //  textstart = getPoint(-(canvas.height / 2),-(canvas.width / 2),(0.8*pieces[i].radius).toFixed(0),20*i); 
   
    texts.push(protoText.clone({
      x: -(textstart[1]),
      y: -(textstart[0]),
      text: label,
      align: "end",
      baseline: "top"
	    }));
     pieces[i].addChild(texts[i]);
   //
  //  canvas.addChild(texts[i]);
    texts[i].zIndex="front";
    canvas.redraw();
  }

  function addText(label,x1,y1) {
   
    var text = protoText.clone({
      x: x1,
      y: y1,
      text: label,
      align: "end",
      baseline: "top",
      fill: "#333"
	    });
     canvas.addChild(text);
  
  }
  
  
  function addHeadline( headlinetext){
    var hl = protoHeadline.clone({
      x: (canvas.width / 2),
      y: 40,
      text: headlinetext,
      align: "end",
      baseline: "top"
	    });
    canvas.addChild(hl);
  }
  
  var pieces = [], texts = [], textstart = [], end, fillParm, lastEnd = -90, transparency = 100, Color = 195;
  
  // fill the canvas with content
  var node_count = ( 5 < data.length ? 5 : data.length-1);
  addHeadline("Top "+node_count+" Nodes");
  addText("Click on a slice to connect to server page",(canvas.width / 2),(canvas.height -40));
  
  for (var i = 0; i < node_count; i++) {
 
   // alert(ipdata[i]);
	  transparency =  ((transparency - 5*i) > 0 ? transparency : transparency + 100 );
	  Color = (Color < 220 ? Color +2*i : 195);
	  
	  end = (i > 0 ? lastEnd : 0) + 360 / (100 / data[i]) - (i < 1 ? 90 : 0);
	//    end = (i > 0 ? lastEnd : 0) + 360 / (100 / data[i]);
//	  fillParm = "hsl("+Color+", "+100 +"%, "+(transparency - 5 * i)+"%)";
	  
	 
	      fillParm = "hsl("+Color+", "+100 +"%, "+50+"%)";

	      pieces.push(prototype.clone({
	    
	      start: (i < 1 ? -90 : lastEnd),
	      
	      end: end,
	      zIndex: "bottom",
	      
	      fill: fillParm
	      }));
	    


	      canvas.addChild(pieces[i]);
	    
	      pieces[i].setOrigin(-(canvas.width / 2),-(canvas.height / 2));	
	// add Text
	     // alert(i,node_count);
	      var node=ipdata[i].split(":");
	      addPiecesText(node[0]+"\n"+data[i]+"%");

	    lastEnd = end;
  }
  // add last piece for unknown and small nodes with less than 1% of total hash
  end = 270;
   fillParm = "hsl("+Color+", "+100 +"%, "+70+"%)";
  pieces.push(prototype.clone({
	 
	  start: lastEnd,
	  
	  end: end,
	  
	  fill: fillParm
	  }));
	
	 
	  canvas.addChild(pieces[i]);
	  pieces[i].setOrigin(-(canvas.width / 2),-(canvas.height / 2));	
    // add Text
	
	  addPiecesText("other/unknown\n"+(100*(end-lastEnd)/360).toFixed(2)+"%");
	// pull first label to front
	//  texts[0].zIndex="front";
	  
    for (var i = 0; i < data.length+1; i++) {
      // add animation
	  pieces[i]._start = pieces[i].start;
	  pieces[i]._end = pieces[i].end;

	  pieces[i].bind("mouseenter touchenter", function () {
	  
	  this.radius = this.radius+20;
	  this.zIndex = "front";
	  this.children[0].fill= "#fff";
	  this.children[0].visibility="visible";
	  
	  canvas.redraw();
	  }).bind("mouseleave touchleave", function () {
	  this.radius =this.radius -20;
	  this.children[0].fill= "#555";
	  this.children[0].visibility="hidden";
	  
	  canvas.redraw();
	  }).bind("click tap", function () {
	    // no link for the last member, as this is 'other' and small nodes 
	   
	    var host = this.children[0].text.split("\n");
	    if ((host[0] != "small nodes") && (host[0] != "other/unknown")) {
	      window.open("http://"+host[0]+":19327/static",ipdata[i]);
	    }
	  /*
	  for (var i = 0; i < pieces.length; i++) {
	  
	  
	  pieces[i].animate({
	  
	  
	  
	  start: 0,
	  
	  
	  
	  end: 0,
	  
	  
	  
	  opacity: 0
	  
	  
	  }, 300, function () {
	  
	  
	  
	  this.animate({
	  
	  
	  
	  
	  start: this._start,
	  
	  
	  
	  
	  end: this._end,
	  
	  
	  
	  
	  opacity: 1
	  
	  
	  
	  }, 500);
	  
	  
	  });
	 
	  }
	 */
	  });
    }

 }