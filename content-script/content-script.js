const EXCLUDE_SEARCH_NODE = ['KEYWORDNOTE', 'TEXTAREA'];

var keyword_KeyIndex = [];
var self_PageInfo = {
	isSearched: false,
	keywordNodeFound: [],// [[node, is_showed, keywords_in_node], ...]
	keywordFound: {},// {keyword: count_in_page, ...}
	isMarkhide: false,
	isOnlyShowOne: null,
	focusON: -1
}
var self_PagePopupInfo = {
	status: 'close',
	targetNode: null,
	currentKeywords: [],
	currentShowIndex: 0,
	isMutipleMark: false,
	isContentExpand: false
};

var settings = {
	isDarkMode: true
}

// ====== 資料處理 ====== 
async function responseSelfPageStatus(){
	return {
		isSearched: self_PageInfo.isSearched,
		keywordFound: self_PageInfo.keywordFound,
		isMarkhide: self_PageInfo.isMarkhide,
		keywordFound: self_PageInfo.keywordFound
	}
}

async function triggerAlertWindow(message, type){
	const Notification = {
		event_name: 'send-notification-message',
		message: message,
		notification_type: type
	};
	
	await chrome.runtime.sendMessage(Notification);
}

async function refreshPopupKeyword(trgetKeyword){
	const keywordnote_popup = document.querySelector('keywordnote div.keywordnote_popup');
	
	const PopupTitle = keywordnote_popup.querySelector('span#keyword_title');
	const PopupContent = keywordnote_popup.querySelector('div.note_content');
	const PopupTimeStamp = keywordnote_popup.querySelector('div.windos_message_timestamp');
	
	PopupTitle.innerText = trgetKeyword;
	PopupContent.innerText = 'Waiting for database response...';
	
	const QuestData = {
		event_name: 'quest-keyword-notedata-preview',
		keywordKeyIndex: trgetKeyword,
	};
	
	await chrome.runtime.sendMessage(QuestData, function (returnData){
		if (returnData.isFinish){
			if (returnData.isExist){
				if (!returnData.noteForPreview.isEmpty){
					PopupContent.innerText = returnData.noteForPreview.note[0];
					PopupTimeStamp.innerText = returnData.noteForPreview.note[1];
				}
				else{
					PopupContent.innerText = "該關鍵字未被記錄筆記，無法顯示預覽筆記";//needI18N
				PopupTimeStamp.innerText = "null";//needI18N
				}
			}
			else{
				PopupContent.innerText = "該關鍵字未被記錄，無法顯示預覽筆記";//needI18N
				PopupTimeStamp.innerText = "null";//needI18N
			}
		}
		else{
			PopupContent.innerText = "讀取筆記出現錯誤，無法顯示預覽筆記"//needI18N
			PopupTimeStamp.innerText = "null";//needI18N
		}
	});
}

function getPreviouskeywordNode(startIndex, targetKeyword = undefined){
	const KeywordNodeLength = self_PageInfo.keywordNodeFound.length;
	let TargetMarkIndex = self_PageInfo.focusON < startIndex ? startIndex : (TargetMarkIndex - 1 + KeywordNodeLength) % KeywordNodeLength;
	let isFound = false;
	
	for (;TargetMarkIndex == startIndex; (TargetMarkIndex - 1 + KeywordNodeLength) % KeywordNodeLength){
		const [node, is_showed, keywords_in_node] = self_PageInfo.keywordNodeFound[TargetMarkIndex];
		
		if (!is_showed){
			continue;
		}
		else if (!keywords_in_node.includes(targetKeyword)){
			continue;
		}
		else{
			return [true, self_PageInfo.keywordNodeFound[TargetMarkIndex]];
		}
	}
	
	return [false, null];
}
function getNextkeywordNode(startIndex, targetKeyword = undefined){
	const KeywordNodeLength = self_PageInfo.keywordNodeFound.length;
	let TargetMarkIndex = self_PageInfo.focusON < startIndex ? startIndex : (TargetMarkIndex + 1 + KeywordNodeLength) % KeywordNodeLength;
	let isFound = false;
	
	for (;TargetMarkIndex == startIndex; (TargetMarkIndex + 1 + KeywordNodeLength) % KeywordNodeLength){
		const [node, is_showed, keywords_in_node] = self_PageInfo.keywordNodeFound[TargetMarkIndex];
		
		if (!is_showed){
			continue;
		}
		else if (!keywords_in_node.includes(targetKeyword)){
			continue;
		}
		else{
			return [true, self_PageInfo.keywordNodeFound[TargetMarkIndex]];
		}
	}
	
	return [false, null];
}

