//外部腳本資料
var currentpage_TabId = null;
var is_CurrentPageSearch = true;

var currentpage_Host = null;
var currentpage_Url = null;
//通用設定資料
var is_DarkMode = true;
var is_SwitchWithTab = true;
//資料控制項
var current_Host = null;
var current_Url = null;
var current_Keyword = '標籤';

var is_UrlNoteExist = 0;
var is_KeywordNoteExist = 0;

var display_UrlNotes = [-1];
var display_KeywordNotes = [-1];

var confirmnotifications_data = {}
//編輯器控制項
var current_EditingEditor = [null, null];

var initial_EditContent = [null, null];
var initial_EditPriority = [null, null];
var initial_EditTimestamp = [null, null];

var is_UrlNewNoteEdit = null;
var is_KeywordNewNoteEdit = null;

var is_Connect = false;
//儲存資料
var searched_Keywords = {};
var recorded_Keywords = {};

// ====== 資料回傳 ====== 

// ====== 資料處理 ====== 
function currentPagePageStatusUpdate(is_support, is_script_run, page_status){
	if(is_support && is_script_run){
		if (!(currentpage_Host === page_status.host)){
			chrome.runtime.sendMessage({event_name: 'quest-url-notedata', host: page_status.host}, (t) => {});
		}
		
		currentpage_Host = page_status.host;
		currentpage_Url = page_status.url;
		
		if (page_status.is_areadysearch && (currentpage_TabId != null)){
			const searched_keywords_quest = {
			event_name: 'quest-searched-keywords'
			};
			chrome.tabs.sendMessage(currentpage_TabId, searched_keywords_quest, (response) => {
				searched_Keywords = response.searched_keywords;
				
				if (is_SwitchWithTab){
					is_CurrentPageSearch = true;
					refreshSuggestionArea();
				}
				
			});
		}
		else {
			if (is_CurrentPageSearch){
				is_CurrentPageSearch = false;
				refreshSuggestionArea();
			}
		}
	}
	else{
		currentpage_Host = null;
		currentpage_Url = null;
		
		if (is_CurrentPageSearch){
			is_CurrentPageSearch = false;
			refreshSuggestionArea();
		}
	}
}

function refreshTitleArea(host, host_notedata, keywords_priority){
	const title_area = document.getElementById("title_area");
	
	const host_title = title_area.querySelector('span#url_note_host');
	host_title.innerText = host;
	
	const url_note_container = document.getElementById("url_note_container");
	
	const url_note_block = Array.from(url_note_container.querySelectorAll(".windos_message_block")).reverse();
	
	if (host_notedata === null){
		const message_block = document.createElement('div');
		message_block.classList.add('windos_message_block');
		
		message_block.innerHTML = `<div class="interactive_block">
								   </div>
								   <div class="windos_message_content">
									 你沒有在此網域做過筆記喔，<br>
									 趕快紀錄些什麼吧!
								   </div>
								   <div class="windos_timestamp_container">
								     <div class="windos_message_timestamp">
									   設計界面是件痛苦又耗腦細胞的事
								     </div>
								   </div>`
								
		url_note_container.innerHTML = "";
		url_note_container.appendChild(message_block);
		
		is_UrlNoteExist = 0;
		display_UrlNotes = [-1];
	}
	else if (host_notedata.length === 0){
		const message_block = document.createElement('div');
		message_block.classList.add('windos_message_block');
		
		message_block.innerHTML = `<div class="interactive_block">
								   </div>
								   <div class="windos_message_content">
									 你還沒有在此網域的筆記喔，<br>
									 趕快紀錄些什麼吧!
								   </div>
								   <div class="windos_timestamp_container">
								     <div class="windos_message_timestamp">
									   寫程式是件既痛苦又樂在其中的事
								     </div>
								   </div>`;
								
		url_note_container.innerHTML = "";
		url_note_container.appendChild(message_block);
		
		is_UrlNoteExist = 1;
		display_UrlNotes = [-1];
	}
	else{
		let count_id = 0;
		
		if(is_UrlNoteExist < 2){
			const first_message_interactive_block = url_note_block[0].querySelector(".interactive_block");

			first_message_interactive_block.innerHTML = `<button class="pinned_note" note_id="0">
														   <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 20 20">
														     <path fill="currentColor" d="M13.325 2.617a2 2 0 0 0-3.203.52l-1.73 3.459a1.5 1.5 0 0 1-.784.721l-3.59 1.436a1 1 0 0 0-.335 1.636L6.293 13L3 16.292V17h.707L7 13.706l2.61 2.61a1 1 0 0 0 1.636-.335l1.436-3.59a1.5 1.5 0 0 1 .722-.784l3.458-1.73a2 2 0 0 0 .52-3.203z" />
														   </svg>
														 </button>
														 <button class="more_options" note_id="0">
														   <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 20 20">
														     <path fill="currentColor" d="M10.001 7.8a2.2 2.2 0 1 0 0 4.402A2.2 2.2 0 0 0 10 7.8zm0-2.6A2.2 2.2 0 1 0 9.999.8a2.2 2.2 0 0 0 .002 4.4m0 9.6a2.2 2.2 0 1 0 0 4.402a2.2 2.2 0 0 0 0-4.402" />
														   </svg>
														 </button>`;
														 
			first_message_interactive_block.querySelector(".interactive_block button.pinned_note").addEventListener('click', pinned_note_button_click, false);
			first_message_interactive_block.querySelector(".interactive_block button.more_options").addEventListener('click', more_options_button_click, false);
			
			display_UrlNotes[0] = 0;
		}
		
		let display_UrlNotes_copy = display_UrlNotes.reverse();
		
		const priority_note = new Array(keywords_priority.length);
		const priority_count = keywords_priority.length;
		
		host_notedata.forEach(function (note_data) {
			const [note_content, note_timestamp, undefind_value] = note_data;
			const priority_note_index = keywords_priority.indexOf(count_id);
			
			if (priority_note_index >= 0){
				const message_block = document.createElement('div');
				message_block.classList.add('windos_message_block');
				
				message_block.innerHTML = `<div class="interactive_block">
											 <button class="pinned_note is_pinned" note_id="${count_id}">
											   <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 20 20">
												 <path fill="currentColor" d="M13.325 2.617a2 2 0 0 0-3.203.52l-1.73 3.459a1.5 1.5 0 0 1-.784.721l-3.59 1.436a1 1 0 0 0-.335 1.636L6.293 13L3 16.292V17h.707L7 13.706l2.61 2.61a1 1 0 0 0 1.636-.335l1.436-3.59a1.5 1.5 0 0 1 .722-.784l3.458-1.73a2 2 0 0 0 .52-3.203z" />
											   </svg>
											 </button>
											 <button class="more_options" note_id="${count_id}">
											   <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 20 20">
												 <path fill="currentColor" d="M10.001 7.8a2.2 2.2 0 1 0 0 4.402A2.2 2.2 0 0 0 10 7.8zm0-2.6A2.2 2.2 0 1 0 9.999.8a2.2 2.2 0 0 0 .002 4.4m0 9.6a2.2 2.2 0 1 0 0 4.402a2.2 2.2 0 0 0 0-4.402" />
											   </svg>
											 </button>
										   </div>
										   <div class="windos_message_content">
											 ${note_content}
										   </div>
										   <div class="windos_timestamp_container">
											 <div class="windos_message_timestamp">
											   ${note_timestamp}
											 </div>
										   </div>`;
										   
				message_block.querySelector(".interactive_block button.pinned_note").addEventListener('click', pinned_note_button_click, false);
				message_block.querySelector(".interactive_block button.more_options").addEventListener('click', more_options_button_click, false);
				
				priority_note[priority_note_index] = message_block;
			}
			else if(!url_note_block[count_id]){
				const message_block = document.createElement('div');
				message_block.classList.add('windos_message_block');
				
				message_block.innerHTML = `<div class="interactive_block">
											 <button class="pinned_note" note_id="${count_id}">
											   <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 20 20">
												 <path fill="currentColor" d="M13.325 2.617a2 2 0 0 0-3.203.52l-1.73 3.459a1.5 1.5 0 0 1-.784.721l-3.59 1.436a1 1 0 0 0-.335 1.636L6.293 13L3 16.292V17h.707L7 13.706l2.61 2.61a1 1 0 0 0 1.636-.335l1.436-3.59a1.5 1.5 0 0 1 .722-.784l3.458-1.73a2 2 0 0 0 .52-3.203z" />
											   </svg>
											 </button>
											 <button class="more_options" note_id="${count_id}">
											   <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 20 20">
												 <path fill="currentColor" d="M10.001 7.8a2.2 2.2 0 1 0 0 4.402A2.2 2.2 0 0 0 10 7.8zm0-2.6A2.2 2.2 0 1 0 9.999.8a2.2 2.2 0 0 0 .002 4.4m0 9.6a2.2 2.2 0 1 0 0 4.402a2.2 2.2 0 0 0 0-4.402" />
											   </svg>
											 </button>
										   </div>
										   <div class="windos_message_content">
											 ${note_content}
										   </div>
										   <div class="windos_timestamp_container">
											 <div class="windos_message_timestamp">
											   ${note_timestamp}
											 </div>
										   </div>`;
										   
				message_block.querySelector(".interactive_block button.pinned_note").addEventListener('click', pinned_note_button_click, false);
				message_block.querySelector(".interactive_block button.more_options").addEventListener('click', more_options_button_click, false);
				
				
				url_note_container.insertBefore(message_block, url_note_container.firstChild);
				//url_note_container.appendChild(message_block);
				display_UrlNotes_copy.push(count_id);
			}
			else{
				const exist_block = url_note_block[count_id];
				
				exist_block.querySelector(".windos_message_content").innerHTML = note_content;
				exist_block.querySelector(".windos_message_timestamp").innerText = note_timestamp;
				
				exist_block.querySelector(".interactive_block button.pinned_note").setAttribute('note_id', count_id);
				exist_block.querySelector(".interactive_block button.pinned_note").classList.remove('is_pinned');
				exist_block.querySelector(".interactive_block button.more_options").setAttribute('note_id', count_id);
				
				display_UrlNotes_copy[count_id] = count_id;
			}
			
			count_id += 1;
		});
		
		if((count_id - priority_count) < url_note_block.length){
			for (var i = (count_id - priority_count); i < url_note_block.length; i++) {
				url_note_block[i].remove();
				//url_note_container.removeChild(url_note_block[i]);
			}
			display_UrlNotes_copy.splice((count_id - priority_count), url_note_block.length - (count_id - priority_count));
		}
	
		priority_note.reverse().forEach(function (message_block) {
			url_note_container.insertBefore(message_block, url_note_container.firstChild);
		});
		
		display_KeywordNotes = keywords_priority.concat(display_UrlNotes_copy.reverse());
		
		is_UrlNoteExist = 2;
	}

	current_EditingEditor[0] = null;
	initial_EditContent[0] = null;
	initial_EditPriority[0] = null;
	initial_EditTimestamp[0] = null;
	
	is_UrlNewNoteEdit = null;
	
	current_Host = currentpage_Host;
	current_Url = currentpage_Url;
}

