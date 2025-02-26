var sidepanel_Info = {
	keywordShow: {
		title: "",
		indexKey: "",
		dataMode: 0,
		displayOrder: [],
		isEditing: false,
		module: {}
	},
	urlShow: {
		title: "",
		indexKey: "",
		dataMode: 0,
		displayOrder: [],
		isEditing: false,
		module: {}
	},
	isDraggingEdge: false,
	draggingOffsetY: 0,
	titleOffsetHeight: 0,
	keywordOffsetHeight: 0
}

var editing_DataInfo = {
	isUsing: false,
	isNew: false,
	editEngine: null,
	editBlock: null,
	beforeEditData: "",
	beforeEditTimestamp: ""
}
var searching_DataInfo = {
	isSuggestionOnSearched: false,
	isClicked: false,
	allKeywordKeyIndex: [],
	isComposition: false
}

var current_PageInfo = {
	url: "",
	indexKey: "",
	title: "",
	isSearched: null,
	isSupport: false,
	keywordFound: {},
	module: {}
}
var background_Info = {
	isConnect: false,
	connectPort: null,
	currentKeyword: "",
	identificationToken: ""
}

// ====== 資料處理 ====== 
function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function refreshSidepanelStatus(msg){
	current_PageInfo.url = msg.url;
	current_PageInfo.indexKey = msg.indexKey;
	current_PageInfo.title = msg.title;
	current_PageInfo.keywordFound = msg.keywordFound;
	current_PageInfo.isSupport = msg.isSupport;
	current_PageInfo.module = msg.module;
	
	background_Info.identificationToken = msg.identificationToken;
	
	if ((sidepanel_Info.urlShow.indexKey != current_PageInfo.indexKey) && current_PageInfo.isSupport){
		refreshUrlShow(msg.indexKey);
	}
	if (sidepanel_Info.keywordShow.indexKey == ""){
		const QuestData = {
			event_name: 'quest-current-keyword',
			token: background_Info.identificationToken
		};
	
		chrome.runtime.sendMessage(QuestData, function (returnData){
			background_Info.currentKeyword = returnData.currentKeyword;
			if (background_Info.currentKeyword !== undefined){
				refreshKeywordShow(background_Info.currentKeyword, true);
			}
		});
	}
	
	const isSearchedDiff = (current_PageInfo.isSearched != msg.isSearched);
	current_PageInfo.isSearched = msg.isSearched;
	if (isSearchedDiff || background_Info.identificationToken == ""){
		refreshKeywordSuggestionShow();
	}
}

function createNoteBlock(noteContent, noteTimestamp, noteId = -1){
	const MessageBlock = document.createElement('div');
	MessageBlock.classList.add('windos_message_block');
	
	MessageBlock.innerHTML = `<div class="interactive_block">
							   </div>
							   <div class="windos_message_content ck-content">
								 ${noteContent}
							   </div>
							   <div class="windos_timestamp_container">
								 <div class="windos_message_timestamp">
								   ${noteTimestamp}
								 </div>
							   </div>`;
	
	if (noteId >= 0){
		insertInteractiveBlockStructure(MessageBlock, noteId);
	}
	
	return MessageBlock;
}
function insertInteractiveBlockStructure(noteBlock, noteId = 0){
	const interactive_block = noteBlock.querySelector(".interactive_block");
	
	interactive_block.innerHTML = `<button class="pinned_note" note_id="${noteId}" title="釘選筆記">
										<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 48 48">
											<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="4" d="m12 33l12-12l12 12M12 13h24"/>
										</svg>
									</button>
									<button class="more_options" note_id="${noteId}" title="更多操作">
										<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 20 20">
											<path fill="currentColor" d="M10.001 7.8a2.2 2.2 0 1 0 0 4.402A2.2 2.2 0 0 0 10 7.8zm0-2.6A2.2 2.2 0 1 0 9.999.8a2.2 2.2 0 0 0 .002 4.4m0 9.6a2.2 2.2 0 1 0 0 4.402a2.2 2.2 0 0 0 0-4.402" />
										</svg>
									</button>`;
									
	interactive_block.querySelector(".interactive_block button.pinned_note").title = chrome.i18n.getMessage('interactive_block_pinned_note__title');
	interactive_block.querySelector(".interactive_block button.more_options").title = chrome.i18n.getMessage('interactive_block_more_options__title');
	
	interactive_block.querySelector(".interactive_block button.pinned_note").addEventListener('click', orderEditButtonClick, false);
	interactive_block.querySelector(".interactive_block button.more_options").addEventListener('click', moreOptionsButtonClick, false);

	return;
}
function changeNoteBlock(noteBlock, noteContent, noteTimestamp, noteId = 0){
	noteBlock.querySelector(".windos_message_content").innerHTML = noteContent;
	noteBlock.querySelector(".windos_message_timestamp").innerText = noteTimestamp;
		
	noteBlock.querySelector(".interactive_block button.pinned_note").setAttribute('note_id', noteId);
	noteBlock.querySelector(".interactive_block button.more_options").setAttribute('note_id', noteId);
	
	return;
}