function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ====== 頁面搜尋 ======
function insertPopupHtml(){
	var KeywordContainer = document.createElement('keywordnote');
	
	KeywordContainer.innerHTML = `<div class="keywordnote_popup">
									<div class="popup_header">
									  <div class="title_boder">
											<span id="keyword_title">某個關鍵字</span>
											<div class="right_fade"></div>
									  </div>
									  <div class="keyword_button_container">
											<button id="keyword_note_sidepanel_show">
												<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 48 48">
												<path fill="currentColor" d="M40 12a6.25 6.25 0 00-6-6h-24a6.25 6.25 0 00-5 6v22a6.25 6.25 0 005 5h24a6.25 6.25 0 006-5.25zm-30 24a3.75 3.75 0 01-2-2v-22a3.75 3.75 0 012-3h15v27z" />
												</svg>
											</button>
											<button id="keyword_note_highlight">
												<i class="svg_icon">
												<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24">
													<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2">
													<path d="m9 11l-6 6v3h9l3-3" />
													<path d="m22 12l-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4" />
													</g>
												</svg>
												</i>
											</button>
									  </div> 
									</div>
									<div class="pin_note_container">
									  <div class="note_block">
											<div class="note_content">
												This page is still in its initial state...
											</div>
											<div class="bottom_fade"></div>
									  </div>
									  <div class="windos_timestamp_container">
											<div class="windos_message_timestamp">
												Waiting for popup start up...
											</div>
									  </div>
									</div>
								</div>`;
	KeywordContainer.querySelector("button#keyword_note_sidepanel_show").title = chrome.i18n.getMessage('keyword_note_sidepanel_show__title');
	KeywordContainer.querySelector("button#keyword_note_highlight").title = chrome.i18n.getMessage('keyword_note_highlight__title');
	
	if (settings.isDarkMode){
		KeywordContainer.classList.add('dark');
	}
	document.body.appendChild(KeywordContainer);
	
	const keywordnote_popup = KeywordContainer.querySelector('div.keywordnote_popup');
	
	keywordnote_popup.addEventListener("mouseover", popupMouseoverEvent);
	keywordnote_popup.addEventListener("mouseout", popupMouseoutEvent);
	keywordnote_popup.onwheel = function (event){ 
		event.preventDefault();  
	};
	
	KeywordContainer.querySelector('button#keyword_note_sidepanel_show').addEventListener("click", popupSidepanelShow);
	KeywordContainer.querySelector('button#keyword_note_highlight').addEventListener("click", popupKeywordHighlight);
	
	KeywordContainer.querySelector('div.note_content').onwheel = function (event){ 
		event.preventDefault();  

		const Step = 15;  
		const LastScrollTop = this.scrollTop;
		if(event.deltaY < 0){  
			this.scrollTop -= Step;  
		} else {  
			this.scrollTop += Step;  
		}

		if (LastScrollTop == this.scrollTop && LastScrollTop > 0){
			this.parentElement.querySelector('div.bottom_fade').classList.add('hide');
		}
		else{
			this.parentElement.querySelector('div.bottom_fade').classList.remove('hide');
		}
	};
	KeywordContainer.querySelector('div.pin_note_container').addEventListener("click", clickNoteContent);
	
	const keyword_title = KeywordContainer.querySelector("span#keyword_title");
	keyword_title.onwheel = function (event){ 
		if(is_MutipleMark){ 
			event.preventDefault();  
			
			if(event.deltaY < 0){  
				popupSwitchPreviouskeyword();  
			} else {  
				popupSwitchNextkeyword();  
			}  
		}
	};
}