function refreshSuggestionArea(){
	const suggestion_area = document.getElementById("suggestion_area");
	const suggestion_container = suggestion_area.querySelector(".suggestion_container");
	
	suggestion_container.scrollLeft = 0;
	
	if (is_CurrentPageSearch){
		const keywords = Object.keys(searched_Keywords).slice(0, 10);
		if (keywords.length === 0){
			const suggestion_button = suggestion_container.querySelectorAll(".keyword_suggestion");
			
			suggestion_button.forEach(function (suggestion) {
				suggestion_container.removeChild(suggestion);
			});
			
			const button_block = document.createElement('button');
			button_block.classList.add('keyword_suggestion');
			button_block.setAttribute('keyword', 'none');
									
			button_block.innerText = "該網頁未有關鍵字紀錄";
			suggestion_container.appendChild(button_block);
		}
		else{
			let count_id = 0;
			const suggestion_button = suggestion_container.querySelectorAll(".keyword_suggestion");
			
			keywords.forEach(function (suggestion) {
				if(!suggestion_button[count_id]){
					const button_block = document.createElement('button');
					button_block.classList.add('keyword_suggestion');
					button_block.setAttribute('keyword', suggestion);
											
					button_block.innerText = `${suggestion} ${searched_Keywords[suggestion]}`;
					button_block.addEventListener('click', suggestion_button_click, false);
					suggestion_container.appendChild(button_block);
				}
				else{
					suggestion_button[count_id].innerText = `${suggestion} ${searched_Keywords[suggestion]}`;
					suggestion_button[count_id].setAttribute('keyword', suggestion);
				}
				
				count_id += 1;
			});
			
			if(count_id < suggestion_button.length){
				for (var i = count_id; i < suggestion_button.length; i++) {
					suggestion_container.removeChild(suggestion_button[i]);
				}
			}
		}
	}
	else{
		const keywords = Object.keys(recorded_Keywords).slice(0, 10);
		if (keywords.length === 0){
			const suggestion_button = suggestion_container.querySelectorAll(".keyword_suggestion");
			
			suggestion_button.forEach(function (suggestion) {
				suggestion_container.removeChild(suggestion);
			});
			
			const button_block = document.createElement('button');
			button_block.classList.add('keyword_suggestion');
			button_block.setAttribute('keyword', 'none');
									
			button_block.innerText = "未有關鍵字紀錄";
			suggestion_container.appendChild(button_block);
		}
		else{
			let count_id = 0;
			const suggestion_button = suggestion_container.querySelectorAll(".keyword_suggestion");
			
			keywords.forEach(function (suggestion) {
				if(!suggestion_button[count_id]){
					const button_block = document.createElement('button');
					button_block.classList.add('keyword_suggestion');
					button_block.setAttribute('keyword', suggestion);
											
					button_block.innerText = `${suggestion}`;
					button_block.addEventListener('click', suggestion_button_click, false);
					suggestion_container.appendChild(button_block);
				}
				else{
					suggestion_button[count_id].innerText = `${suggestion}`;
					suggestion_button[count_id].setAttribute('keyword', suggestion);
				}
				
				count_id += 1;
			});
			
			if(count_id < suggestion_button.length){
				for (var i = count_id; i < suggestion_button.length; i++) {
					suggestion_container.removeChild(suggestion_button[i]);
				}
			}
		}
	}
}

function refreshKeywordArea(keyword, keyword_notedata, keywords_priority){
	const keyword_area = document.getElementById("keyword_area");
	
	const host_title = keyword_area.querySelector('span#keyword_note_host');
	host_title.innerText = keyword;
	
	const keyword_note_container = document.getElementById("keyword_note_container");
	
	const keyword_note_block = keyword_note_container.querySelectorAll(".windos_message_block");
	
	current_Keyword = keyword;
	if (keyword_notedata === null){
		const message_block = document.createElement('div');
		message_block.classList.add('windos_message_block');
		
		message_block.innerHTML = `<div class="interactive_block">
								   </div>
								   <div class="windos_message_content">
									 你沒有此關鍵字的筆記喔，<br>
									 趕快紀錄些什麼吧!
								   </div>
								   <div class="windos_timestamp_container">
								     <div class="windos_message_timestamp">
									   設計界面是件痛苦又耗腦細胞的事
								     </div>
								   </div>`
								
		keyword_note_container.innerHTML = "";
		keyword_note_container.appendChild(message_block);
		
		is_KeywordNoteExist = 0;
		display_KeywordNotes = [-1];
	}
	else if (keyword_notedata.length === 0){
		const message_block = document.createElement('div');
		message_block.classList.add('windos_message_block');
		
		message_block.innerHTML = `<div class="interactive_block">
								   </div>
								   <div class="windos_message_content">
									   你還沒有關於此關鍵字的筆記喔，<br>
									   趕快紀錄些什麼吧!
								   </div>
								   <div class="windos_timestamp_container">
								     <div class="windos_message_timestamp">
									   寫程式是件既痛苦又樂在其中的事
								     </div>
								   </div>`;
								
		keyword_note_container.innerHTML = "";
		keyword_note_container.appendChild(message_block);
		
		is_KeywordNoteExist = 1;
		display_KeywordNotes = [-1];
	}
	else{
		let count_id = 0;
		
		if(is_KeywordNoteExist < 2){
			const first_message_interactive_block = keyword_note_block[0].querySelector(".interactive_block");

			first_message_interactive_block.innerHTML = `<button class="pinned_note" note_id="0">
														   <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 20 20">
														     <path fill="currentColor" d="M13.325 2.617a2 2 0 0 0-3.203.52l-1.73 3.459a1.5 1.5 0 0 1-.784.721l-3.59 1.436a1 1 0 0 0-.335 1.636L6.293 13L3 16.292V17h.707L7 13.706l2.61 2.61a1 1 0 0 0 1.636-.335l1.436-3.59a1.5 1.5 0 0 1 .722-.784l3.458-1.73a2 2 0 0 0 .52-3.203z" />
														   </svg>
														 </button>
														 <button class="more_options" note_id="0">
														   <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 20 20">
														     <path fill="currentColor" d="M10.001 7.8a2.2 2.2 0 1 0 0 4.402A2.2 2.2 0 0 0 10 7.8zm0-2.6A2.2 2.2 0 1 0 9.999.8a2.2 2.2 0 0 0 .002 4.4m0 9.6a2.2 2.2 0 1 0 0 4.402a2.2 2.2 0 0 0 0-4.402" />
														   </svg>
														 </button>`;
			
			first_message_interactive_block.querySelector(".interactive_block button.pinned_note").addEventListener('click', pinned_note_button_click, false);
			first_message_interactive_block.querySelector(".interactive_block button.more_options").addEventListener('click', more_options_button_click, false);
			display_KeywordNotes[0] = 0;
		}
		
		let display_KeywordNotes_copy = display_KeywordNotes.reverse();
		
		const priority_note = new Array(keywords_priority.length);
		const priority_count = keywords_priority.length;
		
		keyword_notedata.forEach(function (note_data) {
			const [note_content, note_timestamp, is_pinned] = note_data;
			const priority_note_index = keywords_priority.indexOf(count_id);
			
			if (priority_note_index >= 0){
				const message_block = document.createElement('div');
				message_block.classList.add('windos_message_block');
				
				message_block.innerHTML = `<div class="interactive_block">
											 <button class="pinned_note is_pinned" note_id="${count_id}">
											   <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 20 20">
												 <path fill="currentColor" d="M13.325 2.617a2 2 0 0 0-3.203.52l-1.73 3.459a1.5 1.5 0 0 1-.784.721l-3.59 1.436a1 1 0 0 0-.335 1.636L6.293 13L3 16.292V17h.707L7 13.706l2.61 2.61a1 1 0 0 0 1.636-.335l1.436-3.59a1.5 1.5 0 0 1 .722-.784l3.458-1.73a2 2 0 0 0 .52-3.203z" />
											   </svg>
											 </button>
											 <button class="more_options" note_id="${count_id}">
											   <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 20 20">
												 <path fill="currentColor" d="M10.001 7.8a2.2 2.2 0 1 0 0 4.402A2.2 2.2 0 0 0 10 7.8zm0-2.6A2.2 2.2 0 1 0 9.999.8a2.2 2.2 0 0 0 .002 4.4m0 9.6a2.2 2.2 0 1 0 0 4.402a2.2 2.2 0 0 0 0-4.402" />
											   </svg>
											 </button>
										   </div>
										   <div class="windos_message_content">
											 ${note_content}
										   </div>
										   <div class="windos_timestamp_container">
											 <div class="windos_message_timestamp">
											   ${note_timestamp}
											 </div>
										   </div>`;
										   
				message_block.querySelector(".interactive_block button.pinned_note").addEventListener('click', pinned_note_button_click, false);
				message_block.querySelector(".interactive_block button.more_options").addEventListener('click', more_options_button_click, false);
				
				priority_note[priority_note_index] = message_block;
			}
			else if(!keyword_note_block[count_id]){
				const message_block = document.createElement('div');
				message_block.classList.add('windos_message_block');
				
				message_block.innerHTML = `<div class="interactive_block">
											 <button class="pinned_note" note_id="${count_id}">
											   <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 20 20">
												 <path fill="currentColor" d="M13.325 2.617a2 2 0 0 0-3.203.52l-1.73 3.459a1.5 1.5 0 0 1-.784.721l-3.59 1.436a1 1 0 0 0-.335 1.636L6.293 13L3 16.292V17h.707L7 13.706l2.61 2.61a1 1 0 0 0 1.636-.335l1.436-3.59a1.5 1.5 0 0 1 .722-.784l3.458-1.73a2 2 0 0 0 .52-3.203z" />
											   </svg>
											 </button>
											 <button class="more_options" note_id="${count_id}">
											   <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 20 20">
												 <path fill="currentColor" d="M10.001 7.8a2.2 2.2 0 1 0 0 4.402A2.2 2.2 0 0 0 10 7.8zm0-2.6A2.2 2.2 0 1 0 9.999.8a2.2 2.2 0 0 0 .002 4.4m0 9.6a2.2 2.2 0 1 0 0 4.402a2.2 2.2 0 0 0 0-4.402" />
											   </svg>
											 </button>
										   </div>
										   <div class="windos_message_content">
											   ${note_content}
										   </div>
										   <div class="windos_timestamp_container">
											 <div class="windos_message_timestamp">
											   ${note_timestamp}
											 </div>
										   </div>`;
										   
				message_block.querySelector(".interactive_block button.pinned_note").addEventListener('click', pinned_note_button_click, false);
				message_block.querySelector(".interactive_block button.more_options").addEventListener('click', more_options_button_click, false);
					   
				keyword_note_container.insertBefore(message_block, keyword_note_container.firstChild);
				//keyword_note_container.appendChild(message_block);
				display_KeywordNotes_copy.push(count_id);
			}
			else{
				const exist_block = keyword_note_block[count_id];
				
				exist_block.querySelector(".windos_message_content").innerHTML = note_content;
				exist_block.querySelector(".windos_message_timestamp").innerText = note_timestamp;
				
				exist_block.querySelector(".interactive_block button.pinned_note").setAttribute('note_id', count_id);
				exist_block.querySelector(".interactive_block button.pinned_note").classList.remove('is_pinned');
				exist_block.querySelector(".interactive_block button.more_options").setAttribute('note_id', count_id);
				
				display_KeywordNotes_copy[count_id] = count_id;
			}
			
			count_id += 1;
		});
		
		if((count_id - priority_count) < keyword_note_block.length){
			for (var i = (count_id - priority_count); i < keyword_note_block.length; i++) {
				keyword_note_block[i].remove();
				//keyword_note_container.removeChild(keyword_note_block[i]);
			}
			display_KeywordNotes_copy.splice((count_id - priority_count), keyword_note_block.length - (count_id - priority_count));
		}
		
		priority_note.reverse().forEach(function (message_block) {
			keyword_note_container.insertBefore(message_block, keyword_note_container.firstChild);
		});
		
		display_KeywordNotes = keywords_priority.concat(display_KeywordNotes_copy.reverse());

		is_KeywordNoteExist = 2;
	}

	current_EditingEditor[1] = null;
	initial_EditContent[1] = null;
	initial_EditPriority[1] = null;
	initial_EditTimestamp[1] = null;
	
	is_KeywordNewNoteEdit = null;
}

