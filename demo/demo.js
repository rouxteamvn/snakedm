var WALL = 0,
    performance = window.performance;
let score = 0;
let finished = false;
let food = null;
$(function () {

    var $grid = $("#search_grid"),
        $selectWallFrequency = $("#selectWallFrequency"),
        $selectGridSize = $("#selectGridSize"),
        $checkDebug = $("#checkDebug"),
        $searchDiagonal = $("#searchDiagonal"),
        $checkClosest = $("#checkClosest");

    var opts = {
        wallFrequency: $selectWallFrequency.val(),
        gridSize: $selectGridSize.val(),
        debug: $checkDebug.is("checked"),
        diagonal: $searchDiagonal.is("checked"),
        closest: $checkClosest.is("checked")
    };

    var grid = new GraphSearch($grid, opts, astar.search);

    $("#btnGenerate").click(function () {
        grid.initialize();
    });

    $selectWallFrequency.change(function () {
        grid.setOption({ wallFrequency: $(this).val() });
        grid.initialize();
    });

    $selectGridSize.change(function () {
        grid.setOption({ gridSize: $(this).val() });
        grid.initialize();
    });

    $checkDebug.change(function () {
        grid.setOption({ debug: $(this).is(":checked") });
    });

    $searchDiagonal.change(function () {
        var val = $(this).is(":checked");
        grid.setOption({ diagonal: val });
        grid.graph.diagonal = val;
    });

    $checkClosest.change(function () {
        grid.setOption({ closest: $(this).is(":checked") });
    });
});

var css = { start: "start", finish: "finish", food: "food", wall: "wall", active: "active" };

function GraphSearch($graph, options, implementation) {
    this.$graph = $graph;
    this.search = implementation;
    this.opts = $.extend({ wallFrequency: 0.1, debug: true, gridSize: 10 }, options);
    this.initialize();
}
GraphSearch.prototype.setOption = function (opt) {
    this.opts = $.extend(this.opts, opt);
    this.drawDebugInfo();
};

GraphSearch.prototype.generateApple = (size) => {
    let x = ~~(Math.random() * size);
    let y = ~~(Math.random() * size);
    return {x,y};
}

GraphSearch.prototype.initialize = function () {
    score = 0;
    document.getElementById("score").innerHTML = `Điểm: ${score}`;
    this.grid = [];
    var self = this,
        nodes = [],
        $graph = this.$graph;

    $graph.empty();
    food = this.generateApple(this.opts.gridSize);
    var cellWidth = ($graph.width() / this.opts.gridSize) - 2,  // -2 for border
        cellHeight = ($graph.height() / this.opts.gridSize) - 2,
        $cellTemplate = $("<span />").addClass("grid_item").width(cellWidth).height(cellHeight),
        startSet = false;

    for (var x = 0; x < this.opts.gridSize; x++) {
        var $row = $("<div class='clear' />"),
            nodeRow = [],
            gridRow = [];

        for (var y = 0; y < this.opts.gridSize; y++) {
            var id = "cell_" + x + "_" + y,
                $cell = $cellTemplate.clone();
            $cell.attr("id", id).attr("x", x).attr("y", y);
            $row.append($cell);
            gridRow.push($cell);

            var isWall = Math.floor(Math.random() * (1 / self.opts.wallFrequency));
            if (isWall === 0) {
                nodeRow.push(WALL);
                $cell.addClass(css.wall);
            }
            else {
                var cell_weight = ($("#generateWeights").prop("checked") ? (Math.floor(Math.random() * 3)) * 2 + 1 : 1);
                nodeRow.push(cell_weight);
                $cell.addClass('weight' + cell_weight);
                if ($("#displayWeights").prop("checked")) {
                    $cell.html(cell_weight);
                }
                if (!startSet) {
                    $cell.addClass(css.start);
                    startSet = true;
                }
                if(JSON.stringify(food) == JSON.stringify({x,y})) {
                    $cell.addClass(css.food);
                }
            }
        }

        $graph.append($row);
        this.grid.push(gridRow);
        nodes.push(nodeRow);
    }

    this.graph = new Graph(nodes);
    this.$cells = $graph.find(".grid_item");
    this.$cells.click(function () {
            self.cellClicked($(this));
    });
};

GraphSearch.prototype.cellClicked = function ($end) {
    var end = this.nodeFromElement($end);
    if ($end.hasClass(css.wall) || $end.hasClass(css.start)) {
        return;
    }

    
    this.$cells.removeClass(css.finish);
    $end.addClass("finish");
    var $start = this.$cells.filter("." + css.start);
        start = this.nodeFromElement($start);
    var path = this.search(this.graph, start, end, {
        closest: this.opts.closest
    });

    
    if(end.x == food.x && end.y == food.y) {
        score += 10;
        food = this.generateApple(this.opts.gridSize);
        do {
            food = this.generateApple(this.opts.gridSize);

        } while((this.$cells.filter(`span#cell_${food.x}_${food.y}`).hasClass(css.wall)));
        this.$cells.filter(`span#cell_${food.x}_${food.y}`).addClass(css.food);
    }

    if (path.length === 0) {
        $("#message").text("Không tìm thấy đường đi!");
        this.animateNoPath();
    }
    else {
        $("#message").text("");
        this.drawDebugInfo();
        this.animatePath(path);
        document.getElementById("score").innerHTML = `Điểm: ${score}`;
    }

};

GraphSearch.prototype.drawDebugInfo = function () {
    this.$cells.html(" ");
    var that = this;
    if (this.opts.debug) {
        that.$cells.each(function () {
            var node = that.nodeFromElement($(this)),
                debug = false;
            if (node.visited) {
                debug = "F: " + node.f + "<br />G: " + node.g + "<br />H: " + node.h;
            }
            if (debug) {
                $(this).html(debug);
            }
        });
    }
};

GraphSearch.prototype.nodeFromElement = function ($cell) {
    return this.graph.grid[parseInt($cell.attr("x"))][parseInt($cell.attr("y"))];
};

GraphSearch.prototype.animateNoPath = function () {
    var $graph = this.$graph;
    var jiggle = function (lim, i) {
        if (i >= lim) { $graph.css("top", 0).css("left", 0); return; }
        if (!i) i = 0;
        i++;
        $graph.css("top", Math.random() * 6).css("left", Math.random() * 6);
        setTimeout(function () {
            jiggle(lim, i);
        }, 5);
    };
    jiggle(15);
};

GraphSearch.prototype.animatePath = function (path) {
    var grid = this.grid,
        timeout = 2000 / grid.length,
        elementFromNode = function (node) {
            return grid[node.x][node.y];
        };

    var self = this;
    var removeClass = function (path, i) {
        if (i >= path.length) {
            return setStartClass(path, i);
        }
        elementFromNode(path[i]).removeClass(css.active);
        setTimeout(function () {
            removeClass(path, i + 1);
        }, timeout * path[i].getCost());
    };
    var setStartClass = function (path, i) {
        if (i === path.length) {
            self.$graph.find("." + css.start).removeClass(css.start);
            elementFromNode(path[i - 1]).addClass(css.start);
        }
    };
    var addClass = function (path, i) {
        if (i >= path.length) {
            return removeClass(path, 0);
        }
        elementFromNode(path[i]).addClass(css.active);
        setTimeout(function () {
            addClass(path, i + 1);
        }, timeout * path[i].getCost());
    };

    addClass(path, 0);
    this.$graph.find(`.${css.start}`).removeClass(css.start);
    this.$graph.find(`.${css.finish}`).removeClass(`${css.finish} ${css.food}`).addClass(css.start);
};