function makeKeywordSingleNode(innerText, keywordsInNode){
	const NewKeywordNode = document.createElement('kw');
	NewKeywordNode.innerText = innerText;
	NewKeywordNode.classList.add("highlight-keyword");
	NewKeywordNode.setAttribute('keywords', keywordsInNode);

	return NewKeywordNode;
}
function makeKeywordMutipleNode(innerText, keywordsInNode){
	const NewKeywordNode = document.createElement('kw');
	NewKeywordNode.innerText = innerText;
	NewKeywordNode.classList.add("highlight-keyword");
	NewKeywordNode.classList.add("highlight-keyword-mutiple");
	NewKeywordNode.setAttribute('keywords', keywordsInNode);

	return NewKeywordNode;
}
	
async function searchKeywords(){
	let returnData = {
		"isFinish": false,
		"found": 0
	};
	
	let keywords_searched_count = {};
	
	const WindowHeight = document.height || document.body.offsetHeight;
	const WindowWidth = document.width || document.body.offsetWidth;
	
	const WindowScrollX = window.scrollX;
	const WindowScrollY = window.scrollY;
	
	keyword_KeyIndex.forEach(function (Keyword) {
		keywords_searched_count[Keyword] = 0;
	});
	
	function isKeywordSpan(node){
		try{
			return node.classList.contains('highlight-keyword');
		}catch{
			return false
		}
	}		
	function isHidden(el) {
		try{
			if (el.offsetHeight == 0 || el.offsetWidth == 0){
				return true
			}
			return !el.checkVisibility()
		}catch{
			return (el.offsetParent === null)
		}
	}
	function isHiddenHardCheck(el) {
		rect = el.getBoundingClientRect();
		
		if (rect.bottom + WindowScrollY < 0 || rect.right + WindowScrollX < 0){
			return true
		}
		else if (rect.top > WindowHeight || rect.left > WindowWidth){
			return true
		}
		else{
			//topElt = document.elementFromPoint(x,y);
			
			//return el.isSameNode(topElt)
			return false
		}
	}
	
	function mergeOverlappingRanges(keywordsInNode){
		keywordsInNode.sort((a, b) => a.start - b.start);
		
		const Merged = [];
		let currentRange = keywordsInNode[0];
		for (let index = 1; index < keywordsInNode.length; index++) {
			const NextRange = keywordsInNode[index];
			if (NextRange.start <= currentRange.end) {
				currentRange.end = Math.max(currentRange.end, NextRange.end);
				currentRange.keywords.push(NextRange.keywords[0]);
			}
			else {
				Merged.push(currentRange);
				currentRange = NextRange;
			}
		}
		
		Merged.push(currentRange);
		return Merged;
	}
	function stringSegmentationProcessing(nodeText, mergedRanges){
		let startingPointer = 0;
		let nodeList = [];
		let keywordNodeList = [];
		
		for (const KeywordRange of mergedRanges) {
			if (KeywordRange.start > startingPointer){
				const NewTextnodeText = nodeText.substr(startingPointer, (KeywordRange.start - startingPointer));
				const NewTextnode = document.createTextNode(NewTextnodeText);
				
				nodeList.push(NewTextnode);
			}
			
			const NewKeywordNodeText = nodeText.substr(KeywordRange.start, (KeywordRange.end - KeywordRange.start));
			
			if(KeywordRange.keywords.length > 1){
				const NewKeywordNode = makeKeywordMutipleNode(NewKeywordNodeText, KeywordRange.keywords);
				
				nodeList.push(NewKeywordNode);
				keywordNodeList.push([NewKeywordNode, true, KeywordRange.keywords]);
			}
			else{
				const NewKeywordNode = makeKeywordSingleNode(NewKeywordNodeText, KeywordRange.keywords);
				
				nodeList.push(NewKeywordNode);
				keywordNodeList.push([NewKeywordNode, true, KeywordRange.keywords]);
			}
			
			startingPointer = KeywordRange.end;
		}
		
		if (nodeText.length !== startingPointer){
			const NewTextnodeText = nodeText.substr(startingPointer, (nodeText.length - startingPointer));
			const NewTextnode = document.createTextNode(NewTextnodeText);
			
			nodeList.push(NewTextnode);
		}
		
		return [nodeList, keywordNodeList];
	}
	
	function searchRecursion(node){
		if (node.nodeType === Node.TEXT_NODE){
			const NodeText = node.textContent;
			let keywordsInNode = []
			
			if (isHiddenHardCheck(node.parentNode)){
				return;
			}
			
			for (const Keyword of keyword_KeyIndex) {
				let startIndex = 0, keywordIndex;
				
				while ((keywordIndex = NodeText.indexOf(Keyword, startIndex)) > -1){
					keywordsInNode.push({start: keywordIndex, end: (keywordIndex + Keyword.length), keywords: [Keyword]});
					startIndex = (keywordIndex + Keyword.length);
				}
				
				if (startIndex !== 0) {
					keywords_searched_count[Keyword] += 1;
				}
			}

			if (keywordsInNode.length <= 0){
				return;
			}

			const MergedRanges = mergeOverlappingRanges(keywordsInNode);
			
			const [NodeList, NewKeywordNodeList] = stringSegmentationProcessing(NodeText, MergedRanges);
			
			for (const ReplaceNode of NodeList) {
				node.parentNode.insertBefore(ReplaceNode, node);
			}
			
			for (const KeywordNodeInfo of NewKeywordNodeList) {
				settingKeywordnodesEventListener(KeywordNodeInfo[0]);
			}
			
			node.remove();
			self_PageInfo.keywordNodeFound = self_PageInfo.keywordNodeFound.concat(NewKeywordNodeList);
		}
		else if(EXCLUDE_SEARCH_NODE.includes(node.nodeName)){
			return
		}
		else if (isKeywordSpan(node)){
			return
		}
		else if(isHidden(node)){
			return
		}
		else if (node.nodeType === Node.ELEMENT_NODE) {
			for (var i = 0; i < node.childNodes.length; i++) {
				searchRecursion(node.childNodes[i]);
			}
		}
	}
	
	// main code
	try {
		self_PageInfo.keywordNodeFound = [];
		self_PageInfo.keywordFound = {};
		const body = document.body;

		for (let i = 0; i < body.childNodes.length; i++) {
			searchRecursion(body.childNodes[i]);
		}
		
		if (self_PageInfo.keywordNodeFound.length > 0){
			triggerAlertWindow(chrome.i18n.getMessage('content_script_found').replace('@', `${self_PageInfo.keywordNodeFound.length}`), 'ok');
			
			if (!self_PageInfo.isSearched){
				insertPopupHtml();
			}
			
			self_PageInfo.isSearched = true;
			self_PageInfo.isMarkhide = false;
			
			for (const Keyword of keyword_KeyIndex) {
				if (keywords_searched_count[Keyword] === 0){
					delete keywords_searched_count[Keyword];
				}
				else{
					returnData.found += 1;
				}
			}
			self_PageInfo.keywordFound = keywords_searched_count;
			self_PageInfo.focusON = -1;
		}
		else{
			triggerAlertWindow(chrome.i18n.getMessage('content_script_notfound'), 'nofound');
			
			self_PageInfo.isSearched = false;
			self_PageInfo.isMarkhide = false;
		}
		
		returnData.isFinish = true;
		return returnData;
	} catch (e){
		
		returnData.isFinish = false;
		return returnData;
	}
}
function settingKeywordnodesEventListener(node) {
	node.addEventListener("mouseover", keywordMouseoverEvent);
	node.addEventListener("mouseout", keywordMouseoutEvent);
}

