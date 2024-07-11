const GOOGLE_SPEECH_URI = 'https://www.google.com/speech-api/v1/synthesize',
    DEFAULT_HISTORY_SETTING = {enabled: true};

browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    let { word, lang, numOfDef, countryCode } = request;
        
    const url = fetchUrl(lang, word, countryCode);
    
    fetch(url, { 
            method: 'GET',
            credentials: 'omit'
        })
        .then((response) => response.text())
        .then((text) => {
            const document = new DOMParser().parseFromString(text, 'text/html'),
                content = extractMeaning(document, { word, lang, numOfDef, url});

            sendResponse({ content });

            content && browser.storage.local.get().then((results) => {
                let history = results.history || DEFAULT_HISTORY_SETTING;
        
                history.enabled && saveWord(content)
            });
        })

    return true;
});

/**
 * Get The URL
 * @param {string} lang - the language to search
 * @param {string} word - the word to search
 * @returns {string} - url to fetch 
 */
function fetchUrl(lang, word, countryCode){
    let url = '';
    let define = {"en":"define", "fr":"définir", "de":"definieren", "es":"definir", "pt":"definir", "pt-br":"definir"};
    if(lang == "hi"){
       return url = `https://www.google.com/search?hl=${lang}&q=${word}+मतलब&gl=IN`;
    }

    return url = `https://www.google.com/search?hl=${lang}&q=${define[lang]}+${word.replace(/·/g, '')}&gl=${countryCode}`;
}

/**
 * 
 * @param  document
 * @param context 
 * @returns 
 */
function extractMeaning (document, context){
    if (!document.querySelector("[data-dobid='hdw']")) { return null; }
    
    let word = document.querySelector("[data-dobid='hdw']").textContent,
        definitionDiv = document.querySelectorAll("div[data-dobid='dfn']"),
        meaningHtml = "",
        meaningJson = {word: context.word},
        j = 1;

    let type = document.querySelector('div[class~="YrbPuc"]').textContent || "";

    if(definitionDiv){
        definitionDiv.forEach((def)=>{
            let span = def.querySelectorAll("span");

            //loop over span, extract the innerText and join it to make single string and add it to meaningJson
            let defnition = "";
            for(let i = 0; i < span.length; i++){
                if(!span[i].querySelector("sup")){
                    defnition += (span[i].innerHTML).replace(/(<([^>]+)>)/ig, "");
                }
            }
            meaningJson[`meaning${j}`] =  defnition;
            if(j <= context.numOfDef){
                meaningHtml += `<li>${meaningJson[`meaning${j}`]}</li>`;
            }
            j++;
            
        });
    }


    var audio = document.querySelector("audio[jsname='QInZvb']"),
        source = document.querySelector("audio[jsname='QInZvb'] source"),
        audioSrc = source && source.getAttribute('src');

    if(audioSrc){
        !audioSrc.includes("http") && (audioSrc = audioSrc.replace("//", "https://"));
    }
    else if (audio) {
        let exactWord = word.replace(/·/g, ''), // We do not want syllable seperator to be present.
            
        queryString = new URLSearchParams({
            text: exactWord,
            enc: 'mpeg',
            lang: context.lang,
            speed: '0.4',
            client: 'lr-language-tts',
            use_google_only_voices: 1
        }).toString();

        audioSrc = `${GOOGLE_SPEECH_URI}?${queryString}`;
    }
    return {meaningJson: meaningJson, word: word, meaning: meaningHtml, type: type, audioSrc: audioSrc, url: context.url, lang: context.lang};
};

/**
 * 
 * @param {*} content 
 */
async function saveWord (content) {
    let word = content.word.replace(/·/g, '').toLowerCase(),
        storageItem = await browser.storage.local.get();
    let definitions = storageItem.definitions || [];

    // Check if word is already in the store 
    if(definitions.filter(obj => obj.word == `${word}`).length == 1){return}


    let longestWord = storageItem.longestWord || "";
    let json = content.meaningJson;
        json["word"] = word,
        json["audioSrc"] = content.audioSrc;
        json["lang"] = content.lang;
        definitions.push(json);

    (word.length > longestWord.length) ? (longestWord = word):longestWord;

    return browser.storage.local.set({ definitions, longestWord });
}


/*
* Context Menu
*/
browser.contextMenus.create({
    id: "lexicon-selection",
    title: "Look up '%s' in Dictionary",
    contexts: ["selection"]
});

browser.contextMenus.onClicked.addListener(function (info, tab) {
    if (info.menuItemId === "lexicon-selection") {
        const code = `showMeaning({});`;

        browser.tabs.executeScript({
            code: "typeof showMeaning === 'function';",
        }).then(() => {
            return browser.tabs.executeScript(tab.id, {
                code,
            });
        }).catch((error) => {
            console.error("Failed to translate text: " + error);
        });
    }
});