//資料控制項
var is_AreadySearch = false;
var is_MarkHide = true;
var is_PopupHide = true;
var popup_is_needrefresh = true;
var is_onlyShowOne = null;
var is_PopupContentExpand = false;

var timeout_PopupMouseOn;
var timeout_PopupMouseOut;

var scroll_IntoIndex = 0;

var current_PopupMark = [];
var current_PopupIndex = 0;
var is_MutipleMark = false;
//通用設定資料
var is_DarkMode = true;

var is_FirstTrack = true;
const track_Host = ['www.youtube.com', 'www.twitch.tv'];
const excludeSearchNode = ['KEYWORDNOTE', 'TEXTAREA']
//儲存資料
var searched_KeywordNodes = [];// [node, is_showed, keywords_in_node]
var searched_Keywords = {};//{keyword: count_in_page}

// ====== 請求設定資料 ====== 
chrome.runtime.sendMessage({event_name: 'quest-extension-setting'}, (response) => {
	is_DarkMode = response.is_darkmode;
});

// ====== 資料回傳 ====== 
function responsePageStatus(callback){
	//console.log({is_areadysearch: is_AreadySearch, is_markhide: is_MarkHide});
	
	callback({is_areadysearch: is_AreadySearch,
			is_markhide: is_MarkHide,
			host: location.host,
			url: location.href,
			title: document.title
			});
			
	if (track_Host.includes(location.host) && is_FirstTrack){
		trackHostEventBuild(location.host);
	}
}

function responseSearchedKeywords(){
	//console.log({searched_keywords: searched_Keywords});
	
	return {searched_keywords: searched_Keywords};
}

function trackHostEventBuild(host){
	switch(host){
		case 'www.youtube.com':
			document.addEventListener('yt-page-data-updated', trackHostListener);
			is_FirstTrack = False;
			break;
		case 'www.twitch.tv':
			let target = document.querySelector('head > title');
			let observer = new window.WebKitMutationObserver(trackHostListener);
			observer.observe(target, {childList: true});
			break;
	}
}

