const DEFAULT_LANGUAGE = 'en',
    DEFAULT_TRIGGER_KEY = 'none',
    IS_HISTORY_ENABLED_BY_DEFAULT = true,
    DEFAULT_THEME = 'light',
    SAVE_STATUS = document.querySelector("#save-status"),
    SAVE_OPTIONS_BUTTON = document.querySelector("#save-btn"),
    RESET_OPTIONS_BUTTON = document.querySelector("#reset-btn"),
    CLEAR_HISTORY_BUTTON = document.querySelector("#clear-history-btn"),
    DOWNLOAD_HISTORY_BUTTON = document.querySelector("#download-history-btn"),

    /**
    * MacOS Command key specific 
    */
    OS_MAC = 'mac',
    KEY_COMMAND = 'Command',
    KEY_META = 'meta';

// End const

/**
 * Save options to local storage onclick save button
 * @param {event} e 
 */
function saveOptions(e) {
    browser.storage.sync.set({
        language: document.querySelector("#language-selector").value,
        interaction: {
            dblClick: {
                key: document.querySelector("#trigger-key").value
            }
        },
        history: {
            enabled: document.querySelector("#store-history-checkbox").checked
        },
        theme: document.querySelector("#theme-selector").value,
        autoplay: document.querySelector("#autoplay").value,
        numOfDef: document.querySelector("#num-of-def").value

    }).then(showSaveStatusAnimation);
    
    setTimeout(()=>{
     browser.runtime.reload();
    }, 500)
  
    e.preventDefault();
}

/**
 * Restore the settings on refresh of option page
 * Runs on option page refresh
 */ 
function restoreOptions() {
    let storageItem = browser.storage.sync.get();

    storageItem.then((results) => {
        let language = results.language,
            interaction = results.interaction || {},
            history = results.history || { enabled: IS_HISTORY_ENABLED_BY_DEFAULT },
            theme = results.theme,
            numOfDef = results.numOfDef;
            autoplay = results.autoplay;


        // Restore language setting
        document.querySelector("#language-selector").value = language || DEFAULT_LANGUAGE;
        document.querySelector("#to-language").innerText = 'to ' + document.querySelector(`[value="${language}"]`).innerText;

        // Restore interaction setting
        document.querySelector("#trigger-key").value = (interaction.dblClick && interaction.dblClick.key) || DEFAULT_TRIGGER_KEY;

        //Restore Autoplay option
        document.querySelector("#autoplay").value = autoplay || "false";
        
        // Restore number of definition to show
        document.querySelector("#num-of-def").value = numOfDef || "2";

        // Restore history setting
        document.querySelector("#store-history-checkbox").checked = history.enabled;
        document.querySelector("#num-words-in-history").innerText = results.totalWords || 0;
        
        //Restore theme setting
        document.querySelector("#theme-selector").value = theme || DEFAULT_THEME;

        // Load dark mode css if theme is set to dark
        loadTheme(theme);
    });
}

/**
 * Download word lookup history as a txt file
 * @param {event} e 
 */
function downloadHistory (e) {
    let fileContent = "", 
        storageItem = browser.storage.local.get("savedDef"),
        anchorTag = document.querySelector("#download-history-link");

    storageItem.then((results) => {
        let savedDef = results.savedDef || {};
        fileContent = JSON.stringify(savedDef, null, 2);

        anchorTag.href = window.URL.createObjectURL(new Blob([fileContent],{
            type: "application/json"
        }));

        anchorTag.dispatchEvent(new MouseEvent('click'));
    });

    e.preventDefault();
}

/**
 * Retore all options to default
 * @param {event} e - click event 
 */
function resetOptions (e) {
    if(confirm("Do you really want to reset extension settings")){
        browser.storage.sync.set({
            language: DEFAULT_LANGUAGE,
            interaction: {
                dblClick: {
                    key: DEFAULT_TRIGGER_KEY
                }
            },
            history: {
                enabled: IS_HISTORY_ENABLED_BY_DEFAULT
            },
            theme: DEFAULT_THEME,
            // Reset number of definitions to show
            numOfDef: "2", 
            autoplay: "false"

        }).then(restoreOptions);
    }
    e.preventDefault();
}

/**
 * Clear word lookup history on click clear button
 * @param {*} e 
 */
function clearHistory(e) {
    if(confirm("All of your word history will be cleared")){
        browser.storage.local.set({ savedDef: {}, longestWord: "", totalWords: 0 });
        document.getElementById("num-words-in-history").innerText = "0";
    };
    e.preventDefault();
}

/**
 * Show save on success of option save 
 */
function showSaveStatusAnimation () {
    SAVE_STATUS.style.setProperty("-webkit-transition", "opacity 0s ease-out");
    SAVE_STATUS.style.opacity = 1;
    window.setTimeout(function() {
        SAVE_STATUS.style.setProperty("-webkit-transition", "opacity 0.4s ease-out");
        SAVE_STATUS.style.opacity = 0;
    }, 1500);
}

/**
 * Link the dark CSS if theme preference is set to dark
 * @param {string} theme - current theme preference
 * @implements {theme}
 */
function loadTheme(theme){
    if(theme == 'dark' || (theme == 'system' && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)")).matches){
        return document.querySelector('body').id = 'dark';
    }
    return document.querySelector('body').id = 'light';
}

/**
 * Event Listeners
 * @kind event
 */
document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('theme-selector').addEventListener('change', (e)=>{loadTheme(e.target.value)});
CLEAR_HISTORY_BUTTON.addEventListener("click", clearHistory);
DOWNLOAD_HISTORY_BUTTON.addEventListener("click", downloadHistory);
SAVE_OPTIONS_BUTTON.addEventListener("click", saveOptions);
RESET_OPTIONS_BUTTON.addEventListener("click", resetOptions);

/**
 * Change the ctrl to cmd if key trigger is set in preference 
 */
if (window.navigator.platform.toLowerCase().includes(OS_MAC)){
    document.getElementById("trigger-key-ctrl").textContent = KEY_COMMAND;
    document.getElementById("trigger-key-ctrl").value = KEY_META;
}


/**
* Change the to language when the from language is changed in the option
*/
document.getElementById('language-selector').addEventListener("change", (e)=>{
    document.getElementById("to-language").innerText = 'to ' + e.target[e.target.selectedIndex].innerText;
})