function afterEditRefreshProcess(note_type, process_state, note_id, save_datetime){
	if (note_type === 'url'){
		const url_note_container = document.getElementById("url_note_container");
		const url_note_block = Array.from(url_note_container.querySelectorAll(".windos_message_block"));
		
		if (process_state){
			if (is_UrlNoteExist < 2){
				const notify_index = display_UrlNotes.indexOf(-1);
				
				url_note_block[notify_index].remove();
				
				url_note_block.splice(notify_index, 1);
				display_UrlNotes.splice(notify_index, 1);
				is_UrlNoteExist = 2;
			}
			
			const note_content = current_EditingEditor[0].getData();
			
			const message_block = document.createElement('div');
			message_block.classList.add('windos_message_block');
			
			let class_tag = "pinned_note";
			if (initial_EditPriority[0]){
				class_tag = "pinned_note is_pinned";
			}
			
			message_block.innerHTML = `<div class="interactive_block">
										 <button class="${class_tag}" note_id="${note_id}">
										   <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 20 20">
											 <path fill="currentColor" d="M13.325 2.617a2 2 0 0 0-3.203.52l-1.73 3.459a1.5 1.5 0 0 1-.784.721l-3.59 1.436a1 1 0 0 0-.335 1.636L6.293 13L3 16.292V17h.707L7 13.706l2.61 2.61a1 1 0 0 0 1.636-.335l1.436-3.59a1.5 1.5 0 0 1 .722-.784l3.458-1.73a2 2 0 0 0 .52-3.203z" />
										   </svg>
										 </button>
										 <button class="more_options" note_id="${note_id}">
										   <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 20 20">
											 <path fill="currentColor" d="M10.001 7.8a2.2 2.2 0 1 0 0 4.402A2.2 2.2 0 0 0 10 7.8zm0-2.6A2.2 2.2 0 1 0 9.999.8a2.2 2.2 0 0 0 .002 4.4m0 9.6a2.2 2.2 0 1 0 0 4.402a2.2 2.2 0 0 0 0-4.402" />
										   </svg>
										 </button>
									   </div>
									   <div class="windos_message_content">
										   ${note_content}
									   </div>
									   <div class="windos_timestamp_container">
										 <div class="windos_message_timestamp">
										   ${save_datetime}
										 </div>
									   </div>`;
									   
			message_block.querySelector(".interactive_block button.pinned_note").addEventListener('click', pinned_note_button_click, false);
			message_block.querySelector(".interactive_block button.more_options").addEventListener('click', more_options_button_click, false);
				   
			const note_index = display_UrlNotes.indexOf('e');
			
			url_note_block[note_index].replaceWith(message_block);
			display_UrlNotes[note_index] = note_id;
			
			current_EditingEditor[0] = null;
			initial_EditContent[0] = null;
			initial_EditTimestamp[0] = null;
			initial_EditPriority[0] = null;
			is_UrlNewNoteEdit = null;
		}
	}
	else if (note_type === 'keyword'){
		const keyword_note_container = document.getElementById("keyword_note_container");
		const keyword_note_block = Array.from(keyword_note_container.querySelectorAll(".windos_message_block"));
		
		if (process_state){
			if (is_KeywordNoteExist < 2){
				const notify_index = display_KeywordNotes.indexOf(-1);
				
				keyword_note_block[notify_index].remove();
				
				keyword_note_block.splice(notify_index, 1);
				display_KeywordNotes.splice(notify_index, 1);
				is_KeywordNoteExist = 2;
			}
			
			const note_content = current_EditingEditor[1].getData();
			
			const message_block = document.createElement('div');
			message_block.classList.add('windos_message_block');
			
			let class_tag = "pinned_note";
			if (initial_EditPriority[1]){
				class_tag = "pinned_note is_pinned";
			}
			
			message_block.innerHTML = `<div class="interactive_block">
										 <button class="${class_tag}" note_id="${note_id}">
										   <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 20 20">
											 <path fill="currentColor" d="M13.325 2.617a2 2 0 0 0-3.203.52l-1.73 3.459a1.5 1.5 0 0 1-.784.721l-3.59 1.436a1 1 0 0 0-.335 1.636L6.293 13L3 16.292V17h.707L7 13.706l2.61 2.61a1 1 0 0 0 1.636-.335l1.436-3.59a1.5 1.5 0 0 1 .722-.784l3.458-1.73a2 2 0 0 0 .52-3.203z" />
										   </svg>
										 </button>
										 <button class="more_options" note_id="${note_id}">
										   <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 20 20">
											 <path fill="currentColor" d="M10.001 7.8a2.2 2.2 0 1 0 0 4.402A2.2 2.2 0 0 0 10 7.8zm0-2.6A2.2 2.2 0 1 0 9.999.8a2.2 2.2 0 0 0 .002 4.4m0 9.6a2.2 2.2 0 1 0 0 4.402a2.2 2.2 0 0 0 0-4.402" />
										   </svg>
										 </button>
									   </div>
									   <div class="windos_message_content">
										   ${note_content}
									   </div>
									   <div class="windos_timestamp_container">
										 <div class="windos_message_timestamp">
										   ${save_datetime}
										 </div>
									   </div>`;
									   
			message_block.querySelector(".interactive_block button.pinned_note").addEventListener('click', pinned_note_button_click, false);
			message_block.querySelector(".interactive_block button.more_options").addEventListener('click', more_options_button_click, false);
				
			const note_index = display_KeywordNotes.indexOf('e');
			
			keyword_note_block[note_index].replaceWith(message_block);
			display_KeywordNotes[note_index] = note_id;
			
			current_EditingEditor[1] = null;
			initial_EditContent[1] = null;
			initial_EditTimestamp[1] = null;
			initial_EditPriority[1] = null;
			is_KeywordNewNoteEdit = null;
		}
	}
}

function afterDeleteRefreshProcess(note_type, process_state, target_id){
	if (note_type === 'url'){
		const url_note_container = document.getElementById("url_note_container");
		const url_note_block = url_note_container.querySelectorAll(".windos_message_block");
		
		if (process_state){
			let count_index = 0
			url_note_block.forEach(function (message_block) {
				const note_id = parseInt(message_block.querySelector(".interactive_block button.more_options").getAttribute('note_id'));
				
				if (target_id < note_id){
					message_block.querySelector(".interactive_block button.pinned_note").setAttribute('note_id', (note_id - 1));
					message_block.querySelector(".interactive_block button.more_options").setAttribute('note_id', (note_id - 1));
					
					display_UrlNotes[count_index] = note_id - 1;
				}
				else if (target_id === note_id){
					message_block.remove();
				}
			});
			
			if (target_id == 0){
				const message_block = document.createElement('div');
				message_block.classList.add('windos_message_block');
				
				message_block.innerHTML = `<div class="interactive_block">
										   </div>
										   <div class="windos_message_content">
											 你還沒有在此網域的筆記喔，<br>
											 趕快紀錄些什麼吧!
										   </div>
										   <div class="windos_timestamp_container">
											 <div class="windos_message_timestamp">
											   寫程式是件既痛苦又樂在其中的事
											 </div>
										   </div>`;
										
				url_note_container.innerHTML = "";
				url_note_container.appendChild(message_block);
				
				is_UrlNoteExist = 1;
				display_UrlNotes = [-1];
			}
			
			const delete_index = display_UrlNotes.indexOf(target_id);
			display_UrlNotes.splice(delete_index, 1);
		}
	}
	else if (note_type === 'keyword'){
		const keyword_note_container = document.getElementById("keyword_note_container");
		const keyword_note_block = keyword_note_container.querySelectorAll(".windos_message_block");
		
		if (process_state){
			let count_index = 0
			keyword_note_block.forEach(function (message_block) {
				const note_id = parseInt(message_block.querySelector(".interactive_block button.more_options").getAttribute('note_id'));
				
				if (target_id < note_id){
					message_block.querySelector(".interactive_block button.pinned_note").setAttribute('note_id', (note_id - 1));
					message_block.querySelector(".interactive_block button.more_options").setAttribute('note_id', (note_id - 1));
					
					display_KeywordNotes[count_index] = note_id - 1;
				}
				else if (target_id === note_id){
					message_block.remove();
				}
			});
			
			if (target_id == 0){
				const message_block = document.createElement('div');
				message_block.classList.add('windos_message_block');
				
				message_block.innerHTML = `<div class="interactive_block">
										   </div>
										   <div class="windos_message_content">
											   你還沒有關於此關鍵字的筆記喔，<br>
											   趕快紀錄些什麼吧!
										   </div>
										   <div class="windos_timestamp_container">
											 <div class="windos_message_timestamp">
											   寫程式是件既痛苦又樂在其中的事
											 </div>
										   </div>`;
										
				keyword_note_container.innerHTML = "";
				keyword_note_container.appendChild(message_block);
				
				is_KeywordNoteExist = 1;
				display_KeywordNotes = [-1];
			}
			
			const delete_index = display_KeywordNotes.indexOf(target_id);
			display_KeywordNotes.splice(delete_index, 1);
		}
	}
}

function afterPinRefreshProcess(note_type, process_state, target_id){
	if (note_type === 'url'){
		const url_note_container = document.getElementById("url_note_container");
		const url_note_block = url_note_container.querySelectorAll(".windos_message_block");
		
		if (process_state){
			const note_index = display_UrlNotes.indexOf(target_id);
			
			url_note_block[note_index].querySelector('button.pinned_note').classList.toggle("is_pinned");
		}
	}
	else if (note_type === 'keyword'){
		const keyword_note_container = document.getElementById("keyword_note_container");
		const keyword_note_block = Array.from(keyword_note_container.querySelectorAll(".windos_message_block"));
		
		if (process_state){
			const note_index = display_KeywordNotes.indexOf(target_id);
			
			keyword_note_block[note_index].querySelector('button.pinned_note').classList.toggle("is_pinned");
		}
	}
}

function confirmNotificationMessage(message, type, senddata){
	const options = {
	  type: "basic",
	  iconUrl: "../images/icon.png",
	  title: "! 執行動作前確認",
	  message: message
	};
	
	switch (type) {
		case 'delete':
			options.title = "! 執行刪除確認";
			options.buttons = [{
				title: "確認刪除"
			}, {
				title: "取消刪除"
			}];
			break;
		case 'reconnect':
			options.title = "! 重新連線背景程式";
			options.buttons = [{
				title: "重新連線"
			}, {
				title: "關閉側邊欄"
			}];
			break;
		default:
			options.title = "! 執行動作前確認";
			options.buttons = [{
				title: "確認動作"
			}, {
				title: "取消動作"
			}];
	}
	
	chrome.notifications.create(options, function(notificationId) {
		confirmnotifications_data[notificationId] = senddata;
		
		setTimeout(() => {
			if (Boolean(confirmnotifications_data[notificationId])) {
				delete confirmnotifications_data[notificationId];
				
				chrome.notifications.clear(notificationId, (wasCleared) => {});
			}
		}, 10000);
	});
}

