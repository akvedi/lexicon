let DEFAULT_LANGUAGE = 'en',
    DEFAULT_THEME = 'light',
    DEFAULT_TRIGGER_KEY = 'none',
    SEARCHWORD,
    SUPPORTED_LANGUAGE,
    LANGUAGE,
    NUMOFDEF,
    THEME,
    AUTOPLAY,
    TRIGGER_KEY;

const COUNTRY_CODE = { "en": "UK", "en-us": "US", "fr": "FR", "de": "DE", "es": "ES", "hi": "IN", "pt": "PT", "pt-br": "BR" };
//End var

/**
    * Show the popup and starts fetching meanings 
    * @param {event} event - Double click event
    * @returns 
    */
function showMeaning(event) {
    let info = getSelectionInfo(event);

    if (!info) { return; }
    SEARCHWORD = (info.word).toLowerCase(); // set the global variable

    let createdDiv = createDiv(info); // Create the popup div while meaning is being retrieved

    //Todo: Show a Google search for phrases if selection is more than 2 words
    // if(SEARCHWORD.split(" ").length > 2) { return; } // show a google search for phrases

    retrieveMeaning(LANGUAGE).then((response) => {
        if (!response) { return noMeaningFound(createdDiv, LANGUAGE); }
        appendToDiv(createdDiv, response);
    });

}

/**
    * Get the details of the selected word and its position relative to the viewport
    * @param {event} event 
    * @returns {object} - details and position
    */
function getSelectionInfo(event) {
    var word;
    var boundingRect;

    if (window.getSelection().toString().length > 1) {
        word = window.getSelection().toString();
        boundingRect = getSelectionCoords(window.getSelection());
    } else {
        return null;
    }

    var top = boundingRect.top + window.scrollY,
        bottom = boundingRect.bottom + window.scrollY,
        left = boundingRect.left + window.scrollX;

    if (boundingRect.height == 0) {
        top = event.pageY;
        bottom = event.pageY;
        left = event.pageX;
    }

    return {
        top: top,
        bottom: bottom,
        left: left,
        word: word,
        clientY: event.clientY,
        height: boundingRect.height,
        width: boundingRect.width
    };
}

/**
    * Retrieve the by dictionary api
    * @param {string} word  - the hightlighted word 
    * @param {string} lang - language to search for
    * @returns 
    */
function retrieveMeaning(lang) {
    return browser.runtime.sendMessage({ word: SEARCHWORD, countryCode: COUNTRY_CODE[lang], lang: lang, time: Date.now(), numOfDef: NUMOFDEF });
}

/**
    * Load CSS based on theme set on the option page
    * @returns {string} stylesheet for popup 
    */
