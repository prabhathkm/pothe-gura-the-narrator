var _        = require('lodash');

var constants = {

    TEST_MODE: true,

    MESSAGE_COLORS: {
        GREEN: "#51cc7a",
        RED: "#f44242",
        ASH: "#b7b7b7",
        ORANGE: "#f7ac4a"
    },

    INVALID_COMMAND_STRING :"`INVALID COMMAND` please type *help* for command guides.",
    UNKNOWN_ERROR_STRING: "`ERROR OCCURRED !`.",

    CHARACTERS: {
        MAFIA: {
            code: "m",
            defaultRate: function(c){
                return 1 + Math.floor( (c-3)/3);
            }
        },
        DOCTOR: {
            code: "d",
            defaultRate: function(c){
                var getOneIfMoreThan = 5;
                return c>getOneIfMoreThan?1:0;
            }
        },
        INSPECTOR: {
            code: "i",
            defaultRate: function(c){
                var getOneIfMoreThan = 5;
                return c>getOneIfMoreThan?1:0;
            }
        },
        CIVILIAN: {
            code: "c"
        }
    }

};


// fill in character keys
_.each(constants.CHARACTERS, (char, key)=>{
    char.role = key;
});


module.exports = constants;