async function showAllKeywordMark(){
	let returnData = {
		"isFinish": false
	};
	
	self_PageInfo.isMarkhide = false;
	
	for (let searchedIndex = 0; searchedIndex < self_PageInfo.keywordNodeFound.length; searchedIndex++) {
		const [Node, IsShowed, KeywordsInNode] = self_PageInfo.keywordNodeFound[searchedIndex];
		
		if(!IsShowed){
			const KeywordNodeText = Node.textContent;
			
			if(KeywordsInNode.length > 1){
				const NewKeywordNode = makeKeywordMutipleNode(KeywordNodeText, KeywordsInNode);
				
				self_PageInfo.keywordNodeFound[searchedIndex][0].replaceWith(NewKeywordNode);

				self_PageInfo.keywordNodeFound[searchedIndex][0] = NewKeywordNode;
				self_PageInfo.keywordNodeFound[searchedIndex][1] = true;
				
				settingKeywordnodesEventListener(NewKeywordNode);
			}
			else{
				const NewKeywordNode = makeKeywordSingleNode(KeywordNodeText, KeywordsInNode);
				
				self_PageInfo.keywordNodeFound[searchedIndex][0].replaceWith(NewKeywordNode);

				self_PageInfo.keywordNodeFound[searchedIndex][0] = NewKeywordNode;
				self_PageInfo.keywordNodeFound[searchedIndex][1] = true;
				
				settingKeywordnodesEventListener(NewKeywordNode);
			}
		}
	}
	
	self_PageInfo.isOnlyShowOne = null;
	returnData.isFinish = true;
	
	return returnData;
}
async function hideAllKeywordMark(){
	let returnData = {
		"isFinish": false
	};
	
	self_PageInfo.isMarkhide = true;
	
	for (let searchedIndex = 0; searchedIndex < self_PageInfo.keywordNodeFound.length; searchedIndex++) {
		const [Node, IsShowed, KeywordsInNode] = self_PageInfo.keywordNodeFound[searchedIndex];
		
		if(IsShowed){
			const KeywordNodeText = Node.innerText;
				
			const new_textnode = document.createTextNode(KeywordNodeText);
			
			self_PageInfo.keywordNodeFound[searchedIndex][0].replaceWith(new_textnode);
			self_PageInfo.keywordNodeFound[searchedIndex][0] = new_textnode;
			self_PageInfo.keywordNodeFound[searchedIndex][1] = false;
		}
	}
	
	self_PageInfo.isOnlyShowOne = null;
	returnData.isFinish = true;
	
	return returnData;
}