function createEditBlock(noteId, isNew = true, noteContent = ""){
	const MessageBlock = document.createElement('div');
	MessageBlock.classList.add('windos_message_block');
	
	MessageBlock.innerHTML = `<div class="interactive_block edit">
								<button class="more_options" note_id="${noteId}">
									<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 20 20">
										<path fill="currentColor" d="M10.001 7.8a2.2 2.2 0 1 0 0 4.402A2.2 2.2 0 0 0 10 7.8zm0-2.6A2.2 2.2 0 1 0 9.999.8a2.2 2.2 0 0 0 .002 4.4m0 9.6a2.2 2.2 0 1 0 0 4.402a2.2 2.2 0 0 0 0-4.402" />
									</svg>
								</button>
								</div>
								<div class="windos_content_editor">
									${noteContent}
								</div>
								<div class="windos_timestamp_container">
									<div class="windos_message_timestamp">
										Powered by
										<svg class="ck ck-icon ck-reset_all-excluded" viewBox="0 0 53 10" style="width: 53px; height: 10px;"><path fill="#1C2331" d="M31.724 1.492a15.139 15.139 0 0 0 .045 1.16 2.434 2.434 0 0 0-.687-.34 3.68 3.68 0 0 0-1.103-.166 2.332 2.332 0 0 0-1.14.255 1.549 1.549 0 0 0-.686.87c-.15.41-.225.98-.225 1.712 0 .939.148 1.659.444 2.161.297.503.792.754 1.487.754.452.015.9-.094 1.294-.316.296-.174.557-.4.771-.669l.14.852h1.282V.007h-1.623v1.485ZM31 6.496a1.77 1.77 0 0 1-.494.061.964.964 0 0 1-.521-.127.758.758 0 0 1-.296-.466 3.984 3.984 0 0 1-.093-.992 4.208 4.208 0 0 1 .098-1.052.753.753 0 0 1 .307-.477 1.08 1.08 0 0 1 .55-.122c.233-.004.466.026.69.089l.483.144v2.553c-.11.076-.213.143-.307.2a1.73 1.73 0 0 1-.417.189ZM35.68 0l-.702.004c-.322.002-.482.168-.48.497l.004.581c.002.33.164.493.486.49l.702-.004c.322-.002.481-.167.48-.496L36.165.49c-.002-.33-.164-.493-.486-.491ZM36.145 2.313l-1.612.01.034 5.482 1.613-.01-.035-5.482ZM39.623.79 37.989.8 38 2.306l-.946.056.006 1.009.949-.006.024 2.983c.003.476.143.844.419 1.106.275.26.658.39 1.148.387.132 0 .293-.01.483-.03.19-.02.38-.046.57-.08.163-.028.324-.068.482-.119l-.183-1.095-.702.004a.664.664 0 0 1-.456-.123.553.553 0 0 1-.14-.422l-.016-2.621 1.513-.01-.006-1.064-1.514.01-.01-1.503ZM46.226 2.388c-.41-.184-.956-.274-1.636-.27-.673.004-1.215.101-1.627.29-.402.179-.72.505-.888.91-.18.419-.268.979-.264 1.68.004.688.1 1.24.285 1.655.172.404.495.724.9.894.414.18.957.268 1.63.264.68-.004 1.224-.099 1.632-.284.4-.176.714-.501.878-.905.176-.418.263-.971.258-1.658-.004-.702-.097-1.261-.28-1.677a1.696 1.696 0 0 0-.888-.9Zm-.613 3.607a.77.77 0 0 1-.337.501 1.649 1.649 0 0 1-1.317.009.776.776 0 0 1-.343-.497 4.066 4.066 0 0 1-.105-1.02 4.136 4.136 0 0 1 .092-1.03.786.786 0 0 1 .337-.507 1.59 1.59 0 0 1 1.316-.008.79.79 0 0 1 .344.502c.078.337.113.683.105 1.03.012.343-.019.685-.092 1.02ZM52.114 2.07a2.67 2.67 0 0 0-1.128.278c-.39.191-.752.437-1.072.73l-.157-.846-1.273.008.036 5.572 1.623-.01-.024-3.78c.35-.124.646-.22.887-.286.26-.075.53-.114.8-.118l.45-.003.144-1.546-.286.001ZM22.083 7.426l-1.576-2.532a2.137 2.137 0 0 0-.172-.253 1.95 1.95 0 0 0-.304-.29.138.138 0 0 1 .042-.04 1.7 1.7 0 0 0 .328-.374l1.75-2.71c.01-.015.025-.028.024-.048-.01-.01-.021-.007-.031-.007L20.49 1.17a.078.078 0 0 0-.075.045l-.868 1.384c-.23.366-.46.732-.688 1.099a.108.108 0 0 1-.112.06c-.098-.005-.196-.001-.294-.002-.018 0-.038.006-.055-.007.002-.02.002-.039.005-.058a4.6 4.6 0 0 0 .046-.701V1.203c0-.02-.009-.032-.03-.03h-.033L16.93 1.17c-.084 0-.073-.01-.073.076v6.491c-.001.018.006.028.025.027h1.494c.083 0 .072.007.072-.071v-2.19c0-.055-.003-.11-.004-.166a3.366 3.366 0 0 0-.05-.417h.06c.104 0 .209.002.313-.002a.082.082 0 0 1 .084.05c.535.913 1.07 1.824 1.607 2.736a.104.104 0 0 0 .103.062c.554-.003 1.107-.002 1.66-.002l.069-.003-.019-.032-.188-.304ZM27.112 6.555c-.005-.08-.004-.08-.082-.08h-2.414c-.053 0-.106-.003-.159-.011a.279.279 0 0 1-.246-.209.558.558 0 0 1-.022-.15c0-.382 0-.762-.002-1.143 0-.032.007-.049.042-.044h2.504c.029.003.037-.012.034-.038V3.814c0-.089.013-.078-.076-.078h-2.44c-.07 0-.062.003-.062-.06v-.837c0-.047.004-.093.013-.14a.283.283 0 0 1 .241-.246.717.717 0 0 1 .146-.011h2.484c.024.002.035-.009.036-.033l.003-.038.03-.496c.01-.183.024-.365.034-.548.005-.085.003-.087-.082-.094-.218-.018-.437-.038-.655-.05a17.845 17.845 0 0 0-.657-.026 72.994 72.994 0 0 0-1.756-.016 1.7 1.7 0 0 0-.471.064 1.286 1.286 0 0 0-.817.655c-.099.196-.149.413-.145.633v3.875c0 .072.003.144.011.216a1.27 1.27 0 0 0 .711 1.029c.228.113.48.167.734.158.757-.005 1.515.002 2.272-.042.274-.016.548-.034.82-.053.03-.002.043-.008.04-.041-.008-.104-.012-.208-.019-.312a69.964 69.964 0 0 1-.05-.768ZM16.14 7.415l-.127-1.075c-.004-.03-.014-.04-.044-.037a13.125 13.125 0 0 1-.998.073c-.336.01-.672.02-1.008.016-.116-.001-.233-.014-.347-.039a.746.746 0 0 1-.45-.262c-.075-.1-.132-.211-.167-.33a3.324 3.324 0 0 1-.126-.773 9.113 9.113 0 0 1-.015-.749c0-.285.022-.57.065-.852.023-.158.066-.312.127-.46a.728.728 0 0 1 .518-.443 1.64 1.64 0 0 1 .397-.048c.628-.001 1.255.003 1.882.05.022.001.033-.006.036-.026l.003-.031.06-.55c.019-.177.036-.355.057-.532.004-.034-.005-.046-.04-.056a5.595 5.595 0 0 0-1.213-.21 10.783 10.783 0 0 0-.708-.02c-.24-.003-.48.01-.719.041a3.477 3.477 0 0 0-.625.14 1.912 1.912 0 0 0-.807.497c-.185.2-.33.433-.424.688a4.311 4.311 0 0 0-.24 1.096c-.031.286-.045.572-.042.86-.006.43.024.86.091 1.286.04.25.104.497.193.734.098.279.26.53.473.734.214.205.473.358.756.446.344.11.702.17 1.063.177a8.505 8.505 0 0 0 1.578-.083 6.11 6.11 0 0 0 .766-.18c.03-.008.047-.023.037-.057a.157.157 0 0 1-.003-.025Z"></path><path fill="#AFE229" d="M6.016 6.69a1.592 1.592 0 0 0-.614.21c-.23.132-.422.32-.56.546-.044.072-.287.539-.287.539l-.836 1.528.009.006c.038.025.08.046.123.063.127.046.26.07.395.073.505.023 1.011-.007 1.517-.003.29.009.58.002.869-.022a.886.886 0 0 0 .395-.116.962.962 0 0 0 .312-.286c.056-.083.114-.163.164-.249.24-.408.48-.816.718-1.226.075-.128.148-.257.222-.386l.112-.192a1.07 1.07 0 0 0 .153-.518l-1.304.023s-1.258-.005-1.388.01Z"></path><path fill="#771BFF" d="m2.848 9.044.76-1.39.184-.352c-.124-.067-.245-.14-.367-.21-.346-.204-.706-.384-1.045-.6a.984.984 0 0 1-.244-.207c-.108-.134-.136-.294-.144-.46-.021-.409-.002-.818-.009-1.227-.003-.195 0-.39.003-.585.004-.322.153-.553.427-.713l.833-.488c.22-.13.44-.257.662-.385.05-.029.105-.052.158-.077.272-.128.519-.047.76.085l.044.028c.123.06.242.125.358.196.318.178.635.357.952.537.095.056.187.117.275.184.194.144.254.35.266.578.016.284.007.569.006.853-.001.28.004.558 0 .838.592-.003 1.259 0 1.259 0l.723-.013c-.003-.292-.007-.584-.007-.876 0-.524.015-1.048-.016-1.571-.024-.42-.135-.8-.492-1.067a5.02 5.02 0 0 0-.506-.339A400.52 400.52 0 0 0 5.94.787C5.722.664 5.513.524 5.282.423 5.255.406 5.228.388 5.2.373 4.758.126 4.305-.026 3.807.21c-.097.046-.197.087-.29.14A699.896 699.896 0 0 0 .783 1.948c-.501.294-.773.717-.778 1.31-.004.36-.009.718-.001 1.077.016.754-.017 1.508.024 2.261.016.304.07.6.269.848.127.15.279.28.448.382.622.4 1.283.734 1.92 1.11l.183.109Z"></path></svg>
									</div>
								</div>`;
							   
	MessageBlock.querySelector(".interactive_block button.more_options").title = chrome.i18n.getMessage('interactive_block_more_options__title');
	MessageBlock.querySelector(".interactive_block button.more_options").addEventListener('click', moreEditOptionsButtonClick, false);

	setEditEngine(MessageBlock);
	editing_DataInfo.isNew = isNew;
	return MessageBlock;
}
function setEditEngine(MessageBlock){
	const BalloonEditor = window.BalloonEditor;
	BalloonEditor.create(MessageBlock.querySelector('div.windos_content_editor'), {
		placeholder: 'Enter new note here',
		language: chrome.i18n.getUILanguage(),
		link: {
			decorators: {
				addTargetToExternalLinks: {
					mode: 'automatic',
					callback: url => true,
					attributes: {
						target: '_blank',
						rel: 'noopener noreferrer'
					}
				}
			}
		}
	})
	.then((editor) => {
		editing_DataInfo.isUsing = true;
		editing_DataInfo.editEngine = editor;
		
		const windos_content_editor = MessageBlock.querySelector('.windos_content_editor');
		editing_DataInfo.editBlock = MessageBlock;
		editing_DataInfo.beforeEditData = windos_content_editor.innerHTML;
	} )
	.catch((error) => {
		console.error(error);
	} );	
}
function clearEditEngine(needRemove = true){
	sidepanel_Info.keywordShow.isEditing = false;
	sidepanel_Info.urlShow.isEditing = false;
	
	if (needRemove){
		editing_DataInfo.editBlock.remove();
	}
	
	editing_DataInfo = {
		isUsing: false,
		isNew: false,
		editEngine: null,
		editBlock: null,
		beforeEditData: "",
		beforeEditTimestamp: ""
	}
}

