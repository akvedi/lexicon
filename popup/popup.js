
(async ()=>{
    let storageItem = await browser.storage.local.get();
    let THEME = storageItem.theme;
    if(THEME == 'dark' || (THEME == 'system' && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)")).matches){
        return document.querySelector('body').id = 'dark';
    }
    return document.querySelector('body').id = 'light';
})();
async function getStorage(){
    let storageItem = await browser.storage.local.get();
    document.querySelector("#total-words-stored").innerText = storageItem.definitions.length || 0;
    document.querySelector("#longest-words").innerText = storageItem.longestWord || "---";

}
getStorage();
