
define([
    'q',
    'loader/webgme-to-json',
   './ahpCalc'
], function(
    Q,
    Loader,
    ahpCalc
){
    'use strict';
    return{
	//expects json object in the form output by webgme-to-json model loader
	processJson: function(model){
	    var self = this;

	    //map the flat model to a tree
	    Object.keys(model.objects).map(function(path){
		var obj = model.objects[path];
		return obj;
	    }).filter(function(obj){
		//filter for all Scores
		return obj.type == 'Score';
	    }).map(function(obj){
		//map children and parents of a hierarchy node (src and dst of score)
		var parent = obj.dst;
		var child = obj.src;
		//DEBUG
		//console.log(obj);
		//console.log(parent);
		//console.log(child);
		if (!child.parents)
		    child.parents = [];
		child.parents.push(parent);
		if (!parent.children)
		    parent.children = [];
		parent.children.push(child);

		//add scores map to hierarchy
		if(!parent.scores)
		    parent.scores = {};
		parent.scores[child.path] = obj.Score;
		
	    });

	    //go back through and list/generate comparisons
	    Object.keys(model.objects).map(function(path){
		var obj = model.objects[path];
		return obj;
	    }).filter(function(obj){
		return obj.type == 'Criterion';
	    }).map(function(crit){
		//this code block performs all its actions on each criterion in the model

		//first, generate a list of all existing comparisons wrt this crit
		crit.comparisons = Object.keys(model.objects).map(function(key){
		    var obj = model.objects[key];
		    return obj;
		}).filter(function(obj){

		    return obj.type == 'Comparison'
			//&& obj.pointers.With_Respect_To
			//&& (obj.pointers.With_Respect_To == crit);
		}).filter(function(obj){
		    //DEBUG
		   /* console.log("WRT Pointer Path is:");
		    console.log(obj.pointers.With_Respect_To);
		    console.log("Crit Path Is:");
		    console.log(crit.path);*/
		    return obj.pointers.With_Respect_To == crit.path;
		});

		//make an empty connections list for each child of crit.
		crit.children.map(function(child){
		    //cConnect as in [c]omparisons [connect]ions
		    if (!child.cConnect){
			child.cConnect = [];
			child.cConnectWeight = [];
		    }
		    //this is a separate mapping over crit.children
		    //instead of being included in the next mapping of
		    //crit.comparisons because there is the possiblity
		    //of having a child with no connections made to it
		    //as all.
		});
		
		//iterate through connections and populate the src and
		//dst connections lists.
		crit.comparisons.map(function(comp){
		    if (comp.src != comp.dst){
			//remember that the connection's 'Ranking'
			//attribute is how much more important src is
			//than dst.
			//"[src] is [Ranking] times greater than [dst]"
			comp.src.cConnect.push(comp.dst);
			comp.src.cConnectWeight.push(comp.Ranking);
			comp.dst.cConnect.push(comp.src);
			comp.dst.cConnectWeight.push(1/comp.Ranking);
		    }
		});

		//establish and fill in missing connections
		crit.children.map(function(child){
		    //if the connected list is smaller than the list
		    //of children minus 1 (excluding self)
		    if (child.cConnect.length != crit.children.length - 1){

			//if completely disconnected, leave function
			if (child.cConnect.length == 0)
			    return;
			//make list of missing connections
			var missing = crit.children.filter(function(obj){
			    return child.cConnect.indexOf(obj) == -1;
			});
			missing.map(function(obj){
			    child.cConnect.push(obj);
			    obj.cConnect.push(child);
			    var pathCount = []; //check this logic!!!!!
			    //weight is going to be the average weight of all possible paths 
			    var weight = self.Weighted_BFS(child,obj,[],pathCount)/pathCount.length;
			    if (weight == 0)
				throw Error('There is a disjoint graph wrt ' + crit.name);
			    child.cConnectWeight.push(weight);
			    obj.cConnectWeight.push(1/weight);
			});
		    }
		});

		

		//generate comparison matrix and eigenvector based on weights of the now fully connected graph

		//only generate comparison matrix and eigenvectors if there are comparisons to use
		if(crit.comparisons.length > 0){
		    //create a diagonal  matrix as a base for the comparison matrix
		    crit.cMatrix = ahpCalc.setUpSquareArray(crit.children.length);
		    
		    //DEBUG
		    console.log('Empty cMatrix is');
		    console.log(crit.cMatrix);
		    
		    //fill in weights into comparison matrix
		    crit.children.map(function(child_row, row){
			crit.children.map(function(child_col, col){
			    if(row != col){
				if(child_row.cConnect.length) //at this point either all connected or all disconnected
				    crit.cMatrix[row][col] = child_row.cConnectWeight[child_row.cConnect.indexOf(child_col)];
			    }
			});
		    });

		    //DEBUG
		    console.log('Filled cMatrix is: ');
		    console.log(crit.cMatrix);
		    
		    
		    //create eigenvector of comparison matrix.
		    crit.eigenvector = ahpCalc.calculateResults(crit.cMatrix).resultColumn;

		    console.log(crit.eigenvector);
		    
		    var resultsSum = crit.eigenvector.reduce(function(a, b) { return a + b; }, 0);
		    crit.eigenvector.map(function(val,el){
			crit.eigenvector[el] = val / resultsSum;
		    });

		    console.log(crit.eigenvector);
		    
		    //assign the elements of the eigenvector as weights of the corresponding child
		    crit.children.map(function(child,index){
			crit.scores[child.path] = crit.eigenvector[index];
		    });
		}
		

		
		
		
	    }); //end crit code block, whew!


	    
	    //find the root(s) node
	    model.ahpRoots = Object.keys(model.objects).map(function(path){
		var obj = model.objects[path];
		return obj;
	    }).filter(function(obj){
		return !obj.parents &&
		    obj.type == 'Criterion';
	    });

	    return model;
	},
	computeWeights: function(model){
	    var self = this;
	    //TODO for extra functionality. Use this function to
	    //include the ability to manually assign a score to a
	    //particular criterion and define how it is integrated
	    //with the calculated eigenvector weights to define the
	    //weight of a particular crit.
	    return model;
	},
	computeAHP: function(model){
	    var self = this;	    
	    if(model.ahpRoots === undefined)
		return;
	    return model.ahpRoots.map(function(root){
		var rootResults = { name: root.name,
				    weights: self.recursiveAHP(root,model)
				  };
		return rootResults;
	    })
	    
	},
	recursiveAHP: function(root,model){
	    var self = this;
	    var alts = {
		//combines multiple alts objects. Takes the
		//properties of altsObj (other than combine) and
		//scales it by a given weight before adding it to
		//this. If this does not currently have a
		//particular property, it is created
		combine: function(altsObj,weight){
		    var self = this;
		    Object.keys(altsObj).filter(function(prop){
			return prop != 'combine';
		    }).map(function(prop){
			if(self[prop] === undefined){
			    self[prop] = 0;
			}
			self[prop] += altsObj[prop] * weight;
		    });
		    
		}
	    };

		
	    //base case, we are at the end of the graph
	    if (!root.children){
		alts[root.name] = 1;
		return alts;
	    }
		
	    //recursive case, recursively call function on children
	    else{
		//for each child, which is contained within a map in
		//the current node (root.children is a map to objects)
		root.children.map(function(child){
		    alts.combine(self.recursiveAHP(child,model),root.scores[child.path]);
		    return alts;
		});
		
	    }
	    return alts;
	},
	Weighted_BFS: function(src, dst, markedList, pathCount){
	    var self = this;
	    //add src to the markedList
	    markedList.push(src);

	    //base case 1, src and dst are the same
	    if (src == dst)
		pathCount.push(1);
		return 1; //ranked against itself, has to be 1

	    var searchList = src.cConnect.filter(function(obj){
		return markedList.indexOf(obj) == -1;
	    });
	    
	    //base case 2, all direct connections are on the marked list
	    if (searchList.length == 0){
		return 0;
	    }
	    var pathWeight = 0;
	    //recursive call to continue search
	    searchList.map(function(obj){
		pathWeight += src.cConnectWeight[src.cConnect.indexOf(obj)] * self.Weighted_BFS(obj, dst, markedList, pathCount);
	    });
	    return pathWeight;
	}
	
	
    }
});