async function refreshUrlShow(urlIndexKey){
	if (sidepanel_Info.urlShow.isEditing){
		return;
	}
	
	const QuestData = {
		event_name: 'quest-url-notedata',
		urlKeyIndex: urlIndexKey,
		token: background_Info.identificationToken
	};
	
	await chrome.runtime.sendMessage(QuestData, function (returnData){
		const title_area = document.getElementById("title_area");
		sidepanel_Info.urlShow.title = returnData.isExist ? returnData.data.title : urlIndexKey;
		sidepanel_Info.urlShow.indexKey = urlIndexKey;
		sidepanel_Info.urlShow.displayOrder = returnData.isExist ? returnData.data.displayOrder : [];
		
		const UrlIndexTitle = title_area.querySelector('span#url_note_host');
		UrlIndexTitle.innerText = sidepanel_Info.urlShow.title;
		
		const url_note_container = document.getElementById("url_note_container");
		const url_note_block = url_note_container.querySelectorAll(".windos_message_block");
		
		if (!returnData.isExist){
			const NoteContent = chrome.i18n.getMessage('windos_message_content_url_0emptyindex');
			const NoteTimestamp = chrome.i18n.getMessage('windos_message_timestamp_url_0emptyindex');
			
			const MessageBlock = createNoteBlock(NoteContent, NoteTimestamp);
			
			url_note_container.innerHTML = "";
			url_note_container.appendChild(MessageBlock);
			
			sidepanel_Info.urlShow.dataMode = 0;
		}
		else if (sidepanel_Info.urlShow.displayOrder.length > 0){
			const NoteContent = chrome.i18n.getMessage('windos_message_content_url_0noindex');
			const NoteTimestamp = chrome.i18n.getMessage('windos_message_timestamp_url_0noindex');
			
			const MessageBlock = createNoteBlock(NoteContent, NoteTimestamp);
			
			url_note_container.innerHTML = "";
			url_note_container.appendChild(MessageBlock);
			
			sidepanel_Info.urlShow.dataMode = 1;
		}
		else{
			if(sidepanel_Info.urlShow.dataMode < 2){
				insertInteractiveBlockStructure(url_note_block[0]);
			}
			
			const NoteBlockLength = url_note_block.length;
			const NoteLength = sidepanel_Info.urlShow.displayOrder.length;
			const Min = Math.min(NoteBlockLength, NoteLength);
			
			for (let i = 0; i < Min; i++){
				const NoteIndex = sidepanel_Info.urlShow.displayOrder[i];
				const [NoteContent, NoteTimestamp, UndefindValue] = returnData.data.note[NoteIndex];
					
				changeNoteBlock(url_note_block[i], NoteContent, NoteTimestamp, NoteIndex);
			}
			for (let i = 0; i < (NoteLength - Min); i++){
				const NoteIndex = sidepanel_Info.urlShow.displayOrder[Min + i];
				const [NoteContent, NoteTimestamp, UndefindValue] = returnData.data.note[NoteIndex];
					
				const MessageBlock = createNoteBlock(NoteContent, NoteTimestamp, NoteIndex);
				url_note_container.appendChild(MessageBlock);
			}
			for (let i = 0; i < (NoteBlockLength - Min); i++){
				url_note_block[Min + i].remove();
			}
			
			sidepanel_Info.urlShow.dataMode = 2;
		}
	});
}
async function refreshKeywordShow(keywordKeyIndex, isFirst = false){
    if (sidepanel_Info.keywordShow.isEditing) {
        return;
    }

	const QuestData = {
		event_name: 'quest-keyword-notedata',
		keywordKeyIndex: keywordKeyIndex,
		isFirst: isFirst,
		token: background_Info.identificationToken
	};
	
	await chrome.runtime.sendMessage(QuestData, function (returnData){
		const keyword_area = document.getElementById("keyword_area");
		sidepanel_Info.keywordShow.title = returnData.isExist ? returnData.data.title : keywordKeyIndex;
		sidepanel_Info.keywordShow.indexKey = keywordKeyIndex;
		sidepanel_Info.keywordShow.displayOrder = returnData.isExist ? returnData.data.displayOrder : [];

		const KeywordIndexTitle = keyword_area.querySelector('span#keyword_note_host');
		KeywordIndexTitle.innerText = sidepanel_Info.keywordShow.title;

		const keyword_note_container = document.getElementById("keyword_note_container");
		const keyword_note_block = keyword_note_container.querySelectorAll(".windos_message_block");

		if (!returnData.isExist) {
			const NoteContent = chrome.i18n.getMessage('windos_message_content_keyword_0emptyindex');
			const NoteTimestamp = chrome.i18n.getMessage('windos_message_timestamp_keyword_0emptyindex');
			
			const MessageBlock = createNoteBlock(NoteContent, NoteTimestamp);
			
			keyword_note_container.innerHTML = "";
			keyword_note_container.appendChild(MessageBlock);
			
			sidepanel_Info.keywordShow.dataMode = 0;
		}
		else if (sidepanel_Info.keywordShow.displayOrder.length === 0) {
			const NoteContent = chrome.i18n.getMessage('windos_message_content_keyword_0noindex');
			const NoteTimestamp = chrome.i18n.getMessage('windos_message_timestamp_keyword_0noindex');
			
			const MessageBlock = createNoteBlock(NoteContent, NoteTimestamp);
			
			keyword_note_container.innerHTML = "";
			keyword_note_container.appendChild(MessageBlock);
			
			sidepanel_Info.keywordShow.dataMode = 1;
		}
		else {
			if (sidepanel_Info.keywordShow.dataMode < 2) {
				insertInteractiveBlockStructure(keyword_note_block[0]);
			}

			const NoteBlockLength = keyword_note_block.length;
			const NoteLength = sidepanel_Info.keywordShow.displayOrder.length;
			const Min = Math.min(NoteBlockLength, NoteLength);
			
			for (let i = 0; i < Min; i++) {
				const NoteIndex = sidepanel_Info.keywordShow.displayOrder[i];
				
				const exist_block = keyword_note_block[i];
				const [NoteContent, NoteTimestamp, is_pinned] = returnData.data.note[NoteIndex];
				
				changeNoteBlock(keyword_note_block[i], NoteContent, NoteTimestamp, NoteIndex);
			}
			for (let i = 0; i < (NoteLength - Min); i++) {
				const NoteIndex = sidepanel_Info.keywordShow.displayOrder[Min + i];
				const [NoteContent, NoteTimestamp, is_pinned] = returnData.data.note[NoteIndex];
				
				const MessageBlock = createNoteBlock(NoteContent, NoteTimestamp, NoteIndex);
				
				keyword_note_container.appendChild(MessageBlock);
			}
			for (let i = 0; i < (NoteBlockLength - Min); i++) {
				keyword_note_block[Min + i].remove();
			}

			sidepanel_Info.keywordShow.dataMode = 2;
		}
	});
}
async function refreshKeywordSuggestionShow(){
    const suggestion_area = document.getElementById("suggestion_area");
    const suggestion_container = suggestion_area.querySelector(".suggestion_container");
    suggestion_container.scrollLeft = 0;
	
	const keywordFound = Object.keys(current_PageInfo.keywordFound);
	
	if (current_PageInfo.isSearched && (keywordFound.length > 0)){
		let count_id = 0;
		const SuggestionButtons = suggestion_container.querySelectorAll(".keyword_suggestion");
		
		keywordFound.forEach(function (suggestion) {
			if(!SuggestionButtons[count_id]){
				const ButtonBlock = document.createElement('button');
				ButtonBlock.classList.add('keyword_suggestion');
				ButtonBlock.setAttribute('keywordindex', suggestion);
										
				ButtonBlock.innerText = `${suggestion} ${current_PageInfo.keywordFound[suggestion]}`;
				ButtonBlock.addEventListener('click', suggestionButtonClick, false);
				suggestion_container.appendChild(ButtonBlock);
			}
			else{
				SuggestionButtons[count_id].innerText = `${suggestion} ${current_PageInfo.keywordFound[suggestion]}`;
				SuggestionButtons[count_id].setAttribute('keyword', suggestion);
			}
			
			count_id += 1;
		});
		if(count_id < SuggestionButtons.length){
			for (var i = count_id; i < SuggestionButtons.length; i++) {
				suggestion_container.removeChild(SuggestionButtons[i]);
			}
		}
	}
	else{
		const QuestData = {
			event_name: 'quest-keyword-display-order',
			token: background_Info.identificationToken
		};
		
		await chrome.runtime.sendMessage(QuestData, function (returnData){
			if (!returnData.isFinish){
				suggestion_container.innerHTML = "";
				
				const ButtonBlock = document.createElement('button');
				ButtonBlock.classList.add('keyword_suggestion');
				ButtonBlock.setAttribute('keywordindex', 'none');
										
				ButtonBlock.innerText = "未有關鍵字紀錄";
				suggestion_container.appendChild(ButtonBlock);
			}
			else if (returnData.displayOrder.length == 0){
				suggestion_container.innerHTML = "";
				
				const ButtonBlock = document.createElement('button');
				ButtonBlock.classList.add('keyword_suggestion');
				ButtonBlock.setAttribute('keywordindex', 'none');
										
				ButtonBlock.innerText = "未有關鍵字紀錄";
				suggestion_container.appendChild(ButtonBlock);
			}
			else{
				let count_id = 0;
				const SuggestionButtons = suggestion_container.querySelectorAll(".keyword_suggestion");
				
				returnData.displayOrder.forEach(function (suggestion) {
					if(!SuggestionButtons[count_id]){
						const ButtonBlock = document.createElement('button');
						ButtonBlock.classList.add('keyword_suggestion');
						ButtonBlock.setAttribute('keywordindex', suggestion);
												
						ButtonBlock.innerText = `${suggestion}`;
						ButtonBlock.addEventListener('click', suggestionButtonClick, false);
						suggestion_container.appendChild(ButtonBlock);
					}
					else{
						SuggestionButtons[count_id].innerText = `${suggestion}`;
						SuggestionButtons[count_id].setAttribute('keyword', suggestion);
					}
					
					count_id += 1;
				});
				
				if(count_id < SuggestionButtons.length){
					for (var i = count_id; i < SuggestionButtons.length; i++) {
						suggestion_container.removeChild(SuggestionButtons[i]);
					}
				}
			}
		});
	}
}

