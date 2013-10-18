// ==UserScript==
// @name          HebrewBooks.org Mods
// @description   Fix bugs and add minor features to beta.HebrewBooks.org
// @match         http://beta.hebrewbooks.org/*
// @author        HodofHod
// @namespace     HodofHod
// @version       0.0.1
// ==/UserScript==

/*
Features:
    Adds download link (on hover) to books in search results
    Choose language. (Still in the works.)
    Tags on book pages are now clickable (at least the major ones)
    Pager improvements
    Fixes HB Reader slider issues
    Fixes Google Search slide issue
    Other small UI fixes
*/

function inject(f) {
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.textContent = '(' + f.toString() + ')()';
    document.body.appendChild(script);
}

inject(function cookies(){
    docCookies = { //from developer.mozilla.org/en-US/docs/Web/API/document.cookie
        getItem: function (sKey) {
            return unescape(document.cookie.replace(new RegExp("(?:(?:^|.*;)\\s*" + escape(sKey).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=\\s*([^;]*).*$)|^.*$"), "$1")) || null;
        },
        setItem: function (sKey, sValue) {
            if (!sKey || /^(?:expires|max\-age|path|domain|secure)$/i.test(sKey)) {
                return false;
            }
            document.cookie = escape(sKey) + "=" + escape(sValue) + "; expires=Fri, 31 Dec 9999 23:59:59 GMT; domain=hebrewbooks.org; path=/";
            return true;
        },
        removeItem: function (sKey) {
            if (!sKey || !this.hasItem(sKey)) { return false; }
            document.cookie = encodeURIComponent(sKey) + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; domain=hebrewbooks.org; path=/";
            return true;
          },
        hasItem: function (sKey) {
            return (new RegExp("(?:^|;\\s*)" + escape(sKey).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=")).test(document.cookie);
        }
    };
});    


function chooseLanguage(){
    $('#pnlMenubar').after('<div style="float:right; margin-right:5px;">\
                                <select id="language-select" style="width:auto;font-size:75%;">\
                                    <option value="default">עברית/English</option>\
                                    <option value="hebrew">עברית</option>\
                                    <option value="english">English</option>\
                                </select>\
                            </div>');
    lang = docCookies.getItem('language');                        
    if (lang){
        switchLang(lang);
        $('#language-select').val(lang);
    }
    $('#language-select').focus(function(){
        previous = $(this).val();
    }).change(function(e){
        if ($(this).val() == 'default'){
            docCookies.removeItem('language');
        } else {
            docCookies.setItem('language', $(this).val());
        }
        
        if (previous == 'default'){
            switchLang($(this).val());
            $(this).blur();
        }else{
            location.reload();
        }
    });
    

    function switchLang(lang){
        //Section 1: Most Headers
        var re = lang === 'english' ? /[\u0590-\u05FF]+/g : /[\w]+/g,
            els = {
                '[href=home]'      : ['דף הבית', 'Home'],
                '[href=browse]'    : ['סייר', 'Browse'],
                '[href=rambam]'    : ['רמב"ם', 'Rambam'],
                '[href=shas]'      : ['ש"ס', 'Shas'],
                '[href=tursa]'     : ['טור&nbsp;ש"ע&nbsp;<span style="font-size:90%">מלכים</span>', 'Tur&nbsp;Sh"A'],  //extra html. don't use .text()
                '#pnlmyhb a'       : ['התחבר', 'Log in'],
                '#blog a'          : ['בלוג', 'Blog'],
                '#qanda a'         : ['שאלות נפוצות', 'Q&A Site'],
                '#browse .header'  : ['סייר', 'Browse'],
                'div#results option[value=1]' : ['כותרת', 'Title'],
                'div#results option[value=2]' : ['מחבר', 'Author'],
                'div#results option[value=3]' : ['מקום', 'Place'],
                'div#results option[value=4]' : ['תאריך', 'Date']
                };
        
        if (/^\/$|^\/home($|.aspx)/.test(document.location.pathname)){
            //extra language changes on the home page.
            var remove = RegExp($('#results.header').text().match(re).join('|'),'g');
            $('#results.header').html($('#results.header').html().replace(remove, ''));
            $.extend(els, {
                    '.kbTitle'                                  : ['מקלדת וירטואלית', 'Virtual Keyboard'],
                    '#nrf'                                      : ['לא נמצאו תוצאות', 'No results found'],
                    '.gsc-search-button:button'                 : ['חפש', 'Search'],
                    '.ibb:button:eq(0)'                         : ['ניקוי', 'Clear'],
                    '.ibb:button:eq(1)'                         : ['חיפוש', 'Search'],
                    '#poprecent :nth-child(1) .header'          : ['לומדים עכשיו', 'Being learned now'],
                    '#poprecent :nth-child(2) .header'          : ['פופולרי בשבוע שעבר', 'Popular last week'],
                    '#legacyhbsearch table:last td:eq(0)'       : ['חיפוש במסד נתונים', 'Database Search'],
                    '#legacyhbsearch table:last td:eq(2)'       : ['חיפוש בתוכן הספרים', 'OCR Search'],
                    '#legacyhbsearch table:last tr:eq(1) td:first'     : ['כותר', 'Title'],
                    '#legacyhbsearch table:last tr:eq(2) td:first'     : ['מחבר', 'Author']
                    });
        }
        
        
        var text_index = lang === 'english' ? 1 : 0;
        $.each(els, function(i, o){
            var $elem = $(i);
            if ($elem.is(':button')){
                $elem.val(o[text_index]);
            }else{
                $elem.html(o[text_index]);
            }
            if ($elem.is('a')) {
                $elem.css({'display':'flex','align-items':'center','font-size':'+=1px'});
            }
        });
    }
}

function addDownLinks(){//Insert download links
    $('[ipu]').each(function(){
        $(this).parent()
                .children(':last')
                .before('<div class="download" style="float:left;margin-left: 0;"><a href="'+
                        'http://download.hebrewbooks.org/downloadhandler.ashx?req='+
                        $(this).attr('ipu') +
                        '" style="font-size:8pt">Download</a></div>');
    });
    $('div.download').click(function(e){
        e.stopPropagation();
    }).hide();
    $('#dbresults li').hover(function(){
        $(this).find('.download').toggle();
    });
    $('div.download a').hover(
        function(){$(this).css('text-decoration','underline');},
        function(){$(this).css('text-decoration','none');}
     );
}

function linkTags(){
    var ids = ["2291", "1195", "4682", "1537", "2933", "3518", "1421", "2729", "1451", "4259", "3311", "1968", "4907", "2206", "3997", "2192", "1789", "4582", "3094", "671", "4656", "3124", "2733", "5093", "546", "1112", "1954", "3566", "530", "3679", "1845", "4811", "3720", "1833", "2656", "1241", "1145", "3342", "1728", "2494", "1332", "2285", "922", "2454", "1047", "4980", "5092", "1676", "4077", "923", "5075", "3380", "2426", "892", "921", "4608", "3756", "1373", "3754", "2725", "4256", "2755", "4636", "1832", "2610", "2283", "2099", "3560", "4710", "3317", "2632", "1291"],
        tags=['ירחון', 'גאונים', 'שו"ת', 'הלכה', 'מסכת', 'עה"ת', 'דרשות', 'מוסר', 'הגדה של פסח', 'ראשונים', 'סוגיות', 'חסידות', 'תולדות', 'יידיש', 'קבלה', 'יורה דעה', 'חבד', 'רמב"ם', 'משניות', 'אורח חיים', 'שבת', 'נ"ך', 'מועדים', 'English', 'אבן העזר', 'בראשית', 'חמש מגילות', 'על הש"ס', 'אבות', 'פולמוס', 'חושן משפט', 'שמות', 'פירוש', 'חומש', 'מדרש', 'גיטין', 'ברכות', 'סידור', 'ויקרא', 'לוח', 'דברים', 'ירושלמי', 'בבא מציעא', 'כתובות', 'במדבר', 'תלמוד בבלי', 'קובץ', 'השקפה', 'קידושין', 'בבא קמא', 'תרי"ג מצוות', 'סיפורים', 'כללים', 'ארץ ישראל', 'בבא בתרא', 'רש"י', 'פסחים', 'דינאב', 'פסח', 'מונקאטש', 'ראש השנה', 'מחזור', 'שבועות', 'חולין', 'מאמרים', 'ירושלים', 'יבמות', 'עירובין', 'שחיטה', 'סוכה', 'מגילה', 'גר"א'];
    
    $('#tags .tag').each(function(){
        tag = $(this).text();
        if (tags.indexOf(tag) === -1){return}
        $(this).html(
            '<a href="'+
            'http://beta.hebrewbooks.org/browse.aspx?req=tag&id='+
            ids[tags.indexOf(tag)]+
            '" style="text-decoration:none">'+
            tag + '</a>'
        );
    });
}

function readerMods(){
    $('#slideout')
        .off()
        .hover(function () {
              $(this).stop(true).animate({'right':'-2px'},300);
          }, function () {
              if(!$('#gripper').hasClass('pinned'))
              $(this).stop(true).delay(1000).animate({'right':'-300px'},1000);
          }
        );
    function insertHash(){
        if (document.location.hash === ''){
            document.location.hash = '#p=' + $('.pg').attr('id');
        }
    }
    $('#thumbstrip').click(insertHash);
    insertHash();
}



function homeMods(){
    //wrap the search table element, since jQuery can't slide those
    legacy = $('#legacyhbsearch').wrap('<div id="legacywrap">')
    $('#switcher')
        .removeAttr('onclick')//prevents the site's default event handler
        .click(function (){
            // This function is just a modified version of the page's switchSE() function.
            // Using slideToggle() is simpler and easier, and it doesn't matter that
            // #gcse is grouped together, since the animations happen concurrently anyway.
            
            // If we defaulted to Google, the legacy inner element is hidden; so hide the parent, and show the child.
            // (should really be after wrap but that may not be before HB applies the searchtype cookie.) 
            if (!legacy.is(':visible')){legacy.show().parent().hide(); }
            
            // Note the change from #legacyhbsearch to #legacywrap
            $('#legacywrap,#cpMstr_rpan,#nrf,#gcse').slideToggle(500);
            if (getCookie('searchtype') == 'hb') {
                $('#switcher span').text('Search with HB');
                setCookie('searchtype', 'gcse');
            }else{
                $('#switcher span').text('Search with Google');
                setCookie('searchtype', 'hb');
            }
        });
}           

function generalMods(){
    $('.page-numbers.current').css('background-color', '#F8E9C1');
    
    $('#pgr > span:not(.current)').each(function () {
        var $elips = $(this),
            prev = parseInt($elips.prev().text()),
            next = parseInt($elips.next().text()),
            pages = $('<div class="hidden-pages" style="white-space:nowrap;overflow:hidden;float:right;"></div>');
        for (var i = prev + 1; i < next; i++) {
            pages.prepend($('<a style="display:inline-block;"' +
                'href="javascript:dopage(' + i + 
                ');"><span class="page-numbers">' + i + '</span></a>'));
        }
        pages.insertAfter($elips).hide();
        $elips.mouseover(function () {
            console.log('on');
            $elips.hide(500);
            pages.stop(true).animate({
                'width': 'show'
            }, 500);
        });
        pages.mouseleave(function () {
            console.log('off');
            pages.delay(500).animate({
                'width': 'hide'
            //}, 500, function(){$elips.show(500)});
            }, 500);
            $elips.delay(500).show(500);
        });
    });

    $('.hidden-pages span').hover(function(){
        $(this).css('background-color', 'rgb(255, 181, 102)');
    }, function(){
        $(this).css('background-color', '');
    });
}

if (/^\/reader\//.test(document.location.pathname)){//reader
    inject(readerMods);
}else if (/\/\d+$/.test(document.location.pathname)){//book title page
    inject(linkTags);
}else if (/^\/$|^\/home($|.aspx)/.test(document.location.pathname)){//home
    inject(homeMods);
}
inject(addDownLinks);
inject(chooseLanguage);
inject(generalMods);