function popupSwitchPreviouskeyword(){
	const PreviousIndex = (self_PagePopupInfo.currentShowIndex - 1 + self_PagePopupInfo.currentKeywords.length) % self_PagePopupInfo.currentKeywords.length;
	const PreviousKeyword = self_PagePopupInfo.currentKeywords[PreviousIndex];
	
	refreshPopupKeyword(PreviousKeyword);
}
function popupSwitchNextkeyword(){
	const NextIndex = (self_PagePopupInfo.currentShowIndex + 1 + self_PagePopupInfo.currentKeywords.length) % self_PagePopupInfo.currentKeywords.length;
	const NextKeyword = self_PagePopupInfo.currentKeywords[NextIndex];
	
	refreshPopupKeyword(NextKeyword);
}

function onlyShowOneKeywordMark(targetKeyword){
	function mutipleKeywordNodeProcess(keywordNode){
		const keywordNodeContent = keywordNode.innerText
		const targetKeywordIndex = keywordNode.innerText.indexOf(targetKeyword);
		
		keywordNode.removeChild(keywordNode.lastChild)
		
		keywordNode.appendChild(document.createTextNode(keywordNodeContent.substr(0, targetKeywordIndex)));
		keywordNode.appendChild(makeKeywordSingleNode(keywordNodeContent.substr(targetKeywordIndex, targetKeyword.length), [targetKeyword]));
		keywordNode.appendChild(document.createTextNode(keywordNodeContent.substr((targetKeywordIndex + targetKeyword.length), keywordNodeContent.length)));
		
		return keywordNode;
	}
		
	if (!Boolean(self_PageInfo.isOnlyShowOne)){
		for (let searchedIndex = 0; searchedIndex < self_PageInfo.keywordNodeFound.length; searchedIndex++) {
			const [Node, IsShowed, KeywordsInNode] = self_PageInfo.keywordNodeFound[searchedIndex];
			
			if(KeywordsInNode.indexOf(targetKeyword) > -1){
				if (KeywordsInNode.length > 1){
					if(!IsShowed){
						const NewKeywordNodeUnprocessed = makeKeywordMutiplenode(Node.innerText, keywords_in_node);
						
						const NewKeywordnode = mutipleKeywordNodeProcess(NewKeywordNodeUnprocessed);
						self_PageInfo.keywordNodeFound[searchedIndex][0].replaceWith(new_keywordnode);
						
						self_PageInfo.keywordNodeFound[searchedIndex][0] = new_keywordnode;
						self_PageInfo.keywordNodeFound[searchedIndex][1] = true;
						
						settingKeywordnodesEventListener(new_keywordnode);
					}
					else{
						const new_keywordnode = mutipleKeywordNodeProcess(Node);
					}
				}
				else{
					if(IsShowed){
						continue;
					}
					
					const new_keywordnode = makeKeywordSingleNode(Node.innerText, keywords_in_node);
					self_PageInfo.keywordNodeFound[searchedIndex][0].replaceWith(new_keywordnode);

					self_PageInfo.keywordNodeFound[searchedIndex][0] = new_keywordnode;
					self_PageInfo.keywordNodeFound[searchedIndex][1] = true;
					
					settingKeywordnodesEventListener(new_keywordnode);
				}
			}
			else{
				if(IsShowed){
					const keywordnode_text = Node.textContent;
					
					const new_textnode = document.createTextNode(keywordnode_text);
					
					self_PageInfo.keywordNodeFound[searchedIndex][0].replaceWith(new_textnode);

					self_PageInfo.keywordNodeFound[searchedIndex][0] = new_textnode;
					self_PageInfo.keywordNodeFound[searchedIndex][1] = false;
				}
			}
		}
		
		self_PageInfo.isOnlyShowOne = targetKeyword;
	}
}