function closeSuggestionPopup(){
	all_suggestion_popup.style.left = '';
	all_suggestion_popup.style.top = '';

	all_suggestion_popup.classList.remove('popup_show');
	
	if (!searching_DataInfo.isSuggestionOnSearched){
		popup_suggestion_container.innerHTML = "";
	}
	
	return;
}

// ====== 資料處理 ====== 
async function triggerAlertWindow(message, type){
	const Notification = {
		event_name: 'send-notification-message',
		message: message,
		notification_type: type
	};
	
	await chrome.runtime.sendMessage(Notification);
}

// ====== 元素事件 ====== 
// --- message block buttons ---
function orderEditButtonClick(event){//v
	const PinButton = event.target.closest('.pinned_note');
	const NoteId = parseInt(PinButton.getAttribute('note_id'));
	const BlockContainer = event.target.closest('.windos_message_container');
	
	const QuestData = {
		event_name: 'update-keyword-display-order',
		token: background_Info.identificationToken
	}
	
	if (BlockContainer.id === 'url_note_container'){
		const DisplayOrder = sidepanel_Info.urlShow.displayOrder;
		let NewDisplayOrder = JSON.parse(JSON.stringify(DisplayOrder));
		const NoteIndex = NewDisplayOrder.indexOf(NoteId);
		
		if (NoteIndex >= 0){
			NewDisplayOrder.splice(NoteIndex, 1);
			NewDisplayOrder.unshift(NoteId);
			
			QuestData.urlKeyIndex = sidepanel_Info.urlShow.indexKey;
			QuestData.displayOrder = NewDisplayOrder;
		}
	}
	else if (BlockContainer.id === 'keyword_note_container'){
		const DisplayOrder = sidepanel_Info.keywordShow.displayOrder;
		let NewDisplayOrder = JSON.parse(JSON.stringify(DisplayOrder));
		const NoteIndex = NewDisplayOrder.indexOf(NoteId);
		
		if (NoteIndex >= 0){
			NewDisplayOrder.splice(NoteIndex, 1);
			NewDisplayOrder.unshift(NoteId);
			
			QuestData.keywordKeyIndex = sidepanel_Info.keywordShow.indexKey;
			QuestData.displayOrder = NewDisplayOrder;
		}
	}
	else{
		return;
	}
	
	chrome.runtime.sendMessage(QuestData, function (returnData){
		if (returnData.isFinish){
			let NodeInContainer = BlockContainer.querySelectorAll('.windos_message_block');
			let displayNode = [];
			
			for (let i = 0; i < sidepanel_Info.keywordShow.displayOrder.length; i++){
				displayNode.push(NodeInContainer[sidepanel_Info.keywordShow.displayOrder[i]]);
			}
			
			returnData.displayOrder.forEach((TargetNodeIndex) => {
				BlockContainer.appendChild(displayNode[TargetNodeIndex]);
			});
			
			sidepanel_Info.keywordShow.displayOrder = returnData.displayOrder;
		}
	});
}
function moreOptionsButtonClick(event){//v
	const more_options_popup = document.getElementById("more_options_popup");
	
	const x = event.clientX;
	const y = event.clientY;
	
	more_options_popup.style.left = `${x - 145}px`;
	more_options_popup.style.top = `${y - 5}px`;
	
	const NoteId = parseInt(event.target.closest('.more_options').getAttribute('note_id'));
	const TriggerType = event.target.closest('.windos_message_container').id;
	
	more_options_popup.setAttribute('note_id', NoteId);
	if (TriggerType === 'url_note_container'){
		more_options_popup.setAttribute('trigger_type', 'url');
	}
	else if (TriggerType === 'keyword_note_container'){
		more_options_popup.setAttribute('trigger_type', 'keyword');
	}
	
	more_options_popup.classList.add('popup_show');
}
function moreEditOptionsButtonClick(event){//v
	const edit_options_popup = document.getElementById("edit_options_popup");
	
	const x = event.clientX;
	const y = event.clientY;
	
	edit_options_popup.style.left = `${x - 155}px`;
	edit_options_popup.style.top = `${y + 5}px`;
	
	const NoteId = parseInt(event.target.closest('.more_options').getAttribute('note_id'));
	const TriggerType = event.target.closest('.windos_message_container').id;
	
	edit_options_popup.setAttribute('note_id', NoteId);
	if (TriggerType === 'url_note_container'){
		edit_options_popup.setAttribute('trigger_type', 'url');
	}
	else if (TriggerType === 'keyword_note_container'){
		edit_options_popup.setAttribute('trigger_type', 'keyword');
	}
	
	edit_options_popup.classList.add('popup_show');
}

