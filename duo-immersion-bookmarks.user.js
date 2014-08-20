// ==UserScript==
// @name       Duolingo Immersion Bookmarks
// @version    0.2
// @match      *://www.duolingo.com/*
// ==/UserScript==

var bookmark_icon = $('<a class="bookmark-line-icon">'+
    '<svg version="1.1" x="0px" y="0px" width="20px" height="20px" viewBox="0 0 512 512" enable-background="new 0 0 512 512" space="preserve" style="top: -1px; left: 0px; position: absolute;">'+
		'<polygon class="star-icon-outline" points="256,144 256,60 193,190 49,209 154,309 128,451 256,383 383,451 357,309 462,209 318,190 256,60"></polygon>'+
    	'<polygon class="star-icon-fill"    points="256,144 294,223 381,235 317,296 333,383 256,341 178,383 194,296 130,235 217,223"></polygon></svg></a>');

var jump_button = $('<a class="btn btn-standard btn-small" style="margin-right: 10px;top: 100%;position: absolute;" data-toggle="tooltip">'+
                    'Jump to bookmark'+
                    '<span data-original-title="Dismiss" data-toggle="tooltip" class="jump-dismiss icon icon-x-white-small"'+
                    'style="margin-left: 10px;"></span></a>');

var styles = '<style id="duo-bookmark-styles">'+
    '.bookmark-line-icon{'+
    	'cursor:pointer;'+
    	'background-color: color;'+
        'width:20px;'+
        'height:20px;'+
        'border-radius: 10px;'+
        'display: block;'+
        'position: absolute;'+
    '}'+
    '.star-icon-outline{'+
    	'fill: grey;'+
    '}'+
    '.star-icon-fill{'+
		'fill: white;'+
    '}'+
    '.bookmark-line-icon:hover .star-icon-fill,'+
    '.bookmark-line-icon.active .star-icon-fill {'+
    	'fill: gold;'+
    '}'+
    '</style>';

(function init(){

	console.log('bookmarks');
    
    var origClickSentence = duo.WikiTranslationView.prototype.clickSentence,
        origTranslationViewRenderSentences = duo.LoggedOutWikiTranslationView.prototype.renderVisibleSentences,
        origTranslationViewRender = duo.LoggedOutWikiTranslationView.prototype.render,
        doc_loaded = false;
    
    duo.WikiTranslationView.prototype.clickSentence = function(sentence_index){
        addIcon(sentence_index);
        return origClickSentence.apply(this, arguments);
    };
    duo.LoggedOutWikiTranslationView.prototype.renderVisibleSentences = function(){
        var result = origTranslationViewRenderSentences.apply(this, arguments);
        if (!doc_loaded) {
            doc_loaded =  true;
            $('#duo-bookmark-styles').remove();
    		$('body').append(styles);
            var rememberedLine = (getRememberedLine());
            if (rememberedLine) {
                $('.document-header-new').append(jump_button);
                bookmark(addIcon(rememberedLine), rememberedLine);
                jump_button.on('click', function(){
                    $('body').animate({'scrollTop': $('.bookmark-line-icon.active').offset().top - 200});
                });
                $('.jump-dismiss').on('click',function(){
                    jump_button.fadeOut(function(){ $(this).remove() });
                });
            }
        }
        return result
    }
    duo.LoggedOutWikiTranslationView.prototype.render = function(){
        doc_loaded = false;
        return origTranslationViewRender.apply(this, arguments);
    }
})();


function addIcon(sentence_index){
    var sentence = $('.sentence-wrapper[data-index=' + sentence_index + ']');
    if (sentence.find('.bookmark-line-icon').length === 0){
        var new_icon = bookmark_icon.clone(true);
        sentence.before(new_icon);
        new_icon.css({
            'top': sentence.position().top,
            'left': sentence.parent().position().left - 25
        });
        new_icon.attr('title', 'Place bookmark to line #' + sentence_index);
        new_icon.attr('href', getArticleId() + '$index=' + sentence_index);
        $('.bookmark-line-icon:not(.active)').not(new_icon).remove();
        
        new_icon.on('click', function(e){
            e.preventDefault();
            bookmark(new_icon, sentence_index);
        });
	}
    return new_icon;
}

function bookmark(icon, sentence_index){
    if (icon.hasClass('active')){
        //deactivate;
        icon.removeClass('active');
        icon.attr('title', 'Place bookmark to line #' + sentence_index);
        forgetArticle();
    } else {
        //activate
        $('.bookmark-line-icon').not(icon).remove();
        icon.addClass('active');
        icon.attr('title', 'Remove bookmark from line #' + sentence_index);
        rememberLine(sentence_index);
    }
}

function getArticleId(){
    return document.location.pathname.match(/\/translation\/([\da-z]+)/)[0];
}
function getRememberedLine(){
    return localStorage.getItem('duo-immersion-bookmark-' + getArticleId());
}
function rememberLine(line_number){
    localStorage.setItem('duo-immersion-bookmark-' + getArticleId(), line_number);
}
function forgetArticle(){
    localStorage.removeItem('duo-immersion-bookmark-' + getArticleId());
}