// ====== 元素事件 ====== 
function triggerAlertWindow(message, type){
	notification = {
		event_name: 'send-notification-message',
		message: message,
		notification_type: type
	};
	
	chrome.runtime.sendMessage(notification, (t) => {});
}

// --- message block buttons ---
function pinned_note_button_click(event){
	const pin_button = event.target.closest('.pinned_note');
	const note_id = parseInt(pin_button.getAttribute('note_id'));
	const trigger_type = event.target.closest('.windos_message_container').id;
	
	if (trigger_type === 'url_note_container'){
		const host = current_Host;
		
		if (pin_button.classList.contains("is_pinned")){
			const send_url_note_unpin = {
				event_name: 'send-url-note-unpin',
				host: host,
				note_id: note_id
			};
			chrome.runtime.sendMessage(send_url_note_unpin, (t) => {});
		}
		else{
			const send_url_note_pin = {
				event_name: 'send-url-note-pin',
				host: host,
				note_id: note_id
			};
			chrome.runtime.sendMessage(send_url_note_pin, (t) => {});
		}
	}
	else if (trigger_type === 'keyword_note_container'){
		const keyword = current_Keyword;
		
		if (pin_button.classList.contains("is_pinned")){
			const send_keyword_note_unpin = {
				event_name: 'send-keyword-note-unpin',
				keyword: keyword,
				note_id: note_id
			};
			chrome.runtime.sendMessage(send_keyword_note_unpin, (t) => {});
		}
		else{
			const send_keyword_note_pin = {
				event_name: 'send-keyword-note-pin',
				keyword: keyword,
				note_id: note_id
			};
			chrome.runtime.sendMessage(send_keyword_note_pin, (t) => {});
		}
	}
}
function more_options_button_click(event){
	const levitate_options_popup = document.getElementById("more_options_popup");
	
	const x = event.clientX;
	const y = event.clientY;
	
	more_options_popup.style.left = `${x - 145}px`;
	more_options_popup.style.top = `${y - 5}px`;
	
	const note_id = parseInt(event.target.closest('.more_options').getAttribute('note_id'));
	const trigger_type = event.target.closest('.windos_message_container').id;
	
	more_options_popup.setAttribute('note_id', note_id);
	if (trigger_type === 'url_note_container'){
		more_options_popup.setAttribute('trigger_type', 'url');
	}
	else if (trigger_type === 'keyword_note_container'){
		more_options_popup.setAttribute('trigger_type', 'keyword');
	}
	
	more_options_popup.classList.add('popup_show');
}
function more_editoptions_button_click(event){
	const edit_options_popup = document.getElementById("edit_options_popup");
	
	const x = event.clientX;
	const y = event.clientY;
	
	edit_options_popup.style.left = `${x - 155}px`;
	edit_options_popup.style.top = `${y + 5}px`;
	
	const note_id = parseInt(event.target.closest('.more_options').getAttribute('note_id'));
	const trigger_type = event.target.closest('.windos_message_container').id;
	
	edit_options_popup.setAttribute('note_id', note_id);
	if (trigger_type === 'url_note_container'){
		edit_options_popup.setAttribute('trigger_type', 'url');
	}
	else if (trigger_type === 'keyword_note_container'){
		edit_options_popup.setAttribute('trigger_type', 'keyword');
	}
	
	edit_options_popup.classList.add('popup_show');
}

// --- title area title buttons ---
function url_new_note_button_click(event){
	if (is_UrlNewNoteEdit != null){
		triggerAlertWindow('您仍有正在編輯的筆記\n請先儲存正在編輯的筆記再執行本操作', 'warning');
		return;
	}
	
	const url_note_container = document.getElementById("url_note_container");
	const url_note_block = url_note_container.querySelectorAll(".windos_message_block");
	const count_id = (is_UrlNoteExist < 2) ? (url_note_block.length - 1) : (url_note_block.length);
	
	const message_block = document.createElement('div');
	message_block.classList.add('windos_message_block');
	
	message_block.innerHTML = `<div class="interactive_block edit">
								 <button class="more_options" note_id="${count_id}">
								   <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 20 20">
									 <path fill="currentColor" d="M10.001 7.8a2.2 2.2 0 1 0 0 4.402A2.2 2.2 0 0 0 10 7.8zm0-2.6A2.2 2.2 0 1 0 9.999.8a2.2 2.2 0 0 0 .002 4.4m0 9.6a2.2 2.2 0 1 0 0 4.402a2.2 2.2 0 0 0 0-4.402" />
								   </svg>
								 </button>
							   </div>
							   <div class="windos_content_editor"></div>
							   <div class="windos_timestamp_container">
								 <div class="windos_message_timestamp">
								   Powered by
								   <svg class="ck ck-icon ck-reset_all-excluded" viewBox="0 0 53 10" style="width: 53px; height: 10px;"><path fill="#1C2331" d="M31.724 1.492a15.139 15.139 0 0 0 .045 1.16 2.434 2.434 0 0 0-.687-.34 3.68 3.68 0 0 0-1.103-.166 2.332 2.332 0 0 0-1.14.255 1.549 1.549 0 0 0-.686.87c-.15.41-.225.98-.225 1.712 0 .939.148 1.659.444 2.161.297.503.792.754 1.487.754.452.015.9-.094 1.294-.316.296-.174.557-.4.771-.669l.14.852h1.282V.007h-1.623v1.485ZM31 6.496a1.77 1.77 0 0 1-.494.061.964.964 0 0 1-.521-.127.758.758 0 0 1-.296-.466 3.984 3.984 0 0 1-.093-.992 4.208 4.208 0 0 1 .098-1.052.753.753 0 0 1 .307-.477 1.08 1.08 0 0 1 .55-.122c.233-.004.466.026.69.089l.483.144v2.553c-.11.076-.213.143-.307.2a1.73 1.73 0 0 1-.417.189ZM35.68 0l-.702.004c-.322.002-.482.168-.48.497l.004.581c.002.33.164.493.486.49l.702-.004c.322-.002.481-.167.48-.496L36.165.49c-.002-.33-.164-.493-.486-.491ZM36.145 2.313l-1.612.01.034 5.482 1.613-.01-.035-5.482ZM39.623.79 37.989.8 38 2.306l-.946.056.006 1.009.949-.006.024 2.983c.003.476.143.844.419 1.106.275.26.658.39 1.148.387.132 0 .293-.01.483-.03.19-.02.38-.046.57-.08.163-.028.324-.068.482-.119l-.183-1.095-.702.004a.664.664 0 0 1-.456-.123.553.553 0 0 1-.14-.422l-.016-2.621 1.513-.01-.006-1.064-1.514.01-.01-1.503ZM46.226 2.388c-.41-.184-.956-.274-1.636-.27-.673.004-1.215.101-1.627.29-.402.179-.72.505-.888.91-.18.419-.268.979-.264 1.68.004.688.1 1.24.285 1.655.172.404.495.724.9.894.414.18.957.268 1.63.264.68-.004 1.224-.099 1.632-.284.4-.176.714-.501.878-.905.176-.418.263-.971.258-1.658-.004-.702-.097-1.261-.28-1.677a1.696 1.696 0 0 0-.888-.9Zm-.613 3.607a.77.77 0 0 1-.337.501 1.649 1.649 0 0 1-1.317.009.776.776 0 0 1-.343-.497 4.066 4.066 0 0 1-.105-1.02 4.136 4.136 0 0 1 .092-1.03.786.786 0 0 1 .337-.507 1.59 1.59 0 0 1 1.316-.008.79.79 0 0 1 .344.502c.078.337.113.683.105 1.03.012.343-.019.685-.092 1.02ZM52.114 2.07a2.67 2.67 0 0 0-1.128.278c-.39.191-.752.437-1.072.73l-.157-.846-1.273.008.036 5.572 1.623-.01-.024-3.78c.35-.124.646-.22.887-.286.26-.075.53-.114.8-.118l.45-.003.144-1.546-.286.001ZM22.083 7.426l-1.576-2.532a2.137 2.137 0 0 0-.172-.253 1.95 1.95 0 0 0-.304-.29.138.138 0 0 1 .042-.04 1.7 1.7 0 0 0 .328-.374l1.75-2.71c.01-.015.025-.028.024-.048-.01-.01-.021-.007-.031-.007L20.49 1.17a.078.078 0 0 0-.075.045l-.868 1.384c-.23.366-.46.732-.688 1.099a.108.108 0 0 1-.112.06c-.098-.005-.196-.001-.294-.002-.018 0-.038.006-.055-.007.002-.02.002-.039.005-.058a4.6 4.6 0 0 0 .046-.701V1.203c0-.02-.009-.032-.03-.03h-.033L16.93 1.17c-.084 0-.073-.01-.073.076v6.491c-.001.018.006.028.025.027h1.494c.083 0 .072.007.072-.071v-2.19c0-.055-.003-.11-.004-.166a3.366 3.366 0 0 0-.05-.417h.06c.104 0 .209.002.313-.002a.082.082 0 0 1 .084.05c.535.913 1.07 1.824 1.607 2.736a.104.104 0 0 0 .103.062c.554-.003 1.107-.002 1.66-.002l.069-.003-.019-.032-.188-.304ZM27.112 6.555c-.005-.08-.004-.08-.082-.08h-2.414c-.053 0-.106-.003-.159-.011a.279.279 0 0 1-.246-.209.558.558 0 0 1-.022-.15c0-.382 0-.762-.002-1.143 0-.032.007-.049.042-.044h2.504c.029.003.037-.012.034-.038V3.814c0-.089.013-.078-.076-.078h-2.44c-.07 0-.062.003-.062-.06v-.837c0-.047.004-.093.013-.14a.283.283 0 0 1 .241-.246.717.717 0 0 1 .146-.011h2.484c.024.002.035-.009.036-.033l.003-.038.03-.496c.01-.183.024-.365.034-.548.005-.085.003-.087-.082-.094-.218-.018-.437-.038-.655-.05a17.845 17.845 0 0 0-.657-.026 72.994 72.994 0 0 0-1.756-.016 1.7 1.7 0 0 0-.471.064 1.286 1.286 0 0 0-.817.655c-.099.196-.149.413-.145.633v3.875c0 .072.003.144.011.216a1.27 1.27 0 0 0 .711 1.029c.228.113.48.167.734.158.757-.005 1.515.002 2.272-.042.274-.016.548-.034.82-.053.03-.002.043-.008.04-.041-.008-.104-.012-.208-.019-.312a69.964 69.964 0 0 1-.05-.768ZM16.14 7.415l-.127-1.075c-.004-.03-.014-.04-.044-.037a13.125 13.125 0 0 1-.998.073c-.336.01-.672.02-1.008.016-.116-.001-.233-.014-.347-.039a.746.746 0 0 1-.45-.262c-.075-.1-.132-.211-.167-.33a3.324 3.324 0 0 1-.126-.773 9.113 9.113 0 0 1-.015-.749c0-.285.022-.57.065-.852.023-.158.066-.312.127-.46a.728.728 0 0 1 .518-.443 1.64 1.64 0 0 1 .397-.048c.628-.001 1.255.003 1.882.05.022.001.033-.006.036-.026l.003-.031.06-.55c.019-.177.036-.355.057-.532.004-.034-.005-.046-.04-.056a5.595 5.595 0 0 0-1.213-.21 10.783 10.783 0 0 0-.708-.02c-.24-.003-.48.01-.719.041a3.477 3.477 0 0 0-.625.14 1.912 1.912 0 0 0-.807.497c-.185.2-.33.433-.424.688a4.311 4.311 0 0 0-.24 1.096c-.031.286-.045.572-.042.86-.006.43.024.86.091 1.286.04.25.104.497.193.734.098.279.26.53.473.734.214.205.473.358.756.446.344.11.702.17 1.063.177a8.505 8.505 0 0 0 1.578-.083 6.11 6.11 0 0 0 .766-.18c.03-.008.047-.023.037-.057a.157.157 0 0 1-.003-.025Z"></path><path fill="#AFE229" d="M6.016 6.69a1.592 1.592 0 0 0-.614.21c-.23.132-.422.32-.56.546-.044.072-.287.539-.287.539l-.836 1.528.009.006c.038.025.08.046.123.063.127.046.26.07.395.073.505.023 1.011-.007 1.517-.003.29.009.58.002.869-.022a.886.886 0 0 0 .395-.116.962.962 0 0 0 .312-.286c.056-.083.114-.163.164-.249.24-.408.48-.816.718-1.226.075-.128.148-.257.222-.386l.112-.192a1.07 1.07 0 0 0 .153-.518l-1.304.023s-1.258-.005-1.388.01Z"></path><path fill="#771BFF" d="m2.848 9.044.76-1.39.184-.352c-.124-.067-.245-.14-.367-.21-.346-.204-.706-.384-1.045-.6a.984.984 0 0 1-.244-.207c-.108-.134-.136-.294-.144-.46-.021-.409-.002-.818-.009-1.227-.003-.195 0-.39.003-.585.004-.322.153-.553.427-.713l.833-.488c.22-.13.44-.257.662-.385.05-.029.105-.052.158-.077.272-.128.519-.047.76.085l.044.028c.123.06.242.125.358.196.318.178.635.357.952.537.095.056.187.117.275.184.194.144.254.35.266.578.016.284.007.569.006.853-.001.28.004.558 0 .838.592-.003 1.259 0 1.259 0l.723-.013c-.003-.292-.007-.584-.007-.876 0-.524.015-1.048-.016-1.571-.024-.42-.135-.8-.492-1.067a5.02 5.02 0 0 0-.506-.339A400.52 400.52 0 0 0 5.94.787C5.722.664 5.513.524 5.282.423 5.255.406 5.228.388 5.2.373 4.758.126 4.305-.026 3.807.21c-.097.046-.197.087-.29.14A699.896 699.896 0 0 0 .783 1.948c-.501.294-.773.717-.778 1.31-.004.36-.009.718-.001 1.077.016.754-.017 1.508.024 2.261.016.304.07.6.269.848.127.15.279.28.448.382.622.4 1.283.734 1.92 1.11l.183.109Z"></path></svg>
								 </div>
							   </div>`;
							   
	url_note_container.insertBefore(message_block, url_note_container.firstChild);
	display_UrlNotes.splice(0, 0, 'e');
	//url_note_container.appendChild(message_block);
	
	const BalloonEditor = window.BalloonEditor;
	
	BalloonEditor.create(message_block.querySelector('div.windos_content_editor'), {
			placeholder: 'Enter new note here'
		})
		.then( editor => {
			function windos_message_KeyPress(e) {
				var evtobj = window.event? event : e
				if (evtobj.keyCode == 83 && evtobj.ctrlKey){
					event.preventDefault();
					editor_ctrlS_press(0);//儲存
					
				}
			}
			
			editor.onkeydown = windos_message_KeyPress;
			current_EditingEditor[0] = editor;
		} )
		.catch( error => {
			console.error( error );
		} );
	
	message_block.querySelector(".interactive_block button.more_options").addEventListener('click', more_editoptions_button_click, false);
				
	//url_note_container.scrollTop = url_note_container.scrollHeight;
	keyword_note_container.scrollTop = 0;
	is_UrlNewNoteEdit = count_id;
}
function url_delete_button_click(event){
	const host = current_Host;
		
	const send_url_note_delete = {
		notification_type: 'message',
		event_name: 'send-url-note-delete',
		host: host
	};
	confirmNotificationMessage("你正在刪除與一個網址索引\n刪除後是無法找回該關鍵字相關聯的筆記\n是否繼續動作 ?", 'delete', send_url_note_delete);
}

