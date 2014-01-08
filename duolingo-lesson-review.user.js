// ==UserScript==
// @name         Duolingo - Lesson Review
// @description  This script allows you to go back and review all the different challenges in a lesson.
// @match        http://www.duolingo.com/*
// @author       HodofHod
// @namespace    HodofHod
// @version      0.0.1
// ==/UserScript==

//Beware all who enter here. This code may be hideous and worse.
//I am not responsible for any damage done to your eyes, or the ears of those around you.

//TODO: Add arrows on either side of the upper lesson elements?
//      selected_lesson should have a border or something
//      Lesson should turn red as soon as continue is enabled. Maybe override graded function to run red(), but graded doesn't work for audio;

function inject() { //Inject the script into the document
	var script;
	for (var i = 0; i < arguments.length; i++) {
		if (typeof (arguments[i]) === 'function') {
			script = document.createElement('script');
			script.type = 'text/javascript';
			script.textContent = '(' + arguments[i].toString() + ')(jQuery)';
			document.head.appendChild(script);
		}
	}
}

inject(init);

function init(){
    console.log('init');
    var origNext         = duo.SessionView.prototype.next,
        origShowFailView = duo.SessionView.prototype.showFailView,
        origShowEndView  = duo.SessionView.prototype.showEndView,
        origPushState    = window.history.pushState;

    if (/^\/practice|^\/skill\/.+/.test(window.location.pathname)){ //for the first time the script is loaded, check if we're already on a page.
        main();
    }
    window.history.pushState = function checkPage(a, b, c){  //Hijack the window's pusState so we know whenever duolingo navigates to a new page.
        /^\/practice|^\/skill\/.+/.test(c) ? main() : cleanup();
        return origPushState.call(this, a, b, c);
    };


    function cleanup(){
        $(document).off('.hh'); //unbind any handlers from previous lessons.
        duo.SessionView.prototype.next         = origNext;//remove overrides
        duo.SessionView.prototype.showFailView = origShowFailView;
        duo.SessionView.prototype.showEndView  = origShowEndView;
    }

    function main(){
        cleanup();
        console.log('main');
        
        var lessons = {},
            cur_lesson_id = 1,
            selected_lesson_id = cur_lesson_id,
            finished = false,
            failed = false,
            header, last_lesson_id,
            waiting_for_discussion_load = false;

        function save_lesson(save_id){
            var app_class = $('#app').prop('class');
            lessons[save_id] = [$('#app>div:not(.player-header)').clone(), app_class];
        }

        function replace_lesson(replace_id){
            console.log('cur: ' + cur_lesson_id + ', old id: ' + selected_lesson_id + ', new id ' + replace_id);
            if (selected_lesson_id === replace_id){ return false; } //don't replace yourself with yourself.
            if (selected_lesson_id === cur_lesson_id || selected_lesson_id === 'end'){//if switching away from cur_lesson
                lessons[cur_lesson_id] = [$('#app>div:not(.player-header)').detach(), $('#app').prop('class')];
            }else{
                $('#app>div:not(.player-header)').remove();
            }
           
            selected_lesson_id = replace_id;

            $('#app').append(lessons[replace_id][0]);
            $('#app').prop('class', lessons[replace_id][1]);
            bind_discussion_toggle();//TODO: Remove the other?
            $('.token-wrapper:has(.non-space)').hover(function(){
                var a = $(this).outerWidth(),
                    b = $(this).find('.popover').outerWidth(),
                    c = (b / 2) - (a / 2);
                $(this).css('position','relative').find('.popover').toggle().css({left: -1*c+'px', top: '15px'});
            });

            //Disable all controls except for discuss
            if (replace_id !== cur_lesson_id){//switching not to cur
                $('#continue_button').attr('disabled', 'disabled');
                $('#submit_button, #review_button, #home-button, #fix_mistakes_button').remove();
                $('.twipsy').remove();
                
                $('#show-report-options').css('pointer-events', 'none');
                $('#discussion-modal textarea').prop('disabled', 'disabled');
                
                var resume_button = $('<button id="resume_button" class="btn success large right" tabindex="20">Resume</button>');
                $('#continue_button, #retry-button').after(resume_button).remove();
                
                if (finished && !failed){
                    $('#app').prepend(header);
                }
            }else if (finished && !failed){//if switching to end of successful lesson, remove header.
                $('#app>.player-header').detach();
            }
            
            $('.twipsy').hide();
        }
        
        function red(){//TODO: Integrate this somewhere.
            if ($('#app').hasClass('incorrect')){
                $('#element-' + cur_lesson_id + '.done')
                    .css('background-image', '-webkit-linear-gradient(top, #EE6969, #FF0000)')
                    .css('background-image', '-moz-linear-gradient(center top , #EE6969, #FF0000)');
            }
        }

        function bind_discussion_toggle(){
            $('#discussion-toggle>a').on('click', function(e){
                e.stopImmediatePropagation();
                $('#discussion-modal, #discussion-modal-container').show();
                $('<div class="modal-backdrop"></div>').appendTo('body');
                $('.modal-backdrop, .player-discussion>.close').on('click', function(){
                    $('#discussion-modal').hide();
                    $('.modal-backdrop').remove();
                });
            });
        }
        
        //Hijack the function that switches lessons.
        duo.SessionView.prototype.next = function newNext(){
            console.log(this.model.get('position'));
            if ($('#discussion-toggle').size() && !$("#discussion-modal").size()){
                console.log('wait for discussions to finish loading');
                waiting_for_discussion_load = true;
            } else {
                cur_lesson_id = (this.model.get('position') + 1); //0-indexed
                save_lesson(cur_lesson_id);
                red();
                cur_lesson_id += 1;
                selected_lesson_id = cur_lesson_id;
                return origNext.apply(this, arguments);
            }
        };
        
        //Load the discussions so they're saved by the cloning.
        document.body.addEventListener('DOMNodeInserted', function (e) {
            if (e.target.id === 'discussion-modal-container'){
                $('<style type="text/css" id="modalcss">.modal-backdrop.in{display:none;}</style>').appendTo("head");
                $('#discussion-modal-container').hide();
                $('#discussion-toggle').click();
                bind_discussion_toggle();
                document.body.addEventListener('DOMNodeInserted', function wait() {
                    if  ($('.modal-backdrop.in').length){
                        $('body').removeClass('modal-open');
                        $('.modal-backdrop.in, #modalcss').remove();
                        if (waiting_for_discussion_load === true){
                            waiting_for_discussion_load = false;
                            $('#continue_button').click();
                        }
                        document.body.removeEventListener('DOMNodeInserted', wait);
                    }
                });
            }
        });
        
        $(document).on('click.hh', '.progress-small > li', function(){
            var clicked_id = parseInt(this.id.replace('element-', ''), 10);
            if (lessons[clicked_id] !== undefined){
                if (failed){ console.log('fail click'); $('#review_button').click(); }
                replace_lesson(clicked_id);
            }
        });
        
        $(document).on('click.hh', '#resume_button', function(e){ 
            replace_lesson(cur_lesson_id); 
        });
        
        function finish(){
            var button = $('<button id="review_button" class="btn large right" style="margin:0 10px 0 0;">Review</button>');
            $('#controls>.row>.right').append(button);
            $('div.buttons').prepend(button.css('float','left'));
            finished = true;
            last_lesson_id = cur_lesson_id;
        }
        
        duo.SessionView.prototype.showFailView = function(){
            red();
            if ($('#discussion-toggle').size() && !$("#discussion-modal").size()){
                console.log('wait for discussions to finish loading');
                waiting_for_discussion_load = true;
            }
            save_lesson(cur_lesson_id);
            r = origShowFailView.apply(this, arguments);
            failed = true;
            finish();
            $('.close-fail').hide();
            return r;
        };
        
        duo.SessionView.prototype.showEndView = function(){
            header = $('#app>.player-header').detach();//TODO: Improve?
            origShowEndView.apply(this, arguments);
            finish();
        };
       
        $(document).on('click.hh', '#review_button', function(){
            console.log('review click');
            //breaks the second time review is clicked.
            if (failed){
                cur_lesson_id = 'end';
                save_lesson('end');
                selected_lesson_id = 'end';
                replace_lesson(last_lesson_id);
                
            }else{
                last_lesson_id -= 1; //newNext() increments on the last one too, adjust for that.
                cur_lesson_id = 'end';
                selected_lesson_id = 'end';
                replace_lesson(last_lesson_id);
            }
        });
    }
}