function loadStyle() {
    let style = document.createElement("style");

    style.textContent = ".mwe-popups{background:#fff;position:absolute;z-index:110;-webkit-box-shadow:0 30px 90px -20px rgba(0,0,0,.3),0 0 1px #a2a9b1;box-shadow:0 30px 90px -20px rgba(0,0,0,.3),0 0 1px #a2a9b1;padding:0;font-size:14px;min-width:300px;border-radius:2px}.mwe-popups.mwe-popups-is-not-tall{width:320px}.mwe-popups .mwe-popups-container{color:#222;margin-top:-9px;padding-top:9px;text-decoration:none}.mwe-popups.mwe-popups-is-not-tall .mwe-popups-extract{min-height:40px;max-height:140px;overflow:hidden;margin-bottom:47px;padding-bottom:0}.mwe-popups .mwe-popups-extract{margin:16px;display:block;color:#222;text-decoration:none;position:relative}.mwe-popups.flipped_y:before{content:'';position:absolute;border:8px solid transparent;border-bottom:0;border-top:8px solid #a2a9b1;bottom:-8px;left:10px}.mwe-popups.flipped_y:after{content:'';position:absolute;border:11px solid transparent;border-bottom:0;border-top:11px solid #fff;bottom:-7px;left:7px}.mwe-popups.mwe-popups-no-image-tri:before{content:'';position:absolute;border:8px solid transparent;border-top:0;border-bottom:8px solid #a2a9b1;top:-8px;left:10px}.mwe-popups.mwe-popups-no-image-tri:after{content:'';position:absolute;border:11px solid transparent;border-top:0;border-bottom:11px solid #fff;top:-7px;left:7px}.audio{background-image:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAcUlEQVQ4y2P4//8/AyUYQhAH3gNxA7IAIQPmo/H3g/QA8XkgFiBkwHyoYnRQABVfj88AmGZcTuuHyjlgMwBZM7IE3NlQGhQe65EN+I8Dw8MLGgYoFpFqADK/YUAMwOsFigORatFIlYRElaRMWmaiBAMAp0n+3U0kqkAAAAAASUVORK5CYII=);background-position:center;background-repeat:no-repeat;cursor:pointer;margin-left:8px;opacity:.5;width:16px;display:inline-block}.audio:hover{opacity:1}.mwe-popups.flipped_x:before{left:unset;right:10px}.mwe-popups.flipped_x:after{left:unset;right:7px}.type{float:right; color:#aaa;} .close-btn{display:none} .mwe-popups-container:hover .close-btn{display:block; cursor:pointer;}";

    if (THEME == 'dark' || (THEME == 'system' && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)")).matches) {
        style.textContent += ".mwe-popups{background:#1b1b1b}.mwe-popups .mwe-popups-container{color:#fff}.mwe-popups .mwe-popups-extract{color:#fff}.mwe-popups .mwe-popups-extract a{color:#0ff}.mwe-popups.flipped_y:before{border-top:8px solid #fff}.mwe-popups.flipped_y:after{border-top:11px solid #1b1b1b}.mwe-popups.mwe-popups-no-image-tri:before{border-bottom:8px solid #fff}.mwe-popups.mwe-popups-no-image-tri:after{border-bottom:11px solid #1b1b1b}.audio{opacity:.6;filter:invert(1)}";
    }
    
    return style;
}

/**
    * Create the popup div 
    * @param {string} info - the hightlighted text 
    * @returns the popup div which will show the meaning after it is retrived
    */
