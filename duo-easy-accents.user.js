// ==UserScript==
// @name         Duolingo - Easy Accents
// @description  Makes typing characters with accents and diacritics easy! Just use the Alt key!
// @match        *://www.duolingo.com/*
// @author       @HodofHod
// @version      0.1.1
// ==/UserScript==


// Technically, these are accents, diacritics, and ligatures, 
// but accents is the commonest of those terms so that's the script's title.
// Some languages have characters that can be accented in many different ways 
// (like the French 'e' or the Portuguese 'a'). While those letters are reachable by tapping ALT multiple times, 
// it may become unweildy and annoying. I am open to other suggestions.

//TODO: Add the rest of the languages from the incubator :)

function inject(f) {
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.textContent = '(' + f.toString() + ')()';
    document.body.appendChild(script);
}

inject(main);
function main(){
    console.log('duo easy accents');
    var spanish_map = {
            'A': 'á', 'E': 'é', 'I': 'í', 'O': 'ó', 'U': ['ú', 'ü'],
            'N': 'ñ', '1': '¡', '?': '¿', '¿': '¿'
        },
        french_map = {
            'A': ['à', 'â', 'æ'], 'E': ['è', 'é', 'ê', 'ë'], 'I': ['î', 'ï'],
            'O': ['ô', 'œ'], 'U': ['ù', 'û', 'ü'], 'C': ['ç']
        },
        portuguese_map = {
            'A': ['ã', 'á', 'â', 'à'], 'E': ['é', 'ê'], 'I': ['í'],
            'O': ['õ', 'ó', 'ô'], 'U': ['ú', 'ü'], 'C': ['ç']
        },
        german_map = {'A': 'ä', 'O': 'ö', 'U': 'ü', 'S': 'ß'
        },
        italian_map = {
            'A': ['à', 'á'], 'E': ['è', 'é'], 'I': ['ì', 'í'], 
            'O': ['ò', 'ó'], 'U': ['ù', 'ú']
        },
        polish_map = {'A': 'ą', 'C': 'ć', 'E': 'ę', 'L': 'ł', 
                      'N': 'ń', 'O': 'ó', 'S': 'ś', 'Z': ['ź','ż']
        },
        romanian_map = {'A':['ă','â'], 'I': 'î', 'S': ['ş','ș'], 'T': ['ţ','ț']
        };
        hungarian_map = {'A': 'á', 'E': 'é', 'I': 'í', 'O': ['ö','ó','ő'], 'U': ['ü','ú','ű']
        },
        dutch_map = {'E': ['é','ë'], 'I': 'ï', 'O': ['ó','ö'], 'U': 'ü'
        },
        turkish_map = {'C': 'ç', 'G': 'ğ', 'I': ['ı','İ'], 'O': 'ö', 'S': 'ş', 'U': 'ü'
        },
        maps = {'es': spanish_map, 'fr': french_map, 'pt': portuguese_map,
                'it': italian_map, 'de': german_map, 'hu': hungarian_map,
                'tr': turkish_map, 'pl': polish_map, 'ro': romanian_map,
                'dn': dutch_map},
        taps = 0,
        last_press = [];

    $(document).on('keydown', '[lang][lang!=en]', function (e) {
        //If the pressed key isn't already pressed, or is alt, or it's an unsupported language, return
        if (!e.altKey || e.which===18 || !maps[e.target.lang]) { return; }//change this if we use `'", also change the keyup
        //If the same key is pressed in a short period of time, increment taps
        taps = (last_press[0] === e.which && new Date() - last_press[1] <= 900) ? taps+1 : 1;
        //Get the list of characters that the pressed key could be replaced with
        var char_lst = maps[e.target.lang][String.fromCharCode(e.which)];
        //If the pressed key doesn't have accented alternates, return
        if (char_lst === undefined){ return false; }
        //Choose which accented character based on the number of taps
        var chr = char_lst[(taps-1) % char_lst.length],
            //save the old text
            text = this.value, 
            //save the old cursor location
            start = this.selectionStart, 
            end = this.selectionEnd;
        //Capitalize letter if shift is pressed
        if (e.shiftKey) { chr = chr.toUpperCase(); }
        //Insert the character at the cursor's position.
        //If we've tapped multiple times, remove the last character.
        this.value = text.slice(0, start - (taps>1)) + chr + text.slice(end); 
        //Move the cursor after the new letter.
        this.setSelectionRange(start+1, end+1); 
        //Log the key pressed and the time, to measure for multiple taps.
        last_press = [e.which, new Date()];
        //To override any other Alt+<x> hotkeys.
        return false;
    });


    $(document).on('keyup', '[lang=es]', function (e) {
        //If alt is unpressed, reset the last tapped key.
        if (e.which === 18) { last_press = []; }
    }); 
}