// --- title area title buttons ---
function switch_host_urlindex(event){//x
	if (is_SpecialUrls || view_MainIndex){
		if (view_MainIndex){
			chrome.runtime.sendMessage({event_name: 'quest-special-url-notedata', title: current_HostTilte, host: currentpage_Host, url: currentpage_Url}, (t) => {});
			view_MainIndex = false;
		}
		else{
			chrome.runtime.sendMessage({event_name: 'quest-url-notedata', host: currentpage_Host}, (t) => {});
			view_MainIndex = true;
		}
	}
}
function urlNewNoteButtonClick(event){//v
	if (sidepanel_Info.urlShow.isEditing) {
		triggerAlertWindow(chrome.i18n.getMessage('sidepanel_unsaved_warning'), 'warning');
		return;
	}
	if (!Boolean(sidepanel_Info.urlShow.indexKey)){
		triggerAlertWindow(chrome.i18n.getMessage('sidepanel_unrecord_keyword_warning'), 'warning');
		return;
	}
	if (editing_DataInfo.isUsing){
		//needErrorMessage
		return;
	}
	sidepanel_Info.urlShow.isEditing = true;
	
	sidepanel_Info.keywordShow.isEditing = true;
	
	const url_note_container = document.getElementById("url_note_container");
	const NoteBlocks = url_note_container.querySelectorAll(".windos_message_block");
	const NewNoteId = (sidepanel_Info.urlShow.dataMode < 2) ? 0 : (NoteBlocks.length);
	
	const MessageBlock = createEditBlock(NewNoteId);
	url_note_container.insertBefore(MessageBlock, url_note_container.firstChild);
	url_note_container.scrollTop = 0;
}
function titleMoreOptionsButtonClick(event){//v
	const title_control_popup = document.getElementById("title_control_popup");
	
	const x = event.clientX;
	const y = event.clientY;
	
	title_control_popup.style.left = `${x - 145}px`;
	title_control_popup.style.top = `${y - 5}px`;
	
	title_control_popup.classList.add('popup_show');
}
function urlDeleteButtonClick(event){//v
	if (sidepanel_Info.urlShow.isEditing) {
		triggerAlertWindow(chrome.i18n.getMessage('sidepanel_unsaved_warning'), 'warning');
		return;
	}
	if (!Boolean(sidepanel_Info.urlShow.indexKey)){
		triggerAlertWindow(chrome.i18n.getMessage('sidepanel_unrecord_keyword_warning'), 'warning');
		return;
	}

	const QuestData = {
		event_name: 'delete-url-noteindex',
		urlKeyIndex: sidepanel_Info.urlShow.indexKey,
		token: background_Info.identificationToken
	};
	
	chrome.runtime.sendMessage(QuestData, (returnData) => {
		if (returnData.isFinish){
			refreshUrlShow(sidepanel_Info.urlShow.indexKey);
		}
	});
				
	more_options_popup.style.left = '';
	more_options_popup.style.top = '';

	more_options_popup.classList.remove('popup_show');
}
function urlReloadButtonClick(event){//v
	if (sidepanel_Info.urlShow.isEditing) {
		triggerAlertWindow(chrome.i18n.getMessage('sidepanel_unsaved_warning'), 'warning');
		return;
	}
	if (!Boolean(sidepanel_Info.urlShow.indexKey)){
		//needErrorMessage
		return;
	}
	
	refreshUrlShow(sidepanel_Info.urlShow.indexKey);
	
	more_options_popup.style.left = '';
	more_options_popup.style.top = '';

	more_options_popup.classList.remove('popup_show');
}
function url_summary_button_click(event){
	const more_options_popup = event.target.closest('.levitate_options_popup');
	chrome.runtime.sendMessage({event_name: 'quest-summary-url', current_url: current_Url, current_host: current_Host}, (t) => {});

	more_options_popup.style.left = '';
	more_options_popup.style.top = '';

	more_options_popup.classList.remove('popup_show');
	refreshKeywordAreaAsSummary({is_done: true, tidy_response:['處理請求中......']});
}

// --- suggestion area keyword buttons ---
function suggestionButtonClick(event){//v
	const TriggerKeywordIndex = event.target.closest('.keyword_suggestion').getAttribute('keywordindex');
	
	if (TriggerKeywordIndex === 'none'){
		return;
	}
	if (sidepanel_Info.keywordShow.isEditing){
		triggerAlertWindow(chrome.i18n.getMessage('sidepanel_unsaved_warning'), 'warning');
		return;
	}
	
	if (sidepanel_Info.keywordShow.indexKey != TriggerKeywordIndex){
		refreshKeywordShow(TriggerKeywordIndex);
	}
}
function moreSuggestionButtonClick(event){//v
	const all_suggestion_popup = document.getElementById("all_suggestion_popup");
	const popup_suggestion_container = all_suggestion_popup.querySelector(".popup_suggestion_container");
	
	if (all_suggestion_popup.classList.contains('popup_show')){//二次點擊關閉彈出搜尋框
		closeSuggestionPopup();
	}
	
	const moreSuggestionButtonPosition = event.target.closest('button#more_suggestion').getBoundingClientRect() 
	
	all_suggestion_popup.style.top = `${moreSuggestionButtonPosition.top + 45}px`;
	
	if (!searching_DataInfo.isSuggestionOnSearched){
		const QuestData = {
			event_name: 'quest-keyword-list',
			token: background_Info.identificationToken
		};
	
		chrome.runtime.sendMessage(QuestData, function (returnData){
			if (returnData.keywordKeyIndex !== undefined){
				searching_DataInfo.allKeywordKeyIndex = returnData.keywordKeyIndex;
				popup_suggestion_container.innerHTML = "";
				
				searching_DataInfo.allKeywordKeyIndex.forEach(function (keywordKeyIndex) {
					const ButtonBlock = document.createElement('button');
					ButtonBlock.classList.add('keyword_suggestion');
					ButtonBlock.setAttribute('keywordindex', keywordKeyIndex);
											
					ButtonBlock.innerText = `${keywordKeyIndex}`;
					ButtonBlock.addEventListener('click', suggestionButtonClick, false);
					popup_suggestion_container.appendChild(ButtonBlock);
				});
			}
			else{
				closeSuggestionPopup();
				//needErrorMessage
			}
		});
	}
	
	all_suggestion_popup.classList.add('popup_show');
}
function noindexnote_button_click(event){//x
	if (is_KeywordNewNoteEdit != null){
		triggerAlertWindow(chrome.i18n.getMessage('sidepanel_unsaved_warning'), 'warning');
		return;
	}
	
	if (!(current_Keyword === 'NoIndexNote')){
		chrome.runtime.sendMessage({event_name: 'quest-noindex-notedata-sidepanel'}, (t) => {});
		current_Keyword = 'NoIndexNote';
	}
}
function keywordSearchAlgorithmProcess(event){//v
	if (searching_DataInfo.isComposition){
		return;
	}
	
	const search_string = event.target.value;//搜尋框內文字
	
	const popup_suggestion_container = event.target.closest(".levitate_suggestion_contaner").querySelector(".popup_suggestion_container");
	const SuggestionButtons = popup_suggestion_container.querySelectorAll(".keyword_suggestion");
	let TargetButtonIndex = 0;
	
	searching_DataInfo.allKeywordKeyIndex.forEach(function (keywordKeyIndex) {
		if (keywordKeyIndex.includes(search_string)){
			if(!SuggestionButtons[TargetButtonIndex]){
				const ButtonBlock = document.createElement('button');
				ButtonBlock.classList.add('keyword_suggestion');
				ButtonBlock.setAttribute('keywordindex', keywordKeyIndex);
										
				ButtonBlock.innerText = `${keywordKeyIndex}`;
				ButtonBlock.addEventListener('click', suggestionButtonClick, false);
				popup_suggestion_container.appendChild(ButtonBlock);
			}
			else{
				SuggestionButtons[TargetButtonIndex].innerText = `${keywordKeyIndex}`;
				SuggestionButtons[TargetButtonIndex].setAttribute('keyword', keywordKeyIndex);
			}
			
			TargetButtonIndex += 1;
		}
	});
	
	if(TargetButtonIndex < SuggestionButtons.length){
		for (var i = TargetButtonIndex; i < SuggestionButtons.length; i++) {
			popup_suggestion_container.removeChild(SuggestionButtons[i]);
		}
	}
	
	if (search_string != ""){
		searching_DataInfo.isSuggestionOnSearched = true;
	}
	else{
		searching_DataInfo.isSuggestionOnSearched = false;
	}
}

