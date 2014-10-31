/*
 * PaW Carousel - Version: 2.0
 * http://picturesandwriting.com
 * Copyright (c) 2014 Shaun Morrison; Licensed: GPL
 * Requires: jQuery v1.7 or later
 * Author: Shaun Morrison
 */
 (function($){  
    $.fn.pawCarousel = function(options) {  
        var defaults = {  
            carouselItemCls:'paw-carousel-item',
            carouselItemMediaCls:'paw-carousel-item-media',
            carouselItemsWrapCls: 'paw-carousel-items-wrap',
            carouselNavItemCls: 'paw-carousel-nav-item',
            nextLinkCls:'paw-carousel-next',
            prevLinkCls:'paw-carousel-prev',
            activeCls: 'active',
            croppedCls: 'cropped',
            carouselItemSpace: 'css',
            animSpeed:800,
            alignment:'center', 
            setsEachSide: 1,
            carouselHtType: 'shortest'
        },  
        settings = $.extend({}, defaults, options);  

        this.each(function() {  
            var $carousel = $(this);  

            //Classes
            var carouselItemCls = settings.carouselItemCls;
            var carouselItemOrigCls = settings.carouselItemCls + '-orig';
            var carouselItemMediaCls = settings.carouselItemMediaCls;
            var carouselItemsWrapCls = settings.carouselItemsWrapCls;
            var carouselNavItemCls = settings.carouselNavItemCls;
            var activeCls = settings.activeCls;
            var croppedCls = settings.croppedCls;
            var origItemCls = 'paw-carousel-item-orig';
            var videoFoundationElCls = 'paw-carousel-item-vid-foundation';
            var videoCls = 'paw-carousel-item-vid';
            var itemVisibleCls = 'paw-carousel-item-visible';
            var carouselItemNumPrefix = carouselItemCls + '-';
            var loadingCls = settings.loadingCls;

            //Attr
            var origRatioAttr = 'data-paw-orig-ratio';

            //Selectors
            var $carouselItem = $carousel.find('.'+carouselItemCls);
            var $carouselOrigItem;
            var $carouselNavItem = $carousel.next().find('.'+carouselNavItemCls);
            var $carouselNavItemActive;
            var $carouselItemsWrap = $carousel.children('.'+carouselItemsWrapCls);
            var $activeItem;
            var $nextLink = $carousel.find('.'+settings.nextLinkCls);
            var $prevLink = $carousel.find('.'+settings.prevLinkCls);

            //Booleans
            var isRetina = false;
            var inAnimation = false;
            var hasBeenCropped = false;

            //Integers
            var windowWid;
            var windowHt;
            var carouselContainerWid = 0;
            var setWid = 0;
            var itemWid = 0;
            var carouselContainerHt = 0;
            var carouselItemsWrapWid = 0;
            var setCount = 1;
            var totalItemsInSet = -1;
            var sansAlignAnimVal = 0;
            var finalAnimVal = 0;
            var activeItemNum = 0;
            var alignmentVal = 0;
            var firstItemAlignmentVal = 0;
            var lastItemAlignmentVal = 0;
            var setsEachSide = settings.setsEachSide;
            var carouselHt = $carouselItem.first().height();
            var carouselItemSpace = settings.carouselItemSpace;

            //Misc
            var origItemsStore;
            var carouselHtType = settings.carouselHtType;

            //Attr
            var itemNumAttr = 'data-paw-item-num';

            //Arrays
            var itemDetailsArr = [];

            //Animation speed of next/prev + thumbnail nav
            var animSpeed = settings.animSpeed;

            //Determines when to activate a clone of all items. Defaults 3 from the edge of the start or end of the slideshow. If you have smaller images you may want to increase this number
            //var itemsClonedFromEdge = settings.itemsClonedFromEdge;

            /*======================================
            =            Init functions            =
            ======================================*/
            screenDimensions();
            isRetinaDisplay();
            carouselItemSpaceConvert();
            addClsVideo();
            addOrigClsStyle();
            
            carouselOrigItemsStart();
            carouselContainerDim();
            videos(true);
            setCalcItems();
            storeOrigItems();
            for(var i = 0; i < setsEachSide; i++){
                addSet('before');
                addSet('after');
            }
            setCarouselItem();
            setCarouselHt();
            goToStart();
            thumbnailNav();
            controlNav();
            revealCarousel();

            /*==================================================
            =            On screen resize functions            =
            ==================================================*/
            

            var resizeListener = function(){
              $(window).one("resize",function(){ //unbinds itself every time it fires
                //Cheers IE8 for having to put the window size check in
                //Also cheers to iOS for having location bar window height calc gotcha
                var windowHtNew = window.innerHeight ? window.innerHeight : $(window).height();
                var windowWidNew = $(window).width();
                if(windowWidNew != windowWid || windowHtNew != windowHt){
                    screenDimensions();
                    carouselContainerDim();
                    //videos();
                    setCalcItems();
                    carouselItemsWrapDimensions();
                    calcAnimVal(activeItemNum);
                    goToActive(0);
                }
                setTimeout(resizeListener,100); //rebinds itself after 100ms
              });
            }
            resizeListener();
            
            
            /*===============================================
            =            Check Screen Dimensions            =
            ===============================================*/
            function screenDimensions(){
                windowHt = window.innerHeight;
                if(windowHt == undefined){
                    windowHt = $(window).height();
                }
                windowWid = $(window).width();
            }

            /*=========================================
            =            Set carousel item            =
            =========================================*/
            
            function setCarouselItem(){
                $carouselItem = $carousel.find('.'+carouselItemCls);
            }      

            /*================================================
            =            Add media class to video            =
            ================================================*/
            
            function addClsVideo(){
                $carouselItem.find('iframe').addClass(carouselItemMediaCls);
            }

            /*===================================
            =            Scale video            =
            ===================================*/
            
            function videos(init){
                $carouselItem.find('iframe').each(function(){
                    var $vid = $(this);
                    // var videoHt = $video.attr('height');
                    // var videoWid = $video.attr('width');
                    var vidRatio = $vid.attr(origRatioAttr);
                    var vidWid = carouselContainerHt * vidRatio;
                    $vid.attr('height',carouselContainerHt);
                    $vid.attr('width',vidWid);
                    if(init){
                        videoFoundation($vid,vidWid);
                    }
                });
            }

            /*==================================
            =            Stop video            =
            ==================================*/
            
            function stopVideo($item){
                var $vid = $item.find('iframe');
                if($vid.length){
                    var $vidSrc = $vid.attr('src');
                    $vid.attr('src','');
                    $vid.attr('src',$vidSrc);
                }
            }
                
            function videoFoundation($vid,vidWid){
                //Have to put invisible image containing video dimensions as width rescale isn't playing nice with iframes
                var videoFoundationEl = '<div style="width:' + vidWid + 'px; height:' + carouselHt + 'px" class="' + videoFoundationElCls + '"></div>'
                $vid
                    .before(videoFoundationEl)
                    .addClass(videoCls);
            }

            /*======================================
            =            Add orig class            =
            ======================================*/
            
            function addOrigClsStyle(){
                $carouselItem.addClass(origItemCls);
                $carouselOrigItem = $carousel.find('.'+origItemCls);
                if(settings.carouselItemSpace != 'css'){
                    $carouselOrigItem.css({
                        'margin-right' : carouselItemSpace
                    });
                }
                
            }

            /*=====================================
            =            Assign active            =
            =====================================*/
            
            function assignActiveItem($item){
                $activeItem = $item;
                $activeItem.siblings().removeClass(activeCls);
                $activeItem.addClass(activeCls);
                activeItemNum = parseInt($activeItem.attr(itemNumAttr));
                
            }
            
            /*===================================
            =            Go to start            =
            ===================================*/
            
            function goToStart(){
                assignActiveItem($carousel.find('.' + carouselItemCls).first());
                calcAnimVal(0);
                goToActive(0);
            }

            /*====================================
            =            animCarousel            =
            ====================================*/
            
            function animCarousel(goToItemNum,dir){
                calcAnimVal(goToItemNum,dir);
                goToActive();
            }
            
            /*==================================================
            =            Calculate animation values            =
            ==================================================*/
            
            function calcAnimVal(goToNum,dir){
                //If the going to item is greater than the current active item, or direction is forward, or it's the first call to get start position correct
                var $prevActiveItem = $activeItem;
                var prevActiveItemNum = activeItemNum;
                var itemPosFromStart = 0;
                var sansAlignAnimVal = 0;
                //Go to first item in original set
                if(dir == 'forwards' && prevActiveItemNum == totalItemsInSet){
                    assignActiveItem($carouselOrigItem.first());
                    calcAlignmentVal('last');
                    goToLastBeforeOrig();
                    sansAlignAnimVal = (-setWid * setsEachSide);
                    finalAnimVal = (-setWid * setsEachSide) + alignmentVal; 
                //Go to last item in original set
                }else if(dir == 'backwards' && prevActiveItemNum == 0){
                    assignActiveItem($carouselOrigItem.last());
                    calcAlignmentVal('first');
                    goToFirstAfterOrig();
                    sansAlignAnimVal = -setWid - (setWid * setsEachSide) + itemDetailsArr[totalItemsInSet].itemWid;
                    finalAnimVal = -setWid - (setWid * setsEachSide) + itemDetailsArr[totalItemsInSet].itemWid + alignmentVal; 

                }else{
                    if(goToNum > 0){
                        itemPosFromStart = itemDetailsArr[goToNum - 1].itemPosFromStart;
                    }
                    //Assign new active item 
                    assignActiveItem($carousel.find('.' + carouselItemOrigCls + '.' + carouselItemNumPrefix + goToNum));
                    calcAlignmentVal();
                    sansAlignAnimVal =- (itemPosFromStart + (setWid * setsEachSide));
                    finalAnimVal = sansAlignAnimVal + alignmentVal;
                }
                stopVideo($prevActiveItem);
            }
            

            /*=======================================
            =            alignment Value            =
            =======================================*/
            //Calculate how much the animation has to compensate for being centrally or right aligned.
            function calcAlignmentVal(extraVal){
                if(settings.alignment == 'center'){
                    var carouselContainerCenter = carouselContainerWid / 2;
                    alignmentVal = carouselContainerCenter - (itemDetailsArr[activeItemNum].itemWid / 2);
                    if(extraVal == 'first'){
                        firstItemAlignmentVal = carouselContainerCenter - (itemDetailsArr[0].itemWid / 2);
                    }else if(extraVal == 'last'){
                        lastItemAlignmentVal = carouselContainerCenter - (itemDetailsArr[totalItemsInSet].itemWid / 2);
                    }
                }else if(settings.alignment == 'right'){
                    alignmentVal = carouselContainerWid - itemDetailsArr[activeItemNum].itemWid;
                    if(extraVal == 'first'){
                        firstItemAlignmentVal = carouselContainerWid - itemDetailsArr[0].itemWid;
                    }else if(extraVal == 'last'){
                        lastItemAlignmentVal = carouselContainerWid - itemDetailsArr[totalItemsInSet].itemWid;
                    }
                }
            }
            
            /*==========================================================================
            =            Go to Last item in the set before the original set            =
            ==========================================================================*/
            //Gives the impression of an infinite carousel whereas you are junping back to the beginning of the orig set
            function goToLastBeforeOrig(){
                var lastBeforeOrigVal = -setWid + itemDetailsArr[totalItemsInSet].itemWid + lastItemAlignmentVal;
                $carouselItemsWrap.css({
                        'left' : lastBeforeOrigVal
                });
            }

            /*==========================================================================
            =            Go to First item in the set after the original set            =
            ==========================================================================*/
            //Gives the impression of an infinite carousel whereas you are junping back to the end of the orig set
            function goToFirstAfterOrig(){
                var firstAfterOrigVal = -setWid - (setWid * setsEachSide) + firstItemAlignmentVal;
                $carouselItemsWrap.css({
                        'left' : firstAfterOrigVal
                });
            }
            
            /*========================================
            =            Animate carousel            =
            ========================================*/
            function goToActive(animSpeedCustom){
                animSpeedCustom = typeof animSpeedCustom !== 'undefined' ? animSpeedCustom : animSpeed;
                inAnimation = true; 
                if(animSpeedCustom == 0){
                    $carouselItemsWrap.css({
                        'left' : finalAnimVal
                    })
                }else{
                    $carouselItemsWrap.stop(true).animate({
                        'left' : finalAnimVal
                    }, animSpeed);
                }
                
            }

            /*======================================
            =            Carousel items            =
            ======================================*/
            
            function carouselOrigItemsStart(){
                $carouselOrigItem.each(function(){
                    var $item = $(this);
                    var $mediaItem = $item.find('.'+carouselItemMediaCls);
                    numberSlide($item,totalItemsInSet += 1);
                    storeOrigDimensions($item,$mediaItem);
                    loadImages($item);
                    if(carouselHtType == 'shortest' || carouselHtType == 'tallest'){
                        calcCarouselHt($item);
                    }
                });
            }

            /*========================================
            =            Store dimensions            =
            ========================================*/
            
            function storeOrigDimensions($containerItem,$item){
                if($item.attr('width') != undefined && $item.attr('height') != undefined){
                    var itemRatio = $item.attr('width') / $item.attr('height');
                }else{
                    var itemRatio = $containerItem.width() / $containerItem.height();
                }
                itemRatio = itemRatio.toFixed(3);
                $item.attr(origRatioAttr, itemRatio);
            }

            /*====================================
            =            Number slide            =
            ====================================*/
            
            function numberSlide($item,num){
                $item.attr(itemNumAttr,num);
                $item.addClass(carouselItemNumPrefix + num);
            }

            /*===================================
            =            Load images            =
            ===================================*/

            function loadImages($item){
                //determine if retina and 2x image is present
                var $img = $item.find('img.' + carouselItemMediaCls);
                if(isRetina && $img.attr('data-src-2x')){
                    var imgSrc = $img.attr('data-src-2x');
                }else{
                    var imgSrc = $img.attr('data-src');
                    
                }
                $img.removeAttr('data-src');
                $img.removeAttr('data-src-2x');
                $img.attr('src',imgSrc);
            }
            
            /*===================================
            =            Store items            =
            ===================================*/
            
            function storeOrigItems(){
                origItemsStore = $carouselItemsWrap.html();
                origItemsStore = origItemsStore.replace(/ paw-carousel-item-orig/g,'');
            }

            /*=========================================================================
            =            Set max dimensions and calculate items dimensions            =
            =========================================================================*/
            
            function setCalcItems(){
                //Empty array
                itemDetailsArr = [];
                //reset Set Wid
                setWid = 0;
                $carouselOrigItem.each(function(idx){
                    var $item = $(this);
                    $item.width('auto');
                    itemWid = $item.width();
                    setItemDim(idx,$item,itemWid);
                    pushSetItems(itemWid);
                });
            }
            
            /*===========================================
            =            Set item dimensions            =
            ===========================================*/
            
            function setItemDim(idx,$item,itemWid2){
                var $adjustItem = $carousel.find('.' + carouselItemNumPrefix + idx);
                if(itemWid2 >= carouselContainerWid){
                    itemWid = carouselContainerWid;
                    $adjustItem
                        .width(itemWid)
                        .addClass(croppedCls);
                    hasBeenCropped = true;
                }else{
                    itemWid = itemWid + carouselItemSpace;
                    //If screen has been small enough once to crop then undo crop
                    if(hasBeenCropped){
                        $adjustItem
                            .removeAttr('style')
                            .removeClass(croppedCls);
                    }
                }
            }
            

            /*==========================================
            =            Measure orig items            =
            ==========================================*/
            
            function pushSetItems(itemWid2){
                setWid += itemWid2;
                //Create an array obj
                itemDetailsArr.push({
                    'itemWid' : itemWid2,
                    'itemPosFromStart' : setWid
                });
            }

            /*=============================================
            =            Calculate carousel ht            =
            =============================================*/
            
            function calcCarouselHt($item){
                var itemHt = $item.height();
                var hasVid = $item.find('iframe').length;
                //Dont' include if video in measurements
                if(carouselHtType == 'shortest' && !hasVid){
                    carouselHt = (itemHt < carouselHt) ? itemHt : carouselHt; 
                }else if(carouselHtType == 'tallest'){
                    carouselHt = (itemHt > carouselHt) ? itemHt : carouselHt; 
                }
            }

            /*===========================================
            =            Set carousel height            =
            ===========================================*/
            
            function setCarouselHt(){
                if(carouselHtType == 'shortest' || carouselHtType == 'tallest'){
                    $carouselItemsWrap.height(carouselHt);
                    $carousel.height(carouselHt);
                }else{
                    $carouselItemsWrap.height(carouselHtType);
                    $carousel.height(carouselHtType);
                }
            }

            /*===============================
            =            Add set            =
            ===============================*/
            
            function addSet(place){
                if(place == 'before'){
                    $carouselItemsWrap.prepend(origItemsStore);
                }else{
                    $carouselItemsWrap.append(origItemsStore);
                }
                setCount ++;
                carouselItemsWrapDimensions();
            }
            
            /*===================================================
            =            carousel Item Space Convert            =
            ===================================================*/
            
            function carouselItemSpaceConvert(){
                if(carouselItemSpace == 'css'){
                    carouselItemSpace = parseInt($carouselItem.first().css('margin-right'), 10);
                }
            }

           
            /*================================================
            =            Detect if retina display            =
            ================================================*/
            
            function isRetinaDisplay() {
                if (window.matchMedia) {
                    var mq = window.matchMedia("only screen and (min--moz-device-pixel-ratio: 1.3), only screen and (-o-min-device-pixel-ratio: 2.6/2), only screen and (-webkit-min-device-pixel-ratio: 1.3), only screen  and (min-device-pixel-ratio: 1.3), only screen and (min-resolution: 1.3dppx)");
                    if (mq && mq.matches || (window.devicePixelRatio > 1)) {
                        isRetina = true;
                    } else {
                        isRetina = false;
                    }
                }
            }

            /*======================================================
            =            Carousel items wrap dimensions            =
            ======================================================*/
            
            function carouselItemsWrapDimensions(){
                carouselItemsWrapWid = setWid * setCount;
                $carouselItemsWrap.width(carouselItemsWrapWid);

            }
            
            /*==============================================
            =            Carousel content width            =
            ==============================================*/
            
            function carouselContainerDim(){
                carouselContainerWid = $carousel.width();
                carouselContainerHt = carouselHt;
            }

            /*====================================
            =            Thumnail Nav            =
            ====================================*/
            function thumbnailNav(){
                if(carouselNavItemCls.length){
                    setThumbNum();
                    $carouselNavItem.on('click', function(e){
                        e.preventDefault();
                        $link = $(this);
                        var goToItemNum = $link.attr(itemNumAttr);
                        //Check if it's not the already active link
                        if(activeItemNum != goToItemNum){
                            setThumbNavActive($link)
                            animCarousel(goToItemNum);
                        }
                    });
                }
            }
            
            /*====================================================
            =            Assign thumbnail nav numbers            =
            ====================================================*/
            
            function setThumbNum(){
                $carouselNavItem.each(function(i){
                     $(this).attr(itemNumAttr,i);
                     //add active to first on load
                     if(i == 0){
                        setThumbNavActive($(this));
                     }
                });
            }
            
            /*=========================================
            =            setThumbNavActive            =
            =========================================*/
            
            function setThumbNavActive($link){
                $link.siblings().removeClass(activeCls);
                $link.addClass(activeCls);
                $carouselNavItemActive = $link;
            }

            /*=====================================
            =            Control nav           =
            =====================================*/
            
            function controlNav(){
                $nextLink.on('click', function(e){
                    e.preventDefault();
                    forwardsByOne();
                });
                $prevLink.on('click', function(e){
                    e.preventDefault();
                    backwardsByOne();
                });
            }

            /*=====================================
            =            Forwards by 1            =
            =====================================*/
            
            function forwardsByOne(){
                var goToNum = activeItemNum + 1;
                //If going to the next set then reset count to 0
                setThumbNavActive($carouselNavItemActive.next());
                if(goToNum > totalItemsInSet){
                    goToNum = 0;
                    setThumbNavActive($carouselNavItem.first());
                }
                animCarousel(goToNum,'forwards');
            }

            /*======================================
            =            Backwards by 1            =
            ======================================*/

            function backwardsByOne(){
                var goToNum = activeItemNum - 1;
                //If going to the next set then reset count to last item in item array num
                setThumbNavActive($carouselNavItemActive.prev());
                if(goToNum < 0){
                    goToNum = totalItemsInSet;
                    setThumbNavActive($carouselNavItem.last());
                }
                animCarousel(goToNum,'backwards');
            }

            /*=======================================
            =            Reveal carousel            =
            =======================================*/
            
            function revealCarousel(){
                setTimeout(function(){
                    $activeItem.addClass(itemVisibleCls);
                }, 500);

                setTimeout(function(){
                    $carouselItem.addClass(itemVisibleCls);
                }, 1500); 
            }
            
        });  
      // returns the jQuery object to allow for chainability.  
      return this;  
  }  
})(jQuery); 