async function scrollToPreviousMark(targetKeyword = undefined){
	if (!self_PageInfo.isSearched){
		triggerAlertWindow(chrome.i18n.getMessage('content_script_needsearch_warning'), 'warning');
	}
	else if (self_PageInfo.isMarkhide){
		return;
	}
	
	const KeywordNodeLength = self_PageInfo.keywordNodeFound.length;
	const startIndex = self_PageInfo.focusON < 0 ? 0 : (self_PageInfo.focusON - 1 + KeywordNodeLength) % KeywordNodeLength;
	let NodeFound = null;
	let IndexFound = startIndex;
	
	for (let i = 0; i < KeywordNodeLength; i++){
		const TargetMarkIndex = (startIndex + i + KeywordNodeLength) % KeywordNodeLength;
		const [node, is_showed, keywords_in_node] = self_PageInfo.keywordNodeFound[TargetMarkIndex];
		
		if (!is_showed){
			continue;
		}
		else if (!(!keywords_in_node.includes(targetKeyword) && Boolean(targetKeyword))){
			NodeFound = node;
			IndexFound = TargetMarkIndex;
			break;
		}
		else{
			continue;
		}
	}
	
	if (NodeFound != null && IndexFound != self_PageInfo.focusON){
		NodeFound.scrollIntoView({ block: "center" });
		
		if (self_PageInfo.focusON >= 0){
			const [node, is_showed, keywords_in_node] = self_PageInfo.keywordNodeFound[self_PageInfo.focusON];
			node.classList.remove('highlight-viewed');
		}
		
		NodeFound.classList.add('highlight-viewed');
		
		self_PageInfo.focusON = IndexFound;
	}
}
async function scrollToNextMark(targetKeyword = undefined){
	if (!self_PageInfo.isSearched){
		triggerAlertWindow(chrome.i18n.getMessage('content_script_needsearch_warning'), 'warning');
	}
	else if (self_PageInfo.isMarkhide){
		return;
	}
	
	const KeywordNodeLength = self_PageInfo.keywordNodeFound.length;
	const startIndex = self_PageInfo.focusON < 0 ? 0 : (self_PageInfo.focusON + 1 + KeywordNodeLength) % KeywordNodeLength;
	let NodeFound = null;
	let IndexFound = startIndex;
	
	for (let i = 0; i < KeywordNodeLength; i++){
		const TargetMarkIndex = (startIndex - i + KeywordNodeLength) % KeywordNodeLength;
		const [node, is_showed, keywords_in_node] = self_PageInfo.keywordNodeFound[TargetMarkIndex];
		
		if (!is_showed){
			continue;
		}
		else if (!(!keywords_in_node.includes(targetKeyword) && Boolean(targetKeyword))){
			NodeFound = node;
			IndexFound = TargetMarkIndex;
			break;
		}
		else{
			continue;
		}
	}
	
	if (NodeFound != null && IndexFound != self_PageInfo.focusON){
		NodeFound.scrollIntoView({ block: "center" });
		
		if (self_PageInfo.focusON >= 0){
			const [node, is_showed, keywords_in_node] = self_PageInfo.keywordNodeFound[self_PageInfo.focusON];
			node.classList.remove('highlight-viewed');
		}
		
		NodeFound.classList.add('highlight-viewed');
		
		self_PageInfo.focusON = IndexFound;
	}
}
// ====== 元素操作 ====== 
function popupWindowShow(ms, mouseX, mouseY){
	if (self_PagePopupInfo.status != 'showing'){
		self_PagePopupInfo.status = 'ready-showing'
		
		setTimeout(() => {
			if (self_PagePopupInfo.status == 'ready-showing'){
				const keywordnote_popup = document.querySelector('keywordnote div.keywordnote_popup');
				
				keywordnote_popup.classList.add('show');
				keywordnote_popup.style.left = mouseX + "px";
				keywordnote_popup.style.top = mouseY + "px";
				
				self_PagePopupInfo.status == 'showing'
			}
		}, ms);
	}
}
function popupWindowClose(ms){
	if (self_PagePopupInfo.status != 'close'){
		self_PagePopupInfo.status = 'ready-close'
		
		setTimeout(() => {
			if (self_PagePopupInfo.status == 'ready-close'){
				const keywordnote_popup = document.querySelector('keywordnote div.keywordnote_popup');
				
				keywordnote_popup.classList.remove('show');
				keywordnote_popup.style.left = "";
				keywordnote_popup.style.top = "";
				
				const note_content = keywordnote_popup.querySelector('div.note_content');
				const bottom_fade = keywordnote_popup.querySelector('div.bottom_fade');
				
				note_content.style.maxHeight = "";
				bottom_fade.style.top = "";
						
				self_PagePopupInfo.status == 'close'
			}
		}, ms);
	}
}
function popupWindowQuickClose(){
	const keywordnote_popup = document.querySelector('keywordnote div.keywordnote_popup');
	keywordnote_popup.classList.add('quickclose');
	
	popupWindowClose(0);
	keywordnote_popup.classList.remove('quickclose');
}