// --- suggestion area keyword buttons ---
function suggestion_button_click(event){
	const trigger_keyword = event.target.closest('.keyword_suggestion').getAttribute('keyword');
	
	if (trigger_keyword === 'none'){
		return;
	}
	
	if (!(current_Keyword === trigger_keyword)){
		chrome.runtime.sendMessage({event_name: 'quest-keyword-notedata-sidepanel', keyword: trigger_keyword}, (t) => {});
		current_Keyword = trigger_keyword;
	}
}
function more_suggestion_button_click(event){
	const more_suggestion_button_position = event.target.closest('button#more_suggestion').getBoundingClientRect() 
	
	const all_suggestion_popup = document.getElementById("all_suggestion_popup");
	const popup_suggestion_container = all_suggestion_popup.querySelector(".popup_suggestion_container");
	
	all_suggestion_popup.style.top = `${more_suggestion_button_position.top + 45}px`;
	
	let count_id = 0;
	const suggestion_button = popup_suggestion_container.querySelectorAll(".keyword_suggestion");
	const keywords = Object.keys(recorded_Keywords);
	
	keywords.forEach(function (suggestion) {
		if(!suggestion_button[count_id]){
			const button_block = document.createElement('button');
			button_block.classList.add('keyword_suggestion');
			button_block.setAttribute('keyword', suggestion);
									
			button_block.innerText = `${suggestion}`;
			button_block.addEventListener('click', suggestion_button_click, false);
			popup_suggestion_container.appendChild(button_block);
		}
		else{
			suggestion_button[count_id].innerText = `${suggestion}`;
			suggestion_button[count_id].setAttribute('keyword', suggestion);
		}
		
		count_id += 1;
	});
	
	if(count_id < suggestion_button.length){
		for (var i = count_id; i < suggestion_button.length; i++) {
			popup_suggestion_container.removeChild(suggestion_button[i]);
		}
	}
	
	all_suggestion_popup.classList.add('popup_show');
}

