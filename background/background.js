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

            content && browser.storage.sync.get().then((results) => {
                let history = results.history || DEFAULT_HISTORY_SETTING;
                                
                history.enabled && saveWord(content);
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
    let define = {"en":"define", "en-us":"define", "fr":"définir", "de":"definieren", "es":"definir", "pt":"definir", "pt-br":"definir"};
    if(lang == "hi"){
       return url = `https://www.google.com/search?hl=hi&q=${word}+मतलब&gl=IN`;
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
        meaningJson = {},
        j = 1;

    let type = document.querySelector('div[class~="YrbPuc"]').textContent || "";
    // get the language from the dictionary to aviod saving wrong language
    let fetchedlang = JSON.parse(document.querySelector('div[data-bkt=dictionary]').dataset.maindata)[13][7][1][1].toLowerCase(); 

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
    return {meaningJson: meaningJson, word: word, meaning: meaningHtml, type: type, audioSrc: audioSrc, url: context.url, lang: fetchedlang};
};

/**
 * 
 * @param {*} content 
 */
async function saveWord (content) {

    // Normalize the word and fetch storage items
    let word = content.word.replace(/·/g, '').toLowerCase(),
        storageItem = await browser.storage.local.get();
    let savedDef = await {...storageItem.savedDef} || {};

     // Ensure definitions[content.lang] is initialized
     if (!savedDef[content.lang]) {
        savedDef[content.lang] = {}; // Initialize if undefined 
    }
    
    // Check if the word is already stored and exit if exists
    if(!!savedDef[content.lang][word]){return}

    // Exit if the word already exists
    let longestWord = storageItem.longestWord || "";

    // Get the JSON object from content
    let json = {...content.meaningJson};

    // Add additional properties
        json.audioSrc = content.audioSrc;
        json.lang = content.lang;
        json.type = content.type;
        savedDef[content.lang][word] = json;
        
    (word.length > longestWord.length) ? (longestWord = word):longestWord;

    let totalWords = calcDefLength(savedDef);

    return browser.storage.local.set({ savedDef, longestWord, totalWords });
}

// Calulate total word stored
function calcDefLength(obj){
    let i = 0;
    for (let key in obj)
       i += Object.keys(obj[key]).length;

    return i;
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


// Save to localstorage
(async ()=>{
    let supportedLang = { "en-us":"English (US)", "en": "English (UK)", "fr": "French", "de": "German", "es": "Spanish", "hi": "Hindi", "pt": "Portuguese", "pt-br": "Brazilian Portuguese" };
    await browser.storage.sync.set({supportedLang: supportedLang});

    let storageSync = await browser.storage.sync.get();
    
    let storageLocal = await browser.storage.local.get();

    if(storageLocal.definitions){ // Move from definitions to savedDef
        copyToNew(storageLocal.definitions, storageLocal.savedDef);
    }

    migrateToSync(storageLocal, storageSync);

})();


//  Temp code to Move from definitions to savedDef

function copyToNew(old, newobj){
    let mod = {...newobj};
    let i = 0
    old.forEach(x => {
        if(!mod[x.lang.toLowerCase()]){
            mod[x.lang.toLowerCase()] = {}
        }
        if(!mod[x.lang.toLowerCase()][x.word])
            mod[x.lang.toLowerCase()][x.word] = {}


        let k = mod[x.lang.toLowerCase()][x.word]
        k.audioSrc = x.audioSrc;
        k.lang = x.lang;
        if(x.type) k.type = x.type;
        k.meaning1 = x.meaning1;
        if(x.meaning2) k.meaning2 = x.meaning2;
        if(x.meaning3) k.meaning3 = x.meaning3;

    });

    browser.storage.local.remove("definitions");
    return browser.storage.local.set({savedDef:mod, totalWords: old.length});
}


browser.runtime.onInstalled.addListener((e) =>{
    if (e.reason === 'update' && e.previousVersion < browser.runtime.getManifest().version) {      
        // Construct the URL of the local file
        let localFileURL = browser.runtime.getURL('../inc/update/update.html');
        
        // Open a new tab with the local file
        browser.tabs.create({ url: localFileURL });
    }
});    


// Migrate settings from local to sync storage if not already done then delete local storage

function migrateToSync(local, sync){

    let localKeys = Object.keys(local);

    for (let key of localKeys){
        if(key !== 'savedDef' && key !== 'longestWord' && key !== 'totalWords'){
            sync[key] = local[key];
        }
    }

    browser.storage.sync.set(sync);
    browser.storage.local.remove(['language', 'interaction', 'history', 'theme', 'numOfDef', 'autoplay', 'supportedLang']);

}

console.log(browser.storage.sync.get());