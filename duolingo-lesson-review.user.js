// ==UserScript==
// @name         Duolingo - Lesson Review
// @description  This script allows you to go back and review all the different challenges in a lesson.
// @match        *://www.duolingo.com/*
// @author       HodofHod
// @namespace    HodofHod
// @version      0.0.9
// ==/UserScript==

//NOTE: This release is to add basic support  for the new site design. 
// Not everything works yet, but it's a stopgap.
// Once everyone has moved to the new design, old code should be removed.

//Beware all who enter here. This code may be hideous and worse.
//I am not responsible for any damage done to your eyes, or the ears of those around you.

//TODO: First lesson cell should get selected (in lessons and word_practice; practices does already)
//      Lesson should turn red as soon as continue is enabled. 
//          Maybe override graded function to run red(), but graded doesn't work for audio;
//          This probably made sense when I wrote, but now I haven't got a clue.
//      Inject a stylesheet and use classes instead of .css()
//      Maybe get really fancy, and hijack Session and SessionView, and switch lessons with .set({positon,x}) and .render()
//          Needs work. Doesn't save grading. Replays wrong audio.
//TOFIX: If you click on the discussion toggle and then on the backdrop while the discussions are still loading, the discussion will pop up without the modal when they load.

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
    console.log('Duolingo Lesson Review');
    var origNext         = duo.SessionView.prototype.next,
        origShowFailView = duo.SessionView.prototype.showFailView,
        origShowEndView  = duo.SessionView.prototype.showEndView,
        origRender       = duo.SessionView.prototype.render,
        origPushState    = window.history.pushState;

    if (/^\/practice|skill|word_practice\/.+/.test(window.location.pathname)){ //for the first time the script is loaded, check if we're already on a page.
        main();
    }
    window.history.pushState = function checkPage(a, b, c){  //Hijack the window's pushState so we know whenever duolingo navigates to a new page.
        /^\/practice|skill|word_practice\/.+/.test(c) ? main() : cleanup();
        return origPushState.call(this, a, b, c);
    };


    function cleanup(){
        $(document).off('.hh'); //unbind any handlers from previous lessons.
        duo.SessionView.prototype.next         = origNext; //remove overrides
        duo.SessionView.prototype.showFailView = origShowFailView;
        duo.SessionView.prototype.showEndView  = origShowEndView;
    }

    function main(){
        console.log('main');
        cleanup();
        add_arrows();
        
        var lessons = {},
            cur_lesson_id = 1,
            selected_lesson_id = cur_lesson_id,
            finished = false,
            failed = false,
            header, last_lesson_id,
            waiting_for_discussion_load = false,
            redesign = duo.user.get("ab_options").site_redesign_experiment ;
        
        select_cell(selected_lesson_id);
        
        function save_lesson(save_id){
            var app_class = $('#app').prop('class');
            lessons[save_id] = redesign ? [$('.player-container>footer, .player-main').clone(), $('#discussion-modal-container').clone(), $('#app').prop('class')]
                                        : [$('#app>div:not(.player-header)').clone(), $('#app').prop('class')];
        }

        function replace_lesson(replace_id){
            console.log('cur: ' + cur_lesson_id + ', old id: ' + selected_lesson_id + ', new id ' + replace_id);
            if (selected_lesson_id === replace_id){ return false; } //don't replace yourself with yourself.
            if (selected_lesson_id === cur_lesson_id || selected_lesson_id === 'end'){//if switching away from cur_lesson
                lessons[cur_lesson_id] = redesign ? [$('.player-container>footer, .player-main').detach(), $('#discussion-modal-container').detach(), $('#app').prop('class')]
                                                  : [$('#app>div:not(.player-header)').detach(), $('#app').prop('class')];
            }else if (lessons[replace_id] === undefined){
                return false;
            }else{
                redesign ? $('.player-container>footer, .player-main, .discussion-modal-container').remove()
                		 : $('#app>div:not(.player-header)').remove();
            }
           
            $(redesign?'.player-container':'#app').append(lessons[replace_id][0]);
            redesign && $('body').append(lessons[replace_id][1]);
            $('#app').prop('class', lessons[replace_id][redesign+1]);//tricky trick
            bind_discussion_toggle();//TODO: Remove the other?
                
            $('.token-wrapper:has(.non-space)').hover(function(){
                var a = $(this).outerWidth(),
                    b = $(this).find('.hint-table').outerWidth(),
                    c = (b / 2) - (a / 2);
                $(this).css('position','relative').find('.hint-table').toggle().css({left: -1*c+'px', top: '15px'});
            });

            //Disable all controls except for discuss
            if (replace_id !== cur_lesson_id){//switching not to cur
                $('#next_button, #continue_button').attr('disabled', 'disabled');
                $('#submit_button, #review_button, #home-button, #fix_mistakes_button').remove();
                $('.twipsy').remove();
                
                $('#show-report-options').css('pointer-events', 'none');
                $('#discussion-modal textarea').prop('disabled', 'disabled');
                
                var resume_button = $('<button id="resume_button" class="btn success large right" tabindex="20">Resume</button>');
                $('#next_button, #continue_button, #retry-button').after(resume_button).remove();
                
                if (finished && !failed){
                    $(redesign?'.player-container':'#app').prepend(header);
                }
            }else if (finished && !failed){//if switching to end of successful lesson, remove header.
                $('.player-header').detach();
            }else{ $('.twipsy').hide(); }
            
            selected_lesson_id = replace_id;
            select_cell(selected_lesson_id);
            activate_arrows();
        }
        
        function red(){//TODO: Integrate this somewhere.
            if ($('#app').hasClass('incorrect')){
                $('li#element-' + cur_lesson_id + '>.inner').andSelf()
                    .css('background-image', '-webkit-linear-gradient(top, #EE6969, #FF0000)')
                    .css('background-image', '-moz-linear-gradient(center top , #EE6969, #FF0000)')
                    .css(redesign ? {'border': '1px solid #950000', 'border-left':'none'} : {});
            }
        }
        
        function select_cell(cell_num){
            $('li[id^=element-]').find('.inner').andSelf().css({'box-shadow': '', 'border-right-width': '1px'});
            $('li#element-'+cell_num).find('.inner')
                                     .andSelf().css({'box-shadow': '1px 1px 3px black inset',
                                                     'border-right-width': '0px'});
            //TODO: Move out of select_cell(), only needs to run once at the beginning
            $('li[id^=element-]:first-child').css({'-webkit-border-radius': '9px 0 0 9px', 
                                                  'border-radius': '9px 0 0 9px'});              
            $('li[id^=element-]:last-child').css({'-webkit-border-radius': '0 9px 9px 0', 
                                                  'border-radius': '0 9px 9px 0'});           
        }

        function bind_discussion_toggle(){
            $('#discussion-toggle').on('click', function(e){
                e.stopImmediatePropagation();
                $('#discussion-modal').modal('show');
                $('.close-modal-background, .modal-backdrop, .player-discussion>.close').on('click', function(){
                    $('#discussion-modal').modal('hide');
                });
            });
        }
        //Hijack the render() function (it renders each problem, as well as the opening practice view)
        duo.SessionView.prototype.render = function newRender(){
            console.log('render');
            if ($('#prev-arrow, #next-arrow').length !== 2){
                add_arrows();
            }
            select_cell(selected_lesson_id);
            activate_arrows();
            return origRender.apply(this, arguments);
        };

        //Hijack the function that switches lessons.
        duo.SessionView.prototype.next = function newNext(){
            if ($('#discussion-toggle').size() && !$("#discussion-modal").size()){
                waiting_for_discussion_load = true;
                console.log('wait for discussions to finish loading');
            } else {
                cur_lesson_id = (this.model.get('position') + 1); //0-indexed
                save_lesson(cur_lesson_id);
                red();
                cur_lesson_id += 1;
                selected_lesson_id = cur_lesson_id;
                return origNext.apply(this, arguments);
            }
        };
        
        //TODO Add the discussions to the save function. 
        //  Fix all the things. Especially modal('show') when reviewing.
        //Load the discussions so they're saved by the cloning.
        document.body.addEventListener('DOMNodeInserted', function (e) {
            if (e.target.id === 'discussion-modal-container' || redesign && $(e.target).has('#discussion-toggle').length){
                $('<style type="text/css" id="modalcss">.modal-backdrop.in{display:none;}</style>').appendTo("head");
                $('#discussion-modal-container').hide();
                console.log('load discussions');
                $('#discussion-toggle').click();
                bind_discussion_toggle();
                document.body.addEventListener('DOMNodeInserted', function wait() {
                    if  ($('.modal-backdrop.in').length){
                        $('#discussion-modal').modal('hide')
                        $('#discussion-modal-container').show();
                        
                        $('.modal-backdrop.in, #modalcss').remove();
                        if (waiting_for_discussion_load === true){
                            waiting_for_discussion_load = false;
                            $('#next_button, #continue_button').click();
                        }
                        document.body.removeEventListener('DOMNodeInserted', wait);
                    }
                });
            }
            //TODO: Add a check for .badge-wrong-big and call red(). Just remember to reset to green if retry is successful
        });
        
        $(document).on('click.hh', 'li[id^=element-]', function(){
            var clicked_id = parseInt(this.id.replace('element-', ''), 10);
            if (lessons[clicked_id] !== undefined){
                if (failed){ console.log('fail click'); $('#review_button').click(); }
                replace_lesson(clicked_id);
            }
        });
        
        //TODO: See if this is necessary after the redesign.
        $(document).on('click.hh', '#resume_button', function(){ 
            replace_lesson(cur_lesson_id); 
            if (finished && ($('#end-carousel .left').length > 1 || !$('#end-carousel .active').length)){
                $('#end-carousel .item').removeClass('active next left');
                $('#end-carousel .item:eq(' +$('.dots .active').data('slide')+ ')').addClass('active')
                $(".carousel").carousel("pause")
            }
        });
        
        function finish(){
            var button = $('<button id="review_button" class="btn large btn-lg btn-standard right" style="margin:0 10px 0 0;">Review</button>'),
                loc = failed ? '#controls>' + (redesign ? '.col-right' : '.row>.right') 
                             : (redesign ? '.session-end-footer' : 'div.buttons');
            failed ? $(loc).append(button) : $(loc).prepend(button)
            !failed && redesign ? button.css({position:'absolute', left:'40px'}) 
                                : button.css('float','left');
            finished = true;
            last_lesson_id = cur_lesson_id;
            cur_lesson_id = 'end';
            selected_lesson_id = 'end';
            select_cell();//none
        }
        
        duo.SessionView.prototype.showFailView = function(){
            red();
            if ($('#discussion-toggle').size() && !$("#discussion-modal").size()){
                console.log('wait for discussions to finish loading');
                waiting_for_discussion_load = true;//TODO
            }
            save_lesson(cur_lesson_id);
            r = origShowFailView.apply(this, arguments);
            failed = true;
            finish();
            $('.close-fail').hide();
            add_arrows();
            return r;
        };
        
        duo.SessionView.prototype.showEndView = function(){
            cur_lesson_id -= 1; //newNext() increments on the last one too, adjust for that.
            header = $('#app>.player-header').detach();//TODO: Improve?
            origShowEndView.apply(this, arguments);
            finish();
        };
       
        $(document).on('click.hh', '#review_button', function(){
            if (failed){
                save_lesson('end');
            }
            replace_lesson(last_lesson_id);
        });
        
        $(document).on('click.hh', '#prev-arrow, #next-arrow', function(){
            lesson_id = (this.id === 'prev-arrow') ? selected_lesson_id-1 : selected_lesson_id+1;
            if (selected_lesson_id === 'end'){
                $('#review_button').click();
            }else if (!lessons[lesson_id] && cur_lesson_id === 'end'){
                replace_lesson('end');
            }else{
                replace_lesson(lesson_id);
            }
        });
        
        function add_arrows(){
            $('#prev-arrow, #next-arrow').remove();//precaution
            arrow = $('<span></span>').css({
                background: 'url("//d7mj4aqfscim2.cloudfront.net/images/sprite_mv_082bd900117422dec137f596afcc1708.png") no-repeat',
                width: '24px', height: '18px', float: 'left', 'pointer-events':'none', 'background-position': '-323px -130px'
            });

            arrow.clone().attr('id', 'prev-arrow').css({margin: redesign ? '31px 0 0 -15px' : '22px -30px 0 5px',
                     transform: 'rotate(-90deg)',
                     '-webkit-transform': 'rotate(-90deg)'
            }).prependTo('#progress-bar');

            arrow.clone().attr('id', 'next-arrow').css({margin: redesign ? '31px 0 0 0' : '22px 0 0 4px',
                     transform: 'rotate(90deg)',
                     '-webkit-transform': 'rotate(90deg)'
            }).appendTo('#progress-bar');
            
            activate_arrows();
        }
        
        function activate_arrows(){
            selected_lesson_id > 1 || selected_lesson_id === 'end' ? activate($('#prev-arrow')) : deactivate($('#prev-arrow'));
            selected_lesson_id !== cur_lesson_id ? activate($('#next-arrow')) : deactivate($('#next-arrow'));
            function activate($arrow){
                $arrow.css({'background-position':'-323px -178px',cursor:'pointer','pointer-events':''});
            }
            function deactivate($arrow){
                $arrow.css({'background-position':'-323px -130px',cursor:'initial','pointer-events':'none'});
            }
        }
    }
}
