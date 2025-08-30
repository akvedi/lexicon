const DEFAULT_HISTORY_SETTING = {enabled: true};

browser.runtime.onMessage.addListener((request, sender, sendResponse) => {

    browser.storage.local.get().then(localStorage => {
        let savedDef = localStorage.savedDef || {};
        let savedWord = (savedDef[request.lang]) ? savedDef[request.lang][request.word] : false;
        
        if(savedWord){   
            sendResponse(fetchMeaningOffline(request, savedWord));
        }
        else{
            fetchMeaningOnline(request).then(content => {
                sendResponse(content);
            })
        }
    })
  
    return true;
});


async function fetchMeaningOnline(request){
    let { word, lang, numOfDef, countryCode } = request;
    let url = fetchUrl(lang, word, countryCode);

    let headers = new Headers({
        'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Trident/5.0; AS; rv:9.0) like Gecko',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      });

    let fetchedData = await fetch(url, {
         method: 'GET',
         credentials: 'omit',
         headers: headers
        });

    const document = new DOMParser().parseFromString(await fetchedData.text(), 'text/html');

    const content = extractMeaning(document, { word, lang, numOfDef, url});

    // Perform storage operation asynchronously
    let results = await browser.storage.sync.get();
    let history = results.history || DEFAULT_HISTORY_SETTING;

    if (history.enabled && content) {
        saveWord(content);
    }

    return content;
}

function fetchMeaningOffline(request, result, sendResponse){

    let { word, lang, countryCode } = request;

    const url = fetchUrl(lang, word, countryCode);

    return {
        [word]:{
            ...result
        },
        url: url,
        word:word
    }
}

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
       return url = `https://www.bing.com/search?hl=hi&q=${word}+मतलब&cc=IN`;
    }
    // return url = `https://www.google.com/search?hl=${lang}&q=${define[lang]}+${word.replace(/·/g, '')}&gl=${countryCode}`;
    return url = `https://www.bing.com/search?q=${define[lang]}+${word.replace(/·/g, '')}&cc=${countryCode}`;
    

}

/**
 * 
 * @param  document
 * @param context 
 * @returns 
 */
function extractMeaning (document, context){
    if (!document.querySelector(".WordContainer")) {return null; }
    
    let word = document.querySelector('.WordContainer [role="heading"]').textContent,
        definitionDiv = document.querySelector(".b_dList").children,
        meaningJson = {},
        j = 1;

    let type = document.querySelector(".dc_lbl.dc_lowerpos").textContent || "";
    // get the language from the dictionary to aviod saving wrong language
    let fetchedlang = "";

    if(definitionDiv){
        Object.keys(definitionDiv).forEach(key => {
            let def = definitionDiv[key].querySelector(".b_promtxt").textContent;
            meaningJson[`meaning${j}`] =  def.replace(/:/g, '');
            j++;
        })
    }

    let audio = document.querySelector(".WordContainer audio") && document.querySelector(".WordContainer audio").src;
    let audioSrc = audio && "https://bing.com" + audio.substring(audio.indexOf('/th'))

    if(audioSrc){
        !audioSrc.includes("http") && (audioSrc = audioSrc.replace("//", "https://"));
    }
    
    let cleanedWord = word.replace(/·/g, '').toLowerCase();  // Remove the . from the word

    let obj = {
        [cleanedWord] :{ 
            ...meaningJson,
            word : cleanedWord,
            type : type,
            audioSrc : audioSrc,
            lang : context.lang
        },
        url : context.url,
        word :word,
        cleanedWord: cleanedWord
    }
    
    return obj;
};


/**
 * 
 * @param {*} content 
 */
async function saveWord (content) {

    // Normalize the word and fetch storage items
    // let word = content.word.replace(/·/g, '').toLowerCase(),
    let key = content.cleanedWord;

    let storageItem = await browser.storage.local.get();
    let savedDef = await storageItem.savedDef || {};

     // Ensure definitions[content.lang] is initialized
     if (!savedDef[content[key].lang]) {
        savedDef[content[key].lang] = {}; // Initialize if undefined 
    }
    
    // Check if the word is already stored 
    if(!!savedDef[content[key].lang][key]){return}

    let longestWord = storageItem.longestWord || "";

        savedDef[content[key].lang][key] = content[key];
        
    (key.length > longestWord.length) ? (longestWord = key):longestWord;

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
        await copyToNew(storageLocal.definitions, storageLocal.savedDef);
    }

    // Update savedDef needed for offline lookup feature
    if(!storageLocal.savedDefVersion || storageLocal.savedDefVersion < 2 ){
        updateSavedDef(storageLocal.savedDef);
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
        k.word = x.word;
        if(x.type) k.type = x.type;
        k.meaning1 = x.meaning1;
        if(x.meaning2) k.meaning2 = x.meaning2;
        if(x.meaning3) k.meaning3 = x.meaning3;

    });

    browser.storage.local.remove("definitions");
    return browser.storage.local.set({savedDef:mod, totalWords: old.length});
}

/**
 * Open a new page when extension is updated
 */
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

// Update savedDef

function updateSavedDef(savedDef){
    for (let lang in savedDef){
        for (let wordkey in savedDef[lang]){
            savedDef[lang][wordkey].word = wordkey;
        }
    }
    browser.storage.local.set({savedDef, savedDefVersion: 2});
}