function trackHostListener(){
	chrome.runtime.sendMessage({event_name: 'special-url-page-updated'}, (t) => {});
}
// ====== 資料處理 ====== 
function insertPopupHtml(){
	var keyword_container = document.createElement('keywordnote');
	
	/*
	keyword_container.innerHTML = `<div class="keywordnote_popup">
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
											<button id="keyword_note_invisible">
												<i class="svg_icon">
												<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 14 14">
													<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
													<path d="M3.63 3.624C4.621 2.98 5.771 2.5 7 2.5c2.79 0 5.18 2.475 6.23 3.746c.166.207.258.476.258.754c0 .279-.092.547-.258.754c-.579.7-1.565 1.767-2.8 2.583m-1.93.933c-.482.146-.984.23-1.5.23c-2.79 0-5.18-2.475-6.23-3.746A1.208 1.208 0 0 1 .512 7c0-.278.092-.547.258-.754c.333-.402.8-.926 1.372-1.454" />
													<path d="M8.414 8.414a2 2 0 0 0-2.828-2.828M13.5 13.5L.5.5" />
													</g>
												</svg>
												</i>
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
	*/
	
	keyword_container.innerHTML = `<div class="keywordnote_popup">
									<div class="popup_header">
									  <div class="title_boder">
											<span id="keyword_title">某個關鍵字</span>
											<div class="right_fade"></div>
									  </div>
									  <div class="keyword_button_container">
											<button id="keyword_note_sidepanel_show" title="在側邊欄顯示">
												<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 48 48">
												<path fill="currentColor" d="M40 12a6.25 6.25 0 00-6-6h-24a6.25 6.25 0 00-5 6v22a6.25 6.25 0 005 5h24a6.25 6.25 0 006-5.25zm-30 24a3.75 3.75 0 01-2-2v-22a3.75 3.75 0 012-3h15v27z" />
												</svg>
											</button>
											<button id="keyword_note_highlight" title="僅顯示此關鍵字">
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
			
	if (is_DarkMode){
		keyword_container.classList.add('dark');
	}
	document.body.appendChild(keyword_container);
	
	const popup = keyword_container.querySelector('div.keywordnote_popup');
	
	popup.addEventListener("mouseover", popupMouseoverEvent);
	popup.addEventListener("mouseout", popupMouseoutEvent);
	popup.onwheel = function (event){ 
		event.preventDefault();  
	};
	
	keyword_container.querySelector('button#keyword_note_sidepanel_show').addEventListener("click", popupSidepanelShow);
	//keyword_container.querySelector('button#keyword_note_invisible').addEventListener("click", popupKeywordInvisible);
	keyword_container.querySelector('button#keyword_note_highlight').addEventListener("click", popupKeywordHighlight);
	
	keyword_container.querySelector('div.note_content').onwheel = function (event){ 
		event.preventDefault();  

		const step = 15;  
		const last_scrollTop = this.scrollTop;
		if(event.deltaY < 0){  
			this.scrollTop -= step;  
		} else {  
			this.scrollTop += step;  
		}

		if (last_scrollTop == this.scrollTop && last_scrollTop > 0){
			this.parentElement.querySelector('div.bottom_fade').classList.add('hide');
		}
		else{
			this.parentElement.querySelector('div.bottom_fade').classList.remove('hide');
		}
	};
	keyword_container.querySelector('div.pin_note_container').addEventListener("click", clickNoteContent);
	
	const keyword_title = keyword_container.querySelector("span#keyword_title");
	keyword_title.onwheel = function (event){ 
		if(is_MutipleMark){ 
			event.preventDefault();  
			
			if(event.deltaY < 0){  
				popup_previouskeyword();  
			} else {  
				popup_nextkeyword();  
			}  
		}
	};
}
function triggerAlertWindow(message, type){
	notification = {
		event_name: 'send-notification-message',
		message: message,
		notification_type: type
	};
	
	chrome.runtime.sendMessage(notification, (t) => {});
}

function makeKeywordSingleNode(innertext, keywords_in_node){
	const new_keywordnode = document.createElement('kw');
	new_keywordnode.innerText = innertext;
	new_keywordnode.classList.add("highlight-keyword");
	new_keywordnode.setAttribute('keywords', keywords_in_node);

	return new_keywordnode;
}
function makeKeywordMutipleNode(innertext, keywords_in_node){
	const new_keywordnode = document.createElement('kw');
	new_keywordnode.innerText = innertext;
	new_keywordnode.classList.add("highlight-keyword");
	new_keywordnode.classList.add("highlight-keyword-mutiple");
	new_keywordnode.setAttribute('keywords', keywords_in_node);

	return new_keywordnode;
}
	
function searchKeywords(callback){
	chrome.runtime.sendMessage({event_name: 'quest-recorded-keywords'}, (response) => {
		/*const recorded_keywords = Object.keys(response.recorded_keywords);
	
		const keywords_searched_count = response.recorded_keywords;*/
		
		const recorded_keywords = response.recorded_keywords;
		let keywords_searched_count = {};
		
		const windowHeight = (document.height !== undefined) ? document.height : document.body.offsetHeight;
		const windowWidth = (document.width !== undefined) ? document.width : document.body.offsetWidth;
		
		recorded_keywords.forEach(function (Keyword) {
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
		function isHidden_hardCheck(el) {
			rect = el.getBoundingClientRect();
			
			if (rect.bottom < 0 || rect.right < 0){
				return true
			}
			else if (rect.top > windowHeight || rect.left > windowWidth){
				return true
			}
			else{
				//topElt = document.elementFromPoint(x,y);
				
				//return el.isSameNode(topElt)
				return false
			}
		}
		
		function mergeOverlappingRanges(keywords_in_node){
			keywords_in_node.sort((a, b) => a.start - b.start);
			
			const merged = [];
			let currentRange = keywords_in_node[0];
			for (let index = 1; index < keywords_in_node.length; index++) {
				const nextRange = keywords_in_node[index];
				if (nextRange.start <= currentRange.end) {
					currentRange.end = Math.max(currentRange.end, nextRange.end);
					currentRange.keywords.push(nextRange.keywords[0]);
				}
				else {
					merged.push(currentRange);
					currentRange = nextRange;
				}
			}
			
			merged.push(currentRange);
			return merged;
		}
		function stringSegmentationProcessing(node_text, merged_ranges){
			let starting_pointer = 0;
			let node_list = [];
			let keywordnode_list = [];
			
			for (const keyword_range of merged_ranges) {
				if (keyword_range.start > starting_pointer){
					const new_textnode_text = node_text.substr(starting_pointer, (keyword_range.start - starting_pointer));
					const new_textnode = document.createTextNode(new_textnode_text);
					
					node_list.push(new_textnode);
				}
				
				const new_keywordnode_text = node_text.substr(keyword_range.start, (keyword_range.end - keyword_range.start));
				
				if(keyword_range.keywords.length  > 1){
					const new_keywordnode = makeKeywordMutipleNode(new_keywordnode_text, keyword_range.keywords);
					
					node_list.push(new_keywordnode);
					keywordnode_list.push([new_keywordnode, true, keyword_range.keywords]);
				}
				else{
					const new_keywordnode = makeKeywordSingleNode(new_keywordnode_text, keyword_range.keywords);
					
					node_list.push(new_keywordnode);
					keywordnode_list.push([new_keywordnode, true, keyword_range.keywords]);
				}
				
				starting_pointer = keyword_range.end;
			}
			
			if (node_text.length !== starting_pointer){
				let new_textnode_text = node_text.substr(starting_pointer, (node_text.length - starting_pointer));
				let new_textnode = document.createTextNode(new_textnode_text);
				
				node_list.push(new_textnode);
			}
			
			return [node_list, keywordnode_list];
		}
		
		function searchRecursion(node){
			if (node.nodeType === Node.TEXT_NODE){
				const node_text = node.textContent;
				let keywords_in_node = []
				
				if (isHidden_hardCheck(node.parentNode)){
					return;
				}
				
				for (const keyword of recorded_keywords) {
					let start_index = 0, keyword_index;
					
					while ((keyword_index = node_text.indexOf(keyword, start_index)) > -1){
						keywords_in_node.push({start: keyword_index, end: (keyword_index + keyword.length), keywords: [keyword]});
						start_index = (keyword_index + keyword.length);
					}
					
					if (start_index !== 0) {
						keywords_searched_count[keyword] += 1;
					}
				}

				if (keywords_in_node.length <= 0){
					return;
				}

				const merged_ranges = mergeOverlappingRanges(keywords_in_node);
				
				const [node_list, new_keywordnode_list] = stringSegmentationProcessing(node_text, merged_ranges);
				
				for (const replace_node of node_list) {
					node.parentNode.insertBefore(replace_node, node);
				}
				
				for (const keyword_node of new_keywordnode_list) {
					settingKeywordnodesEventListener(keyword_node[0]);
				}
				
				node.remove();
				//delete node;
				searched_KeywordNodes = searched_KeywordNodes.concat(new_keywordnode_list);
			}
			else if(excludeSearchNode.includes(node.nodeName)){
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
		searched_KeywordNodes = [];
		searched_Keywords = {};
		let keycount = 0;
		const body = document.body;

		for (let i = 0; i < body.childNodes.length; i++) {
			searchRecursion(body.childNodes[i]);
		}
		
		if (searched_KeywordNodes.length > 0){
			triggerAlertWindow(`網頁關鍵字內容已標記\n該網頁中找到 ${searched_KeywordNodes.length} 個關鍵字`, 'ok');
			
			if (!is_AreadySearch){
				insertPopupHtml();
			}
			
			is_AreadySearch = true;
			is_MarkHide = false;
			
			for (const keyword of recorded_keywords) {
				if (keywords_searched_count[keyword] === 0){
					delete keywords_searched_count[keyword];
				}
				else{
					keycount += 1;
				}
			}
			searched_Keywords = keywords_searched_count;
		}
		else{
			triggerAlertWindow("未能在目前網頁上找到關鍵字", 'nofound');
			
			is_AreadySearch = false;
			is_MarkHide = false;
		}
		
		callback(keycount);
	});
}
function settingKeywordnodesEventListener(node) {
	node.addEventListener("mouseover", keywordMouseoverEvent);
	node.addEventListener("mouseout", keywordMouseoutEvent);
}

function showAllKeywordMark(callback){
	is_MarkHide = false;
	//callback(true);
	
	for (let searched_index = 0; searched_index < searched_KeywordNodes.length; searched_index++) {
		const [node, is_showed, keywords_in_node] = searched_KeywordNodes[searched_index];
		
		if(!is_showed){
			const keywordnode_text = node.textContent;
			
			if(keywords_in_node.length > 1){
				const new_keywordnode = makeKeywordMutipleNode(keywordnode_text, keywords_in_node);
				
				searched_KeywordNodes[searched_index][0].replaceWith(new_keywordnode);
				//delete searched_KeywordNodes[searched_index][0];
				searched_KeywordNodes[searched_index][0] = new_keywordnode;
				searched_KeywordNodes[searched_index][1] = true;
				
				settingKeywordnodesEventListener(new_keywordnode);
			}
			else{
				const new_keywordnode = makeKeywordSingleNode(keywordnode_text, keywords_in_node);
				
				searched_KeywordNodes[searched_index][0].replaceWith(new_keywordnode);
				//delete searched_KeywordNodes[searched_index][0];
				searched_KeywordNodes[searched_index][0] = new_keywordnode;
				searched_KeywordNodes[searched_index][1] = true;
				
				settingKeywordnodesEventListener(new_keywordnode);
			}
		}
	}
	
	is_onlyShowOne = null;
	callback(true);
}
function hideAllKeywordMark(callback){
	is_MarkHide = true;
	//callback(true);
	
	for (let searched_index = 0; searched_index < searched_KeywordNodes.length; searched_index++) {
		const [node, is_showed, keywords_in_node] = searched_KeywordNodes[searched_index];
		
		if(is_showed){
			const keywordnode_text = node.innerText;
				
			const new_textnode = document.createTextNode(keywordnode_text);
			
			searched_KeywordNodes[searched_index][0].replaceWith(new_textnode);
			//delete searched_KeywordNodes[searched_index][0];
			searched_KeywordNodes[searched_index][0] = new_textnode;
			searched_KeywordNodes[searched_index][1] = false;
		}
	}
	
	is_onlyShowOne = null;
	callback(true);
}
function onlyShowOneKeywordMark(keyword){
	function mutipleKeywordNodeProcess(keyword_node){
		const node_content = keyword_node.innerText
		const keyword_index = keyword_node.innerText.indexOf(keyword);
		
		keyword_node.removeChild(keyword_node.lastChild)
		
		keyword_node.appendChild(document.createTextNode(node_content.substr(0, keyword_index)));
		keyword_node.appendChild(makeKeywordSingleNode(node_content.substr(keyword_index, keyword.length), [keyword]));
		keyword_node.appendChild(document.createTextNode(node_content.substr((keyword_index + keyword.length), keyword_node.innerText.length)));
		
		return keyword_node;
	}
		
	// main code
	if (!is_onlyShowOne){
		for (let searched_index = 0; searched_index < searched_KeywordNodes.length; searched_index++) {
			const [node, is_showed, keywords_in_node] = searched_KeywordNodes[searched_index];
			
			if(keywords_in_node.indexOf(keyword) > -1){
				if (keywords_in_node.length > 1){
					if(!is_showed){
						const new_keywordnode_unprocessed = makeKeywordMutiplenode(node.innerText, keywords_in_node);
						
						const new_keywordnode = mutipleKeywordNodeProcess(new_keywordnode_unprocessed);
						searched_KeywordNodes[searched_index][0].replaceWith(new_keywordnode);
						//delete searched_KeywordNodes[searched_index][0];
						searched_KeywordNodes[searched_index][0] = new_keywordnode;
						searched_KeywordNodes[searched_index][1] = true;
						
						settingKeywordnodesEventListener(new_keywordnode);
					}
					else{
						const new_keywordnode = mutipleKeywordNodeProcess(node);
					}
				}
				else{
					if(is_showed){
						continue;
					}
					
					const new_keywordnode = makeKeywordSingleNode(node.innerText, keywords_in_node);
					searched_KeywordNodes[searched_index][0].replaceWith(new_keywordnode);
					//delete searched_KeywordNodes[searched_index][0];
					searched_KeywordNodes[searched_index][0] = new_keywordnode;
					searched_KeywordNodes[searched_index][1] = true;
					
					settingKeywordnodesEventListener(new_keywordnode);
				}
			}
			else{
				if(is_showed){
					const keywordnode_text = node.textContent;
					
					const new_textnode = document.createTextNode(keywordnode_text);
					
					searched_KeywordNodes[searched_index][0].replaceWith(new_textnode);
					//delete searched_KeywordNodes[searched_index][0];
					searched_KeywordNodes[searched_index][0] = new_textnode;
					searched_KeywordNodes[searched_index][1] = false;
				}
			}
		}
		
		is_onlyShowOne = keyword;
	}
}

function notedataFirstUpdate(keyword, keyword_notedata, X, Y){
	clearTimeout(timeout_PopupMouseOut);
	
	const popup_window = document.querySelector('keywordnote div.keywordnote_popup');
	const keyword_note_content = popup_window.querySelector('div.note_content');
	const keyword_timestamp_container = popup_window.querySelector('div.windos_timestamp_container');
	const keyword_title = popup_window.querySelector("span#keyword_title");
	
	if (keyword_notedata == null){
		keyword_note_content.innerText = '你沒有此關鍵字的筆記喔，趕快紀錄些什麼吧!';
		keyword_timestamp_container.innerText = '設計界面是件痛苦又耗腦細胞的事';
	}
	else if(keyword_notedata.length == 0){
		keyword_note_content.innerText = '你還沒有關於此關鍵字的筆記喔，趕快紀錄些什麼吧!';
		keyword_timestamp_container.innerText = '寫程式是件既痛苦又樂在其中的事';
	}
	else{
		const [note_content, note_timestamp, is_pinned] = keyword_notedata;
		
		keyword_note_content.innerHTML = note_content;
		keyword_timestamp_container.innerText = note_timestamp;
	}
	
	if (is_MutipleMark){
		keyword_title.setAttribute('title', `滾動查看其他 ${current_PopupMark.length - 1} 個關鍵字`);
	}
	else{
		keyword_title.setAttribute('title', "此位置的關鍵字");
	}
	
	timeout_PopupMouseOn = setTimeout(function () {
		const windowX = window.innerWidth;
		const windowY = window.innerHeight;
		
		let mouseX = ((windowX - X) < 360) ? X - 350 : X + 10;
		const mouseY = ((windowY - Y) < 220) ? Y - 230 + window.scrollY : Y + 10 + window.scrollY;
		
		if (windowX < 300 || mouseX < 0){
			mouseX = 10;
		}
		if ((mouseY - window.scrollY) < 0){
			mouseY = 10;
		}
		
		popup_window.style.left = mouseX + "px";
		popup_window.style.top = mouseY + "px";
		
		setTimeout(function () {
			popup_window.classList.add('show');
			is_PopupHide = false;
		}, 490);
	}, 1000);
}
function notedataUpdate(keyword, keyword_notedata, index){
	clearTimeout(timeout_PopupMouseOut);
	
	const popup_window = document.querySelector('keywordnote div.keywordnote_popup');
	const keyword_title = popup_window.querySelector('span#keyword_title');
	const keyword_note_content = popup_window.querySelector('div.note_content');
	const keyword_timestamp_container = popup_window.querySelector('div.windos_timestamp_container');
	
	keyword_title.innerText = keyword;
	if (keyword_notedata == null){
		keyword_note_content.innerText = '你沒有此關鍵字的筆記喔，趕快紀錄些什麼吧!';
		keyword_timestamp_container.innerText = '設計界面是件痛苦又耗腦細胞的事';
	}
	else if(keyword_notedata.length == 0){
		keyword_note_content.innerText = '你還沒有關於此關鍵字的筆記喔，趕快紀錄些什麼吧!';
		keyword_timestamp_container.innerText = '寫程式是件既痛苦又樂在其中的事';
	}
	else{
		const [note_content, note_timestamp, is_pinned] = keyword_notedata;
		
		keyword_note_content.innerHTML = note_content;
		keyword_timestamp_container.innerText = note_timestamp;
	}

	current_PopupIndex = index;
}

function scrollIntoPreviousMark(target_keyword){
	const mark_length = searched_KeywordNodes.length
	const current_KeywordNode = searched_KeywordNodes[scroll_IntoIndex][0]
	
	if (!is_AreadySearch){
		triggerAlertWindow('請先搜尋後在使用本功能', 'warning');
	}
	else if (Boolean(is_onlyShowOne) && (is_onlyShowOne != target_keyword)){
		triggerAlertWindow('當前單獨顯示的標記非所選關鍵字', 'error');
	}
	else if (!Object.keys(searched_Keywords).includes(target_keyword)){
		triggerAlertWindow('當前顯示的標記不包含所選關鍵字', 'error');
	}
	else{
		for (let index = ((scroll_IntoIndex + mark_length - 1) % mark_length); scroll_IntoIndex != index; index = ((index + mark_length - 1) % mark_length)) {
			const [node, is_showed, keywords_in_node] = searched_KeywordNodes[index];
			
			if (keywords_in_node.indexOf(target_keyword) > -1){
				node.scrollIntoView({ block: "center" });
				current_KeywordNode.classList.remove('highlight-viewed');
				node.classList.add('highlight-viewed');
				
				scroll_IntoIndex = index;
				break;
			}
		}
	}
}
function scrollIntoNaxtMark(target_keyword){
	const mark_length = searched_KeywordNodes.length
	const current_KeywordNode = searched_KeywordNodes[scroll_IntoIndex][0]
	
	if (!is_AreadySearch){
		triggerAlertWindow('請先搜尋後在使用本功能', 'warning');
	}
	else if (Boolean(is_onlyShowOne) && (is_onlyShowOne != target_keyword)){
		triggerAlertWindow('當前單獨顯示的標記非所選關鍵字', 'error');
	}
	else if (!Object.keys(searched_Keywords).includes(target_keyword)){
		triggerAlertWindow('當前顯示的標記不包含所選關鍵字', 'error');
	}
	else{
		for (let index = ((scroll_IntoIndex + mark_length + 1) % mark_length); scroll_IntoIndex != index; index = ((index + mark_length + 1) % mark_length)) {
			const [node, is_showed, keywords_in_node] = searched_KeywordNodes[index];
			
			if (keywords_in_node.indexOf(target_keyword) > -1){
				node.scrollIntoView({ block: "center" });
				current_KeywordNode.classList.remove('highlight-viewed');
				node.classList.add('highlight-viewed');
				
				scroll_IntoIndex = index;
				break;
			}
		}
	}
}

// ====== 元素事件 ====== 
function keywordMouseoverEvent(event){
	if(is_MarkHide){
		return;
	}
	
	const popup_window = document.querySelector('keywordnote div.keywordnote_popup');
	if (popup_window.classList.contains('show')){
		popup_window.classList.add('quickclose');
	}
	
	const kw_node = event.target;
	const keywords = kw_node.getAttribute('keywords').split(',');
	
	const keyword_title = popup_window.querySelector('span#keyword_title');
	const keyword_note_content = popup_window.querySelector('div.note_content');
	
	keyword_title.innerText = keywords[0];
	keyword_note_content.innerText = 'Waiting for database response...';
	
	current_PopupMark = keywords;
	current_PopupIndex = 0;
	is_MutipleMark = (keywords.length > 1);
	
	popup_window.classList.remove('quickclose');
	popup_window.classList.remove('show')
	
	const quest_data = {
		event_name: 'quest-keyword-notedata-content',
		keyword: keywords[0],
		is_first: true,
		mouseX: event.clientX,
		mouseY: event.clientY
	};
	chrome.runtime.sendMessage(quest_data, (t) => {});
	/*if (kw_node.classList.contains('highlight-keyword-mutiple')){
		
		
	}
	else{
		
	}*/
}
function keywordMouseoutEvent(event){
	clearTimeout(timeout_PopupMouseOn);
	
	const popup_window = document.querySelector('keywordnote div.keywordnote_popup');
	timeout_PopupMouseOut = setTimeout(function () {
		popup_window.classList.remove('show');
		popup_window.style.left = "";
		popup_window.style.top = "";
		is_PopupHide = true;
	}, 500);
}

function popupMouseoverEvent(event){
	clearTimeout(timeout_PopupMouseOut);
}
function popupMouseoutEvent(event){
	const popup_window = document.querySelector('keywordnote div.keywordnote_popup');
	timeout_PopupMouseOut = setTimeout(function () {
		popup_window.classList.remove('show');
		popup_window.style.left = "";
		popup_window.style.top = "";
		is_PopupHide = true;
		
		const note_content = popup_window.querySelector('div.note_content');
		const bottom_fade = popup_window.querySelector('div.bottom_fade');
		
		note_content.style.maxHeight = "";
		bottom_fade.style.top = "";
		
		is_PopupContentExpand = false;
	}, 500);
}

function popupSidepanelShow(event){
	const popup_window = document.querySelector('keywordnote div.keywordnote_popup');
	const keyword_title = popup_window.querySelector('span#keyword_title');
	
	const select_keyword = keyword_title.innerText;
	
	chrome.runtime.sendMessage({event_name: 'quest-sidePanel-on'}, (response) => {
		if (!response.is_sidepanelon){
			chrome.runtime.sendMessage({event_name: 'quest-open-sidePanel', select_keyword: select_keyword}, (response) => {
				if (response.is_allow){
					chrome.sidePanel.open({tabId: currentpage_TabId});
				}
			});
		}
		else{
			chrome.runtime.sendMessage({event_name: 'quest-keyword-notedata-sidepanel', keyword: select_keyword}, (t) => {});
		}
	});
	//chrome.sidePanel.open({tabId: currentpage_TabId});
}
function popupKeywordHighlight(event){
	const popup_window = document.querySelector('keywordnote div.keywordnote_popup');
	const keyword_title = popup_window.querySelector('span#keyword_title');
	
	const select_keyword = keyword_title.innerText;
	onlyShowOneKeywordMark(select_keyword);
}

function popup_previouskeyword(){
	const previous_index = (current_PopupIndex - 1 + current_PopupMark.length) % current_PopupMark.length;
	const previous_keyword = current_PopupMark[previous_index];
	
	const quest_data = {
		event_name: 'quest-keyword-notedata-content',
		keyword: previous_keyword,
		index: previous_index,
		is_first: false
	};
	
	chrome.runtime.sendMessage(quest_data, (t) => {});
}
function popup_nextkeyword(){
	const next_index = (current_PopupIndex + 1 + current_PopupMark.length) % current_PopupMark.length;
	const next_keyword = current_PopupMark[next_index];
	
	const quest_data = {
		event_name: 'quest-keyword-notedata-content',
		keyword: next_keyword,
		index: next_index,
		is_first: false
	};
	
	chrome.runtime.sendMessage(quest_data, (t) => {});
}

function clickNoteContent(event){
	const note_block = event.target.closest('.pin_note_container');
	const note_content = note_block.querySelector('div.note_content');
	const bottom_fade = note_block.querySelector('div.bottom_fade');
	
	if (is_PopupContentExpand || is_PopupHide){
		note_content.style.maxHeight = "";
		bottom_fade.style.top = "";
		
		is_PopupContentExpand = false;
	}
	else{
		const content_rect = note_content.getBoundingClientRect();
		const windowY = window.innerHeight;

		note_content.style.maxHeight = `${windowY - content_rect.top - 70}px`;
		bottom_fade.style.top = `calc(${windowY - content_rect.top - 70}px - 1em)`;
		
		is_PopupContentExpand = true;
	}
}
// ====== 資料接收 ====== 
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	var response = null;
	var process_status = false;
	
	switch (request.event_name) {
		//網頁腳本狀態
		case 'quest-tab-status':
			responsePageStatus((response) => {
				sendResponse(response);
			});
			break;
		//標記命令執行	
		case 'keyword-mark-search':
			sendResponse({});
			
			searchKeywords((process_keycount) => {
				responsePageStatus((page_status) => {
					response = {
						event_name: 'response-keyword-mark-search',
						process_keycount: process_keycount,
						page_status: page_status,
						request_from: request.from
					};
					
					chrome.runtime.sendMessage(response, (t) => {});
				});
			});
			break;	
		case 'keyword-mark-research':
			sendResponse({});
			
			hideAllKeywordMark((process_status) => {
				searchKeywords((process_keycount) => {
					responsePageStatus((page_status) => {
						response = {
							event_name: 'response-keyword-mark-search',
							process_keycount: process_keycount,
							page_status: page_status
						};
						
						chrome.runtime.sendMessage(response, (t) => {});
					});
				});
			});
			break;
		case 'keyword-mark-show':
			sendResponse({});
			
			showAllKeywordMark((process_status) => {
				responsePageStatus((page_status) => {
					if (request.from != 'hotkey'){
						response = {
							event_name: 'response-keyword-mark-show',
							process_status: process_status,
							page_status: page_status
						};
						
						chrome.runtime.sendMessage(response, (t) => {});
					}
				});
			});
			break;
		case 'keyword-mark-hide':
			sendResponse({});
			
			hideAllKeywordMark((process_status) => {
				responsePageStatus((page_status) => {
					if (request.from != 'hotkey'){
						response = {
							event_name: 'response-keyword-mark-hide',
							process_status: process_status,
							page_status: page_status
						};
						
						chrome.runtime.sendMessage(response, (t) => {});
					}
				});
			});
			break;
		case 'keyword-previous-mark':
			sendResponse({});
			
			scrollIntoPreviousMark(request.target_keyword);
			break;
		case 'keyword-next-mark':
			sendResponse({});
			
			scrollIntoNaxtMark(request.target_keyword);
			break;
			
		//回傳搜尋結果	
		case 'quest-searched-keywords':
			response = responseSearchedKeywords()
			sendResponse(response);
			break;
		//關鍵字筆記
		case 'response-keyword-notedata-content':
			sendResponse({});
			
			if (request.is_first){
				notedataFirstUpdate(request.keyword, request.keyword_notedata, request.mouseX, request.mouseY);
			}
			else{
				notedataUpdate(request.keyword, request.keyword_notedata, request.index);
			}
			break;
	}
});

// ====== 初始化 ====== 
console.log('網頁腳本初始化完成');