// ====== 事件處理 ====== 
async function keywordMouseoverEvent(event){
	if(keyword_KeyIndex.isMarkhide){
		return;
	}
	
	const KeywordNode = event.target.closest('kw');
	const KeywordListOnNode = KeywordNode.getAttribute('keywords').split(',');
	
	if (self_PagePopupInfo.targetNode != KeywordNode){
		popupWindowQuickClose();
	}
		
	const MouseX = event.clientX;
	const MouseY = event.clientY;
	popupWindowShow(1000, MouseX, MouseY);
	
	await timeout(500);
	if (self_PagePopupInfo.status == 'ready-showing'){
		if (self_PagePopupInfo.currentKeywords != KeywordListOnNode){
			self_PagePopupInfo.targetNode = KeywordNode;
			self_PagePopupInfo.currentKeywords = KeywordListOnNode;
			self_PagePopupInfo.currentShowIndex = 0;
			self_PagePopupInfo.isMutipleMark = (KeywordListOnNode.length > 1);
			
			refreshPopupKeyword(KeywordListOnNode[0]);
		}
		
	}
	
	/*if (KeywordListOnNode.classList.contains('highlight-keyword-mutiple')){
		
		
	}
	else{
		
	}*/
}
function keywordMouseoutEvent(event){
	popupWindowClose(500);
}