// --- keyword area title buttons ---
function keyword_previous_mark_button_click(event){
	if (is_CurrentPageSearch){
		chrome.tabs.sendMessage(currentpage_TabId, {event_name: 'keyword-previous-mark', target_keyword: current_Keyword}, (t) => {});
	}
}
function keyword_next_mark_button_click(event){
	if (is_CurrentPageSearch){
		chrome.tabs.sendMessage(currentpage_TabId, {event_name: 'keyword-next-mark', target_keyword: current_Keyword}, (t) => {});
	}
}
function keyword_new_note_button_click(event){
	if (is_KeywordNewNoteEdit != null){
		triggerAlertWindow('您仍有正在編輯的筆記\n請先儲存正在編輯的筆記再執行本操作', 'warning');
		return;
	}
	
	const keyword_note_container = document.getElementById("keyword_note_container");
	const keyword_note_block = keyword_note_container.querySelectorAll(".windos_message_block");
	const count_id = (is_KeywordNoteExist < 2) ? (keyword_note_block.length - 1) : (keyword_note_block.length);
	
	const message_block = document.createElement('div');
	message_block.classList.add('windos_message_block');
	
	message_block.innerHTML = `<div class="interactive_block edit">
								 <button class="more_options" note_id="${count_id}">
								   <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 20 20">
									 <path fill="currentColor" d="M10.001 7.8a2.2 2.2 0 1 0 0 4.402A2.2 2.2 0 0 0 10 7.8zm0-2.6A2.2 2.2 0 1 0 9.999.8a2.2 2.2 0 0 0 .002 4.4m0 9.6a2.2 2.2 0 1 0 0 4.402a2.2 2.2 0 0 0 0-4.402" />
								   </svg>
								 </button>
							   </div>
							   <div class="windos_content_editor"></div>
							   <div class="windos_timestamp_container">
								 <div class="windos_message_timestamp">
								   Powered by
								   <svg class="ck ck-icon ck-reset_all-excluded" viewBox="0 0 53 10" style="width: 53px; height: 10px;"><path fill="#1C2331" d="M31.724 1.492a15.139 15.139 0 0 0 .045 1.16 2.434 2.434 0 0 0-.687-.34 3.68 3.68 0 0 0-1.103-.166 2.332 2.332 0 0 0-1.14.255 1.549 1.549 0 0 0-.686.87c-.15.41-.225.98-.225 1.712 0 .939.148 1.659.444 2.161.297.503.792.754 1.487.754.452.015.9-.094 1.294-.316.296-.174.557-.4.771-.669l.14.852h1.282V.007h-1.623v1.485ZM31 6.496a1.77 1.77 0 0 1-.494.061.964.964 0 0 1-.521-.127.758.758 0 0 1-.296-.466 3.984 3.984 0 0 1-.093-.992 4.208 4.208 0 0 1 .098-1.052.753.753 0 0 1 .307-.477 1.08 1.08 0 0 1 .55-.122c.233-.004.466.026.69.089l.483.144v2.553c-.11.076-.213.143-.307.2a1.73 1.73 0 0 1-.417.189ZM35.68 0l-.702.004c-.322.002-.482.168-.48.497l.004.581c.002.33.164.493.486.49l.702-.004c.322-.002.481-.167.48-.496L36.165.49c-.002-.33-.164-.493-.486-.491ZM36.145 2.313l-1.612.01.034 5.482 1.613-.01-.035-5.482ZM39.623.79 37.989.8 38 2.306l-.946.056.006 1.009.949-.006.024 2.983c.003.476.143.844.419 1.106.275.26.658.39 1.148.387.132 0 .293-.01.483-.03.19-.02.38-.046.57-.08.163-.028.324-.068.482-.119l-.183-1.095-.702.004a.664.664 0 0 1-.456-.123.553.553 0 0 1-.14-.422l-.016-2.621 1.513-.01-.006-1.064-1.514.01-.01-1.503ZM46.226 2.388c-.41-.184-.956-.274-1.636-.27-.673.004-1.215.101-1.627.29-.402.179-.72.505-.888.91-.18.419-.268.979-.264 1.68.004.688.1 1.24.285 1.655.172.404.495.724.9.894.414.18.957.268 1.63.264.68-.004 1.224-.099 1.632-.284.4-.176.714-.501.878-.905.176-.418.263-.971.258-1.658-.004-.702-.097-1.261-.28-1.677a1.696 1.696 0 0 0-.888-.9Zm-.613 3.607a.77.77 0 0 1-.337.501 1.649 1.649 0 0 1-1.317.009.776.776 0 0 1-.343-.497 4.066 4.066 0 0 1-.105-1.02 4.136 4.136 0 0 1 .092-1.03.786.786 0 0 1 .337-.507 1.59 1.59 0 0 1 1.316-.008.79.79 0 0 1 .344.502c.078.337.113.683.105 1.03.012.343-.019.685-.092 1.02ZM52.114 2.07a2.67 2.67 0 0 0-1.128.278c-.39.191-.752.437-1.072.73l-.157-.846-1.273.008.036 5.572 1.623-.01-.024-3.78c.35-.124.646-.22.887-.286.26-.075.53-.114.8-.118l.45-.003.144-1.546-.286.001ZM22.083 7.426l-1.576-2.532a2.137 2.137 0 0 0-.172-.253 1.95 1.95 0 0 0-.304-.29.138.138 0 0 1 .042-.04 1.7 1.7 0 0 0 .328-.374l1.75-2.71c.01-.015.025-.028.024-.048-.01-.01-.021-.007-.031-.007L20.49 1.17a.078.078 0 0 0-.075.045l-.868 1.384c-.23.366-.46.732-.688 1.099a.108.108 0 0 1-.112.06c-.098-.005-.196-.001-.294-.002-.018 0-.038.006-.055-.007.002-.02.002-.039.005-.058a4.6 4.6 0 0 0 .046-.701V1.203c0-.02-.009-.032-.03-.03h-.033L16.93 1.17c-.084 0-.073-.01-.073.076v6.491c-.001.018.006.028.025.027h1.494c.083 0 .072.007.072-.071v-2.19c0-.055-.003-.11-.004-.166a3.366 3.366 0 0 0-.05-.417h.06c.104 0 .209.002.313-.002a.082.082 0 0 1 .084.05c.535.913 1.07 1.824 1.607 2.736a.104.104 0 0 0 .103.062c.554-.003 1.107-.002 1.66-.002l.069-.003-.019-.032-.188-.304ZM27.112 6.555c-.005-.08-.004-.08-.082-.08h-2.414c-.053 0-.106-.003-.159-.011a.279.279 0 0 1-.246-.209.558.558 0 0 1-.022-.15c0-.382 0-.762-.002-1.143 0-.032.007-.049.042-.044h2.504c.029.003.037-.012.034-.038V3.814c0-.089.013-.078-.076-.078h-2.44c-.07 0-.062.003-.062-.06v-.837c0-.047.004-.093.013-.14a.283.283 0 0 1 .241-.246.717.717 0 0 1 .146-.011h2.484c.024.002.035-.009.036-.033l.003-.038.03-.496c.01-.183.024-.365.034-.548.005-.085.003-.087-.082-.094-.218-.018-.437-.038-.655-.05a17.845 17.845 0 0 0-.657-.026 72.994 72.994 0 0 0-1.756-.016 1.7 1.7 0 0 0-.471.064 1.286 1.286 0 0 0-.817.655c-.099.196-.149.413-.145.633v3.875c0 .072.003.144.011.216a1.27 1.27 0 0 0 .711 1.029c.228.113.48.167.734.158.757-.005 1.515.002 2.272-.042.274-.016.548-.034.82-.053.03-.002.043-.008.04-.041-.008-.104-.012-.208-.019-.312a69.964 69.964 0 0 1-.05-.768ZM16.14 7.415l-.127-1.075c-.004-.03-.014-.04-.044-.037a13.125 13.125 0 0 1-.998.073c-.336.01-.672.02-1.008.016-.116-.001-.233-.014-.347-.039a.746.746 0 0 1-.45-.262c-.075-.1-.132-.211-.167-.33a3.324 3.324 0 0 1-.126-.773 9.113 9.113 0 0 1-.015-.749c0-.285.022-.57.065-.852.023-.158.066-.312.127-.46a.728.728 0 0 1 .518-.443 1.64 1.64 0 0 1 .397-.048c.628-.001 1.255.003 1.882.05.022.001.033-.006.036-.026l.003-.031.06-.55c.019-.177.036-.355.057-.532.004-.034-.005-.046-.04-.056a5.595 5.595 0 0 0-1.213-.21 10.783 10.783 0 0 0-.708-.02c-.24-.003-.48.01-.719.041a3.477 3.477 0 0 0-.625.14 1.912 1.912 0 0 0-.807.497c-.185.2-.33.433-.424.688a4.311 4.311 0 0 0-.24 1.096c-.031.286-.045.572-.042.86-.006.43.024.86.091 1.286.04.25.104.497.193.734.098.279.26.53.473.734.214.205.473.358.756.446.344.11.702.17 1.063.177a8.505 8.505 0 0 0 1.578-.083 6.11 6.11 0 0 0 .766-.18c.03-.008.047-.023.037-.057a.157.157 0 0 1-.003-.025Z"></path><path fill="#AFE229" d="M6.016 6.69a1.592 1.592 0 0 0-.614.21c-.23.132-.422.32-.56.546-.044.072-.287.539-.287.539l-.836 1.528.009.006c.038.025.08.046.123.063.127.046.26.07.395.073.505.023 1.011-.007 1.517-.003.29.009.58.002.869-.022a.886.886 0 0 0 .395-.116.962.962 0 0 0 .312-.286c.056-.083.114-.163.164-.249.24-.408.48-.816.718-1.226.075-.128.148-.257.222-.386l.112-.192a1.07 1.07 0 0 0 .153-.518l-1.304.023s-1.258-.005-1.388.01Z"></path><path fill="#771BFF" d="m2.848 9.044.76-1.39.184-.352c-.124-.067-.245-.14-.367-.21-.346-.204-.706-.384-1.045-.6a.984.984 0 0 1-.244-.207c-.108-.134-.136-.294-.144-.46-.021-.409-.002-.818-.009-1.227-.003-.195 0-.39.003-.585.004-.322.153-.553.427-.713l.833-.488c.22-.13.44-.257.662-.385.05-.029.105-.052.158-.077.272-.128.519-.047.76.085l.044.028c.123.06.242.125.358.196.318.178.635.357.952.537.095.056.187.117.275.184.194.144.254.35.266.578.016.284.007.569.006.853-.001.28.004.558 0 .838.592-.003 1.259 0 1.259 0l.723-.013c-.003-.292-.007-.584-.007-.876 0-.524.015-1.048-.016-1.571-.024-.42-.135-.8-.492-1.067a5.02 5.02 0 0 0-.506-.339A400.52 400.52 0 0 0 5.94.787C5.722.664 5.513.524 5.282.423 5.255.406 5.228.388 5.2.373 4.758.126 4.305-.026 3.807.21c-.097.046-.197.087-.29.14A699.896 699.896 0 0 0 .783 1.948c-.501.294-.773.717-.778 1.31-.004.36-.009.718-.001 1.077.016.754-.017 1.508.024 2.261.016.304.07.6.269.848.127.15.279.28.448.382.622.4 1.283.734 1.92 1.11l.183.109Z"></path></svg>
								 </div>
							   </div>`;
							   
	keyword_note_container.insertBefore(message_block, keyword_note_container.firstChild);
	display_KeywordNotes.splice(0, 0, 'e');
	//keyword_note_container.appendChild(message_block);
	
	const BalloonEditor = window.BalloonEditor;
	
	BalloonEditor.create(message_block.querySelector('div.windos_content_editor'), {
			placeholder: 'Enter new note here'
		})
		.then( editor => {
			function windos_message_KeyPress(e) {
				var evtobj = window.event? event : e
				if (evtobj.keyCode == 83 && evtobj.ctrlKey){
					event.preventDefault();
					editor_ctrlS_press(1);//儲存
				}
			}
			
			message_block.querySelector('div.windos_content_editor').onkeydown = windos_message_KeyPress;
			current_EditingEditor[1] = editor;
		} )
		.catch( error => {
			console.error( error );
		} );
	
	message_block.querySelector(".interactive_block button.more_options").addEventListener('click', more_editoptions_button_click, false);
				
	//keyword_note_container.scrollTop = keyword_note_container.scrollHeight;
	keyword_note_container.scrollTop = 0;
	is_KeywordNewNoteEdit = count_id;
}
function keyword_delete_button_click(event){
	const keyword = current_Keyword;

	const send_keyword_note_delete = {
		notification_type: 'message',
		event_name: 'send-keyword-note-delete',
		keyword: keyword
	};
	confirmNotificationMessage("你正在刪除與一個關鍵字索引\n刪除後是無法找回該關鍵字相關聯的筆記\n是否繼續動作 ?", 'delete', send_keyword_note_delete);
}