// --- keyword area title buttons ---
function keywordPreviousMarkButtonClick(event){//v
	if (sidepanel_Info.keywordShow.indexKey === 'NoIndexNote'){
		return;
	}
	
	if (!current_PageInfo.isSearched){
		triggerAlertWindow(chrome.i18n.getMessage('sidepanel_unsearched_warning'), 'warning');
	}
	else if (current_PageInfo.keywordFound[sidepanel_Info.keywordShow.indexKey] === undefined){
		//needErrorMessage
	}
	else{	
		background_Info.connectPort.postMessage({event_name: 'keyword-previous-mark', targetKeyword: sidepanel_Info.keywordShow.indexKey});
	}
}
function keywordNextMarkButtonClick(event){//v
	if (sidepanel_Info.keywordShow.indexKey === 'NoIndexNote'){
		return;
	}
	
	if (!current_PageInfo.isSearched){
		triggerAlertWindow(chrome.i18n.getMessage('sidepanel_unsearched_warning'), 'warning');
	}
	else if (current_PageInfo.keywordFound[sidepanel_Info.keywordShow.indexKey] === undefined){
		//needErrorMessage
	}
	else{
		background_Info.connectPort.postMessage({event_name: 'keyword-next-mark', targetKeyword: sidepanel_Info.keywordShow.indexKey});
	}
}
function keywordNewNoteButtonClick(event){//v
	if (sidepanel_Info.keywordShow.isEditing) {
		triggerAlertWindow(chrome.i18n.getMessage('sidepanel_unsaved_warning'), 'warning');
		return;
	}
	if (!Boolean(sidepanel_Info.keywordShow.indexKey)){
		triggerAlertWindow(chrome.i18n.getMessage('sidepanel_unrecord_keyword_warning'), 'warning');
		return;
	}
	if (editing_DataInfo.isUsing){
		//needErrorMessage
		return;
	}
	sidepanel_Info.keywordShow.isEditing = true;
	
	const keyword_note_container = document.getElementById("keyword_note_container");
	const NoteBlocks = keyword_note_container.querySelectorAll(".windos_message_block");
	const NewNoteId = (sidepanel_Info.keywordShow.dataMode < 2) ? 0 : (NoteBlocks.length);
	
	const MessageBlock = createEditBlock(NewNoteId);
	keyword_note_container.insertBefore(MessageBlock, keyword_note_container.firstChild);
	keyword_note_container.scrollTop = 0;
}
function keywordDeleteButtonClick(event){//v
	if (sidepanel_Info.keywordShow.isEditing) {
		triggerAlertWindow(chrome.i18n.getMessage('sidepanel_unsaved_warning'), 'warning');
		return;
	}
	if (!Boolean(sidepanel_Info.keywordShow.indexKey)){
		triggerAlertWindow(chrome.i18n.getMessage('sidepanel_unrecord_keyword_warning'), 'warning');
		return;
	}

	const QuestData = {
		event_name: 'delete-keyword-noteindex',
		keywordKeyIndex: sidepanel_Info.keywordShow.indexKey,
		token: background_Info.identificationToken
	};
	
	chrome.runtime.sendMessage(QuestData, (returnData) => {
		if (returnData.isFinish){
			refreshKeywordShow(sidepanel_Info.keywordShow.indexKey);
			refreshKeywordSuggestionShow();
		}
	});
}