function popupMouseoverEvent(event){
	if (self_PagePopupInfo.status == 'ready-close'){
		self_PagePopupInfo.status = 'showing'
	}
}
function popupMouseoutEvent(event){
	popupWindowClose(500);
}

async function popupSidepanelShow(event){
	const TargetKeyword = self_PagePopupInfo.currentKeywords[self_PagePopupInfo.currentShowIndex];
	await chrome.runtime.sendMessage({event_name: 'quest-open-sidepanel', isSpecifiedKeywords: true, keyword: TargetKeyword});
}
function popupKeywordHighlight(event){
	const TargetKeyword = self_PagePopupInfo.currentKeywords[self_PagePopupInfo.currentShowIndex];
	onlyShowOneKeywordMark(TargetKeyword);
}

function clickNoteContent(event){
	const note_block = event.target.closest('.pin_note_container');
	const note_content = note_block.querySelector('div.note_content');
	const bottom_fade = note_block.querySelector('div.bottom_fade');
	
	if (self_PagePopupInfo.isContentExpand && self_PagePopupInfo.status == 'showing'){
		note_content.style.maxHeight = "";
		bottom_fade.style.top = "";
		
		self_PagePopupInfo.isContentExpand = false;
	}
	else{
		const ContentRect = note_content.getBoundingClientRect();
		const WindowY = window.innerHeight;

		note_content.style.maxHeight = `${WindowY - ContentRect.top - 70}px`;
		bottom_fade.style.top = `calc(${WindowY - ContentRect.top - 70}px - 1em)`;
		
		self_PagePopupInfo.isContentExpand = true;
	}
}

// ====== 分頁通訊 ====== 
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse){ //短期連接通訊
	switch (request.event_name) {
		//資料同步
		case 'quest-tab-status':
			responseSelfPageStatus()
			.then((InfoForResponse) => {
				sendResponse(InfoForResponse);
			});
			
			break;
			
		//搜尋功能
		case 'keyword-mark-search':
			keyword_KeyIndex = request.keyword_keyindex;

			searchKeywords()
			.then((ReturnData) => {
				sendResponse(ReturnData);
			});
			
			break;
		case 'keyword-mark-show':
			showAllKeywordMark()
			.then((ReturnData) => {
				sendResponse(ReturnData);
			});
			
			break;
		case 'keyword-mark-hide':
			hideAllKeywordMark()
			.then((ReturnData) => {
				sendResponse(ReturnData);
			});
			
			break;
			
		//頁面操作
		case 'keyword-previous-mark':
			sendResponse({});
			scrollToPreviousMark(request.targetKeyword);
			break;
		case 'keyword-next-mark':
			sendResponse({});
			scrollToNextMark(request.targetKeyword);
			break;
	}
	
	console.log(request.event_name);
	return true;
});

console.log('網頁腳本初始化完成');