// --- more_options_popup buttons ---
function options_edit_button_click(event){
	const more_options_popup = event.target.closest('.levitate_options_popup');
	const trigger_type = more_options_popup.getAttribute('trigger_type');
	const note_id = parseInt(more_options_popup.getAttribute('note_id'));
	
	const message_block = document.createElement('div');
	message_block.classList.add('windos_message_block');
	
	if (trigger_type === 'url'){
		if (is_UrlNewNoteEdit != null){
			triggerAlertWindow('您仍有正在編輯的筆記\n請先儲存正在編輯的筆記再執行本操作', 'warning');
			return;
		}
		
		const url_note_container = document.getElementById("url_note_container");
		const url_note_block = url_note_container.querySelectorAll(".windos_message_block");
		
		const note_index = display_UrlNotes.indexOf(note_id);
		
		const url_note_content = url_note_block[note_index].querySelector(".windos_message_content").innerHTML;
		const url_note_timestamp = url_note_block[note_index].querySelector(".windos_message_timestamp").innerText;
		const url_note_is_pinned = url_note_block[note_index].querySelector("button.pinned_note").classList.contains("is_pinned");
		
		initial_EditContent[0] = url_note_content;
		initial_EditTimestamp[0] = url_note_timestamp;
		initial_EditPriority[0] = url_note_is_pinned;
		
		message_block.innerHTML = `<div class="interactive_block edit">
								 <button class="more_options" note_id="${note_id}">
								   <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 20 20">
									 <path fill="currentColor" d="M10.001 7.8a2.2 2.2 0 1 0 0 4.402A2.2 2.2 0 0 0 10 7.8zm0-2.6A2.2 2.2 0 1 0 9.999.8a2.2 2.2 0 0 0 .002 4.4m0 9.6a2.2 2.2 0 1 0 0 4.402a2.2 2.2 0 0 0 0-4.402" />
								   </svg>
								 </button>
							   </div>
							   <div class="windos_content_editor">
							     ${url_note_content}
							   </div>
							   <div class="windos_timestamp_container">
								 <div class="windos_message_timestamp">
								   ${url_note_timestamp}
								 </div>
							   </div>`;
							   
		url_note_block[note_index].replaceWith(message_block);
		display_UrlNotes[note_index] = 'e';
		
		const BalloonEditor = window.BalloonEditor;
	
		BalloonEditor.create(message_block.querySelector('div.windos_content_editor'), {
				placeholder: 'Enter new note here'
			})
			.then( editor => {
				function windos_message_KeyPress(e) {
					var evtobj = window.event? event : e
					if (evtobj.keyCode == 83 && evtobj.ctrlKey){
						event.preventDefault();
						editor_ctrlS_press(0);//儲存
					}
				}
				
				message_block.querySelector('div.windos_content_editor').onkeydown = windos_message_KeyPress;
				current_EditingEditor[0] = editor;
			} )
			.catch( error => {
				console.error( error );
			} );
		
		message_block.querySelector(".interactive_block button.more_options").addEventListener('click', more_editoptions_button_click, false);
	
		is_UrlNewNoteEdit = note_id;
	}
	else if (trigger_type === 'keyword'){
		if (is_KeywordNewNoteEdit != null){
			triggerAlertWindow('您仍有正在編輯的筆記\n請先儲存正在編輯的筆記再執行本操作', 'warning');
			return;
		}
		
		const keyword_note_container = document.getElementById("keyword_note_container");
		const keyword_note_block = keyword_note_container.querySelectorAll(".windos_message_block");
		
		const note_index = display_KeywordNotes.indexOf(note_id);
		
		const keyword_note_content = keyword_note_block[note_index].querySelector(".windos_message_content").innerHTML;
		const keyword_note_timestamp = keyword_note_block[note_index].querySelector(".windos_message_timestamp").innerText;
		const keyword_note_is_pinned = keyword_note_block[note_index].querySelector("button.pinned_note").classList.contains("is_pinned");
		
		initial_EditContent[1] = keyword_note_content;
		initial_EditTimestamp[1] = keyword_note_timestamp;
		initial_EditPriority[1] = keyword_note_is_pinned;
		
		message_block.innerHTML = `<div class="interactive_block edit">
								 <button class="more_options" note_id="${note_id}">
								   <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 20 20">
									 <path fill="currentColor" d="M10.001 7.8a2.2 2.2 0 1 0 0 4.402A2.2 2.2 0 0 0 10 7.8zm0-2.6A2.2 2.2 0 1 0 9.999.8a2.2 2.2 0 0 0 .002 4.4m0 9.6a2.2 2.2 0 1 0 0 4.402a2.2 2.2 0 0 0 0-4.402" />
								   </svg>
								 </button>
							   </div>
							   <div class="windos_content_editor">
							     ${keyword_note_content}
							   </div>
							   <div class="windos_timestamp_container">
								 <div class="windos_message_timestamp">
								   ${keyword_note_timestamp}
								 </div>
							   </div>`;
							   
		keyword_note_block[note_index].replaceWith(message_block);
		display_KeywordNotes[note_index] = 'e';
		
		const BalloonEditor = window.BalloonEditor;
	
		BalloonEditor.create(message_block.querySelector('div.windos_content_editor'), {
				placeholder: 'Enter new note here'
			})
			.then( editor => {
				function windos_message_KeyPress(e) {
					var evtobj = window.event? event : e
					if (evtobj.keyCode == 83 && evtobj.ctrlKey){
						event.preventDefault();
						editor_ctrlS_press(1);//儲存
					}
				}
				
				message_block.querySelector('div.windos_content_editor').onkeydown = windos_message_KeyPress;
				current_EditingEditor[1] = editor;
			} )
			.catch( error => {
				console.error( error );
			} );
		
		message_block.querySelector(".interactive_block button.more_options").addEventListener('click', more_editoptions_button_click, false);
		
		is_KeywordNewNoteEdit = note_id;
	}						   
	else{
		return;
	}
	
	more_options_popup.style.left = '';
	more_options_popup.style.top = '';

	more_options_popup.classList.remove('popup_show');
}
function options_copy_button_click(event){
	const more_options_popup = event.target.closest('.levitate_options_popup');
	
	more_options_popup.style.left = '';
	more_options_popup.style.top = '';

	more_options_popup.classList.remove('popup_show');
}
function options_delete_button_click(event){
	const more_options_popup = event.target.closest('.levitate_options_popup');
	const trigger_type = more_options_popup.getAttribute('trigger_type');
	const note_id = parseInt(more_options_popup.getAttribute('note_id'));
	
	if (trigger_type === 'url'){
		const host = current_Host;
		
		
		const send_url_notedata_delete = {
			event_name: 'send-url-notedata-delete',
			host: host,
			note_id: note_id
		};
		
		confirmNotificationMessage("你正在刪除一則網址筆記\n刪除後是無法找回該筆記\n是否繼續動作 ?", 'delete', send_url_notedata_delete);
	}
	else if (trigger_type === 'keyword'){
		const keyword = current_Keyword;

		const send_keyword_notedata_delete = {
			notification_type: 'message',
			event_name: 'send-keyword-notedata-delete',
			keyword: keyword,
			note_id: note_id
		};
		confirmNotificationMessage("你正在刪除一則關鍵字筆記\n刪除後是無法找回該筆記\n是否繼續動作 ?", 'delete', send_keyword_notedata_delete);
	}
	
	more_options_popup.style.left = '';
	more_options_popup.style.top = '';

	more_options_popup.classList.remove('popup_show');
}

// --- edit_options_popup buttons ---
function editor_save_button_click(event){
	const edit_options_popup = event.target.closest('.levitate_options_popup');
	const trigger_type = edit_options_popup.getAttribute('trigger_type');
	const note_id = parseInt(edit_options_popup.getAttribute('note_id'));
	
	if (trigger_type === 'url'){
		const notecontent = current_EditingEditor[0].getData();
		const host = current_Host;
		
		if (Boolean(is_UrlNoteExist)){
			const send_url_notedata_save = {
				host: host,
				notecontent: notecontent,
				note_id: note_id
			};
			if (initial_EditContent[0]){
				send_url_notedata_save.event_name = 'send-url-notedata-save';
			}
			else{
				send_url_notedata_save.event_name = 'send-url-notedata-add';
			}
			
			chrome.runtime.sendMessage(send_url_notedata_save, (response) => {});
		}
		else{
			const send_url_note_add = {
				event_name: 'send-url-note-add',
				host: host,
				notecontent: notecontent
			};
			chrome.runtime.sendMessage(send_url_note_add, (t) => {});
		}
	}
	else if (trigger_type === 'keyword'){
		const notecontent = current_EditingEditor[1].getData();
		const keyword = current_Keyword;
		
		if (Boolean(is_KeywordNoteExist)){
			const send_keyword_notedata_save = {
				keyword: keyword,
				notecontent: notecontent,
				note_id: note_id
			};
			if (initial_EditContent[1]){
				send_keyword_notedata_save.event_name = 'send-keyword-notedata-save';
			}
			else{
				send_keyword_notedata_save.event_name = 'send-keyword-notedata-add';
			}
			
			chrome.runtime.sendMessage(send_keyword_notedata_save, (response) => {});
		}
		else{
			const send_keyword_note_add = {
				event_name: 'send-keyword-note-add',
				keyword: keyword,
				notecontent: notecontent
			};
			chrome.runtime.sendMessage(send_keyword_note_add, (t) => {});
		}
	}
	
	edit_options_popup.style.left = '';
	edit_options_popup.style.top = '';

	edit_options_popup.classList.remove('popup_show');
}
function editor_exit_button_click(event){
	const edit_options_popup = event.target.closest('.levitate_options_popup');
	const trigger_type = edit_options_popup.getAttribute('trigger_type');
	const note_id = parseInt(edit_options_popup.getAttribute('note_id'));
	
	if (trigger_type === 'url'){
		const url_note_container = document.getElementById("url_note_container");
		const url_note_block = url_note_container.querySelectorAll(".windos_message_block");
		
		const editor_index = display_UrlNotes.indexOf('e');
		
		if (initial_EditContent[0]){
			const message_block = document.createElement('div');
			message_block.classList.add('windos_message_block');
			
			let class_tag = "pinned_note";
			if (initial_EditPriority[0]){
				class_tag = "pinned_note is_pinned";
			}
			
			message_block.innerHTML = `<div class="interactive_block">
										 <button class="${class_tag}" note_id="${note_id}">
										   <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 20 20">
											 <path fill="currentColor" d="M13.325 2.617a2 2 0 0 0-3.203.52l-1.73 3.459a1.5 1.5 0 0 1-.784.721l-3.59 1.436a1 1 0 0 0-.335 1.636L6.293 13L3 16.292V17h.707L7 13.706l2.61 2.61a1 1 0 0 0 1.636-.335l1.436-3.59a1.5 1.5 0 0 1 .722-.784l3.458-1.73a2 2 0 0 0 .52-3.203z" />
										   </svg>
										 </button>
										 <button class="more_options" note_id="${note_id}">
										   <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 20 20">
											 <path fill="currentColor" d="M10.001 7.8a2.2 2.2 0 1 0 0 4.402A2.2 2.2 0 0 0 10 7.8zm0-2.6A2.2 2.2 0 1 0 9.999.8a2.2 2.2 0 0 0 .002 4.4m0 9.6a2.2 2.2 0 1 0 0 4.402a2.2 2.2 0 0 0 0-4.402" />
										   </svg>
										 </button>
									   </div>
									   <div class="windos_message_content">
										 ${initial_EditContent[0]}
									   </div>
									   <div class="windos_timestamp_container">
										 <div class="windos_message_timestamp">
										   ${initial_EditTimestamp[0]}
										 </div>
									   </div>`;
									   
			message_block.querySelector(".interactive_block button.pinned_note").addEventListener('click', pinned_note_button_click, false);
			message_block.querySelector(".interactive_block button.more_options").addEventListener('click', more_options_button_click, false);
			
			url_note_block[editor_index].replaceWith(message_block);
			display_UrlNotes[editor_index] = parseInt(note_id);
		}
		else{
			url_note_container.removeChild(url_note_block[editor_index]);
			
			display_UrlNotes.splice(editor_index, 1);
		}
			
		current_EditingEditor[0] = null;
		initial_EditContent[0] = null;
		initial_EditTimestamp[0] = null;
		initial_EditPriority[0] = null;
		is_UrlNewNoteEdit = null;
	}
	else if (trigger_type === 'keyword'){
		const keyword_note_container = document.getElementById("keyword_note_container");
		const keyword_note_block = keyword_note_container.querySelectorAll(".windos_message_block");
		
		const editor_index = display_KeywordNotes.indexOf('e');
		
		if (initial_EditContent[1]){
			const message_block = document.createElement('div');
			message_block.classList.add('windos_message_block');
			
			let class_tag = "pinned_note";
			if (initial_EditPriority[1]){
				class_tag = "pinned_note is_pinned";
			}
			
			message_block.innerHTML = `<div class="interactive_block">
										 <button class="${class_tag}" note_id="${note_id}">
										   <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 20 20">
											 <path fill="currentColor" d="M13.325 2.617a2 2 0 0 0-3.203.52l-1.73 3.459a1.5 1.5 0 0 1-.784.721l-3.59 1.436a1 1 0 0 0-.335 1.636L6.293 13L3 16.292V17h.707L7 13.706l2.61 2.61a1 1 0 0 0 1.636-.335l1.436-3.59a1.5 1.5 0 0 1 .722-.784l3.458-1.73a2 2 0 0 0 .52-3.203z" />
										   </svg>
										 </button>
										 <button class="more_options" note_id="${note_id}">
										   <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 20 20">
											 <path fill="currentColor" d="M10.001 7.8a2.2 2.2 0 1 0 0 4.402A2.2 2.2 0 0 0 10 7.8zm0-2.6A2.2 2.2 0 1 0 9.999.8a2.2 2.2 0 0 0 .002 4.4m0 9.6a2.2 2.2 0 1 0 0 4.402a2.2 2.2 0 0 0 0-4.402" />
										   </svg>
										 </button>
									   </div>
									   <div class="windos_message_content">
										   ${initial_EditContent[1]}
									   </div>
									   <div class="windos_timestamp_container">
										 <div class="windos_message_timestamp">
										   ${initial_EditTimestamp[1]}
										 </div>
									   </div>`;
									   
			message_block.querySelector(".interactive_block button.pinned_note").addEventListener('click', pinned_note_button_click, false);
			message_block.querySelector(".interactive_block button.more_options").addEventListener('click', more_options_button_click, false);
			
			keyword_note_block[editor_index].replaceWith(message_block);
			display_KeywordNotes[editor_index] = parseInt(note_id);
		}
		else{
			keyword_note_container.removeChild(keyword_note_block[editor_index]);
			
			display_KeywordNotes.splice(editor_index, 1);
		}
		
		current_EditingEditor[1] = null;
		initial_EditContent[1] = null;
		initial_EditTimestamp[1] = null;
		initial_EditPriority[1] = null;
		is_KeywordNewNoteEdit = null;
	}
	
	edit_options_popup.style.left = '';
	edit_options_popup.style.top = '';

	edit_options_popup.classList.remove('popup_show');
}