// --- more_options_popup buttons ---
function optionsEditButtonClick(event){//v
	const more_options_popup = event.target.closest('.levitate_options_popup');
	const TriggerType = more_options_popup.getAttribute('trigger_type');
	const TargetNoteId = parseInt(more_options_popup.getAttribute('note_id'));
	
	if (TriggerType === 'url'){
		if (sidepanel_Info.urlShow.isEditing) {
			triggerAlertWindow(chrome.i18n.getMessage('sidepanel_unsaved_warning'), 'warning');
			return;
		}
		if (!Boolean(sidepanel_Info.urlShow.indexKey)){
			triggerAlertWindow(chrome.i18n.getMessage('sidepanel_unrecord_keyword_warning'), 'warning');
			return;
		}
		if (editing_DataInfo.isUsing){
			//needErrorMessage
			return;
		}
		sidepanel_Info.urlShow.isEditing = true;
	
		const url_note_container = document.getElementById("url_note_container");
		const NoteBlocks = url_note_container.querySelectorAll(".windos_message_block");
		const TargetNoteIndex = sidepanel_Info.urlShow.displayOrder.indexOf(TargetNoteId);
		
		const NoteContent = NoteBlocks[TargetNoteIndex].querySelector(".windos_message_content").innerHTML;
		const NoteTimestamp = NoteBlocks[TargetNoteIndex].querySelector(".windos_message_timestamp").innerText;
		
		const EditBlock = createEditBlock(TargetNoteId, false, NoteContent);
		editing_DataInfo.beforeEditTimestamp = NoteTimestamp;
		
		NoteBlocks[TargetNoteIndex].replaceWith(EditBlock);
	}
	else if (TriggerType === 'keyword'){
		if (sidepanel_Info.keywordShow.isEditing) {
			triggerAlertWindow(chrome.i18n.getMessage('sidepanel_unsaved_warning'), 'warning');
			return;
		}
		if (!Boolean(sidepanel_Info.keywordShow.indexKey)){
			triggerAlertWindow(chrome.i18n.getMessage('sidepanel_unrecord_keyword_warning'), 'warning');
			return;
		}
		if (editing_DataInfo.isUsing){
			//needErrorMessage
			return;
		}
		sidepanel_Info.keywordShow.isEditing = true;
	
		const keyword_note_container = document.getElementById("keyword_note_container");
		const NoteBlocks = keyword_note_container.querySelectorAll(".windos_message_block");
		const TargetNoteIndex = sidepanel_Info.keywordShow.displayOrder.indexOf(TargetNoteId);
		
		const NoteContent = NoteBlocks[TargetNoteIndex].querySelector(".windos_message_content").innerHTML;
		const NoteTimestamp = NoteBlocks[TargetNoteIndex].querySelector(".windos_message_timestamp").innerText;
		
		const EditBlock = createEditBlock(TargetNoteId, false, NoteContent);
		editing_DataInfo.beforeEditTimestamp = NoteTimestamp;
		
		NoteBlocks[TargetNoteIndex].replaceWith(EditBlock);
	}						   
	else{
		return;
	}
	
	more_options_popup.style.left = '';
	more_options_popup.style.top = '';

	more_options_popup.classList.remove('popup_show');
}
function optionsCopyButtonClick(event){//v
	const more_options_popup = event.target.closest('.levitate_options_popup');
	const TriggerType = more_options_popup.getAttribute('trigger_type');
	const TargetNoteId = parseInt(more_options_popup.getAttribute('note_id'));
	
	if (TriggerType === 'url'){
		if (sidepanel_Info.urlShow.isEditing) {
			triggerAlertWindow(chrome.i18n.getMessage('sidepanel_unsaved_warning'), 'warning');
			return;
		}
		if (!Boolean(sidepanel_Info.urlShow.indexKey)){
			triggerAlertWindow(chrome.i18n.getMessage('sidepanel_unrecord_keyword_warning'), 'warning');
			return;
		}
		if (editing_DataInfo.isUsing){
			//needErrorMessage
			return;
		}
		sidepanel_Info.urlShow.isEditing = true;
	
		const url_note_container = document.getElementById("url_note_container");
		const NoteBlocks = url_note_container.querySelectorAll(".windos_message_block");
		const TargetNoteIndex = sidepanel_Info.urlShow.displayOrder.indexOf(TargetNoteId);
		const NewNoteId = (sidepanel_Info.urlShow.dataMode < 2) ? 0 : (NoteBlocks.length);
		
		const NoteContent = NoteBlocks[TargetNoteIndex].querySelector(".windos_message_content").innerHTML;
		
		const EditBlock = createEditBlock(NewNoteId, true, NoteContent);
		url_note_container.insertBefore(EditBlock, url_note_container.firstChild);
		url_note_container.scrollTop = 0;
	}
	else if (TriggerType === 'keyword'){
		if (sidepanel_Info.keywordShow.isEditing) {
			triggerAlertWindow(chrome.i18n.getMessage('sidepanel_unsaved_warning'), 'warning');
			return;
		}
		if (!Boolean(sidepanel_Info.keywordShow.indexKey)){
			triggerAlertWindow(chrome.i18n.getMessage('sidepanel_unrecord_keyword_warning'), 'warning');
			return;
		}
		if (editing_DataInfo.isUsing){
			//needErrorMessage
			return;
		}
		sidepanel_Info.keywordShow.isEditing = true;
	
		const keyword_note_container = document.getElementById("keyword_note_container");
		const NoteBlocks = keyword_note_container.querySelectorAll(".windos_message_block");
		const TargetNoteIndex = sidepanel_Info.keywordShow.displayOrder.indexOf(TargetNoteId);
		const NewNoteId = (sidepanel_Info.keywordShow.dataMode < 2) ? 0 : (NoteBlocks.length);
		
		const NoteContent = NoteBlocks[TargetNoteIndex].querySelector(".windos_message_content").innerHTML;
		
		const EditBlock = createEditBlock(NewNoteId, true, NoteContent);
		keyword_note_container.insertBefore(EditBlock, keyword_note_container.firstChild);
		keyword_note_container.scrollTop = 0;
	}						   
	else{
		return;
	}
	
	more_options_popup.style.left = '';
	more_options_popup.style.top = '';

	more_options_popup.classList.remove('popup_show');
}
function optionsDeleteButtonClick(event){//v
	const more_options_popup = event.target.closest('.levitate_options_popup');
	const TriggerType = more_options_popup.getAttribute('trigger_type');
	const TargetNoteId = parseInt(more_options_popup.getAttribute('note_id'));
	
	if (TriggerType === 'url'){
		if (sidepanel_Info.urlShow.isEditing) {
			triggerAlertWindow(chrome.i18n.getMessage('sidepanel_unsaved_warning'), 'warning');
			return;
		}
		else if (!Boolean(sidepanel_Info.urlShow.indexKey)){
			triggerAlertWindow(chrome.i18n.getMessage('sidepanel_unrecord_keyword_warning'), 'warning');
			return;
		}
		else{
			const QuestData = {
				event_name: 'delete-url-note',
				urlKeyIndex: sidepanel_Info.urlShow.indexKey,
				noteIndex: TargetNoteId,
				token: background_Info.identificationToken
			};
			
			chrome.runtime.sendMessage(QuestData, (returnData) => {
				if (returnData.isFinish){
					refreshUrlShow(sidepanel_Info.urlShow.indexKey);
				}
			});
		}
	}
	else if (TriggerType === 'keyword'){
		if (sidepanel_Info.keywordShow.isEditing) {
			triggerAlertWindow(chrome.i18n.getMessage('sidepanel_unsaved_warning'), 'warning');
			return;
		}
		else if (!Boolean(sidepanel_Info.keywordShow.indexKey)){
			triggerAlertWindow(chrome.i18n.getMessage('sidepanel_unrecord_keyword_warning'), 'warning');
			return;
		}
		else{
			const QuestData = {
				event_name: 'delete-keyword-note',
				keywordKeyIndex: sidepanel_Info.keywordShow.indexKey,
				noteIndex: TargetNoteId,
				token: background_Info.identificationToken
			};
			
			chrome.runtime.sendMessage(QuestData, (returnData) => {
				if (returnData.isFinish){
					refreshKeywordShow(sidepanel_Info.keywordShow.indexKey);
				}
			});
		}
	}
	
	more_options_popup.style.left = '';
	more_options_popup.style.top = '';

	more_options_popup.classList.remove('popup_show');
}

// --- edit_options_popup buttons ---
function editorSaveButtonClick(event){//v
	const edit_options_popup = event.target.closest('.levitate_options_popup');
	const TriggerType = edit_options_popup.getAttribute('trigger_type');
	const NoteId = parseInt(edit_options_popup.getAttribute('note_id'));
	
	if (TriggerType === 'url'){
		const NoteContent = editing_DataInfo.editEngine.getData();
		const UrlIndexKey = sidepanel_Info.keywordShow.indexKey;
		
		if (editing_DataInfo.isNew){
			const QuestData = {
				event_name: 'new-url-notedata',
				urlKeyIndex: UrlIndexKey,
				noteContent: NoteContent,
				token: background_Info.identificationToken
			};
			chrome.runtime.sendMessage(QuestData, (returnData) => {
				if (returnData.isFinish){
					clearEditEngine();
					refreshUrlShow(UrlIndexKey, true);
				}
			});
		}
		else{
			const QuestData = {
				event_name: 'update-url-notedata',
				urlKeyIndex: UrlIndexKey,
				noteContent: NoteContent,
				noteId: NoteId,
				token: background_Info.identificationToken
			};
			
			chrome.runtime.sendMessage(QuestData, (returnData) => {
				if (returnData.isFinish){
					clearEditEngine();
					refreshUrlShow(UrlIndexKey, true);
				}
			});
		}
	}
	else if (TriggerType === 'keyword'){
		const NoteContent = editing_DataInfo.editEngine.getData();
		const KeywordKeyIndex = sidepanel_Info.keywordShow.indexKey;
		
		if (editing_DataInfo.isNew){
			const QuestData = {
				event_name: 'new-keyword-notedata',
				keywordKeyIndex: KeywordKeyIndex,
				noteContent: NoteContent,
				token: background_Info.identificationToken
			};
			chrome.runtime.sendMessage(QuestData, (returnData) => {
				if (returnData.isFinish){
					clearEditEngine();
					refreshKeywordShow(KeywordKeyIndex, true);
				}
			});
		}
		else{
			const QuestData = {
				event_name: 'update-keyword-notedata',
				keywordKeyIndex: KeywordKeyIndex,
				noteContent: NoteContent,
				noteId: NoteId,
				token: background_Info.identificationToken
			};
			
			chrome.runtime.sendMessage(QuestData, (returnData) => {
				if (returnData.isFinish){
					clearEditEngine();
					refreshKeywordShow(KeywordKeyIndex, true);
				}
			});
		}
	}
	
	edit_options_popup.style.left = '';
	edit_options_popup.style.top = '';

	edit_options_popup.classList.remove('popup_show');
}
function editorExitButtonClick(event){//v
	const edit_options_popup = event.target.closest('.levitate_options_popup');
	const NoteId = parseInt(edit_options_popup.getAttribute('note_id'));
	
	if (!editing_DataInfo.isNew){
		const MessageBlock = createNoteBlock(editing_DataInfo.beforeEditData, editing_DataInfo.beforeEditTimestamp, NoteId);
		editing_DataInfo.editBlock.replaceWith(MessageBlock);
	}
	
	clearEditEngine(editing_DataInfo.isNew);
	
	edit_options_popup.style.left = '';
	edit_options_popup.style.top = '';

	edit_options_popup.classList.remove('popup_show');
}