function createDiv(info) {
    var hostDiv = document.createElement("div");

    hostDiv.className = "dictionaryDiv";
    hostDiv.style.left = info.left - 10 + "px";
    hostDiv.style.position = "absolute";
    hostDiv.style.zIndex = "1000000"
    hostDiv.attachShadow({ mode: 'open' });

    var shadow = hostDiv.shadowRoot;

    shadow.appendChild(loadStyle());

    var encapsulateDiv = document.createElement("div");
    encapsulateDiv.style = "all: initial; text-shadow: transparent 0px 0px 0px, rgba(0,0,0,1) 0px 0px 0px !important;";
    shadow.appendChild(encapsulateDiv);


    var popupDiv = document.createElement("div");
    popupDiv.style = "font-family: arial,sans-serif; border-radius: 12px; border: 1px solid #a2a9b1; box-shadow: 0 0 17px rgba(0,0,0,0.5)";
    encapsulateDiv.appendChild(popupDiv);


    var contentContainer = document.createElement("div");
    contentContainer.className = "mwe-popups-container";
    popupDiv.appendChild(contentContainer);

    let closeBtn = document.createElement('button');
    closeBtn.textContent = "X";
    closeBtn.className = "close-btn"
    closeBtn.style = "position: absolute; right:-12px; top:-10px; background: darkred; color: #fff; border: 0; border-radius: 50%;padding: 4px 9px;";
    closeBtn.addEventListener('click', ()=>{
        hostDiv.remove();
    })
    contentContainer.appendChild(closeBtn);

    var content = document.createElement("div");
    content.className = "mwe-popups-extract";
    content.style = "line-height: 1.4; margin-top: 0px; margin-bottom: 11px; max-height: none";
    contentContainer.appendChild(content);


    var heading = document.createElement("h3");
    heading.style = "margin-block-end: 0px; display:inline-block;";
    heading.textContent = `Searching...`;

    var meaning = document.createElement("ul");
    meaning.style = "margin-top: 10px";
    meaning.textContent = `Looking up word "${SEARCHWORD}" in ${SUPPORTED_LANGUAGE[LANGUAGE]}`;

    var audio = document.createElement("div");
    audio.className = "audio";
    audio.innerHTML = "&nbsp;";
    audio.style.display = "none";

    let sound = document.createElement("audio");
    audio.appendChild(sound);
    audio.addEventListener("click", function () {
        sound.play();
    });

    let type = document.createElement('p');
    type.className = "type";

    var moreInfo = document.createElement("a");
    moreInfo.style = "float: right; text-decoration: none;"
    moreInfo.target = "_blank";

    content.appendChild(heading);
    content.appendChild(audio);
    content.appendChild(type);
    content.appendChild(meaning);
    content.appendChild(moreInfo);
    document.body.appendChild(hostDiv);

    if (info.clientY < window.innerHeight / 2) {
        popupDiv.className = "mwe-popups mwe-popups-no-image-tri mwe-popups-is-not-tall";
        hostDiv.style.top = info.bottom + 10 + "px";
        if (info.height == 0) {
            hostDiv.style.top = parseInt(hostDiv.style.top) + 8 + "px";
        }
    } else {
        popupDiv.className = "mwe-popups flipped_y mwe-popups-is-not-tall";
        hostDiv.style.top = info.top - 10 - popupDiv.clientHeight + "px";

        if (info.height == 0) {
            hostDiv.style.top = parseInt(hostDiv.style.top) - 8 + "px";
        }
    }

    if (info.left + popupDiv.clientWidth > window.innerWidth) {
        if (window.innerWidth >= popupDiv.clientWidth) {
            /* Flip to left only if window's width is more than
                * popupDiv's width. Otherwise, leave it to right side
                * so that it can be scrollable on narrow windows.
            */
            popupDiv.className += " flipped_x";
            hostDiv.style.left = info.left - popupDiv.clientWidth + info.width + 10 + "px";
        }
    }

    return {
        heading,
        meaning,
        moreInfo,
        type,
        audio,
        sound,
        content,
    };

}


/**
    * Get the size of the element and its position relative to the viewport
    * @param {string} selection - The selected word
    * @returns {object}
    */
function getSelectionCoords(selection) {
    var oRange = selection.getRangeAt(0); //get the text range
    var oRect = oRange.getBoundingClientRect();
    return oRect;
}

/**
    * Update the popup with the meaning details
    * @param {HTMLElement} createdDiv - the popup div
    * @param {object} obj - fetched meaning deatails
    */
function appendToDiv(createdDiv, obj) {
    let hostDiv = createdDiv.heading.getRootNode().host;
    let popupDiv = createdDiv.heading.getRootNode().querySelectorAll("div")[1];
    let word = obj.cleanedWord || obj.word;

    let heightBefore = popupDiv.clientHeight;
    createdDiv.heading.textContent = obj.word;

    createdDiv.meaning.innerHTML = createDefinitonsList(obj[word], NUMOFDEF);
    createdDiv.moreInfo.textContent = "More »";
    createdDiv.moreInfo.href = obj.url;
    createdDiv.moreInfo.style.display = 'block';
    createdDiv.type.innerHTML = `<i>${obj[word].type}</i>`;
    createdDiv.type.style.display = 'block';


    let heightAfter = popupDiv.clientHeight;
    let difference = heightAfter - heightBefore;


    if (popupDiv.classList.contains("flipped_y")) {
        hostDiv.style.top = parseInt(hostDiv.style.top) - difference + 1 + "px";
    }


    if (obj[word].audioSrc) {
        createdDiv.sound.src = obj[word].audioSrc;
        createdDiv.audio.style.display = "inline-block";
        createdDiv.sound.autoplay = (AUTOPLAY === "true");
    }

    // Show language switcher at the bottom of the popup
    showLangSwitcher(createdDiv, LANGUAGE);
}

/**
 * 
 * @param {the JSON obejct returned by the background script} meaningJson 
 * @param {Num of Def set by user} numOfDef 
 * @returns a list of definitions in HTML format
 */
