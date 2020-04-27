var _ = require("lodash");

module.exports = (function(){
  var self = {};
  var pub  = {};

  function buildHLine(colInfo, leftJ, midJ, rightJ, connector){
    var sepLineComps = [];

    _.each(colInfo, function(col){
      sepLineComps.push(Array(col.len+1).join(connector));
    });

    return leftJ+sepLineComps.join(midJ)+rightJ;
  }

  function msFormat(val){
    if (val) {
      var mins = val/60000;
      var h = Math.floor( mins / 60);
      var m = (mins - h*60).toFixed(0);

      return h+'h:'+m+'m';
    }

    return null;
  }

  function minSecFormat(val){
    if (val) {
      var sec = val/1000;
      var min = Math.floor(sec/60);
      var sec = (sec - min*60).toFixed(0);

      return min+'m:'+sec+'s';
    }

    return null;
  }

  function floatFormat(val){
    if (val) {
      return parseFloat(val).toFixed(2);
    }
    return null;
  }


  pub.buildTable = function(title, headers, data, noEmptyFill){
    var headerSet  = headers||[];
    var dataSet    = data||[];
    var colInfo    = {};
    var fullLength = 0;
    var emptyFill  = !noEmptyFill;

    //Get max col length
    _.each(headers, function(headerObj){
      var headerText = '';

      if ('undefined' != typeof headerObj.text) {
        headerText = headerObj.text.toString();
      }

      var timeStampNow = new Date().getTime();

      //Format the cell values
      _.each(data, function(dt){
        var cellVal = dt[headerObj.key];

        if ('undefined' !== typeof cellVal) {
          //Call the renderer if available
          if (headerObj.renderer) {
            cellVal = headerObj.renderer(cellVal);
          } else if (headerObj.type) {
            //Format the types timestamp and ms
            if ('timestamp' === headerObj.type && cellVal) {
              cellVal = msFormat(timeStampNow - cellVal)+' ago';
            } else if ('ms' === headerObj.type){
              cellVal = msFormat(cellVal);
            } else if ('minsec' === headerObj.type){
              cellVal = minSecFormat(cellVal);
            } else if ('float' === headerObj.type){
              cellVal = floatFormat(cellVal);
            }


          }
        }

        //Mark the empty values
        if (!cellVal && emptyFill) {
          cellVal = '..';
        }

        dt[headerObj.key] = cellVal;
      });

      //Calculate max column length
      var maxColLength = _.reduce(data, function(memod, cellVal){
        return cellVal[headerObj.key]?Math.max(memod, cellVal[headerObj.key].toString().length):memod;
      },headerText.length);

      colInfo[headerObj.key] = {
        len: maxColLength+2,
        text: headerText
      };

      //Calculate the full table length so that we can position the title on top
      fullLength += (maxColLength+2);
    });

    //Adjust the full length considering column seperator beams
    if (fullLength>0) {
      fullLength += (headers.length + 1);
    }

    //If the full length is less than the title length, we have trouble displaying the title on top.
    //Adjust the size of first column to make the full length equal to title length
    if (fullLength<title.length) {
      colInfo[headers[0].key].len += (title.length - fullLength+4);
      fullLength = title.length+4;
    }

    //Horizontal seperators
    var hLineTop    = buildHLine(colInfo,'┌','─','┐','─');
    var hLineHed    = buildHLine(colInfo,'├','┬','┤','─');
    var hLineMid    = buildHLine(colInfo,'├','┼','┤','─');
    var hLineMidDot = buildHLine(colInfo,'│','│','│','-');
    var hLineBtm    = buildHLine(colInfo,'└','┴','┘','─');

    //Build H - seperator line
    var tblRows = [];

    //First H line before the title
    tblRows.push(hLineTop);

    var numSpacesBeforeTitle = parseInt(((fullLength-title.length)/2).toFixed(0));

    //Add the title
    tblRows.push('│'+Array(numSpacesBeforeTitle).join(' ')+title+Array(fullLength-title.length-numSpacesBeforeTitle).join(' ')+'│');

    //Line seperator
    tblRows.push(hLineHed);

    //Header set
    var tblHeaderomponents = [];
    _.each(colInfo, function(colInfoObj){
      tblHeaderomponents.push(colInfoObj.text+Array(colInfoObj.len - colInfoObj.text.length - 1).join(' '));
    });

    tblRows.push('│ '+tblHeaderomponents.join(' │ ')+' │');

    //Next H line to seperate headers
    tblRows.push(hLineMid);

    //Add data rows
    _.each(data, function(dataObj, dataObjIdx){
      var tblRowComponents = [];
      _.each(colInfo, function(colInfoObj,dataKey){
        var dataText = '';

        if (dataObj[dataKey]) {
          dataText = dataObj[dataKey].toString();
        }

        tblRowComponents.push(dataText+Array(colInfoObj.len - dataText.length - 1).join(' '));
      });

      if (dataObj.sectionSep && dataObjIdx>0) {
        tblRows.push(hLineMidDot);
      }

      tblRows.push('│ '+tblRowComponents.join(' │ ')+' │');
    });

    //Closing line
    tblRows.push(hLineBtm);

    return tblRows;
  };

  return pub;
})();