function editor_ctrlS_press(index){
	const note_id = parseInt(current_EditingEditor[index].closest('.windos_message_block').querySelector(".interactive_block button.more_options").getAttribute('note_id'));
	const trigger_type = current_EditingEditor[index].closest('.windos_message_container').id;
	
	const notecontent = current_EditingEditor.getData();
	
	if (trigger_type === 'url_note_container'){
		const notecontent = current_EditingEditor[0].getData();
		const host = current_Host;
		
		if (Boolean(is_UrlNoteExist)){
			const send_url_notedata_save = {
				host: host,
				notecontent: notecontent,
				note_id: note_id
			};
			if (initial_EditContent[0]){
				send_url_notedata_save.event_name = 'send-url-notedata-save';
			}
			else{
				send_url_notedata_save.event_name = 'send-url-notedata-add';
			}
			
			chrome.runtime.sendMessage(send_url_notedata_save, (response) => {});
		}
		else{
			const send_url_note_add = {
				event_name: 'send-url-note-add',
				host: host,
				notecontent: notecontent
			};
			chrome.runtime.sendMessage(send_url_note_add, (t) => {});
		}
	}
	else if (trigger_type === 'keyword_note_container'){
		const notecontent = current_EditingEditor[1].getData();
		const keyword = current_Keyword;
		
		if (Boolean(is_KeywordNoteExist)){
			const send_keyword_notedata_save = {
				keyword: keyword,
				notecontent: notecontent,
				note_id: note_id
			};
			if (initial_EditContent[1]){
				send_keyword_notedata_save.event_name = 'send-keyword-notedata-save';
			}
			else{
				send_keyword_notedata_save.event_name = 'send-keyword-notedata-add';
			}
			
			chrome.runtime.sendMessage(send_keyword_notedata_save, (response) => {});
		}
		else{
			const send_keyword_note_add = {
				event_name: 'send-keyword-note-add',
				keyword: keyword,
				notecontent: notecontent
			};
			chrome.runtime.sendMessage(send_keyword_note_add, (t) => {});
		}
	}
}

// ====== 資料接收 ====== 
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	switch (request.event_name) {
		//當前網頁資料	
		case 'response-keyword-mark-search':
			currentPagePageStatusUpdate(true, true, request.page_status);
			break;
			
		case 'response-current-tab-sidepanel':
			sendResponse({});
			
			const current_tab_info = request.current_tab_info;
			
			currentPagePageStatusUpdate(current_tab_info.is_support, current_tab_info.is_script_run, current_tab_info.page_status);
			break;
		//關鍵字與網頁筆記
		case 'response-url-notedata':
			sendResponse({});
			
			refreshTitleArea(request.host, request.host_notedata, request.keywords_priority);
			break;	
		case 'response-keyword-notedata-sidepanel':
			sendResponse({});
			
			refreshKeywordArea(request.keyword, request.keyword_notedata, request.keywords_priority);
			break;
		case 'reload-recorded-Keywords':
			sendResponse({});
			
			chrome.runtime.sendMessage({event_name: 'quest-recorded-keywords'}, (response) => {
				recorded_Keywords = response.recorded_keywords;
				refreshSuggestionArea();
			});
			break;
		//儲存資料回傳	
		case 'response-url-note-add':
			sendResponse({});
			
			afterEditRefreshProcess('url', request.process_state, 0, request.save_datetime);
			break;
		case 'response-keyword-note-add':
			sendResponse({});
			
			chrome.runtime.sendMessage({event_name: 'quest-recorded-keywords'}, (response) => {
				recorded_Keywords = response.recorded_keywords;
				afterEditRefreshProcess('keyword', request.process_state, 0, request.save_datetime);
			});
			break;	
			
		case 'response-url-note-delete':
			sendResponse({});
			
			refreshTitleArea(current_Host, null);
			break;
		case 'response-keyword-note-delete':
			sendResponse({});
			
			chrome.runtime.sendMessage({event_name: 'quest-recorded-keywords'}, (response) => {
				recorded_Keywords = response.recorded_keywords;
				refreshKeywordArea(current_Keyword, null, []);
				refreshSuggestionArea();
			});
			break;
		//-----
		case 'response-url-notedata-save':
			sendResponse({});
			
			afterEditRefreshProcess('url', request.process_state, request.note_id, request.save_datetime);
			break;
		case 'response-keyword-notedata-save':
			sendResponse({});
			
			afterEditRefreshProcess('keyword', request.process_state, request.note_id, request.save_datetime);
			break;
			
		case 'response-url-notedata-delete':
			sendResponse({});
			
			afterDeleteRefreshProcess('url', request.process_state, request.note_id);
			break;
		case 'response-keyword-notedata-delete':
			sendResponse({});
			
			afterDeleteRefreshProcess('keyword', request.process_state, request.note_id);
			break;
		//-----
		case 'response-url-note-pin':
			sendResponse({});
			
			afterPinRefreshProcess('url', request.process_state, request.note_id);
			break;
		case 'response-keyword-note-pin':
			sendResponse({});
			
			afterPinRefreshProcess('keyword', request.process_state, request.note_id);
			break;
			
		case 'response-url-note-unpin':
			sendResponse({});
			
			afterPinRefreshProcess('url', request.process_state, request.note_id);
			break;
		case 'response-keyword-note-unpin':
			sendResponse({});
			
			afterPinRefreshProcess('keyword', request.process_state, request.note_id);
			break;
	}
	console.log(request.event_name);
});

chrome.notifications.onButtonClicked.addListener(function(notificationId, btnIdx) {
    if (Boolean(confirmnotifications_data[notificationId])) {
		switch (confirmnotifications_data[notificationId].notification_type){
			case 'message':
				if (btnIdx === 0){
					chrome.runtime.sendMessage(confirmnotifications_data[notificationId], (response) => {});
					delete confirmnotifications_data[notificationId];
				}
				break;
			case 'reconnect':
				if (btnIdx === 0){
					location.reload();
				}
				else if (btnIdx === 1){
					window.close();
				}
				break;
		}
    }
	else{
		triggerAlertWindow("該操作似乎超過時間限制了\n請嘗試重新該操作", 'warning');
	}
});

var portWithBackground = chrome.runtime.connect({name: 'Sidepanel'});
const delay = (delayInms) => {
  return new Promise(resolve => setTimeout(resolve, delayInms));
};
const delayconnect = async () => {
  while (is_Connect){
		portWithBackground.postMessage({'ping': 0});
		let delayres = await delay(5000);
	}
};
portWithBackground.onMessage.addListener((current_data) => {
	currentpage_TabId = current_data.currentpage_tabid;
	is_Connect = true;
	
	chrome.runtime.sendMessage({event_name: 'quest-current-tab-sidepanel'}, (t) => {});
});
portWithBackground.onDisconnect.addListener(async () => {
	portWithBackground = null;
	is_Connect = false;
	console.log('Sidepanel Disconnect');
	
	setTimeout(() => {
		portWithBackground = chrome.runtime.connect({name: 'Sidepanel'});
		
		setTimeout(() => {
			if (!is_Connect){
				const reconnect_data = {
					notification_type: 'reconnect'
				};
				confirmNotificationMessage("側邊欄與頁面的連動更新斷線\n請儲存現有進度並重新連線", 'reconnect', reconnect_data);
			}
		}, 10000);
		setTimeout(() => {
			delayconnect();
		}, 9000);
	}, 6000);
});

// ====== 初始化 ====== 
function runSetting(){
	const body = document.body;
	
	if (is_DarkMode){
		body.classList.add('dark');
	}
	else{
		body.classList.remove('dark');
	}
}

function runInitial(){
	const title_area = document.getElementById("title_area");
	title_area.querySelector('.control_url_area button.new_note').addEventListener('click', url_new_note_button_click, false);
	title_area.querySelector('.control_url_area button.delete_keyword').addEventListener('click', url_delete_button_click, false);
	
	const suggestion_area = document.getElementById("suggestion_area");
	suggestion_area.querySelector("button#more_suggestion").addEventListener("click", more_suggestion_button_click);
	const suggestion_container = suggestion_area.querySelector(".suggestion_container");
	suggestion_container.onwheel = function (event){ 
		event.preventDefault();  

		var step = 50;  
		if(event.deltaY < 0){  
			this.scrollLeft -= step;  
		} else {  
			this.scrollLeft += step;  
		}  
	};
	
	const keyword_area = document.getElementById("keyword_area");
	keyword_area.querySelector('.control_keyword_area button.previous_mark').addEventListener('click', keyword_previous_mark_button_click, false);
	keyword_area.querySelector('.control_keyword_area button.next_mark').addEventListener('click', keyword_next_mark_button_click, false);
	keyword_area.querySelector('.control_keyword_area button.new_note').addEventListener('click', keyword_new_note_button_click, false);
	keyword_area.querySelector('.control_keyword_area button.delete_keyword').addEventListener('click', keyword_delete_button_click, false);
	
	const more_options_popup = document.getElementById("more_options_popup");
	const edit_options_popup = document.getElementById("edit_options_popup");
	const all_suggestion_popup = document.getElementById("all_suggestion_popup");
	
	more_options_popup.addEventListener("mouseleave", levitate_popup_mouseleave_event);
	more_options_popup.querySelector("button.edit_note").addEventListener("click", options_edit_button_click);
	more_options_popup.querySelector("button.copy_note").addEventListener("click", options_copy_button_click);
	more_options_popup.querySelector("button.delete_note").addEventListener("click", options_delete_button_click);

	edit_options_popup.addEventListener("mouseleave", levitate_popup_mouseleave_event);
	edit_options_popup.querySelector("button.save_note").addEventListener("click", editor_save_button_click);
	edit_options_popup.querySelector("button.exit_note").addEventListener("click", editor_exit_button_click);
	
	all_suggestion_popup.addEventListener("mouseleave", levitate_popup_mouseleave_event);
	
	function levitate_popup_mouseleave_event(event){
		this.style.left = '';
		this.style.top = '';
	
		this.classList.remove('popup_show');
	}

	// ====== 請求設定資料 ====== 
	chrome.runtime.sendMessage({event_name: 'quest-extension-setting'}, (response) => {
		is_DarkMode = response.is_darkmode;
		is_SwitchWithTab = response.is_switchwithtab;
		current_Keyword = response.current_Keyword;
		
		console.log(`${is_SwitchWithTab} ${current_Keyword}`);
		chrome.runtime.sendMessage({event_name: 'quest-recorded-keywords'}, (response) => {
			recorded_Keywords = response.recorded_keywords;
			chrome.runtime.sendMessage({event_name: 'quest-keyword-notedata-sidepanel', keyword: current_Keyword}, (t) => {});
		});
	});
}
	
runSetting();
runInitial();

setTimeout(() => {
	delayconnect();
}, 9000);
//網址 關鍵字清單 釘選