// ====== 資料接收 ====== 
/*
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse){ //短期連接通訊
	console.log(request.event_name);
	return true;
});
*/

async function createPortToBackground(ms, isStart = false){//建立與背景的長期連接通訊
	background_Info.connectPort = chrome.runtime.connect({name: 'Sidepanel'});
	
	background_Info.connectPort.onMessage.addListener(onMessageFromBackground);
	background_Info.connectPort.onDisconnect.addListener(async () => {
		background_Info.connectPort = null;
		background_Info.isConnect = false;
		
		await timeout(ms);
		createPortToBackground(ms);
	});
	
	if (isStart){
		background_Info.connectPort.postMessage({event_name: 'refresh-tab-status'});
		runInitial();
	}
}
function onMessageFromBackground(msg){//長期連接通訊
	background_Info.isConnect = true;
	
	switch (msg.event_name) {
		case 'update-sidepanel-status':
			refreshSidepanelStatus(msg);
			
			break;
			
		case 'show-selected-keyword':
			refreshKeywordShow(msg.keywordSelected);
			
			break;
	}
	
	console.log(msg.event_name);
}

// ====== 初始化 ====== 
function runInitial(){
	document.querySelectorAll('[data-i18n]').forEach((i18n_element) => {
		const i18n_content = chrome.i18n.getMessage(i18n_element.dataset.i18n);
		const insert_attribute = i18n_element.dataset.i18n.split('__')[1];
		
		if (Boolean(insert_attribute)){
			i18n_element.setAttribute(insert_attribute, i18n_content);
		}
		else{
			i18n_element.innerText = i18n_content;
		}
	});
	
	const title_area = document.getElementById("title_area");
	//title_area.querySelector('.title_boder').addEventListener("dblclick", switch_host_urlindex);
	title_area.querySelector('.control_url_area button.new_note').addEventListener('click', urlNewNoteButtonClick, false);
	//title_area.querySelector('.control_url_area button.delete_url').addEventListener('click', urlDeleteButtonClick, false);
	title_area.querySelector('.control_url_area button.more_options').addEventListener('click', titleMoreOptionsButtonClick);
	
	const suggestion_area = document.getElementById("suggestion_area");
	suggestion_area.querySelector("button#more_suggestion").addEventListener("click", moreSuggestionButtonClick);
	//suggestion_area.querySelector("button#pure_notes").addEventListener("click", noindexnote_button_click);
	const suggestion_container = suggestion_area.querySelector(".suggestion_container");
	suggestion_container.onwheel = function (event){ 
		event.preventDefault();  

		var step = 50;  
		if(event.deltaY < 0){  
			this.scrollLeft += step;  
		} else {  
			this.scrollLeft -= step;  
		}  
	};
	
	const keyword_area = document.getElementById("keyword_area");
	keyword_area.querySelector('.control_keyword_area button.previous_mark').addEventListener('click', keywordPreviousMarkButtonClick, false);
	keyword_area.querySelector('.control_keyword_area button.next_mark').addEventListener('click', keywordNextMarkButtonClick, false);
	keyword_area.querySelector('.control_keyword_area button.new_note').addEventListener('click', keywordNewNoteButtonClick, false);
	keyword_area.querySelector('.control_keyword_area button.delete_keyword').addEventListener('click', keywordDeleteButtonClick, false);
	
	const more_options_popup = document.getElementById("more_options_popup");
	const edit_options_popup = document.getElementById("edit_options_popup");
	const all_suggestion_popup = document.getElementById("all_suggestion_popup");
	const title_control_popup = document.getElementById("title_control_popup");
	
	more_options_popup.addEventListener("mouseleave", levitate_popup_mouseleave_event);
	more_options_popup.querySelector("button.edit_note").addEventListener("click", optionsEditButtonClick);
	more_options_popup.querySelector("button.copy_note").addEventListener("click", optionsCopyButtonClick);
	more_options_popup.querySelector("button.delete_note").addEventListener("click", optionsDeleteButtonClick);

	edit_options_popup.addEventListener("mouseleave", levitate_popup_mouseleave_event);
	edit_options_popup.querySelector("button.save_note").addEventListener("click", editorSaveButtonClick);
	edit_options_popup.querySelector("button.exit_note").addEventListener("click", editorExitButtonClick);
	
	all_suggestion_popup.addEventListener("mouseleave", composition_levitate_popup_mouseleave_event);
	all_suggestion_popup.querySelector("input").addEventListener("compositionstart", () => {searching_DataInfo.isComposition = true;});
	all_suggestion_popup.querySelector("input").addEventListener("compositionend", (event) => {searching_DataInfo.isComposition = false;keywordSearchAlgorithmProcess(event);});
	all_suggestion_popup.querySelector("input").addEventListener("input", keywordSearchAlgorithmProcess);
	
	title_control_popup.addEventListener("mouseleave", levitate_popup_mouseleave_event);
	title_control_popup.querySelector("button.delete_url").addEventListener("click", urlDeleteButtonClick);
	title_control_popup.querySelector("button.reload_url").addEventListener("click", urlReloadButtonClick);
	title_control_popup.querySelector("button.summary_url").addEventListener("click", url_summary_button_click);
	
	function levitate_popup_mouseleave_event(event){
		this.style.left = '';
		this.style.top = '';
	
		this.classList.remove('popup_show');
	}
	function composition_levitate_popup_mouseleave_event(event){
		if (!searching_DataInfo.isComposition){
			this.style.left = '';
			this.style.top = '';
		
			this.classList.remove('popup_show');
		}
	}

	const drag_block = document.querySelectorAll('div.drag_block');
	drag_block.forEach((drager_element) => {
	  drager_element.addEventListener('mousedown', drag_mousedown);
	});
	document.body.addEventListener('mousemove', drag_mousemove);
	document.body.addEventListener('mouseup', drag_mouseup);
	
	function drag_mousedown(e){
		sidepanel_Info.isDraggingEdge = true;
		sidepanel_Info.draggingOffsetY = e.clientY;
		
		const title_area = document.getElementById("title_area");
		const keyword_area = document.getElementById("keyword_area");

		sidepanel_Info.titleOffsetHeight = title_area.offsetHeight;
		sidepanel_Info.keywordOffsetHeight =  keyword_area.offsetHeight;
		document.body.style.userSelect = "none";
	}
	function drag_mousemove(e){
		if (sidepanel_Info.isDraggingEdge) {
			const offset = e.clientY - sidepanel_Info.draggingOffsetY;
			
			const title_area = document.getElementById("title_area");
			const keyword_area = document.getElementById("keyword_area");
			
			const maxheight = (sidepanel_Info.titleOffsetHeight + sidepanel_Info.keywordOffsetHeight - 150);
			
			title_area.style.height = Math.max(150, Math.min(sidepanel_Info.titleOffsetHeight + offset, maxheight)) + 'px';
			keyword_area.style.height = Math.max(150, Math.min(sidepanel_Info.keywordOffsetHeight - offset, maxheight)) + 'px';
		}
	}
	function drag_mouseup(e){
		if (sidepanel_Info.isDraggingEdge) {
			sidepanel_Info.isDraggingEdge = false;
			const bodyHeight = document.body.offsetHeight;
			const offset = e.clientY - sidepanel_Info.draggingOffsetY;
			
			const title_area = document.getElementById("title_area");
			const keyword_area = document.getElementById("keyword_area");
			
			const maxheight = (document.body.offsetHeight - 231);

			const title_area_precent = (Math.max(150, Math.min(sidepanel_Info.titleOffsetHeight + offset, maxheight)) / bodyHeight * 100);
			title_area.style.height = (title_area_precent) + '%';
			keyword_area.style.height = 'calc(' + (100 - title_area_precent) + '% - 59px)';
			document.body.style.userSelect = "auto";
		}
	}
	
	// ====== 請求設定資料 ====== 
}

createPortToBackground(5000, true);