function createDefinitonsList(wordObj, numOfDef){
    let meaningHtml = "";
    let meaning = [];
    let i = 1;

    for (let key in wordObj){
        if(key[0] == 'm'){
            meaning.push(wordObj[key])
        }
    }
    
    meaning.forEach(line => {
        if(i<= numOfDef){
            meaningHtml += `<li>${line}</li>`;
        }
        i++;
    });
    
    return meaningHtml;
}


/**
    * Update the popup if no meaning is found
    * @param {HTMLElement} createdDiv 
    */
function noMeaningFound(createdDiv, language) {
    createdDiv.heading.textContent = "Sorry";
    createdDiv.meaning.textContent = `No definition found in ${SUPPORTED_LANGUAGE[language]}. To search in different language select from below options`;
    createdDiv.audio.style.display = 'none';
    createdDiv.moreInfo.style.display = 'none';
    createdDiv.type.style.display = 'none';
    showLangSwitcher(createdDiv, language);
}

/**
*  Remove popup on clicking outside of it
*/
document.addEventListener('click', removeMeaning);
function removeMeaning(event) {
    var element = event.target;
    if (!element.classList.contains("dictionaryDiv")) {
        document.querySelectorAll(".dictionaryDiv").forEach(function (Node) {
            Node.remove();
        });
    }
}

/**
* Add event listner for double click
* @kind event
*/
document.addEventListener('dblclick', ((e) => {
    if (TRIGGER_KEY === 'rightclick') { return }

    if (TRIGGER_KEY === 'none') {
        return showMeaning(e);
    }

    //e has property altKey, shiftKey, cmdKey representing they key being pressed while double clicking.
    if (e[`${TRIGGER_KEY}Key`]) {
        return showMeaning(e);
    }

    return;
}));



/**
 * Retrieve Setting 
 */
(async () => {
    let storageSync = await browser.storage.sync.get();
    let interaction = storageSync.interaction || { dblClick: { key: DEFAULT_TRIGGER_KEY } };
    NUMOFDEF = storageSync.numOfDef || "2";
    LANGUAGE = storageSync.language || DEFAULT_LANGUAGE;
    THEME = storageSync.theme || DEFAULT_THEME;
    AUTOPLAY = storageSync.autoplay || false;
    TRIGGER_KEY = interaction.dblClick.key,
    SUPPORTED_LANGUAGE = storageSync.supportedLang || { "en-us":"English (US)", "en": "English (UK)", "fr": "French", "de": "German", "es": "Spanish", "hi": "Hindi", "pt": "Portuguese", "pt-br": "Brazilian Portuguese" };

})();


/**
 * Show alanguage switcher in bottom corner
 * @param {object} obj - the object returned by createDiv function 
 */
function showLangSwitcher(obj, lang) {
    let langSwitcher = document.createElement("select");
    langSwitcher.id = "lang-switcher";
    for (let key in SUPPORTED_LANGUAGE) {
        langSwitcher.innerHTML += `<option value="${key}">${SUPPORTED_LANGUAGE[key]}</option>`;
    };
    langSwitcher.querySelector(`[value="${lang}"]`).selected = true;
    langSwitcher.style = "border-radius: 3px; max-width: 110px; font-size: 12px; width: 36%; border: 1px solid #aaa;";

    obj.content.appendChild(langSwitcher);

    langSwitcher.addEventListener("change", (e) => {
        langSwitcher.remove();
        return respondToLangSwitcher(e.target.value, obj);
    });
}

/**
 * Fetch the definition in selected language from langSwitcher
 * @param {event} event - languageSwitcher change event 
 * @param {object} obj - createDiv object
 */
async function respondToLangSwitcher(lang, obj) {
    obj.heading.textContent = "Searching...";
    obj.meaning.textContent = `Looking for "${SEARCHWORD}" in ${SUPPORTED_LANGUAGE[lang]}`;
    LANGUAGE = lang;

    let response = await retrieveMeaning(lang);
    if (!response) { return noMeaningFound(obj, lang); }

    return appendToDiv(obj, response);
}